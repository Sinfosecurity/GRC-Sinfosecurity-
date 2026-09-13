import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    InputAdornment,
    LinearProgress,
    MenuItem,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import Surface from '../components/design/Surface';
import MetricCard from '../components/design/MetricCard';
import WorkflowStepper from '../components/design/WorkflowStepper';
import { color } from '../design/tokens';
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
    purpose?: string;
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

type PlanItem = {
    id: string;
    name: string;
    version: string;
    reason?: string;
    purpose?: string;
};

type VendorRow = {
    id: string;
    name: string;
    tier?: string;
    vendorType?: string;
    inherentRiskScore?: number | null;
    residualRiskScore?: number | null;
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

function customerError(err: any) {
    const message = err?.message || 'Something went wrong.';
    if (/billing|good standing|PAST_DUE|subscription/i.test(message)) {
        return 'This assessment could not start. Ask your organization administrator to confirm access, then try again.';
    }
    return message;
}

const WIZARD_STEPS = ['Select third party', 'Recommended plan', 'Customize', 'Review'];

export default function Assessments() {
    const [searchParams] = useSearchParams();
    const [vendors, setVendors] = useState<VendorRow[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [tab, setTab] = useState(0);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(0);
    const [vendorQuery, setVendorQuery] = useState('');
    const [vendorId, setVendorId] = useState(searchParams.get('vendorId') || '');
    const [dueDate, setDueDate] = useState('');
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
    const [plan, setPlan] = useState<{ required: PlanItem[]; recommended: PlanItem[]; optional: PlanItem[]; rationale?: string; vendor?: VendorRow } | null>(null);
    const [selected, setSelected] = useState<Assessment | null>(null);
    const [sectionIndex, setSectionIndex] = useState(0);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [saveState, setSaveState] = useState('Answers save when you change them.');

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
            setError(err.message || 'Unable to load assessments.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        if (!vendorId || !wizardOpen) return;
        tprmAPI.assessmentRecommendations(vendorId)
            .then((response) => {
                const data = response.data.data;
                setPlan(data);
                const defaults = [...(data.required || []), ...(data.recommended || [])].map((row: PlanItem) => row.id);
                setSelectedTemplateIds(defaults);
            })
            .catch(() => setPlan(null));
    }, [vendorId, wizardOpen]);

    const templateById = useMemo(() => Object.fromEntries(templates.map((row) => [row.id, row])), [templates]);
    const selectedTemplate = selected?.templateId ? templateById[selected.templateId] : undefined;
    const answers = Object.fromEntries((selected?.responses || []).map((row) => [row.questionId, row.response || '']));
    const visible = visibleQuestions(selectedTemplate, answers);
    const sections = Array.from(new Set(visible.map((item) => item.sectionTitle)));
    const currentSection = sections[sectionIndex] || sections[0];
    const sectionQuestions = visible.filter((item) => item.sectionTitle === currentSection);
    const currentQuestion = sectionQuestions[questionIndex] || sectionQuestions[0];
    const answered = visible.filter((item) => answers[item.questionKey]).length;
    const evidenceDue = visible.filter((item) => item.evidenceRequired && !(selected?.responses || []).find((row) => row.questionId === item.questionKey)?.hasEvidence).length;
    const progress = visible.length ? Math.round((answered / visible.length) * 100) : 0;

    const now = Date.now();
    const summary = useMemo(() => {
        const active = assessments.filter((row) => row.status !== 'COMPLETED');
        const completed = assessments.filter((row) => row.status === 'COMPLETED');
        const overdue = active.filter((row) => row.dueDate && new Date(row.dueDate).getTime() < now);
        const dueSoon = active.filter((row) => {
            if (!row.dueDate) return false;
            const due = new Date(row.dueDate).getTime();
            return due >= now && due <= now + 7 * 86400000;
        });
        const awaiting = active.filter((row) => /REVIEW|APPROVAL|PENDING/i.test(row.status));
        return { active: active.length, dueSoon: dueSoon.length, overdue: overdue.length, awaiting: awaiting.length, completed: completed.length };
    }, [assessments, now]);

    const filteredAssessments = assessments.filter((row) => {
        if (tab === 1) {
            const overdue = row.dueDate && new Date(row.dueDate).getTime() < now && row.status !== 'COMPLETED';
            return overdue || /REVIEW|APPROVAL|OVERDUE/i.test(row.status);
        }
        if (tab === 2) return row.status === 'COMPLETED';
        if (tab === 3) return false;
        return row.status !== 'COMPLETED';
    });

    const openAssessment = async (row: Assessment) => {
        const detail = await tprmAPI.getAssessment(row.vendorId, row.id);
        setSelected(detail.data.data);
        setSectionIndex(0);
        setQuestionIndex(0);
        setWizardOpen(false);
    };

    const startWizard = () => {
        setWizardOpen(true);
        setWizardStep(vendorId ? 1 : 0);
        setMessage(null);
        setError(null);
    };

    const create = async () => {
        if (!vendorId || selectedTemplateIds.length === 0) return;
        setBusy(true);
        setMessage(null);
        try {
            const primary = selectedTemplateIds[0];
            const created = await tprmAPI.createAssessment(vendorId, {
                assessmentType: 'INITIAL_DUE_DILIGENCE',
                templateId: primary,
                dueDate: dueDate || undefined,
            });
            for (const extra of selectedTemplateIds.slice(1)) {
                await tprmAPI.createAssessment(vendorId, {
                    assessmentType: 'INITIAL_DUE_DILIGENCE',
                    templateId: extra,
                    dueDate: dueDate || undefined,
                });
            }
            await load();
            await openAssessment(created.data.data);
            setMessage(selectedTemplateIds.length > 1
                ? 'Assessments created. Continue the first questionnaire now; the others appear in Assessment Center.'
                : 'Assessment created. Complete one question at a time.');
        } catch (err: any) {
            setError(customerError(err));
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
            setSaveState('Not saved. Your last change was not recorded.');
            setError(customerError(err));
        }
    };

    const complete = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            const updated = await tprmAPI.completeAssessment(selected.vendorId, selected.id);
            setSelected(updated.data.data);
            await load();
            setMessage('Assessment submitted. Residual risk was recalculated from persisted answers.');
        } catch (err: any) {
            setError(customerError(err));
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

    const vendorMatches = vendors.filter((vendor) => vendor.name.toLowerCase().includes(vendorQuery.toLowerCase()));
    const chosenVendor = vendors.find((vendor) => vendor.id === vendorId);
    const planGroups = [
        { title: 'Required', items: plan?.required || [] },
        { title: 'Recommended', items: plan?.recommended || [] },
        { title: 'Optional', items: plan?.optional || [] },
    ];

    if (selected) {
        const [prompt, ...guidance] = (currentQuestion?.questionText || '').split('\n');
        const response = (selected.responses || []).find((row) => row.questionId === currentQuestion?.questionKey);
        const options = Array.isArray(currentQuestion?.options) ? currentQuestion.options : [];
        return (
            <Box sx={{ maxWidth: 1360 }}>
                {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
                {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
                <Surface padded={false}>
                    <Box sx={{ p: 2.5, borderBottom: `1px solid ${color.line}` }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                            <Box>
                                <Button size="small" onClick={() => setSelected(null)}>Back to Assessment Center</Button>
                                <Typography variant="h1">{selected.vendor?.name || 'Assessment'}</Typography>
                                <Typography variant="body2">{selectedTemplate?.name || 'Assessment'} · {saveState}</Typography>
                                <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                                    <StatusBadge value={selected.status} kind="plain" />
                                    {selected.dueDate && <StatusBadge kind="plain" tone="info" label={`Due ${selected.dueDate.slice(0, 10)}`} />}
                                </Stack>
                            </Box>
                            <Stack direction="row" spacing={1}>
                                <Button onClick={downloadPdf} disabled={busy}>Download PDF</Button>
                                {selected.status !== 'COMPLETED' && (
                                    <Button variant="contained" disabled={busy} onClick={complete}>Submit</Button>
                                )}
                            </Stack>
                        </Stack>
                        <Typography variant="caption" sx={{ display: 'block', mt: 1.5 }}>
                            {progress}% complete · {answered} of {visible.length} answered · {evidenceDue} evidence requests outstanding
                        </Typography>
                        <LinearProgress variant="determinate" value={progress} sx={{ mt: 0.75 }} />
                    </Box>
                    <Stack direction={{ xs: 'column', lg: 'row' }}>
                        <Box sx={{ width: { xs: '100%', lg: 240 }, p: 2, borderRight: { lg: `1px solid ${color.line}` } }}>
                            <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>Sections</Typography>
                            <Stack spacing={0.5}>
                                {sections.map((title, index) => {
                                    const count = visible.filter((item) => item.sectionTitle === title);
                                    const done = count.filter((item) => answers[item.questionKey]).length;
                                    return (
                                        <Button
                                            key={title}
                                            size="small"
                                            variant={index === sectionIndex ? 'contained' : 'text'}
                                            onClick={() => { setSectionIndex(index); setQuestionIndex(0); }}
                                            sx={{ justifyContent: 'flex-start' }}
                                        >
                                            {title} · {done}/{count.length}
                                        </Button>
                                    );
                                })}
                            </Stack>
                        </Box>
                        <Box sx={{ flex: 1, p: 2.5 }}>
                            {currentQuestion ? (
                                <>
                                    <Typography variant="overline">{currentSection}</Typography>
                                    <Typography variant="h3" sx={{ mb: 1 }}>{prompt}</Typography>
                                    {guidance.length > 0 && (
                                        <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                                            {guidance.join('\n').replace(/^Guidance:\s*/i, '')}
                                        </Typography>
                                    )}
                                    <TextField
                                        select={options.length > 0}
                                        fullWidth
                                        multiline={options.length === 0}
                                        minRows={options.length === 0 ? 3 : undefined}
                                        value={response?.response || ''}
                                        disabled={selected.status === 'COMPLETED'}
                                        onChange={(e) => answer(currentQuestion.questionKey, e.target.value)}
                                        label="Answer"
                                    >
                                        {options.map((option) => (
                                            <MenuItem key={option} value={option}>{option}</MenuItem>
                                        ))}
                                    </TextField>
                                    {currentQuestion.evidenceRequired && selected.status !== 'COMPLETED' && (
                                        <Button component="label" sx={{ mt: 1.5 }}>
                                            Request / attach evidence
                                            <input hidden type="file" onChange={(event) => {
                                                const file = event.target.files?.[0];
                                                if (file) upload(currentQuestion.questionKey, file);
                                            }} />
                                        </Button>
                                    )}
                                    {response?.hasEvidence && <Box sx={{ mt: 1 }}><StatusBadge kind="plain" tone="success" label="Evidence linked" /></Box>}
                                    <Stack direction="row" justifyContent="space-between" sx={{ pt: 3 }}>
                                        <Button
                                            disabled={sectionIndex === 0 && questionIndex === 0}
                                            onClick={() => {
                                                if (questionIndex > 0) {
                                                    setQuestionIndex((value) => value - 1);
                                                    return;
                                                }
                                                if (sectionIndex > 0) {
                                                    const previousTitle = sections[sectionIndex - 1];
                                                    const previousCount = visible.filter((item) => item.sectionTitle === previousTitle).length;
                                                    setSectionIndex((value) => value - 1);
                                                    setQuestionIndex(Math.max(0, previousCount - 1));
                                                }
                                            }}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="contained"
                                            disabled={sectionIndex >= sections.length - 1 && questionIndex >= sectionQuestions.length - 1}
                                            onClick={() => {
                                                if (questionIndex < sectionQuestions.length - 1) setQuestionIndex((value) => value + 1);
                                                else {
                                                    setSectionIndex((value) => value + 1);
                                                    setQuestionIndex(0);
                                                }
                                            }}
                                        >
                                            Save & next
                                        </Button>
                                    </Stack>
                                </>
                            ) : (
                                <Typography>This section has no visible questions for the current answers.</Typography>
                            )}
                        </Box>
                        <Box sx={{ width: { xs: '100%', lg: 280 }, p: 2, borderLeft: { lg: `1px solid ${color.line}` }, bgcolor: color.surfaceMuted }}>
                            <Typography variant="overline">Why we ask this</Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                {currentQuestion?.category || 'Control review'} — answers stay on this vendor record and can be resumed later.
                            </Typography>
                            {selectedTemplate?.framework && (
                                <Typography variant="body2" sx={{ mt: 1.5 }}>
                                    Mapping: {selectedTemplate.framework}. Aligned assessment — does not provide certification.
                                </Typography>
                            )}
                            {currentQuestion?.evidenceRequired && (
                                <Typography variant="body2" sx={{ mt: 1.5 }}>Evidence is required before this question is complete.</Typography>
                            )}
                        </Box>
                    </Stack>
                </Surface>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1280 }}>
            <PageHeader
                title="Assessments"
                description="Evaluate third parties using risk-based due diligence. Start from a recommended plan, not a blank form."
                actions={<Button variant="contained" onClick={startWizard}>New assessment</Button>}
            />
            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }} useFlexGap flexWrap="wrap">
                <MetricCard label="Active" value={summary.active} />
                <MetricCard label="Due soon" value={summary.dueSoon} />
                <MetricCard label="Overdue" value={summary.overdue} />
                <MetricCard label="Awaiting review" value={summary.awaiting} />
                <MetricCard label="Completed" value={summary.completed} />
            </Stack>

            <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
                <Tab label="Active" />
                <Tab label="Needs attention" />
                <Tab label="Completed" />
                <Tab label="Templates" />
            </Tabs>

            {tab === 3 ? (
                <Stack spacing={1.5}>
                    {templates.map((template) => (
                        <Surface key={template.id}>
                            <Typography variant="subtitle1">{template.name}</Typography>
                            <Typography variant="body2">{template.framework} · v{template.version}</Typography>
                            <Typography variant="caption">Aligned assessment — does not provide certification.</Typography>
                        </Surface>
                    ))}
                </Stack>
            ) : (
                <QueryState
                    loading={loading}
                    error={null}
                    empty={filteredAssessments.length === 0}
                    emptyTitle="No active assessments"
                    emptyBody="Start a risk-based assessment to evaluate a third party's security, privacy and operational controls."
                    emptyAction={<Button variant="contained" onClick={startWizard}>New assessment</Button>}
                >
                    <Stack spacing={1}>
                        {filteredAssessments.map((row) => (
                            <Box
                                key={row.id}
                                onClick={() => openAssessment(row)}
                                sx={{
                                    p: 2,
                                    cursor: 'pointer',
                                    border: `1px solid ${color.line}`,
                                    bgcolor: color.surface,
                                    borderRadius: '8px',
                                    '&:hover': { borderColor: color.lineStrong },
                                }}
                            >
                                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
                                    <Box>
                                        <Typography variant="subtitle1">{row.vendor?.name || 'Vendor'}</Typography>
                                        <Typography variant="body2">{templateById[row.templateId || '']?.name || row.assessmentType}</Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        {row.dueDate && <Typography variant="caption">Due {row.dueDate.slice(0, 10)}</Typography>}
                                        <StatusBadge value={row.status} kind="plain" tone={row.status === 'COMPLETED' ? 'success' : 'high'} />
                                    </Stack>
                                </Stack>
                            </Box>
                        ))}
                    </Stack>
                </QueryState>
            )}

            <Dialog open={wizardOpen} onClose={() => setWizardOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>New assessment</DialogTitle>
                <DialogContent>
                    <WorkflowStepper steps={WIZARD_STEPS} active={wizardStep} />
                    {wizardStep === 0 && (
                        <Box>
                            <TextField
                                fullWidth
                                label="Search third parties"
                                value={vendorQuery}
                                onChange={(e) => setVendorQuery(e.target.value)}
                                InputProps={{ startAdornment: <InputAdornment position="start"> </InputAdornment> }}
                                sx={{ mb: 2 }}
                            />
                            <Stack spacing={1}>
                                {vendorMatches.map((vendor) => (
                                    <Box
                                        key={vendor.id}
                                        onClick={() => setVendorId(vendor.id)}
                                        sx={{
                                            p: 1.5,
                                            border: `1px solid ${vendor.id === vendorId ? color.navy800 : color.line}`,
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            bgcolor: vendor.id === vendorId ? color.goldDim : color.surface,
                                        }}
                                    >
                                        <Typography variant="subtitle2">{vendor.name}</Typography>
                                        <Typography variant="caption">
                                            {vendor.tier || 'Tier pending'} · residual {vendor.residualRiskScore ?? '—'} · inherent {vendor.inherentRiskScore ?? '—'}
                                        </Typography>
                                    </Box>
                                ))}
                                {vendorMatches.length === 0 && <Typography variant="body2">No third parties match. Add one from the Vendors page first.</Typography>}
                            </Stack>
                        </Box>
                    )}
                    {wizardStep === 1 && (
                        <Box>
                            <Typography variant="h5">{chosenVendor?.name || 'Selected vendor'}</Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>{plan?.rationale || 'Recommendations use the recorded risk tier for this vendor.'}</Typography>
                            {planGroups.map((group) => (
                                <Box key={group.title} sx={{ mb: 2 }}>
                                    <Typography variant="overline">{group.title}</Typography>
                                    {group.items.map((item) => {
                                        const checked = selectedTemplateIds.includes(item.id);
                                        return (
                                            <Box
                                                key={item.id}
                                                onClick={() => setSelectedTemplateIds((current) => (
                                                    current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]
                                                ))}
                                                sx={{ p: 1.5, mt: 1, border: `1px solid ${color.line}`, borderRadius: '8px', cursor: 'pointer', bgcolor: checked ? color.goldDim : color.surface }}
                                            >
                                                <Typography variant="subtitle2">{checked ? '✓ ' : ''}{item.name}</Typography>
                                                <Typography variant="body2">{item.reason || item.purpose}</Typography>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            ))}
                        </Box>
                    )}
                    {wizardStep === 2 && (
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <TextField type="date" label="Due date" InputLabelProps={{ shrink: true }} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                            <Typography variant="body2">{selectedTemplateIds.length} questionnaire(s) selected. Owner assignment uses your account unless a later workflow assigns another assessor.</Typography>
                        </Stack>
                    )}
                    {wizardStep === 3 && (
                        <Box>
                            <Typography variant="subtitle1">{chosenVendor?.name}</Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>Due {dueDate || 'not set'}</Typography>
                            {selectedTemplateIds.map((id) => (
                                <Typography key={id} variant="body2">• {templates.find((row) => row.id === id)?.name || id}</Typography>
                            ))}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setWizardOpen(false)}>Cancel</Button>
                    {wizardStep > 0 && <Button onClick={() => setWizardStep((value) => value - 1)}>Back</Button>}
                    {wizardStep < 3 && (
                        <Button
                            variant="contained"
                            disabled={wizardStep === 0 && !vendorId}
                            onClick={() => setWizardStep((value) => value + 1)}
                        >
                            Continue
                        </Button>
                    )}
                    {wizardStep === 3 && (
                        <Button variant="contained" disabled={!vendorId || selectedTemplateIds.length === 0 || busy} onClick={create}>
                            Start assessment
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}
