import { NextFunction } from 'express';
import { enforceSubscriptionWrites, requireEntitlement } from '../middleware/entitlement';
import { AuthRequest } from '../middleware/auth';

jest.mock('../config/database', () => ({
    prisma: {
        organization: { findUnique: jest.fn() },
    },
}));

jest.mock('../billing/stripeBillingService', () => ({
    billingStatus: jest.fn(),
}));

const { prisma } = require('../config/database');
const { billingStatus } = require('../billing/stripeBillingService');

function mockReq(overrides: Partial<AuthRequest> = {}): AuthRequest {
    return {
        method: 'POST',
        user: { id: 'u1', organizationId: 'org-1' },
        ...overrides,
    } as AuthRequest;
}

describe('entitlement enforcement', () => {
    const res = {} as any;

    beforeEach(() => {
        prisma.organization.findUnique.mockReset();
        billingStatus.mockReset();
    });

    it('no-ops write enforcement when billing is not configured', async () => {
        billingStatus.mockReturnValue('NOT_CONFIGURED');
        const next = jest.fn() as NextFunction;
        await enforceSubscriptionWrites(mockReq(), res, next);
        expect(next).toHaveBeenCalledWith();
        expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    });

    it('blocks writes for PAST_DUE organizations when Stripe is connected', async () => {
        billingStatus.mockReturnValue('CONNECTED');
        prisma.organization.findUnique.mockResolvedValue({ status: 'PAST_DUE' });
        const next = jest.fn() as NextFunction;
        await enforceSubscriptionWrites(mockReq(), res, next);
        expect(next).toHaveBeenCalled();
        const error = (next as jest.Mock).mock.calls[0][0];
        expect(error.statusCode).toBe(403);
    });

    it('no-ops feature gates when billing is not configured', async () => {
        billingStatus.mockReturnValue('NOT_CONFIGURED');
        const next = jest.fn() as NextFunction;
        await requireEntitlement('advancedReporting')(mockReq(), res, next);
        expect(next).toHaveBeenCalledWith();
    });

    it('allows private-beta tester orgs to export reports on Starter when Stripe is connected', async () => {
        billingStatus.mockReturnValue('CONNECTED');
        prisma.organization.findUnique.mockResolvedValue({ plan: 'STARTER', isDemo: true });
        const next = jest.fn() as NextFunction;
        await requireEntitlement('advancedReporting')(mockReq(), res, next);
        expect(next).toHaveBeenCalledWith();
    });

    it('denies a Starter org advanced reporting when Stripe is connected', async () => {
        billingStatus.mockReturnValue('CONNECTED');
        prisma.organization.findUnique.mockResolvedValue({ plan: 'STARTER', isDemo: false });
        const next = jest.fn() as NextFunction;
        await requireEntitlement('advancedReporting')(mockReq(), res, next);
        const error = (next as jest.Mock).mock.calls[0][0];
        expect(error.statusCode).toBe(403);
    });

    it('allows Professional advanced reporting and denies SSO', async () => {
        billingStatus.mockReturnValue('CONNECTED');
        prisma.organization.findUnique.mockResolvedValue({ plan: 'PROFESSIONAL' });
        const allow = jest.fn() as NextFunction;
        await requireEntitlement('advancedReporting')(mockReq(), res, allow);
        expect(allow).toHaveBeenCalledWith();
        const deny = jest.fn() as NextFunction;
        await requireEntitlement('sso')(mockReq(), res, deny);
        expect((deny as jest.Mock).mock.calls[0][0].statusCode).toBe(403);
    });

    it('allows Business advanced reporting and denies SSO', async () => {
        billingStatus.mockReturnValue('CONNECTED');
        prisma.organization.findUnique.mockResolvedValue({ plan: 'BUSINESS' });
        const allow = jest.fn() as NextFunction;
        await requireEntitlement('advancedReporting')(mockReq(), res, allow);
        expect(allow).toHaveBeenCalledWith();
        const deny = jest.fn() as NextFunction;
        await requireEntitlement('sso')(mockReq(), res, deny);
        expect((deny as jest.Mock).mock.calls[0][0].statusCode).toBe(403);
    });

    it('allows Enterprise SSO from backend plan state', async () => {
        billingStatus.mockReturnValue('CONNECTED');
        prisma.organization.findUnique.mockResolvedValue({ plan: 'ENTERPRISE' });
        const next = jest.fn() as NextFunction;
        await requireEntitlement('sso')(mockReq(), res, next);
        expect(next).toHaveBeenCalledWith();
    });
});
