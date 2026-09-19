import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Tab, Tabs, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import StatusBadge from '../components/design/StatusBadge';
import QueryState from '../components/QueryState';
import WorkspaceFrame from '../components/design/WorkspaceFrame';
import { formatDateTime, humanizeEventType } from '../utils/humanizeLabel';
import { notificationAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { participantExperience } from '../requester/workspace';

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

function destination(row: Notice, permissions?: string[], role?: string) {
    if (row.resourceType === 'IntakeRequest' && row.resourceId) {
        return participantExperience(role, permissions) === 'requester'
            ? `/request/${row.resourceId}`
            : `/third-parties/intake/${row.resourceId}`;
    }
    if (row.resourceType === 'EngagementIra' && row.resourceId) {
        return participantExperience(role, permissions) === 'requester'
            ? '/request/actions'
            : `/third-parties/engagements/${row.resourceId}/tier-review`;
    }
    if (row.resourceType === 'Engagement' && row.resourceId) {
        return participantExperience(role, permissions) === 'requester'
            ? '/request/actions'
            : `/third-parties/engagements/${row.resourceId}`;
    }
    if (row.resourceType === 'Vendor' && row.resourceId) return `/vendor-onboarding/${row.resourceId}`;
    if (row.resourceType === 'VendorAssessment') return '/assessments';
    if (row.resourceType === 'VendorIssue' || row.resourceType === 'Finding') return '/findings';
    if (row.resourceType === 'RiskDecisionBrief') return '/decision-briefs';
    if (row.resourceType === 'StoredObject') return '/documents';
    return '/dashboard';
}

export default function Notifications() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [items, setItems] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState(0);

    const load = () => {
        setLoading(true);
        notificationAPI.list()
            .then((response) => setItems(response.data.data || []))
            .catch((err) => setError(err.message || 'Unable to load notifications.'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const unread = items.filter((row) => !row.readAt);
    const shown = tab === 0 ? unread : items;

    const open = async (row: Notice) => {
        if (!row.readAt) {
            try {
                await notificationAPI.markRead(row.id);
            } catch {
                // Opening the destination still matters if mark-read fails.
            }
        }
        navigate(destination(row, user?.permissions, user?.role));
    };

    return (
        <WorkspaceFrame purpose="register">
            <PageHeader
                title="Notifications"
                description="What happened, what needs action, and where to go. Routine audit and autosave events are not listed here."
            />
            <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }} aria-label="Notification groups">
                <Tab label={`Unread (${unread.length})`} />
                <Tab label={`All (${items.length})`} />
            </Tabs>
            <QueryState
                loading={loading}
                error={error}
                empty={shown.length === 0}
                emptyTitle={tab === 0 ? 'Nothing unread' : 'Nothing needs attention from notifications'}
                emptyBody="Supreme will list invitations, assessments, findings, and decisions here when they require a person."
                emptyAction={<Button variant="outlined" onClick={() => navigate('/dashboard')}>Open Home</Button>}
            >
                <Surface padded={false}>
                    <AppTable
                        embedded
                        pageSize={8}
                        rows={shown}
                        rowKey={(row) => row.id}
                        searchPlaceholder="Search notifications"
                        searchValue={(row) => `${row.title} ${row.body} ${row.eventType}`}
                        onRowClick={(row) => open(row)}
                        columns={[
                            { id: 'event', label: 'Event', hideOnMobile: true, render: (row) => humanizeEventType(row.eventType) },
                            { id: 'title', label: 'Notification', sortValue: (row) => row.title, render: (row) => (
                                <Box>
                                    <Typography variant="subtitle2">{row.title}</Typography>
                                    <Typography variant="body2">{row.body}</Typography>
                                </Box>
                            ) },
                            { id: 'when', label: 'When', hideOnMobile: true, sortValue: (row) => row.createdAt, render: (row) => formatDateTime(row.createdAt) },
                            { id: 'state', label: 'State', render: (row) => (
                                <StatusBadge kind="plain" tone={row.readAt ? 'neutral' : 'high'} label={row.readAt ? 'Read' : 'Unread'} />
                            ) },
                            { id: 'action', label: 'Action', render: (row) => (
                                <Button size="small" variant="contained" onClick={(event) => { event.stopPropagation(); open(row); }}>
                                    Open the work
                                </Button>
                            ) },
                        ]}
                    />
                </Surface>
            </QueryState>
        </WorkspaceFrame>
    );
}
