import { useState, useEffect } from "react";
import { RotateCcw, AlertOctagon, TrendingDown, Search } from "lucide-react";
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

  return (
    <div className="module-content-layout">
      {/* Header */}
      <div className="module-header-container">
        <div>
          <span className="eyebrow-badge">HBASE TABLE: CRM_INTERACTION</span>
          <h1 className="module-page-title">Cancellations & Returns Analytics</h1>
          <p className="module-page-subtitle">
            7,517 cancelled transactions isolated by Spark ETL and engineered into customer churn risk features.
          </p>
        </div>

        <div className="stat-summary-pills">
          <span className="summary-pill pill-danger">7,517 Cancellations</span>
          <span className="summary-pill">Return Ratio: 18.0%</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-summary-grid" style={{ marginBottom: "20px" }}>
        <div className="metric-box box-amber">
          <span className="metric-box-title">CANCELLED TRANSACTIONS</span>
          <div className="metric-box-value">7,517</div>
          <span className="footer-desc">Identified by "C" prefix or negative quantities</span>
        </div>
        <div className="metric-box box-purple">
          <span className="metric-box-title">RETURNS / ORDER RATIO</span>
          <div className="metric-box-value">18.0%</div>
          <span className="footer-desc">7,517 cancellations vs 34,191 completed invoices</span>
        </div>
        <div className="metric-box box-blue">
          <span className="metric-box-title">CHURN FEATURE RELEVANCE</span>
          <div className="metric-box-value">High</div>
          <span className="footer-desc">Frequency of returns increases churn probability</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar-card">
        <div className="search-input-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by Cancellation Invoice (C513775) or Customer ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Cancellations Table */}
      <div className="panel-card">
        <div className="table-responsive-container">
          <table className="enterprise-data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer ID</th>
                <th>Timestamp</th>
                <th>Refund Amount</th>
                <th>Interaction Classification</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.invoice}>
                  <td>
                    <span className="code-identifier" style={{ color: "#dc2626" }}>{c.invoice}</span>
                  </td>
                  <td>
                    <span className="code-identifier">{c.customer_id}</span>
                  </td>
                  <td>{c.date}</td>
                  <td>
                    <span className="currency-num" style={{ color: "#dc2626" }}>{currFmt.format(c.amount)}</span>
                  </td>
                  <td>
                    <span className="status-pill status-cancelled">{c.reason}</span>
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
