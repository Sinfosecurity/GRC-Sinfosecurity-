import { Box, Typography, Grid, Card, CardContent, Button, LinearProgress } from '@mui/material';
import { Security, CheckCircle } from '@mui/icons-material';

const domains = [
  { name: 'A.5 Information Security Policies', progress: 100, controls: 2, implemented: 2 },
  { name: 'A.6 Organization of Information Security', progress: 90, controls: 7, implemented: 6 },
  { name: 'A.7 Human Resource Security', progress: 85, controls: 6, implemented: 5 },
  { name: 'A.8 Asset Management', progress: 95, controls: 10, implemented: 9 },
  { name: 'A.9 Access Control', progress: 88, controls: 14, implemented: 12 },
  { name: 'A.10 Cryptography', progress: 100, controls: 2, implemented: 2 },
  { name: 'A.11 Physical Security', progress: 92, controls: 15, implemented: 14 },
  { name: 'A.12 Operations Security', progress: 80, controls: 14, implemented: 11 },
  { name: 'A.13 Communications Security', progress: 85, controls: 7, implemented: 6 },
  { name: 'A.14 System Development', progress: 75, controls: 13, implemented: 10 },
];

const getProgressColor = (progress: number) => {
  if (progress >= 90) return '#43e97b';
  if (progress >= 75) return '#00f2fe';
  if (progress >= 60) return '#fee140';
  return '#f5576c';
};

export default function ISO27001() {
  const totalControls = domains.reduce((sum, d) => sum + d.controls, 0);
  const implementedControls = domains.reduce((sum, d) => sum + d.implemented, 0);
  const overallProgress = Math.round((implementedControls / totalControls) * 100);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Security sx={{ fontSize: 48, color: '#fecfef', mr: 2 }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            ISO 27001 Compliance
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Information Security Management System (ISMS) controls
          </Typography>
        </Box>
      </Box>

      {/* Overall Progress */}
      <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)', mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Overall Compliance Status
            </Typography>
            <Typography variant="h4" sx={{ color: getProgressColor(overallProgress), fontWeight: 700 }}>
              {overallProgress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={overallProgress}
            sx={{
              height: 12,
              borderRadius: 6,
              bgcolor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                bgcolor: getProgressColor(overallProgress),
                borderRadius: 6,
              },
            }}
          />
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 2 }}>
            {implementedControls} of {totalControls} controls implemented
          </Typography>
        </CardContent>
      </Card>

      {/* Control Domains */}
      <Grid container spacing={3}>
        {domains.map((domain, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, flex: 1 }}>
                    {domain.name}
                  </Typography>
                  {domain.progress === 100 && <CheckCircle sx={{ color: '#43e97b', ml: 1 }} />}
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      {domain.implemented}/{domain.controls} controls
                    </Typography>
                    <Typography variant="caption" sx={{ color: getProgressColor(domain.progress), fontWeight: 700 }}>
                      {domain.progress}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={domain.progress}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'rgba(255,255,255,0.1)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getProgressColor(domain.progress),
                        borderRadius: 3,
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
