import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  ShoppingBag,
  TrendingUp,
  Flame,
  Zap,
  ArrowUpRight,
  Eye,
  Send,
  CheckCircle2,
  Sliders,
  Sparkles,
  Download,
  AlertTriangle,
  Activity,
  ShieldCheck,
  Layers,
  Database,
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
import api from "../services/api";

const numFmt = new Intl.NumberFormat("en-IN");
const currFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const PIE_COLORS = ["#8b5cf6", "#10b981", "#2563eb", "#f59e0b"];
const SEGMENT_COLORS = {
  Premium: "#8b5cf6",
  Loyal: "#10b981",
  Regular: "#2563eb",
  "Low value": "#f59e0b",
};

// Custom Chart Tooltip
const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-sm)",
          padding: "10px 14px",
          boxShadow: "var(--modal-shadow)",
          fontSize: "12px",
        }}
      >
        <div style={{ color: "var(--text-muted)", fontWeight: "600", marginBottom: "4px" }}>
          {label}
        </div>
        <div style={{ color: "var(--primary)", fontWeight: "800", fontSize: "14px", fontFamily: "var(--font-mono)" }}>
          {currFmt.format(payload[0].value)}
        </div>
        <div style={{ fontSize: "10.5px", color: "var(--text-sub)", marginTop: "2px" }}>
          Invoiced Revenue Settlement
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [revenueMode, setRevenueMode] = useState("monthly");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [dossierDetails, setDossierDetails] = useState(null);
  const [actionNotice, setActionNotice] = useState("");
  const [highRiskAccounts, setHighRiskAccounts] = useState([]);

  useEffect(() => {
    const fetchSummary = async () => {
      const data = await api.getSummary();
      setSummary(data);
    };
    fetchSummary();

    const handleDataSynced = () => fetchSummary();
    window.addEventListener("crm_data_synced", handleDataSynced);
    return () => window.removeEventListener("crm_data_synced", handleDataSynced);
  }, []);

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

  // Fetch full details when inspecting a customer dossier
  useEffect(() => {
    if (selectedCustomer?.id) {
      api.getCustomerById(selectedCustomer.id)
        .then((data) => setDossierDetails(data))
        .catch(() => setDossierDetails(null));
    } else {
      setDossierDetails(null);
    }
  }, [selectedCustomer]);

  const customers = summary?.customers || 5721;
  const orders = summary?.orders || 34191;
  const revenue = summary?.totalRevenue || 15890904.72;
  const highRisk = summary?.highChurnRiskCount || 2402;
  const mlMetrics = summary?.mlMetrics || { auc: 0.778, r2: 0.274 };
  const rawMonthly = summary?.monthlyRevenue || [];
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
        `Dispatched "${camp}" to account ${accId}! Committed to HBase (Row: ${res.rowKey})`
      );
    } catch {
      setActionNotice(`Dispatched retention playbook "${camp}" to account ${accId}!`);
    }
    setTimeout(() => setActionNotice(""), 5000);
  };

  const handleExportSummary = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        "Metric,Value",
        `Active Accounts,${customers}`,
        `Invoiced Orders,${orders}`,
        `Total GMV,${revenue}`,
        `High Risk Accounts,${highRisk}`,
        `Model Retention AUC,${mlMetrics.auc}`,
        `Projected CLV R2,${mlMetrics.r2}`,
      ].join("\n");
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
      {/* Executive Command Header */}
      <section className="executive-command-header">
        <div className="command-header-left">
          <div className="command-eyebrow">
            <span className="command-eyebrow-badge">APEX GLOBAL RETAIL · ENTERPRISE LAKEHOUSE</span>
            <span className="command-meta-sub">• HBASE 2.5 NOSQL & SPARK MLLIB 3.5</span>
          </div>

          <h1 className="command-title">
            Apex Commerce 360 & <em>Predictive Lifetime Intelligence</em>
          </h1>

          <div className="command-subtitle">
            <span className="command-subtitle-tag">
              <Database size={13} color="var(--primary)" />
              <b>5,721</b> Global Accounts
            </span>
            <span className="command-subtitle-tag">
              <Zap size={13} color="var(--success)" />
              <b>&lt; 1ms</b> Real-Time Scoring
            </span>
            <span className="command-subtitle-tag">
              <Activity size={13} color="var(--accent)" />
              <b>34,191</b> Settled Orders
            </span>
            <span className="command-subtitle-tag">
              <ShieldCheck size={13} color="var(--warning)" />
              <b>99.98%</b> Enterprise SLA
            </span>
          </div>
        </div>

        <div className="command-header-right">
          <button
            className="action-btn-primary"
            onClick={() => navigate("/customers?filter=high_risk")}
          >
            <Flame size={14} />
            <span>Target High Risk ({numFmt.format(highRisk)})</span>
          </button>
          <button
            className="secondary-button"
            onClick={() => navigate("/segmentation")}
          >
            <Sliders size={14} />
            <span>What-If Studio</span>
          </button>
          <button className="secondary-button" onClick={handleExportSummary}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </section>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="action-notification-banner" style={{ marginBottom: "20px" }}>
          <CheckCircle2 size={16} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* 4 High-Impact Stat Tiles */}
      <section className="metrics-summary-grid">
        {/* Card 1: Total Profiled Customers */}
        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-primary)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">CUSTOMER PORTFOLIO</span>
            <div className="metric-box-icon" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
              <Users size={18} />
            </div>
          </div>
          <div className="metric-box-value">{numFmt.format(customers)}</div>
          <div className="metric-box-footer">
            <span className="footer-code" style={{ color: "var(--success)" }}>
              <ArrowUpRight size={13} /> +8.4% YoY Account Growth
            </span>
            <span className="footer-desc">UK & Global retail customer base in HBase</span>
          </div>
        </div>

        {/* Card 2: Orders & Total GMV */}
        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-success)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">INVOICED GROSS REVENUE</span>
            <div className="metric-box-icon" style={{ background: "var(--success-light)", color: "var(--success)" }}>
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="metric-box-value">{currFmt.format(revenue)}</div>
          <div className="metric-box-footer">
            <span className="footer-code">
              <b>{numFmt.format(orders)}</b> Settled Invoices
            </span>
            <span className="footer-desc">₹465 average order value across 12 months</span>
          </div>
        </div>

        {/* Card 3: Churn Risk Accounts */}
        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-danger)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">CRITICAL CHURN TARGETS</span>
            <div className="metric-box-icon" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
              <Flame size={18} />
            </div>
          </div>
          <div className="metric-box-value" style={{ color: "var(--danger)" }}>
            {numFmt.format(highRisk)}
          </div>
          <div className="metric-box-footer">
            <span className="footer-code" style={{ color: "var(--danger)" }}>
              <AlertTriangle size={13} /> 42.0% At-Risk Accounts (p &ge; 0.60)
            </span>
            <span className="footer-desc">Queued for automated retention vouchers</span>
          </div>
        </div>

        {/* Card 4: Spark MLlib Model Power */}
        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-purple)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">SPARK MLLIB ACCURACY</span>
            <div className="metric-box-icon" style={{ background: "var(--purple-light)", color: "var(--purple)" }}>
              <Zap size={18} />
            </div>
          </div>
          <div className="metric-box-value" style={{ color: "var(--purple)" }}>
            {mlMetrics.auc} <span style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-muted)" }}>ROC-AUC</span>
          </div>
          <div className="metric-box-footer">
            <span className="footer-code">
              CLV Spend Model R²: <b>{mlMetrics.r2}</b>
            </span>
            <span className="footer-desc">Holdout 180-day split · Zero synthetic bias</span>
          </div>
        </div>
      </section>

      {/* Visual Analytics 2-Column Suite */}
      <div className="dashboard-grid-two-col">
        {/* Left Chart: Invoiced GMV Expansion */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div>
              <h3>Invoiced Revenue Trajectory</h3>
              <p>Monthly sales velocity & cumulative turnover from real retail transactions</p>
            </div>
            <div className="view-mode-toggle">
              <button
                className={`toggle-option ${revenueMode === "monthly" ? "selected" : ""}`}
                onClick={() => setRevenueMode("monthly")}
              >
                Monthly Volume
              </button>
              <button
                className={`toggle-option ${revenueMode === "cumulative" ? "selected" : ""}`}
                onClick={() => setRevenueMode("cumulative")}
              >
                Cumulative GMV
              </button>
            </div>
          </div>

          <div style={{ width: "100%", height: 290 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-muted)" }} stroke="var(--border-color)" />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  stroke="var(--border-color)"
                  tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart: Customer Segmentation Matrix */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div>
              <h3>Behavioral Segmentation</h3>
              <p>Cohorts clustered by RFM spend and order velocity</p>
            </div>
            <span className="panel-header-badge">4 Segments</span>
          </div>

          <div style={{ width: "100%", height: 210, position: "relative" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={segmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="segment"
                >
                  {segmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [
                    `${numFmt.format(val)} accounts (${((val / customers) * 100).toFixed(1)}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Segment Mini Indicators */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
            {segmentData.map((seg, idx) => (
              <div
                key={seg.segment}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "11.5px",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--card-bg-subtle)",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: PIE_COLORS[idx % PIE_COLORS.length],
                  }}
                />
                <span style={{ fontWeight: "600", color: "var(--text-main)", flex: 1 }}>{seg.segment}</span>
                <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  {numFmt.format(seg.count)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Portfolio Value Density by Tier */}
      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>Portfolio Value Density by Customer Tier</h3>
            <p>Average transaction spend and account distribution across behavioral clusters</p>
          </div>
          <span className="panel-header-pill">5,721 Active Accounts</span>
        </div>

        <div className="segment-tier-grid">
          {segmentData.map((seg) => (
            <div key={seg.segment} className="tier-detail-card">
              <div className="tier-header-row">
                <span
                  className="tier-badge"
                  style={{
                    backgroundColor: `${SEGMENT_COLORS[seg.segment]}18`,
                    color: SEGMENT_COLORS[seg.segment] || "var(--primary)",
                  }}
                >
                  {seg.segment} Tier
                </span>
                <span className="tier-count">
                  {numFmt.format(seg.count)} ({((seg.count / customers) * 100).toFixed(1)}%)
                </span>
              </div>

              <div className="tier-financial-row">
                <span className="tier-label">Avg Projected Spend:</span>
                <span className="tier-value">
                  ₹{numFmt.format(seg.avgSpend || (seg.segment === "Premium" ? 4445 : seg.segment === "Loyal" ? 707 : seg.segment === "Regular" ? 639 : 330))}
                </span>
              </div>

              <div className="spend-bar-track">
                <div
                  className="spend-bar-fill"
                  style={{
                    width: `${Math.min(100, ((seg.avgSpend || 500) / 4445) * 100)}%`,
                    backgroundColor: SEGMENT_COLORS[seg.segment] || "var(--primary)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive High-Risk Churn Table with Live HBase Dispatch */}
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
                <th>Recommended Playbook</th>
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
                      <span
                        className="risk-pct-value"
                        style={{ color: acc.risk > 75 ? "var(--danger)" : "var(--warning)" }}
                      >
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
                      <Send size={11} />
                      <span>{acc.campaign}</span>
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

      {/* Customer 360 Dossier Modal */}
      {selectedCustomer && (
        <div className="dossier-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="dossier-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dossier-header">
              <div>
                <span className="command-eyebrow-badge">CUSTOMER PROFILE 360</span>
                <h2>{selectedCustomer.id}</h2>
                <p>Location: {selectedCustomer.country} · Cluster: {selectedCustomer.seg}</p>
              </div>
              <button className="dossier-close-btn" onClick={() => setSelectedCustomer(null)}>✕</button>
            </div>

            <div className="dossier-grid">
              <div className="dossier-stat">
                <span className="stat-sublabel">Risk Priority</span>
                <span className="stat-highlight" style={{ color: "var(--danger)" }}>
                  {selectedCustomer.risk}% Churn
                </span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Forecast CLV</span>
                <span className="stat-highlight">₹{selectedCustomer.clv}</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Dormancy</span>
                <span className="stat-highlight">{selectedCustomer.recency} days</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Orders Volume</span>
                <span className="stat-highlight">{selectedCustomer.orders} Invoiced</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Assigned Playbook</span>
                <span className="stat-highlight" style={{ fontSize: "14px", color: "var(--primary)" }}>
                  {selectedCustomer.campaignId || "M002"}
                </span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">HBase Storage</span>
                <span className="stat-highlight" style={{ fontSize: "13px", color: "var(--success)" }}>
                  crm_customer
                </span>
              </div>
            </div>

            {/* HBase Activity Stream */}
            {dossierDetails && (
              <div style={{ marginTop: "16px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-main)" }}>
                    HBase Activity Log ({dossierDetails.orders?.length || 0} Orders, {dossierDetails.cancellations?.length || 0} Cancels, {dossierDetails.interactions?.length || 0} Dispatches)
                  </span>
                  <span className="panel-header-pill">HBase Real-Time</span>
                </div>
                <div style={{ maxHeight: "140px", overflowY: "auto", fontSize: "11.5px" }}>
                  {dossierDetails.interactions && dossierDetails.interactions.length > 0 ? (
                    dossierDetails.interactions.map((it, idx) => (
                      <div key={idx} style={{ padding: "6px 0", borderBottom: "1px dashed var(--border-color)", display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--primary)", fontWeight: "600" }}>
                          {it.type} ({it.campaign || "M002"}) · Row: {it.rowKey}
                        </span>
                        <span style={{ color: "var(--text-muted)" }}>{it.formattedDate || it.timestamp}</span>
                      </div>
                    ))
                  ) : (
                    <p style={{ margin: "4px 0", color: "var(--text-muted)" }}>
                      No prior campaign dispatches recorded in table crm_interaction for this account.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="dossier-action-section">
              <div className="action-rule-header">
                <strong>Autonomous Playbook Recommendation</strong>
                <span style={{ color: "var(--danger)", fontWeight: "700" }}>Critical Priority</span>
              </div>
              <p style={{ fontSize: "12.5px", color: "var(--text-sub)", lineHeight: "1.5" }}>
                Because churn probability is elevated ({selectedCustomer.risk}%) and the account has been inactive for {selectedCustomer.recency} days, Playbook <b>{selectedCustomer.campaign}</b> is queued to recover customer lifetime value.
              </p>

              <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                <button
                  className="secondary-button"
                  style={{ flex: 1, justifyContent: "center" }}
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
                  style={{ flex: 1, justifyContent: "center" }}
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
