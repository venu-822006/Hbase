import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BrainCircuit,
  Megaphone,
  ShoppingBag,
  RotateCcw,
  Sparkles,
  Activity,
  Database,
  Layers,
  Server,
  Package,
} from "lucide-react";
import VoiceWave from "./VoiceWave";

const navLinks = [
  { name: "Overview 360", path: "/", icon: LayoutDashboard, badge: "Live" },
  { name: "Customer Directory", path: "/customers", icon: Users, badge: "5,721" },
  { name: "Products & SKUs", path: "/products", icon: Package, badge: "4.7K" },
  { name: "Predictive Studio", path: "/segmentation", icon: BrainCircuit, badge: "What-If" },
  { name: "Retention Campaigns", path: "/campaigns", icon: Megaphone, badge: "3,894" },
  { name: "Invoiced Orders", path: "/orders", icon: ShoppingBag, badge: "34.2K" },
  { name: "Returns & Signals", path: "/cancellations", icon: RotateCcw, badge: "7.5K" },
  { name: "Warehouse & Lineage", path: "/warehouse", icon: Layers, badge: "8 Tiers" },
];

export default function Sidebar() {
  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon-box">
          <Database size={20} />
        </div>
        <div className="brand-title-group">
          <h2>HBASE CRM</h2>
          <span>BIG DATA INTELLIGENCE</span>
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

      {/* Cluster Health & Live Streams */}
      <div className="cluster-health-card">
        <div className="cluster-header">
          <Server size={13} color="var(--primary)" />
          <span>HBase Cluster Status</span>
        </div>

        <div className="portfolio-stat-rows">
          <div className="portfolio-stat-item">
            <span className="stat-label">HBase Master</span>
            <span className="stat-val" style={{ color: "var(--success)" }}>Port 16010 Active</span>
          </div>
          <div className="portfolio-stat-item">
            <span className="stat-label">HDFS Storage</span>
            <span className="stat-val">5,721 Profiles</span>
          </div>
          <div className="portfolio-stat-item">
            <span className="stat-label">Critical Churn</span>
            <span className="stat-val highlight-danger">2,402 Accounts</span>
          </div>
        </div>

        <div className="cluster-meta-row">
          <div className="meta-dot online" />
          <span className="meta-text" style={{ flex: 1 }}>ZooKeeper :2181</span>
          <VoiceWave count={3} color="var(--success)" />
        </div>
        <div className="cluster-meta-sub">
          Apache HBase 2.5 • Hadoop 3.3
        </div>
      </div>

      {/* User / Director Card */}
      <div className="sidebar-user-card">
        <div className="user-avatar-initials">HC</div>
        <div className="user-details">
          <strong>Big Data Director</strong>
          <span>Real-Time Retention SLA</span>
        </div>
      </div>
    </aside>
  );
}
