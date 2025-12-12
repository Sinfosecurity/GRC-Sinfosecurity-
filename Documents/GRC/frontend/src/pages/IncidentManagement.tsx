import { Box, Typography, Grid, Card, CardContent, Button, Chip, Timeline, TimelineItem, TimelineSeparator, TimelineDot, TimelineConnector, TimelineContent } from '@mui/material';
import { Add, Error, Warning, Info } from '@mui/icons-material';

const incidents = [
  { id: 1, title: 'Suspicious Login Attempts', severity: 'High', status: 'Investigating', category: 'Security', reportedAt: '2024-12-11 14:30', reporter: 'Security Team' },
  { id: 2, title: 'Data Exfiltration Alert', severity: 'Critical', status: 'Contained', category: 'Data Breach', reportedAt: '2024-12-10 09:15', reporter: 'SIEM System' },
  { id: 3, title: 'Policy Violation - USB Device', severity: 'Medium', status: 'Resolved', category: 'Policy', reportedAt: '2024-12-09 11:45', reporter: 'John Doe' },
  { id: 4, title: 'Phishing Email Campaign', severity: 'High', status: 'Investigating', category: 'Security', reportedAt: '2024-12-08 16:20', reporter: 'Email Gateway' },
  { id: 5, title: 'Unauthorized Access Attempt', severity: 'Medium', status: 'Resolved', category: 'Access Control', reportedAt: '2024-12-07 08:30', reporter: 'IAM System' },
];

const getSeverityColor = (severity: string) => {
  const colors: Record<string, string> = {
    'Critical': '#f5576c',
    'High': '#fa709a',
    'Medium': '#fee140',
    'Low': '#43e97b',
  };
  return colors[severity] || '#667eea';
};

const getSeverityIcon = (severity: string) => {
  if (severity === 'Critical' || severity === 'High') return <Error />;
  if (severity === 'Medium') return <Warning />;
  return <Info />;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'Reported': '#667eea',
    'Investigating': '#00f2fe',
    'Contained': '#fee140',
    'Resolved': '#43e97b',
    'Closed': '#888',
  };
  return colors[status] || '#667eea';
};

export default function IncidentManagement() {
  const critical = incidents.filter(i => i.severity === 'Critical').length;
  const open = incidents.filter(i => i.status !== 'Resolved' && i.status !== 'Closed').length;

  return (
    <Box>
      <Box sx={{ display: ' flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Incident Management
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Track and respond to security incidents
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            color: '#000',
            '&:hover': {
              background: 'linear-gradient(135deg, #fee140 0%, #fa709a 100%)',
            },
          }}
        >
          Report Incident
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: '#f5576c', fontWeight: 700 }}>
                {critical}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Critical Incidents
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: '#00f2fe', fontWeight: 700 }}>
                {open}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Open Incidents
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: '#43e97b', fontWeight: 700 }}>
                24h
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Avg Response Time
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Incident Timeline */}
      <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Incident Timeline
          </Typography>
          <Timeline sx={{ mt: 0, pt: 0 }}>
            {incidents.map((incident, index) => (
              <TimelineItem key={incident.id}>
                <TimelineSeparator>
                  <TimelineDot sx={{ bgcolor: getSeverityColor(incident.severity), border: 'none' }}>
                    {getSeverityIcon(incident.severity)}
                  </TimelineDot>
                  {index < incidents.length - 1 && <TimelineConnector sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />}
                </TimelineSeparator>
                <TimelineContent>
                  <Card sx={{ bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {incident.title}
                        </Typography>
                        <Chip
                          label={incident.status}
                          size="small"
                          sx={{
                            bgcolor: `${getStatusColor(incident.status)}20`,
                            color: getStatusColor(incident.status),
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Chip
                          label={incident.severity}
                          size="small"
                          sx={{
                            bgcolor: `${getSeverityColor(incident.severity)}20`,
                            color: getSeverityColor(incident.severity),
                          }}
                        />
                        <Chip
                          label={incident.category}
                          size="small"
                          sx={{ bgcolor: 'rgba(102, 126, 234, 0.2)', color: '#667eea' }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        Reported by {incident.reporter} at {incident.reportedAt}
                      </Typography>
                    </CardContent>
                  </Card>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </CardContent>
      </Card>
    </Box>
  );
}
