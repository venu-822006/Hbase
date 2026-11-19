import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  Download,
  ShieldAlert,
  Sparkles,
  Send,
  CheckSquare,
  Square,
  Users2,
  X,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Calendar,
  Layers,
} from "lucide-react";
import api from "../services/api";

const currFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL"); // "ALL" | "HIGH" | "MEDIUM" | "SAFE"
  const [sortBy, setSortBy] = useState("risk"); // "risk" | "spend" | "recency"
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [toast, setToast] = useState("");

  // Customer Comparison Tool State (up to 3 accounts)
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const res = await api.getCustomers({ search, segment: segmentFilter });
      setCustomers(res.content || []);
    };
    fetch();
  }, [search, segmentFilter]);

  // Apply Risk filtering and sorting
  let displayed = customers.filter((c) => {
    if (riskFilter === "HIGH") return c.churn_prob >= 0.6;
    if (riskFilter === "MEDIUM") return c.churn_prob >= 0.3 && c.churn_prob < 0.6;
    if (riskFilter === "SAFE") return c.churn_prob < 0.3;
    return true;
  });

  displayed.sort((a, b) => {
    if (sortBy === "risk") return b.churn_prob - a.churn_prob;
    if (sortBy === "spend") return (b.monetary || 0) - (a.monetary || 0);
    if (sortBy === "recency") return (a.recency || 0) - (b.recency || 0);
    return 0;
  });

  const toggleSelectCompare = (cid) => {
    if (selectedForCompare.includes(cid)) {
      setSelectedForCompare(selectedForCompare.filter((id) => id !== cid));
    } else {
      if (selectedForCompare.length >= 3) {
        setToast("Maximum 3 customers can be compared side-by-side.");
        setTimeout(() => setToast(""), 3000);
        return;
      }
      setSelectedForCompare([...selectedForCompare, cid]);
    }
  };

  const handleExport = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["customer_id,country,segment,churn_prob,clv_pred,monetary,recency,frequency"].join(",") +
      "\n" +
      displayed
        .map(
          (c) =>
            `${c.customer_id},${c.country},${c.segment},${c.churn_prob},${c.clv_pred},${c.monetary},${c.recency},${c.frequency}`
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hbase_customers_${segmentFilter.toLowerCase()}_export.csv`);
    document.body.appendChild(link);
    link.click();
    setToast(`Exported ${displayed.length} customer records to CSV!`);
    setTimeout(() => setToast(""), 3500);
  };

  const comparedCustomersData = selectedForCompare
    .map((id) => customers.find((c) => c.customer_id === id))
    .filter(Boolean);

  return (
    <div className="module-content-layout">
      {/* Module Header */}
      <div className="module-header-container">
        <div>
          <span className="eyebrow-badge">HBASE TABLE: CRM_CUSTOMER</span>
          <h1 className="module-page-title">Customer 360 Directory</h1>
          <p className="module-page-subtitle">
            5,721 customer profiles constructed from real UK retail sales with wide-column storage and ML inference.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {selectedForCompare.length > 0 && (
            <button
              className="action-btn-primary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "var(--accent, #6366f1)",
                color: "#fff",
              }}
              onClick={() => setShowCompareModal(true)}
            >
              <Users2 size={14} />
              <span>Compare Selected ({selectedForCompare.length}/3)</span>
            </button>
          )}

          <button className="secondary-button" onClick={handleExport}>
            <Download size={14} />
            <span>Export Filtered ({displayed.length})</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="action-notification-banner">
          <span>{toast}</span>
        </div>
      )}

      {/* Advanced Filter & Sorter Toolbar */}
      <div className="filter-toolbar-card">
        <div className="search-input-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by Customer ID (C012347) or Country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Segment Toggles */}
        <div className="filter-group">
          <span className="filter-group-label">Segment:</span>
          {["ALL", "Premium", "Loyal", "Regular", "Low value"].map((seg) => (
            <button
              key={seg}
              className={`pill-toggle-btn ${segmentFilter === seg ? "active" : ""}`}
              onClick={() => setSegmentFilter(seg)}
            >
              {seg}
            </button>
          ))}
        </div>

        {/* Risk Level Filter Dropdown */}
        <div className="filter-group">
          <span className="filter-group-label">Risk Tier:</span>
          <select
            className="filter-select-input"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option value="ALL">All Risk Tiers</option>
            <option value="HIGH">High Risk (≥ 60%)</option>
            <option value="MEDIUM">Medium Risk (30% - 60%)</option>
            <option value="SAFE">Safe (&lt; 30%)</option>
          </select>
        </div>

        {/* Sorter Dropdown */}
        <div className="filter-group">
          <span className="filter-group-label">Sort By:</span>
          <select
            className="filter-select-input"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="risk">Churn Risk (Highest first)</option>
            <option value="spend">Total Spend (Highest first)</option>
            <option value="recency">Recency (Most recent first)</option>
          </select>
        </div>
      </div>

      {/* Customer Comparison Modal */}
      {showCompareModal && (
        <div className="modal-backdrop-overlay" onClick={() => setShowCompareModal(false)}>
          <div
            className="modal-dossier-card"
            style={{ maxWidth: "860px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-dossier-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Users2 size={20} color="var(--primary)" />
                <div>
                  <h2 style={{ fontSize: "18px", margin: 0, fontWeight: "700" }}>
                    Multi-Customer 360 Comparison
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "var(--text-sub)" }}>
                    Side-by-side behavioral RFM and predictive MLlib intelligence analysis
                  </p>
                </div>
              </div>
              <button
                className="close-dossier-btn"
                onClick={() => setShowCompareModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${comparedCustomersData.length}, 1fr)`,
                gap: "16px",
                padding: "20px",
              }}
            >
              {comparedCustomersData.map((c) => {
                const aov = c.monetary && c.frequency ? Math.round(c.monetary / c.frequency) : 0;
                const isHighRisk = c.churn_prob >= 0.6;
                return (
                  <div
                    key={c.customer_id}
                    className="panel-card"
                    style={{
                      background: "var(--card-bg-subtle)",
                      border: isHighRisk ? "1px solid rgba(220, 38, 38, 0.4)" : "1px solid var(--border)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="code-identifier" style={{ fontSize: "14px", fontWeight: "700" }}>
                        {c.customer_id}
                      </span>
                      <span className="segment-chip">{c.segment}</span>
                    </div>

                    <div style={{ fontSize: "12px", color: "var(--text-sub)", margin: "4px 0 14px" }}>
                      Country: <strong>{c.country}</strong>
                    </div>

                    {/* Churn Risk Bar */}
                    <div style={{ marginBottom: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                        <span>Churn Probability:</span>
                        <strong style={{ color: isHighRisk ? "#dc2626" : "#059669" }}>
                          {(c.churn_prob * 100).toFixed(1)}%
                        </strong>
                      </div>
                      <div className="spend-bar-track">
                        <div
                          className="spend-bar-fill"
                          style={{
                            width: `${c.churn_prob * 100}%`,
                            backgroundColor: isHighRisk ? "#dc2626" : "#059669",
                          }}
                        />
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                      <div className="mini-stat-box">
                        <span className="mini-stat-label">Lifetime Spend</span>
                        <span className="mini-stat-val">{currFmt.format(c.monetary || 0)}</span>
                      </div>
                      <div className="mini-stat-box">
                        <span className="mini-stat-label">Orders (Freq)</span>
                        <span className="mini-stat-val">{c.frequency || 1}</span>
                      </div>
                      <div className="mini-stat-box">
                        <span className="mini-stat-label">Recency</span>
                        <span className="mini-stat-val">{c.recency} days</span>
                      </div>
                      <div className="mini-stat-box">
                        <span className="mini-stat-label">Avg Order (AOV)</span>
                        <span className="mini-stat-val">{currFmt.format(aov)}</span>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: "12px",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "var(--card-bg)",
                        fontSize: "11.5px",
                      }}
                    >
                      <div style={{ color: "var(--text-sub)", marginBottom: "2px" }}>Forecast 180d Spend:</div>
                      <strong>{currFmt.format(c.clv_pred || 0)}</strong>
                    </div>

                    <div
                      style={{
                        marginTop: "8px",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: isHighRisk ? "rgba(220, 38, 38, 0.08)" : "rgba(37, 99, 235, 0.08)",
                        fontSize: "11.5px",
                      }}
                    >
                      <div style={{ color: "var(--text-sub)", marginBottom: "2px" }}>Target Campaign:</div>
                      <strong>{isHighRisk ? "M002 Win-back discount" : "M004 Loyalty rewards"}</strong>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
              <button
                className="action-btn-secondary"
                onClick={() => setSelectedForCompare([])}
                style={{ marginRight: "8px" }}
              >
                Clear Selection
              </button>
              <button
                className="action-btn-primary"
                onClick={() => setShowCompareModal(false)}
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Customers Table Card */}
      <div className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>Enterprise Customer Records</h3>
            <p>Showing {displayed.length} matched customer accounts from HBase NoSQL store</p>
          </div>
          <span className="panel-header-pill">5,721 Ingested</span>
        </div>

        <div className="table-responsive-container">
          <table className="enterprise-data-table">
            <thead>
              <tr>
                <th style={{ width: "36px" }}>
                  <span title="Select to compare">Cmp</span>
                </th>
                <th>Customer ID</th>
                <th>Country</th>
                <th>Segment</th>
                <th>Churn Risk</th>
                <th>Forecast 180d Spend</th>
                <th>Lifetime Spend</th>
                <th>Recency</th>
                <th>Frequency</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((c) => {
                const isSelected = selectedForCompare.includes(c.customer_id);
                return (
                  <tr key={c.customer_id} className={isSelected ? "row-selected" : ""}>
                    <td>
                      <button
                        onClick={() => toggleSelectCompare(c.customer_id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: isSelected ? "var(--primary)" : "var(--text-sub)",
                        }}
                        title={isSelected ? "Remove from comparison" : "Add to comparison"}
                      >
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>
                    <td>
                      <span className="code-identifier">{c.customer_id}</span>
                    </td>
                    <td>{c.country}</td>
                    <td>
                      <span className="segment-chip">{c.segment}</span>
                    </td>
                    <td>
                      <span
                        className="risk-pct-value"
                        style={{ color: c.churn_prob >= 0.6 ? "#dc2626" : "#059669" }}
                      >
                        {(c.churn_prob * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{currFmt.format(c.clv_pred || 0)}</td>
                    <td style={{ fontWeight: 600 }}>{currFmt.format(c.monetary || 0)}</td>
                    <td>{c.recency} days</td>
                    <td>{c.frequency} orders</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="table-action-button"
                        onClick={() => setSelectedCustomer(c)}
                        title="View Customer 360 Dossier"
                      >
                        <Eye size={13} />
                        <span>Dossier</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer 360 Dossier Modal Dialog */}
      {selectedCustomer && (
        <div className="modal-backdrop-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="modal-dossier-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-dossier-header">
              <div className="dossier-id-box">
                <span className="dossier-title-code">{selectedCustomer.customer_id}</span>
                <span className="dossier-badge-pill">{selectedCustomer.segment}</span>
              </div>
              <button
                className="close-dossier-btn"
                onClick={() => setSelectedCustomer(null)}
              >
                ✕
              </button>
            </div>

            <div className="dossier-body-grid">
              <div className="dossier-stat-tile">
                <span className="dossier-stat-label">Country of Origin</span>
                <span className="dossier-stat-value">{selectedCustomer.country}</span>
              </div>
              <div className="dossier-stat-tile">
                <span className="dossier-stat-label">Predicted Churn Risk</span>
                <span
                  className="dossier-stat-value"
                  style={{ color: selectedCustomer.churn_prob >= 0.6 ? "#dc2626" : "#059669" }}
                >
                  {(selectedCustomer.churn_prob * 100).toFixed(1)}%
                </span>
              </div>
              <div className="dossier-stat-tile">
                <span className="dossier-stat-label">Forecast 180-Day Spend</span>
                <span className="dossier-stat-value">{currFmt.format(selectedCustomer.clv_pred || 0)}</span>
              </div>
              <div className="dossier-stat-tile">
                <span className="dossier-stat-label">Actual Lifetime GMV</span>
                <span className="dossier-stat-value">{currFmt.format(selectedCustomer.monetary || 0)}</span>
              </div>
              <div className="dossier-stat-tile">
                <span className="dossier-stat-label">Dormancy (Recency)</span>
                <span className="dossier-stat-value">{selectedCustomer.recency} days ago</span>
              </div>
              <div className="dossier-stat-tile">
                <span className="dossier-stat-label">Invoiced Frequency</span>
                <span className="dossier-stat-value">{selectedCustomer.frequency} orders</span>
              </div>
            </div>

            <div className="dossier-action-section">
              <div className="dossier-action-info">
                <h4>Automated Closed-Loop Campaign Recommendation</h4>
                <p>
                  {selectedCustomer.churn_prob >= 0.6
                    ? "Trigger Campaign M002 Win-back Discount (15% off voucher) to re-engage account before churn."
                    : selectedCustomer.segment === "Premium" || selectedCustomer.segment === "Loyal"
                    ? "Dispatch Campaign M004 VIP Loyalty Rewards & Concierge service."
                    : "Enroll in Campaign M003 Seasonal re-engagement offers."}
                </p>
              </div>
              <button
                className="primary-button"
                onClick={() => {
                  setToast(`Campaign offer dispatched to HBase crm_interaction for ${selectedCustomer.customer_id}!`);
                  setSelectedCustomer(null);
                  setTimeout(() => setToast(""), 3500);
                }}
              >
                <Send size={13} />
                <span>Dispatch Offer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
