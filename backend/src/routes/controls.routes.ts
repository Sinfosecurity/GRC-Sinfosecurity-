import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { tenantById, tenantWhere } from '../security/tenant';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS['vendor.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const items = await prisma.control.findMany({
            where: tenantWhere(req.user!.organizationId),
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        res.json({ success: true, data: items });
    } catch (error) {
        next(error);
    }
});

router.get('/:id', requirePermission(PERMISSIONS['vendor.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const item = await prisma.control.findFirst({ where: tenantById(req.params.id, req.user!.organizationId) });
        if (!item) throw new ApiError(404, 'Control not found');
        res.json({ success: true, data: item });
    } catch (error) {
        next(error);
    }
});

router.post('/', requirePermission(PERMISSIONS['vendor.update']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { name, description, type, category } = req.body || {};
        if (!name || !description || !type || !category) {
            throw new ApiError(400, 'Name, description, type, and category are required');
        }
        const item = await prisma.control.create({
            data: { name, description, type, category, organizationId: req.user!.organizationId },
        });
        res.status(201).json({ success: true, data: item });
    } catch (error) {
        next(error);
    }
});

router.put('/:id', requirePermission(PERMISSIONS['vendor.update']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const existing = await prisma.control.findFirst({ where: tenantById(req.params.id, req.user!.organizationId) });
        if (!existing) throw new ApiError(404, 'Control not found');
        const item = await prisma.control.update({
            where: { id: existing.id },
            data: {
                name: req.body.name ?? existing.name,
                description: req.body.description ?? existing.description,
                status: req.body.status ?? existing.status,
                effectiveness: req.body.effectiveness ?? existing.effectiveness,
            },
        });
        res.json({ success: true, data: item });
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', requirePermission(PERMISSIONS['vendor.delete']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const existing = await prisma.control.findFirst({ where: tenantById(req.params.id, req.user!.organizationId) });
        if (!existing) throw new ApiError(404, 'Control not found');
        await prisma.control.delete({ where: { id: existing.id } });
        res.json({ success: true, data: { deleted: true } });
    } catch (error) {
        next(error);
    }
});

export default router;
