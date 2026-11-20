import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Command,
  Users,
  BrainCircuit,
  Megaphone,
  ShoppingBag,
  RotateCcw,
  LayoutDashboard,
  Moon,
  Sun,
  Download,
  Flame,
  ArrowRight,
  Sparkles,
  X,
} from "lucide-react";

export default function CommandPalette({ isOpen, onClose, theme, setTheme, onSync }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const defaultActions = [
    {
      id: "nav-dash",
      category: "Navigation",
      title: "Overview 360",
      sub: "Executive metrics, revenue velocity & retention overview",
      icon: LayoutDashboard,
      action: () => navigate("/"),
    },
    {
      id: "nav-cust",
      category: "Navigation",
      title: "Customer Directory 360",
      sub: "Explore all 5,721 customer profiles, RFM tiers & risk scores",
      icon: Users,
      action: () => navigate("/customers"),
    },
    {
      id: "nav-sim",
      category: "Navigation",
      title: "Predictive Studio & Simulator",
      sub: "Interactive What-If account modeling, retention scoring & CLV",
      icon: BrainCircuit,
      action: () => navigate("/segmentation"),
    },
    {
      id: "nav-camp",
      category: "Navigation",
      title: "Automated Retention Campaigns",
      sub: "Active win-back incentives, loyalty rewards & dispatch engine",
      icon: Megaphone,
      action: () => navigate("/campaigns"),
    },
    {
      id: "nav-orders",
      category: "Navigation",
      title: "Transaction Explorer",
      sub: "Inspect 34,191 invoiced sales orders and basket statistics",
      icon: ShoppingBag,
      action: () => navigate("/orders"),
    },
    {
      id: "nav-returns",
      category: "Navigation",
      title: "Risk Signals & Returns",
      sub: "7,517 isolated return signals and churn correlations",
      icon: RotateCcw,
      action: () => navigate("/cancellations"),
    },
    {
      id: "act-risk",
      category: "Quick Actions",
      title: "Filter High Churn Risk Accounts (>70%)",
      sub: "Jump directly to the 2,402 accounts requiring immediate intervention",
      icon: Flame,
      badge: "High Priority",
      action: () => navigate("/customers?filter=high_risk"),
    },
    {
      id: "act-vip",
      category: "Quick Actions",
      title: "Explore Premium & Loyal VIPs",
      sub: "View high-net-worth accounts contributing top 40% of revenue",
      icon: Sparkles,
      badge: "Loyalty",
      action: () => navigate("/customers?filter=vip"),
    },
    {
      id: "act-theme",
      category: "Quick Actions",
      title: theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode",
      sub: `Toggle platform appearance (${theme === "light" ? "Obsidian" : "Linen Warm"})`,
      icon: theme === "light" ? Moon : Sun,
      action: () => setTheme(theme === "light" ? "dark" : "light"),
    },
  ];

  // Specific customer accounts for rapid jump
  const topAccounts = [
    { id: "C014095", country: "United Kingdom", seg: "Loyal", risk: "28%", clv: "₹2,640" },
    { id: "C014911", country: "United Kingdom", seg: "Premium", risk: "12%", clv: "₹7,810" },
    { id: "C012748", country: "United Kingdom", seg: "Regular", risk: "45%", clv: "₹1,420" },
    { id: "C017841", country: "United Kingdom", seg: "Low value", risk: "84%", clv: "₹380" },
    { id: "C013089", country: "United Kingdom", seg: "Loyal", risk: "19%", clv: "₹3,920" },
    { id: "C012415", country: "Australia", seg: "Premium", risk: "8%", clv: "₹8,450" },
    { id: "C014646", country: "Netherlands", seg: "Premium", risk: "6%", clv: "₹12,800" },
  ];

  const filteredActions = defaultActions.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.sub.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const matchedAccounts = topAccounts
    .filter((acc) =>
      acc.id.toLowerCase().includes(query.toLowerCase()) ||
      acc.country.toLowerCase().includes(query.toLowerCase()) ||
      acc.seg.toLowerCase().includes(query.toLowerCase())
    )
    .map((acc) => ({
      id: `acc-${acc.id}`,
      category: "Customer Accounts",
      title: `${acc.id} · ${acc.country}`,
      sub: `${acc.seg} Tier · Churn Risk: ${acc.risk} · Projected CLV: ${acc.clv}`,
      icon: Users,
      badge: acc.seg,
      action: () => navigate(`/customers?search=${acc.id}`),
    }));

  const allResults = [...filteredActions, ...matchedAccounts];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (allResults.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + (allResults.length || 1)) % (allResults.length || 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (allResults[selectedIndex]) {
          allResults[selectedIndex].action();
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, allResults, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette-card" onClick={(e) => e.stopPropagation()}>
        {/* Search Input Bar */}
        <div className="palette-search-row">
          <Search size={18} className="palette-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="palette-search-input"
            placeholder="Type a command, customer ID (e.g. C014095), or navigate..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          {query && (
            <button className="palette-clear-btn" onClick={() => setQuery("")}>
              <X size={14} />
            </button>
          )}
          <kbd className="palette-kbd">ESC</kbd>
        </div>

        {/* Results List */}
        <div className="palette-results-list">
          {allResults.length === 0 ? (
            <div className="palette-empty-state">
              <p>No matching commands or customer profiles found for &quot;{query}&quot;</p>
              <span>Try searching for &quot;simulate&quot;, &quot;high risk&quot;, or &quot;C014095&quot;</span>
            </div>
          ) : (
            allResults.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`palette-item ${isSelected ? "selected" : ""}`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                >
                  <div className="palette-item-icon-box">
                    <Icon size={16} />
                  </div>
                  <div className="palette-item-content">
                    <div className="palette-item-title-row">
                      <span className="palette-item-title">{item.title}</span>
                      {item.badge && <span className="palette-item-badge">{item.badge}</span>}
                    </div>
                    <span className="palette-item-sub">{item.sub}</span>
                  </div>
                  <ArrowRight size={14} className="palette-item-arrow" />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="palette-footer">
          <div className="palette-shortcut-hint">
            <kbd>↑</kbd> <kbd>↓</kbd> to navigate
          </div>
          <div className="palette-shortcut-hint">
            <kbd>↵</kbd> to select
          </div>
          <div className="palette-shortcut-hint">
            <kbd>ESC</kbd> to close
          </div>
        </div>
      </div>
    </div>
  );
}
