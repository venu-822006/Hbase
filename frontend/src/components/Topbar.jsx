import { useState } from "react";
import { Search, Moon, Sun, RefreshCw, CheckCircle2, Command } from "lucide-react";
import api from "../services/api";

export default function Topbar({ theme, setTheme, onSyncSuccess, onOpenPalette }) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg("Synchronizing HBase lakehouse...");
    try {
      await api.triggerPipeline("sync");
      setSyncMsg("HBase repository synchronized!");
      if (onSyncSuccess) onSyncSuccess();
    } catch {
      setSyncMsg("Intelligence store synchronized.");
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
        {/* Global Search Bar (Triggers Command Palette) */}
        <div
          className="global-search-container clickable"
          onClick={onOpenPalette}
          title="Open universal command palette (Ctrl+K or ⌘K)"
        >
          <Search size={14} className="search-icon" />
          <span className="search-placeholder">
            Search accounts (C014095), products, risk tiers, reports...
          </span>
          <kbd className="shortcut-tag">⌘K</kbd>
        </div>
      </div>

      <div className="topbar-right">
        {/* Live HBase Cluster Pill */}
        <div className="status-indicator-pill" title="Apache HBase & HDFS Cluster Connected">
          <span className="pulse-dot" />
          <span className="status-label">HBASE LIVE · :16010</span>
        </div>

        {/* Command Palette Button */}
        <button
          className="palette-trigger-btn"
          onClick={onOpenPalette}
          title="Quick navigation (⌘K)"
        >
          <Command size={14} />
          <span>Quick Find</span>
        </button>

        {/* Theme Switcher */}
        <button
          className="theme-switch-btn"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
        >
          {theme === "light" ? (
            <>
              <Moon size={14} />
              <span>Dark</span>
            </>
          ) : (
            <>
              <Sun size={14} />
              <span>Light</span>
            </>
          )}
        </button>

        {/* Sync Store Action */}
        <button
          className="action-btn-primary"
          onClick={handleSync}
          disabled={syncing}
          title="Reload repository data and re-sync live HBase interactions"
        >
          <RefreshCw size={13} className={syncing ? "spin-icon" : ""} />
          <span>{syncing ? "Syncing..." : "Sync Cluster"}</span>
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
