import { useState, useEffect } from "react";
import { RotateCcw, AlertOctagon, TrendingDown, Search, Download } from "lucide-react";
import api from "../services/api";

const currFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export default function CancellationsPage() {
  const [cancels, setCancels] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const res = await api.getCancellations();
      setCancels(res.content || []);
    };
    fetch();
  }, []);

  const filtered = cancels.filter((c) => {
    return !search || c.invoice.toLowerCase().includes(search.toLowerCase()) || c.customer_id.toLowerCase().includes(search.toLowerCase());
  });

  const handleExport = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["invoice,customer_id,date,amount,reason"].join(",") +
      "\n" +
      filtered.map((c) => `${c.invoice},${c.customer_id},${c.date},${c.amount},"${c.reason}"`).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "returns_and_cancellations.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="module-content-layout">
      {/* Header */}
      <div className="panel-card-header" style={{ marginBottom: "22px" }}>
        <div>
          <span className="eyebrow-badge">CHURN & FRICTION SIGNALS</span>
          <h1 className="hero-heading" style={{ fontSize: "28px", marginTop: "4px" }}>
            Returns & Cancellation Analytics
          </h1>
          <p className="hero-paragraph" style={{ marginBottom: "0" }}>
            7,517 customer return signals and cancellation events analyzed to model early churn risk indicators.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="secondary-button" onClick={handleExport}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-summary-grid" style={{ marginBottom: "20px" }}>
        <div className="metric-box">
          <span className="metric-box-title">CANCELLED TRANSACTIONS</span>
          <div className="metric-box-value" style={{ color: "var(--danger)" }}>7,517</div>
          <span className="footer-desc">Return transactions & order cancellations</span>
        </div>
        <div className="metric-box">
          <span className="metric-box-title">RETURNS / ORDER RATIO</span>
          <div className="metric-box-value">18.0%</div>
          <span className="footer-desc">7,517 returns vs 34,191 completed invoices</span>
        </div>
        <div className="metric-box">
          <span className="metric-box-title">CHURN CORRELATION</span>
          <div className="metric-box-value" style={{ color: "var(--warning)" }}>High</div>
          <span className="footer-desc">Frequency of returns elevates churn risk by +34%</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="panel-card" style={{ padding: "16px 20px", marginBottom: "20px" }}>
        <div className="global-search-container" style={{ maxWidth: "380px", margin: 0 }}>
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search cancellation invoice (C513775) or customer ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: "transparent", border: "none", outline: "none", width: "100%", fontSize: "12.5px" }}
          />
        </div>
      </div>

      {/* Cancellations Table */}
      <div className="panel-card" style={{ padding: "0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-main)" }}>
              Recorded Cancellation & Return Events
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "2px 0 0" }}>
              Showing {filtered.length} recorded friction signals
            </p>
          </div>
          <span className="panel-header-pill">7,517 Total Events</span>
        </div>

        <div className="table-responsive-container" style={{ border: "none", borderRadius: "0" }}>
          <table className="enterprise-data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer ID</th>
                <th>Timestamp</th>
                <th>Refund Amount</th>
                <th>Classification</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((c) => (
                <tr key={c.invoice}>
                  <td>
                    <span className="code-identifier" style={{ color: "var(--danger)" }}>{c.invoice}</span>
                  </td>
                  <td>
                    <span className="code-identifier">{c.customer_id}</span>
                  </td>
                  <td>{c.date}</td>
                  <td>
                    <span className="currency-num" style={{ color: "var(--danger)" }}>{currFmt.format(c.amount)}</span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-pill)",
                        backgroundColor: "var(--danger-light)",
                        color: "var(--danger)",
                      }}
                    >
                      {c.reason}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
