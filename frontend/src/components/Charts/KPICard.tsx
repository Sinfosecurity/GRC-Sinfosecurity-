import { Box, Card, CardContent, Typography } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface KPICardProps {
    title: string;
    value: number | string;
    unit?: string;
    change?: number; // Percentage change
    changeLabel?: string;
    sparklineData?: number[];
    color: string;
    icon: React.ReactNode;
}

export default function KPICard({
    title,
    value,
    unit = '',
    change,
    changeLabel = 'vs last month',
    sparklineData,
    color,
    icon,
}: KPICardProps) {
    const getTrendIcon = () => {
        if (!change) return <TrendingFlat sx={{ fontSize: 20 }} />;
        if (change > 0) return <TrendingUp sx={{ fontSize: 20 }} />;
        return <TrendingDown sx={{ fontSize: 20 }} />;
    };

    const getTrendColor = () => {
        if (!change) return 'rgba(255,255,255,0.5)';
        // For some metrics, up is good (e.g., compliance), for others, down is good (e.g., risks)
        // We'll use green for positive, red for negative by default
        if (change > 0) return '#43e97b';
        return '#f5576c';
    };

    return (
        <Card
            sx={{
                bgcolor: '#1a1f3a',
                border: '1px solid rgba(255,255,255,0.1)',
                position: 'relative',
                overflow: 'hidden',
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 24px ${color}40`,
                },
            }}
        >
            {/* Gradient Bar */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: `linear-gradient(90deg, ${color} 0%, ${color}80 100%)`,
                }}
            />

            <CardContent sx={{ pt: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                        {title}
                    </Typography>
                    <Box
                        sx={{
                            bgcolor: `${color}20`,
                            p: 1,
                            borderRadius: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color,
                        }}
                    >
                        {icon}
                    </Box>
                </Box>

                {/* Value */}
                <Typography
                    variant="h3"
                    sx={{
                        fontWeight: 700,
                        mb: 1,
                        background: `linear-gradient(135deg, #ffffff 0%, ${color} 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    {value}
                    {unit && (
                        <Typography component="span" variant="h5" sx={{ ml: 0.5, color: 'rgba(255,255,255,0.5)' }}>
                            {unit}
                        </Typography>
                    )}
                </Typography>

                {/* Change Indicator */}
                {change !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                color: getTrendColor(),
                                fontSize: '0.875rem',
                                fontWeight: 600,
                            }}
                        >
                            {getTrendIcon()}
                            <span style={{ marginLeft: 4 }}>{Math.abs(change)}%</span>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            {changeLabel}
                        </Typography>
                    </Box>
                )}

                {/* Sparkline */}
                {sparklineData && sparklineData.length > 0 && (
                    <Box sx={{ mt: 2, height: 40, ml: -2, mr: -2 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sparklineData.map((val, idx) => ({ value: val, index: idx }))}>
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke={color}
                                    strokeWidth={2}
                                    dot={false}
                                    animationDuration={500}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}
