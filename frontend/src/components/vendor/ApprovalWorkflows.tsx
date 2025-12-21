/**
 * Approval Workflow Dashboard Component
 * Displays and manages vendor approval workflows
 */

import React, { useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    Stepper,
    Step,
    StepLabel,
    // Paper,
    Grid,
    IconButton,
    // Tooltip,
} from '@mui/material';
import {
    CheckCircle,
    Cancel,
    HourglassEmpty,
    Warning,
    Visibility,
    ThumbUp,
    // ThumbDown,
} from '@mui/icons-material';
// import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface ApprovalWorkflow {
    id: string;
    vendor: {
        id: string;
        name: string;
    };
    workflowType: string;
    status: string;
    businessJustification?: string;
    riskAssessmentSummary?: string;
    currentStep: number;
    totalSteps: number;
    initiatedBy: string;
    createdAt: string;
    completedAt?: string;
    steps: ApprovalStep[];
}

interface ApprovalStep {
    id: string;
    stepOrder: number;
    approverRole: string;
    approverUserId: string;
    approverName: string;
    status: string;
    decision?: string;
    comments?: string;
    decidedAt?: string;
}

const ApprovalWorkflows: React.FC = () => {
    // const { user } = useAuth();
    const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
    const [pendingApprovals, setPendingApprovals] = useState<ApprovalWorkflow[]>([]);
    const [selectedWorkflow, setSelectedWorkflow] = useState<ApprovalWorkflow | null>(null);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
    const [decision, setDecision] = useState<string>('APPROVED');
    const [comments, setComments] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPendingApprovals();
        fetchAllWorkflows();
    }, []);

    const fetchPendingApprovals = async () => {
        try {
            const response = await api.get('/vendors/approvals/pending');
            setPendingApprovals(response.data.data || []);
        } catch (err: any) {
            console.error('Failed to fetch pending approvals:', err);
        }
    };

    const fetchAllWorkflows = async () => {
        try {
            setLoading(true);
            // This would need to be updated based on actual API endpoint
            const response = await api.get('/vendors/approvals/workflows');
            setWorkflows(response.data.data || []);
        } catch (err: any) {
            setError('Failed to load workflows');
        } finally {
            setLoading(false);
        }
    };

    const handleViewWorkflow = async (workflowId: string) => {
        try {
            const response = await api.get(`/vendors/approvals/workflows/${workflowId}`);
            setSelectedWorkflow(response.data.data);
            setViewDialogOpen(true);
        } catch (err: any) {
            setError('Failed to load workflow details');
        }
    };

    const handleApprovalAction = (workflow: ApprovalWorkflow) => {
        setSelectedWorkflow(workflow);
        setApprovalDialogOpen(true);
        setDecision('APPROVED');
        setComments('');
    };

    const submitApproval = async () => {
        if (!selectedWorkflow) return;

        try {
            setLoading(true);
            const currentStep = selectedWorkflow.steps.find(
                s => s.status === 'PENDING'
            );

            if (!currentStep) {
                throw new Error('No pending step found');
            }

            await api.post(
                `/vendors/approvals/workflows/${selectedWorkflow.id}/steps/${currentStep.stepOrder}/approve`,
                {
                    decision,
                    comments,
                }
            );

            setApprovalDialogOpen(false);
            setError(null);
            
            // Refresh lists
            await fetchPendingApprovals();
            await fetchAllWorkflows();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to submit approval');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, any> = {
            PENDING: 'warning',
            APPROVED: 'success',
            IN_PROGRESS: 'info',
            REJECTED: 'error',
            COMPLETED: 'success',
            CANCELLED: 'default',
        };
        return colors[status] || 'default';
    };

    const getStatusIcon = (status: string) => {
        const icons: Record<string, any> = {
            PENDING: <HourglassEmpty />,
            APPROVED: <CheckCircle />,
            IN_PROGRESS: <HourglassEmpty />,
            REJECTED: <Cancel />,
            COMPLETED: <CheckCircle />,
            CANCELLED: <Warning />,
        };
        return icons[status] || null;
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Approval Workflows
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Pending Approvals Section */}
            {pendingApprovals.length > 0 && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                            ⚠️ Pending Your Approval ({pendingApprovals.length})
                        </Typography>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Vendor</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Initiated</TableCell>
                                        <TableCell>Current Step</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {pendingApprovals.map((workflow) => (
                                        <TableRow key={workflow.id} sx={{ backgroundColor: '#fff3cd' }}>
                                            <TableCell>{workflow.vendor.name}</TableCell>
                                            <TableCell>
                                                <Chip label={workflow.workflowType} size="small" />
                                            </TableCell>
                                            <TableCell>
                                                {new Date(workflow.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                {workflow.currentStep} of {workflow.totalSteps}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    size="small"
                                                    startIcon={<ThumbUp />}
                                                    onClick={() => handleApprovalAction(workflow)}
                                                    sx={{ mr: 1 }}
                                                >
                                                    Review & Approve
                                                </Button>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleViewWorkflow(workflow.id)}
                                                >
                                                    <Visibility />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}

            {/* All Workflows Section */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        All Workflows
                    </Typography>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Vendor</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Progress</TableCell>
                                    <TableCell>Initiated</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {workflows.map((workflow) => (
                                    <TableRow key={workflow.id}>
                                        <TableCell>{workflow.vendor.name}</TableCell>
                                        <TableCell>
                                            <Chip label={workflow.workflowType} size="small" />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={getStatusIcon(workflow.status)}
                                                label={workflow.status}
                                                color={getStatusColor(workflow.status)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {workflow.currentStep} / {workflow.totalSteps}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(workflow.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleViewWorkflow(workflow.id)}
                                            >
                                                <Visibility />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* View Workflow Dialog */}
            <Dialog
                open={viewDialogOpen}
                onClose={() => setViewDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                {selectedWorkflow && (
                    <>
                        <DialogTitle>
                            Workflow Details: {selectedWorkflow.vendor.name}
                        </DialogTitle>
                        <DialogContent>
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Workflow Type
                                    </Typography>
                                    <Typography variant="body1">
                                        {selectedWorkflow.workflowType}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Status
                                    </Typography>
                                    <Chip
                                        label={selectedWorkflow.status}
                                        color={getStatusColor(selectedWorkflow.status)}
                                    />
                                </Grid>
                                {selectedWorkflow.businessJustification && (
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" color="textSecondary">
                                            Business Justification
                                        </Typography>
                                        <Typography variant="body2">
                                            {selectedWorkflow.businessJustification}
                                        </Typography>
                                    </Grid>
                                )}
                                {selectedWorkflow.riskAssessmentSummary && (
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" color="textSecondary">
                                            Risk Assessment Summary
                                        </Typography>
                                        <Typography variant="body2">
                                            {selectedWorkflow.riskAssessmentSummary}
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>

                            <Box sx={{ mt: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Approval Steps
                                </Typography>
                                <Stepper activeStep={selectedWorkflow.currentStep - 1} orientation="vertical">
                                    {selectedWorkflow.steps.map((step) => (
                                        <Step key={step.id}>
                                            <StepLabel
                                                error={step.decision === 'REJECTED'}
                                                StepIconComponent={() => getStatusIcon(step.status)}
                                            >
                                                <Box>
                                                    <Typography variant="body1">
                                                        {step.approverRole} - {step.approverName}
                                                    </Typography>
                                                    {step.decision && (
                                                        <Chip
                                                            label={step.decision}
                                                            size="small"
                                                            color={getStatusColor(step.status)}
                                                            sx={{ mt: 0.5 }}
                                                        />
                                                    )}
                                                    {step.comments && (
                                                        <Typography variant="body2" color="textSecondary">
                                                            {step.comments}
                                                        </Typography>
                                                    )}
                                                    {step.decidedAt && (
                                                        <Typography variant="caption" color="textSecondary">
                                                            Decided on {new Date(step.decidedAt).toLocaleString()}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </StepLabel>
                                        </Step>
                                    ))}
                                </Stepper>
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* Approval Decision Dialog */}
            <Dialog
                open={approvalDialogOpen}
                onClose={() => setApprovalDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                {selectedWorkflow && (
                    <>
                        <DialogTitle>
                            Submit Approval Decision
                        </DialogTitle>
                        <DialogContent>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                Vendor: <strong>{selectedWorkflow.vendor.name}</strong>
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                                Type: <strong>{selectedWorkflow.workflowType}</strong>
                            </Typography>

                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>Decision</InputLabel>
                                <Select
                                    value={decision}
                                    label="Decision"
                                    onChange={(e) => setDecision(e.target.value)}
                                >
                                    <MenuItem value="APPROVED">Approve</MenuItem>
                                    <MenuItem value="REJECTED">Reject</MenuItem>
                                    <MenuItem value="CONDITIONALLY_APPROVED">
                                        Conditionally Approve
                                    </MenuItem>
                                    <MenuItem value="DEFERRED">Defer</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                label="Comments"
                                multiline
                                rows={4}
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                required={decision === 'REJECTED' || decision === 'CONDITIONALLY_APPROVED'}
                                helperText={
                                    decision === 'REJECTED' || decision === 'CONDITIONALLY_APPROVED'
                                        ? 'Comments are required for this decision'
                                        : 'Optional comments'
                                }
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setApprovalDialogOpen(false)} disabled={loading}>
                                Cancel
                            </Button>
                            <Button
                                onClick={submitApproval}
                                variant="contained"
                                color="primary"
                                disabled={
                                    loading ||
                                    ((decision === 'REJECTED' || decision === 'CONDITIONALLY_APPROVED') &&
                                        !comments.trim())
                                }
                            >
                                {loading ? 'Submitting...' : 'Submit Decision'}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
};

export default ApprovalWorkflows;
