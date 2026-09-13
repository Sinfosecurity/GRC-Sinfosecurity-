import StatusBadge from './StatusBadge';

export default function RiskBadge({ value }: { value?: string | number | null }) {
    return <StatusBadge value={String(value ?? '—')} kind="severity" />;
}
