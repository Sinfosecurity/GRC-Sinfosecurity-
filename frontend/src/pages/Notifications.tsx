import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import { formatDateTime, humanizeLabel } from '../utils/humanizeLabel';
import { notificationAPI } from '../services/api';

type Notice = {
    id: string;
    eventType: string;
    title: string;
    body: string;
    resourceType?: string | null;
    resourceId?: string | null;
    readAt?: string | null;
    createdAt: string;
};

function destination(row: Notice) {
    if (row.resourceType === 'Vendor' && row.resourceId) return `/vendor-onboarding/${row.resourceId}`;
    if (row.resourceType === 'VendorAssessment') return '/assessments';
    if (row.resourceType === 'VendorIssue' || row.resourceType === 'Finding') return '/findings';
    if (row.resourceType === 'RiskDecisionBrief') return '/decision-briefs';
    if (row.resourceType === 'StoredObject') return '/documents';
    return '/dashboard';
}

export default function Notifications() {
    const navigate = useNavigate();
    const [items, setItems] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        notificationAPI.list()
            .then((response) => setItems(response.data.data || []))
            .catch((err) => setError(err.message || 'Unable to load notifications.'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const unread = items.filter((row) => !row.readAt);
    const shown = [...unread, ...items.filter((row) => row.readAt)].slice(0, 25);

    const open = async (row: Notice) => {
        if (!row.readAt) {
            try {
                await notificationAPI.markRead(row.id);
            } catch {
                // Opening the destination still matters if mark-read fails.
            }
        }
        navigate(destination(row));
    };

    return (
        <Box sx={{ maxWidth: 880 }}>
            <PageHeader
                title="Notifications"
                description="What happened, what needs action, and where to go. Routine audit and autosave events are not listed here."
            />
            <QueryState
                loading={loading}
                error={error}
                empty={shown.length === 0}
                emptyTitle="Nothing needs attention from notifications"
                emptyBody="Supreme will list invitations, assessments, findings, and decisions here when they require a person."
                emptyAction={<Button variant="outlined" onClick={() => navigate('/dashboard')}>Open Home</Button>}
            >
                <Stack spacing={1.25}>
                    {items.length > shown.length && (
                        <Typography variant="body2">
                            Showing {shown.length} of {items.length}. Unread first. Older read notices remain in the record and are not deleted.
                        </Typography>
                    )}
                    {shown.map((row) => (
                        <Surface key={row.id}>
                            <Typography variant="overline">{humanizeLabel(row.eventType)}</Typography>
                            <Typography variant="h6">{row.title}</Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>{row.body}</Typography>
                            <Typography variant="caption" display="block" sx={{ mb: 1.25 }}>
                                {formatDateTime(row.createdAt)}{row.readAt ? ' · Read' : ' · Unread'}
                            </Typography>
                            <Button variant="contained" onClick={() => open(row)}>
                                Open the work
                            </Button>
                        </Surface>
                    ))}
                </Stack>
            </QueryState>
        </Box>
    );
}
