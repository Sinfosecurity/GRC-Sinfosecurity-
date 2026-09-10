import crypto from 'crypto';
import { ScanStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { isProviderConfigured } from '../config/env';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from './auditEventService';
import { LocalStorageProvider } from '../storage/localStorageProvider';
import { S3StorageProvider } from '../storage/s3StorageProvider';
import { ALLOWED_CONTENT_TYPES, MAX_UPLOAD_BYTES, ObjectStorageProvider, sanitizeFilename } from '../storage/types';

function malwareScanStatus(): ScanStatus {
    if (isProviderConfigured('MALWARE_SCAN_PROVIDER') || isProviderConfigured('CLAMAV_HOST')) {
        return ScanStatus.PENDING;
    }
    return ScanStatus.NOT_CONFIGURED;
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
        if (input.buffer.length > MAX_UPLOAD_BYTES) {
            throw new ApiError(422, 'File exceeds maximum allowed size');
        }
        if (!ALLOWED_CONTENT_TYPES.has(input.contentType)) {
            throw new ApiError(422, 'Content type is not allowed');
        }

        const safeName = sanitizeFilename(input.filename);
        const storageKey = `${input.organizationId}/${input.ownerType}/${input.ownerId}/${crypto.randomUUID()}-${safeName}`;
        const checksum = crypto.createHash('sha256').update(input.buffer).digest('hex');
        const store = provider();
        await store.putObject(storageKey, input.buffer, input.contentType);
        const scanStatus = malwareScanStatus();

        const stored = await prisma.storedObject.create({
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

        return stored;
    },

    async getForDownload(id: string, organizationId: string, actorUserId: string) {
        const stored = await prisma.storedObject.findFirst({
            where: { id, organizationId, deletedAt: null },
        });
        if (!stored) {
            throw new ApiError(404, 'Document not found');
        }
        if (stored.scanStatus === ScanStatus.INFECTED) {
            throw new ApiError(403, 'Download blocked: file marked infected');
        }
        const store = provider();
        const buffer = await store.getObject(stored.storageKey);
        await prisma.storedObject.update({
            where: { id: stored.id },
            data: {},
        });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'evidence.download',
            resourceType: 'StoredObject',
            resourceId: stored.id,
            result: 'success',
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
};
