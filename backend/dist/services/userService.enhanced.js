"use strict";
/**
 * Enhanced User Management Service with Multi-Tenancy
 * Handles user CRUD operations, organization-scoped roles, and permissions
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Permission = exports.OrganizationRole = void 0;
const auditService_1 = require("./auditService");
const organizationService_1 = __importDefault(require("./organizationService"));
// Enhanced user roles for organization-based multi-tenancy
var OrganizationRole;
(function (OrganizationRole) {
    // Organization-level roles
    OrganizationRole["ORG_OWNER"] = "ORG_OWNER";
    OrganizationRole["ORG_ADMIN"] = "ORG_ADMIN";
    // Functional roles
    OrganizationRole["COMPLIANCE_MANAGER"] = "COMPLIANCE_MANAGER";
    OrganizationRole["RISK_MANAGER"] = "RISK_MANAGER";
    OrganizationRole["AUDITOR"] = "AUDITOR";
    // Limited roles
    OrganizationRole["DEPARTMENT_MANAGER"] = "DEPARTMENT_MANAGER";
    OrganizationRole["CONTRIBUTOR"] = "CONTRIBUTOR";
    OrganizationRole["VIEWER"] = "VIEWER";
})(OrganizationRole || (exports.OrganizationRole = OrganizationRole = {}));
// Comprehensive permissions
var Permission;
(function (Permission) {
    // Organization management
    Permission["MANAGE_ORGANIZATION"] = "MANAGE_ORGANIZATION";
    Permission["MANAGE_BILLING"] = "MANAGE_BILLING";
    Permission["MANAGE_SETTINGS"] = "MANAGE_SETTINGS";
    Permission["VIEW_SETTINGS"] = "VIEW_SETTINGS";
    // User management
    Permission["MANAGE_USERS"] = "MANAGE_USERS";
    Permission["INVITE_USERS"] = "INVITE_USERS";
    Permission["VIEW_USERS"] = "VIEW_USERS";
    // Risk management
    Permission["CREATE_RISK"] = "CREATE_RISK";
    Permission["EDIT_RISK"] = "EDIT_RISK";
    Permission["DELETE_RISK"] = "DELETE_RISK";
    Permission["VIEW_RISK"] = "VIEW_RISK";
    Permission["ASSIGN_RISK"] = "ASSIGN_RISK";
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
    Permission["TEST_CONTROL"] = "TEST_CONTROL";
    // Vendors
    Permission["CREATE_VENDOR"] = "CREATE_VENDOR";
    Permission["EDIT_VENDOR"] = "EDIT_VENDOR";
    Permission["DELETE_VENDOR"] = "DELETE_VENDOR";
    Permission["VIEW_VENDOR"] = "VIEW_VENDOR";
    Permission["ASSESS_VENDOR"] = "ASSESS_VENDOR";
    // Documents
    Permission["UPLOAD_DOCUMENT"] = "UPLOAD_DOCUMENT";
    Permission["DELETE_DOCUMENT"] = "DELETE_DOCUMENT";
    Permission["VIEW_DOCUMENT"] = "VIEW_DOCUMENT";
    // Tasks & Workflows
    Permission["CREATE_TASK"] = "CREATE_TASK";
    Permission["EDIT_TASK"] = "EDIT_TASK";
    Permission["DELETE_TASK"] = "DELETE_TASK";
    Permission["VIEW_TASK"] = "VIEW_TASK";
    Permission["ASSIGN_TASK"] = "ASSIGN_TASK";
    Permission["COMPLETE_TASK"] = "COMPLETE_TASK";
    // Reports & Analytics
    Permission["VIEW_REPORTS"] = "VIEW_REPORTS";
    Permission["CREATE_REPORTS"] = "CREATE_REPORTS";
    Permission["EXPORT_DATA"] = "EXPORT_DATA";
    Permission["VIEW_ANALYTICS"] = "VIEW_ANALYTICS";
    // System
    Permission["VIEW_AUDIT_LOGS"] = "VIEW_AUDIT_LOGS";
    Permission["MANAGE_INTEGRATIONS"] = "MANAGE_INTEGRATIONS";
    Permission["ACCESS_API"] = "ACCESS_API";
})(Permission || (exports.Permission = Permission = {}));
// Role to permissions mapping
const rolePermissions = {
    [OrganizationRole.ORG_OWNER]: [
        // Full access to everything
        ...Object.values(Permission),
    ],
    [OrganizationRole.ORG_ADMIN]: [
        // Organization management (no billing)
        Permission.MANAGE_ORGANIZATION,
        Permission.MANAGE_SETTINGS,
        Permission.VIEW_SETTINGS,
        // User management
        Permission.MANAGE_USERS,
        Permission.INVITE_USERS,
        Permission.VIEW_USERS,
        // Full GRC access
        Permission.CREATE_RISK,
        Permission.EDIT_RISK,
        Permission.DELETE_RISK,
        Permission.VIEW_RISK,
        Permission.ASSIGN_RISK,
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
        Permission.TEST_CONTROL,
        Permission.CREATE_VENDOR,
        Permission.EDIT_VENDOR,
        Permission.DELETE_VENDOR,
        Permission.VIEW_VENDOR,
        Permission.ASSESS_VENDOR,
        Permission.UPLOAD_DOCUMENT,
        Permission.DELETE_DOCUMENT,
        Permission.VIEW_DOCUMENT,
        Permission.CREATE_TASK,
        Permission.EDIT_TASK,
        Permission.DELETE_TASK,
        Permission.VIEW_TASK,
        Permission.ASSIGN_TASK,
        Permission.COMPLETE_TASK,
        Permission.VIEW_REPORTS,
        Permission.CREATE_REPORTS,
        Permission.EXPORT_DATA,
        Permission.VIEW_ANALYTICS,
        Permission.VIEW_AUDIT_LOGS,
        Permission.MANAGE_INTEGRATIONS,
        Permission.ACCESS_API,
    ],
    [OrganizationRole.COMPLIANCE_MANAGER]: [
        // View users (limited)
        Permission.VIEW_USERS,
        // Full GRC operations
        Permission.CREATE_RISK,
        Permission.EDIT_RISK,
        Permission.VIEW_RISK,
        Permission.ASSIGN_RISK,
        Permission.CREATE_COMPLIANCE,
        Permission.EDIT_COMPLIANCE,
        Permission.VIEW_COMPLIANCE,
        Permission.CREATE_POLICY,
        Permission.EDIT_POLICY,
        Permission.VIEW_POLICY,
        Permission.APPROVE_POLICY,
        Permission.CREATE_INCIDENT,
        Permission.EDIT_INCIDENT,
        Permission.VIEW_INCIDENT,
        Permission.CREATE_CONTROL,
        Permission.EDIT_CONTROL,
        Permission.VIEW_CONTROL,
        Permission.TEST_CONTROL,
        Permission.CREATE_VENDOR,
        Permission.EDIT_VENDOR,
        Permission.VIEW_VENDOR,
        Permission.ASSESS_VENDOR,
        Permission.UPLOAD_DOCUMENT,
        Permission.VIEW_DOCUMENT,
        Permission.CREATE_TASK,
        Permission.EDIT_TASK,
        Permission.VIEW_TASK,
        Permission.ASSIGN_TASK,
        Permission.COMPLETE_TASK,
        Permission.VIEW_REPORTS,
        Permission.CREATE_REPORTS,
        Permission.EXPORT_DATA,
        Permission.VIEW_ANALYTICS,
        Permission.VIEW_AUDIT_LOGS,
    ],
    [OrganizationRole.RISK_MANAGER]: [
        Permission.VIEW_USERS,
        // Risk & incident focus
        Permission.CREATE_RISK,
        Permission.EDIT_RISK,
        Permission.VIEW_RISK,
        Permission.ASSIGN_RISK,
        Permission.CREATE_INCIDENT,
        Permission.EDIT_INCIDENT,
        Permission.VIEW_INCIDENT,
        Permission.VIEW_CONTROL,
        Permission.TEST_CONTROL,
        Permission.VIEW_VENDOR,
        Permission.ASSESS_VENDOR,
        Permission.UPLOAD_DOCUMENT,
        Permission.VIEW_DOCUMENT,
        Permission.CREATE_TASK,
        Permission.EDIT_TASK,
        Permission.VIEW_TASK,
        Permission.COMPLETE_TASK,
        Permission.VIEW_REPORTS,
        Permission.EXPORT_DATA,
        Permission.VIEW_ANALYTICS,
    ],
    [OrganizationRole.AUDITOR]: [
        // Read-only access to everything + export
        Permission.VIEW_USERS,
        Permission.VIEW_RISK,
        Permission.VIEW_COMPLIANCE,
        Permission.VIEW_POLICY,
        Permission.VIEW_INCIDENT,
        Permission.VIEW_CONTROL,
        Permission.VIEW_VENDOR,
        Permission.VIEW_DOCUMENT,
        Permission.VIEW_TASK,
        Permission.VIEW_REPORTS,
        Permission.VIEW_ANALYTICS,
        Permission.EXPORT_DATA,
        Permission.VIEW_AUDIT_LOGS,
        Permission.VIEW_SETTINGS,
    ],
    [OrganizationRole.DEPARTMENT_MANAGER]: [
        // Limited to assigned items
        Permission.VIEW_RISK,
        Permission.VIEW_COMPLIANCE,
        Permission.VIEW_CONTROL,
        Permission.VIEW_TASK,
        Permission.COMPLETE_TASK,
        Permission.UPLOAD_DOCUMENT,
        Permission.VIEW_DOCUMENT,
        Permission.VIEW_REPORTS,
    ],
    [OrganizationRole.CONTRIBUTOR]: [
        // Can create and edit assigned items
        Permission.CREATE_RISK,
        Permission.EDIT_RISK,
        Permission.VIEW_RISK,
        Permission.VIEW_COMPLIANCE,
        Permission.VIEW_CONTROL,
        Permission.CREATE_INCIDENT,
        Permission.VIEW_INCIDENT,
        Permission.UPLOAD_DOCUMENT,
        Permission.VIEW_DOCUMENT,
        Permission.CREATE_TASK,
        Permission.VIEW_TASK,
        Permission.COMPLETE_TASK,
        Permission.VIEW_REPORTS,
    ],
    [OrganizationRole.VIEWER]: [
        // Read-only dashboards
        Permission.VIEW_RISK,
        Permission.VIEW_COMPLIANCE,
        Permission.VIEW_POLICY,
        Permission.VIEW_REPORTS,
        Permission.VIEW_ANALYTICS,
    ],
};
// In-memory storage (will be moved to database with row-level security)
const users = new Map();
const invitations = new Map();
// Initialize with demo users for demo organization
const initializeDemoUsers = () => {
    const demoOrgId = 'org_demo'; // Match the demo org subdomain
    const demoUsers = [
        {
            id: 'user_1',
            email: 'owner@sinfosecurity.com',
            name: 'Organization Owner',
            organizationId: demoOrgId,
            role: OrganizationRole.ORG_OWNER,
            status: 'active',
            createdAt: new Date('2024-01-01'),
            lastLogin: new Date(),
        },
        {
            id: 'user_2',
            email: 'admin@sinfosecurity.com',
            name: 'Organization Admin',
            organizationId: demoOrgId,
            role: OrganizationRole.ORG_ADMIN,
            department: 'IT',
            status: 'active',
            createdAt: new Date('2024-01-01'),
            lastLogin: new Date(),
        },
        {
            id: 'user_3',
            email: 'compliance@sinfosecurity.com',
            name: 'Compliance Manager',
            organizationId: demoOrgId,
            role: OrganizationRole.COMPLIANCE_MANAGER,
            department: 'Compliance',
            status: 'active',
            createdAt: new Date('2024-01-15'),
            lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
            id: 'user_4',
            email: 'risk@sinfosecurity.com',
            name: 'Risk Manager',
            organizationId: demoOrgId,
            role: OrganizationRole.RISK_MANAGER,
            department: 'Risk',
            status: 'active',
            createdAt: new Date('2024-01-15'),
            lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        {
            id: 'user_5',
            email: 'auditor@sinfosecurity.com',
            name: 'Internal Auditor',
            organizationId: demoOrgId,
            role: OrganizationRole.AUDITOR,
            department: 'Audit',
            status: 'active',
            createdAt: new Date('2024-02-01'),
            lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
            id: 'user_6',
            email: 'dept.manager@sinfosecurity.com',
            name: 'Department Manager',
            organizationId: demoOrgId,
            role: OrganizationRole.DEPARTMENT_MANAGER,
            department: 'Finance',
            status: 'active',
            createdAt: new Date('2024-02-01'),
            lastLogin: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
        {
            id: 'user_7',
            email: 'contributor@sinfosecurity.com',
            name: 'Team Contributor',
            organizationId: demoOrgId,
            role: OrganizationRole.CONTRIBUTOR,
            department: 'Operations',
            status: 'active',
            createdAt: new Date('2024-02-10'),
            lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
        {
            id: 'user_8',
            email: 'viewer@sinfosecurity.com',
            name: 'Executive Viewer',
            organizationId: demoOrgId,
            role: OrganizationRole.VIEWER,
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
     * Get all users for an organization (tenant isolation)
     */
    getUsersByOrganization(organizationId) {
        return Array.from(users.values()).filter(u => u.organizationId === organizationId && u.status !== 'inactive');
    }
    /**
     * Get user by ID (with org check)
     */
    getUserById(userId, organizationId) {
        const user = users.get(userId);
        if (!user)
            return undefined;
        // If organizationId is provided, verify user belongs to that org
        if (organizationId && user.organizationId !== organizationId) {
            return undefined;
        }
        return user;
    }
    /**
     * Get user by email within organization
     */
    getUserByEmail(email, organizationId) {
        return Array.from(users.values()).find(u => u.email === email && u.organizationId === organizationId);
    }
    /**
     * Create a new user within an organization
     */
    createUser(data) {
        // Check if organization has available seats
        if (!organizationService_1.default.hasAvailableSeats(data.organizationId)) {
            throw new Error('Organization has reached maximum user limit. Please upgrade your plan.');
        }
        // Check if email already exists in organization
        if (this.getUserByEmail(data.email, data.organizationId)) {
            throw new Error('User with this email already exists in organization');
        }
        const user = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...data,
            status: 'active',
            createdAt: new Date(),
        };
        users.set(user.id, user);
        // Increment organization used seats
        organizationService_1.default.incrementUsedSeats(data.organizationId);
        auditService_1.AuditService.log({
            userId: 'system',
            userName: 'System',
            action: 'create_user',
            resourceType: 'User',
            resourceId: user.id,
            resourceName: user.name,
            status: 'success',
            details: `Created user ${user.email} with role ${user.role} in organization ${data.organizationId}`,
        });
        return user;
    }
    /**
     * Update user
     */
    updateUser(userId, updates, organizationId) {
        const user = this.getUserById(userId, organizationId);
        if (!user) {
            return null;
        }
        const updated = { ...user, ...updates, organizationId: user.organizationId }; // Prevent org change
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
    deleteUser(userId, organizationId) {
        const user = this.getUserById(userId, organizationId);
        if (!user) {
            return false;
        }
        user.status = 'inactive';
        users.set(userId, user);
        // Decrement organization used seats
        organizationService_1.default.decrementUsedSeats(organizationId);
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
     * Invite a new user to organization
     */
    inviteUser(email, role, organizationId, invitedBy) {
        // Check if organization has available seats
        if (!organizationService_1.default.hasAvailableSeats(organizationId)) {
            throw new Error('Organization has reached maximum user limit');
        }
        const invitation = {
            id: `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email,
            organizationId,
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
            details: `Invited ${email} as ${role} to organization ${organizationId}`,
        });
        return invitation;
    }
    /**
     * Get all invitations for an organization
     */
    getInvitationsByOrganization(organizationId) {
        return Array.from(invitations.values()).filter(inv => inv.organizationId === organizationId);
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
            organizationId: invitation.organizationId,
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
    hasPermission(userId, permission, organizationId) {
        const user = this.getUserById(userId, organizationId);
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
    getUserPermissions(userId, organizationId) {
        const user = this.getUserById(userId, organizationId);
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
    /**
     * Get user count by role for an organization
     */
    getUserCountByRole(organizationId) {
        const orgUsers = this.getUsersByOrganization(organizationId);
        const counts = {};
        orgUsers.forEach(user => {
            counts[user.role] = (counts[user.role] || 0) + 1;
        });
        return counts;
    }
}
// Export singleton instance
exports.default = new UserService();
//# sourceMappingURL=userService.enhanced.js.map