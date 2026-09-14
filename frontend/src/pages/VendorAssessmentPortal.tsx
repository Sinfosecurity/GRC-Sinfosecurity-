import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { vendorPortalAPI } from '../services/api';
import { formatShortDate } from '../utils/humanizeLabel';

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
        return <Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert></Box>;
    }
    if (!data) return null;

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f6f3ee', px: { xs: 2, md: 6 }, py: 4 }}>
            <Stack spacing={2} sx={{ maxWidth: 820, mx: 'auto' }}>
                <Typography variant="overline">Supreme Third Party</Typography>
                <Typography variant="h4">Assessment requested by {data.organizationName}</Typography>
                <Typography>Vendor: {data.vendorName}</Typography>
                <Typography>Due: {formatShortDate(data.dueDate)}</Typography>
                <Typography>Progress: {data.progress}%</Typography>
                <LinearProgress variant="determinate" value={data.progress} sx={{ height: 10, borderRadius: 999 }} />
                {(data.assessments || []).map((item: any) => (
                    <Box key={item.id} sx={{ bgcolor: 'white', p: 2.5, borderRadius: 2 }}>
                        <Typography variant="h6">{item.name}</Typography>
                        <Typography>{item.status} · {item.answered} / {item.total} answered</Typography>
                        <Button sx={{ mt: 1 }} onClick={() => navigate(`/vendor-assessment/${item.id}`)}>
                            {item.status === 'Submitted' ? 'View submission' : 'Continue assessment'}
                        </Button>
                    </Box>
                ))}
                <Button onClick={() => { localStorage.removeItem('vendorToken'); navigate('/vendor-assessment/activate'); }}>Sign out</Button>
            </Stack>
        </Box>
    );
}
