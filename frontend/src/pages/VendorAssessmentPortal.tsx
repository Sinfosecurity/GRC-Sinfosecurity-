import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { vendorPortalAPI } from '../services/api';
import { color } from '../design/tokens';
import { formatShortDate, humanizeLabel } from '../utils/humanizeLabel';

export default function VendorAssessmentPortal() {
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!localStorage.getItem('vendorToken')) {
            navigate('/vendor-assessment/activate');
            return;
        }
        vendorPortalAPI.workspace()
            .then((response) => setData(response.data.data))
            .catch((err) => setError(err.message || 'Unable to load this assessment.'));
    }, [navigate]);

    if (error) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: color.workspace, p: 3 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }
    if (!data) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: color.workspace, p: 3 }}>
                <Typography>Loading the assessment requested of you…</Typography>
            </Box>
        );
    }

    const assessments = data.assessments || [];
    const answered = assessments.reduce((sum: number, item: any) => sum + (item.answered || 0), 0);
    const total = assessments.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
    const evidenceRequired = assessments.some((item: any) => item.evidenceRequired || item.evidenceCount > 0);
    const progressLabel = total ? `${answered} of ${total} answered` : `${data.progress || 0}% complete`;

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: color.workspace, px: { xs: 2, md: 6 }, py: 4 }}>
            <Stack spacing={2.5} sx={{ maxWidth: 820, mx: 'auto' }}>
                <Typography variant="overline" sx={{ color: color.gold, fontWeight: 700 }}>Supreme Third Party</Typography>
                <Typography variant="h4">Assessment requested by {data.organizationName}</Typography>
                <Typography variant="body1">
                    {data.requesterName || data.requestedBy || 'The requesting organization'} asked {data.vendorName} to complete due diligence. You will only see this assignment.
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                    <Fact label="Vendor" value={data.vendorName} />
                    <Fact label="Due" value={formatShortDate(data.dueDate)} />
                    <Fact label="Progress" value={progressLabel} />
                    <Fact label="Evidence" value={evidenceRequired || data.evidenceRequired ? 'Some questions require a supporting file' : 'Upload files where a question asks for evidence'} />
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={data.progress || 0}
                    aria-label={`Assessment progress ${progressLabel}`}
                    sx={{ height: 10, borderRadius: 999 }}
                />
                <Typography variant="body2">Choose an assessment to begin or resume. Your answers save as you go.</Typography>
                {assessments.map((item: any) => (
                    <Box key={item.id} sx={{ bgcolor: color.surface, p: 2.5, borderRadius: '8px', border: `1px solid ${color.line}` }}>
                        <Typography variant="h6">{item.name}</Typography>
                        <Typography>{humanizeLabel(item.status)} · {item.answered} / {item.total} answered</Typography>
                        <Button sx={{ mt: 1.5 }} variant="contained" onClick={() => navigate(`/vendor-assessment/${item.id}`)}>
                            {item.status === 'Submitted' ? 'View submission' : item.answered ? 'Resume assessment' : 'Begin assessment'}
                        </Button>
                    </Box>
                ))}
                <Button onClick={() => { localStorage.removeItem('vendorToken'); navigate('/vendor-assessment/activate'); }}>Sign out</Button>
            </Stack>
        </Box>
    );
}

function Fact({ label, value }: { label: string; value?: string | null }) {
    return (
        <Box>
            <Typography variant="caption">{label}</Typography>
            <Typography>{value || '—'}</Typography>
        </Box>
    );
}
