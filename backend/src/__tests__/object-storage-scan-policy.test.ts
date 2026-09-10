import { ScanStatus } from '@prisma/client';
import { ApiError } from '../middleware/errorHandler';
import {
    assertDownloadable,
    evaluateScanDownloadPolicy,
    scanDownloadPolicyFromEnv,
} from '../services/objectStorageService';

const CLOSED = {
    allowPendingDownloads: false,
    allowUnscannedDownloads: false,
};

describe('evidence malware download policy', () => {
    it('does not treat any non-CLEAN state as CLEAN by default', () => {
        const statuses = [
            ScanStatus.PENDING,
            ScanStatus.INFECTED,
            ScanStatus.FAILED,
            ScanStatus.NOT_CONFIGURED,
        ];
        for (const status of statuses) {
            const decision = evaluateScanDownloadPolicy(status, CLOSED);
            expect(decision.allowed).toBe(false);
            expect(decision.statusCode).toBe(403);
            expect(decision.reason.toLowerCase()).not.toContain('passed malware scanning');
        }
    });

    it('allows CLEAN downloads', () => {
        const decision = evaluateScanDownloadPolicy(ScanStatus.CLEAN, CLOSED);
        expect(decision.allowed).toBe(true);
        expect(decision.statusCode).toBe(200);
    });

    it('blocks INFECTED downloads', () => {
        const decision = evaluateScanDownloadPolicy(ScanStatus.INFECTED, CLOSED);
        expect(decision.allowed).toBe(false);
        expect(decision.reason).toMatch(/infected/i);
        expect(() => assertDownloadable(ScanStatus.INFECTED, CLOSED)).toThrow(ApiError);
    });

    it('blocks PENDING downloads until an explicit policy flag permits them', () => {
        expect(evaluateScanDownloadPolicy(ScanStatus.PENDING, CLOSED).allowed).toBe(false);
        const permitted = evaluateScanDownloadPolicy(ScanStatus.PENDING, {
            allowPendingDownloads: true,
            allowUnscannedDownloads: false,
        });
        expect(permitted.allowed).toBe(true);
        expect(permitted.reason).toMatch(/deployment policy/i);
    });

    it('fails closed on FAILED scans', () => {
        const decision = evaluateScanDownloadPolicy(ScanStatus.FAILED, {
            allowPendingDownloads: true,
            allowUnscannedDownloads: true,
        });
        expect(decision.allowed).toBe(false);
        expect(decision.reason).toMatch(/failed closed/i);
    });

    it('blocks NOT_CONFIGURED unless ALLOW_UNSCANNED_DOWNLOADS is explicit', () => {
        expect(evaluateScanDownloadPolicy(ScanStatus.NOT_CONFIGURED, CLOSED).allowed).toBe(false);
        const permitted = evaluateScanDownloadPolicy(ScanStatus.NOT_CONFIGURED, {
            allowPendingDownloads: false,
            allowUnscannedDownloads: true,
        });
        expect(permitted.allowed).toBe(true);
    });

    it('fails closed on unknown scan statuses', () => {
        const decision = evaluateScanDownloadPolicy('WEIRD', CLOSED);
        expect(decision.allowed).toBe(false);
        expect(decision.reason).toMatch(/unknown/i);
    });

    it('reads deployment policy only from explicit true flags', () => {
        expect(scanDownloadPolicyFromEnv({})).toEqual({
            allowPendingDownloads: false,
            allowUnscannedDownloads: false,
        });
        expect(
            scanDownloadPolicyFromEnv({
                ALLOW_PENDING_DOWNLOADS: 'true',
                ALLOW_UNSCANNED_DOWNLOADS: 'true',
            })
        ).toEqual({
            allowPendingDownloads: true,
            allowUnscannedDownloads: true,
        });
        expect(
            scanDownloadPolicyFromEnv({
                ALLOW_PENDING_DOWNLOADS: '1',
                ALLOW_UNSCANNED_DOWNLOADS: 'yes',
            })
        ).toEqual({
            allowPendingDownloads: false,
            allowUnscannedDownloads: false,
        });
    });
});
