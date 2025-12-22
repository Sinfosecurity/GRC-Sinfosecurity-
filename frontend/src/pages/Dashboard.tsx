import { useEffect, useState } from 'react';
import { Box, Typography, Grid, Chip, Card, CardContent, CardHeader, IconButton } from '@mui/material';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MoreVert, Refresh } from '@mui/icons-material';
import { healthCheck } from '../services/api';

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
    { name: 'Policy Violation', value: 28, color: '#ec4899' },
    { name: 'Access Control', value: 35, color: '#f59e0b' },
    { name: 'Other', value: 25, color: '#6366f1' },
];

export default function Dashboard() {
    const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
    const [complianceData] = useState(complianceDataMock);
    const [risksCount] = useState(47);

    useEffect(() => {
        const checkBackend = async () => {
            const health = await healthCheck();
            setBackendStatus(health ? 'connected' : 'disconnected');
        };
        checkBackend();
    }, []);

    return (
        <Box sx={{ maxWidth: 1600, margin: '0 auto' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 5 }}>
                <Box>
                    <Typography variant="h3" className="text-gradient-primary" sx={{ mb: 1 }}>
                        Dashboard
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                        Real-time overview of your GRC posture
                    </Typography>
                </Box>
                <Chip
                    label={backendStatus === 'connected' ? '● System Online' : backendStatus === 'disconnected' ? '○ System Offline' : '○ Connectivity Check...'}
                    sx={{
                        bgcolor: backendStatus === 'connected' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: backendStatus === 'connected' ? '#10b981' : '#ef4444',
                        fontWeight: 600,
                        border: `1px solid ${backendStatus === 'connected' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    }}
                />
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {[
                    { label: 'Compliance Score', value: '87%', color: '#6366f1', trend: '+2.4%' },
                    { label: 'Active Risks', value: risksCount.toString(), color: '#ec4899', trend: '-12%' },
                    { label: 'Open Incidents', value: '8', color: '#f59e0b', trend: '-3' },
                    { label: 'Controls Active', value: '234', color: '#10b981', trend: '+5' },
                ].map((stat) => (
                    <Grid item xs={12} sm={6} md={3} key={stat.label}>
                        <Card className="hover-lift glass">
                            <CardContent sx={{ p: 4 }}>
                                <Typography variant="h2" sx={{ fontWeight: 700, color: stat.color, mb: 1, letterSpacing: '-0.02em' }}>
                                    {stat.value}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                        {stat.label}
                                    </Typography>
                                    <Chip
                                        label={stat.trend}
                                        size="small"
                                        sx={{
                                            bgcolor: `${stat.color}20`,
                                            color: stat.color,
                                            fontWeight: 600,
                                            borderRadius: 1
                                        }}
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Charts Grid */}
            <Grid container spacing={3}>
                {/* Compliance Framework Scores */}
                <Grid item xs={12} md={8}>
                    <Card className="glass" sx={{ height: '100%', minHeight: 400 }}>
                        <CardHeader
                            title="Compliance Frameworks"
                            action={
                                <IconButton color="inherit" size="small"><MoreVert /></IconButton>
                            }
                            sx={{ pb: 0, '& .MuiCardHeader-title': { fontWeight: 600 } }}
                        />
                        <CardContent sx={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={complianceData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="rgba(255,255,255,0.4)"
                                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="rgba(255,255,255,0.4)"
                                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: '#1e293b',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: 12,
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                                            color: 'white',
                                        }}
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    />
                                    <Bar dataKey="score" fill="url(#colorGradient)" radius={[6, 6, 0, 0]}>
                                        {complianceData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#8b5cf6'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Incident Distribution */}
                <Grid item xs={12} md={4}>
                    <Card className="glass" sx={{ height: '100%', minHeight: 400 }}>
                        <CardHeader
                            title="Incidents"
                            sx={{ pb: 0, '& .MuiCardHeader-title': { fontWeight: 600 } }}
                        />
                        <CardContent sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={incidentTypes}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {incidentTypes.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            background: '#1e293b',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: 8,
                                            color: 'white',
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Risk Trend */}
                <Grid item xs={12}>
                    <Card className="glass">
                        <CardHeader
                            title="Risk Trends"
                            action={<IconButton size="small"><Refresh /></IconButton>}
                            sx={{ pb: 0, '& .MuiCardHeader-title': { fontWeight: 600 } }}
                        />
                        <CardContent sx={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={riskTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        stroke="rgba(255,255,255,0.4)"
                                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        stroke="rgba(255,255,255,0.4)"
                                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: '#1e293b',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: 8,
                                            color: 'white',
                                        }}
                                    />
                                    <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 8 }} />
                                    <Line type="monotone" dataKey="high" stroke="#ec4899" strokeWidth={3} dot={false} />
                                    <Line type="monotone" dataKey="medium" stroke="#f59e0b" strokeWidth={3} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
