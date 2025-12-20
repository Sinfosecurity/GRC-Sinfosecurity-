/**
import logger from '../config/logger';
 * Multi-Factor Authentication (MFA) Service
 * Supports TOTP, SMS, Email, and Backup Codes
 */
export type MFAMethod = 'TOTP' | 'SMS' | 'EMAIL' | 'BACKUP_CODES';
export interface MFAConfig {
    userId: string;
    method: MFAMethod;
    enabled: boolean;
    verified: boolean;
    createdAt: Date;
    lastUsedAt?: Date;
    totpSecret?: string;
    totpQRCode?: string;
    phoneNumber?: string;
    email?: string;
    backupCodes?: string[];
}
export interface MFAChallenge {
    challengeId: string;
    userId: string;
    method: MFAMethod;
    code: string;
    expiresAt: Date;
    attempts: number;
    verified: boolean;
}
declare class MFAService {
    private readonly CODE_EXPIRY_MINUTES;
    private readonly MAX_ATTEMPTS;
    private readonly BACKUP_CODES_COUNT;
    /**
     * Get user's MFA configurations
     */
    getUserMFAConfigs(userId: string): MFAConfig[];
    /**
     * Check if user has MFA enabled
     */
    isMFAEnabled(userId: string): boolean;
    /**
     * Get enabled MFA methods for user
     */
    getEnabledMethods(userId: string): MFAMethod[];
    /**
     * Setup TOTP (Time-based One-Time Password)
     */
    setupTOTP(userId: string, userName: string): {
        secret: string;
        qrCode: string;
        backupCodes: string[];
    };
    /**
     * Verify and enable TOTP
     */
    verifyTOTP(userId: string, code: string): boolean;
    /**
     * Setup SMS-based MFA
     */
    setupSMS(userId: string, phoneNumber: string): {
        verificationToken: string;
    };
    /**
     * Setup Email-based MFA
     */
    setupEmail(userId: string, email: string): {
        verificationToken: string;
    };
    /**
     * Verify SMS or Email code
     */
    verifyCode(userId: string, method: 'SMS' | 'EMAIL', code: string): boolean;
    /**
     * Send MFA challenge to user
     */
    sendChallenge(userId: string, method?: MFAMethod): {
        challengeId: string;
        method: MFAMethod;
    };
    /**
     * Verify MFA challenge
     */
    verifyChallenge(challengeId: string, code: string): boolean;
    /**
     * Disable MFA method
     */
    disableMFA(userId: string, method: MFAMethod): boolean;
    /**
     * Regenerate backup codes
     */
    regenerateBackupCodes(userId: string): string[];
    /**
     * Get MFA statistics
     */
    getStatistics(organizationId?: string): {
        totalUsers: number;
        mfaEnabled: number;
        methodDistribution: {
            TOTP: number;
            SMS: number;
            EMAIL: number;
        };
        adoptionRate: string;
    };
    private generateTOTPSecret;
    private generateQRCodeURL;
    private generateBackupCodes;
    private generateNumericCode;
    private generateVerificationToken;
    private generateChallengeId;
    private hashCode;
    private validateTOTPCode;
    private generateTOTPCode;
    private validateBackupCode;
    private storeChallenge;
}
declare const _default: MFAService;
export default _default;
//# sourceMappingURL=mfaService.d.ts.map