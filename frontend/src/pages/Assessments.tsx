import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    LinearProgress,
    Stack,
    Tab,
    Tabs,
    Typography,
} from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import AttentionStrip from '../components/design/AttentionStrip';
import WorkspaceFrame from '../components/design/WorkspaceFrame';
import { color } from '../design/tokens';
import { intakeAPI, tprmAPI } from '../services/api';
import AssessmentAnswerInput from '../components/AssessmentAnswerInput';
import EntityRelationships from '../components/EntityRelationships';
import { downloadBinaryResponse, downloadErrorMessage } from '../services/download';

type TemplateQuestion = {
    id: string;
    questionKey: string;
    questionText: string;
    options?: string[] | null;
    questionType?: string | null;
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
    source?: string;
    sourceLabel?: string;
    category?: string;
    questionCount?: number;
    domainCount?: number;
    estimatedMinutes?: number;
    evidenceRequired?: boolean;
    organizationId?: string | null;
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
    serviceName?: string;
    engagementPublicId?: string;
    confirmedTier?: string;
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

function customerError(err: any) {
    const message = err?.message || 'Something went wrong.';
    if (/billing|good standing|PAST_DUE|subscription/i.test(message)) {
        return 'This assessment could not start. Ask your organization administrator to confirm access, then try again.';
    }
    return message;
}

export default function Assessments() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [tab, setTab] = useState(0);
    const [selected, setSelected] = useState<Assessment | null>(null);
    const [sectionIndex, setSectionIndex] = useState(0);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [saveState, setSaveState] = useState('Answers save when you leave the field or choose Save & next.');
    const [workspace, setWorkspace] = useState<any>(null);
    const [reviewMode, setReviewMode] = useState(true);
    const startNewAssessment = () => navigate('/engagements');
    const draftRef = useRef('');
    const focusedQuestionKeyRef = useRef<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [templateRes, assessmentRes, engagementRes] = await Promise.all([
                tprmAPI.questionnaires(),
                tprmAPI.listAssessments(),
                intakeAPI.listEngagementAssessments().catch(() => ({ data: { data: { items: [] } } })),
            ]);
            setTemplates(templateRes.data.data || []);
            const engagementItems = engagementRes.data.data.items || [];
            const byId = Object.fromEntries(engagementItems.map((row: any) => [row.id, row]));
            setAssessments((assessmentRes.data.data || []).map((row: Assessment) => ({
                ...row,
                serviceName: byId[row.id]?.serviceName,
                engagementPublicId: byId[row.id]?.engagementPublicId,
                confirmedTier: byId[row.id]?.tier,
            })));
        } catch (err: any) {
            setError(err.message || 'Unable to load assessments.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const templateById = useMemo(() => Object.fromEntries(templates.map((row) => [row.id, row])), [templates]);
    const selectedTemplate = selected?.templateId ? templateById[selected.templateId] : undefined;
    const answers = Object.fromEntries((selected?.responses || []).map((row) => [row.questionId, row.response || '']));
    const visible = visibleQuestions(selectedTemplate, answers);
    const sections = Array.from(new Set(visible.map((item) => item.sectionTitle)));
    const currentSection = sections[sectionIndex] || sections[0];
    const sectionQuestions = visible.filter((item) => item.sectionTitle === currentSection);
    const indexedQuestion = questionIndex >= 0 && questionIndex < sectionQuestions.length
        ? sectionQuestions[questionIndex]
        : undefined;
    const currentQuestion = indexedQuestion
        || sectionQuestions.find((item) => item.questionKey === focusedQuestionKeyRef.current)
        || sectionQuestions[0];
    if (currentQuestion) focusedQuestionKeyRef.current = currentQuestion.questionKey;

    useEffect(() => {
        if (!selected || !currentQuestion) {
            draftRef.current = '';
            return;
        }
        draftRef.current = (selected.responses || []).find((row) => row.questionId === currentQuestion.questionKey)?.response || '';
    }, [selected?.id, currentQuestion?.questionKey]);

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
        setReviewMode(true);
        try {
            const review = await tprmAPI.assessmentWorkspace(row.id);
            setWorkspace(review.data.data);
        } catch {
            setWorkspace(null);
        }
    };

    const persist = async (questionId: string, response: string) => {
        if (!selected || selected.status === 'COMPLETED') return false;
        const trimmed = response.trim();
        if (!trimmed) {
            setSaveState('Enter an answer before this question can be saved.');
            return false;
        }
        const already = (selected.responses || []).find((row) => row.questionId === questionId)?.response || '';
        if (already === trimmed) return true;
        setSaveState('Saving…');
        try {
            const updated = await tprmAPI.submitAssessmentResponse(selected.vendorId, selected.id, { questionId, response: trimmed });
            setSelected(updated.data.data);
            setError(null);
            setSaveState('Saved.');
            return true;
        } catch (err: any) {
            setSaveState('Not saved. Your last change was not recorded.');
            setError(customerError(err));
            return false;
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
            await downloadBinaryResponse(response, 'Supreme-Governance-Assessment.pdf');
        } catch (err) {
            setError(downloadErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    if (selected && reviewMode && workspace) {
        return (
            <Box sx={{ maxWidth: 1100 }}>
                {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
                <Surface>
                    <Button size="small" onClick={() => { setSelected(null); setWorkspace(null); }}>Back to Assessment Center</Button>
                    <Typography variant="h1" sx={{ mt: 1 }}>{workspace.header.vendorName}</Typography>
                    <Typography variant="body2">{workspace.header.templateName} · {workspace.header.type.replace(/_/g, ' ')}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                        <StatusBadge value={workspace.header.status} kind="plain" />
                        {workspace.header.completedAt && <StatusBadge kind="plain" tone="info" label={`Completed ${String(workspace.header.completedAt).slice(0, 10)}`} />}
                    </Stack>
                    <Alert severity="info" sx={{ mt: 2 }}>Next: {workspace.nextAction.label}. {workspace.nextAction.detail}</Alert>
                </Surface>
                <Stack spacing={2} sx={{ mt: 2 }}>
                    <Surface>
                        <Typography variant="h5" sx={{ mb: 1 }}>Scope</Typography>
                        <Typography variant="body2">{workspace.scope.why}</Typography>
                        <Typography variant="body2">Vendor tier: {workspace.scope.vendorTier}</Typography>
                        <Typography variant="body2">Pack / template: {workspace.scope.pack} · {workspace.scope.questionCount} questions</Typography>
                    </Surface>
                    <Surface>
                        <Typography variant="h5" sx={{ mb: 1 }}>Outcome</Typography>
                        <Typography variant="body2">Score: {workspace.outcome.score == null ? 'Not calculated' : workspace.outcome.score}</Typography>
                        <Typography variant="body2">Unanswered: {workspace.outcome.unanswered} — unanswered is not No</Typography>
                        <Typography variant="body2">Evidence gaps: {workspace.outcome.evidenceGaps} — absence is not control failure</Typography>
                        <Typography variant="body2">Findings generated: {workspace.outcome.findingsGenerated} ({workspace.outcome.openFindings} open)</Typography>
                        <Typography variant="body2">Decision: {workspace.outcome.decisionStatus}</Typography>
                    </Surface>
                    <Surface>
                        <Typography variant="h5" sx={{ mb: 1 }}>Key responses</Typography>
                        {!workspace.keyResponses.length && <Typography variant="body2">No Don’t-know or negative responses are recorded.</Typography>}
                        {workspace.keyResponses.map((row: any) => (
                            <Box key={row.questionId} sx={{ mb: 1.25 }}>
                                <Typography variant="subtitle2">{row.question}</Typography>
                                <Typography variant="body2">{row.recorded ? row.answer : 'No response recorded'}</Typography>
                            </Box>
                        ))}
                    </Surface>
                    <Surface>
                        <Typography variant="h5" sx={{ mb: 1 }}>Findings</Typography>
                        {!workspace.findings.length && <Typography variant="body2">No findings were generated from this assessment.</Typography>}
                        {workspace.findings.map((row: any) => (
                            <Box key={row.id} sx={{ mb: 1 }}>
                                <Typography variant="subtitle2">{row.title}</Typography>
                                <Typography variant="caption">{row.severity} · {row.status}</Typography>
                                <Button size="small" sx={{ display: 'block' }} onClick={() => navigate(`/findings?issueId=${row.id}`)}>Open finding</Button>
                            </Box>
                        ))}
                    </Surface>
                    <Surface>
                        <Typography variant="h5" sx={{ mb: 1 }}>Evidence</Typography>
                        {workspace.evidence.empty && <Typography variant="body2">{workspace.evidence.empty}</Typography>}
                        {workspace.evidence.items.map((row: any) => (
                            <Typography key={row.id} variant="body2">{row.filename} · {row.usable ? 'Ready' : 'Not usable'}</Typography>
                        ))}
                    </Surface>
                    <Surface>
                        <Typography variant="h5" sx={{ mb: 1 }}>History</Typography>
                        {workspace.history.map((row: any, index: number) => (
                            <Typography key={`${row.label}-${index}`} variant="body2">{String(row.at).slice(0, 10)} — {row.label}</Typography>
                        ))}
                    </Surface>
                    <Stack direction="row" spacing={1}>
                        <Button variant="contained" onClick={() => setReviewMode(false)}>Browse questions</Button>
                        <Button onClick={downloadPdf} disabled={busy}>Download PDF</Button>
                    </Stack>
                </Stack>
            </Box>
        );
    }

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
                                {workspace && <Button size="small" onClick={() => setReviewMode(true)}>Review summary</Button>}
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
                        <Box sx={{ mt: 2 }}>
                            <EntityRelationships sourceModel="VendorAssessment" sourceId={selected.id} />
                        </Box>
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
                                    <AssessmentAnswerInput
                                        questionKey={currentQuestion.questionKey}
                                        savedValue={response?.response || ''}
                                        options={options}
                                        questionType={currentQuestion.questionType}
                                        disabled={selected.status === 'COMPLETED'}
                                        onDraftChange={(value) => { draftRef.current = value; }}
                                        onSave={(value) => { void persist(currentQuestion.questionKey, value); }}
                                    />
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
                                            onClick={async () => {
                                                if (draftRef.current.trim()) {
                                                    const saved = await persist(currentQuestion.questionKey, draftRef.current);
                                                    if (!saved) return;
                                                }
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
        <WorkspaceFrame purpose="register">
            <PageHeader
                title="Assessments"
                description="To start a new assessment, request a third party. Intake and inherent risk create the questionnaire. Do not open an existing offboarding vendor to start a new one."
                actions={<Button variant="contained" onClick={startNewAssessment}>Request a third party</Button>}
            />
            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Box sx={{ mb: 2 }}>
                <AttentionStrip items={[
                    { label: 'Active', value: summary.active },
                    { label: 'Due soon', value: summary.dueSoon },
                    { label: 'Overdue', value: summary.overdue },
                    { label: 'Awaiting review', value: summary.awaiting },
                    { label: 'Completed', value: summary.completed },
                ]} />
            </Box>

            <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
                <Tab label="Active" />
                <Tab label="Needs attention" />
                <Tab label="Completed" />
                <Tab label="Library" />
            </Tabs>

            {tab === 3 ? (
                <Surface padded={false}>
                    <Box sx={{ px: 2, pt: 2 }}>
                        <Typography variant="subtitle1">Questionnaire library</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            Administrative and specialized templates. The standard TPRM questionnaire is generated after you request a third party and complete intake.
                        </Typography>
                    </Box>
                    <AppTable
                        embedded
                        pageSize={8}
                        rows={templates}
                        rowKey={(row) => row.id}
                        searchPlaceholder="Search templates"
                        searchValue={(row) => `${row.name} ${row.framework} ${row.purpose || ''}`}
                        columns={[
                            { id: 'name', label: 'Template', sortValue: (row) => row.name, render: (row) => (
                                <Box>
                                    <Typography variant="subtitle2">{row.name}</Typography>
                                    <Typography variant="body2">{row.purpose || row.framework}</Typography>
                                </Box>
                            ) },
                            { id: 'questions', label: 'Questions', hideOnMobile: true, sortValue: (row) => row.questionCount || 0, render: (row) => row.questionCount ?? '—' },
                            { id: 'source', label: 'Source', hideOnMobile: true, render: (row) => row.sourceLabel || row.source || '—' },
                        ]}
                    />
                </Surface>
            ) : (
                <QueryState
                    loading={loading}
                    error={null}
                    empty={filteredAssessments.length === 0}
                    emptyTitle="No active assessments"
                    emptyBody="Request a third party, complete intake, then send the generated questionnaire."
                    emptyAction={<Button variant="contained" onClick={startNewAssessment}>Request a third party</Button>}
                >
                    <Surface padded={false}>
                        <AppTable
                            embedded
                            pageSize={12}
                            rows={filteredAssessments}
                            rowKey={(row) => row.id}
                            onRowClick={(row) => openAssessment(row)}
                            searchPlaceholder="Search assessments"
                            searchValue={(row) => `${row.vendor?.name || ''} ${row.serviceName || ''} ${row.engagementPublicId || ''} ${templateById[row.templateId || '']?.name || ''} ${row.assessmentType} ${row.status}`}
                            columns={[
                                { id: 'vendor', label: 'Third party / Engagement', sortValue: (row) => `${row.vendor?.name || ''} ${row.serviceName || ''}`, render: (row) => (
                                    <Box>
                                        <Typography variant="subtitle2">{row.vendor?.name || 'Vendor'}{row.serviceName ? ` · ${row.serviceName}` : ''}</Typography>
                                        <Typography variant="body2">{row.engagementPublicId || templateById[row.templateId || '']?.name || row.assessmentType}{row.confirmedTier ? ` · ${row.confirmedTier}` : ''}</Typography>
                                    </Box>
                                ) },
                                { id: 'due', label: 'Due', hideOnMobile: true, sortValue: (row) => row.dueDate || '', render: (row) => row.dueDate ? row.dueDate.slice(0, 10) : '—' },
                                { id: 'status', label: 'Status', render: (row) => (
                                    <StatusBadge value={row.status} kind="plain" tone={row.status === 'COMPLETED' ? 'success' : 'high'} />
                                ) },
                            ]}
                        />
                    </Surface>
                </QueryState>
            )}
        </WorkspaceFrame>
    );
}
