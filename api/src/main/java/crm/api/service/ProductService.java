package crm.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ProductService {

    private final CrmDataRepository repository;

    @Autowired
    public ProductService(CrmDataRepository repository) {
        this.repository = repository;
    }

    public Map<String, Object> getProducts(int page, int size, String search, String category, String sortBy, String sortDir) {
        List<Map<String, Object>> all = repository.getAllProducts();

        // Filter
        List<Map<String, Object>> filtered = all.stream()
                .filter(p -> {
                    if (search != null && !search.isBlank()) {
                        String s = search.toLowerCase().trim();
                        String code = String.valueOf(p.getOrDefault("stockCode", "")).toLowerCase();
                        String desc = String.valueOf(p.getOrDefault("description", "")).toLowerCase();
                        if (!code.contains(s) && !desc.contains(s)) return false;
                    }
                    if (category != null && !category.isBlank() && !"all".equalsIgnoreCase(category)) {
                        String cat = String.valueOf(p.getOrDefault("category", ""));
                        if (!cat.equalsIgnoreCase(category)) return false;
                    }
                    return true;
                })
                .sorted((a, b) -> {
                    int dir = "asc".equalsIgnoreCase(sortDir) ? 1 : -1;
                    String sort = (sortBy == null || sortBy.isBlank()) ? "revenue" : sortBy.toLowerCase();
                    switch (sort) {
                        case "unitssold":
                        case "units":
                            long uA = ((Number) a.getOrDefault("unitsSold", 0L)).longValue();
                            long uB = ((Number) b.getOrDefault("unitsSold", 0L)).longValue();
                            return dir * Long.compare(uA, uB);
                        case "ordercount":
                        case "orders":
                            long oA = ((Number) a.getOrDefault("orderCount", 0L)).longValue();
                            long oB = ((Number) b.getOrDefault("orderCount", 0L)).longValue();
                            return dir * Long.compare(oA, oB);
                        case "avgprice":
                        case "price":
                            double pA = ((Number) a.getOrDefault("avgPrice", 0.0)).doubleValue();
                            double pB = ((Number) b.getOrDefault("avgPrice", 0.0)).doubleValue();
                            return dir * Double.compare(pA, pB);
                        case "cancellationrate":
                        case "returns":
                            double rA = ((Number) a.getOrDefault("cancellationRate", 0.0)).doubleValue();
                            double rB = ((Number) b.getOrDefault("cancellationRate", 0.0)).doubleValue();
                            return dir * Double.compare(rA, rB);
                        case "code":
                        case "stockcode":
                            String cA = String.valueOf(a.getOrDefault("stockCode", ""));
                            String cB = String.valueOf(b.getOrDefault("stockCode", ""));
                            return dir * cA.compareToIgnoreCase(cB);
                        case "revenue":
                        case "totalrevenue":
                        default:
                            double revA = ((Number) a.getOrDefault("totalRevenue", 0.0)).doubleValue();
                            double revB = ((Number) b.getOrDefault("totalRevenue", 0.0)).doubleValue();
                            return dir * Double.compare(revA, revB);
                    }
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

    public Optional<Map<String, Object>> getProductByCode(String code) {
        return repository.getProductByCode(code);
    }

    public List<Map<String, Object>> getCategories() {
        List<Map<String, Object>> all = repository.getAllProducts();
        Map<String, List<Map<String, Object>>> grouped = all.stream()
                .collect(Collectors.groupingBy(p -> String.valueOf(p.getOrDefault("category", "Other"))));

        List<Map<String, Object>> result = new ArrayList<>();
        grouped.forEach((cat, items) -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("category", cat);
            map.put("productCount", items.size());
            long totalUnits = items.stream().mapToLong(p -> ((Number) p.getOrDefault("unitsSold", 0L)).longValue()).sum();
            double totalRev = items.stream().mapToDouble(p -> ((Number) p.getOrDefault("totalRevenue", 0.0)).doubleValue()).sum();
            map.put("totalUnitsSold", totalUnits);
            map.put("totalRevenue", Math.round(totalRev * 100.0) / 100.0);
            result.add(map);
        });

        result.sort((a, b) -> Double.compare(
                ((Number) b.get("totalRevenue")).doubleValue(),
                ((Number) a.get("totalRevenue")).doubleValue()
        ));
        return result;
    }

    public Map<String, Object> getSummary() {
        List<Map<String, Object>> all = repository.getAllProducts();

        long totalSkus = all.size();
        long totalUnitsSold = 0;
        long totalUnitsCancelled = 0;
        double totalRevenue = 0.0;
        double sumPrice = 0.0;

        for (Map<String, Object> p : all) {
            totalUnitsSold += ((Number) p.getOrDefault("unitsSold", 0L)).longValue();
            totalUnitsCancelled += ((Number) p.getOrDefault("unitsCancelled", 0L)).longValue();
            totalRevenue += ((Number) p.getOrDefault("totalRevenue", 0.0)).doubleValue();
            sumPrice += ((Number) p.getOrDefault("avgPrice", 0.0)).doubleValue();
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalSkus", totalSkus);
        summary.put("totalUnitsSold", totalUnitsSold);
        summary.put("totalUnitsCancelled", totalUnitsCancelled);
        summary.put("totalRevenue", Math.round(totalRevenue * 100.0) / 100.0);
        summary.put("avgPrice", totalSkus > 0 ? Math.round((sumPrice / totalSkus) * 100.0) / 100.0 : 0.0);
        
        List<Map<String, Object>> categories = getCategories();
        summary.put("categories", categories);
        if (!categories.isEmpty()) {
            summary.put("topCategory", categories.get(0).get("category"));
        }

        return summary;
    }
}
