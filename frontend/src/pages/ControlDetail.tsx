import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import EntityRelationships from '../components/EntityRelationships';
import { color } from '../design/tokens';
import { sccAPI } from '../services/api';

const SECTIONS = ['Overview', 'Requirements', 'Evidence', 'Testing', 'Findings', 'Risks', 'Relationships', 'History'] as const;

type Detail = {
    honesty: string;
    control: {
        id: string;
        controlKey: string;
        title: string;
        description: string;
        objective: string;
        domain: string;
        implementationStatus: string;
        effectivenessStatus: string;
        frequency?: string | null;
        lastTestedAt?: string | null;
        nextTestAt?: string | null;
        ownerUserId?: string | null;
    };
    mappings: Array<{ id: string; framework: string; requirementKey: string; supremeSummary: string; strength: string }>;
    evidence: Array<{
        id: string;
        rationale: string;
        relationship: string;
        freshness: string;
        usable: boolean;
        reviewedBy?: string | null;
        reviewedAt?: string | null;
        createdBy: string;
        createdAt: string;
        storedObject: { id: string; filename: string; scanStatus: string };
    }>;
    tests: Array<{ id: string; method: string; result: string; testedAt: string; notes?: string | null; findingId?: string | null }>;
    history: Array<{ id: string; action: string; actorUserId?: string | null; createdAt: string }>;
};

export default function ControlDetail() {
    const { controlId } = useParams();
    const navigate = useNavigate();
    const [section, setSection] = useState<(typeof SECTIONS)[number]>('Overview');
    const [detail, setDetail] = useState<Detail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [implementation, setImplementation] = useState('NOT_IMPLEMENTED');
    const [reusable, setReusable] = useState<Array<{ id: string; filename: string; usable: boolean; scanStatus: string; reuseCount: number; freshness: string }>>([]);
    const [evidenceId, setEvidenceId] = useState('');
    const [rationale, setRationale] = useState('');
    const [relationship, setRelationship] = useState('SUPPORTS');
    const [method, setMethod] = useState('INSPECTION');
    const [result, setResult] = useState('PASS');
    const [notes, setNotes] = useState('');
    const [findingId, setFindingId] = useState('');

    const load = async () => {
        if (!controlId) return;
        setLoading(true);
        try {
            const [controlRes, evidenceRes] = await Promise.all([sccAPI.control(controlId), sccAPI.evidence()]);
            setDetail(controlRes.data.data);
            setImplementation(controlRes.data.data.control.implementationStatus);
            setReusable(evidenceRes.data.data || []);
        } catch (err: any) {
            setError(err.message || 'Unable to load control');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [controlId]);

    const saveImplementation = async (event: FormEvent) => {
        event.preventDefault();
        if (!controlId) return;
        await sccAPI.updateControl(controlId, { implementationStatus: implementation });
        await load();
    };

    const linkExisting = async (event: FormEvent) => {
        event.preventDefault();
        if (!controlId || !evidenceId) return;
        await sccAPI.linkEvidence({
            storedObjectId: evidenceId,
            targetType: 'CONTROL',
            targetId: controlId,
            relationship,
            rationale,
        });
        setRationale('');
        await load();
    };

    const recordTest = async (event: FormEvent) => {
        event.preventDefault();
        if (!controlId) return;
        await sccAPI.recordTest(controlId, { method, result, notes, findingId: findingId || undefined });
        setNotes('');
        await load();
    };

    const control = detail?.control;

    return (
        <Box sx={{ maxWidth: 1280 }}>
            <PageHeader
                crumbs={[{ label: 'Controls', to: '/control-center' }, { label: control?.controlKey || 'Control' }]}
                title={control ? `${control.controlKey} ${control.title}` : 'Control'}
                description={control?.objective}
                meta={control && (
                    <Stack direction="row" spacing={1}>
                        <StatusBadge kind="plain" label={control.implementationStatus.replace(/_/g, ' ')} />
                        <StatusBadge kind="plain" label={control.effectivenessStatus.replace(/_/g, ' ')} />
                    </Stack>
                )}
            />
            {detail && <Alert severity="info" sx={{ mb: 2 }}>{detail.honesty}</Alert>}
            <QueryState loading={loading} error={error} empty={!control} emptyTitle="Control not found" emptyBody="Return to Control Center and choose a control from this organization.">
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
                    <Box sx={{ width: { xs: '100%', lg: 220 }, flexShrink: 0 }}>
                        <Stack spacing={0.75}>
                            {SECTIONS.map((item) => {
                                const active = section === item;
                                return (
                                    <Box
                                        key={item}
                                        component="button"
                                        onClick={() => setSection(item)}
                                        sx={{
                                            textAlign: 'left',
                                            p: 1.25,
                                            border: `1px solid ${active ? color.gold : color.line}`,
                                            bgcolor: color.surface,
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            color: 'inherit',
                                            font: 'inherit',
                                        }}
                                    >
                                        <Typography variant="subtitle2">{item}</Typography>
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                        {section === 'Overview' && control && (
                            <Surface>
                                <Typography variant="h5" sx={{ mb: 1 }}>Overview</Typography>
                                <Typography variant="body2" sx={{ mb: 2 }}>{control.description}</Typography>
                                <Typography variant="caption" display="block" sx={{ mb: 2 }}>Domain {control.domain.replace(/_/g, ' ')} · Last tested {control.lastTestedAt?.slice(0, 10) || 'not tested'}</Typography>
                                <Box component="form" onSubmit={saveImplementation}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                                        <TextField select label="Implementation" value={implementation} onChange={(event) => setImplementation(event.target.value)} sx={{ minWidth: 220 }}>
                                            <MenuItem value="NOT_IMPLEMENTED">Not implemented</MenuItem>
                                            <MenuItem value="PLANNED">Planned</MenuItem>
                                            <MenuItem value="IMPLEMENTED">Implemented</MenuItem>
                                        </TextField>
                                        <Button type="submit" variant="contained">Save implementation</Button>
                                    </Stack>
                                </Box>
                            </Surface>
                        )}
                        {section === 'Requirements' && (
                            <Surface>
                                <Typography variant="h5" sx={{ mb: 1 }}>Mapped requirements</Typography>
                                <Typography variant="body2" sx={{ mb: 2 }}>Identifiers and Supreme summaries only. Mapping is not certification.</Typography>
                                <Stack spacing={1}>
                                    {(detail?.mappings || []).map((row) => (
                                        <Box key={row.id} sx={{ p: 1.5, border: `1px solid ${color.line}`, borderRadius: '6px' }}>
                                            <Typography variant="subtitle2">{row.framework} · {row.requirementKey}</Typography>
                                            <Typography variant="body2">{row.supremeSummary}</Typography>
                                            <Typography variant="caption">{row.strength.replace(/_/g, ' ')}</Typography>
                                        </Box>
                                    ))}
                                    {(detail?.mappings || []).length === 0 && <Typography variant="body2">No current mappings.</Typography>}
                                </Stack>
                            </Surface>
                        )}
                        {section === 'Evidence' && (
                            <Surface>
                                <Typography variant="h5" sx={{ mb: 1 }}>Evidence</Typography>
                                <Typography variant="body2" sx={{ mb: 2 }}>Use existing CLEAN evidence before uploading again. A file does not automatically prove every mapped requirement.</Typography>
                                <Box component="form" onSubmit={linkExisting} sx={{ mb: 3 }}>
                                    <Stack spacing={1.5}>
                                        <TextField select label="Use existing evidence" value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)}>
                                            <MenuItem value="">Select a file</MenuItem>
                                            {reusable.map((row) => (
                                                <MenuItem key={row.id} value={row.id} disabled={!row.usable}>
                                                    {row.filename} · {row.scanStatus} · reused {row.reuseCount}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                        <TextField select label="Relationship" value={relationship} onChange={(event) => setRelationship(event.target.value)}>
                                            <MenuItem value="SUPPORTS">Supports</MenuItem>
                                            <MenuItem value="PARTIALLY_SUPPORTS">Partially supports</MenuItem>
                                            <MenuItem value="RELATED_TO">Related to</MenuItem>
                                            <MenuItem value="CONTRADICTS">Contradicts</MenuItem>
                                        </TextField>
                                        <TextField label="Why this evidence supports this control" value={rationale} onChange={(event) => setRationale(event.target.value)} required multiline minRows={2} />
                                        <Button type="submit" variant="contained" disabled={!evidenceId}>Link evidence</Button>
                                    </Stack>
                                </Box>
                                <Stack spacing={1}>
                                    {(detail?.evidence || []).map((row) => (
                                        <Box key={row.id} sx={{ p: 1.5, border: `1px solid ${color.line}`, borderRadius: '6px' }}>
                                            <Typography variant="subtitle2">{row.storedObject.filename}</Typography>
                                            <Typography variant="body2">{row.rationale}</Typography>
                                            <Stack direction="row" spacing={1} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
                                                <StatusBadge kind="plain" label={row.relationship.replace(/_/g, ' ')} />
                                                <StatusBadge kind="plain" label={row.freshness} />
                                                <StatusBadge kind="plain" tone={row.storedObject.scanStatus === 'CLEAN' ? 'success' : 'high'} label={row.storedObject.scanStatus} />
                                                <StatusBadge kind="plain" tone={row.usable ? 'success' : 'high'} label={row.usable ? 'Usable' : 'Not usable'} />
                                            </Stack>
                                            <Typography variant="caption" display="block" sx={{ mt: 0.75 }}>
                                                Linked by {row.createdBy} on {row.createdAt.slice(0, 10)}
                                                {row.reviewedBy ? ` · reviewed by ${row.reviewedBy}` : ' · not reviewed'}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </Surface>
                        )}
                        {section === 'Testing' && (
                            <Surface>
                                <Typography variant="h5" sx={{ mb: 1 }}>Testing</Typography>
                                <Typography variant="body2" sx={{ mb: 2 }}>Not applicable is not a pass. Failed or partial tests can link an existing finding. They do not invent one.</Typography>
                                <Box component="form" onSubmit={recordTest} sx={{ mb: 3 }}>
                                    <Stack spacing={1.5}>
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                            <TextField select label="Method" value={method} onChange={(event) => setMethod(event.target.value)} sx={{ minWidth: 180 }}>
                                                <MenuItem value="INQUIRY">Inquiry</MenuItem>
                                                <MenuItem value="OBSERVATION">Observation</MenuItem>
                                                <MenuItem value="INSPECTION">Inspection</MenuItem>
                                                <MenuItem value="REPERFORMANCE">Reperformance</MenuItem>
                                                <MenuItem value="AUTOMATED">Automated</MenuItem>
                                            </TextField>
                                            <TextField select label="Result" value={result} onChange={(event) => setResult(event.target.value)} sx={{ minWidth: 180 }}>
                                                <MenuItem value="PASS">Pass</MenuItem>
                                                <MenuItem value="FAIL">Fail</MenuItem>
                                                <MenuItem value="PARTIAL">Partial</MenuItem>
                                                <MenuItem value="NOT_TESTED">Not tested</MenuItem>
                                                <MenuItem value="NOT_APPLICABLE">Not applicable</MenuItem>
                                            </TextField>
                                        </Stack>
                                        <TextField label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} multiline minRows={2} />
                                        <TextField label="Existing finding ID (optional)" value={findingId} onChange={(event) => setFindingId(event.target.value)} />
                                        <Button type="submit" variant="contained">Record test</Button>
                                    </Stack>
                                </Box>
                                <Stack spacing={1}>
                                    {(detail?.tests || []).map((row) => (
                                        <Box key={row.id} sx={{ p: 1.5, border: `1px solid ${color.line}`, borderRadius: '6px' }}>
                                            <Typography variant="subtitle2">{row.result.replace(/_/g, ' ')} · {row.method}</Typography>
                                            <Typography variant="caption">{row.testedAt.slice(0, 10)}{row.findingId ? ` · finding ${row.findingId}` : ''}</Typography>
                                            {row.notes && <Typography variant="body2">{row.notes}</Typography>}
                                        </Box>
                                    ))}
                                </Stack>
                            </Surface>
                        )}
                        {section === 'Findings' && (
                            <Surface>
                                <Typography variant="h5" sx={{ mb: 1 }}>Findings</Typography>
                                <Typography variant="body2" sx={{ mb: 2 }}>Findings stay in the Findings workspace. Tests may link them; they never create them automatically.</Typography>
                                {(detail?.tests || []).filter((row) => row.findingId).map((row) => (
                                    <Box key={row.id} sx={{ p: 1.5, border: `1px solid ${color.line}`, borderRadius: '6px', mb: 1 }}>
                                        <Typography variant="subtitle2">Linked finding {row.findingId}</Typography>
                                        <Button size="small" onClick={() => navigate('/findings')}>Open findings</Button>
                                    </Box>
                                ))}
                                {(detail?.tests || []).every((row) => !row.findingId) && <Typography variant="body2">No findings are linked to this control’s tests.</Typography>}
                            </Surface>
                        )}
                        {section === 'Risks' && (
                            <Surface>
                                <Typography variant="h5" sx={{ mb: 1 }}>Risks</Typography>
                                <Typography variant="body2">Residual scores are not changed by control mapping or evidence expiry. Use potential governance impact from the Evidence Library when a file becomes invalid.</Typography>
                            </Surface>
                        )}
                        {section === 'Relationships' && control && (
                            <Surface>
                                <Typography variant="h5" sx={{ mb: 1 }}>Relationships</Typography>
                                <EntityRelationships sourceModel="OrganizationControl" sourceId={control.id} />
                            </Surface>
                        )}
                        {section === 'History' && (
                            <Surface>
                                <Typography variant="h5" sx={{ mb: 1 }}>History</Typography>
                                <Stack spacing={1}>
                                    {(detail?.history || []).map((row) => (
                                        <Box key={row.id} sx={{ p: 1.5, border: `1px solid ${color.line}`, borderRadius: '6px' }}>
                                            <Typography variant="subtitle2">{row.action}</Typography>
                                            <Typography variant="caption">{row.createdAt.slice(0, 16).replace('T', ' ')}</Typography>
                                        </Box>
                                    ))}
                                    {(detail?.history || []).length === 0 && <Typography variant="body2">No audited control events yet.</Typography>}
                                </Stack>
                            </Surface>
                        )}
                    </Box>
                </Stack>
            </QueryState>
        </Box>
    );
}
