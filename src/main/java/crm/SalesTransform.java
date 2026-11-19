package crm;

import org.apache.spark.sql.*;
import static org.apache.spark.sql.functions.*;

/** Spark cleaning / transformation of raw sales rows into the CRM tables (no HBase code here). */
public class SalesTransform {
    public static final String RAW_DDL = "invoice string, stockcode string, description string, quantity string, "
            + "invoicedate string, price string, customer_id string, country string";

    /** Parse, type and clean raw rows. Removes rows with no valid customer ID, bad dates / numbers and exact duplicates. */
    public static Dataset<Row> clean(Dataset<Row> raw) {
        Dataset<Row> d = raw
            .withColumn("customer_id", regexp_replace(trim(col("customer_id")), "\\.0$", ""))
            .withColumn("ts", coalesce(to_timestamp(col("invoicedate"), "yyyy-MM-dd HH:mm:ss"), to_timestamp(col("invoicedate"), "M/d/yyyy H:mm")))
            .withColumn("qty", col("quantity").cast("int"))
            .withColumn("unit_price", col("price").cast("double"))
            .filter(col("customer_id").rlike("^[0-9]{1,6}$").and(col("ts").isNotNull())
                    .and(col("qty").isNotNull()).and(col("unit_price").isNotNull()))
            .dropDuplicates("invoice", "stockcode", "invoicedate", "quantity", "price", "customer_id");
        return d.withColumn("cid", concat(lit("C"), lpad(col("customer_id"), 6, "0")))
                .withColumn("ts14", date_format(col("ts"), "yyyyMMddHHmmss"));
    }

    /** Real purchases: not cancelled, positive quantity and price, real product codes. */
    public static Dataset<Row> sales(Dataset<Row> c) {
        return c.filter(not(col("invoice").startsWith("C")).and(col("qty").gt(0)).and(col("unit_price").gt(0))
                .and(col("stockcode").rlike("^[0-9]{5}")));
    }

    /** Cancellations / returns (invoice numbers starting with C). */
    public static Dataset<Row> cancellations(Dataset<Row> c) { return c.filter(col("invoice").startsWith("C")); }

    /** crm_orders: one row per invoice. Row key = customer_timestamp_invoice. */
    public static Dataset<Row> orders(Dataset<Row> s) {
        return s.withColumn("line", col("qty").multiply(col("unit_price")))
            .groupBy("cid", "invoice")
            .agg(min("ts14").alias("ts14"), round(sum("line"), 2).alias("amount"), sum("qty").alias("items"))
            .withColumn("rowkey", concat_ws("_", col("cid"), col("ts14"), col("invoice")))
            .select("rowkey", "cid", "ts14", "invoice", "amount", "items");
    }

    /** crm_customer: one row per customer. Row key = customer id. */
    public static Dataset<Row> customers(Dataset<Row> s) {
        return s.groupBy("cid")
            .agg(min("country").alias("country"), date_format(min("ts"), "yyyy-MM-dd").alias("first_order_date"))
            .withColumn("rowkey", col("cid"))
            .select("rowkey", "cid", "country", "first_order_date");
    }

    /** crm_interaction: one row per cancellation / return invoice. */
    public static Dataset<Row> interactions(Dataset<Row> x) {
        return x.withColumn("line", abs(col("qty").multiply(col("unit_price"))))
            .groupBy("cid", "invoice")
            .agg(min("ts14").alias("ts14"), round(sum("line"), 2).alias("amount"))
            .withColumn("type", lit("cancellation"))
            .withColumn("rowkey", concat_ws("_", col("cid"), col("ts14"), col("invoice")))
            .select("rowkey", "cid", "ts14", "invoice", "type", "amount");
    }
}
