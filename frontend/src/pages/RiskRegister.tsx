import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import Surface from '../components/design/Surface';
import { ermAPI } from '../services/api';
import { downloadBinaryResponse } from '../services/download';
import { humanizeLabel } from '../utils/humanizeLabel';

const CATEGORIES = [
    'STRATEGIC', 'OPERATIONAL', 'FINANCIAL', 'CYBERSECURITY', 'TECHNOLOGY', 'THIRD_PARTY', 'PRIVACY',
    'COMPLIANCE', 'AI', 'BUSINESS_CONTINUITY', 'REPUTATIONAL', 'LEGAL_REGULATORY', 'PEOPLE', 'PHYSICAL_ENVIRONMENTAL',
];

type RiskRow = {
    publicId: string;
    title: string;
    category: string;
    status: string;
    residualRating: string;
    residualScore: number;
    appetiteStatus: string;
    ownerUserId?: string | null;
    ownerName?: string | null;
    reviewDate?: string | null;
};

export default function RiskRegister() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [rows, setRows] = useState<RiskRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState(params.get('category') || '');
    const [open, setOpen] = useState(params.get('new') === '1');
    const [title, setTitle] = useState('');
    const [statement, setStatement] = useState('');
    const [createCategory, setCreateCategory] = useState('CYBERSECURITY');
    const [likelihood, setLikelihood] = useState(3);
    const [impact, setImpact] = useState(3);
    const [importText, setImportText] = useState('title,category,likelihood,impact,statement');
    const [importMessage, setImportMessage] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        ermAPI.list({
            category: category || undefined,
            rating: params.get('rating') || undefined,
            appetite: params.get('appetite') || undefined,
            likelihood: params.get('likelihood') || undefined,
            impact: params.get('impact') || undefined,
            unowned: params.get('unowned') === '1' ? '1' : undefined,
        })
            .then((res) => setRows(res.data.data || []))
            .catch((err) => setError(err.message || 'Unable to load the risk register'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [category, params]);

    const create = async (event: FormEvent) => {
        event.preventDefault();
        try {
            const created = await ermAPI.create({ title, statement, category: createCategory, likelihood, impact });
            navigate(`/risks/${created.data.data.publicId}`);
        } catch (err: any) {
            setError(err.message || 'Unable to record the risk');
        }
    };

    const importRows = async () => {
        const parsed = importText.split('\n').slice(1).map((line) => {
            const [titleValue, categoryValue, likelihoodValue, impactValue, statementValue] = line.split(',');
            return { title: titleValue, category: categoryValue, likelihood: likelihoodValue, impact: impactValue, statement: statementValue };
        }).filter((row) => row.title);
        const preview = await ermAPI.previewImport(parsed);
        if (!preview.data.data.canCommit) {
            setImportMessage(preview.data.data.errors.map((item: { row: number; message: string }) => `Row ${item.row}: ${item.message}`).join(' '));
            return;
        }
        await ermAPI.commitImport(parsed);
        setImportMessage(`Imported ${parsed.length} risk${parsed.length === 1 ? '' : 's'}.`);
        load();
    };

    return (
        <Box sx={{ maxWidth: 1280 }}>
            <PageHeader
                title="Risk register"
                description="Customer-readable IDs, explainable scores, and appetite status from live records."
                actions={(
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button variant="outlined" onClick={async () => downloadBinaryResponse(await ermAPI.exportRegister('csv'), 'Supreme-Governance-Register.csv')}>Export CSV</Button>
                        <Button variant="outlined" onClick={async () => downloadBinaryResponse(await ermAPI.exportRegister('xlsx'), 'Supreme-Governance-Register.xlsx')}>Export XLSX</Button>
                        <Button variant="contained" onClick={() => setOpen(true)}>Record a risk</Button>
                    </Stack>
                )}
            />
            {(params.get('likelihood') || params.get('rating') || params.get('appetite') || params.get('unowned')) && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Showing a filtered slice
                    {params.get('likelihood') ? ` · likelihood ${params.get('likelihood')} / impact ${params.get('impact')}` : ''}
                    {params.get('rating') ? ` · residual ${humanizeLabel(params.get('rating') || '')}` : ''}
                    {params.get('appetite') ? ` · ${humanizeLabel(params.get('appetite') || '')}` : ''}
                    {params.get('unowned') ? ' · Unassigned' : ''}
                    .
                </Alert>
            )}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {importMessage && <Alert severity="info" sx={{ mb: 2 }}>{importMessage}</Alert>}
            <TextField select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ mb: 2, minWidth: 240 }}>
                <MenuItem value="">All canonical categories</MenuItem>
                {CATEGORIES.map((item) => <MenuItem key={item} value={item}>{humanizeLabel(item)}</MenuItem>)}
            </TextField>
            {open && (
                <Surface>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Record a risk</Typography>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>Suggested statement: Because of [cause], there is a risk that [event], resulting in [impact]. Use another wording when that structure is not honest.</Typography>
                    <Box component="form" onSubmit={create}>
                        <Stack spacing={1.5}>
                            <TextField required label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                            <TextField label="Risk statement" value={statement} onChange={(e) => setStatement(e.target.value)} multiline minRows={2} />
                            <TextField select label="Category" value={createCategory} onChange={(e) => setCreateCategory(e.target.value)}>
                                {CATEGORIES.map((item) => <MenuItem key={item} value={item}>{humanizeLabel(item)}</MenuItem>)}
                            </TextField>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                <TextField type="number" label="Likelihood (1–5)" value={likelihood} onChange={(e) => setLikelihood(Number(e.target.value))} inputProps={{ min: 1, max: 5 }} />
                                <TextField type="number" label="Impact (1–5)" value={impact} onChange={(e) => setImpact(Number(e.target.value))} inputProps={{ min: 1, max: 5 }} />
                            </Stack>
                            <Stack direction="row" spacing={1}>
                                <Button type="submit" variant="contained">Save</Button>
                                <Button onClick={() => setOpen(false)}>Cancel</Button>
                            </Stack>
                        </Stack>
                    </Box>
                </Surface>
            )}
            {loading ? <QueryState loading><span /></QueryState> : (
                <AppTable
                    rows={rows}
                    rowKey={(row) => row.publicId}
                    onRowClick={(row) => navigate(`/risks/${row.publicId}`)}
                    searchPlaceholder="Filter risks"
                    searchValue={(row) => `${row.publicId} ${row.title} ${row.category}`}
                    emptyTitle="No enterprise risks"
                    emptyBody="Record a risk or import a validated CSV. Marketing preview pages are not this register."
                    columns={[
                        { id: 'publicId', label: 'Risk ID', sortValue: (row) => row.publicId, render: (row) => row.publicId },
                        { id: 'title', label: 'Title', sortValue: (row) => row.title, render: (row) => row.title },
                        { id: 'category', label: 'Category', hideOnMobile: true, render: (row) => humanizeLabel(row.category) },
                        { id: 'rating', label: 'Residual', render: (row) => <StatusBadge kind="plain" tone={row.residualRating === 'CRITICAL' ? 'critical' : row.residualRating === 'HIGH' ? 'high' : 'medium'} label={humanizeLabel(row.residualRating)} /> },
                        { id: 'appetite', label: 'Appetite', hideOnMobile: true, render: (row) => humanizeLabel(row.appetiteStatus) },
                        { id: 'owner', label: 'Owner', hideOnMobile: true, render: (row) => row.ownerName && row.ownerName !== 'Unassigned' ? row.ownerName : <StatusBadge kind="plain" tone="high" label="Unassigned" /> },
                        { id: 'status', label: 'Status', hideOnMobile: true, render: (row) => humanizeLabel(row.status) },
                    ]}
                />
            )}
            <Surface>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Import preview</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>CSV columns: title, category, likelihood, impact, statement. Formula cells are neutralized. Nothing is written until preview is clean.</Typography>
                <TextField value={importText} onChange={(e) => setImportText(e.target.value)} multiline minRows={4} fullWidth />
                <Button sx={{ mt: 1 }} onClick={importRows}>Validate and import</Button>
            </Surface>
        </Box>
    );
}
