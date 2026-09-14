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

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: color.workspace, px: { xs: 2, md: 6 }, py: 4 }}>
            <Stack spacing={2} sx={{ maxWidth: 820, mx: 'auto' }}>
                <Typography variant="overline" sx={{ color: color.gold }}>Supreme Third Party</Typography>
                <Typography variant="h4">Assessment requested by {data.organizationName}</Typography>
                <Typography variant="body2">
                    Complete only what was assigned. You do not need the customer platform.
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                    <Fact label="Vendor" value={data.vendorName} />
                    <Fact label="Due" value={formatShortDate(data.dueDate)} />
                    <Fact label="Progress" value={`${data.progress}%`} />
                    <Fact label="Assignments" value={`${(data.assessments || []).length} assessment${(data.assessments || []).length === 1 ? '' : 's'}`} />
                </Box>
                <LinearProgress variant="determinate" value={data.progress} sx={{ height: 10, borderRadius: 999 }} />
                {(data.assessments || []).map((item: any) => (
                    <Box key={item.id} sx={{ bgcolor: color.surface, p: 2.5, borderRadius: '8px', border: `1px solid ${color.line}` }}>
                        <Typography variant="h6">{item.name}</Typography>
                        <Typography>{humanizeLabel(item.status)} · {item.answered} / {item.total} answered</Typography>
                        <Button sx={{ mt: 1 }} variant="contained" onClick={() => navigate(`/vendor-assessment/${item.id}`)}>
                            {item.status === 'Submitted' ? 'View submission' : 'Continue assessment'}
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
