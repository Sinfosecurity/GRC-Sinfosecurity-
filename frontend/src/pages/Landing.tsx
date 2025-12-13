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
    Grid,
    Chip,
    alpha,
} from '@mui/material';
import {
    Security,
    Assessment,
    Verified,
    Speed,
    ArrowForward,
    CheckCircle,
    TrendingUp,
    CloudDone,
    Shield,
} from '@mui/icons-material';

export default function Landing() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (email && password) {
            navigate('/dashboard');
        }
    };

    const features = [
        {
            icon: <Assessment sx={{ fontSize: 48 }} />,
            title: 'Risk Management',
            description: 'AI-powered risk assessment with automated scoring and predictive analytics',
            color: '#f5576c',
            gradient: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
        },
        {
            icon: <Verified sx={{ fontSize: 48 }} />,
            title: 'Compliance Automation',
            description: 'ISO 27001, GDPR, SOC 2, HIPAA frameworks with automated gap analysis',
            color: '#43e97b',
            gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        },
        {
            icon: <Speed sx={{ fontSize: 48 }} />,
            title: 'Real-time Analytics',
            description: 'Interactive dashboards with drill-down capabilities and custom reports',
            color: '#667eea',
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        },
        {
            icon: <Security sx={{ fontSize: 48 }} />,
            title: 'Enterprise Security',
            description: 'Role-based access control, audit trails, and SOC 2 Type II certified',
            color: '#feca57',
            gradient: 'linear-gradient(135deg, #feca57 0%, #fa709a 100%)',
        },
    ];

    const stats = [
        { value: '99.9%', label: 'Uptime SLA' },
        { value: '10K+', label: 'Compliance Checks' },
        { value: '24/7', label: 'Monitoring' },
        { value: 'SOC 2', label: 'Type II Certified' },
    ];

    const benefits = [
        'Automated compliance workflows',
        'Real-time risk monitoring',
        'Vendor risk assessments',
        'AI-powered insights',
        'Custom reporting engine',
        'Audit trail management',
    ];

    return (
        <Box sx={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0a0e27 0%, #1a1f3a 50%, #0a0e27 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Animated background elements */}
            <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: 'hidden',
                zIndex: 0,
            }}>
                <Box sx={{
                    position: 'absolute',
                    top: '10%',
                    left: '5%',
                    width: '300px',
                    height: '300px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(102,126,234,0.2) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                    animation: 'float 20s ease-in-out infinite',
                }} />
                <Box sx={{
                    position: 'absolute',
                    top: '60%',
                    right: '10%',
                    width: '400px',
                    height: '400px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(118,75,162,0.15) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                    animation: 'float 25s ease-in-out infinite reverse',
                }} />
            </Box>

            <style>
                {`
                    @keyframes float {
                        0%, 100% { transform: translate(0, 0) scale(1); }
                        33% { transform: translate(30px, -30px) scale(1.1); }
                        66% { transform: translate(-20px, 20px) scale(0.9); }
                    }
                    @keyframes fadeInUp {
                        from {
                            opacity: 0;
                            transform: translateY(30px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    @keyframes shimmer {
                        0% { background-position: -1000px 0; }
                        100% { background-position: 1000px 0; }
                    }
                `}
            </style>

            <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
                {/* Header/Nav */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 3,
                }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 32px rgba(102,126,234,0.4)',
                        }}>
                            <Shield sx={{ fontSize: 32, color: 'white' }} />
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.5px' }}>
                            Sinfosecurity GRC
                        </Typography>
                    </Stack>
                    <Stack direction="row" spacing={2}>
                        <Chip
                            icon={<CloudDone sx={{ fontSize: 16 }} />}
                            label="SOC 2 Type II"
                            sx={{
                                bgcolor: alpha('#43e97b', 0.1),
                                color: '#43e97b',
                                border: '1px solid rgba(67,233,123,0.3)',
                                fontWeight: 600,
                            }}
                        />
                        <Chip
                            icon={<Security sx={{ fontSize: 16 }} />}
                            label="ISO 27001"
                            sx={{
                                bgcolor: alpha('#667eea', 0.1),
                                color: '#667eea',
                                border: '1px solid rgba(102,126,234,0.3)',
                                fontWeight: 600,
                            }}
                        />
                    </Stack>
                </Box>

                {/* Hero Section */}
                <Grid container spacing={6} sx={{ py: { xs: 6, md: 10 }, alignItems: 'center' }}>
                    <Grid item xs={12} md={7}>
                        <Box sx={{
                            animation: 'fadeInUp 0.8s ease-out',
                        }}>
                            <Chip
                                label="Enterprise Governance, Risk & Compliance"
                                sx={{
                                    mb: 3,
                                    bgcolor: alpha('#667eea', 0.1),
                                    color: '#667eea',
                                    border: '1px solid rgba(102,126,234,0.3)',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                }}
                            />
                            <Typography
                                variant="h1"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: { xs: '2.5rem', md: '4rem' },
                                    lineHeight: 1.1,
                                    mb: 3,
                                    background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    letterSpacing: '-2px',
                                }}
                            >
                                Compliance Management, Simplified
                            </Typography>
                            <Typography
                                variant="h5"
                                sx={{
                                    color: 'rgba(255,255,255,0.7)',
                                    mb: 4,
                                    lineHeight: 1.6,
                                    fontWeight: 400,
                                }}
                            >
                                Automate risk assessments, maintain continuous compliance, and secure your
                                organization with AI-powered insights and real-time monitoring.
                            </Typography>

                            {/* Stats */}
                            <Grid container spacing={3} sx={{ mb: 4 }}>
                                {stats.map((stat, index) => (
                                    <Grid item xs={6} sm={3} key={index}>
                                        <Box>
                                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#667eea', mb: 0.5 }}>
                                                {stat.value}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                                {stat.label}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>

                            {/* Benefits list */}
                            <Grid container spacing={1.5} sx={{ mb: 4 }}>
                                {benefits.map((benefit, index) => (
                                    <Grid item xs={12} sm={6} key={index}>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <CheckCircle sx={{ color: '#43e97b', fontSize: 20 }} />
                                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                                {benefit}
                                            </Typography>
                                        </Stack>
                                    </Grid>
                                ))}
                            </Grid>

                            <Button
                                variant="outlined"
                                size="large"
                                endIcon={<ArrowForward />}
                                onClick={() => navigate('/dashboard')}
                                sx={{
                                    borderColor: 'rgba(255,255,255,0.3)',
                                    color: 'white',
                                    px: 4,
                                    py: 1.5,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    '&:hover': {
                                        borderColor: '#667eea',
                                        bgcolor: alpha('#667eea', 0.1),
                                    },
                                }}
                            >
                                Explore Live Demo
                            </Button>
                        </Box>
                    </Grid>

                    {/* Login Card - Enhanced */}
                    <Grid item xs={12} md={5}>
                        <Card
                            sx={{
                                bgcolor: alpha('#1a1f3a', 0.6),
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 4,
                                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                                animation: 'fadeInUp 1s ease-out',
                                position: 'relative',
                                overflow: 'visible',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '3px',
                                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%)',
                                    backgroundSize: '200% 100%',
                                    animation: 'shimmer 3s linear infinite',
                                },
                            }}
                        >
                            <CardContent sx={{ p: 4 }}>
                                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                                    Sign In
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 4 }}>
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
                                            placeholder="admin@sinfosecurity.com"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    color: 'white',
                                                    bgcolor: alpha('#ffffff', 0.05),
                                                    borderRadius: 2,
                                                    '& fieldset': {
                                                        borderColor: 'rgba(255,255,255,0.15)',
                                                        borderWidth: 1.5,
                                                    },
                                                    '&:hover fieldset': {
                                                        borderColor: 'rgba(255,255,255,0.3)',
                                                    },
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: '#667eea',
                                                    },
                                                },
                                                '& .MuiInputLabel-root': {
                                                    color: 'rgba(255,255,255,0.6)',
                                                    '&.Mui-focused': { color: '#667eea' },
                                                },
                                            }}
                                        />
                                        <TextField
                                            fullWidth
                                            label="Password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            placeholder="••••••••"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    color: 'white',
                                                    bgcolor: alpha('#ffffff', 0.05),
                                                    borderRadius: 2,
                                                    '& fieldset': {
                                                        borderColor: 'rgba(255,255,255,0.15)',
                                                        borderWidth: 1.5,
                                                    },
                                                    '&:hover fieldset': {
                                                        borderColor: 'rgba(255,255,255,0.3)',
                                                    },
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: '#667eea',
                                                    },
                                                },
                                                '& .MuiInputLabel-root': {
                                                    color: 'rgba(255,255,255,0.6)',
                                                    '&.Mui-focused': { color: '#667eea' },
                                                },
                                            }}
                                        />
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            size="large"
                                            fullWidth
                                            sx={{
                                                py: 1.8,
                                                borderRadius: 2,
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                textTransform: 'none',
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                boxShadow: '0 8px 24px rgba(102,126,234,0.4)',
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                                                    boxShadow: '0 12px 32px rgba(102,126,234,0.5)',
                                                    transform: 'translateY(-2px)',
                                                },
                                            }}
                                        >
                                            Sign In
                                        </Button>

                                        <Box sx={{ textAlign: 'center', position: 'relative' }}>
                                            <Box sx={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: 0,
                                                right: 0,
                                                height: '1px',
                                                bgcolor: 'rgba(255,255,255,0.1)',
                                            }} />
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    position: 'relative',
                                                    bgcolor: alpha('#1a1f3a', 0.8),
                                                    px: 2,
                                                    color: 'rgba(255,255,255,0.5)',
                                                }}
                                            >
                                                or
                                            </Typography>
                                        </Box>

                                        <Button
                                            onClick={() => navigate('/dashboard')}
                                            variant="outlined"
                                            fullWidth
                                            endIcon={<ArrowForward />}
                                            sx={{
                                                py: 1.5,
                                                borderRadius: 2,
                                                borderColor: 'rgba(255,255,255,0.2)',
                                                color: 'rgba(255,255,255,0.9)',
                                                fontWeight: 600,
                                                textTransform: 'none',
                                                '&:hover': {
                                                    borderColor: '#667eea',
                                                    bgcolor: alpha('#667eea', 0.1),
                                                },
                                            }}
                                        >
                                            Continue as Demo User
                                        </Button>
                                    </Stack>
                                </form>

                                <Box sx={{
                                    mt: 4,
                                    pt: 3,
                                    borderTop: '1px solid rgba(255,255,255,0.1)',
                                    bgcolor: alpha('#000000', 0.2),
                                    mx: -4,
                                    px: 4,
                                    pb: -4,
                                    mb: -4,
                                    borderRadius: '0 0 16px 16px',
                                }}>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1.5, fontWeight: 600 }}>
                                        Demo Credentials:
                                    </Typography>
                                    <Stack spacing={0.5}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#667eea' }} />
                                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>
                                                admin@sinfosecurity.com
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#667eea' }} />
                                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>
                                                demo123
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Features Section */}
                <Box sx={{ py: 8 }}>
                    <Box sx={{ textAlign: 'center', mb: 6 }}>
                        <Chip
                            label="Platform Features"
                            sx={{
                                mb: 2,
                                bgcolor: alpha('#43e97b', 0.1),
                                color: '#43e97b',
                                border: '1px solid rgba(67,233,123,0.3)',
                                fontWeight: 600,
                            }}
                        />
                        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
                            Everything you need for GRC
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', maxWidth: 600, mx: 'auto' }}>
                            Comprehensive tools to manage governance, assess risks, and maintain compliance across your organization
                        </Typography>
                    </Box>

                    <Grid container spacing={3}>
                        {features.map((feature, index) => (
                            <Grid item xs={12} sm={6} md={3} key={index}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        bgcolor: alpha('#1a1f3a', 0.6),
                                        backdropFilter: 'blur(10px)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 3,
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: '3px',
                                            background: feature.gradient,
                                        },
                                        '&:hover': {
                                            transform: 'translateY(-8px)',
                                            boxShadow: `0 20px 40px ${alpha(feature.color, 0.3)}`,
                                            borderColor: alpha(feature.color, 0.5),
                                        },
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Box
                                            sx={{
                                                width: 64,
                                                height: 64,
                                                borderRadius: 2,
                                                background: alpha(feature.color, 0.1),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: feature.color,
                                                mb: 2,
                                            }}
                                        >
                                            {feature.icon}
                                        </Box>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                                            {feature.title}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                                            {feature.description}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                {/* CTA Section */}
                <Box sx={{
                    py: 8,
                    textAlign: 'center',
                    borderRadius: 4,
                    background: 'linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%)',
                    border: '1px solid rgba(102,126,234,0.2)',
                    mb: 8,
                }}>
                    <TrendingUp sx={{ fontSize: 48, color: '#43e97b', mb: 2 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
                        Ready to transform your compliance?
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', mb: 4, maxWidth: 500, mx: 'auto' }}>
                        Join leading organizations using Sinfosecurity GRC to automate compliance and reduce risk
                    </Typography>
                    <Button
                        variant="contained"
                        size="large"
                        endIcon={<ArrowForward />}
                        onClick={() => navigate('/dashboard')}
                        sx={{
                            px: 5,
                            py: 1.8,
                            fontSize: '1rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                            color: '#000',
                            boxShadow: '0 8px 24px rgba(67,233,123,0.4)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #38f9d7 0%, #43e97b 100%)',
                                boxShadow: '0 12px 32px rgba(67,233,123,0.5)',
                                transform: 'translateY(-2px)',
                            },
                        }}
                    >
                        Start Free Trial
                    </Button>
                </Box>

                {/* Footer */}
                <Box sx={{
                    py: 4,
                    textAlign: 'center',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                        © 2024 Sinfosecurity. All rights reserved. | SOC 2 Type II Certified | ISO 27001 Compliant
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
}
