import { FormEvent, useState } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import { aiGovernanceAPI } from '../services/api';

function parseCsv(text: string) {
    const [header, ...lines] = text.split(/\r?\n/).filter(Boolean);
    const keys = header.split(',').map((item) => item.trim());
    return lines.map((line) => {
        const values = line.split(',').map((item) => item.trim().replace(/^=+/, ''));
        return Object.fromEntries(keys.map((key, index) => [key, values[index] || '']));
    });
}

export default function AiImport() {
    const [rows, setRows] = useState<any[]>([]);
    const [preview, setPreview] = useState<any[] | null>(null);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const downloadTemplate = () => {
        const csv = 'name,purpose\nClaims triage assistant,Claims routing support';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'supreme-ai-import.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    const upload = (event: FormEvent) => {
        event.preventDefault();
        const input = (event.currentTarget as HTMLFormElement).elements.namedItem('file') as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        file.text().then((text) => {
            const parsed = parseCsv(text);
            setRows(parsed);
            return aiGovernanceAPI.previewImport(parsed);
        }).then((res) => { if (res) setPreview(res.data.data); }).catch((err) => setError(err.message));
    };

    const commit = () => {
        aiGovernanceAPI.commitImport(rows).then((res) => setResult(res.data.data)).catch((err) => setError(err.message));
    };

    return (
        <>
            <PageHeader crumbs={[{ label: 'AI Governance', to: '/ai-governance' }, { label: 'Import' }]} title="AI register import" description="Preview before write. Leading = formulas are neutralized. Nothing is imported until you confirm." />
            <Stack spacing={2.5}>
                <Surface>
                    <Alert severity="info" sx={{ mb: 2 }}>Imported systems stay Proposed. They are not approved.</Alert>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                        <Button onClick={downloadTemplate}>Download template</Button>
                        <Stack component="form" onSubmit={upload} direction="row" spacing={1.5}>
                            <input name="file" type="file" accept=".csv,text/csv" />
                            <Button type="submit" variant="contained">Upload and preview</Button>
                        </Stack>
                    </Stack>
                    {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
                </Surface>
                {preview && (
                    <Surface>
                        <AppTable rows={preview} rowKey={(row: any) => String(row.row)} emptyTitle="No preview" emptyBody="Upload a template." columns={[
                            { id: 'row', label: 'Row', render: (row: any) => row.row },
                            { id: 'name', label: 'Name', render: (row: any) => row.name },
                            { id: 'valid', label: 'Valid', render: (row: any) => row.valid ? 'Yes' : 'No' },
                            { id: 'error', label: 'Error', render: (row: any) => row.error || '—' },
                        ]} />
                        <Button sx={{ mt: 2 }} variant="contained" onClick={commit}>Commit valid rows</Button>
                    </Surface>
                )}
                {result && <Surface><Typography>Created {result.created?.length || 0} · Skipped {result.skipped}</Typography></Surface>}
            </Stack>
        </>
    );
}
