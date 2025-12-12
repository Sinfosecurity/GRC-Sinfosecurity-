/**
 * API v1 - Compliance Endpoints
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Mock compliance data
const mockCompliance = [
    { id: 1, framework: 'ISO 27001', status: 'compliant', score: 95, lastAudit: '2024-11-15' },
    { id: 2, framework: 'SOC 2', status: 'compliant', score: 92, lastAudit: '2024-10-20' },
    { id: 3, framework: 'GDPR', status: 'compliant', score: 88, lastAudit: '2024-09-30' },
    { id: 4, framework: 'HIPAA', status: 'non-compliant', score: 72, lastAudit: '2024-08-15' },
];

/**
 * GET /api/v1/compliance  
 * List all compliance frameworks
 */
router.get('/', (req: Request, res: Response) => {
    const { status } = req.query;

    let filtered = mockCompliance;
    if (status) filtered = filtered.filter(c => c.status === status);

    res.json({
        success: true,
        count: filtered.length,
        data: filtered,
    });
});

/**
 * GET /api/v1/compliance/:id
 * Get compliance framework by ID
 */
router.get('/:id', (req: Request, res: Response) => {
    const framework = mockCompliance.find(c => c.id === parseInt(req.params.id));

    if (!framework) {
        return res.status(404).json({
            success: false,
            error: 'Compliance framework not found',
        });
    }

    res.json({
        success: true,
        data: framework,
    });
});

export default router;
