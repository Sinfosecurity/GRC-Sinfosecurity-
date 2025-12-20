/**
 * Enhanced User Management Service with Multi-Tenancy
 * Handles user CRUD operations, organization-scoped roles, and permissions
 */
export declare enum OrganizationRole {
    ORG_OWNER = "ORG_OWNER",// Ultimate control - billing, delete org, manage admins
    ORG_ADMIN = "ORG_ADMIN",// User management, settings (no billing)
    COMPLIANCE_MANAGER = "COMPLIANCE_MANAGER",// Full GRC operations
    RISK_MANAGER = "RISK_MANAGER",// Risk & incident management
    AUDITOR = "AUDITOR",// Read-only everything + export
    DEPARTMENT_MANAGER = "DEPARTMENT_MANAGER",// Assigned tasks only
    CONTRIBUTOR = "CONTRIBUTOR",// Create & edit assigned items
    VIEWER = "VIEWER"
}
export declare enum Permission {
    MANAGE_ORGANIZATION = "MANAGE_ORGANIZATION",
    MANAGE_BILLING = "MANAGE_BILLING",
    MANAGE_SETTINGS = "MANAGE_SETTINGS",
    VIEW_SETTINGS = "VIEW_SETTINGS",
    MANAGE_USERS = "MANAGE_USERS",
    INVITE_USERS = "INVITE_USERS",
    VIEW_USERS = "VIEW_USERS",
    CREATE_RISK = "CREATE_RISK",
    EDIT_RISK = "EDIT_RISK",
    DELETE_RISK = "DELETE_RISK",
    VIEW_RISK = "VIEW_RISK",
    ASSIGN_RISK = "ASSIGN_RISK",
    CREATE_COMPLIANCE = "CREATE_COMPLIANCE",
    EDIT_COMPLIANCE = "EDIT_COMPLIANCE",
    DELETE_COMPLIANCE = "DELETE_COMPLIANCE",
    VIEW_COMPLIANCE = "VIEW_COMPLIANCE",
    CREATE_POLICY = "CREATE_POLICY",
    EDIT_POLICY = "EDIT_POLICY",
    DELETE_POLICY = "DELETE_POLICY",
    VIEW_POLICY = "VIEW_POLICY",
    APPROVE_POLICY = "APPROVE_POLICY",
    CREATE_INCIDENT = "CREATE_INCIDENT",
    EDIT_INCIDENT = "EDIT_INCIDENT",
    DELETE_INCIDENT = "DELETE_INCIDENT",
    VIEW_INCIDENT = "VIEW_INCIDENT",
    CREATE_CONTROL = "CREATE_CONTROL",
    EDIT_CONTROL = "EDIT_CONTROL",
    DELETE_CONTROL = "DELETE_CONTROL",
    VIEW_CONTROL = "VIEW_CONTROL",
    TEST_CONTROL = "TEST_CONTROL",
    CREATE_VENDOR = "CREATE_VENDOR",
    EDIT_VENDOR = "EDIT_VENDOR",
    DELETE_VENDOR = "DELETE_VENDOR",
    VIEW_VENDOR = "VIEW_VENDOR",
    ASSESS_VENDOR = "ASSESS_VENDOR",
    UPLOAD_DOCUMENT = "UPLOAD_DOCUMENT",
    DELETE_DOCUMENT = "DELETE_DOCUMENT",
    VIEW_DOCUMENT = "VIEW_DOCUMENT",
    CREATE_TASK = "CREATE_TASK",
    EDIT_TASK = "EDIT_TASK",
    DELETE_TASK = "DELETE_TASK",
    VIEW_TASK = "VIEW_TASK",
    ASSIGN_TASK = "ASSIGN_TASK",
    COMPLETE_TASK = "COMPLETE_TASK",
    VIEW_REPORTS = "VIEW_REPORTS",
    CREATE_REPORTS = "CREATE_REPORTS",
    EXPORT_DATA = "EXPORT_DATA",
    VIEW_ANALYTICS = "VIEW_ANALYTICS",
    VIEW_AUDIT_LOGS = "VIEW_AUDIT_LOGS",
    MANAGE_INTEGRATIONS = "MANAGE_INTEGRATIONS",
    ACCESS_API = "ACCESS_API"
}
export interface User {
    id: string;
    email: string;
    name: string;
    organizationId: string;
    role: OrganizationRole;
    department?: string;
    status: 'active' | 'inactive' | 'pending';
    createdAt: Date;
    lastLogin?: Date;
    invitedBy?: string;
}
export interface UserInvitation {
    id: string;
    email: string;
    organizationId: string;
    role: OrganizationRole;
    invitedBy: string;
    invitedAt: Date;
    expiresAt: Date;
    token: string;
    status: 'pending' | 'accepted' | 'expired';
}
declare class UserService {
    /**
     * Get all users for an organization (tenant isolation)
     */
    getUsersByOrganization(organizationId: string): User[];
    /**
     * Get user by ID (with org check)
     */
    getUserById(userId: string, organizationId?: string): User | undefined;
    /**
     * Get user by email within organization
     */
    getUserByEmail(email: string, organizationId: string): User | undefined;
    /**
     * Create a new user within an organization
     */
    createUser(data: Omit<User, 'id' | 'createdAt' | 'status'>): User;
    /**
     * Update user
     */
    updateUser(userId: string, updates: Partial<User>, organizationId: string): User | null;
    /**
     * Delete user (soft delete - set status to inactive)
     */
    deleteUser(userId: string, organizationId: string): boolean;
    /**
     * Invite a new user to organization
     */
    inviteUser(email: string, role: OrganizationRole, organizationId: string, invitedBy: string): UserInvitation;
    /**
     * Get all invitations for an organization
     */
    getInvitationsByOrganization(organizationId: string): UserInvitation[];
    /**
     * Accept invitation
     */
    acceptInvitation(token: string, userData: {
        name: string;
    }): User | null;
    /**
     * Check if user has a specific permission
     */
    hasPermission(userId: string, permission: Permission, organizationId: string): boolean;
    /**
     * Get all permissions for a role
     */
    getRolePermissions(role: OrganizationRole): Permission[];
    /**
     * Get all permissions for a user
     */
    getUserPermissions(userId: string, organizationId: string): Permission[];
    /**
     * Generate invite token
     */
    private generateInviteToken;
    /**
     * Update last login time
     */
    updateLastLogin(userId: string): void;
    /**
     * Get user count by role for an organization
     */
    getUserCountByRole(organizationId: string): Record<string, number>;
}
declare const _default: UserService;
export default _default;
//# sourceMappingURL=userService.enhanced.d.ts.map