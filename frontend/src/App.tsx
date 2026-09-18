import { lazy, Suspense } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Unauthorized from './pages/Unauthorized';
import NotificationManager from './components/NotificationManager';
import DevPreviewBanner from './components/DevPreviewBanner';
import { CircularProgress, Box } from '@mui/material';

// Lazy load heavy components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Notifications = lazy(() => import('./pages/Notifications'));
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
const VendorOnboarding = lazy(() => import('./pages/VendorOnboarding'));
const VendorOnboardingWorkspace = lazy(() => import('./pages/VendorOnboardingWorkspace'));
const VendorAssessmentActivate = lazy(() => import('./pages/VendorAssessmentActivate'));
const RequesterIra = lazy(() => import('./pages/RequesterIra'));
const VendorAssessmentPortal = lazy(() => import('./pages/VendorAssessmentPortal'));
const VendorAssessmentQuestionnaire = lazy(() => import('./pages/VendorAssessmentQuestionnaire'));
const SOCReports = lazy(() => import('./pages/SOCReports'));
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard'));
const ISO27001 = lazy(() => import('./pages/ISO27001'));
const TISAX = lazy(() => import('./pages/TISAX'));
const Settings = lazy(() => import('./pages/Settings'));
const IdentityAccess = lazy(() => import('./pages/IdentityAccess'));
const SsoComplete = lazy(() => import('./pages/SsoComplete'));
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
const InsuranceHome = lazy(() => import('./pages/InsuranceHome'));
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
const ProductStory = lazy(() => import('./pages/ProductStory'));
const PlatformStory = lazy(() => import('./pages/PlatformStory'));
const Frameworks = lazy(() => import('./pages/Frameworks'));
const LegalDraft = lazy(() => import('./pages/LegalDraft'));
const SecurityOverview = lazy(() => import('./pages/SecurityOverview'));
const PublicStatus = lazy(() => import('./pages/PublicStatus'));
const HelpSupport = lazy(() => import('./pages/HelpSupport'));
const GovernanceGraphExplorer = lazy(() => import('./pages/GovernanceGraphExplorer'));
const RiskDashboard = lazy(() => import('./pages/RiskDashboard'));
const RiskRegister = lazy(() => import('./pages/RiskRegister'));
const RiskDetail = lazy(() => import('./pages/RiskDetail'));
const ControlCenter = lazy(() => import('./pages/ControlCenter'));
const ControlDetail = lazy(() => import('./pages/ControlDetail'));
const FrameworkCoverage = lazy(() => import('./pages/FrameworkCoverage'));
const ComplianceDashboard = lazy(() => import('./pages/ComplianceDashboard'));
const ComplianceFrameworks = lazy(() => import('./pages/ComplianceFrameworks'));
const ComplianceFrameworkDetail = lazy(() => import('./pages/ComplianceFrameworkDetail'));
const ComplianceRequirementDetail = lazy(() => import('./pages/ComplianceRequirementDetail'));
const ComplianceGaps = lazy(() => import('./pages/ComplianceGaps'));
const ComplianceExceptions = lazy(() => import('./pages/ComplianceExceptions'));
const ComplianceCampaignDetail = lazy(() => import('./pages/ComplianceCampaignDetail'));
const ComplianceAuditDetail = lazy(() => import('./pages/ComplianceAuditDetail'));
const PrivacyDashboard = lazy(() => import('./pages/PrivacyDashboard'));
const PrivacyActivities = lazy(() => import('./pages/PrivacyActivities'));
const PrivacyActivityDetail = lazy(() => import('./pages/PrivacyActivityDetail'));
const PrivacyDataMap = lazy(() => import('./pages/PrivacyDataMap'));
const PrivacyTransfers = lazy(() => import('./pages/PrivacyTransfers'));
const PrivacyDpias = lazy(() => import('./pages/PrivacyDpias'));
const PrivacyRights = lazy(() => import('./pages/PrivacyRights'));
const PrivacyRetention = lazy(() => import('./pages/PrivacyRetention'));
const PrivacyVendors = lazy(() => import('./pages/PrivacyVendors'));
const PrivacyVendorDetail = lazy(() => import('./pages/PrivacyVendorDetail'));
const PrivacyDeletions = lazy(() => import('./pages/PrivacyDeletions'));
const PrivacyConsent = lazy(() => import('./pages/PrivacyConsent'));
const PrivacyIncidents = lazy(() => import('./pages/PrivacyIncidents'));
const PrivacyImport = lazy(() => import('./pages/PrivacyImport'));
const AiDashboard = lazy(() => import('./pages/AiDashboard'));
const AiRegister = lazy(() => import('./pages/AiRegister'));
const AiSystemDetail = lazy(() => import('./pages/AiSystemDetail'));
const AiUseCaseDetail = lazy(() => import('./pages/AiUseCaseDetail'));
const AiProviders = lazy(() => import('./pages/AiProviders'));
const AiProviderDetail = lazy(() => import('./pages/AiProviderDetail'));
const AiControls = lazy(() => import('./pages/AiControls'));
const AiReadiness = lazy(() => import('./pages/AiReadiness'));
const AiAssessments = lazy(() => import('./pages/AiAssessments'));
const AiTesting = lazy(() => import('./pages/AiTesting'));
const AiApprovals = lazy(() => import('./pages/AiApprovals'));
const AiIncidents = lazy(() => import('./pages/AiIncidents'));
const AiRegulatory = lazy(() => import('./pages/AiRegulatory'));
const AiExceptions = lazy(() => import('./pages/AiExceptions'));
const AiImport = lazy(() => import('./pages/AiImport'));
const IntelligenceDashboard = lazy(() => import('./pages/IntelligenceDashboard'));
const IntelligenceChanges = lazy(() => import('./pages/IntelligenceChanges'));
const IntelligenceExecutive = lazy(() => import('./pages/IntelligenceExecutive'));
const IntelligenceDetail = lazy(() => import('./pages/IntelligenceDetail'));
const AutomationHome = lazy(() => import('./pages/AutomationHome'));
const AutomationDetail = lazy(() => import('./pages/AutomationDetail'));
const AutomationBuilder = lazy(() => import('./pages/AutomationBuilder'));
const AutomationRunDetail = lazy(() => import('./pages/AutomationRunDetail'));
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
                    <Route path="/vendor-assessment/activate" element={<VendorAssessmentActivate />} />
                    <Route path="/ira" element={<RequesterIra />} />
                    <Route path="/vendor-assessment" element={<VendorAssessmentPortal />} />
                    <Route path="/vendor-assessment/:assessmentId" element={<VendorAssessmentQuestionnaire />} />
                    <Route path="/connected-platform" element={<PlatformStory />} />
                    <Route path="/products/third-party" element={<ThirdPartyProduct />} />
                    <Route path="/products/:slug" element={<ProductStory />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/login/sso/complete" element={<SsoComplete />} />
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
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="risk-management" element={LEGACY_ENABLED ? <RiskManagement /> : <Navigate to="/risks" replace />} />
                    <Route path="legacy/compliance" element={LEGACY_ENABLED ? <ComplianceManagement /> : <LegacyQuarantine />} />
                    <Route path="compliance" element={<ComplianceDashboard />} />
                    <Route path="compliance/frameworks" element={<ComplianceFrameworks />} />
                    <Route path="compliance/frameworks/:publicId" element={<ComplianceFrameworkDetail />} />
                    <Route path="compliance/requirements/:publicId" element={<ComplianceRequirementDetail />} />
                    <Route path="compliance/gaps" element={<ComplianceGaps />} />
                    <Route path="compliance/exceptions" element={<ComplianceExceptions />} />
                    <Route path="compliance/campaigns/:publicId" element={<ComplianceCampaignDetail />} />
                    <Route path="compliance/audits/:publicId" element={<ComplianceAuditDetail />} />
                    <Route path="privacy-ops" element={<PrivacyDashboard />} />
                    <Route path="privacy-ops/activities" element={<PrivacyActivities />} />
                    <Route path="privacy-ops/activities/:publicId" element={<PrivacyActivityDetail />} />
                    <Route path="privacy-ops/data-map" element={<PrivacyDataMap />} />
                    <Route path="privacy-ops/transfers" element={<PrivacyTransfers />} />
                    <Route path="privacy-ops/dpias" element={<PrivacyDpias />} />
                    <Route path="privacy-ops/rights" element={<PrivacyRights />} />
                    <Route path="privacy-ops/retention" element={<PrivacyRetention />} />
                    <Route path="privacy-ops/vendors" element={<PrivacyVendors />} />
                    <Route path="privacy-ops/vendors/:vendorId" element={<PrivacyVendorDetail />} />
                    <Route path="privacy-ops/deletions" element={<PrivacyDeletions />} />
                    <Route path="privacy-ops/consent" element={<PrivacyConsent />} />
                    <Route path="privacy-ops/incidents" element={<PrivacyIncidents />} />
                    <Route path="privacy-ops/import" element={<PrivacyImport />} />
                    <Route path="ai-governance" element={<AiDashboard />} />
                    <Route path="ai-governance/systems" element={<AiRegister />} />
                    <Route path="ai-governance/systems/:publicId" element={<AiSystemDetail />} />
                    <Route path="ai-governance/use-cases/:publicId" element={<AiUseCaseDetail />} />
                    <Route path="ai-governance/providers" element={<AiProviders />} />
                    <Route path="ai-governance/providers/:publicId" element={<AiProviderDetail />} />
                    <Route path="ai-governance/controls" element={<AiControls />} />
                    <Route path="ai-governance/readiness/:frameworkKey" element={<AiReadiness />} />
                    <Route path="ai-governance/assessments" element={<AiAssessments />} />
                    <Route path="ai-governance/testing" element={<AiTesting />} />
                    <Route path="ai-governance/approvals" element={<AiApprovals />} />
                    <Route path="ai-governance/incidents" element={<AiIncidents />} />
                    <Route path="ai-governance/regulatory" element={<AiRegulatory />} />
                    <Route path="ai-governance/exceptions" element={<AiExceptions />} />
                    <Route path="ai-governance/import" element={<AiImport />} />
                    <Route path="intelligence" element={<IntelligenceDashboard />} />
                    <Route path="intelligence/changes" element={<IntelligenceChanges />} />
                    <Route path="intelligence/executive" element={<IntelligenceExecutive />} />
                    <Route path="intelligence/:publicId" element={<IntelligenceDetail />} />
                    <Route path="automation" element={<AutomationHome />} />
                    <Route path="automation/runs" element={<AutomationHome initialTab={2} />} />
                    <Route path="automation/templates" element={<AutomationHome initialTab={4} />} />
                    <Route path="automation/new" element={<AutomationBuilder />} />
                    <Route path="automation/runs/:publicId" element={<AutomationRunDetail />} />
                    <Route path="automation/:publicId/edit" element={<AutomationBuilder />} />
                    <Route path="automation/:publicId" element={<AutomationDetail />} />
                    <Route path="insurance" element={<InsuranceHome />} />
                    <Route path="insurance/entities" element={<InsuranceHome />} />
                    <Route path="insurance/licenses" element={<InsuranceHome />} />
                    <Route path="insurance/risk" element={<InsuranceHome />} />
                    <Route path="insurance/third-parties" element={<InsuranceHome />} />
                    <Route path="insurance/controls" element={<InsuranceHome />} />
                    <Route path="insurance/ai" element={<InsuranceHome />} />
                    <Route path="insurance/regulatory" element={<InsuranceHome />} />
                    <Route path="insurance/reports" element={<InsuranceHome />} />
                    <Route path="insurance/configuration" element={<InsuranceHome />} />
                    <Route path="insurance/activate" element={<InsuranceHome />} />
                    <Route path="controls" element={LEGACY_ENABLED ? <ControlsManagement /> : <LegacyQuarantine />} />
                    <Route path="incidents" element={LEGACY_ENABLED ? <IncidentManagement /> : <LegacyQuarantine />} />
                    <Route path="policies" element={LEGACY_ENABLED ? <PolicyManagement /> : <LegacyQuarantine />} />
                    <Route path="documents" element={<DocumentManagement />} />
                    <Route path="activity-log" element={<ActivityLog />} />
                    <Route path="user-management" element={<ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZATION_ADMIN', 'PLATFORM_ADMIN', 'SUPERADMIN']}><UserManagement /></ProtectedRoute>} />
                    <Route path="organization-settings" element={<ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZATION_ADMIN', 'PLATFORM_ADMIN', 'SUPERADMIN']}><OrganizationSettings /></ProtectedRoute>} />
                    <Route path="settings/identity" element={<ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZATION_ADMIN', 'PLATFORM_ADMIN', 'SUPERADMIN']}><IdentityAccess /></ProtectedRoute>} />
                    <Route path="analytics" element={LEGACY_ENABLED ? <Analytics /> : <LegacyQuarantine />} />
                    <Route path="tasks" element={LEGACY_ENABLED ? <Tasks /> : <LegacyQuarantine />} />
                    <Route path="workflows" element={LEGACY_ENABLED ? <WorkflowBuilder /> : <LegacyQuarantine />} />
                    <Route path="business-continuity" element={LEGACY_ENABLED ? <BusinessContinuity /> : <LegacyQuarantine />} />
                    <Route path="ai-insights" element={<AIInsights />} />
                    <Route path="predictive-analytics" element={LEGACY_ENABLED ? <PredictiveAnalytics /> : <LegacyQuarantine />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="vendor-management" element={<VendorManagement />} />
                    <Route path="vendor-onboarding" element={<VendorOnboarding />} />
                    <Route path="vendor-onboarding/:id" element={<VendorOnboardingWorkspace />} />
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
                    <Route path="governance-graph" element={<GovernanceGraphExplorer />} />
                    <Route path="risks" element={<RiskDashboard />} />
                    <Route path="risks/register" element={<RiskRegister />} />
                    <Route path="risks/:publicId" element={<RiskDetail />} />
                    <Route path="control-center" element={<ControlCenter />} />
                    <Route path="control-center/:controlId" element={<ControlDetail />} />
                    <Route path="framework-coverage" element={<FrameworkCoverage />} />
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
