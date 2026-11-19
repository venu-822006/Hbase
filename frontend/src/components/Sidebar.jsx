import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  RotateCcw,
  BrainCircuit,
  Megaphone,
  Database,
  Layers,
  Server,
  Activity,
} from "lucide-react";

const navLinks = [
  { name: "Overview 360", path: "/", icon: LayoutDashboard, badge: "Live" },
  { name: "Customer Directory", path: "/customers", icon: Users, badge: "5,721" },
  { name: "Invoiced Orders", path: "/orders", icon: ShoppingBag, badge: "34.2K" },
  { name: "Returns & Cancels", path: "/cancellations", icon: RotateCcw, badge: "7.5K" },
  { name: "ML & Simulator", path: "/segmentation", icon: BrainCircuit, badge: "MLlib" },
  { name: "Closed-Loop CRM", path: "/campaigns", icon: Megaphone, badge: "Offers" },
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
          <h2>HBase CRM</h2>
          <span>DATA WAREHOUSE MVP</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="sidebar-section-label">CORE MODULES</div>
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
              <Icon size={17} />
            </div>
            <span className="nav-label">{name}</span>
            {badge && <span className="nav-counter-tag">{badge}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Cluster & Architecture Status Card */}
      <div className="cluster-health-card">
        <div className="cluster-header">
          <Server size={14} />
          <span>Warehouse Infrastructure</span>
        </div>

        <div className="tech-badge-container">
          <span className="infra-pill pill-hbase">HBase 2.5</span>
          <span className="infra-pill pill-spark">Spark 3.5</span>
          <span className="infra-pill pill-kafka">Kafka 3.6</span>
          <span className="infra-pill pill-spring">Spring Boot</span>
        </div>

        <div className="cluster-meta-row">
          <div className="meta-dot online" />
          <span className="meta-text">HBase NoSQL Cluster Online</span>
        </div>
        <div className="cluster-meta-sub">
          Dataset: UK Retail (No Synthetic Data)
        </div>
      </div>

      {/* User / Role Card */}
      <div className="sidebar-user-card">
        <div className="user-avatar-initials">AD</div>
        <div className="user-details">
          <strong>CRM Data Lead</strong>
          <span>Admin / Read-Write</span>
        </div>
      </div>
    </aside>
  );
}
