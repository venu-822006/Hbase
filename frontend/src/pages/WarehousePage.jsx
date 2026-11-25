import { useState, useEffect } from "react";
import {
  Database,
  Layers,
  HardDrive,
  Cpu,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "../services/api";

export default function WarehousePage() {
  const [lineage, setLineage] = useState(null);
  const [selectedTier, setSelectedTier] = useState("ALL");
  const [expandedDataset, setExpandedDataset] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLineage = async () => {
      setLoading(true);
      const res = await api.getWarehouseLineage();
      if (res) setLineage(res);
      setLoading(false);
    };
    fetchLineage();
  }, []);

  const datasets = lineage?.datasets || [];

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
          <span className="eyebrow-badge">APEX LAKEHOUSE · STORAGE ARCHITECTURE</span>
          <h1 className="hero-heading" style={{ fontSize: "28px", marginTop: "4px" }}>
            Data Warehouse &amp; <em>Storage Lineage</em>
          </h1>
          <p className="hero-paragraph" style={{ marginBottom: 0 }}>
            End-to-end data lifecycle covering 988,278 raw transaction events across Hadoop HDFS, Apache HBase wide-column tables, and Spark MLlib.
          </p>
        </div>

        <span className="badge-tag success" style={{ padding: "6px 14px", fontSize: "12px" }}>
          <CheckCircle2 size={13} />
          <span>{lineage?.clusterStatus === "UP" ? "HBase & HDFS Healthy" : "Cluster Connected"}</span>
        </span>
      </div>

      {/* KPI Summary Tiles */}
      <section className="metrics-summary-grid">
        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-primary)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">HADOOP HDFS STORAGE</span>
            <div className="metric-box-icon" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
              <HardDrive size={18} />
            </div>
          </div>
          <div className="metric-box-value">87.2 MB</div>
          <div className="metric-box-footer">
            <span className="footer-code" style={{ color: "var(--success)" }}>{lineage?.hdfsUri || "hdfs://localhost:9000"}</span>
            <span className="footer-desc">NameNode + DataNode active</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-success)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">HBASE NOSQL TABLES</span>
            <div className="metric-box-icon" style={{ background: "var(--success-light)", color: "var(--success)" }}>
              <Database size={18} />
            </div>
          </div>
          <div className="metric-box-value">5 Tables</div>
          <div className="metric-box-footer">
            <span className="footer-code" style={{ color: "var(--success)" }}>ZooKeeper {lineage?.zookeeperQuorum || "localhost:2181"}</span>
            <span className="footer-desc">Wide-column storefiles &lt;2ms lookup</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-purple)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">TOTAL DATASET COVERAGE</span>
            <div className="metric-box-icon" style={{ background: "var(--purple-light)", color: "var(--purple)" }}>
              <Layers size={18} />
            </div>
          </div>
          <div className="metric-box-value">{lineage?.totalDatasets || 8} Datasets</div>
          <div className="metric-box-footer">
            <span className="footer-code">
              {(lineage?.totalRecordsAcrossTiers || 1050550).toLocaleString()} total items
            </span>
            <span className="footer-desc">Bronze · Silver · Gold architecture</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-amber)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">SPARK MLLIB ENGINE</span>
            <div className="metric-box-icon" style={{ background: "var(--warning-light)", color: "var(--warning)" }}>
              <Cpu size={18} />
            </div>
          </div>
          <div className="metric-box-value">&lt; 1 ms</div>
          <div className="metric-box-footer">
            <span className="footer-code" style={{ color: "var(--success)" }}>ROC-AUC 0.7784</span>
            <span className="footer-desc">Real-time JVM model scoring</span>
          </div>
        </div>
      </section>

      {/* Pipeline Stages Card */}
      <div className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>End-to-End Enterprise Data Pipeline Flow</h3>
            <p>Data movement from raw landing down to random-access HBase operational queries and ML intelligence</p>
          </div>
          <span className="panel-header-pill">HDFS → SPARK → HBASE → API → REACT</span>
        </div>

        <div className="segment-tier-grid">
          <div className="tier-detail-card">
            <span className="badge-tag info" style={{ width: "fit-content" }}>STAGE 01 · BRONZE</span>
            <strong style={{ fontSize: "14px", color: "var(--text-main)" }}>Raw Ingestion</strong>
            <p style={{ fontSize: "12px", color: "var(--text-sub)", lineHeight: 1.45 }}>
              Multi-year raw transaction logs staged distributedly in HDFS at <code>/crm/data/raw/</code>.
            </p>
            <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              988,278 line items · 84.2 MB
            </span>
          </div>

          <div className="tier-detail-card">
            <span className="badge-tag success" style={{ width: "fit-content" }}>STAGE 02 · SILVER</span>
            <strong style={{ fontSize: "14px", color: "var(--text-main)" }}>ETL &amp; Modeling</strong>
            <p style={{ fontSize: "12px", color: "var(--text-sub)", lineHeight: 1.45 }}>
              Spark pipeline cleans nulls, derives RFM metrics, and constructs idempotent composite row keys.
            </p>
            <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              5,721 Accounts · 4,723 SKUs
            </span>
          </div>

          <div className="tier-detail-card">
            <span className="badge-tag info" style={{ width: "fit-content" }}>STAGE 03 · NOSQL</span>
            <strong style={{ fontSize: "14px", color: "var(--text-main)" }}>Apache HBase 2.5</strong>
            <p style={{ fontSize: "12px", color: "var(--text-sub)", lineHeight: 1.45 }}>
              Wide-column storefiles partitioned across ZooKeeper quorum with sub-2ms point lookups.
            </p>
            <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              crm_customer, crm_orders, crm_interaction
            </span>
          </div>

          <div className="tier-detail-card">
            <span className="badge-tag warning" style={{ width: "fit-content" }}>STAGE 04 · GOLD</span>
            <strong style={{ fontSize: "14px", color: "var(--text-main)" }}>ML &amp; Closed-Loop</strong>
            <p style={{ fontSize: "12px", color: "var(--text-sub)", lineHeight: 1.45 }}>
              Predictive churn &amp; CLV models score accounts with real-time campaign dispatches written back to HBase.
            </p>
            <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              AUC 0.7784 · Synchronous Commits
            </span>
          </div>
        </div>
      </div>

      {/* Tier Filter */}
      <div className="panel-card" style={{ padding: "14px 20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Storage Tier:
          </span>
          <div className="view-mode-toggle">
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
      </div>

      {/* Inventory Table */}
      <div className="panel-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-main)", margin: 0 }}>
            Warehouse Datasets &amp; Schema Inventory
          </h3>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Click any dataset row to inspect physical storage paths, column families, and schema definitions
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "50px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            Inspecting HDFS and HBase catalog lineage...
          </div>
        ) : (
          <div className="table-responsive-container" style={{ border: "none", borderRadius: 0 }}>
            <table className="enterprise-data-table">
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Dataset Name</th>
                  <th>Storage Engine &amp; Path</th>
                  <th style={{ textAlign: "right" }}>Records</th>
                  <th style={{ textAlign: "right" }}>Size</th>
                  <th>Schema</th>
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
                        <td style={{ whiteSpace: "normal", minWidth: "240px" }}>
                          <strong style={{ color: "var(--text-main)", display: "block" }}>{d.name}</strong>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{d.description}</span>
                        </td>
                        <td>
                          <span className="code-identifier">{d.storage}</span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span className="currency-num">{d.recordCount?.toLocaleString()}</span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span className="currency-num">{d.size}</span>
                        </td>
                        <td>
                          <button
                            className="dispatch-action-tag"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedDataset(isExpanded ? null : d.id);
                            }}
                          >
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            <span>{isExpanded ? "Hide" : "Inspect"}</span>
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${d.id}-exp`} style={{ backgroundColor: "var(--card-bg-subtle)" }}>
                          <td colSpan={6} style={{ padding: "16px 20px", whiteSpace: "normal" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "11.5px" }}>
                              <strong style={{ color: "var(--primary)" }}>SCHEMA SPECIFICATION &amp; KEY ARCHITECTURE</strong>
                              <span style={{ color: "var(--text-muted)" }}>Format: {d.format}</span>
                            </div>
                            <div
                              style={{
                                background: "#090d16",
                                color: "#38bdf8",
                                padding: "12px 14px",
                                borderRadius: "var(--radius-sm)",
                                fontFamily: "var(--font-mono)",
                                fontSize: "12px",
                                overflowX: "auto",
                              }}
                            >
                              {d.schema}
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
        )}
      </div>
    </div>
  );
}
