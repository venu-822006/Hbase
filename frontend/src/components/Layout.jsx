import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("crm_theme") || "light";
  });

  useEffect(() => {
    localStorage.setItem("crm_theme", theme);
  }, [theme]);

  return (
    <div className={`app-shell ${theme === "dark" ? "theme-dark" : "theme-light"}`}>
      <Sidebar />

      <div className="app-main-viewport">
        <Topbar
          theme={theme}
          setTheme={setTheme}
          onSyncSuccess={() => {
            // Can trigger window event or state refresh
            window.dispatchEvent(new Event("crm_data_synced"));
          }}
        />

        <main className="app-page-container">
          <Outlet />
        </main>

        <footer className="app-footer">
          <div className="footer-left">
            <span><b>HBase-Based CRM Data Warehouse</b> · Closed-Loop Architecture</span>
            <span className="dot-divider">•</span>
            <span>Apache HBase · Apache Spark ETL · PySpark MLlib · Apache Phoenix · Spring Boot</span>
          </div>
          <div className="footer-right">
            <span className="footer-status-tag">Real UK Retail Dataset</span>
            <span className="footer-status-tag">Zero Synthetic Labels</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
