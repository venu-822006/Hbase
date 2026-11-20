import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import CommandPalette from "./CommandPalette";

export default function Layout() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("crm_theme") || "light";
  });
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("crm_theme", theme);
  }, [theme]);

  // Global keyboard shortcut: Cmd+K / Ctrl+K / '/'
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      } else if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={`app-shell ${theme === "dark" ? "theme-dark" : "theme-light"}`}>
      <Sidebar />

      <div className="app-main-viewport">
        <Topbar
          theme={theme}
          setTheme={setTheme}
          onOpenPalette={() => setPaletteOpen(true)}
          onSyncSuccess={() => {
            window.dispatchEvent(new Event("crm_data_synced"));
          }}
        />

        <main className="app-page-container">
          <Outlet />
        </main>

        <footer className="app-footer">
          <div className="footer-left">
            <span><b>Aura 360</b> · Autonomous Customer Retention & Value Optimization</span>
            <span className="dot-divider">•</span>
            <span>Real UK Retail Transactions · Zero Synthetic Labels · Real-Time Intelligence</span>
          </div>
          <div className="footer-right">
            <span className="footer-status-tag">5,721 Active Accounts Profiled</span>
            <span className="footer-status-tag">Inference Latency &lt; 1ms</span>
          </div>
        </footer>
      </div>

      {/* Universal Command Palette */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        theme={theme}
        setTheme={setTheme}
        onSync={() => window.dispatchEvent(new Event("crm_data_synced"))}
      />
    </div>
  );
}
