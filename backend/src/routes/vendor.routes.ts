/**
 * @swagger
 * tags:
 *   name: Vendors
 *   description: Third-party vendor management (TPRM)
 */

/**
 * Vendor Management API Routes (TPRM)
 * Complete third-party risk management endpoints
 */

import express from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { publicServerErrorPayload } from '../middleware/errorHandler';
import { validateBody, validateQuery, validateUUID } from '../middleware/validation';
import {
    CreateVendorSchema,
    UpdateVendorSchema,
    VendorListQuerySchema,
    CreateAssessmentSchema,
    SubmitAssessmentResponseSchema,
    CompleteAssessmentSchema,
    CreateContractSchema,
    UpdateContractSchema,
    RenewContractSchema,
    CreateVendorIssueSchema,
    UpdateVendorIssueSchema,
    UpdateRemediationPlanSchema,
    CreateVendorReviewSchema,
    CreateMonitoringSignalSchema,
    AcknowledgeSignalSchema,
    RecordSLAIncidentSchema,
    AssessmentListQuerySchema
} from '../validators/vendor.validators';
import vendorManagementService from '../services/vendorManagementService';
import vendorAssessmentService from '../services/vendorAssessmentService';
import vendorContractService from '../services/vendorContractService';
import vendorIssueService from '../services/vendorIssueService';
import vendorContinuousMonitoring from '../services/vendorContinuousMonitoring';
import vendorOnboardingRoutes from './vendorOnboarding.routes';

const router = express.Router();

function sendRouteError(res: { status: (code: number) => { json: (body: unknown) => void } }, error: { statusCode?: number; status?: number; message?: string }, fallback = 400) {
    const status = error.statusCode || error.status || fallback;
    res.status(status).json({ error: { message: error.message || 'Request failed.' } });
}

// Apply authentication to all routes
router.use(authenticate);
router.use('/onboarding', vendorOnboardingRoutes);

// ==========================================
// VENDOR CRUD OPERATIONS
// ==========================================

/**
 * @swagger
 * /api/v1/vendors:
 *   get:
 *     summary: List all vendors
 *     description: Get a paginated list of vendors with optional filtering
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageQuery'
 *       - $ref: '#/components/parameters/PageSizeQuery'
 *       - in: query
 *         name: tier
 *         schema:
 *           type: string
 *           enum: [CRITICAL, HIGH, MEDIUM, LOW]
 *         description: Filter by vendor tier
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, PENDING, SUSPENDED, OFFBOARDED]
 *         description: Filter by vendor status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by vendor name or contact
 * @swagger
 * /api/v1/vendors/statistics:
 *   get:
 *     summary: Get vendor statistics
 *     description: Get dashboard statistics for vendor management
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalVendors:
 *                   type: integer
 *                 activeVendors:
 *                   type: integer
 *                 criticalVendors:
 *                   type: integer
 *                 overdueAssessments:
 *                   type: integer
 *                 averageRiskScore:
 *                   type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 */
router.get('/', validateQuery(VendorListQuerySchema), async (req: any, res) => {
    try {
        const { tier, status, vendorType, category, search, hasOverdueReview, page = 1, pageSize = 20 } = req.query;

        const result = await vendorManagementService.listVendors(
            req.user.organizationId,
            {
                tier,
                status,
                vendorType,
                category,
                search,
                hasOverdueReview: hasOverdueReview === 'true',
            },
            Number(page),
            Number(pageSize)
        );

        res.json(result);
    } catch (error: any) {
        res.status(500).json(publicServerErrorPayload(error));
    }
});

/**
 * GET /api/vendors/statistics
 * Get vendor dashboard statistics
 */
router.get('/statistics', async (req: any, res) => {
    try {
        const stats = await vendorManagementService.getVendorStatistics(req.user.organizationId);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json(publicServerErrorPayload(error));
    }
});

/**
 * GET /api/vendors/attention
 * Get vendors requiring attention
 */
router.get('/attention', async (req: any, res) => {
    try {
        const attention = await vendorManagementService.getVendorsRequiringAttention(
            req.user.organizationId
        );
        res.json(attention);
    } catch (error: any) {
        res.status(500).json(publicServerErrorPayload(error));
    }
});

/**
 * GET /api/vendors/:id
 * Get vendor by ID with all relations
 */
router.get('/:id', validateUUID('id'), async (req: any, res) => {
    try {
        const vendor = await vendorManagementService.getVendorById(
            req.params.id,
            req.user.organizationId
        );

        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        res.json(vendor);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

/**
 * POST /api/vendors
 * Create new vendor
 */
router.post('/', requirePermission(PERMISSIONS['vendor.create']), validateBody(CreateVendorSchema), async (req: any, res) => {
    try {
        const vendor = await vendorManagementService.createVendor({
            ...req.body,
            organizationId: req.user.organizationId,
        });

        res.status(201).json(vendor);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * PUT /api/vendors/:id
 * Update vendor
 */
router.put('/:id', requirePermission(PERMISSIONS['vendor.update']), validateUUID('id'), validateBody(UpdateVendorSchema), async (req: any, res) => {
    try {
        const vendor = await vendorManagementService.updateVendor(
            req.params.id,
            req.user.organizationId,
            req.body
        );

        res.json(vendor);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
});

/**
 * DELETE /api/vendors/:id
 * Terminate vendor (soft delete)
 */
router.delete('/:id', requirePermission(PERMISSIONS['vendor.delete']), validateUUID('id'), async (req: any, res) => {
    try {
        await vendorManagementService.deleteVendor(req.params.id, req.user.organizationId);
        res.status(204).send();
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
});

/**
 * POST /api/vendors/:id/approve
 * Approve vendor
 */
router.post('/:id/approve', requirePermission(PERMISSIONS['approval.decide']), validateUUID('id'), async (req: any, res) => {
    try {
        const data = await vendorManagementService.approveVendor(
            req.params.id,
            req.user.organizationId,
            req.user.id,
            req.body || {}
        );
        res.json({ success: true, message: 'Vendor approved successfully', data });
    } catch (error: any) {
        sendRouteError(res, error);
    }
});

/**
 * POST /api/vendors/:id/onboard
 * Onboard vendor
 */
router.post('/:id/onboard', requirePermission(PERMISSIONS['vendor.update']), validateUUID('id'), async (req: any, res) => {
    try {
        const data = await vendorManagementService.onboardVendor(req.params.id, req.user.organizationId, req.user.id);
        res.json({ success: true, message: 'Vendor onboarded successfully', data });
    } catch (error: any) {
        sendRouteError(res, error);
    }
});

/**
 * POST /api/vendors/:id/offboard
 * Offboard vendor
 */
router.post('/:id/offboard', requirePermission(PERMISSIONS['vendor.update']), validateUUID('id'), async (req: any, res) => {
    try {
        await vendorManagementService.offboardVendor(
            req.params.id,
            req.user.organizationId,
            req.body
        );
        res.json({ message: 'Vendor offboarded successfully' });
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
});

// ==========================================
// VENDOR ASSESSMENTS
// ==========================================

/**
 * GET /api/vendors/:id/assessments
 * List assessments for vendor
 */
router.get('/:id/assessments', async (req: any, res) => {
    try {
        const assessments = await vendorAssessmentService.listVendorAssessments(
            req.params.id,
            req.user.organizationId
        );
        res.json(assessments);
    } catch (error: any) {
        res.status(error.statusCode || 500).json(publicServerErrorPayload(error));
    }
});

/**
 * POST /api/vendors/:id/assessments
 * Create new assessment for vendor
 */
router.post('/:id/assessments', requirePermission(PERMISSIONS['assessment.create']), validateUUID('id'), validateBody(CreateAssessmentSchema), async (req: any, res) => {
    try {
        const assessment = await vendorAssessmentService.createAssessment({
            ...req.body,
            vendorId: req.params.id,
            organizationId: req.user.organizationId,
        });

        res.status(201).json(assessment);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
});

/**
 * GET /api/assessments/:id
 * Get assessment by ID
 */
router.get('/assessments/:assessmentId', async (req: any, res) => {
    try {
        const assessment = await vendorAssessmentService.getAssessmentById(
            req.params.assessmentId,
            req.user.organizationId
        );

        if (!assessment) {
            return res.status(404).json({ error: 'Assessment not found' });
        }

        res.json(assessment);
    } catch (error: any) {
        res.status(500).json(publicServerErrorPayload(error));
    }
});

/**
 * POST /api/assessments/:id/responses
 * Submit response to assessment question
 */
router.post('/assessments/:assessmentId/responses', requirePermission(PERMISSIONS['assessment.respond']), validateUUID('assessmentId'), validateBody(SubmitAssessmentResponseSchema), async (req: any, res) => {
    try {
        await vendorAssessmentService.submitResponse(
            {
                assessmentId: req.params.assessmentId,
                organizationId: req.user.organizationId,
                questionId: req.body.questionId,
                response: req.body.response || req.body.answer,
                notes: req.body.notes,
            },
            req.user.id
        );

        res.json({ message: 'Response submitted successfully' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/assessments/:id/complete
 * Complete assessment and calculate scores
 */
router.post('/assessments/:assessmentId/complete', requirePermission(PERMISSIONS['assessment.complete']), validateUUID('assessmentId'), validateBody(CompleteAssessmentSchema), async (req: any, res) => {
    try {
        const assessment = await vendorAssessmentService.completeAssessment(
            req.params.assessmentId,
            req.user.id,
            req.user.organizationId
        );

        res.json(assessment);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.get('/:id/assessments/:assessmentId', validateUUID('id'), validateUUID('assessmentId'), async (req: any, res) => {
    try {
        const assessment = await vendorAssessmentService.getAssessmentById(
            req.params.assessmentId,
            req.user.organizationId
        );
        if (!assessment || assessment.vendorId !== req.params.id) {
            return res.status(404).json({ error: 'Assessment not found' });
        }
        res.json(assessment);
    } catch (error: any) {
        res.status(500).json(publicServerErrorPayload(error));
    }
});

router.post('/:id/assessments/:assessmentId/responses', requirePermission(PERMISSIONS['assessment.respond']), validateUUID('id'), validateUUID('assessmentId'), async (req: any, res) => {
    try {
        const data = await vendorAssessmentService.submitResponse(
            {
                assessmentId: req.params.assessmentId,
                organizationId: req.user.organizationId,
                vendorId: req.params.id,
                questionId: req.body.questionId,
                response: req.body.response || req.body.answer,
                notes: req.body.notes,
            },
            req.user.id
        );
        res.json(data);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/:id/assessments/:assessmentId/complete', requirePermission(PERMISSIONS['assessment.complete']), validateUUID('id'), validateUUID('assessmentId'), async (req: any, res) => {
    try {
        const existing = await vendorAssessmentService.getAssessmentById(req.params.assessmentId, req.user.organizationId);
        if (!existing || existing.vendorId !== req.params.id) {
            return res.status(404).json({ error: 'Assessment not found' });
        }
        const assessment = await vendorAssessmentService.completeAssessment(
            req.params.assessmentId,
            req.user.id,
            req.user.organizationId
        );
        res.json(assessment);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/assessments/overdue
 * Get overdue assessments
 */
router.get('/assessments/overdue', async (req: any, res) => {
    try {
        const overdue = await vendorAssessmentService.getOverdueAssessments(
            req.user.organizationId
        );
        res.json(overdue);
    } catch (error: any) {
        res.status(500).json(publicServerErrorPayload(error));
    }
});

// ==========================================
// VENDOR CONTRACTS & SLAs
// ==========================================

/**
 * GET /api/vendors/:id/contracts
 * List contracts for vendor
 */
router.get('/:id/contracts', async (req: any, res) => {
    try {
        const contracts = await vendorContractService.listVendorContracts(
            req.params.id,
            req.user.organizationId
        );
        res.json(contracts);
    } catch (error: any) {
        res.status(500).json(publicServerErrorPayload(error));
    }
});

/**
 * POST /api/vendors/:id/contracts
 * Create contract for vendor
 */
router.post('/:id/contracts', requirePermission(PERMISSIONS['vendor.update']), validateUUID('id'), validateBody(CreateContractSchema), async (req: any, res) => {
    try {
        const contract = await vendorContractService.createContract({
            ...req.body,
            vendorId: req.params.id,
            organizationId: req.user.organizationId,
        });

        res.status(201).json(contract);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/contracts/:id
 * Get contract by ID
 */
router.get('/contracts/:contractId', async (req: any, res) => {
    try {
        const contract = await vendorContractService.getContractById(
            req.params.contractId,
            req.user.organizationId
        );

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        res.json(contract);
    } catch (error: any) {
        res.status(500).json(publicServerErrorPayload(error));
    }
});

/**
 * PUT /api/contracts/:id
 * Update contract
 */
router.put('/contracts/:contractId', requirePermission(PERMISSIONS['vendor.update']), validateUUID('contractId'), validateBody(UpdateContractSchema), async (req: any, res) => {
    try {
        await vendorContractService.updateContract(
            req.params.contractId,
            req.user.organizationId,
            req.body
        );

        res.json({ message: 'Contract updated successfully' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/contracts/:id/approve
 * Approve contract
 */
router.post('/contracts/:contractId/approve', requirePermission(PERMISSIONS['approval.decide']), async (req: any, res) => {
    try {
        await vendorContractService.approveContract(
            req.params.contractId,
            req.user.organizationId,
            req.user.id
        );

        res.json({ message: 'Contract approved successfully' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/contracts/expiring
 * Get expiring contracts
 */
router.get('/contracts/expiring', async (req: any, res) => {
    try {
        const { days = 90 } = req.query;
        const contracts = await vendorContractService.getExpiringContracts(
            req.user.organizationId,
            Number(days)
        );

        res.json(contracts);
    } catch (error: any) {
        res.status(500).json(publicServerErrorPayload(error));
    }
});

/**
 * POST /api/contracts/:id/sla
 * Track SLA metric
 */
router.post('/contracts/:contractId/sla', requirePermission(PERMISSIONS['vendor.update']), validateUUID('contractId'), validateBody(RecordSLAIncidentSchema), async (req: any, res) => {
    try {
        const slaRecord = await vendorContractService.trackSLAMetric({
            ...req.body,
            organizationId: req.user.organizationId,
            contractId: req.params.contractId,
        });

        res.status(201).json(slaRecord);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
});

/**
 * GET /api/contracts/:id/risk-analysis
 * Analyze contract risk clauses
 */
router.get('/contracts/:contractId/risk-analysis', async (req: any, res) => {
    try {
        const analysis = await vendorContractService.analyzeContractRisk(req.params.contractId, req.user.organizationId);
        res.json(analysis);
    } catch (error: any) {
        res.status(error.statusCode || 500).json(publicServerErrorPayload(error));
    }
});

/**
 * GET /api/contracts/sla-report
 * Get SLA compliance report
 */
router.get('/contracts/sla-report', async (req: any, res) => {
    try {
        const { period = 'MONTH' } = req.query;
        const report = await vendorContractService.getSLAComplianceReport(
            req.user.organizationId,
            period as any
        );

        res.json(report);
    } catch (error: any) {
        res.status(500).json(publicServerErrorPayload(error));
    }
});

// ==========================================
// VENDOR ISSUES & REMEDIATION
// ==========================================

/**
 * GET /api/vendors/:id/issues
 * List issues for vendor
 */
router.get('/:id/issues', async (req: any, res) => {
    try {
        const { status } = req.query;
        const issues = await vendorIssueService.listVendorIssues(
            req.params.id,
            req.user.organizationId,
            status as any
        );
        res.json(issues);
    } catch (error: any) {
        res.status(error.statusCode || 500).json(publicServerErrorPayload(error));
    }
});

/**
 * POST /api/vendors/:id/issues
 * Create issue for vendor
 */
router.post('/:id/issues', requirePermission(PERMISSIONS['finding.create']), validateUUID('id'), validateBody(CreateVendorIssueSchema), async (req: any, res) => {
    try {
        const issue = await vendorIssueService.createIssue({
            ...req.body,
            vendorId: req.params.id,
            organizationId: req.user.organizationId,
            identifiedBy: req.user.id,
        });

        res.status(201).json(issue);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
});

/**
 * PUT /api/issues/:id/cap
 * Update Corrective Action Plan
 */
router.put('/issues/:issueId/cap', requirePermission(PERMISSIONS['finding.update']), validateUUID('issueId'), validateBody(UpdateRemediationPlanSchema), async (req: any, res) => {
    try {
        await vendorIssueService.updateCorrectiveActionPlan(
            req.params.issueId,
            req.user.organizationId,
            req.body.correctiveActionPlan,
            new Date(req.body.targetRemediationDate)
        );

        res.json({ message: 'Corrective Action Plan updated successfully' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/issues/:id/remediation
 * Submit remediation evidence
 */
router.post('/issues/:issueId/remediation', requirePermission(PERMISSIONS['finding.update']), validateUUID('issueId'), async (req: any, res) => {
    try {
        await vendorIssueService.submitRemediation(
            req.params.issueId,
            req.user.organizationId,
            req.body.evidenceUrl,
            req.body.notes
        );

        res.json({ message: 'Remediation submitted successfully' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/issues/:id/validate
 * Validate remediation
 */
router.post('/issues/:issueId/validate', requirePermission(PERMISSIONS['finding.update']), async (req: any, res) => {
    try {
        await vendorIssueService.validateRemediation(
            req.params.issueId,
            req.user.organizationId,
            req.user.id,
            req.body.validationNotes,
            req.body.approved
        );

        res.json({ message: 'Remediation validated successfully' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/issues/:id/close
 * Close issue
 */
router.post('/issues/:issueId/close', requirePermission(PERMISSIONS['finding.close']), async (req: any, res) => {
    try {
        const issue = await vendorIssueService.getIssueById(req.params.issueId, req.user.organizationId);
        if (!issue) {
            res.status(404).json({ error: 'Finding not found' });
            return;
        }
        const { closeFinding } = await import('../services/vendorLifecycleClosureService');
        const data = await closeFinding(req.user.organizationId, issue.vendorId, {
            id: req.user.id,
            role: req.user.role,
            name: req.user.name,
        }, req.params.issueId, {
            notes: req.body?.closureNotes,
            evidenceId: req.body?.closureEvidence || req.body?.evidenceId,
        });
        res.json({ success: true, message: 'Issue closed successfully', data });
    } catch (error: any) {
        sendRouteError(res, error);
    }
});

/**
 * POST /api/issues/:id/accept-risk
 * Accept risk without remediation
 */
router.post('/issues/:issueId/accept-risk', requirePermission(PERMISSIONS['risk.accept']), async (req: any, res) => {
    try {
        const issue = await vendorIssueService.getIssueById(req.params.issueId, req.user.organizationId);
        if (!issue) {
            res.status(404).json({ error: 'Finding not found' });
            return;
        }
        const actor = { id: req.user.id, role: req.user.role, name: req.user.name };
        const { acceptFindingRisk, approveFindingRisk } = await import('../services/vendorLifecycleClosureService');
        const data = issue.acceptanceRequestedBy && issue.acceptanceRequestedBy !== req.user.id
            ? await approveFindingRisk(req.user.organizationId, issue.vendorId, actor, req.params.issueId, {
                rationale: req.body?.acceptanceRationale || req.body?.rationale,
                conditions: req.body?.conditions,
            })
            : await acceptFindingRisk(req.user.organizationId, issue.vendorId, actor, req.params.issueId, {
                rationale: req.body?.acceptanceRationale || req.body?.rationale,
                conditions: req.body?.conditions,
            });
        res.json({ success: true, message: issue.acceptanceRequestedBy && issue.acceptanceRequestedBy !== req.user.id ? 'Risk accepted successfully' : 'Risk acceptance requested', data });
    } catch (error: any) {
        sendRouteError(res, error);
    }
});

/**
 * GET /api/issues/overdue
 * Get overdue issues
 */
router.get('/issues/overdue', async (req: any, res) => {
    try {
        const issues = await vendorIssueService.getOverdueIssues(req.user.organizationId);
        res.json(issues);
    } catch (error: any) {
        res.status(500).json(publicServerErrorPayload(error));
    }
});

/**
 * GET /api/issues/statistics
 * Get issue statistics
 */
router.get('/issues/statistics', async (req: any, res) => {
    try {
        const stats = await vendorIssueService.getIssueStatistics(req.user.organizationId);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json(publicServerErrorPayload(error));
    }
});

// ==========================================
// CONTINUOUS MONITORING
// ==========================================

/**
 * GET /api/vendors/:id/monitoring
 * Get monitoring signals for vendor
 */
router.get('/:id/monitoring', async (req: any, res) => {
    try {
        const signals = await vendorContinuousMonitoring.getActiveSignals(
            req.user.organizationId,
            req.params.id
        );
        res.json(signals);
    } catch (error: any) {
        res.status(500).json(publicServerErrorPayload(error));
    }
});

/**
 * POST /api/vendors/:id/monitoring
 * Record monitoring signal
 */
router.post('/:id/monitoring', requirePermission(PERMISSIONS['monitoring.manage']), validateUUID('id'), validateBody(CreateMonitoringSignalSchema), async (req: any, res) => {
    try {
        const signal = await vendorContinuousMonitoring.recordSignal({
            ...req.body,
            vendorId: req.params.id,
            organizationId: req.user.organizationId,
        });

        res.status(201).json(signal);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/monitoring/:id/acknowledge
 * Acknowledge monitoring signal
 */
router.post('/monitoring/:signalId/acknowledge', requirePermission(PERMISSIONS['monitoring.manage']), validateUUID('signalId'), validateBody(AcknowledgeSignalSchema), async (req: any, res) => {
    try {
        await vendorContinuousMonitoring.acknowledgeSignal(
            req.params.signalId,
            req.user.organizationId,
            req.user.id
        );

        res.json({ message: 'Signal acknowledged successfully' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/monitoring/:id/resolve
 * Resolve monitoring signal
 */
router.post('/monitoring/:signalId/resolve', requirePermission(PERMISSIONS['monitoring.manage']), validateUUID('signalId'), async (req: any, res) => {
    try {
        await vendorContinuousMonitoring.resolveSignal(
            req.params.signalId,
            req.user.organizationId,
            req.body.actionTaken,
            req.user.id
        );

        res.json({ message: 'Signal resolved successfully' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/monitoring/statistics
 * Get monitoring statistics
 */
router.get('/monitoring/statistics', async (req: any, res) => {
    try {
        const stats = await vendorContinuousMonitoring.getMonitoringStatistics(
            req.user.organizationId
        );
        res.json(stats);
    } catch (error: any) {
        res.status(500).json(publicServerErrorPayload(error));
    }
});

export default router;
