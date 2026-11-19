package crm;

import org.apache.spark.sql.*;
import org.apache.spark.sql.types.StructType;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;
import static org.apache.spark.sql.functions.*;

/** Steps 3+4 (Transform + Load): Spark reads the Kafka topic crm.sales, cleans the real data, builds the CRM tables and loads HBase.
 *  Options:  --csv      read RAW_FILE directly instead of Kafka
 *            --dry-run  do not write to HBase (cleaned tables are still saved as CSV in data/clean/) */
public class SparkEtlLoad {
    static void export(Dataset<Row> df, String name, String... cols) throws Exception {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Row r : df.select(Arrays.stream(cols).map(functions::col).toArray(Column[]::new)).collectAsList()) {
            Map<String, Object> m = new LinkedHashMap<>();
            for (String c : cols) m.put(c, r.getAs(c));
            rows.add(m);
        }
        Common.writeCsv("clean/" + name, rows);
    }

    public static void main(String[] args) throws Exception {
        List<String> a = Arrays.asList(args);
        boolean csv = a.contains("--csv"), dry = a.contains("--dry-run");

        if (!csv) {
            String[] parts = Common.KAFKA.split(":");
            String host = parts[0];
            int port = parts.length > 1 ? Integer.parseInt(parts[1]) : 9092;
            boolean kafkaOk = false;
            try (Socket s = new Socket()) {
                s.connect(new InetSocketAddress(host, port), 1000);
                kafkaOk = true;
            } catch (Exception ignored) {}

            if (!kafkaOk) {
                System.out.println("Notice: Kafka broker not listening on " + Common.KAFKA + ". Switching Spark ETL to read raw CSV directly.");
                csv = true;
            }
        }

        SparkSession spark = SparkSession.builder().appName("crm-etl").master("local[*]")
                .config("spark.ui.enabled", "false").config("spark.sql.shuffle.partitions", "8")
                .config("spark.sql.legacy.timeParserPolicy", "CORRECTED").getOrCreate();
        spark.sparkContext().setLogLevel("ERROR");
        StructType schema = StructType.fromDDL(SalesTransform.RAW_DDL);

        Dataset<Row> raw;
        if (csv) {
            String rawFile = Common.RAW_FILE;
            if (!Files.exists(Paths.get(rawFile))) {
                if (Files.exists(Paths.get("data/raw/online_retail.csv"))) {
                    rawFile = "data/raw/online_retail.csv";
                } else if (Files.exists(Paths.get("../data/raw/online_retail.csv"))) {
                    rawFile = "../data/raw/online_retail.csv";
                }
            }
            Dataset<Row> r = spark.read().option("header", "true").option("escape", "\"").option("multiLine", "false").csv(rawFile);
            for (String c : r.columns()) r = r.withColumnRenamed(c, Common.canon(c));
            List<Column> sel = new ArrayList<>();
            for (String f : schema.fieldNames()) sel.add(Arrays.asList(r.columns()).contains(f) ? col(f).cast("string").alias(f) : lit(null).cast("string").alias(f));
            raw = r.select(sel.toArray(new Column[0]));
        } else {
            raw = spark.read().format("kafka").option("kafka.bootstrap.servers", Common.KAFKA)
                    .option("subscribe", "crm.sales").option("startingOffsets", "earliest").load()
                    .select(from_json(col("value").cast("string"), schema).alias("v")).select("v.*");
        }
        long nRaw = raw.count();
        Dataset<Row> clean = SalesTransform.clean(raw).cache();
        long nClean = clean.count();
        Dataset<Row> sales = SalesTransform.sales(clean), canc = SalesTransform.cancellations(clean);
        Dataset<Row> orders = SalesTransform.orders(sales).cache(), customers = SalesTransform.customers(sales).cache(),
                     inter = SalesTransform.interactions(canc).cache();
        System.out.printf("raw rows=%d  valid rows=%d  rejected=%d (no customer ID / bad date or number / duplicate)%n", nRaw, nClean, nRaw - nClean);
        System.out.printf("customers=%d  orders(invoices)=%d  cancellations=%d%n", customers.count(), orders.count(), inter.count());

        export(customers, "customers.csv", "cid", "country", "first_order_date");
        export(orders, "orders.csv", "cid", "ts14", "invoice", "amount", "items");
        export(inter, "cancellations.csv", "cid", "ts14", "invoice", "amount");

        if (!dry) {
            Map<String, String> m = new LinkedHashMap<>();
            m.put("profile:country", "country"); m.put("profile:first_order_date", "first_order_date");
            HBaseLoader.load(customers, "crm_customer", m);
            m = new LinkedHashMap<>(); m.put("info:amount", "amount"); m.put("info:items", "items");
            HBaseLoader.load(orders, "crm_orders", m);
            m = new LinkedHashMap<>(); m.put("activity:type", "type"); m.put("activity:amount", "amount");
            HBaseLoader.load(inter, "crm_interaction", m);
        }
        spark.stop();
    }
}
