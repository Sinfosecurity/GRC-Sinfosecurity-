"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const evidenceCollectionService_1 = __importDefault(require("../services/evidenceCollectionService"));
const router = express_1.default.Router();
/**
 * GET /api/evidence
 * Get all evidence with optional filters
 */
router.get('/', (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            type: req.query.type,
            controlId: req.query.controlId,
            frameworkId: req.query.frameworkId,
            collectionMethod: req.query.collectionMethod,
        };
        const evidence = evidenceCollectionService_1.default.getEvidence(filters);
        res.json({
            success: true,
            count: evidence.length,
            data: evidence
        });
    }
    catch (error) {
        console.error('Error fetching evidence:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch evidence'
        });
    }
});
/**
 * GET /api/evidence/:id
 * Get specific evidence by ID
 */
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const evidence = evidenceCollectionService_1.default.getEvidenceById(id);
        if (!evidence) {
            return res.status(404).json({
                success: false,
                error: 'Evidence not found'
            });
        }
        res.json({
            success: true,
            data: evidence
        });
    }
    catch (error) {
        console.error('Error fetching evidence:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch evidence'
        });
    }
});
/**
 * POST /api/evidence
 * Create new evidence
 */
router.post('/', (req, res) => {
    try {
        const evidenceData = req.body;
        // Validate required fields
        if (!evidenceData.title || !evidenceData.type) {
            return res.status(400).json({
                success: false,
                error: 'Title and type are required'
            });
        }
        const evidence = evidenceCollectionService_1.default.createEvidence(evidenceData);
        res.status(201).json({
            success: true,
            message: 'Evidence created successfully',
            data: evidence
        });
    }
    catch (error) {
        console.error('Error creating evidence:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create evidence'
        });
    }
});
/**
 * PUT /api/evidence/:id/status
 * Update evidence status
 */
router.put('/:id/status', (req, res) => {
    try {
        const { id } = req.params;
        const { status, reviewedBy } = req.body;
        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }
        const evidence = evidenceCollectionService_1.default.updateEvidenceStatus(id, status, reviewedBy);
        if (!evidence) {
            return res.status(404).json({
                success: false,
                error: 'Evidence not found'
            });
        }
        res.json({
            success: true,
            message: 'Evidence status updated',
            data: evidence
        });
    }
    catch (error) {
        console.error('Error updating evidence status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update evidence status'
        });
    }
});
/**
 * GET /api/evidence/stats
 * Get evidence statistics
 */
router.get('/stats/summary', (req, res) => {
    try {
        const stats = evidenceCollectionService_1.default.getStatistics();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Error fetching evidence statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch evidence statistics'
        });
    }
});
/**
 * GET /api/evidence/rules
 * Get evidence collection rules
 */
router.get('/rules/list', (req, res) => {
    try {
        const rules = evidenceCollectionService_1.default.getCollectionRules();
        res.json({
            success: true,
            count: rules.length,
            data: rules
        });
    }
    catch (error) {
        console.error('Error fetching collection rules:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch collection rules'
        });
    }
});
/**
 * POST /api/evidence/collect/:ruleId
 * Manually trigger evidence collection for a rule
 */
router.post('/collect/:ruleId', async (req, res) => {
    try {
        const { ruleId } = req.params;
        const evidence = await evidenceCollectionService_1.default.collectAutomatedEvidence(ruleId);
        if (!evidence) {
            return res.status(404).json({
                success: false,
                error: 'Collection rule not found or disabled'
            });
        }
        res.json({
            success: true,
            message: 'Evidence collected successfully',
            data: evidence
        });
    }
    catch (error) {
        console.error('Error collecting evidence:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to collect evidence'
        });
    }
});
/**
 * POST /api/evidence/packages
 * Create evidence package
 */
router.post('/packages', (req, res) => {
    try {
        const packageData = req.body;
        if (!packageData.name || !packageData.framework) {
            return res.status(400).json({
                success: false,
                error: 'Name and framework are required'
            });
        }
        const pkg = evidenceCollectionService_1.default.createPackage(packageData);
        res.status(201).json({
            success: true,
            message: 'Evidence package created successfully',
            data: pkg
        });
    }
    catch (error) {
        console.error('Error creating evidence package:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create evidence package'
        });
    }
});
/**
 * GET /api/evidence/packages
 * Get all evidence packages
 */
router.get('/packages/list', (req, res) => {
    try {
        const packages = evidenceCollectionService_1.default.getPackages();
        res.json({
            success: true,
            count: packages.length,
            data: packages
        });
    }
    catch (error) {
        console.error('Error fetching evidence packages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch evidence packages'
        });
    }
});
exports.default = router;
//# sourceMappingURL=evidence.routes.js.map