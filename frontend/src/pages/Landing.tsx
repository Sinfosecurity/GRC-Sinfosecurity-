import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Typography, Grid, Stack, Card, CardContent, Avatar, TextField, CircularProgress } from '@mui/material';
import {
    Shield as ShieldIcon,
    Speed as SpeedIcon,
    Psychology as AIIcon,
    Security as SecurityIcon,
    CheckCircle as CheckCircleIcon,
    ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Landing() {
    const navigate = useNavigate();
    const { login } = useAuth();

    // Login state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError('');
            setIsLoading(true);
            await login(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError('Login failed. For demo use: admin@sinfosecurity.com / demo123');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: 'background.default',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Background Gradients */}
            <Box sx={{
                position: 'absolute',
                top: '-20%',
                left: '-10%',
                width: '60%',
                height: '60%',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0) 70%)',
                zIndex: 0,
                pointerEvents: 'none',
            }} />
            <Box sx={{
                position: 'absolute',
                bottom: '-20%',
                right: '-10%',
                width: '60%',
                height: '60%',
                background: 'radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, rgba(15, 23, 42, 0) 70%)',
                zIndex: 0,
                pointerEvents: 'none',
            }} />

            {/* Navbar */}
            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{
                            bgcolor: 'transparent',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                        }}>
                            <ShieldIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
                                Sinfosecurity
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                GRC Platform
                            </Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={2}>
                        <Button color="inherit" onClick={() => navigate('/login')}>Sign In</Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => navigate('/register')}
                            sx={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                px: 3
                            }}
                        >
                            Get Started
                        </Button>
                    </Stack>
                </Stack>
            </Container>

            {/* Hero Section */}
            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pt: 8, pb: 15 }}>
                <Grid container spacing={8} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <Box className="animate-fade-in">
                            <Typography
                                variant="overline"
                                sx={{
                                    color: 'secondary.main',
                                    fontWeight: 700,
                                    letterSpacing: '0.1em',
                                    mb: 2,
                                    display: 'block'
                                }}
                            >
                                NEXT GEN GRC PLATFORM
                            </Typography>
                            <Typography variant="h1" sx={{ mb: 3, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Secure Your Future with <span className="text-gradient-primary">Intelligent GRC</span>
                            </Typography>
                            <Typography variant="h5" sx={{ color: 'text.secondary', mb: 5, lineHeight: 1.6, fontWeight: 400 }}>
                                Streamline compliance, manage risks, and automate controls with our AI-powered platform designed for modern enterprises.
                            </Typography>
                            <Stack direction="row" spacing={3}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={() => navigate('/dashboard')}
                                    endIcon={<ArrowForwardIcon />}
                                    sx={{
                                        fontSize: '1.1rem',
                                        py: 1.5,
                                        px: 4,
                                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    }}
                                >
                                    Launch Dashboard
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="large"
                                    sx={{
                                        fontSize: '1.1rem',
                                        py: 1.5,
                                        px: 4,
                                        borderColor: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        '&:hover': {
                                            borderColor: 'white',
                                            bgcolor: 'rgba(255,255,255,0.05)'
                                        }
                                    }}
                                >
                                    View Demo
                                </Button>
                            </Stack>

                            <Stack direction="row" spacing={4} sx={{ mt: 8 }}>
                                <Box>
                                    <Typography variant="h3" sx={{ fontWeight: 700, color: 'white' }}>500+</Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Enterprise Clients</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="h3" sx={{ fontWeight: 700, color: 'white' }}>99.9%</Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Uptime SLA</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="h3" sx={{ fontWeight: 700, color: 'white' }}>24/7</Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Expert Support</Typography>
                                </Box>
                            </Stack>
                        </Box>
                    </Grid>

                    {/* Hero Login/Card Preview */}
                    <Grid item xs={12} md={6}>
                        <Box sx={{ position: 'relative' }} className="animate-fade-in">
                            <Box sx={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                                filter: 'blur(60px)',
                                opacity: 0.2,
                                borderRadius: '50%',
                            }} />

                            {/* Login Card */}
                            <Card className="glass" sx={{ position: 'relative', border: '1px solid rgba(255,255,255,0.1)', overflow: 'visible' }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'white' }}>Welcome Back</Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>Login to your GRC Dashboard</Typography>

                                    <form onSubmit={handleLogin}>
                                        <Stack spacing={2}>
                                            <TextField
                                                fullWidth
                                                label="Email"
                                                variant="outlined"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.05)' } }}
                                            />
                                            <TextField
                                                fullWidth
                                                label="Password"
                                                type="password"
                                                variant="outlined"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.05)' } }}
                                            />
                                            {error && <Typography color="error" variant="caption">{error}</Typography>}
                                            <Button
                                                fullWidth
                                                variant="contained"
                                                size="large"
                                                type="submit"
                                                disabled={isLoading}
                                                sx={{
                                                    mt: 1,
                                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                                    height: 48
                                                }}
                                            >
                                                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Log In'}
                                            </Button>
                                        </Stack>
                                    </form>

                                    <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                                            Demo Credentials:
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="caption" sx={{ color: 'white', fontFamily: 'monospace', bgcolor: 'rgba(255,255,255,0.1)', px: 1, py: 0.5, borderRadius: 1 }}>
                                                admin@sinfosecurity.com
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'white', fontFamily: 'monospace', bgcolor: 'rgba(255,255,255,0.1)', px: 1, py: 0.5, borderRadius: 1 }}>
                                                demo123
                                            </Typography>
                                        </Stack>
                                    </Box>
                                </CardContent>

                                {/* Floating Badge */}
                                <Card sx={{
                                    position: 'absolute',
                                    bottom: -30,
                                    right: -30,
                                    maxWidth: 220,
                                    bgcolor: '#1e293b',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                                }} className="hover-lift">
                                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, '&:last-child': { pb: 2 } }}>
                                        <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                                            <CheckCircleIcon />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'white' }}>Audit Ready</Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>ISO 27001 Compliant</Typography>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Card>
                        </Box>
                    </Grid>
                </Grid>
            </Container>

            {/* Features Section */}
            <Container maxWidth="lg" sx={{ py: 15, position: 'relative', zIndex: 1 }}>
                <Box sx={{ textAlign: 'center', mb: 10 }}>
                    <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.1em' }}>
                        POWERFUL FEATURES
                    </Typography>
                    <Typography variant="h2" sx={{ mt: 2, mb: 3, fontWeight: 700 }}>
                        Everything you need to <span className="text-gradient-secondary">stay compliant</span>
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'text.secondary', maxWidth: 800, mx: 'auto' }}>
                        Our platform provides a comprehensive suite of tools to manage your Governance, Risk, and Compliance programs effectively.
                    </Typography>
                </Box>

                <Grid container spacing={4}>
                    {[
                        {
                            icon: <SpeedIcon fontSize="large" sx={{ color: '#6366f1' }} />,
                            title: 'Automated Workflows',
                            desc: 'Streamline your compliance processes with intelligent automation and innovative workflow tools.'
                        },
                        {
                            icon: <AIIcon fontSize="large" sx={{ color: '#ec4899' }} />,
                            title: 'AI-Powered Insights',
                            desc: 'Leverage machine learning to predict risks and identify control gaps before they become incidents.'
                        },
                        {
                            icon: <SecurityIcon fontSize="large" sx={{ color: '#10b981' }} />,
                            title: 'Real-time Monitoring',
                            desc: 'Continuous monitoring of your control environment with instant alerts and dashboard visualization.'
                        }
                    ].map((feature, index) => (
                        <Grid item xs={12} md={4} key={index}>
                            <Card className="glass hover-lift" sx={{ height: '100%', p: 2 }}>
                                <CardContent>
                                    <Box sx={{
                                        width: 60,
                                        height: 60,
                                        borderRadius: 2,
                                        bgcolor: 'rgba(255,255,255,0.03)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mb: 3
                                    }}>
                                        {feature.icon}
                                    </Box>
                                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: 'white' }}>
                                        {feature.title}
                                    </Typography>
                                    <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                                        {feature.desc}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
}
