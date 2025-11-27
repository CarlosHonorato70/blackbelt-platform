import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import People from "@/pages/People";
import RiskAssessments from "@/pages/RiskAssessments";
import RiskAssessmentForm from "@/pages/RiskAssessmentForm";
import Sectors from "@/pages/Sectors";
import Tenants from "@/pages/Tenants";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import ComplianceReports from "./pages/ComplianceReports";
import UserInvites from "./pages/UserInvites";
import RolesPermissions from "./pages/RolesPermissions";
import AuditLogs from "./pages/AuditLogs";
import DataExport from "./pages/DataExport";
import TestDashboard from "./pages/TestDashboard";
import Help from "./pages/Help";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/compliance-reports"} component={ComplianceReports} />
      <Route path={"/user-invites"} component={UserInvites} />
      <Route path={"/roles-permissions"} component={RolesPermissions} />
      <Route path={"/audit-logs"} component={AuditLogs} />
      <Route path={"/data-export"} component={DataExport} />
      <Route path={"/test-dashboard"} component={TestDashboard} />
      <Route path={"/help"} component={Help} />
      <Route path={"/tenants"} component={Tenants} />
      <Route path={"/sectors"} component={Sectors} />
      <Route path={"/people"} component={People} />
      <Route path={"/risk-assessments"} component={RiskAssessments} />
      <Route path={"/risk-assessments/new"} component={RiskAssessmentForm} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

