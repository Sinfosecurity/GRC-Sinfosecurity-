import { Card, CardContent, Typography, Box, Tooltip } from '@mui/material';
import { useState } from 'react';

interface RiskCell {
    likelihood: number;
    impact: number;
    count: number;
    riskIds?: string[];
}

interface RiskHeatMapProps {
    title: string;
    data: RiskCell[];
    onCellClick?: (cell: RiskCell) => void;
}

export default function RiskHeatMap({ title, data, onCellClick }: RiskHeatMapProps) {
    const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

    const getCellData = (likelihood: number, impact: number): RiskCell | undefined => {
        return data.find((cell) => cell.likelihood === likelihood && cell.impact === impact);
    };

    const getCellColor = (likelihood: number, impact: number): string => {
        const riskScore = likelihood * impact;

        if (riskScore >= 20) return '#f5576c'; // Critical (Red)
        if (riskScore >= 12) return '#ff9800'; // High (Orange)
        if (riskScore >= 6) return '#feca57'; // Medium (Yellow)
        if (riskScore >= 3) return '#43e97b'; // Low (Green)
        return '#38f9d7'; // Very Low (Cyan)
    };

    const getRiskLevel = (likelihood: number, impact: number): string => {
        const riskScore = likelihood * impact;

        if (riskScore >= 20) return 'Critical';
        if (riskScore >= 12) return 'High';
        if (riskScore >= 6) return 'Medium';
        if (riskScore >= 3) return 'Low';
        return 'Very Low';
    };

    const levels = [5, 4, 3, 2, 1];
    const impactLabels = ['Catastrophic', 'Major', 'Moderate', 'Minor', 'Negligible'];
    const likelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];

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
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                    {title}
                </Typography>

                {/* Heat Map */}
                <Box>
                    {/* Y-Axis Label (Impact) */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'rgba(255,255,255,0.7)',
                                fontWeight: 600,
                                transform: 'rotate(-90deg)',
                                width: 60,
                                textAlign: 'center',
                            }}
                        >
                            IMPACT
                        </Typography>

                        <Box sx={{ flex: 1 }}>
                            {/* Grid */}
                            {levels.map((yLevel, yIdx) => (
                                <Box key={yLevel} sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                                    {/* Y-Axis Labels */}
                                    <Box sx={{ width: 100, display: 'flex', alignItems: 'center' }}>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
                                            {impactLabels[yIdx]}
                                        </Typography>
                                    </Box>

                                    {/* Cells */}
                                    {levels.reverse().map((xLevel) => {
                                        const cellData = getCellData(xLevel, yLevel);
                                        const color = getCellColor(xLevel, yLevel);
                                        const count = cellData?.count || 0;
                                        const isHovered = hoveredCell?.x === xLevel && hoveredCell?.y === yLevel;

                                        return (
                                            <Tooltip
                                                key={`${xLevel}-${yLevel}`}
                                                title={
                                                    <Box>
                                                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                                            {getRiskLevel(xLevel, yLevel)} Risk
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ display: 'block' }}>
                                                            Likelihood: {likelihoodLabels[xLevel - 1]}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ display: 'block' }}>
                                                            Impact: {impactLabels[yIdx]}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                                                            Risks: {count}
                                                        </Typography>
                                                    </Box>
                                                }
                                                arrow
                                            >
                                                <Box
                                                    sx={{
                                                        flex: 1,
                                                        aspectRatio: '1/1',
                                                        bgcolor: `${color}${count > 0 ? '' : '20'}`,
                                                        border: `2px solid ${isHovered ? color : 'rgba(255,255,255,0.1)'}`,
                                                        borderRadius: 1,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: count > 0 ? 'pointer' : 'default',
                                                        transition: 'all 0.2s',
                                                        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                                                        '&:hover': {
                                                            transform: count > 0 ? 'scale(1.1)' : 'scale(1)',
                                                            boxShadow: count > 0 ? `0 4px 12px ${color}60` : 'none',
                                                            zIndex: 1,
                                                        },
                                                    }}
                                                    onMouseEnter={() => setHoveredCell({ x: xLevel, y: yLevel })}
                                                    onMouseLeave={() => setHoveredCell(null)}
                                                    onClick={() => count > 0 && onCellClick && cellData && onCellClick(cellData)}
                                                >
                                                    {count > 0 && (
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontWeight: 700,
                                                                color: '#fff',
                                                                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                                            }}
                                                        >
                                                            {count}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Tooltip>
                                        );
                                    })}
                                </Box>
                            ))}

                            {/* X-Axis Labels */}
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, ml: '100px' }}>
                                {likelihoodLabels.reverse().map((label) => (
                                    <Box key={label} sx={{ flex: 1, textAlign: 'center' }}>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
                                            {label.slice(0, 4)}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>

                            {/* X-Axis Label */}
                            <Typography
                                variant="caption"
                                sx={{
                                    color: 'rgba(255,255,255,0.7)',
                                    fontWeight: 600,
                                    textAlign: 'center',
                                    display: 'block',
                                    mt: 1,
                                }}
                            >
                                LIKELIHOOD
                            </Typography>
                        </Box>
                    </Box>

                    {/* Legend */}
                    <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {[
                            { color: '#38f9d7', label: 'Very Low' },
                            { color: '#43e97b', label: 'Low' },
                            { color: '#feca57', label: 'Medium' },
                            { color: '#ff9800', label: 'High' },
                            { color: '#f5576c', label: 'Critical' },
                        ].map((item) => (
                            <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box
                                    sx={{
                                        width: 12,
                                        height: 12,
                                        bgcolor: item.color,
                                        borderRadius: 0.5,
                                    }}
                                />
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                    {item.label}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}
