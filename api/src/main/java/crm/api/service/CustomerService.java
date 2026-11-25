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

    public Map<String, Object> getCustomers(
            int page,
            int size,
            String search,
            String segment,
            String country,
            String risk,
            String sortBy
    ) {
        List<Map<String, Object>> all = repository.getAllCustomers();

        List<Map<String, Object>> filtered = all.stream()
                .filter(c -> {
                    if (search != null && !search.isBlank()) {
                        String s = search.toLowerCase().trim();
                        String cid = String.valueOf(c.getOrDefault("cid", "")).toLowerCase();
                        String cntry = String.valueOf(c.getOrDefault("country", "")).toLowerCase();
                        String segStr = String.valueOf(c.getOrDefault("segment", "")).toLowerCase();
                        if (!cid.contains(s) && !cntry.contains(s) && !segStr.contains(s)) return false;
                    }
                    if (segment != null && !segment.isBlank() && !"all".equalsIgnoreCase(segment)) {
                        String seg = String.valueOf(c.getOrDefault("segment", ""));
                        if (!seg.equalsIgnoreCase(segment)) return false;
                    }
                    if (country != null && !country.isBlank() && !"all".equalsIgnoreCase(country)) {
                        String cntry = String.valueOf(c.getOrDefault("country", ""));
                        if (!cntry.equalsIgnoreCase(country)) return false;
                    }
                    if (risk != null && !risk.isBlank() && !"all".equalsIgnoreCase(risk)) {
                        double churn = ((Number) c.getOrDefault("churnProb", 0.0)).doubleValue();
                        if ("HIGH".equalsIgnoreCase(risk) && churn < 0.6) return false;
                        if ("MEDIUM".equalsIgnoreCase(risk) && (churn < 0.3 || churn >= 0.6)) return false;
                        if ("SAFE".equalsIgnoreCase(risk) && churn >= 0.3) return false;
                    }
                    return true;
                })
                .sorted((a, b) -> {
                    String sort = (sortBy == null || sortBy.isBlank()) ? "risk" : sortBy.toLowerCase();
                    switch (sort) {
                        case "spend":
                        case "monetary": {
                            double mA = ((Number) a.getOrDefault("monetary", 0.0)).doubleValue();
                            double mB = ((Number) b.getOrDefault("monetary", 0.0)).doubleValue();
                            return Double.compare(mB, mA);
                        }
                        case "clv": {
                            double cA = ((Number) a.getOrDefault("clvPred", 0.0)).doubleValue();
                            double cB = ((Number) b.getOrDefault("clvPred", 0.0)).doubleValue();
                            return Double.compare(cB, cA);
                        }
                        case "recency": {
                            int rA = ((Number) a.getOrDefault("recency", 0)).intValue();
                            int rB = ((Number) b.getOrDefault("recency", 0)).intValue();
                            return Integer.compare(rB, rA);
                        }
                        case "risk":
                        default: {
                            double cA = ((Number) a.getOrDefault("churnProb", 0.0)).doubleValue();
                            double cB = ((Number) b.getOrDefault("churnProb", 0.0)).doubleValue();
                            return Double.compare(cB, cA);
                        }
                    }
                })
                .collect(Collectors.toList());

        int total = filtered.size();
        int safeSize = Math.max(1, Math.min(size, 200));
        int fromIndex = Math.min(page * safeSize, total);
        int toIndex = Math.min(fromIndex + safeSize, total);

        List<Map<String, Object>> content = filtered.subList(fromIndex, toIndex);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("content", content);
        response.put("page", page);
        response.put("size", safeSize);
        response.put("totalElements", total);
        response.put("totalPages", (int) Math.ceil((double) total / safeSize));

        return response;
    }

    public Optional<Map<String, Object>> getCustomerById(String id) {
        return repository.getCustomerById(id);
    }
}
