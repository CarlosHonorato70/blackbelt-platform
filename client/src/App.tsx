import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { TRPCProvider } from "./lib/trpc-provider";
import { AuthProvider } from "./_core/hooks/useAuth";
import { TenantProvider } from "./contexts/TenantContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { ImpersonationBanner } from "./components/ImpersonationBanner";
import CookieConsent from "./components/CookieConsent";
import ProtectedRoute from "./components/ProtectedRoute";
import { lazy, Suspense } from "react";

// Auth pages (eager load — exibidas imediatamente)
import Login from "./pages/Login";
import Register from "./pages/Register";

// Dashboard pages (lazy load)
const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tenants = lazy(() => import("./pages/Tenants"));
const Sectors = lazy(() => import("./pages/Sectors"));
const People = lazy(() => import("./pages/People"));
const RiskAssessments = lazy(() => import("./pages/RiskAssessments"));
const RiskAssessmentForm = lazy(() => import("./pages/RiskAssessmentForm"));
const COPSOQ = lazy(() => import("./pages/COPSOQ"));
const CopsoqInvites = lazy(() => import("./pages/CopsoqInvites"));
const CopsoqTracking = lazy(() => import("./pages/CopsoqTracking"));
const AssessmentHistory = lazy(() => import("./pages/AssessmentHistory"));
const AssessmentAnalytics = lazy(() => import("./pages/AssessmentAnalytics"));
const ComplianceReports = lazy(() => import("./pages/ComplianceReports"));
const ReminderManagement = lazy(() => import("./pages/ReminderManagement"));
const UserInvites = lazy(() => import("./pages/UserInvites"));
const PricingParameters = lazy(() => import("./pages/PricingParameters"));
const Services = lazy(() => import("./pages/Services"));
const Clients = lazy(() => import("./pages/Clients"));
const Proposals = lazy(() => import("./pages/Proposals"));
const RolesPermissions = lazy(() => import("./pages/RolesPermissions"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const DataExport = lazy(() => import("./pages/DataExport"));
const SecurityDashboard = lazy(() => import("./pages/SecurityDashboard"));
const ExecutiveDashboard = lazy(() => import("./pages/ExecutiveDashboard"));
const BrandingSettings = lazy(() => import("./pages/BrandingSettings"));
const TestDashboard = lazy(() => import("./pages/TestDashboard"));
const ActionPlans = lazy(() => import("./pages/ActionPlans"));
const Help = lazy(() => import("./pages/Help"));
const SupportTickets = lazy(() => import("./pages/SupportTickets"));
const AdminSubscriptions = lazy(() => import("./pages/AdminSubscriptions"));
const AdminSupportTickets = lazy(() => import("./pages/AdminSupportTickets"));
const AdminDsrManagement = lazy(() => import("./pages/AdminDsrManagement"));
const AdminMetricsDashboard = lazy(() => import("./pages/AdminMetricsDashboard"));
const CopsoqRespond = lazy(() => import("./pages/CopsoqRespond"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Landing = lazy(() => import("./pages/Landing"));
const LGPD = lazy(() => import("./pages/LGPD"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Entregáveis NR-01
const RiskMatrix = lazy(() => import("./pages/RiskMatrix"));
const PgrPcmsoIntegration = lazy(() => import("./pages/PgrPcmsoIntegration"));
const PsychosocialDashboard = lazy(() => import("./pages/PsychosocialDashboard"));
const AssessmentTrends = lazy(() => import("./pages/AssessmentTrends"));
const FinancialRiskCalculator = lazy(() => import("./pages/FinancialRiskCalculator"));
const ComplianceTimeline = lazy(() => import("./pages/ComplianceTimeline"));
const ComplianceChecklist = lazy(() => import("./pages/ComplianceChecklist"));
const ComplianceCertificate = lazy(() => import("./pages/ComplianceCertificate"));
const LaudoTecnico = lazy(() => import("./pages/LaudoTecnico"));
const BenchmarkComparison = lazy(() => import("./pages/BenchmarkComparison"));
const ClimateSurveys = lazy(() => import("./pages/ClimateSurveys"));
const ClimateSurveyResults = lazy(() => import("./pages/ClimateSurveyResults"));
const ClimateSurveyRespond = lazy(() => import("./pages/ClimateSurveyRespond"));
const TrainingPrograms = lazy(() => import("./pages/TrainingPrograms"));
const TrainingModule = lazy(() => import("./pages/TrainingModule"));
const TrainingAdmin = lazy(() => import("./pages/TrainingAdmin"));
const AnonymousReport = lazy(() => import("./pages/AnonymousReport"));
const AnonymousReportTrack = lazy(() => import("./pages/AnonymousReportTrack"));
const ReportManagement = lazy(() => import("./pages/ReportManagement"));
const DeadlineAlerts = lazy(() => import("./pages/DeadlineAlerts"));
const ErgonomicAssessments = lazy(() => import("./pages/ErgonomicAssessments"));
const ErgonomicAssessmentForm = lazy(() => import("./pages/ErgonomicAssessmentForm"));
const EsocialExport = lazy(() => import("./pages/EsocialExport"));
const Companies = lazy(() => import("./pages/Companies"));
const GuidedWorkflow = lazy(() => import("./pages/GuidedWorkflow"));
const AgentChat = lazy(() => import("./pages/AgentChat"));

// Subscription pages
const Pricing = lazy(() => import("./pages/subscription/Pricing"));
const Checkout = lazy(() => import("./pages/subscription/Checkout"));
const SubscriptionDashboard = lazy(() => import("./pages/subscription/SubscriptionDashboard"));
const SubscriptionSuccess = lazy(() => import("./pages/subscription/SubscriptionSuccess"));
const SubscriptionFailure = lazy(() => import("./pages/subscription/SubscriptionFailure"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <TRPCProvider>
        <Router>
          <AuthProvider>
            <ImpersonationProvider>
            <ImpersonationBanner />
            <TenantProvider>
              <Routes>
                {/* Landing page publica */}
                <Route path="/" element={<Suspense fallback={<PageLoader />}><Landing /></Suspense>} />

                {/* Rotas publicas */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/copsoq/respond/:token" element={<Suspense fallback={<PageLoader />}><CopsoqRespond /></Suspense>} />
                <Route path="/survey/respond/:token" element={<Suspense fallback={<PageLoader />}><ClimateSurveyRespond /></Suspense>} />
                <Route path="/forgot-password" element={<Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense>} />
                <Route path="/reset-password/:token" element={<Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />
                <Route path="/verify-email/:token" element={<Suspense fallback={<PageLoader />}><VerifyEmail /></Suspense>} />
                <Route path="/terms" element={<Suspense fallback={<PageLoader />}><TermsOfService /></Suspense>} />
                <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>} />
                <Route path="/lgpd" element={<Suspense fallback={<PageLoader />}><LGPD /></Suspense>} />

                {/* Dashboard principal */}
                <Route path="/home" element={<ProtectedPage><Home /></ProtectedPage>} />
                <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />

                {/* Gestao de empresas e equipe */}
                <Route path="/tenants" element={<ProtectedPage><Tenants /></ProtectedPage>} />
                <Route path="/companies" element={<ProtectedPage><Companies /></ProtectedPage>} />
                <Route path="/sectors" element={<ProtectedPage><Sectors /></ProtectedPage>} />
                <Route path="/people" element={<ProtectedPage><People /></ProtectedPage>} />

                {/* NR-01 e avaliacoes */}
                <Route path="/risk-assessments" element={<ProtectedPage><RiskAssessments /></ProtectedPage>} />
                <Route path="/risk-assessments/new" element={<ProtectedPage><RiskAssessmentForm /></ProtectedPage>} />
                <Route path="/risk-assessments/:id" element={<ProtectedPage><RiskAssessmentForm /></ProtectedPage>} />
                <Route path="/assessment-history" element={<ProtectedPage><AssessmentHistory /></ProtectedPage>} />

                {/* COPSOQ-II */}
                <Route path="/copsoq" element={<ProtectedPage><COPSOQ /></ProtectedPage>} />
                <Route path="/copsoq/analytics" element={<ProtectedPage><AssessmentAnalytics /></ProtectedPage>} />
                <Route path="/copsoq/invites" element={<ProtectedPage><CopsoqInvites /></ProtectedPage>} />
                <Route path="/copsoq/tracking" element={<ProtectedPage><CopsoqTracking /></ProtectedPage>} />

                {/* Planos de Ação */}
                <Route path="/action-plans" element={<ProtectedPage><ActionPlans /></ProtectedPage>} />
                <Route path="/risk-matrix" element={<ProtectedPage><RiskMatrix /></ProtectedPage>} />

                {/* Relatorios e monitoramento */}
                <Route path="/compliance-reports" element={<ProtectedPage><ComplianceReports /></ProtectedPage>} />
                <Route path="/reminder-management" element={<ProtectedPage><ReminderManagement /></ProtectedPage>} />
                <Route path="/executive-dashboard" element={<ProtectedPage><ExecutiveDashboard /></ProtectedPage>} />

                {/* Entregáveis NR-01 */}
                <Route path="/pgr-pcmso" element={<ProtectedPage><PgrPcmsoIntegration /></ProtectedPage>} />
                <Route path="/psychosocial-dashboard" element={<ProtectedPage><PsychosocialDashboard /></ProtectedPage>} />
                <Route path="/assessment-trends" element={<ProtectedPage><AssessmentTrends /></ProtectedPage>} />
                <Route path="/financial-calculator" element={<ProtectedPage><FinancialRiskCalculator /></ProtectedPage>} />
                <Route path="/compliance-timeline" element={<ProtectedPage><ComplianceTimeline /></ProtectedPage>} />
                <Route path="/compliance-checklist" element={<ProtectedPage><ComplianceChecklist /></ProtectedPage>} />
                <Route path="/compliance-certificate" element={<ProtectedPage><ComplianceCertificate /></ProtectedPage>} />
                <Route path="/laudo-tecnico" element={<ProtectedPage><LaudoTecnico /></ProtectedPage>} />
                <Route path="/benchmark" element={<ProtectedPage><BenchmarkComparison /></ProtectedPage>} />
                <Route path="/climate-surveys" element={<ProtectedPage><ClimateSurveys /></ProtectedPage>} />
                <Route path="/climate-surveys/:id/results" element={<ProtectedPage><ClimateSurveyResults /></ProtectedPage>} />
                <Route path="/training" element={<ProtectedPage><TrainingPrograms /></ProtectedPage>} />
                <Route path="/training/:programId" element={<ProtectedPage><TrainingAdmin /></ProtectedPage>} />
                <Route path="/training/:programId/modules/:moduleId" element={<ProtectedPage><TrainingModule /></ProtectedPage>} />
                <Route path="/anonymous-report" element={<ProtectedPage><AnonymousReport /></ProtectedPage>} />
                <Route path="/anonymous-report/track" element={<ProtectedPage><AnonymousReportTrack /></ProtectedPage>} />
                <Route path="/report-management" element={<ProtectedPage><ReportManagement /></ProtectedPage>} />
                <Route path="/guided-workflow" element={<ProtectedPage><GuidedWorkflow /></ProtectedPage>} />
                <Route path="/deadline-alerts" element={<ProtectedPage><DeadlineAlerts /></ProtectedPage>} />
                <Route path="/ergonomic-assessments" element={<ProtectedPage><ErgonomicAssessments /></ProtectedPage>} />
                <Route path="/ergonomic-assessments/:id" element={<ProtectedPage><ErgonomicAssessmentForm /></ProtectedPage>} />
                <Route path="/esocial-export" element={<ProtectedPage><EsocialExport /></ProtectedPage>} />
                <Route path="/agent" element={<ProtectedPage><AgentChat /></ProtectedPage>} />

                {/* Comercial */}
                <Route path="/pricing-parameters" element={<ProtectedPage><PricingParameters /></ProtectedPage>} />
                <Route path="/services" element={<ProtectedPage><Services /></ProtectedPage>} />
                <Route path="/clients" element={<ProtectedPage><Clients /></ProtectedPage>} />
                <Route path="/proposals" element={<ProtectedPage><Proposals /></ProtectedPage>} />

                {/* Admin */}
                <Route path="/user-invites" element={<ProtectedPage><UserInvites /></ProtectedPage>} />
                <Route path="/roles-permissions" element={<ProtectedPage><RolesPermissions /></ProtectedPage>} />
                <Route path="/audit-logs" element={<ProtectedPage><AuditLogs /></ProtectedPage>} />
                <Route path="/data-export" element={<ProtectedPage><DataExport /></ProtectedPage>} />
                <Route path="/security-dashboard" element={<ProtectedPage><SecurityDashboard /></ProtectedPage>} />
                <Route path="/branding-settings" element={<ProtectedPage><BrandingSettings /></ProtectedPage>} />
                <Route path="/test-dashboard" element={<ProtectedPage><TestDashboard /></ProtectedPage>} />
                <Route path="/help" element={<ProtectedPage><Help /></ProtectedPage>} />

                {/* Subscription */}
                <Route path="/subscription" element={<ProtectedPage><SubscriptionDashboard /></ProtectedPage>} />
                <Route path="/subscription/pricing" element={<ProtectedPage><Pricing /></ProtectedPage>} />
                <Route path="/subscription/checkout" element={<ProtectedPage><Checkout /></ProtectedPage>} />
                <Route path="/subscription/success" element={<ProtectedPage><SubscriptionSuccess /></ProtectedPage>} />
                <Route path="/subscription/failure" element={<ProtectedPage><SubscriptionFailure /></ProtectedPage>} />

                {/* Suporte */}
                <Route path="/support" element={<ProtectedPage><SupportTickets /></ProtectedPage>} />

                {/* Admin Operations */}
                <Route path="/admin/metrics" element={<ProtectedPage><AdminMetricsDashboard /></ProtectedPage>} />
                <Route path="/admin/subscriptions" element={<ProtectedPage><AdminSubscriptions /></ProtectedPage>} />
                <Route path="/admin/support" element={<ProtectedPage><AdminSupportTickets /></ProtectedPage>} />
                <Route path="/admin/dsr" element={<ProtectedPage><AdminDsrManagement /></ProtectedPage>} />

                {/* Catch-all */}
                <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
              </Routes>
            </TenantProvider>
            </ImpersonationProvider>
          </AuthProvider>
          <CookieConsent />
        </Router>
      </TRPCProvider>
    </ErrorBoundary>
  );
}
