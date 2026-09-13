import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import { complianceAPI } from '../services/api';

export default function ComplianceAuditDetail() {
    const { publicId } = useParams();
    const [data, setData] = useState<any>(null);
    const [notes, setNotes] = useState('Requested evidence package');
    const [itemType, setItemType] = useState('EVIDENCE_REQUEST');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        if (!publicId) return;
        setLoading(true);
        complianceAPI.period(publicId)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load audit period'))
            .finally(() => setLoading(false));
    };

    useEffect(load, [publicId]);

    const addItem = (event: FormEvent) => {
        event.preventDefault();
        complianceAPI.addPeriodItem(publicId!, { itemType, notes }).then(load).catch((err) => setError(err.message));
    };

    return (
        <>
            <PageHeader crumbs={[{ label: 'Compliance' }, { label: 'Audits' }, { label: publicId || 'Period' }]} title={data?.name || 'Audit period'} />
            <QueryState loading={loading} error={error} empty={!data} emptyTitle="Period not found" emptyBody="Return to the framework program.">
                {data && (
                    <Surface>
                        <Alert severity="info" sx={{ mb: 2 }}>{data.honesty}</Alert>
                        <Typography>{data.framework} {data.version} · {data.status}</Typography>
                        <Typography color="text.secondary">This period stays tied to the framework version recorded when it was created.</Typography>
                        <Stack component="form" onSubmit={addItem} spacing={1.5} sx={{ mt: 2, maxWidth: 520 }}>
                            <TextField select label="Item type" value={itemType} onChange={(event) => setItemType(event.target.value)}>
                                <MenuItem value="REQUIREMENT">Requirement</MenuItem>
                                <MenuItem value="CONTROL">Control</MenuItem>
                                <MenuItem value="EVIDENCE_REQUEST">Evidence request</MenuItem>
                            </TextField>
                            <TextField label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
                            <Button type="submit" variant="contained">Add requested item</Button>
                        </Stack>
                        {data.items.map((item: any) => (
                            <Typography key={item.id} sx={{ mt: 1 }}>{item.type} · {item.status} · {item.notes || 'No notes'}</Typography>
                        ))}
                    </Surface>
                )}
            </QueryState>
        </>
    );
}
