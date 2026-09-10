import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import { tprmAPI, vendorAPI } from '../services/api';
import { downloadBinaryResponse, downloadErrorMessage } from '../services/download';

type Template = {
    id: string;
    name: string;
    version: string;
    framework: string;
    sections: Array<{
        id: string;
        title: string;
        questions: Array<{
            id: string;
            questionKey: string;
            questionText: string;
            options?: string[] | null;
            evidenceRequired: boolean;
        }>;
    }>;
};

type Assessment = {
    id: string;
    vendorId: string;
    status: string;
    assessmentType: string;
    templateVersion?: string;
    overallScore?: number | null;
    vendor?: { id: string; name: string };
    responses?: Array<{
        id: string;
        questionId: string;
        questionText: string;
        questionCategory: string;
        response?: string | null;
        score?: number | null;
        maxScore: number;
        evidenceRequired: boolean;
        hasEvidence: boolean;
        notes?: string | null;
        options?: string[];
    }>;
};

export default function Assessments() {
    const params = new URLSearchParams(window.location.search);
    const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [vendorId, setVendorId] = useState(params.get('vendorId') || '');
    const [templateId, setTemplateId] = useState('');
    const [selected, setSelected] = useState<Assessment | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [vendorRes, templateRes, assessmentRes] = await Promise.all([
                vendorAPI.getAll(),
                tprmAPI.questionnaires(),
                tprmAPI.listAssessments(),
            ]);
            const vendorRows = vendorRes.data.vendors || vendorRes.data.data || vendorRes.data || [];
            setVendors(Array.isArray(vendorRows) ? vendorRows : []);
            setTemplates(templateRes.data.data || []);
            setAssessments(assessmentRes.data.data || []);
        } catch (err: any) {
            setError(err.message || 'Unable to load assessments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const openAssessment = async (row: Assessment) => {
        const detail = await tprmAPI.getAssessment(row.vendorId, row.id);
        setSelected(detail.data.data);
    };

    const create = async () => {
        if (!vendorId) return;
        setBusy(true);
        setMessage(null);
        try {
            const created = await tprmAPI.createAssessment(vendorId, {
                assessmentType: 'INITIAL_DUE_DILIGENCE',
                templateId: templateId || undefined,
            });
            await load();
            await openAssessment(created.data.data);
            setMessage('Assessment created from the database questionnaire template.');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const answer = async (questionId: string, response: string) => {
        if (!selected) return;
        const updated = await tprmAPI.submitAssessmentResponse(selected.vendorId, selected.id, { questionId, response });
        setSelected(updated.data.data);
    };

    const complete = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            const updated = await tprmAPI.completeAssessment(selected.vendorId, selected.id);
            setSelected(updated.data.data);
            await load();
            setMessage('Assessment completed. Residual risk was recalculated from persisted inputs.');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const upload = async (questionId: string, file: File) => {
        if (!selected) return;
        const form = new FormData();
        form.append('file', file);
        form.append('vendorId', selected.vendorId);
        form.append('assessmentId', selected.id);
        form.append('questionId', questionId);
        await tprmAPI.uploadEvidence(form);
        await openAssessment(selected);
    };

    const downloadPdf = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            const response = await tprmAPI.downloadAssessmentPdf(selected.id);
            await downloadBinaryResponse(response, 'Supreme-Risk-Assessment.pdf');
        } catch (err) {
            setError(downloadErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const templateById = useMemo(() => Object.fromEntries(templates.map((row) => [row.id, row])), [templates]);

    return (
        <Box sx={{ maxWidth: 1200 }}>
            <Typography variant="overline" sx={{ color: '#fbbf24', fontWeight: 800, letterSpacing: '0.14em' }}>
                Assessments
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Questionnaire workspace</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                Questions come from persisted questionnaire templates. Completing an assessment writes scores and evidence links to the database.
            </Typography>
            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
                <TextField select label="Vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)} sx={{ minWidth: 260 }}>
                    {vendors.map((vendor) => (
                        <MenuItem key={vendor.id} value={vendor.id}>{vendor.name}</MenuItem>
                    ))}
                </TextField>
                <TextField select label="Template" value={templateId} onChange={(e) => setTemplateId(e.target.value)} sx={{ minWidth: 280 }}>
                    <MenuItem value="">Active default</MenuItem>
                    {templates.map((template) => (
                        <MenuItem key={template.id} value={template.id}>{template.name} v{template.version}</MenuItem>
                    ))}
                </TextField>
                <Button variant="contained" disabled={!vendorId || busy} onClick={create}>Create assessment</Button>
            </Stack>
            <QueryState loading={loading} error={error} empty={assessments.length === 0 && !selected} emptyTitle="No assessments" emptyBody="Create an assessment from a vendor and a database template.">
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <Card sx={{ flex: 1, bgcolor: 'rgba(15,23,42,0.8)' }}>
                        <CardContent>
                            {assessments.map((row) => (
                                <Box key={row.id} onClick={() => openAssessment(row)} sx={{ py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                                    <Typography fontWeight={700}>{row.vendor?.name || row.vendorId}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {row.assessmentType} · {row.status} · template {row.templateVersion || '—'}
                                    </Typography>
                                </Box>
                            ))}
                        </CardContent>
                    </Card>
                    {selected && (
                        <Card sx={{ flex: 2, bgcolor: 'rgba(15,23,42,0.8)' }}>
                            <CardContent>
                                <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                                    <Box>
                                        <Typography variant="h5">{selected.vendor?.name || 'Assessment'}</Typography>
                                        <Chip size="small" label={selected.status} sx={{ mt: 1 }} />
                                    </Box>
                                    <Stack direction="row" spacing={1}>
                                        <Button onClick={downloadPdf} disabled={busy}>Download PDF</Button>
                                        {selected.status !== 'COMPLETED' && (
                                            <Button variant="contained" disabled={busy} onClick={complete}>Complete</Button>
                                        )}
                                    </Stack>
                                </Stack>
                                {(selected.responses || []).map((question) => {
                                    const sectionQuestion = Object.values(templateById).flatMap((template) => template.sections.flatMap((section) => section.questions)).find((item) => item.questionKey === question.questionId);
                                    const options = Array.isArray(sectionQuestion?.options) ? sectionQuestion!.options! : [];
                                    return (
                                        <Box key={question.id} sx={{ mb: 2, p: 2, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
                                            <Typography fontWeight={700}>{question.questionText || question.questionId}</Typography>
                                            <Typography variant="caption" color="text.secondary">{question.questionCategory}{question.evidenceRequired ? ' · evidence required' : ''}</Typography>
                                            {options.length ? (
                                                <TextField
                                                    select
                                                    fullWidth
                                                    size="small"
                                                    sx={{ mt: 1 }}
                                                    value={question.response || ''}
                                                    disabled={selected.status === 'COMPLETED'}
                                                    onChange={(e) => answer(question.questionId, e.target.value)}
                                                >
                                                    {options.map((option) => (
                                                        <MenuItem key={option} value={option}>{option}</MenuItem>
                                                    ))}
                                                </TextField>
                                            ) : (
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    sx={{ mt: 1 }}
                                                    value={question.response || ''}
                                                    disabled={selected.status === 'COMPLETED'}
                                                    onChange={(e) => answer(question.questionId, e.target.value)}
                                                />
                                            )}
                                            {question.evidenceRequired && selected.status !== 'COMPLETED' && (
                                                <Button component="label" sx={{ mt: 1 }}>
                                                    Attach evidence
                                                    <input hidden type="file" onChange={(event) => {
                                                        const file = event.target.files?.[0];
                                                        if (file) upload(question.questionId, file);
                                                    }} />
                                                </Button>
                                            )}
                                            {question.hasEvidence && <Chip size="small" label="Evidence linked" sx={{ ml: 1, mt: 1 }} />}
                                        </Box>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    )}
                </Stack>
            </QueryState>
        </Box>
    );
}
