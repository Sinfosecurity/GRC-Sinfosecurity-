import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { objectStorageService } from '../services/objectStorageService';
import { prisma } from '../config/database';
import { tenantWhere } from '../security/tenant';
import { ApiError } from '../middleware/errorHandler';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const router = Router();
router.use(authenticate);

router.get('/status', (req: AuthRequest, res: Response) => {
    res.json({ success: true, data: objectStorageService.status() });
});

router.post('/reconcile', requirePermission(PERMISSIONS['evidence.delete']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await objectStorageService.reconcileOrphans(req.user!.organizationId);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.get('/', requirePermission(PERMISSIONS['evidence.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const items = await prisma.storedObject.findMany({
            where: tenantWhere(req.user!.organizationId, { deletedAt: null }),
            orderBy: { uploadedAt: 'desc' },
            take: 200,
        });
        res.json({ success: true, data: items });
    } catch (error) {
        next(error);
    }
});

router.post(
    '/',
    requirePermission(PERMISSIONS['evidence.upload']),
    upload.single('file'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.file) {
                throw new ApiError(400, 'File is required');
            }
            const stored = await objectStorageService.upload({
                organizationId: req.user!.organizationId,
                uploadedBy: req.user!.id,
                ownerType: String(req.body.ownerType || 'vendor'),
                ownerId: String(req.body.ownerId || req.user!.organizationId),
                filename: req.file.originalname,
                contentType: req.file.mimetype,
                buffer: req.file.buffer,
                classification: req.body.classification,
            });
            res.status(201).json({ success: true, data: stored });
        } catch (error) {
            next(error);
        }
    }
);

router.get('/:id/download', requirePermission(PERMISSIONS['evidence.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { stored, buffer } = await objectStorageService.getForDownload(
            req.params.id,
            req.user!.organizationId,
            req.user!.id
        );
        res.setHeader('Content-Type', stored.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${stored.filename}"`);
        res.send(buffer);
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', requirePermission(PERMISSIONS['evidence.delete']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await objectStorageService.remove(req.params.id, req.user!.organizationId, req.user!.id);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

export default router;
