import { useState } from 'react';
import {
    Box,
    Typography,
    Stepper,
    Step,
    StepLabel,
    Button,
    Card,
    CardContent,
    Grid,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Alert
} from '@mui/material';
import { CheckCircle, NavigateNext, NavigateBefore, Save } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const steps = [
    'Organization Profile',
    'Framework Selection',
    'Scope Definition',
    'Risk Appetite',
    'Stakeholder Assignment'
];

const frameworks = [
    { id: 'iso27001', name: 'ISO 27001', description: 'Information Security Management' },
    { id: 'soc2', name: 'SOC 2', description: 'Trust Services Criteria' },
    { id: 'gdpr', name: 'GDPR', description: 'EU Data Protection' },
    { id: 'hipaa', name: 'HIPAA', description: 'Healthcare Privacy' },
    { id: 'pci', name: 'PCI DSS', description: 'Payment Card Security' },
    { id: 'ccpa', name: 'CCPA', description: 'California Privacy' },
    { id: 'tisax', name: 'TISAX', description: 'Automotive Information Security' },
    { id: 'nist', name: 'NIST CSF', description: 'Cybersecurity Framework' }
];

const industries = [
    'Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing',
    'Education', 'Government', 'Energy', 'Telecommunications', 'Other'
];

const companySizes = [
    '1-10 employees',
    '11-50 employees',
    '51-200 employees',
    '201-500 employees',
    '501-1000 employees',
    '1001+ employees'
];

export default function OnboardingWizard() {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [saved, setSaved] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        // Step 1: Organization Profile
        companyName: '',
        industry: '',
        companySize: '',
        country: '',
        description: '',

        // Step 2: Framework Selection
        selectedFrameworks: [] as string[],
        primaryFramework: '',

        // Step 3: Scope Definition
        systems: '',
        dataTypes: [] as string[],
        locations: '',
        processes: '',

        // Step 4: Risk Appetite
        riskTolerance: 'medium',
        acceptableRiskLevel: '5',

        // Step 5: Stakeholder Assignment
        complianceOfficer: '',
        riskManager: '',
        securityLead: '',
        auditLead: ''
    });

    const handleNext = () => {
        if (activeStep === steps.length - 1) {
            // Complete onboarding
            handleComplete();
        } else {
            setActiveStep((prev) => prev + 1);
        }
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    const handleSave = () => {
        // Save progress to localStorage
        localStorage.setItem('grc_onboarding', JSON.stringify({ formData, activeStep }));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleComplete = () => {
        // Save final data
        localStorage.setItem('grc_onboarding_complete', JSON.stringify(formData));
        localStorage.removeItem('grc_onboarding');
        // Navigate to dashboard
        navigate('/dashboard');
    };

    const updateFormData = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const isStepValid = () => {
        switch (activeStep) {
            case 0:
                return formData.companyName && formData.industry && formData.companySize && formData.country;
            case 1:
                return formData.selectedFrameworks.length > 0 && formData.primaryFramework;
            case 2:
                return formData.systems && formData.dataTypes.length > 0;
            case 3:
                return formData.riskTolerance && formData.acceptableRiskLevel;
            case 4:
                return formData.complianceOfficer && formData.riskManager;
            default:
                return true;
        }
    };

    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Tell us about your organization
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Company Name"
                                value={formData.companyName}
                                onChange={(e) => updateFormData('companyName', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Industry</InputLabel>
                                <Select
                                    value={formData.industry}
                                    onChange={(e) => updateFormData('industry', e.target.value)}
                                    label="Industry"
                                >
                                    {industries.map(ind => (
                                        <MenuItem key={ind} value={ind}>{ind}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Company Size</InputLabel>
                                <Select
                                    value={formData.companySize}
                                    onChange={(e) => updateFormData('companySize', e.target.value)}
                                    label="Company Size"
                                >
                                    {companySizes.map(size => (
                                        <MenuItem key={size} value={size}>{size}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Primary Country"
                                value={formData.country}
                                onChange={(e) => updateFormData('country', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Brief Description"
                                value={formData.description}
                                onChange={(e) => updateFormData('description', e.target.value)}
                            />
                        </Grid>
                    </Grid>
                );

            case 1:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Select compliance frameworks
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Choose all frameworks that apply to your organization
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <Grid container spacing={2}>
                                {frameworks.map(framework => (
                                    <Grid item xs={12} sm={6} md={4} key={framework.id}>
                                        <Card
                                            sx={{
                                                cursor: 'pointer',
                                                border: formData.selectedFrameworks.includes(framework.id) ? '2px solid' : '1px solid',
                                                borderColor: formData.selectedFrameworks.includes(framework.id) ? '#43e97b' : 'rgba(255,255,255,0.1)',
                                                bgcolor: formData.selectedFrameworks.includes(framework.id) ? 'rgba(67, 233, 123, 0.1)' : '#1a1f3a',
                                                '&:hover': {
                                                    borderColor: '#43e97b'
                                                }
                                            }}
                                            onClick={() => {
                                                const selected = formData.selectedFrameworks.includes(framework.id)
                                                    ? formData.selectedFrameworks.filter(f => f !== framework.id)
                                                    : [...formData.selectedFrameworks, framework.id];
                                                updateFormData('selectedFrameworks', selected);
                                            }}
                                        >
                                            <CardContent>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <Typography variant="h6">{framework.name}</Typography>
                                                    {formData.selectedFrameworks.includes(framework.id) && (
                                                        <CheckCircle sx={{ color: '#43e97b' }} />
                                                    )}
                                                </Box>
                                                <Typography variant="body2" color="text.secondary">
                                                    {framework.description}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Grid>
                        {formData.selectedFrameworks.length > 0 && (
                            <Grid item xs={12}>
                                <FormControl fullWidth required>
                                    <InputLabel>Primary Framework</InputLabel>
                                    <Select
                                        value={formData.primaryFramework}
                                        onChange={(e) => updateFormData('primaryFramework', e.target.value)}
                                        label="Primary Framework"
                                    >
                                        {frameworks
                                            .filter(f => formData.selectedFrameworks.includes(f.id))
                                            .map(f => (
                                                <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                                            ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}
                    </Grid>
                );

            case 2:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Define your compliance scope
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Systems and Applications in Scope"
                                value={formData.systems}
                                onChange={(e) => updateFormData('systems', e.target.value)}
                                placeholder="e.g., CRM, ERP, Payment Gateway, HR System"
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>
                                Types of Data Processed
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {['Personal Data', 'Financial Data', 'Health Data', 'Payment Card Data', 'Confidential Business Data'].map(type => (
                                    <Chip
                                        key={type}
                                        label={type}
                                        onClick={() => {
                                            const types = formData.dataTypes.includes(type)
                                                ? formData.dataTypes.filter(t => t !== type)
                                                : [...formData.dataTypes, type];
                                            updateFormData('dataTypes', types);
                                        }}
                                        color={formData.dataTypes.includes(type) ? 'primary' : 'default'}
                                        sx={{
                                            bgcolor: formData.dataTypes.includes(type) ? '#43e97b' : 'rgba(255,255,255,0.1)',
                                            color: formData.dataTypes.includes(type) ? '#000' : '#fff'
                                        }}
                                    />
                                ))}
                            </Box>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Geographic Locations"
                                value={formData.locations}
                                onChange={(e) => updateFormData('locations', e.target.value)}
                                placeholder="e.g., US, EU, APAC"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Key Business Processes"
                                value={formData.processes}
                                onChange={(e) => updateFormData('processes', e.target.value)}
                                placeholder="e.g., Customer onboarding, Payment processing, Data analytics"
                            />
                        </Grid>
                    </Grid>
                );

            case 3:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Define your risk appetite
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Risk Tolerance Level</InputLabel>
                                <Select
                                    value={formData.riskTolerance}
                                    onChange={(e) => updateFormData('riskTolerance', e.target.value)}
                                    label="Risk Tolerance Level"
                                >
                                    <MenuItem value="low">Low - Minimal risk acceptance</MenuItem>
                                    <MenuItem value="medium">Medium - Balanced approach</MenuItem>
                                    <MenuItem value="high">High - Growth-focused with managed risks</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography gutterBottom>
                                Acceptable Risk Score (1-10)
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                                    <Box
                                        key={score}
                                        onClick={() => updateFormData('acceptableRiskLevel', score.toString())}
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px solid',
                                            borderColor: formData.acceptableRiskLevel === score.toString() ? '#43e97b' : 'rgba(255,255,255,0.3)',
                                            bgcolor: formData.acceptableRiskLevel === score.toString() ? '#43e97b' : 'transparent',
                                            color: formData.acceptableRiskLevel === score.toString() ? '#000' : '#fff',
                                            borderRadius: 1,
                                            cursor: 'pointer',
                                            '&:hover': {
                                                borderColor: '#43e97b'
                                            }
                                        }}
                                    >
                                        {score}
                                    </Box>
                                ))}
                            </Box>
                        </Grid>
                    </Grid>
                );

            case 4:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Assign key stakeholders
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Compliance Officer"
                                value={formData.complianceOfficer}
                                onChange={(e) => updateFormData('complianceOfficer', e.target.value)}
                                placeholder="Email address"
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Risk Manager"
                                value={formData.riskManager}
                                onChange={(e) => updateFormData('riskManager', e.target.value)}
                                placeholder="Email address"
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Security Lead"
                                value={formData.securityLead}
                                onChange={(e) => updateFormData('securityLead', e.target.value)}
                                placeholder="Email address"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Audit Lead"
                                value={formData.auditLead}
                                onChange={(e) => updateFormData('auditLead', e.target.value)}
                                placeholder="Email address"
                            />
                        </Grid>
                    </Grid>
                );

            default:
                return null;
        }
    };

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    Compliance Onboarding
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Let's get your GRC program set up in 5 easy steps
                </Typography>
            </Box>

            <Card sx={{ bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)', mb: 3 }}>
                <CardContent>
                    <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    {saved && (
                        <Alert severity="success" sx={{ mb: 3 }}>
                            Progress saved successfully!
                        </Alert>
                    )}

                    <Box sx={{ minHeight: 400 }}>
                        {renderStepContent()}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                        <Box>
                            <Button
                                onClick={handleBack}
                                disabled={activeStep === 0}
                                startIcon={<NavigateBefore />}
                                sx={{ mr: 1 }}
                            >
                                Back
                            </Button>
                            <Button
                                onClick={handleSave}
                                startIcon={<Save />}
                                variant="outlined"
                                sx={{ borderColor: 'rgba(255,255,255,0.3)' }}
                            >
                                Save Progress
                            </Button>
                        </Box>
                        <Button
                            onClick={handleNext}
                            disabled={!isStepValid()}
                            endIcon={activeStep === steps.length - 1 ? <CheckCircle /> : <NavigateNext />}
                            variant="contained"
                            sx={{
                                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                color: '#000',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #38f9d7 0%, #43e97b 100%)',
                                }
                            }}
                        >
                            {activeStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}
