/**
 * User Management Service
 * Handles user CRUD operations, roles, and permissions
 */

import { AuditService } from './auditService';

// User roles with different permission levels
export enum UserRole {
    ADMIN = 'ADMIN', // Full system access
    COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER', // Full GRC module access, no system settings
    AUDITOR = 'AUDITOR', // Read-only access to all modules
    VIEWER = 'VIEWER', // Read-only access to limited modules
}

// Permissions mapped to actions
export enum Permission {
    // User management
    MANAGE_USERS = 'MANAGE_USERS',
    INVITE_USERS = 'INVITE_USERS',
    VIEW_USERS = 'VIEW_USERS',

    // Risk management
    CREATE_RISK = 'CREATE_RISK',
    EDIT_RISK = 'EDIT_RISK',
    DELETE_RISK = 'DELETE_RISK',
    VIEW_RISK = 'VIEW_RISK',

    // Compliance
    CREATE_COMPLIANCE = 'CREATE_COMPLIANCE',
    EDIT_COMPLIANCE = 'EDIT_COMPLIANCE',
    DELETE_COMPLIANCE = 'DELETE_COMPLIANCE',
    VIEW_COMPLIANCE = 'VIEW_COMPLIANCE',

    // Policies
    CREATE_POLICY = 'CREATE_POLICY',
    EDIT_POLICY = 'EDIT_POLICY',
    DELETE_POLICY = 'DELETE_POLICY',
    VIEW_POLICY = 'VIEW_POLICY',
    APPROVE_POLICY = 'APPROVE_POLICY',

    // Incidents
    CREATE_INCIDENT = 'CREATE_INCIDENT',
    EDIT_INCIDENT = 'EDIT_INCIDENT',
    DELETE_INCIDENT = 'DELETE_INCIDENT',
    VIEW_INCIDENT = 'VIEW_INCIDENT',

    // Controls
    CREATE_CONTROL = 'CREATE_CONTROL',
    EDIT_CONTROL = 'EDIT_CONTROL',
    DELETE_CONTROL = 'DELETE_CONTROL',
    VIEW_CONTROL = 'VIEW_CONTROL',

    // Documents
    UPLOAD_DOCUMENT = 'UPLOAD_DOCUMENT',
    DELETE_DOCUMENT = 'DELETE_DOCUMENT',
    VIEW_DOCUMENT = 'VIEW_DOCUMENT',

    // Reports & Analytics
    VIEW_REPORTS = 'VIEW_REPORTS',
    CREATE_REPORTS = 'CREATE_REPORTS',
    EXPORT_DATA = 'EXPORT_DATA',

    // System
    MANAGE_SETTINGS = 'MANAGE_SETTINGS',
    VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',
}

// Role to permissions mapping
const rolePermissions: Record<UserRole, Permission[]> = {
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

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    department?: string;
    status: 'active' | 'inactive' | 'pending';
    createdAt: Date;
    lastLogin?: Date;
    invitedBy?: string;
}

export interface UserInvitation {
    id: string;
    email: string;
    role: UserRole;
    invitedBy: string;
    invitedAt: Date;
    expiresAt: Date;
    token: string;
    status: 'pending' | 'accepted' | 'expired';
}

// In-memory storage (will be moved to database later)
const users = new Map<string, User>();
const invitations = new Map<string, UserInvitation>();

// Initialize with demo users
const initializeDemoUsers = () => {
    const demoUsers: User[] = [
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
    getAllUsers(): User[] {
        return Array.from(users.values());
    }

    /**
     * Get user by ID
     */
    getUserById(userId: string): User | undefined {
        return users.get(userId);
    }

    /**
     * Get user by email
     */
    getUserByEmail(email: string): User | undefined {
        return Array.from(users.values()).find(u => u.email === email);
    }

    /**
     * Create a new user
     */
    createUser(data: Omit<User, 'id' | 'createdAt' | 'status'>): User {
        const user: User = {
            id: `user_${Date.now()}`,
            ...data,
            status: 'active',
            createdAt: new Date(),
        };

        users.set(user.id, user);

        AuditService.log({
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
    updateUser(userId: string, updates: Partial<User>): User | null {
        const user = users.get(userId);

        if (!user) {
            return null;
        }

        const updated = { ...user, ...updates };
        users.set(userId, updated);

        AuditService.log({
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
    deleteUser(userId: string): boolean {
        const user = users.get(userId);

        if (!user) {
            return false;
        }

        user.status = 'inactive';
        users.set(userId, user);

        AuditService.log({
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
    inviteUser(email: string, role: UserRole, invitedBy: string): UserInvitation {
        const invitation: UserInvitation = {
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

        AuditService.log({
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
    getAllInvitations(): UserInvitation[] {
        return Array.from(invitations.values());
    }

    /**
     * Accept invitation
     */
    acceptInvitation(token: string, userData: { name: string }): User | null {
        const invitation = Array.from(invitations.values()).find(
            inv => inv.token === token && inv.status === 'pending'
        );

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
    hasPermission(userId: string, permission: Permission): boolean {
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
    getRolePermissions(role: UserRole): Permission[] {
        return rolePermissions[role] || [];
    }

    /**
     * Get all permissions for a user
     */
    getUserPermissions(userId: string): Permission[] {
        const user = users.get(userId);

        if (!user || user.status !== 'active') {
            return [];
        }

        return this.getRolePermissions(user.role);
    }

    /**
     * Generate invite token
     */
    private generateInviteToken(): string {
        return `invite_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    }

    /**
     * Update last login time
     */
    updateLastLogin(userId: string): void {
        const user = users.get(userId);

        if (user) {
            user.lastLogin = new Date();
            users.set(userId, user);
        }
    }
}

// Export singleton instance
export default new UserService();
