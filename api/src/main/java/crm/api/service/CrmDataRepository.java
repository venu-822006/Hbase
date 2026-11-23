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
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
    private final List<Map<String, Object>> interactionsCache = new java.util.concurrent.CopyOnWriteArrayList<>();
    private final List<Map<String, Object>> productsCache = new ArrayList<>();
    private final Map<String, Map<String, Object>> productCodeIndex = new ConcurrentHashMap<>();
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
        productsCache.clear();
        productCodeIndex.clear();
        mlMetricsCache.clear();

        loadCampaigns();
        loadMlMetrics();
        loadCleanDataAndMl();
        loadProducts();

        // If HBase is active, supplement with live HBase data
        if (isHBaseAvailable()) {
            syncFromHBase();
        }

        initialized = true;
        log.info("CRM Data initialized: {} customers, {} orders, {} cancellations, {} products, {} campaigns",
                customerCache.size(), ordersCache.size(), cancellationsCache.size(), productsCache.size(), campaignsCache.size());
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

        syncInteractionsFromHBase();
    }

    private void syncInteractionsFromHBase() {
        try (Admin admin = hbaseConnection.getAdmin()) {
            if (!admin.tableExists(TableName.valueOf("crm_interaction"))) {
                return;
            }
        } catch (Exception e) {
            return;
        }

        try (Table intTable = hbaseConnection.getTable(TableName.valueOf("crm_interaction"))) {
            Scan scan = new Scan();
            scan.addFamily(Bytes.toBytes("activity"));
            scan.setCaching(200);
            scan.setLimit(500);
            try (ResultScanner scanner = intTable.getScanner(scan)) {
                for (Result r : scanner) {
                    String rk = Bytes.toString(r.getRow());
                    if (rk == null) continue;
                    String[] parts = rk.split("_");
                    String cid = parts.length > 0 ? parts[0] : "";
                    String ts = parts.length > 1 ? parts[1] : "";

                    byte[] typeVal = r.getValue(Bytes.toBytes("activity"), Bytes.toBytes("type"));
                    byte[] campVal = r.getValue(Bytes.toBytes("activity"), Bytes.toBytes("campaign"));
                    byte[] chanVal = r.getValue(Bytes.toBytes("activity"), Bytes.toBytes("channel"));
                    byte[] notesVal = r.getValue(Bytes.toBytes("activity"), Bytes.toBytes("notes"));
                    byte[] statusVal = r.getValue(Bytes.toBytes("activity"), Bytes.toBytes("status"));
                    byte[] amtVal = r.getValue(Bytes.toBytes("activity"), Bytes.toBytes("amount"));

                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("rowKey", rk);
                    map.put("cid", cid);
                    map.put("timestamp", ts);
                    map.put("formattedDate", formatDate(ts));
                    map.put("type", typeVal != null ? Bytes.toString(typeVal) : "activity");
                    if (campVal != null) map.put("campaign", Bytes.toString(campVal));
                    if (chanVal != null) map.put("channel", Bytes.toString(chanVal));
                    if (notesVal != null) map.put("notes", Bytes.toString(notesVal));
                    if (statusVal != null) map.put("status", Bytes.toString(statusVal));
                    if (amtVal != null) {
                        try { map.put("amount", Double.parseDouble(Bytes.toString(amtVal))); } catch (Exception ignored) {}
                    }
                    map.put("hbaseCommitted", true);
                    interactionsCache.add(map);
                }
            }
        } catch (Exception e) {
            log.warn("Could not sync interactions from HBase: {}", e.getMessage());
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
        res.put("interactions", getInteractions(cid));
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

    public Map<String, Object> recordInteraction(String cid, String campaignId, String channel, String notes) {
        ensureInitialized();
        String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String rowKey = cid + "_" + ts + "_" + campaignId;

        Map<String, Object> record = new LinkedHashMap<>();
        record.put("rowKey", rowKey);
        record.put("cid", cid);
        record.put("campaign", campaignId);
        record.put("channel", channel);
        record.put("notes", notes);
        record.put("status", "SENT");
        record.put("type", "campaign_dispatch");
        record.put("timestamp", ts);
        record.put("formattedDate", formatDate(ts));

        boolean hbaseWritten = false;
        if (isHBaseAvailable()) {
            try (Table t = hbaseConnection.getTable(TableName.valueOf("crm_interaction"))) {
                Put p = new Put(Bytes.toBytes(rowKey));
                p.addColumn(Bytes.toBytes("activity"), Bytes.toBytes("type"), Bytes.toBytes("campaign_dispatch"));
                p.addColumn(Bytes.toBytes("activity"), Bytes.toBytes("campaign"), Bytes.toBytes(campaignId));
                p.addColumn(Bytes.toBytes("activity"), Bytes.toBytes("channel"), Bytes.toBytes(channel));
                p.addColumn(Bytes.toBytes("activity"), Bytes.toBytes("notes"), Bytes.toBytes(notes));
                p.addColumn(Bytes.toBytes("activity"), Bytes.toBytes("status"), Bytes.toBytes("SENT"));
                p.addColumn(Bytes.toBytes("activity"), Bytes.toBytes("timestamp"), Bytes.toBytes(ts));
                t.put(p);
                hbaseWritten = true;
                log.info("Recorded campaign dispatch in HBase crm_interaction: {}", rowKey);
            } catch (Exception e) {
                log.warn("Failed to write interaction to HBase: {}", e.getMessage());
            }
        }

        record.put("hbaseCommitted", hbaseWritten);
        interactionsCache.add(0, record);
        return record;
    }

    public List<Map<String, Object>> getInteractions(String cid) {
        ensureInitialized();
        if (cid == null || cid.isBlank() || "all".equalsIgnoreCase(cid)) {
            return new ArrayList<>(interactionsCache);
        }
        return interactionsCache.stream()
                .filter(i -> cid.equalsIgnoreCase(String.valueOf(i.get("cid"))))
                .collect(Collectors.toList());
    }

    private void loadProducts() {
        productsCache.clear();
        productCodeIndex.clear();
        Path p = resolveDataPath("clean/products.csv");
        if (Files.exists(p)) {
            try (BufferedReader br = Files.newBufferedReader(p, StandardCharsets.UTF_8)) {
                br.readLine(); // skip header
                String line;
                while ((line = br.readLine()) != null) {
                    if (line.isBlank()) continue;
                    List<String> f = parseCsvLine(line);
                    if (f.size() >= 10) {
                        Map<String, Object> prod = new LinkedHashMap<>();
                        String code = f.get(0);
                        prod.put("stockCode", code);
                        prod.put("description", f.get(1));
                        prod.put("category", f.get(2));
                        try { prod.put("avgPrice", Double.parseDouble(f.get(3))); } catch (Exception e) { prod.put("avgPrice", 0.0); }
                        try { prod.put("unitsSold", Long.parseLong(f.get(4))); } catch (Exception e) { prod.put("unitsSold", 0L); }
                        try { prod.put("unitsCancelled", Long.parseLong(f.get(5))); } catch (Exception e) { prod.put("unitsCancelled", 0L); }
                        try { prod.put("totalRevenue", Double.parseDouble(f.get(6))); } catch (Exception e) { prod.put("totalRevenue", 0.0); }
                        try { prod.put("orderCount", Long.parseLong(f.get(7))); } catch (Exception e) { prod.put("orderCount", 0L); }
                        try { prod.put("cancelCount", Long.parseLong(f.get(8))); } catch (Exception e) { prod.put("cancelCount", 0L); }
                        try { prod.put("customerCount", Long.parseLong(f.get(9))); } catch (Exception e) { prod.put("customerCount", 0L); }
                        if (f.size() >= 11) {
                            try { prod.put("cancellationRate", Double.parseDouble(f.get(10))); } catch (Exception e) { prod.put("cancellationRate", 0.0); }
                        } else {
                            prod.put("cancellationRate", 0.0);
                        }
                        productsCache.add(prod);
                        productCodeIndex.put(code.toUpperCase(), prod);
                    }
                }
                log.info("Loaded {} products into catalog cache", productsCache.size());
            } catch (Exception e) {
                log.warn("Error reading clean/products.csv: {}", e.getMessage());
            }
        }
    }

    public List<Map<String, Object>> getAllProducts() {
        ensureInitialized();
        return new ArrayList<>(productsCache);
    }

    public Optional<Map<String, Object>> getProductByCode(String code) {
        ensureInitialized();
        if (code == null) return Optional.empty();
        return Optional.ofNullable(productCodeIndex.get(code.toUpperCase().trim()));
    }

    public Map<String, Object> getWarehouseLineage() {
        ensureInitialized();
        Map<String, Object> lineage = new LinkedHashMap<>();
        lineage.put("clusterStatus", isHBaseAvailable() ? "UP" : "DEGRADED");
        lineage.put("hdfsUri", "hdfs://localhost:9000");
        lineage.put("zookeeperQuorum", "localhost:2181");
        lineage.put("timestamp", LocalDateTime.now().toString());

        List<Map<String, Object>> datasets = new ArrayList<>();

        // 1. Raw Retail Transactions
        Map<String, Object> d1 = new LinkedHashMap<>();
        d1.put("id", "ds-raw-transactions");
        d1.put("name", "Raw Retail Transactions");
        d1.put("tier", "Bronze / Ingestion");
        d1.put("storage", "Hadoop HDFS (/crm/data/raw/online_retail.csv)");
        d1.put("recordCount", 988278L);
        d1.put("size", "84.2 MB");
        d1.put("format", "CSV (Comma Separated, Multi-year Invoices)");
        d1.put("schema", "Invoice, StockCode, Description, Quantity, InvoiceDate, Price, Customer ID, Country");
        d1.put("description", "Complete raw transaction log from UCI Machine Learning Repository containing 2 full years of global retail sales.");
        datasets.add(d1);

        // 2. Customer Profiles
        Map<String, Object> d2 = new LinkedHashMap<>();
        d2.put("id", "ds-customer-profiles");
        d2.put("name", "Customer Profiles Dimension");
        d2.put("tier", "Silver / Dimension");
        d2.put("storage", "Apache HBase (crm_customer) + HDFS (/crm/data/clean/customers.csv)");
        d2.put("recordCount", (long) customerCache.size());
        d2.put("size", "187 KB");
        d2.put("format", "HBase Column Families: profile (metadata), ml (scoring)");
        d2.put("schema", "cid [RowKey], profile:country, profile:first_order_date, ml:churn_prob, ml:clv_pred, ml:segment");
        d2.put("description", "Deduplicated customer dimension indexed by CID with RFM feature vectors and ML predictions.");
        datasets.add(d2);

        // 3. Orders & Invoices
        Map<String, Object> d3 = new LinkedHashMap<>();
        d3.put("id", "ds-orders-facts");
        d3.put("name", "Settled Invoiced Orders");
        d3.put("tier", "Silver / Fact");
        d3.put("storage", "Apache HBase (crm_orders) + HDFS (/crm/data/clean/orders.csv)");
        d3.put("recordCount", (long) ordersCache.size());
        d3.put("size", "1.38 MB");
        d3.put("format", "HBase Column Family: info");
        d3.put("schema", "cid_timestamp_invoice [RowKey], info:cid, info:ts14, info:invoice, info:amount, info:items");
        d3.put("description", "Settled order facts with composite row keys ensuring idempotent batch and streaming ingestion.");
        datasets.add(d3);

        // 4. Returns & Cancellations
        Map<String, Object> d4 = new LinkedHashMap<>();
        d4.put("id", "ds-cancellations-friction");
        d4.put("name", "Returns & Cancellation Friction");
        d4.put("tier", "Silver / Fact");
        d4.put("storage", "Apache HBase (crm_interaction) + HDFS (/crm/data/clean/cancellations.csv)");
        d4.put("recordCount", (long) cancellationsCache.size());
        d4.put("size", "267 KB");
        d4.put("format", "HBase Column Family: activity");
        d4.put("schema", "cid_timestamp_invoice [RowKey], activity:type, activity:amount, activity:cid, activity:ts14, activity:invoice");
        d4.put("description", "Negative transaction return events and friction telemetry utilized in customer churn modeling.");
        datasets.add(d4);

        // 5. Products & Merchandise Catalog
        Map<String, Object> d5 = new LinkedHashMap<>();
        d5.put("id", "ds-products-catalog");
        d5.put("name", "Product & Merchandise Catalog");
        d5.put("tier", "Silver / Dimension");
        d5.put("storage", "HDFS (/crm/data/clean/products.csv) + In-Memory Fast Cache");
        d5.put("recordCount", (long) productsCache.size());
        d5.put("size", "408 KB");
        d5.put("format", "Structured CSV & Indexed SKU Dictionary");
        d5.put("schema", "stock_code [PK], description, category, avg_price, units_sold, units_cancelled, total_revenue, order_count, cancel_count, customer_count, cancellation_rate");
        d5.put("description", "Complete 4,723 SKU merchandise catalog with volume, gross revenue, and return rate diagnostics.");
        datasets.add(d5);

        // 6. Campaign Strategies & Playbooks
        Map<String, Object> d6 = new LinkedHashMap<>();
        d6.put("id", "ds-campaign-playbooks");
        d6.put("name", "Campaign Strategies & Playbooks");
        d6.put("tier", "Gold / Configuration");
        d6.put("storage", "Apache HBase (crm_campaign) + config/campaigns.csv");
        d6.put("recordCount", (long) campaignsCache.size());
        d6.put("size", "2 KB");
        d6.put("format", "HBase Column Family: detail");
        d6.put("schema", "id [RowKey], detail:id, detail:name, detail:channel, detail:rule");
        d6.put("description", "Targeted marketing interventions: Win-back discount, Loyalty rewards, Welcome offer, and Seasonal sale.");
        datasets.add(d6);

        // 7. Live Customer Interactions & Dispatches
        Map<String, Object> d7 = new LinkedHashMap<>();
        d7.put("id", "ds-interactions-log");
        d7.put("name", "Live Interactions & Campaign Dispatches");
        d7.put("tier", "Gold / Closed-Loop Telemetry");
        d7.put("storage", "Apache HBase (crm_interaction) + feedback_offers.csv");
        d7.put("recordCount", (long) (offersCache.size() + interactionsCache.size()));
        d7.put("size", "164 KB");
        d7.put("format", "HBase Column Family: activity");
        d7.put("schema", "cid_timestamp_campaign [RowKey], activity:type, activity:campaign, activity:channel, activity:notes, activity:status");
        d7.put("description", "Closed-loop feedback log capturing live operator dispatches committed synchronously into HBase.");
        datasets.add(d7);

        // 8. Spark MLlib Predictive Intelligence
        Map<String, Object> d8 = new LinkedHashMap<>();
        d8.put("id", "ds-mllib-evaluations");
        d8.put("name", "Spark MLlib Predictive Intelligence");
        d8.put("tier", "Gold / Analytical ML");
        d8.put("storage", "data/results.csv, data/metrics.txt, data/ml_model_params.json");
        d8.put("recordCount", (long) customerCache.size());
        d8.put("size", "345 KB");
        d8.put("format", "Scored Features & Parameter Weights");
        d8.put("schema", "cid, country, segment, churn_prob, clv_pred, recency, frequency, monetary, cancellations");
        d8.put("description", "Trained Spark MLlib models (Logistic Regression Churn ROC-AUC 0.7784, Linear Regression CLV R² 0.2739).");
        datasets.add(d8);

        lineage.put("datasets", datasets);

        // Total metrics
        long totalRecords = 988278L + customerCache.size() + ordersCache.size() + cancellationsCache.size() +
                productsCache.size() + campaignsCache.size() + offersCache.size() + interactionsCache.size() + customerCache.size();
        lineage.put("totalDatasets", datasets.size());
        lineage.put("totalRecordsAcrossTiers", totalRecords);
        lineage.put("totalStorageEstimate", "175.4 MB");

        return lineage;
    }
}
