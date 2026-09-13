import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import MetricCard from '../components/design/MetricCard';
import StatusBadge from '../components/design/StatusBadge';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import { color } from '../design/tokens';
import { ermAPI } from '../services/api';
import { downloadBinaryResponse } from '../services/download';
import { humanizeLabel } from '../utils/humanizeLabel';

const LIKELIHOOD_LABELS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain'];
const IMPACT_LABELS = ['Negligible', 'Minor', 'Moderate', 'Major', 'Severe'];

type AppetiteRow = {
    id: string;
    scope: string;
    maxResidualRating: string;
    category?: string | null;
    statement?: string | null;
    businessUnit?: { name: string } | null;
};

type Dashboard = {
    honesty: string;
    totals: {
        active: number;
        critical: number;
        high: number;
        outsideAppetite: number;
        overdueReviews: number;
        overdueTreatments: number;
        worsening: number;
        improving: number;
        withoutOwners: number;
        withoutTestedControls: number;
    };
    heatmap: Array<Array<{ likelihood: number; impact: number; count: number }>>;
    byCategory: Array<{ category: string; count: number; critical: number }>;
    byBusinessUnit: Array<{ name: string; count: number; critical: number }>;
    appetite: AppetiteRow[];
    topRisks: Array<{ publicId: string; title: string; residualRating: string; appetiteStatus: string }>;
    attention: Array<{ publicId: string; title: string; residualRating: string; appetiteStatus: string }>;
};

function ratingTone(rating: string): 'critical' | 'high' | 'medium' | 'success' | 'neutral' {
    if (rating === 'CRITICAL') return 'critical';
    if (rating === 'HIGH') return 'high';
    if (rating === 'MEDIUM') return 'medium';
    if (rating === 'LOW') return 'success';
    return 'neutral';
}

function heatStyle(likelihood: number, impact: number) {
    const score = likelihood * impact;
    if (score >= 20) return { bgcolor: 'rgba(180, 35, 24, 0.16)', borderColor: color.critical, color: color.critical };
    if (score >= 13) return { bgcolor: 'rgba(181, 71, 8, 0.14)', borderColor: color.high, color: color.high };
    if (score >= 7) return { bgcolor: 'rgba(92, 107, 122, 0.12)', borderColor: color.medium, color: color.ink };
    return { bgcolor: 'rgba(59, 109, 74, 0.12)', borderColor: color.low, color: color.low };
}

export default function RiskDashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState<Dashboard | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [cell, setCell] = useState<{ likelihood: number; impact: number } | null>(null);
    const [maxRating, setMaxRating] = useState('MEDIUM');
    const [statement, setStatement] = useState('');
    const [appetiteMessage, setAppetiteMessage] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        ermAPI.dashboard()
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load Supreme Risk'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    if (loading || error || !data) {
        return <QueryState loading={loading} error={error} empty={!data} emptyTitle="No risk dashboard" emptyBody="Supreme Risk will show live tenant counts when risks exist."><span /></QueryState>;
    }

    const saveAppetite = async (event: FormEvent) => {
        event.preventDefault();
        try {
            await ermAPI.setAppetite({ scope: 'ORGANIZATION', maxResidualRating: maxRating, statement });
            setAppetiteMessage('Organization appetite saved. Existing scores were reassessed. Acceptance still does not lower residual risk.');
            load();
        } catch (err: any) {
            setError(err.message || 'Unable to save appetite');
        }
    };

    return (
        <Box sx={{ maxWidth: 1280, overflowX: 'hidden' }}>
            <PageHeader
                title="Supreme Risk"
                description="Know what matters. See what it affects. Act on what needs attention."
                actions={(
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button variant="outlined" onClick={() => navigate('/risks/register')}>Risk register</Button>
                        <Button variant="contained" onClick={() => navigate('/risks/register?new=1')}>Record a risk</Button>
                    </Stack>
                )}
            />
            <Alert severity="info" sx={{ mb: 2 }}>{data.honesty}</Alert>
            {appetiteMessage && <Alert severity="success" sx={{ mb: 2 }}>{appetiteMessage}</Alert>}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 1.5, mb: 3 }}>
                <MetricCard label="Active risks" value={data.totals.active} onClick={() => navigate('/risks/register')} />
                <MetricCard label="Critical" value={data.totals.critical} onClick={() => navigate('/risks/register?rating=CRITICAL')} />
                <MetricCard label="High" value={data.totals.high} onClick={() => navigate('/risks/register?rating=HIGH')} />
                <MetricCard label="Outside appetite" value={data.totals.outsideAppetite} onClick={() => navigate('/risks/register?appetite=OUTSIDE_APPETITE')} />
                <MetricCard label="Overdue reviews" value={data.totals.overdueReviews} />
                <MetricCard label="Overdue treatments" value={data.totals.overdueTreatments} />
                <MetricCard label="Worsening" value={data.totals.worsening} />
                <MetricCard label="Improving" value={data.totals.improving} />
                <MetricCard label="Without owners" value={data.totals.withoutOwners} />
                <MetricCard label="No tested controls" value={data.totals.withoutTestedControls} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.3fr 1fr' }, gap: 2, mb: 3 }}>
                <Surface>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Likelihood × impact</Typography>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>Inherent position on the 5×5 matrix. Each cell is a live count. Click a cell to open that slice of the register.</Typography>
                    <Box sx={{ overflowX: 'auto' }}>
                        <Box sx={{ minWidth: 420, display: 'grid', gridTemplateColumns: '88px repeat(5, minmax(52px, 1fr))', gap: 0.75, alignItems: 'stretch' }}>
                            <Box />
                            {LIKELIHOOD_LABELS.map((label) => (
                                <Typography key={label} variant="caption" sx={{ textAlign: 'center', color: 'text.secondary' }}>{label}</Typography>
                            ))}
                            {[5, 4, 3, 2, 1].map((impact) => (
                                <Box key={impact} sx={{ display: 'contents' }}>
                                    <Typography variant="caption" sx={{ alignSelf: 'center', color: 'text.secondary' }}>{IMPACT_LABELS[impact - 1]}</Typography>
                                    {[1, 2, 3, 4, 5].map((likelihood) => {
                                        const item = data.heatmap[impact - 1][likelihood - 1];
                                        const selected = cell?.likelihood === likelihood && cell?.impact === impact;
                                        return (
                                            <Button
                                                key={`${likelihood}-${impact}`}
                                                size="small"
                                                onClick={() => {
                                                    setCell(item);
                                                    navigate(`/risks/register?likelihood=${likelihood}&impact=${impact}`);
                                                }}
                                                sx={{
                                                    minHeight: 52,
                                                    border: '1px solid',
                                                    ...heatStyle(likelihood, impact),
                                                    fontWeight: 700,
                                                    outline: selected ? `2px solid ${color.navy800}` : 'none',
                                                }}
                                            >
                                                {item.count}
                                            </Button>
                                        );
                                    })}
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Surface>
                <Surface>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Needs attention</Typography>
                    {data.attention.length === 0 ? (
                        <Typography variant="body2">Nothing is overdue, unowned, or outside appetite.</Typography>
                    ) : data.attention.map((row) => (
                        <Box key={row.publicId} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.75, cursor: 'pointer' }} onClick={() => navigate(`/risks/${row.publicId}`)}>
                            <Typography variant="body2">{row.publicId} · {row.title}</Typography>
                            <StatusBadge kind="plain" tone={ratingTone(row.residualRating)} label={humanizeLabel(row.residualRating)} />
                        </Box>
                    ))}
                </Surface>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
                <Surface>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Category exposure</Typography>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>Counts only. These are not added into an enterprise score.</Typography>
                    {data.byCategory.filter((row) => row.count).length === 0 ? (
                        <Typography variant="body2">No category exposure until risks are recorded.</Typography>
                    ) : data.byCategory.filter((row) => row.count).map((row) => (
                        <Box key={row.category} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                            <Typography variant="body2">{humanizeLabel(row.category)}</Typography>
                            <Typography variant="body2">{row.count}{row.critical ? ` · ${row.critical} critical` : ''}</Typography>
                        </Box>
                    ))}
                </Surface>
                <Surface>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Business-unit exposure</Typography>
                    {data.byBusinessUnit.every((row) => row.name === 'Unassigned') ? (
                        <Typography variant="body2">No business units assigned. Unassigned risks are shown only as a count, not as invented structure.</Typography>
                    ) : data.byBusinessUnit.map((row) => (
                        <Box key={row.name} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                            <Typography variant="body2">{row.name}</Typography>
                            <Typography variant="body2">{row.count}{row.critical ? ` · ${row.critical} critical` : ''}</Typography>
                        </Box>
                    ))}
                </Surface>
            </Box>
            <Box sx={{ mb: 3 }}>
            <Surface>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Risk appetite</Typography>
                {data.appetite.length === 0 ? (
                    <Typography variant="body2" sx={{ mb: 1.5 }}>Appetite is not configured. Risks stay Not configured until a statement is saved. Configuration is not invented.</Typography>
                ) : data.appetite.map((row) => (
                    <Typography key={row.id} variant="body2" sx={{ mb: 0.5 }}>
                        {humanizeLabel(row.scope)}
                        {row.category ? ` · ${humanizeLabel(row.category)}` : ''}
                        {row.businessUnit ? ` · ${row.businessUnit.name}` : ''}
                        {' · maximum residual '}
                        {humanizeLabel(row.maxResidualRating)}
                    </Typography>
                ))}
                <Box component="form" onSubmit={saveAppetite}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
                        <TextField select label="Organization maximum residual" value={maxRating} onChange={(e) => setMaxRating(e.target.value)} sx={{ minWidth: 220 }}>
                            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((item) => <MenuItem key={item} value={item}>{humanizeLabel(item)}</MenuItem>)}
                        </TextField>
                        <TextField label="Appetite statement" value={statement} onChange={(e) => setStatement(e.target.value)} fullWidth />
                        <Button type="submit" variant="contained">Save appetite</Button>
                    </Stack>
                </Box>
            </Surface>
            </Box>
            <Surface>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 1 }} spacing={1}>
                    <Typography variant="subtitle2">Top residual risks</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button size="small" onClick={async () => downloadBinaryResponse(await ermAPI.downloadReport('profile'), 'Supreme-Risk-Profile.pdf')}>Profile PDF</Button>
                        <Button size="small" onClick={async () => downloadBinaryResponse(await ermAPI.downloadReport('top-risks'), 'Supreme-Risk-Top-Risks.pdf')}>Top risks PDF</Button>
                        <Button size="small" onClick={async () => downloadBinaryResponse(await ermAPI.downloadReport('appetite'), 'Supreme-Risk-Appetite.pdf')}>Appetite PDF</Button>
                        <Button size="small" onClick={async () => downloadBinaryResponse(await ermAPI.downloadReport('treatment'), 'Supreme-Risk-Treatment.pdf')}>Treatment PDF</Button>
                        <Button size="small" onClick={async () => downloadBinaryResponse(await ermAPI.downloadReport('board'), 'Supreme-Risk-Board.pdf')}>Board PDF</Button>
                    </Stack>
                </Stack>
                {data.topRisks.length === 0 ? (
                    <Typography variant="body2">No enterprise risks recorded.</Typography>
                ) : data.topRisks.map((row) => (
                    <Box key={row.publicId} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.75, cursor: 'pointer' }} onClick={() => navigate(`/risks/${row.publicId}`)}>
                        <Typography variant="body2">{row.publicId} · {row.title}</Typography>
                        <StatusBadge kind="plain" tone={ratingTone(row.residualRating)} label={humanizeLabel(row.residualRating)} />
                    </Box>
                ))}
            </Surface>
        </Box>
    );
}
