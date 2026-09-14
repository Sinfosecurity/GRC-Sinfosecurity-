import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Checkbox, FormControlLabel, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import LifecycleHeader from '../components/design/LifecycleHeader';
import { vendorOnboardingAPI } from '../services/api';
import { formatShortDate, humanizeLabel } from '../utils/humanizeLabel';

const STEPS = ['Request', 'Intake', 'Tier Review', 'Due Diligence', 'Findings', 'Contract', 'Approval', 'Active'];

function stepperIndex(stage?: string) {
    if (stage === 'Intake') return 1;
    if (stage === 'Tier review') return 2;
    if (['Due diligence', 'Ready to send', 'Awaiting vendor', 'Vendor in progress', 'Submitted', 'Under review'].includes(String(stage))) return 3;
    if (['Remediation', 'Risk acceptance'].includes(String(stage))) return 4;
    if (stage === 'Contract review') return 5;
    if (stage === 'Approval') return 6;
    if (['Active', 'Reassessment', 'Offboarding'].includes(String(stage))) return 7;
    return 0;
}

function defaultTab(stage?: string) {
    if (stage === 'Intake') return 1;
    if (stage === 'Tier review') return 2;
    if (stage === 'Due diligence' || stage === 'Ready to send') return 3;
    if (['Awaiting vendor', 'Vendor in progress'].includes(String(stage))) return 4;
    if (['Submitted', 'Under review'].includes(String(stage))) return 5;
    if (['Remediation', 'Risk acceptance'].includes(String(stage))) return 6;
    if (stage === 'Contract review') return 7;
    if (stage === 'Approval') return 8;
    if (['Active', 'Reassessment', 'Offboarding'].includes(String(stage))) return 9;
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
    const [exitNotes, setExitNotes] = useState('');
    const [acknowledgeOutstanding, setAcknowledgeOutstanding] = useState(false);
    const [reassessment, setReassessment] = useState<any>(null);

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
                        title={data.name}
                        description="Supreme prepared this lifecycle. Confirm the next human action below."
                    />
                    <LifecycleHeader
                        name={data.name}
                        publicId={data.publicId}
                        tier={data.tier || data.tierReview?.confirmedTier || data.tierReview?.recommendedTier}
                        status={data.workflowStatus || data.lifecycle?.vendorStatus}
                        owner={data.owner}
                        stage={data.stage}
                        nextAction={data.nextAction}
                        nextActionOwner={data.nextActionOwner}
                        dueDate={data.dueDate}
                        overdue={data.overdue}
                        steps={STEPS}
                        activeStep={stepperIndex(data.stage)}
                    />
                    {error && <Alert severity="error">{error}</Alert>}
                    <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
                        <Tab label="Request" />
                        <Tab label="Intake" />
                        <Tab label="Tier Review" />
                        <Tab label="Assessment Plan" />
                        <Tab label="Due Diligence" />
                        <Tab label="Review" />
                        <Tab label="Findings" />
                        <Tab label="Contract" />
                        <Tab label="Approval" />
                        <Tab label="Active" />
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
                            {data.stageKey === 'READY_TO_SEND' && <Alert severity="success">Plan confirmed. Choose the vendor contact and send due diligence.</Alert>}
                            {data.plan?.triggers?.privacy && <Button onClick={() => navigate(`/privacy-ops/vendors/${data.id}`)}>Open privacy</Button>}
                            {data.plan?.triggers?.aiGovernance && <Button onClick={() => navigate('/ai-governance')}>Open AI Governance</Button>}
                        </Stack>
                    )}

                    {tab === 4 && (
                        <Stack spacing={1.5}>
                            <Surface>
                                <Typography variant="h6">Send due diligence</Typography>
                                <Typography variant="body2">Supreme prepares the invitation. You authorize sending it to the vendor contact.</Typography>
                            </Surface>
                            {data.invitation && (
                                <Alert severity="info">
                                    Invitation {data.invitation.status}. Email {data.invitation.emailStatus}. {data.invitation.emailTruth || 'Provider accepted or queued the message. This is not inbox delivery.'}
                                </Alert>
                            )}
                            <Surface>
                                <Stack spacing={1.5} component="form" onSubmit={(event) => { event.preventDefault(); run(() => vendorOnboardingAPI.send(id, contact)); }}>
                                    <TextField required label="Primary assessment contact" value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} />
                                    <TextField required type="email" label="Email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} />
                                    <TextField label="Title / role" value={contact.title} onChange={(event) => setContact({ ...contact, title: event.target.value })} />
                                    <TextField label="Phone" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} />
                                    {data.canReviewTier && ['READY_TO_SEND', 'AWAITING_VENDOR'].includes(data.stageKey) && (
                                        <Button type="submit" variant="contained" disabled={saving}>Send due diligence</Button>
                                    )}
                                </Stack>
                            </Surface>
                            {(data.vendorAssessments || []).map((item: any) => (
                                <Surface key={item.id}>
                                    <Typography variant="subtitle1">{item.name}</Typography>
                                    <Typography>{item.status} · {item.answered} / {item.total} answered</Typography>
                                </Surface>
                            ))}
                            {data.canReviewTier && data.invitation && (
                                <Button disabled={saving} onClick={() => run(() => vendorOnboardingAPI.resend(id))}>Resend invitation</Button>
                            )}
                        </Stack>
                    )}

                    {tab === 5 && (
                        <Stack spacing={1.5}>
                            <Surface>
                                <Typography variant="h6">Exception-focused review</Typography>
                                <Typography variant="body2">
                                    {(data.review?.questionsAnswered || 0)} answers recorded · {data.review?.satisfactory || 0} satisfactory · {data.review?.needClarification || 0} need clarification · {data.review?.potentialFindings || 0} potential findings
                                </Typography>
                            </Surface>
                            {data.plan?.triggers?.privacy && <Alert severity="info">Privacy review may be required</Alert>}
                            {data.plan?.triggers?.aiGovernance && <Alert severity="info">AI Governance review may be required</Alert>}
                            {(data.review?.items || []).map((item: any) => (
                                <Surface key={`${item.assessmentId}-${item.questionId}`}>
                                    <Typography variant="subtitle2">{item.question}</Typography>
                                    <Typography>Answer: {item.response}</Typography>
                                    <Typography variant="body2">Why: {item.reason}{item.score != null ? ` · Score ${item.score}` : ''}</Typography>
                                    {item.findingId && data.canReviewTier && item.reviewState === 'DRAFT' && (
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
                                            <Button onClick={() => run(() => vendorOnboardingAPI.reviewFinding(id, item.findingId, { action: 'confirm' }))}>Confirm</Button>
                                            <Button onClick={() => run(() => vendorOnboardingAPI.reviewFinding(id, item.findingId, { action: 'adjust', severity: 'HIGH', reason: 'Confirmed at high severity after review.' }))}>Adjust to High</Button>
                                            <Button onClick={() => run(() => vendorOnboardingAPI.reviewFinding(id, item.findingId, { action: 'dismiss', reason: 'Accepted as documented and not a finding.' }))}>Dismiss</Button>
                                        </Stack>
                                    )}
                                </Surface>
                            ))}
                            {!data.review?.items?.length && <Typography>No exceptions require review yet.</Typography>}
                        </Stack>
                    )}

                    {tab === 6 && (
                        <Stack spacing={1.5}>
                            <Surface>
                                <Typography variant="h6">Findings and remediation</Typography>
                                <Typography variant="body2">Confirm findings first. Close only with ready remediation evidence. Risk acceptance does not change the residual score.</Typography>
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

                    {tab === 7 && (
                        <Stack spacing={1.5}>
                            <Surface>
                                <Typography variant="h6">Contract review</Typography>
                                <Typography variant="body2">This is an attestation workspace, not legal advice. Required items come from tier and the due-diligence plan.</Typography>
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

                    {tab === 8 && (
                        <Stack spacing={1.5}>
                            <Surface>
                                <Typography variant="h6">Decision required</Typography>
                                <Typography variant="body2" sx={{ mb: 1.5 }}>Supreme prepared this summary. A person must approve, approve with conditions, or reject.</Typography>
                                <Fact label="Vendor" value={`${data.publicId || ''} ${data.name}`.trim()} />
                                <Fact label="Service" value={data.request?.service || data.request?.name} />
                                <Fact label="Tier" value={humanizeLabel(data.tier || data.tierReview?.confirmedTier || data.tierReview?.recommendedTier)} />
                                <Fact label="Inherent risk" value={data.tierReview?.inherentRisk != null ? String(data.tierReview.inherentRisk) : data.inherentRisk != null ? String(data.inherentRisk) : 'Not scored'} />
                                <Fact label="Residual risk" value={data.lifecycle?.residualRisk != null ? String(data.lifecycle.residualRisk) : 'Not scored'} />
                                <Fact label="Open findings" value={String(data.lifecycle?.monitoring?.openFindings ?? 0)} />
                                <Fact label="Accepted risks" value={String(data.lifecycle?.monitoring?.acceptedRisks ?? 0)} />
                                <Fact label="Contract" value={data.lifecycle?.contractAttestedAt ? 'Attested' : 'Not attested'} />
                                <Fact label="Business owner" value={data.owner} />
                                <Fact label="Privacy / AI in scope" value={privacyAiScope(data)} />
                            </Surface>
                            {data.lifecycle?.approvalDecision && <Alert severity="info">Decision: {humanizeLabel(data.lifecycle.approvalDecision)}{data.lifecycle.approvalConditions ? `. ${data.lifecycle.approvalConditions}` : ''}</Alert>}
                            {data.canReviewTier && (
                                <Stack spacing={1.5}>
                                    <TextField select label="Decision" value={approval.decision} onChange={(event) => setApproval({ ...approval, decision: event.target.value })}>
                                        <MenuItem value="APPROVE">Approve</MenuItem>
                                        <MenuItem value="APPROVE_WITH_CONDITIONS">Approve with conditions</MenuItem>
                                        <MenuItem value="REJECT">Reject</MenuItem>
                                    </TextField>
                                    <TextField fullWidth multiline minRows={2} label="Conditions" value={approval.conditions} onChange={(event) => setApproval({ ...approval, conditions: event.target.value })} />
                                    <TextField fullWidth multiline minRows={2} label="Rationale" value={approval.rationale} onChange={(event) => setApproval({ ...approval, rationale: event.target.value })} />
                                    <Button variant="contained" disabled={saving} onClick={() => run(() => vendorOnboardingAPI.decideApproval(id, approval))}>Record approval decision</Button>
                                    {['APPROVE', 'APPROVE_WITH_CONDITIONS'].includes(data.lifecycle?.approvalDecision) && data.lifecycle?.vendorStatus !== 'ACTIVE' && (
                                        <Button disabled={saving} onClick={() => run(() => vendorOnboardingAPI.activate(id))}>Activate vendor</Button>
                                    )}
                                </Stack>
                            )}
                        </Stack>
                    )}

                    {tab === 9 && (
                        <Stack spacing={1.5}>
                            {['Active', 'Reassessment'].includes(String(data.stage)) && (
                                <Alert severity="success">Onboarding is complete. This workspace is now lifecycle management.</Alert>
                            )}
                            <Surface>
                                <Typography variant="h6">Active relationship</Typography>
                                <Fact label="Vendor status" value={humanizeLabel(data.lifecycle?.vendorStatus || data.lifecycle?.monitoring?.vendorStatus)} />
                                <Fact label="Residual risk" value={data.lifecycle?.residualRisk != null ? String(data.lifecycle.residualRisk) : 'Not scored'} />
                                <Fact label="Open findings" value={String(data.lifecycle?.monitoring?.openFindings ?? 0)} />
                                <Fact label="Overdue remediation" value={String(data.lifecycle?.monitoring?.overdueRemediation ?? 0)} />
                                <Fact label="Accepted risks" value={String(data.lifecycle?.monitoring?.acceptedRisks ?? 0)} />
                                <Fact label="Next reassessment" value={formatShortDate(data.lifecycle?.nextReassessmentAt || data.lifecycle?.monitoring?.nextReassessment)} />
                                <Fact label="External intelligence" value={data.lifecycle?.monitoring?.externalIntelligence} />
                            </Surface>
                            <Surface>
                                <Typography variant="h6">Reassessment</Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    {reassessment?.recommendation
                                        ? `${reassessment.recommendation}. ${reassessment.nextAction || ''}`
                                        : 'Supreme will recommend a targeted or full reassessment from the previous assessment, expired evidence, and open findings. Previous answers are shown for confirmation, not auto-approved.'}
                                </Typography>
                                {reassessment && (
                                    <>
                                        <Fact label="Changed answers" value={String(reassessment.changedAnswers ?? 0)} />
                                        <Fact label="Expired evidence" value={String(reassessment.expiredEvidence ?? 0)} />
                                        <Fact label="Unresolved findings" value={String(reassessment.unresolvedFindings ?? 0)} />
                                        <Fact label="Previous answers available" value={reassessment.previousAnswersEligible ? 'Yes — confirm, do not pre-approve' : 'No prior vendor answers'} />
                                    </>
                                )}
                                {data.canReviewTier && (
                                    <Button disabled={saving} onClick={() => run(() => vendorOnboardingAPI.startReassessment(id))}>Start recommended reassessment</Button>
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

                    {tab === 10 && (
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

function clauseGroup(key: string) {
    if (key === 'dpa' || key === 'baa') return 'Privacy';
    if (key === 'breach_notification') return 'Incident';
    if (key === 'subprocessor') return 'Subprocessors';
    if (key === 'deletion_return') return 'Data lifecycle';
    if (key === 'right_to_audit') return 'Assurance';
    return 'Security';
}

function privacyAiScope(data: any) {
    const triggers = data.plan?.triggers || data.lifecycle?.plan?.triggers || {};
    const parts = [
        triggers.privacy ? 'Privacy in scope' : null,
        triggers.aiGovernance ? 'AI in scope' : null,
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Not recorded as in scope';
}
