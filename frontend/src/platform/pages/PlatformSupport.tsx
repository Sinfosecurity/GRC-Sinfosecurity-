import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import QueryState from '../../components/QueryState';
import { platformAPI } from '../api';
import { EmptyState, Panel } from '../ui';

export function PlatformSupportQueue() {
    const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        platformAPI.tickets()
            .then((response) => setRows(response.data.data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <QueryState loading={loading} error={error}>
            {rows.length === 0 ? (
                <EmptyState>No open support requests.</EmptyState>
            ) : (
                <Table size="small" aria-label="Support ticket queue">
                    <TableHead>
                        <TableRow>
                            {['Ticket', 'Priority', 'Status', 'Organization', 'Age', 'Subject'].map((col) => (
                                <TableCell key={col} sx={{ color: '#c4955c' }}>{col}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={String(row.id)}>
                                <TableCell><Link to={`/platform/support/${row.id}`} style={{ color: '#e8c9a0' }}>{String(row.displayId)}</Link></TableCell>
                                <TableCell>{String(row.priority)}</TableCell>
                                <TableCell>{String(row.status)}</TableCell>
                                <TableCell>{String((row.organization as { name?: string } | undefined)?.name || '')}</TableCell>
                                <TableCell>{String(row.ageMinutes)} min</TableCell>
                                <TableCell>{String(row.subject)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </QueryState>
    );
}

export function PlatformTicketDetail() {
    const { id } = useParams();
    const [ticket, setTicket] = useState<Record<string, unknown> | null>(null);
    const [internalNote, setInternalNote] = useState('');
    const [customerReply, setCustomerReply] = useState('');
    const [status, setStatus] = useState('IN_PROGRESS');
    const [error, setError] = useState<string | null>(null);

    const load = () => {
        if (!id) return;
        platformAPI.ticket(id).then((response) => setTicket(response.data.data)).catch((err) => setError(err.message));
    };

    useEffect(() => { load(); }, [id]);

    const messages = (ticket?.messages || []) as Array<{ id: string; visibility: string; body: string }>;

    return (
        <QueryState loading={!ticket && !error} error={error}>
            <Panel title={String(ticket?.displayId || 'Ticket')}>
                <Typography>{String(ticket?.subject)}</Typography>
                <Typography sx={{ color: '#c4b09a' }}>{String(ticket?.priority)} · {String(ticket?.status)}</Typography>
            </Panel>
            <Panel title="Thread">
                {messages.map((message) => (
                    <Typography key={message.id} sx={{ mb: 1 }}>
                        <strong>{message.visibility === 'INTERNAL' ? 'Internal note' : 'Customer-visible'}:</strong> {message.body}
                    </Typography>
                ))}
            </Panel>
            <Panel title="Update">
                <TextField select size="small" label="Status" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ mb: 2, minWidth: 220 }}>
                    {['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'WAITING_INTERNAL', 'RESOLVED', 'CLOSED'].map((value) => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                    ))}
                </TextField>
                <TextField fullWidth multiline minRows={2} label="Internal note" value={internalNote} onChange={(event) => setInternalNote(event.target.value)} sx={{ mb: 2 }} />
                <TextField fullWidth multiline minRows={2} label="Customer-visible reply" value={customerReply} onChange={(event) => setCustomerReply(event.target.value)} sx={{ mb: 2 }} />
                <Button
                    variant="contained"
                    onClick={() => id && platformAPI.updateTicket(id, { status, internalNote, customerReply }).then(() => { setInternalNote(''); setCustomerReply(''); load(); })}
                >
                    Save update
                </Button>
            </Panel>
        </QueryState>
    );
}
