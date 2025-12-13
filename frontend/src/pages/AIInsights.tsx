import { useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Chip,
    LinearProgress,
    List,
    ListItem,
} from '@mui/material';
import {
    Psychology,
    TrendingUp,
    Warning,
    CheckCircle,
    Lightbulb,
} from '@mui/icons-material';

// Mock AI insights data
const mockAIInsights = {
    riskPredictions: [
        {
            riskId: 'risk_1',
            title: 'Data Breach Risk',
            predictedSeverity: 'high',
            confidence: 87,
            trend: 'increasing',
        },
        {
            riskId: 'risk_2',
            title: 'Compliance Violation',
            predictedSeverity: 'critical',
            confidence: 92,
            trend: 'stable',
        },
    ],
    recommendations: [
        {
            id: 'rec_1',
            type: 'risk_mitigation',
            title: 'Implement Multi-Factor Authentication',
            description: 'Enable MFA for all user accounts to reduce unauthorized access risk by 99%',
            priority: 95,
            impact: 'High - Reduces security incidents by 60%',
        },
        {
            id: 'rec_2',
            type: 'compliance_improvement',
            title: 'Automate Compliance Reporting',
            description: 'Set up automated compliance reports',
            priority: 82,
            impact: 'Medium - Saves 20 hours/month',
        },
        {
            id: 'rec_3',
            type: 'process_optimization',
            title: 'Centralize Incident Response',
            description: 'Create unified incident response workflow',
            priority: 75,
            impact: 'Medium - Reduces MTTR by 40%',
        },
    ],
    gapAnalysis: {
        framework: 'ISO 27001',
        overallScore: 78,
        gaps: [
            { control: 'A.5.1', description: 'Information security policy', priority: 'high' },
            { control: 'A.8.8', description: 'Technical vulnerabilities', priority: 'medium' },
        ],
    },
};

export default function AIInsights() {
    const [insights] = useState(mockAIInsights);

    const getSeverityColor = (severity: string) => {
        const colors: Record<string, string> = {
            critical: '#f5576c',
            high: '#ff9800',
            medium: '#feca57',
            low: '#43e97b',
        };
        return colors[severity] || '#667eea';
    };

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            risk_mitigation: '#f5576c',
            compliance_improvement: '#667eea',
            process_optimization: '#43e97b',
        };
        return colors[type] || '#667eea';
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Psychology sx={{ color: '#667eea', fontSize: 32 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        AI-Powered Insights
                    </Typography>
                </Box>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Machine learning recommendations and predictions
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Risk Predictions */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)', height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <TrendingUp sx={{ color: '#ff9800' }} />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Risk Predictions
                                </Typography>
                            </Box>

                            {insights.riskPredictions.map((pred) => (
                                <Box
                                    key={pred.riskId}
                                    sx={{
                                        p: 2,
                                        mb: 2,
                                        bgcolor: '#0f1729',
                                        borderRadius: 2,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                            {pred.title}
                                        </Typography>
                                        <Chip
                                            label={pred.predictedSeverity.toUpperCase()}
                                            size="small"
                                            sx={{
                                                bgcolor: `${getSeverityColor(pred.predictedSeverity)}20`,
                                                color: getSeverityColor(pred.predictedSeverity),
                                                fontWeight: 600,
                                            }}
                                        />
                                    </Box>
                                    <Box sx={{ mb: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                                AI Confidence
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: '#43e97b', fontWeight: 600 }}>
                                                {pred.confidence}%
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={pred.confidence}
                                            sx={{
                                                height: 6,
                                                borderRadius: 3,
                                                bgcolor: 'rgba(67, 233, 123, 0.1)',
                                                '& .MuiLinearProgress-bar': { bgcolor: '#43e97b' },
                                            }}
                                        />
                                    </Box>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                        Trend: {pred.trend === 'increasing' ? '📈 Increasing' : pred.trend === 'decreasing' ? '📉 Decreasing' : '➡️ Stable'}
                                    </Typography>
                                </Box>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Gap Analysis */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)', height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <Warning sx={{ color: '#feca57' }} />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Gap Analysis
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {insights.gapAnalysis.framework}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#667eea', fontWeight: 600 }}>
                                        {insights.gapAnalysis.overallScore}%
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={insights.gapAnalysis.overallScore}
                                    sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        bgcolor: 'rgba(102, 126, 234, 0.1)',
                                        '& .MuiLinearProgress-bar': { bgcolor: '#667eea' },
                                    }}
                                />
                            </Box>

                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2, fontWeight: 600 }}>
                                Identified Gaps:
                            </Typography>
                            {insights.gapAnalysis.gaps.map((gap, idx) => (
                                <Box
                                    key={idx}
                                    sx={{
                                        p: 2,
                                        mb: 1.5,
                                        bgcolor: '#0f1729',
                                        borderRadius: 2,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {gap.control}
                                        </Typography>
                                        <Chip
                                            label={gap.priority.toUpperCase()}
                                            size="small"
                                            sx={{
                                                height: 20,
                                                fontSize: '0.7rem',
                                                bgcolor: gap.priority === 'high' ? '#ff980020' : '#feca5720',
                                                color: gap.priority === 'high' ? '#ff9800' : '#feca57',
                                            }}
                                        />
                                    </Box>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                        {gap.description}
                                    </Typography>
                                </Box>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>

                {/* AI Recommendations */}
                <Grid item xs={12}>
                    <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <Lightbulb sx={{ color: '#feca57' }} />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    AI Recommendations
                                </Typography>
                            </Box>

                            <List>
                                {insights.recommendations.map((rec) => (
                                    <ListItem
                                        key={rec.id}
                                        sx={{
                                            p: 2,
                                            mb: 2,
                                            bgcolor: '#0f1729',
                                            borderRadius: 2,
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            display: 'block',
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <CheckCircle sx={{ color: '#43e97b' }} />
                                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                    {rec.title}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Chip
                                                    label={`Priority: ${rec.priority}`}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: `${getTypeColor(rec.type)}20`,
                                                        color: getTypeColor(rec.type),
                                                    }}
                                                />
                                                <Chip
                                                    label={rec.type.replace('_', ' ').toUpperCase()}
                                                    size="small"
                                                    sx={{ bgcolor: '#667eea20', color: '#667eea' }}
                                                />
                                            </Box>
                                        </Box>
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                                            {rec.description}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#43e97b' }}>
                                            {rec.impact}
                                        </Typography>
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
