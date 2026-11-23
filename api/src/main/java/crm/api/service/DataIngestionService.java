
package crm.api.service;

import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.FileSystem;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.hbase.TableName;
import org.apache.hadoop.hbase.client.Connection;
import org.apache.hadoop.hbase.client.Put;
import org.apache.hadoop.hbase.client.Table;
import org.apache.hadoop.hbase.util.Bytes;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DataIngestionService {

    private static final String HDFS = "hdfs://localhost:9000";
    private static final int BATCH_SIZE = 500;

    private final Connection connection;

    public DataIngestionService(@org.springframework.lang.Nullable Connection connection) {
        this.connection = connection;
    }

    public Map<String, Object> ingestAll() throws IOException {
        if (connection == null) {
            throw new IllegalStateException("HBase cluster connection is not available. Please ensure ZooKeeper and HBase RegionServers are running.");
        }

        Configuration config = new Configuration();
        config.set("fs.defaultFS", HDFS);

        Map<String, Object> result = new LinkedHashMap<>();

        try (FileSystem fs = FileSystem.get(config)) {

            long customers = loadCustomers(
                fs, "/crm/data/clean/customers.csv"
            );

            long orders = loadOrders(
                fs, "/crm/data/clean/orders.csv"
            );

            long cancellations = loadCancellations(
                fs, "/crm/data/clean/cancellations.csv"
            );

            result.put("customersLoaded", customers);
            result.put("ordersLoaded", orders);
            result.put("cancellationsLoaded", cancellations);
            result.put("status", "SUCCESS");
            result.put("source", "HDFS");
            result.put("destination", "HBase");
        }

        return result;
    }

    private long loadCustomers(FileSystem fs, String path)
            throws IOException {

        long count = 0;

        try (
            Table table = connection.getTable(
                TableName.valueOf("crm_customer")
            );
            BufferedReader reader = openReader(fs, path)
        ) {
            List<Put> batch = new ArrayList<>();
            String line;

            reader.readLine(); // Skip CSV header

            while ((line = reader.readLine()) != null) {
                String[] fields = line.split(",", -1);

                if (fields.length != 3) {
                    throw new IOException("Invalid customer row: " + line);
                }

                String cid = fields[0].trim();

                Put put = new Put(Bytes.toBytes(cid));

                add(put, "profile", "cid", cid);
                add(put, "profile", "country", fields[1].trim());
                add(put, "profile", "first_order_date",
                    fields[2].trim());

                batch.add(put);
                count++;

                if (batch.size() >= BATCH_SIZE) {
                    table.put(batch);
                    batch.clear();
                }
            }

            if (!batch.isEmpty()) {
                table.put(batch);
            }
        }

        return count;
    }

    private long loadOrders(FileSystem fs, String path)
            throws IOException {

        long count = 0;

        try (
            Table table = connection.getTable(
                TableName.valueOf("crm_orders")
            );
            BufferedReader reader = openReader(fs, path)
        ) {
            List<Put> batch = new ArrayList<>();
            String line;

            reader.readLine();

            while ((line = reader.readLine()) != null) {
                String[] fields = line.split(",", -1);

                if (fields.length != 5) {
                    throw new IOException("Invalid order row: " + line);
                }

                String cid = fields[0].trim();
                String timestamp = fields[1].trim();
                String invoice = fields[2].trim();

                String rowKey = cid + "_" + timestamp + "_" + invoice;

                Put put = new Put(Bytes.toBytes(rowKey));

                add(put, "info", "cid", cid);
                add(put, "info", "ts14", timestamp);
                add(put, "info", "invoice", invoice);
                add(put, "info", "amount", fields[3].trim());
                add(put, "info", "items", fields[4].trim());

                batch.add(put);
                count++;

                if (batch.size() >= BATCH_SIZE) {
                    table.put(batch);
                    batch.clear();
                }
            }

            if (!batch.isEmpty()) {
                table.put(batch);
            }
        }

        return count;
    }

    private long loadCancellations(FileSystem fs, String path)
            throws IOException {

        long count = 0;

        try (
            Table table = connection.getTable(
                TableName.valueOf("crm_interaction")
            );
            BufferedReader reader = openReader(fs, path)
        ) {
            List<Put> batch = new ArrayList<>();
            String line;

            reader.readLine();

            while ((line = reader.readLine()) != null) {
                String[] fields = line.split(",", -1);

                if (fields.length != 4) {
                    throw new IOException(
                        "Invalid cancellation row: " + line
                    );
                }

                String cid = fields[0].trim();
                String timestamp = fields[1].trim();
                String invoice = fields[2].trim();

                String rowKey = cid + "_" + timestamp + "_" + invoice;

                Put put = new Put(Bytes.toBytes(rowKey));

                add(put, "activity", "type", "cancellation");
                add(put, "activity", "cid", cid);
                add(put, "activity", "ts14", timestamp);
                add(put, "activity", "invoice", invoice);
                add(put, "activity", "amount", fields[3].trim());

                batch.add(put);
                count++;

                if (batch.size() >= BATCH_SIZE) {
                    table.put(batch);
                    batch.clear();
                }
            }

            if (!batch.isEmpty()) {
                table.put(batch);
            }
        }

        return count;
    }

    private BufferedReader openReader(FileSystem fs, String path)
            throws IOException {

        return new BufferedReader(
            new InputStreamReader(
                fs.open(new Path(path)),
                StandardCharsets.UTF_8
            )
        );
    }

    private void add(Put put, String family, String qualifier,
                     String value) {

        put.addColumn(
            Bytes.toBytes(family),
            Bytes.toBytes(qualifier),
            Bytes.toBytes(value)
        );
    }
}
