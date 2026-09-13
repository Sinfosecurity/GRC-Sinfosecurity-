import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import { tprmAPI, vendorAPI } from '../services/api';
import { downloadBinaryResponse, downloadErrorMessage } from '../services/download';

type TemplateQuestion = {
    id: string;
    questionKey: string;
    questionText: string;
    options?: string[] | null;
    evidenceRequired: boolean;
    category?: string;
    conditionalOnKey?: string | null;
    conditionalValue?: string | null;
};

type Template = {
    id: string;
    name: string;
    version: string;
    framework: string;
    sections: Array<{ id: string; title: string; questions: TemplateQuestion[] }>;
};

type Assessment = {
    id: string;
    vendorId: string;
    status: string;
    assessmentType: string;
    templateId?: string;
    templateVersion?: string;
    overallScore?: number | null;
    dueDate?: string | null;
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
    }>;
};

function visibleQuestions(template: Template | undefined, answers: Record<string, string>) {
    if (!template) return [];
    return template.sections.flatMap((section) =>
        section.questions
            .filter((question) => {
                if (!question.conditionalOnKey) return true;
                return answers[question.conditionalOnKey] === question.conditionalValue;
            })
            .map((question) => ({ ...question, sectionTitle: section.title }))
    );
}

export default function Assessments() {
    const [searchParams] = useSearchParams();
    const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [recommendations, setRecommendations] = useState<Array<{ id: string; name: string; version: string }>>([]);
    const [vendorId, setVendorId] = useState(searchParams.get('vendorId') || '');
    const [templateId, setTemplateId] = useState('');
    const [selected, setSelected] = useState<Assessment | null>(null);
    const [sectionIndex, setSectionIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [saveState, setSaveState] = useState('All answers are saved as you go.');

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [vendorRes, templateRes, assessmentRes] = await Promise.all([
                vendorAPI.getAll({ pageSize: 100 }),
                tprmAPI.questionnaires(),
                tprmAPI.listAssessments(),
            ]);
            const vendorRows = vendorRes.data.vendors || vendorRes.data.data || vendorRes.data || [];
            setVendors(Array.isArray(vendorRows) ? vendorRows : []);
            const requested = searchParams.get('vendorId');
            if (requested && Array.isArray(vendorRows) && vendorRows.some((row: { id: string }) => row.id === requested)) {
                setVendorId(requested);
            }
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

    useEffect(() => {
        if (!vendorId) {
            setRecommendations([]);
            return;
        }
        tprmAPI.assessmentRecommendations(vendorId)
            .then((response) => setRecommendations(response.data.data.templates || []))
            .catch(() => setRecommendations([]));
    }, [vendorId]);

    const templateById = useMemo(() => Object.fromEntries(templates.map((row) => [row.id, row])), [templates]);
    const selectedTemplate = selected?.templateId ? templateById[selected.templateId] : templates.find((row) => row.id === templateId);
    const answers = Object.fromEntries((selected?.responses || []).map((row) => [row.questionId, row.response || '']));
    const visible = visibleQuestions(selectedTemplate, answers);
    const sections = Array.from(new Set(visible.map((item) => item.sectionTitle)));
    const currentSection = sections[sectionIndex] || sections[0];
    const sectionQuestions = visible.filter((item) => item.sectionTitle === currentSection);
    const answered = visible.filter((item) => answers[item.questionKey]).length;
    const evidenceDue = visible.filter((item) => item.evidenceRequired && !(selected?.responses || []).find((row) => row.questionId === item.questionKey)?.hasEvidence).length;
    const progress = visible.length ? Math.round((answered / visible.length) * 100) : 0;

    const openAssessment = async (row: Assessment) => {
        const detail = await tprmAPI.getAssessment(row.vendorId, row.id);
        setSelected(detail.data.data);
        setSectionIndex(0);
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
            setMessage('Assessment created. Answers save as you move through each section.');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const answer = async (questionId: string, response: string) => {
        if (!selected) return;
        setSaveState('Saving…');
        try {
            const updated = await tprmAPI.submitAssessmentResponse(selected.vendorId, selected.id, { questionId, response });
            setSelected(updated.data.data);
            setSaveState('Saved.');
        } catch (err: any) {
            setSaveState('Not saved.');
            setError(err.message);
        }
    };

    const complete = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            const updated = await tprmAPI.completeAssessment(selected.vendorId, selected.id);
            setSelected(updated.data.data);
            await load();
            setMessage('Assessment submitted. Residual risk was recalculated from persisted inputs.');
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

    return (
        <Box sx={{ maxWidth: 1200 }}>
            <Typography variant="overline" sx={{ color: '#fbbf24', fontWeight: 800, letterSpacing: '0.14em' }}>
                Assessments
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Questionnaire workspace</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                Choose a vendor, pick a Supreme template, then complete one section at a time. You can leave and resume later.
            </Typography>
            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
                <TextField select label="Vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)} sx={{ minWidth: 260 }}>
                    <MenuItem value="">Select vendor</MenuItem>
                    {vendorId && !vendors.some((vendor) => vendor.id === vendorId) && (
                        <MenuItem value={vendorId}>Selected vendor</MenuItem>
                    )}
                    {vendors.map((vendor) => (
                        <MenuItem key={vendor.id} value={vendor.id}>{vendor.name}</MenuItem>
                    ))}
                </TextField>
                <TextField select label="Template" value={templateId} onChange={(e) => setTemplateId(e.target.value)} sx={{ minWidth: 320 }}>
                    <MenuItem value="">Recommended / default</MenuItem>
                    {templates.map((template) => (
                        <MenuItem key={template.id} value={template.id}>{template.name} v{template.version}</MenuItem>
                    ))}
                </TextField>
                <Button variant="contained" disabled={!vendorId || busy} onClick={create}>Start assessment</Button>
            </Stack>
            {recommendations.length > 0 && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    Recommended for this vendor’s risk tier: {recommendations.map((row) => row.name).join(' · ')}. Scope does not change the residual-risk score.
                </Alert>
            )}
            <QueryState loading={loading} error={error} empty={assessments.length === 0 && !selected} emptyTitle="No assessments yet" emptyBody="Select a vendor and start an assessment from a Supreme template.">
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
                                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" sx={{ mb: 2 }} spacing={2}>
                                    <Box>
                                        <Typography variant="h5">{selected.vendor?.name || 'Assessment'}</Typography>
                                        <Typography color="text.secondary">{selectedTemplate?.name || 'Assessment'} · {saveState}</Typography>
                                        <Chip size="small" label={selected.status} sx={{ mt: 1, mr: 1 }} />
                                        <Chip size="small" label={`${progress}% complete`} sx={{ mt: 1 }} />
                                    </Box>
                                    <Stack direction="row" spacing={1}>
                                        <Button onClick={downloadPdf} disabled={busy}>Download PDF</Button>
                                        {selected.status !== 'COMPLETED' && (
                                            <Button variant="contained" disabled={busy} onClick={complete}>Submit for completion</Button>
                                        )}
                                    </Stack>
                                </Stack>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    {answered} of {visible.length} visible questions answered · {evidenceDue} evidence items still required
                                </Typography>
                                <LinearProgress variant="determinate" value={progress} sx={{ mb: 2 }} />
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                                    {sections.map((title, index) => (
                                        <Button key={title} size="small" variant={index === sectionIndex ? 'contained' : 'outlined'} onClick={() => setSectionIndex(index)}>
                                            {title}
                                        </Button>
                                    ))}
                                </Stack>
                                {sectionQuestions.map((question) => {
                                    const response = (selected.responses || []).find((row) => row.questionId === question.questionKey);
                                    const options = Array.isArray(question.options) ? question.options : [];
                                    return (
                                        <Box key={question.id} sx={{ mb: 2, p: 2, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
                                            <Typography fontWeight={700}>{question.questionText.split('\n')[0]}</Typography>
                                            {question.questionText.includes('Guidance:') && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                    {question.questionText.split('Guidance:')[1]}
                                                </Typography>
                                            )}
                                            <Typography variant="caption" color="text.secondary">{question.category}{question.evidenceRequired ? ' · evidence required' : ''}</Typography>
                                            <TextField
                                                select={options.length > 0}
                                                fullWidth
                                                size="small"
                                                sx={{ mt: 1 }}
                                                value={response?.response || ''}
                                                disabled={selected.status === 'COMPLETED'}
                                                onChange={(e) => answer(question.questionKey, e.target.value)}
                                            >
                                                {options.map((option) => (
                                                    <MenuItem key={option} value={option}>{option}</MenuItem>
                                                ))}
                                            </TextField>
                                            {question.evidenceRequired && selected.status !== 'COMPLETED' && (
                                                <Button component="label" sx={{ mt: 1 }}>
                                                    Attach evidence
                                                    <input hidden type="file" onChange={(event) => {
                                                        const file = event.target.files?.[0];
                                                        if (file) upload(question.questionKey, file);
                                                    }} />
                                                </Button>
                                            )}
                                            {response?.hasEvidence && <Chip size="small" label="Evidence linked" sx={{ ml: 1, mt: 1 }} />}
                                        </Box>
                                    );
                                })}
                                <Stack direction="row" justifyContent="space-between">
                                    <Button disabled={sectionIndex === 0} onClick={() => setSectionIndex((value) => Math.max(0, value - 1))}>Previous</Button>
                                    <Button disabled={sectionIndex >= sections.length - 1} onClick={() => setSectionIndex((value) => value + 1)}>Next section</Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    )}
                </Stack>
            </QueryState>
        </Box>
    );
}
