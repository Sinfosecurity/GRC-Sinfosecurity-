/**
 * User Management Service
 * Handles user CRUD operations, roles, and permissions
 */
export declare enum UserRole {
    ADMIN = "ADMIN",// Full system access
    COMPLIANCE_OFFICER = "COMPLIANCE_OFFICER",// Full GRC module access, no system settings
    AUDITOR = "AUDITOR",// Read-only access to all modules
    VIEWER = "VIEWER"
}
export declare enum Permission {
    MANAGE_USERS = "MANAGE_USERS",
    INVITE_USERS = "INVITE_USERS",
    VIEW_USERS = "VIEW_USERS",
    CREATE_RISK = "CREATE_RISK",
    EDIT_RISK = "EDIT_RISK",
    DELETE_RISK = "DELETE_RISK",
    VIEW_RISK = "VIEW_RISK",
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
    UPLOAD_DOCUMENT = "UPLOAD_DOCUMENT",
    DELETE_DOCUMENT = "DELETE_DOCUMENT",
    VIEW_DOCUMENT = "VIEW_DOCUMENT",
    VIEW_REPORTS = "VIEW_REPORTS",
    CREATE_REPORTS = "CREATE_REPORTS",
    EXPORT_DATA = "EXPORT_DATA",
    MANAGE_SETTINGS = "MANAGE_SETTINGS",
    VIEW_AUDIT_LOGS = "VIEW_AUDIT_LOGS"
}
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
declare class UserService {
    /**
     * Get all users
     */
    getAllUsers(): User[];
    /**
     * Get user by ID
     */
    getUserById(userId: string): User | undefined;
    /**
     * Get user by email
     */
    getUserByEmail(email: string): User | undefined;
    /**
     * Create a new user
     */
    createUser(data: Omit<User, 'id' | 'createdAt' | 'status'>): User;
    /**
     * Update user
     */
    updateUser(userId: string, updates: Partial<User>): User | null;
    /**
     * Delete user (soft delete - set status to inactive)
     */
    deleteUser(userId: string): boolean;
    /**
     * Invite a new user
     */
    inviteUser(email: string, role: UserRole, invitedBy: string): UserInvitation;
    /**
     * Get all invitations
     */
    getAllInvitations(): UserInvitation[];
    /**
     * Accept invitation
     */
    acceptInvitation(token: string, userData: {
        name: string;
    }): User | null;
    /**
     * Check if user has a specific permission
     */
    hasPermission(userId: string, permission: Permission): boolean;
    /**
     * Get all permissions for a role
     */
    getRolePermissions(role: UserRole): Permission[];
    /**
     * Get all permissions for a user
     */
    getUserPermissions(userId: string): Permission[];
    /**
     * Generate invite token
     */
    private generateInviteToken;
    /**
     * Update last login time
     */
    updateLastLogin(userId: string): void;
}
declare const _default: UserService;
export default _default;
//# sourceMappingURL=userService.d.ts.map