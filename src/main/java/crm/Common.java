package crm;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** Shared settings and small CSV helpers (no external libraries). */
public class Common {
    public static String env(String k, String d) { String v = System.getenv(k); return v == null ? d : v; }
    public static final String DATA = env("CRM_DATA", "data");
    public static final String RAW_FILE = env("RAW_FILE", "hdfs:///crm/data/raw/online_retail.csv");  // your real sales / CRM export
    public static final String ZK = env("HBASE_ZK", "localhost");
    public static final String ZK_PORT = env("HBASE_ZK_PORT", "2181");
    public static final String KAFKA = env("KAFKA_SERVERS", "localhost:9092");
    public static final String PHOENIX = env("PHOENIX_URL", "http://localhost:8765");

    /** HBase table name -> column families */
    public static final Map<String, String[]> TABLES = new LinkedHashMap<>();
    static {
        TABLES.put("crm_customer", new String[]{"profile", "ml"});
        TABLES.put("crm_orders", new String[]{"info"});
        TABLES.put("crm_interaction", new String[]{"activity"});
        TABLES.put("crm_campaign", new String[]{"detail"});
    }

    /** Canonical column name for a raw header (handles Online Retail / Online Retail II and similar exports). */
    public static String canon(String header) {
        String k = header.toLowerCase().replaceAll("[^a-z0-9]", "");
        switch (k) {
            case "invoice": case "invoiceno": return "invoice";
            case "stockcode": return "stockcode";
            case "description": return "description";
            case "quantity": return "quantity";
            case "invoicedate": return "invoicedate";
            case "price": case "unitprice": return "price";
            case "customerid": return "customer_id";
            case "country": return "country";
            default: return k;
        }
    }

    /** Splits one CSV line (handles quotes and commas inside quotes). */
    public static List<String> parseLine(String line) {
        List<String> out = new ArrayList<>(); StringBuilder sb = new StringBuilder(); boolean q = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (q) {
                if (c == '"') { if (i + 1 < line.length() && line.charAt(i + 1) == '"') { sb.append('"'); i++; } else q = false; }
                else sb.append(c);
            } else if (c == '"') q = true;
            else if (c == ',') { out.add(sb.toString()); sb.setLength(0); }
            else sb.append(c);
        }
        out.add(sb.toString());
        return out;
    }

    public static List<Map<String, String>> readCsv(String path) throws IOException {
        List<String> lines = Files.readAllLines(Paths.get(path), StandardCharsets.UTF_8);
        List<String> head = parseLine(lines.get(0));
        List<Map<String, String>> rows = new ArrayList<>();
        for (int i = 1; i < lines.size(); i++) {
            if (lines.get(i).isEmpty()) continue;
            List<String> v = parseLine(lines.get(i));
            Map<String, String> r = new LinkedHashMap<>();
            for (int j = 0; j < head.size(); j++) r.put(head.get(j), j < v.size() ? v.get(j) : "");
            rows.add(r);
        }
        return rows;
    }

    static String q(Object o) {
        String s = String.valueOf(o);
        return (s.contains(",") || s.contains("\"") || s.contains("\n")) ? "\"" + s.replace("\"", "\"\"") + "\"" : s;
    }

    /** Writes rows to DATA/name (creates folders). */
    public static void writeCsv(String name, List<Map<String, Object>> rows) throws IOException {
        Path p = Paths.get(DATA, name);
        Files.createDirectories(p.getParent());
        try (PrintWriter w = new PrintWriter(Files.newBufferedWriter(p, StandardCharsets.UTF_8))) {
            if (rows.isEmpty()) return;
            w.println(String.join(",", rows.get(0).keySet()));
            for (Map<String, Object> r : rows) {
                StringJoiner sj = new StringJoiner(",");
                for (Object o : r.values()) sj.add(q(o));
                w.println(sj);
            }
        }
        System.out.println(name + ": " + rows.size() + " rows");
    }
}
