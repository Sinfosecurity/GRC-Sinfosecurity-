import { useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, Chip, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Add, Description, CheckCircle } from '@mui/icons-material';

const policies = [
  { id: 1, title: 'Data Classification Policy', version: '2.1', status: 'Published', category: 'Data Protection', effectiveDate: '2024-01-01', reviewDate: '2025-01-01', owner: 'CISO' },
  { id: 2, title: 'Access Control Policy', version: '1.5', status: 'Published', category: 'Security', effectiveDate: '2024-03-15', reviewDate: '2025-03-15', owner: 'Security Team' },
  { id: 3, title: 'Incident Response Policy', version: '3.0', status: 'Review', category: 'Incident Management', effectiveDate: '2024-06-01', reviewDate: '2024-12-01', owner: 'IR Team' },
  { id: 4, title: 'Acceptable Use Policy', version: '1.8', status: 'Published', category: 'Governance', effectiveDate: '2024-02-10', reviewDate: '2025-02-10', owner: 'HR/IT' },
  { id: 5, title: 'Vendor Management Policy', version: '1.2', status: 'Draft', category: 'Third Party', effectiveDate: null, reviewDate: null, owner: 'Procurement' },
];

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'Published': '#43e97b',
    'Review': '#fee140',
    'Draft': '#667eea',
    'Archived': '#888',
  };
  return colors[status] || '#667eea';
};

export default function PolicyManagement() {
  const [openDialog, setOpenDialog] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    title: '',
    category: '',
    owner: '',
    description: ''
  });

  const published = policies.filter(p => p.status === 'Published').length;
  const needReview = policies.filter(p => {
    if (!p.reviewDate) return false;
    const reviewDate = new Date(p.reviewDate);
    const today = new Date();
    const daysUntilReview = Math.floor((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilReview <= 30;
  }).length;

  const handleCreate = () => {
    if (newPolicy.title && newPolicy.category && newPolicy.owner) {
      alert(`Policy "${newPolicy.title}" created successfully!\n\nYou can now edit and publish the policy.`);
      setOpenDialog(false);
      setNewPolicy({ title: '', category: '', owner: '', description: '' });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Policy Management
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Create and manage organizational policies
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{
            background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #330867 0%, #30cfd0 100%)',
            },
          }}
        >
          New Policy
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: '#43e97b', fontWeight: 700 }}>
                {published}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Published Policies
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: '#fee140', fontWeight: 700 }}>
                {needReview}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Need Review
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: '#667eea', fontWeight: 700 }}>
                {policies.length}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Total Policies
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Policies List */}
      <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Policy Library
          </Typography>
          <List>
            {policies.map((policy) => (
              <ListItem
                key={policy.id}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.05)',
                  borderRadius: 2,
                  mb: 2,
                  border: '1px solid rgba(255,255,255,0.1)',
                  '&:hover': {
                    bgcolor: 'rgba(102, 126, 234, 0.05)',
                    transform: 'translateX(4px)',
                  },
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
              >
                <Description sx={{ color: '#667eea', mr: 2, fontSize: 40 }} />
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {policy.title}
                      </Typography>
                      <Chip
                        label={`v${policy.version}`}
                        size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}
                      />
                      <Chip
                        label={policy.status}
                        size="small"
                        icon={policy.status === 'Published' ? <CheckCircle /> : undefined}
                        sx={{
                          bgcolor: `${getStatusColor(policy.status)}20`,
                          color: getStatusColor(policy.status),
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Chip
                        label={policy.category}
                        size="small"
                        sx={{ bgcolor: 'rgba(102, 126, 234, 0.2)', color: '#667eea' }}
                      />
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        Owner: {policy.owner}
                      </Typography>
                      {policy.effectiveDate && (
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                          Effective: {policy.effectiveDate}
                        </Typography>
                      )}
                      {policy.reviewDate && (
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                          Review: {policy.reviewDate}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* New Policy Dialog */}
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
        <DialogTitle sx={{ color: 'white' }}>Create New Policy</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Policy Title"
                value={newPolicy.title}
                onChange={(e) => setNewPolicy({ ...newPolicy, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newPolicy.category}
                  onChange={(e) => setNewPolicy({ ...newPolicy, category: e.target.value })}
                  label="Category"
                >
                  <MenuItem value="Data Protection">Data Protection</MenuItem>
                  <MenuItem value="Security">Security</MenuItem>
                  <MenuItem value="Incident Management">Incident Management</MenuItem>
                  <MenuItem value="Governance">Governance</MenuItem>
                  <MenuItem value="Third Party">Third Party</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Policy Owner"
                value={newPolicy.owner}
                onChange={(e) => setNewPolicy({ ...newPolicy, owner: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Description / Purpose"
                value={newPolicy.description}
                onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!newPolicy.title || !newPolicy.category || !newPolicy.owner}
            sx={{
              background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
            }}
          >
            Create Policy
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
