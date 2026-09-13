import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import Surface from './design/Surface';
import StatusBadge from './design/StatusBadge';
import { color } from '../design/tokens';
import { tprmAPI } from '../services/api';
import {
    ENGINE_RATING_BANDS,
    mergeScoringWeights,
    scoringWeightsEqual,
    SUPREME_DEFAULT_WEIGHTS,
    validateScoringWeights,
    type FindingSeverity,
    type ScoringWeights,
} from '../lib/scoringWeights';

type HistoryRow = {
    id?: string | null;
    version: string;
    name: string;
    isActive: boolean;
    createdAt?: string | Date;
    notes?: string | null;
    weights?: ScoringWeights;
};

type MethodologyPayload = {
    engineVersion?: string;
    active?: HistoryRow & { weights?: ScoringWeights; organizationId?: string };
    history?: HistoryRow[];
};

type Preview = {
    vendorCount: number;
    unchanged: number;
    residualScoresUnchanged?: boolean;
    honesty?: string;
    changes: Array<{ from: string; to: string; count: number }>;
};

const TIERS: FindingSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

function pretty(value: string) {
    return value.charAt(0) + value.slice(1).toLowerCase();
}

function WeightField({
    label,
    effect,
    explanation,
    value,
    disabled,
    onChange,
}: {
    label: string;
    effect: string;
    explanation: string;
    value: number;
    disabled?: boolean;
    onChange: (next: number) => void;
}) {
    return (
        <Box sx={{ p: 1.5, border: `1px solid ${color.line}`, borderRadius: '6px', flex: 1, minWidth: 220 }}>
            <Typography variant="subtitle2">{label}</Typography>
            <Typography variant="caption" display="block" sx={{ mb: 1 }}>{effect}</Typography>
            <TextField
                type="number"
                label="Current weighting"
                value={Number.isFinite(value) ? value : ''}
                onChange={(event) => onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))}
                inputProps={{ min: 0, max: 10000, step: 'any', 'aria-label': `${label} weighting` }}
                disabled={disabled}
                fullWidth
                helperText={explanation}
            />
        </Box>
    );
}

export default function ScoringMethodologyEditor({
    methodology,
    onPublished,
    canManage = true,
}: {
    methodology: MethodologyPayload | null;
    onPublished: () => Promise<void> | void;
    canManage?: boolean;
}) {
    const published = useMemo(() => mergeScoringWeights(methodology?.active?.weights), [methodology]);
    const [draft, setDraft] = useState(published);
    const [name, setName] = useState(methodology?.active?.name || 'Organization scoring methodology');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [preview, setPreview] = useState<Preview | null>(null);

    useEffect(() => {
        setDraft(published);
        setName(methodology?.active?.name || 'Organization scoring methodology');
    }, [published, methodology?.active?.name]);

    const dirty = !scoringWeightsEqual(draft, published);
    const vsDefault = !scoringWeightsEqual(draft, SUPREME_DEFAULT_WEIGHTS);
    const validation = validateScoringWeights(draft);
    const canPublish = canManage && dirty && !validation && name.trim() && notes.trim();

    const setScalar = (key: keyof ScoringWeights, value: number) => {
        setDraft((current) => ({ ...current, [key]: value }));
    };
    const setMap = (group: 'tierBase' | 'findingPoints', key: FindingSeverity, value: number) => {
        setDraft((current) => ({ ...current, [group]: { ...current[group], [key]: value } }));
    };

    const auditDraft = async (action: 'save' | 'restore_default' | 'load_version' | 'discard', sourceVersion?: string) => {
        if (!canManage) return;
        await tprmAPI.saveScoringMethodologyDraft({ action, sourceVersion, weights: draft });
    };

    const discardDraft = async () => {
        setDraft(published);
        setPreview(null);
        setMessage('Draft discarded. The published methodology is unchanged.');
        try {
            await auditDraft('discard');
        } catch (err: any) {
            setError(err.message || 'Draft discarded locally. Audit could not be recorded.');
        }
    };

    const restoreDefault = async () => {
        setDraft(SUPREME_DEFAULT_WEIGHTS);
        setPreview(null);
        setMessage('Supreme default loaded into the draft only. The published version is unchanged.');
        try {
            await auditDraft('restore_default');
        } catch (err: any) {
            setError(err.message || 'Default restored locally. Audit could not be recorded.');
        }
    };

    const loadVersion = async (row: HistoryRow) => {
        setDraft(mergeScoringWeights(row.weights));
        setName(`${row.name} (draft)`);
        setPreview(null);
        setMessage(`Version ${row.version} loaded as a new draft. The published version is unchanged.`);
        try {
            await tprmAPI.saveScoringMethodologyDraft({ action: 'load_version', sourceVersion: row.version, weights: row.weights });
        } catch (err: any) {
            setError(err.message || 'Version loaded locally. Audit could not be recorded.');
        }
    };

    const saveDraft = async () => {
        const reason = validateScoringWeights(draft);
        if (reason) {
            setError(reason);
            return;
        }
        try {
            await auditDraft('save');
            setMessage('Draft saved. It is not published and does not change historical scores.');
        } catch (err: any) {
            setError(err.message || 'Unable to save draft');
        }
    };

    const runPreview = async () => {
        const reason = validateScoringWeights(draft);
        if (reason) {
            setError(reason);
            return;
        }
        try {
            const response = await tprmAPI.previewScoringMethodology({ weights: draft });
            setPreview(response.data.data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Unable to preview methodology');
        }
    };

    const openConfirm = (event: FormEvent) => {
        event.preventDefault();
        const reason = validateScoringWeights(draft);
        if (reason) {
            setError(reason);
            return;
        }
        if (!name.trim() || !notes.trim()) {
            setError('A version name and rationale are required before publishing.');
            return;
        }
        setConfirmOpen(true);
    };

    const publish = async () => {
        setSaving(true);
        setError(null);
        setMessage(null);
        try {
            await tprmAPI.publishScoringMethodology({
                name: name.trim(),
                notes: notes.trim(),
                weights: draft,
            });
            setNotes('');
            setConfirmOpen(false);
            setPreview(null);
            setMessage('New methodology version published. Future calculations use it. Historical scores are not rewritten.');
            await onPublished();
        } catch (err: any) {
            setError(err.message || 'Unable to publish methodology');
        } finally {
            setSaving(false);
        }
    };

    const history = methodology?.history || [];

    return (
        <Box component="form" onSubmit={openConfirm}>
            <Typography variant="h5">Risk Scoring Methodology</Typography>
            <Typography variant="body2" sx={{ mt: 0.75, mb: 2, maxWidth: 760 }}>
                Set how future vendor recalculations weigh criticality, data, findings, and monitoring.
                Publishing stores an immutable version. Recorded scores keep the methodology they were calculated with.
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
                <StatusBadge kind="plain" tone="info" label={`Engine ${methodology?.engineVersion || 'supreme-risk-1.1.0'}`} />
                <StatusBadge kind="plain" tone="success" label={`Active ${methodology?.active?.version || '1.0.0'}`} />
                {dirty ? <StatusBadge kind="plain" tone="high" label="Unpublished draft" /> : <StatusBadge kind="plain" label="Matches published version" />}
                {vsDefault ? <StatusBadge kind="plain" label="Differs from Supreme default" /> : <StatusBadge kind="plain" label="Matches Supreme default" />}
                {!canManage && <StatusBadge kind="plain" label="Read only" />}
            </Stack>
            <Alert severity="info" sx={{ mb: 2 }}>
                This workspace does not change the scoring engine. Publishing never silently rewrites residual scores already on file.
            </Alert>
            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Stack spacing={2}>
                <Surface>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Risk rating thresholds</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        The Supreme engine assigns residual ratings from the residual score using these bands.
                        Factor weights change the score. They do not overlap or move these bands.
                    </Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                        {ENGINE_RATING_BANDS.map((band) => (
                            <Box key={band.rating} sx={{ p: 1.5, border: `1px solid ${color.line}`, borderRadius: '6px', flex: 1 }}>
                                <Typography variant="subtitle2">{band.rating}</Typography>
                                <Typography variant="body2">{band.min}–{band.max}</Typography>
                            </Box>
                        ))}
                    </Stack>
                </Surface>

                <Surface>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Risk factors</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>Each factor has a customer label, current weighting, and the effect it has on future calculations.</Typography>
                    <Typography variant="caption" display="block" sx={{ mb: 1 }}>Criticality</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
                        {TIERS.map((tier) => (
                            <WeightField
                                key={tier}
                                label={`${pretty(tier)} criticality`}
                                effect="Adds to inherent risk"
                                explanation={`Starting points when the vendor tier is ${pretty(tier)}.`}
                                value={draft.tierBase[tier] ?? 0}
                                disabled={!canManage}
                                onChange={(value) => setMap('tierBase', tier, value)}
                            />
                        ))}
                    </Stack>
                    <Typography variant="caption" display="block" sx={{ mb: 1 }}>Exposure</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
                        <WeightField label="Data sensitivity" effect="Adds to inherent risk" explanation="Points for each sensitive data type on the vendor record." value={draft.dataSensitivityMultiplier} disabled={!canManage} onChange={(value) => setScalar('dataSensitivityMultiplier', value)} />
                        <WeightField label="Regulatory exposure" effect="Adds to inherent risk" explanation="Points for each regulatory obligation on the vendor record." value={draft.regulatoryMultiplier} disabled={!canManage} onChange={(value) => setScalar('regulatoryMultiplier', value)} />
                        <WeightField label="Fourth-party dependency" effect="Adds to inherent risk" explanation="Points added when subcontractors are present." value={draft.fourthPartyPoints} disabled={!canManage} onChange={(value) => setScalar('fourthPartyPoints', value)} />
                    </Stack>
                    <Typography variant="caption" display="block" sx={{ mb: 1 }}>Findings by severity</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
                        {TIERS.map((tier) => (
                            <WeightField
                                key={tier}
                                label={`${pretty(tier)} finding`}
                                effect="Adds to residual risk"
                                explanation={`Points added for each open ${pretty(tier).toLowerCase()} finding.`}
                                value={draft.findingPoints[tier] ?? 0}
                                disabled={!canManage}
                                onChange={(value) => setMap('findingPoints', tier, value)}
                            />
                        ))}
                    </Stack>
                    <Typography variant="caption" display="block" sx={{ mb: 1 }}>Monitoring and compensating controls</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
                        <WeightField label="Monitoring events" effect="Adds to residual risk" explanation="Points for each monitoring event that requires action." value={draft.monitoringEventPoints} disabled={!canManage} onChange={(value) => setScalar('monitoringEventPoints', value)} />
                        <WeightField label="Monitoring cap" effect="Limits monitoring points" explanation="Maximum number of monitoring events counted." value={draft.monitoringEventCap} disabled={!canManage} onChange={(value) => setScalar('monitoringEventCap', value)} />
                        <WeightField label="Compensating controls" effect="Reduces residual through control effectiveness" explanation="Points added to control effectiveness for each compensating control." value={draft.compensatingControlPoints} disabled={!canManage} onChange={(value) => setScalar('compensatingControlPoints', value)} />
                    </Stack>
                </Surface>

                <Surface>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Draft and publication</Typography>
                    <Stack spacing={1.5}>
                        <TextField label="Version name" value={name} onChange={(event) => setName(event.target.value)} disabled={!canManage} required />
                        <TextField
                            label="Rationale / change reason"
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            multiline
                            minRows={2}
                            disabled={!canManage}
                            helperText="Required to publish. Historical calculations are not rewritten."
                        />
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
                            <Button type="button" disabled={!canManage || !dirty || Boolean(validation)} onClick={saveDraft}>Save draft</Button>
                            <Button type="button" disabled={!canManage || !dirty} onClick={discardDraft}>Discard draft</Button>
                            <Button type="button" disabled={!canManage} onClick={restoreDefault}>Restore Supreme default</Button>
                            <Button type="button" disabled={!canManage || Boolean(validation)} onClick={runPreview}>Preview changes</Button>
                            <Button type="submit" variant="contained" disabled={!canPublish || saving}>
                                {saving ? 'Publishing…' : 'Publish new version'}
                            </Button>
                        </Stack>
                        {validation && <Typography variant="caption" color="error">{validation}</Typography>}
                    </Stack>
                    {preview && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            Preview only. Current vendors evaluated: {preview.vendorCount}.
                            {preview.changes.length === 0
                                ? ` ${preview.unchanged} unchanged.`
                                : ` ${preview.changes.map((row) => `${row.count} ${pretty(row.from)} → ${pretty(row.to)}`).join(', ')}; ${preview.unchanged} unchanged.`}
                            {' '}No scores were saved.
                        </Alert>
                    )}
                </Surface>

                {history.length > 0 && (
                    <Surface>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Version history</Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>Published versions stay immutable. Loading one creates a new draft only.</Typography>
                        <Stack spacing={1}>
                            {history.map((row) => (
                                <Box key={row.id || row.version} sx={{ p: 1.5, border: `1px solid ${color.line}`, borderRadius: '6px' }}>
                                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
                                        <Box>
                                            <Typography variant="subtitle2">{row.name} · {row.version}</Typography>
                                            <Typography variant="caption" display="block">
                                                {row.createdAt ? new Date(row.createdAt).toISOString().slice(0, 16).replace('T', ' ') : 'Built-in'}
                                                {row.notes ? ` · ${row.notes}` : ''}
                                            </Typography>
                                        </Box>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            {row.isActive && <StatusBadge kind="plain" tone="success" label="Active" />}
                                            {row.weights && canManage && (
                                                <Button size="small" onClick={() => loadVersion(row)}>Load as new draft</Button>
                                            )}
                                        </Stack>
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                    </Surface>
                )}
            </Stack>

            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>Publish new risk methodology?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                        Future calculations will use this new active version.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                        Historical ScoreCalculation records remain associated with the methodology and version used at calculation time.
                    </Typography>
                    <Typography variant="body2">
                        Historical residual scores are not silently rewritten.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={publish} disabled={saving}>{saving ? 'Publishing…' : 'Publish'}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
