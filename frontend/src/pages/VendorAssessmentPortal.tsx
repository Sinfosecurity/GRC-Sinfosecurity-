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
    const remaining = Math.max(0, total - answered);
    const current = assessments.find((item: any) => item.status !== 'Submitted' && item.answered < item.total) || assessments[0];
    const progressLabel = total ? `${answered} of ${total} answered` : `${data.progress || 0}% complete`;
    const percent = total ? Math.round((answered / total) * 100) : Number(data.progress || 0);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: color.workspace }}>
            <Box sx={{ bgcolor: color.navy950, color: color.navInk, px: { xs: 2, md: 6 }, py: 4 }}>
                <Typography sx={{ color: color.goldSoft, fontWeight: 700, fontSize: 13 }}>Security review for {data.organizationName}</Typography>
                <Typography variant="h3" sx={{ fontFamily: '"Newsreader", serif', fontWeight: 500, mt: 1 }}>{percent}% complete</Typography>
                <Typography sx={{ color: color.navMuted, mt: 1, maxWidth: 640 }}>
                    {data.requesterName || 'The requesting organization'} asked {data.vendorName} to answer questions and provide evidence. You will only see this assignment.
                </Typography>
                <Typography sx={{ mt: 2 }}>Next: {remaining ? `Complete ${remaining} remaining questions` : 'Submit your assessment'} · Due {formatShortDate(data.dueDate)}</Typography>
                <LinearProgress
                    variant="determinate"
                    value={percent}
                    aria-label={`Assessment progress ${progressLabel}`}
                    sx={{ height: 10, borderRadius: 999, mt: 2, bgcolor: 'rgba(255,255,255,0.16)', '& .MuiLinearProgress-bar': { bgcolor: color.gold } }}
                />
                {current && (
                    <Button
                        variant="contained"
                        sx={{ mt: 3, bgcolor: color.gold, color: color.navy950, '&:hover': { bgcolor: color.goldSoft } }}
                        onClick={() => navigate(`/vendor-assessment/${current.id}`)}
                    >
                        {current.answered ? 'Continue assessment' : 'Begin assessment'}
                    </Button>
                )}
            </Box>
            <Stack spacing={2} sx={{ maxWidth: 820, mx: 'auto', px: { xs: 2, md: 6 }, py: 4 }}>
                {assessments.map((item: any) => (
                    <Box key={item.id} sx={{ py: 2, borderBottom: `1px solid ${color.line}` }}>
                        <Typography variant="h6" sx={{ fontFamily: '"Newsreader", serif' }}>{item.name}</Typography>
                        <Typography sx={{ color: color.inkMuted }}>{humanizeLabel(item.status)} · {item.answered} / {item.total} answered</Typography>
                        <Button sx={{ mt: 1 }} onClick={() => navigate(`/vendor-assessment/${item.id}`)}>
                            {item.status === 'Submitted' ? 'View submission' : item.answered ? 'Resume' : 'Begin'}
                        </Button>
                    </Box>
                ))}
                <Button onClick={() => { localStorage.removeItem('vendorToken'); navigate('/vendor-assessment/activate'); }}>Sign out</Button>
            </Stack>
        </Box>
    );
}
