import { useEffect, useState } from 'react';
import { Box, Typography, Grid, Chip } from '@mui/material';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { healthCheck, risksAPI, complianceAPI } from '../services/api';

// Mock data as fallback
const complianceDataMock = [
    { name: 'GDPR', score: 92 },
    { name: 'HIPAA', score: 78 },
    { name: 'CCPA', score: 85 },
    { name: 'ISO 27001', score: 88 },
    { name: 'TISAX', score: 75 },
];

const riskTrendData = [
    { month: 'Jan', critical: 4, high: 12, medium: 28 },
    { month: 'Feb', critical: 3, high: 10, medium: 25 },
    { month: 'Mar', critical: 2, high: 8, medium: 22 },
    { month: 'Apr', critical: 1, high: 6, medium: 20 },
    { month: 'May', critical: 1, high: 5, medium: 18 },
    { month: 'Jun', critical: 0, high: 4, medium: 15 },
];

const incidentTypes = [
    { name: 'Data Breach', value: 12, color: '#f5576c' },
    { name: 'Policy Violation', value: 28, color: '#fa709a' },
    { name: 'Access Control', value: 35, color: '#fee140' },
    { name: 'Other', value: 25, color: '#667eea' },
];

export default function Dashboard() {
    const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
    const [complianceData, setComplianceData] = useState(complianceDataMock);
    const [risksCount, setRisksCount] = useState(47);

    useEffect(() => {
        // Check backend health
        const checkBackend = async () => {
            const health = await healthCheck();
            if (health) {
                setBackendStatus('connected');

                // Fetch real data
                try {
                    const risksResponse = await risksAPI.getAll();
                    if (risksResponse.data.data) {
                        setRisksCount(risksResponse.data.data.length);
                    }
                } catch (error) {
                    console.log('Using mock data');
                }

                try {
                    const complianceResponse = await complianceAPI.getFrameworks();
                    if (complianceResponse.data.data) {
                        setComplianceData(complianceResponse.data.data.map((item: any) => ({
                            name: item.name,
                            score: item.score
                        })));
                    }
                } catch (error) {
                    console.log('Using mock compliance data');
                }
            } else {
                setBackendStatus('disconnected');
            }
        };

        checkBackend();
    }, []);

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        Welcome back, Admin! 👋
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Here's an overview of your compliance and risk posture
                    </Typography>
                </Box>
                <Chip
                    label={backendStatus === 'connected' ? '● Backend Connected' : backendStatus === 'disconnected' ? '○ Backend Offline' : '○ Checking...'}
                    sx={{
                        bgcolor: backendStatus === 'connected' ? 'rgba(67, 233, 123, 0.2)' : 'rgba(245, 87, 108, 0.2)',
                        color: backendStatus === 'connected' ? '#43e97b' : '#f5576c',
                        fontWeight: 600,
                    }}
                />
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {[
                    { label: 'Overall Compliance', value: '87%', color: '#667eea' },
                    { label: 'Active Risks', value: risksCount.toString(), color: '#f5576c' },
                    { label: 'Open Incidents', value: '8', color: '#fee140' },
                    { label: 'Controls Implemented', value: '234', color: '#00f2fe' },
                ].map((stat) => (
                    <Grid item xs={12} sm={6} md={3} key={stat.label}>
                        <Box
                            sx={{
                                bgcolor: '#1a1f3a',
                                p: 3,
                                borderRadius: 2,
                                border: '1px solid rgba(255,255,255,0.1)',
                                transition: 'transform 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: `0 8px 24px ${stat.color}40`,
                                },
                            }}
                        >
                            <Typography variant="h3" sx={{ fontWeight: 700, color: stat.color, mb: 1 }}>
                                {stat.value}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                {stat.label}
                            </Typography>
                        </Box>
                    </Grid>
                ))}
            </Grid>

            {/* Charts Grid */}
            <Grid container spacing={3}>
                {/* Compliance Scores */}
                <Grid item xs={12} md={8}>
                    <Box sx={{ bgcolor: '#1a1f3a', p: 3, borderRadius: 2 }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                            Compliance Framework Scores
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={complianceData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" />
                                <YAxis stroke="rgba(255,255,255,0.7)" />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1f3a',
                                        border: '1px solid rgba(102, 126, 234, 0.2)',
                                        borderRadius: 8,
                                        color: 'white',
                                    }}
                                />
                                <Bar dataKey="score" fill="#667eea" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </Grid>

                {/* Incident Distribution */}
                <Grid item xs={12} md={4}>
                    <Box sx={{ bgcolor: '#1a1f3a', p: 3, borderRadius: 2, height: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                            Incident Distribution
                        </Typography>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={incidentTypes}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {incidentTypes.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1f3a',
                                        border: '1px solid rgba(102, 126, 234, 0.2)',
                                        borderRadius: 8,
                                        color: 'white',
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </Box>
                </Grid>

                {/* Risk Trend */}
                <Grid item xs={12}>
                    <Box sx={{ bgcolor: '#1a1f3a', p: 3, borderRadius: 2 }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                            Risk Trend Analysis
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={riskTrendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="month" stroke="rgba(255,255,255,0.7)" />
                                <YAxis stroke="rgba(255,255,255,0.7)" />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1f3a',
                                        border: '1px solid rgba(102, 126, 234, 0.2)',
                                        borderRadius: 8,
                                        color: 'white',
                                    }}
                                />
                                <Line type="monotone" dataKey="critical" stroke="#f5576c" strokeWidth={3} dot={{ r: 4 }} />
                                <Line type="monotone" dataKey="high" stroke="#fa709a" strokeWidth={3} dot={{ r: 4 }} />
                                <Line type="monotone" dataKey="medium" stroke="#fee140" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}
