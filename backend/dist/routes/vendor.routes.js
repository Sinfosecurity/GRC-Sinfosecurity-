"use strict";
/**
 * @swagger
 * tags:
 *   name: Vendors
 *   description: Third-party vendor management (TPRM)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Vendor Management API Routes (TPRM)
 * Complete third-party risk management endpoints
 */
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const vendor_validators_1 = require("../validators/vendor.validators");
const vendorManagementService_1 = __importDefault(require("../services/vendorManagementService"));
const vendorAssessmentService_1 = __importDefault(require("../services/vendorAssessmentService"));
const vendorContractService_1 = __importDefault(require("../services/vendorContractService"));
const vendorIssueService_1 = __importDefault(require("../services/vendorIssueService"));
const vendorContinuousMonitoring_1 = __importDefault(require("../services/vendorContinuousMonitoring"));
const router = express_1.default.Router();
// Apply authentication to all routes
router.use(auth_1.authenticate);
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
router.get('/', (0, validation_1.validateQuery)(vendor_validators_1.VendorListQuerySchema), async (req, res) => {
    try {
        const { tier, status, vendorType, category, search, hasOverdueReview, page = 1, pageSize = 20 } = req.query;
        const result = await vendorManagementService_1.default.listVendors(req.user.organizationId, {
            tier,
            status,
            vendorType,
            category,
            search,
            hasOverdueReview: hasOverdueReview === 'true',
        }, Number(page), Number(pageSize));
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/vendors/statistics
 * Get vendor dashboard statistics
 */
router.get('/statistics', async (req, res) => {
    try {
        const stats = await vendorManagementService_1.default.getVendorStatistics(req.user.organizationId);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/vendors/attention
 * Get vendors requiring attention
 */
router.get('/attention', async (req, res) => {
    try {
        const attention = await vendorManagementService_1.default.getVendorsRequiringAttention(req.user.organizationId);
        res.json(attention);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/vendors/:id
 * Get vendor by ID with all relations
 */
router.get('/:id', (0, validation_1.validateUUID)('id'), async (req, res) => {
    try {
        const vendor = await vendorManagementService_1.default.getVendorById(req.params.id, req.user.organizationId);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        res.json(vendor);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/vendors
 * Create new vendor
 */
router.post('/', (0, auth_1.authorize)('ADMIN', 'COMPLIANCE_OFFICER', 'RISK_MANAGER'), (0, validation_1.validateBody)(vendor_validators_1.CreateVendorSchema), async (req, res) => {
    try {
        const vendor = await vendorManagementService_1.default.createVendor({
            ...req.body,
            organizationId: req.user.organizationId,
        });
        res.status(201).json(vendor);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * PUT /api/vendors/:id
 * Update vendor
 */
router.put('/:id', (0, auth_1.authorize)('ADMIN', 'COMPLIANCE_OFFICER', 'RISK_MANAGER'), (0, validation_1.validateUUID)('id'), (0, validation_1.validateBody)(vendor_validators_1.UpdateVendorSchema), async (req, res) => {
    try {
        const vendor = await vendorManagementService_1.default.updateVendor(req.params.id, req.user.organizationId, req.body);
        res.json(vendor);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * DELETE /api/vendors/:id
 * Terminate vendor (soft delete)
 */
router.delete('/:id', (0, auth_1.authorize)('ADMIN'), (0, validation_1.validateUUID)('id'), async (req, res) => {
    try {
        await vendorManagementService_1.default.deleteVendor(req.params.id, req.user.organizationId);
        res.status(204).send();
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * POST /api/vendors/:id/approve
 * Approve vendor
 */
router.post('/:id/approve', (0, auth_1.authorize)('ADMIN', 'COMPLIANCE_OFFICER'), (0, validation_1.validateUUID)('id'), async (req, res) => {
    try {
        await vendorManagementService_1.default.approveVendor(req.params.id, req.user.organizationId, req.user.id);
        res.json({ message: 'Vendor approved successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * POST /api/vendors/:id/onboard
 * Onboard vendor
 */
router.post('/:id/onboard', (0, auth_1.authorize)('ADMIN', 'COMPLIANCE_OFFICER'), (0, validation_1.validateUUID)('id'), async (req, res) => {
    try {
        await vendorManagementService_1.default.onboardVendor(req.params.id, req.user.organizationId);
        res.json({ message: 'Vendor onboarded successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * POST /api/vendors/:id/offboard
 * Offboard vendor
 */
router.post('/:id/offboard', (0, auth_1.authorize)('ADMIN'), (0, validation_1.validateUUID)('id'), async (req, res) => {
    try {
        await vendorManagementService_1.default.offboardVendor(req.params.id, req.user.organizationId, req.body);
        res.json({ message: 'Vendor offboarded successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// ==========================================
// VENDOR ASSESSMENTS
// ==========================================
/**
 * GET /api/vendors/:id/assessments
 * List assessments for vendor
 */
router.get('/:id/assessments', async (req, res) => {
    try {
        const assessments = await vendorAssessmentService_1.default.listVendorAssessments(req.params.id, req.user.organizationId);
        res.json(assessments);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/vendors/:id/assessments
 * Create new assessment for vendor
 */
router.post('/:id/assessments', (0, auth_1.authorize)('ADMIN', 'COMPLIANCE_OFFICER', 'RISK_MANAGER'), (0, validation_1.validateUUID)('id'), (0, validation_1.validateBody)(vendor_validators_1.CreateAssessmentSchema), async (req, res) => {
    try {
        const assessment = await vendorAssessmentService_1.default.createAssessment({
            ...req.body,
            vendorId: req.params.id,
            organizationId: req.user.organizationId,
        });
        res.status(201).json(assessment);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * GET /api/assessments/:id
 * Get assessment by ID
 */
router.get('/assessments/:assessmentId', async (req, res) => {
    try {
        const assessment = await vendorAssessmentService_1.default.getAssessmentById(req.params.assessmentId, req.user.organizationId);
        if (!assessment) {
            return res.status(404).json({ error: 'Assessment not found' });
        }
        res.json(assessment);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/assessments/:id/responses
 * Submit response to assessment question
 */
router.post('/assessments/:assessmentId/responses', (0, auth_1.authorize)('ADMIN', 'COMPLIANCE_OFFICER', 'RISK_MANAGER'), (0, validation_1.validateUUID)('assessmentId'), (0, validation_1.validateBody)(vendor_validators_1.SubmitAssessmentResponseSchema), async (req, res) => {
    try {
        await vendorAssessmentService_1.default.submitResponse({
            assessmentId: req.params.assessmentId,
            ...req.body,
        }, req.user.id);
        res.json({ message: 'Response submitted successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * POST /api/assessments/:id/complete
 * Complete assessment and calculate scores
 */
router.post('/assessments/:assessmentId/complete', (0, auth_1.authorize)('ADMIN', 'COMPLIANCE_OFFICER', 'RISK_MANAGER'), (0, validation_1.validateUUID)('assessmentId'), (0, validation_1.validateBody)(vendor_validators_1.CompleteAssessmentSchema), async (req, res) => {
    try {
        const assessment = await vendorAssessmentService_1.default.completeAssessment(req.params.assessmentId, req.user.id);
        res.json(assessment);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * GET /api/assessments/overdue
 * Get overdue assessments
 */
router.get('/assessments/overdue', async (req, res) => {
    try {
        const overdue = await vendorAssessmentService_1.default.getOverdueAssessments(req.user.organizationId);
        res.json(overdue);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// VENDOR CONTRACTS & SLAs
// ==========================================
/**
 * GET /api/vendors/:id/contracts
 * List contracts for vendor
 */
router.get('/:id/contracts', async (req, res) => {
    try {
        const contracts = await vendorContractService_1.default.listVendorContracts(req.params.id, req.user.organizationId);
        res.json(contracts);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/vendors/:id/contracts
 * Create contract for vendor
 */
router.post('/:id/contracts', (0, auth_1.authorize)('ADMIN', 'COMPLIANCE_OFFICER'), (0, validation_1.validateUUID)('id'), (0, validation_1.validateBody)(vendor_validators_1.CreateContractSchema), async (req, res) => {
    try {
        const contract = await vendorContractService_1.default.createContract({
            ...req.body,
            vendorId: req.params.id,
            organizationId: req.user.organizationId,
        });
        res.status(201).json(contract);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * GET /api/contracts/:id
 * Get contract by ID
 */
router.get('/contracts/:contractId', async (req, res) => {
    try {
        const contract = await vendorContractService_1.default.getContractById(req.params.contractId, req.user.organizationId);
        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }
        res.json(contract);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * PUT /api/contracts/:id
 * Update contract
 */
router.put('/contracts/:contractId', (0, auth_1.authorize)('ADMIN', 'COMPLIANCE_OFFICER'), (0, validation_1.validateUUID)('contractId'), (0, validation_1.validateBody)(vendor_validators_1.UpdateContractSchema), async (req, res) => {
    try {
        await vendorContractService_1.default.updateContract(req.params.contractId, req.user.organizationId, req.body);
        res.json({ message: 'Contract updated successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * POST /api/contracts/:id/approve
 * Approve contract
 */
router.post('/contracts/:contractId/approve', (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        await vendorContractService_1.default.approveContract(req.params.contractId, req.user.organizationId, req.user.id);
        res.json({ message: 'Contract approved successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * GET /api/contracts/expiring
 * Get expiring contracts
 */
router.get('/contracts/expiring', async (req, res) => {
    try {
        const { days = 90 } = req.query;
        const contracts = await vendorContractService_1.default.getExpiringContracts(req.user.organizationId, Number(days));
        res.json(contracts);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/contracts/:id/sla
 * Track SLA metric
 */
router.post('/contracts/:contractId/sla', (0, auth_1.authorize)('ADMIN', 'COMPLIANCE_OFFICER'), (0, validation_1.validateUUID)('contractId'), (0, validation_1.validateBody)(vendor_validators_1.RecordSLAIncidentSchema), async (req, res) => {
    try {
        const slaRecord = await vendorContractService_1.default.trackSLAMetric({
            contractId: req.params.contractId,
            ...req.body,
        });
        res.status(201).json(slaRecord);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * GET /api/contracts/:id/risk-analysis
 * Analyze contract risk clauses
 */
router.get('/contracts/:contractId/risk-analysis', async (req, res) => {
    try {
        const analysis = await vendorContractService_1.default.analyzeContractRisk(req.params.contractId);
        res.json(analysis);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/contracts/sla-report
 * Get SLA compliance report
 */
router.get('/contracts/sla-report', async (req, res) => {
    try {
        const { period = 'MONTH' } = req.query;
        const report = await vendorContractService_1.default.getSLAComplianceReport(req.user.organizationId, period);
        res.json(report);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// VENDOR ISSUES & REMEDIATION
// ==========================================
/**
 * GET /api/vendors/:id/issues
 * List issues for vendor
 */
router.get('/:id/issues', async (req, res) => {
    try {
        const { status } = req.query;
        const issues = await vendorIssueService_1.default.listVendorIssues(req.params.id, req.user.organizationId, status);
        res.json(issues);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/vendors/:id/issues
 * Create issue for vendor
 */
router.post('/:id/issues', (0, auth_1.authorize)('ADMIN', 'COMPLIANCE_OFFICER', 'RISK_MANAGER'), (0, validation_1.validateUUID)('id'), (0, validation_1.validateBody)(vendor_validators_1.CreateVendorIssueSchema), async (req, res) => {
    try {
        const issue = await vendorIssueService_1.default.createIssue({
            ...req.body,
            vendorId: req.params.id,
            organizationId: req.user.organizationId,
            identifiedBy: req.user.id,
        });
        res.status(201).json(issue);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * PUT /api/issues/:id/cap
 * Update Corrective Action Plan
 */
router.put('/issues/:issueId/cap', (0, auth_1.authorize)('ADMIN', 'COMPLIANCE_OFFICER', 'RISK_MANAGER'), (0, validation_1.validateUUID)('issueId'), (0, validation_1.validateBody)(vendor_validators_1.UpdateRemediationPlanSchema), async (req, res) => {
    try {
        await vendorIssueService_1.default.updateCorrectiveActionPlan(req.params.issueId, req.user.organizationId, req.body.correctiveActionPlan, new Date(req.body.targetRemediationDate));
        res.json({ message: 'Corrective Action Plan updated successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * POST /api/issues/:id/remediation
 * Submit remediation evidence
 */
router.post('/issues/:issueId/remediation', (0, auth_1.authorize)('ADMIN', 'COMPLIANCE_OFFICER', 'RISK_MANAGER'), (0, validation_1.validateUUID)('issueId'), async (req, res) => {
    try {
        await vendorIssueService_1.default.submitRemediation(req.params.issueId, req.user.organizationId, req.body.evidenceUrl, req.body.notes);
        res.json({ message: 'Remediation submitted successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * POST /api/issues/:id/validate
 * Validate remediation
 */
router.post('/issues/:issueId/validate', (0, auth_1.authorize)('ADMIN', 'COMPLIANCE_OFFICER'), async (req, res) => {
    try {
        await vendorIssueService_1.default.validateRemediation(req.params.issueId, req.user.organizationId, req.user.id, req.body.validationNotes, req.body.approved);
        res.json({ message: 'Remediation validated successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * POST /api/issues/:id/close
 * Close issue
 */
router.post('/issues/:issueId/close', (0, auth_1.authorize)('ADMIN', 'COMPLIANCE_OFFICER'), async (req, res) => {
    try {
        await vendorIssueService_1.default.closeIssue(req.params.issueId, req.user.organizationId, req.user.id, req.body.closureNotes, req.body.closureEvidence);
        res.json({ message: 'Issue closed successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * POST /api/issues/:id/accept-risk
 * Accept risk without remediation
 */
router.post('/issues/:issueId/accept-risk', (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        await vendorIssueService_1.default.acceptRisk(req.params.issueId, req.user.organizationId, req.user.id, req.body.acceptanceRationale);
        res.json({ message: 'Risk accepted successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * GET /api/issues/overdue
 * Get overdue issues
 */
router.get('/issues/overdue', async (req, res) => {
    try {
        const issues = await vendorIssueService_1.default.getOverdueIssues(req.user.organizationId);
        res.json(issues);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/issues/statistics
 * Get issue statistics
 */
router.get('/issues/statistics', async (req, res) => {
    try {
        const stats = await vendorIssueService_1.default.getIssueStatistics(req.user.organizationId);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// CONTINUOUS MONITORING
// ==========================================
/**
 * GET /api/vendors/:id/monitoring
 * Get monitoring signals for vendor
 */
router.get('/:id/monitoring', async (req, res) => {
    try {
        const signals = await vendorContinuousMonitoring_1.default.getActiveSignals(req.user.organizationId, req.params.id);
        res.json(signals);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/vendors/:id/monitoring
 * Record monitoring signal
 */
router.post('/:id/monitoring', (0, auth_1.authorize)('ADMIN', 'COMPLIANCE_OFFICER', 'RISK_MANAGER'), (0, validation_1.validateUUID)('id'), (0, validation_1.validateBody)(vendor_validators_1.CreateMonitoringSignalSchema), async (req, res) => {
    try {
        const signal = await vendorContinuousMonitoring_1.default.recordSignal({
            ...req.body,
            vendorId: req.params.id,
            organizationId: req.user.organizationId,
        });
        res.status(201).json(signal);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * POST /api/monitoring/:id/acknowledge
 * Acknowledge monitoring signal
 */
router.post('/monitoring/:signalId/acknowledge', (0, auth_1.authorize)('ADMIN', 'COMPLIANCE_OFFICER', 'RISK_MANAGER'), (0, validation_1.validateUUID)('signalId'), (0, validation_1.validateBody)(vendor_validators_1.AcknowledgeSignalSchema), async (req, res) => {
    try {
        await vendorContinuousMonitoring_1.default.acknowledgeSignal(req.params.signalId, req.user.organizationId, req.user.id);
        res.json({ message: 'Signal acknowledged successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * POST /api/monitoring/:id/resolve
 * Resolve monitoring signal
 */
router.post('/monitoring/:signalId/resolve', (0, auth_1.authorize)('ADMIN', 'COMPLIANCE_OFFICER'), (0, validation_1.validateUUID)('signalId'), async (req, res) => {
    try {
        await vendorContinuousMonitoring_1.default.resolveSignal(req.params.signalId, req.user.organizationId, req.body.actionTaken, req.user.id);
        res.json({ message: 'Signal resolved successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
/**
 * GET /api/monitoring/statistics
 * Get monitoring statistics
 */
router.get('/monitoring/statistics', async (req, res) => {
    try {
        const stats = await vendorContinuousMonitoring_1.default.getMonitoringStatistics(req.user.organizationId);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=vendor.routes.js.map