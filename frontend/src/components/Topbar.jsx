import { useState } from "react";
import { Search, Moon, Sun, RefreshCw, CheckCircle2, Sparkles, Command } from "lucide-react";
import VoiceWave from "./VoiceWave";
import api from "../services/api";

export default function Topbar({ theme, setTheme, onSyncSuccess, onOpenPalette }) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg("Synchronizing intelligence lake and re-indexing profiles...");
    try {
      await api.triggerPipeline("sync");
      setSyncMsg("Customer lake synchronized successfully!");
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
        {/* Brand Eyebrow */}
        <div className="app-brand-badge">
          <div className="brand-logo-icon">
            <Sparkles size={15} />
          </div>
          <span className="brand-name">HBASE CRM</span>
          <span className="brand-separator">/</span>
          <span className="brand-sub">INTELLIGENCE</span>
        </div>

        {/* Global Search Bar (Triggers Command Palette) */}
        <div
          className="global-search-container clickable"
          onClick={onOpenPalette}
          title="Open universal command palette (Ctrl+K or ⌘K)"
        >
          <Search size={14} className="search-icon" />
          <span className="search-placeholder">
            Search accounts (C014095), risk tiers, segments, actions...
          </span>
          <kbd className="shortcut-tag">⌘K</kbd>
        </div>
      </div>

      <div className="topbar-right">
        {/* Real-time Stream Indicator */}
        <div className="status-indicator-pill" title="Live Continuous Customer Scoring Stream">
          <span className="pulse-dot" />
          <span className="status-label">STREAM LIVE</span>
          <VoiceWave count={4} color="var(--success)" />
        </div>

        {/* Command Palette Button */}
        <button
          className="palette-trigger-btn"
          onClick={onOpenPalette}
          title="Quick command palette (⌘K)"
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

        {/* Quick Sync Action */}
        <button
          className="action-btn-primary"
          onClick={handleSync}
          disabled={syncing}
          title="Refresh intelligence store and re-index customer metrics"
        >
          <RefreshCw size={13} className={syncing ? "spin-icon" : ""} />
          <span>{syncing ? "Syncing..." : "Sync Store"}</span>
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
