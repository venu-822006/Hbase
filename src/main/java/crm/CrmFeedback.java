package crm;

import org.apache.hadoop.hbase.TableName;
import org.apache.hadoop.hbase.client.*;
import org.apache.hadoop.hbase.util.Bytes;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/** Step 8 (Feedback to CRM): turn the ML results (data/results.csv, written by the Python ML part) into campaign offers
 *  and store them in HBase (crm_interaction).  High churn risk -> M002 Win-back discount; Loyal/Premium & low risk -> M004 Loyalty rewards.
 *  Option: --dry-run (do not write to HBase). */
public class CrmFeedback {
    public static void main(String[] args) throws Exception {
        boolean dry = Arrays.asList(args).contains("--dry-run");
        List<Map<String, String>> res = Common.readCsv(Common.DATA + "/results.csv");
        List<Map<String, Object>> offers = new ArrayList<>();
        int win = 0, loyal = 0;
        for (Map<String, String> r : res) {
            double p = Double.parseDouble(r.get("churn_prob")); String seg = r.get("segment"), camp = null;
            if (p >= 0.6) { camp = "M002"; win++; }
            else if ((seg.equals("Loyal") || seg.equals("Premium")) && p < 0.3) { camp = "M004"; loyal++; }
            if (camp == null) continue;
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("customer_id", r.get("customer_id")); o.put("country", r.get("country")); o.put("segment", seg);
            o.put("churn_prob", p); o.put("campaign", camp);
            offers.add(o);
        }
        System.out.println("offers: " + win + " win-back (M002), " + loyal + " loyalty (M004)");
        if (offers.isEmpty()) return;
        Common.writeCsv("feedback_offers.csv", offers);
        if (dry) return;
        String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        try (Connection conn = HBaseUtil.connect(); Table t = conn.getTable(TableName.valueOf("crm_interaction"))) {
            List<Put> puts = new ArrayList<>();
            for (Map<String, Object> o : offers) {
                Put p = new Put(Bytes.toBytes(o.get("customer_id") + "_" + ts + "_" + o.get("campaign")));
                p.addColumn(Bytes.toBytes("activity"), Bytes.toBytes("type"), Bytes.toBytes("campaign_offer"));
                p.addColumn(Bytes.toBytes("activity"), Bytes.toBytes("campaign"), Bytes.toBytes(o.get("campaign").toString()));
                puts.add(p);
            }
            t.put(puts);
            System.out.println("offers written to HBase table crm_interaction");
        }
    }
}
