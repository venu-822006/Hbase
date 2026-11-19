package crm.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final CrmDataRepository repository;

    @Autowired
    public DashboardService(CrmDataRepository repository) {
        this.repository = repository;
    }

    public Map<String, Object> getSummary() throws IOException {
        Map<String, Object> summary = new LinkedHashMap<>();

        List<Map<String, Object>> customers = repository.getAllCustomers();
        List<Map<String, Object>> orders = repository.getOrders();
        List<Map<String, Object>> cancellations = repository.getCancellations();
        Map<String, Object> mlMetrics = repository.getMlMetrics();

        // 1. Basic counts
        long totalCustomers = customers.size();
        long totalOrders = orders.size();
        long totalCancellations = cancellations.size();

        // 2. Revenue calculations
        BigDecimal totalRevenue = BigDecimal.ZERO;
        TreeMap<String, BigDecimal> monthlyRevenue = new TreeMap<>();

        for (Map<String, Object> o : orders) {
            double amt = (o.get("amount") instanceof Number) ? ((Number) o.get("amount")).doubleValue() : 0.0;
            BigDecimal bAmt = BigDecimal.valueOf(amt);
            totalRevenue = totalRevenue.add(bAmt);

            String ts = String.valueOf(o.get("ts14"));
            if (ts != null && ts.length() >= 6) {
                String month = ts.substring(0, 4) + "-" + ts.substring(4, 6);
                monthlyRevenue.merge(month, bAmt, BigDecimal::add);
            }
        }

        List<Map<String, Object>> monthlyData = new ArrayList<>();
        monthlyRevenue.forEach((m, r) -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("month", m);
            entry.put("revenue", r.setScale(2, RoundingMode.HALF_UP));
            monthlyData.add(entry);
        });

        // 3. Country distribution (top 10)
        Map<String, Long> countryCounts = customers.stream()
                .map(c -> String.valueOf(c.getOrDefault("country", "Unknown")))
                .filter(c -> !c.isBlank() && !"null".equalsIgnoreCase(c))
                .collect(Collectors.groupingBy(c -> c, Collectors.counting()));

        List<Map<String, Object>> countryList = countryCounts.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(10)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("country", e.getKey());
                    m.put("customers", e.getValue());
                    return m;
                })
                .collect(Collectors.toList());

        // 4. ML Segment breakdown & churn risk
        Map<String, Long> segmentCounts = new LinkedHashMap<>();
        segmentCounts.put("Low value", 0L);
        segmentCounts.put("Regular", 0L);
        segmentCounts.put("Loyal", 0L);
        segmentCounts.put("Premium", 0L);

        Map<String, Double> segmentSpendSums = new LinkedHashMap<>();
        segmentSpendSums.put("Low value", 0.0);
        segmentSpendSums.put("Regular", 0.0);
        segmentSpendSums.put("Loyal", 0.0);
        segmentSpendSums.put("Premium", 0.0);

        long highRiskCount = 0;
        double totalPredictedSpend = 0.0;

        for (Map<String, Object> c : customers) {
            String seg = String.valueOf(c.getOrDefault("segment", "Regular"));
            segmentCounts.merge(seg, 1L, Long::sum);

            Object churnObj = c.get("churnProb");
            if (churnObj instanceof Number) {
                if (((Number) churnObj).doubleValue() >= 0.6) {
                    highRiskCount++;
                }
            }

            Object clvObj = c.get("clvPred");
            if (clvObj instanceof Number) {
                double val = ((Number) clvObj).doubleValue();
                totalPredictedSpend += val;
                segmentSpendSums.merge(seg, val, Double::sum);
            }
        }

        List<Map<String, Object>> segmentList = new ArrayList<>();
        segmentCounts.forEach((seg, count) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("segment", seg);
            m.put("count", count);
            double spendSum = segmentSpendSums.getOrDefault(seg, 0.0);
            m.put("avgSpend", count > 0 ? Math.round(spendSum / count) : 0);
            segmentList.add(m);
        });

        // 5. Build summary payload
        summary.put("customers", totalCustomers);
        summary.put("orders", totalOrders);
        summary.put("cancellations", totalCancellations);
        summary.put("totalRevenue", totalRevenue.setScale(2, RoundingMode.HALF_UP));
        summary.put("avgOrderValue", totalOrders > 0
                ? totalRevenue.divide(BigDecimal.valueOf(totalOrders), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO);
        summary.put("monthlyRevenue", monthlyData);
        summary.put("customersByCountry", countryList);
        summary.put("segmentDistribution", segmentList);
        summary.put("highChurnRiskCount", highRiskCount);
        summary.put("totalPredictedSpend", Math.round(totalPredictedSpend));
        summary.put("avgPredictedSpend", totalCustomers > 0 ? Math.round(totalPredictedSpend / totalCustomers) : 0);
        summary.put("mlMetrics", mlMetrics);
        summary.put("source", repository.isHBaseAvailable() ? "HBase (Live)" : "HBase CRM Warehouse (Cleaned Data)");
        summary.put("retrievedAt", Instant.now().toString());

        return summary;
    }
}
