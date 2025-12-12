import { useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Add, TrendingUp, TrendingDown } from '@mui/icons-material';

const mockRisks = [
  { id: 1, title: 'Unauthorized Data Access', category: 'Cybersecurity', likelihood: 4, impact: 5, score: 20, status: 'Identified', owner: 'John Doe' },
  { id: 2, title: 'SQL Injection Vulnerability', category: 'Cybersecurity', likelihood: 3, impact: 5, score: 15, status: 'Mitigated', owner: 'Jane Smith' },
  { id: 3, title: 'GDPR Non-Compliance', category: 'Compliance', likelihood: 2, impact: 4, score: 8, status: 'Assessed', owner: 'Mike Johnson' },
  { id: 4, title: 'Insider Threat', category: 'Operational', likelihood: 2, impact: 5, score: 10, status: 'Identified', owner: 'Sarah Williams' },
  { id: 5, title: 'Data Breach Risk', category: 'Data Privacy', likelihood: 3, impact: 5, score: 15, status: 'Accepted', owner: 'Tom Brown' },
];

const getRiskColor = (score: number) => {
  if (score >= 15) return '#f5576c'; // Critical/High
  if (score >= 10) return '#fa709a'; // High
  if (score >= 5) return '#fee140'; // Medium
  return '#43e97b'; // Low
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'Identified': '#667eea',
    'Assessed': '#00f2fe',
    'Mitigated': '#43e97b',
    'Accepted': '#fee140',
    'Closed': '#888',
  };
  return colors[status] || '#667eea';
};

export default function RiskManagement() {
  const [risks] = useState(mockRisks);

  // Calculate stats
  const criticalRisks = risks.filter(r => r.score >= 15).length;
  const highRisks = risks.filter(r => r.score >= 10 && r.score < 15).length;
  const totalRiskScore = risks.reduce((sum, r) => sum + r.score, 0);
  const avgRiskScore = (totalRiskScore / risks.length).toFixed(1);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Risk Management
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Identify, assess, and mitigate organizational risks
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
            },
          }}
        >
          New Risk Assessment
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: '#f5576c', fontWeight: 700 }}>
                {criticalRisks}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Critical Risks
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: '#fa709a', fontWeight: 700 }}>
                {highRisks}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                High Risks
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: '#667eea', fontWeight: 700 }}>
                {risks.length}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Total Risks
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: '#00f2fe', fontWeight: 700 }}>
                {avgRiskScore}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Avg Risk Score
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Risks Table */}
      <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Risk Register
          </Typography>
          <TableContainer component={Paper} sx={{ bgcolor: 'transparent' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Risk</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Category</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Likelihood</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Impact</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Score</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Owner</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {risks.map((risk) => (
                  <TableRow
                    key={risk.id}
                    sx={{
                      '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.05)' },
                      cursor: 'pointer',
                    }}
                  >
                    <TableCell sx={{ color: 'white' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {risk.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={risk.category}
                        size="small"
                        sx={{ bgcolor: 'rgba(102, 126, 234, 0.2)', color: '#667eea' }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'white' }}>{risk.likelihood}/5</TableCell>
                    <TableCell sx={{ color: 'white' }}>{risk.impact}/5</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ color: getRiskColor(risk.score), fontWeight: 700 }}>
                          {risk.score}
                        </Typography>
                        {risk.score >= 15 ? <TrendingUp sx={{ color: '#f5576c', fontSize: 20 }} /> :
                          <TrendingDown sx={{ color: '#43e97b', fontSize: 20 }} />}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={risk.status}
                        size="small"
                        sx={{
                          bgcolor: `${getStatusColor(risk.status)}20`,
                          color: getStatusColor(risk.status),
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>{risk.owner}</TableCell>
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
