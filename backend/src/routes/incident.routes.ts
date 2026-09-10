import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { tenantById, tenantWhere } from '../security/tenant';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS['finding.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const items = await prisma.incident.findMany({
            where: tenantWhere(req.user!.organizationId),
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        res.json({ success: true, data: items });
    } catch (error) {
        next(error);
    }
});

router.get('/:id', requirePermission(PERMISSIONS['finding.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const item = await prisma.incident.findFirst({ where: tenantById(req.params.id, req.user!.organizationId) });
        if (!item) throw new ApiError(404, 'Incident not found');
        res.json({ success: true, data: item });
    } catch (error) {
        next(error);
    }
});

router.post('/', requirePermission(PERMISSIONS['finding.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { title, description, severity, category } = req.body || {};
        if (!title || !description || !severity) {
            throw new ApiError(400, 'Title, description, and severity are required');
        }
        const item = await prisma.incident.create({
            data: {
                title,
                description,
                severity,
                category: category || 'OPERATIONAL',
                reporterId: req.user!.id,
                organizationId: req.user!.organizationId,
            },
        });
        res.status(201).json({ success: true, data: item });
    } catch (error) {
        next(error);
    }
});

router.put('/:id', requirePermission(PERMISSIONS['finding.update']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const existing = await prisma.incident.findFirst({ where: tenantById(req.params.id, req.user!.organizationId) });
        if (!existing) throw new ApiError(404, 'Incident not found');
        const item = await prisma.incident.update({
            where: { id: existing.id },
            data: {
                title: req.body.title ?? existing.title,
                description: req.body.description ?? existing.description,
                status: req.body.status ?? existing.status,
                severity: req.body.severity ?? existing.severity,
            },
        });
        res.json({ success: true, data: item });
    } catch (error) {
        next(error);
    }
});

export default router;
