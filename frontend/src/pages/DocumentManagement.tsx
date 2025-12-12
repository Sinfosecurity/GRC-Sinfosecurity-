import { useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, Chip, List, ListItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { Add, Folder, InsertDriveFile, PictureAsPdf, Description, Image, CloudUpload } from '@mui/icons-material';

const documents = [
  { id: 1, name: 'Risk Assessment Report Q4 2024.pdf', type: 'PDF', category: 'Risk Management', size: '2.4 MB', uploadedAt: '2024-12-10', uploadedBy: 'Jane Smith' },
  { id: 2, name: 'GDPR Compliance Audit.docx', type: 'Word', category: 'Compliance', size: '1.8 MB', uploadedAt: '2024-12-08', uploadedBy: 'John Doe' },
  { id: 3, name: 'Security Control Matrix.xlsx', type: 'Excel', category: 'Controls', size: '890 KB', uploadedAt: '2024-12-05', uploadedBy: 'Security Team' },
  { id: 4, name: 'Incident Response Diagram.png', type: 'Image', category: 'Incident Management', size: '450 KB', uploadedAt: '2024-12-03', uploadedBy: 'IR Team' },
  { id: 5, name: 'Data Classification Policy v2.1.pdf', type: 'PDF', category: 'Policies', size: '1.2 MB', uploadedAt: '2024-12-01', uploadedBy: 'CISO' },
];

const getFileIcon = (type: string) => {
  if (type === 'PDF') return <PictureAsPdf sx={{ color: '#f5576c' }} />;
  if (type === 'Word') return <Description sx={{ color: '#667eea' }} />;
  if (type === 'Excel') return <InsertDriveFile sx={{ color: '#43e97b' }} />;
  if (type === 'Image') return <Image sx={{ color: '#00f2fe' }} />;
  return <Folder sx={{ color: '#fee140' }} />;
};

export default function DocumentManagement() {
  const [openDialog, setOpenDialog] = useState(false);
  const [newDocument, setNewDocument] = useState({
    name: '',
    category: '',
    description: ''
  });

  const totalSize = documents.reduce((sum, doc) => {
    const size = parseFloat(doc.size);
    return sum + (doc.size.includes('MB') ? size : size / 1024);
  }, 0);

  const handleUpload = () => {
    if (newDocument.name && newDocument.category) {
      alert(`Document "${newDocument.name}" uploaded successfully!\n\nThe document has been added to the ${newDocument.category} category.`);
      setOpenDialog(false);
      setNewDocument({ name: '', category: '', description: '' });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Document Management
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Store and manage GRC-related documents
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{
            background: 'linear-gradient(135deg, #fed6e3 0%, #fe90af 100%)',
            color: '#000',
            '&:hover': {
              background: 'linear-gradient(135deg, #fe90af 0%, #fed6e3 100%)',
            },
          }}
        >
          Upload Document
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: '#667eea', fontWeight: 700 }}>
                {documents.length}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Total Documents
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: '#00f2fe', fontWeight: 700 }}>
                {totalSize.toFixed(1)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Total Size (MB)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: '#43e97b', fontWeight: 700 }}>
                5
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Categories
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Documents List */}
      <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Document Library
          </Typography>
          <List>
            {documents.map((doc) => (
              <ListItem
                key={doc.id}
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
                <ListItemIcon>{getFileIcon(doc.type)}</ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {doc.name}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={doc.category}
                        size="small"
                        sx={{ bgcolor: 'rgba(102, 126, 234, 0.2)', color: '#667eea' }}
                      />
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        {doc.size} • Uploaded by {doc.uploadedBy} on {doc.uploadedAt}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Upload Document Dialog */}
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
        <DialogTitle sx={{ color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudUpload sx={{ color: '#fe90af' }} />
            Upload Document
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Document Name"
                value={newDocument.name}
                onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
                required
                placeholder="e.g., Risk Assessment Report Q1 2025"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Category"
                value={newDocument.category}
                onChange={(e) => setNewDocument({ ...newDocument, category: e.target.value })}
                required
                SelectProps={{ native: true }}
              >
                <option value=""></option>
                <option value="Risk Management">Risk Management</option>
                <option value="Compliance">Compliance</option>
                <option value="Controls">Controls</option>
                <option value="Incident Management">Incident Management</option>
                <option value="Policies">Policies</option>
                <option value="Other">Other</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description (Optional)"
                value={newDocument.description}
                onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                placeholder="Brief description of the document content..."
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<CloudUpload />}
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  py: 2,
                  '&:hover': {
                    borderColor: '#fe90af',
                    bgcolor: 'rgba(254, 144, 175, 0.1)'
                  }
                }}
              >
                Choose File to Upload
                <input type="file" hidden accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg" />
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!newDocument.name || !newDocument.category}
            sx={{
              background: 'linear-gradient(135deg, #fed6e3 0%, #fe90af 100%)',
              color: '#000'
            }}
          >
            Upload Document
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
