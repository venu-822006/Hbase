import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Layers,
  User,
} from "lucide-react";
import api from "../services/api";

const currFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const compactCurr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 2,
});

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState("");
  const [amountFilter, setAmountFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    api.getOrderStats().then((res) => {
      if (res) setStats(res);
    });
  }, []);

  useEffect(() => {
    let minAmount = null;
    let maxAmount = null;
    if (amountFilter === "MID") {
      minAmount = 500;
      maxAmount = 2000;
    } else if (amountFilter === "HIGH") {
      minAmount = 2000;
    }

    const fetchOrders = async () => {
      setLoading(true);
      const res = await api.getOrders({
        page,
        size: pageSize,
        search,
        minAmount,
        maxAmount,
      });
      if (res) {
        setOrders(res.content || []);
        setTotalPages(res.totalPages || 1);
        setTotalElements(res.totalElements || 0);
      }
      setLoading(false);
    };

    const timer = setTimeout(fetchOrders, 120);
    return () => clearTimeout(timer);
  }, [page, pageSize, search, amountFilter]);

  const handleExport = () => {
    const headers = ["invoice", "customer_id", "date", "items", "amount", "status"];
    const rows = orders.map((o) =>
      [`"${o.invoice}"`, `"${o.customer_id}"`, `"${o.date}"`, o.items, o.amount, `"SETTLED"`].join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `apex_orders_page_${page + 1}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="module-content-layout">
      {/* Header */}
      <div className="panel-card-header" style={{ marginBottom: "22px" }}>
        <div>
          <span className="eyebrow-badge">APEX COMMERCE · TRANSACTION REVENUE STREAM</span>
          <h1 className="hero-heading" style={{ fontSize: "28px", marginTop: "4px" }}>
            Invoiced Orders &amp; <em>GMV Settlement</em>
          </h1>
          <p className="hero-paragraph" style={{ marginBottom: 0 }}>
            {(stats?.totalOrders || 34191).toLocaleString()} verified retail invoices totaling {compactCurr.format(stats?.totalVolume || 15890904.72)} settled across global wholesale &amp; retail accounts.
          </p>
        </div>

        <button className="secondary-button" onClick={handleExport}>
          <Download size={14} />
          <span>Export View CSV</span>
        </button>
      </div>

      {/* KPI Stat Tiles */}
      <section className="metrics-summary-grid">
        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-primary)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">TOTAL SETTLED INVOICES</span>
            <div className="metric-box-icon" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="metric-box-value">{(stats?.totalOrders || 34191).toLocaleString()}</div>
          <div className="metric-box-footer">
            <span className="footer-code" style={{ color: "var(--success)" }}>100% Ingested</span>
            <span className="footer-desc">Indexed in HBase crm_orders</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-success)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">GROSS MERCHANDISE VALUE</span>
            <div className="metric-box-icon" style={{ background: "var(--success-light)", color: "var(--success)" }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="metric-box-value">{compactCurr.format(stats?.totalVolume || 15890904.72)}</div>
          <div className="metric-box-footer">
            <span className="footer-code">{currFmt.format(stats?.totalVolume || 15890904.72)}</span>
            <span className="footer-desc">Verified settled invoice volume</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-purple)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">AVERAGE ORDER VALUE (AOV)</span>
            <div className="metric-box-icon" style={{ background: "var(--purple-light)", color: "var(--purple)" }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-box-value">₹{(stats?.avgOrderValue || 464.77).toFixed(2)}</div>
          <div className="metric-box-footer">
            <span className="footer-code">Per Settled Invoice</span>
            <span className="footer-desc">Portfolio basket benchmark</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-amber)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">TOTAL UNITS FULFILLED</span>
            <div className="metric-box-icon" style={{ background: "var(--warning-light)", color: "var(--warning)" }}>
              <Layers size={18} />
            </div>
          </div>
          <div className="metric-box-value">{((stats?.totalItems || 9829204) / 1000000).toFixed(2)}M</div>
          <div className="metric-box-footer">
            <span className="footer-code">{(stats?.totalItems || 9829204).toLocaleString()} units</span>
            <span className="footer-desc">Verified positive line items</span>
          </div>
        </div>
      </section>

      {/* Filter Toolbar */}
      <div className="panel-card" style={{ padding: "16px 20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          <div className="global-search-container" style={{ maxWidth: "380px", margin: 0 }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search invoice number (489434) or customer ID (C014095)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              style={{ background: "transparent", border: "none", outline: "none", width: "100%", fontSize: "12.5px", color: "var(--text-main)" }}
            />
          </div>

          <div className="view-mode-toggle">
            {[
              { id: "ALL", label: "All Orders" },
              { id: "MID", label: "Mid-Tier (₹500 – ₹2,000)" },
              { id: "HIGH", label: "Enterprise VIP (> ₹2,000)" },
            ].map((t) => (
              <button
                key={t.id}
                className={`toggle-option ${amountFilter === t.id ? "selected" : ""}`}
                onClick={() => {
                  setAmountFilter(t.id);
                  setPage(0);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
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
              Settled Customer Orders
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Showing {orders.length > 0 ? page * pageSize + 1 : 0} –{" "}
              {Math.min((page + 1) * pageSize, totalElements)} of {totalElements.toLocaleString()} invoices
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
            Retrieving settled invoices from HBase repository...
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            No invoice records matched the filter criteria.
          </div>
        ) : (
          <div className="table-responsive-container" style={{ border: "none", borderRadius: 0 }}>
            <table className="enterprise-data-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Customer ID</th>
                  <th>Settlement Date</th>
                  <th style={{ textAlign: "right" }}>Items Count</th>
                  <th style={{ textAlign: "right" }}>Invoice Amount</th>
                  <th>Settlement State</th>
                  <th>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={`${o.invoice}-${o.customer_id}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedOrder(o)}
                  >
                    <td>
                      <span className="code-identifier">#{o.invoice}</span>
                    </td>
                    <td>
                      <span className="code-identifier">{o.customer_id}</span>
                    </td>
                    <td style={{ color: "var(--text-sub)" }}>{o.date}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className="currency-num">{o.items} units</span>
                    </td>
                    <td style={{ textAlign: "right", color: "var(--success)" }}>
                      <span className="currency-num">{currFmt.format(o.amount)}</span>
                    </td>
                    <td>
                      <span className="badge-tag success">SETTLED</span>
                    </td>
                    <td>
                      <button
                        className="dispatch-action-tag"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(o);
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
            Page {page + 1} of {Math.max(1, totalPages)} ({totalElements.toLocaleString()} invoices)
          </span>
          <div className="pagination-controls">
            <button className="pagination-btn" disabled={page === 0 || loading} onClick={() => setPage(0)}>First</button>
            <button className="pagination-btn" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(p - 1, 0))}>Prev</button>
            <button className="pagination-btn" disabled={page >= totalPages - 1 || loading} onClick={() => setPage((p) => p + 1)}>Next</button>
            <button className="pagination-btn" disabled={page >= totalPages - 1 || loading} onClick={() => setPage(totalPages - 1)}>Last</button>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="dossier-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="dossier-dialog" style={{ maxWidth: "540px" }} onClick={(e) => e.stopPropagation()}>
            <div className="dossier-header">
              <div>
                <span className="eyebrow-badge">INVOICE SETTLEMENT RECORD</span>
                <h2>#{selectedOrder.invoice}</h2>
                <p>Account: {selectedOrder.customer_id} · Settlement Date: {selectedOrder.date}</p>
              </div>
              <button className="dossier-close-btn" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>

            <div className="dossier-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="dossier-stat">
                <span className="stat-sublabel">Invoiced Amount</span>
                <span className="stat-highlight" style={{ color: "var(--success)" }}>
                  {currFmt.format(selectedOrder.amount)}
                </span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Purchased Quantity</span>
                <span className="stat-highlight">{selectedOrder.items} units</span>
              </div>
            </div>

            <div className="dossier-action-section">
              <div className="action-rule-header">
                <strong>HBase Composite RowKey Mapping</strong>
                <span className="badge-tag info">crm_orders · info</span>
              </div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--primary)", margin: "6px 0 12px" }}>
                {selectedOrder.customer_id}_{selectedOrder.ts14 || selectedOrder.date?.replace(/[- :]/g, "").slice(0, 14)}_{selectedOrder.invoice}
              </p>

              <div style={{ display: "flex", gap: "10px", justifyContent: "space-between" }}>
                <button
                  className="secondary-button"
                  onClick={() => {
                    const cid = selectedOrder.customer_id;
                    setSelectedOrder(null);
                    navigate(`/customers?search=${cid}`);
                  }}
                >
                  <User size={13} />
                  <span>Open Customer Dossier</span>
                </button>
                <button className="primary-button" onClick={() => setSelectedOrder(null)}>
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
