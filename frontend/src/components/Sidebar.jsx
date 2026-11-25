import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BrainCircuit,
  Megaphone,
  ShoppingBag,
  RotateCcw,
  Database,
  Layers,
  Server,
  Package,
} from "lucide-react";

const navLinks = [
  { name: "Overview 360", path: "/", icon: LayoutDashboard, badge: "Live" },
  { name: "Customer Directory", path: "/customers", icon: Users, badge: "5,721" },
  { name: "Products & SKUs", path: "/products", icon: Package, badge: "4.7K" },
  { name: "Predictive Studio", path: "/segmentation", icon: BrainCircuit, badge: "Reports" },
  { name: "Retention & Vouchers", path: "/campaigns", icon: Megaphone, badge: "3,894" },
  { name: "Invoiced Orders", path: "/orders", icon: ShoppingBag, badge: "34.2K" },
  { name: "Returns & Signals", path: "/cancellations", icon: RotateCcw, badge: "7.5K" },
  { name: "Warehouse & Lineage", path: "/warehouse", icon: Layers, badge: "8 Tiers" },
];

export default function Sidebar() {
  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon-box" style={{ background: "linear-gradient(135deg, #2563eb, #4f46e5)" }}>
          <Database size={18} color="#ffffff" />
        </div>
        <div className="brand-title-group">
          <h2>APEX RETAIL</h2>
          <span>NEXUS CRM CLOUD</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="sidebar-section-label">PLATFORM MODULES</div>
      <nav className="sidebar-nav-list">
        {navLinks.map(({ name, path, icon: Icon, badge }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? "active" : ""}`
            }
          >
            <div className="nav-icon-container">
              <Icon size={16} />
            </div>
            <span className="nav-label">{name}</span>
            {badge && <span className="nav-counter-tag">{badge}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Cluster Health Status */}
      <div className="cluster-health-card">
        <div className="cluster-header">
          <Server size={13} color="var(--primary)" />
          <span>Cluster Infrastructure</span>
        </div>

        <div className="portfolio-stat-rows">
          <div className="portfolio-stat-item">
            <span className="stat-label">HBase Master</span>
            <span className="stat-val" style={{ color: "var(--success)" }}>:16010 Online</span>
          </div>
          <div className="portfolio-stat-item">
            <span className="stat-label">HDFS Lake</span>
            <span className="stat-val">87.2 MB Staged</span>
          </div>
          <div className="portfolio-stat-item">
            <span className="stat-label">At-Risk Accounts</span>
            <span className="stat-val highlight-danger">2,402 Queued</span>
          </div>
        </div>

        <div className="cluster-meta-row">
          <div className="meta-dot online" />
          <span className="meta-text" style={{ flex: 1 }}>ZooKeeper :2181</span>
          <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--success)", fontWeight: 700 }}>
            &lt;2ms SLA
          </span>
        </div>
        <div className="cluster-meta-sub">
          Apache HBase 2.5 • Hadoop 3.3 • Spark MLlib
        </div>
      </div>

      {/* Enterprise Operator Card */}
      <div className="sidebar-user-card">
        <div className="user-avatar-initials" style={{ background: "linear-gradient(135deg, #2563eb, #3b82f6)", color: "#fff" }}>
          AR
        </div>
        <div className="user-details">
          <strong>Apex Retention Ops</strong>
          <span>PROD · US-EAST-01</span>
        </div>
      </div>
    </aside>
  );
}
