import { useLocation } from "react-router-dom";
import {
  Users,
  ShoppingCart,
  RotateCcw,
  BrainCircuit,
  Megaphone,
} from "lucide-react";

const modules = {
  "/customers": {
    title: "Customer Management",
    description: "Explore customer profiles, locations and purchasing behavior.",
    icon: Users,
  },
  "/orders": {
    title: "Order Management",
    description: "Monitor invoices, transactions and order performance.",
    icon: ShoppingCart,
  },
  "/cancellations": {
    title: "Cancellation Analytics",
    description: "Analyze cancelled transactions and customer patterns.",
    icon: RotateCcw,
  },
  "/segmentation": {
    title: "Customer Intelligence",
    description: "Explore customer segments and machine learning insights.",
    icon: BrainCircuit,
  },
  "/campaigns": {
    title: "Campaign Analytics",
    description: "Analyze campaign performance and customer engagement.",
    icon: Megaphone,
  },
};

export default function ModulePage() {
  const { pathname } = useLocation();
  const current = modules[pathname] || modules["/customers"];
  const Icon = current.icon;

  return (
    <section className="module-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">CRM WORKSPACE</span>
          <h1>{current.title}</h1>
          <p>{current.description}</p>
        </div>

        <div className="heading-icon">
          <Icon size={27} />
        </div>
      </div>

      <div className="module-empty-state">
        <Icon size={38} />
        <h2>{current.title}</h2>
        <p>
          This module is being prepared for live customer lake integration.
        </p>
      </div>
    </section>
  );
}
