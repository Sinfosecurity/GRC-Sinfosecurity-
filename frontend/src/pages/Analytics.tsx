import { Box, Typography, Grid } from '@mui/material';
import {
    Assessment,
    Security,
    Warning,
    CheckCircle,
} from '@mui/icons-material';
import KPICard from '../components/Charts/KPICard';
import TrendChart from '../components/Charts/TrendChart';
import RiskHeatMap from '../components/Charts/RiskHeatMap';

// Mock data for KPI cards
const kpiData = {
    totalRisks: {
        value: 42,
        change: 12,
        sparkline: [35, 37, 38, 40, 39, 41, 42],
    },
    complianceRate: {
        value: 87,
        change: 5,
        sparkline: [78, 80, 82, 84, 85, 86, 87],
    },
    openIncidents: {
        value: 15,
        change: -20,
        sparkline: [22, 20, 19, 18, 17, 16, 15],
    },
    controlEffectiveness: {
        value: 92,
        change: 3,
        sparkline: [88, 89, 90, 90, 91, 91, 92],
    },
};

// Mock data for trend charts
const risksOverTime = [
    { date: '2024-07', value: 35 },
    { date: '2024-08', value: 38 },
    { date: '2024-09', value: 40 },
    { date: '2024-10', value: 39 },
    { date: '2024-11', value: 41 },
    { date: '2024-12', value: 42 },
];

const complianceTrend = [
    { date: '2024-07', value: 78 },
    { date: '2024-08', value: 82 },
    { date: '2024-09', value: 84 },
    { date: '2024-10', value: 85 },
    { date: '2024-11', value: 86 },
    { date: '2024-12', value: 87 },
];

const incidentTimeline = [
    { date: '2024-07', value: 22 },
    { date: '2024-08', value: 19 },
    { date: '2024-09', value: 18 },
    { date: '2024-10', value: 17 },
    { date: '2024-11', value: 16 },
    { date: '2024-12', value: 15 },
];

// Mock data for risk heat map
const riskMatrixData = [
    { likelihood: 5, impact: 5, count: 3, riskIds: ['R001', 'R002', 'R003'] },
    { likelihood: 5, impact: 4, count: 2, riskIds: ['R004', 'R005'] },
    { likelihood: 4, impact: 5, count: 1, riskIds: ['R006'] },
    { likelihood: 4, impact: 4, count: 5, riskIds: ['R007', 'R008', 'R009', 'R010', 'R011'] },
    { likelihood: 3, impact: 4, count: 4, riskIds: ['R012', 'R013', 'R014', 'R015'] },
    { likelihood: 3, impact: 3, count: 8, riskIds: ['R016', 'R017', 'R018', 'R019', 'R020', 'R021', 'R022', 'R023'] },
    { likelihood: 2, impact: 3, count: 6, riskIds: ['R024', 'R025', 'R026', 'R027', 'R028', 'R029'] },
    { likelihood: 2, impact: 2, count: 7, riskIds: ['R030', 'R031', 'R032', 'R033', 'R034', 'R035', 'R036'] },
    { likelihood: 1, impact: 2, count: 4, riskIds: ['R037', 'R038', 'R039', 'R040'] },
    { likelihood: 1, impact: 1, count: 2, riskIds: ['R041', 'R042'] },
];

export default function Analytics() {
    const handleRiskCellClick = (cell: any) => {
        console.log('Risk cell clicked:', cell);
        // In production, navigate to filtered risk list
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    Advanced Analytics
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Comprehensive insights and trend analysis for your GRC program
                </Typography>
            </Box>

            {/* KPI Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <KPICard
                        title="Total Risks"
                        value={kpiData.totalRisks.value}
                        change={kpiData.totalRisks.change}
                        sparklineData={kpiData.totalRisks.sparkline}
                        color="#667eea"
                        icon={<Assessment />}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <KPICard
                        title="Compliance Rate"
                        value={kpiData.complianceRate.value}
                        unit="%"
                        change={kpiData.complianceRate.change}
                        sparklineData={kpiData.complianceRate.sparkline}
                        color="#43e97b"
                        icon={<CheckCircle />}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <KPICard
                        title="Open Incidents"
                        value={kpiData.openIncidents.value}
                        change={kpiData.openIncidents.change}
                        sparklineData={kpiData.openIncidents.sparkline}
                        color="#f5576c"
                        icon={<Warning />}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <KPICard
                        title="Control Effectiveness"
                        value={kpiData.controlEffectiveness.value}
                        unit="%"
                        change={kpiData.controlEffectiveness.change}
                        sparklineData={kpiData.controlEffectiveness.sparkline}
                        color="#feca57"
                        icon={<Security />}
                    />
                </Grid>
            </Grid>

            {/* Trend Charts */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} lg={6}>
                    <TrendChart
                        title="Risks Over Time"
                        data={risksOverTime}
                        color="#667eea"
                        type="area"
                    />
                </Grid>
                <Grid item xs={12} lg={6}>
                    <TrendChart
                        title="Compliance Score Trend"
                        data={complianceTrend}
                        color="#43e97b"
                        type="line"
                    />
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                <Grid item xs={12} lg={6}>
                    <TrendChart
                        title="Incident Timeline"
                        data={incidentTimeline}
                        color="#f5576c"
                        type="area"
                    />
                </Grid>
                <Grid item xs={12} lg={6}>
                    <RiskHeatMap
                        title="Risk Matrix"
                        data={riskMatrixData}
                        onCellClick={handleRiskCellClick}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}
