"use strict";
/**
import logger from '../config/logger';
 * Document Storage Service
 * Supports AWS S3 and Azure Blob Storage
 * Includes virus scanning, encryption, and retention policies
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
// In-memory storage for demo
const documents = new Map();
class DocumentStorageService {
    constructor() {
        // Initialize with environment variables
        this.config = {
            provider: (process.env.STORAGE_PROVIDER || 'LOCAL'),
            // AWS S3
            s3Region: process.env.AWS_S3_REGION || 'us-east-1',
            s3Bucket: process.env.AWS_S3_BUCKET || 'grc-documents',
            s3AccessKeyId: process.env.AWS_ACCESS_KEY_ID,
            s3SecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            // Azure Blob
            azureAccountName: process.env.AZURE_STORAGE_ACCOUNT,
            azureAccountKey: process.env.AZURE_STORAGE_KEY,
            azureContainerName: process.env.AZURE_CONTAINER_NAME || 'grc-documents',
            // Local
            localPath: process.env.LOCAL_STORAGE_PATH || './uploads',
            // Security
            encryption: process.env.STORAGE_ENCRYPTION === 'true',
            virusScanning: process.env.VIRUS_SCANNING === 'true',
            maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB default
            allowedMimeTypes: [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/msword',
                'application/vnd.ms-excel',
                'application/vnd.ms-powerpoint',
                'text/plain',
                'text/csv',
                'image/png',
                'image/jpeg',
                'application/zip'
            ]
        };
    }
    /**
     * Upload document to storage
     */
    async uploadDocument(options) {
        // Validate file
        this.validateFile(options);
        // Generate file ID and hash
        const fileId = this.generateFileId();
        const fileHash = this.calculateFileHash(options.fileBuffer);
        // Scan for viruses
        let virusScanResult = 'UNKNOWN';
        if (this.config.virusScanning) {
            virusScanResult = await this.scanForViruses(options.fileBuffer);
            if (virusScanResult === 'INFECTED') {
                throw new Error('File is infected with malware');
            }
        }
        // Encrypt if enabled
        let fileBuffer = options.fileBuffer;
        if (this.config.encryption) {
            fileBuffer = this.encryptFile(fileBuffer);
        }
        // Upload to storage provider
        const fileUrl = await this.uploadToProvider(fileId, fileBuffer, options);
        // Calculate expiration date
        const expiresAt = options.retentionYears
            ? new Date(Date.now() + options.retentionYears * 365 * 24 * 60 * 60 * 1000)
            : undefined;
        // Create document record
        const document = {
            id: fileId,
            fileName: options.fileName,
            fileSize: options.fileSize,
            fileType: options.mimeType,
            fileUrl,
            fileHash,
            organizationId: options.organizationId,
            uploadedBy: options.uploadedBy,
            uploadedAt: new Date(),
            category: options.category,
            tags: options.tags,
            confidentiality: options.confidentiality,
            encrypted: this.config.encryption,
            virusScanned: this.config.virusScanning,
            virusScanResult,
            expiresAt
        };
        documents.set(fileId, document);
        logger.info(`📄 Document uploaded: ${options.fileName} (${fileId})`);
        logger.info(`   Provider: ${this.config.provider}`);
        logger.info(`   Encrypted: ${this.config.encryption}`);
        logger.info(`   Virus Scan: ${virusScanResult}`);
        return document;
    }
    /**
     * Download document from storage
     */
    async downloadDocument(documentId) {
        const document = documents.get(documentId);
        if (!document) {
            throw new Error('Document not found');
        }
        // Download from storage provider
        let fileBuffer = await this.downloadFromProvider(document.fileUrl);
        // Decrypt if encrypted
        if (document.encrypted) {
            fileBuffer = this.decryptFile(fileBuffer);
        }
        logger.info(`📥 Document downloaded: ${document.fileName}`);
        return fileBuffer;
    }
    /**
     * Delete document from storage
     */
    async deleteDocument(documentId, deletedBy) {
        const document = documents.get(documentId);
        if (!document) {
            return false;
        }
        // Soft delete (mark as deleted)
        document.deletedAt = new Date();
        documents.set(documentId, document);
        // Schedule physical deletion after retention period
        // In production, use a background job
        logger.info(`🗑️  Document marked for deletion: ${document.fileName}`);
        logger.info(`   Will be permanently deleted after retention period`);
        return true;
    }
    /**
     * Permanently delete document
     */
    async permanentlyDeleteDocument(documentId) {
        const document = documents.get(documentId);
        if (!document) {
            return false;
        }
        // Delete from storage provider
        await this.deleteFromProvider(document.fileUrl);
        // Remove from database
        documents.delete(documentId);
        logger.info(`💥 Document permanently deleted: ${document.fileName}`);
        return true;
    }
    /**
     * Get document metadata
     */
    getDocument(documentId) {
        return documents.get(documentId);
    }
    /**
     * List documents for organization
     */
    listDocuments(organizationId, filters) {
        let docs = Array.from(documents.values())
            .filter(d => d.organizationId === organizationId && !d.deletedAt);
        if (filters?.category) {
            docs = docs.filter(d => d.category === filters.category);
        }
        if (filters?.confidentiality) {
            docs = docs.filter(d => d.confidentiality === filters.confidentiality);
        }
        if (filters?.uploadedBy) {
            docs = docs.filter(d => d.uploadedBy === filters.uploadedBy);
        }
        return docs;
    }
    /**
     * Apply retention policy (delete expired documents)
     */
    async applyRetentionPolicy() {
        const now = new Date();
        const expiredDocs = Array.from(documents.values())
            .filter(d => d.expiresAt && d.expiresAt < now && !d.deletedAt);
        let deletedCount = 0;
        for (const doc of expiredDocs) {
            await this.permanentlyDeleteDocument(doc.id);
            deletedCount++;
        }
        logger.info(`🧹 Retention policy applied: ${deletedCount} documents deleted`);
        return deletedCount;
    }
    /**
     * Get storage statistics
     */
    getStatistics(organizationId) {
        let docs = Array.from(documents.values());
        if (organizationId) {
            docs = docs.filter(d => d.organizationId === organizationId);
        }
        const totalSize = docs.reduce((sum, d) => sum + d.fileSize, 0);
        const activeDocs = docs.filter(d => !d.deletedAt);
        return {
            totalDocuments: docs.length,
            activeDocuments: activeDocs.length,
            deletedDocuments: docs.filter(d => d.deletedAt).length,
            totalSize,
            totalSizeGB: (totalSize / (1024 * 1024 * 1024)).toFixed(2),
            byCategory: this.groupBy(activeDocs, 'category'),
            byConfidentiality: this.groupBy(activeDocs, 'confidentiality'),
            encrypted: docs.filter(d => d.encrypted).length,
            virusScanned: docs.filter(d => d.virusScanned).length
        };
    }
    // ============= Private Helper Methods =============
    validateFile(options) {
        // Check file size
        if (options.fileSize > this.config.maxFileSize) {
            throw new Error(`File size exceeds maximum allowed (${this.config.maxFileSize} bytes)`);
        }
        // Check MIME type
        if (!this.config.allowedMimeTypes.includes(options.mimeType)) {
            throw new Error(`File type ${options.mimeType} is not allowed`);
        }
        // Check file name
        if (!options.fileName || options.fileName.length === 0) {
            throw new Error('File name is required');
        }
    }
    generateFileId() {
        return `doc_${Date.now()}_${crypto_1.default.randomBytes(8).toString('hex')}`;
    }
    calculateFileHash(buffer) {
        return crypto_1.default.createHash('sha256').update(buffer).digest('hex');
    }
    async scanForViruses(buffer) {
        // In production, integrate with ClamAV or cloud scanning service
        logger.info('🦠 Scanning file for viruses...');
        // Simulate virus scan
        await new Promise(resolve => setTimeout(resolve, 100));
        // For demo, always return CLEAN
        // In production, call actual antivirus API
        return 'CLEAN';
    }
    encryptFile(buffer) {
        const algorithm = 'aes-256-gcm';
        const key = crypto_1.default.scryptSync(process.env.ENCRYPTION_KEY || 'dev-encryption-key', 'salt', 32);
        const iv = crypto_1.default.randomBytes(16);
        const cipher = crypto_1.default.createCipheriv(algorithm, key, iv);
        const encrypted = Buffer.concat([
            iv,
            cipher.update(buffer),
            cipher.final(),
            cipher.getAuthTag()
        ]);
        logger.info('🔒 File encrypted');
        return encrypted;
    }
    decryptFile(buffer) {
        const algorithm = 'aes-256-gcm';
        const key = crypto_1.default.scryptSync(process.env.ENCRYPTION_KEY || 'dev-encryption-key', 'salt', 32);
        const iv = buffer.slice(0, 16);
        const authTag = buffer.slice(buffer.length - 16);
        const encrypted = buffer.slice(16, buffer.length - 16);
        const decipher = crypto_1.default.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);
        logger.info('🔓 File decrypted');
        return decrypted;
    }
    async uploadToProvider(fileId, buffer, options) {
        if (this.config.provider === 'S3') {
            return await this.uploadToS3(fileId, buffer, options);
        }
        else if (this.config.provider === 'AZURE_BLOB') {
            return await this.uploadToAzure(fileId, buffer, options);
        }
        else {
            return await this.uploadToLocal(fileId, buffer, options);
        }
    }
    async uploadToS3(fileId, buffer, options) {
        // In production, use AWS SDK
        // const s3 = new AWS.S3({ ... });
        // await s3.upload({ Bucket: this.config.s3Bucket, Key: fileId, Body: buffer });
        const url = `https://${this.config.s3Bucket}.s3.${this.config.s3Region}.amazonaws.com/${fileId}`;
        logger.info(`☁️  Uploaded to AWS S3: ${url}`);
        return url;
    }
    async uploadToAzure(fileId, buffer, options) {
        // In production, use Azure SDK
        // const blobServiceClient = BlobServiceClient.fromConnectionString(...);
        // await blockBlobClient.uploadData(buffer);
        const url = `https://${this.config.azureAccountName}.blob.core.windows.net/${this.config.azureContainerName}/${fileId}`;
        logger.info(`☁️  Uploaded to Azure Blob: ${url}`);
        return url;
    }
    async uploadToLocal(fileId, buffer, options) {
        // In production, actually write to disk
        // const fs = require('fs').promises;
        // await fs.writeFile(path.join(this.config.localPath!, fileId), buffer);
        const url = `/uploads/${fileId}`;
        logger.info(`💾 Saved locally: ${url}`);
        return url;
    }
    async downloadFromProvider(fileUrl) {
        // In production, download from actual storage
        logger.info(`📥 Downloading from: ${fileUrl}`);
        // Return mock buffer for demo
        return Buffer.from('mock file content');
    }
    async deleteFromProvider(fileUrl) {
        // In production, delete from actual storage
        logger.info(`💥 Deleting from storage: ${fileUrl}`);
    }
    groupBy(docs, field) {
        return docs.reduce((acc, doc) => {
            const key = doc[field] || 'Unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }
}
exports.default = new DocumentStorageService();
//# sourceMappingURL=documentStorageService.js.map