import { useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, Chip, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Add, Circle } from '@mui/icons-material';

const incidents = [
  { id: 1, title: 'Phishing Email Detected', severity: 'Medium', status: 'Resolved', reported: '2024-12-10 09:15', resolved: '2024-12-10 14:30' },
  { id: 2, title: 'Unauthorized Access Attempt', severity: 'High', status: 'In Progress', reported: '2024-12-11 16:45', resolved: null },
  { id: 3, title: 'Data Breach Alert', severity: 'Critical', status: 'In Progress', reported: '2024-12-12 08:00', resolved: null },
  { id: 4, title: 'Malware Detection', severity: 'Medium', status: 'Resolved', reported: '2024-12-09 11:22', resolved: '2024-12-09 17:00' },
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

const getStatusColor = (status: string) => {
  if (status === 'Resolved') return '#43e97b';
  if (status === 'In Progress') return '#00f2fe';
  return '#fee140';
};

export default function IncidentManagement() {
  const [openDialog, setOpenDialog] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'Medium',
    category: '',
    reportedBy: ''
  });

  const critical = incidents.filter(i => i.severity === 'Critical').length;
  const inProgress = incidents.filter(i => i.status === 'In Progress').length;
  const resolved = incidents.filter(i => i.status === 'Resolved').length;

  const handleReportIncident = () => {
    if (newIncident.title && newIncident.category && newIncident.reportedBy) {
      alert(`Incident "${newIncident.title}" reported successfully!\n\nSeverity: ${newIncident.severity}\nIncident tracking number will be generated.`);
      setOpenDialog(false);
      setNewIncident({ title: '', description: '', severity: 'Medium', category: '', reportedBy: '' });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
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
          onClick={() => setOpenDialog(true)}
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
                {inProgress}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                In Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: '#43e97b', fontWeight: 700 }}>
                {resolved}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Resolved
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Incident List */}
      <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Recent Incidents
          </Typography>
          <List>
            {incidents.map((incident) => (
              <ListItem
                key={incident.id}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.05)',
                  borderRadius: 2,
                  mb: 2,
                  border: '1px solid rgba(255,255,255,0.1)',
                  alignItems: 'flex-start'
                }}
              >
                <Circle sx={{ color: getSeverityColor(incident.severity), mr: 2, mt: 0.5 }} />
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h6">{incident.title}</Typography>
                      <Chip
                        label={incident.severity}
                        size="small"
                        sx={{
                          bgcolor: `${getSeverityColor(incident.severity)}20`,
                          color: getSeverityColor(incident.severity),
                        }}
                      />
                      <Chip
                        label={incident.status}
                        size="small"
                        sx={{
                          bgcolor: `${getStatusColor(incident.status)}20`,
                          color: getStatusColor(incident.status),
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                      Reported: {incident.reported}
                      {incident.resolved && ` • Resolved: ${incident.resolved}`}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Report Incident Dialog */}
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
        <DialogTitle sx={{ color: 'white' }}>Report Security Incident</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Incident Title"
                value={newIncident.title}
                onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={newIncident.severity}
                  onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                  label="Severity"
                >
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newIncident.category}
                  onChange={(e) => setNewIncident({ ...newIncident, category: e.target.value })}
                  label="Category"
                >
                  <MenuItem value="Data Breach">Data Breach</MenuItem>
                  <MenuItem value="Unauthorized Access">Unauthorized Access</MenuItem>
                  <MenuItem value="Malware">Malware</MenuItem>
                  <MenuItem value="Phishing">Phishing</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reported By"
                value={newIncident.reportedBy}
                onChange={(e) => setNewIncident({ ...newIncident, reportedBy: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Incident Description"
                value={newIncident.description}
                onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                placeholder="Describe what happened, when it was discovered, and any immediate actions taken..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleReportIncident}
            variant="contained"
            disabled={!newIncident.title || !newIncident.category || !newIncident.reportedBy}
            sx={{
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              color: '#000'
            }}
          >
            Report Incident
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
