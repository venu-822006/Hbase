package crm.api.loader;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.hbase.HBaseConfiguration;
import org.apache.hadoop.hbase.TableName;
import org.apache.hadoop.hbase.client.*;
import org.apache.hadoop.hbase.util.Bytes;

public class HBaseDataLoader {

    private static final int BATCH_SIZE = 500;
    private static final byte[] PROFILE = Bytes.toBytes("profile");
    private static final byte[] ML = Bytes.toBytes("ml");
    private static final byte[] INFO = Bytes.toBytes("info");
    private static final byte[] ACTIVITY = Bytes.toBytes("activity");
    private static final byte[] DETAIL = Bytes.toBytes("detail");

    private static Path resolveDataDir() {
        String prop = System.getProperty("crm.data.dir");
        if (prop != null && Files.exists(Paths.get(prop))) return Paths.get(prop);
        if (Files.exists(Paths.get("data"))) return Paths.get("data");
        if (Files.exists(Paths.get("../data"))) return Paths.get("../data");
        return Paths.get("data");
    }

    private static Path resolveConfigDir() {
        String prop = System.getProperty("crm.config.dir");
        if (prop != null && Files.exists(Paths.get(prop))) return Paths.get(prop);
        if (Files.exists(Paths.get("config"))) return Paths.get("config");
        if (Files.exists(Paths.get("../config"))) return Paths.get("../config");
        return Paths.get("config");
    }

    public static void main(String[] args) throws Exception {
        boolean truncate = args.length > 0 && args[0].contains("--truncate");

        Configuration config = HBaseConfiguration.create();
        config.set("hbase.zookeeper.quorum", System.getProperty("hbase.zookeeper.quorum", "localhost"));
        config.set("hbase.zookeeper.property.clientPort", System.getProperty("hbase.zookeeper.property.clientPort", "2181"));
        config.setInt("hbase.client.retries.number", 3);

        Path dataDir = resolveDataDir();
        Path cleanDir = dataDir.resolve("clean");
        Path configDir = resolveConfigDir();

        System.out.println("Connecting to HBase cluster...");
        try (Connection connection = ConnectionFactory.createConnection(config);
             Admin admin = connection.getAdmin()) {

            System.out.println("Connected to HBase successfully.");

            if (truncate) {
                System.out.println("Truncating tables to eliminate duplicate delimiter runs...");
                truncateTable(admin, "crm_orders");
                truncateTable(admin, "crm_interaction");
                truncateTable(admin, "crm_campaign");
            }

            // 1. Customers
            long customers = loadCustomers(connection, cleanDir.resolve("customers.csv"));

            // 2. Customer ML features (enrichment)
            long customerMl = loadCustomerMl(connection, dataDir.resolve("results.csv"));

            // 3. Orders
            long orders = loadOrders(connection, cleanDir.resolve("orders.csv"));

            // 4. Cancellations
            long cancellations = loadCancellations(connection, cleanDir.resolve("cancellations.csv"));

            // 5. Campaigns
            long campaigns = loadCampaigns(connection, configDir.resolve("campaigns.csv"));

            System.out.println("\n=================== HBASE IMPORT SUMMARY ===================");
            System.out.println("crm_customer (profile)    : " + customers + " records");
            System.out.println("crm_customer (ml)         : " + customerMl + " records");
            System.out.println("crm_orders (info)         : " + orders + " records");
            System.out.println("crm_interaction (activity): " + cancellations + " records");
            System.out.println("crm_campaign (detail)     : " + campaigns + " campaigns");
            System.out.println("Total Core Records     : " + (customers + orders + cancellations));
            System.out.println("=============================================================");
        }
    }

    private static void truncateTable(Admin admin, String tableNameStr) throws IOException {
        TableName tn = TableName.valueOf(tableNameStr);
        if (admin.tableExists(tn)) {
            System.out.println("Truncating table: " + tableNameStr);
            admin.disableTable(tn);
            admin.truncateTable(tn, false);
            System.out.println("Truncated and re-enabled: " + tableNameStr);
        }
    }

    private static long loadCustomers(Connection connection, Path file) throws Exception {
        return loadCsv(connection, file,
                "cid,country,first_order_date", "crm_customer", fields -> {
                    requireFields(fields, 3);
                    Put put = new Put(Bytes.toBytes(fields[0]));
                    put.addColumn(PROFILE, Bytes.toBytes("country"), Bytes.toBytes(fields[1]));
                    put.addColumn(PROFILE, Bytes.toBytes("first_order_date"), Bytes.toBytes(fields[2]));
                    return put;
                });
    }

    private static long loadCustomerMl(Connection connection, Path file) throws Exception {
        if (!Files.exists(file)) {
            System.out.println("Notice: results.csv not found at " + file + ", skipping ML enrichment.");
            return 0;
        }
        return loadCsv(connection, file,
                "customer_id,country,segment,churn_prob,clv_pred,recency,frequency,monetary,cancellations", "crm_customer", fields -> {
                    if (fields.length < 5) return null;
                    Put put = new Put(Bytes.toBytes(fields[0]));
                    put.addColumn(ML, Bytes.toBytes("segment"), Bytes.toBytes(fields[2]));
                    put.addColumn(ML, Bytes.toBytes("churn_prob"), Bytes.toBytes(fields[3]));
                    put.addColumn(ML, Bytes.toBytes("clv_pred"), Bytes.toBytes(fields[4]));
                    return put;
                });
    }

    private static long loadOrders(Connection connection, Path file) throws Exception {
        return loadCsv(connection, file,
                "cid,ts14,invoice,amount,items", "crm_orders", fields -> {
                    requireFields(fields, 5);
                    String key = fields[0] + "_" + fields[1] + "_" + fields[2];
                    Put put = new Put(Bytes.toBytes(key));
                    put.addColumn(INFO, Bytes.toBytes("cid"), Bytes.toBytes(fields[0]));
                    put.addColumn(INFO, Bytes.toBytes("ts14"), Bytes.toBytes(fields[1]));
                    put.addColumn(INFO, Bytes.toBytes("invoice"), Bytes.toBytes(fields[2]));
                    put.addColumn(INFO, Bytes.toBytes("amount"), Bytes.toBytes(fields[3]));
                    put.addColumn(INFO, Bytes.toBytes("items"), Bytes.toBytes(fields[4]));
                    return put;
                });
    }

    private static long loadCancellations(Connection connection, Path file) throws Exception {
        return loadCsv(connection, file,
                "cid,ts14,invoice,amount", "crm_interaction", fields -> {
                    requireFields(fields, 4);
                    String key = fields[0] + "_" + fields[1] + "_" + fields[2];
                    Put put = new Put(Bytes.toBytes(key));
                    put.addColumn(ACTIVITY, Bytes.toBytes("type"), Bytes.toBytes("cancellation"));
                    put.addColumn(ACTIVITY, Bytes.toBytes("cid"), Bytes.toBytes(fields[0]));
                    put.addColumn(ACTIVITY, Bytes.toBytes("ts14"), Bytes.toBytes(fields[1]));
                    put.addColumn(ACTIVITY, Bytes.toBytes("invoice"), Bytes.toBytes(fields[2]));
                    put.addColumn(ACTIVITY, Bytes.toBytes("amount"), Bytes.toBytes(fields[3]));
                    return put;
                });
    }

    private static long loadCampaigns(Connection connection, Path file) throws Exception {
        if (!Files.exists(file)) return 0;
        return loadCsv(connection, file,
                "campaign_id,name,channel,target_rule", "crm_campaign", fields -> {
                    requireFields(fields, 4);
                    Put put = new Put(Bytes.toBytes(fields[0]));
                    put.addColumn(DETAIL, Bytes.toBytes("name"), Bytes.toBytes(fields[1]));
                    put.addColumn(DETAIL, Bytes.toBytes("channel"), Bytes.toBytes(fields[2]));
                    put.addColumn(DETAIL, Bytes.toBytes("rule"), Bytes.toBytes(fields[3]));
                    return put;
                });
    }

    private static long loadCsv(Connection connection, Path file,
            String expectedHeader, String tableName, PutFactory factory)
            throws Exception {

        if (!Files.isRegularFile(file)) {
            throw new IOException("CSV file not found: " + file.toAbsolutePath());
        }

        long imported = 0;
        List<Put> batch = new ArrayList<>(BATCH_SIZE);

        System.out.println("Loading " + file.getFileName() + " into HBase table " + tableName + "...");

        try (Table table = connection.getTable(TableName.valueOf(tableName));
             BufferedReader reader = Files.newBufferedReader(file, StandardCharsets.UTF_8)) {

            String header = reader.readLine();
            if (header != null && header.startsWith("\uFEFF")) header = header.substring(1);
            if (!expectedHeader.equalsIgnoreCase(header)) {
                System.out.println("Warning: expected header: [" + expectedHeader + "] got: [" + header + "]");
            }

            String line;
            long lineNumber = 1;

            while ((line = reader.readLine()) != null) {
                lineNumber++;
                if (line.isBlank()) continue;

                Put put = factory.create(line.split(",", -1));
                if (put != null) {
                    batch.add(put);
                }

                if (batch.size() >= BATCH_SIZE) {
                    table.put(batch);
                    imported += batch.size();
                    batch.clear();

                    if (imported % 10000 == 0) {
                        System.out.println("  ... imported " + imported + " records");
                    }
                }
            }

            if (!batch.isEmpty()) {
                table.put(batch);
                imported += batch.size();
            }
        }

        System.out.println("✓ Completed " + tableName + ": " + imported + " rows");
        return imported;
    }

    private static void requireFields(String[] fields, int expected) {
        if (fields.length != expected) {
            throw new IllegalArgumentException("Expected " + expected
                    + " fields but received " + fields.length);
        }
    }

    @FunctionalInterface
    private interface PutFactory {
        Put create(String[] fields) throws Exception;
    }
}
