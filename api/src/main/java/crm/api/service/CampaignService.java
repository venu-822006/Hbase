package crm.api.service;

import org.apache.hadoop.hbase.TableName;
import org.apache.hadoop.hbase.client.Connection;
import org.apache.hadoop.hbase.client.Put;
import org.apache.hadoop.hbase.client.Table;
import org.apache.hadoop.hbase.util.Bytes;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CampaignService {

    private static final Logger log = LoggerFactory.getLogger(CampaignService.class);

    private final CrmDataRepository repository;
    private final Connection hbaseConnection;

    @Autowired
    public CampaignService(CrmDataRepository repository, Connection hbaseConnection) {
        this.repository = repository;
        this.hbaseConnection = hbaseConnection;
    }

    public List<Map<String, Object>> getCampaigns() {
        return repository.getAllCampaigns();
    }

    public Map<String, Object> getOffers(int page, int size, String campaignFilter) {
        List<Map<String, Object>> all = repository.getOffers();

        // If offers cache is empty, dynamically generate them from customer ML scores
        if (all.isEmpty()) {
            all = generateDynamicOffers();
        }

        List<Map<String, Object>> filtered = all.stream()
                .filter(o -> {
                    if (campaignFilter != null && !campaignFilter.isBlank() && !"all".equalsIgnoreCase(campaignFilter)) {
                        return campaignFilter.equalsIgnoreCase(String.valueOf(o.get("campaign")));
                    }
                    return true;
                })
                .sorted((a, b) -> {
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

    public Map<String, Object> generateAndSyncOffers() {
        List<Map<String, Object>> offers = generateDynamicOffers();
        int winBack = 0;
        int loyalty = 0;

        for (Map<String, Object> o : offers) {
            if ("M002".equals(o.get("campaign"))) winBack++;
            else if ("M004".equals(o.get("campaign"))) loyalty++;
        }

        boolean syncedToHBase = false;
        if (hbaseConnection != null && !hbaseConnection.isClosed()) {
            try (Table t = hbaseConnection.getTable(TableName.valueOf("crm_interaction"))) {
                String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
                List<Put> puts = new ArrayList<>();
                for (Map<String, Object> o : offers) {
                    Put p = new Put(Bytes.toBytes(o.get("cid") + "_" + ts + "_" + o.get("campaign")));
                    p.addColumn(Bytes.toBytes("activity"), Bytes.toBytes("type"), Bytes.toBytes("campaign_offer"));
                    p.addColumn(Bytes.toBytes("activity"), Bytes.toBytes("campaign"), Bytes.toBytes(String.valueOf(o.get("campaign"))));
                    puts.add(p);
                    if (puts.size() >= 500) {
                        t.put(puts);
                        puts.clear();
                    }
                }
                if (!puts.isEmpty()) {
                    t.put(puts);
                }
                syncedToHBase = true;
                log.info("Synced {} offers to HBase table crm_interaction", offers.size());
            } catch (Exception e) {
                log.warn("Failed to sync offers to HBase: {}", e.getMessage());
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "SUCCESS");
        result.put("totalOffersGenerated", offers.size());
        result.put("winBackOffers", winBack);
        result.put("loyaltyOffers", loyalty);
        result.put("syncedToHBase", syncedToHBase);
        return result;
    }

    private List<Map<String, Object>> generateDynamicOffers() {
        List<Map<String, Object>> customers = repository.getAllCustomers();
        List<Map<String, Object>> offers = new ArrayList<>();

        for (Map<String, Object> c : customers) {
            double churn = ((Number) c.getOrDefault("churnProb", 0.0)).doubleValue();
            String seg = String.valueOf(c.getOrDefault("segment", "Regular"));
            String camp = null;
            String campName = null;

            if (churn >= 0.6) {
                camp = "M002";
                campName = "Win-back discount";
            } else if (("Loyal".equals(seg) || "Premium".equals(seg)) && churn < 0.3) {
                camp = "M004";
                campName = "Loyalty rewards";
            }

            if (camp != null) {
                Map<String, Object> o = new LinkedHashMap<>();
                o.put("cid", c.get("cid"));
                o.put("country", c.get("country"));
                o.put("segment", seg);
                o.put("churnProb", churn);
                o.put("campaign", camp);
                o.put("campaignName", campName);
                offers.add(o);
            }
        }
        return offers;
    }
}
