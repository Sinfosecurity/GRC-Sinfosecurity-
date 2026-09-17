import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import AppTable from '../components/design/AppTable';
import Surface from '../components/design/Surface';
import { complianceAPI, ermAPI, sccAPI, tprmAPI, vendorAPI } from '../services/api';
import { downloadBinaryResponse, downloadErrorMessage } from '../services/download';
import { formatShortDate, humanizeLabel } from '../utils/humanizeLabel';

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
    { id: 'executive', name: 'Executive report', category: 'Executive', description: 'For leadership. Portfolio overview, attention, trend, top residual-risk vendors, and recommendations.', formats: ['PDF'], kind: 'operational' },
    { id: 'scorecard', name: 'Vendor scorecard', category: 'Third Party', description: 'Profile, score, assessments, evidence, findings, monitoring, and decision status for one vendor.', formats: ['PDF'], requiresVendor: true, kind: 'operational' },
    { id: 'assessment', name: 'Assessment report', category: 'Third Party', description: 'Persisted questionnaire, responses, scoring, evidence, gaps, and outcome.', formats: ['PDF'], requiresAssessment: true, kind: 'operational' },
    { id: 'findings', name: 'Findings report', category: 'Third Party', description: 'Vendor, severity, owner, age, remediation, evidence, and risk acceptance.', formats: ['PDF', 'CSV', 'XLSX'], kind: 'operational' },
    { id: 'monitoring', name: 'Monitoring report', category: 'Third Party', description: 'Provider status plus recorded vendor signals only. External ratings are not invented.', formats: ['PDF', 'CSV'], kind: 'operational' },
    { id: 'board', name: 'Board report', category: 'Executive', description: 'Executive summary, heatmap, trend, findings, decisions, and recommendations.', formats: ['PDF', 'PPTX'], kind: 'board' },
    { id: 'control-coverage', name: 'Control coverage', category: 'Controls / Evidence', description: 'Implemented, tested, ineffective, and findings-linked controls. Readiness only — not certification.', formats: ['PDF'], kind: 'operational' },
    { id: 'evidence-coverage', name: 'Evidence coverage', category: 'Controls / Evidence', description: 'Ready usable objects, reuse count, and honesty that a file does not prove every mapping.', formats: ['PDF'], kind: 'operational' },
    { id: 'framework-readiness', name: 'Framework readiness', category: 'Controls / Evidence', description: 'Mapped, implemented, tested, and gap counts for framework identifiers. Not compliant or certified.', formats: ['PDF'], kind: 'operational' },
    { id: 'control-testing', name: 'Control testing', category: 'Controls / Evidence', description: 'Recorded test results from this organization. Not applicable is not treated as pass.', formats: ['PDF'], kind: 'operational' },
    { id: 'erm-profile', name: 'Enterprise risk profile', category: 'Risk', description: 'Active enterprise risks, appetite exceptions, and top residual ratings. Ordinal scores are not summed.', formats: ['PDF'], kind: 'operational' },
    { id: 'erm-top-risks', name: 'Top risks', category: 'Risk', description: 'Highest residual enterprise risks from live tenant records.', formats: ['PDF'], kind: 'operational' },
    { id: 'erm-appetite', name: 'Risk appetite / exceptions', category: 'Risk', description: 'Configured appetite and risks outside or near tolerance. Not configured is shown as not configured.', formats: ['PDF'], kind: 'operational' },
    { id: 'erm-treatment', name: 'Risk treatment status', category: 'Risk', description: 'Treatment attention from live plans. A plan does not lower residual risk by itself.', formats: ['PDF'], kind: 'operational' },
    { id: 'erm-board', name: 'Board risk summary', category: 'Risk', description: 'Board-facing enterprise risk counts, heatmap, appetite exceptions, and attention. Ordinal scores are not summed.', formats: ['PDF', 'PPTX'], kind: 'board' },
    { id: 'erm-register', name: 'Enterprise risk register', category: 'Risk', description: 'CSV/XLSX of live enterprise risks with formula-injection protection.', formats: ['CSV', 'XLSX'], kind: 'operational' },
    { id: 'cmp-readiness', name: 'Framework readiness', category: 'Compliance', description: 'Mapped, implemented, tested, and evidence coverage. Not certified or compliant.', formats: ['PDF'], kind: 'operational' },
    { id: 'cmp-gaps', name: 'Framework gap report', category: 'Compliance', description: 'Open gaps from live mappings, tests, evidence, and exceptions.', formats: ['PDF'], kind: 'operational' },
    { id: 'cmp-attestations', name: 'Control attestation report', category: 'Compliance', description: 'Attestation campaigns. An attestation is not a control test.', formats: ['PDF'], kind: 'operational' },
    { id: 'cmp-evidence', name: 'Evidence coverage report', category: 'Compliance', description: 'Ready current evidence coverage. A file is not compliance.', formats: ['PDF'], kind: 'operational' },
    { id: 'cmp-exceptions', name: 'Exceptions report', category: 'Compliance', description: 'Governed exceptions. An exception does not make a control effective.', formats: ['PDF'], kind: 'operational' },
    { id: 'cmp-executive', name: 'Compliance executive summary', category: 'Compliance', description: 'Program posture, readiness, gaps, and attention from live records.', formats: ['PDF'], kind: 'board' },
    { id: 'cmp-board', name: 'Compliance board summary', category: 'Compliance', description: 'Board-facing readiness, gaps, exceptions, and attention. Not certification.', formats: ['PDF', 'PPTX'], kind: 'board' },
    { id: 'cmp-register', name: 'Requirements / controls / gaps', category: 'Compliance', description: 'CSV/XLSX of activated requirement states with formula-injection protection.', formats: ['CSV', 'XLSX'], kind: 'operational' },
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

type AssessmentRow = {
    id: string;
    vendorId?: string;
    vendor?: { id?: string; name?: string };
    assessmentType: string;
    status: string;
    templateName?: string | null;
    templateVersion?: string | null;
    createdAt?: string;
    completedAt?: string | null;
    updatedAt?: string;
};

const ACTIVE_STATUSES = new Set(['COMPLETED', 'IN_PROGRESS', 'PENDING_REVIEW', 'PENDING_APPROVAL']);

function assessmentDate(row: AssessmentRow) {
    return row.completedAt || row.updatedAt || row.createdAt || null;
}

function statusRank(status: string) {
    if (status === 'COMPLETED') return 3;
    if (status === 'IN_PROGRESS' || status === 'PENDING_REVIEW' || status === 'PENDING_APPROVAL') return 2;
    if (status === 'NOT_STARTED') return 1;
    return 0;
}

export function pickLatestAssessment(rows: AssessmentRow[]) {
    return [...rows].sort((left, right) => {
        const rank = statusRank(right.status) - statusRank(left.status);
        if (rank !== 0) return rank;
        return new Date(assessmentDate(right) || 0).getTime() - new Date(assessmentDate(left) || 0).getTime();
    })[0] || null;
}

export default function Reports() {
    const [searchParams] = useSearchParams();
    const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
    const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
    const [vendorId, setVendorId] = useState(searchParams.get('vendorId') || '');
    const [assessmentId, setAssessmentId] = useState('');
    const [showHistory, setShowHistory] = useState(false);
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

    const vendorAssessments = useMemo(
        () => assessments.filter((row) => (row.vendorId || row.vendor?.id) === vendorId && row.status !== 'CANCELLED'),
        [assessments, vendorId],
    );
    const latest = useMemo(() => pickLatestAssessment(vendorAssessments), [vendorAssessments]);
    const history = useMemo(
        () => vendorAssessments.filter((row) => row.id !== latest?.id),
        [vendorAssessments, latest],
    );

    useEffect(() => {
        if (!vendorId) {
            setAssessmentId('');
            setShowHistory(false);
            return;
        }
        const preferred = pickLatestAssessment(vendorAssessments.filter((row) => ACTIVE_STATUSES.has(row.status)));
        setAssessmentId(preferred?.id || '');
    }, [vendorId, vendorAssessments]);

    const selected = vendorAssessments.find((row) => row.id === assessmentId) || latest;

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
            else if (['control-coverage', 'evidence-coverage', 'framework-readiness', 'control-testing'].includes(item.id)) {
                response = await sccAPI.downloadReport(item.id, 'pdf');
            }
            else if (item.id === 'erm-profile') response = await ermAPI.downloadReport('profile');
            else if (item.id === 'erm-top-risks') response = await ermAPI.downloadReport('top-risks');
            else if (item.id === 'erm-appetite') response = await ermAPI.downloadReport('appetite');
            else if (item.id === 'erm-treatment') response = await ermAPI.downloadReport('treatment');
            else if (item.id === 'erm-board') response = fmt === 'pptx' ? await ermAPI.downloadBoardPptx() : await ermAPI.downloadReport('board');
            else if (item.id === 'erm-register') response = await ermAPI.exportRegister(fmt as 'csv' | 'xlsx');
            else if (item.id === 'cmp-readiness') response = await complianceAPI.downloadReport('readiness');
            else if (item.id === 'cmp-gaps') response = await complianceAPI.downloadReport('gaps');
            else if (item.id === 'cmp-attestations') response = await complianceAPI.downloadReport('attestations');
            else if (item.id === 'cmp-evidence') response = await complianceAPI.downloadReport('evidence');
            else if (item.id === 'cmp-exceptions') response = await complianceAPI.downloadReport('exceptions');
            else if (item.id === 'cmp-executive') response = await complianceAPI.downloadReport('executive');
            else if (item.id === 'cmp-board') response = fmt === 'pptx' ? await complianceAPI.downloadBoardPptx() : await complianceAPI.downloadReport('board');
            else if (item.id === 'cmp-register') response = await complianceAPI.exportRegister(fmt as 'csv' | 'xlsx');
            else response = await tprmAPI.downloadBoard(fmt as 'pdf' | 'pptx');
            const filename = await downloadBinaryResponse(response, `Supreme-Governance-${item.id}.${fmt}`);
            setSuccess(`Downloaded ${filename}`);
        } catch (err) {
            setError(downloadErrorMessage(err));
        } finally {
            setBusyId(null);
        }
    };

    const renderAssessmentCard = (row: AssessmentRow, current: boolean) => (
        <Box
            key={row.id}
            component="button"
            type="button"
            onClick={() => setAssessmentId(row.id)}
            data-testid={current ? 'current-assessment' : 'history-assessment'}
            sx={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                p: 1.5,
                border: `1px solid ${assessmentId === row.id ? 'currentColor' : 'inherit'}`,
                borderRadius: '6px',
                bgcolor: 'transparent',
                cursor: 'pointer',
                font: 'inherit',
                color: 'inherit',
            }}
        >
            <Typography variant="subtitle2">{humanizeLabel(row.assessmentType)}</Typography>
            <Typography variant="body2">
                {humanizeLabel(row.status)} · {formatShortDate(assessmentDate(row))}
            </Typography>
            {row.templateName && (
                <Typography variant="caption" display="block">
                    {row.templateName}{row.templateVersion ? ` ${row.templateVersion}` : ''}
                </Typography>
            )}
        </Box>
    );

    return (
        <Box sx={{ maxWidth: 1200 }}>
            <PageHeader
                title="Reports"
                description="Executive deliverables from this organization’s records. Each report names its audience, scope, and format. Unavailable actions explain why — they will not fail after you click."
            />
            {(capabilities?.testingAccess || capabilities?.isDemo) && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Evaluation access is enabled for this organization. Available downloads follow your role. Billing remains test-only and is not a production subscription.
                </Alert>
            )}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            <Stack spacing={1.5} sx={{ mb: 3 }}>
                <TextField select label="Vendor scope" value={vendorId} onChange={(e) => setVendorId(e.target.value)} sx={{ minWidth: 260, maxWidth: 420 }}>
                    <MenuItem value="">All vendors</MenuItem>
                    {vendorId && !vendors.some((vendor) => vendor.id === vendorId) && (
                        <MenuItem value={vendorId}>Selected vendor</MenuItem>
                    )}
                    {vendors.map((vendor) => <MenuItem key={vendor.id} value={vendor.id}>{vendor.name}</MenuItem>)}
                </TextField>
                {vendorId && (
                    <Surface>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Current assessment</Typography>
                        {latest
                            ? renderAssessmentCard(latest, true)
                            : <Typography variant="body2">No assessments are recorded for this vendor.</Typography>}
                        {selected && (
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                Assessment report will use {humanizeLabel(selected.assessmentType)}
                                {selected.templateName ? ` · ${selected.templateName}` : ''} · {humanizeLabel(selected.status)}.
                            </Typography>
                        )}
                        {history.length > 0 && (
                            <Box sx={{ mt: 2 }} data-testid="assessment-history">
                                <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => setShowHistory((open) => !open)}
                                    aria-expanded={showHistory}
                                >
                                    {showHistory ? 'Hide other assessments' : `Show other assessments (${history.length})`}
                                </Button>
                                {showHistory && (
                                    <Box sx={{ mt: 1 }}>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            Historical questionnaires stay available when you need a specific report. They do not replace the current assessment.
                                        </Typography>
                                        <Stack spacing={1}>
                                            {history.map((row) => renderAssessmentCard(row, false))}
                                        </Stack>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Surface>
                )}
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
