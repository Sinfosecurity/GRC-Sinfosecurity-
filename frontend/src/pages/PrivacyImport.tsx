import { FormEvent, useState } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import { privacyAPI } from '../services/api';

function parseCsv(text: string) {
    const [header, ...lines] = text.split(/\r?\n/).filter(Boolean);
    const keys = header.split(',').map((item) => item.trim());
    return lines.map((line) => {
        const values = line.split(',').map((item) => item.trim());
        return Object.fromEntries(keys.map((key, index) => [key, values[index] || '']));
    });
}

export default function PrivacyImport() {
    const [rows, setRows] = useState<any[]>([]);
    const [preview, setPreview] = useState<any>(null);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const downloadTemplate = () => {
        privacyAPI.importTemplate().then((res) => {
            const template = res.data.data as Array<Record<string, string>>;
            const header = Object.keys(template[0] || { kind: '', name: '', description: '', jurisdictions: '', dataKind: '', period: '' });
            const csv = [header.join(','), ...template.map((row) => header.map((key) => row[key] || '').join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'supreme-privacy-import.csv';
            link.click();
            URL.revokeObjectURL(url);
        }).catch((err) => setError(err.message));
    };

    const upload = (event: FormEvent) => {
        event.preventDefault();
        const input = (event.currentTarget as HTMLFormElement).elements.namedItem('file') as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        file.text().then((text) => {
            const parsed = parseCsv(text);
            setRows(parsed);
            return privacyAPI.previewImport(parsed);
        }).then((res) => {
            if (res) setPreview(res.data.data);
        }).catch((err) => setError(err.message));
    };

    const commit = () => {
        privacyAPI.commitImport(rows).then((res) => setResult(res.data.data)).catch((err) => setError(err.message));
    };

    return (
        <>
            <PageHeader crumbs={[{ label: 'Privacy', to: '/privacy-ops' }, { label: 'Import' }]} title="Privacy import" description="Preview before write. Formula cells are neutralized. Nothing is imported until you confirm." />
            <Stack spacing={2.5}>
                <Surface>
                    <Alert severity="info" sx={{ mb: 2 }}>Support processing activities, data categories, and retention rules. Duplicate activities are skipped.</Alert>
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
                        <Typography sx={{ mb: 1 }}>Created {preview.created} · Updated {preview.updated} · Skipped {preview.skipped} · Rejected {preview.rejected}</Typography>
                        <AppTable rows={preview.rows || []} rowKey={(row: any) => `${row.row}-${row.name}`} emptyTitle="No preview rows" emptyBody="Upload a template to preview." columns={[
                            { id: 'row', label: 'Row', render: (row: any) => row.row },
                            { id: 'kind', label: 'Kind', render: (row: any) => row.kind },
                            { id: 'name', label: 'Name', render: (row: any) => row.name },
                            { id: 'decision', label: 'Will be', render: (row: any) => row.decision },
                            { id: 'errors', label: 'Errors', render: (row: any) => (row.errors || []).join(', ') || '—' },
                        ]} />
                        <Button sx={{ mt: 2 }} variant="contained" onClick={commit}>Confirm import</Button>
                    </Surface>
                )}
                {result && (
                    <Surface>
                        <Alert severity="success">Import finished. Created {(result.created || []).length}. Updated {(result.updated || []).length}. Skipped {(result.skipped || []).length}. Rejected {(result.rejected || []).length}.</Alert>
                    </Surface>
                )}
            </Stack>
        </>
    );
}
