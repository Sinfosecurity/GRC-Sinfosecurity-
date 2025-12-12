/**
 * User Management API Routes
 */

import { Router, Request, Response } from 'express';
import userService, { UserRole, Permission } from '../services/userService';
import { authenticate, requirePermission, requireRole } from '../middleware/auth';

const router = Router();

/**
 * GET /api/users
 * Get all users (requires VIEW_USERS permission)
 */
router.get('/', authenticate, requirePermission(Permission.VIEW_USERS), (req: Request, res: Response) => {
    try {
        const users = userService.getAllUsers();

        res.json({
            success: true,
            count: users.length,
            data: users,
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users',
        });
    }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', authenticate, requirePermission(Permission.VIEW_USERS), (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = userService.getUserById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        res.json({
            success: true,
            data: user,
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user',
        });
    }
});

/**
 * GET /api/users/me
 * Get current user info
 */
router.get('/me', authenticate, (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'No user session',
            });
        }

        const user = userService.getUserById(userId);
        const permissions = userService.getUserPermissions(userId);

        res.json({
            success: true,
            data: {
                user,
                permissions,
            },
        });
    } catch (error) {
        console.error('Error fetching current user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user info',
        });
    }
});

/**
 * POST /api/users
 * Create new user (Admin only)
 */
router.post('/', authenticate, requireRole(UserRole.ADMIN), (req: Request, res: Response) => {
    try {
        const { email, name, role, department } = req.body;

        if (!email || !name || !role) {
            return res.status(400).json({
                success: false,
                error: 'Email, name, and role are required',
            });
        }

        // Check if user already exists
        const existing = userService.getUserByEmail(email);
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'User with this email already exists',
            });
        }

        const user = userService.createUser({
            email,
            name,
            role,
            department,
        });

        res.status(201).json({
            success: true,
            data: user,
            message: 'User created successfully',
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create user',
        });
    }
});

/**
 * PUT /api/users/:id
 * Update user (Admin or user themselves)
 */
router.put('/:id', authenticate, (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const currentUserId = (req as any).user?.id;
        const currentUserRole = (req as any).user?.role;

        // Only allow admin or the user themselves to update
        if (id !== currentUserId && currentUserRole !== UserRole.ADMIN) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: Cannot update other users',
            });
        }

        const updates = req.body;

        // Only admin can change role
        if (updates.role && currentUserRole !== UserRole.ADMIN) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: Cannot change user role',
            });
        }

        const user = userService.updateUser(id, updates);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        res.json({
            success: true,
            data: user,
            message: 'User updated successfully',
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user',
        });
    }
});

/**
 * DELETE /api/users/:id
 * Delete (deactivate) user (Admin only)
 */
router.delete('/:id', authenticate, requireRole(UserRole.ADMIN), (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const success = userService.deleteUser(id);

        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        res.json({
            success: true,
            message: 'User deactivated successfully',
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete user',
        });
    }
});

/**
 * POST /api/users/invite
 * Invite new user (requires INVITE_USERS permission)
 */
router.post('/invite', authenticate, requirePermission(Permission.INVITE_USERS), (req: Request, res: Response) => {
    try {
        const { email, role } = req.body;
        const invitedBy = (req as any).user?.id;

        if (!email || !role) {
            return res.status(400).json({
                success: false,
                error: 'Email and role are required',
            });
        }

        // Check if user already exists
        const existing = userService.getUserByEmail(email);
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'User with this email already exists',
            });
        }

        const invitation = userService.inviteUser(email, role, invitedBy);

        res.status(201).json({
            success: true,
            data: invitation,
            message: `Invitation sent to ${email}`,
        });
    } catch (error) {
        console.error('Error inviting user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send invitation',
        });
    }
});

/**
 * GET /api/users/invitations
 * Get all invitations (Admin only)
 */
router.get('/invitations', authenticate, requireRole(UserRole.ADMIN), (req: Request, res: Response) => {
    try {
        const invitations = userService.getAllInvitations();

        res.json({
            success: true,
            count: invitations.length,
            data: invitations,
        });
    } catch (error) {
        console.error('Error fetching invitations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch invitations',
        });
    }
});

/**
 * POST /api/users/accept-invitation
 * Accept user invitation (public endpoint)
 */
router.post('/accept-invitation', (req: Request, res: Response) => {
    try {
        const { token, name } = req.body;

        if (!token || !name) {
            return res.status(400).json({
                success: false,
                error: 'Token and name are required',
            });
        }

        const user = userService.acceptInvitation(token, { name });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired invitation token',
            });
        }

        res.json({
            success: true,
            data: user,
            message: 'Invitation accepted successfully',
        });
    } catch (error) {
        console.error('Error accepting invitation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to accept invitation',
        });
    }
});

/**
 * GET /api/users/:id/permissions
 * Get user's permissions
 */
router.get('/:id/permissions', authenticate, (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const currentUserId = (req as any).user?.id;
        const currentUserRole = (req as any).user?.role;

        // Only allow viewing own permissions or admin can view all
        if (id !== currentUserId && currentUserRole !== UserRole.ADMIN) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: Cannot view other users permissions',
            });
        }

        const permissions = userService.getUserPermissions(id);

        res.json({
            success: true,
            data: permissions,
        });
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch permissions',
        });
    }
});

export default router;
