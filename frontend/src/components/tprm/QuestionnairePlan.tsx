import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import Surface from '../design/Surface';
import StatusBadge from '../design/StatusBadge';

export type QuestionnairePackRow = {
    key: string;
    name: string;
    questionCount?: number | null;
    state: 'INCLUDED_REQUIRED' | 'INCLUDED' | 'EXCLUDED' | 'CONFIRM_SCOPE';
    scopeAnswer?: 'YES' | 'NO' | 'UNKNOWN' | null;
    originalScopeAnswer?: 'YES' | 'NO' | 'UNKNOWN' | null;
    reason?: string;
    overridable?: boolean;
};

export type QuestionnairePlanData = {
    catalogVersion?: string;
    recommendedTier?: string;
    explanation?: string;
    packs?: QuestionnairePackRow[];
    includedQuestionCount?: number | null;
    confirmScopeCount?: number;
    sendBlocked?: boolean;
    sendBlockMessage?: string;
};

function stateTone(state: QuestionnairePackRow['state']): 'success' | 'high' | 'neutral' {
    if (state === 'INCLUDED_REQUIRED' || state === 'INCLUDED') return 'success';
    if (state === 'EXCLUDED') return 'neutral';
    return 'high';
}

function stateLabel(state: QuestionnairePackRow['state']) {
    if (state === 'INCLUDED_REQUIRED') return 'Included — required';
    if (state === 'INCLUDED') return 'Included';
    if (state === 'EXCLUDED') return 'Excluded';
    return 'Confirm scope';
}

function questionCountLabel(count?: number | null) {
    if (count == null || Number.isNaN(Number(count))) return 'Question count not calculated';
    return `${count} question${count === 1 ? '' : 's'}`;
}

export default function QuestionnairePlan({
    plan,
    recommendedTier,
    explanation,
    onInclude,
    onExclude,
    readOnly,
}: {
    plan?: QuestionnairePlanData | null;
    recommendedTier?: string;
    explanation?: string;
    onInclude?: (pack: QuestionnairePackRow) => void;
    onExclude?: (pack: QuestionnairePackRow) => void;
    readOnly?: boolean;
}) {
    const packs = plan?.packs || [];
    const included = packs.filter((row) => row.state === 'INCLUDED' || row.state === 'INCLUDED_REQUIRED');
    const total = plan?.includedQuestionCount;
    const confirmCount = plan?.confirmScopeCount ?? packs.filter((row) => row.state === 'CONFIRM_SCOPE').length;

    return (
        <Stack spacing={1.5}>
            <Surface>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary' }}>Questionnaire plan</Typography>
                <Typography variant="h5" sx={{ fontFamily: '"Newsreader", serif', mt: 0.5 }}>
                    {recommendedTier || plan?.recommendedTier || 'Tier not calculated'}
                </Typography>
                <Typography sx={{ mt: 1 }}>
                    Supreme prepared this questionnaire from the third party&apos;s intake and inherent-risk assessment. Review the recommended scope before sending it.
                </Typography>
                <Typography sx={{ mt: 1 }}>{explanation || plan?.explanation || 'Complete intake to see why this tier was recommended.'}</Typography>
            </Surface>

            {confirmCount > 0 && (
                <Alert severity="warning" role="alert">
                    {plan?.sendBlockMessage || (confirmCount === 1
                        ? '1 pack requires scope confirmation before this questionnaire can be sent.'
                        : `${confirmCount} packs require scope confirmation before this questionnaire can be sent.`)}
                </Alert>
            )}

            <Surface>
                <Typography variant="subtitle1">Questionnaire to vendor</Typography>
                <Typography variant="h6" sx={{ mt: 0.5 }}>
                    {total == null ? 'Question total not calculated' : `${total} questions`}
                </Typography>
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {included.map((pack) => (
                        <Typography key={pack.key} variant="body2">
                            {pack.name} {questionCountLabel(pack.questionCount)}
                        </Typography>
                    ))}
                    {included.length > 1 && total != null && (
                        <Typography variant="body2">Total {total}</Typography>
                    )}
                </Stack>
            </Surface>

            {packs.map((pack) => (
                <Surface key={pack.key}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'flex-start' }}>
                        <Box>
                            <Typography variant="subtitle1">{pack.name}</Typography>
                            <Typography variant="body2">{pack.reason || 'Reason not recorded'}</Typography>
                            <Typography variant="body2">{questionCountLabel(pack.questionCount)}</Typography>
                            {pack.originalScopeAnswer && pack.originalScopeAnswer !== pack.scopeAnswer && (
                                <Typography variant="body2">Original internal scope answer: {pack.originalScopeAnswer}</Typography>
                            )}
                        </Box>
                        <StatusBadge value={stateLabel(pack.state)} kind="plain" tone={stateTone(pack.state)} />
                    </Stack>
                    {!readOnly && pack.overridable && pack.state !== 'INCLUDED_REQUIRED' && (
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            {pack.state !== 'INCLUDED' && (
                                <Button size="small" onClick={() => onInclude?.(pack)}>Include</Button>
                            )}
                            {pack.state !== 'EXCLUDED' && (
                                <Button size="small" onClick={() => onExclude?.(pack)}>Exclude</Button>
                            )}
                        </Stack>
                    )}
                </Surface>
            ))}
        </Stack>
    );
}
