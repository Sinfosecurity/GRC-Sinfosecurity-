import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { ALLOWANCE_ENFORCEMENT, entitlementsFor } from '../billing/plans';
import { recordAudit } from '../services/auditEventService';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.get('/current', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organization = await prisma.organization.findUnique({
            where: { id: req.user!.organizationId },
        });
        if (!organization) {
            throw new ApiError(404, 'Organization not found');
        }
        res.json({
            success: true,
            data: {
                ...organization,
                entitlements: entitlementsFor(organization.plan),
                allowanceEnforcement: ALLOWANCE_ENFORCEMENT,
            },
        });
    } catch (error) {
        next(error);
    }
});

router.patch('/current', requirePermission(PERMISSIONS['organization.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organization = await prisma.organization.update({
            where: { id: req.user!.organizationId },
            data: {
                name: req.body.name,
                legalName: req.body.legalName,
                industry: req.body.industry,
                country: req.body.country,
                size: req.body.size,
                timezone: req.body.timezone,
                contactName: req.body.contactName,
                contactEmail: req.body.contactEmail,
                contactPhone: req.body.contactPhone,
            },
        });
        await recordAudit({
            organizationId: organization.id,
            actorUserId: req.user!.id,
            action: 'organization.update',
            resourceType: 'Organization',
            resourceId: organization.id,
            result: 'success',
        });
        res.json({ success: true, data: organization });
    } catch (error) {
        next(error);
    }
});

export default router;
