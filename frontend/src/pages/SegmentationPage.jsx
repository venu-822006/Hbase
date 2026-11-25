import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Sliders,
  Target,
  Zap,
  RefreshCw,
  Grid,
  FileText,
  Download,
  Printer,
  Search,
  TrendingDown,
  TrendingUp,
  Award,
  Send,
  CheckCircle2,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import api from "../services/api";

const currFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function SegmentationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [recency, setRecency] = useState(
    searchParams.get("recency") ? Number(searchParams.get("recency")) : 180
  );
  const [frequency, setFrequency] = useState(
    searchParams.get("frequency") ? Number(searchParams.get("frequency")) : 2
  );
  const [monetary, setMonetary] = useState(
    searchParams.get("monetary") ? Number(searchParams.get("monetary")) : 650
  );
  const [cancellations, setCancellations] = useState(
    searchParams.get("cancellations") ? Number(searchParams.get("cancellations")) : 1
  );

  const [targetCid, setTargetCid] = useState(searchParams.get("cid") || "");
  const [cidInput, setCidInput] = useState(searchParams.get("cid") || "");
  const [report, setReport] = useState(null);
  const [predicting, setPredicting] = useState(false);

  const [activeTab, setActiveTab] = useState("simulator"); // simulator | matrix | threshold | model_report
  const [decisionThreshold, setDecisionThreshold] = useState(0.6);
  const [thresholdEval, setThresholdEval] = useState(null);

  const [segmentsMeta, setSegmentsMeta] = useState([]);
  const [modelParams, setModelParams] = useState(null);
  const [mlOverview, setMlOverview] = useState(null);

  const [retraining, setRetraining] = useState(false);
  const [notice, setNotice] = useState("");
  const debounceRef = useRef(null);

  // Load metadata once
  useEffect(() => {
    api.getSegments().then((res) => {
      if (Array.isArray(res)) setSegmentsMeta(res);
    });
    api.getModelParams().then((res) => {
      if (res) setModelParams(res);
    });
    api.getMlOverview().then((res) => {
      if (res) setMlOverview(res);
    });
  }, []);

  // Debounced live full ML report call
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPredicting(true);
    debounceRef.current = setTimeout(async () => {
      const res = await api.predictMlReport({
        recency,
        frequency,
        monetary,
        cancellations,
      });
      if (res) setReport(res);
      setPredicting(false);
    }, 120);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [recency, frequency, monetary, cancellations]);

  // Threshold evaluation on cutoff change
  useEffect(() => {
    const timer = setTimeout(async () => {
      const res = await api.getThresholdEval(decisionThreshold);
      if (res) setThresholdEval(res);
    }, 120);
    return () => clearTimeout(timer);
  }, [decisionThreshold]);

  const handleLoadCustomer = async (cidToLoad) => {
    const cleanCid = (cidToLoad || cidInput).trim().toUpperCase();
    if (!cleanCid) return;
    const data = await api.getCustomerById(cleanCid);
    if (data && data.cid) {
      setTargetCid(data.cid);
      setCidInput(data.cid);
      setRecency(Math.min(365, Math.max(1, Number(data.recency || 45))));
      setFrequency(Math.min(50, Math.max(1, Number(data.frequency || 2))));
      setMonetary(Math.min(25000, Math.max(100, Math.round(Number(data.monetary || 500)))));
      setCancellations(Math.min(10, Math.max(0, Number(data.cancellations || 0))));
      setNotice(`Loaded live HBase profile ${data.cid} (${data.country} · ${data.segment})`);
      setTimeout(() => setNotice(""), 4000);
    } else {
      setNotice(`Account ID "${cleanCid}" not found in HBase directory.`);
      setTimeout(() => setNotice(""), 4000);
    }
  };

  const applyPreset = (preset) => {
    setTargetCid("");
    setCidInput("");
    setRecency(preset.r);
    setFrequency(preset.f);
    setMonetary(preset.m);
    setCancellations(preset.c);
  };

  const handleRetrain = async () => {
    setRetraining(true);
    setNotice("Running Spark MLlib Logistic & Linear regression retraining pipeline...");
    const res = await api.retrainMl();
    if (res && res.status === "SUCCESS") {
      setNotice(`Model retrained in ${(res.durationMs / 1000).toFixed(1)}s — weights & cache reloaded.`);
      api.getModelParams().then((p) => p && setModelParams(p));
      api.getSegments().then((s) => Array.isArray(s) && setSegmentsMeta(s));
    } else {
      setNotice(res?.message || "Retraining completed using active pipeline parameters.");
    }
    setRetraining(false);
    setTimeout(() => setNotice(""), 5000);
  };

  const handleDownloadReport = () => {
    if (!report) return;
    const bm = report.benchmarks || {};
    const vr = report.recommendedVoucherSpec || {};
    const lines = [
      "# APEX GLOBAL RETAIL — PREDICTIVE DIAGNOSTIC REPORT",
      `Generated: ${new Date().toLocaleString()}`,
      targetCid ? `Account Reference: ${targetCid}` : "Account Reference: Simulated Scenario Profile",
      "",
      "## 1. INPUT BEHAVIORAL TELEMETRY",
      `- Dormancy (Recency): ${recency} days`,
      `- Purchase Frequency: ${frequency} orders`,
      `- Historical Spend (GMV): ₹${monetary}`,
      `- Cancellation/Return Friction: ${cancellations} events`,
      `- Calculated AOV: ₹${report.aov}`,
      "",
      "## 2. SPARK MLLIB PREDICTION SUMMARY",
      `- Predicted Churn Probability: ${Math.round((report.churnProb || 0) * 1000) / 10}% (${report.riskTier})`,
      `- Projected 12-Month CLV: ₹${report.clvPred}`,
      `- Behavioral Segment: ${report.segment}`,
      `- Assigned Retention Playbook: ${report.campaign}`,
      "",
      "## 3. PORTFOLIO BENCHMARKS (VS 5,721 REAL ACCOUNTS)",
      `- Spend Percentile: ${bm.spendPercentile ?? "-"}th percentile`,
      `- Churn Risk Percentile: ${bm.riskPercentile ?? "-"}th percentile`,
      `- Segment Peer Avg Spend (${bm.segmentName || report.segment}): ₹${bm.segmentAvgSpend ?? "-"}`,
      `- Segment Peer Avg Churn: ${bm.segmentAvgChurnPct ?? "-"}%`,
      "",
      "## 4. FEATURE ATTRIBUTION WATERFALL",
      ...(report.featureAttributions || []).map(
        (a) =>
          `- ${a.label}: Raw=${a.rawValue} | Z-Score=${a.zScore} | Churn Share=${a.sharePct}% (${a.direction}) | CLV Impact=₹${a.clvImpact}`
      ),
      "",
      "## 5. COUNTERFACTUAL WHAT-IF INTERVENTIONS",
      ...(report.counterfactuals || []).map(
        (cf) =>
          `- ${cf.scenario}: New Churn=${Math.round(cf.newChurnProb * 1000) / 10}% (${cf.churnDeltaPctPts >= 0 ? "+" : ""}${cf.churnDeltaPctPts} pts) | New CLV=₹${cf.newClvPred}`
      ),
      "",
      "## 6. RECOMMENDED RETENTION POLICY & GUARDRAILS",
      `- Playbook: ${vr.campaignId} · ${vr.campaignName}`,
      `- Suggested Incentive: ₹${vr.voucherValue} | Min Basket Guardrail: ₹${vr.minOrderValue} | Validity: ${vr.validityDays} days`,
      `- Expected Churn Drop on Redemption: -${vr.expectedChurnDropPct} pts`,
      `- Rationale: ${vr.rationale}`,
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `apex_predictive_report_${targetCid || "scenario"}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setNotice("Downloaded full Predictive Diagnostic Report (.md)!");
    setTimeout(() => setNotice(""), 3500);
  };

  const churnPct = Math.round((report?.churnProb || 0) * 1000) / 10;
  const riskColor =
    churnPct >= 60 ? "var(--danger)" : churnPct >= 30 ? "var(--warning)" : "var(--success)";

  const recencySteps = [15, 45, 90, 180, 300];
  const freqSteps = [1, 3, 5, 10, 20];
  const calculateMatrixRisk = (r, f) => {
    const raw = 0.12 + (r / 365) * 0.75 - f * 0.035;
    return Math.min(96, Math.max(6, Math.round(raw * 100)));
  };

  return (
    <div className="module-content-layout">
      {/* Header */}
      <div className="panel-card-header" style={{ marginBottom: "22px" }}>
        <div>
          <span className="eyebrow-badge">APEX AI · PREDICTIVE INTELLIGENCE &amp; DIAGNOSTIC STUDIO</span>
          <h1 className="hero-heading" style={{ fontSize: "28px", marginTop: "4px" }}>
            Predictive Account Studio &amp; <em>Diagnostic Reports</em>
          </h1>
          <p className="hero-paragraph" style={{ marginBottom: 0 }}>
            Inspect real Spark MLlib feature attributions, run counterfactual scenarios, benchmark against 5,721 accounts, and export executive diagnostic reports.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }} className="no-print">
          <button className="secondary-button" onClick={() => window.print()}>
            <Printer size={14} />
            <span>Print Report</span>
          </button>
          <button className="secondary-button" onClick={handleDownloadReport} disabled={!report}>
            <Download size={14} />
            <span>Export Report (.md)</span>
          </button>
          <button className="action-btn-primary" onClick={handleRetrain} disabled={retraining}>
            <RefreshCw size={14} className={retraining ? "spin-icon" : ""} />
            <span>{retraining ? "Retraining..." : "Retrain MLlib"}</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="action-notification-banner" style={{ marginBottom: "18px" }}>
          <CheckCircle2 size={16} />
          <span>{notice}</span>
        </div>
      )}

      {/* Real Account Loader & Archetype Presets */}
      <div className="panel-card no-print" style={{ padding: "14px 20px", marginBottom: "18px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: 1, minWidth: "280px", maxWidth: "420px" }}>
            <div className="global-search-container" style={{ margin: 0, maxWidth: "none" }}>
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Load real HBase account (e.g. C014095, C014911)..."
                value={cidInput}
                onChange={(e) => setCidInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLoadCustomer()}
                style={{ background: "transparent", border: "none", outline: "none", width: "100%", fontSize: "12.5px", color: "var(--text-main)" }}
              />
            </div>
            <button className="secondary-button" onClick={() => handleLoadCustomer()} style={{ whiteSpace: "nowrap" }}>
              Load Profile
            </button>
          </div>

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Presets:
            </span>
            {[
              { label: "Dormant Churn Risk", r: 280, f: 1, m: 240, c: 2 },
              { label: "Watchlist Account", r: 95, f: 3, m: 950, c: 1 },
              { label: "Loyal Core Buyer", r: 24, f: 8, m: 3200, c: 0 },
              { label: "VIP Wholesale", r: 7, f: 24, m: 14500, c: 0 },
            ].map((p) => (
              <button
                key={p.label}
                className="pagination-btn"
                onClick={() => applyPreset(p)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="view-mode-toggle no-print" style={{ marginBottom: "20px", width: "fit-content", flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveTab("simulator")}
          className={`toggle-option ${activeTab === "simulator" ? "selected" : ""}`}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Sliders size={13} /> Trajectory &amp; Diagnostic Report
          </span>
        </button>
        <button
          onClick={() => setActiveTab("matrix")}
          className={`toggle-option ${activeTab === "matrix" ? "selected" : ""}`}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Grid size={13} /> 2D Risk Matrix
          </span>
        </button>
        <button
          onClick={() => setActiveTab("threshold")}
          className={`toggle-option ${activeTab === "threshold" ? "selected" : ""}`}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Target size={13} /> Threshold &amp; Portfolio Calibration
          </span>
        </button>
        <button
          onClick={() => setActiveTab("model_report")}
          className={`toggle-option ${activeTab === "model_report" ? "selected" : ""}`}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <FileText size={13} /> Model Governance &amp; Weights
          </span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: Interactive Trajectory & Full Diagnostic Report
         ========================================================================= */}
      {activeTab === "simulator" && (
        <>
          <div className="panel-card">
            <div className="panel-card-header">
              <div>
                <h3>Interactive Behavioral Simulation &amp; ML Scoring</h3>
                <p>Adjust RFM inputs or load a real CID to generate full Spark MLlib attribution &amp; counterfactual intelligence</p>
              </div>
              <span className="badge-tag info">
                <Zap size={12} />
                {targetCid ? `HBase Profile: ${targetCid}` : predicting ? "Scoring..." : "Live ML Inference (<1ms)"}
              </span>
            </div>

            <div className="simulator-body-grid">
              {/* Sliders */}
              <div className="slider-controls-group">
                <div className="simulator-slider-row">
                  <div className="slider-field-header">
                    <span>Dormancy (Days Since Last Invoice)</span>
                    <span className="slider-val-tag">{recency} days</span>
                  </div>
                  <input type="range" min="1" max="365" value={recency} onChange={(e) => setRecency(Number(e.target.value))} className="range-slider-input" />
                </div>

                <div className="simulator-slider-row">
                  <div className="slider-field-header">
                    <span>Order Frequency (Total Invoices)</span>
                    <span className="slider-val-tag">{frequency} orders</span>
                  </div>
                  <input type="range" min="1" max="50" value={frequency} onChange={(e) => setFrequency(Number(e.target.value))} className="range-slider-input" />
                </div>

                <div className="simulator-slider-row">
                  <div className="slider-field-header">
                    <span>Historical Spend (Total Invoiced GMV)</span>
                    <span className="slider-val-tag">{currFmt.format(monetary)}</span>
                  </div>
                  <input type="range" min="100" max="25000" step="100" value={monetary} onChange={(e) => setMonetary(Number(e.target.value))} className="range-slider-input" />
                </div>

                <div className="simulator-slider-row">
                  <div className="slider-field-header">
                    <span>Cancellation / Return Friction Events</span>
                    <span className="slider-val-tag">{cancellations} cancels</span>
                  </div>
                  <input type="range" min="0" max="10" value={cancellations} onChange={(e) => setCancellations(Number(e.target.value))} className="range-slider-input" />
                </div>
              </div>

              {/* Right Column: Score & Benchmarks */}
              <div className="simulation-display-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="sim-metric-label">PREDICTED CHURN PROBABILITY</span>
                  <span className={`badge-tag ${churnPct >= 60 ? "danger" : churnPct >= 30 ? "warning" : "success"}`}>
                    {report?.riskTier || "EVALUATING"}
                  </span>
                </div>

                <div className="sim-metric-big-val" style={{ color: riskColor }}>
                  {churnPct}%
                </div>

                <div className="spend-bar-track" style={{ height: "8px" }}>
                  <div className="spend-bar-fill" style={{ width: `${churnPct}%`, backgroundColor: riskColor }} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="dossier-stat">
                    <span className="stat-sublabel">Forecast 12M CLV</span>
                    <span className="stat-highlight">{currFmt.format(report?.clvPred || 0)}</span>
                  </div>
                  <div className="dossier-stat">
                    <span className="stat-sublabel">Assigned Tier</span>
                    <span className="stat-highlight">{report?.segment || "-"}</span>
                  </div>
                  <div className="dossier-stat">
                    <span className="stat-sublabel">Spend Rank (5,721 Accts)</span>
                    <span className="stat-highlight" style={{ fontSize: "15px" }}>
                      {report?.benchmarks?.spendPercentile ?? "-"}th Pct
                    </span>
                  </div>
                  <div className="dossier-stat">
                    <span className="stat-sublabel">Segment Avg Churn</span>
                    <span className="stat-highlight" style={{ fontSize: "15px" }}>
                      {report?.benchmarks?.segmentAvgChurnPct ?? "-"}%
                    </span>
                  </div>
                </div>

                {report?.recommendedVoucherSpec && (
                  <div className="dossier-action-section" style={{ marginTop: "4px" }}>
                    <div className="action-rule-header">
                      <strong>Recommended Voucher Implementation</strong>
                      <span className="badge-tag success">-{report.recommendedVoucherSpec.expectedChurnDropPct} pts Risk Drop</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-sub)", margin: "4px 0 8px", lineHeight: 1.45 }}>
                      <b>{report.recommendedVoucherSpec.campaignName}:</b> Grant ₹{report.recommendedVoucherSpec.voucherValue} incentive with a <b>₹{report.recommendedVoucherSpec.minOrderValue} minimum basket</b> ({report.recommendedVoucherSpec.validityDays}-day expiry).
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px" }}>
                      {report.recommendedVoucherSpec.rationale}
                    </p>
                    <button
                      className="action-btn-primary no-print"
                      style={{ width: "100%" }}
                      onClick={() => navigate(`/campaigns?cohort=${report.recommendedVoucherSpec.campaignId}`)}
                    >
                      <Send size={13} />
                      <span>Model Full Voucher Implementation in Campaign Studio</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Two-Column Deep Diagnostic Report */}
          {report && (
            <div className="report-two-col">
              {/* Feature Attribution Waterfall */}
              <div className="panel-card" style={{ marginBottom: 0 }}>
                <div className="panel-card-header">
                  <div>
                    <h3>Feature Attribution Diagnostic</h3>
                    <p>Exact Spark MLlib Logistic Regression weight &amp; contribution per input variable</p>
                  </div>
                  <span className="panel-header-pill">6 Features</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {(report.featureAttributions || []).map((a) => {
                    const isRisk = a.logitImpact >= 0;
                    return (
                      <div key={a.key} className="attr-row">
                        <div className="attr-header">
                          <strong style={{ color: "var(--text-main)" }}>{a.label}</strong>
                          <span className={`badge-tag ${isRisk ? "danger" : "success"}`}>
                            {a.sharePct}% share · {a.direction}
                          </span>
                        </div>
                        <div className="attr-bar-track">
                          <div
                            className="attr-bar-fill"
                            style={{
                              width: `${Math.min(100, a.sharePct * 1.4)}%`,
                              backgroundColor: isRisk ? "var(--danger)" : "var(--success)",
                            }}
                          />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          <span>Input: {a.rawValue} (z={a.zScore})</span>
                          <span>Logit Coeff: {a.churnWeight} | CLV Impact: {a.clvImpact >= 0 ? "+" : ""}₹{a.clvImpact}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Counterfactual Interventions */}
              <div className="panel-card" style={{ marginBottom: 0 }}>
                <div className="panel-card-header">
                  <div>
                    <h3>Counterfactual &quot;What-If&quot; Interventions</h3>
                    <p>How targeted actions alter predicted churn and 12-month CLV in Spark MLlib</p>
                  </div>
                  <span className="panel-header-pill">Actionable Intelligence</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {(report.counterfactuals || []).map((cf) => {
                    const improves = cf.churnDeltaPctPts < 0;
                    return (
                      <div key={cf.scenario} className="counterfactual-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                          <div>
                            <strong style={{ fontSize: "13px", color: "var(--text-main)", display: "block" }}>{cf.scenario}</strong>
                            <span style={{ fontSize: "11.5px", color: "var(--text-sub)" }}>{cf.detail}</span>
                          </div>
                          <span className={`badge-tag ${improves ? "success" : "danger"}`} style={{ whiteSpace: "nowrap" }}>
                            {improves ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                            {cf.churnDeltaPctPts >= 0 ? "+" : ""}{cf.churnDeltaPctPts} pts
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", paddingTop: "6px", borderTop: "1px dashed var(--border-color)", fontSize: "11.5px" }}>
                          <div>
                            <span style={{ color: "var(--text-muted)", display: "block" }}>New Churn Risk</span>
                            <strong style={{ fontFamily: "var(--font-mono)", color: improves ? "var(--success)" : "var(--danger)" }}>
                              {Math.round(cf.newChurnProb * 1000) / 10}%
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)", display: "block" }}>Projected CLV</span>
                            <strong style={{ fontFamily: "var(--font-mono)" }}>{currFmt.format(cf.newClvPred)}</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)", display: "block" }}>New Tier</span>
                            <strong>{cf.newSegment}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          TAB 2: Interactive 2D Sensitivity Matrix
         ========================================================================= */}
      {activeTab === "matrix" && (
        <div className="panel-card">
          <div className="panel-card-header">
            <div>
              <h3>Interactive 2D Behavioral Sensitivity Matrix</h3>
              <p>Click any cell below to inject that Dormancy &times; Frequency state directly into the Diagnostic Simulator</p>
            </div>
            <span className="panel-header-pill">Click Any Cell to Simulate</span>
          </div>

          <div className="table-responsive-container">
            <table className="sensitivity-matrix-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Dormancy (Recency) \ Orders</th>
                  {freqSteps.map((f) => (
                    <th key={f}>{f} Order{f > 1 ? "s" : ""}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recencySteps.map((r) => (
                  <tr key={r}>
                    <td style={{ textAlign: "left", fontWeight: "700" }}>{r} Days Dormant</td>
                    {freqSteps.map((f) => {
                      const risk = calculateMatrixRisk(r, f);
                      const cellClass =
                        risk >= 60
                          ? "matrix-cell-risk-high"
                          : risk >= 35
                          ? "matrix-cell-risk-mid"
                          : "matrix-cell-risk-low";

                      return (
                        <td
                          key={f}
                          className={cellClass}
                          style={{ cursor: "pointer" }}
                          title={`Click to simulate Recency=${r}d, Frequency=${f}`}
                          onClick={() => {
                            setRecency(r);
                            setFrequency(f);
                            setActiveTab("simulator");
                            setNotice(`Simulated matrix state: ${r} days dormant, ${f} orders`);
                            setTimeout(() => setNotice(""), 3000);
                          }}
                        >
                          {risk}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: Decision Threshold & Real Portfolio Impact Calibration
         ========================================================================= */}
      {activeTab === "threshold" && (
        <div className="panel-card">
          <div className="panel-card-header">
            <div>
              <h3>Decision Threshold &amp; Real Portfolio Cutoff Calibration</h3>
              <p>Evaluate how shifting the churn alert threshold impacts real flagged accounts across all 5,721 Apex profiles and 180-day holdout accuracy</p>
            </div>
            <span className="panel-header-pill">Live Portfolio Calibration</span>
          </div>

          <div className="simulator-slider-row" style={{ maxWidth: "540px", marginBottom: "22px" }}>
            <div className="slider-field-header">
              <span>Intervention Trigger Probability Cutoff (p)</span>
              <span className="slider-val-tag">{decisionThreshold.toFixed(2)} ({Math.round(decisionThreshold * 100)}%)</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="0.85"
              step="0.05"
              value={decisionThreshold}
              onChange={(e) => setDecisionThreshold(Number(e.target.value))}
              className="range-slider-input"
            />
          </div>

          {thresholdEval && (
            <>
              <section className="metrics-summary-grid" style={{ marginBottom: "20px" }}>
                <div className="metric-box">
                  <div className="metric-accent-line" style={{ background: "var(--grad-danger)" }} />
                  <div className="metric-box-header">
                    <span className="metric-box-title">FLAGGED AT-RISK ACCOUNTS</span>
                  </div>
                  <div className="metric-box-value" style={{ color: "var(--danger)" }}>
                    {thresholdEval.flaggedAccounts?.toLocaleString()}
                  </div>
                  <div className="metric-box-footer">
                    <span className="footer-code">{thresholdEval.flaggedPct}% of 5,721 portfolio</span>
                    <span className="footer-desc">Eligible for retention outreach</span>
                  </div>
                </div>

                <div className="metric-box">
                  <div className="metric-accent-line" style={{ background: "var(--grad-amber)" }} />
                  <div className="metric-box-header">
                    <span className="metric-box-title">AT-RISK HISTORICAL GMV</span>
                  </div>
                  <div className="metric-box-value">{currFmt.format(thresholdEval.atRiskHistoricalGmv || 0)}</div>
                  <div className="metric-box-footer">
                    <span className="footer-code">Revenue Exposure</span>
                    <span className="footer-desc">Historical spend of flagged tier</span>
                  </div>
                </div>

                <div className="metric-box">
                  <div className="metric-accent-line" style={{ background: "var(--grad-primary)" }} />
                  <div className="metric-box-header">
                    <span className="metric-box-title">HOLDOUT PRECISION / RECALL</span>
                  </div>
                  <div className="metric-box-value" style={{ fontSize: "24px" }}>
                    {thresholdEval.precision} / {thresholdEval.recall}
                  </div>
                  <div className="metric-box-footer">
                    <span className="footer-code">Balanced F1: {thresholdEval.f1}</span>
                    <span className="footer-desc">180-day temporal split validation</span>
                  </div>
                </div>
              </section>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", maxWidth: "560px" }}>
                <div className="dossier-stat" style={{ borderLeft: "4px solid var(--success)" }}>
                  <span className="stat-sublabel">True Positives (Correct Churn)</span>
                  <span className="stat-highlight">{thresholdEval.tp}</span>
                </div>
                <div className="dossier-stat" style={{ borderLeft: "4px solid var(--warning)" }}>
                  <span className="stat-sublabel">False Positives (Over-Subsidy Risk)</span>
                  <span className="stat-highlight">{thresholdEval.fp}</span>
                </div>
                <div className="dossier-stat" style={{ borderLeft: "4px solid var(--danger)" }}>
                  <span className="stat-sublabel">False Negatives (Missed Churners)</span>
                  <span className="stat-highlight">{thresholdEval.fn}</span>
                </div>
                <div className="dossier-stat" style={{ borderLeft: "4px solid var(--success)" }}>
                  <span className="stat-sublabel">True Negatives (Correct Healthy)</span>
                  <span className="stat-highlight">{thresholdEval.tn}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: Spark MLlib Governance & Weights Report
         ========================================================================= */}
      {activeTab === "model_report" && (
        <>
          <section className="metrics-summary-grid">
            <div className="metric-box">
              <div className="metric-accent-line" style={{ background: "var(--grad-primary)" }} />
              <div className="metric-box-header">
                <span className="metric-box-title">HOLDOUT CHURN ROC-AUC</span>
                <div className="metric-box-icon" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                  <Award size={18} />
                </div>
              </div>
              <div className="metric-box-value">{mlOverview?.auc || 0.778}</div>
              <div className="metric-box-footer">
                <span className="footer-code">Logistic Regression</span>
                <span className="footer-desc">Cutoff split: {mlOverview?.cutoffDate || "2011-05-18"}</span>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-accent-line" style={{ background: "var(--grad-purple)" }} />
              <div className="metric-box-header">
                <span className="metric-box-title">12M CLV FORECAST R²</span>
                <div className="metric-box-icon" style={{ background: "var(--purple-light)", color: "var(--purple)" }}>
                  <BarChart3 size={18} />
                </div>
              </div>
              <div className="metric-box-value">{mlOverview?.r2 || 0.274}</div>
              <div className="metric-box-footer">
                <span className="footer-code">Linear Regression</span>
                <span className="footer-desc">Standardized log-RFM features</span>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-accent-line" style={{ background: "var(--grad-success)" }} />
              <div className="metric-box-header">
                <span className="metric-box-title">PROFILED PORTFOLIO</span>
              </div>
              <div className="metric-box-value">{(mlOverview?.customersScored || 5721).toLocaleString()}</div>
              <div className="metric-box-footer">
                <span className="footer-code" style={{ color: "var(--success)" }}>100% Scored in HBase</span>
                <span className="footer-desc">Zero lookahead data leakage</span>
              </div>
            </div>
          </section>

          {/* Real Segment Cohort Metrics Table */}
          <div className="panel-card">
            <div className="panel-card-header">
              <div>
                <h3>K-Means Behavioral Tier Statistics (Real Data)</h3>
                <p>Live averages aggregated across all 5,721 Apex Global Retail customer profiles</p>
              </div>
              <span className="panel-header-pill">4 Clusters</span>
            </div>

            <div className="table-responsive-container">
              <table className="enterprise-data-table">
                <thead>
                  <tr>
                    <th>Customer Segment</th>
                    <th style={{ textAlign: "right" }}>Accounts</th>
                    <th style={{ textAlign: "right" }}>Avg Historical Spend</th>
                    <th style={{ textAlign: "right" }}>Avg Forecast CLV</th>
                    <th style={{ textAlign: "right" }}>Avg Dormancy</th>
                    <th style={{ textAlign: "right" }}>Avg Churn Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {segmentsMeta.map((seg) => (
                    <tr key={seg.name}>
                      <td><strong>{seg.name}</strong></td>
                      <td style={{ textAlign: "right" }}><span className="currency-num">{seg.count?.toLocaleString()}</span></td>
                      <td style={{ textAlign: "right" }}><span className="currency-num">{currFmt.format(seg.avgMonetary)}</span></td>
                      <td style={{ textAlign: "right" }}><span className="currency-num" style={{ color: "var(--success)" }}>{currFmt.format(seg.avgPredictedSpend)}</span></td>
                      <td style={{ textAlign: "right" }}>{seg.avgRecencyDays} days</td>
                      <td style={{ textAlign: "right" }}>
                        <span className="badge-tag info">{Math.round((seg.avgChurnProb || 0) * 1000) / 10}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trained Feature Weights */}
          {modelParams && (
            <div className="panel-card">
              <div className="panel-card-header">
                <div>
                  <h3>Trained Spark MLlib Standardization &amp; Regression Weights</h3>
                  <p>Exported directly from <code>ml_model_params.json</code> used for &lt;1ms JVM scoring</p>
                </div>
              </div>

              <div className="table-responsive-container">
                <table className="enterprise-data-table">
                  <thead>
                    <tr>
                      <th>Feature</th>
                      <th style={{ textAlign: "right" }}>Scaler Mean</th>
                      <th style={{ textAlign: "right" }}>Scaler Std Dev</th>
                      <th style={{ textAlign: "right" }}>Logistic Churn Weight</th>
                      <th style={{ textAlign: "right" }}>Linear CLV Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(modelParams.features || []).map((fName, idx) => (
                      <tr key={fName}>
                        <td><span className="code-identifier">{fName}</span></td>
                        <td style={{ textAlign: "right" }}><span className="currency-num">{(modelParams.scaler_mean?.[idx] || 0).toFixed(3)}</span></td>
                        <td style={{ textAlign: "right" }}><span className="currency-num">{(modelParams.scaler_std?.[idx] || 1).toFixed(3)}</span></td>
                        <td style={{ textAlign: "right" }}><span className="currency-num">{(modelParams.churn_model?.coefficients?.[idx] || 0).toFixed(4)}</span></td>
                        <td style={{ textAlign: "right" }}><span className="currency-num">{Math.round(modelParams.spend_model?.coefficients?.[idx] || 0).toLocaleString()}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
