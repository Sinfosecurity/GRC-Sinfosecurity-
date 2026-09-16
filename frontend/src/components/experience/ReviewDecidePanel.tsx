import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import Surface from '../design/Surface';
import { color } from '../../design/tokens';
import { decisionReadiness, groupReviewItems, reviewPrimaryAction, type ReviewItem, type ReviewKind, type ReviewUnit } from '../../experience/reviewUnits';
import { formatShortDate, humanizeLabel } from '../../utils/humanizeLabel';

type Filter = 'material' | 'clarification' | 'evidence' | 'findings';

type RelatedFinding = {
    id: string;
    title?: string;
    severity?: string;
    status?: string;
    dueDate?: string | null;
    cap?: string | null;
    owner?: string | null;
    acceptanceRationale?: string | null;
    acceptanceAuthority?: string | null;
    acceptanceExpiresAt?: string | null;
};

export default function ReviewDecidePanel({
    review,
    stage,
    assessments,
    findings = [],
    residual,
    owner,
    riskContext,
    canReview,
    onReviewFinding,
    saving,
}: {
    review?: {
        questionsAnswered?: number;
        totalResponses?: number;
        satisfactory?: number;
        needClarification?: number;
        potentialFindings?: number;
        items?: ReviewItem[];
        controlGap?: { percent?: number; band?: string };
    };
    stage?: string;
    assessments?: Array<{ id: string; name: string; status: string; answered: number; total: number }>;
    findings?: RelatedFinding[];
    residual?: string | number | null;
    owner?: string;
    riskContext?: string;
    canReview?: boolean;
    onReviewFinding: (findingId: string, action: 'confirm' | 'adjust' | 'dismiss') => void;
    saving?: boolean;
}) {
    const bundle = useMemo(
        () => groupReviewItems(review?.items || [], review || {}),
        [review],
    );
    const readiness = decisionReadiness(stage, bundle);
    const primary = reviewPrimaryAction(bundle, stage);
    const packs = useMemo(() => [...new Set([...bundle.material, ...bundle.clarifications, ...bundle.evidence, ...bundle.other].map((unit) => unit.pack))], [bundle]);
    const [filter, setFilter] = useState<Filter>(bundle.material.length ? 'material' : bundle.clarifications.length ? 'clarification' : 'evidence');
    const [pack, setPack] = useState('');
    const [openId, setOpenId] = useState<string | null>(null);
    const [showFull, setShowFull] = useState(false);
    const [showSatisfactory, setShowSatisfactory] = useState(false);

    const units = (
        filter === 'material' ? bundle.material
            : filter === 'clarification' ? bundle.clarifications
                : filter === 'evidence' ? bundle.evidence
                    : [...bundle.material, ...bundle.clarifications, ...bundle.evidence, ...bundle.other].filter((unit) => unit.findingId)
    ).filter((unit) => !pack || unit.pack === pack);

    const accepted = findings.filter((row) => String(row.status || '').toUpperCase() === 'RISK_ACCEPTED');
    const remediating = findings.filter((row) => ['OPEN', 'IN_PROGRESS', 'PENDING_VALIDATION', 'REMEDIATED'].includes(String(row.status || '').toUpperCase()));

    return (
        <Stack spacing={2}>
            <Surface>
                <Typography variant="overline" component="p">Assessment review</Typography>
                <Typography variant="h4" component="h2">{primary.label}</Typography>
                <Typography variant="body2" sx={{ mt: 0.75 }}>
                    {bundle.totalResponses} responses · {bundle.satisfactory} satisfactory · {bundle.needClarification} require clarification · {bundle.material.length} material issue{bundle.material.length === 1 ? '' : 's'} · {bundle.evidence.length} evidence issue{bundle.evidence.length === 1 ? '' : 's'}
                    {review?.controlGap?.percent != null ? ` · Control-gap ${review.controlGap.percent}% (${review.controlGap.band}). This is not residual risk.` : ''}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>Decision readiness: {readiness}. {primary.detail}</Typography>
                {riskContext && <Typography variant="body2" sx={{ mt: 0.5 }}>{riskContext}</Typography>}
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                    <FilterButton current={filter} value="material" label={`Material issues ${bundle.material.length}`} onClick={setFilter} />
                    <FilterButton current={filter} value="clarification" label={`Clarifications ${bundle.clarifications.length}`} onClick={setFilter} />
                    <FilterButton current={filter} value="evidence" label={`Evidence issues ${bundle.evidence.length}`} onClick={setFilter} />
                    <FilterButton current={filter} value="findings" label={`Findings ${findings.length}`} onClick={setFilter} />
                    <Button onClick={() => setShowFull((value) => !value)}>{showFull ? 'Hide full assessment' : 'View full assessment'}</Button>
                    <Button onClick={() => setShowSatisfactory((value) => !value)}>{`View ${bundle.satisfactory} satisfactory responses`}</Button>
                </Stack>
                {packs.length > 1 && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                        <Button variant={!pack ? 'contained' : 'outlined'} aria-pressed={!pack} onClick={() => setPack('')}>All packs</Button>
                        {packs.map((name) => (
                            <Button key={name} variant={pack === name ? 'contained' : 'outlined'} aria-pressed={pack === name} onClick={() => setPack(name)}>{name}</Button>
                        ))}
                    </Stack>
                )}
            </Surface>
            {showSatisfactory && (
                <Typography variant="body2">{bundle.satisfactory} satisfactory responses are recorded. They stay in the full assessment and are not equal review units.</Typography>
            )}
            {showFull && (
                <Stack spacing={1.25} component="section" aria-label="Full assessment">
                    <Typography variant="h6" component="h3">Full assessment</Typography>
                    {(assessments || []).map((item) => (
                        <Surface key={`full-${item.id}`}>
                            <Typography variant="subtitle1">{item.name}</Typography>
                            <Typography variant="body2">{item.status} · {item.answered} / {item.total} answered</Typography>
                        </Surface>
                    ))}
                    {!(assessments || []).length && <Typography variant="body2">Assessment packs will appear here after they are sent.</Typography>}
                </Stack>
            )}
            <Typography variant="h6" component="h3">{filterHeading(filter)}</Typography>
            {!units.length && <Typography>No exceptions in this queue. The full assessment remains available.</Typography>}
            {units.map((unit) => (
                <ReviewUnitCard
                    key={unit.id}
                    unit={unit}
                    finding={findings.find((row) => row.id === unit.findingId)}
                    residual={residual}
                    owner={owner}
                    riskContext={riskContext}
                    open={openId === unit.id}
                    onToggle={() => setOpenId((current) => current === unit.id ? null : unit.id)}
                    canReview={canReview}
                    saving={saving}
                    onReviewFinding={onReviewFinding}
                />
            ))}
            {remediating.length > 0 && (
                <Surface>
                    <Typography variant="h6" component="h3">Remediation in progress</Typography>
                    {remediating.map((finding) => (
                        <Typography key={finding.id} variant="body2" sx={{ mt: 0.75 }}>
                            {finding.title} · {humanizeLabel(finding.severity)} · {humanizeLabel(finding.status)}
                            {finding.owner || owner ? ` · Owner ${finding.owner || owner}` : ''}
                            {finding.dueDate ? ` · Target ${formatShortDate(finding.dueDate)}` : ''}
                            {finding.cap ? ` · Vendor action: ${finding.cap}` : ' · Vendor action needed'}
                            {' · Evidence needed to close'}
                        </Typography>
                    ))}
                </Surface>
            )}
            {accepted.length > 0 && (
                <Surface>
                    <Typography variant="h6" component="h3">Risk acceptance recorded</Typography>
                    <Typography variant="body2">Residual risk remains {residual != null && residual !== '' ? residual : 'recorded'}. Acceptance is internal and does not reduce that score.</Typography>
                    {accepted.map((finding) => (
                        <Typography key={finding.id} variant="body2" sx={{ mt: 0.75 }}>
                            {finding.title} · {finding.acceptanceRationale || 'Rationale recorded'}
                            {finding.acceptanceAuthority ? ` · Authority ${finding.acceptanceAuthority}` : ''}
                            {finding.acceptanceExpiresAt ? ` · Review ${formatShortDate(finding.acceptanceExpiresAt)}` : ''}
                        </Typography>
                    ))}
                </Surface>
            )}
        </Stack>
    );
}

function FilterButton({ current, value, label, onClick }: { current: Filter; value: Filter; label: string; onClick: (value: Filter) => void }) {
    return (
        <Button
            variant={current === value ? 'contained' : 'outlined'}
            aria-pressed={current === value}
            onClick={() => onClick(value)}
        >
            {label}
        </Button>
    );
}

function ReviewUnitCard({
    unit,
    finding,
    residual,
    owner,
    riskContext,
    open,
    onToggle,
    canReview,
    saving,
    onReviewFinding,
}: {
    unit: ReviewUnit;
    finding?: RelatedFinding;
    residual?: string | number | null;
    owner?: string;
    riskContext?: string;
    open: boolean;
    onToggle: () => void;
    canReview?: boolean;
    saving?: boolean;
    onReviewFinding: (findingId: string, action: 'confirm' | 'adjust' | 'dismiss') => void;
}) {
    return (
        <Surface>
            <Typography variant="body2">{kindLabel(unit.kind)} · {unit.pack}</Typography>
            <Typography variant="h6" component="h4" sx={{ mt: 0.25 }}>{unit.title}</Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>{unit.why}</Typography>
            {riskContext && <Typography variant="body2" sx={{ mt: 0.35 }}>Risk context: {riskContext}</Typography>}
            <Typography variant="body2" sx={{ mt: 0.5 }}>
                {unit.related} related response{unit.related === 1 ? '' : 's'}
                {unit.evidenceCount ? ` · ${unit.evidenceCount} evidence issue${unit.evidenceCount === 1 ? '' : 's'}` : ''}
                {finding ? ` · Finding ${humanizeLabel(finding.status || unit.reviewState || 'recorded')}` : unit.findingId ? ` · Finding ${humanizeLabel(unit.reviewState || 'recorded')}` : ' · No finding yet'}
            </Typography>
            {finding && (
                <Typography variant="body2" sx={{ mt: 0.35 }}>
                    {humanizeLabel(finding.severity)} · owner {finding.owner || owner || 'Unassigned'}
                    {finding.dueDate ? ` · target ${formatShortDate(finding.dueDate)}` : ''}
                    {finding.cap ? ` · ${finding.cap}` : ''}
                    {residual != null && residual !== '' ? ` · Residual remains ${residual}` : ''}
                </Typography>
            )}
            <Typography variant="body2" sx={{ mt: 0.5 }}>Recommended next step: {unit.action}. This uses the recorded review state only.</Typography>
            <Button
                variant="contained"
                sx={{ mt: 1.25 }}
                aria-expanded={open}
                aria-controls={`review-unit-${cssId(unit.id)}`}
                onClick={onToggle}
            >
                {open ? 'Hide related responses' : unit.action}
            </Button>
            {open && (
                <Stack id={`review-unit-${cssId(unit.id)}`} spacing={1.25} sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${color.line}` }}>
                    {unit.items.map((item) => (
                        <Stack key={`${item.assessmentId}-${item.questionId}`}>
                            <Typography sx={{ fontWeight: 650 }}>{item.question}</Typography>
                            <Typography variant="body2">Answer: {item.response}</Typography>
                            <Typography variant="body2">Why: {item.reason}{item.score != null ? ` · Score ${item.score}` : ''}</Typography>
                            {item.findingId && <Typography variant="body2">Existing finding: {humanizeLabel(item.reviewState || 'recorded')}</Typography>}
                            {item.findingId && canReview && item.reviewState === 'DRAFT' && (
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 0.75 }}>
                                    <Button disabled={saving} onClick={() => onReviewFinding(item.findingId!, 'confirm')}>Confirm finding</Button>
                                    <Button disabled={saving} onClick={() => onReviewFinding(item.findingId!, 'adjust')}>Adjust to High</Button>
                                    <Button disabled={saving} onClick={() => onReviewFinding(item.findingId!, 'dismiss')}>Dismiss</Button>
                                </Stack>
                            )}
                        </Stack>
                    ))}
                </Stack>
            )}
        </Surface>
    );
}

function kindLabel(kind: ReviewKind) {
    if (kind === 'material') return 'Material issue';
    if (kind === 'clarification') return 'Clarification';
    if (kind === 'evidence') return 'Evidence issue';
    return 'Other exception';
}

function filterHeading(filter: Filter) {
    if (filter === 'material') return 'Material issues';
    if (filter === 'clarification') return 'Clarification queue';
    if (filter === 'evidence') return 'Evidence issues';
    return 'Findings already recorded';
}

function cssId(value: string) {
    return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}
