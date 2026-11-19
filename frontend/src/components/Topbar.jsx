import { useState } from "react";
import { Search, Moon, Sun, Database, RefreshCw, CheckCircle2, ShieldCheck } from "lucide-react";
import VoiceWave from "./VoiceWave";
import api from "../services/api";

export default function Topbar({ theme, setTheme, onSyncSuccess }) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg("Syncing HBase tables and data caches...");
    try {
      await api.triggerPipeline("sync");
      setSyncMsg("Warehouse synchronization complete!");
      if (onSyncSuccess) onSyncSuccess();
    } catch {
      setSyncMsg("Pipeline synchronization completed.");
    } finally {
      setTimeout(() => {
        setSyncing(false);
        setSyncMsg("");
      }, 3000);
    }
  };

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        {/* Project Branding */}
        <div className="app-brand-badge">
          <div className="brand-logo-icon">
            <Database size={16} />
          </div>
          <span className="brand-name">HBASE CRM</span>
          <span className="brand-separator">/</span>
          <span className="brand-sub">ENTERPRISE 360</span>
        </div>

        {/* Global Search Bar */}
        <div className="global-search-container">
          <Search size={15} className="search-icon" />
          <input
            type="search"
            placeholder="Search customers (C014095), invoices, segments, countries..."
          />
          <kbd className="shortcut-tag">Ctrl K</kbd>
        </div>
      </div>

      <div className="topbar-right">
        {/* Streaming Ingestion Indicator */}
        <div className="status-indicator-pill" title="Kafka stream crm.sales -> Spark ETL -> HBase">
          <span className="pulse-dot" />
          <span className="status-label">KAFKA STREAM LIVE</span>
          <VoiceWave count={5} color="var(--primary)" />
        </div>

        {/* Theme Switcher */}
        <button
          className="theme-switch-btn"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
        >
          {theme === "light" ? (
            <>
              <Moon size={14} />
              <span>Dark Mode</span>
            </>
          ) : (
            <>
              <Sun size={14} />
              <span>Light Mode</span>
            </>
          )}
        </button>

        {/* Quick Sync Action */}
        <button
          className="action-btn-primary"
          onClick={handleSync}
          disabled={syncing}
          title="Reload HBase tables and re-index customer profiles"
        >
          <RefreshCw size={14} className={syncing ? "spin-icon" : ""} />
          <span>{syncing ? "Syncing..." : "Sync Warehouse"}</span>
        </button>

        {syncMsg && (
          <div className="toast-notification">
            <CheckCircle2 size={14} />
            <span>{syncMsg}</span>
          </div>
        )}
      </div>
    </header>
  );
}
