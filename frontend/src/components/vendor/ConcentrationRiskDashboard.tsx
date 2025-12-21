/**
 * Concentration Risk Dashboard Component
 * OCC/FCA/EBA concentration risk analysis visualization
 */

import React, { useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Alert,
    Button,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    // Paper,
    LinearProgress,
} from '@mui/material';
import {
    Warning,
    CheckCircle,
    Error,
    Download,
    Refresh,
} from '@mui/icons-material';
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import api from '../../services/api';

interface ConcentrationAnalysis {
    spendConcentration: {
        topVendors: Array<{
            vendorId: string;
            vendorName: string;
            spend: number;
            percentage: number;
        }>;
        herfindahlIndex: number;
        top10Percentage: number;
    };
    categoryConcentration: {
        categories: Array<{
            category: string;
            vendorCount: number;
            percentage: number;
        }>;
    };
    geographicConcentration: {
        countries: Array<{
            country: string;
            vendorCount: number;
            percentage: number;
            geopoliticalRisk: string;
        }>;
    };
    singlePointsOfFailure: Array<{
        vendorId: string;
        vendorName: string;
        reason: string;
        criticality: string;
        mitigationRequired: boolean;
    }>;
    regulatoryStatus: 'PASS' | 'WARNING' | 'BREACH';
    recommendations: string[];
}

const ConcentrationRiskDashboard: React.FC = () => {
    const [analysis, setAnalysis] = useState<ConcentrationAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAnalysis();
    }, []);

    const fetchAnalysis = async () => {
        try {
            setLoading(true);
            const response = await api.get('/vendors/concentration-risk');
            setAnalysis(response.data.data);
            setError(null);
        } catch (err: any) {
            setError('Failed to load concentration risk analysis');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        await fetchAnalysis();
    };

    const handleExportReport = async () => {
        try {
            const response = await api.get('/vendors/concentration-risk/board-report', {
                responseType: 'blob',
                params: { format: 'pdf' },
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `concentration-risk-report-${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            setError('Failed to export report');
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, any> = {
            PASS: 'success',
            WARNING: 'warning',
            BREACH: 'error',
        };
        return colors[status] || 'default';
    };

    const getStatusIcon = (status: string) => {
        const icons: Record<string, any> = {
            PASS: <CheckCircle />,
            WARNING: <Warning />,
            BREACH: <Error />,
        };
        return icons[status];
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Concentration Risk Analysis
                </Typography>
                <LinearProgress />
            </Box>
        );
    }

    if (!analysis) {
        return null;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">
                    Concentration Risk Analysis
                </Typography>
                <Box>
                    <Button
                        startIcon={<Refresh />}
                        onClick={handleRefresh}
                        sx={{ mr: 1 }}
                    >
                        Refresh
                    </Button>
                    <Button
                        startIcon={<Download />}
                        variant="contained"
                        onClick={handleExportReport}
                    >
                        Export Board Report
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Regulatory Status */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getStatusIcon(analysis.regulatoryStatus)}
                            <Typography variant="h6" sx={{ ml: 1 }}>
                                Regulatory Compliance Status
                            </Typography>
                        </Box>
                        <Chip
                            label={analysis.regulatoryStatus}
                            color={getStatusColor(analysis.regulatoryStatus)}
                            size="medium"
                        />
                    </Box>
                    {analysis.regulatoryStatus === 'BREACH' && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            <strong>Regulatory Breach Detected</strong>
                            <br />
                            Concentration risk exceeds OCC/FCA/EBA thresholds. Immediate board notification and mitigation required.
                        </Alert>
                    )}
                    {analysis.regulatoryStatus === 'WARNING' && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            <strong>Warning: Approaching Concentration Limits</strong>
                            <br />
                            Proactive diversification recommended to avoid regulatory breach.
                        </Alert>
                    )}
                </CardContent>
            </Card>

            <Grid container spacing={3}>
                {/* Spend Concentration */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Spend Concentration
                            </Typography>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                                Herfindahl-Hirschman Index: <strong>{analysis.spendConcentration.herfindahlIndex.toFixed(0)}</strong>
                            </Typography>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                                Top 10 Vendors: <strong>{analysis.spendConcentration.top10Percentage.toFixed(1)}%</strong> of spend
                            </Typography>

                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={analysis.spendConcentration.topVendors.slice(0, 6)}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry) => `${entry.vendorName}: ${entry.percentage.toFixed(1)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="percentage"
                                    >
                                        {analysis.spendConcentration.topVendors.slice(0, 6).map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>

                            <TableContainer sx={{ mt: 2 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Vendor</TableCell>
                                            <TableCell align="right">Spend</TableCell>
                                            <TableCell align="right">%</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {analysis.spendConcentration.topVendors.slice(0, 10).map((vendor) => (
                                            <TableRow key={vendor.vendorId}>
                                                <TableCell>{vendor.vendorName}</TableCell>
                                                <TableCell align="right">
                                                    ${vendor.spend.toLocaleString()}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {vendor.percentage.toFixed(1)}%
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Category Concentration */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Category Concentration
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={analysis.categoryConcentration.categories}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="category" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="percentage" fill="#8884d8" name="% of Vendors" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Geographic Concentration */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Geographic Concentration
                            </Typography>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Country</TableCell>
                                            <TableCell align="right">Vendors</TableCell>
                                            <TableCell align="right">%</TableCell>
                                            <TableCell>Risk</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {analysis.geographicConcentration.countries.map((country) => (
                                            <TableRow key={country.country}>
                                                <TableCell>{country.country}</TableCell>
                                                <TableCell align="right">{country.vendorCount}</TableCell>
                                                <TableCell align="right">
                                                    {country.percentage.toFixed(1)}%
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={country.geopoliticalRisk}
                                                        size="small"
                                                        color={
                                                            country.geopoliticalRisk === 'High'
                                                                ? 'error'
                                                                : country.geopoliticalRisk === 'Medium'
                                                                ? 'warning'
                                                                : 'success'
                                                        }
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

                {/* Single Points of Failure */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Single Points of Failure
                            </Typography>
                            {analysis.singlePointsOfFailure.length === 0 ? (
                                <Alert severity="success">
                                    No single points of failure detected
                                </Alert>
                            ) : (
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Vendor</TableCell>
                                                <TableCell>Reason</TableCell>
                                                <TableCell>Criticality</TableCell>
                                                <TableCell>Action</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {analysis.singlePointsOfFailure.map((spof) => (
                                                <TableRow key={spof.vendorId}>
                                                    <TableCell>{spof.vendorName}</TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2">{spof.reason}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={spof.criticality}
                                                            size="small"
                                                            color={
                                                                spof.criticality === 'CRITICAL'
                                                                    ? 'error'
                                                                    : 'warning'
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        {spof.mitigationRequired && (
                                                            <Chip
                                                                label="Mitigation Required"
                                                                size="small"
                                                                color="error"
                                                            />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Recommendations */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Risk Mitigation Recommendations
                            </Typography>
                            {analysis.recommendations.map((rec, index) => (
                                <Alert key={index} severity="info" sx={{ mb: 1 }}>
                                    {rec}
                                </Alert>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ConcentrationRiskDashboard;
