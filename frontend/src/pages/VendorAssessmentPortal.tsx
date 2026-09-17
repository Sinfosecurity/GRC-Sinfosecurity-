import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { vendorPortalAPI } from '../services/api';
import { color, type } from '../design/tokens';
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
            <Box sx={{ bgcolor: color.navy950, color: color.navInk, px: { xs: 2, md: 8 }, py: { xs: 3.5, md: 5 }, boxShadow: `inset 0 -3px 0 ${color.gold}` }}>
                <Typography sx={{ color: color.goldSoft, fontWeight: 700, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                    {data.organizationName} is requesting this
                </Typography>
                <Typography sx={{ fontFamily: type.display, fontSize: { xs: 32, md: 48 }, lineHeight: 1.05, mt: 1.25 }}>
                    What you need to do
                </Typography>
                <Typography sx={{ color: color.navMuted, mt: 1.5, maxWidth: 640, fontSize: 16 }}>
                    Answer the questions and attach the requested files for {data.vendorName}. You will only see this assignment.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 4 }} sx={{ mt: 3 }}>
                    <Box>
                        <Typography sx={{ fontFamily: type.display, fontSize: 40, color: color.goldSoft, lineHeight: 1 }}>{percent}%</Typography>
                        <Typography sx={{ color: color.navMuted, mt: 0.5 }}>{progressLabel}</Typography>
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: color.goldSoft }}>Due</Typography>
                        <Typography sx={{ mt: 0.5 }}>{formatShortDate(data.dueDate)}</Typography>
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: color.goldSoft }}>Next</Typography>
                        <Typography sx={{ mt: 0.5 }}>{remaining ? `Complete ${remaining} remaining questions` : 'Submit your answers'}</Typography>
                    </Box>
                </Stack>
                <LinearProgress
                    variant="determinate"
                    value={percent}
                    aria-label={`Assessment progress ${progressLabel}`}
                    sx={{ height: 6, borderRadius: 0, mt: 3, bgcolor: 'rgba(255,255,255,0.12)', '& .MuiLinearProgress-bar': { bgcolor: color.gold } }}
                />
                {current && (
                    <Button
                        variant="contained"
                        color="secondary"
                        sx={{ mt: 3 }}
                        onClick={() => navigate(`/vendor-assessment/${current.id}`)}
                    >
                        {current.answered ? 'Continue' : 'Begin'}
                    </Button>
                )}
            </Box>
            <Stack spacing={0} sx={{ maxWidth: 820, mx: 'auto', px: { xs: 2, md: 6 }, py: 4 }}>
                {assessments.map((item: any) => (
                    <Box key={item.id} sx={{ py: 2.25, borderBottom: `1px solid ${color.line}` }}>
                        <Typography variant="h6">{item.name}</Typography>
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
