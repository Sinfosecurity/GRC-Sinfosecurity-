import { ApiError } from '../middleware/errorHandler';

export const INDEPENDENT_REVIEW_REQUIRED = 'Another authorized reviewer must approve this decision.';

export function assertIndependentReviewer(
    preparerId: string | null | undefined,
    approverId: string | null | undefined
): void {
    if (!approverId) {
        throw new ApiError(403, INDEPENDENT_REVIEW_REQUIRED);
    }
    if (!preparerId) return;
    if (preparerId === approverId) {
        throw new ApiError(403, INDEPENDENT_REVIEW_REQUIRED);
    }
}

export function sessionActor(user?: { id?: string; userId?: string; organizationId?: string; role?: string; name?: string } | null) {
    const id = user?.id || user?.userId;
    if (!id || !user?.organizationId) {
        throw new ApiError(401, 'Authentication required');
    }
    return {
        id,
        organizationId: user.organizationId,
        role: user.role || '',
        name: user.name,
    };
}
