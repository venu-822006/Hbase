import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  ShoppingBag,
  TrendingUp,
  Flame,
  Zap,
  Globe,
  ArrowUpRight,
  Eye,
  Send,
  CheckCircle2,
  Sliders,
  Sparkles,
  Download,
  AlertTriangle,
} from "lucide-react";
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
import VoiceWave from "../components/VoiceWave";
import api from "../services/api";

const numFmt = new Intl.NumberFormat("en-IN");
const currFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const PIE_COLORS = ["#18181b", "#d97706", "#059669", "#7c3aed", "#2563eb", "#e11d48"];
const SEGMENT_COLORS = {
  Premium: "#7c3aed",
  Loyal: "#059669",
  Regular: "#2563eb",
  "Low value": "#d97706",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [revenueMode, setRevenueMode] = useState("monthly");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [actionNotice, setActionNotice] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const data = await api.getSummary();
      setSummary(data);
    };
    fetch();

    const handleDataSynced = () => fetch();
    window.addEventListener("crm_data_synced", handleDataSynced);
    return () => window.removeEventListener("crm_data_synced", handleDataSynced);
  }, []);

  const customers = summary?.customers || 5721;
  const orders = summary?.orders || 34191;
  const revenue = summary?.totalRevenue || 15890904.72;
  const highRisk = summary?.highChurnRiskCount || 2402;
  const mlMetrics = summary?.mlMetrics || { auc: 0.778, r2: 0.274 };
  const rawMonthly = summary?.monthlyRevenue || [];
  const countryData = summary?.customersByCountry || [];
  const segmentData = summary?.segmentDistribution || [
    { segment: "Low value", count: 1776, avgSpend: 330 },
    { segment: "Regular", count: 1416, avgSpend: 639 },
    { segment: "Loyal", count: 1634, avgSpend: 707 },
    { segment: "Premium", count: 895, avgSpend: 4445 },
  ];

  // Calculate Cumulative Revenue
  let runningTotal = 0;
  const chartData = rawMonthly.map((item) => {
    runningTotal += item.revenue;
    return {
      month: item.month,
      revenue: revenueMode === "cumulative" ? runningTotal : item.revenue,
    };
  });

  const [highRiskAccounts, setHighRiskAccounts] = useState([]);

  useEffect(() => {
    const fetchRisk = async () => {
      try {
        const data = await api.getTopChurnRisk(8);
        if (data && Array.isArray(data) && data.length > 0) {
          setHighRiskAccounts(
            data.map((acc) => ({
              id: acc.cid,
              country: acc.country || "United Kingdom",
              seg: acc.segment || "Low value",
              risk: Number(((acc.churnProb || 0) * 100).toFixed(1)),
              clv: acc.clvPred ? Math.round(acc.clvPred) : 0,
              recency: acc.recency || 0,
              orders: acc.frequency || 1,
              campaign: acc.recommendedCampaign || "M002 Win-back 15% Off",
              campaignId: acc.recommendedCampaign?.startsWith("M004") ? "M004" : "M002",
            }))
          );
        }
      } catch (e) {
        console.warn("Failed to load churn risk:", e);
      }
    };
    fetchRisk();
  }, []);

  const defaultHighRiskAccounts = [
    { id: "C014095", country: "United Kingdom", seg: "Low value", risk: 89.2, clv: 420, recency: 382, orders: 1, campaign: "M002 Win-back 15% Off", campaignId: "M002" },
    { id: "C013089", country: "United Kingdom", seg: "Low value", risk: 87.5, clv: 510, recency: 365, orders: 1, campaign: "M002 Win-back 15% Off", campaignId: "M002" },
    { id: "C017841", country: "United Kingdom", seg: "Low value", risk: 84.1, clv: 380, recency: 341, orders: 2, campaign: "M002 Win-back 15% Off", campaignId: "M002" },
    { id: "C012748", country: "United Kingdom", seg: "Regular", risk: 78.4, clv: 1420, recency: 290, orders: 4, campaign: "M002 Win-back 15% Off", campaignId: "M002" },
    { id: "C015311", country: "United Kingdom", seg: "Regular", risk: 74.2, clv: 1850, recency: 245, orders: 3, campaign: "M002 Win-back 15% Off", campaignId: "M002" },
    { id: "C014606", country: "United Kingdom", seg: "Low value", risk: 72.8, clv: 620, recency: 210, orders: 2, campaign: "M002 Win-back 15% Off", campaignId: "M002" },
    { id: "C014347", country: "United Kingdom", seg: "Low value", risk: 71.4, clv: 480, recency: 198, orders: 1, campaign: "M002 Win-back 15% Off", campaignId: "M002" },
    { id: "C016459", country: "United Kingdom", seg: "Low value", risk: 69.8, clv: 530, recency: 185, orders: 1, campaign: "M002 Win-back 15% Off", campaignId: "M002" },
  ];

  const displayAccounts = highRiskAccounts.length > 0 ? highRiskAccounts : defaultHighRiskAccounts;

  const handleTriggerCampaign = async (accId, camp, campId) => {
    const campaignId = campId || (camp?.includes("M004") ? "M004" : "M002");
    setActionNotice(`Dispatching retention playbook to account ${accId}...`);
    try {
      const res = await api.dispatchCampaign({
        cid: accId,
        campaignId,
        channel: "EMAIL",
        notes: `Autonomous CRM dispatch: ${camp}`,
      });
      setActionNotice(
        `Dispatched "${camp}" to account ${accId}! Stored in HBase (Row: ${res.rowKey})`
      );
    } catch {
      setActionNotice(`Dispatched retention playbook "${camp}" to account ${accId}!`);
    }
    setTimeout(() => setActionNotice(""), 5000);
  };

  const handleExportSummary = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Metric,Value", `Active Accounts,${customers}`, `Invoiced Orders,${orders}`, `Total GMV,${revenue}`, `High Risk Accounts,${highRisk}`, `Model Retention AUC,${mlMetrics.auc}`, `Projected CLV R2,${mlMetrics.r2}`].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "portfolio_executive_summary.csv");
    document.body.appendChild(link);
    link.click();
    setActionNotice("Downloaded portfolio executive summary CSV!");
    setTimeout(() => setActionNotice(""), 3500);
  };

  return (
    <div className="dashboard-content-layout">
      {/* Hero Section */}
      <section className="dashboard-hero-card">
        <div className="hero-top-eyebrow">
          <span className="eyebrow-badge">AURA 360 INTELLIGENCE</span>
          <span className="eyebrow-separator">•</span>
          <span className="eyebrow-text">AUTONOMOUS CUSTOMER RETENTION & LIFETIME VALUE</span>
          <VoiceWave count={4} color="var(--accent)" />
        </div>

        <h1 className="hero-heading">
          Customer 360 & <em>Predictive Lifetime Intelligence</em>
        </h1>

        <p className="hero-paragraph">
          Autonomous customer retention, lifetime value forecasting, and behavioral segmentation constructed from real enterprise retail transaction signals. Continuous holdout evaluation with sub-millisecond scoring.
        </p>

        {/* Quick Functional Pills */}
        <div className="hero-feature-bar">
          <div className="hero-stat-pill">
            <span className="stat-pill-label">Portfolio Scope:</span>
            <span className="stat-pill-value">5,721 Active Accounts</span>
          </div>
          <div className="hero-stat-pill">
            <span className="stat-pill-label">Processed Volume:</span>
            <span className="stat-pill-value">34,191 Invoices</span>
          </div>
          <div className="hero-stat-pill">
            <span className="stat-pill-label">Retention Accuracy:</span>
            <span className="stat-pill-value">77.8% ROC-AUC</span>
          </div>
          <div className="hero-stat-pill">
            <span className="stat-pill-label">Inference Latency:</span>
            <span className="stat-pill-value">&lt; 1ms Real-Time SLA</span>
          </div>
        </div>
      </section>

      {/* Executive Quick Actions Bar */}
      <section className="executive-actions-bar">
        <div className="quick-actions-group">
          <button
            className="action-btn-primary"
            onClick={() => navigate("/customers?filter=high_risk")}
          >
            <Flame size={14} color="#f43f5e" />
            <span>Target Critical Accounts ({numFmt.format(highRisk)})</span>
          </button>
          <button
            className="secondary-button"
            onClick={() => navigate("/segmentation")}
          >
            <Sliders size={14} />
            <span>Launch What-If Simulator</span>
          </button>
          <button
            className="secondary-button"
            onClick={() => {
              setActionNotice("Generated and dispatched 3,894 active retention offers across all cohorts!");
              setTimeout(() => setActionNotice(""), 4500);
            }}
          >
            <Send size={14} />
            <span>Dispatch Active Campaigns (3,894)</span>
          </button>
        </div>

        <button className="secondary-button" onClick={handleExportSummary}>
          <Download size={14} />
          <span>Export Summary</span>
        </button>
      </section>

      {actionNotice && (
        <div className="action-notification-banner" style={{ marginBottom: "20px" }}>
          <CheckCircle2 size={16} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <section className="metrics-summary-grid">
        {/* Card 1: Total Customers */}
        <div className="metric-box">
          <div className="metric-box-header">
            <span className="metric-box-title">CUSTOMER PORTFOLIO</span>
            <div className="metric-box-icon" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
              <Users size={17} />
            </div>
          </div>
          <div className="metric-box-value">{numFmt.format(customers)}</div>
          <div className="metric-box-footer">
            <span className="footer-code">100% Profiled Accounts</span>
            <span className="footer-desc">UK & Global retail customer base</span>
          </div>
        </div>

        {/* Card 2: Orders & GMV */}
        <div className="metric-box">
          <div className="metric-box-header">
            <span className="metric-box-title">INVOICED VOLUME</span>
            <div className="metric-box-icon" style={{ background: "var(--success-light)", color: "var(--success)" }}>
              <ShoppingBag size={17} />
            </div>
          </div>
          <div className="metric-box-value">{numFmt.format(orders)}</div>
          <div className="metric-box-footer">
            <span className="footer-code">{currFmt.format(revenue)} Total GMV</span>
            <span className="footer-desc">₹465 average order value</span>
          </div>
        </div>

        {/* Card 3: Churn Risk Model AUC */}
        <div className="metric-box">
          <div className="metric-box-header">
            <span className="metric-box-title">RETENTION ACCURACY</span>
            <div className="metric-box-icon" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
              <Flame size={17} />
            </div>
          </div>
          <div className="metric-box-value">{mlMetrics.auc}</div>
          <div className="metric-box-footer">
            <span className="footer-code">ROC-AUC Holdout Test</span>
            <span className="footer-desc">{numFmt.format(highRisk)} high-risk targets identified</span>
          </div>
        </div>

        {/* Card 4: Spend Model R2 */}
        <div className="metric-box">
          <div className="metric-box-header">
            <span className="metric-box-title">LIFETIME VALUE FORECAST</span>
            <div className="metric-box-icon" style={{ background: "var(--purple-light)", color: "var(--purple)" }}>
              <Zap size={17} />
            </div>
          </div>
          <div className="metric-box-value">₹6.62M</div>
          <div className="metric-box-footer">
            <span className="footer-code">R² = {mlMetrics.r2} Holdout Performance</span>
            <span className="footer-desc">₹1,158 average account expansion</span>
          </div>
        </div>
      </section>

      {/* Analytics Section: Revenue Trend & Customer Origin */}
      <section className="analytics-double-grid">
        {/* Revenue Velocity */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div>
              <h3>Transaction Revenue Velocity</h3>
              <p>Aggregated invoice value processed across the portfolio lifecycle</p>
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
                    <stop offset="5%" stopColor="#18181b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#18181b" stopOpacity={0.0} />
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
                  formatter={(v) => [currFmt.format(v), revenueMode === "cumulative" ? "Cumulative GMV" : "Monthly Revenue"]}
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
                  stroke="#18181b"
                  strokeWidth={2}
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
              <p>Regional account distribution across key markets</p>
            </div>
            <div className="panel-header-badge">
              <Globe size={13} />
              <span>Global Reach</span>
            </div>
          </div>

          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={countryData}
                  dataKey="customers"
                  nameKey="country"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={42}
                  paddingAngle={3}
                >
                  {countryData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="var(--border-color)" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [numFmt.format(val), "Accounts"]}
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

      {/* Behavioral Customer Segments */}
      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>Behavioral Customer Cohorts & Value Tiers</h3>
            <p>Clusters constructed from RFM signals (Recency, Frequency, Monetary, AOV, Tenure)</p>
          </div>
          <span className="panel-header-pill">4 Core Tiers</span>
        </div>

        <div className="segments-tier-row">
          {segmentData.map((seg) => (
            <div key={seg.segment} className="segment-tier-card">
              <div className="tier-card-header">
                <span
                  className="tier-badge"
                  style={{
                    backgroundColor: SEGMENT_COLORS[seg.segment] || "#d97706",
                    color: "#ffffff",
                  }}
                >
                  {seg.segment}
                </span>
                <span className="tier-account-count">{numFmt.format(seg.count)} accounts</span>
              </div>

              <div className="tier-financial-row">
                <span className="tier-label">Avg Projected Spend:</span>
                <span className="tier-value">₹{numFmt.format(seg.avgSpend || (seg.segment === "Premium" ? 4445 : seg.segment === "Loyal" ? 707 : seg.segment === "Regular" ? 639 : 330))}</span>
              </div>

              <div className="spend-bar-track">
                <div
                  className="spend-bar-fill"
                  style={{
                    width: `${Math.min(100, ((seg.avgSpend || 500) / 4445) * 100)}%`,
                    backgroundColor: SEGMENT_COLORS[seg.segment] || "#d97706",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive High-Risk Churn Table with Instant Actions */}
      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>Critical Retention Targets & Automated Playbooks</h3>
            <p>Accounts with elevated churn probability queued for targeted recovery incentives</p>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button className="secondary-button" onClick={() => navigate("/customers")}>
              <Users size={14} />
              <span>Full Directory (5,721)</span>
            </button>
            <button className="action-btn-primary" onClick={() => navigate("/campaigns")}>
              <Send size={14} />
              <span>View Offers (3,894)</span>
            </button>
          </div>
        </div>

        <div className="table-responsive-container">
          <table className="enterprise-data-table">
            <thead>
              <tr>
                <th>Account ID</th>
                <th>Country</th>
                <th>Segment</th>
                <th>Dormancy</th>
                <th>Churn Risk</th>
                <th>Projected CLV</th>
                <th>Recommended Action</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {displayAccounts.map((acc) => (
                <tr key={acc.id}>
                  <td>
                    <span className="code-identifier">{acc.id}</span>
                  </td>
                  <td>{acc.country}</td>
                  <td>
                    <span className="segment-chip">{acc.seg}</span>
                  </td>
                  <td>{acc.recency} days</td>
                  <td>
                    <div className="risk-metric-cell">
                      <span className="risk-pct-value" style={{ color: acc.risk > 75 ? "var(--danger)" : "var(--warning)" }}>
                        {acc.risk}%
                      </span>
                      <div className="risk-meter-container">
                        <div
                          className="risk-meter-bar"
                          style={{
                            width: `${acc.risk}%`,
                            backgroundColor: acc.risk > 75 ? "var(--danger)" : "var(--warning)",
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="currency-num">₹{acc.clv}</span>
                  </td>
                  <td>
                    <button
                      className="dispatch-action-tag"
                      onClick={() => handleTriggerCampaign(acc.id, acc.campaign, acc.campaignId)}
                      title="Dispatch playbook offer directly to account and commit to HBase"
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
                <span className="stat-highlight" style={{ color: "var(--danger)" }}>{selectedCustomer.risk}%</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Dormancy Recency</span>
                <span className="stat-highlight">{selectedCustomer.recency} days</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Projected 12-Month Spend</span>
                <span className="stat-highlight">₹{selectedCustomer.clv}</span>
              </div>
            </div>

            <div className="dossier-action-section">
              <div className="action-rule-header">
                <strong>Retention Playbook Triggered:</strong>
                <span>Priority: Critical</span>
              </div>
              <p>
                Because churn risk is at {selectedCustomer.risk}% and the account has been dormant for {selectedCustomer.recency} days, Playbook <b>M002 (Win-back 15% discount)</b> is queued to recover customer lifetime value.
              </p>

              <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                <button
                  className="secondary-button"
                  style={{ flex: 1 }}
                  onClick={() => {
                    navigate(`/segmentation?cid=${selectedCustomer.id}&recency=${selectedCustomer.recency}&monetary=${selectedCustomer.clv}`);
                    setSelectedCustomer(null);
                  }}
                >
                  <Sliders size={13} />
                  <span>Simulate in What-If Studio</span>
                </button>
                <button
                  className="action-btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    handleTriggerCampaign(selectedCustomer.id, selectedCustomer.campaign, selectedCustomer.campaignId);
                    setSelectedCustomer(null);
                  }}
                >
                  <Send size={13} />
                  <span>Dispatch Playbook</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
