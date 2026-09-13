import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import AppTable from '../components/design/AppTable';
import { tprmAPI, vendorAPI } from '../services/api';
import { downloadBinaryResponse, downloadErrorMessage } from '../services/download';

type CatalogItem = {
    id: string;
    name: string;
    description: string;
    formats: string[];
    requiresVendor?: boolean;
    requiresAssessment?: boolean;
    kind: 'operational' | 'board';
    category: string;
};

const catalog: CatalogItem[] = [
    { id: 'executive', name: 'Executive report', category: 'Executive', description: 'Portfolio overview, attention, trend, top residual-risk vendors, and recommendations.', formats: ['PDF'], kind: 'operational' },
    { id: 'scorecard', name: 'Vendor scorecard', category: 'Third Party', description: 'Profile, score, assessments, evidence, findings, monitoring, and decision status for one vendor.', formats: ['PDF'], requiresVendor: true, kind: 'operational' },
    { id: 'assessment', name: 'Assessment report', category: 'Assessment', description: 'Persisted questionnaire, responses, scoring, evidence, gaps, and outcome.', formats: ['PDF'], requiresAssessment: true, kind: 'operational' },
    { id: 'findings', name: 'Findings report', category: 'Findings', description: 'Vendor, severity, owner, age, remediation, evidence, and risk acceptance.', formats: ['PDF', 'CSV', 'XLSX'], kind: 'operational' },
    { id: 'monitoring', name: 'Monitoring report', category: 'Monitoring', description: 'Provider status plus recorded vendor signals only. External ratings are not invented.', formats: ['PDF', 'CSV'], kind: 'operational' },
    { id: 'board', name: 'Board report', category: 'Board', description: 'Executive summary, heatmap, trend, findings, decisions, and recommendations.', formats: ['PDF', 'PPTX'], kind: 'board' },
];

type Capabilities = {
    plan?: string;
    testingAccess?: boolean;
    isDemo?: boolean;
    entitled?: boolean;
    canExportOperational?: boolean;
    canExportBoard?: boolean;
    operationalReason?: string | null;
    boardReason?: string | null;
};

export default function Reports() {
    const [searchParams] = useSearchParams();
    const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
    const [assessments, setAssessments] = useState<Array<{ id: string; vendor?: { name: string }; assessmentType: string }>>([]);
    const [vendorId, setVendorId] = useState(searchParams.get('vendorId') || '');
    const [assessmentId, setAssessmentId] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [capabilities, setCapabilities] = useState<Capabilities | null>(null);

    useEffect(() => {
        Promise.all([vendorAPI.getAll(), tprmAPI.listAssessments(), tprmAPI.reportCapabilities()])
            .then(([vendorRes, assessmentRes, capRes]) => {
                const vendorRows = vendorRes.data.vendors || vendorRes.data.data || vendorRes.data || [];
                setVendors(Array.isArray(vendorRows) ? vendorRows : []);
                setAssessments(assessmentRes.data.data || []);
                setCapabilities(capRes.data.data);
            })
            .catch((err) => setError(err.message));
    }, []);

    const unavailableReason = (item: CatalogItem) => {
        if (item.kind === 'board' && capabilities && !capabilities.canExportBoard) {
            return capabilities.boardReason || 'Board packs require an organization admin, risk manager, or approver.';
        }
        if (item.kind === 'operational' && capabilities && !capabilities.canExportOperational) {
            return capabilities.operationalReason || 'Your role can view reports but cannot download them.';
        }
        if (item.requiresVendor && !vendorId) return 'Select a vendor before generating a scorecard.';
        if (item.requiresAssessment && !assessmentId) return 'Select a completed or in-progress assessment first.';
        return null;
    };

    const run = async (item: CatalogItem, format: string) => {
        const blocked = unavailableReason(item);
        if (blocked) {
            setError(blocked);
            return;
        }
        setBusyId(`${item.id}-${format}`);
        setError(null);
        setSuccess(null);
        try {
            const fmt = format.toLowerCase();
            let response;
            if (item.id === 'executive') response = await tprmAPI.downloadExecutivePdf();
            else if (item.id === 'scorecard') response = await tprmAPI.downloadScorecardPdf(vendorId);
            else if (item.id === 'assessment') response = await tprmAPI.downloadAssessmentPdf(assessmentId);
            else if (item.id === 'findings') response = await tprmAPI.downloadFindings(fmt as 'pdf' | 'csv' | 'xlsx');
            else if (item.id === 'monitoring') response = await tprmAPI.downloadMonitoring(fmt as 'pdf' | 'csv');
            else response = await tprmAPI.downloadBoard(fmt as 'pdf' | 'pptx');
            const filename = await downloadBinaryResponse(response, `Supreme-Risk-${item.id}.${fmt}`);
            setSuccess(`Downloaded ${filename}`);
        } catch (err) {
            setError(downloadErrorMessage(err));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <Box sx={{ maxWidth: 1200 }}>
            <PageHeader
                title="Reports"
                description="Generate files from this organization’s records. Unavailable actions explain why — they will not fail after you click."
            />
            {(capabilities?.testingAccess || capabilities?.isDemo) && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Evaluation access is enabled for this organization. Available downloads follow your role. Billing remains test-only and is not a production subscription.
                </Alert>
            )}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
                <TextField select label="Vendor scope" value={vendorId} onChange={(e) => setVendorId(e.target.value)} sx={{ minWidth: 260 }}>
                    <MenuItem value="">All vendors</MenuItem>
                    {vendorId && !vendors.some((vendor) => vendor.id === vendorId) && (
                        <MenuItem value={vendorId}>Selected vendor</MenuItem>
                    )}
                    {vendors.map((vendor) => <MenuItem key={vendor.id} value={vendor.id}>{vendor.name}</MenuItem>)}
                </TextField>
                <TextField select label="Assessment" value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)} sx={{ minWidth: 280 }}>
                    <MenuItem value="">Select assessment</MenuItem>
                    {assessments.map((row) => <MenuItem key={row.id} value={row.id}>{row.vendor?.name || 'Vendor'} · {row.assessmentType}</MenuItem>)}
                </TextField>
            </Stack>
            <AppTable
                rows={catalog}
                rowKey={(row) => row.id}
                searchPlaceholder="Filter reports"
                searchValue={(row) => `${row.name} ${row.category} ${row.description}`}
                emptyTitle="No reports match"
                emptyBody="Clear the filter to see the reporting catalog."
                columns={[
                    { id: 'name', label: 'Report', sortValue: (row) => row.name, render: (row) => (
                        <Box>
                            <Typography variant="subtitle2">{row.name}</Typography>
                            <Typography variant="caption">{row.description}</Typography>
                        </Box>
                    ) },
                    { id: 'category', label: 'Category', sortValue: (row) => row.category, render: (row) => row.category, hideOnMobile: true },
                    { id: 'formats', label: 'Format', render: (row) => row.formats.join(' · '), hideOnMobile: true },
                    { id: 'availability', label: 'Availability', render: (row) => {
                        const reason = unavailableReason(row);
                        return reason
                            ? <StatusBadge kind="plain" tone="medium" label="Unavailable" />
                            : <StatusBadge kind="plain" tone="success" label="Ready" />;
                    } },
                    { id: 'reason', label: 'Why', hideOnMobile: true, render: (row) => (
                        <Typography variant="caption">{unavailableReason(row) || 'Ready to generate from live records.'}</Typography>
                    ) },
                    { id: 'action', label: 'Generate', render: (row) => {
                        const reason = unavailableReason(row);
                        return (
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                {row.formats.map((format) => (
                                    <Button
                                        key={format}
                                        size="small"
                                        variant="contained"
                                        disabled={Boolean(reason) || busyId !== null}
                                        onClick={() => run(row, format)}
                                        title={reason || `Generate ${format}`}
                                    >
                                        {busyId === `${row.id}-${format}` ? <CircularProgress size={14} /> : `Generate ${format}`}
                                    </Button>
                                ))}
                            </Stack>
                        );
                    } },
                ]}
            />
        </Box>
    );
}
