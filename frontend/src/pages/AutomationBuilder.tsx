import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import { automationAPI } from '../services/api';

const TRIGGERS = [
    'finding.overdue', 'finding.confirmed', 'control.test.failed', 'evidence.expiring', 'evidence.expired',
    'risk.outside_appetite', 'risk.acceptance.expiring', 'assessment.submitted', 'intelligence.critical_attention',
    'compliance.gap.opened', 'privacy.deadline.approaching', 'ai.approval.due', 'scheduled.review',
];
const FIELDS = ['finding.severity', 'vendor.tier', 'control.test.result', 'risk.outside_appetite', 'evidence.expires_within_days', 'owner.exists', 'due.exceeded', 'intelligence.priority', 'intelligence.current'];
const ACTIONS = ['CREATE_REVIEW_REQUEST', 'NOTIFY_OWNER', 'CREATE_REMINDER', 'REQUEST_EVIDENCE', 'CREATE_DECISION_PACKAGE', 'REQUEST_REASSESSMENT', 'ESCALATE_OVERDUE'];

export default function AutomationBuilder() {
    const { publicId } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [trigger, setTrigger] = useState('finding.overdue');
    const [field, setField] = useState('finding.severity');
    const [op, setOp] = useState('in');
    const [value, setValue] = useState('HIGH,CRITICAL');
    const [action, setAction] = useState('CREATE_REVIEW_REQUEST');
    const [notify, setNotify] = useState(true);
    const [human, setHuman] = useState('Required before the source record is closed, approved, or residual risk is changed');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const template = params.get('template');
        if (!publicId && template) {
            automationAPI.catalog().then((res) => {
                const match = (res.data.data.templates || []).find((row: any) => row.key === template);
                if (!match) return;
                setName(match.name);
                setDescription(match.description);
                setHuman(match.humanDecision);
            }).catch(() => undefined);
        }
        if (publicId) {
            automationAPI.get(publicId).then((res) => {
                const row = res.data.data;
                setName(row.name);
                setDescription(row.description);
                setTrigger(row.when || 'finding.overdue');
                const first = row.conditions?.[0];
                if (first) {
                    setField(first.field);
                    setOp(first.op);
                    setValue(Array.isArray(first.value) ? first.value.join(',') : String(first.value ?? ''));
                }
                setAction(row.actions?.[0]?.type || 'CREATE_REVIEW_REQUEST');
                setNotify((row.actions || []).some((item: any) => item.type === 'NOTIFY_OWNER'));
                setHuman(row.humanBoundary?.label || human);
            }).catch((err) => setError(err.message));
        }
    }, [publicId, params]);

    const payload = () => ({
        name,
        description,
        templateKey: params.get('template') || undefined,
        trigger: { type: trigger.includes('expir') || trigger.includes('overdue') || trigger.includes('due') || trigger === 'scheduled.review' ? 'SCHEDULE' : 'EVENT', event: trigger },
        conditions: [{ field, op, value: value.includes(',') ? value.split(',').map((item) => item.trim()) : value }],
        actions: notify && action !== 'NOTIFY_OWNER' ? [{ type: action }, { type: 'NOTIFY_OWNER' }] : [{ type: action }],
        humanBoundary: { required: true, before: 'source_decision', label: human },
    });

    const save = async (publish = false) => {
        setBusy(true);
        setError(null);
        try {
            const saved = publicId
                ? await automationAPI.save(publicId, payload())
                : await automationAPI.create(payload());
            const id = saved.data.data.publicId;
            if (publish) await automationAPI.publish(id);
            navigate(`/automation/${id}`);
        } catch (err: any) {
            setError(err.message || 'Unable to save automation');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Box>
            <PageHeader
                crumbs={[{ label: 'Automation', to: '/automation' }, { label: publicId ? 'Edit' : 'New' }]}
                title={publicId ? 'Edit automation' : 'New automation'}
                description="WHEN, IF, THEN, and the human decision. Implementation JSON is not the working surface."
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Stack spacing={2}>
                <Surface>
                    <Typography variant="h6">Name</Typography>
                    <TextField fullWidth label="Name" value={name} onChange={(event) => setName(event.target.value)} sx={{ mt: 1.5 }} />
                    <TextField fullWidth multiline minRows={2} label="Purpose" value={description} onChange={(event) => setDescription(event.target.value)} sx={{ mt: 1.5 }} />
                </Surface>
                <Surface>
                    <Typography variant="h6">When</Typography>
                    <TextField select fullWidth label="Trigger" value={trigger} onChange={(event) => setTrigger(event.target.value)} sx={{ mt: 1.5 }}>
                        {TRIGGERS.map((item) => <MenuItem key={item} value={item}>{item.replace(/[._]/g, ' ')}</MenuItem>)}
                    </TextField>
                </Surface>
                <Surface>
                    <Typography variant="h6">If</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mt: 1.5 }}>
                        <TextField select fullWidth label="Field" value={field} onChange={(event) => setField(event.target.value)}>
                            {FIELDS.map((item) => <MenuItem key={item} value={item}>{item.replace(/[._]/g, ' ')}</MenuItem>)}
                        </TextField>
                        <TextField select fullWidth label="Operator" value={op} onChange={(event) => setOp(event.target.value)}>
                            {['eq', 'in', 'true', 'lte'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                        </TextField>
                        <TextField fullWidth label="Value" value={value} onChange={(event) => setValue(event.target.value)} helperText="Use commas for a list, for example HIGH,CRITICAL" />
                    </Stack>
                </Surface>
                <Surface>
                    <Typography variant="h6">Then</Typography>
                    <TextField select fullWidth label="Administrative action" value={action} onChange={(event) => setAction(event.target.value)} sx={{ mt: 1.5 }}>
                        {ACTIONS.map((item) => <MenuItem key={item} value={item}>{item.replace(/_/g, ' ')}</MenuItem>)}
                    </TextField>
                    <Button sx={{ mt: 1.5 }} onClick={() => setNotify((current) => !current)}>{notify ? 'Also notify owner (on)' : 'Also notify owner (off)'}</Button>
                    <Typography variant="body2" sx={{ mt: 1 }}>Auto Approve Vendor, Auto Accept Risk, and similar actions are not available.</Typography>
                </Surface>
                <Surface>
                    <Typography variant="h6">Requires human decision</Typography>
                    <TextField fullWidth multiline minRows={2} label="Human boundary" value={human} onChange={(event) => setHuman(event.target.value)} sx={{ mt: 1.5 }} />
                </Surface>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button disabled={busy} onClick={() => save(false)}>Save draft</Button>
                    <Button variant="contained" disabled={busy} onClick={() => save(true)}>Publish</Button>
                </Stack>
            </Stack>
        </Box>
    );
}
