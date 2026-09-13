import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { complianceAPI, sccAPI } from '../services/api';

const FILTERS = ['All', 'Not Started', 'In Progress', 'Submitted', 'Reviewed', 'Rejected', 'Overdue'] as const;

export default function ComplianceCampaignDetail() {
    const { publicId } = useParams();
    const [data, setData] = useState<any>(null);
    const [controls, setControls] = useState<Array<{ id: string; controlKey: string; title: string }>>([]);
    const [controlId, setControlId] = useState('');
    const [statement, setStatement] = useState('');
    const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
    const [reviewNotes, setReviewNotes] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        if (!publicId) return;
        setLoading(true);
        Promise.all([complianceAPI.campaign(publicId), sccAPI.controls().catch(() => ({ data: { data: [] } }))])
            .then(([res, controlRes]) => {
                setData(res.data.data);
                const list = controlRes.data.data.controls || controlRes.data.data || [];
                setControls(Array.isArray(list) ? list : []);
                if (!controlId && Array.isArray(list) && list[0]) setControlId(list[0].id);
            })
            .catch((err) => setError(err.message || 'Unable to load campaign'))
            .finally(() => setLoading(false));
    };

    useEffect(load, [publicId]);

    const attest = (event: FormEvent) => {
        event.preventDefault();
        complianceAPI.attest({
            campaignId: publicId,
            organizationControlId: controlId,
            status: 'IMPLEMENTED',
            statement,
        }).then(load).catch((err) => setError(err.message));
    };

    const review = (attestationId: string, reviewStatus: 'REVIEWED' | 'REJECTED') => {
        complianceAPI.reviewAttestation(attestationId, { reviewStatus, reviewNotes }).then(load).catch((err) => setError(err.message));
    };

    const rows = useMemo(() => {
        const queue = data?.queue || [];
        if (filter === 'All') return queue;
        if (filter === 'In Progress') return queue.filter((row: any) => row.filterKey === 'IN_PROGRESS' || row.attestationStatus === 'In progress');
        const wanted = filter.toUpperCase().replace(' ', '_');
        return queue.filter((row: any) => row.filterKey === wanted || row.reviewStatus === filter);
    }, [data, filter]);

    return (
        <>
            <PageHeader crumbs={[{ label: 'Compliance', to: '/compliance' }, { label: 'Attestations' }, { label: data?.name || 'Campaign' }]} title={data?.name || 'Attestation campaign'} description={data?.framework || 'Governance statements only. Review does not change control effectiveness.'} />
            <QueryState loading={loading} error={error} empty={!data} emptyTitle="Campaign not found" emptyBody="Return to the framework program.">
                {data && (
                    <Stack spacing={2}>
                        <Alert severity="info">{data.honesty}</Alert>
                        <Typography>Status: {data.status} · Due {data.dueAt ? new Date(data.dueAt).toLocaleDateString() : 'Not set'} · Submitted {data.submitted}</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {FILTERS.map((item) => (
                                <Button key={item} variant={filter === item ? 'contained' : 'outlined'} onClick={() => setFilter(item)}>{item}</Button>
                            ))}
                        </Stack>
                        <Surface>
                            <AppTable
                                rows={rows}
                                rowKey={(row: any) => row.publicId}
                                columns={[
                                    { id: 'control', label: 'Control', render: (row: any) => row.control },
                                    { id: 'requirement', label: 'Requirement', hideOnMobile: true, render: (row: any) => row.requirement || '—' },
                                    { id: 'attestor', label: 'Attestor', render: (row: any) => row.attestor },
                                    { id: 'reviewer', label: 'Reviewer', hideOnMobile: true, render: (row: any) => row.reviewer },
                                    { id: 'attestationStatus', label: 'Attestation', render: (row: any) => row.attestationStatus },
                                    { id: 'reviewStatus', label: 'Review', render: (row: any) => <StatusBadge tone={row.overdue ? 'high' : 'neutral'} label={row.reviewStatus} /> },
                                    { id: 'submittedAt', label: 'Submitted', hideOnMobile: true, render: (row: any) => row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : '—' },
                                    { id: 'dueAt', label: 'Due', hideOnMobile: true, render: (row: any) => row.dueAt ? new Date(row.dueAt).toLocaleDateString() : '—' },
                                    { id: 'evidence', label: 'Evidence', hideOnMobile: true, render: (row: any) => `${row.evidenceCount} · ${row.evidenceState}` },
                                    { id: 'notes', label: 'Notes', hideOnMobile: true, render: (row: any) => row.notes || '—' },
                                    { id: 'actions', label: 'Review', render: (row: any) => row.publicId.startsWith('ATT-') ? (
                                        <Stack direction="row" spacing={0.5}>
                                            <Button size="small" onClick={() => review(row.publicId, 'REVIEWED')}>Review</Button>
                                            <Button size="small" onClick={() => review(row.publicId, 'REJECTED')}>Reject</Button>
                                        </Stack>
                                    ) : '—'},
                                ]}
                            />
                        </Surface>
                        <Surface>
                            <Typography fontWeight={700} sx={{ mb: 1 }}>Add review note</Typography>
                            <TextField label="Review note" value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} fullWidth />
                            <Typography color="text.secondary" sx={{ mt: 1 }}>Reject returns the statement for clarification. Review is not a control test and does not change effectiveness.</Typography>
                        </Surface>
                        <Surface>
                            <Stack component="form" onSubmit={attest} spacing={1.5} sx={{ maxWidth: 520 }}>
                                <TextField select label="Control" value={controlId} onChange={(event) => setControlId(event.target.value)}>
                                    {controls.map((control) => <MenuItem key={control.id} value={control.id}>{control.controlKey} · {control.title}</MenuItem>)}
                                </TextField>
                                <TextField label="Statement" value={statement} onChange={(event) => setStatement(event.target.value)} required />
                                <Button type="submit" variant="contained">Submit attestation</Button>
                            </Stack>
                        </Surface>
                    </Stack>
                )}
            </QueryState>
        </>
    );
}
