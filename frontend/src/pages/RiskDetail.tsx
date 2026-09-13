import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import EntityRelationships from '../components/EntityRelationships';
import { ermAPI, sccAPI, tprmAPI, vendorAPI } from '../services/api';
import { formatDateTime, formatShortDate, humanizeLabel } from '../utils/humanizeLabel';

const SECTIONS = ['Overview', 'Scoring', 'Impact', 'Controls', 'Evidence', 'Findings', 'Treatment', 'KRIs', 'Decisions', 'Relationships', 'History'] as const;

export default function RiskDetail() {
    const { publicId = '' } = useParams();
    const [section, setSection] = useState<(typeof SECTIONS)[number]>('Overview');
    const [detail, setDetail] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [controls, setControls] = useState<Array<{ id: string; title: string }>>([]);
    const [findings, setFindings] = useState<Array<{ id: string; title: string }>>([]);
    const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
    const [vendorId, setVendorId] = useState('');
    const [controlId, setControlId] = useState('');
    const [findingId, setFindingId] = useState('');
    const [rationale, setRationale] = useState('');
    const [strategy, setStrategy] = useState('MITIGATE');
    const [notes, setNotes] = useState('');
    const [kriName, setKriName] = useState('');
    const [warning, setWarning] = useState(5);
    const [critical, setCritical] = useState(10);
    const [measure, setMeasure] = useState('');
    const [decisionRationale, setDecisionRationale] = useState('');
    const [controlImpact, setControlImpact] = useState<any>(null);
    const [owners, setOwners] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
    const [ownerUserId, setOwnerUserId] = useState('');
    const [openDetail, setOpenDetail] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        ermAPI.get(publicId)
            .then((riskRes) => {
                setDetail(riskRes.data.data);
                sccAPI.controls().then((res) => setControls(res.data.data || [])).catch(() => setControls([]));
                tprmAPI.listFindings().then((res) => setFindings(res.data.data || res.data.findings || [])).catch(() => setFindings([]));
                vendorAPI.getAll().then((res) => setVendors(res.data.vendors || res.data.data || [])).catch(() => setVendors([]));
                ermAPI.owners().then((res) => setOwners(res.data.data || [])).catch(() => setOwners([]));
            })
            .catch((err) => setError(err.message || 'Unable to load this risk'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [publicId]);

    if (loading || error || !detail) {
        return <QueryState loading={loading} error={error} empty={!detail} emptyTitle="Risk not found" emptyBody="This identifier is not in your organization."><span /></QueryState>;
    }

    const risk = detail.risk;
    const latest = risk.scores?.[0];

    const submit = async (event: FormEvent, work: () => Promise<unknown>) => {
        event.preventDefault();
        try {
            await work();
            load();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <Box sx={{ maxWidth: 1100 }}>
            <PageHeader
                title={`${risk.publicId} · ${risk.title}`}
                description={detail.honesty}
            />
            <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                <StatusBadge kind="plain" tone={risk.residualRating === 'CRITICAL' ? 'critical' : risk.residualRating === 'HIGH' ? 'high' : 'medium'} label={humanizeLabel(risk.residualRating)} />
                <StatusBadge kind="plain" tone="neutral" label={humanizeLabel(risk.status)} />
                <StatusBadge kind="plain" tone={risk.appetiteStatus === 'OUTSIDE_APPETITE' ? 'high' : 'neutral'} label={humanizeLabel(risk.appetiteStatus)} />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto' }}>
                {SECTIONS.map((item) => (
                    <Button key={item} size="small" variant={section === item ? 'contained' : 'text'} onClick={() => setSection(item)}>{item}</Button>
                ))}
            </Stack>
            {section === 'Overview' && (
                <Surface>
                    <Typography variant="body2" sx={{ mb: 1 }}>{risk.statement || 'No structured statement recorded.'}</Typography>
                    <Typography variant="body2">{risk.description || 'No additional description.'}</Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 2 }}>Category {humanizeLabel(risk.category)} · Review {formatShortDate(risk.reviewDate)}</Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mt: 1.5 }}>
                        <StatusBadge kind="plain" tone={risk.ownerUserId ? 'neutral' : 'high'} label={detail.owners?.[0] ? `${detail.owners[0].firstName} ${detail.owners[0].lastName}` : 'Unassigned'} />
                        <Box component="form" onSubmit={(event) => submit(event, () => ermAPI.update(risk.publicId, { ownerUserId }))}>
                            <Stack direction="row" spacing={1}>
                                <TextField select size="small" label="Assign owner" value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)} sx={{ minWidth: 220 }}>
                                    {owners.map((person) => <MenuItem key={person.id} value={person.id}>{person.firstName} {person.lastName}</MenuItem>)}
                                </TextField>
                                <Button type="submit" variant="contained" disabled={!ownerUserId}>Assign</Button>
                            </Stack>
                        </Box>
                    </Stack>
                </Surface>
            )}
            {section === 'Scoring' && (
                <Surface>
                    <Typography variant="subtitle2">Inherent {risk.inherentScore} · {humanizeLabel(risk.inherentRating)}</Typography>
                    <Typography variant="subtitle2">Residual {risk.residualScore} · {humanizeLabel(risk.residualRating)}</Typography>
                    {risk.targetScore != null && <Typography variant="body2">Target {risk.targetScore} · {humanizeLabel(risk.targetRating)}</Typography>}
                    <Typography variant="body2" sx={{ mt: 1 }}>{latest?.explanation}</Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>Methodology {risk.methodologyVersion} · Calculated {formatShortDate(risk.lastCalculatedAt)}</Typography>
                    <Typography variant="caption" display="block">Acceptance is a decision. It does not change this residual score.</Typography>
                </Surface>
            )}
            {section === 'Impact' && (
                <Surface>
                    <Typography variant="body2" sx={{ mb: 1 }}>Highest configured dimension suggests overall impact. There is no invented financial loss figure.</Typography>
                    {(risk.dimensions || []).length === 0 ? <Typography variant="body2">No impact dimensions recorded.</Typography> : risk.dimensions.map((row: any) => (
                        <Typography key={row.id} variant="body2">{humanizeLabel(row.dimension)} · {row.rating}</Typography>
                    ))}
                </Surface>
            )}
            {section === 'Controls' && (
                <Surface>
                    <Typography variant="body2" sx={{ mb: 1 }}>These controls are expected to reduce the risk. Effectiveness comes from tests, not from uploaded files.</Typography>
                    {detail.controls.map((control: any) => (
                        <Box key={control.id} sx={{ mb: 1.5 }}>
                            <Typography variant="subtitle2">{control.title}</Typography>
                            <Typography variant="caption" display="block">{humanizeLabel(control.implementationStatus)} · {humanizeLabel(control.effectivenessStatus)} · Last test {formatShortDate(control.lastTest?.testedAt)}</Typography>
                            <Button size="small" sx={{ mt: 0.5 }} onClick={async () => setControlImpact((await ermAPI.controlImpact(control.id)).data.data)}>If this control fails</Button>
                        </Box>
                    ))}
                    {controlImpact && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2">Recommended governance actions</Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>{controlImpact.honesty}</Typography>
                            {(controlImpact.risks || []).map((item: any) => (
                                <Typography key={item.publicId} variant="body2">{item.publicId} · {item.title} · residual {humanizeLabel(item.residualRating)} · {humanizeLabel(item.appetiteStatus)}</Typography>
                            ))}
                            {(controlImpact.recommendedActions || []).map((item: string) => (
                                <Typography key={item} variant="body2">• {item}</Typography>
                            ))}
                        </Box>
                    )}
                    <Box component="form" onSubmit={(event) => submit(event, () => ermAPI.linkControl(risk.publicId, { controlId, rationale }))}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
                            <TextField select label="Control" value={controlId} onChange={(e) => setControlId(e.target.value)} sx={{ minWidth: 240 }}>
                                {controls.map((control) => <MenuItem key={control.id} value={control.id}>{control.title}</MenuItem>)}
                            </TextField>
                            <TextField label="Why it reduces this risk" value={rationale} onChange={(e) => setRationale(e.target.value)} />
                            <Button type="submit" variant="contained">Link</Button>
                        </Stack>
                    </Box>
                </Surface>
            )}
            {section === 'Evidence' && (
                <Surface>
                    {detail.controls.flatMap((control: any) => control.evidence || []).length === 0
                        ? <Typography variant="body2">No linked control evidence. A file does not prove effectiveness.</Typography>
                        : detail.controls.flatMap((control: any) => (control.evidence || []).map((item: any) => (
                            <Typography key={`${control.id}-${item.filename}`} variant="body2">{item.filename} · {humanizeLabel(item.scanStatus)} · {item.usable ? 'Usable' : 'Not usable'}</Typography>
                        )))}
                </Surface>
            )}
            {section === 'Findings' && (
                <Surface>
                    {(detail.findings || []).length === 0 && <Typography variant="body2">No findings linked to this risk.</Typography>}
                    {(detail.findings || []).map((finding: any) => (
                        <Typography key={finding.id} variant="body2">{finding.title} · {humanizeLabel(finding.severity)} · {humanizeLabel(finding.status)}</Typography>
                    ))}
                    <Box component="form" onSubmit={(event) => submit(event, () => ermAPI.linkFinding(risk.publicId, { findingId }))}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
                            <TextField select label="Finding" value={findingId} onChange={(e) => setFindingId(e.target.value)} sx={{ minWidth: 240 }}>
                                {findings.map((finding) => <MenuItem key={finding.id} value={finding.id}>{finding.title}</MenuItem>)}
                            </TextField>
                            <Button type="submit">Link finding</Button>
                        </Stack>
                    </Box>
                </Surface>
            )}
            {section === 'Treatment' && (
                <Surface>
                    {(risk.treatments || []).map((item: any) => (
                        <Typography key={item.id} variant="body2">{humanizeLabel(item.strategy)} · {humanizeLabel(item.status)} · due {formatShortDate(item.dueDate)}</Typography>
                    ))}
                    <Typography variant="caption" display="block" sx={{ my: 1 }}>A plan does not lower residual risk by itself.</Typography>
                    <Box component="form" onSubmit={(event) => submit(event, () => ermAPI.createTreatment(risk.publicId, { strategy, notes }))}>
                        <Stack spacing={1}>
                            <TextField select label="Strategy" value={strategy} onChange={(e) => setStrategy(e.target.value)}>
                                {['MITIGATE', 'ACCEPT', 'TRANSFER', 'AVOID', 'MONITOR'].map((item) => <MenuItem key={item} value={item}>{humanizeLabel(item)}</MenuItem>)}
                            </TextField>
                            <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                            <Button type="submit" variant="contained">Record treatment</Button>
                        </Stack>
                    </Box>
                </Surface>
            )}
            {section === 'KRIs' && (
                <Surface>
                    {(risk.kris || []).map((kri: any) => (
                        <Box key={kri.id} sx={{ mb: 1.5 }}>
                            <Typography variant="subtitle2">{kri.publicId} · {kri.name}</Typography>
                            <Typography variant="caption">{humanizeLabel(kri.status)} · {kri.currentValue ?? 'Not measured'} {kri.unit || ''} · source {kri.source === 'MANUAL' ? 'Manual measurement' : kri.source}</Typography>
                            <Box component="form" onSubmit={(event) => submit(event, () => ermAPI.measureKri(kri.publicId, { value: Number(measure) }))}>
                                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                    <TextField size="small" label="New measurement" value={measure} onChange={(e) => setMeasure(e.target.value)} />
                                    <Button type="submit" size="small">Record</Button>
                                </Stack>
                            </Box>
                        </Box>
                    ))}
                    <Box component="form" onSubmit={(event) => submit(event, () => ermAPI.createKri(risk.publicId, { name: kriName, direction: 'HIGHER_IS_WORSE', warningThreshold: warning, criticalThreshold: critical }))}>
                        <Stack spacing={1} sx={{ mt: 2 }}>
                            <TextField label="KRI name" value={kriName} onChange={(e) => setKriName(e.target.value)} />
                            <Stack direction="row" spacing={1}>
                                <TextField type="number" label="Warning" value={warning} onChange={(e) => setWarning(Number(e.target.value))} />
                                <TextField type="number" label="Critical" value={critical} onChange={(e) => setCritical(Number(e.target.value))} />
                            </Stack>
                            <Button type="submit">Add KRI</Button>
                        </Stack>
                    </Box>
                </Surface>
            )}
            {section === 'Decisions' && (
                <Surface>
                    {(risk.decisions || []).map((item: any) => (
                        <Typography key={item.id} variant="body2">{humanizeLabel(item.decision)} · {humanizeLabel(item.status)} · {formatShortDate(item.approvedAt)}</Typography>
                    ))}
                    <Box component="form" onSubmit={(event) => submit(event, () => ermAPI.decide(risk.publicId, { decision: 'ACCEPT', rationale: decisionRationale, approve: true }))}>
                        <TextField label="Acceptance rationale" value={decisionRationale} onChange={(e) => setDecisionRationale(e.target.value)} fullWidth sx={{ my: 1 }} />
                        <Button type="submit" variant="contained">Accept risk</Button>
                    </Box>
                </Surface>
            )}
            {section === 'Relationships' && (
                <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>If this risk changes, review the related objects below. Relationships are not invented.</Typography>
                    {(risk.relationshipLinks || []).map((item: any) => (
                        <Typography key={item.id} variant="body2">{humanizeLabel(item.relationship)} · {humanizeLabel(item.targetType)}</Typography>
                    ))}
                    <Box component="form" onSubmit={(event) => submit(event, () => ermAPI.addRelationship(risk.publicId, { targetType: 'VENDOR', targetId: vendorId }))} sx={{ my: 2 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <TextField select label="Vendor affected" value={vendorId} onChange={(e) => setVendorId(e.target.value)} sx={{ minWidth: 240 }}>
                                {vendors.map((vendor) => <MenuItem key={vendor.id} value={vendor.id}>{vendor.name}</MenuItem>)}
                            </TextField>
                            <Button type="submit" variant="contained">Link vendor</Button>
                        </Stack>
                    </Box>
                    <EntityRelationships sourceModel="EnterpriseRisk" sourceId={risk.id} />
                </Box>
            )}
            {section === 'History' && (
                <Surface>
                    {(detail.timeline || []).length === 0 && <Typography variant="body2">No recorded changes yet.</Typography>}
                    {(detail.timeline || []).map((item: any, index: number) => (
                        <Box key={`${item.title}-${item.createdAt}-${index}`} sx={{ py: 1, borderBottom: '1px solid rgba(20,32,46,0.08)' }}>
                            <Typography variant="subtitle2">{item.title}</Typography>
                            {item.change && <Typography variant="body2">{item.change}</Typography>}
                            <Typography variant="caption" display="block">{item.actor} · {formatDateTime(item.createdAt)}</Typography>
                            {item.detail && (
                                <>
                                    <Button size="small" sx={{ mt: 0.5 }} onClick={() => setOpenDetail(openDetail === item.createdAt ? null : item.createdAt)}>
                                        {openDetail === item.createdAt ? 'Hide calculation details' : 'View calculation details'}
                                    </Button>
                                    {openDetail === item.createdAt && <Typography variant="body2" sx={{ mt: 0.5 }}>{item.detail}</Typography>}
                                </>
                            )}
                        </Box>
                    ))}
                </Surface>
            )}
        </Box>
    );
}
