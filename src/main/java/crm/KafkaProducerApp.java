package crm;

import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;
import java.io.*;
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
        if (!Files.exists(Paths.get(Common.RAW_FILE))) {
            System.err.println("Raw file not found: " + Common.RAW_FILE + "  (put your CRM / sales CSV there or set RAW_FILE)");
            System.exit(1);
        }
        Properties p = new Properties();
        p.put("bootstrap.servers", Common.KAFKA);
        p.put("key.serializer", StringSerializer.class.getName());
        p.put("value.serializer", StringSerializer.class.getName());
        p.put("linger.ms", "50"); p.put("batch.size", "65536");
        long n = 0;
        try (Producer<String, String> prod = new KafkaProducer<>(p);
             BufferedReader br = Files.newBufferedReader(Paths.get(Common.RAW_FILE), StandardCharsets.UTF_8)) {
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
        }
        System.out.println("published " + n + " messages -> crm.sales");
    }
}
