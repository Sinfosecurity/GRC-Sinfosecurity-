import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Unauthorized from './pages/Unauthorized';
import NotificationManager from './components/NotificationManager';
import DevPreviewBanner from './components/DevPreviewBanner';
import { CircularProgress, Box } from '@mui/material';

// Lazy load heavy components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const RiskManagement = lazy(() => import('./pages/RiskManagement'));
const ComplianceManagement = lazy(() => import('./pages/ComplianceManagement'));
const ControlsManagement = lazy(() => import('./pages/ControlsManagement'));
const IncidentManagement = lazy(() => import('./pages/IncidentManagement'));
const PolicyManagement = lazy(() => import('./pages/PolicyManagement'));
const DocumentManagement = lazy(() => import('./pages/DocumentManagement'));
const ActivityLog = lazy(() => import('./pages/ActivityLog'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const OrganizationSettings = lazy(() => import('./pages/OrganizationSettings'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Tasks = lazy(() => import('./pages/Tasks'));
const WorkflowBuilder = lazy(() => import('./pages/WorkflowBuilder'));
const BusinessContinuity = lazy(() => import('./pages/BusinessContinuity'));
const AIInsights = lazy(() => import('./pages/AIInsights'));
const PredictiveAnalytics = lazy(() => import('./pages/PredictiveAnalytics'));
const Reports = lazy(() => import('./pages/Reports'));
const VendorManagement = lazy(() => import('./pages/VendorManagement'));
const SOCReports = lazy(() => import('./pages/SOCReports'));
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard'));
const ISO27001 = lazy(() => import('./pages/ISO27001'));
const TISAX = lazy(() => import('./pages/TISAX'));
const Settings = lazy(() => import('./pages/Settings'));
const LegacyQuarantine = lazy(() => import('./pages/LegacyQuarantine'));

const LEGACY_ENABLED = import.meta.env.VITE_ENABLE_LEGACY_GRC === 'true';
const Login = lazy(() => import('./pages/Login'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminMfaChallenge = lazy(() => import('./pages/AdminMfa').then((mod) => ({ default: mod.AdminMfaChallenge })));
const AdminMfaEnroll = lazy(() => import('./pages/AdminMfa').then((mod) => ({ default: mod.AdminMfaEnroll })));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Activate = lazy(() => import('./pages/Activate'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Billing = lazy(() => import('./pages/Billing'));
const Integrations = lazy(() => import('./pages/Integrations'));
const DecisionBriefs = lazy(() => import('./pages/DecisionBriefs'));
const ContinuousMonitoring = lazy(() => import('./pages/ContinuousMonitoring'));
const Assessments = lazy(() => import('./pages/Assessments'));
const FindingsRemediation = lazy(() => import('./pages/FindingsRemediation'));
const Questionnaires = lazy(() => import('./pages/Questionnaires'));
const EnvironmentStatus = lazy(() => import('./pages/EnvironmentStatus'));
const ProductDemo = lazy(() => import('./pages/ProductDemo'));
const RequestDemo = lazy(() => import('./pages/RequestDemo'));
const Pricing = lazy(() => import('./pages/Pricing'));
const TrustCenter = lazy(() => import('./pages/TrustCenter'));
const MarketingPlaceholder = lazy(() => import('./pages/MarketingPlaceholder'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ThirdPartyProduct = lazy(() => import('./pages/ThirdPartyProduct'));
const Frameworks = lazy(() => import('./pages/Frameworks'));
const LegalDraft = lazy(() => import('./pages/LegalDraft'));
const SecurityOverview = lazy(() => import('./pages/SecurityOverview'));
const PublicStatus = lazy(() => import('./pages/PublicStatus'));
const HelpSupport = lazy(() => import('./pages/HelpSupport'));
const PlatformLayout = lazy(() => import('./platform/PlatformLayout'));
const PlatformOverview = lazy(() => import('./platform/pages/PlatformOverview'));
const PlatformOrganizations = lazy(() => import('./platform/pages/PlatformOrganizations'));
const PlatformTesters = lazy(() => import('./platform/pages/PlatformTesters'));
const PlatformOrganizationDetail = lazy(() => import('./platform/pages/PlatformOrganizationDetail'));
const PlatformSupport = lazy(() => import('./platform/pages/PlatformSupport').then((mod) => ({ default: mod.PlatformSupportQueue })));
const PlatformTicketDetail = lazy(() => import('./platform/pages/PlatformSupport').then((mod) => ({ default: mod.PlatformTicketDetail })));
const PlatformIncidents = lazy(() => import('./platform/pages/PlatformOpsPages').then((mod) => ({ default: mod.PlatformIncidents })));
const PlatformLeads = lazy(() => import('./platform/pages/PlatformOpsPages').then((mod) => ({ default: mod.PlatformLeads })));
const PlatformBilling = lazy(() => import('./platform/pages/PlatformOpsPages').then((mod) => ({ default: mod.PlatformBilling })));
const PlatformProviders = lazy(() => import('./platform/pages/PlatformOpsPages').then((mod) => ({ default: mod.PlatformProviders })));
const PlatformAudit = lazy(() => import('./platform/pages/PlatformOpsPages').then((mod) => ({ default: mod.PlatformAudit })));
const PlatformUsers = lazy(() => import('./platform/pages/PlatformOpsPages').then((mod) => ({ default: mod.PlatformUsers })));
const PlatformSessions = lazy(() => import('./platform/pages/PlatformOpsPages').then((mod) => ({ default: mod.PlatformSessions })));

// Loading component
const LoadingFallback = () => (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
    </Box>
);

export default function App() {
    return (
        <>
            <DevPreviewBanner />
            <NotificationManager />
            <Suspense fallback={<LoadingFallback />}>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/demo" element={<ProductDemo />} />
                    <Route path="/request-demo" element={<RequestDemo />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/trust" element={<TrustCenter />} />
                    <Route path="/solutions" element={<MarketingPlaceholder />} />
                    <Route path="/frameworks" element={<Frameworks />} />
                    <Route path="/resources" element={<MarketingPlaceholder />} />
                    <Route path="/company" element={<MarketingPlaceholder />} />
                    <Route path="/privacy" element={<LegalDraft />} />
                    <Route path="/terms" element={<LegalDraft />} />
                    <Route path="/security" element={<SecurityOverview />} />
                    <Route path="/subprocessors" element={<LegalDraft />} />
                    <Route path="/status" element={<PublicStatus />} />
                    <Route path="/products/third-party" element={<ThirdPartyProduct />} />
                    <Route path="/products/:slug" element={<MarketingPlaceholder />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin/mfa" element={<AdminMfaChallenge />} />
                    <Route path="/admin/mfa/enroll" element={<AdminMfaEnroll />} />
                    <Route path="/admin/forgot-password" element={<ForgotPassword />} />
                    <Route path="/admin/reset-password" element={<ResetPassword />} />
                    <Route path="/admin/activate" element={<Activate />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/activate" element={<Activate />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />
                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="risk-management" element={LEGACY_ENABLED ? <RiskManagement /> : <LegacyQuarantine />} />
                    <Route path="compliance" element={LEGACY_ENABLED ? <ComplianceManagement /> : <LegacyQuarantine />} />
                    <Route path="controls" element={LEGACY_ENABLED ? <ControlsManagement /> : <LegacyQuarantine />} />
                    <Route path="incidents" element={LEGACY_ENABLED ? <IncidentManagement /> : <LegacyQuarantine />} />
                    <Route path="policies" element={LEGACY_ENABLED ? <PolicyManagement /> : <LegacyQuarantine />} />
                    <Route path="documents" element={<DocumentManagement />} />
                    <Route path="activity-log" element={<ActivityLog />} />
                    <Route path="user-management" element={<ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZATION_ADMIN', 'PLATFORM_ADMIN', 'SUPERADMIN']}><UserManagement /></ProtectedRoute>} />
                    <Route path="organization-settings" element={<ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZATION_ADMIN', 'PLATFORM_ADMIN', 'SUPERADMIN']}><OrganizationSettings /></ProtectedRoute>} />
                    <Route path="analytics" element={LEGACY_ENABLED ? <Analytics /> : <LegacyQuarantine />} />
                    <Route path="tasks" element={LEGACY_ENABLED ? <Tasks /> : <LegacyQuarantine />} />
                    <Route path="workflows" element={LEGACY_ENABLED ? <WorkflowBuilder /> : <LegacyQuarantine />} />
                    <Route path="business-continuity" element={LEGACY_ENABLED ? <BusinessContinuity /> : <LegacyQuarantine />} />
                    <Route path="ai-insights" element={<AIInsights />} />
                    <Route path="predictive-analytics" element={LEGACY_ENABLED ? <PredictiveAnalytics /> : <LegacyQuarantine />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="vendor-management" element={<VendorManagement />} />
                    <Route path="assessments" element={<Assessments />} />
                    <Route path="findings" element={<FindingsRemediation />} />
                    <Route path="decision-briefs" element={<DecisionBriefs />} />
                    <Route path="monitoring" element={<ContinuousMonitoring />} />
                    <Route path="questionnaires" element={<Questionnaires />} />
                    <Route path="billing" element={<Billing />} />
                    <Route path="integrations" element={<Integrations />} />
                    <Route path="soc-reports" element={LEGACY_ENABLED ? <SOCReports /> : <LegacyQuarantine />} />
                    <Route path="onboarding" element={LEGACY_ENABLED ? <OnboardingWizard /> : <LegacyQuarantine />} />
                    <Route path="iso27001" element={LEGACY_ENABLED ? <ISO27001 /> : <LegacyQuarantine />} />
                    <Route path="tisax" element={LEGACY_ENABLED ? <TISAX /> : <LegacyQuarantine />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="environment" element={<EnvironmentStatus />} />
                    <Route path="help" element={<HelpSupport />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={['PLATFORM_OWNER', 'PLATFORM_ADMIN', 'SUPERADMIN', 'SUPPORT_ADMIN', 'SUPPORT_ANALYST', 'BILLING_SUPPORT', 'SECURITY_ADMIN']}><PlatformLayout /></ProtectedRoute>}>
                    <Route path="/platform" element={<PlatformOverview />} />
                    <Route path="/platform/organizations" element={<PlatformOrganizations />} />
                    <Route path="/platform/testers" element={<PlatformTesters />} />
                    <Route path="/platform/organizations/:id" element={<PlatformOrganizationDetail />} />
                    <Route path="/platform/support" element={<PlatformSupport />} />
                    <Route path="/platform/support/:id" element={<PlatformTicketDetail />} />
                    <Route path="/platform/incidents" element={<PlatformIncidents />} />
                    <Route path="/platform/leads" element={<PlatformLeads />} />
                    <Route path="/platform/billing" element={<PlatformBilling />} />
                    <Route path="/platform/providers" element={<PlatformProviders />} />
                    <Route path="/platform/audit" element={<PlatformAudit />} />
                    <Route path="/platform/users" element={<PlatformUsers />} />
                    <Route path="/platform/sessions" element={<PlatformSessions />} />
                </Route>
                    <Route path="*" element={<NotFound />} />
            </Routes>
        </Suspense>
        </>
    );
}
