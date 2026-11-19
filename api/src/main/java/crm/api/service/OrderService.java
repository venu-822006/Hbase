package crm.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private final CrmDataRepository repository;

    @Autowired
    public OrderService(CrmDataRepository repository) {
        this.repository = repository;
    }

    public Map<String, Object> getOrders(int page, int size, String search, Double minAmount, Double maxAmount) {
        List<Map<String, Object>> all = repository.getOrders();

        List<Map<String, Object>> filtered = all.stream()
                .filter(o -> {
                    if (search != null && !search.isBlank()) {
                        String s = search.toLowerCase().trim();
                        String inv = String.valueOf(o.getOrDefault("invoice", "")).toLowerCase();
                        String cid = String.valueOf(o.getOrDefault("cid", "")).toLowerCase();
                        if (!inv.contains(s) && !cid.contains(s)) return false;
                    }
                    double amt = ((Number) o.getOrDefault("amount", 0.0)).doubleValue();
                    if (minAmount != null && amt < minAmount) return false;
                    if (maxAmount != null && amt > maxAmount) return false;
                    return true;
                })
                .sorted((a, b) -> {
                    // Newest timestamp first
                    String tA = String.valueOf(a.getOrDefault("ts14", ""));
                    String tB = String.valueOf(b.getOrDefault("ts14", ""));
                    return tB.compareTo(tA);
                })
                .collect(Collectors.toList());

        int total = filtered.size();
        int fromIndex = Math.min(page * size, total);
        int toIndex = Math.min(fromIndex + size, total);

        List<Map<String, Object>> content = filtered.subList(fromIndex, toIndex);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("content", content);
        response.put("page", page);
        response.put("size", size);
        response.put("totalElements", total);
        response.put("totalPages", (int) Math.ceil((double) total / size));

        return response;
    }

    public Map<String, Object> getOrderStats() {
        List<Map<String, Object>> orders = repository.getOrders();
        long totalOrders = orders.size();
        double totalVolume = 0;
        long totalItems = 0;

        for (Map<String, Object> o : orders) {
            totalVolume += ((Number) o.getOrDefault("amount", 0.0)).doubleValue();
            totalItems += ((Number) o.getOrDefault("items", 0)).longValue();
        }

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalOrders", totalOrders);
        stats.put("totalVolume", BigDecimal.valueOf(totalVolume).setScale(2, RoundingMode.HALF_UP));
        stats.put("totalItems", totalItems);
        stats.put("avgOrderValue", totalOrders > 0
                ? BigDecimal.valueOf(totalVolume / totalOrders).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO);
        return stats;
    }
}
