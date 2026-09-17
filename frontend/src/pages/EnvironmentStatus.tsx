import { useEffect, useState } from 'react';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import WorkspaceFrame from '../components/design/WorkspaceFrame';
import Surface from '../components/design/Surface';
import FactList from '../components/design/FactList';
import StatusBadge from '../components/design/StatusBadge';
import { systemAPI } from '../services/api';
import { humanizeLabel } from '../utils/humanizeLabel';

function toneFor(value: string): 'success' | 'high' | 'medium' | 'neutral' {
    const key = String(value).toUpperCase();
    if (key === 'UP' || key === 'CONNECTED' || key === 'OK') return 'success';
    if (key === 'DOWN' || key === 'ERROR' || key === 'FAILED') return 'high';
    if (key === 'NOT_CONFIGURED' || key === 'DEGRADED') return 'medium';
    return 'neutral';
}

export default function EnvironmentStatus() {
    const [data, setData] = useState<Record<string, string> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        systemAPI.status()
            .then((response) => setData(response.data.data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const items = data
        ? Object.entries(data).map(([key, value]) => ({
            label: humanizeLabel(key),
            value: <StatusBadge kind="plain" tone={toneFor(String(value))} label={humanizeLabel(String(value))} />,
        }))
        : [];

    return (
        <WorkspaceFrame purpose="admin">
            <PageHeader
                crumbs={[{ label: 'Administration' }, { label: 'Environment' }]}
                title="Environment status"
                description="Provider and environment facts from the server. This page does not invent connected status."
            />
            <QueryState loading={loading} error={error}>
                <Surface>
                    <FactList columns={2} items={items} />
                </Surface>
            </QueryState>
        </WorkspaceFrame>
    );
}
