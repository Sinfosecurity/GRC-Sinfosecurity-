import { useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Chip,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    TrendingUp,
    TrendingDown,
    Warning,
    Timeline,
} from '@mui/icons-material';

// Mock predictive data
const mockPredictions = {
    riskForecasts: [
        { period: '30 days', severity: 'high', confidence: 85, trend: 'increasing' },
        { period: '60 days', severity: 'high', confidence: 80, trend: 'increasing' },
        { period: '90 days', severity: 'critical', confidence: 75, trend: 'increasing' },
    ],
    complianceForecasts: [
        { framework: 'ISO 27001', current: 78, predicted: 84, change: +6 },
        { framework: 'SOC 2', current: 85, predicted: 89, change: +4 },
        { framework: 'GDPR', current: 72, predicted: 78, change: +6 },
    ],
    anomalies: [
        {
            id: 1,
            type: 'Risk Spike',
            severity: 'high',
            description: 'Unusual increase in high-severity risks (3x normal)',
            confidence: 92,
        },
        {
            id: 2,
            type: 'Compliance Drop',
            severity: 'medium',
            description: 'GDPR compliance score dropped 15% in 7 days',
            confidence: 87,
        },
        {
            id: 3,
            type: 'Unusual Access',
            severity: 'critical',
            description: 'Abnormal access patterns to documents (5x normal)',
            confidence: 95,
        },
    ],
};

export default function PredictiveAnalytics() {
    const [predictions] = useState(mockPredictions);

    const getSeverityColor = (severity: string) => {
        const colors: Record<string, string> = {
            critical: '#f5576c',
            high: '#ff9800',
            medium: '#feca57',
            low: '#43e97b',
        };
        return colors[severity] || '#667eea';
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Timeline sx={{ color: '#667eea', fontSize: 32 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        Predictive Analytics
                    </Typography>
                </Box>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    ML-powered forecasting and anomaly detection
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Risk Trend Forecast */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <TrendingUp sx={{ color: '#ff9800' }} />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Risk Trend Forecast
                                </Typography>
                            </Box>

                            {predictions.riskForecasts.map((forecast, idx) => (
                                <Box
                                    key={idx}
                                    sx={{
                                        p: 2,
                                        mb: 2,
                                        bgcolor: '#0f1729',
                                        borderRadius: 2,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {forecast.period}
                                        </Typography>
                                        <Chip
                                            label={forecast.severity.toUpperCase()}
                                            size="small"
                                            sx={{
                                                bgcolor: `${getSeverityColor(forecast.severity)}20`,
                                                color: getSeverityColor(forecast.severity),
                                                fontWeight: 600,
                                            }}
                                        />
                                    </Box>
                                    <Box sx={{ mb: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                                Prediction Confidence
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                                {forecast.confidence}%
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={forecast.confidence}
                                            sx={{
                                                height: 6,
                                                borderRadius: 3,
                                                bgcolor: 'rgba(102, 126, 234, 0.1)',
                                                '& .MuiLinearProgress-bar': { bgcolor: '#667eea' },
                                            }}
                                        />
                                    </Box>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                        Trend: {forecast.trend === 'increasing' ? '📈' : '📉'} {forecast.trend}
                                    </Typography>
                                </Box>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Compliance Forecast */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <TrendingDown sx={{ color: '#43e97b' }} />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Compliance Forecast (6 months)
                                </Typography>
                            </Box>

                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                                Framework
                                            </TableCell>
                                            <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                                Current
                                            </TableCell>
                                            <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                                Predicted
                                            </TableCell>
                                            <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                                Change
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {predictions.complianceForecasts.map((forecast) => (
                                            <TableRow key={forecast.framework}>
                                                <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)', fontWeight: 600 }}>
                                                    {forecast.framework}
                                                </TableCell>
                                                <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                                    {forecast.current}%
                                                </TableCell>
                                                <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                                    {forecast.predicted}%
                                                </TableCell>
                                                <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                                    <Chip
                                                        label={`+${forecast.change}%`}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: '#43e97b20',
                                                            color: '#43e97b',
                                                            fontWeight: 600,
                                                        }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Anomaly Detection */}
                <Grid item xs={12}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <Warning sx={{ color: '#f5576c' }} />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Detected Anomalies
                                </Typography>
                            </Box>

                            {predictions.anomalies.map((anomaly) => (
                                <Box
                                    key={anomaly.id}
                                    sx={{
                                        p: 2,
                                        mb: 2,
                                        bgcolor: '#0f1729',
                                        borderRadius: 2,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                                        <Box>
                                            <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                                {anomaly.type}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                                {anomaly.description}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={anomaly.severity.toUpperCase()}
                                            size="small"
                                            sx={{
                                                bgcolor: `${getSeverityColor(anomaly.severity)}20`,
                                                color: getSeverityColor(anomaly.severity),
                                                fontWeight: 600,
                                            }}
                                        />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                            Detection Confidence: {anomaly.confidence}%
                                        </Typography>
                                        <LinearProgress
                                            variant="determinate"
                                            value={anomaly.confidence}
                                            sx={{
                                                height: 4,
                                                borderRadius: 2,
                                                bgcolor: 'rgba(245, 87, 108, 0.1)',
                                                '& .MuiLinearProgress-bar': { bgcolor: '#f5576c' },
                                                mt: 0.5,
                                            }}
                                        />
                                    </Box>
                                </Box>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
