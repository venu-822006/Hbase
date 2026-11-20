import { useState, useEffect } from "react";
import { ShoppingBag, ArrowUpRight, Search, Download } from "lucide-react";
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

  const handleExport = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["invoice,customer_id,date,items,amount"].join(",") +
      "\n" +
      filteredOrders
        .map((o) => `${o.invoice},${o.customer_id},${o.date},${o.items},${o.amount}`)
        .join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "invoiced_orders_export.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="module-content-layout">
      {/* Header */}
      <div className="panel-card-header" style={{ marginBottom: "22px" }}>
        <div>
          <span className="eyebrow-badge">TRANSACTION REVENUE STREAM</span>
          <h1 className="hero-heading" style={{ fontSize: "28px", marginTop: "4px" }}>
            Invoiced Orders & GMV Explorer
          </h1>
          <p className="hero-paragraph" style={{ marginBottom: "0" }}>
            34,191 verified retail invoice transactions totaling ₹15.89M in Gross Merchandise Value.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="secondary-button" onClick={handleExport}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="panel-card" style={{ padding: "16px 20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          <div className="global-search-container" style={{ maxWidth: "340px", margin: 0 }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search invoice number or customer ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", width: "100%", fontSize: "12.5px" }}
            />
          </div>

          <div className="view-mode-toggle">
            {["ALL", "MID", "HIGH"].map((t) => (
              <button
                key={t}
                className={`toggle-option ${amountFilter === t ? "selected" : ""}`}
                onClick={() => setAmountFilter(t)}
              >
                {t === "ALL" ? "All Orders (34.2K)" : t === "MID" ? "₹500 - ₹2,000" : "High Value (> ₹2,000)"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="panel-card" style={{ padding: "0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-main)" }}>
              Settled Customer Orders
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "2px 0 0" }}>
              Showing {filteredOrders.length} transactions
            </p>
          </div>
          <span className="panel-header-pill">Settled Orders</span>
        </div>

        <div className="table-responsive-container" style={{ border: "none", borderRadius: "0" }}>
          <table className="enterprise-data-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Customer ID</th>
                <th>Timestamp</th>
                <th>Items Purchased</th>
                <th>Invoice Amount</th>
                <th>Settlement Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.slice(0, 50).map((o) => (
                <tr key={o.invoice}>
                  <td>
                    <span className="code-identifier">{o.invoice}</span>
                  </td>
                  <td>
                    <span className="code-identifier">{o.customer_id}</span>
                  </td>
                  <td>{o.date}</td>
                  <td>{o.items} units</td>
                  <td>
                    <span className="currency-num">{currFmt.format(o.amount)}</span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: "700",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-pill)",
                        backgroundColor: "var(--success-light)",
                        color: "var(--success)",
                      }}
                    >
                      SETTLED
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
