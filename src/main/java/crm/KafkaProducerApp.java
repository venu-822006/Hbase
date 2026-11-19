package crm;

import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;
import java.io.*;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** Step 2 (Ingest): stream your real sales / CRM export (RAW_FILE, default data/raw/online_retail.csv) into the Kafka
 *  topic crm.sales, one JSON message per row. Nothing is generated or altered; cleaning happens in the Spark ETL. */
public class KafkaProducerApp {
    static String esc(String v) {
        return v.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ").replace("\r", " ").replace("\t", " ");
    }
    public static void main(String[] args) throws Exception {
        String rawPath = (args.length > 0 && !args[0].isBlank()) ? args[0] : Common.RAW_FILE;
        Path filePath = Paths.get(rawPath);
        if (!Files.exists(filePath)) {
            if (Files.exists(Paths.get("data/raw/online_retail.csv"))) {
                filePath = Paths.get("data/raw/online_retail.csv");
            } else if (Files.exists(Paths.get("../data/raw/online_retail.csv"))) {
                filePath = Paths.get("../data/raw/online_retail.csv");
            } else {
                System.out.println("Notice: Raw file not found at " + rawPath + " (Continuing pipeline with existing clean data)");
                return;
            }
        }

        // Test Kafka socket connectivity with 1s timeout before launching producer
        String[] parts = Common.KAFKA.split(":");
        String host = parts[0];
        int port = parts.length > 1 ? Integer.parseInt(parts[1]) : 9092;

        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress(host, port), 1000);
        } catch (Exception e) {
            System.out.println("Notice: Kafka broker not listening on " + Common.KAFKA + ". Skipping live stream simulation (Spark ETL will read CSV directly).");
            return;
        }

        Properties p = new Properties();
        p.put("bootstrap.servers", Common.KAFKA);
        p.put("key.serializer", StringSerializer.class.getName());
        p.put("value.serializer", StringSerializer.class.getName());
        p.put("linger.ms", "50");
        p.put("batch.size", "65536");
        p.put("max.block.ms", "2000");

        long n = 0;
        try (Producer<String, String> prod = new KafkaProducer<>(p);
             BufferedReader br = Files.newBufferedReader(filePath, StandardCharsets.UTF_8)) {

            String first = br.readLine();
            if (first != null && first.startsWith("\uFEFF")) first = first.substring(1);
            List<String> head = new ArrayList<>();
            for (String h : Common.parseLine(first)) head.add(Common.canon(h));
            String line;
            while ((line = br.readLine()) != null) {
                if (line.isEmpty()) continue;
                List<String> v = Common.parseLine(line);
                StringJoiner sj = new StringJoiner(",", "{", "}");
                for (int i = 0; i < head.size(); i++) sj.add("\"" + head.get(i) + "\":\"" + esc(i < v.size() ? v.get(i) : "") + "\"");
                prod.send(new ProducerRecord<>("crm.sales", sj.toString()));
                if (++n % 100000 == 0) System.out.println("  ... " + n + " rows");
            }
            prod.flush();
            System.out.println("published " + n + " messages -> crm.sales");
        } catch (Exception e) {
            System.out.println("Notice: Kafka stream error: " + e.getMessage() + ". Spark ETL will read CSV directly.");
        }
    }
}
