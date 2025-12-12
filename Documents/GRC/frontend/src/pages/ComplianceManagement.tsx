import { useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, LinearProgress, Chip, List, ListItem, ListItemText } from '@mui/material';
import { Add, CheckCircle, Warning } from '@mui/icons-material';

const frameworks = [
  { id: 1, name: 'GDPR', type: 'Data Protection', score: 92, requirements: 99, implemented: 91, status: 'Compliant' },
  { id: 2, name: 'HIPAA', type: 'Healthcare', score: 78, requirements: 164, implemented: 128, status: 'In Progress' },
  { id: 3, name: 'CCPA', type: 'Data Protection', score: 85, requirements: 45, implemented: 38, status: 'Compliant' },
  { id: 4, name: 'ISO 27001', type: 'Information Security', score: 88, requirements: 114, implemented: 100, status: 'Compliant' },
  { id: 5, name: 'TISAX', type: 'Automotive', score: 75, requirements: 56, implemented: 42, status: 'In Progress' },
  { id: 6, name: 'SOC 2', type: 'Trust Services', score: 82, requirements: 64, implemented: 52, status: 'In Progress' },
];

const recentGaps = [
  { framework: 'GDPR', requirement: 'Article 30 - Records of Processing', severity: 'High', dueDate: '2025-01-15' },
  { framework: 'HIPAA', requirement: 'Security Rule - Encryption', severity: 'Critical', dueDate: '2024-12-30' },
  { framework: 'ISO 27001', requirement: 'A.12.3 - Information Backup', severity: 'Medium', dueDate: '2025-02-01' },
  { framework: 'CCPA', requirement: 'Consumer Rights Process', severity: 'Medium', dueDate: '2025-01-20' },
];

const getScoreColor = (score: number) => {
  if (score >= 90) return '#43e97b';
  if (score >= 75) return '#00f2fe';
  if (score >= 60) return '#fee140';
  return '#f5576c';
};

const getSeverityColor = (severity: string) => {
  const colors: Record<string, string> = {
    'Critical': '#f5576c',
    'High': '#fa709a',
    'Medium': '#fee140',
    'Low': '#43e97b',
  };
  return colors[severity] || '#667eea';
};

export default function ComplianceManagement() {
  const [selectedFramework, setSelectedFramework] = useState(frameworks[0]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Compliance Management
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Track and manage compliance across multiple frameworks
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{
            background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            },
          }}
        >
          Run Gap Analysis
        </Button>
      </Box>

      {/* Frameworks Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {frameworks.map((framework) => (
          <Grid item xs={12} sm={6} md={4} key={framework.id}>
            <Card
              sx={{
                bgcolor: '#1a1f3a',
                border: selectedFramework.id === framework.id ? '2px solid #00f2fe' : '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(0, 242, 254, 0.3)',
                },
              }}
              onClick={() => setSelectedFramework(framework)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {framework.name}
                  </Typography>
                  {framework.status === 'Compliant' ? (
                    <CheckCircle sx={{ color: '#43e97b' }} />
                  ) : (
                    <Warning sx={{ color: '#fee140' }} />
                  )}
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                  {framework.type}
                </Typography>
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Compliance Score</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: getScoreColor(framework.score) }}>
                      {framework.score}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={framework.score}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'rgba(255,255,255,0.1)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getScoreColor(framework.score),
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  {framework.implemented} / {framework.requirements} requirements
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Selected Framework Details */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                {selectedFramework.name} Requirements Breakdown
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ p: 2, bgcolor: 'rgba(67, 233, 123, 0.1)', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ color: '#43e97b', fontWeight: 700 }}>
                      {selectedFramework.implemented}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      Implemented
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ p: 2, bgcolor: 'rgba(245, 87, 108, 0.1)', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ color: '#f5576c', fontWeight: 700 }}>
                      {selectedFramework.requirements - selectedFramework.implemented}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      Gaps Identified
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#00f2fe',
                    color: '#00f2fe',
                    '&:hover': {
                      borderColor: '#4facfe',
                      bgcolor: 'rgba(0, 242, 254, 0.1)',
                    },
                  }}
                >
                  View Detailed Requirements
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Gaps */}
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Recent Gaps
              </Typography>
              <List>
                {recentGaps.map((gap, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.05)',
                      borderRadius: 2,
                      mb: 1,
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 1 }}>
                      <Chip
                        label={gap.framework}
                        size="small"
                        sx={{ bgcolor: 'rgba(102, 126, 234, 0.2)', color: '#667eea' }}
                      />
                      <Chip
                        label={gap.severity}
                        size="small"
                        sx={{
                          bgcolor: `${getSeverityColor(gap.severity)}20`,
                          color: getSeverityColor(gap.severity),
                        }}
                      />
                    </Box>
                    <ListItemText
                      primary={gap.requirement}
                      secondary={`Due: ${gap.dueDate}`}
                      primaryTypographyProps={{ variant: 'body2', sx: { color: 'white', fontWeight: 600 } }}
                      secondaryTypographyProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
                    />
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
