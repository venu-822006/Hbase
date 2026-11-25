import { useState, useEffect } from "react";
import {
  Package,
  Search,
  Download,
  TrendingUp,
  Tag,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "../services/api";

const currFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const numFmt = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("revenue");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    api.getProductSummary().then((res) => {
      if (res) {
        setSummary(res);
        if (res.categories) setCategories(res.categories);
      }
    });
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const res = await api.getProducts({
        page,
        size: pageSize,
        search,
        category: selectedCategory === "all" ? "" : selectedCategory,
        sortBy,
        sortDir,
      });
      if (res) {
        setProducts(res.content || []);
        setTotalPages(res.totalPages || 1);
        setTotalElements(res.totalElements || 0);
      }
      setLoading(false);
    };

    const timer = setTimeout(fetchProducts, 120);
    return () => clearTimeout(timer);
  }, [page, pageSize, search, selectedCategory, sortBy, sortDir]);

  const handleExport = () => {
    const headers = [
      "stock_code",
      "description",
      "category",
      "avg_price",
      "units_sold",
      "units_cancelled",
      "total_revenue",
      "order_count",
      "customer_count",
      "cancellation_rate",
    ];
    const rows = products.map((p) =>
      [
        `"${p.stockCode}"`,
        `"${(p.description || "").replace(/"/g, '""')}"`,
        `"${p.category}"`,
        p.avgPrice,
        p.unitsSold,
        p.unitsCancelled,
        p.totalRevenue,
        p.orderCount,
        p.customerCount,
        p.cancellationRate,
      ].join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `apex_products_page_${page + 1}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const getRiskColor = (rate) => {
    if (rate >= 0.15) return "var(--danger)";
    if (rate >= 0.05) return "var(--warning)";
    return "var(--success)";
  };

  return (
    <div className="module-content-layout">
      {/* Header */}
      <div className="panel-card-header" style={{ marginBottom: "22px" }}>
        <div>
          <span className="eyebrow-badge">APEX COMMERCE · MERCHANDISE REPOSITORY</span>
          <h1 className="hero-heading" style={{ fontSize: "28px", marginTop: "4px" }}>
            Product Catalog &amp; <em>SKU Intelligence</em>
          </h1>
          <p className="hero-paragraph" style={{ marginBottom: 0 }}>
            4,723 distinct retail SKUs extracted from 988,278 raw transaction lines with live revenue, order volume, and return telemetry.
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
            <span className="metric-box-title">CATALOG MERCHANDISE SKUS</span>
            <div className="metric-box-icon" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
              <Package size={18} />
            </div>
          </div>
          <div className="metric-box-value">
            {summary ? summary.totalSkus?.toLocaleString() : "4,723"}
          </div>
          <div className="metric-box-footer">
            <span className="footer-code" style={{ color: "var(--success)" }}>100% SKU Coverage</span>
            <span className="footer-desc">Indexed across 7 merchandise categories</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-success)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">TOTAL CATALOG REVENUE</span>
            <div className="metric-box-icon" style={{ background: "var(--success-light)", color: "var(--success)" }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="metric-box-value">
            {summary ? `₹${numFmt.format(summary.totalRevenue)}` : "₹19.4M"}
          </div>
          <div className="metric-box-footer">
            <span className="footer-code">963K positive sales lines</span>
            <span className="footer-desc">Aggregated from multi-year order logs</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-purple)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">TOTAL UNITS INVOICED</span>
            <div className="metric-box-icon" style={{ background: "var(--purple-light)", color: "var(--purple)" }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-box-value">
            {summary ? numFmt.format(summary.totalUnitsSold) : "10.7M"}
          </div>
          <div className="metric-box-footer">
            <span className="footer-code" style={{ color: "var(--warning)" }}>
              {summary ? numFmt.format(summary.totalUnitsCancelled) : "895K"} returned units
            </span>
            <span className="footer-desc">Return rate computed per SKU</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-amber)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">AVERAGE UNIT PRICE</span>
            <div className="metric-box-icon" style={{ background: "var(--warning-light)", color: "var(--warning)" }}>
              <Tag size={18} />
            </div>
          </div>
          <div className="metric-box-value">
            {summary ? `₹${summary.avgPrice}` : "₹8.65"}
          </div>
          <div className="metric-box-footer">
            <span className="footer-code">Top Category: {summary?.topCategory || "General Merch"}</span>
            <span className="footer-desc">Weighted SKU catalog baseline</span>
          </div>
        </div>
      </section>

      {/* Category Filter Bar */}
      <div className="panel-card" style={{ padding: "14px 20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", alignItems: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginRight: "6px", whiteSpace: "nowrap" }}>
            Category:
          </span>
          <div className="view-mode-toggle" style={{ overflowX: "auto" }}>
            <button
              className={`toggle-option ${selectedCategory === "all" ? "selected" : ""}`}
              onClick={() => { setSelectedCategory("all"); setPage(0); }}
            >
              All ({summary?.totalSkus?.toLocaleString() || "4,723"})
            </button>
            {categories.map((c) => (
              <button
                key={c.category}
                className={`toggle-option ${selectedCategory === c.category ? "selected" : ""}`}
                onClick={() => { setSelectedCategory(c.category); setPage(0); }}
                style={{ whiteSpace: "nowrap" }}
              >
                {c.category} ({c.productCount})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search & Sort Controls */}
      <div className="panel-card" style={{ padding: "16px 20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          <div className="global-search-container" style={{ maxWidth: "380px", margin: 0 }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search by StockCode (e.g. 22423) or description..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              style={{ background: "transparent", border: "none", outline: "none", width: "100%", fontSize: "12.5px", color: "var(--text-main)" }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>
              Sort by:
            </span>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
              style={{
                background: "var(--card-bg-subtle)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-pill)",
                color: "var(--text-main)",
                fontSize: "12px",
                padding: "6px 14px",
                cursor: "pointer",
              }}
            >
              <option value="revenue">Total Revenue (Gross)</option>
              <option value="unitsSold">Units Sold (Volume)</option>
              <option value="orderCount">Order Count (Frequency)</option>
              <option value="avgPrice">Average Price</option>
              <option value="cancellationRate">Return / Cancellation Rate</option>
              <option value="stockCode">StockCode</option>
            </select>

            <button
              className="secondary-button"
              style={{ padding: "6px 12px", fontSize: "11.5px" }}
              onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
            >
              {sortDir.toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
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
              Merchandise Catalog Records
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Showing {products.length > 0 ? page * pageSize + 1 : 0} –{" "}
              {Math.min((page + 1) * pageSize, totalElements)} of {totalElements.toLocaleString()} SKUs
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
            Loading catalog records...
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            No products matched the search criteria.
          </div>
        ) : (
          <div className="table-responsive-container" style={{ border: "none", borderRadius: 0 }}>
            <table className="enterprise-data-table">
              <thead>
                <tr>
                  <th>StockCode</th>
                  <th>Product Description</th>
                  <th>Category</th>
                  <th style={{ textAlign: "right" }}>Avg Price</th>
                  <th style={{ textAlign: "right" }}>Units Sold</th>
                  <th style={{ textAlign: "right" }}>Total Revenue</th>
                  <th style={{ textAlign: "right" }}>Orders</th>
                  <th>Return Risk</th>
                  <th>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const retPct = Math.round((p.cancellationRate || 0) * 1000) / 10;
                  return (
                    <tr
                      key={p.stockCode}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedProduct(p)}
                    >
                      <td>
                        <span className="code-identifier">{p.stockCode}</span>
                      </td>
                      <td style={{ maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis" }}>
                        <strong style={{ color: "var(--text-main)" }}>{p.description}</strong>
                      </td>
                      <td>
                        <span className="badge-tag info">{p.category}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className="currency-num">₹{p.avgPrice?.toFixed(2)}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className="currency-num">{p.unitsSold?.toLocaleString()}</span>
                      </td>
                      <td style={{ textAlign: "right", color: "var(--success)" }}>
                        <span className="currency-num">{currFmt.format(p.totalRevenue)}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className="currency-num">{p.orderCount?.toLocaleString()}</span>
                      </td>
                      <td>
                        <div className="risk-metric-cell">
                          <span className="risk-pct-value" style={{ color: getRiskColor(p.cancellationRate) }}>
                            {retPct}%
                          </span>
                          <div className="risk-meter-container">
                            <div
                              className="risk-meter-bar"
                              style={{
                                width: `${Math.min(retPct * 2.5, 100)}%`,
                                backgroundColor: getRiskColor(p.cancellationRate),
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <button
                          className="dispatch-action-tag"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(p);
                          }}
                        >
                          View SKU
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination-bar">
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Page {page + 1} of {Math.max(1, totalPages)} ({totalElements.toLocaleString()} total SKUs)
          </span>
          <div className="pagination-controls">
            <button className="pagination-btn" disabled={page === 0 || loading} onClick={() => setPage(0)}>
              First
            </button>
            <button className="pagination-btn" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(p - 1, 0))}>
              Prev
            </button>
            <button className="pagination-btn" disabled={page >= totalPages - 1 || loading} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
            <button className="pagination-btn" disabled={page >= totalPages - 1 || loading} onClick={() => setPage(totalPages - 1)}>
              Last
            </button>
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="dossier-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="dossier-dialog" style={{ maxWidth: "580px" }} onClick={(e) => e.stopPropagation()}>
            <div className="dossier-header">
              <div>
                <span className="eyebrow-badge">SKU DIAGNOSTIC DOSSIER</span>
                <h2>{selectedProduct.stockCode}</h2>
                <p>{selectedProduct.description} · {selectedProduct.category}</p>
              </div>
              <button className="dossier-close-btn" onClick={() => setSelectedProduct(null)}>✕</button>
            </div>

            <div className="dossier-grid">
              <div className="dossier-stat">
                <span className="stat-sublabel">Gross Revenue</span>
                <span className="stat-highlight" style={{ color: "var(--success)" }}>
                  {currFmt.format(selectedProduct.totalRevenue)}
                </span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Avg Unit Price</span>
                <span className="stat-highlight">₹{selectedProduct.avgPrice?.toFixed(2)}</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Units Sold</span>
                <span className="stat-highlight">{selectedProduct.unitsSold?.toLocaleString()}</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Units Returned</span>
                <span className="stat-highlight" style={{ color: "var(--danger)" }}>
                  {selectedProduct.unitsCancelled?.toLocaleString()}
                </span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Settled Orders</span>
                <span className="stat-highlight">{selectedProduct.orderCount?.toLocaleString()}</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Unique Buyers</span>
                <span className="stat-highlight">{selectedProduct.customerCount?.toLocaleString()}</span>
              </div>
            </div>

            <div className="dossier-action-section">
              <div className="action-rule-header">
                <strong>Return &amp; Quality Risk Evaluation</strong>
                <span style={{ color: getRiskColor(selectedProduct.cancellationRate), fontWeight: "700" }}>
                  {Math.round((selectedProduct.cancellationRate || 0) * 1000) / 10}% Cancellation Rate
                </span>
              </div>
              <p style={{ fontSize: "12.5px", color: "var(--text-sub)" }}>
                Recorded {selectedProduct.cancelCount} cancelled invoices vs {selectedProduct.orderCount} completed orders across {selectedProduct.customerCount} purchasing accounts.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
                <button className="primary-button" onClick={() => setSelectedProduct(null)}>
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
