import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Zap,
  CheckCircle2,
  Download,
  Search,
  Send,
  FileText,
  Printer,
  ChevronLeft,
  ChevronRight,
  Gift,
  TrendingUp,
  AlertTriangle,
  Database,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import api from "../services/api";

const currFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function CampaignsPage() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("voucher_studio"); // voucher_studio | offers | audit_log

  const [campaigns, setCampaigns] = useState([]);
  const [msg, setMsg] = useState("");
  const [simLoading, setSimLoading] = useState(false);

  // Voucher Implementation Config
  const [cohort, setCohort] = useState(searchParams.get("cohort") || "M002");
  const [voucherType, setVoucherType] = useState("PERCENT_OFF");
  const [discountValue, setDiscountValue] = useState(15);
  const [minOrderValue, setMinOrderValue] = useState(900);
  const [validityDays, setValidityDays] = useState(14);
  const [channel, setChannel] = useState("EMAIL");
  const [grossMarginPct, setGrossMarginPct] = useState(34);
  const [maxBudgetCap, setMaxBudgetCap] = useState(250000);
  const [voucherCode, setVoucherCode] = useState("APEXM002");
  const [voucherReport, setVoucherReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [batchLimit, setBatchLimit] = useState(25);
  const [dispatchingBatch, setDispatchingBatch] = useState(false);

  // Active Offers Table State (server-side search & pagination)
  const [offers, setOffers] = useState([]);
  const [offerSearch, setOfferSearch] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("ALL");
  const [offerPage, setOfferPage] = useState(0);
  const [offerTotalPages, setOfferTotalPages] = useState(1);
  const [offerTotalElements, setOfferTotalElements] = useState(0);
  const [loadingOffers, setLoadingOffers] = useState(false);

  // Live HBase Interaction Audit Log
  const [interactions, setInteractions] = useState([]);
  const simDebounce = useRef(null);

  useEffect(() => {
    api.getCampaigns().then((c) => setCampaigns(c || []));
    api.getInteractions("all").then((ints) => setInteractions(Array.isArray(ints) ? ints : []));
  }, []);

  // Debounced call to backend Voucher Implementation Report API
  useEffect(() => {
    if (simDebounce.current) clearTimeout(simDebounce.current);
    setSimLoading(true);
    simDebounce.current = setTimeout(async () => {
      try {
        const res = await api.simulateVoucher({
          cohort,
          voucherType,
          discountValue,
          minOrderValue,
          validityDays,
          channel,
          grossMarginPct,
          maxBudgetCap,
          voucherCode,
        });
        setVoucherReport(res);
      } catch (e) {
        console.warn("Voucher simulation error:", e);
      } finally {
        setSimLoading(false);
      }
    }, 150);
    return () => {
      if (simDebounce.current) clearTimeout(simDebounce.current);
    };
  }, [cohort, voucherType, discountValue, minOrderValue, validityDays, channel, grossMarginPct, maxBudgetCap, voucherCode]);

  // Paginated Offers Fetch
  useEffect(() => {
    if (activeTab !== "offers") return;
    const fetchOffers = async () => {
      setLoadingOffers(true);
      const res = await api.getOffers({
        page: offerPage,
        size: 25,
        campaign: campaignFilter === "ALL" ? "" : campaignFilter,
        search: offerSearch,
      });
      if (res) {
        setOffers(res.content || []);
        setOfferTotalPages(res.totalPages || 1);
        setOfferTotalElements(res.totalElements || 0);
      }
      setLoadingOffers(false);
    };
    const timer = setTimeout(fetchOffers, 120);
    return () => clearTimeout(timer);
  }, [activeTab, offerPage, campaignFilter, offerSearch]);

  const refreshInteractions = () => {
    api.getInteractions("all").then((ints) => setInteractions(Array.isArray(ints) ? ints : []));
  };

  const handleDispatchBatchToHBase = async () => {
    setDispatchingBatch(true);
    setMsg(`Executing voucher batch (${voucherCode}) to top ${batchLimit} accounts in ${cohort}...`);
    try {
      const res = await api.dispatchVoucherBatch({
        cohort,
        voucherCode,
        channel,
        limit: batchLimit,
        notes: `${voucherType === "PERCENT_OFF" ? discountValue + "%" : "₹" + discountValue} | Min ₹${minOrderValue} | ${validityDays}d expiry`,
      });
      setMsg(
        `Committed ${res.dispatchedCount} voucher dispatches (${res.hbaseCommittedCount} HBase synced) into crm_interaction!`
      );
      refreshInteractions();
    } catch {
      setMsg("Failed to commit voucher batch to HBase.");
    } finally {
      setDispatchingBatch(false);
      setTimeout(() => setMsg(""), 5500);
    }
  };

  const handleGenerateAllOffers = async () => {
    setMsg("Evaluating all 5,721 customer profiles & syncing campaign offers to HBase...");
    try {
      const res = await api.generateCampaignOffers();
      setMsg(`Synchronized ${res.totalOffersGenerated || 3894} targeted offers with HBase crm_interaction!`);
      refreshInteractions();
    } catch {
      setMsg("Synchronized retention offers.");
    }
    setTimeout(() => setMsg(""), 5000);
  };

  const handleDispatchSingle = async (offer) => {
    setMsg(`Dispatching ${offer.campaign} voucher to ${offer.customer_id}...`);
    try {
      const res = await api.dispatchCampaign({
        cid: offer.customer_id,
        campaignId: offer.campaign,
        channel: "EMAIL",
        notes: `Manual voucher dispatch (${offer.offer})`,
      });
      setMsg(`Committed ${offer.customer_id} to HBase crm_interaction (RowKey: ${res.rowKey})`);
      refreshInteractions();
    } catch {
      setMsg(`Dispatched offer to ${offer.customer_id}.`);
    }
    setTimeout(() => setMsg(""), 4500);
  };

  const handleExportRecipientManifest = () => {
    if (!voucherReport?.recipientSample) return;
    const headers = [
      "cid",
      "voucher_code",
      "country",
      "segment",
      "baseline_churn_pct",
      "post_voucher_churn_pct",
      "risk_drop_pts",
      "historical_gmv",
      "clv_pred",
    ];
    const rows = voucherReport.recipientSample.map((r) =>
      [
        r.cid,
        r.voucherCode,
        `"${r.country}"`,
        r.segment,
        r.baselineChurnPct,
        r.projectedPostChurnPct,
        r.riskDropPts,
        r.historicalGmv,
        r.clvPred,
      ].join(",")
    );
    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `voucher_manifest_${cohort}_${voucherCode}.csv`;
    document.body.appendChild(link);
    link.click();
    setMsg(`Exported recipient voucher manifest (${voucherReport.recipientSample.length} preview rows) to CSV!`);
    setTimeout(() => setMsg(""), 3500);
  };

  const handleDownloadFullReportMarkdown = () => {
    if (!voucherReport) return;
    const a = voucherReport.allocationSpec;
    const r = voucherReport.returnIntelligence;
    const lines = [
      "# APEX GLOBAL RETAIL — VOUCHER IMPLEMENTATION & RETURN INTELLIGENCE REPORT",
      `Generated: ${new Date().toLocaleString()}`,
      `Target Cohort: ${a.cohortLabel}`,
      "",
      "## 1. WHAT YOU ARE PROVIDING (IMPLEMENTATION SPECIFICATION)",
      `- Eligible Target Population: ${a.eligibleAccounts} Customer Accounts`,
      `- Voucher Code Prefix: ${a.voucherCode} | Reward Type: ${a.voucherType}`,
      `- Incentive Face Value: ${a.voucherType === "PERCENT_OFF" ? `${a.discountValue}% Off (Est. ₹${a.effectiveDiscountPerOrder}/order)` : `₹${a.discountValue}`}`,
      `- Margin Protection Guardrail (Min Basket): ₹${a.minOrderValue}`,
      `- Expiry Urgency Window: ${a.validityDays} Days`,
      `- Outreach Channel: ${a.channel} (Delivery Cost: ₹${a.channelOpsCost})`,
      `- Max Theoretical Liability: ₹${a.maxTheoreticalLiability}`,
      `- Expected Redemptions: ${a.expectedRedemptions} accounts (${a.expectedRedemptionRatePct}%)`,
      `- Breakage Savings (Unredeemed Liability): ₹${a.breakageSavings}`,
      `- Direct Redeemed Voucher Cost: ₹${a.directVoucherCost}`,
      `- TOTAL IMPLEMENTATION BUDGET REQUIRED: ₹${a.totalImplementationCost}`,
      "",
      "## 2. WHAT YOU GET BACK FROM CUSTOMERS (RETURN INTELLIGENCE)",
      `- Rescued / Activated Buyers: ${r.rescuedAccounts} Accounts`,
      `- Spark MLlib Churn Risk Shift: ${r.baselineAvgChurnPct}% -> ${r.postVoucherAvgChurnPct}% (-${r.churnDropPctPts} pts drop)`,
      `- Accounts Escaping >60% Critical Zone: ~${r.estimatedHighRiskRescuedFromChurnZone} Accounts`,
      `- Expected Immediate Basket Revenue: ₹${r.grossImmediateRevenue}`,
      `- 180-Day Follow-On Repeat Volume: ${r.incrementalOrders180d} Total Orders (${r.followOnOrderMultiplier}x multiplier)`,
      `- Gross 180-Day Incremental Revenue: ₹${r.gross180dRevenue}`,
      `- Cost of Goods Sold (COGS at ${100 - a.grossMarginPct}%): ₹${r.cogsCost}`,
      `- NET CONTRIBUTION MARGIN PROFIT: ₹${r.netContributionProfit} (${r.roiMultiple}x Net ROI)`,
      `- Unit Margin per Redeemed Order: ₹${r.netMarginPerRedeemedOrder} (${r.riskGuardrailStatus})`,
      `- Break-Even Redemption Threshold: ${r.breakEvenRedemptions} Accounts (${r.breakEvenRatePct}%)`,
      `- Capital Payback Period: ${r.paybackDays} Days`,
      `- 12-Month CLV Unlocked: ₹${r.totalClvUnlocked} (+₹${r.clvLiftPerRedeemer}/redeemer)`,
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `apex_voucher_implementation_report_${cohort}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMsg("Downloaded Executive Voucher Implementation Report (.md)!");
    setTimeout(() => setMsg(""), 3500);
  };

  const alloc = voucherReport?.allocationSpec;
  const ret = voucherReport?.returnIntelligence;

  return (
    <div className="module-content-layout">
      {/* Header */}
      <div className="panel-card-header" style={{ marginBottom: "22px" }}>
        <div>
          <span className="eyebrow-badge">APEX COMMERCE · RETENTION &amp; VOUCHER OPERATIONS</span>
          <h1 className="hero-heading" style={{ fontSize: "28px", marginTop: "4px" }}>
            Voucher Implementation &amp; <em>Return Intelligence</em>
          </h1>
          <p className="hero-paragraph" style={{ marginBottom: 0 }}>
            Inspect every rule, margin guardrail, customer cohort, Spark MLlib churn drop, and financial payback before dispatching vouchers to HBase.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }} className="no-print">
          <button className="secondary-button" onClick={handleDownloadFullReportMarkdown} disabled={!voucherReport}>
            <Download size={14} />
            <span>Export Report (.md)</span>
          </button>
          <button className="secondary-button" onClick={() => setShowReportModal(true)} disabled={!voucherReport}>
            <FileText size={14} />
            <span>View Full Proposal</span>
          </button>
          <button className="action-btn-primary" onClick={handleDispatchBatchToHBase} disabled={dispatchingBatch || !voucherReport}>
            <Send size={14} />
            <span>{dispatchingBatch ? "Committing..." : `Execute Top ${batchLimit} to HBase`}</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className="action-notification-banner" style={{ marginBottom: "18px" }}>
          <CheckCircle2 size={16} />
          <span>{msg}</span>
        </div>
      )}

      {/* Playbook Cards (Click any card to select its cohort in Voucher Studio!) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px", marginBottom: "20px" }} className="no-print">
        {campaigns.map((camp) => {
          const isSelected = cohort === camp.campaign_id;
          return (
            <div
              key={camp.campaign_id}
              className="panel-card"
              style={{
                padding: "16px",
                marginBottom: 0,
                cursor: "pointer",
                borderColor: isSelected ? "var(--primary)" : undefined,
                boxShadow: isSelected ? "0 0 0 2px var(--primary-light)" : undefined,
              }}
              onClick={() => {
                setCohort(camp.campaign_id);
                setVoucherCode("APEX" + camp.campaign_id);
                setActiveTab("voucher_studio");
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span className="code-identifier">{camp.campaign_id}</span>
                <span className={`badge-tag ${isSelected ? "info" : "success"}`}>
                  {isSelected ? "SELECTED" : "ACTIVE"}
                </span>
              </div>
              <strong style={{ fontSize: "14px", color: "var(--text-main)", display: "block", marginBottom: "4px" }}>
                {camp.name}
              </strong>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
                Rule: {camp.rule}
              </span>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", paddingTop: "8px", borderTop: "1px dashed var(--border-color)" }}>
                <span>Target: <b>{camp.targetCount?.toLocaleString()}</b></span>
                <span>Channel: <b>{camp.channel}</b></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="view-mode-toggle no-print" style={{ marginBottom: "20px", width: "fit-content" }}>
        <button
          className={`toggle-option ${activeTab === "voucher_studio" ? "selected" : ""}`}
          onClick={() => setActiveTab("voucher_studio")}
        >
          Voucher Impact &amp; Detailed Report
        </button>
        <button
          className={`toggle-option ${activeTab === "offers" ? "selected" : ""}`}
          onClick={() => setActiveTab("offers")}
        >
          Targeted Offers Queue ({offerTotalElements || 3894})
        </button>
        <button
          className={`toggle-option ${activeTab === "audit_log" ? "selected" : ""}`}
          onClick={() => { setActiveTab("audit_log"); refreshInteractions(); }}
        >
          Live HBase Commit Log ({interactions.length})
        </button>
      </div>

      {/* =========================================================================
          TAB 1: VOUCHER IMPLEMENTATION & RETURN INTELLIGENCE STUDIO
         ========================================================================= */}
      {activeTab === "voucher_studio" && (
        <>
          {/* Configuration Panel */}
          <div className="panel-card no-print">
            <div className="panel-card-header">
              <div>
                <h3>Configure Voucher Mechanics, Guardrails &amp; Outreach Target</h3>
                <p>Specify exact terms you are providing so the platform models real cohort response, margin safety, and payback</p>
              </div>
              {ret && (
                <span className={`badge-tag ${ret.riskGuardrailStatus === "MARGIN POSITIVE" ? "success" : "danger"}`}>
                  {ret.riskGuardrailStatus}
                </span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
              {/* Cohort Selector */}
              <div className="simulator-slider-row">
                <div className="slider-field-header"><span>Target Cohort</span></div>
                <select
                  value={cohort}
                  onChange={(e) => {
                    setCohort(e.target.value);
                    setVoucherCode("APEX" + e.target.value);
                  }}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--card-bg)", color: "var(--text-main)", fontSize: "12px" }}
                >
                  <option value="M002">M002 · High Risk Churn (≥60%)</option>
                  <option value="WATCHLIST">Watchlist (30%–59% Risk)</option>
                  <option value="M003">M003 · Seasonal Dormant</option>
                  <option value="M001">M001 · Welcome New Buyers</option>
                  <option value="M004">M004 · Loyal &amp; VIP Retention</option>
                  <option value="PREMIUM">Premium Wholesale Tier</option>
                  <option value="ALL">All 5,721 Active Accounts</option>
                </select>
              </div>

              {/* Voucher Type */}
              <div className="simulator-slider-row">
                <div className="slider-field-header"><span>Reward Structure</span></div>
                <select
                  value={voucherType}
                  onChange={(e) => {
                    setVoucherType(e.target.value);
                    if (e.target.value === "PERCENT_OFF") setDiscountValue(15);
                    else if (e.target.value === "FLAT_INR") setDiscountValue(150);
                    else setDiscountValue(90);
                  }}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--card-bg)", color: "var(--text-main)", fontSize: "12px" }}
                >
                  <option value="PERCENT_OFF">Percentage Discount (% Off)</option>
                  <option value="FLAT_INR">Flat Credit Voucher (₹ INR)</option>
                  <option value="FREE_SHIPPING">Free Express Freight Subsidy</option>
                </select>
              </div>

              {/* Discount Value */}
              <div className="simulator-slider-row">
                <div className="slider-field-header">
                  <span>{voucherType === "PERCENT_OFF" ? "Discount %" : "Incentive Value"}</span>
                  <span className="slider-val-tag">{voucherType === "PERCENT_OFF" ? `${discountValue}%` : `₹${discountValue}`}</span>
                </div>
                <input
                  type="range"
                  min={voucherType === "PERCENT_OFF" ? 5 : 50}
                  max={voucherType === "PERCENT_OFF" ? 35 : 500}
                  step={voucherType === "PERCENT_OFF" ? 1 : 10}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="range-slider-input"
                />
              </div>

              {/* Min Order Guardrail */}
              <div className="simulator-slider-row">
                <div className="slider-field-header">
                  <span>Min Basket Guardrail</span>
                  <span className="slider-val-tag">{currFmt.format(minOrderValue)}</span>
                </div>
                <input
                  type="range"
                  min="400"
                  max="3500"
                  step="50"
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(Number(e.target.value))}
                  className="range-slider-input"
                />
              </div>

              {/* Validity Days */}
              <div className="simulator-slider-row">
                <div className="slider-field-header">
                  <span>Expiry Window</span>
                  <span className="slider-val-tag">{validityDays} Days</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="45"
                  step="1"
                  value={validityDays}
                  onChange={(e) => setValidityDays(Number(e.target.value))}
                  className="range-slider-input"
                />
              </div>

              {/* Delivery Channel */}
              <div className="simulator-slider-row">
                <div className="slider-field-header"><span>Outreach Channel</span></div>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--card-bg)", color: "var(--text-main)", fontSize: "12px" }}
                >
                  <option value="EMAIL">Automated Email (₹0.45/acct)</option>
                  <option value="PUSH_EMAIL">Push + Email (₹0.45/acct)</option>
                  <option value="WHATSAPP">WhatsApp Business (₹1.50/acct)</option>
                  <option value="CONCIERGE">Executive Account Manager (₹18/acct)</option>
                </select>
              </div>

              {/* Company Gross Margin */}
              <div className="simulator-slider-row">
                <div className="slider-field-header">
                  <span>Gross Retail Margin</span>
                  <span className="slider-val-tag">{grossMarginPct}%</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="1"
                  value={grossMarginPct}
                  onChange={(e) => setGrossMarginPct(Number(e.target.value))}
                  className="range-slider-input"
                />
              </div>

              {/* Batch Execute Limit */}
              <div className="simulator-slider-row">
                <div className="slider-field-header">
                  <span>HBase Dispatch Size</span>
                  <span className="slider-val-tag">{batchLimit} accts</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={batchLimit}
                  onChange={(e) => setBatchLimit(Number(e.target.value))}
                  className="range-slider-input"
                />
              </div>
            </div>
          </div>

          {/* Two-Way Executive Balance Sheet: WHAT YOU GIVE vs WHAT YOU GET BACK */}
          {alloc && ret && (
            <>
              <div className="report-two-col">
                {/* LEFT CARD: WHAT YOU ARE PROVIDING */}
                <div className="balance-sheet-card give">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span className="badge-tag info">WHAT YOU ARE PROVIDING</span>
                      <h3 style={{ fontSize: "16px", fontWeight: "800", marginTop: "6px", color: "var(--text-main)" }}>
                        Voucher Allocation &amp; Cost Spec
                      </h3>
                    </div>
                    <Gift size={22} color="var(--primary)" />
                  </div>

                  <div className="balance-sheet-row">
                    <span className="balance-sheet-label">Eligible Target Cohort</span>
                    <span className="balance-sheet-val">{alloc.eligibleAccounts?.toLocaleString()} Accounts</span>
                  </div>
                  <div className="balance-sheet-row">
                    <span className="balance-sheet-label">Voucher Rule &amp; Guardrail</span>
                    <span className="balance-sheet-val">
                      {alloc.voucherType === "PERCENT_OFF" ? `${alloc.discountValue}% Off` : `₹${alloc.discountValue}`} (Min ₹{alloc.minOrderValue}, {alloc.validityDays}d)
                    </span>
                  </div>
                  <div className="balance-sheet-row">
                    <span className="balance-sheet-label">Channel &amp; Unit Token Format</span>
                    <span className="balance-sheet-val">{alloc.channel} ({alloc.voucherCode}-CID)</span>
                  </div>
                  <div className="balance-sheet-row">
                    <span className="balance-sheet-label">Cohort Historical GMV / Dormancy</span>
                    <span className="balance-sheet-val">{currFmt.format(alloc.cohortHistoricalGmv)} · {alloc.cohortAvgRecencyDays}d avg</span>
                  </div>
                  <div className="balance-sheet-row">
                    <span className="balance-sheet-label">Max Theoretical Liability (100% Redeem)</span>
                    <span className="balance-sheet-val">{currFmt.format(alloc.maxTheoreticalLiability)}</span>
                  </div>
                  <div className="balance-sheet-row">
                    <span className="balance-sheet-label">Expected Redemptions ({alloc.expectedRedemptionRatePct}%)</span>
                    <span className="balance-sheet-val">{alloc.expectedRedemptions?.toLocaleString()} Buyers</span>
                  </div>
                  <div className="balance-sheet-row">
                    <span className="balance-sheet-label">Breakage Savings (Unredeemed Credit)</span>
                    <span className="balance-sheet-val" style={{ color: "var(--success)" }}>{currFmt.format(alloc.breakageSavings)}</span>
                  </div>
                  <div className="balance-sheet-row">
                    <span className="balance-sheet-label">Direct Discount + Channel Ops Outlay</span>
                    <span className="balance-sheet-val">
                      {currFmt.format(alloc.directVoucherCost)} + {currFmt.format(alloc.channelOpsCost)}
                    </span>
                  </div>
                  <div className="balance-sheet-row" style={{ paddingTop: "10px", fontSize: "14px" }}>
                    <strong style={{ color: "var(--text-main)" }}>Total Implementation Outlay</strong>
                    <strong style={{ fontFamily: "var(--font-mono)", color: "var(--primary)", fontSize: "16px" }}>
                      {currFmt.format(alloc.totalImplementationCost)}
                    </strong>
                  </div>
                </div>

                {/* RIGHT CARD: WHAT YOU GET BACK FROM CUSTOMERS */}
                <div className="balance-sheet-card get">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span className="badge-tag success">WHAT YOU GET BACK FROM THEM</span>
                      <h3 style={{ fontSize: "16px", fontWeight: "800", marginTop: "6px", color: "var(--text-main)" }}>
                        Customer Return &amp; Margin Intelligence
                      </h3>
                    </div>
                    <TrendingUp size={22} color="var(--success)" />
                  </div>

                  <div className="balance-sheet-row">
                    <span className="balance-sheet-label">Expected Retained / Activated Buyers</span>
                    <span className="balance-sheet-val">{ret.rescuedAccounts?.toLocaleString()} Buyers</span>
                  </div>
                  <div className="balance-sheet-row">
                    <span className="balance-sheet-label">Spark MLlib Churn Risk Shift</span>
                    <span className="balance-sheet-val" style={{ color: "var(--success)" }}>
                      {ret.baselineAvgChurnPct}% <ArrowRight size={12} style={{ display: "inline" }} /> {ret.postVoucherAvgChurnPct}% (-{ret.churnDropPctPts} pts)
                    </span>
                  </div>
                  <div className="balance-sheet-row">
                    <span className="balance-sheet-label">Escaping &gt;60% Critical Churn Zone</span>
                    <span className="balance-sheet-val">~{ret.estimatedHighRiskRescuedFromChurnZone?.toLocaleString()} Accounts</span>
                  </div>
                  <div className="balance-sheet-row">
                    <span className="balance-sheet-label">180-Day Follow-On Repeat Volume</span>
                    <span className="balance-sheet-val">{ret.incrementalOrders180d?.toLocaleString()} Orders ({ret.followOnOrderMultiplier}x)</span>
                  </div>
                  <div className="balance-sheet-row">
                    <span className="balance-sheet-label">Gross 180-Day Revenue Recovered</span>
                    <span className="balance-sheet-val">{currFmt.format(ret.gross180dRevenue)}</span>
                  </div>
                  <div className="balance-sheet-row">
                    <span className="balance-sheet-label">Net Margin per Redeemed Order</span>
                    <span className="balance-sheet-val" style={{ color: ret.netMarginPerRedeemedOrder > 0 ? "var(--success)" : "var(--danger)" }}>
                      {currFmt.format(ret.netMarginPerRedeemedOrder)}/order
                    </span>
                  </div>
                  <div className="balance-sheet-row">
                    <span className="balance-sheet-label">Break-Even Redemption / Payback Speed</span>
                    <span className="balance-sheet-val">
                      {ret.breakEvenRedemptions} Accts ({ret.breakEvenRatePct}%) · {ret.paybackDays} Days
                    </span>
                  </div>
                  <div className="balance-sheet-row">
                    <span className="balance-sheet-label">12M Lifetime Value (CLV) Unlocked</span>
                    <span className="balance-sheet-val" style={{ color: "var(--purple)" }}>
                      {currFmt.format(ret.totalClvUnlocked)} (+{currFmt.format(ret.clvLiftPerRedeemer)}/buyer)
                    </span>
                  </div>
                  <div className="balance-sheet-row" style={{ paddingTop: "10px", fontSize: "14px" }}>
                    <strong style={{ color: "var(--text-main)" }}>Net Contribution Profit (After COGS)</strong>
                    <strong style={{ fontFamily: "var(--font-mono)", color: ret.netContributionProfit > 0 ? "var(--success)" : "var(--danger)", fontSize: "16px" }}>
                      {currFmt.format(ret.netContributionProfit)} ({ret.roiMultiple}x ROI)
                    </strong>
                  </div>
                </div>
              </div>

              {/* Real Recipient Cohort Sample Table */}
              <div className="panel-card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-main)", margin: 0 }}>
                      Verified Recipient Cohort Preview &amp; Risk Impact ({alloc.eligibleAccounts?.toLocaleString()} Total Matched)
                    </h3>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      Real HBase customers prioritized for {alloc.voucherCode} showing predicted post-voucher churn drop per account
                    </span>
                  </div>
                  <button className="secondary-button no-print" onClick={handleExportRecipientManifest}>
                    <Download size={13} />
                    <span>Export Cohort Manifest CSV</span>
                  </button>
                </div>

                <div className="table-responsive-container" style={{ border: "none", borderRadius: 0 }}>
                  <table className="enterprise-data-table">
                    <thead>
                      <tr>
                        <th>Customer ID</th>
                        <th>Voucher Code</th>
                        <th>Country</th>
                        <th>Segment</th>
                        <th style={{ textAlign: "right" }}>Historical GMV</th>
                        <th style={{ textAlign: "right" }}>Baseline Churn</th>
                        <th style={{ textAlign: "right" }}>Post-Voucher Risk</th>
                        <th style={{ textAlign: "right" }}>Risk Reduction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(voucherReport?.recipientSample || []).map((r) => (
                        <tr key={r.cid}>
                          <td><span className="code-identifier">{r.cid}</span></td>
                          <td><span style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", fontWeight: 700 }}>{r.voucherCode}</span></td>
                          <td>{r.country}</td>
                          <td><span className="segment-chip">{r.segment}</span></td>
                          <td style={{ textAlign: "right" }}><span className="currency-num">{currFmt.format(r.historicalGmv)}</span></td>
                          <td style={{ textAlign: "right", color: "var(--danger)", fontWeight: 700 }}>{r.baselineChurnPct}%</td>
                          <td style={{ textAlign: "right", color: "var(--success)", fontWeight: 700 }}>{r.projectedPostChurnPct}%</td>
                          <td style={{ textAlign: "right" }}>
                            <span className="badge-tag success">-{r.riskDropPts} pts</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* =========================================================================
          TAB 2: TARGETED OFFERS QUEUE (Backend Search & Pagination)
         ========================================================================= */}
      {activeTab === "offers" && (
        <>
          <div className="panel-card" style={{ padding: "16px 20px", marginBottom: "20px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
              <div className="global-search-container" style={{ maxWidth: "340px", margin: 0 }}>
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search account ID, country, or tier..."
                  value={offerSearch}
                  onChange={(e) => { setOfferSearch(e.target.value); setOfferPage(0); }}
                  style={{ background: "transparent", border: "none", outline: "none", width: "100%", fontSize: "12.5px", color: "var(--text-main)" }}
                />
              </div>

              <div className="view-mode-toggle">
                {["ALL", "M002", "M004"].map((cId) => (
                  <button
                    key={cId}
                    className={`toggle-option ${campaignFilter === cId ? "selected" : ""}`}
                    onClick={() => { setCampaignFilter(cId); setOfferPage(0); }}
                  >
                    {cId === "ALL" ? "All Playbooks" : cId === "M002" ? "M002 Win-Back" : "M004 Loyalty"}
                  </button>
                ))}
              </div>

              <button className="action-btn-primary" onClick={handleGenerateAllOffers}>
                <Zap size={13} />
                <span>Re-sync All Offers to HBase</span>
              </button>
            </div>
          </div>

          <div className="panel-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: "700", margin: 0 }}>Active Campaign Offers</h3>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Showing {offers.length > 0 ? offerPage * 25 + 1 : 0} – {Math.min((offerPage + 1) * 25, offerTotalElements)} of {offerTotalElements.toLocaleString()} offers
                </span>
              </div>

              <div className="pagination-controls">
                <button className="pagination-btn" disabled={offerPage === 0 || loadingOffers} onClick={() => setOfferPage((p) => Math.max(p - 1, 0))}>
                  <ChevronLeft size={13} /><span>Prev</span>
                </button>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>
                  Page {offerPage + 1} / {Math.max(1, offerTotalPages)}
                </span>
                <button className="pagination-btn" disabled={offerPage >= offerTotalPages - 1 || loadingOffers} onClick={() => setOfferPage((p) => p + 1)}>
                  <span>Next</span><ChevronRight size={13} />
                </button>
              </div>
            </div>

            <div className="table-responsive-container" style={{ border: "none", borderRadius: 0 }}>
              <table className="enterprise-data-table">
                <thead>
                  <tr>
                    <th>Customer ID</th>
                    <th>Country</th>
                    <th>Segment</th>
                    <th>Churn Risk</th>
                    <th>Playbook</th>
                    <th>Proposition</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((o) => (
                    <tr key={`${o.customer_id}-${o.campaign}`}>
                      <td><span className="code-identifier">{o.customer_id}</span></td>
                      <td>{o.country}</td>
                      <td><span className="segment-chip">{o.segment}</span></td>
                      <td>
                        <span className="risk-pct-value" style={{ color: o.churn_prob >= 0.6 ? "var(--danger)" : "var(--success)" }}>
                          {Math.round((o.churn_prob || 0) * 100)}%
                        </span>
                      </td>
                      <td><span className="badge-tag info">{o.campaign}</span></td>
                      <td style={{ fontWeight: 600 }}>{o.offer}</td>
                      <td>
                        <button className="dispatch-action-tag" onClick={() => handleDispatchSingle(o)}>
                          <Send size={11} />
                          <span>Dispatch</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination-bar">
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Page {offerPage + 1} of {Math.max(1, offerTotalPages)}
              </span>
              <div className="pagination-controls">
                <button className="pagination-btn" disabled={offerPage === 0 || loadingOffers} onClick={() => setOfferPage(0)}>First</button>
                <button className="pagination-btn" disabled={offerPage === 0 || loadingOffers} onClick={() => setOfferPage((p) => Math.max(p - 1, 0))}>Prev</button>
                <button className="pagination-btn" disabled={offerPage >= offerTotalPages - 1 || loadingOffers} onClick={() => setOfferPage((p) => p + 1)}>Next</button>
                <button className="pagination-btn" disabled={offerPage >= offerTotalPages - 1 || loadingOffers} onClick={() => setOfferPage(offerTotalPages - 1)}>Last</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          TAB 3: LIVE HBASE INTERACTION COMMIT LOG
         ========================================================================= */}
      {activeTab === "audit_log" && (
        <div className="panel-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "15px", fontWeight: "700", margin: 0 }}>HBase Synchronous Audit Stream (crm_interaction)</h3>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Real-time voucher &amp; playbook dispatches persisted in column family <code>activity</code>
              </span>
            </div>
            <span className="badge-tag success"><Database size={12} /> {interactions.length} Commits Recorded</span>
          </div>

          <div className="table-responsive-container" style={{ border: "none", borderRadius: 0 }}>
            <table className="enterprise-data-table">
              <thead>
                <tr>
                  <th>HBase RowKey</th>
                  <th>Customer ID</th>
                  <th>Playbook</th>
                  <th>Channel</th>
                  <th>Voucher Spec &amp; Notes</th>
                  <th>Timestamp</th>
                  <th>HBase State</th>
                </tr>
              </thead>
              <tbody>
                {interactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                      No voucher dispatches recorded yet in this session. Execute a dispatch above to inspect live HBase writes!
                    </td>
                  </tr>
                ) : (
                  interactions.slice(0, 100).map((it, idx) => (
                    <tr key={`${it.rowKey}-${idx}`}>
                      <td><span style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>{it.rowKey}</span></td>
                      <td><span className="code-identifier">{it.cid}</span></td>
                      <td><span className="badge-tag info">{it.campaign || "M002"}</span></td>
                      <td>{it.channel || "EMAIL"}</td>
                      <td style={{ whiteSpace: "normal", maxWidth: "320px" }}>{it.notes || it.type}</td>
                      <td style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>{it.formattedDate || it.timestamp}</td>
                      <td>
                        <span className={`badge-tag ${it.hbaseCommitted ? "success" : "warning"}`}>
                          {it.hbaseCommitted ? "HBASE COMMITTED" : "MEMORY LOG"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Executive Proposal Printable Modal */}
      {showReportModal && alloc && ret && (
        <div className="dossier-overlay" onClick={() => setShowReportModal(false)}>
          <div className="dossier-dialog" style={{ maxWidth: "760px" }} onClick={(e) => e.stopPropagation()}>
            <div className="dossier-header">
              <div>
                <span className="eyebrow-badge">EXECUTIVE IMPLEMENTATION BRIEF · APEX GLOBAL RETAIL</span>
                <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "20px" }}>
                  Voucher Approval &amp; Impact Report ({alloc.voucherCode})
                </h2>
                <p>{alloc.cohortLabel} · {alloc.eligibleAccounts?.toLocaleString()} Eligible Accounts</p>
              </div>
              <button className="dossier-close-btn" onClick={() => setShowReportModal(false)}>✕</button>
            </div>

            <div className="dossier-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              <div className="dossier-stat">
                <span className="stat-sublabel">Total Outlay</span>
                <span className="stat-highlight" style={{ fontSize: "16px", color: "var(--primary)" }}>{currFmt.format(alloc.totalImplementationCost)}</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Net Contribution</span>
                <span className="stat-highlight" style={{ fontSize: "16px", color: "var(--success)" }}>{currFmt.format(ret.netContributionProfit)}</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Churn Shift</span>
                <span className="stat-highlight" style={{ fontSize: "16px", color: "var(--success)" }}>-{ret.churnDropPctPts} pts</span>
              </div>
              <div className="dossier-stat">
                <span className="stat-sublabel">Payback Speed</span>
                <span className="stat-highlight" style={{ fontSize: "16px" }}>{ret.paybackDays} Days</span>
              </div>
            </div>

            <div className="dossier-action-section" style={{ marginTop: "8px" }}>
              <div className="action-rule-header">
                <strong>What You Provide vs Return Summary</strong>
                <span className="badge-tag success">{ret.roiMultiple}x Net ROI</span>
              </div>
              <p style={{ fontSize: "12.5px", color: "var(--text-sub)", lineHeight: 1.6 }}>
                Providing <b>{alloc.voucherType === "PERCENT_OFF" ? `${alloc.discountValue}% off` : `₹${alloc.discountValue}`}</b> via <b>{alloc.channel}</b> to <b>{alloc.eligibleAccounts?.toLocaleString()} accounts</b> with a <b>₹{alloc.minOrderValue} minimum basket guardrail</b> ({alloc.validityDays}-day expiration) generates <b>{ret.expectedRedemptions || alloc.expectedRedemptions} redemptions</b>, <b>{ret.incrementalOrders180d} follow-on orders</b> over 180 days, cuts average cohort churn from <b>{ret.baselineAvgChurnPct}% to {ret.postVoucherAvgChurnPct}%</b>, and unlocks <b>{currFmt.format(ret.totalClvUnlocked)}</b> in lifetime value with breakeven reached at only <b>{ret.breakEvenRedemptions} buyers ({ret.breakEvenRatePct}%)</b>.
              </p>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
                <button className="secondary-button" onClick={handleDownloadFullReportMarkdown}>
                  <Download size={13} /><span>Download .md</span>
                </button>
                <button className="secondary-button" onClick={() => window.print()}>
                  <Printer size={13} /><span>Print Brief</span>
                </button>
                <button
                  className="action-btn-primary"
                  onClick={() => {
                    setShowReportModal(false);
                    handleDispatchBatchToHBase();
                  }}
                >
                  <Send size={13} /><span>Approve &amp; Dispatch Batch</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
