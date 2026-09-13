import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import MetricCard from '../components/design/MetricCard';
import StatusBadge from '../components/design/StatusBadge';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import { color } from '../design/tokens';
import { sccAPI } from '../services/api';

type Requirement = {
    id: string;
    requirementKey: string;
    supremeSummary: string;
    mappedControls: number;
    implementedControls: number;
    testedControls: number;
    gap: boolean;
};

type Framework = {
    id: string;
    frameworkKey: string;
    name: string;
    publisher: string;
    version?: string;
    mapped: number;
    implemented: number;
    tested: number;
    gaps: number;
    requirementCount: number;
    requirements: Requirement[];
};

export default function FrameworkCoverage() {
    const navigate = useNavigate();
    const [honesty, setHonesty] = useState('');
    const [frameworks, setFrameworks] = useState<Framework[]>([]);
    const [selectedKey, setSelectedKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        sccAPI.frameworks()
            .then((response) => {
                setHonesty(response.data.data.honesty);
                const rows = response.data.data.frameworks || [];
                setFrameworks(rows);
                setSelectedKey((current) => current || rows[0]?.frameworkKey || '');
            })
            .catch((err) => setError(err.message || 'Unable to load framework coverage'))
            .finally(() => setLoading(false));
    }, []);

    const selected = frameworks.find((row) => row.frameworkKey === selectedKey);

    return (
        <Box sx={{ maxWidth: 1280 }}>
            <PageHeader
                crumbs={[{ label: 'Controls' }, { label: 'Framework coverage' }]}
                title="Framework coverage"
                description="Readiness against mapped identifiers. This is not certified, compliant, or attested."
            />
            {honesty && <Alert severity="info" sx={{ mb: 2 }}>{honesty}</Alert>}
            <QueryState loading={loading} error={error} empty={frameworks.length === 0} emptyTitle="No framework packs" emptyBody="Open Control Center once so the organization can adopt the Supreme library.">
                <TextField select label="Framework" value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)} sx={{ width: '100%', maxWidth: 420, mb: 2 }}>
                    {frameworks.map((row) => <MenuItem key={row.frameworkKey} value={row.frameworkKey}>{row.name}</MenuItem>)}
                </TextField>
                {selected && (
                    <>
                        <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ mb: 3 }}>
                            <MetricCard label="Requirements" value={selected.requirementCount} />
                            <MetricCard label="Mapped" value={selected.mapped} />
                            <MetricCard label="Implemented" value={selected.implemented} />
                            <MetricCard label="Tested" value={selected.tested} />
                            <MetricCard label="Gaps" value={selected.gaps} />
                        </Stack>
                        <Typography variant="caption" display="block" sx={{ mb: 2 }}>{selected.publisher} · version {selected.version || 'n/a'}</Typography>
                        <Stack spacing={1}>
                            {selected.requirements.map((row) => (
                                <Surface key={row.id}>
                                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
                                        <Box>
                                            <Typography variant="subtitle2">{row.requirementKey}</Typography>
                                            <Typography variant="body2">{row.supremeSummary}</Typography>
                                        </Box>
                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                            <StatusBadge kind="plain" label={`${row.mappedControls} mapped`} />
                                            <StatusBadge kind="plain" label={`${row.implementedControls} implemented`} />
                                            <StatusBadge kind="plain" label={`${row.testedControls} tested`} />
                                            <StatusBadge kind="plain" tone={row.gap ? 'high' : 'success'} label={row.gap ? 'Gap' : 'Mapped and implemented'} />
                                        </Stack>
                                    </Stack>
                                    <Typography
                                        variant="caption"
                                        sx={{ mt: 1, display: 'inline-block', color: color.gold, cursor: 'pointer' }}
                                        onClick={() => navigate('/control-center')}
                                    >
                                        Open Control Center
                                    </Typography>
                                </Surface>
                            ))}
                        </Stack>
                    </>
                )}
            </QueryState>
        </Box>
    );
}
