import express, { Request, Response } from 'express';
import evidenceCollectionService from '../services/evidenceCollectionService';

const router = express.Router();

/**
 * GET /api/evidence
 * Get all evidence with optional filters
 */
router.get('/', (req: Request, res: Response) => {
    try {
        const filters = {
            status: req.query.status as any,
            type: req.query.type as any,
            controlId: req.query.controlId as string | undefined,
            frameworkId: req.query.frameworkId as string | undefined,
            collectionMethod: req.query.collectionMethod as any,
        };

        const evidence = evidenceCollectionService.getEvidence(filters);
        
        res.json({
            success: true,
            count: evidence.length,
            data: evidence
        });
    } catch (error) {
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
router.get('/:id', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const evidence = evidenceCollectionService.getEvidenceById(id);
        
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
    } catch (error) {
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
router.post('/', (req: Request, res: Response) => {
    try {
        const evidenceData = req.body;
        
        // Validate required fields
        if (!evidenceData.title || !evidenceData.type) {
            return res.status(400).json({
                success: false,
                error: 'Title and type are required'
            });
        }
        
        const evidence = evidenceCollectionService.createEvidence(evidenceData);
        
        res.status(201).json({
            success: true,
            message: 'Evidence created successfully',
            data: evidence
        });
    } catch (error) {
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
router.put('/:id/status', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, reviewedBy } = req.body;
        
        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }
        
        const evidence = evidenceCollectionService.updateEvidenceStatus(id, status, reviewedBy);
        
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
    } catch (error) {
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
router.get('/stats/summary', (req: Request, res: Response) => {
    try {
        const stats = evidenceCollectionService.getStatistics();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
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
router.get('/rules/list', (req: Request, res: Response) => {
    try {
        const rules = evidenceCollectionService.getCollectionRules();
        
        res.json({
            success: true,
            count: rules.length,
            data: rules
        });
    } catch (error) {
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
router.post('/collect/:ruleId', async (req: Request, res: Response) => {
    try {
        const { ruleId } = req.params;
        const evidence = await evidenceCollectionService.collectAutomatedEvidence(ruleId);
        
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
    } catch (error) {
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
router.post('/packages', (req: Request, res: Response) => {
    try {
        const packageData = req.body;
        
        if (!packageData.name || !packageData.framework) {
            return res.status(400).json({
                success: false,
                error: 'Name and framework are required'
            });
        }
        
        const pkg = evidenceCollectionService.createPackage(packageData);
        
        res.status(201).json({
            success: true,
            message: 'Evidence package created successfully',
            data: pkg
        });
    } catch (error) {
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
router.get('/packages/list', (req: Request, res: Response) => {
    try {
        const packages = evidenceCollectionService.getPackages();
        
        res.json({
            success: true,
            count: packages.length,
            data: packages
        });
    } catch (error) {
        console.error('Error fetching evidence packages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch evidence packages'
        });
    }
});

export default router;





