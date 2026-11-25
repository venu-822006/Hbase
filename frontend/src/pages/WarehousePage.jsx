import { useState, useEffect } from "react";
import {
  Database,
  Layers,
  Server,
  HardDrive,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Table,
  FileCode,
  ShieldCheck,
  Activity,
  Terminal,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "../services/api";

export default function WarehousePage() {
  const [lineage, setLineage] = useState(null);
  const [selectedTier, setSelectedTier] = useState("ALL"); // ALL | Bronze | Silver | Gold
  const [expandedDataset, setExpandedDataset] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLineage = async () => {
      setLoading(true);
      const res = await api.getWarehouseLineage();
      if (res) {
        setLineage(res);
      }
      setLoading(false);
    };
    fetchLineage();
  }, []);

  const datasets = lineage?.datasets || [
    {
      id: "ds-raw-transactions",
      name: "Raw Retail Transactions",
      tier: "Bronze / Ingestion",
      storage: "Hadoop HDFS (/crm/data/raw/online_retail.csv)",
      recordCount: 988278,
      size: "84.2 MB",
      format: "CSV (Comma Separated, Multi-year Invoices)",
      schema: "Invoice, StockCode, Description, Quantity, InvoiceDate, Price, Customer ID, Country",
      description: "Complete raw transaction log from UCI Machine Learning Repository containing 2 full years of global retail sales.",
    },
    {
      id: "ds-customer-profiles",
      name: "Customer Profiles Dimension",
      tier: "Silver / Dimension",
      storage: "Apache HBase (crm_customer) + HDFS (/crm/data/clean/customers.csv)",
      recordCount: 5721,
      size: "187 KB",
      format: "HBase Column Families: profile (metadata), ml (scoring)",
      schema: "cid [RowKey], profile:country, profile:first_order_date, ml:churn_prob, ml:clv_pred, ml:segment",
      description: "Deduplicated customer dimension indexed by CID with RFM feature vectors and ML predictions.",
    },
    {
      id: "ds-orders-facts",
      name: "Settled Invoiced Orders",
      tier: "Silver / Fact",
      storage: "Apache HBase (crm_orders) + HDFS (/crm/data/clean/orders.csv)",
      recordCount: 34191,
      size: "1.38 MB",
      format: "HBase Column Family: info",
      schema: "cid_timestamp_invoice [RowKey], info:cid, info:ts14, info:invoice, info:amount, info:items",
      description: "Settled order facts with composite row keys ensuring idempotent batch and streaming ingestion.",
    },
    {
      id: "ds-cancellations-friction",
      name: "Returns & Cancellation Friction",
      tier: "Silver / Fact",
      storage: "Apache HBase (crm_cancellations) + HDFS (/crm/data/clean/cancellations.csv)",
      recordCount: 7517,
      size: "267 KB",
      format: "HBase Column Family: info",
      schema: "cid_timestamp_invoice [RowKey], info:cid, info:ts14, info:invoice, info:amount",
      description: "Negative transaction return events and friction telemetry utilized in customer churn modeling.",
    },
    {
      id: "ds-products-catalog",
      name: "Product & Merchandise Catalog",
      tier: "Silver / Dimension",
      storage: "HDFS (/crm/data/clean/products.csv) + In-Memory Fast Cache",
      recordCount: 4723,
      size: "408 KB",
      format: "Structured CSV & Indexed SKU Dictionary",
      schema: "stock_code [PK], description, category, avg_price, units_sold, units_cancelled, total_revenue, order_count, cancellation_rate",
      description: "Complete 4,723 SKU merchandise catalog with volume, gross revenue, and return rate diagnostics.",
    },
    {
      id: "ds-campaign-playbooks",
      name: "Campaign Strategies & Playbooks",
      tier: "Gold / Configuration",
      storage: "Apache HBase (crm_campaign) + config/campaigns.csv",
      recordCount: 4,
      size: "2 KB",
      format: "HBase Column Family: detail",
      schema: "id [RowKey], detail:id, detail:name, detail:channel, detail:rule",
      description: "Targeted marketing interventions: Win-back discount, Loyalty rewards, Welcome offer, and Seasonal sale.",
    },
    {
      id: "ds-interactions-log",
      name: "Live Interactions & Campaign Dispatches",
      tier: "Gold / Closed-Loop Telemetry",
      storage: "Apache HBase (crm_interaction) + feedback_offers.csv",
      recordCount: 3894,
      size: "164 KB",
      format: "HBase Column Family: activity",
      schema: "cid_timestamp_campaign [RowKey], activity:type, activity:campaign, activity:channel, activity:notes, activity:status",
      description: "Closed-loop feedback log capturing live operator dispatches committed synchronously into HBase.",
    },
    {
      id: "ds-mllib-evaluations",
      name: "Spark MLlib Predictive Intelligence",
      tier: "Gold / Analytical ML",
      storage: "data/results.csv, data/metrics.txt, data/ml_model_params.json",
      recordCount: 5721,
      size: "345 KB",
      format: "Scored Features & Parameter Weights",
      schema: "cid, country, segment, churn_prob, clv_pred, recency, frequency, monetary, cancellations",
      description: "Trained Spark MLlib models (Logistic Regression Churn ROC-AUC 0.7784, Linear Regression CLV R² 0.2739).",
    },
  ];

  const filteredDatasets = datasets.filter((d) => {
    if (selectedTier === "ALL") return true;
    return d.tier.toLowerCase().includes(selectedTier.toLowerCase());
  });

  const getTierBadge = (tier) => {
    if (tier.includes("Bronze")) return <span className="badge-tag info">BRONZE</span>;
    if (tier.includes("Silver")) return <span className="badge-tag success">SILVER</span>;
    return <span className="badge-tag warning">GOLD</span>;
  };

  return (
    <div className="module-content-layout">
      {/* Header */}
      <div className="panel-card-header" style={{ marginBottom: "22px" }}>
        <div>
          <span className="eyebrow-badge">APEX LAKEHOUSE · BIG DATA PLATFORM & STORAGE ARCHITECTURE</span>
          <h1 className="hero-heading" style={{ fontSize: "28px", marginTop: "4px" }}>
            Data Warehouse & Storage Lineage
          </h1>
          <p className="hero-paragraph" style={{ marginBottom: "0" }}>
            End-to-end data lifecycle covering 988,278 raw transaction events across Hadoop HDFS, Apache HBase NoSQL wide-column tables, Spark MLlib intelligence, and real-time operator feedback.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "700",
              background: "rgba(16, 185, 129, 0.12)",
              color: "var(--success)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <CheckCircle2 size={13} />
            HBase & HDFS Healthy
          </span>
        </div>
      </div>

      {/* Cluster Storage Engines Grid */}
      <div className="kpi-grid" style={{ marginBottom: "22px" }}>
        <div className="kpi-card accent-primary">
          <div className="kpi-header">
            <span className="kpi-title">HADOOP HDFS STORAGE</span>
            <div className="kpi-icon-box">
              <HardDrive size={16} color="var(--primary)" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">87.2 MB</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend positive">IPC Port 9000</span>
            <span className="kpi-caption">NameNode + DataNode</span>
          </div>
        </div>

        <div className="kpi-card accent-emerald">
          <div className="kpi-header">
            <span className="kpi-title">HBASE NOSQL TABLES</span>
            <div className="kpi-icon-box">
              <Database size={16} color="var(--success)" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">5 Tables</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend positive">Port 16010 Active</span>
            <span className="kpi-caption">47,429+ core records</span>
          </div>
        </div>

        <div className="kpi-card accent-violet">
          <div className="kpi-header">
            <span className="kpi-title">TOTAL DATASET COVERAGE</span>
            <div className="kpi-icon-box">
              <Layers size={16} color="var(--purple)" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">8 Datasets</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend positive">1.04M total items</span>
            <span className="kpi-caption">Bronze · Silver · Gold</span>
          </div>
        </div>

        <div className="kpi-card accent-rose">
          <div className="kpi-header">
            <span className="kpi-title">SPARK MLLIB INFERENCE</span>
            <div className="kpi-icon-box">
              <Cpu size={16} color="var(--danger)" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">&lt; 1 ms</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend positive">ROC-AUC 0.778</span>
            <span className="kpi-caption">Logistic + Linear Reg</span>
          </div>
        </div>
      </div>

      {/* Visual Pipeline Architecture Card */}
      <div className="panel-card" style={{ padding: "20px", marginBottom: "22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-main)", margin: 0 }}>
              End-to-End Enterprise Data Pipeline Flow
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Data movement from raw ingestion down to operational random-access queries and ML intelligence
            </span>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--primary)" }}>
            HDFS → SPARK → HBASE → SPRING BOOT → REACT
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            alignItems: "stretch",
          }}
        >
          {/* Stage 1 */}
          <div
            style={{
              padding: "16px",
              background: "var(--bg-elevated)",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              position: "relative",
            }}
          >
            <div style={{ fontSize: "10px", fontWeight: "800", color: "var(--primary)", letterSpacing: "0.5px" }}>
              STAGE 01 · BRONZE
            </div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-main)", margin: "4px 0" }}>
              Raw Ingestion
            </div>
            <p style={{ fontSize: "11.5px", color: "var(--text-muted)", margin: "0 0 10px 0", lineHeight: "1.4" }}>
              Multi-year raw transaction logs stored distributedly in HDFS at <code>/crm/data/raw/</code>.
            </p>
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
              • 988,278 line items<br />
              • 84.2 MB CSV payload
            </div>
          </div>

          {/* Stage 2 */}
          <div
            style={{
              padding: "16px",
              background: "var(--bg-elevated)",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ fontSize: "10px", fontWeight: "800", color: "var(--success)", letterSpacing: "0.5px" }}>
              STAGE 02 · SILVER
            </div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-main)", margin: "4px 0" }}>
              ETL & Modeling
            </div>
            <p style={{ fontSize: "11.5px", color: "var(--text-muted)", margin: "0 0 10px 0", lineHeight: "1.4" }}>
              Spark pipeline cleans nulls, derives RFM metrics, and creates idempotent composite keys.
            </p>
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
              • 5,721 Customer accounts<br />
              • 4,723 Merchandise SKUs
            </div>
          </div>

          {/* Stage 3 */}
          <div
            style={{
              padding: "16px",
              background: "var(--bg-elevated)",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ fontSize: "10px", fontWeight: "800", color: "var(--purple)", letterSpacing: "0.5px" }}>
              STAGE 03 · SILVER/GOLD
            </div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-main)", margin: "4px 0" }}>
              NoSQL Storage
            </div>
            <p style={{ fontSize: "11.5px", color: "var(--text-muted)", margin: "0 0 10px 0", lineHeight: "1.4" }}>
              Apache HBase distributes wide-column tables across ZooKeeper with sub-2ms random lookups.
            </p>
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
              • <code>crm_customer</code>, <code>crm_orders</code><br />
              • <code>crm_cancellations</code>, <code>crm_campaign</code>
            </div>
          </div>

          {/* Stage 4 */}
          <div
            style={{
              padding: "16px",
              background: "var(--bg-elevated)",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ fontSize: "10px", fontWeight: "800", color: "var(--danger)", letterSpacing: "0.5px" }}>
              STAGE 04 · GOLD
            </div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-main)", margin: "4px 0" }}>
              ML & Closed-Loop
            </div>
            <p style={{ fontSize: "11.5px", color: "var(--text-muted)", margin: "0 0 10px 0", lineHeight: "1.4" }}>
              Predictive churn & CLV models score accounts with real-time feedback logged to <code>crm_interaction</code>.
            </p>
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
              • Holdout ROC-AUC 0.7784<br />
              • Real-Time Dispatch Commit
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Filter Tabs */}
      <div className="panel-card" style={{ padding: "14px 20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginRight: "6px" }}>
            Storage Tier:
          </span>
          {["ALL", "Bronze", "Silver", "Gold"].map((tier) => (
            <button
              key={tier}
              className={`toggle-option ${selectedTier === tier ? "selected" : ""}`}
              onClick={() => setSelectedTier(tier)}
            >
              {tier === "ALL" ? `All Datasets (${datasets.length})` : `${tier} Tier`}
            </button>
          ))}
        </div>
      </div>

      {/* Datasets Table & Inspector */}
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
              Warehouse Datasets & Dimensions Inventory
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Comprehensive schema, physical storage mapping, and record counts for all 8 datasets
            </span>
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "90px" }}>Tier</th>
                <th>Dataset Name</th>
                <th style={{ width: "260px" }}>Storage Engine & Path</th>
                <th style={{ width: "120px", textAlign: "right" }}>Records</th>
                <th style={{ width: "90px", textAlign: "right" }}>Disk Size</th>
                <th style={{ width: "100px", textAlign: "center" }}>Schema</th>
              </tr>
            </thead>
            <tbody>
              {filteredDatasets.map((d) => {
                const isExpanded = expandedDataset === d.id;
                return (
                  <>
                    <tr
                      key={d.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => setExpandedDataset(isExpanded ? null : d.id)}
                    >
                      <td>{getTierBadge(d.tier)}</td>
                      <td>
                        <div style={{ fontWeight: "700", color: "var(--text-main)" }}>
                          {d.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                          {d.description}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "11.5px",
                            color: "var(--text-main)",
                            background: "var(--bg-elevated)",
                            padding: "3px 6px",
                            borderRadius: "4px",
                            border: "1px solid var(--border-color)",
                            display: "inline-block",
                          }}
                        >
                          {d.storage}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: "700" }}>
                        {d.recordCount?.toLocaleString()}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                        {d.size}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="secondary-button"
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedDataset(isExpanded ? null : d.id);
                          }}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={12} />
                              <span>Hide</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown size={12} />
                              <span>Inspect</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Schema Inspector Drawer */}
                    {isExpanded && (
                      <tr key={`${d.id}-expanded`} style={{ background: "rgba(37, 99, 235, 0.03)" }}>
                        <td colSpan={6} style={{ padding: "16px 20px" }}>
                          <div
                            style={{
                              background: "var(--bg-elevated)",
                              borderRadius: "8px",
                              border: "1px solid var(--border-color)",
                              padding: "16px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                              <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--primary)" }}>
                                SCHEMA SPECIFICATION & FORMAT
                              </span>
                              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                Format: {d.format}
                              </span>
                            </div>

                            <div
                              style={{
                                background: "#06090e",
                                padding: "12px 14px",
                                borderRadius: "6px",
                                fontFamily: "var(--font-mono)",
                                fontSize: "12px",
                                color: "#38bdf8",
                                overflowX: "auto",
                                marginBottom: "10px",
                              }}
                            >
                              <code>{d.schema}</code>
                            </div>

                            <div style={{ display: "flex", gap: "20px", fontSize: "11.5px", color: "var(--text-muted)" }}>
                              <div>
                                <strong style={{ color: "var(--text-main)" }}>Physical Target:</strong> {d.storage}
                              </div>
                              <div>
                                <strong style={{ color: "var(--text-main)" }}>Lifecycle Tier:</strong> {d.tier}
                              </div>
                              <div>
                                <strong style={{ color: "var(--text-main)" }}>Partition/Index Strategy:</strong> Idempotent Composite Keys
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
