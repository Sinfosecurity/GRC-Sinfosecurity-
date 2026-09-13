import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import { complianceAPI, sccAPI } from '../services/api';

export default function ComplianceCampaignDetail() {
    const { publicId } = useParams();
    const [data, setData] = useState<any>(null);
    const [controls, setControls] = useState<Array<{ id: string; controlKey: string; title: string }>>([]);
    const [controlId, setControlId] = useState('');
    const [statement, setStatement] = useState('');
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

    return (
        <>
            <PageHeader crumbs={[{ label: 'Compliance' }, { label: 'Attestations' }, { label: publicId || 'Campaign' }]} title={data?.name || 'Attestation campaign'} />
            <QueryState loading={loading} error={error} empty={!data} emptyTitle="Campaign not found" emptyBody="Return to the framework program.">
                {data && (
                    <Surface>
                        <Alert severity="info" sx={{ mb: 2 }}>{data.honesty}</Alert>
                        <Typography>Status: {data.status}</Typography>
                        <Typography>Submitted attestations: {data.submitted}</Typography>
                        <Stack component="form" onSubmit={attest} spacing={1.5} sx={{ mt: 2, maxWidth: 520 }}>
                            <TextField select label="Control" value={controlId} onChange={(event) => setControlId(event.target.value)}>
                                {controls.map((control) => <MenuItem key={control.id} value={control.id}>{control.controlKey} · {control.title}</MenuItem>)}
                            </TextField>
                            <TextField label="Statement" value={statement} onChange={(event) => setStatement(event.target.value)} required />
                            <Button type="submit" variant="contained">Submit attestation</Button>
                        </Stack>
                    </Surface>
                )}
            </QueryState>
        </>
    );
}
