import { Routes, Route, lazy, Suspense } from 'react-router-dom';
import Landing from './pages/Landing';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Unauthorized from './pages/Unauthorized';
import NotificationManager from './components/NotificationManager';
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

// Loading component
const LoadingFallback = () => (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
    </Box>
);

export default function App() {
    return (
        <>
            <NotificationManager />
            <Suspense fallback={<LoadingFallback />}>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />
                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="risk-management" element={<RiskManagement />} />
                    <Route path="compliance" element={<ComplianceManagement />} />
                    <Route path="controls" element={<ControlsManagement />} />
                    <Route path="incidents" element={<IncidentManagement />} />
                    <Route path="policies" element={<PolicyManagement />} />
                    <Route path="documents" element={<DocumentManagement />} />
                    <Route path="activity-log" element={<ActivityLog />} />
                    <Route path="user-management" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><UserManagement /></ProtectedRoute>} />
                    <Route path="organization-settings" element={<ProtectedRoute allowedRoles={['ADMIN']}><OrganizationSettings /></ProtectedRoute>} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="tasks" element={<Tasks />} />
                    <Route path="workflows" element={<WorkflowBuilder />} />
                    <Route path="business-continuity" element={<BusinessContinuity />} />
                    <Route path="ai-insights" element={<AIInsights />} />
                    <Route path="predictive-analytics" element={<PredictiveAnalytics />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="vendor-management" element={<VendorManagement />} />
                    <Route path="soc-reports" element={<SOCReports />} />
                    <Route path="onboarding" element={<OnboardingWizard />} />
                    <Route path="iso27001" element={<ISO27001 />} />
                    <Route path="tisax" element={<TISAX />} />
                    <Route path="settings" element={<Settings />} />
                </Route>
            </Routes>
        </Suspense>
        </>
    );
}
