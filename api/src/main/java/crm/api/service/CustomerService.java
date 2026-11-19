package crm.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class CustomerService {

    private final CrmDataRepository repository;

    @Autowired
    public CustomerService(CrmDataRepository repository) {
        this.repository = repository;
    }

    public Map<String, Object> getCustomers(int page, int size, String search, String segment, String country) {
        List<Map<String, Object>> all = repository.getAllCustomers();

        // Apply filters
        List<Map<String, Object>> filtered = all.stream()
                .filter(c -> {
                    if (search != null && !search.isBlank()) {
                        String s = search.toLowerCase().trim();
                        String cid = String.valueOf(c.getOrDefault("cid", "")).toLowerCase();
                        String cntry = String.valueOf(c.getOrDefault("country", "")).toLowerCase();
                        if (!cid.contains(s) && !cntry.contains(s)) return false;
                    }
                    if (segment != null && !segment.isBlank() && !"all".equalsIgnoreCase(segment)) {
                        String seg = String.valueOf(c.getOrDefault("segment", ""));
                        if (!seg.equalsIgnoreCase(segment)) return false;
                    }
                    if (country != null && !country.isBlank() && !"all".equalsIgnoreCase(country)) {
                        String cntry = String.valueOf(c.getOrDefault("country", ""));
                        if (!cntry.equalsIgnoreCase(country)) return false;
                    }
                    return true;
                })
                .sorted((a, b) -> {
                    // Default sort: highest churn probability first
                    double cA = ((Number) a.getOrDefault("churnProb", 0.0)).doubleValue();
                    double cB = ((Number) b.getOrDefault("churnProb", 0.0)).doubleValue();
                    return Double.compare(cB, cA);
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

    public Optional<Map<String, Object>> getCustomerById(String id) {
        return repository.getCustomerById(id);
    }
}
