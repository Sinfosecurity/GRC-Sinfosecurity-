import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import MetricCard from '../components/design/MetricCard';
import StatusBadge from '../components/design/StatusBadge';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { sccAPI } from '../services/api';

type ControlRow = {
    id: string;
    controlKey: string;
    title: string;
    domain: string;
    implementationStatus: string;
    effectivenessStatus: string;
    evidenceCount: number;
    usableEvidenceCount: number;
    testedCount: number;
    openFindings: number;
    needsReview: boolean;
};

type Summary = {
    controlCount: number;
    implemented: number;
    tested: number;
    ineffective: number;
    needsReview: number;
    withFindings: number;
    honesty: string;
};

function implTone(status: string): 'success' | 'medium' | 'neutral' {
    if (status === 'IMPLEMENTED') return 'success';
    if (status === 'PLANNED') return 'medium';
    return 'neutral';
}

function effectTone(status: string): 'success' | 'high' | 'medium' | 'neutral' {
    if (status === 'EFFECTIVE') return 'success';
    if (status === 'INEFFECTIVE') return 'high';
    if (status === 'PARTIALLY_EFFECTIVE') return 'medium';
    return 'neutral';
}

export default function ControlCenter() {
    const navigate = useNavigate();
    const [summary, setSummary] = useState<Summary | null>(null);
    const [rows, setRows] = useState<ControlRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [domain, setDomain] = useState('');
    const [implementation, setImplementation] = useState('');
    const [effectiveness, setEffectiveness] = useState('');

    useEffect(() => {
        setLoading(true);
        Promise.all([
            sccAPI.summary(),
            sccAPI.controls({
                domain: domain || undefined,
                implementationStatus: implementation || undefined,
                effectivenessStatus: effectiveness || undefined,
            }),
        ])
            .then(([summaryRes, controlRes]) => {
                setSummary(summaryRes.data.data);
                setRows(controlRes.data.data || []);
            })
            .catch((err) => setError(err.message || 'Unable to load Control Center'))
            .finally(() => setLoading(false));
    }, [domain, implementation, effectiveness]);

    const domains = useMemo(() => Array.from(new Set(rows.map((row) => row.domain))).sort(), [rows]);

    return (
        <Box sx={{ maxWidth: 1280 }}>
            <PageHeader
                crumbs={[{ label: 'Controls' }, { label: 'Control Center' }]}
                title="Control Center"
                description="Implement and test a control once. Mapping decides where it contributes. These counts are readiness, not certification."
            />
            {summary && <Alert severity="info" sx={{ mb: 2 }}>{summary.honesty}</Alert>}
            <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ mb: 3 }}>
                <MetricCard label="Controls" value={summary?.controlCount ?? '—'} />
                <MetricCard label="Implemented" value={summary?.implemented ?? '—'} hint="Implementation is not effectiveness" />
                <MetricCard label="Tested" value={summary?.tested ?? '—'} />
                <MetricCard label="Ineffective" value={summary?.ineffective ?? '—'} />
                <MetricCard label="Expiring evidence" value={summary?.needsReview ?? '—'} />
                <MetricCard label="With findings" value={summary?.withFindings ?? '—'} />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                <TextField select label="Domain" value={domain} onChange={(event) => setDomain(event.target.value)} sx={{ minWidth: 220 }}>
                    <MenuItem value="">All domains</MenuItem>
                    {domains.map((value) => <MenuItem key={value} value={value}>{value.replace(/_/g, ' ')}</MenuItem>)}
                </TextField>
                <TextField select label="Implementation" value={implementation} onChange={(event) => setImplementation(event.target.value)} sx={{ minWidth: 200 }}>
                    <MenuItem value="">Any implementation</MenuItem>
                    <MenuItem value="NOT_IMPLEMENTED">Not implemented</MenuItem>
                    <MenuItem value="PLANNED">Planned</MenuItem>
                    <MenuItem value="IMPLEMENTED">Implemented</MenuItem>
                </TextField>
                <TextField select label="Effectiveness" value={effectiveness} onChange={(event) => setEffectiveness(event.target.value)} sx={{ minWidth: 200 }}>
                    <MenuItem value="">Any effectiveness</MenuItem>
                    <MenuItem value="NOT_TESTED">Not tested</MenuItem>
                    <MenuItem value="EFFECTIVE">Effective</MenuItem>
                    <MenuItem value="PARTIALLY_EFFECTIVE">Partially effective</MenuItem>
                    <MenuItem value="INEFFECTIVE">Ineffective</MenuItem>
                </TextField>
            </Stack>
            <QueryState loading={loading} error={error} empty={rows.length === 0} emptyTitle="No controls match" emptyBody="Clear filters or wait for the common control library to adopt into this organization.">
                <AppTable
                    rows={rows}
                    rowKey={(row) => row.id}
                    onRowClick={(row) => navigate(`/control-center/${row.id}`)}
                    searchPlaceholder="Search control key or title"
                    searchValue={(row) => `${row.controlKey} ${row.title} ${row.domain}`}
                    columns={[
                        { id: 'key', label: 'Control', sortValue: (row) => row.controlKey, render: (row) => (
                            <Box>
                                <Typography variant="subtitle2">{row.controlKey}</Typography>
                                <Typography variant="body2">{row.title}</Typography>
                            </Box>
                        ) },
                        { id: 'domain', label: 'Domain', hideOnMobile: true, sortValue: (row) => row.domain, render: (row) => row.domain.replace(/_/g, ' ') },
                        { id: 'impl', label: 'Implementation', sortValue: (row) => row.implementationStatus, render: (row) => (
                            <StatusBadge kind="plain" tone={implTone(row.implementationStatus)} label={row.implementationStatus.replace(/_/g, ' ')} />
                        ) },
                        { id: 'effect', label: 'Effectiveness', sortValue: (row) => row.effectivenessStatus, render: (row) => (
                            <StatusBadge kind="plain" tone={effectTone(row.effectivenessStatus)} label={row.effectivenessStatus.replace(/_/g, ' ')} />
                        ) },
                        { id: 'evidence', label: 'Usable evidence', hideOnMobile: true, sortValue: (row) => row.usableEvidenceCount, render: (row) => `${row.usableEvidenceCount} / ${row.evidenceCount}` },
                        { id: 'findings', label: 'Findings', hideOnMobile: true, sortValue: (row) => row.openFindings, render: (row) => row.openFindings || '—' },
                    ]}
                />
            </QueryState>
        </Box>
    );
}
