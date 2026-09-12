import { Role } from '@prisma/client';
import { ApiError } from '../middleware/errorHandler';
import { assertRoleAssignment } from '../services/identityUserService';

describe('identity privilege controls', () => {
    it('blocks self role changes', () => {
        expect(() => assertRoleAssignment({
            actorId: 'user-1',
            actorRole: Role.ORGANIZATION_ADMIN,
            targetId: 'user-1',
            nextRole: Role.VIEWER,
            action: 'role_change',
        })).toThrow(ApiError);
    });

    it('blocks self deactivation', () => {
        expect(() => assertRoleAssignment({
            actorId: 'user-1',
            actorRole: Role.ORGANIZATION_ADMIN,
            targetId: 'user-1',
            action: 'disable',
        })).toThrow(ApiError);
    });

    it('blocks org admins from assigning platform roles', () => {
        expect(() => assertRoleAssignment({
            actorId: 'admin-1',
            actorRole: Role.ORGANIZATION_ADMIN,
            targetId: 'user-2',
            nextRole: Role.SUPERADMIN,
            action: 'role_change',
        })).toThrow(ApiError);
    });

    it('blocks support staff from granting platform owner', () => {
        expect(() => assertRoleAssignment({
            actorId: 'support-1',
            actorRole: Role.SUPPORT_ADMIN,
            targetId: 'user-2',
            targetCurrentRole: Role.SUPPORT_ANALYST,
            nextRole: Role.PLATFORM_OWNER,
            action: 'role_change',
        })).toThrow(ApiError);
    });

    it('allows org admins to assign viewer', () => {
        expect(() => assertRoleAssignment({
            actorId: 'admin-1',
            actorRole: Role.ORGANIZATION_ADMIN,
            targetId: 'user-2',
            targetCurrentRole: Role.VIEWER,
            nextRole: Role.AUDITOR,
            action: 'role_change',
        })).not.toThrow();
    });
});
