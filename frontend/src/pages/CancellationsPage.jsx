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
  DollarSign,
  User,
  X,
  ExternalLink,
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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCancel, setSelectedCancel] = useState(null);

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

    const timer = setTimeout(fetchCancels, 150);
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
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
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
            Returns & Cancellation Analytics
          </h1>
          <p className="hero-paragraph" style={{ marginBottom: "0" }}>
            7,517 customer return signals and cancellation events analyzed to model early churn risk and negative friction patterns.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="secondary-button" onClick={handleExport}>
            <Download size={14} />
            <span>Export View CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: "20px" }}>
        <div className="kpi-card accent-rose">
          <div className="kpi-header">
            <span className="kpi-title">CANCELLED TRANSACTIONS</span>
            <div className="kpi-icon-box">
              <RotateCcw size={16} color="var(--danger)" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number" style={{ color: "var(--danger)" }}>7,517</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend negative">Returns Ingested</span>
            <span className="kpi-caption">in HBase crm_cancellations</span>
          </div>
        </div>

        <div className="kpi-card accent-violet">
          <div className="kpi-header">
            <span className="kpi-title">RETURNS / ORDER RATIO</span>
            <div className="kpi-icon-box">
              <TrendingDown size={16} color="var(--purple)" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">18.0%</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend neutral">7.5K vs 34.2K</span>
            <span className="kpi-caption">Settled order baseline</span>
          </div>
        </div>

        <div className="kpi-card accent-emerald">
          <div className="kpi-header">
            <span className="kpi-title">CHURN CORRELATION LIFT</span>
            <div className="kpi-icon-box">
              <ShieldAlert size={16} color="var(--warning)" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number" style={{ color: "var(--warning)" }}>+34%</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend positive">Predictive Feature</span>
            <span className="kpi-caption">Spark MLlib feature weight</span>
          </div>
        </div>

        <div className="kpi-card accent-primary">
          <div className="kpi-header">
            <span className="kpi-title">AUTOMATED INTERVENTION</span>
            <div className="kpi-icon-box">
              <AlertOctagon size={16} color="var(--primary)" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">Playbook M002</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend positive">Win-Back Active</span>
            <span className="kpi-caption">Targeted discount rules</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
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
            style={{ background: "transparent", border: "none", outline: "none", width: "100%", fontSize: "12.5px" }}
          />
        </div>
      </div>

      {/* Cancellations Table */}
      <div className="panel-card" style={{ padding: "0", overflow: "hidden" }}>
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
              Recorded Cancellation & Return Events
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Showing {cancels.length > 0 ? page * pageSize + 1 : 0} -{" "}
              {Math.min((page + 1) * pageSize, totalElements)} of {totalElements.toLocaleString()} records
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              className="secondary-button"
              style={{ padding: "5px 9px", fontSize: "11.5px" }}
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
            >
              <ChevronLeft size={13} />
              <span>Prev</span>
            </button>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600", padding: "0 4px" }}>
              Page {page + 1} / {totalPages}
            </span>
            <button
              className="secondary-button"
              style={{ padding: "5px 9px", fontSize: "11.5px" }}
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
            <div className="meta-dot online" style={{ display: "inline-block", marginRight: "8px" }} />
            Retrieving cancellation records from HBase repository...
          </div>
        ) : cancels.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            No cancellation signals matched the search query.
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "130px" }}>Invoice No</th>
                  <th style={{ width: "140px" }}>Customer ID</th>
                  <th>Cancellation Date</th>
                  <th style={{ width: "150px", textAlign: "right" }}>Refund Amount</th>
                  <th>Friction Description</th>
                  <th style={{ width: "110px", textAlign: "center" }}>Signal Status</th>
                  <th style={{ width: "80px", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {cancels.map((c) => (
                  <tr
                    key={c.invoice}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedCancel(c)}
                  >
                    <td>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "12px",
                          fontWeight: "700",
                          color: "var(--danger)",
                          background: "var(--bg-elevated)",
                          padding: "3px 7px",
                          borderRadius: "4px",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        #{c.invoice}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "var(--text-main)",
                        }}
                      >
                        {c.customer_id}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>
                      {c.date}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontWeight: "700",
                        color: "var(--danger)",
                      }}
                    >
                      -{currFmt.format(c.amount)}
                    </td>
                    <td style={{ color: "var(--text-main)", fontSize: "12.5px" }}>
                      {c.reason || "Customer return / cancellation"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: "700",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          backgroundColor: "rgba(244, 63, 94, 0.12)",
                          color: "var(--danger)",
                          border: "1px solid rgba(244, 63, 94, 0.25)",
                        }}
                      >
                        LOGGED
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="secondary-button"
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCancel(c);
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Pagination */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Page {page + 1} of {totalPages} ({totalElements.toLocaleString()} records)
          </span>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="secondary-button"
              disabled={page === 0 || loading}
              onClick={() => setPage(0)}
              style={{ padding: "4px 8px", fontSize: "11px" }}
            >
              First
            </button>
            <button
              className="secondary-button"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              style={{ padding: "4px 8px", fontSize: "11px" }}
            >
              Prev
            </button>
            <button
              className="secondary-button"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage((p) => p + 1)}
              style={{ padding: "4px 8px", fontSize: "11px" }}
            >
              Next
            </button>
            <button
              className="secondary-button"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage(totalPages - 1)}
              style={{ padding: "4px 8px", fontSize: "11px" }}
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* Cancellation Detail Modal */}
      {selectedCancel && (
        <div className="modal-backdrop" onClick={() => setSelectedCancel(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: "520px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="brand-icon-box" style={{ background: "rgba(244, 63, 94, 0.15)" }}>
                  <RotateCcw size={18} color="var(--danger)" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text-main)" }}>
                    Cancellation #{selectedCancel.invoice}
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Negative Return Friction Signal
                  </span>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedCancel(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div className="dossier-stat-item">
                  <span className="stat-label">Refund / Cancel Value</span>
                  <span className="stat-value" style={{ color: "var(--danger)" }}>
                    -{currFmt.format(selectedCancel.amount)}
                  </span>
                </div>
                <div className="dossier-stat-item">
                  <span className="stat-label">Customer Account</span>
                  <span className="stat-value" style={{ color: "var(--primary)" }}>
                    {selectedCancel.customer_id}
                  </span>
                </div>
                <div className="dossier-stat-item">
                  <span className="stat-label">Signal Date</span>
                  <span className="stat-value" style={{ fontSize: "13px" }}>
                    {selectedCancel.date}
                  </span>
                </div>
                <div className="dossier-stat-item">
                  <span className="stat-label">Churn Weight Impact</span>
                  <span className="stat-value" style={{ color: "var(--warning)" }}>
                    +34% Churn Lift
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: "12px 16px",
                  background: "var(--bg-elevated)",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  marginBottom: "16px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  HBase Physical Row Key
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--primary)", marginTop: "4px" }}>
                  {selectedCancel.customer_id}_{selectedCancel.date?.replace(/[- :]/g, "")?.slice(0, 14)}_{selectedCancel.invoice}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Table: <code>crm_cancellations</code> · Column Family: <code>info</code>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: "space-between" }}>
              <button
                className="secondary-button"
                onClick={() => {
                  const cid = selectedCancel.customer_id;
                  setSelectedCancel(null);
                  navigate(`/customers?search=${cid}`);
                }}
              >
                <User size={13} />
                <span>View Customer Dossier</span>
              </button>
              <button
                className="primary-button"
                onClick={() => setSelectedCancel(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
