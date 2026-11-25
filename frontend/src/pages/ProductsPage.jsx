import { useState, useEffect } from "react";
import {
  Package,
  Search,
  Download,
  Filter,
  TrendingUp,
  RotateCcw,
  Tag,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  ExternalLink,
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
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Load summary once
  useEffect(() => {
    const fetchSummary = async () => {
      const res = await api.getProductSummary();
      if (res) {
        setSummary(res);
        if (res.categories) setCategories(res.categories);
      }
    };
    fetchSummary();
  }, []);

  // Fetch paginated products on filter changes
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

    const timer = setTimeout(fetchProducts, 150);
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
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `products_catalog_page_${page + 1}.csv`);
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
          <span className="eyebrow-badge">APEX COMMERCE · BIG DATA MERCHANDISE REPOSITORY</span>
          <h1 className="hero-heading" style={{ fontSize: "28px", marginTop: "4px" }}>
            Product Catalog & SKU Intelligence
          </h1>
          <p className="hero-paragraph" style={{ marginBottom: "0" }}>
            4,723 distinct retail SKUs extracted from 988K raw transaction lines with live revenue, order volume, and cancellation telemetry.
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
            <span className="kpi-title">CATALOG MERCHANDISE SKUS</span>
            <div className="kpi-icon-box">
              <Package size={16} color="var(--primary)" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">
              {summary ? summary.totalSkus?.toLocaleString() : "4,723"}
            </span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend positive">100% SKU Coverage</span>
            <span className="kpi-caption">across 7 categories</span>
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
            <span className="kpi-number">
              {summary ? currFmt.format(summary.totalRevenue) : "₹19.43M"}
            </span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend positive">963K sales events</span>
            <span className="kpi-caption">settled in HBase</span>
          </div>
        </div>

        <div className="kpi-card accent-violet">
          <div className="kpi-header">
            <span className="kpi-title">TOTAL UNITS INVOICED</span>
            <div className="kpi-icon-box">
              <TrendingUp size={16} color="var(--purple)" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">
              {summary ? numFmt.format(summary.totalUnitsSold) : "10.7M"}
            </span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend neutral">
              {summary ? numFmt.format(summary.totalUnitsCancelled) : "895K"} returns
            </span>
            <span className="kpi-caption">friction tracked</span>
          </div>
        </div>

        <div className="kpi-card accent-rose">
          <div className="kpi-header">
            <span className="kpi-title">AVERAGE UNIT PRICE</span>
            <div className="kpi-icon-box">
              <Tag size={16} color="var(--danger)" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">
              {summary ? `₹${summary.avgPrice}` : "₹8.65"}
            </span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend neutral">Top Driver</span>
            <span className="kpi-caption">{summary?.topCategory || "General Merch"}</span>
          </div>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="panel-card" style={{ padding: "14px 20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", alignItems: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginRight: "6px" }}>
            Category:
          </span>
          <button
            className={`toggle-option ${selectedCategory === "all" ? "selected" : ""}`}
            onClick={() => { setSelectedCategory("all"); setPage(0); }}
          >
            All Products ({summary?.totalSkus?.toLocaleString() || "4,723"})
          </button>
          {categories.map((c) => (
            <button
              key={c.category}
              className={`toggle-option ${selectedCategory === c.category ? "selected" : ""}`}
              onClick={() => { setSelectedCategory(c.category); setPage(0); }}
            >
              {c.category} ({c.productCount})
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="panel-card" style={{ padding: "16px 20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          <div className="global-search-container" style={{ maxWidth: "380px", margin: 0 }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search by StockCode (e.g. 22423) or description..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              style={{ background: "transparent", border: "none", outline: "none", width: "100%", fontSize: "12.5px" }}
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
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                color: "var(--text-main)",
                fontSize: "12px",
                padding: "6px 10px",
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
              style={{ padding: "6px 10px", fontSize: "12px" }}
              onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
              title="Toggle Sort Direction"
            >
              {sortDir.toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
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
              Merchandise Catalog Records
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Showing {products.length > 0 ? page * pageSize + 1 : 0} -{" "}
              {Math.min((page + 1) * pageSize, totalElements)} of {totalElements.toLocaleString()} SKUs
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
            Loading catalog records from data repository...
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            No products matched the search criteria.
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "110px" }}>StockCode</th>
                  <th>Product Description</th>
                  <th style={{ width: "160px" }}>Category</th>
                  <th style={{ width: "100px", textAlign: "right" }}>Avg Price</th>
                  <th style={{ width: "110px", textAlign: "right" }}>Units Sold</th>
                  <th style={{ width: "130px", textAlign: "right" }}>Total Revenue</th>
                  <th style={{ width: "90px", textAlign: "right" }}>Orders</th>
                  <th style={{ width: "130px", textAlign: "right" }}>Return Risk</th>
                  <th style={{ width: "70px", textAlign: "center" }}>Action</th>
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
                          {p.stockCode}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: "600", color: "var(--text-main)" }}>
                          {p.description}
                        </div>
                      </td>
                      <td>
                        <span className="badge-tag info">
                          {p.category}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                        ₹{p.avgPrice?.toFixed(2)}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: "600" }}>
                        {p.unitsSold?.toLocaleString()}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--font-mono)",
                          fontWeight: "700",
                          color: "var(--success)",
                        }}
                      >
                        {currFmt.format(p.totalRevenue)}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                        {p.orderCount?.toLocaleString()}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontFamily: "var(--font-mono)",
                              fontWeight: "700",
                              color: getRiskColor(p.cancellationRate),
                            }}
                          >
                            {retPct}%
                          </span>
                          <div
                            style={{
                              width: "36px",
                              height: "5px",
                              borderRadius: "3px",
                              background: "var(--bg-elevated)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(retPct * 3, 100)}%`,
                                height: "100%",
                                background: getRiskColor(p.cancellationRate),
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="secondary-button"
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(p);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
            Page {page + 1} of {totalPages} ({totalElements.toLocaleString()} total SKUs)
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

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: "560px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="brand-icon-box" style={{ background: "rgba(37, 99, 235, 0.15)" }}>
                  <Package size={18} color="var(--primary)" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text-main)" }}>
                    SKU {selectedProduct.stockCode}
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {selectedProduct.category}
                  </span>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedProduct(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: "20px" }}>
              <div
                style={{
                  padding: "14px 16px",
                  background: "var(--bg-elevated)",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  marginBottom: "16px",
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Product Title
                </span>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-main)", marginTop: "4px" }}>
                  {selectedProduct.description}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div className="dossier-stat-item">
                  <span className="stat-label">Gross Merchandise Value</span>
                  <span className="stat-value" style={{ color: "var(--success)" }}>
                    {currFmt.format(selectedProduct.totalRevenue)}
                  </span>
                </div>
                <div className="dossier-stat-item">
                  <span className="stat-label">Average Unit Price</span>
                  <span className="stat-value">
                    ₹{selectedProduct.avgPrice?.toFixed(2)}
                  </span>
                </div>
                <div className="dossier-stat-item">
                  <span className="stat-label">Total Units Sold</span>
                  <span className="stat-value">
                    {selectedProduct.unitsSold?.toLocaleString()}
                  </span>
                </div>
                <div className="dossier-stat-item">
                  <span className="stat-label">Units Returned / Cancelled</span>
                  <span className="stat-value" style={{ color: "var(--danger)" }}>
                    {selectedProduct.unitsCancelled?.toLocaleString()}
                  </span>
                </div>
                <div className="dossier-stat-item">
                  <span className="stat-label">Total Distinct Orders</span>
                  <span className="stat-value">
                    {selectedProduct.orderCount?.toLocaleString()}
                  </span>
                </div>
                <div className="dossier-stat-item">
                  <span className="stat-label">Purchasing Accounts</span>
                  <span className="stat-value">
                    {selectedProduct.customerCount?.toLocaleString()} Customers
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(37, 99, 235, 0.08)",
                  borderRadius: "8px",
                  border: "1px solid rgba(37, 99, 235, 0.2)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-main)" }}>
                    Cancellation / Return Rate
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {selectedProduct.cancelCount} returns across {selectedProduct.orderCount} settled invoices
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "16px",
                    fontFamily: "var(--font-mono)",
                    fontWeight: "800",
                    color: getRiskColor(selectedProduct.cancellationRate),
                  }}
                >
                  {Math.round((selectedProduct.cancellationRate || 0) * 1000) / 10}%
                </span>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: "flex-end" }}>
              <button
                className="secondary-button"
                onClick={() => setSelectedProduct(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
