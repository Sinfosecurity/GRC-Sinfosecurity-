import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Checkbox, FormControlLabel, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import { EntitySummary, LifecycleProgress, NextActionCard, PageShell } from '../components/experience/ExperienceKit';
import ReviewDecidePanel from '../components/experience/ReviewDecidePanel';
import { customerStage, customerStageIndex, dominantNextAction, workspaceSection } from '../experience/customerStages';
import { vendorOnboardingAPI } from '../services/api';
import { formatShortDate, humanizeLabel } from '../utils/humanizeLabel';

function defaultTab(stage?: string) {
    const section = workspaceSection(stage);
    if (section === 'assessment') return 1;
    if (section === 'findings') return 2;
    if (section === 'decisions') return 4;
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
    const [contact, setContact] = useState({ name: '', email: '', title: '', phone: '' });
    const [saving, setSaving] = useState(false);
    const [clauses, setClauses] = useState<Record<string, boolean>>({});
    const [approval, setApproval] = useState({ decision: 'APPROVE', conditions: '', rationale: '' });
    const [acceptance, setAcceptance] = useState<Record<string, { rationale: string; conditions: string }>>({});
    const [customizePlan, setCustomizePlan] = useState(false);
    const [excludedPacks, setExcludedPacks] = useState<string[]>([]);
    const [packReason, setPackReason] = useState('');
    const [copiedLink, setCopiedLink] = useState('');
    const [exitNotes, setExitNotes] = useState('');
    const [acknowledgeOutstanding, setAcknowledgeOutstanding] = useState(false);
    const [reassessment, setReassessment] = useState<any>(null);
    const [confirmPriorAnswers, setConfirmPriorAnswers] = useState(false);
    const [historyLayer, setHistoryLayer] = useState<'milestones' | 'audit'>('milestones');
    const [showCompletedIntake, setShowCompletedIntake] = useState(false);

    const load = () => {
        vendorOnboardingAPI.get(id)
            .then((response) => {
                setData(response.data.data);
                setTab(defaultTab(response.data.data.stage));
                const nextClauses: Record<string, boolean> = {};
                for (const item of response.data.data.lifecycle?.checklist || []) nextClauses[item.key] = Boolean(item.attested);
                setClauses(nextClauses);
                if (response.data.data.contact) {
                    setContact({
                        name: response.data.data.contact.name || '',
                        email: response.data.data.contact.email || '',
                        title: response.data.data.contact.title || '',
                        phone: response.data.data.contact.phone || '',
                    });
                }
                const next: Record<string, string> = {};
                for (const section of response.data.data.intake?.sections || []) {
                    for (const question of section.questions || []) next[question.key] = question.response || '';
                }
                setAnswers(next);
                const stage = response.data.data.stage;
                if (['Active', 'Reassessment', 'Offboarding'].includes(String(stage))) {
                    vendorOnboardingAPI.reassessment(id)
                        .then((rec) => setReassessment(rec.data.data?.reassessment || rec.data.data))
                        .catch(() => setReassessment(null));
                }
            })
            .catch((err) => setError(err.message || 'Unable to load onboarding'));
    };

    useEffect(load, [id]);

    const payload = useMemo(() => Object.entries(answers).map(([questionKey, response]) => ({ questionKey, response })), [answers]);
    const unresolvedScope = useMemo(() => controllingUnknowns(answers, data?.unresolvedScope || data?.plan?.unresolved), [answers, data]);

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
                <PageShell>
                <Stack spacing={2} sx={{ minWidth: 0, overflowX: 'hidden' }}>
                    <PageHeader
                        crumbs={[{ label: 'Third Parties', to: '/vendor-management' }, { label: data.publicId || data.name }]}
                        title={data.name}
                        description={data.request?.servicesProvided || 'One workspace. Supreme tracks the governed lifecycle underneath.'}
                    />
                    <EntitySummary
                        name={data.name}
                        service={data.request?.servicesProvided}
                        owner={data.owner}
                        tier={humanizeLabel(data.tier || data.tierReview?.confirmedTier || data.tierReview?.recommendedTier)}
                        inherent={data.inherentRiskScore != null ? data.inherentRiskScore : 'Not scored'}
                        residual={data.residualRiskScore != null ? data.residualRiskScore : data.lifecycle?.residualRisk ?? 'Not scored'}
                        status={humanizeLabel(data.workflowStatus || data.stage)}
                    />
                    <LifecycleProgress active={customerStageIndex(data.stageKey || data.stage)} blocked={(data.unresolvedScope || []).length > 0 && !data.intake?.completed} />
                    <NextActionCard
                        label={dominantNextAction(data).label}
                        detail={`${dominantNextAction(data).detail}${data.dueDate ? ` Due ${formatShortDate(data.dueDate)}.` : ''}`}
                        onAction={() => setTab(defaultTab(data.stage))}
                    />
                    {error && <Alert severity="error">{error}</Alert>}
                    <Typography variant="body2">Inherent is intake exposure. Residual is current posture.</Typography>
                    <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
                        <Tab label="Overview" />
                        <Tab label="Assessment" />
                        <Tab label="Findings" />
                        <Tab label="Evidence" />
                        <Tab label="Decisions" />
                        <Tab label="History" />
                    </Tabs>

                    {tab === 0 && (
                        <Stack spacing={2}>
                        <Surface>
                            <Typography variant="h6">Where this case stands</Typography>
                            <Typography>You are in {humanizeLabel(data.stage)}. {dominantNextAction(data).detail}</Typography>
                            <Typography variant="body2">Owner {data.owner || 'Not assigned'} · Due {formatShortDate(data.dueDate)}</Typography>
                        </Surface>
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
                        </Stack>
                    )}

                    {tab === 3 && (
                        <Stack spacing={1.5}>
                            <Typography variant="h6">Evidence</Typography>
                            <Typography variant="body2">Ready files can be reused. Scanning or rejected files are not usable.</Typography>
                            {(data.lifecycle?.documents || data.evidence || []).length === 0 && <Typography>No evidence is recorded for this vendor yet.</Typography>}
                            {(data.lifecycle?.documents || data.evidence || []).map((row: any) => (
                                <Typography key={row.id || row.filename}>{row.title || row.filename} · {humanizeLabel(row.scanStatus || row.status)}</Typography>
                            ))}
                        </Stack>
                    )}

                    {tab === 1 && data.intake?.completed && (
                        <Surface>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary' }}>Assessment scope ready</Typography>
                            <Typography variant="h5" sx={{ fontFamily: '"Newsreader", serif', mt: 0.5 }}>
                                Recommended tier {humanizeLabel(data.tierReview?.confirmedTier || data.tierReview?.recommendedTier || 'Not confirmed')}
                            </Typography>
                            <Typography sx={{ mt: 1 }}>
                                Inherent risk {data.inherentRiskScore != null ? data.inherentRiskScore : 'Not scored'}
                                {data.residualRiskScore != null ? ` · Residual risk ${data.residualRiskScore}` : ''}
                            </Typography>
                            <Typography sx={{ mt: 1 }}>
                                Why: {(data.tierReview?.factors || []).slice(0, 4).map((factor: any) => factor.label || factor.rationale).filter(Boolean).join(' · ') || data.tierReview?.explanation || 'Complete intake facts determine this recommendation.'}
                            </Typography>
                            <Typography sx={{ mt: 1 }}>
                                Recommended assessment: {(data.plan?.package?.required || data.plan?.assessments || []).map((item: any) => item.name || item.packName).filter(Boolean).join(' + ') || 'Confirm the tier to generate the package.'}
                            </Typography>
                        </Surface>
                    )}

                    {tab === 1 && data.intake?.completed && !showCompletedIntake && (
                        <Button onClick={() => setShowCompletedIntake(true)}>Review intake answers</Button>
                    )}

                    {tab === 1 && (!data.intake?.completed || showCompletedIntake) && (
                        <Surface>
                            <Typography variant="h6">Internal intake</Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>Completed by the business owner. This is not sent to the vendor.</Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                {intakeProgress(data.intake?.sections, answers)} answered.
                                {hasUnknown(answers) ? ' Unknown is saved honestly and is not treated as No or Low risk.' : ''}
                                {' '}Estimated spend, if asked, is context only and does not change inherent or residual risk.
                            </Typography>
                            {unresolvedScope.length > 0 && !data.intake.completed && (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    {unresolvedScope.map((row) => row.message).join(' ')} You can save and resume later. Submit intake stays blocked until these facts are resolved.
                                </Alert>
                            )}
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
                                            <Button type="submit" variant="contained" disabled={saving || !attested || unresolvedScope.length > 0}>Submit intake</Button>
                                        </Stack>
                                    </>
                                )}
                                {data.intake.completed && <Alert severity="success">Intake is complete. Supreme calculated inherent risk for reviewer confirmation.</Alert>}
                            </Stack>
                        </Surface>
                    )}

                    {tab === 1 && (
                        <Surface>
                            <Typography variant="h6">Tier review</Typography>
                            {data.tierReview ? (
                                <Stack spacing={1.5} sx={{ mt: 1 }}>
                                    <Typography variant="h5">Recommended tier {data.tierReview.recommendedTier}</Typography>
                                    <Typography>Why Supreme recommends this: {data.tierReview.explanation}</Typography>
                                    {data.inherentRiskScore != null && <Fact label="Inherent risk" value={String(data.inherentRiskScore)} />}
                                    {data.tierReview.score != null && <Fact label="Intake score" value={`${data.tierReview.score} of ${data.tierReview.maxScore || 60} · secondary to inherent risk`} />}
                                    <Typography variant="subtitle2">Important exposure factors</Typography>
                                    {(data.tierReview.factors || []).map((factor: any) => (
                                        <Typography key={factor.code || factor.label}>{factor.label}: {factor.rationale}{factor.points ? ` (${factor.points})` : ''}</Typography>
                                    ))}
                                    {(data.tierReview.hardFloors || []).filter((floor: any) => floor.applies).map((floor: any) => (
                                        <Alert key={floor.code} severity="warning">Minimum tier: Critical. {floor.label}. {floor.rationale}</Alert>
                                    ))}
                                    {data.canReviewTier && data.stageKey === 'TIER_REVIEW' && (
                                        <Typography variant="body2">Analyst action: confirm the recommendation, or record an allowed override with a reason. A below-floor override is not permitted.</Typography>
                                    )}
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

                    {tab === 1 && (
                        <Stack spacing={1.5}>
                            <Surface>
                                <Typography variant="h6">Recommended due-diligence package</Typography>
                                <Typography variant="body2">{data.plan?.rationale || 'Confirm the tier to generate the package. Nothing is sent to the vendor in this phase.'}</Typography>
                            </Surface>
                            {unresolvedScope.length > 0 && (
                                <Alert severity="warning">
                                    {unresolvedScope.map((row) => row.message).join(' ')} Package confirmation and invitation stay blocked until intake is completed with those facts resolved.
                                    <Button sx={{ display: 'block', mt: 1 }} onClick={() => setTab(1)}>Complete intake</Button>
                                </Alert>
                            )}
                            <Surface>
                                <Typography variant="subtitle1">Required</Typography>
                                {(data.plan?.package?.required || data.plan?.assessments || []).filter((item: any) => item.requirement !== 'Recommended' && item.requirement !== 'Optional').map((item: any) => (
                                    <Stack key={item.key || item.name} spacing={0.5} sx={{ mt: 1 }}>
                                        <Typography><strong>{item.name || item.packName}</strong></Typography>
                                        <Typography variant="body2">Included because: {(item.why || [item.rationale]).filter(Boolean).join(' ')}</Typography>
                                        {customizePlan && item.templateKey !== 'information-security' && item.key !== 'information-security' && item.key !== 'baseline' && (
                                            <FormControlLabel
                                                control={<Checkbox checked={!excludedPacks.includes(item.templateKey || item.key)} onChange={(event) => {
                                                    const key = item.templateKey || item.key;
                                                    setExcludedPacks(event.target.checked ? excludedPacks.filter((row) => row !== key) : [...excludedPacks, key]);
                                                }} />}
                                                label="Include this pack"
                                            />
                                        )}
                                    </Stack>
                                ))}
                            </Surface>
                            {(data.plan?.package?.recommended || []).length > 0 && (
                                <Surface>
                                    <Typography variant="subtitle1">Recommended</Typography>
                                    {data.plan.package.recommended.map((item: any) => (
                                        <Typography key={item.key} variant="body2" sx={{ mt: 0.75 }}><strong>{item.name}</strong> — {(item.why || []).join(' ')}</Typography>
                                    ))}
                                </Surface>
                            )}
                            {(data.plan?.assessments || []).map((item: any) => (
                                <Surface key={`assess-${item.key || item.name}`}>
                                    <Typography variant="subtitle1">{item.requirement === 'Completed' ? '✓ ' : ''}{item.name}</Typography>
                                    <Typography>{item.requirement}</Typography>
                                    <Typography variant="body2">Why this was selected: {(item.why || [item.rationale]).filter(Boolean).join(' ')}</Typography>
                                    <Typography variant="body2">Expected evidence: {item.expectedEvidence}</Typography>
                                </Surface>
                            ))}
                            {data.plan?.override && <Alert severity="info">Package customized: {data.plan.override.reason}</Alert>}
                            {data.canReviewTier && data.stageKey === 'DUE_DILIGENCE_PLAN' && (
                                <Stack spacing={1.5}>
                                    <Button variant="contained" disabled={saving || unresolvedScope.length > 0} onClick={() => run(() => vendorOnboardingAPI.confirmPlan(id))}>Confirm package</Button>
                                    <Button disabled={saving} onClick={() => setCustomizePlan(!customizePlan)}>Customize</Button>
                                    {customizePlan && (
                                        <>
                                            <TextField required fullWidth multiline minRows={2} label="Customization rationale" value={packReason} onChange={(event) => setPackReason(event.target.value)} helperText="Required. Actor and time are recorded in the audit trail." />
                                            <Button disabled={saving || !packReason} onClick={() => run(() => vendorOnboardingAPI.confirmPlan(id, { excludeKeys: excludedPacks, reason: packReason }))}>Save customized package</Button>
                                        </>
                                    )}
                                </Stack>
                            )}
                            {data.stageKey === 'READY_TO_SEND' && <Alert severity="success">Package confirmed. Choose Send invitation email or Copy secure invitation link.</Alert>}
                            {data.plan?.triggers?.privacy && <Button onClick={() => navigate(`/privacy-ops/vendors/${data.id}`)}>Open privacy</Button>}
                            {data.plan?.triggers?.aiGovernance && <Button onClick={() => navigate('/ai-governance')}>Open AI Governance</Button>}
                        </Stack>
                    )}

                    {tab === 1 && ['Vendor Review', 'Review & Decide', 'Monitor'].includes(customerStage(data.stageKey || data.stage)) && (
                        <Stack spacing={1.5}>
                            <Surface>
                                <Typography variant="h6">Review and send</Typography>
                                <Typography variant="body2">
                                    {data.name} · {data.request?.servicesProvided || 'Service recorded'} · due {formatShortDate(data.dueDate)}.
                                    {' '}Included: {(data.plan?.package?.required || data.plan?.assessments || []).map((item: any) => item.name || item.packName).filter(Boolean).join(', ') || 'Confirm packs first'}.
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 1 }}>Send invitation emails the named contact. Copying a secure link is not email. Queued is not Delivered.</Typography>
                            </Surface>
                            {data.invitation && (
                                <Alert severity="info">
                                    {data.invitation.status}. {data.invitation.deliveryMethod === 'LINK' ? 'Secure link path.' : data.invitation.deliveryMethod === 'EMAIL' ? `Email ${data.invitation.emailStatus}.` : ''} {data.invitation.emailTruth}
                                </Alert>
                            )}
                            {copiedLink && <Alert severity="success">Link copied. Not emailed. Share this secure invitation through your approved channel.</Alert>}
                            <Surface>
                                <Stack spacing={1.5}>
                                    <TextField required label="Primary assessment contact" value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} />
                                    <TextField required type="email" label="Email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} />
                                    <TextField label="Title / role" value={contact.title} onChange={(event) => setContact({ ...contact, title: event.target.value })} />
                                    <TextField label="Phone" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} />
                                    {data.canReviewTier && ['READY_TO_SEND', 'AWAITING_VENDOR'].includes(data.stageKey) && unresolvedScope.length === 0 && (
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                            <Button variant="contained" disabled={saving || !contact.name || !contact.email} onClick={() => run(() => vendorOnboardingAPI.send(id, contact))}>Send invitation email</Button>
                                            <Button disabled={saving || !contact.name || !contact.email} onClick={() => run(async () => {
                                                const response = await vendorOnboardingAPI.activationLink(id, contact);
                                                const url = response.data.data.activationUrl;
                                                if (url && navigator.clipboard) await navigator.clipboard.writeText(url);
                                                setCopiedLink(url || 'copied');
                                            })}>Copy secure invitation link</Button>
                                            {data.invitation?.deliveryMethod === 'LINK' && (
                                                <Button disabled={saving} onClick={() => run(() => vendorOnboardingAPI.markInvitationShared(id))}>Mark as shared</Button>
                                            )}
                                        </Stack>
                                    )}
                                </Stack>
                            </Surface>
                            {(data.vendorAssessments || []).map((item: any) => (
                                <Surface key={item.id}>
                                    <Typography variant="subtitle1">{item.name}</Typography>
                                    <Typography>{item.status} · {item.answered} / {item.total} answered</Typography>
                                </Surface>
                            ))}
                            {data.canReviewTier && data.invitation?.deliveryMethod === 'EMAIL' && (
                                <Button disabled={saving} onClick={() => run(() => vendorOnboardingAPI.resend(id))}>Resend invitation</Button>
                            )}
                        </Stack>
                    )}

                    {tab === 4 && (
                        <Stack spacing={1.5}>
                            {data.plan?.triggers?.privacy && <Typography variant="body2" sx={{ color: 'text.primary' }}>Privacy review may be required.</Typography>}
                            {data.plan?.triggers?.aiGovernance && <Typography variant="body2" sx={{ color: 'text.primary' }}>AI Governance review may be required.</Typography>}
                            <ReviewDecidePanel
                                review={data.review}
                                stage={data.stageKey || data.stage}
                                assessments={data.vendorAssessments}
                                findings={data.lifecycle?.findings || []}
                                residual={data.residualRiskScore != null ? data.residualRiskScore : data.lifecycle?.residualRisk}
                                owner={data.owner}
                                riskContext={reviewRiskContext(data)}
                                canReview={data.canReviewTier}
                                saving={saving}
                                onReviewFinding={(findingId, action) => run(() => vendorOnboardingAPI.reviewFinding(id, findingId, action === 'adjust'
                                    ? { action, severity: 'HIGH', reason: 'Confirmed at high severity after review.' }
                                    : action === 'dismiss'
                                        ? { action, reason: 'Accepted as documented and not a finding.' }
                                        : { action }))}
                            />
                        </Stack>
                    )}

                    {tab === 2 && (
                        <Stack spacing={1.5}>
                            <Surface>
                                <Typography variant="h6">Findings and remediation</Typography>
                                <Typography variant="body2">Confirm findings first. Close only with ready remediation evidence. Accepting risk records a governance disposition. It does not mean the risk is eliminated, the finding is fixed, or residual risk is reduced.</Typography>
                            </Surface>
                            {(data.lifecycle?.findings || []).map((finding: any) => (
                                <Surface key={finding.id}>
                                    <Typography variant="subtitle1">{finding.title}</Typography>
                                    <Typography>{humanizeLabel(finding.severity)} · {humanizeLabel(finding.status)}{finding.dueDate ? ` · Due ${formatShortDate(finding.dueDate)}` : ''}</Typography>
                                    {finding.cap && <Typography variant="body2">CAP: {finding.cap}</Typography>}
                                    {data.canReviewTier && ['OPEN', 'IN_PROGRESS', 'PENDING_VALIDATION', 'REMEDIATED'].includes(finding.status) && (
                                        <Stack spacing={1} sx={{ mt: 1 }}>
                                            <Button disabled={saving} onClick={() => run(() => vendorOnboardingAPI.remediateFinding(id, finding.id, { cap: 'Correct the control gap and provide current evidence.' }))}>Assign remediation</Button>
                                            <Button disabled={saving} onClick={() => run(() => vendorOnboardingAPI.validateFinding(id, finding.id, { approved: true, notes: 'Remediation validated.' }))}>Validate</Button>
                                            <Button disabled={saving} onClick={() => run(() => vendorOnboardingAPI.closeFinding(id, finding.id, {}))}>Close with ready evidence</Button>
                                            <TextField
                                                required
                                                fullWidth
                                                multiline
                                                minRows={2}
                                                label="Acceptance rationale"
                                                value={acceptance[finding.id]?.rationale || ''}
                                                onChange={(event) => setAcceptance({ ...acceptance, [finding.id]: { rationale: event.target.value, conditions: acceptance[finding.id]?.conditions || '' } })}
                                            />
                                            <TextField
                                                fullWidth
                                                label="Acceptance conditions"
                                                value={acceptance[finding.id]?.conditions || ''}
                                                onChange={(event) => setAcceptance({ ...acceptance, [finding.id]: { rationale: acceptance[finding.id]?.rationale || '', conditions: event.target.value } })}
                                            />
                                            <Button disabled={saving || !acceptance[finding.id]?.rationale} onClick={() => run(() => vendorOnboardingAPI.acceptFindingRisk(id, finding.id, acceptance[finding.id]))}>Accept risk for 180 days</Button>
                                        </Stack>
                                    )}
                                </Surface>
                            ))}
                            {!data.lifecycle?.findings?.length && <Typography>No confirmed findings yet.</Typography>}
                        </Stack>
                    )}

                    {tab === 4 && (
                        <Stack spacing={1.5}>
                            <Surface>
                                <Typography variant="h6">Contract review</Typography>
                                <Typography variant="body2">This is an attestation workspace, not legal advice. Required items come from tier and the due-diligence plan. Contract renewal uses the existing VendorContract date.</Typography>
                                {data.lifecycle?.contractRenewalDate && <Fact label="Contract renewal date" value={formatShortDate(data.lifecycle.contractRenewalDate)} />}
                            </Surface>
                            {['Security', 'Privacy', 'Incident', 'Subprocessors', 'Data lifecycle', 'Assurance'].map((group) => {
                                const items = (data.lifecycle?.checklist || []).filter((item: any) => clauseGroup(item.key) === group);
                                if (!items.length) return null;
                                return (
                                    <Surface key={group}>
                                        <Typography variant="subtitle1">{group}</Typography>
                                        {items.map((item: any) => (
                                            <FormControlLabel
                                                key={item.key}
                                                control={<Checkbox checked={Boolean(clauses[item.key])} disabled={!data.canReviewTier || Boolean(data.lifecycle?.contractAttestedAt)} onChange={(event) => setClauses({ ...clauses, [item.key]: event.target.checked })} />}
                                                label={`${item.label} — ${item.required ? 'Required' : 'Not applicable unless in scope'}. ${item.rationale}`}
                                            />
                                        ))}
                                    </Surface>
                                );
                            })}
                            {data.lifecycle?.contractAttestedAt && <Alert severity="success">Contract controls were attested {formatShortDate(data.lifecycle.contractAttestedAt)}.</Alert>}
                            {data.canReviewTier && !data.lifecycle?.contractAttestedAt && (
                                <Button variant="contained" disabled={saving} onClick={() => run(() => vendorOnboardingAPI.attestContract(id, { attested: true, clauses }))}>Attest required contract controls</Button>
                            )}
                        </Stack>
                    )}

                    {tab === 4 && (
                        <Stack spacing={1.5}>
                            <Surface>
                                <Typography variant="overline" sx={{ color: 'text.primary', fontSize: '0.78rem', letterSpacing: '0.06em' }}>Decision brief</Typography>
                                <Typography variant="h6">A person must decide</Typography>
                                <Typography variant="body2" sx={{ mb: 1.5 }}>Supreme prepared this record. Approve, approve with conditions, or reject. Residual risk does not change because a person accepts it.</Typography>
                                <Fact label="Vendor / service" value={`${data.publicId || ''} ${data.name}${data.request?.servicesProvided ? ` · ${data.request.servicesProvided}` : ''}`.trim()} />
                                <Fact label="Tier" value={humanizeLabel(data.tier || data.tierReview?.confirmedTier || data.tierReview?.recommendedTier)} />
                                <Fact label="Inherent risk" value={data.inherentRiskScore != null ? String(data.inherentRiskScore) : data.inherentRisk != null ? String(data.inherentRisk) : 'Not scored'} />
                                <Fact label="Residual risk" value={data.residualRiskScore != null ? String(data.residualRiskScore) : data.lifecycle?.residualRisk != null ? String(data.lifecycle.residualRisk) : 'Not scored'} />
                                {data.tierReview?.score != null && (
                                    <Fact label="Intake score" value={`${data.tierReview.score} of ${data.tierReview.maxScore || 60}`} />
                                )}
                                <Fact label="Business owner" value={data.owner} />
                                <Fact label="Contract posture" value={data.lifecycle?.contractAttestedAt ? 'Required controls attested' : 'Not attested'} />
                                <Fact label="Privacy / AI context" value={privacyAiScope(data)} />
                                <Fact label="Conditions already recorded" value={data.lifecycle?.approvalConditions || 'None yet'} />
                            </Surface>
                            <Surface>
                                <Typography variant="subtitle1">Findings and remediation</Typography>
                                {(data.lifecycle?.findings || []).filter((row: any) => !['CLOSED', 'RISK_ACCEPTED'].includes(row.status)).map((finding: any) => (
                                    <Typography key={finding.id} variant="body2">{finding.title} · {humanizeLabel(finding.severity)} · {humanizeLabel(finding.status)}{finding.cap ? ` · ${finding.cap}` : ''}</Typography>
                                ))}
                                {!(data.lifecycle?.findings || []).some((row: any) => !['CLOSED', 'RISK_ACCEPTED'].includes(row.status)) && <Typography variant="body2">No open findings.</Typography>}
                            </Surface>
                            <Surface>
                                <Typography variant="subtitle1">Accepted risks</Typography>
                                {(data.lifecycle?.findings || []).filter((row: any) => row.status === 'RISK_ACCEPTED').map((finding: any) => (
                                    <Typography key={finding.id} variant="body2">{finding.title} · accepted residual remains recorded</Typography>
                                ))}
                                {!(data.lifecycle?.findings || []).some((row: any) => row.status === 'RISK_ACCEPTED') && <Typography variant="body2">No accepted risks.</Typography>}
                            </Surface>
                            {data.lifecycle?.approvalDecision && <Alert severity="info">Decision: {humanizeLabel(data.lifecycle.approvalDecision)}{data.lifecycle.approvalConditions ? `. ${data.lifecycle.approvalConditions}` : ''}</Alert>}
                            {data.canReviewTier && (
                                <Surface>
                                    <Typography variant="subtitle1" sx={{ mb: 1 }}>Decision required</Typography>
                                    <Stack spacing={1.5}>
                                        <TextField fullWidth multiline minRows={2} label="Conditions" value={approval.conditions} onChange={(event) => setApproval({ ...approval, conditions: event.target.value })} helperText="Required when approving with conditions." />
                                        <TextField fullWidth multiline minRows={2} label="Rationale" value={approval.rationale} onChange={(event) => setApproval({ ...approval, rationale: event.target.value })} />
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
                                            <Button variant="contained" disabled={saving} onClick={() => run(() => vendorOnboardingAPI.decideApproval(id, { ...approval, decision: 'APPROVE' }))}>Approve</Button>
                                            <Button variant="contained" disabled={saving || !approval.conditions} onClick={() => run(() => vendorOnboardingAPI.decideApproval(id, { ...approval, decision: 'APPROVE_WITH_CONDITIONS' }))}>Approve with conditions</Button>
                                            <Button color="error" disabled={saving} onClick={() => run(() => vendorOnboardingAPI.decideApproval(id, { ...approval, decision: 'REJECT' }))}>Reject</Button>
                                        </Stack>
                                    </Stack>
                                    {['APPROVE', 'APPROVE_WITH_CONDITIONS'].includes(data.lifecycle?.approvalDecision) && data.lifecycle?.vendorStatus !== 'ACTIVE' && (
                                        <Button sx={{ mt: 1.5 }} disabled={saving} onClick={() => run(() => vendorOnboardingAPI.activate(id))}>Activate vendor</Button>
                                    )}
                                </Surface>
                            )}
                        </Stack>
                    )}

                    {tab === 0 && data.stage && ['Active', 'Reassessment', 'Offboarding'].includes(String(data.stage)) && (
                        <Stack spacing={1.5}>
                            {['Active', 'Reassessment'].includes(String(data.stage)) && (
                                <Alert severity="success">Onboarding is complete. This workspace is now lifecycle management.</Alert>
                            )}
                            <Surface>
                                <Typography variant="h6">Active relationship</Typography>
                                <Fact label="Vendor status" value={humanizeLabel(data.lifecycle?.vendorStatus || data.lifecycle?.monitoring?.vendorStatus)} />
                                <Fact label="Current tier" value={humanizeLabel(data.tier || data.tierReview?.confirmedTier)} />
                                <Fact label="Inherent risk" value={data.inherentRiskScore != null ? String(data.inherentRiskScore) : 'Not scored'} />
                                <Fact label="Residual risk" value={data.residualRiskScore != null ? String(data.residualRiskScore) : data.lifecycle?.residualRisk != null ? String(data.lifecycle.residualRisk) : 'Not scored'} />
                                <Fact label="Open findings" value={String(data.lifecycle?.monitoring?.openFindings ?? 0)} />
                                <Fact label="Overdue remediation" value={String(data.lifecycle?.monitoring?.overdueRemediation ?? 0)} />
                                <Fact label="Accepted risks" value={String(data.lifecycle?.monitoring?.acceptedRisks ?? 0)} />
                                <Fact label="Next reassessment" value={formatShortDate(data.lifecycle?.nextReassessmentAt || data.lifecycle?.monitoring?.nextReassessment)} />
                                <Fact label="Contract renewal" value={formatShortDate(data.lifecycle?.contractRenewalDate)} />
                                <Fact label="External intelligence" value={data.lifecycle?.monitoring?.externalIntelligence} />
                            </Surface>
                            <Surface>
                                <Typography variant="h6">Reassessment</Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    {reassessment?.recommendation
                                        ? `${reassessment.recommendation}. ${reassessment.why || reassessment.nextAction || ''}`
                                        : 'Supreme recommends a targeted or full reassessment from the previous assessment, expired evidence, open findings, and scope or template changes. Previous answers are shown for confirmation and do not become current truth until confirmed or revised.'}
                                </Typography>
                                {reassessment && (
                                    <>
                                        <Fact label="Why this type" value={reassessment.why} />
                                        <Fact label="Previous assessment" value={reassessment.previousAssessment ? `${reassessment.previousAssessment.name} · ${humanizeLabel(reassessment.previousAssessment.status)}${reassessment.previousAssessment.completedAt ? ` · ${formatShortDate(reassessment.previousAssessment.completedAt)}` : ''}` : 'No prior completed assessment'} />
                                        <Fact label="Current assessment" value={reassessment.currentAssessment ? `${reassessment.currentAssessment.name} · ${humanizeLabel(reassessment.currentAssessment.status)}` : 'Not started'} />
                                        <Fact label="Changed answers" value={String(reassessment.changedAnswers ?? 0)} />
                                        <Fact label="Expired evidence" value={String(reassessment.expiredEvidence ?? 0)} />
                                        <Fact label="Open findings" value={String(reassessment.unresolvedFindings ?? 0)} />
                                        <Fact label="Template or version change" value={reassessment.templateChanged ? 'Yes — full reassessment' : 'No recorded change'} />
                                        <Fact label="Scope change" value={[reassessment.newScope?.privacy ? 'Privacy in scope' : null, reassessment.newScope?.aiGovernance ? 'AI in scope' : null].filter(Boolean).join(' · ') || 'No recorded privacy or AI scope change'} />
                                    </>
                                )}
                                {(reassessment?.previousAnswers || []).length > 0 && (
                                    <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                                        <Typography variant="subtitle2">Previous answers</Typography>
                                        <Typography variant="caption">Shown for confirmation. They are not current truth until the vendor confirms or revises them.</Typography>
                                        {reassessment.previousAnswers.slice(0, 12).map((row: any) => (
                                            <Typography key={row.questionId} variant="body2">
                                                {row.question}: previously “{row.previous}”{row.current ? ` · current “${row.current}”` : ''}{row.changed ? ' · changed' : ''}
                                            </Typography>
                                        ))}
                                    </Stack>
                                )}
                                {(reassessment?.expiredEvidenceItems || []).length > 0 && (
                                    <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                                        <Typography variant="subtitle2">Expired evidence</Typography>
                                        {reassessment.expiredEvidenceItems.map((row: any) => (
                                            <Typography key={row.id} variant="body2">{row.filename} · uploaded {formatShortDate(row.uploadedAt)} · {humanizeLabel(row.scanStatus)}</Typography>
                                        ))}
                                    </Stack>
                                )}
                                {(reassessment?.openFindings || []).length > 0 && (
                                    <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                                        <Typography variant="subtitle2">Open findings</Typography>
                                        {reassessment.openFindings.map((row: any) => (
                                            <Typography key={row.id} variant="body2">{row.title} · {humanizeLabel(row.severity)} · {humanizeLabel(row.status)}</Typography>
                                        ))}
                                    </Stack>
                                )}
                                {data.canReviewTier && (
                                    <Stack spacing={1} sx={{ mt: 1.5 }}>
                                        <FormControlLabel
                                            control={<Checkbox checked={confirmPriorAnswers} onChange={(event) => setConfirmPriorAnswers(event.target.checked)} />}
                                            label="I understand prior answers will be shown for confirmation and will not become current truth until the vendor confirms or revises them."
                                        />
                                        <Button disabled={saving || (Boolean(reassessment?.previousAnswersEligible) && !confirmPriorAnswers)} onClick={() => run(() => vendorOnboardingAPI.startReassessment(id, { confirmPriorAnswers }))}>Start recommended reassessment</Button>
                                    </Stack>
                                )}
                            </Surface>
                            <Surface>
                                <Typography variant="h6">Offboarding</Typography>
                                <Typography variant="body2" sx={{ mb: 1.5 }}>
                                    Closure retains the governance history. Records are not deleted when a vendor is offboarded.
                                </Typography>
                                <Fact label="Open findings" value={String(data.lifecycle?.monitoring?.openFindings ?? 0)} />
                                <Fact label="Accepted risks still recorded" value={String(data.lifecycle?.monitoring?.acceptedRisks ?? 0)} />
                                <Fact label="Contract" value={data.lifecycle?.contractAttestedAt ? 'Attested — closeout still required' : 'Not attested'} />
                                {data.canReviewTier && (
                                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                                        <TextField fullWidth multiline minRows={2} label="Exit notes" value={exitNotes} onChange={(event) => setExitNotes(event.target.value)} />
                                        <FormControlLabel control={<Checkbox checked={acknowledgeOutstanding} onChange={(event) => setAcknowledgeOutstanding(event.target.checked)} />} label="I acknowledge outstanding findings or assessments. History is retained." />
                                        <Button disabled={saving} onClick={() => run(() => vendorOnboardingAPI.offboard(id, { exitNotes, acknowledgeOutstanding }))}>Start guided offboarding</Button>
                                    </Stack>
                                )}
                            </Surface>
                        </Stack>
                    )}

                    {tab === 5 && (
                        <Stack spacing={1.5}>
                            <Surface>
                                <Typography variant="h6">Customer history</Typography>
                                <Typography variant="body2" sx={{ mb: 1.5 }}>
                                    The management timeline is the story of this vendor. Audit detail keeps every recorded event. Nothing is deleted.
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                    <Button variant={historyLayer === 'milestones' ? 'contained' : 'outlined'} onClick={() => setHistoryLayer('milestones')}>Management timeline</Button>
                                    <Button variant={historyLayer === 'audit' ? 'contained' : 'outlined'} onClick={() => setHistoryLayer('audit')}>Audit detail</Button>
                                </Stack>
                            </Surface>
                            <Surface>
                                <Typography variant="subtitle1">{historyLayer === 'milestones' ? 'Management timeline' : 'Audit detail'}</Typography>
                                <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                                    {(data.history || [])
                                        .filter((event: any) => historyLayer === 'audit' || event.milestone || MILESTONE_TITLES.has(event.title))
                                        .map((event: any, index: number) => (
                                            <Stack key={`${event.at}-${event.title}-${index}`}>
                                                <Typography variant="subtitle2">{event.title}</Typography>
                                                <Typography variant="body2">{event.detail}</Typography>
                                                <Typography variant="caption">{formatShortDate(event.at)}</Typography>
                                            </Stack>
                                        ))}
                                    {!(data.history || []).some((event: any) => historyLayer === 'audit' || event.milestone || MILESTONE_TITLES.has(event.title)) && (
                                        <Typography>{historyLayer === 'milestones' ? 'No milestones yet. Complete intake to start the story.' : 'No onboarding history is recorded yet.'}</Typography>
                                    )}
                                </Stack>
                            </Surface>
                        </Stack>
                    )}
                </Stack>
                </PageShell>
            )}
        </QueryState>
    );
}

function intakeProgress(sections: any[] | undefined, answers: Record<string, string>) {
    const questions = (sections || []).flatMap((section) => section.questions || []);
    const answered = questions.filter((question: any) => String(answers[question.key] || question.response || '').trim()).length;
    return `${answered} of ${questions.length}`;
}

function hasUnknown(answers: Record<string, string>) {
    return Object.values(answers).some((value) => /^unknown$/i.test(String(value).trim()));
}

const CONTROLLING_UNKNOWN_MESSAGES: Record<string, { code: string; message: string }> = {
    ir_01: {
        code: 'IR-01',
        message: 'We still need to know whether an outage would disrupt critical operations or customer commitments before Supreme can finalize the due-diligence package.',
    },
    ir_02: {
        code: 'IR-02',
        message: 'We still need to know whether this vendor will store or process confidential, regulated, payment, or health information before Supreme can finalize the due-diligence package.',
    },
    ir_04: {
        code: 'IR-04',
        message: 'We still need to know whether this vendor will have privileged administrative access before Supreme can finalize the due-diligence package.',
    },
    ir_05: {
        code: 'IR-05',
        message: 'We still need to know whether this service will connect directly to production systems or trusted networks before Supreme can finalize the due-diligence package.',
    },
    ir_08: {
        code: 'IR-08',
        message: 'We still need to know whether this service could affect a legal, regulatory, or supervisory commitment before Supreme can finalize the due-diligence package.',
    },
    ir_physical: {
        code: 'SCOPE-PHYSICAL',
        message: 'We still need to know whether this service depends on vendor facilities, physical records, or on-site access before Supreme can finalize the due-diligence package.',
    },
};

function controllingUnknowns(answers: Record<string, string> = {}, fromApi: Array<{ code?: string; message?: string; question?: string }> = []) {
    const formHasControllingAnswers = Object.keys(CONTROLLING_UNKNOWN_MESSAGES).some((key) => String(answers[key] || '').trim());
    if (formHasControllingAnswers) {
        return Object.entries(CONTROLLING_UNKNOWN_MESSAGES)
            .filter(([key]) => /^unknown$/i.test(String(answers[key] || '').trim()))
            .map(([, row]) => row);
    }
    return (fromApi || []).filter((row) => row.message || row.question).map((row) => ({
        code: row.code || '',
        message: row.message || `We still need to know: ${row.question}`,
    }));
}

function Fact({ label, value }: { label: string; value?: string | null }) {
    return (
        <>
            <Typography variant="caption">{label}</Typography>
            <Typography sx={{ mb: 1 }}>{value || 'Not recorded'}</Typography>
        </>
    );
}

function clauseGroup(key: string) {
    if (key === 'dpa' || key === 'baa') return 'Privacy';
    if (key === 'breach_notification') return 'Incident';
    if (key === 'subprocessor') return 'Subprocessors';
    if (key === 'deletion_return') return 'Data lifecycle';
    if (key === 'right_to_audit') return 'Assurance';
    return 'Security';
}

const MILESTONE_TITLES = new Set([
    'Vendor requested',
    'Intake completed',
    'Tier confirmed',
    'Tier overridden',
    'Due-diligence plan confirmed',
    'Due diligence sent',
    'Vendor submitted assessment',
    'Finding confirmed',
    'Risk accepted',
    'Contract attested',
    'Approval decided',
    'Vendor activated',
    'Reassessment started',
    'Offboarding started',
]);

function reviewRiskContext(data: any) {
    const facts = [];
    const triggers = data.plan?.triggers || {};
    if (triggers.privacy) facts.push('Privacy is in scope.');
    if (triggers.aiGovernance) facts.push('AI Governance is in scope.');
    const privileged = (data.intake?.sections || [])
        .flatMap((section: any) => section.questions || [])
        .find((question: any) => question.key === 'ir_04')?.response;
    if (privileged && !/^unknown$/i.test(String(privileged))) facts.push(`Privileged access is recorded as ${privileged}.`);
    const regulated = (data.intake?.sections || [])
        .flatMap((section: any) => section.questions || [])
        .find((question: any) => question.key === 'ir_02')?.response;
    if (regulated && !/^unknown$/i.test(String(regulated))) facts.push(`Regulated or confidential data is recorded as ${regulated}.`);
    return facts.join(' ');
}

function privacyAiScope(data: any) {
    const triggers = data.plan?.triggers || data.lifecycle?.plan?.triggers || {};
    const parts = [
        triggers.privacy ? 'Privacy in scope' : null,
        triggers.aiGovernance ? 'AI in scope' : null,
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Not recorded as in scope';
}
