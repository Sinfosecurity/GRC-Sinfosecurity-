import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Checkbox, FormControlLabel, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import StatusBadge from '../components/design/StatusBadge';
import WorkflowStepper from '../components/design/WorkflowStepper';
import { vendorOnboardingAPI } from '../services/api';
import { formatShortDate, humanizeLabel } from '../utils/humanizeLabel';

const STEPS = ['Request', 'Intake', 'Tier Review', 'Due Diligence'];

function stageIndex(stage?: string) {
    if (stage === 'Intake') return 1;
    if (stage === 'Tier review') return 2;
    if (stage === 'Due diligence' || stage === 'Ready to send') return 3;
    return 0;
}

export default function VendorOnboardingWorkspace() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [attested, setAttested] = useState(false);
    const [overrideTier, setOverrideTier] = useState('');
    const [overrideReason, setOverrideReason] = useState('');
    const [saving, setSaving] = useState(false);

    const load = () => {
        vendorOnboardingAPI.get(id)
            .then((response) => {
                setData(response.data.data);
                setTab(stageIndex(response.data.data.stage));
                const next: Record<string, string> = {};
                for (const section of response.data.data.intake?.sections || []) {
                    for (const question of section.questions || []) next[question.key] = question.response || '';
                }
                setAnswers(next);
            })
            .catch((err) => setError(err.message || 'Unable to load onboarding'));
    };

    useEffect(load, [id]);

    const payload = useMemo(() => Object.entries(answers).map(([questionKey, response]) => ({ questionKey, response })), [answers]);

    const run = async (work: () => Promise<unknown>) => {
        setSaving(true);
        setError(null);
        try {
            await work();
            load();
        } catch (err: any) {
            setError(err.message || 'Unable to save this step');
        } finally {
            setSaving(false);
        }
    };

    const saveIntake = (event: FormEvent) => {
        event.preventDefault();
        run(() => vendorOnboardingAPI.saveIntake(id, payload));
    };

    const completeIntake = (event: FormEvent) => {
        event.preventDefault();
        run(() => vendorOnboardingAPI.completeIntake(id, payload, attested));
    };

    const confirmRecommendation = () => run(() => vendorOnboardingAPI.confirmTier(id, { confirm: true }));
    const overrideRecommendation = (event: FormEvent) => {
        event.preventDefault();
        run(() => vendorOnboardingAPI.confirmTier(id, { overrideTier, reason: overrideReason }));
    };

    return (
        <QueryState loading={!data && !error} error={error && !data ? error : null} empty={!data} emptyTitle="Onboarding" emptyBody="This onboarding workspace was not found.">
            {data && (
                <Stack spacing={2.5} sx={{ minWidth: 0, overflowX: 'hidden' }}>
                    <PageHeader
                        crumbs={[{ label: 'Third Parties', to: '/vendor-management' }, { label: 'Onboard', to: '/vendor-onboarding' }, { label: data.publicId || data.name }]}
                        title={`${data.publicId || 'Vendor'}  ${data.name}`}
                        description={`${data.stage} · ${data.owner} · Next: ${data.nextAction}`}
                        meta={
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <StatusBadge kind="plain" label={data.stage} />
                                <StatusBadge kind="plain" label={data.overdue ? 'Overdue' : formatShortDate(data.dueDate)} tone={data.overdue ? 'critical' : 'info'} />
                            </Stack>
                        }
                    />
                    <WorkflowStepper steps={STEPS} active={stageIndex(data.stage)} />
                    {error && <Alert severity="error">{error}</Alert>}
                    <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
                        <Tab label="Request" />
                        <Tab label="Intake" />
                        <Tab label="Tier Review" />
                        <Tab label="Assessment Plan" />
                        <Tab label="History" />
                    </Tabs>

                    {tab === 0 && (
                        <Surface>
                            <Typography variant="h6">Request</Typography>
                            <Fact label="Vendor" value={data.request.name} />
                            <Fact label="Legal name" value={data.request.legalName} />
                            <Fact label="Website" value={data.request.website} />
                            <Fact label="Country" value={data.request.country} />
                            <Fact label="Service" value={data.request.servicesProvided} />
                            <Fact label="Business unit" value={data.request.businessUnit} />
                            <Fact label="Requester" value={data.requester} />
                            <Fact label="Business owner" value={data.owner} />
                        </Surface>
                    )}

                    {tab === 1 && (
                        <Surface>
                            <Typography variant="h6">Internal intake</Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>Completed by the business owner. This is not sent to the vendor.</Typography>
                            <Stack component="form" spacing={2.5} onSubmit={data.intake.completed ? saveIntake : completeIntake}>
                                {(data.intake.sections || []).map((section: any) => (
                                    <Stack key={section.title} spacing={1.5}>
                                        <Typography variant="subtitle1">{section.title}</Typography>
                                        {section.questions.map((question: any) => (
                                            question.type === 'TEXT' ? (
                                                <TextField
                                                    key={question.key}
                                                    fullWidth
                                                    multiline
                                                    minRows={2}
                                                    label={question.question}
                                                    helperText={question.guidance}
                                                    value={answers[question.key] || ''}
                                                    disabled={data.intake.completed || !data.canEditIntake}
                                                    onChange={(event) => setAnswers({ ...answers, [question.key]: event.target.value })}
                                                />
                                            ) : (
                                                <TextField
                                                    key={question.key}
                                                    select
                                                    fullWidth
                                                    label={question.question}
                                                    helperText={question.guidance}
                                                    value={answers[question.key] || ''}
                                                    disabled={data.intake.completed || !data.canEditIntake}
                                                    onChange={(event) => setAnswers({ ...answers, [question.key]: event.target.value })}
                                                >
                                                    <MenuItem value="">Not recorded</MenuItem>
                                                    {(question.options || []).map((option: string) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                                                </TextField>
                                            )
                                        ))}
                                    </Stack>
                                ))}
                                {!data.intake.completed && data.canEditIntake && (
                                    <>
                                        <FormControlLabel control={<Checkbox checked={attested} onChange={(event) => setAttested(event.target.checked)} />} label="I attest that this intake is accurate for this engagement." />
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                            <Button onClick={saveIntake} disabled={saving}>Save and resume later</Button>
                                            <Button type="submit" variant="contained" disabled={saving || !attested}>Submit intake</Button>
                                        </Stack>
                                    </>
                                )}
                                {data.intake.completed && <Alert severity="success">Intake is complete. Supreme calculated inherent risk for reviewer confirmation.</Alert>}
                            </Stack>
                        </Surface>
                    )}

                    {tab === 2 && (
                        <Surface>
                            <Typography variant="h6">Tier review</Typography>
                            {data.tierReview ? (
                                <Stack spacing={1.5} sx={{ mt: 1 }}>
                                    <Typography>Recommended vendor tier: <strong>{data.tierReview.recommendedTier}</strong></Typography>
                                    <Typography>{data.tierReview.explanation}</Typography>
                                    <Typography variant="subtitle2">Why Supreme recommends this tier</Typography>
                                    {(data.tierReview.factors || []).map((factor: any) => (
                                        <Typography key={factor.code || factor.label}>{factor.label}: {factor.rationale}{factor.points ? ` (${factor.points})` : ''}</Typography>
                                    ))}
                                    {(data.tierReview.hardFloors || []).filter((floor: any) => floor.applies).map((floor: any) => (
                                        <Alert key={floor.code} severity="warning">{floor.label}. {floor.rationale}</Alert>
                                    ))}
                                    {data.tierReview.confirmedTier && <Alert severity="info">Confirmed tier: {data.tierReview.confirmedTier}{data.tierReview.overrideReason ? `. Override reason: ${data.tierReview.overrideReason}` : ''}</Alert>}
                                    {data.canReviewTier && data.stageKey === 'TIER_REVIEW' && (
                                        <>
                                            <Button variant="contained" disabled={saving} onClick={confirmRecommendation}>Confirm recommendation</Button>
                                            <Stack component="form" spacing={1.5} onSubmit={overrideRecommendation}>
                                                <TextField select label="Override tier" value={overrideTier} onChange={(event) => setOverrideTier(event.target.value)}>
                                                    {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((tier) => <MenuItem key={tier} value={tier}>{humanizeLabel(tier)}</MenuItem>)}
                                                </TextField>
                                                <TextField required fullWidth multiline minRows={2} label="Override reason" value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} />
                                                <Button type="submit" disabled={saving || !overrideTier || !overrideReason}>Override</Button>
                                            </Stack>
                                        </>
                                    )}
                                </Stack>
                            ) : <Typography>Complete intake to see the recommended tier.</Typography>}
                        </Surface>
                    )}

                    {tab === 3 && (
                        <Stack spacing={1.5}>
                            <Surface>
                                <Typography variant="h6">Recommended due-diligence plan</Typography>
                                <Typography variant="body2">{data.plan?.rationale || 'Confirm the tier to generate the plan. Nothing is sent to the vendor in this phase.'}</Typography>
                            </Surface>
                            {data.plan?.triggers?.privacy && <Alert severity="info">Privacy review may be required</Alert>}
                            {data.plan?.triggers?.aiGovernance && <Alert severity="info">AI Governance review may be required</Alert>}
                            {data.plan?.triggers?.resilience && <Alert severity="info">Resilience / BCP review may be required</Alert>}
                            {(data.plan?.assessments || []).map((item: any) => (
                                <Surface key={item.key || item.name}>
                                    <Typography variant="subtitle1">{item.requirement === 'Completed' ? '✓ ' : ''}{item.name}</Typography>
                                    <Typography>{item.requirement}</Typography>
                                    <Typography variant="body2">Why: {item.rationale}</Typography>
                                    <Typography variant="body2">Expected evidence: {item.expectedEvidence}</Typography>
                                    {(item.reusableEvidence || []).length > 0 && (
                                        <Typography variant="body2">Existing reusable evidence: {item.reusableEvidence.map((row: any) => row.title).join(', ')}</Typography>
                                    )}
                                </Surface>
                            ))}
                            {data.canReviewTier && data.stageKey === 'DUE_DILIGENCE_PLAN' && (
                                <Button variant="contained" disabled={saving} onClick={() => run(() => vendorOnboardingAPI.confirmPlan(id))}>Confirm plan · Ready to send</Button>
                            )}
                            {data.stageKey === 'READY_TO_SEND' && <Alert severity="success">Plan confirmed. Ready to send — the vendor portal is not part of this phase.</Alert>}
                            {data.plan?.triggers?.privacy && <Button onClick={() => navigate(`/privacy-ops/vendors/${data.id}`)}>Open privacy</Button>}
                            {data.plan?.triggers?.aiGovernance && <Button onClick={() => navigate('/ai-governance')}>Open AI Governance</Button>}
                        </Stack>
                    )}

                    {tab === 4 && (
                        <Surface>
                            <Typography variant="h6">History</Typography>
                            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                                {(data.history || []).map((event: any, index: number) => (
                                    <Stack key={`${event.at}-${index}`}>
                                        <Typography variant="subtitle2">{event.title}</Typography>
                                        <Typography variant="body2">{event.detail}</Typography>
                                        <Typography variant="caption">{formatShortDate(event.at)}</Typography>
                                    </Stack>
                                ))}
                                {!data.history?.length && <Typography>No onboarding history is recorded yet.</Typography>}
                            </Stack>
                        </Surface>
                    )}
                </Stack>
            )}
        </QueryState>
    );
}

function Fact({ label, value }: { label: string; value?: string | null }) {
    return (
        <>
            <Typography variant="caption">{label}</Typography>
            <Typography sx={{ mb: 1 }}>{value || 'Not recorded'}</Typography>
        </>
    );
}
