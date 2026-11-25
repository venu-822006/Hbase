import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  ArrowUpRight,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Package,
  Layers,
  CheckCircle2,
  ExternalLink,
  X,
  Calendar,
  User,
} from "lucide-react";
import api from "../services/api";

const currFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [amountFilter, setAmountFilter] = useState("ALL"); // "ALL" | "MID" | "HIGH"
  const [page, setPage] = useState(0);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

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

    const timer = setTimeout(fetchOrders, 150);
    return () => clearTimeout(timer);
  }, [page, pageSize, search, amountFilter]);

  const handleExport = () => {
    const headers = ["invoice", "customer_id", "date", "items", "amount", "status"];
    const rows = orders.map((o) =>
      [
        `"${o.invoice}"`,
        `"${o.customer_id}"`,
        `"${o.date}"`,
        o.items,
        o.amount,
        `"SETTLED"`,
      ].join(",")
    );
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
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
            Invoiced Orders & GMV Settlement
          </h1>
          <p className="hero-paragraph" style={{ marginBottom: "0" }}>
            34,191 verified retail invoices totaling ₹15.89M in Gross Merchandise Value settled across 5,721 global customer accounts.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="secondary-button" onClick={handleExport}>
            <Download size={14} />
            <span>Export View CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="kpi-grid" style={{ marginBottom: "20px" }}>
        <div className="kpi-card accent-primary">
          <div className="kpi-header">
            <span className="kpi-title">TOTAL SETTLED INVOICES</span>
            <div className="kpi-icon-box">
              <ShoppingBag size={16} color="var(--primary)" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">34,191</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend positive">100% Ingested</span>
            <span className="kpi-caption">in HBase crm_orders</span>
          </div>
        </div>

        <div className="kpi-card accent-emerald">
          <div className="kpi-header">
            <span className="kpi-title">TOTAL GROSS MERCHANDISE VALUE</span>
            <div className="kpi-icon-box">
              <DollarSign size={16} color="var(--success)" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">₹15.89M</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend positive">Verified GMV</span>
            <span className="kpi-caption">Multi-year retail ledger</span>
          </div>
        </div>

        <div className="kpi-card accent-violet">
          <div className="kpi-header">
            <span className="kpi-title">AVERAGE ORDER VALUE (AOV)</span>
            <div className="kpi-icon-box">
              <TrendingUp size={16} color="var(--purple)" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">₹464.77</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend neutral">Per Invoice</span>
            <span className="kpi-caption">Avg basket contribution</span>
          </div>
        </div>

        <div className="kpi-card accent-rose">
          <div className="kpi-header">
            <span className="kpi-title">HIGH-VALUE TRANSACTIONS</span>
            <div className="kpi-icon-box">
              <Layers size={16} color="var(--danger)" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">1,280</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend positive">&gt; ₹2,000 GMV</span>
            <span className="kpi-caption">Enterprise wholesale buyers</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
              style={{ background: "transparent", border: "none", outline: "none", width: "100%", fontSize: "12.5px" }}
            />
          </div>

          <div className="view-mode-toggle">
            {[
              { id: "ALL", label: "All Orders (34.2K)" },
              { id: "MID", label: "Mid-Tier (₹500 - ₹2,000)" },
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
              Settled Customer Orders
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Showing {orders.length > 0 ? page * pageSize + 1 : 0} -{" "}
              {Math.min((page + 1) * pageSize, totalElements)} of {totalElements.toLocaleString()} invoices
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
            Retrieving settled invoices from HBase repository...
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            No invoice records matched the filter criteria.
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "130px" }}>Invoice No</th>
                  <th style={{ width: "140px" }}>Customer ID</th>
                  <th>Settlement Date</th>
                  <th style={{ width: "140px", textAlign: "right" }}>Items Count</th>
                  <th style={{ width: "160px", textAlign: "right" }}>Invoice Amount</th>
                  <th style={{ width: "120px", textAlign: "center" }}>HBase State</th>
                  <th style={{ width: "80px", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.invoice}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedOrder(o)}
                  >
                    <td>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "12px",
                          fontWeight: "700",
                          color: "var(--primary)",
                          background: "var(--bg-elevated)",
                          padding: "3px 7px",
                          borderRadius: "4px",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        #{o.invoice}
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
                        {o.customer_id}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>
                      {o.date}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: "600" }}>
                      {o.items} units
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontWeight: "700",
                        color: "var(--success)",
                      }}
                    >
                      {currFmt.format(o.amount)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: "700",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          backgroundColor: "rgba(16, 185, 129, 0.12)",
                          color: "var(--success)",
                          border: "1px solid rgba(16, 185, 129, 0.25)",
                        }}
                      >
                        SETTLED
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="secondary-button"
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(o);
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
            Page {page + 1} of {totalPages} ({totalElements.toLocaleString()} invoices)
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

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: "520px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="brand-icon-box" style={{ background: "rgba(37, 99, 235, 0.15)" }}>
                  <ShoppingBag size={18} color="var(--primary)" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text-main)" }}>
                    Invoice #{selectedOrder.invoice}
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Settled Transaction Record
                  </span>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedOrder(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div className="dossier-stat-item">
                  <span className="stat-label">Invoiced Amount</span>
                  <span className="stat-value" style={{ color: "var(--success)" }}>
                    {currFmt.format(selectedOrder.amount)}
                  </span>
                </div>
                <div className="dossier-stat-item">
                  <span className="stat-label">Purchased Units</span>
                  <span className="stat-value">
                    {selectedOrder.items} units
                  </span>
                </div>
                <div className="dossier-stat-item">
                  <span className="stat-label">Customer Account</span>
                  <span className="stat-value" style={{ color: "var(--primary)" }}>
                    {selectedOrder.customer_id}
                  </span>
                </div>
                <div className="dossier-stat-item">
                  <span className="stat-label">Settlement Date</span>
                  <span className="stat-value" style={{ fontSize: "13px" }}>
                    {selectedOrder.date}
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
                  {selectedOrder.customer_id}_{selectedOrder.date?.replace(/[- :]/g, "")?.slice(0, 14)}_{selectedOrder.invoice}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Table: <code>crm_orders</code> · Column Family: <code>info</code>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: "space-between" }}>
              <button
                className="secondary-button"
                onClick={() => {
                  const cid = selectedOrder.customer_id;
                  setSelectedOrder(null);
                  navigate(`/customers?search=${cid}`);
                }}
              >
                <User size={13} />
                <span>View Customer Dossier</span>
              </button>
              <button
                className="primary-button"
                onClick={() => setSelectedOrder(null)}
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
