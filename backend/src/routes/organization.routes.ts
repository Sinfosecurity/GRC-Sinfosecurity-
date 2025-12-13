/**
 * Organization API Routes
 * Handles organization (tenant) management endpoints
 */

import express, { Request, Response } from 'express';
import OrganizationService from '../services/organizationService';
import { CreateOrganizationRequest, UpdateOrganizationRequest, SubscriptionPlan } from '../types/organization.types';

const router = express.Router();

/**
 * @route   POST /api/organizations
 * @desc    Create a new organization (tenant)
 * @access  Public (for self-serve signup) or Admin only
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const data: CreateOrganizationRequest = req.body;
        
        // Validate required fields
        if (!data.name || !data.subdomain || !data.primaryContactEmail) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, subdomain, primaryContactEmail',
            });
        }

        // Check if subdomain is taken
        if (OrganizationService.isSubdomainTaken(data.subdomain)) {
            return res.status(409).json({
                success: false,
                error: 'Subdomain is already taken',
            });
        }

        const organization = OrganizationService.createOrganization(
            data,
            req.body.createdBy || 'system'
        );

        res.status(201).json({
            success: true,
            data: organization,
            message: `Organization created successfully at https://${organization.subdomain}.grc-sinfosecurity.com`,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create organization',
        });
    }
});

/**
 * @route   GET /api/organizations
 * @desc    Get all organizations (platform admin only)
 * @access  Platform Admin
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const organizations = OrganizationService.getAllOrganizations();

        res.json({
            success: true,
            count: organizations.length,
            data: organizations,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch organizations',
        });
    }
});

/**
 * @route   GET /api/organizations/:id
 * @desc    Get organization by ID
 * @access  Org Admin or Platform Admin
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const organization = OrganizationService.getOrganizationById(req.params.id);

        if (!organization) {
            return res.status(404).json({
                success: false,
                error: 'Organization not found',
            });
        }

        res.json({
            success: true,
            data: organization,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch organization',
        });
    }
});

/**
 * @route   GET /api/organizations/subdomain/:subdomain
 * @desc    Get organization by subdomain
 * @access  Public (for login page branding)
 */
router.get('/subdomain/:subdomain', async (req: Request, res: Response) => {
    try {
        const organization = OrganizationService.getOrganizationBySubdomain(req.params.subdomain);

        if (!organization) {
            return res.status(404).json({
                success: false,
                error: 'Organization not found',
            });
        }

        // Return only public information (branding, name)
        res.json({
            success: true,
            data: {
                id: organization.id,
                name: organization.name,
                subdomain: organization.subdomain,
                branding: organization.branding,
                status: organization.status,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch organization',
        });
    }
});

/**
 * @route   PUT /api/organizations/:id
 * @desc    Update organization details
 * @access  Org Admin
 */
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const updates: UpdateOrganizationRequest = req.body;
        const updatedBy = req.body.updatedBy || 'admin';

        const organization = OrganizationService.updateOrganization(
            req.params.id,
            updates,
            updatedBy
        );

        if (!organization) {
            return res.status(404).json({
                success: false,
                error: 'Organization not found',
            });
        }

        res.json({
            success: true,
            data: organization,
            message: 'Organization updated successfully',
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update organization',
        });
    }
});

/**
 * @route   PUT /api/organizations/:id/subscription
 * @desc    Update organization subscription plan
 * @access  Org Owner or Platform Admin
 */
router.put('/:id/subscription', async (req: Request, res: Response) => {
    try {
        const { plan } = req.body;
        const updatedBy = req.body.updatedBy || 'admin';

        if (!Object.values(SubscriptionPlan).includes(plan)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid subscription plan',
            });
        }

        const organization = OrganizationService.updateSubscription(
            req.params.id,
            plan,
            updatedBy
        );

        if (!organization) {
            return res.status(404).json({
                success: false,
                error: 'Organization not found',
            });
        }

        res.json({
            success: true,
            data: organization,
            message: `Subscription updated to ${plan}`,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update subscription',
        });
    }
});

/**
 * @route   POST /api/organizations/:id/suspend
 * @desc    Suspend organization
 * @access  Platform Admin only
 */
router.post('/:id/suspend', async (req: Request, res: Response) => {
    try {
        const { reason } = req.body;
        const suspendedBy = req.body.suspendedBy || 'admin';

        const success = OrganizationService.suspendOrganization(
            req.params.id,
            reason || 'Administrative action',
            suspendedBy
        );

        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'Organization not found',
            });
        }

        res.json({
            success: true,
            message: 'Organization suspended successfully',
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to suspend organization',
        });
    }
});

/**
 * @route   POST /api/organizations/:id/reactivate
 * @desc    Reactivate suspended organization
 * @access  Platform Admin only
 */
router.post('/:id/reactivate', async (req: Request, res: Response) => {
    try {
        const reactivatedBy = req.body.reactivatedBy || 'admin';

        const success = OrganizationService.reactivateOrganization(
            req.params.id,
            reactivatedBy
        );

        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'Organization not found',
            });
        }

        res.json({
            success: true,
            message: 'Organization reactivated successfully',
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to reactivate organization',
        });
    }
});

/**
 * @route   DELETE /api/organizations/:id
 * @desc    Soft delete organization
 * @access  Platform Admin only
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const deletedBy = req.body.deletedBy || 'admin';

        const success = OrganizationService.deleteOrganization(
            req.params.id,
            deletedBy
        );

        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'Organization not found',
            });
        }

        res.json({
            success: true,
            message: 'Organization deleted successfully',
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete organization',
        });
    }
});

/**
 * @route   GET /api/organizations/:id/stats
 * @desc    Get organization statistics
 * @access  Org Admin
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
    try {
        const stats = OrganizationService.getOrganizationStats(req.params.id);

        if (!stats) {
            return res.status(404).json({
                success: false,
                error: 'Organization not found',
            });
        }

        res.json({
            success: true,
            data: stats,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch organization stats',
        });
    }
});

/**
 * @route   GET /api/organizations/check-subdomain/:subdomain
 * @desc    Check if subdomain is available
 * @access  Public
 */
router.get('/check-subdomain/:subdomain', async (req: Request, res: Response) => {
    try {
        const isTaken = OrganizationService.isSubdomainTaken(req.params.subdomain);

        res.json({
            success: true,
            data: {
                subdomain: req.params.subdomain,
                available: !isTaken,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to check subdomain',
        });
    }
});

export default router;

