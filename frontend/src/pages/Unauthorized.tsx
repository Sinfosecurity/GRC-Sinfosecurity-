import React from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LockIcon from '@mui/icons-material/Lock';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        textAlign="center"
      >
        <LockIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
        <Typography variant="h3" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/dashboard')}
          sx={{ mt: 2 }}
        >
          Return to Dashboard
        </Button>
      </Box>
    </Container>
  );
};

export default Unauthorized;
