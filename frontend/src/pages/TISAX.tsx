import { Box, Typography, Grid, Card, CardContent, LinearProgress } from '@mui/material';
import { DirectionsCar, Security } from '@mui/icons-material';

const assessmentLevels = [
  { name: 'Information Security', level: 'AL3', progress: 88, status: 'In Progress' },
  { name: 'Prototype Protection', level: 'AL2', progress: 75, status: 'In Progress' },
  { name: 'Data Protection', level: 'AL3', progress: 92, status: 'Compliant' },
  { name: 'Physical Security', level: 'AL2', progress: 85, status: 'In Progress' },
];

const controls = [
  { category: 'Organizational Security', total: 45, implemented: 40 },
  { category: 'Physical Security', total: 28, implemented: 24 },
  { category: 'Personnel Security', total: 18, implemented: 16 },
  { category: 'Information Security', total: 52, implemented: 48 },
];

const getProgressColor = (progress: number) => {
  if (progress >= 90) return '#43e97b';
  if (progress >= 75) return '#00f2fe';
  return '#fee140';
};

export default function TISAX() {
  const totalControls = controls.reduce((sum, c) => sum + c.total, 0);
  const implementedControls = controls.reduce((sum, c) => sum + c.implemented, 0);
  const overallProgress = Math.round((implementedControls / totalControls) * 100);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <DirectionsCar sx={{ fontSize: 48, color: '#fcb69f', mr: 2 }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            TISAX Assessment
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Trusted Information Security Assessment Exchange
          </Typography>
        </Box>
      </Box>

      {/* Overall Status */}
      <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)', mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Overall Assessment Progress
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

      {/* Assessment Levels */}
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
        Assessment Levels
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {assessmentLevels.map((level, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {level.name}
                  </Typography>
                  <Box
                    sx={{
                      px: 2,
                      py: 0.5,
                      bgcolor: 'rgba(252, 182, 159, 0.2)',
                      borderRadius: 1,
                      color: '#fcb69f',
                      fontWeight: 700,
                    }}
                  >
                    {level.level}
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={level.progress}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    mb: 1,
                    '& .MuiLinearProgress-bar': {
                      bgcolor: getProgressColor(level.progress),
                      borderRadius: 4,
                    },
                  }}
                />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  {level.progress}% • {level.status}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Control Categories */}
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
        Control Categories
      </Typography>
      <Grid container spacing={3}>
        {controls.map((control, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Security sx={{ color: '#fcb69f', mr: 1 }} />
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {control.category}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {control.implemented}/{control.total} controls
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#43e97b', fontWeight: 700 }}>
                    {Math.round((control.implemented / control.total) * 100)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(control.implemented / control.total) * 100}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: getProgressColor((control.implemented / control.total) * 100),
                      borderRadius: 3,
                    },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
