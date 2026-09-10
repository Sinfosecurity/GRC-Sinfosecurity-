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
        const items = await prisma.policy.findMany({
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
        const item = await prisma.policy.findFirst({ where: tenantById(req.params.id, req.user!.organizationId) });
        if (!item) throw new ApiError(404, 'Policy not found');
        res.json({ success: true, data: item });
    } catch (error) {
        next(error);
    }
});

router.post('/', requirePermission(PERMISSIONS['vendor.update']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { title, content, category } = req.body || {};
        if (!title || !content) {
            throw new ApiError(400, 'Title and content are required');
        }
        const item = await prisma.policy.create({
            data: {
                title,
                content,
                category: category || 'General',
                ownerId: req.user!.id,
                organizationId: req.user!.organizationId,
            },
        });
        res.status(201).json({ success: true, data: item });
    } catch (error) {
        next(error);
    }
});

export default router;
