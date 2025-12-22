import { useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Switch,
    FormControlLabel,
    Divider,
    Avatar,
    LinearProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tabs,
    Tab,
} from '@mui/material';
import {
    Business,
    // Settings,
    People,
    Security,
    Palette,
    CreditCard,
    UploadFile,
    Edit,
    Save,
    Upgrade,
} from '@mui/icons-material';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

// Mock organization data
const mockOrganization = {
    id: 'org_demo',
    name: 'Sinfosecurity Demo Corp',
    subdomain: 'demo',
    domain: 'sinfosecurity.com',
    industry: 'Technology',
    size: 'medium',
    country: 'United States',
    primaryContactName: 'Demo Admin',
    primaryContactEmail: 'admin@sinfosecurity.com',
    primaryContactPhone: '+1 (555) 123-4567',
    subscription: {
        plan: 'enterprise',
        status: 'active',
        seats: 100,
        usedSeats: 8,
        modules: ['risk', 'compliance', 'policies', 'incidents', 'vendor', 'monitoring', 'ai', 'business-continuity'],
        billingCycle: 'annual',
        amount: 50000,
        startDate: '2024-01-01',
        endDate: '2025-01-01',
        autoRenew: true,
    },
    branding: {
        logo: null,
        primaryColor: '#667eea',
        secondaryColor: '#764ba2',
        companyName: 'Sinfosecurity Demo Corp',
    },
    settings: {
        allowSSOOnly: false,
        mfaRequired: true,
        sessionTimeout: 30,
        dataResidency: 'us',
        notificationEmail: 'admin@sinfosecurity.com',
        allowEmailNotifications: true,
        allowSlackIntegration: false,
    },
};

const planFeatures = {
    trial: { name: 'Trial', price: 0, seats: 5, color: '#feca57' },
    starter: { name: 'Starter', price: 6000, seats: 10, color: '#43e97b' },
    professional: { name: 'Professional', price: 18000, seats: 25, color: '#667eea' },
    enterprise: { name: 'Enterprise', price: 50000, seats: 100, color: '#f5576c' },
};

export default function OrganizationSettings() {
    const [tabValue, setTabValue] = useState(0);
    const [organization, setOrganization] = useState(mockOrganization);
    const [editMode, setEditMode] = useState(false);
    const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
    const [, setLogoFile] = useState<File | null>(null);

    const handleSaveChanges = () => {
        // In production, call API to update organization
        alert('Organization settings updated successfully!');
        setEditMode(false);
    };

    const currentPlan = planFeatures[organization.subscription.plan as keyof typeof planFeatures];
    const seatUsagePercent = (organization.subscription.usedSeats / organization.subscription.seats) * 100;
    const daysUntilRenewal = Math.ceil(
        (new Date(organization.subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        Organization Settings
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Manage your organization profile, subscription, and preferences
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    {editMode ? (
                        <>
                            <Button onClick={() => setEditMode(false)}>Cancel</Button>
                            <Button
                                variant="contained"
                                startIcon={<Save />}
                                onClick={handleSaveChanges}
                                sx={{
                                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                    color: '#000',
                                }}
                            >
                                Save Changes
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="contained"
                            startIcon={<Edit />}
                            onClick={() => setEditMode(true)}
                            sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            }}
                        >
                            Edit Settings
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Tabs */}
            <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)', mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => setTabValue(newValue)}
                    sx={{
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        '& .MuiTab-root': { color: 'rgba(255,255,255,0.7)' },
                        '& .Mui-selected': { color: '#667eea' },
                    }}
                >
                    <Tab icon={<Business />} label="General" />
                    <Tab icon={<CreditCard />} label="Subscription" />
                    <Tab icon={<Palette />} label="Branding" />
                    <Tab icon={<Security />} label="Security" />
                    <Tab icon={<People />} label="Team" />
                </Tabs>

                {/* General Tab */}
                <TabPanel value={tabValue} index={0}>
                    <CardContent>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                    Organization Information
                                </Typography>
                            </Grid>
                            
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Organization Name"
                                    value={organization.name}
                                    onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                                    disabled={!editMode}
                                />
                            </Grid>
                            
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Subdomain"
                                    value={organization.subdomain}
                                    disabled
                                    helperText={`Your URL: https://${organization.subdomain}.grc-sinfosecurity.com`}
                                    InputProps={{
                                        endAdornment: <Chip label="Fixed" size="small" />,
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Company Domain"
                                    value={organization.domain}
                                    onChange={(e) => setOrganization({ ...organization, domain: e.target.value })}
                                    disabled={!editMode}
                                    helperText="Your company email domain (e.g., company.com)"
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth disabled={!editMode}>
                                    <InputLabel>Industry</InputLabel>
                                    <Select
                                        value={organization.industry}
                                        onChange={(e) => setOrganization({ ...organization, industry: e.target.value })}
                                    >
                                        <MenuItem value="Technology">Technology</MenuItem>
                                        <MenuItem value="Finance">Finance & Banking</MenuItem>
                                        <MenuItem value="Healthcare">Healthcare</MenuItem>
                                        <MenuItem value="Retail">Retail</MenuItem>
                                        <MenuItem value="Manufacturing">Manufacturing</MenuItem>
                                        <MenuItem value="Other">Other</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth disabled={!editMode}>
                                    <InputLabel>Company Size</InputLabel>
                                    <Select
                                        value={organization.size}
                                        onChange={(e) => setOrganization({ ...organization, size: e.target.value })}
                                    >
                                        <MenuItem value="small">Small (1-50)</MenuItem>
                                        <MenuItem value="medium">Medium (51-250)</MenuItem>
                                        <MenuItem value="large">Large (251-1000)</MenuItem>
                                        <MenuItem value="enterprise">Enterprise (1000+)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Country"
                                    value={organization.country}
                                    onChange={(e) => setOrganization({ ...organization, country: e.target.value })}
                                    disabled={!editMode}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                    Primary Contact
                                </Typography>
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    label="Contact Name"
                                    value={organization.primaryContactName}
                                    onChange={(e) => setOrganization({ ...organization, primaryContactName: e.target.value })}
                                    disabled={!editMode}
                                />
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    label="Contact Email"
                                    value={organization.primaryContactEmail}
                                    onChange={(e) => setOrganization({ ...organization, primaryContactEmail: e.target.value })}
                                    disabled={!editMode}
                                />
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    label="Contact Phone"
                                    value={organization.primaryContactPhone}
                                    onChange={(e) => setOrganization({ ...organization, primaryContactPhone: e.target.value })}
                                    disabled={!editMode}
                                />
                            </Grid>
                        </Grid>
                    </CardContent>
                </TabPanel>

                {/* Subscription Tab */}
                <TabPanel value={tabValue} index={1}>
                    <CardContent>
                        <Grid container spacing={3}>
                            {/* Current Plan */}
                            <Grid item xs={12}>
                                <Box
                                    sx={{
                                        p: 3,
                                        bgcolor: `${currentPlan.color}20`,
                                        borderRadius: 2,
                                        border: `2px solid ${currentPlan.color}`,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                                                {currentPlan.name} Plan
                                            </Typography>
                                            <Typography variant="h3" sx={{ fontWeight: 700, color: currentPlan.color }}>
                                                ${currentPlan.price.toLocaleString()}
                                                <Typography component="span" variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', ml: 1 }}>
                                                    /year
                                                </Typography>
                                            </Typography>
                                        </Box>
                                        <Button
                                            variant="contained"
                                            startIcon={<Upgrade />}
                                            onClick={() => setUpgradeDialogOpen(true)}
                                            sx={{
                                                background: `linear-gradient(135deg, ${currentPlan.color} 0%, ${currentPlan.color}cc 100%)`,
                                            }}
                                        >
                                            Upgrade Plan
                                        </Button>
                                    </Box>
                                </Box>
                            </Grid>

                            {/* Subscription Details */}
                            <Grid item xs={12} md={6}>
                                <Card sx={{ bgcolor: 'rgba(102, 126, 234, 0.05)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
                                    <CardContent>
                                        <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                                            Subscription Status
                                        </Typography>
                                        <Chip
                                            label={organization.subscription.status.toUpperCase()}
                                            sx={{
                                                bgcolor: '#43e97b20',
                                                color: '#43e97b',
                                                fontWeight: 600,
                                            }}
                                        />
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 2 }}>
                                            Renews in {daysUntilRenewal} days ({organization.subscription.endDate})
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Card sx={{ bgcolor: 'rgba(102, 126, 234, 0.05)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
                                    <CardContent>
                                        <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                                            Seat Usage
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                                            {organization.subscription.usedSeats} / {organization.subscription.seats} seats
                                        </Typography>
                                        <LinearProgress
                                            variant="determinate"
                                            value={seatUsagePercent}
                                            sx={{
                                                height: 8,
                                                borderRadius: 4,
                                                bgcolor: 'rgba(255,255,255,0.1)',
                                                '& .MuiLinearProgress-bar': {
                                                    bgcolor: seatUsagePercent > 80 ? '#f5576c' : '#43e97b',
                                                },
                                            }}
                                        />
                                        {seatUsagePercent > 80 && (
                                            <Alert severity="warning" sx={{ mt: 2 }}>
                                                You're using {seatUsagePercent.toFixed(0)}% of your seats. Consider upgrading.
                                            </Alert>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Enabled Modules */}
                            <Grid item xs={12}>
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                    Enabled Modules
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {organization.subscription.modules.map((module) => (
                                        <Chip
                                            key={module}
                                            label={module.replace(/-/g, ' ').toUpperCase()}
                                            sx={{
                                                bgcolor: '#667eea20',
                                                color: '#667eea',
                                                fontWeight: 600,
                                            }}
                                        />
                                    ))}
                                </Box>
                            </Grid>

                            {/* Billing Info */}
                            <Grid item xs={12}>
                                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                    Billing Information
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                            Billing Cycle
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                            {organization.subscription.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                            Auto-Renewal
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                            {organization.subscription.autoRenew ? 'Enabled' : 'Disabled'}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </CardContent>
                </TabPanel>

                {/* Branding Tab */}
                <TabPanel value={tabValue} index={2}>
                    <CardContent>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                    Brand Customization
                                </Typography>
                                <Alert severity="info" sx={{ mb: 3 }}>
                                    Customize your organization's branding. Changes will be reflected across the platform.
                                </Alert>
                            </Grid>

                            {/* Logo Upload */}
                            <Grid item xs={12}>
                                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                                    Organization Logo
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <Avatar
                                        sx={{
                                            width: 100,
                                            height: 100,
                                            bgcolor: organization.branding.primaryColor,
                                        }}
                                    >
                                        <Business sx={{ fontSize: 50 }} />
                                    </Avatar>
                                    <Box>
                                        <Button
                                            variant="outlined"
                                            startIcon={<UploadFile />}
                                            component="label"
                                            disabled={!editMode}
                                        >
                                            Upload Logo
                                            <input
                                                type="file"
                                                hidden
                                                accept="image/*"
                                                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                                            />
                                        </Button>
                                        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'rgba(255,255,255,0.7)' }}>
                                            Recommended: 512x512px, PNG or SVG
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>

                            {/* Brand Colors */}
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Primary Color"
                                    type="color"
                                    value={organization.branding.primaryColor}
                                    onChange={(e) =>
                                        setOrganization({
                                            ...organization,
                                            branding: { ...organization.branding, primaryColor: e.target.value },
                                        })
                                    }
                                    disabled={!editMode}
                                    InputProps={{
                                        startAdornment: (
                                            <Box
                                                sx={{
                                                    width: 30,
                                                    height: 30,
                                                    bgcolor: organization.branding.primaryColor,
                                                    borderRadius: 1,
                                                    mr: 1,
                                                }}
                                            />
                                        ),
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Secondary Color"
                                    type="color"
                                    value={organization.branding.secondaryColor}
                                    onChange={(e) =>
                                        setOrganization({
                                            ...organization,
                                            branding: { ...organization.branding, secondaryColor: e.target.value },
                                        })
                                    }
                                    disabled={!editMode}
                                    InputProps={{
                                        startAdornment: (
                                            <Box
                                                sx={{
                                                    width: 30,
                                                    height: 30,
                                                    bgcolor: organization.branding.secondaryColor,
                                                    borderRadius: 1,
                                                    mr: 1,
                                                }}
                                            />
                                        ),
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Display Name"
                                    value={organization.branding.companyName}
                                    onChange={(e) =>
                                        setOrganization({
                                            ...organization,
                                            branding: { ...organization.branding, companyName: e.target.value },
                                        })
                                    }
                                    disabled={!editMode}
                                    helperText="This name will be displayed in the platform header"
                                />
                            </Grid>
                        </Grid>
                    </CardContent>
                </TabPanel>

                {/* Security Tab */}
                <TabPanel value={tabValue} index={3}>
                    <CardContent>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                    Security Settings
                                </Typography>
                            </Grid>

                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={organization.settings.mfaRequired}
                                            onChange={(e) =>
                                                setOrganization({
                                                    ...organization,
                                                    settings: { ...organization.settings, mfaRequired: e.target.checked },
                                                })
                                            }
                                            disabled={!editMode}
                                        />
                                    }
                                    label="Require Multi-Factor Authentication (MFA) for all users"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={organization.settings.allowSSOOnly}
                                            onChange={(e) =>
                                                setOrganization({
                                                    ...organization,
                                                    settings: { ...organization.settings, allowSSOOnly: e.target.checked },
                                                })
                                            }
                                            disabled={!editMode}
                                        />
                                    }
                                    label="Allow SSO login only (disable password login)"
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Session Timeout (minutes)"
                                    value={organization.settings.sessionTimeout}
                                    onChange={(e) =>
                                        setOrganization({
                                            ...organization,
                                            settings: { ...organization.settings, sessionTimeout: parseInt(e.target.value) },
                                        })
                                    }
                                    disabled={!editMode}
                                    helperText="Automatically log out inactive users"
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth disabled={!editMode}>
                                    <InputLabel>Data Residency</InputLabel>
                                    <Select
                                        value={organization.settings.dataResidency}
                                        onChange={(e) =>
                                            setOrganization({
                                                ...organization,
                                                settings: { ...organization.settings, dataResidency: e.target.value },
                                            })
                                        }
                                    >
                                        <MenuItem value="us">United States</MenuItem>
                                        <MenuItem value="eu">European Union</MenuItem>
                                        <MenuItem value="apac">Asia-Pacific</MenuItem>
                                        <MenuItem value="multi-region">Multi-Region</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12}>
                                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                    Notifications
                                </Typography>
                            </Grid>

                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={organization.settings.allowEmailNotifications}
                                            onChange={(e) =>
                                                setOrganization({
                                                    ...organization,
                                                    settings: { ...organization.settings, allowEmailNotifications: e.target.checked },
                                                })
                                            }
                                            disabled={!editMode}
                                        />
                                    }
                                    label="Enable email notifications"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={organization.settings.allowSlackIntegration}
                                            onChange={(e) =>
                                                setOrganization({
                                                    ...organization,
                                                    settings: { ...organization.settings, allowSlackIntegration: e.target.checked },
                                                })
                                            }
                                            disabled={!editMode}
                                        />
                                    }
                                    label="Enable Slack integration"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Notification Email"
                                    value={organization.settings.notificationEmail}
                                    onChange={(e) =>
                                        setOrganization({
                                            ...organization,
                                            settings: { ...organization.settings, notificationEmail: e.target.value },
                                        })
                                    }
                                    disabled={!editMode}
                                    helperText="Admin email for system notifications"
                                />
                            </Grid>
                        </Grid>
                    </CardContent>
                </TabPanel>

                {/* Team Tab */}
                <TabPanel value={tabValue} index={4}>
                    <CardContent>
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <People sx={{ fontSize: 60, color: 'rgba(255,255,255,0.3)', mb: 2 }} />
                            <Typography variant="h6" sx={{ mb: 1 }}>
                                Team Management
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3 }}>
                                Manage users, roles, and permissions from the User Management page
                            </Typography>
                            <Button
                                variant="contained"
                                href="/users"
                                sx={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                }}
                            >
                                Go to User Management
                            </Button>
                        </Box>
                    </CardContent>
                </TabPanel>
            </Card>

            {/* Upgrade Dialog */}
            <Dialog
                open={upgradeDialogOpen}
                onClose={() => setUpgradeDialogOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: '#1a1f3a',
                        border: '1px solid rgba(255,255,255,0.1)',
                    },
                }}
            >
                <DialogTitle sx={{ color: 'white' }}>
                    <Upgrade sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Upgrade Subscription
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        {Object.entries(planFeatures).map(([key, plan]) => (
                            <Grid item xs={12} sm={6} md={3} key={key}>
                                <Card
                                    sx={{
                                        bgcolor: `${plan.color}10`,
                                        border: `2px solid ${plan.color}`,
                                        cursor: 'pointer',
                                        '&:hover': {
                                            bgcolor: `${plan.color}20`,
                                        },
                                    }}
                                >
                                    <CardContent>
                                        <Typography variant="h6" sx={{ fontWeight: 700, color: plan.color }}>
                                            {plan.name}
                                        </Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 700, my: 1 }}>
                                            ${plan.price.toLocaleString()}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                            {plan.seats} seats included
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                    <Alert severity="info" sx={{ mt: 3 }}>
                        Contact our sales team to discuss custom enterprise plans with additional seats and features.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUpgradeDialogOpen(false)}>Close</Button>
                    <Button
                        variant="contained"
                        sx={{
                            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                            color: '#000',
                        }}
                    >
                        Contact Sales
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}






