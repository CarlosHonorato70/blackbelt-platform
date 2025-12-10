import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { TenantProvider } from "./contexts/TenantContext";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <TenantProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Router>
    </TenantProvider>
  );
}
