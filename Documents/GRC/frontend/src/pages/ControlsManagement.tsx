import { useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Add, CheckCircle, Warning } from '@mui/icons-material';

const controls = [
  { id: 1, name: 'Multi-Factor Authentication', type: 'Preventive', category: 'Access Control', effectiveness: 5, status: 'Operational', lastTested: '2024-12-01' },
  { id: 2, name: 'Security Monitoring', type: 'Detective', category: 'Monitoring', effectiveness: 4, status: 'Operational', lastTested: '2024-11-28' },
  { id: 3, name: 'Data Encryption', type: 'Preventive', category: 'Data Protection', effectiveness: 5, status: 'Operational', lastTested: '2024-12-05' },
  { id: 4, name: 'Incident Response Plan', type: 'Corrective', category: 'Incident Management', effectiveness: 4, status: 'Testing', lastTested: '2024-11-15' },
  { id: 5, name: 'Access Reviews', type: 'Detective', category: 'Access Control', effectiveness: 3, status: 'Operational', lastTested: '2024-10-20' },
  { id: 6, name: 'Firewall Rules', type: 'Preventive', category: 'Network Security', effectiveness: 4, status: 'Operational', lastTested: '2024-12-03' },
];

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    'Preventive': '#667eea',
    'Detective': '#00f2fe',
    'Corrective': '#43e97b',
    'Directive': '#fee140',
  };
  return colors[type] || '#667eea';
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'Operational': '#43e97b',
    'Testing': '#fee140',
    'Planned': '#667eea',
    'Ineffective': '#f5576c',
  };
  return colors[status] || '#667eea';
};

export default function ControlsManagement() {
  const operational = controls.filter(c => c.status === 'Operational').length;
  const avgEffectiveness = (controls.reduce((sum, c) => sum + c.effectiveness, 0) / controls.length).toFixed(1);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Controls Management
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Define and manage security controls
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            color: '#000',
            '&:hover': {
              background: 'linear-gradient(135deg, #38f9d7 0%, #43e97b 100%)',
            },
          }}
        >
          New Control
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: '#43e97b', fontWeight: 700 }}>
                {operational}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Operational Controls
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: '#00f2fe', fontWeight: 700 }}>
                {avgEffectiveness}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Avg Effectiveness
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: '#667eea', fontWeight: 700 }}>
                {controls.length}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Total Controls
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Controls Table */}
      <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Control Inventory
          </Typography>
          <TableContainer component={Paper} sx={{ bgcolor: 'transparent' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Control</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Category</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Effectiveness</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Last Tested</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {controls.map((control) => (
                  <TableRow
                    key={control.id}
                    sx={{ '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.05)' }, cursor: 'pointer' }}
                  >
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>{control.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={control.type}
                        size="small"
                        sx={{
                          bgcolor: `${getTypeColor(control.type)}20`,
                          color: getTypeColor(control.type),
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>{control.category}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {[...Array(5)].map((_, i) => (
                          <Box
                            key={i}
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: i < control.effectiveness ? '#43e97b' : 'rgba(255,255,255,0.2)',
                            }}
                          />
                        ))}
                        <Typography sx={{ color: '#43e97b', ml: 1 }}>{control.effectiveness}/5</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={control.status}
                        size="small"
                        icon={control.status === 'Operational' ? <CheckCircle /> : <Warning />}
                        sx={{
                          bgcolor: `${getStatusColor(control.status)}20`,
                          color: getStatusColor(control.status),
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>{control.lastTested}</TableCell>
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
