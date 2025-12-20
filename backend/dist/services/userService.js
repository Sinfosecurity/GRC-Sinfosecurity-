"use strict";
/**
 * User Management Service
 * Handles user CRUD operations, roles, and permissions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Permission = exports.UserRole = void 0;
const auditService_1 = require("./auditService");
// User roles with different permission levels
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["COMPLIANCE_OFFICER"] = "COMPLIANCE_OFFICER";
    UserRole["AUDITOR"] = "AUDITOR";
    UserRole["VIEWER"] = "VIEWER";
})(UserRole || (exports.UserRole = UserRole = {}));
// Permissions mapped to actions
var Permission;
(function (Permission) {
    // User management
    Permission["MANAGE_USERS"] = "MANAGE_USERS";
    Permission["INVITE_USERS"] = "INVITE_USERS";
    Permission["VIEW_USERS"] = "VIEW_USERS";
    // Risk management
    Permission["CREATE_RISK"] = "CREATE_RISK";
    Permission["EDIT_RISK"] = "EDIT_RISK";
    Permission["DELETE_RISK"] = "DELETE_RISK";
    Permission["VIEW_RISK"] = "VIEW_RISK";
    // Compliance
    Permission["CREATE_COMPLIANCE"] = "CREATE_COMPLIANCE";
    Permission["EDIT_COMPLIANCE"] = "EDIT_COMPLIANCE";
    Permission["DELETE_COMPLIANCE"] = "DELETE_COMPLIANCE";
    Permission["VIEW_COMPLIANCE"] = "VIEW_COMPLIANCE";
    // Policies
    Permission["CREATE_POLICY"] = "CREATE_POLICY";
    Permission["EDIT_POLICY"] = "EDIT_POLICY";
    Permission["DELETE_POLICY"] = "DELETE_POLICY";
    Permission["VIEW_POLICY"] = "VIEW_POLICY";
    Permission["APPROVE_POLICY"] = "APPROVE_POLICY";
    // Incidents
    Permission["CREATE_INCIDENT"] = "CREATE_INCIDENT";
    Permission["EDIT_INCIDENT"] = "EDIT_INCIDENT";
    Permission["DELETE_INCIDENT"] = "DELETE_INCIDENT";
    Permission["VIEW_INCIDENT"] = "VIEW_INCIDENT";
    // Controls
    Permission["CREATE_CONTROL"] = "CREATE_CONTROL";
    Permission["EDIT_CONTROL"] = "EDIT_CONTROL";
    Permission["DELETE_CONTROL"] = "DELETE_CONTROL";
    Permission["VIEW_CONTROL"] = "VIEW_CONTROL";
    // Documents
    Permission["UPLOAD_DOCUMENT"] = "UPLOAD_DOCUMENT";
    Permission["DELETE_DOCUMENT"] = "DELETE_DOCUMENT";
    Permission["VIEW_DOCUMENT"] = "VIEW_DOCUMENT";
    // Reports & Analytics
    Permission["VIEW_REPORTS"] = "VIEW_REPORTS";
    Permission["CREATE_REPORTS"] = "CREATE_REPORTS";
    Permission["EXPORT_DATA"] = "EXPORT_DATA";
    // System
    Permission["MANAGE_SETTINGS"] = "MANAGE_SETTINGS";
    Permission["VIEW_AUDIT_LOGS"] = "VIEW_AUDIT_LOGS";
})(Permission || (exports.Permission = Permission = {}));
// Role to permissions mapping
const rolePermissions = {
    [UserRole.ADMIN]: [
        // Full access to everything
        ...Object.values(Permission),
    ],
    [UserRole.COMPLIANCE_OFFICER]: [
        // User management (limited)
        Permission.VIEW_USERS,
        Permission.INVITE_USERS,
        // Full GRC module access
        Permission.CREATE_RISK,
        Permission.EDIT_RISK,
        Permission.DELETE_RISK,
        Permission.VIEW_RISK,
        Permission.CREATE_COMPLIANCE,
        Permission.EDIT_COMPLIANCE,
        Permission.DELETE_COMPLIANCE,
        Permission.VIEW_COMPLIANCE,
        Permission.CREATE_POLICY,
        Permission.EDIT_POLICY,
        Permission.DELETE_POLICY,
        Permission.VIEW_POLICY,
        Permission.APPROVE_POLICY,
        Permission.CREATE_INCIDENT,
        Permission.EDIT_INCIDENT,
        Permission.DELETE_INCIDENT,
        Permission.VIEW_INCIDENT,
        Permission.CREATE_CONTROL,
        Permission.EDIT_CONTROL,
        Permission.DELETE_CONTROL,
        Permission.VIEW_CONTROL,
        Permission.UPLOAD_DOCUMENT,
        Permission.DELETE_DOCUMENT,
        Permission.VIEW_DOCUMENT,
        Permission.VIEW_REPORTS,
        Permission.CREATE_REPORTS,
        Permission.EXPORT_DATA,
        Permission.VIEW_AUDIT_LOGS,
    ],
    [UserRole.AUDITOR]: [
        // Read-only access to all modules
        Permission.VIEW_USERS,
        Permission.VIEW_RISK,
        Permission.VIEW_COMPLIANCE,
        Permission.VIEW_POLICY,
        Permission.VIEW_INCIDENT,
        Permission.VIEW_CONTROL,
        Permission.VIEW_DOCUMENT,
        Permission.VIEW_REPORTS,
        Permission.EXPORT_DATA,
        Permission.VIEW_AUDIT_LOGS,
    ],
    [UserRole.VIEWER]: [
        // Limited read-only access
        Permission.VIEW_RISK,
        Permission.VIEW_COMPLIANCE,
        Permission.VIEW_POLICY,
        Permission.VIEW_REPORTS,
    ],
};
// In-memory storage (will be moved to database later)
const users = new Map();
const invitations = new Map();
// Initialize with demo users
const initializeDemoUsers = () => {
    const demoUsers = [
        {
            id: 'user_1',
            email: 'admin@sinfosecurity.com',
            name: 'Admin User',
            role: UserRole.ADMIN,
            status: 'active',
            createdAt: new Date('2024-01-01'),
            lastLogin: new Date(),
        },
        {
            id: 'user_2',
            email: 'compliance@sinfosecurity.com',
            name: 'Compliance Officer',
            role: UserRole.COMPLIANCE_OFFICER,
            department: 'Compliance',
            status: 'active',
            createdAt: new Date('2024-01-15'),
            lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
            id: 'user_3',
            email: 'auditor@sinfosecurity.com',
            name: 'Internal Auditor',
            role: UserRole.AUDITOR,
            department: 'Audit',
            status: 'active',
            createdAt: new Date('2024-02-01'),
            lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
            id: 'user_4',
            email: 'viewer@sinfosecurity.com',
            name: 'Management Viewer',
            role: UserRole.VIEWER,
            department: 'Executive',
            status: 'active',
            createdAt: new Date('2024-02-15'),
        },
    ];
    demoUsers.forEach(user => users.set(user.id, user));
};
// Initialize demo data
initializeDemoUsers();
class UserService {
    /**
     * Get all users
     */
    getAllUsers() {
        return Array.from(users.values());
    }
    /**
     * Get user by ID
     */
    getUserById(userId) {
        return users.get(userId);
    }
    /**
     * Get user by email
     */
    getUserByEmail(email) {
        return Array.from(users.values()).find(u => u.email === email);
    }
    /**
     * Create a new user
     */
    createUser(data) {
        const user = {
            id: `user_${Date.now()}`,
            ...data,
            status: 'active',
            createdAt: new Date(),
        };
        users.set(user.id, user);
        auditService_1.AuditService.log({
            userId: 'system',
            userName: 'System',
            action: 'create_user',
            resourceType: 'User',
            resourceId: user.id,
            resourceName: user.name,
            status: 'success',
            details: `Created user ${user.email} with role ${user.role}`,
        });
        return user;
    }
    /**
     * Update user
     */
    updateUser(userId, updates) {
        const user = users.get(userId);
        if (!user) {
            return null;
        }
        const updated = { ...user, ...updates };
        users.set(userId, updated);
        auditService_1.AuditService.log({
            userId: 'system',
            userName: 'System',
            action: 'update_user',
            resourceType: 'User',
            resourceId: userId,
            resourceName: user.name,
            changes: updates,
            status: 'success',
            details: `Updated user ${user.email}`,
        });
        return updated;
    }
    /**
     * Delete user (soft delete - set status to inactive)
     */
    deleteUser(userId) {
        const user = users.get(userId);
        if (!user) {
            return false;
        }
        user.status = 'inactive';
        users.set(userId, user);
        auditService_1.AuditService.log({
            userId: 'system',
            userName: 'System',
            action: 'delete_user',
            resourceType: 'User',
            resourceId: userId,
            resourceName: user.name,
            status: 'success',
            details: `Deactivated user ${user.email}`,
        });
        return true;
    }
    /**
     * Invite a new user
     */
    inviteUser(email, role, invitedBy) {
        const invitation = {
            id: `invite_${Date.now()}`,
            email,
            role,
            invitedBy,
            invitedAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            token: this.generateInviteToken(),
            status: 'pending',
        };
        invitations.set(invitation.id, invitation);
        auditService_1.AuditService.log({
            userId: invitedBy,
            userName: 'Admin',
            action: 'invite_user',
            resourceType: 'Invitation',
            resourceId: invitation.id,
            resourceName: email,
            status: 'success',
            details: `Invited ${email} as ${role}`,
        });
        return invitation;
    }
    /**
     * Get all invitations
     */
    getAllInvitations() {
        return Array.from(invitations.values());
    }
    /**
     * Accept invitation
     */
    acceptInvitation(token, userData) {
        const invitation = Array.from(invitations.values()).find(inv => inv.token === token && inv.status === 'pending');
        if (!invitation) {
            return null;
        }
        if (invitation.expiresAt < new Date()) {
            invitation.status = 'expired';
            invitations.set(invitation.id, invitation);
            return null;
        }
        // Create user from invitation
        const user = this.createUser({
            email: invitation.email,
            name: userData.name,
            role: invitation.role,
            invitedBy: invitation.invitedBy,
        });
        invitation.status = 'accepted';
        invitations.set(invitation.id, invitation);
        return user;
    }
    /**
     * Check if user has a specific permission
     */
    hasPermission(userId, permission) {
        const user = users.get(userId);
        if (!user || user.status !== 'active') {
            return false;
        }
        const permissions = rolePermissions[user.role] || [];
        return permissions.includes(permission);
    }
    /**
     * Get all permissions for a role
     */
    getRolePermissions(role) {
        return rolePermissions[role] || [];
    }
    /**
     * Get all permissions for a user
     */
    getUserPermissions(userId) {
        const user = users.get(userId);
        if (!user || user.status !== 'active') {
            return [];
        }
        return this.getRolePermissions(user.role);
    }
    /**
     * Generate invite token
     */
    generateInviteToken() {
        return `invite_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    }
    /**
     * Update last login time
     */
    updateLastLogin(userId) {
        const user = users.get(userId);
        if (user) {
            user.lastLogin = new Date();
            users.set(userId, user);
        }
    }
}
// Export singleton instance
exports.default = new UserService();
//# sourceMappingURL=userService.js.map