import { useState, useEffect } from "react";
import { ShoppingBag, ArrowUpRight, Search, FileText, Download } from "lucide-react";
import api from "../services/api";

const currFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [amountFilter, setAmountFilter] = useState("ALL"); // "ALL" | "HIGH" | "MID"

  useEffect(() => {
    const fetch = async () => {
      const res = await api.getOrders({ search });
      setOrders(res.content || []);
    };
    fetch();
  }, [search]);

  const filteredOrders = orders.filter((o) => {
    if (amountFilter === "HIGH") return o.amount >= 2000;
    if (amountFilter === "MID") return o.amount >= 500 && o.amount < 2000;
    return true;
  });

  return (
    <div className="module-content-layout">
      {/* Header */}
      <div className="module-header-container">
        <div>
          <span className="eyebrow-badge">HBASE TABLE: CRM_ORDERS</span>
          <h1 className="module-page-title">Invoiced Orders & GMV</h1>
          <p className="module-page-subtitle">
            34,191 clean invoices with compound rowkey <code>C[cid]_[ts14]_[invoice]</code> and family <code>info</code>.
          </p>
        </div>

        <div className="stat-summary-pills">
          <span className="summary-pill">34,191 Invoices</span>
          <span className="summary-pill">₹15.89M Total GMV</span>
          <span className="summary-pill">AOV: ₹464.77</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar-card">
        <div className="search-input-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by Invoice No (513774) or Customer ID (C012346)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <span className="filter-group-label">Amount Tier:</span>
          {["ALL", "MID", "HIGH"].map((t) => (
            <button
              key={t}
              className={`pill-toggle-btn ${amountFilter === t ? "active" : ""}`}
              onClick={() => setAmountFilter(t)}
            >
              {t === "ALL" ? "All Orders" : t === "MID" ? "₹500 - ₹2,000" : "> ₹2,000 (Wholesale)"}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="panel-card">
        <div className="table-responsive-container">
          <table className="enterprise-data-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Customer ID</th>
                <th>Timestamp (ts14)</th>
                <th>Items Purchased</th>
                <th>Invoice Amount</th>
                <th>Fulfillment Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o.invoice}>
                  <td>
                    <span className="code-identifier">{o.invoice}</span>
                  </td>
                  <td>
                    <span className="code-identifier" style={{ color: "var(--primary)" }}>{o.customer_id}</span>
                  </td>
                  <td>{o.date}</td>
                  <td>{o.items} units</td>
                  <td>
                    <span className="currency-num">{currFmt.format(o.amount)}</span>
                  </td>
                  <td>
                    <span className="status-pill status-active">SETTLED</span>
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
