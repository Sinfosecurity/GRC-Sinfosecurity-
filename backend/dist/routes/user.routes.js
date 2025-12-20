"use strict";
/**
 * User Management API Routes
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userService_1 = __importStar(require("../services/userService"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * GET /api/users
 * Get all users (requires VIEW_USERS permission)
 */
router.get('/', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.VIEW_USERS), (req, res) => {
    try {
        const users = userService_1.default.getAllUsers();
        res.json({
            success: true,
            count: users.length,
            data: users,
        });
    }
    catch (error) {
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
router.get('/:id', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.VIEW_USERS), (req, res) => {
    try {
        const { id } = req.params;
        const user = userService_1.default.getUserById(id);
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
    }
    catch (error) {
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
router.get('/me', auth_1.authenticate, (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'No user session',
            });
        }
        const user = userService_1.default.getUserById(userId);
        const permissions = userService_1.default.getUserPermissions(userId);
        res.json({
            success: true,
            data: {
                user,
                permissions,
            },
        });
    }
    catch (error) {
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
router.post('/', auth_1.authenticate, (0, auth_1.requireRole)(userService_1.UserRole.ADMIN), (req, res) => {
    try {
        const { email, name, role, department } = req.body;
        if (!email || !name || !role) {
            return res.status(400).json({
                success: false,
                error: 'Email, name, and role are required',
            });
        }
        // Check if user already exists
        const existing = userService_1.default.getUserByEmail(email);
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'User with this email already exists',
            });
        }
        const user = userService_1.default.createUser({
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
    }
    catch (error) {
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
router.put('/:id', auth_1.authenticate, (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user?.id;
        const currentUserRole = req.user?.role;
        // Only allow admin or the user themselves to update
        if (id !== currentUserId && currentUserRole !== userService_1.UserRole.ADMIN) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: Cannot update other users',
            });
        }
        const updates = req.body;
        // Only admin can change role
        if (updates.role && currentUserRole !== userService_1.UserRole.ADMIN) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: Cannot change user role',
            });
        }
        const user = userService_1.default.updateUser(id, updates);
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
    }
    catch (error) {
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
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireRole)(userService_1.UserRole.ADMIN), (req, res) => {
    try {
        const { id } = req.params;
        const success = userService_1.default.deleteUser(id);
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
    }
    catch (error) {
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
router.post('/invite', auth_1.authenticate, (0, auth_1.requirePermission)(userService_1.Permission.INVITE_USERS), (req, res) => {
    try {
        const { email, role } = req.body;
        const invitedBy = req.user?.id;
        if (!email || !role) {
            return res.status(400).json({
                success: false,
                error: 'Email and role are required',
            });
        }
        // Check if user already exists
        const existing = userService_1.default.getUserByEmail(email);
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'User with this email already exists',
            });
        }
        const invitation = userService_1.default.inviteUser(email, role, invitedBy);
        res.status(201).json({
            success: true,
            data: invitation,
            message: `Invitation sent to ${email}`,
        });
    }
    catch (error) {
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
router.get('/invitations', auth_1.authenticate, (0, auth_1.requireRole)(userService_1.UserRole.ADMIN), (req, res) => {
    try {
        const invitations = userService_1.default.getAllInvitations();
        res.json({
            success: true,
            count: invitations.length,
            data: invitations,
        });
    }
    catch (error) {
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
router.post('/accept-invitation', (req, res) => {
    try {
        const { token, name } = req.body;
        if (!token || !name) {
            return res.status(400).json({
                success: false,
                error: 'Token and name are required',
            });
        }
        const user = userService_1.default.acceptInvitation(token, { name });
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
    }
    catch (error) {
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
router.get('/:id/permissions', auth_1.authenticate, (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user?.id;
        const currentUserRole = req.user?.role;
        // Only allow viewing own permissions or admin can view all
        if (id !== currentUserId && currentUserRole !== userService_1.UserRole.ADMIN) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: Cannot view other users permissions',
            });
        }
        const permissions = userService_1.default.getUserPermissions(id);
        res.json({
            success: true,
            data: permissions,
        });
    }
    catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch permissions',
        });
    }
});
exports.default = router;
//# sourceMappingURL=user.routes.js.map