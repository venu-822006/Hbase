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
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import VoiceWave from "./VoiceWave";

const navLinks = [
  { name: "Overview 360", path: "/", icon: LayoutDashboard, badge: "Live" },
  { name: "Customer Directory", path: "/customers", icon: Users, badge: "5,721" },
  { name: "Predictive Studio", path: "/segmentation", icon: BrainCircuit, badge: "What-If" },
  { name: "Retention Campaigns", path: "/campaigns", icon: Megaphone, badge: "3,894" },
  { name: "Invoiced Orders", path: "/orders", icon: ShoppingBag, badge: "34.2K" },
  { name: "Returns & Risk Signals", path: "/cancellations", icon: RotateCcw, badge: "7.5K" },
];

export default function Sidebar() {
  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon-box">
          <Sparkles size={18} />
        </div>
        <div className="brand-title-group">
          <h2>AURA 360</h2>
          <span>CUSTOMER INTELLIGENCE</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="sidebar-section-label">INTELLIGENCE PLATFORM</div>
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

      {/* Portfolio & Stream Status Card */}
      <div className="cluster-health-card">
        <div className="cluster-header">
          <Activity size={14} />
          <span>Real-Time Portfolio</span>
        </div>

        <div className="portfolio-stat-rows">
          <div className="portfolio-stat-item">
            <span className="stat-label">Active Accounts</span>
            <span className="stat-val">5,721</span>
          </div>
          <div className="portfolio-stat-item">
            <span className="stat-label">Portfolio Revenue</span>
            <span className="stat-val">₹15.89M</span>
          </div>
          <div className="portfolio-stat-item">
            <span className="stat-label">Retention Priority</span>
            <span className="stat-val highlight-danger">2,402 Accounts</span>
          </div>
        </div>

        <div className="cluster-meta-row">
          <div className="meta-dot online" />
          <span className="meta-text">Intelligence Stream Active</span>
          <VoiceWave count={3} color="var(--success)" />
        </div>
        <div className="cluster-meta-sub">
          Continuous Real-Time Scoring
        </div>
      </div>

      {/* User / Role Card */}
      <div className="sidebar-user-card">
        <div className="user-avatar-initials">AD</div>
        <div className="user-details">
          <strong>Enterprise Director</strong>
          <span>Strategic Retention & CLV</span>
        </div>
      </div>
    </aside>
  );
}
