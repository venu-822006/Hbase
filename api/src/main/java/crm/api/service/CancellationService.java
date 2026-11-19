package crm.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CancellationService {

    private final CrmDataRepository repository;

    @Autowired
    public CancellationService(CrmDataRepository repository) {
        this.repository = repository;
    }

    public Map<String, Object> getCancellations(int page, int size, String search) {
        List<Map<String, Object>> all = repository.getCancellations();

        List<Map<String, Object>> filtered = all.stream()
                .filter(c -> {
                    if (search != null && !search.isBlank()) {
                        String s = search.toLowerCase().trim();
                        String inv = String.valueOf(c.getOrDefault("invoice", "")).toLowerCase();
                        String cid = String.valueOf(c.getOrDefault("cid", "")).toLowerCase();
                        if (!inv.contains(s) && !cid.contains(s)) return false;
                    }
                    return true;
                })
                .sorted((a, b) -> {
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

    public Map<String, Object> getCancellationStats() {
        List<Map<String, Object>> cancellations = repository.getCancellations();
        List<Map<String, Object>> orders = repository.getOrders();

        long totalCanc = cancellations.size();
        double totalRefunded = 0;
        for (Map<String, Object> c : cancellations) {
            totalRefunded += ((Number) c.getOrDefault("amount", 0.0)).doubleValue();
        }

        long totalOrders = orders.size();
        double returnRate = (totalOrders + totalCanc) > 0
                ? (double) totalCanc / (totalOrders + totalCanc) * 100.0
                : 0.0;

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalCancellations", totalCanc);
        stats.put("totalRefunded", BigDecimal.valueOf(totalRefunded).setScale(2, RoundingMode.HALF_UP));
        stats.put("returnRatePercentage", BigDecimal.valueOf(returnRate).setScale(2, RoundingMode.HALF_UP));
        return stats;
    }
}
