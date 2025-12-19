/**
 * Multi-Factor Authentication (MFA) Service
 * Supports TOTP, SMS, Email, and Backup Codes
 */

import crypto from 'crypto';

export type MFAMethod = 'TOTP' | 'SMS' | 'EMAIL' | 'BACKUP_CODES';

export interface MFAConfig {
    userId: string;
    method: MFAMethod;
    enabled: boolean;
    verified: boolean;
    createdAt: Date;
    lastUsedAt?: Date;
    
    // TOTP-specific
    totpSecret?: string;
    totpQRCode?: string;
    
    // SMS/Email-specific
    phoneNumber?: string;
    email?: string;
    
    // Backup codes
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

// In-memory storage
const mfaConfigs = new Map<string, MFAConfig[]>();
const mfaChallenges = new Map<string, MFAChallenge>();
const verificationTokens = new Map<string, { userId: string; method: MFAMethod; expiresAt: Date }>();

class MFAService {
    private readonly CODE_EXPIRY_MINUTES = 5;
    private readonly MAX_ATTEMPTS = 3;
    private readonly BACKUP_CODES_COUNT = 10;

    /**
     * Get user's MFA configurations
     */
    getUserMFAConfigs(userId: string): MFAConfig[] {
        return mfaConfigs.get(userId) || [];
    }

    /**
     * Check if user has MFA enabled
     */
    isMFAEnabled(userId: string): boolean {
        const configs = this.getUserMFAConfigs(userId);
        return configs.some(c => c.enabled && c.verified);
    }

    /**
     * Get enabled MFA methods for user
     */
    getEnabledMethods(userId: string): MFAMethod[] {
        const configs = this.getUserMFAConfigs(userId);
        return configs
            .filter(c => c.enabled && c.verified)
            .map(c => c.method);
    }

    /**
     * Setup TOTP (Time-based One-Time Password)
     */
    setupTOTP(userId: string, userName: string): {
        secret: string;
        qrCode: string;
        backupCodes: string[];
    } {
        // Generate secret (32 bytes base32 encoded)
        const secret = this.generateTOTPSecret();
        
        // Generate QR code URL
        const issuer = 'GRC Platform';
        const otpauthUrl = `otpauth://totp/${issuer}:${userName}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
        const qrCode = this.generateQRCodeURL(otpauthUrl);
        
        // Generate backup codes
        const backupCodes = this.generateBackupCodes();
        
        // Store configuration (not verified yet)
        const config: MFAConfig = {
            userId,
            method: 'TOTP',
            enabled: false,
            verified: false,
            totpSecret: secret,
            totpQRCode: qrCode,
            backupCodes: backupCodes.map(c => this.hashCode(c)),
            createdAt: new Date()
        };
        
        const userConfigs = mfaConfigs.get(userId) || [];
        mfaConfigs.set(userId, [...userConfigs.filter(c => c.method !== 'TOTP'), config]);
        
        console.log(`📱 TOTP setup initiated for user: ${userId}`);
        
        return {
            secret,
            qrCode,
            backupCodes
        };
    }

    /**
     * Verify and enable TOTP
     */
    verifyTOTP(userId: string, code: string): boolean {
        const userConfigs = mfaConfigs.get(userId) || [];
        const totpConfig = userConfigs.find(c => c.method === 'TOTP');
        
        if (!totpConfig || !totpConfig.totpSecret) {
            throw new Error('TOTP not set up');
        }
        
        const isValid = this.validateTOTPCode(totpConfig.totpSecret, code);
        
        if (isValid) {
            totpConfig.enabled = true;
            totpConfig.verified = true;
            totpConfig.lastUsedAt = new Date();
            mfaConfigs.set(userId, userConfigs);
            console.log(`✅ TOTP verified and enabled for user: ${userId}`);
            return true;
        }
        
        console.log(`❌ Invalid TOTP code for user: ${userId}`);
        return false;
    }

    /**
     * Setup SMS-based MFA
     */
    setupSMS(userId: string, phoneNumber: string): { verificationToken: string } {
        const code = this.generateNumericCode(6);
        const token = this.generateVerificationToken();
        
        // Store configuration (not verified yet)
        const config: MFAConfig = {
            userId,
            method: 'SMS',
            enabled: false,
            verified: false,
            phoneNumber,
            createdAt: new Date()
        };
        
        const userConfigs = mfaConfigs.get(userId) || [];
        mfaConfigs.set(userId, [...userConfigs.filter(c => c.method !== 'SMS'), config]);
        
        // Store verification token
        verificationTokens.set(token, {
            userId,
            method: 'SMS',
            expiresAt: new Date(Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000)
        });
        
        // In production, send SMS via Twilio, AWS SNS, etc.
        console.log(`📱 SMS verification code sent to ${phoneNumber}: ${code}`);
        console.log(`   (In production, this would be sent via SMS API)`);
        
        // Store challenge
        this.storeChallenge(userId, 'SMS', code);
        
        return { verificationToken: token };
    }

    /**
     * Setup Email-based MFA
     */
    setupEmail(userId: string, email: string): { verificationToken: string } {
        const code = this.generateNumericCode(6);
        const token = this.generateVerificationToken();
        
        // Store configuration (not verified yet)
        const config: MFAConfig = {
            userId,
            method: 'EMAIL',
            enabled: false,
            verified: false,
            email,
            createdAt: new Date()
        };
        
        const userConfigs = mfaConfigs.get(userId) || [];
        mfaConfigs.set(userId, [...userConfigs.filter(c => c.method !== 'EMAIL'), config]);
        
        // Store verification token
        verificationTokens.set(token, {
            userId,
            method: 'EMAIL',
            expiresAt: new Date(Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000)
        });
        
        // In production, send email
        console.log(`📧 Email verification code sent to ${email}: ${code}`);
        console.log(`   (In production, this would be sent via email service)`);
        
        // Store challenge
        this.storeChallenge(userId, 'EMAIL', code);
        
        return { verificationToken: token };
    }

    /**
     * Verify SMS or Email code
     */
    verifyCode(userId: string, method: 'SMS' | 'EMAIL', code: string): boolean {
        const challengeKey = `${userId}-${method}`;
        const challenge = mfaChallenges.get(challengeKey);
        
        if (!challenge) {
            throw new Error('No active challenge found');
        }
        
        if (challenge.expiresAt < new Date()) {
            mfaChallenges.delete(challengeKey);
            throw new Error('Verification code expired');
        }
        
        if (challenge.attempts >= this.MAX_ATTEMPTS) {
            mfaChallenges.delete(challengeKey);
            throw new Error('Maximum attempts exceeded');
        }
        
        challenge.attempts++;
        
        if (challenge.code === code) {
            challenge.verified = true;
            
            // Enable MFA method
            const userConfigs = mfaConfigs.get(userId) || [];
            const config = userConfigs.find(c => c.method === method);
            if (config) {
                config.enabled = true;
                config.verified = true;
                config.lastUsedAt = new Date();
                mfaConfigs.set(userId, userConfigs);
            }
            
            mfaChallenges.delete(challengeKey);
            console.log(`✅ ${method} verified and enabled for user: ${userId}`);
            return true;
        }
        
        console.log(`❌ Invalid ${method} code for user: ${userId} (Attempt ${challenge.attempts}/${this.MAX_ATTEMPTS})`);
        return false;
    }

    /**
     * Send MFA challenge to user
     */
    sendChallenge(userId: string, method?: MFAMethod): { challengeId: string; method: MFAMethod } {
        const enabledMethods = this.getEnabledMethods(userId);
        
        if (enabledMethods.length === 0) {
            throw new Error('No MFA methods enabled');
        }
        
        // Use specified method or default to first enabled
        const selectedMethod = method && enabledMethods.includes(method) 
            ? method 
            : enabledMethods[0];
        
        const code = selectedMethod === 'TOTP' 
            ? '' // TOTP doesn't need to send code
            : this.generateNumericCode(6);
        
        const challengeId = this.generateChallengeId();
        
        // Store challenge
        const challenge: MFAChallenge = {
            challengeId,
            userId,
            method: selectedMethod,
            code,
            expiresAt: new Date(Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000),
            attempts: 0,
            verified: false
        };
        
        mfaChallenges.set(challengeId, challenge);
        
        // Send code based on method
        if (selectedMethod === 'SMS') {
            const userConfigs = mfaConfigs.get(userId) || [];
            const smsConfig = userConfigs.find(c => c.method === 'SMS');
            console.log(`📱 MFA code sent via SMS to ${smsConfig?.phoneNumber}: ${code}`);
        } else if (selectedMethod === 'EMAIL') {
            const userConfigs = mfaConfigs.get(userId) || [];
            const emailConfig = userConfigs.find(c => c.method === 'EMAIL');
            console.log(`📧 MFA code sent via Email to ${emailConfig?.email}: ${code}`);
        } else if (selectedMethod === 'TOTP') {
            console.log(`📱 TOTP challenge issued for user: ${userId}`);
        }
        
        return { challengeId, method: selectedMethod };
    }

    /**
     * Verify MFA challenge
     */
    verifyChallenge(challengeId: string, code: string): boolean {
        const challenge = mfaChallenges.get(challengeId);
        
        if (!challenge) {
            throw new Error('Invalid challenge ID');
        }
        
        if (challenge.expiresAt < new Date()) {
            mfaChallenges.delete(challengeId);
            throw new Error('Challenge expired');
        }
        
        if (challenge.attempts >= this.MAX_ATTEMPTS) {
            mfaChallenges.delete(challengeId);
            throw new Error('Maximum attempts exceeded');
        }
        
        challenge.attempts++;
        
        let isValid = false;
        
        if (challenge.method === 'TOTP') {
            const userConfigs = mfaConfigs.get(challenge.userId) || [];
            const totpConfig = userConfigs.find(c => c.method === 'TOTP');
            if (totpConfig?.totpSecret) {
                isValid = this.validateTOTPCode(totpConfig.totpSecret, code);
            }
        } else if (challenge.method === 'BACKUP_CODES') {
            isValid = this.validateBackupCode(challenge.userId, code);
        } else {
            isValid = challenge.code === code;
        }
        
        if (isValid) {
            challenge.verified = true;
            
            // Update last used
            const userConfigs = mfaConfigs.get(challenge.userId) || [];
            const config = userConfigs.find(c => c.method === challenge.method);
            if (config) {
                config.lastUsedAt = new Date();
            }
            
            mfaChallenges.delete(challengeId);
            console.log(`✅ MFA challenge verified for user: ${challenge.userId}`);
            return true;
        }
        
        console.log(`❌ Invalid MFA code (Attempt ${challenge.attempts}/${this.MAX_ATTEMPTS})`);
        return false;
    }

    /**
     * Disable MFA method
     */
    disableMFA(userId: string, method: MFAMethod): boolean {
        const userConfigs = mfaConfigs.get(userId) || [];
        const config = userConfigs.find(c => c.method === method);
        
        if (!config) return false;
        
        config.enabled = false;
        mfaConfigs.set(userId, userConfigs);
        console.log(`❌ MFA ${method} disabled for user: ${userId}`);
        return true;
    }

    /**
     * Regenerate backup codes
     */
    regenerateBackupCodes(userId: string): string[] {
        const newCodes = this.generateBackupCodes();
        
        const userConfigs = mfaConfigs.get(userId) || [];
        const totpConfig = userConfigs.find(c => c.method === 'TOTP');
        
        if (totpConfig) {
            totpConfig.backupCodes = newCodes.map(c => this.hashCode(c));
            mfaConfigs.set(userId, userConfigs);
        }
        
        console.log(`🔄 Backup codes regenerated for user: ${userId}`);
        return newCodes;
    }

    /**
     * Get MFA statistics
     */
    getStatistics(organizationId?: string) {
        const allConfigs = Array.from(mfaConfigs.values()).flat();
        
        return {
            totalUsers: mfaConfigs.size,
            mfaEnabled: Array.from(mfaConfigs.values())
                .filter(configs => configs.some(c => c.enabled && c.verified))
                .length,
            methodDistribution: {
                TOTP: allConfigs.filter(c => c.method === 'TOTP' && c.enabled).length,
                SMS: allConfigs.filter(c => c.method === 'SMS' && c.enabled).length,
                EMAIL: allConfigs.filter(c => c.method === 'EMAIL' && c.enabled).length
            },
            adoptionRate: mfaConfigs.size > 0 
                ? ((Array.from(mfaConfigs.values()).filter(configs => configs.some(c => c.enabled)).length / mfaConfigs.size) * 100).toFixed(1)
                : '0.0'
        };
    }

    // ============= Private Helper Methods =============

    private generateTOTPSecret(): string {
        return crypto.randomBytes(20).toString('base32').replace(/=/g, '');
    }

    private generateQRCodeURL(otpauthUrl: string): string {
        // In production, use qrcode library to generate actual image
        return `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(otpauthUrl)}`;
    }

    private generateBackupCodes(): string[] {
        return Array.from({ length: this.BACKUP_CODES_COUNT }, () => 
            crypto.randomBytes(4).toString('hex').toUpperCase()
        );
    }

    private generateNumericCode(length: number): string {
        return Array.from({ length }, () => 
            Math.floor(Math.random() * 10)
        ).join('');
    }

    private generateVerificationToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    private generateChallengeId(): string {
        return `mfa_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }

    private hashCode(code: string): string {
        return crypto.createHash('sha256').update(code).digest('hex');
    }

    private validateTOTPCode(secret: string, code: string): boolean {
        // In production, use speakeasy or otplib library
        // This is a simplified implementation
        const window = 1; // Allow 30s before/after
        const time = Math.floor(Date.now() / 1000 / 30);
        
        for (let i = -window; i <= window; i++) {
            const expectedCode = this.generateTOTPCode(secret, time + i);
            if (expectedCode === code) {
                return true;
            }
        }
        
        return false;
    }

    private generateTOTPCode(secret: string, time: number): string {
        // Simplified TOTP generation (use speakeasy in production)
        const buffer = Buffer.alloc(8);
        buffer.writeBigInt64BE(BigInt(time));
        
        const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base32'));
        hmac.update(buffer);
        const hash = hmac.digest();
        
        const offset = hash[hash.length - 1] & 0xf;
        const code = ((hash[offset] & 0x7f) << 24 |
                     (hash[offset + 1] & 0xff) << 16 |
                     (hash[offset + 2] & 0xff) << 8 |
                     (hash[offset + 3] & 0xff)) % 1000000;
        
        return code.toString().padStart(6, '0');
    }

    private validateBackupCode(userId: string, code: string): boolean {
        const userConfigs = mfaConfigs.get(userId) || [];
        const totpConfig = userConfigs.find(c => c.method === 'TOTP');
        
        if (!totpConfig?.backupCodes) return false;
        
        const hashedCode = this.hashCode(code);
        const index = totpConfig.backupCodes.indexOf(hashedCode);
        
        if (index !== -1) {
            // Remove used backup code
            totpConfig.backupCodes.splice(index, 1);
            mfaConfigs.set(userId, userConfigs);
            console.log(`✅ Backup code used for user: ${userId} (${totpConfig.backupCodes.length} remaining)`);
            return true;
        }
        
        return false;
    }

    private storeChallenge(userId: string, method: MFAMethod, code: string) {
        const challengeKey = `${userId}-${method}`;
        mfaChallenges.set(challengeKey, {
            challengeId: challengeKey,
            userId,
            method,
            code,
            expiresAt: new Date(Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000),
            attempts: 0,
            verified: false
        });
    }
}

export default new MFAService();
