import { useState, useEffect } from "react";
import { Search, Filter, ArrowUpDown, Eye, Download, ShieldAlert, Sparkles, Send } from "lucide-react";
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

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      ["customer_id,country,segment,churn_prob,clv_pred,monetary,recency,frequency"].join(",") + "\n" +
      displayed.map(c => `${c.customer_id},${c.country},${c.segment},${c.churn_prob},${c.clv_pred},${c.monetary},${c.recency},${c.frequency}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hbase_customers_${segmentFilter.toLowerCase()}_export.csv`);
    document.body.appendChild(link);
    link.click();
    setToast(`Exported ${displayed.length} customer records to CSV!`);
    setTimeout(() => setToast(""), 3500);
  };

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

        <button className="secondary-button" onClick={handleExport}>
          <Download size={14} />
          <span>Export Filtered ({displayed.length})</span>
        </button>
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

        {/* Risk Filter */}
        <div className="filter-group">
          <span className="filter-group-label">Risk:</span>
          <select
            className="filter-dropdown"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option value="ALL">All Risk Tiers</option>
            <option value="HIGH">High Risk (≥60%)</option>
            <option value="MEDIUM">Medium Risk (30-60%)</option>
            <option value="SAFE">Safe (&lt; 30%)</option>
          </select>
        </div>

        {/* Sort By */}
        <div className="filter-group">
          <span className="filter-group-label">Sort:</span>
          <select
            className="filter-dropdown"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="risk">Churn Risk (Highest)</option>
            <option value="spend">Total Spend (Highest)</option>
            <option value="recency">Most Recent First</option>
          </select>
        </div>
      </div>

      {/* Main Customers Data Table */}
      <div className="panel-card">
        <div className="table-responsive-container">
          <table className="enterprise-data-table">
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Country</th>
                <th>Segment</th>
                <th>Churn Risk</th>
                <th>Forecast Spend (180d)</th>
                <th>Lifetime GMV</th>
                <th>Invoices</th>
                <th>Dormancy</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((c) => (
                <tr key={c.customer_id} onClick={() => setSelectedCustomer(c)} style={{ cursor: "pointer" }}>
                  <td>
                    <span className="code-identifier">{c.customer_id}</span>
                  </td>
                  <td>{c.country}</td>
                  <td>
                    <span className={`segment-chip seg-${c.segment.toLowerCase().replace(" ", "-")}`}>
                      {c.segment}
                    </span>
                  </td>
                  <td>
                    <span
                      className="risk-pct-value"
                      style={{ color: c.churn_prob >= 0.6 ? "#dc2626" : c.churn_prob < 0.3 ? "#059669" : "#d97706" }}
                    >
                      {(c.churn_prob * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td>
                    <span className="currency-num">{currFmt.format(c.clv_pred)}</span>
                  </td>
                  <td>
                    <span className="currency-num">{currFmt.format(c.monetary)}</span>
                  </td>
                  <td>{c.frequency}</td>
                  <td>{c.recency} days</td>
                  <td>
                    <button
                      className="icon-action-btn"
                      onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); }}
                      title="View Complete Customer Dossier"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer 360 Dossier Modal */}
      {selectedCustomer && (
        <div className="dossier-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="dossier-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dossier-header">
              <div>
                <span className="eyebrow-badge">CUSTOMER PROFILE 360</span>
                <h2>{selectedCustomer.customer_id}</h2>
                <p>Location: {selectedCustomer.country} · Member since: {selectedCustomer.first_order_date}</p>
              </div>
              <button className="dossier-close-btn" onClick={() => setSelectedCustomer(null)}>✕</button>
            </div>

            <div className="dossier-grid">
              <div className="dossier-stat">
                <span className="stat-sublabel">Assigned Segment</span>
                <span className="stat-highlight">{selectedCustomer.segment}</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Churn Probability</span>
                <span
                  className="stat-highlight"
                  style={{ color: selectedCustomer.churn_prob >= 0.6 ? "#dc2626" : "#059669" }}
                >
                  {(selectedCustomer.churn_prob * 100).toFixed(1)}%
                </span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Predicted 180-Day Spend</span>
                <span className="stat-highlight">{currFmt.format(selectedCustomer.clv_pred)}</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Historical Lifetime GMV</span>
                <span className="stat-highlight">{currFmt.format(selectedCustomer.monetary)}</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Recency</span>
                <span className="stat-highlight">{selectedCustomer.recency} days</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Order Count / Returns</span>
                <span className="stat-highlight">{selectedCustomer.frequency} orders / {selectedCustomer.cancellations || 0} returns</span>
              </div>
            </div>

            <div className="dossier-action-section">
              <div className="action-rule-header">
                <strong>Closed-Loop Recommendation:</strong>
                <span>Actionable Automation</span>
              </div>
              <p>
                {selectedCustomer.churn_prob >= 0.6
                  ? `High churn risk account (${(selectedCustomer.churn_prob * 100).toFixed(1)}%). Assigned Campaign M002: Automated Win-Back 15% discount voucher code dispatched to HBase crm_interaction.`
                  : selectedCustomer.segment === "Loyal" || selectedCustomer.segment === "Premium"
                  ? "VIP Account with low churn risk. Assigned Campaign M004: Platinum Early Access, dedicated concierge service, and loyalty rewards."
                  : "Standard Account. Assigned Campaign M001: General onboarding and seasonal re-engagement updates."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
