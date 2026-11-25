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
    private final MlService mlService;

    @Autowired
    public CampaignService(
            CrmDataRepository repository,
            @org.springframework.lang.Nullable Connection hbaseConnection,
            MlService mlService
    ) {
        this.repository = repository;
        this.hbaseConnection = hbaseConnection;
        this.mlService = mlService;
    }

    public List<Map<String, Object>> getCampaigns() {
        List<Map<String, Object>> baseCampaigns = repository.getAllCampaigns();
        List<Map<String, Object>> customers = repository.getAllCustomers();

        List<Map<String, Object>> enriched = new ArrayList<>();
        for (Map<String, Object> camp : baseCampaigns) {
            Map<String, Object> copy = new LinkedHashMap<>(camp);
            String id = String.valueOf(camp.getOrDefault("id", ""));
            List<Map<String, Object>> cohort = filterCohort(customers, id);
            double totalClv = cohort.stream().mapToDouble(c -> ((Number) c.getOrDefault("clvPred", 0.0)).doubleValue()).sum();
            copy.put("targetCount", cohort.size());
            copy.put("cohortProjectedClv", Math.round(totalClv));
            enriched.add(copy);
        }
        return enriched;
    }

    public Map<String, Object> dispatchCampaign(String cid, String campaignId, String channel, String notes) {
        return repository.recordInteraction(cid, campaignId, channel, notes);
    }

    public List<Map<String, Object>> getInteractions(String cid) {
        return repository.getInteractions(cid);
    }

    public Map<String, Object> getOffers(int page, int size, String campaignFilter, String search) {
        List<Map<String, Object>> all = repository.getOffers();

        if (all.isEmpty()) {
            all = generateDynamicOffers();
        }

        List<Map<String, Object>> filtered = all.stream()
                .filter(o -> {
                    if (campaignFilter != null && !campaignFilter.isBlank() && !"all".equalsIgnoreCase(campaignFilter)) {
                        if (!campaignFilter.equalsIgnoreCase(String.valueOf(o.get("campaign")))) return false;
                    }
                    if (search != null && !search.isBlank()) {
                        String s = search.toLowerCase().trim();
                        String cid = String.valueOf(o.getOrDefault("cid", "")).toLowerCase();
                        String cntry = String.valueOf(o.getOrDefault("country", "")).toLowerCase();
                        String seg = String.valueOf(o.getOrDefault("segment", "")).toLowerCase();
                        if (!cid.contains(s) && !cntry.contains(s) && !seg.contains(s)) return false;
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

    /**
     * Full Voucher Implementation & Return Intelligence Report backed by real customer data and Spark MLlib scoring.
     */
    public Map<String, Object> simulateVoucherImplementation(Map<String, Object> config) {
        String cohortKey = String.valueOf(config.getOrDefault("cohort", "M002"));
        String voucherType = String.valueOf(config.getOrDefault("voucherType", "PERCENT_OFF"));
        double discountValue = toDouble(config.get("discountValue"), 15.0);
        double minOrderValue = toDouble(config.get("minOrderValue"), 900.0);
        int validityDays = (int) toDouble(config.get("validityDays"), 14.0);
        String channel = String.valueOf(config.getOrDefault("channel", "EMAIL"));
        double grossMarginPct = toDouble(config.get("grossMarginPct"), 34.0);
        double redemptionOverride = toDouble(config.get("expectedRedemptionPct"), -1.0);
        double maxBudgetCap = toDouble(config.get("maxBudgetCap"), 500000.0);
        String voucherCode = String.valueOf(config.getOrDefault("voucherCode", "APEX" + cohortKey));

        List<Map<String, Object>> allCustomers = repository.getAllCustomers();
        List<Map<String, Object>> matchedCohort = filterCohort(allCustomers, cohortKey);

        // Sort highest priority first (highest churn for win-back, highest CLV for loyalty)
        matchedCohort.sort((a, b) -> {
            if ("M004".equalsIgnoreCase(cohortKey) || "PREMIUM".equalsIgnoreCase(cohortKey)) {
                return Double.compare(
                        ((Number) b.getOrDefault("clvPred", 0.0)).doubleValue(),
                        ((Number) a.getOrDefault("clvPred", 0.0)).doubleValue()
                );
            }
            return Double.compare(
                    ((Number) b.getOrDefault("churnProb", 0.0)).doubleValue(),
                    ((Number) a.getOrDefault("churnProb", 0.0)).doubleValue()
            );
        });

        int eligibleCount = matchedCohort.size();
        double cohortHistoricalGmv = 0.0;
        double cohortBaselineClv = 0.0;
        double sumChurn = 0.0;
        double sumPostChurn = 0.0;
        double sumRecency = 0.0;
        double sumFreq = 0.0;
        double sumMonetary = 0.0;
        long totalCancellations = 0;
        Map<String, Long> countryCounts = new LinkedHashMap<>();
        Map<String, Long> segmentCounts = new LinkedHashMap<>();

        // Effective monetary discount per redeemed transaction
        double expectedBasket = Math.max(minOrderValue * 1.12, 850.0);
        double effectiveDiscountPerOrder;
        if ("PERCENT_OFF".equalsIgnoreCase(voucherType)) {
            effectiveDiscountPerOrder = Math.min(expectedBasket * 0.45, expectedBasket * (discountValue / 100.0));
        } else if ("FREE_SHIPPING".equalsIgnoreCase(voucherType)) {
            effectiveDiscountPerOrder = discountValue; // freight subsidy cost per order
        } else {
            effectiveDiscountPerOrder = discountValue; // FLAT_INR or STORE_CREDIT
        }

        // Dynamic redemption propensity estimation if not manually overridden
        double channelBoost = "CONCIERGE".equalsIgnoreCase(channel) ? 8.0 : "WHATSAPP".equalsIgnoreCase(channel) ? 5.5 : "PUSH_EMAIL".equalsIgnoreCase(channel) ? 3.5 : 0.0;
        double discountElasticity = ("PERCENT_OFF".equalsIgnoreCase(voucherType) ? discountValue : (discountValue / expectedBasket) * 100.0) * 0.45;
        double hurdlePenalty = Math.max(0.0, (minOrderValue - 700.0) / 150.0) * 1.4;
        double urgencyFactor = validityDays <= 7 ? 2.5 : validityDays <= 14 ? 1.5 : 0.0;
        double baseCohortRate = "M004".equalsIgnoreCase(cohortKey) ? 24.0 : "M001".equalsIgnoreCase(cohortKey) ? 21.0 : 11.5;
        double computedRedemptionPct = Math.max(4.0, Math.min(48.0, baseCohortRate + discountElasticity + channelBoost + urgencyFactor - hurdlePenalty));
        double effectiveRedemptionPct = redemptionOverride > 0 ? redemptionOverride : Math.round(computedRedemptionPct * 10.0) / 10.0;

        List<Map<String, Object>> recipientPreview = new ArrayList<>();
        int migratedCount = 0;

        for (int i = 0; i < eligibleCount; i++) {
            Map<String, Object> c = matchedCohort.get(i);
            double ch = ((Number) c.getOrDefault("churnProb", 0.0)).doubleValue();
            double clv = ((Number) c.getOrDefault("clvPred", 0.0)).doubleValue();
            double mon = ((Number) c.getOrDefault("monetary", 0.0)).doubleValue();
            double rec = ((Number) c.getOrDefault("recency", 45)).doubleValue();
            double frq = ((Number) c.getOrDefault("frequency", 1)).doubleValue();
            double canc = ((Number) c.getOrDefault("cancellations", 0)).doubleValue();
            String seg = String.valueOf(c.getOrDefault("segment", "Regular"));
            String cntry = String.valueOf(c.getOrDefault("country", "Unknown"));

            cohortHistoricalGmv += mon;
            cohortBaselineClv += clv;
            sumChurn += ch;
            sumRecency += rec;
            sumFreq += frq;
            sumMonetary += mon;
            totalCancellations += (long) canc;
            countryCounts.merge(cntry, 1L, Long::sum);
            segmentCounts.merge(seg, 1L, Long::sum);

            // Sample Spark MLlib re-scoring across up to 400 representative rows for ultra-fast response
            double postChurn = ch;
            if (i < 400) {
                Map<String, Object> sim = mlService.predict(7.0, frq + 1.0, mon + expectedBasket, canc);
                postChurn = ((Number) sim.get("churnProb")).doubleValue();
            } else {
                postChurn = Math.max(0.08, ch * 0.56);
            }
            sumPostChurn += postChurn;
            if (ch >= 0.6 && postChurn < 0.6) {
                migratedCount++;
            }

            if (recipientPreview.size() < 25) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("cid", c.get("cid"));
                row.put("country", cntry);
                row.put("segment", seg);
                row.put("baselineChurnPct", Math.round(ch * 1000.0) / 10.0);
                row.put("projectedPostChurnPct", Math.round(postChurn * 1000.0) / 10.0);
                row.put("riskDropPts", Math.round((ch - postChurn) * 1000.0) / 10.0);
                row.put("historicalGmv", Math.round(mon));
                row.put("clvPred", Math.round(clv));
                row.put("voucherCode", voucherCode + "-" + c.get("cid"));
                recipientPreview.add(row);
            }
        }

        double baselineAvgChurnPct = eligibleCount > 0 ? Math.round((sumChurn / eligibleCount) * 1000.0) / 10.0 : 0.0;
        double postAvgChurnPct = eligibleCount > 0 ? Math.round((sumPostChurn / eligibleCount) * 1000.0) / 10.0 : 0.0;
        double avgChurnDropPts = Math.round((baselineAvgChurnPct - postAvgChurnPct) * 10.0) / 10.0;

        int expectedRedemptions = (int) Math.round(eligibleCount * (effectiveRedemptionPct / 100.0));
        double channelUnitCost = "CONCIERGE".equalsIgnoreCase(channel) ? 18.0 : "WHATSAPP".equalsIgnoreCase(channel) ? 1.5 : 0.45;
        double channelOpsCost = Math.round(eligibleCount * channelUnitCost);

        double maxTheoreticalLiability = Math.round(eligibleCount * effectiveDiscountPerOrder);
        double directVoucherCost = Math.round(expectedRedemptions * effectiveDiscountPerOrder);
        double breakageSavings = Math.max(0.0, maxTheoreticalLiability - directVoucherCost);
        double totalImplementationCost = directVoucherCost + channelOpsCost;
        boolean exceedsBudget = totalImplementationCost > maxBudgetCap;

        // Return Intelligence (including follow-on 180d repeat factor for retained customers)
        double followOnMultiplier = "M004".equalsIgnoreCase(cohortKey) ? 2.4 : 1.65;
        double grossImmediateRevenue = Math.round(expectedRedemptions * expectedBasket);
        double incrementalOrders180d = Math.round(expectedRedemptions * followOnMultiplier);
        double gross180dRevenue = Math.round(incrementalOrders180d * expectedBasket);
        double cogsCost = Math.round(gross180dRevenue * (1.0 - (grossMarginPct / 100.0)));
        double netContributionProfit = Math.round(gross180dRevenue - cogsCost - directVoucherCost - channelOpsCost);
        double immediateNetProfit = Math.round((grossImmediateRevenue * (grossMarginPct / 100.0)) - directVoucherCost - channelOpsCost);
        double roiMultiple = totalImplementationCost > 0 ? Math.round((netContributionProfit / totalImplementationCost) * 10.0) / 10.0 : 0.0;

        // Break-even metrics
        double marginPerOrderBeforeVoucher = expectedBasket * (grossMarginPct / 100.0);
        double netMarginPerOrder = marginPerOrderBeforeVoucher - effectiveDiscountPerOrder;
        int breakEvenRedemptions = netMarginPerOrder > 0 ? (int) Math.ceil(channelOpsCost / netMarginPerOrder) : eligibleCount;
        double breakEvenRatePct = eligibleCount > 0 ? Math.round((breakEvenRedemptions * 1000.0) / eligibleCount) / 10.0 : 100.0;
        double paybackDays = netContributionProfit > 0 ? Math.max(3.0, Math.round((totalImplementationCost / Math.max(1.0, grossImmediateRevenue * (grossMarginPct / 100.0) / validityDays)) * 10.0) / 10.0) : 999.0;

        long scaledMigrated = eligibleCount > 0 ? Math.round(((double) migratedCount / eligibleCount) * expectedRedemptions) : 0;
        double clvLiftPerRedeemer = Math.round(expectedBasket * followOnMultiplier * 0.42);
        double totalClvUnlocked = Math.round(expectedRedemptions * clvLiftPerRedeemer);

        // Top countries
        List<Map<String, Object>> topCountries = countryCounts.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(5)
                .map(e -> Map.<String, Object>of("country", e.getKey(), "count", e.getValue()))
                .collect(Collectors.toList());

        Map<String, Object> allocationSpec = new LinkedHashMap<>();
        allocationSpec.put("cohortKey", cohortKey);
        allocationSpec.put("cohortLabel", describeCohort(cohortKey));
        allocationSpec.put("eligibleAccounts", eligibleCount);
        allocationSpec.put("voucherType", voucherType);
        allocationSpec.put("voucherCode", voucherCode);
        allocationSpec.put("discountValue", discountValue);
        allocationSpec.put("effectiveDiscountPerOrder", Math.round(effectiveDiscountPerOrder));
        allocationSpec.put("minOrderValue", Math.round(minOrderValue));
        allocationSpec.put("validityDays", validityDays);
        allocationSpec.put("channel", channel);
        allocationSpec.put("grossMarginPct", grossMarginPct);
        allocationSpec.put("maxBudgetCap", maxBudgetCap);
        allocationSpec.put("exceedsBudget", exceedsBudget);
        allocationSpec.put("expectedRedemptionRatePct", effectiveRedemptionPct);
        allocationSpec.put("expectedRedemptions", expectedRedemptions);
        allocationSpec.put("maxTheoreticalLiability", maxTheoreticalLiability);
        allocationSpec.put("directVoucherCost", directVoucherCost);
        allocationSpec.put("channelOpsCost", channelOpsCost);
        allocationSpec.put("breakageSavings", breakageSavings);
        allocationSpec.put("totalImplementationCost", totalImplementationCost);
        allocationSpec.put("cohortHistoricalGmv", Math.round(cohortHistoricalGmv));
        allocationSpec.put("cohortAvgRecencyDays", eligibleCount > 0 ? Math.round(sumRecency / eligibleCount) : 0);
        allocationSpec.put("cohortAvgFrequency", eligibleCount > 0 ? Math.round((sumFreq / eligibleCount) * 10.0) / 10.0 : 0);
        allocationSpec.put("cohortTotalCancellations", totalCancellations);
        allocationSpec.put("topCountries", topCountries);
        allocationSpec.put("segmentBreakdown", segmentCounts);

        Map<String, Object> returnIntel = new LinkedHashMap<>();
        returnIntel.put("rescuedAccounts", expectedRedemptions);
        returnIntel.put("baselineAvgChurnPct", baselineAvgChurnPct);
        returnIntel.put("postVoucherAvgChurnPct", postAvgChurnPct);
        returnIntel.put("churnDropPctPts", avgChurnDropPts);
        returnIntel.put("expectedOrderBasket", Math.round(expectedBasket));
        returnIntel.put("grossImmediateRevenue", grossImmediateRevenue);
        returnIntel.put("immediateNetProfit", immediateNetProfit);
        returnIntel.put("incrementalOrders180d", (long) incrementalOrders180d);
        returnIntel.put("gross180dRevenue", gross180dRevenue);
        returnIntel.put("cogsCost", cogsCost);
        returnIntel.put("netContributionProfit", netContributionProfit);
        returnIntel.put("roiMultiple", roiMultiple);
        returnIntel.put("netMarginPerRedeemedOrder", Math.round(netMarginPerOrder));
        returnIntel.put("breakEvenRedemptions", breakEvenRedemptions);
        returnIntel.put("breakEvenRatePct", breakEvenRatePct);
        returnIntel.put("paybackDays", paybackDays);
        returnIntel.put("clvLiftPerRedeemer", clvLiftPerRedeemer);
        returnIntel.put("totalClvUnlocked", totalClvUnlocked);
        returnIntel.put("estimatedHighRiskRescuedFromChurnZone", scaledMigrated);
        returnIntel.put("followOnOrderMultiplier", followOnMultiplier);
        returnIntel.put("riskGuardrailStatus", netMarginPerOrder > 0 ? "MARGIN POSITIVE" : "MARGIN ERODING - RAISE MIN ORDER");

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("allocationSpec", allocationSpec);
        report.put("returnIntelligence", returnIntel);
        report.put("recipientSample", recipientPreview);
        report.put("generatedAt", LocalDateTime.now().toString());
        return report;
    }

    /**
     * Dispatch voucher batch into HBase crm_interaction for a target cohort.
     */
    public Map<String, Object> dispatchVoucherBatch(Map<String, Object> payload) {
        String cohortKey = String.valueOf(payload.getOrDefault("cohort", "M002"));
        String voucherCode = String.valueOf(payload.getOrDefault("voucherCode", "APEX" + cohortKey));
        String channel = String.valueOf(payload.getOrDefault("channel", "EMAIL"));
        String notes = String.valueOf(payload.getOrDefault("notes", "Approved Voucher Implementation Batch"));
        int limit = Math.min(250, Math.max(1, (int) toDouble(payload.get("limit"), 25.0)));

        List<Map<String, Object>> cohort = filterCohort(repository.getAllCustomers(), cohortKey);
        cohort.sort((a, b) -> Double.compare(
                ((Number) b.getOrDefault("churnProb", 0.0)).doubleValue(),
                ((Number) a.getOrDefault("churnProb", 0.0)).doubleValue()
        ));

        List<Map<String, Object>> targets = cohort.subList(0, Math.min(limit, cohort.size()));
        int committedCount = 0;
        List<String> rowKeys = new ArrayList<>();

        for (Map<String, Object> c : targets) {
            String cid = String.valueOf(c.get("cid"));
            Map<String, Object> rec = repository.recordInteraction(
                    cid,
                    cohortKey,
                    channel,
                    voucherCode + " | " + notes
            );
            if (Boolean.TRUE.equals(rec.get("hbaseCommitted"))) {
                committedCount++;
            }
            if (rowKeys.size() < 10) {
                rowKeys.add(String.valueOf(rec.get("rowKey")));
            }
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("status", "DISPATCHED");
        res.put("cohort", cohortKey);
        res.put("voucherCode", voucherCode);
        res.put("dispatchedCount", targets.size());
        res.put("hbaseCommittedCount", committedCount);
        res.put("sampleRowKeys", rowKeys);
        res.put("timestamp", LocalDateTime.now().toString());
        return res;
    }

    private List<Map<String, Object>> filterCohort(List<Map<String, Object>> customers, String cohortKey) {
        String key = cohortKey == null ? "M002" : cohortKey.toUpperCase();
        return customers.stream().filter(c -> {
            double churn = ((Number) c.getOrDefault("churnProb", 0.0)).doubleValue();
            int freq = ((Number) c.getOrDefault("frequency", 1)).intValue();
            int rec = ((Number) c.getOrDefault("recency", 45)).intValue();
            double mon = ((Number) c.getOrDefault("monetary", 0.0)).doubleValue();
            String seg = String.valueOf(c.getOrDefault("segment", "Regular"));

            switch (key) {
                case "M001":
                    return freq <= 2 && rec <= 90;
                case "M002":
                case "HIGH_RISK":
                    return churn >= 0.6;
                case "M003":
                case "SEASONAL":
                    return rec >= 90 && mon >= 300;
                case "M004":
                case "LOYALTY":
                    return ("Loyal".equalsIgnoreCase(seg) || "Premium".equalsIgnoreCase(seg)) && churn < 0.3;
                case "PREMIUM":
                    return "Premium".equalsIgnoreCase(seg);
                case "WATCHLIST":
                    return churn >= 0.3 && churn < 0.6;
                case "ALL":
                    return true;
                default:
                    return churn >= 0.6;
            }
        }).collect(Collectors.toList());
    }

    private String describeCohort(String key) {
        if (key == null) return "High Churn Risk Cohort";
        switch (key.toUpperCase()) {
            case "M001": return "M001 · Welcome & Early Activation (New Buyers <=2 Orders)";
            case "M002": return "M002 · High-Risk Churn Win-Back (Churn Prob >= 60%)";
            case "M003": return "M003 · Seasonal Re-Engagement (Dormant >=90d, GMV >=₹300)";
            case "M004": return "M004 · VIP & Loyal Retention (Loyal/Premium, Churn <30%)";
            case "PREMIUM": return "Premium Institutional Cohort (Top Revenue Accounts)";
            case "WATCHLIST": return "Medium-Risk Watchlist (Churn 30%–59%)";
            case "ALL": return "Full Active Enterprise Portfolio (All 5,721 Accounts)";
            default: return "Custom Retention Cohort (" + key + ")";
        }
    }

    private double toDouble(Object v, double fallback) {
        if (v instanceof Number) return ((Number) v).doubleValue();
        if (v != null) {
            try { return Double.parseDouble(String.valueOf(v)); } catch (Exception ignored) {}
        }
        return fallback;
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
