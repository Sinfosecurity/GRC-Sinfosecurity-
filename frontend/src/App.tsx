import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import RiskManagement from './pages/RiskManagement';
import ComplianceManagement from './pages/ComplianceManagement';
import ControlsManagement from './pages/ControlsManagement';
import IncidentManagement from './pages/IncidentManagement';
import PolicyManagement from './pages/PolicyManagement';
import DocumentManagement from './pages/DocumentManagement';
import ActivityLog from './pages/ActivityLog';
import UserManagement from './pages/UserManagement';
import Analytics from './pages/Analytics';
import Tasks from './pages/Tasks';
import WorkflowBuilder from './pages/WorkflowBuilder';
import BusinessContinuity from './pages/BusinessContinuity';
import AIInsights from './pages/AIInsights';
import PredictiveAnalytics from './pages/PredictiveAnalytics';
import Reports from './pages/Reports';
import VendorManagement from './pages/VendorManagement';
import OnboardingWizard from './pages/OnboardingWizard';
import ISO27001 from './pages/ISO27001';
import TISAX from './pages/TISAX';
import Settings from './pages/Settings';

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="risk-management" element={<RiskManagement />} />
                <Route path="compliance" element={<ComplianceManagement />} />
                <Route path="controls" element={<ControlsManagement />} />
                <Route path="incidents" element={<IncidentManagement />} />
                <Route path="policies" element={<PolicyManagement />} />
                <Route path="documents" element={<DocumentManagement />} />
                <Route path="activity-log" element={<ActivityLog />} />
                <Route path="user-management" element={<UserManagement />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="workflows" element={<WorkflowBuilder />} />
                <Route path="business-continuity" element={<BusinessContinuity />} />
                <Route path="ai-insights" element={<AIInsights />} />
                <Route path="predictive-analytics" element={<PredictiveAnalytics />} />
                <Route path="reports" element={<Reports />} />
                <Route path="vendor-management" element={<VendorManagement />} />
                <Route path="onboarding" element={<OnboardingWizard />} />
                <Route path="iso27001" element={<ISO27001 />} />
                <Route path="tisax" element={<TISAX />} />
                <Route path="settings" element={<Settings />} />
            </Route>
        </Routes>
    );
}
