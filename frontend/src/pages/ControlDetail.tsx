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

type FindingRef = { id: string; title: string; status: string; severity: string };

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
        linkedBy?: string;
        reviewedByName?: string | null;
        reviewedBy?: string | null;
        reviewedAt?: string | null;
        createdBy: string;
        createdAt: string;
        storedObject: { id: string; filename: string; scanStatus: string };
    }>;
    tests: Array<{
        id: string;
        method: string;
        result: string;
        testedAt: string;
        notes?: string | null;
        findingId?: string | null;
        testerName?: string;
        finding?: FindingRef | null;
    }>;
    findings?: Array<FindingRef & { testId: string; testedAt: string; result: string }>;
    linkableFindings?: FindingRef[];
    history: Array<{ id: string; action: string; label?: string; actorName?: string; actorUserId?: string | null; createdAt: string }>;
};

function looksLikeId(value?: string | null) {
    return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export default function ControlDetail() {
    const { controlId } = useParams();
    const navigate = useNavigate();
    const [section, setSection] = useState<(typeof SECTIONS)[number]>('Overview');
    const [detail, setDetail] = useState<Detail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
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
            setError(null);
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
        setFormError(null);
        try {
            await sccAPI.updateControl(controlId, { implementationStatus: implementation });
            await load();
        } catch (err: any) {
            setFormError(err.message || 'Unable to save implementation');
        }
    };

    const linkExisting = async (event: FormEvent) => {
        event.preventDefault();
        if (!controlId || !evidenceId) return;
        setFormError(null);
        try {
            await sccAPI.linkEvidence({
                storedObjectId: evidenceId,
                targetType: 'CONTROL',
                targetId: controlId,
                relationship,
                rationale,
            });
            setRationale('');
            await load();
        } catch (err: any) {
            setFormError(err.message || 'Unable to link evidence');
        }
    };

    const recordTest = async (event: FormEvent) => {
        event.preventDefault();
        if (!controlId) return;
        setFormError(null);
        try {
            await sccAPI.recordTest(controlId, { method, result, notes, findingId: findingId || undefined });
            setNotes('');
            await load();
        } catch (err: any) {
            setFormError(err.message || 'Unable to record the test');
        }
    };

    const control = detail?.control;
    const linkedFindings = detail?.findings?.length
        ? detail.findings
        : (detail?.tests || [])
            .filter((row) => row.finding)
            .map((row) => ({ ...row.finding!, testId: row.id, testedAt: row.testedAt, result: row.result }));

    const sectionNavButton = (item: (typeof SECTIONS)[number], compact: boolean) => {
        const active = section === item;
        return (
            <Box
                key={item}
                component="button"
                type="button"
                data-testid={compact ? 'control-section-chip' : 'control-section-nav'}
                onClick={() => setSection(item)}
                sx={{
                    textAlign: 'left',
                    px: compact ? 1.25 : 1.25,
                    py: compact ? 0.75 : 1.25,
                    whiteSpace: compact ? 'nowrap' : 'normal',
                    flexShrink: 0,
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
    };

    return (
        <Box sx={{ maxWidth: 1280 }}>
            <PageHeader
                crumbs={[{ label: 'Controls', to: '/control-center' }, { label: control?.controlKey || 'Control' }]}
                title={control ? `${control.controlKey} ${control.title}` : 'Control'}
                description={control?.objective}
                meta={control && (
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <StatusBadge kind="plain" label={control.implementationStatus.replace(/_/g, ' ')} />
                        <StatusBadge kind="plain" label={control.effectivenessStatus.replace(/_/g, ' ')} />
                    </Stack>
                )}
            />
            {detail && <Alert severity="info" sx={{ mb: 2 }}>{detail.honesty}</Alert>}
            {formError && <Alert severity="warning" sx={{ mb: 2 }}>{formError}</Alert>}
            <QueryState loading={loading} error={error} empty={!control} emptyTitle="Control not found" emptyBody="Return to Control Center and choose a control from this organization.">
                <Box
                    sx={{
                        display: { xs: 'flex', lg: 'none' },
                        overflowX: 'auto',
                        gap: 1,
                        pb: 1,
                        mb: 1,
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    {SECTIONS.map((item) => sectionNavButton(item, true))}
                </Box>
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
                    <Box sx={{ display: { xs: 'none', lg: 'block' }, width: 220, flexShrink: 0 }}>
                        <Stack spacing={0.75}>
                            {SECTIONS.map((item) => sectionNavButton(item, false))}
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
                                        <TextField select label="Implementation" value={implementation} onChange={(event) => setImplementation(event.target.value)} sx={{ minWidth: { sm: 220 }, width: { xs: '100%', sm: 'auto' } }}>
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
                                                Linked by {row.linkedBy || (looksLikeId(row.createdBy) ? 'A workspace member' : row.createdBy)} on {row.createdAt.slice(0, 10)}
                                                {row.reviewedByName
                                                    ? ` · reviewed by ${row.reviewedByName}`
                                                    : row.reviewedBy && !looksLikeId(row.reviewedBy)
                                                        ? ` · reviewed by ${row.reviewedBy}`
                                                        : ' · not reviewed'}
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
                                            <TextField select label="Method" value={method} onChange={(event) => setMethod(event.target.value)} sx={{ minWidth: { sm: 180 }, width: { xs: '100%', sm: 'auto' } }}>
                                                <MenuItem value="INQUIRY">Inquiry</MenuItem>
                                                <MenuItem value="OBSERVATION">Observation</MenuItem>
                                                <MenuItem value="INSPECTION">Inspection</MenuItem>
                                                <MenuItem value="REPERFORMANCE">Reperformance</MenuItem>
                                                <MenuItem value="AUTOMATED">Automated</MenuItem>
                                            </TextField>
                                            <TextField select label="Result" value={result} onChange={(event) => setResult(event.target.value)} sx={{ minWidth: { sm: 180 }, width: { xs: '100%', sm: 'auto' } }}>
                                                <MenuItem value="PASS">Pass</MenuItem>
                                                <MenuItem value="FAIL">Fail</MenuItem>
                                                <MenuItem value="PARTIAL">Partial</MenuItem>
                                                <MenuItem value="NOT_TESTED">Not tested</MenuItem>
                                                <MenuItem value="NOT_APPLICABLE">Not applicable</MenuItem>
                                            </TextField>
                                        </Stack>
                                        <TextField label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} multiline minRows={2} />
                                        <TextField select label="Link an existing finding (optional)" value={findingId} onChange={(event) => setFindingId(event.target.value)}>
                                            <MenuItem value="">No finding</MenuItem>
                                            {(detail?.linkableFindings || []).map((row) => (
                                                <MenuItem key={row.id} value={row.id}>{row.title} · {row.status.replace(/_/g, ' ')}</MenuItem>
                                            ))}
                                        </TextField>
                                        <Button type="submit" variant="contained">Record test</Button>
                                    </Stack>
                                </Box>
                                <Stack spacing={1}>
                                    {(detail?.tests || []).map((row) => (
                                        <Box key={row.id} sx={{ p: 1.5, border: `1px solid ${color.line}`, borderRadius: '6px' }}>
                                            <Typography variant="subtitle2">{row.result.replace(/_/g, ' ')} · {row.method}</Typography>
                                            <Typography variant="caption">
                                                {row.testedAt.slice(0, 10)}
                                                {row.testerName ? ` · ${row.testerName}` : ''}
                                                {row.finding ? ` · ${row.finding.title}` : ''}
                                            </Typography>
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
                                {linkedFindings.map((row) => (
                                    <Box key={`${row.testId}-${row.id}`} sx={{ p: 1.5, border: `1px solid ${color.line}`, borderRadius: '6px', mb: 1 }}>
                                        <Typography variant="subtitle2">{row.title}</Typography>
                                        <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                                            {row.status.replace(/_/g, ' ')} · {row.severity.replace(/_/g, ' ')}
                                        </Typography>
                                        <Button size="small" onClick={() => navigate(`/findings?issueId=${row.id}`)}>Open finding</Button>
                                    </Box>
                                ))}
                                {linkedFindings.length === 0 && <Typography variant="body2">No findings are linked to this control’s tests.</Typography>}
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
                                <EntityRelationships sourceModel="OrganizationControl" sourceId={control.id} embedded />
                            </Surface>
                        )}
                        {section === 'History' && (
                            <Surface>
                                <Typography variant="h5" sx={{ mb: 1 }}>History</Typography>
                                <Stack spacing={1}>
                                    {(detail?.history || []).map((row) => (
                                        <Box key={row.id} sx={{ p: 1.5, border: `1px solid ${color.line}`, borderRadius: '6px' }}>
                                            <Typography variant="subtitle2">{row.label || row.action.replace(/[._]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</Typography>
                                            <Typography variant="caption">
                                                {row.actorName ? `${row.actorName} · ` : ''}
                                                {row.createdAt.slice(0, 16).replace('T', ' ')}
                                            </Typography>
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
