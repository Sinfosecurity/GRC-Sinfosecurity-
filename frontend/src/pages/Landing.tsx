import { useNavigate } from 'react-router-dom';
import { environmentLabel } from '../components/DevPreviewBanner';
import { Box, Button, Container, Typography, Grid, Stack, Card, CardContent, Avatar, TextField, CircularProgress } from '@mui/material';
import {
    Shield as ShieldIcon,
    Speed as SpeedIcon,
    AccountTree as DecisionIcon,
    Security as SecurityIcon,
    CheckCircle as CheckCircleIcon,
    ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Landing() {
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuth();
    const loginCardRef = useRef<HTMLDivElement | null>(null);
    const emailRef = useRef<HTMLInputElement | null>(null);

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
            setError(err.message || 'Unable to sign in');
        } finally {
            setIsLoading(false);
        }
    };

    const focusLogin = () => {
        loginCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        emailRef.current?.focus();
    };

    const handleLaunchDashboard = () => {
        if (isAuthenticated) {
            navigate('/dashboard');
            return;
        }
        focusLogin();
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
                                Supreme Risk
                            </Typography>
                            {environmentLabel() && (
                                <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 700 }}>
                                    {environmentLabel() === 'STAGING' ? 'STAGING' : 'DEVELOPMENT PREVIEW'}
                                </Typography>
                            )}
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
                                SUPREME GOVERNANCE PLATFORM
                            </Typography>
                            <Typography variant="h1" sx={{ mb: 3, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Govern Risk. Prove Compliance. <span className="text-gradient-primary">Make Better Decisions.</span>
                            </Typography>
                            <Typography variant="h5" sx={{ color: 'text.secondary', mb: 5, lineHeight: 1.6, fontWeight: 400 }}>
                                Supreme Risk turns third-party assessments, evidence, and findings into explainable scores and audit-traceable decision briefs.
                            </Typography>
                            <Stack direction="row" spacing={3}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={handleLaunchDashboard}
                                    endIcon={<ArrowForwardIcon />}
                                    sx={{
                                        fontSize: '1.1rem',
                                        py: 1.5,
                                        px: 4,
                                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    }}
                                >
                                    {isAuthenticated ? 'Launch Dashboard' : 'Sign In to Dashboard'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="large"
                                    onClick={() => navigate('/demo')}
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
                                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'white' }}>EXPLAINABLE RISK</Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Evidence-backed scoring</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'white' }}>DECISION READY</Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Audit-traceable approvals</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'white' }}>TENANT ISOLATED</Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Organization-scoped access</Typography>
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
                            <Card
                                id="landing-login"
                                ref={loginCardRef}
                                className="glass"
                                sx={{ position: 'relative', border: '1px solid rgba(255,255,255,0.1)', overflow: 'visible' }}
                            >
                                <CardContent sx={{ p: 4 }}>
                                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'white' }}>Welcome Back</Typography>
                                    {environmentLabel() && (
                                        <Typography variant="body2" sx={{ color: 'warning.main', mb: 1, fontWeight: 700 }}>
                                            {environmentLabel() === 'STAGING' ? 'SUPREME RISK — STAGING' : 'SUPREME RISK — DEVELOPMENT PREVIEW'}
                                        </Typography>
                                    )}
                                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                                        {environmentLabel() === 'STAGING'
                                            ? 'Sign in to the isolated staging organization'
                                            : environmentLabel() === 'DEVELOPMENT'
                                                ? 'Login to the local demo workspace'
                                                : 'Sign in to your organization workspace'}
                                    </Typography>

                                    <form onSubmit={handleLogin}>
                                        <Stack spacing={2}>
                                            <TextField
                                                fullWidth
                                                label="Email"
                                                variant="outlined"
                                                inputRef={emailRef}
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
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                            Use your organization credentials. Demo accounts are not accepted in production.
                                        </Typography>
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
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'white' }}>Audit-traceable</Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Decisions recorded with evidence</Typography>
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
                        The production path today is Supreme Third Party: vendors, assessments, evidence, findings, explainable risk, decision briefs, and reports.
                    </Typography>
                </Box>

                <Grid container spacing={4}>
                    {[
                        {
                            icon: <SpeedIcon fontSize="large" sx={{ color: '#6366f1' }} />,
                            title: 'Evidence-driven assessments',
                            desc: 'Run questionnaire assessments, attach evidence, and recalculate residual risk from recorded answers.'
                        },
                        {
                            icon: <DecisionIcon fontSize="large" sx={{ color: '#ec4899' }} />,
                            title: 'Defensible decision briefs',
                            desc: 'Generate a brief from the current score, record a human decision, and keep the snapshot immutable.'
                        },
                        {
                            icon: <SecurityIcon fontSize="large" sx={{ color: '#10b981' }} />,
                            title: 'Continuous monitoring workspace',
                            desc: 'Review monitoring signals when a provider is connected. Unavailable providers are shown as NOT_CONFIGURED.'
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
