import crypto from 'crypto';
import { ScanStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from './auditEventService';
import { LocalStorageProvider } from '../storage/localStorageProvider';
import { S3StorageProvider } from '../storage/s3StorageProvider';
import { ObjectStorageProvider, sanitizeFilename } from '../storage/types';
import { assertSafeUpload } from '../malware/filePolicy';
import { initialUploadScanStatus, malwareProviderHealth, malwareScanService } from '../malware/malwareScanService';

export type ScanDownloadPolicy = {
    allowPendingDownloads: boolean;
    allowUnscannedDownloads: boolean;
};

export type ScanDownloadDecision = {
    allowed: boolean;
    statusCode: 200 | 403;
    reason: string;
};

export function scanDownloadPolicyFromEnv(env: NodeJS.ProcessEnv = process.env): ScanDownloadPolicy {
    return {
        allowPendingDownloads: env.ALLOW_PENDING_DOWNLOADS === 'true',
        allowUnscannedDownloads: env.ALLOW_UNSCANNED_DOWNLOADS === 'true',
    };
}

/**
 * Evidence download policy. No scan state is treated as CLEAN unless it is CLEAN.
 * PENDING / FAILED / INFECTED / NOT_CONFIGURED never succeed unless an explicit
 * deployment flag permits that specific non-clean state.
 */
export function evaluateScanDownloadPolicy(
    scanStatus: ScanStatus | string,
    policy: ScanDownloadPolicy = scanDownloadPolicyFromEnv()
): ScanDownloadDecision {
    switch (scanStatus) {
        case ScanStatus.CLEAN:
            return { allowed: true, statusCode: 200, reason: 'File passed malware scanning' };
        case ScanStatus.INFECTED:
            return { allowed: false, statusCode: 403, reason: 'Download blocked: file marked infected' };
        case ScanStatus.PENDING:
            if (policy.allowPendingDownloads) {
                return { allowed: true, statusCode: 200, reason: 'Pending scan download permitted by deployment policy' };
            }
            return { allowed: false, statusCode: 403, reason: 'Download blocked: malware scan is pending' };
        case ScanStatus.FAILED:
        case 'ERROR':
            return { allowed: false, statusCode: 403, reason: 'Download blocked: malware scan failed closed' };
        case ScanStatus.NOT_CONFIGURED:
            if (policy.allowUnscannedDownloads) {
                return { allowed: true, statusCode: 200, reason: 'Unscanned download permitted by deployment policy' };
            }
            return {
                allowed: false,
                statusCode: 403,
                reason: 'Download blocked: malware scanning is not configured',
            };
        default:
            return { allowed: false, statusCode: 403, reason: 'Download blocked: unknown scan status' };
    }
}

export function assertDownloadable(scanStatus: ScanStatus | string, policy?: ScanDownloadPolicy): void {
    const decision = evaluateScanDownloadPolicy(scanStatus, policy);
    if (!decision.allowed) {
        throw new ApiError(decision.statusCode, decision.reason);
    }
}

function malwareScanStatus(): ScanStatus {
    return initialUploadScanStatus();
}

function provider(): ObjectStorageProvider {
    const s3 = new S3StorageProvider();
    if (s3.isConfigured()) {
        return s3;
    }
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_OBJECT_STORAGE !== 'true') {
        throw new ApiError(503, 'Object storage is not configured');
    }
    return new LocalStorageProvider();
}

export const objectStorageService = {
    status() {
        const s3 = new S3StorageProvider();
        return {
            provider: s3.isConfigured() ? 's3' : process.env.NODE_ENV === 'production' ? 'NOT_CONFIGURED' : 'local',
            malwareScanning: malwareScanStatus(),
            malwareProvider: malwareProviderHealth(),
            downloadPolicy: scanDownloadPolicyFromEnv(),
        };
    },

    async upload(input: {
        organizationId: string;
        uploadedBy: string;
        ownerType: string;
        ownerId: string;
        filename: string;
        contentType: string;
        buffer: Buffer;
        classification?: string;
        requestId?: string;
    }) {
        assertSafeUpload(input.contentType, input.filename, input.buffer);

        const safeName = sanitizeFilename(input.filename);
        const storageKey = `${input.organizationId}/${input.ownerType}/${input.ownerId}/${crypto.randomUUID()}-${safeName}`;
        const checksum = crypto.createHash('sha256').update(input.buffer).digest('hex');
        const store = provider();
        await store.putObject(storageKey, input.buffer, input.contentType);
        const scanStatus = malwareScanStatus();

        let stored;
        try {
            stored = await prisma.storedObject.create({
                data: {
                    organizationId: input.organizationId,
                    ownerType: input.ownerType,
                    ownerId: input.ownerId,
                    filename: safeName,
                    storageKey,
                    contentType: input.contentType,
                    size: input.buffer.length,
                    checksum,
                    uploadedBy: input.uploadedBy,
                    classification: input.classification || 'INTERNAL',
                    scanStatus,
                },
            });
        } catch (error) {
            await store.deleteObject(storageKey);
            throw error;
        }

        await recordAudit({
            organizationId: input.organizationId,
            actorUserId: input.uploadedBy,
            action: 'evidence.upload',
            resourceType: 'StoredObject',
            resourceId: stored.id,
            result: 'success',
            requestId: input.requestId,
            metadata: { filename: safeName, size: input.buffer.length, scanStatus },
        });

        if (scanStatus === ScanStatus.PENDING) {
            const nextStatus = await malwareScanService.scanStoredObject({
                id: stored.id,
                organizationId: input.organizationId,
                uploadedBy: input.uploadedBy,
                filename: safeName,
                buffer: input.buffer,
            });
            return { ...stored, scanStatus: nextStatus };
        }

        return stored;
    },

    async getForDownload(id: string, organizationId: string, actorUserId: string) {
        const stored = await prisma.storedObject.findFirst({
            where: { id, organizationId, deletedAt: null },
        });
        if (!stored) {
            throw new ApiError(404, 'Document not found');
        }
        assertDownloadable(stored.scanStatus);
        const store = provider();
        const buffer = await store.getObject(stored.storageKey);
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'evidence.download',
            resourceType: 'StoredObject',
            resourceId: stored.id,
            result: 'success',
            metadata: { scanStatus: stored.scanStatus },
        });
        return { stored, buffer };
    },

    async remove(id: string, organizationId: string, actorUserId: string) {
        const stored = await prisma.storedObject.findFirst({
            where: { id, organizationId, deletedAt: null },
        });
        if (!stored) {
            throw new ApiError(404, 'Document not found');
        }
        const store = provider();
        await store.deleteObject(stored.storageKey);
        await prisma.storedObject.update({
            where: { id: stored.id },
            data: { deletedAt: new Date(), retentionStatus: 'DELETED' },
        });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'evidence.delete',
            resourceType: 'StoredObject',
            resourceId: stored.id,
            result: 'success',
        });
        return { deleted: true };
    },

    async reconcileOrphans(organizationId?: string) {
        const store = provider();
        const prefix = organizationId ? `${organizationId}/` : '';
        const keys = store.listKeys ? await store.listKeys(prefix) : [];
        const rows = await prisma.storedObject.findMany({
            where: {
                deletedAt: null,
                ...(organizationId ? { organizationId } : {}),
            },
            select: { storageKey: true },
        });
        const known = new Set(rows.map((row) => row.storageKey));
        const orphans = keys.filter((key) => !known.has(key));
        for (const key of orphans) {
            await store.deleteObject(key);
            await recordAudit({
                organizationId: organizationId || key.split('/')[0],
                action: 'evidence.orphan_reconciled',
                resourceType: 'StoredObject',
                resourceId: key,
                result: 'success',
                metadata: { storageKey: key },
            });
        }
        return { scanned: keys.length, orphansRemoved: orphans.length };
    },
};
