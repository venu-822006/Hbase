package crm;

import java.nio.file.*;
import java.util.*;

/** Step 7 (Visualise, quick version): build dashboard.html from data/results.csv (Superset is the full BI option). */
public class DashboardApp {
    static final String[] ORDER = {"Low value", "Regular", "Loyal", "Premium"};
    static final String[] COL = {"#9AA5AD", "#2A7F8E", "#1F3A5F", "#E07B39"};

    static String bars(String title, Map<String, Double> v, String fmt) {
        double max = v.values().stream().mapToDouble(d -> d).max().orElse(1);
        StringBuilder sb = new StringBuilder("<div class='card'><h3>" + title + "</h3>");
        int i = 0;
        for (String k : ORDER) {
            double x = v.getOrDefault(k, 0.0);
            sb.append(String.format("<div class='row'><span>%s</span><div class='bar'><i style='width:%.0f%%;background:%s'></i></div><b>%s</b></div>",
                    k, 100 * x / max, COL[i++], String.format(fmt, x)));
        }
        return sb.append("</div>").toString();
    }

    public static void main(String[] args) throws Exception {
        List<Map<String, String>> res = Common.readCsv(Common.DATA + "/results.csv");
        String[] met = new String(Files.readAllBytes(Paths.get(Common.DATA, "metrics.txt"))).trim().split(",");
        Map<String, Double> cnt = new HashMap<>(), clvSum = new HashMap<>();
        double clvAll = 0; int risk = 0;
        for (Map<String, String> r : res) {
            String s = r.get("segment"); double clv = Double.parseDouble(r.get("clv_pred"));
            cnt.merge(s, 1.0, Double::sum); clvSum.merge(s, clv, Double::sum); clvAll += clv;
            if (Double.parseDouble(r.get("churn_prob")) >= 0.6) risk++;
        }
        Map<String, Double> avg = new HashMap<>();
        cnt.forEach((k, c) -> avg.put(k, clvSum.get(k) / c));
        res.sort((a, b) -> Double.compare(Double.parseDouble(b.get("churn_prob")), Double.parseDouble(a.get("churn_prob"))));
        StringBuilder rows = new StringBuilder();
        for (Map<String, String> r : res.subList(0, Math.min(10, res.size())))
            rows.append(String.format("<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%.0f%%</td><td>%,.0f</td></tr>", r.get("customer_id"),
                    r.get("country"), r.get("frequency"), r.get("segment"), 100 * Double.parseDouble(r.get("churn_prob")), Double.parseDouble(r.get("clv_pred"))));
        String html = "<!doctype html><html><head><meta charset='utf-8'><title>CRM Dashboard</title><style>"
            + "body{font-family:Segoe UI,Calibri,sans-serif;margin:0;background:#f4f7f9;color:#10202e}header{background:#1F3A5F;color:#fff;padding:18px 28px}"
            + ".kpi,.cards{display:flex;gap:14px;padding:16px 28px;flex-wrap:wrap}.k,.card,.tbl{background:#fff;border-radius:8px;padding:14px 18px;box-shadow:0 1px 3px #0002}"
            + ".k b{font-size:26px;color:#1F3A5F;display:block}.card{min-width:300px;flex:1}.row{display:flex;align-items:center;gap:8px;margin:8px 0}.row span{width:80px;font-size:13px}"
            + ".bar{flex:1;background:#eef2f5;height:16px;border-radius:4px}.bar i{display:block;height:16px;border-radius:4px}.tbl{margin:0 28px 20px}"
            + "table{border-collapse:collapse;width:100%}th{background:#1F3A5F;color:#fff;text-align:left}td,th{padding:6px 10px;border-bottom:1px solid #dde}</style></head><body>"
            + "<header><h2 style='margin:0'>HBase CRM Data Warehouse - Customer 360 Dashboard</h2><small>Real customer data in Apache HBase - Java pipeline - ML in Python (Spark MLlib)</small></header>"
            + "<div class='kpi'><div class='k'><b>" + res.size() + "</b>Customers</div><div class='k'><b>" + risk + "</b>High churn risk (60%+)</div>"
            + String.format("<div class='k'><b>%,.0f</b>Avg predicted spend (6 mo)</div>", clvAll / res.size())
            + "<div class='k'><b>" + met[0] + "</b>Churn model AUC</div><div class='k'><b>" + met[1] + "</b>Spend model R2</div></div>"
            + "<div class='cards'>" + bars("Customers per segment", cnt, "%.0f") + bars("Avg predicted spend (next 6 months) per segment", avg, "%,.0f") + "</div>"
            + "<div class='tbl'><h3 style='margin-top:0'>Top 10 customers at risk of churn</h3><table><tr><th>ID</th><th>Country</th><th>Orders</th><th>Segment</th><th>Churn risk</th><th>Pred. spend</th></tr>"
            + rows + "</table></div></body></html>";
        Files.write(Paths.get("dashboard.html"), html.getBytes("UTF-8"));
        System.out.println("dashboard.html created");
    }
}
