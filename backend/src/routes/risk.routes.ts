import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { tenantById, tenantWhere } from '../security/tenant';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS['risk.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
        const where = tenantWhere(req.user!.organizationId, req.query.status ? { status: req.query.status as any } : {});
        const [items, total] = await Promise.all([
            prisma.risk.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.risk.count({ where }),
        ]);
        res.json({ success: true, data: items, page, pageSize, total });
    } catch (error) {
        next(error);
    }
});

router.get('/:id', requirePermission(PERMISSIONS['risk.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const risk = await prisma.risk.findFirst({
            where: tenantById(req.params.id, req.user!.organizationId),
            include: { assessments: true, controls: true },
        });
        if (!risk) throw new ApiError(404, 'Risk not found');
        res.json({ success: true, data: risk });
    } catch (error) {
        next(error);
    }
});

router.post('/', requirePermission(PERMISSIONS['risk.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { title, description, category, likelihood, impact, mitigation } = req.body || {};
        if (!title || !description || !category) {
            throw new ApiError(400, 'Title, description, and category are required');
        }
        const score = Number(likelihood || 1) * Number(impact || 1);
        const risk = await prisma.risk.create({
            data: {
                title,
                description,
                category,
                likelihood: Number(likelihood || 1),
                impact: Number(impact || 1),
                riskScore: score,
                mitigation,
                ownerId: req.user!.id,
                organizationId: req.user!.organizationId,
            },
        });
        res.status(201).json({ success: true, data: risk });
    } catch (error) {
        next(error);
    }
});

router.put('/:id', requirePermission(PERMISSIONS['risk.update']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const existing = await prisma.risk.findFirst({
            where: tenantById(req.params.id, req.user!.organizationId),
        });
        if (!existing) throw new ApiError(404, 'Risk not found');
        const likelihood = Number(req.body.likelihood ?? existing.likelihood);
        const impact = Number(req.body.impact ?? existing.impact);
        const risk = await prisma.risk.update({
            where: { id: existing.id },
            data: {
                title: req.body.title ?? existing.title,
                description: req.body.description ?? existing.description,
                category: req.body.category ?? existing.category,
                status: req.body.status ?? existing.status,
                likelihood,
                impact,
                riskScore: likelihood * impact,
                mitigation: req.body.mitigation ?? existing.mitigation,
            },
        });
        res.json({ success: true, data: risk });
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', requirePermission(PERMISSIONS['risk.delete']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const existing = await prisma.risk.findFirst({
            where: tenantById(req.params.id, req.user!.organizationId),
        });
        if (!existing) throw new ApiError(404, 'Risk not found');
        await prisma.risk.delete({ where: { id: existing.id } });
        res.json({ success: true, data: { deleted: true } });
    } catch (error) {
        next(error);
    }
});

export default router;
