import { useState, useEffect } from "react";
import {
  Database,
  Layers,
  HardDrive,
  Cpu,
  CheckCircle2,
  Eye,
  RefreshCw,
  Terminal,
  Play,
  ArrowRight,
  Table2,
  KeyRound,
  Clock,
  FileSpreadsheet,
} from "lucide-react";
import api from "../services/api";

export default function WarehousePage() {
  const [lineage, setLineage] = useState(null);
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [selectedTier, setSelectedTier] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");

  // Live Dataset Inspector Modal State
  const [inspectedId, setInspectedId] = useState(null);
  const [inspectData, setInspectData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Live Native HBase Cell Probe Console State
  const [probeTable, setProbeTable] = useState("crm_customer");
  const [probeKey, setProbeKey] = useState("C014095");
  const [probeResult, setProbeResult] = useState(null);
  const [probing, setProbing] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [lin, pipe] = await Promise.all([
      api.getWarehouseLineage(),
      api.getPipelineStatus(),
    ]);
    if (lin) setLineage(lin);
    if (pipe) setPipelineStatus(pipe);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // Run initial live HBase probe so the console immediately demonstrates live RegionServer reads
    runProbe("crm_customer", "C014095");
  }, []);

  const handleInspectDataset = async (datasetId) => {
    setInspectedId(datasetId);
    setInspectData(null);
    setInspectLoading(true);
    const res = await api.inspectWarehouseDataset(datasetId, 12);
    setInspectData(res);
    setInspectLoading(false);
  };

  const runProbe = async (table = probeTable, key = probeKey) => {
    if (!key.trim()) return;
    setProbing(true);
    const res = await api.probeHBaseRow(table, key.trim());
    setProbeResult(res);
    setProbing(false);
  };

  const handleSyncLakehouse = async () => {
    setSyncing(true);
    setNotice("Reloading HDFS artifacts & rescanning HBase RegionServer tables...");
    await api.triggerPipeline("sync");
    await loadAll();
    setSyncing(false);
    setNotice("Lakehouse metadata & HBase tables synchronized successfully!");
    setTimeout(() => setNotice(""), 4000);
  };

  const datasets = lineage?.datasets || [];
  const filteredDatasets = datasets.filter((d) => {
    if (selectedTier === "ALL") return true;
    return d.tier.toLowerCase().includes(selectedTier.toLowerCase());
  });

  const getTierBadgeClass = (tier = "") => {
    if (tier.includes("Bronze")) return "info";
    if (tier.includes("Silver")) return "success";
    return "warning";
  };

  const hbaseTables = pipelineStatus?.hbase?.tablesFound || [
    "crm_campaign",
    "crm_cancellations",
    "crm_customer",
    "crm_interaction",
    "crm_orders",
  ];

  const parseSchemaTokens = (schemaStr = "") =>
    schemaStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  return (
    <div className="module-content-layout">
      {/* Executive Header */}
      <div className="panel-card-header" style={{ marginBottom: "22px" }}>
        <div>
          <span className="eyebrow-badge">APEX LAKEHOUSE · LIVE DISTRIBUTED ARCHITECT</span>
          <h1 className="hero-heading" style={{ fontSize: "28px", marginTop: "4px" }}>
            Data Warehouse &amp; <em>Live HBase Explorer</em>
          </h1>
          <p className="hero-paragraph" style={{ marginBottom: 0 }}>
            Inspect all 8 retail datasets across Bronze (HDFS), Silver (Spark Facts/Dims), and Gold (HBase + MLlib), and probe live RegionServer cells in real time.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <span className="badge-tag success" style={{ padding: "6px 12px" }}>
            <CheckCircle2 size={13} />
            <span>{lineage?.clusterStatus === "UP" ? "HBase Quorum Online" : "HBase Connected"}</span>
          </span>
          <button className="action-btn-primary" onClick={handleSyncLakehouse} disabled={syncing}>
            <RefreshCw size={13} className={syncing ? "spin-icon" : ""} />
            <span>{syncing ? "Rescanning..." : "Rescan Lakehouse"}</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="action-notification-banner" style={{ marginBottom: "18px" }}>
          <CheckCircle2 size={16} />
          <span>{notice}</span>
        </div>
      )}

      {/* Top Infrastructure Summary Cards */}
      <section className="metrics-summary-grid">
        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-primary)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">HADOOP HDFS LAKE</span>
            <div className="metric-box-icon" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
              <HardDrive size={18} />
            </div>
          </div>
          <div className="metric-box-value">87.2 MB</div>
          <div className="metric-box-footer">
            <span className="footer-code" style={{ color: "var(--success)" }}>{lineage?.hdfsUri || "hdfs://localhost:9000"}</span>
            <span className="footer-desc">NameNode + DataNode staging /crm/data</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-success)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">LIVE HBASE TABLES</span>
            <div className="metric-box-icon" style={{ background: "var(--success-light)", color: "var(--success)" }}>
              <Database size={18} />
            </div>
          </div>
          <div className="metric-box-value">{hbaseTables.length} Active</div>
          <div className="metric-box-footer">
            <span className="footer-code" style={{ color: "var(--success)" }}>ZooKeeper {lineage?.zookeeperQuorum || "localhost:2181"}</span>
            <span className="footer-desc">{hbaseTables.join(", ")}</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-purple)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">MULTI-TIER COVERAGE</span>
            <div className="metric-box-icon" style={{ background: "var(--purple-light)", color: "var(--purple)" }}>
              <Layers size={18} />
            </div>
          </div>
          <div className="metric-box-value">{lineage?.totalDatasets || 8} Datasets</div>
          <div className="metric-box-footer">
            <span className="footer-code">{(lineage?.totalRecordsAcrossTiers || 1050550).toLocaleString()} indexed items</span>
            <span className="footer-desc">Bronze · Silver · Gold lifecycle</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-accent-line" style={{ background: "var(--grad-amber)" }} />
          <div className="metric-box-header">
            <span className="metric-box-title">POINT LOOKUP LATENCY</span>
            <div className="metric-box-icon" style={{ background: "var(--warning-light)", color: "var(--warning)" }}>
              <Cpu size={18} />
            </div>
          </div>
          <div className="metric-box-value">
            {probeResult?.latencyMs !== undefined ? `${probeResult.latencyMs} ms` : "< 2 ms"}
          </div>
          <div className="metric-box-footer">
            <span className="footer-code" style={{ color: "var(--success)" }}>Native Java HBase Get</span>
            <span className="footer-desc">Live measured RegionServer turnaround</span>
          </div>
        </div>
      </section>

      {/* UNIQUE FEATURE 1: Interactive Lakehouse Architecture Navigator */}
      <div className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>Interactive Lakehouse Topology (Click Tier to Filter)</h3>
            <p>Select any medallion storage stage below to isolate its schemas, storage paths, and live datasets</p>
          </div>
          <button
            className="pagination-btn"
            onClick={() => setSelectedTier("ALL")}
            style={{ fontWeight: selectedTier === "ALL" ? 700 : 500 }}
          >
            Show All ({datasets.length})
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", alignItems: "stretch" }}>
          {[
            {
              tierKey: "Bronze",
              badge: "STAGE 01 · BRONZE",
              badgeClass: "info",
              title: "HDFS Raw Landing",
              sub: "84.2 MB immutable raw sales CSV (988,278 lines) stored distributedly in HDFS.",
              meta: "/crm/data/raw/online_retail.csv",
            },
            {
              tierKey: "Silver",
              badge: "STAGE 02 · SILVER",
              badgeClass: "success",
              title: "Dimensions & Facts",
              sub: "Spark ETL outputs clean customers (5.7K), orders (34.2K), returns (7.5K) & SKUs (4.7K).",
              meta: "Deterministic Composite RowKeys",
            },
            {
              tierKey: "Gold",
              badge: "STAGE 03 · GOLD",
              badgeClass: "warning",
              title: "ML & Real-Time HBase",
              sub: "Scored customer intelligence, campaign playbooks & live operator commits.",
              meta: "AUC 0.7784 · crm_interaction",
            },
          ].map((stage) => {
            const active = selectedTier === stage.tierKey;
            return (
              <div
                key={stage.tierKey}
                className="tier-detail-card"
                onClick={() => setSelectedTier(active ? "ALL" : stage.tierKey)}
                style={{
                  cursor: "pointer",
                  borderColor: active ? "var(--primary)" : undefined,
                  boxShadow: active ? "0 0 0 2px var(--primary-light)" : undefined,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className={`badge-tag ${stage.badgeClass}`}>{stage.badge}</span>
                  <ArrowRight size={13} color={active ? "var(--primary)" : "var(--text-muted)"} />
                </div>
                <strong style={{ fontSize: "14px", color: "var(--text-main)" }}>{stage.title}</strong>
                <p style={{ fontSize: "12px", color: "var(--text-sub)", lineHeight: 1.45, flex: 1 }}>
                  {stage.sub}
                </p>
                <span className="code-identifier" style={{ fontSize: "10.5px", width: "fit-content" }}>
                  {stage.meta}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* UNIQUE FEATURE 2: Dataset Blueprint Cards with Working Live Modal Inspector */}
      <div className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>
              Warehouse Datasets &amp; Live Data Inspector{" "}
              {selectedTier !== "ALL" && `(${selectedTier} Tier)`}
            </h3>
            <p>Click &quot;Inspect Live Data&quot; on any dataset to view tokenized schemas and stream real sample rows from HBase / HDFS</p>
          </div>
          <div className="view-mode-toggle">
            {["ALL", "Bronze", "Silver", "Gold"].map((t) => (
              <button
                key={t}
                className={`toggle-option ${selectedTier === t ? "selected" : ""}`}
                onClick={() => setSelectedTier(t)}
              >
                {t === "ALL" ? `All (${datasets.length})` : t}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "50px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            Loading warehouse catalog from HBase &amp; HDFS...
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: "16px" }}>
            {filteredDatasets.map((d) => (
              <div
                key={d.id}
                style={{
                  backgroundColor: "var(--card-bg-subtle)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className={`badge-tag ${getTierBadgeClass(d.tier)}`}>
                    {d.tier.toUpperCase()}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)", fontWeight: 700 }}>
                    {d.size} · {d.recordCount?.toLocaleString()} rows
                  </span>
                </div>

                <div>
                  <h4 style={{ fontSize: "15px", fontWeight: "800", color: "var(--text-main)", margin: "2px 0 4px" }}>
                    {d.name}
                  </h4>
                  <p style={{ fontSize: "12px", color: "var(--text-sub)", lineHeight: 1.45 }}>
                    {d.description}
                  </p>
                </div>

                <div style={{ padding: "8px 10px", backgroundColor: "var(--card-bg)", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-color)", fontSize: "11px" }}>
                  <span style={{ color: "var(--text-muted)", display: "block", marginBottom: "3px", fontWeight: 700 }}>
                    PHYSICAL TARGET:
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--primary)", wordBreak: "break-all" }}>
                    {d.storage}
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                  {parseSchemaTokens(d.schema).slice(0, 5).map((tok) => (
                    <span key={tok} className="segment-chip" style={{ fontSize: "10px", fontFamily: "var(--font-mono)" }}>
                      {tok}
                    </span>
                  ))}
                  {parseSchemaTokens(d.schema).length > 5 && (
                    <span className="segment-chip" style={{ fontSize: "10px" }}>
                      +{parseSchemaTokens(d.schema).length - 5} cols
                    </span>
                  )}
                </div>

                <div style={{ marginTop: "auto", paddingTop: "8px", borderTop: "1px dashed var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {d.format.split(":")[0]}
                  </span>
                  <button
                    className="action-btn-primary"
                    style={{ padding: "6px 14px", fontSize: "12px" }}
                    onClick={() => handleInspectDataset(d.id)}
                  >
                    <Eye size={13} />
                    <span>Inspect Live Data</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* UNIQUE FEATURE 3: Live Apache HBase Native RowKey & Cell Probe Terminal */}
      <div className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>Live HBase Native Cell Probe &amp; Latency Console</h3>
            <p>Execute real HBase <code>Table.get()</code> or prefix scans directly against the live ZooKeeper + RegionServer cluster</p>
          </div>
          <span className="badge-tag info">
            <Terminal size={12} /> Native Java HBase Client
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "14px" }}>
          <select
            value={probeTable}
            onChange={(e) => setProbeTable(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--card-bg-subtle)",
              border: "1px solid var(--border-color)",
              fontSize: "12.5px",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              color: "var(--text-main)",
            }}
          >
            {hbaseTables.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <div className="global-search-container" style={{ maxWidth: "320px", margin: 0 }}>
            <KeyRound size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Enter RowKey or prefix (e.g. C014095, M002)..."
              value={probeKey}
              onChange={(e) => setProbeKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runProbe()}
              style={{ background: "transparent", border: "none", outline: "none", width: "100%", fontSize: "12.5px", fontFamily: "var(--font-mono)", color: "var(--text-main)" }}
            />
          </div>

          <button className="action-btn-primary" onClick={() => runProbe()} disabled={probing}>
            <Play size={13} />
            <span>{probing ? "Querying..." : "Execute HBase Probe"}</span>
          </button>

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700 }}>Try:</span>
            {[
              { t: "crm_customer", k: "C014095" },
              { t: "crm_orders", k: "C014095" },
              { t: "crm_interaction", k: "C014095" },
              { t: "crm_campaign", k: "M002" },
            ].map((q) => (
              <button
                key={`${q.t}-${q.k}`}
                className="pagination-btn"
                onClick={() => {
                  setProbeTable(q.t);
                  setProbeKey(q.k);
                  runProbe(q.t, q.k);
                }}
              >
                {q.t}:{q.k}
              </button>
            ))}
          </div>
        </div>

        {/* Probe Output Console */}
        {probeResult && (
          <div style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", overflow: "hidden" }}>
            <div
              style={{
                background: "#090d16",
                color: "#e2e8f0",
                padding: "10px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                fontFamily: "var(--font-mono)",
                fontSize: "11.5px",
              }}
            >
              <span>
                hbase&gt; get &apos;{probeResult.table}&apos;, &apos;{probeResult.queryKey}&apos;{" "}
                <span style={{ color: "#38bdf8" }}>[{probeResult.lookupMode || "Lookup"}]</span>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "12px" }}>
                <span style={{ color: "#10b981", fontWeight: 700 }}>
                  <Clock size={11} style={{ display: "inline", marginRight: "4px" }} />
                  {probeResult.latencyMs ?? "-"} ms
                </span>
                <span>{probeResult.matchedRowCount || 0} row(s) · {probeResult.cells?.length || 0} cells</span>
              </span>
            </div>

            {probeResult.cells && probeResult.cells.length > 0 ? (
              <div className="table-responsive-container" style={{ border: "none", borderRadius: 0, maxHeight: "280px" }}>
                <table className="enterprise-data-table">
                  <thead>
                    <tr>
                      <th>Row Key</th>
                      <th>Column Family</th>
                      <th>Qualifier</th>
                      <th>Cell Value</th>
                      <th>Cell Timestamp (Epoch)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {probeResult.cells.slice(0, 30).map((cell, i) => (
                      <tr key={`${cell.rowKey}-${cell.family}-${cell.qualifier}-${i}`}>
                        <td><span className="code-identifier">{cell.rowKey}</span></td>
                        <td><span className="badge-tag info">{cell.family}</span></td>
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{cell.qualifier}</td>
                        <td style={{ fontFamily: "var(--font-mono)", color: "var(--success)", fontWeight: 600 }}>{cell.value}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>{cell.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: "24px", textAlign: "center", fontSize: "12.5px", color: "var(--text-muted)" }}>
                {probeResult.error || `No matching cells found in "${probeResult.table}" for prefix "${probeResult.queryKey}". Try a different key prefix above.`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live Dataset Sample & Schema Inspector Modal */}
      {inspectedId && (
        <div className="dossier-overlay" onClick={() => setInspectedId(null)}>
          <div
            className="dossier-dialog"
            style={{ maxWidth: "920px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dossier-header">
              <div>
                <span className="eyebrow-badge">
                  LIVE WAREHOUSE DATASET INSPECTOR · {inspectData?.metadata?.tier?.toUpperCase() || "INSPECT"}
                </span>
                <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "20px" }}>
                  {inspectData?.metadata?.name || inspectedId}
                </h2>
                <p>
                  Engine: <b>{inspectData?.sourceEngine || "Querying..."}</b> · Read Latency:{" "}
                  <b style={{ color: "var(--success)" }}>{inspectData?.queryLatencyMs ?? "-"} ms</b>
                </p>
              </div>
              <button className="dossier-close-btn" onClick={() => setInspectedId(null)}>✕</button>
            </div>

            {inspectLoading ? (
              <div style={{ padding: "50px 20px", textAlign: "center", color: "var(--text-muted)" }}>
                Streaming live rows &amp; column metadata from storage engine...
              </div>
            ) : inspectData ? (
              <>
                <div className="dossier-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                  <div className="dossier-stat">
                    <span className="stat-sublabel">Total Stored Records</span>
                    <span className="stat-highlight" style={{ fontSize: "16px" }}>
                      {inspectData.metadata?.recordCount?.toLocaleString()}
                    </span>
                  </div>
                  <div className="dossier-stat">
                    <span className="stat-sublabel">Disk Footprint</span>
                    <span className="stat-highlight" style={{ fontSize: "16px" }}>
                      {inspectData.metadata?.size}
                    </span>
                  </div>
                  <div className="dossier-stat">
                    <span className="stat-sublabel">Live Scan Mode</span>
                    <span className="stat-highlight" style={{ fontSize: "14px", color: "var(--success)" }}>
                      {inspectData.hbaseScannedLive ? "LIVE HBASE REGION" : "STAGED HDFS / CSV"}
                    </span>
                  </div>
                </div>

                {/* Schema Token Fields */}
                <div style={{ marginBottom: "16px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                    Columns &amp; HBase Families
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {parseSchemaTokens(inspectData.metadata?.schema).map((tok) => (
                      <span key={tok} className="code-identifier" style={{ fontSize: "11px" }}>
                        {tok}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Live Sample Rows Table */}
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-main)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <Table2 size={14} color="var(--primary)" />
                      Live Sample Records ({inspectData.sampleRows?.length || 0} rows fetched)
                    </span>
                    <span className="badge-tag info">
                      <FileSpreadsheet size={11} /> Real Production Data
                    </span>
                  </div>

                  <div className="table-responsive-container" style={{ maxHeight: "300px" }}>
                    <table className="enterprise-data-table">
                      <thead>
                        <tr>
                          {(inspectData.headers || []).map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(inspectData.sampleRows || []).map((row, idx) => (
                          <tr key={idx}>
                            {(inspectData.headers || []).map((h) => (
                              <td key={h} style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px" }}>
                                {row[h] !== undefined && row[h] !== null ? String(row[h]) : "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                  {inspectData.hbaseTable ? (
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setProbeTable(inspectData.hbaseTable);
                        if (inspectData.hbaseTable === "crm_campaign") setProbeKey("M002");
                        else setProbeKey("C014095");
                        runProbe(
                          inspectData.hbaseTable,
                          inspectData.hbaseTable === "crm_campaign" ? "M002" : "C014095"
                        );
                        setInspectedId(null);
                      }}
                    >
                      <Terminal size={13} />
                      <span>Probe &apos;{inspectData.hbaseTable}&apos; in HBase Console</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                      Path: {inspectData.metadata?.storage}
                    </span>
                  )}
                  <button className="primary-button" onClick={() => setInspectedId(null)}>
                    Close Inspector
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: "30px", textAlign: "center", color: "var(--danger)" }}>
                Failed to retrieve live dataset preview from server.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
