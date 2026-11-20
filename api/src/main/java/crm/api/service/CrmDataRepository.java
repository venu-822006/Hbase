package crm.api.service;

import org.apache.hadoop.hbase.TableName;
import org.apache.hadoop.hbase.client.*;
import org.apache.hadoop.hbase.util.Bytes;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.io.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class CrmDataRepository {

    private static final Logger log = LoggerFactory.getLogger(CrmDataRepository.class);

    private final Connection hbaseConnection;

    @Value("${crm.data.dir:../data}")
    private String dataDir;

    @Value("${crm.config.dir:../config}")
    private String configDir;

    // Cache / in-memory indices for ultra-fast UI response times
    private final Map<String, Map<String, Object>> customerCache = new ConcurrentHashMap<>();
    private final List<Map<String, Object>> ordersCache = new ArrayList<>();
    private final List<Map<String, Object>> cancellationsCache = new ArrayList<>();
    private final List<Map<String, Object>> campaignsCache = new ArrayList<>();
    private final List<Map<String, Object>> offersCache = new ArrayList<>();
    private final Map<String, Object> mlMetricsCache = new ConcurrentHashMap<>();

    private volatile boolean initialized = false;

    @Autowired
    public CrmDataRepository(@org.springframework.lang.Nullable Connection hbaseConnection) {
        this.hbaseConnection = hbaseConnection;
    }

    public synchronized void reload() {
        initialized = false;
        initData();
    }

    private synchronized void ensureInitialized() {
        if (!initialized) {
            initData();
        }
    }

    private void initData() {
        customerCache.clear();
        ordersCache.clear();
        cancellationsCache.clear();
        campaignsCache.clear();
        offersCache.clear();
        mlMetricsCache.clear();

        loadCampaigns();
        loadMlMetrics();
        loadCleanDataAndMl();

        // If HBase is active, supplement with live HBase data
        if (isHBaseAvailable()) {
            syncFromHBase();
        }

        initialized = true;
        log.info("CRM Data initialized: {} customers, {} orders, {} cancellations, {} campaigns",
                customerCache.size(), ordersCache.size(), cancellationsCache.size(), campaignsCache.size());
    }

    public boolean isHBaseAvailable() {
        if (hbaseConnection == null || hbaseConnection.isClosed()) {
            return false;
        }
        try (Admin admin = hbaseConnection.getAdmin()) {
            return admin.tableExists(TableName.valueOf("crm_customer"));
        } catch (Exception e) {
            return false;
        }
    }

    public Path resolveDataPath(String subpath) {
        Path p = Paths.get(dataDir, subpath);
        if (Files.exists(p)) return p;
        p = Paths.get("data", subpath);
        if (Files.exists(p)) return p;
        return Paths.get("../data", subpath);
    }

    private Path resolveConfigPath(String subpath) {
        Path p = Paths.get(configDir, subpath);
        if (Files.exists(p)) return p;
        p = Paths.get("config", subpath);
        if (Files.exists(p)) return p;
        return Paths.get("../config", subpath);
    }

    private List<String> parseCsvLine(String line) {
        List<String> out = new ArrayList<>();
        StringBuilder sb = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        sb.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    sb.append(c);
                }
            } else if (c == '"') {
                inQuotes = true;
            } else if (c == ',') {
                out.add(sb.toString().trim());
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        out.add(sb.toString().trim());
        return out;
    }

    private void loadCampaigns() {
        Path p = resolveConfigPath("campaigns.csv");
        if (!Files.exists(p)) {
            campaignsCache.add(Map.of("id", "M001", "name", "Welcome offer", "channel", "email", "rule", "New customers after first order"));
            campaignsCache.add(Map.of("id", "M002", "name", "Win-back discount", "channel", "email", "rule", "Churn probability 60% or higher"));
            campaignsCache.add(Map.of("id", "M003", "name", "Seasonal sale", "channel", "web", "rule", "All active customers"));
            campaignsCache.add(Map.of("id", "M004", "name", "Loyalty rewards", "channel", "email", "rule", "Loyal or Premium segment with churn probability below 30%"));
            return;
        }
        try (BufferedReader br = Files.newBufferedReader(p, StandardCharsets.UTF_8)) {
            String line = br.readLine(); // header
            while ((line = br.readLine()) != null) {
                if (line.isBlank()) continue;
                List<String> f = parseCsvLine(line);
                if (f.size() >= 4) {
                    Map<String, Object> c = new LinkedHashMap<>();
                    c.put("id", f.get(0));
                    c.put("name", f.get(1));
                    c.put("channel", f.get(2));
                    c.put("rule", f.get(3));
                    campaignsCache.add(c);
                }
            }
        } catch (Exception e) {
            log.warn("Could not load campaigns: {}", e.getMessage());
        }
    }

    private void loadMlMetrics() {
        Path p = resolveDataPath("metrics.txt");
        if (Files.exists(p)) {
            try {
                String content = Files.readString(p, StandardCharsets.UTF_8).trim();
                String[] parts = content.split(",");
                if (parts.length >= 4) {
                    mlMetricsCache.put("auc", Double.parseDouble(parts[0]));
                    mlMetricsCache.put("r2", Double.parseDouble(parts[1]));
                    mlMetricsCache.put("customersScored", Long.parseLong(parts[2]));
                    mlMetricsCache.put("cutoffDate", parts[3]);
                }
            } catch (Exception e) {
                log.warn("Error reading metrics.txt: {}", e.getMessage());
            }
        }
        if (mlMetricsCache.isEmpty()) {
            mlMetricsCache.put("auc", 0.778);
            mlMetricsCache.put("r2", 0.274);
            mlMetricsCache.put("customersScored", 5721L);
            mlMetricsCache.put("cutoffDate", "2011-11-14");
        }
    }

    private void loadCleanDataAndMl() {
        // 1. Customers
        Path custPath = resolveDataPath("clean/customers.csv");
        if (Files.exists(custPath)) {
            try (BufferedReader br = Files.newBufferedReader(custPath, StandardCharsets.UTF_8)) {
                br.readLine(); // header
                String line;
                while ((line = br.readLine()) != null) {
                    if (line.isBlank()) continue;
                    List<String> f = parseCsvLine(line);
                    if (f.size() >= 3) {
                        String cid = f.get(0);
                        Map<String, Object> cust = new LinkedHashMap<>();
                        cust.put("cid", cid);
                        cust.put("country", f.get(1));
                        cust.put("firstOrderDate", f.get(2));
                        cust.put("segment", "Regular");
                        cust.put("churnProb", 0.35);
                        cust.put("clvPred", 250.0);
                        cust.put("recency", 45);
                        cust.put("frequency", 2);
                        cust.put("monetary", 250.0);
                        customerCache.put(cid, cust);
                    }
                }
            } catch (Exception e) {
                log.warn("Error reading clean/customers.csv: {}", e.getMessage());
            }
        }

        // 2. ML Results
        Path resPath = resolveDataPath("results.csv");
        if (Files.exists(resPath)) {
            try (BufferedReader br = Files.newBufferedReader(resPath, StandardCharsets.UTF_8)) {
                br.readLine(); // header
                String line;
                while ((line = br.readLine()) != null) {
                    if (line.isBlank()) continue;
                    List<String> f = parseCsvLine(line);
                    if (f.size() >= 9) {
                        String cid = f.get(0);
                        Map<String, Object> cust = customerCache.computeIfAbsent(cid, k -> {
                            Map<String, Object> c = new LinkedHashMap<>();
                            c.put("cid", cid);
                            return c;
                        });
                        cust.put("country", f.get(1));
                        cust.put("segment", f.get(2));
                        double churn = Double.parseDouble(f.get(3));
                        double clv = Double.parseDouble(f.get(4));
                        cust.put("churnProb", churn);
                        cust.put("clvPred", clv);
                        cust.put("recency", (int) Double.parseDouble(f.get(5)));
                        cust.put("frequency", (int) Double.parseDouble(f.get(6)));
                        cust.put("monetary", Double.parseDouble(f.get(7)));
                        cust.put("cancellations", (int) Double.parseDouble(f.get(8)));

                        // Derive recommended campaign
                        if (churn >= 0.6) {
                            cust.put("recommendedCampaign", "M002 (Win-back discount)");
                        } else if (("Loyal".equals(f.get(2)) || "Premium".equals(f.get(2))) && churn < 0.3) {
                            cust.put("recommendedCampaign", "M004 (Loyalty rewards)");
                        } else {
                            cust.put("recommendedCampaign", "M003 (Seasonal sale)");
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Error reading results.csv: {}", e.getMessage());
            }
        }

        // 3. Orders
        Path ordersPath = resolveDataPath("clean/orders.csv");
        if (Files.exists(ordersPath)) {
            try (BufferedReader br = Files.newBufferedReader(ordersPath, StandardCharsets.UTF_8)) {
                br.readLine();
                String line;
                while ((line = br.readLine()) != null) {
                    if (line.isBlank()) continue;
                    List<String> f = parseCsvLine(line);
                    if (f.size() >= 5) {
                        Map<String, Object> ord = new LinkedHashMap<>();
                        ord.put("cid", f.get(0));
                        ord.put("ts14", f.get(1));
                        ord.put("formattedDate", formatDate(f.get(1)));
                        ord.put("invoice", f.get(2));
                        ord.put("amount", Double.parseDouble(f.get(3)));
                        ord.put("items", Integer.parseInt(f.get(4)));
                        ordersCache.add(ord);
                    }
                }
            } catch (Exception e) {
                log.warn("Error reading clean/orders.csv: {}", e.getMessage());
            }
        }

        // 4. Cancellations
        Path cancPath = resolveDataPath("clean/cancellations.csv");
        if (Files.exists(cancPath)) {
            try (BufferedReader br = Files.newBufferedReader(cancPath, StandardCharsets.UTF_8)) {
                br.readLine();
                String line;
                while ((line = br.readLine()) != null) {
                    if (line.isBlank()) continue;
                    List<String> f = parseCsvLine(line);
                    if (f.size() >= 4) {
                        Map<String, Object> canc = new LinkedHashMap<>();
                        canc.put("cid", f.get(0));
                        canc.put("ts14", f.get(1));
                        canc.put("formattedDate", formatDate(f.get(1)));
                        canc.put("invoice", f.get(2));
                        canc.put("amount", Double.parseDouble(f.get(3)));
                        canc.put("type", "cancellation");
                        cancellationsCache.add(canc);
                    }
                }
            } catch (Exception e) {
                log.warn("Error reading clean/cancellations.csv: {}", e.getMessage());
            }
        }

        // 5. Feedback offers
        Path offersPath = resolveDataPath("feedback_offers.csv");
        if (!Files.exists(offersPath)) {
            offersPath = Paths.get("feedback_offers.csv");
        }
        if (Files.exists(offersPath)) {
            try (BufferedReader br = Files.newBufferedReader(offersPath, StandardCharsets.UTF_8)) {
                br.readLine();
                String line;
                while ((line = br.readLine()) != null) {
                    if (line.isBlank()) continue;
                    List<String> f = parseCsvLine(line);
                    if (f.size() >= 5) {
                        Map<String, Object> o = new LinkedHashMap<>();
                        o.put("cid", f.get(0));
                        o.put("country", f.get(1));
                        o.put("segment", f.get(2));
                        o.put("churnProb", Double.parseDouble(f.get(3)));
                        o.put("campaign", f.get(4));
                        o.put("campaignName", "M002".equals(f.get(4)) ? "Win-back discount" : "Loyalty rewards");
                        offersCache.add(o);
                    }
                }
            } catch (Exception e) {
                log.warn("Error reading feedback_offers.csv: {}", e.getMessage());
            }
        }
    }

    private void syncFromHBase() {
        try (Table custTable = hbaseConnection.getTable(TableName.valueOf("crm_customer"))) {
            Scan scan = new Scan();
            scan.addFamily(Bytes.toBytes("profile"));
            scan.addFamily(Bytes.toBytes("ml"));
            scan.setCaching(500);
            scan.setCacheBlocks(false);
            try (ResultScanner scanner = custTable.getScanner(scan)) {
                for (Result r : scanner) {
                    String cid = Bytes.toString(r.getRow());
                    if (cid == null) continue;
                    Map<String, Object> c = customerCache.computeIfAbsent(cid, k -> {
                        Map<String, Object> map = new LinkedHashMap<>();
                        map.put("cid", cid);
                        return map;
                    });
                    byte[] country = r.getValue(Bytes.toBytes("profile"), Bytes.toBytes("country"));
                    byte[] firstOrder = r.getValue(Bytes.toBytes("profile"), Bytes.toBytes("first_order_date"));
                    byte[] seg = r.getValue(Bytes.toBytes("ml"), Bytes.toBytes("segment"));
                    byte[] churn = r.getValue(Bytes.toBytes("ml"), Bytes.toBytes("churn_prob"));
                    byte[] clv = r.getValue(Bytes.toBytes("ml"), Bytes.toBytes("clv_pred"));

                    if (country != null) c.put("country", Bytes.toString(country));
                    if (firstOrder != null) c.put("firstOrderDate", Bytes.toString(firstOrder));
                    if (seg != null) c.put("segment", Bytes.toString(seg));
                    if (churn != null) {
                        try { c.put("churnProb", Double.parseDouble(Bytes.toString(churn))); } catch (Exception ignored) {}
                    }
                    if (clv != null) {
                        try { c.put("clvPred", Double.parseDouble(Bytes.toString(clv))); } catch (Exception ignored) {}
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not sync live customers from HBase: {}", e.getMessage());
        }
    }

    public static String formatDate(String ts14) {
        if (ts14 == null || ts14.length() < 8) return ts14;
        String year = ts14.substring(0, 4);
        String month = ts14.substring(4, 6);
        String day = ts14.substring(6, 8);
        if (ts14.length() >= 12) {
            String hour = ts14.substring(8, 10);
            String min = ts14.substring(10, 12);
            return year + "-" + month + "-" + day + " " + hour + ":" + min;
        }
        return year + "-" + month + "-" + day;
    }

    // --- Accessor methods ---

    public Map<String, Object> getMlMetrics() {
        ensureInitialized();
        return new LinkedHashMap<>(mlMetricsCache);
    }

    public List<Map<String, Object>> getAllCampaigns() {
        ensureInitialized();
        return new ArrayList<>(campaignsCache);
    }

    public List<Map<String, Object>> getAllCustomers() {
        ensureInitialized();
        return new ArrayList<>(customerCache.values());
    }

    public Optional<Map<String, Object>> getCustomerById(String cid) {
        ensureInitialized();
        Map<String, Object> cust = customerCache.get(cid);
        if (cust == null) return Optional.empty();

        Map<String, Object> res = new LinkedHashMap<>(cust);
        // Attach orders & cancellations
        List<Map<String, Object>> custOrders = ordersCache.stream()
                .filter(o -> cid.equals(o.get("cid")))
                .collect(Collectors.toList());
        List<Map<String, Object>> custCanc = cancellationsCache.stream()
                .filter(c -> cid.equals(c.get("cid")))
                .collect(Collectors.toList());

        res.put("orders", custOrders);
        res.put("cancellations", custCanc);
        return Optional.of(res);
    }

    public List<Map<String, Object>> getOrders() {
        ensureInitialized();
        return ordersCache;
    }

    public List<Map<String, Object>> getCancellations() {
        ensureInitialized();
        return cancellationsCache;
    }

    public List<Map<String, Object>> getOffers() {
        ensureInitialized();
        return offersCache;
    }
}
