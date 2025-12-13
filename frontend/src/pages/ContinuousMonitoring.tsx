import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Chip,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Switch,
    FormControlLabel,
    Alert,
    Tooltip,
} from '@mui/material';
import {
    PlayArrow,
    CheckCircle,
    Warning,
    Error,
    Refresh,
    TrendingUp,
    TrendingDown,
    Security,
    Speed,
} from '@mui/icons-material';

interface MonitoringCheck {
    id: string;
    name: string;
    category: string;
    description: string;
    frequency: string;
    enabled: boolean;
    lastCheck?: string;
    lastStatus?: 'pass' | 'fail' | 'warning';
}

interface ComplianceHealth {
    overall: number;
    byFramework: Record<string, number>;
    byCategory: Record<string, number>;
    trend: 'improving' | 'declining' | 'stable';
    lastUpdated: string;
}

interface Finding {
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    title: string;
    description: string;
    affectedResources: string[];
    remediation: string;
}

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'pass':
            return <CheckCircle sx={{ color: '#43e97b', fontSize: 24 }} />;
        case 'warning':
            return <Warning sx={{ color: '#fee140', fontSize: 24 }} />;
        case 'fail':
            return <Error sx={{ color: '#f5576c', fontSize: 24 }} />;
        default:
            return <Security sx={{ color: '#667eea', fontSize: 24 }} />;
    }
};

const getHealthColor = (score: number) => {
    if (score >= 90) return '#43e97b';
    if (score >= 75) return '#00f2fe';
    if (score >= 60) return '#fee140';
    return '#f5576c';
};

export default function ContinuousMonitoring() {
    const [checks, setChecks] = useState<MonitoringCheck[]>([]);
    const [health, setHealth] = useState<ComplianceHealth | null>(null);
    const [findings, setFindings] = useState<Finding[]>([]);
    const [loading, setLoading] = useState(false);
    const [runningChecks, setRunningChecks] = useState(false);

    useEffect(() => {
        fetchMonitoringData();
    }, []);

    const fetchMonitoringData = async () => {
        setLoading(true);
        try {
            // Mock data for now - will connect to API later
            const mockChecks: MonitoringCheck[] = [
                {
                    id: 'check_compliance_drift',
                    name: 'Compliance Drift Detection',
                    category: 'compliance',
                    description: 'Monitors for changes that may affect compliance status',
                    frequency: 'daily',
                    enabled: true,
                    lastCheck: new Date().toISOString(),
                    lastStatus: 'pass',
                },
                {
                    id: 'check_control_effectiveness',
                    name: 'Control Effectiveness Monitoring',
                    category: 'control',
                    description: 'Validates control effectiveness through automated testing',
                    frequency: 'daily',
                    enabled: true,
                    lastCheck: new Date(Date.now() - 3600000).toISOString(),
                    lastStatus: 'warning',
                },
                {
                    id: 'check_risk_thresholds',
                    name: 'Risk Threshold Monitoring',
                    category: 'risk',
                    description: 'Alerts when risk scores exceed defined thresholds',
                    frequency: 'hourly',
                    enabled: true,
                    lastCheck: new Date(Date.now() - 1800000).toISOString(),
                    lastStatus: 'pass',
                },
                {
                    id: 'check_security_posture',
                    name: 'Security Posture Assessment',
                    category: 'security',
                    description: 'Evaluates overall security posture',
                    frequency: 'daily',
                    enabled: true,
                    lastCheck: new Date(Date.now() - 7200000).toISOString(),
                    lastStatus: 'pass',
                },
                {
                    id: 'check_policy_compliance',
                    name: 'Policy Compliance Verification',
                    category: 'compliance',
                    description: 'Verifies adherence to organizational policies',
                    frequency: 'daily',
                    enabled: false,
                },
                {
                    id: 'check_access_control',
                    name: 'Access Control Monitoring',
                    category: 'security',
                    description: 'Monitors user access and privilege escalations',
                    frequency: 'hourly',
                    enabled: true,
                    lastCheck: new Date(Date.now() - 900000).toISOString(),
                    lastStatus: 'pass',
                },
            ];

            const mockHealth: ComplianceHealth = {
                overall: 92,
                byFramework: {
                    'ISO 27001': 92,
                    'SOC 2': 88,
                    'GDPR': 95,
                    'HIPAA': 90,
                },
                byCategory: {
                    'Access Control': 91,
                    'Data Protection': 93,
                    'Incident Management': 87,
                    'Risk Management': 89,
                },
                trend: 'stable',
                lastUpdated: new Date().toISOString(),
            };

            const mockFindings: Finding[] = [
                {
                    severity: 'medium',
                    category: 'Control',
                    title: 'Account Management below threshold',
                    description: 'Control effectiveness at 78%, below 80% threshold',
                    affectedResources: ['AC-02'],
                    remediation: 'Review and strengthen control implementation',
                },
            ];

            setChecks(mockChecks);
            setHealth(mockHealth);
            setFindings(mockFindings);
        } catch (error) {
            console.error('Error fetching monitoring data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRunChecks = async () => {
        setRunningChecks(true);
        try {
            // Simulate running checks
            await new Promise(resolve => setTimeout(resolve, 2000));
            await fetchMonitoringData();
            alert('Monitoring checks completed successfully!');
        } catch (error) {
            console.error('Error running checks:', error);
        } finally {
            setRunningChecks(false);
        }
    };

    const handleToggleCheck = (checkId: string) => {
        setChecks(prev =>
            prev.map(check =>
                check.id === checkId ? { ...check, enabled: !check.enabled } : check
            )
        );
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);

        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        Continuous Monitoring
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Real-time compliance health and automated monitoring
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={fetchMonitoringData}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<PlayArrow />}
                        onClick={handleRunChecks}
                        disabled={runningChecks}
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                            },
                        }}
                    >
                        {runningChecks ? 'Running...' : 'Run Checks Now'}
                    </Button>
                </Box>
            </Box>

            {/* Compliance Health Score */}
            {health && (
                <>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)', mb: 4 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Speed sx={{ fontSize: 40, color: getHealthColor(health.overall) }} />
                                    <Box>
                                        <Typography variant="h3" sx={{ fontWeight: 700, color: getHealthColor(health.overall) }}>
                                            {health.overall}%
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                            Overall Compliance Health
                                        </Typography>
                                    </Box>
                                </Box>
                                <Chip
                                    icon={health.trend === 'improving' ? <TrendingUp /> : health.trend === 'declining' ? <TrendingDown /> : undefined}
                                    label={health.trend.toUpperCase()}
                                    sx={{
                                        bgcolor: health.trend === 'improving' ? '#43e97b20' : health.trend === 'declining' ? '#f5576c20' : '#667eea20',
                                        color: health.trend === 'improving' ? '#43e97b' : health.trend === 'declining' ? '#f5576c' : '#667eea',
                                        fontWeight: 600,
                                    }}
                                />
                            </Box>

                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                By Framework
                            </Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                {Object.entries(health.byFramework).map(([framework, score]) => (
                                    <Grid item xs={12} sm={6} md={3} key={framework}>
                                        <Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2">{framework}</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 700, color: getHealthColor(score) }}>
                                                    {score}%
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={score}
                                                sx={{
                                                    height: 8,
                                                    borderRadius: 4,
                                                    bgcolor: 'rgba(255,255,255,0.1)',
                                                    '& .MuiLinearProgress-bar': {
                                                        background: `linear-gradient(90deg, ${getHealthColor(score)} 0%, ${getHealthColor(score)}cc 100%)`,
                                                    },
                                                }}
                                            />
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>

                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>
                                Last updated: {formatTime(health.lastUpdated)}
                            </Typography>
                        </CardContent>
                    </Card>

                    {/* Recent Findings */}
                    {findings.length > 0 && (
                        <Alert
                            severity="warning"
                            sx={{
                                mb: 4,
                                bgcolor: '#fee14020',
                                border: '1px solid #fee140',
                                '& .MuiAlert-icon': { color: '#fee140' },
                                color: 'white',
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                {findings.length} Finding(s) Require Attention
                            </Typography>
                            {findings.map((finding, idx) => (
                                <Typography key={idx} variant="body2" sx={{ mt: 0.5 }}>
                                    • {finding.title}
                                </Typography>
                            ))}
                        </Alert>
                    )}
                </>
            )}

            {/* Monitoring Checks */}
            <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                        Monitoring Checks
                    </Typography>
                    <TableContainer component={Paper} sx={{ bgcolor: 'transparent' }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Check Name</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Category</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Frequency</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Last Run</TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Enabled</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {checks.map(check => (
                                    <TableRow
                                        key={check.id}
                                        sx={{ '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.05)' } }}
                                    >
                                        <TableCell>
                                            <Tooltip title={check.lastStatus || 'Not run yet'}>
                                                {getStatusIcon(check.lastStatus || 'unknown')}
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>
                                                {check.name}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                                {check.description}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={check.category}
                                                size="small"
                                                sx={{
                                                    bgcolor: 'rgba(102, 126, 234, 0.2)',
                                                    color: '#667eea',
                                                    textTransform: 'capitalize',
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ color: 'white', textTransform: 'capitalize' }}>
                                            {check.frequency}
                                        </TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                            {check.lastCheck ? formatTime(check.lastCheck) : 'Never'}
                                        </TableCell>
                                        <TableCell>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={check.enabled}
                                                        onChange={() => handleToggleCheck(check.id)}
                                                        sx={{
                                                            '& .MuiSwitch-switchBase.Mui-checked': {
                                                                color: '#43e97b',
                                                            },
                                                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                                                backgroundColor: '#43e97b',
                                                            },
                                                        }}
                                                    />
                                                }
                                                label=""
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );
}

