/**
 * API v1 - Risks Endpoints
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Mock risk data
const mockRisks = [
    { id: 1, title: 'Data Breach Risk', severity: 'high', status: 'open', category: 'Cybersecurity' },
    { id: 2, title: 'Compliance Violation', severity: 'critical', status: 'open', category: 'Compliance' },
    { id: 3, title: 'System Downtime', severity: 'medium', status: 'mitigated', category: 'Operational' },
];

/**
 * GET /api/v1/risks
 * List all risks
 */
router.get('/', (req: Request, res: Response) => {
    const { severity, status, category } = req.query;

    let filtered = mockRisks;

    if (severity) filtered = filtered.filter(r => r.severity === severity);
    if (status) filtered = filtered.filter(r => r.status === status);
    if (category) filtered = filtered.filter(r => r.category === category);

    res.json({
        success: true,
        count: filtered.length,
        data: filtered,
    });
});

/**
 * GET /api/v1/risks/:id
 * Get risk by ID
 */
router.get('/:id', (req: Request, res: Response) => {
    const risk = mockRisks.find(r => r.id === parseInt(req.params.id));

    if (!risk) {
        return res.status(404).json({
            success: false,
            error: 'Risk not found',
        });
    }

    res.json({
        success: true,
        data: risk,
    });
});

/**
 * POST /api/v1/risks
 * Create new risk
 */
router.post('/', (req: Request, res: Response) => {
    const newRisk = {
        id: mockRisks.length + 1,
        ...req.body,
        status: 'open',
    };

    mockRisks.push(newRisk);

    res.status(201).json({
        success: true,
        data: newRisk,
        message: 'Risk created successfully',
    });
});

export default router;
