package crm.api.loader;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.hbase.HBaseConfiguration;
import org.apache.hadoop.hbase.TableName;
import org.apache.hadoop.hbase.client.Connection;
import org.apache.hadoop.hbase.client.ConnectionFactory;
import org.apache.hadoop.hbase.client.Put;
import org.apache.hadoop.hbase.client.Table;
import org.apache.hadoop.hbase.util.Bytes;

public class HBaseDataLoader {

    private static final int BATCH_SIZE = 500;
    private static final byte[] PROFILE = Bytes.toBytes("profile");
    private static final byte[] INFO = Bytes.toBytes("info");

    private static final Path CLEAN_DIR =
            Path.of(System.getProperty("crm.data.dir", "../data/clean"));

    public static void main(String[] args) throws Exception {
        Configuration config = HBaseConfiguration.create();
        config.set("hbase.zookeeper.quorum", "localhost");
        config.set("hbase.zookeeper.property.clientPort", "2181");
        config.setInt("hbase.client.retries.number", 3);

        try (Connection connection = ConnectionFactory.createConnection(config)) {
            System.out.println("Connected to HBase.");

            long customers = loadCustomers(connection);
            long orders = loadOrders(connection);
            long cancellations = loadCancellations(connection);

            System.out.println("\n========== IMPORT SUMMARY ==========");
            System.out.println("Customers     : " + customers);
            System.out.println("Orders        : " + orders);
            System.out.println("Cancellations : " + cancellations);
            System.out.println("Total         : "
                    + (customers + orders + cancellations));
        }
    }

    private static long loadCustomers(Connection connection) throws IOException {
        return loadCsv(connection, CLEAN_DIR.resolve("customers.csv"),
                "cid,country,first_order_date", "crm_customer", fields -> {
                    requireFields(fields, 3);
                    Put put = new Put(Bytes.toBytes(fields[0]));
                    put.addColumn(PROFILE, Bytes.toBytes("country"), Bytes.toBytes(fields[1]));
                    put.addColumn(PROFILE, Bytes.toBytes("first_order_date"), Bytes.toBytes(fields[2]));
                    return put;
                });
    }

    private static long loadOrders(Connection connection) throws IOException {
        return loadCsv(connection, CLEAN_DIR.resolve("orders.csv"),
                "cid,ts14,invoice,amount,items", "crm_orders", fields -> {
                    requireFields(fields, 5);
                    String key = fields[0] + "#" + fields[1] + "#" + fields[2];
                    Put put = new Put(Bytes.toBytes(key));
                    put.addColumn(INFO, Bytes.toBytes("cid"), Bytes.toBytes(fields[0]));
                    put.addColumn(INFO, Bytes.toBytes("ts14"), Bytes.toBytes(fields[1]));
                    put.addColumn(INFO, Bytes.toBytes("invoice"), Bytes.toBytes(fields[2]));
                    put.addColumn(INFO, Bytes.toBytes("amount"), Bytes.toBytes(fields[3]));
                    put.addColumn(INFO, Bytes.toBytes("items"), Bytes.toBytes(fields[4]));
                    return put;
                });
    }

    private static long loadCancellations(Connection connection) throws IOException {
        return loadCsv(connection, CLEAN_DIR.resolve("cancellations.csv"),
                "cid,ts14,invoice,amount", "crm_cancellations", fields -> {
                    requireFields(fields, 4);
                    String key = fields[0] + "#" + fields[1] + "#" + fields[2];
                    Put put = new Put(Bytes.toBytes(key));
                    put.addColumn(INFO, Bytes.toBytes("cid"), Bytes.toBytes(fields[0]));
                    put.addColumn(INFO, Bytes.toBytes("ts14"), Bytes.toBytes(fields[1]));
                    put.addColumn(INFO, Bytes.toBytes("invoice"), Bytes.toBytes(fields[2]));
                    put.addColumn(INFO, Bytes.toBytes("amount"), Bytes.toBytes(fields[3]));
                    return put;
                });
    }

    private static long loadCsv(Connection connection, Path file,
            String expectedHeader, String tableName, PutFactory factory)
            throws IOException {

        if (!Files.isRegularFile(file)) {
            throw new IOException("CSV file not found: " + file.toAbsolutePath());
        }

        long imported = 0;
        List<Put> batch = new ArrayList<>(BATCH_SIZE);

        System.out.println("\nLoading " + file.getFileName() + " into " + tableName);

        try (Table table = connection.getTable(TableName.valueOf(tableName));
             BufferedReader reader = Files.newBufferedReader(file, StandardCharsets.UTF_8)) {

            String header = reader.readLine();
            if (!expectedHeader.equals(header)) {
                throw new IOException("Unexpected header in " + file + ": " + header);
            }

            String line;
            long lineNumber = 1;

            while ((line = reader.readLine()) != null) {
                lineNumber++;
                if (line.isBlank()) continue;

                try {
                    batch.add(factory.create(line.split(",", -1)));
                } catch (Exception e) {
                    throw new IOException("Invalid row at line " + lineNumber
                            + " in " + file + ": " + line, e);
                }

                if (batch.size() >= BATCH_SIZE) {
                    table.put(batch);
                    imported += batch.size();
                    batch.clear();

                    if (imported % 5000 == 0) {
                        System.out.println("Imported " + imported);
                    }
                }
            }

            if (!batch.isEmpty()) {
                table.put(batch);
                imported += batch.size();
            }
        }

        System.out.println("Completed " + tableName + ": " + imported);
        return imported;
    }

    private static void requireFields(String[] fields, int expected) {
        if (fields.length != expected) {
            throw new IllegalArgumentException("Expected " + expected
                    + " fields but received " + fields.length);
        }
        for (String field : fields) {
            if (field.isBlank()) {
                throw new IllegalArgumentException("Empty CSV field");
            }
        }
    }

    @FunctionalInterface
    private interface PutFactory {
        Put create(String[] fields) throws Exception;
    }
}