import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Chip, Container, Stack, Typography } from '@mui/material';

const SECTIONS = [
    {
        title: 'Dashboard',
        body: 'Attention queue for vendors that need assessment, evidence, or a recorded decision.',
        sample: '3 vendors need review in this demo workspace.',
    },
    {
        title: 'Vendors',
        body: 'Tenant-scoped third-party inventory with inherent and residual risk.',
        sample: 'Northwind Cloud — residual 49, band MEDIUM.',
    },
    {
        title: 'Explainable risk',
        body: 'Scores show contributing factors. AI does not own the residual number.',
        sample: 'Criticality +80, control haircut −64, methodology supreme-risk-1.1.0.',
    },
    {
        title: 'Assessments',
        body: 'Questionnaire responses are saved to the database and can complete a due-diligence cycle.',
        sample: 'INITIAL_DUE_DILIGENCE — COMPLETED.',
    },
    {
        title: 'Evidence',
        body: 'Uploads are checksummed, tenant-prefixed, and blocked from download until a scan is CLEAN.',
        sample: 'soc2-summary.pdf — scan NOT_CONFIGURED — download blocked.',
    },
    {
        title: 'Findings',
        body: 'Issues carry a corrective action plan, validation, and close workflow.',
        sample: 'Missing encryption evidence — CAP recorded — CLOSED.',
    },
    {
        title: 'Decision brief',
        body: 'A human records APPROVE, REJECT, or RISK_ACCEPTED. The score snapshot does not change.',
        sample: 'Decision APPROVE. Residual snapshot 49 unchanged.',
    },
    {
        title: 'Reports',
        body: 'Executive, scorecard, assessment, findings, monitoring, and board exports download from live tenant data.',
        sample: 'PDF / CSV / XLSX / PPTX generated from this organization only.',
    },
];

export default function ProductDemo() {
    const navigate = useNavigate();

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6 }}>
            <Container maxWidth="md">
                <Stack spacing={1} sx={{ mb: 3 }}>
                    <Chip label="DEMO WORKSPACE" color="warning" sx={{ alignSelf: 'flex-start', fontWeight: 800 }} />
                    <Chip label="NOT PRODUCTION DATA" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
                </Stack>
                <Typography variant="overline" sx={{ letterSpacing: '0.12em', fontWeight: 800 }}>
                    Supreme Risk product tour
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                    Read-only walkthrough of the third-party path
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 720 }}>
                    This page uses labelled demo copy only. It cannot write production data, switch tenants,
                    open other organizations, or reach administration.
                </Typography>
                <Stack spacing={2}>
                    {SECTIONS.map((section) => (
                        <Card key={section.title} sx={{ bgcolor: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <CardContent>
                                <Typography variant="h6" sx={{ fontWeight: 800 }}>{section.title}</Typography>
                                <Typography sx={{ mt: 1 }}>{section.body}</Typography>
                                <Typography variant="body2" color="warning.main" sx={{ mt: 1, fontWeight: 700 }}>
                                    DEMO DATA: {section.sample}
                                </Typography>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
                    <Button variant="contained" onClick={() => navigate('/login')}>Sign in to a real workspace</Button>
                    <Button variant="outlined" onClick={() => navigate('/')}>Back to landing</Button>
                </Stack>
            </Container>
        </Box>
    );
}
