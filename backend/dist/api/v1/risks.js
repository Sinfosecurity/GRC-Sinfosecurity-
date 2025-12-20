"use strict";
/**
 * API v1 - Risks Endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
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
router.get('/', (req, res) => {
    const { severity, status, category } = req.query;
    let filtered = mockRisks;
    if (severity)
        filtered = filtered.filter(r => r.severity === severity);
    if (status)
        filtered = filtered.filter(r => r.status === status);
    if (category)
        filtered = filtered.filter(r => r.category === category);
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
router.get('/:id', (req, res) => {
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
router.post('/', (req, res) => {
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
exports.default = router;
//# sourceMappingURL=risks.js.map