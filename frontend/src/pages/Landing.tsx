import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    TextField,
    Button,
    Card,
    CardContent,
    Stack,
    Avatar,
    Grid,
} from '@mui/material';
import {
    Security,
    Assessment,
    Verified,
    Speed,
} from '@mui/icons-material';

export default function Landing() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // In production, validate credentials with backend
        // For now, just navigate to dashboard
        if (email && password) {
            navigate('/dashboard');
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
            color: 'white',
        }}>
            {/* Hero Section */}
            <Box sx={{
                pt: 8,
                pb: 6,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}>
                <Container maxWidth="lg">
                    <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 3 }}>
                        <Avatar sx={{ width: 64, height: 64, bgcolor: 'rgba(255,255,255,0.2)' }}>
                            <Security sx={{ fontSize: 40 }} />
                        </Avatar>
                        <Box>
                            <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                Sinfosecurity GRC
                            </Typography>
                            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                                Enterprise Governance, Risk & Compliance Platform
                            </Typography>
                        </Box>
                    </Stack>
                    <Typography variant="h6" sx={{ maxWidth: 600, color: 'rgba(255,255,255,0.95)' }}>
                        Streamline your compliance management, automate risk assessments, and maintain
                        continuous control over your security posture.
                    </Typography>
                </Container>
            </Box>

            <Container maxWidth="lg" sx={{ py: 8 }}>
                <Grid container spacing={6}>
                    {/* Features */}
                    <Grid item xs={12} md={7}>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
                            Why Choose Sinfosecurity GRC?
                        </Typography>

                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)', height: '100%' }}>
                                    <CardContent>
                                        <Assessment sx={{ fontSize: 40, color: '#f5576c', mb: 2 }} />
                                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                            Risk Management
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                            AI-powered risk assessment with automated scoring and predictive analytics
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)', height: '100%' }}>
                                    <CardContent>
                                        <Verified sx={{ fontSize: 40, color: '#43e97b', mb: 2 }} />
                                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                            Compliance Automation
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                            ISO 27001, GDPR, SOC 2, HIPAA frameworks with automated gap analysis
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)', height: '100%' }}>
                                    <CardContent>
                                        <Speed sx={{ fontSize: 40, color: '#667eea', mb: 2 }} />
                                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                            Real-time Analytics
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                            Interactive dashboards with drill-down capabilities and custom reports
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)', height: '100%' }}>
                                    <CardContent>
                                        <Security sx={{ fontSize: 40, color: '#feca57', mb: 2 }} />
                                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                            Enterprise Security
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                            Role-based access control, audit trails, and SOC 2 Type II certified
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Grid>

                    {/* Login Card */}
                    <Grid item xs={12} md={5}>
                        <Card sx={{
                            bgcolor: '#1a1f3a',
                            border: '1px solid rgba(255,255,255,0.1)',
                            position: 'sticky',
                            top: 20,
                        }}>
                            <CardContent sx={{ p: 4 }}>
                                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                                    Sign In
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 4 }}>
                                    Access your GRC dashboard
                                </Typography>

                                <form onSubmit={handleLogin}>
                                    <Stack spacing={3}>
                                        <TextField
                                            fullWidth
                                            label="Email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    color: 'white',
                                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                                                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                                                },
                                                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                                            }}
                                        />
                                        <TextField
                                            fullWidth
                                            label="Password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    color: 'white',
                                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                                                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                                                },
                                                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                                            }}
                                        />
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            size="large"
                                            fullWidth
                                            sx={{
                                                py: 1.5,
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                '&:hover': {
                                                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                                                },
                                            }}
                                        >
                                            Sign In
                                        </Button>

                                        <Box sx={{ textAlign: 'center' }}>
                                            <Button
                                                onClick={() => navigate('/dashboard')}
                                                sx={{ color: 'rgba(255,255,255,0.7)', textTransform: 'none' }}
                                            >
                                                Continue as Demo User →
                                            </Button>
                                        </Box>
                                    </Stack>
                                </form>

                                <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1 }}>
                                        Demo Credentials:
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>
                                        Email: admin@sinfosecurity.com
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>
                                        Password: demo123
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Container>

            {/* Footer */}
            <Box sx={{
                py: 4,
                textAlign: 'center',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.5)',
            }}>
                <Typography variant="body2">
                    © 2024 Sinfosecurity. All rights reserved. | SOC 2 Type II Certified
                </Typography>
            </Box>
        </Box>
    );
}
