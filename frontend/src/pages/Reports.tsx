import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { tprmAPI, vendorAPI } from '../services/api';
import { downloadBinaryResponse, downloadErrorMessage } from '../services/download';

type CatalogItem = {
    id: string;
    name: string;
    description: string;
    formats: string[];
    requiresVendor?: boolean;
    requiresAssessment?: boolean;
};

const catalog: CatalogItem[] = [
    { id: 'executive', name: 'Executive report', description: 'Portfolio overview, attention, trend, top risk vendors, recommendations.', formats: ['PDF'] },
    { id: 'scorecard', name: 'Vendor scorecard', description: 'Profile, score, trend, assessments, evidence, findings, monitoring, decision status.', formats: ['PDF'], requiresVendor: true },
    { id: 'assessment', name: 'Assessment report', description: 'Persisted questionnaire, responses, scoring, evidence, gaps, outcome.', formats: ['PDF'], requiresAssessment: true },
    { id: 'findings', name: 'Findings report', description: 'Vendor, severity, owner, age, remediation, evidence, risk acceptance.', formats: ['PDF', 'CSV', 'XLSX'] },
    { id: 'monitoring', name: 'Monitoring report', description: 'Provider status plus recorded VendorMonitoring signals only.', formats: ['PDF', 'CSV'] },
    { id: 'board', name: 'Board report', description: 'Executive summary, heatmap, trend, findings, decisions, recommendations.', formats: ['PDF', 'PPTX'] },
];

export default function Reports() {
    const [searchParams] = useSearchParams();
    const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
    const [assessments, setAssessments] = useState<Array<{ id: string; vendor?: { name: string }; assessmentType: string }>>([]);
    const [vendorId, setVendorId] = useState(searchParams.get('vendorId') || '');
    const [assessmentId, setAssessmentId] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([vendorAPI.getAll(), tprmAPI.listAssessments()])
            .then(([vendorRes, assessmentRes]) => {
                const vendorRows = vendorRes.data.vendors || vendorRes.data.data || vendorRes.data || [];
                setVendors(Array.isArray(vendorRows) ? vendorRows : []);
                setAssessments(assessmentRes.data.data || []);
            })
            .catch((err) => setError(err.message));
    }, []);

    const unavailableReason = (item: CatalogItem) => {
        if (item.requiresVendor && !vendorId) return 'Select a vendor before generating a scorecard.';
        if (item.requiresAssessment && !assessmentId) return 'Select a persisted assessment before generating this report.';
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
        <Box sx={{ maxWidth: 1100 }}>
            <Typography variant="overline" sx={{ color: '#94a3b8', fontWeight: 800, letterSpacing: '0.14em' }}>Reports</Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Generate and download</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                Files are generated on the server from tenant-scoped records. Buttons that cannot produce a real file stay disabled.
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
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
            <Stack spacing={2}>
                {catalog.map((item) => {
                    const reason = unavailableReason(item);
                    return (
                        <Card key={item.id} sx={{ bgcolor: 'rgba(15,23,42,0.85)' }}>
                            <CardContent>
                                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                                    <Box>
                                        <Typography fontWeight={800}>{item.name}</Typography>
                                        <Typography color="text.secondary">{item.description}</Typography>
                                        {reason && <Chip size="small" sx={{ mt: 1 }} label={reason} />}
                                    </Box>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        {item.formats.map((format) => (
                                            <Button
                                                key={format}
                                                variant="contained"
                                                disabled={Boolean(reason) || busyId !== null}
                                                onClick={() => run(item, format)}
                                            >
                                                {busyId === `${item.id}-${format}` ? <CircularProgress size={16} /> : `Download ${format}`}
                                            </Button>
                                        ))}
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>
                    );
                })}
            </Stack>
        </Box>
    );
}
