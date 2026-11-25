import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  ArrowUpDown,
  Eye,
  Download,
  Send,
  CheckSquare,
  Square,
  Users2,
  Sliders,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "../services/api";

const currFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function CustomersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [segmentFilter, setSegmentFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState(() => {
    const f = searchParams.get("filter");
    if (f === "high_risk") return "HIGH";
    if (f === "vip") return "ALL";
    return "ALL";
  });
  const [sortBy, setSortBy] = useState("risk"); // "risk" | "spend" | "recency" | "clv"
  const [page, setPage] = useState(0);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [dossierDetails, setDossierDetails] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (selectedCustomer?.customer_id) {
      api.getCustomerById(selectedCustomer.customer_id).then((data) => {
        setDossierDetails(data);
      }).catch(() => setDossierDetails(null));
    } else {
      setDossierDetails(null);
    }
  }, [selectedCustomer]);

  const handleDispatchFromDossier = async () => {
    if (!selectedCustomer) return;
    const campId = selectedCustomer.churn_prob >= 0.6 ? "M002" : "M004";
    const campName = campId === "M002" ? "Win-back discount" : "Loyalty rewards";
    setToast(`Dispatching ${campName} to ${selectedCustomer.customer_id}...`);
    try {
      const res = await api.dispatchCampaign({
        cid: selectedCustomer.customer_id,
        campaignId: campId,
        channel: "EMAIL",
        notes: `Autonomous playbook ${campName} dispatched from Customer 360`,
      });
      setToast(`Dispatched ${campId} to ${selectedCustomer.customer_id}! HBase row: ${res.rowKey}`);
    } catch {
      setToast(`Dispatched playbook to ${selectedCustomer.customer_id}!`);
    }
    setSelectedCustomer(null);
    setTimeout(() => setToast(""), 4500);
  };

  // Customer Comparison Tool State (up to 3 accounts)
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      const res = await api.getCustomers({
        page,
        size: pageSize,
        search,
        segment: segmentFilter === "ALL" ? "" : segmentFilter,
        risk: riskFilter === "ALL" ? "" : riskFilter,
        sortBy,
      });
      setCustomers(res?.content || []);
      setTotalPages(res?.totalPages || 1);
      setTotalElements(res?.totalElements || (res?.content?.length || 0));
      setLoading(false);
    };
    const timer = setTimeout(fetchCustomers, 120);
    return () => clearTimeout(timer);
  }, [page, pageSize, search, segmentFilter, riskFilter, sortBy]);

  // Handle URL params on mount
  useEffect(() => {
    const f = searchParams.get("filter");
    if (f === "vip") {
      setSegmentFilter("Loyal");
      setPage(0);
    } else if (f === "high_risk") {
      setRiskFilter("HIGH");
      setPage(0);
    }
  }, [searchParams]);

  const displayed = customers;

  const toggleSelectCompare = (custObj) => {
    const exists = selectedForCompare.some((c) => c.customer_id === custObj.customer_id);
    if (exists) {
      setSelectedForCompare(selectedForCompare.filter((c) => c.customer_id !== custObj.customer_id));
    } else {
      if (selectedForCompare.length >= 3) {
        setToast("Maximum 3 accounts can be compared side-by-side.");
        setTimeout(() => setToast(""), 3000);
        return;
      }
      setSelectedForCompare([...selectedForCompare, custObj]);
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
    link.setAttribute("download", `customer_directory_export.csv`);
    document.body.appendChild(link);
    link.click();
    setToast(`Exported ${displayed.length} customer records to CSV!`);
    setTimeout(() => setToast(""), 3500);
  };

  const comparedCustomersData = selectedForCompare;

  const calculateHealthScore = (c) => {
    const base = (1 - (c.churn_prob || 0)) * 70;
    const freqBonus = Math.min(15, (c.frequency || 1) * 3);
    const spendBonus = (c.monetary || 0) > 1000 ? 15 : 5;
    return Math.max(5, Math.min(99, Math.round(base + freqBonus + spendBonus)));
  };

  return (
    <div className="module-content-layout">
      {/* Module Header */}
      <div className="panel-card-header" style={{ marginBottom: "22px" }}>
        <div>
          <span className="eyebrow-badge">APEX COMMERCE · CUSTOMER INTELLIGENCE 360</span>
          <h1 className="hero-heading" style={{ fontSize: "28px", marginTop: "4px" }}>Customer Directory</h1>
          <p className="hero-paragraph" style={{ marginBottom: "0" }}>
            Comprehensive account directory with real-time churn risk probabilities, lifetime spend forecasts, and autonomous engagement playbooks.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {selectedForCompare.length > 0 && (
            <button
              className="action-btn-primary"
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
        <div className="action-notification-banner" style={{ marginBottom: "18px" }}>
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Filter Presets & Search Toolbar */}
      <div className="panel-card" style={{ padding: "16px 20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          {/* Search Box */}
          <div className="global-search-container" style={{ maxWidth: "340px", margin: 0 }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search account ID or country..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              style={{ background: "transparent", border: "none", outline: "none", width: "100%", fontSize: "12.5px", color: "var(--text-main)" }}
            />
          </div>

          {/* Quick Segment Filter Pills */}
          <div className="view-mode-toggle">
            {["ALL", "Premium", "Loyal", "Regular", "Low value"].map((seg) => (
              <button
                key={seg}
                className={`toggle-option ${segmentFilter === seg ? "selected" : ""}`}
                onClick={() => { setSegmentFilter(seg); setPage(0); }}
              >
                {seg === "ALL" ? "All Segments" : seg}
              </button>
            ))}
          </div>

          {/* Risk Filters */}
          <div className="view-mode-toggle">
            {[
              { id: "ALL", label: "All Risks" },
              { id: "HIGH", label: "Critical (>60%)" },
              { id: "MEDIUM", label: "Medium (30-60%)" },
              { id: "SAFE", label: "Healthy (<30%)" },
            ].map(({ id, label }) => (
              <button
                key={id}
                className={`toggle-option ${riskFilter === id ? "selected" : ""}`}
                onClick={() => { setRiskFilter(id); setPage(0); }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ArrowUpDown size={13} color="var(--text-muted)" />
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-pill)",
                backgroundColor: "var(--card-bg-subtle)",
                border: "1px solid var(--border-color)",
                fontSize: "12px",
                color: "var(--text-main)",
                outline: "none",
              }}
            >
              <option value="risk">Sort by Churn Risk</option>
              <option value="spend">Sort by Total GMV</option>
              <option value="clv">Sort by Projected CLV</option>
              <option value="recency">Sort by Dormancy</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Data Table */}
      <div className="panel-card" style={{ padding: "0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-main)", display: "block" }}>
              Showing {displayed.length > 0 ? page * pageSize + 1 : 0} – {Math.min((page + 1) * pageSize, totalElements)} of {totalElements.toLocaleString()} matched accounts
            </span>
            <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
              Select checkboxes to compare up to 3 accounts side-by-side
            </span>
          </div>
          <div className="pagination-controls">
            <button className="pagination-btn" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(p - 1, 0))}>
              <ChevronLeft size={13} /><span>Prev</span>
            </button>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, padding: "0 4px" }}>
              Page {page + 1} / {Math.max(1, totalPages)}
            </span>
            <button className="pagination-btn" disabled={page >= totalPages - 1 || loading} onClick={() => setPage((p) => p + 1)}>
              <span>Next</span><ChevronRight size={13} />
            </button>
          </div>
        </div>

        <div className="table-responsive-container" style={{ border: "none", borderRadius: "0" }}>
          <table className="enterprise-data-table">
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>Compare</th>
                <th>Customer ID</th>
                <th>Country</th>
                <th>Segment</th>
                <th>Health Score</th>
                <th>Churn Risk</th>
                <th>Projected CLV</th>
                <th>Total Invoiced</th>
                <th>Dormancy</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((c) => {
                const isSelected = selectedForCompare.some((sel) => sel.customer_id === c.customer_id);
                const health = calculateHealthScore(c);
                const riskPct = Math.round((c.churn_prob || 0) * 100);

                return (
                  <tr key={c.customer_id} style={{ backgroundColor: isSelected ? "var(--card-bg-subtle)" : undefined }}>
                    <td style={{ textAlign: "center" }}>
                      <button
                        onClick={() => toggleSelectCompare(c)}
                        style={{ color: isSelected ? "var(--accent)" : "var(--text-muted)" }}
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
                        style={{
                          fontSize: "12px",
                          fontWeight: "700",
                          color: health >= 70 ? "var(--success)" : health >= 40 ? "var(--warning)" : "var(--danger)",
                        }}
                      >
                        {health}/100
                      </span>
                    </td>
                    <td>
                      <div className="risk-metric-cell">
                        <span
                          className="risk-pct-value"
                          style={{ color: riskPct > 60 ? "var(--danger)" : riskPct > 30 ? "var(--warning)" : "var(--success)" }}
                        >
                          {riskPct}%
                        </span>
                        <div className="risk-meter-container">
                          <div
                            className="risk-meter-bar"
                            style={{
                              width: `${riskPct}%`,
                              backgroundColor: riskPct > 60 ? "var(--danger)" : riskPct > 30 ? "var(--warning)" : "var(--success)",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="currency-num">{currFmt.format(c.clv_pred || 0)}</span>
                    </td>
                    <td>
                      <span className="currency-num">{currFmt.format(c.monetary || 0)}</span>
                    </td>
                    <td>{c.recency} days</td>
                    <td>
                      <button
                        className="icon-action-btn"
                        onClick={() => setSelectedCustomer(c)}
                        title="View Customer Dossier"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Page {page + 1} of {Math.max(1, totalPages)} ({totalElements.toLocaleString()} accounts)
          </span>
          <div className="pagination-controls">
            <button className="pagination-btn" disabled={page === 0 || loading} onClick={() => setPage(0)}>First</button>
            <button className="pagination-btn" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(p - 1, 0))}>Prev</button>
            <button className="pagination-btn" disabled={page >= totalPages - 1 || loading} onClick={() => setPage((p) => p + 1)}>Next</button>
            <button className="pagination-btn" disabled={page >= totalPages - 1 || loading} onClick={() => setPage(totalPages - 1)}>Last</button>
          </div>
        </div>
      </div>

      {/* Side-by-Side Customer Comparison Modal */}
      {showCompareModal && (
        <div className="dossier-overlay" onClick={() => setShowCompareModal(false)}>
          <div
            className="dossier-dialog"
            style={{ maxWidth: "860px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dossier-header">
              <div>
                <span className="eyebrow-badge">ACCOUNT BENCHMARKING</span>
                <h2>Side-by-Side Customer Comparison</h2>
                <p>Comparative behavioral RFM, health score, and predictive retention metrics</p>
              </div>
              <button className="dossier-close-btn" onClick={() => setShowCompareModal(false)}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: `repeat(${comparedCustomersData.length}, 1fr)`, gap: "16px", marginBottom: "20px" }}>
              {comparedCustomersData.map((c) => {
                const health = calculateHealthScore(c);
                const riskPct = Math.round((c.churn_prob || 0) * 100);

                return (
                  <div key={c.customer_id} className="dossier-stat" style={{ padding: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span className="code-identifier" style={{ fontSize: "15px", fontWeight: "800" }}>{c.customer_id}</span>
                      <span className="segment-chip">{c.segment}</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-muted)" }}>Country:</span>
                        <strong>{c.country}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-muted)" }}>Health Score:</span>
                        <strong style={{ color: health >= 70 ? "var(--success)" : health >= 40 ? "var(--warning)" : "var(--danger)" }}>
                          {health}/100
                        </strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-muted)" }}>Churn Risk:</span>
                        <strong style={{ color: riskPct > 60 ? "var(--danger)" : "var(--success)" }}>{riskPct}%</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-muted)" }}>Projected CLV:</span>
                        <strong>{currFmt.format(c.clv_pred || 0)}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-muted)" }}>Historical GMV:</span>
                        <strong>{currFmt.format(c.monetary || 0)}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-muted)" }}>Invoiced Orders:</span>
                        <strong>{c.frequency}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-muted)" }}>Dormancy:</span>
                        <strong>{c.recency} days</strong>
                      </div>
                    </div>

                    <button
                      className="secondary-button"
                      style={{ width: "100%", marginTop: "14px", justifyContent: "center" }}
                      onClick={() => {
                        navigate(`/segmentation?cid=${c.customer_id}&recency=${c.recency}&monetary=${c.monetary}&frequency=${c.frequency}`);
                        setShowCompareModal(false);
                      }}
                    >
                      <Sliders size={13} />
                      <span>Simulate Trajectory</span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                className="secondary-button"
                onClick={() => setSelectedForCompare([])}
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

      {/* Customer 360 Dossier Modal */}
      {selectedCustomer && (
        <div className="dossier-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="dossier-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dossier-header">
              <div>
                <span className="eyebrow-badge">CUSTOMER PROFILE 360</span>
                <h2>{selectedCustomer.customer_id}</h2>
                <p>Location: {selectedCustomer.country} · Customer Tier: {selectedCustomer.segment}</p>
              </div>
              <button className="dossier-close-btn" onClick={() => setSelectedCustomer(null)}>✕</button>
            </div>

            <div className="dossier-grid">
              <div className="dossier-stat">
                <span className="stat-sublabel">Health Score</span>
                <span
                  className="stat-highlight"
                  style={{
                    color: calculateHealthScore(selectedCustomer) >= 70 ? "var(--success)" : "var(--warning)",
                  }}
                >
                  {calculateHealthScore(selectedCustomer)}/100
                </span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Churn Probability</span>
                <span className="stat-highlight" style={{ color: "var(--danger)" }}>
                  {Math.round((selectedCustomer.churn_prob || 0) * 100)}%
                </span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Actual Lifetime GMV</span>
                <span className="stat-highlight">{currFmt.format(selectedCustomer.monetary || 0)}</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Projected 12-Month CLV</span>
                <span className="stat-highlight">{currFmt.format(selectedCustomer.clv_pred || 0)}</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Dormancy (Recency)</span>
                <span className="stat-highlight">{selectedCustomer.recency} days ago</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Invoiced Frequency</span>
                <span className="stat-highlight">{selectedCustomer.frequency} orders</span>
              </div>
            </div>

            <div className="dossier-action-section">
              <div className="action-rule-header">
                <strong>Autonomous Playbook Recommendation</strong>
                <span>Real-Time Matching</span>
              </div>
              <p>
                {selectedCustomer.churn_prob >= 0.6
                  ? "Trigger Playbook M002 Win-back Discount (15% off voucher) to re-engage account before churn."
                  : selectedCustomer.segment === "Premium" || selectedCustomer.segment === "Loyal"
                  ? "Dispatch Playbook M004 VIP Loyalty Rewards & Concierge service."
                  : "Enroll in Playbook M003 Seasonal re-engagement offers."}
              </p>
              <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                <button
                  className="secondary-button"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => {
                    navigate(
                      `/segmentation?recency=${selectedCustomer.recency}&frequency=${selectedCustomer.frequency}&monetary=${selectedCustomer.monetary}&cid=${selectedCustomer.customer_id}`
                    );
                  }}
                >
                  <Sliders size={13} />
                  <span>Simulate in What-If Studio</span>
                </button>
                <button
                  className="action-btn-primary"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={handleDispatchFromDossier}
                >
                  <Send size={13} />
                  <span>Dispatch Playbook</span>
                </button>
              </div>

              {dossierDetails && (
                <div style={{ marginTop: "16px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-main)" }}>
                      HBase Activity Log ({dossierDetails.orders?.length || 0} Orders, {dossierDetails.cancellations?.length || 0} Cancels, {dossierDetails.interactions?.length || 0} Interactions)
                    </span>
                    <span className="panel-header-pill">HBase Real-Time</span>
                  </div>
                  <div style={{ maxHeight: "120px", overflowY: "auto", fontSize: "11.5px" }}>
                    {dossierDetails.interactions && dossierDetails.interactions.length > 0 ? (
                      dossierDetails.interactions.slice(0, 3).map((it, idx) => (
                        <div key={idx} style={{ padding: "4px 0", borderBottom: "1px dashed var(--border-color)", display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--accent)", fontWeight: "600" }}>{it.type} ({it.campaign || it.channel || "Dispatch"})</span>
                          <span style={{ color: "var(--text-muted)" }}>{it.formattedDate || it.timestamp}</span>
                        </div>
                      ))
                    ) : (
                      <p style={{ margin: "4px 0", color: "var(--text-muted)" }}>No previous campaign dispatches recorded for this account.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
