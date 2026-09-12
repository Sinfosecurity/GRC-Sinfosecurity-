import { Router, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { actorMeta, requirePlatformOwner, requirePlatformPermission, requirePlatformStaff, requireStepUp } from '../security/platform';
import { totpMfaService } from '../services/totpMfaService';
import { platformOpsService } from '../services/platformOpsService';
import { supportTicketService } from '../services/supportTicketService';
import { supportAccessService } from '../services/supportAccessService';
import { platformIncidentService } from '../services/platformIncidentService';
import { demoLeadService } from '../services/demoLeadService';
import { providerHealth } from '../services/providerHealth';
import { recordAudit } from '../services/auditEventService';
import { prisma } from '../config/database';

const router = Router();
router.use(authenticate, requirePlatformStaff);

router.get('/overview', requirePlatformPermission(PERMISSIONS['platform.overview']), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await platformOpsService.overview() });
    } catch (error) {
        next(error);
    }
});

router.get('/attention', requirePlatformPermission(PERMISSIONS['platform.overview']), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await platformOpsService.attentionQueue() });
    } catch (error) {
        next(error);
    }
});

router.get('/search', requirePlatformPermission(PERMISSIONS['platform.overview']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await platformOpsService.search(String(req.query.q || '')) });
    } catch (error) {
        next(error);
    }
});

router.get('/organizations', requirePlatformPermission(PERMISSIONS['platform.overview']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await platformOpsService.listOrganizations({
                plan: req.query.plan ? String(req.query.plan) : undefined,
                status: req.query.status ? String(req.query.status) : undefined,
                q: req.query.q ? String(req.query.q) : undefined,
                role: req.user!.role,
                userId: req.user!.id,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/organizations/:id', requirePlatformPermission(PERMISSIONS['platform.organizations.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await platformOpsService.organizationDetail(req.params.id) });
    } catch (error) {
        next(error);
    }
});

router.get('/support/tickets', requirePlatformPermission(PERMISSIONS['platform.support.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await supportTicketService.listPlatform({
                role: req.user!.role,
                userId: req.user!.id,
                status: req.query.status as never,
                priority: req.query.priority as never,
                organizationId: req.query.organizationId ? String(req.query.organizationId) : undefined,
                assignedToUserId: req.query.assignedToUserId ? String(req.query.assignedToUserId) : undefined,
                q: req.query.q ? String(req.query.q) : undefined,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/support/tickets/:id', requirePlatformPermission(PERMISSIONS['platform.support.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await supportTicketService.getPlatform(req.params.id, req.user!.role, req.user!.id) });
    } catch (error) {
        next(error);
    }
});

router.patch('/support/tickets/:id', requirePlatformPermission(PERMISSIONS['platform.support.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await supportTicketService.updatePlatform({
                id: req.params.id,
                actorUserId: req.user!.id,
                role: req.user!.role,
                status: req.body?.status,
                priority: req.body?.priority,
                assignedToUserId: req.body?.assignedToUserId,
                resolutionSummary: req.body?.resolutionSummary,
                securityIncident: req.body?.securityIncident,
                internalNote: req.body?.internalNote,
                customerReply: req.body?.customerReply,
                ...actorMeta(req),
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/incidents', requirePlatformPermission(PERMISSIONS['platform.incidents.read']), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await platformIncidentService.list() });
    } catch (error) {
        next(error);
    }
});

router.post('/incidents', requirePlatformPermission(PERMISSIONS['platform.incidents.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({
            success: true,
            data: await platformIncidentService.create({
                actorUserId: req.user!.id,
                role: req.user!.role,
                title: String(req.body?.title || ''),
                severity: req.body?.severity,
                summary: String(req.body?.summary || ''),
                affectedServices: req.body?.affectedServices,
                organizationIds: req.body?.organizationIds,
                securityIncident: req.body?.securityIncident,
                ...actorMeta(req),
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.patch('/incidents/:id', requirePlatformPermission(PERMISSIONS['platform.incidents.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await platformIncidentService.update({
                id: req.params.id,
                actorUserId: req.user!.id,
                role: req.user!.role,
                status: req.body?.status,
                rootCause: req.body?.rootCause,
                resolution: req.body?.resolution,
                customerCommunication: req.body?.customerCommunication,
                ...actorMeta(req),
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/demo-requests', requirePlatformPermission(PERMISSIONS['platform.leads.read']), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await demoLeadService.list() });
    } catch (error) {
        next(error);
    }
});

router.patch('/demo-requests/:id', requirePlatformPermission(PERMISSIONS['platform.leads.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await demoLeadService.update({
                id: req.params.id,
                actorUserId: req.user!.id,
                leadStatus: req.body?.leadStatus,
                assignedToUserId: req.body?.assignedToUserId,
                internalNotes: req.body?.internalNotes,
                lastContactedAt: req.body?.lastContactedAt ? new Date(req.body.lastContactedAt) : undefined,
                nextAction: req.body?.nextAction,
                ...actorMeta(req),
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/provider-health', requirePlatformPermission(PERMISSIONS['platform.providers.read']), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await providerHealth() });
    } catch (error) {
        next(error);
    }
});

router.get('/billing', requirePlatformPermission(PERMISSIONS['platform.billing.read']), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await platformOpsService.billingDirectory() });
    } catch (error) {
        next(error);
    }
});

router.get('/notifications', requirePlatformPermission(PERMISSIONS['platform.overview']), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await platformOpsService.notificationFailures() });
    } catch (error) {
        next(error);
    }
});

router.get('/malware', requirePlatformPermission(PERMISSIONS['platform.organizations.read']), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await platformOpsService.malwareOperations() });
    } catch (error) {
        next(error);
    }
});

router.get('/reports', requirePlatformPermission(PERMISSIONS['platform.organizations.read']), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await platformOpsService.reportFailures() });
    } catch (error) {
        next(error);
    }
});

router.get('/audit', requirePlatformPermission(PERMISSIONS['platform.audit.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await platformOpsService.platformAudit({
                q: req.query.q ? String(req.query.q) : undefined,
                action: req.query.action ? String(req.query.action) : undefined,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/internal-users', requirePlatformPermission(PERMISSIONS['platform.users.read']), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await platformOpsService.internalUsers() });
    } catch (error) {
        next(error);
    }
});

router.patch('/internal-users/:id/role', requirePlatformOwner, requireStepUp, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await platformOpsService.updateInternalRole({
                targetId: req.params.id,
                nextRole: req.body?.role as Role,
                actorId: req.user!.id,
                actorRole: req.user!.role as Role,
                ...actorMeta(req),
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/internal-users/:id/mfa-reset', requirePlatformOwner, requireStepUp, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await totpMfaService.reset(req.params.id, req.user!.id, { requestId: actorMeta(req).requestId });
        res.json({ success: true, data: { reset: true } });
    } catch (error) {
        next(error);
    }
});

router.get('/support-sessions', requirePlatformPermission(PERMISSIONS['platform.sessions.request']), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await supportAccessService.list() });
    } catch (error) {
        next(error);
    }
});

router.post('/support-sessions', requirePlatformPermission(PERMISSIONS['platform.sessions.request']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({
            success: true,
            data: await supportAccessService.request({
                actorUserId: req.user!.id,
                role: req.user!.role,
                organizationId: String(req.body?.organizationId || ''),
                ticketId: req.body?.ticketId,
                incident: req.body?.incident,
                reason: String(req.body?.reason || ''),
                scope: req.body?.scope ? String(req.body.scope) : undefined,
                accessLevel: req.body?.accessLevel,
                durationMinutes: req.body?.durationMinutes,
                ...actorMeta(req),
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/support-sessions/:id/approve', requirePlatformPermission(PERMISSIONS['platform.sessions.approve']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await supportAccessService.approve({
                id: req.params.id,
                actorUserId: req.user!.id,
                role: req.user!.role,
                ...actorMeta(req),
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/support-sessions/break-glass', requirePlatformPermission(PERMISSIONS['platform.sessions.request']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({
            success: true,
            data: await supportAccessService.requestBreakGlass({
                actorUserId: req.user!.id,
                role: req.user!.role,
                organizationId: String(req.body?.organizationId || ''),
                incidentId: String(req.body?.incidentId || req.body?.incident || ''),
                reason: String(req.body?.reason || ''),
                scope: req.body?.scope ? String(req.body.scope) : undefined,
                accessLevel: req.body?.accessLevel,
                durationMinutes: req.body?.durationMinutes,
                ...actorMeta(req),
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/support-sessions/:id/break-glass-approve', requireStepUp, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await supportAccessService.approveBreakGlass({
                id: req.params.id,
                actorUserId: req.user!.id,
                role: req.user!.role,
                ...actorMeta(req),
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/support-sessions/:id/start', requirePlatformPermission(PERMISSIONS['platform.sessions.request']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await supportAccessService.start({
                id: req.params.id,
                actorUserId: req.user!.id,
                ...actorMeta(req),
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/support-sessions/:id/revoke', requirePlatformPermission(PERMISSIONS['platform.sessions.approve']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await supportAccessService.revoke({
                id: req.params.id,
                actorUserId: req.user!.id,
                role: req.user!.role,
                ...actorMeta(req),
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/support-sessions/:id/tenant-snapshot', requirePlatformPermission(PERMISSIONS['platform.sessions.request']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const requestedOrg = req.query.organizationId ? String(req.query.organizationId) : undefined;
        const session = await supportAccessService.requireActive(req.params.id, req.user!.id, requestedOrg);
        const org = await prisma.organization.findUnique({
            where: { id: session.organizationId },
            select: { id: true, name: true, plan: true, status: true },
        });
        await recordAudit({
            organizationId: session.organizationId,
            actorUserId: req.user!.id,
            action: 'support.session_read',
            resourceType: 'Organization',
            resourceId: session.organizationId,
            result: 'success',
            ...actorMeta(req),
            metadata: { sessionId: session.id, accessLevel: session.accessLevel },
        });
        res.json({
            success: true,
            data: {
                session: {
                    id: session.id,
                    organizationId: session.organizationId,
                    accessLevel: session.accessLevel,
                    expiresAt: session.expiresAt,
                    status: session.status,
                },
                organization: org,
            },
        });
    } catch (error) {
        next(error);
    }
});

router.post('/support-sessions/:id/tenant-action', requirePlatformPermission(PERMISSIONS['platform.sessions.request']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const action = String(req.body?.action || '');
        const targetOrg = req.body?.organizationId ? String(req.body.organizationId) : undefined;
        const session = await supportAccessService.requireActive(req.params.id, req.user!.id, targetOrg);
        await supportAccessService.assertWrite(session, action);
        await recordAudit({
            organizationId: session.organizationId,
            actorUserId: req.user!.id,
            action: 'support.session_action',
            resourceType: 'SupportAccessSession',
            resourceId: session.id,
            result: 'success',
            ...actorMeta(req),
            metadata: { tenantAction: action, accessLevel: session.accessLevel },
        });
        res.json({ success: true, data: { accepted: true, action, accessLevel: session.accessLevel } });
    } catch (error) {
        next(error);
    }
});

export default router;
