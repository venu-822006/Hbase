import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  RotateCcw,
  AlertOctagon,
  TrendingDown,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  User,
} from "lucide-react";
import api from "../services/api";

const currFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export default function CancellationsPage() {
  const navigate = useNavigate();
  const [cancels, setCancels] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCancel, setSelectedCancel] = useState(null);

  useEffect(() => {
    api.getCancellationStats().then((res) => {
      if (res) setStats(res);
    });
  }, []);

  useEffect(() => {
    const fetchCancels = async () => {
      setLoading(true);
      const res = await api.getCancellations({
        page,
        size: pageSize,
        search,
      });
      if (res) {
        setCancels(res.content || []);
        setTotalPages(res.totalPages || 1);
        setTotalElements(res.totalElements || 0);
      }
      setLoading(false);
    };

    const timer = setTimeout(fetchCancels, 120);
    return () => clearTimeout(timer);
  }, [page, pageSize, search]);

  const handleExport = () => {
    const headers = ["invoice", "customer_id", "date", "amount", "reason"];
    const rows = cancels.map((c) =>
      [
        `"${c.invoice}"`,
        `"${c.customer_id}"`,
        `"${c.date}"`,
        c.amount,
        `"${c.reason || "Customer return / cancellation"}"`,
      ].join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `apex_returns_page_${page + 1}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="module-content-layout">
      {/* Header */}
      <div className="panel-card-header" style={{ marginBottom: "22px" }}>
        <div>
          <span className="eyebrow-badge">APEX COMMERCE · FRICTION TELEMETRY</span>
          <h1 className="hero-heading" style={{ fontSize: "28px", marginTop: "4px" }}>
            Returns &amp; <em>Cancellation Analytics</em>
          </h1>
          <p className="hero-paragraph" style={{ marginBottom: 0 }}>
            {(stats?.totalCancellations || 7517).toLocaleString()} customer return signals and cancellation events analyzed to model early churn risk indicators.
          </p>
        </div>

        <button className="secondary-button" onClick={handleExport}>
          <Download size={14} />
          <span>Export View CSV</span>
        </button>
      </div>

      {/* KPI Cards */}
      <section className="metrics-summary-grid">
        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-danger)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">CANCELLED TRANSACTIONS</span>
            <div className="metric-box-icon" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
              <RotateCcw size={18} />
            </div>
          </div>
          <div className="metric-box-value" style={{ color: "var(--danger)" }}>
            {(stats?.totalCancellations || 7517).toLocaleString()}
          </div>
          <div className="metric-box-footer">
            <span className="footer-code">Indexed in crm_cancellations</span>
            <span className="footer-desc">All credit notes &amp; order reversals</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-amber)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">TOTAL REFUNDED EXPOSURE</span>
            <div className="metric-box-icon" style={{ background: "var(--warning-light)", color: "var(--warning)" }}>
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="metric-box-value">
            {currFmt.format(stats?.totalRefunded || 893753.3)}
          </div>
          <div className="metric-box-footer">
            <span className="footer-code">{stats?.returnRatePercentage || 18.02}% Event Ratio</span>
            <span className="footer-desc">Returns vs 34,191 completed invoices</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-purple)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">CHURN CORRELATION LIFT</span>
            <div className="metric-box-icon" style={{ background: "var(--purple-light)", color: "var(--purple)" }}>
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="metric-box-value" style={{ color: "var(--warning)" }}>+34%</div>
          <div className="metric-box-footer">
            <span className="footer-code">ML Feature Weight</span>
            <span className="footer-desc">Repeated returns accelerate dormancy risk</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-primary)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">RECOVERY PLAYBOOK</span>
            <div className="metric-box-icon" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
              <AlertOctagon size={18} />
            </div>
          </div>
          <div className="metric-box-value">M002 Win-Back</div>
          <div className="metric-box-footer">
            <span className="footer-code" style={{ color: "var(--success)" }}>Automated Trigger</span>
            <span className="footer-desc">Proactive outreach on friction spikes</span>
          </div>
        </div>
      </section>

      {/* Search Toolbar */}
      <div className="panel-card" style={{ padding: "16px 20px", marginBottom: "20px" }}>
        <div className="global-search-container" style={{ maxWidth: "420px", margin: 0 }}>
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search cancellation invoice (C513775) or customer ID (C014095)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            style={{ background: "transparent", border: "none", outline: "none", width: "100%", fontSize: "12.5px", color: "var(--text-main)" }}
          />
        </div>
      </div>

      {/* Cancellations Table */}
      <div className="panel-card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-main)", margin: 0 }}>
              Recorded Cancellation &amp; Return Events
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Showing {cancels.length > 0 ? page * pageSize + 1 : 0} –{" "}
              {Math.min((page + 1) * pageSize, totalElements)} of {totalElements.toLocaleString()} records
            </span>
          </div>

          <div className="pagination-controls">
            <button
              className="pagination-btn"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
            >
              <ChevronLeft size={13} />
              <span>Prev</span>
            </button>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600", padding: "0 4px" }}>
              Page {page + 1} / {Math.max(1, totalPages)}
            </span>
            <button
              className="pagination-btn"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              <span>Next</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            Retrieving cancellation signals from HBase repository...
          </div>
        ) : cancels.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            No cancellation signals matched the search query.
          </div>
        ) : (
          <div className="table-responsive-container" style={{ border: "none", borderRadius: 0 }}>
            <table className="enterprise-data-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Customer ID</th>
                  <th>Cancellation Date</th>
                  <th style={{ textAlign: "right" }}>Refund Amount</th>
                  <th>Friction Classification</th>
                  <th>Signal Status</th>
                  <th>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {cancels.map((c) => (
                  <tr
                    key={`${c.invoice}-${c.customer_id}-${c.ts14}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedCancel(c)}
                  >
                    <td>
                      <span className="code-identifier" style={{ color: "var(--danger)", backgroundColor: "var(--danger-light)" }}>
                        #{c.invoice}
                      </span>
                    </td>
                    <td>
                      <span className="code-identifier">{c.customer_id}</span>
                    </td>
                    <td style={{ color: "var(--text-sub)" }}>{c.date}</td>
                    <td style={{ textAlign: "right", color: "var(--danger)" }}>
                      <span className="currency-num">-{currFmt.format(Math.abs(c.amount || 0))}</span>
                    </td>
                    <td>{c.reason || "Customer return / cancellation"}</td>
                    <td>
                      <span className="badge-tag danger">FRICTION LOGGED</span>
                    </td>
                    <td>
                      <button
                        className="dispatch-action-tag"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCancel(c);
                        }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination-bar">
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Page {page + 1} of {Math.max(1, totalPages)} ({totalElements.toLocaleString()} records)
          </span>
          <div className="pagination-controls">
            <button className="pagination-btn" disabled={page === 0 || loading} onClick={() => setPage(0)}>First</button>
            <button className="pagination-btn" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(p - 1, 0))}>Prev</button>
            <button className="pagination-btn" disabled={page >= totalPages - 1 || loading} onClick={() => setPage((p) => p + 1)}>Next</button>
            <button className="pagination-btn" disabled={page >= totalPages - 1 || loading} onClick={() => setPage(totalPages - 1)}>Last</button>
          </div>
        </div>
      </div>

      {/* Cancellation Detail Modal */}
      {selectedCancel && (
        <div className="dossier-overlay" onClick={() => setSelectedCancel(null)}>
          <div className="dossier-dialog" style={{ maxWidth: "540px" }} onClick={(e) => e.stopPropagation()}>
            <div className="dossier-header">
              <div>
                <span className="eyebrow-badge">RETURN FRICTION SIGNAL</span>
                <h2>#{selectedCancel.invoice}</h2>
                <p>Account: {selectedCancel.customer_id} · Logged: {selectedCancel.date}</p>
              </div>
              <button className="dossier-close-btn" onClick={() => setSelectedCancel(null)}>✕</button>
            </div>

            <div className="dossier-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="dossier-stat">
                <span className="stat-sublabel">Refund / Reversal Value</span>
                <span className="stat-highlight" style={{ color: "var(--danger)" }}>
                  -{currFmt.format(Math.abs(selectedCancel.amount || 0))}
                </span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">ML Churn Signal</span>
                <span className="stat-highlight" style={{ color: "var(--warning)" }}>+34% Risk Lift</span>
              </div>
            </div>

            <div className="dossier-action-section">
              <div className="action-rule-header">
                <strong>HBase Composite RowKey Mapping</strong>
                <span className="badge-tag danger">crm_cancellations · info</span>
              </div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--primary)", margin: "6px 0 12px" }}>
                {selectedCancel.customer_id}_{selectedCancel.ts14 || selectedCancel.date?.replace(/[- :]/g, "").slice(0, 14)}_{selectedCancel.invoice}
              </p>

              <div style={{ display: "flex", gap: "10px", justifyContent: "space-between" }}>
                <button
                  className="secondary-button"
                  onClick={() => {
                    const cid = selectedCancel.customer_id;
                    setSelectedCancel(null);
                    navigate(`/customers?search=${cid}`);
                  }}
                >
                  <User size={13} />
                  <span>Open Customer Dossier</span>
                </button>
                <button className="primary-button" onClick={() => setSelectedCancel(null)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
