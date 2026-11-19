import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import CustomersPage from "./pages/CustomersPage";
import OrdersPage from "./pages/OrdersPage";
import CancellationsPage from "./pages/CancellationsPage";
import SegmentationPage from "./pages/SegmentationPage";
import CampaignsPage from "./pages/CampaignsPage";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/cancellations" element={<CancellationsPage />} />
          <Route path="/segmentation" element={<SegmentationPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
