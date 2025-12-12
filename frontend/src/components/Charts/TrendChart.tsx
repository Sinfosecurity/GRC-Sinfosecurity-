import { Card, CardContent, Typography, Box, Select, MenuItem, FormControl } from '@mui/material';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useState } from 'react';

interface DataPoint {
    date: string;
    value: number;
    secondary?: number;
}

interface TrendChartProps {
    title: string;
    data: DataPoint[];
    color: string;
    secondaryColor?: string;
    dataKey?: string;
    secondaryDataKey?: string;
    type?: 'line' | 'area';
    showLegend?: boolean;
}

export default function TrendChart({
    title,
    data,
    color,
    secondaryColor,
    dataKey = 'value',
    secondaryDataKey,
    type = 'line',
    showLegend = false,
}: TrendChartProps) {
    const [timeRange, setTimeRange] = useState('30d');

    // Filter data based on time range
    const getFilteredData = () => {
        const ranges: Record<string, number> = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '1y': 365,
        };

        if (timeRange === 'all') return data;

        const days = ranges[timeRange] || 30;
        return data.slice(-days);
    };

    const customTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <Box
                    sx={{
                        bgcolor: '#0f1729',
                        border: `1px solid ${color}40`,
                        borderRadius: 1,
                        p: 1.5,
                        boxShadow: `0 4px 12px ${color}20`,
                    }}
                >
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', mb: 0.5 }}>
                        {label}
                    </Typography>
                    {payload.map((entry: any, index: number) => (
                        <Typography
                            key={index}
                            variant="body2"
                            sx={{ color: entry.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                            <Box
                                sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    bgcolor: entry.color,
                                }}
                            />
                            {entry.name}: {entry.value}
                        </Typography>
                    ))}
                </Box>
            );
        }
        return null;
    };

    return (
        <Card
            sx={{
                bgcolor: '#1a1f3a',
                border: '1px solid rgba(255,255,255,0.1)',
                height: '100%',
            }}
        >
            <CardContent>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {title}
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <Select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(255,255,255,0.2)',
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: color,
                                },
                            }}
                        >
                            <MenuItem value="7d">7 Days</MenuItem>
                            <MenuItem value="30d">30 Days</MenuItem>
                            <MenuItem value="90d">90 Days</MenuItem>
                            <MenuItem value="1y">1 Year</MenuItem>
                            <MenuItem value="all">All Time</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                {/* Chart */}
                <ResponsiveContainer width="100%" height={300}>
                    {type === 'line' ? (
                        <LineChart data={getFilteredData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis
                                dataKey="date"
                                stroke="rgba(255,255,255,0.5)"
                                style={{ fontSize: '0.75rem' }}
                            />
                            <YAxis
                                stroke="rgba(255,255,255,0.5)"
                                style={{ fontSize: '0.75rem' }}
                            />
                            <Tooltip content={customTooltip} />
                            {showLegend && <Legend />}
                            <Line
                                type="monotone"
                                dataKey={dataKey}
                                stroke={color}
                                strokeWidth={2}
                                dot={{ fill: color, r: 4 }}
                                activeDot={{ r: 6 }}
                                name="Primary"
                            />
                            {secondaryDataKey && secondaryColor && (
                                <Line
                                    type="monotone"
                                    dataKey={secondaryDataKey}
                                    stroke={secondaryColor}
                                    strokeWidth={2}
                                    dot={{ fill: secondaryColor, r: 4 }}
                                    activeDot={{ r: 6 }}
                                    name="Secondary"
                                />
                            )}
                        </LineChart>
                    ) : (
                        <AreaChart data={getFilteredData()}>
                            <defs>
                                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis
                                dataKey="date"
                                stroke="rgba(255,255,255,0.5)"
                                style={{ fontSize: '0.75rem' }}
                            />
                            <YAxis
                                stroke="rgba(255,255,255,0.5)"
                                style={{ fontSize: '0.75rem' }}
                            />
                            <Tooltip content={customTooltip} />
                            {showLegend && <Legend />}
                            <Area
                                type="monotone"
                                dataKey={dataKey}
                                stroke={color}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill={`url(#gradient-${color})`}
                                name="Primary"
                            />
                        </AreaChart>
                    )}
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
