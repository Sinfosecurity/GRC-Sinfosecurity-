import React, { useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Add, TrendingUp, TrendingDown } from '@mui/icons-material';

const mockRisks = [
  { id: 1, title: 'Unauthorized Data Access', category: 'Cybersecurity', likelihood: 4, impact: 5, score: 20, status: 'Identified', owner: 'John Doe' },
  { id: 2, title: 'SQL Injection Vulnerability', category: 'Cybersecurity', likelihood: 3, impact: 5, score: 15, status: 'Mitigated', owner: 'Jane Smith' },
  { id: 3, title: 'GDPR Non-Compliance', category: 'Compliance', likelihood: 2, impact: 4, score: 8, status: 'Assessed', owner: 'Mike Johnson' },
  { id: 4, title: 'Insider Threat', category: 'Operational', likelihood: 2, impact: 5, score: 10, status: 'Identified', owner: 'Sarah Williams' },
  { id: 5, title: 'Data Breach Risk', category: 'Data Privacy', likelihood: 3, impact: 5, score: 15, status: 'Accepted', owner: 'Tom Brown' },
];

const getRiskColor = (score: number) => {
  if (score >= 15) return '#f5576c';
  if (score >= 10) return '#fa709a';
  if (score >= 5) return '#fee140';
  return '#43e97b';
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
  const [openDialog, setOpenDialog] = useState(false);
  const [newRisk, setNewRisk] = useState({
    title: '',
    category: '',
    likelihood: 3,
    impact: 3,
    owner: '',
    description: ''
  });

  const criticalRisks = risks.filter(r => r.score >= 15).length;
  const highRisks = risks.filter(r => r.score >= 10 && r.score < 15).length;
  const totalRiskScore = risks.reduce((sum, r) => sum + r.score, 0);
  const avgRiskScore = (totalRiskScore / risks.length).toFixed(1);

  const calculatedScore = newRisk.likelihood * newRisk.impact;

  const handleAddRisk = () => {
    if (newRisk.title && newRisk.category && newRisk.owner) {
      alert(`Risk "${newRisk.title}" created!\n\nCalculated Score: ${calculatedScore}\nSeverity: ${calculatedScore >= 15 ? 'Critical' : calculatedScore >= 10 ? 'High' : calculatedScore >= 5 ? 'Medium' : 'Low'}`);
      setOpenDialog(false);
      setNewRisk({ title: '', category: '', likelihood: 3, impact: 3, owner: '', description: '' });
    }
  };

  React.useEffect(() => {
    console.log('Dialog state changed:', openDialog);
  }, [openDialog]);

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
          onClick={() => {
            console.log('Button clicked! Opening dialog...');
            setOpenDialog(true);
          }}
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

      {/* Risk Register */}
      <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Risk Register
          </Typography>
          <TableContainer component={Paper} sx={{ bgcolor: 'transparent' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
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
                        <Typography variant="body2" sx={{ fontWeight: 700, color: getRiskColor(risk.score) }}>
                          {risk.score}
                        </Typography>
                        {risk.score >= 15 ? (
                          <TrendingUp sx={{ color: getRiskColor(risk.score), fontSize: 20 }} />
                        ) : (
                          <TrendingDown sx={{ color: getRiskColor(risk.score), fontSize: 20 }} />
                        )}
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
                    <TableCell sx={{ color: 'white' }}>{risk.owner}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* New Risk Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1f3a',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }}
      >
        <DialogTitle sx={{ color: 'white' }}>New Risk Assessment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Risk Title"
                value={newRisk.title}
                onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newRisk.category}
                  onChange={(e) => setNewRisk({ ...newRisk, category: e.target.value })}
                  label="Category"
                >
                  <MenuItem value="Cybersecurity">Cybersecurity</MenuItem>
                  <MenuItem value="Compliance">Compliance</MenuItem>
                  <MenuItem value="Operational">Operational</MenuItem>
                  <MenuItem value="Financial">Financial</MenuItem>
                  <MenuItem value="Data Privacy">Data Privacy</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Risk Owner"
                value={newRisk.owner}
                onChange={(e) => setNewRisk({ ...newRisk, owner: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Likelihood (1-5)</InputLabel>
                <Select
                  value={newRisk.likelihood}
                  onChange={(e) => setNewRisk({ ...newRisk, likelihood: Number(e.target.value) })}
                  label="Likelihood (1-5)"
                >
                  {[1, 2, 3, 4, 5].map(val => <MenuItem key={val} value={val}>{val}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Impact (1-5)</InputLabel>
                <Select
                  value={newRisk.impact}
                  onChange={(e) => setNewRisk({ ...newRisk, impact: Number(e.target.value) })}
                  label="Impact (1-5)"
                >
                  {[1, 2, 3, 4, 5].map(val => <MenuItem key={val} value={val}>{val}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: `${getRiskColor(calculatedScore)}20`, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ color: getRiskColor(calculatedScore), fontWeight: 700 }}>
                  Calculated Risk Score: {calculatedScore}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  {calculatedScore >= 15 ? 'CRITICAL' : calculatedScore >= 10 ? 'HIGH' : calculatedScore >= 5 ? 'MEDIUM' : 'LOW'} Risk
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Risk Description"
                value={newRisk.description}
                onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAddRisk}
            variant="contained"
            disabled={!newRisk.title || !newRisk.category || !newRisk.owner}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            Create Risk
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
