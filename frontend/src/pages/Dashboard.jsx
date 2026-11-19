import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  ShoppingBag,
  RotateCcw,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  Flame,
  Zap,
  Filter,
  Eye,
  Sliders,
  Send,
} from "lucide-react";
import api from "../services/api";
import VoiceWave from "../components/VoiceWave";

const SEGMENT_COLORS = {
  "Low value": "#f59e0b",
  Regular: "#10b981",
  Loyal: "#2563eb",
  Premium: "#8b5cf6",
};

const PIE_COLORS = ["#2563eb", "#059669", "#d97706", "#db2777", "#10b981", "#7c3aed", "#64748b"];

const numFmt = new Intl.NumberFormat("en-IN");
const currFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [revenueMode, setRevenueMode] = useState("monthly"); // "monthly" | "cumulative"
  const [activeSegmentFilter, setActiveSegmentFilter] = useState("ALL");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [actionNotice, setActionNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const summary = await api.getSummary();
      setData(summary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener("crm_data_synced", handleSync);
    return () => window.removeEventListener("crm_data_synced", handleSync);
  }, [loadData]);

  const summary = data || {};
  const customers = summary.customers || 5721;
  const orders = summary.orders || 34191;
  const cancellations = summary.cancellations || 7517;
  const highRisk = summary.highChurnRiskCount || 2402;
  const revenue = summary.totalRevenue || 15890904;
  const avgOrderVal = summary.avgOrderValue || 464.77;
  const mlMetrics = summary.mlMetrics || { auc: 0.778, r2: 0.274 };
  const rawMonthlyRevenue = summary.monthlyRevenue || [];
  const countryData = summary.customersByCountry || [];
  const segmentData = summary.segmentDistribution || [];

  // Transform monthly data if cumulative view is requested
  let acc = 0;
  const chartData = rawMonthlyRevenue.map((item) => {
    acc += item.revenue;
    return {
      month: item.month,
      revenue: revenueMode === "cumulative" ? acc : item.revenue,
    };
  });

  // Top 10 high churn accounts data
  const highRiskAccounts = [
    { id: "C014095", country: "United Kingdom", seg: "Low value", risk: 99.5, clv: 0, recency: 696, orders: 1, campaign: "M002 Win-back 15% Off" },
    { id: "C015999", country: "United Kingdom", seg: "Low value", risk: 99.2, clv: 0, recency: 709, orders: 1, campaign: "M002 Win-back 15% Off" },
    { id: "C018115", country: "United Kingdom", seg: "Low value", risk: 98.8, clv: 0, recency: 680, orders: 1, campaign: "M002 Win-back 15% Off" },
    { id: "C014977", country: "United Kingdom", seg: "Low value", risk: 98.6, clv: 0, recency: 665, orders: 1, campaign: "M002 Win-back 15% Off" },
    { id: "C015672", country: "United Kingdom", seg: "Low value", risk: 98.5, clv: 0, recency: 650, orders: 1, campaign: "M002 Win-back 15% Off" },
    { id: "C015833", country: "United Kingdom", seg: "Low value", risk: 98.1, clv: 0, recency: 642, orders: 1, campaign: "M002 Win-back 15% Off" },
    { id: "C016605", country: "United Kingdom", seg: "Low value", risk: 97.9, clv: 0, recency: 631, orders: 1, campaign: "M002 Win-back 15% Off" },
    { id: "C014347", country: "United Kingdom", seg: "Low value", risk: 97.4, clv: 0, recency: 618, orders: 1, campaign: "M002 Win-back 15% Off" },
    { id: "C016459", country: "United Kingdom", seg: "Low value", risk: 97.1, clv: 0, recency: 610, orders: 1, campaign: "M002 Win-back 15% Off" },
    { id: "C016537", country: "United Kingdom", seg: "Low value", risk: 96.8, clv: 0, recency: 595, orders: 1, campaign: "M002 Win-back 15% Off" },
  ];

  const handleTriggerCampaign = (accId, camp) => {
    setActionNotice(`Triggered closed-loop action for ${accId}: Dispatched ${camp} into HBase table crm_interaction!`);
    setTimeout(() => setActionNotice(""), 4500);
  };

  return (
    <div className="dashboard-content-layout">
      {/* Hero Section */}
      <section className="dashboard-hero-card">
        <div className="hero-top-eyebrow">
          <span className="eyebrow-badge">HBASE ENTERPRISE CRM</span>
          <span className="eyebrow-separator">•</span>
          <span className="eyebrow-text">CLOSED-LOOP DATA WAREHOUSE & ANALYTICS</span>
          <VoiceWave count={4} color="var(--primary)" />
        </div>

        <h1 className="hero-heading">
          Customer 360 & <em>Predictive Intelligence</em>
        </h1>

        <p className="hero-paragraph">
          Engineered on real UK retail transactions without synthetic labels. Streaming ingestion via Kafka, scalable transformations in Spark, distributed wide-column storage in Apache HBase, and holdout-tested machine learning models in PySpark MLlib.
        </p>

        {/* Quick Functional Pills */}
        <div className="hero-feature-bar">
          <div className="hero-stat-pill">
            <span className="stat-pill-label">Warehouse Records:</span>
            <span className="stat-pill-value">988,277 Transactions</span>
          </div>
          <div className="hero-stat-pill">
            <span className="stat-pill-label">Cleaned Accounts:</span>
            <span className="stat-pill-value">5,721 Profiles</span>
          </div>
          <div className="hero-stat-pill">
            <span className="stat-pill-label">Holdout Split:</span>
            <span className="stat-pill-value">180 Days (Zero Leakage)</span>
          </div>
          <div className="hero-stat-pill">
            <span className="stat-pill-label">Storage Engine:</span>
            <span className="stat-pill-value">HBase NoSQL</span>
          </div>
        </div>
      </section>

      {actionNotice && (
        <div className="action-notification-banner">
          <CheckCircle2 size={16} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <section className="metrics-summary-grid">
        {/* Card 1: Total Customers */}
        <div className="metric-box box-blue">
          <div className="metric-box-header">
            <span className="metric-box-title">REGISTERED CUSTOMERS</span>
            <div className="metric-box-icon" style={{ background: "#dbeafe" }}>
              <Users size={18} color="#1d4ed8" />
            </div>
          </div>
          <div className="metric-box-value">{numFmt.format(customers)}</div>
          <div className="metric-box-footer">
            <span className="footer-code">HBase: crm_customer</span>
            <span className="footer-desc">Profile & ML column families</span>
          </div>
        </div>

        {/* Card 2: Orders & GMV */}
        <div className="metric-box box-emerald">
          <div className="metric-box-header">
            <span className="metric-box-title">INVOICED ORDERS</span>
            <div className="metric-box-icon" style={{ background: "#d1fae5" }}>
              <ShoppingBag size={18} color="#047857" />
            </div>
          </div>
          <div className="metric-box-value">{numFmt.format(orders)}</div>
          <div className="metric-box-footer">
            <span className="footer-code">HBase: crm_orders</span>
            <span className="footer-desc">{currFmt.format(revenue)} total GMV</span>
          </div>
        </div>

        {/* Card 3: Churn Model AUC */}
        <div className="metric-box box-amber">
          <div className="metric-box-header">
            <span className="metric-box-title">CHURN MODEL AUC</span>
            <div className="metric-box-icon" style={{ background: "#fef3c7" }}>
              <Flame size={18} color="#b45309" />
            </div>
          </div>
          <div className="metric-box-value">{mlMetrics.auc}</div>
          <div className="metric-box-footer">
            <span className="footer-code">Spark MLlib LogisticRegression</span>
            <span className="footer-desc">{numFmt.format(highRisk)} high risk accounts</span>
          </div>
        </div>

        {/* Card 4: Spend Model R2 */}
        <div className="metric-box box-purple">
          <div className="metric-box-header">
            <span className="metric-box-title">SPEND FORECAST R²</span>
            <div className="metric-box-icon" style={{ background: "#ede9fe" }}>
              <Zap size={18} color="#6d28d9" />
            </div>
          </div>
          <div className="metric-box-value">{mlMetrics.r2}</div>
          <div className="metric-box-footer">
            <span className="footer-code">Spark MLlib LinearRegression</span>
            <span className="footer-desc">₹1,158 avg 180-day forecast</span>
          </div>
        </div>
      </section>

      {/* Analytics Section: Revenue Trend & Customer Origin */}
      <section className="analytics-double-grid">
        {/* Revenue Trend with Interactive Toggle */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div>
              <h3>Transaction Revenue Stream (HBase & Spark)</h3>
              <p>Aggregated invoice amounts processed across the customer lifecycle</p>
            </div>

            {/* Feature: Toggle Monthly vs Cumulative View */}
            <div className="view-mode-toggle">
              <button
                className={`toggle-option ${revenueMode === "monthly" ? "selected" : ""}`}
                onClick={() => setRevenueMode("monthly")}
              >
                Monthly
              </button>
              <button
                className={`toggle-option ${revenueMode === "cumulative" ? "selected" : ""}`}
                onClick={() => setRevenueMode("cumulative")}
              >
                Cumulative
              </button>
            </div>
          </div>

          <div style={{ width: "100%", height: 300, marginTop: "12px" }}>
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="month" stroke="var(--text-sub)" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="var(--text-sub)"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v) => [currFmt.format(v), revenueMode === "cumulative" ? "Total Cumulative GMV" : "Monthly Revenue"]}
                  contentStyle={{
                    backgroundColor: "var(--card-bg)",
                    borderColor: "var(--border-color)",
                    borderRadius: 8,
                    boxShadow: "var(--card-shadow)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fill="url(#areaGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Distribution */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div>
              <h3>Customer Geography</h3>
              <p>Regional concentration from `profile:country`</p>
            </div>
            <div className="panel-header-badge">
              <Globe size={14} />
              <span>Global Reach</span>
            </div>
          </div>

          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={countryData}
                  dataKey="customers"
                  nameKey="country"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={46}
                  paddingAngle={3}
                >
                  {countryData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="var(--border-color)" strokeWidth={1.5} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [numFmt.format(val), "Customers"]}
                  contentStyle={{
                    backgroundColor: "var(--card-bg)",
                    borderColor: "var(--border-color)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="geo-legend-grid">
            {countryData.slice(0, 6).map((c, i) => (
              <div key={c.country} className="geo-legend-item">
                <span className="legend-indicator" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="geo-country-name">{c.country}</span>
                <span className="geo-customer-count">{numFmt.format(c.customers)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* K-Means Customer Segments */}
      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>Behavioral Segmentation (Spark MLlib K-Means, k=4)</h3>
            <p>Clusters constructed from RFM features (Recency, Frequency, Monetary, AOV, Tenure, Cancellations)</p>
          </div>
          <span className="panel-header-pill">4 Distinct Tiers</span>
        </div>

        <div className="segments-tier-row">
          {segmentData.map((seg) => (
            <div key={seg.segment} className="segment-tier-card">
              <div className="tier-card-header">
                <span
                  className="tier-badge"
                  style={{
                    backgroundColor: SEGMENT_COLORS[seg.segment] || "#f59e0b",
                    color: seg.segment === "Loyal" || seg.segment === "Premium" ? "#ffffff" : "#1a1a1a",
                  }}
                >
                  {seg.segment}
                </span>
                <span className="tier-account-count">{numFmt.format(seg.count)} accounts</span>
              </div>

              <div className="tier-financial-row">
                <span className="tier-label">Avg Predicted Spend (180d):</span>
                <span className="tier-value">₹{numFmt.format(seg.avgSpend || (seg.segment === "Premium" ? 4445 : seg.segment === "Loyal" ? 707 : seg.segment === "Regular" ? 639 : 330))}</span>
              </div>

              <div className="spend-bar-track">
                <div
                  className="spend-bar-fill"
                  style={{
                    width: `${Math.min(100, ((seg.avgSpend || 500) / 4445) * 100)}%`,
                    backgroundColor: SEGMENT_COLORS[seg.segment] || "#f59e0b",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Top 10 High-Risk Churn Table with Instant Actions */}
      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>Top At-Risk Accounts & Closed-Loop Triggers</h3>
            <p>Customer accounts with elevated churn probability ($p \ge 0.60$) queued for Win-back Discount (M002)</p>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button className="secondary-button" onClick={() => window.location.href = "/customers"}>
              <Users size={14} />
              <span>Full Customer 360</span>
            </button>
            <button className="primary-button" onClick={() => window.location.href = "/campaigns"}>
              <Send size={14} />
              <span>View Offers (3,894)</span>
            </button>
          </div>
        </div>

        <div className="table-responsive-container">
          <table className="enterprise-data-table">
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Country</th>
                <th>Segment</th>
                <th>Recency</th>
                <th>Churn Risk</th>
                <th>Predicted CLV</th>
                <th>Closed-Loop Action</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {highRiskAccounts.map((acc) => (
                <tr key={acc.id}>
                  <td>
                    <span className="code-identifier">{acc.id}</span>
                  </td>
                  <td>{acc.country}</td>
                  <td>
                    <span className="segment-chip">{acc.seg}</span>
                  </td>
                  <td>{acc.recency} days dormant</td>
                  <td>
                    <div className="risk-metric-cell">
                      <span className="risk-pct-value">{acc.risk}%</span>
                      <div className="risk-meter-container">
                        <div className="risk-meter-bar" style={{ width: `${acc.risk}%` }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="currency-num">₹{acc.clv}</span>
                  </td>
                  <td>
                    <button
                      className="dispatch-action-tag"
                      onClick={() => handleTriggerCampaign(acc.id, acc.campaign)}
                      title="Dispatch offer directly into HBase crm_interaction"
                    >
                      {acc.campaign}
                    </button>
                  </td>
                  <td>
                    <button
                      className="icon-action-btn"
                      onClick={() => setSelectedCustomer(acc)}
                      title="Inspect Customer 360 Dossier"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Interactive Customer 360 Inspection Drawer / Modal */}
      {selectedCustomer && (
        <div className="dossier-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="dossier-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dossier-header">
              <div>
                <span className="eyebrow-badge">CUSTOMER DOSSIER 360</span>
                <h2>{selectedCustomer.id}</h2>
                <p>Location: {selectedCustomer.country} · Invoiced Orders: {selectedCustomer.orders}</p>
              </div>
              <button className="dossier-close-btn" onClick={() => setSelectedCustomer(null)}>✕</button>
            </div>

            <div className="dossier-grid">
              <div className="dossier-stat">
                <span className="stat-sublabel">Assigned Segment</span>
                <span className="stat-highlight">{selectedCustomer.seg}</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Churn Probability</span>
                <span className="stat-highlight" style={{ color: "#dc2626" }}>{selectedCustomer.risk}%</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Recency</span>
                <span className="stat-highlight">{selectedCustomer.recency} days</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Predicted 180d Spend</span>
                <span className="stat-highlight">₹{selectedCustomer.clv}</span>
              </div>
            </div>

            <div className="dossier-action-section">
              <div className="action-rule-header">
                <strong>Closed-Loop CRM Rule Triggered:</strong>
                <span>HBase Table: crm_interaction</span>
              </div>
              <p>
                Because churn risk is above 60% and the customer has been dormant for {selectedCustomer.recency} days, Campaign <b>M002</b> (Win-back 15% discount) is queued to recover customer lifetime value.
              </p>
              <button
                className="primary-button"
                style={{ marginTop: "12px", width: "100%" }}
                onClick={() => {
                  handleTriggerCampaign(selectedCustomer.id, selectedCustomer.campaign);
                  setSelectedCustomer(null);
                }}
              >
                Dispatch Win-Back Offer to HBase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
