import { Box, Typography, Grid, Card, CardContent, Switch, FormControlLabel, Button } from '@mui/material';
import { Person, Notifications, Security, Palette } from '@mui/icons-material';

export default function Settings() {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Settings
      </Typography>
      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', mb: 4 }}>
        Configure your GRC platform preferences
      </Typography>

      <Grid container spacing={3}>
        {/* Account Settings */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Person sx={{ color: '#667eea', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Account Settings
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                    Name
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Admin User
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                    Email
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    admin@sinfosecurity.com
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                    Role
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#43e97b' }}>
                    System Administrator
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  sx={{
                    mt: 2,
                    borderColor: '#667eea',
                    color: '#667eea',
                    '&:hover': {
                      borderColor: '#764ba2',
                      bgcolor: 'rgba(102, 126, 234, 0.1)',
                    },
                  }}
                >
                  Edit Profile
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Notifications */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Notifications sx={{ color: '#00f2fe', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Notifications
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Critical Risk Alerts"
                />
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Compliance Deadlines"
                />
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Incident Reports"
                />
                <FormControlLabel
                  control={<Switch />}
                  label="Policy Updates"
                />
                <FormControlLabel
                  control={<Switch />}
                  label="Email Notifications"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Security */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Security sx={{ color: '#43e97b', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Security Settings
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Two-Factor Authentication"
                />
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Session Timeout (15 minutes)"
                />
                <Button
                  variant="outlined"
                  sx={{
                    mt: 2,
                    borderColor: '#43e97b',
                    color: '#43e97b',
                    '&:hover': {
                      borderColor: '#38f9d7',
                      bgcolor: 'rgba(67, 233, 123, 0.1)',
                    },
                  }}
                >
                  Change Password
                </Button>
                <Button
                  variant="outlined"
                  sx={{
                    borderColor: '#f5576c',
                    color: '#f5576c',
                    '&:hover': {
                      borderColor: '#fa709a',
                      bgcolor: 'rgba(245, 87, 108, 0.1)',
                    },
                  }}
                >
                  View Activity Log
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Appearance */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Palette sx={{ color: '#fee140', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Appearance
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Dark Mode"
                />
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Gradient Effects"
                />
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Animations"
                />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 2 }}>
                  Theme: Premium Dark
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
