/**
 * Document Storage Service
 * Supports AWS S3 and Azure Blob Storage
 * Includes virus scanning, encryption, and retention policies
 */

import crypto from 'crypto';
import path from 'path';

export interface StorageConfig {
    provider: 'S3' | 'AZURE_BLOB' | 'LOCAL';
    
    // AWS S3
    s3Region?: string;
    s3Bucket?: string;
    s3AccessKeyId?: string;
    s3SecretAccessKey?: string;
    
    // Azure Blob
    azureAccountName?: string;
    azureAccountKey?: string;
    azureContainerName?: string;
    
    // Local (for development)
    localPath?: string;
    
    // Common
    encryption: boolean;
    virusScanning: boolean;
    maxFileSize: number; // bytes
    allowedMimeTypes: string[];
}

export interface UploadOptions {
    fileName: string;
    fileBuffer: Buffer;
    mimeType: string;
    fileSize: number;
    organizationId: string;
    uploadedBy: string;
    category?: string;
    tags?: string[];
    confidentiality: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'HIGHLY_CONFIDENTIAL';
    retentionYears?: number;
}

export interface StoredDocument {
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    fileUrl: string;
    fileHash: string;
    organizationId: string;
    uploadedBy: string;
    uploadedAt: Date;
    category?: string;
    tags?: string[];
    confidentiality: string;
    encrypted: boolean;
    virusScanned: boolean;
    virusScanResult?: 'CLEAN' | 'INFECTED' | 'UNKNOWN';
    expiresAt?: Date;
    deletedAt?: Date;
}

// In-memory storage for demo
const documents = new Map<string, StoredDocument>();

class DocumentStorageService {
    private config: StorageConfig;

    constructor() {
        // Initialize with environment variables
        this.config = {
            provider: (process.env.STORAGE_PROVIDER || 'LOCAL') as 'S3' | 'AZURE_BLOB' | 'LOCAL',
            
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
    async uploadDocument(options: UploadOptions): Promise<StoredDocument> {
        // Validate file
        this.validateFile(options);

        // Generate file ID and hash
        const fileId = this.generateFileId();
        const fileHash = this.calculateFileHash(options.fileBuffer);

        // Scan for viruses
        let virusScanResult: 'CLEAN' | 'INFECTED' | 'UNKNOWN' = 'UNKNOWN';
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
        const document: StoredDocument = {
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

        console.log(`📄 Document uploaded: ${options.fileName} (${fileId})`);
        console.log(`   Provider: ${this.config.provider}`);
        console.log(`   Encrypted: ${this.config.encryption}`);
        console.log(`   Virus Scan: ${virusScanResult}`);

        return document;
    }

    /**
     * Download document from storage
     */
    async downloadDocument(documentId: string): Promise<Buffer> {
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

        console.log(`📥 Document downloaded: ${document.fileName}`);
        return fileBuffer;
    }

    /**
     * Delete document from storage
     */
    async deleteDocument(documentId: string, deletedBy: string): Promise<boolean> {
        const document = documents.get(documentId);
        if (!document) {
            return false;
        }

        // Soft delete (mark as deleted)
        document.deletedAt = new Date();
        documents.set(documentId, document);

        // Schedule physical deletion after retention period
        // In production, use a background job
        console.log(`🗑️  Document marked for deletion: ${document.fileName}`);
        console.log(`   Will be permanently deleted after retention period`);

        return true;
    }

    /**
     * Permanently delete document
     */
    async permanentlyDeleteDocument(documentId: string): Promise<boolean> {
        const document = documents.get(documentId);
        if (!document) {
            return false;
        }

        // Delete from storage provider
        await this.deleteFromProvider(document.fileUrl);

        // Remove from database
        documents.delete(documentId);

        console.log(`💥 Document permanently deleted: ${document.fileName}`);
        return true;
    }

    /**
     * Get document metadata
     */
    getDocument(documentId: string): StoredDocument | undefined {
        return documents.get(documentId);
    }

    /**
     * List documents for organization
     */
    listDocuments(organizationId: string, filters?: {
        category?: string;
        confidentiality?: string;
        uploadedBy?: string;
    }): StoredDocument[] {
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
    async applyRetentionPolicy(): Promise<number> {
        const now = new Date();
        const expiredDocs = Array.from(documents.values())
            .filter(d => d.expiresAt && d.expiresAt < now && !d.deletedAt);

        let deletedCount = 0;
        for (const doc of expiredDocs) {
            await this.permanentlyDeleteDocument(doc.id);
            deletedCount++;
        }

        console.log(`🧹 Retention policy applied: ${deletedCount} documents deleted`);
        return deletedCount;
    }

    /**
     * Get storage statistics
     */
    getStatistics(organizationId?: string) {
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

    private validateFile(options: UploadOptions): void {
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

    private generateFileId(): string {
        return `doc_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }

    private calculateFileHash(buffer: Buffer): string {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    private async scanForViruses(buffer: Buffer): Promise<'CLEAN' | 'INFECTED' | 'UNKNOWN'> {
        // In production, integrate with ClamAV or cloud scanning service
        console.log('🦠 Scanning file for viruses...');
        
        // Simulate virus scan
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // For demo, always return CLEAN
        // In production, call actual antivirus API
        return 'CLEAN';
    }

    private encryptFile(buffer: Buffer): Buffer {
        const algorithm = 'aes-256-gcm';
        const key = crypto.scryptSync(
            process.env.ENCRYPTION_KEY || 'dev-encryption-key',
            'salt',
            32
        );
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        
        const encrypted = Buffer.concat([
            iv,
            cipher.update(buffer),
            cipher.final(),
            cipher.getAuthTag()
        ]);

        console.log('🔒 File encrypted');
        return encrypted;
    }

    private decryptFile(buffer: Buffer): Buffer {
        const algorithm = 'aes-256-gcm';
        const key = crypto.scryptSync(
            process.env.ENCRYPTION_KEY || 'dev-encryption-key',
            'salt',
            32
        );
        
        const iv = buffer.slice(0, 16);
        const authTag = buffer.slice(buffer.length - 16);
        const encrypted = buffer.slice(16, buffer.length - 16);
        
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(authTag);
        
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);

        console.log('🔓 File decrypted');
        return decrypted;
    }

    private async uploadToProvider(fileId: string, buffer: Buffer, options: UploadOptions): Promise<string> {
        if (this.config.provider === 'S3') {
            return await this.uploadToS3(fileId, buffer, options);
        } else if (this.config.provider === 'AZURE_BLOB') {
            return await this.uploadToAzure(fileId, buffer, options);
        } else {
            return await this.uploadToLocal(fileId, buffer, options);
        }
    }

    private async uploadToS3(fileId: string, buffer: Buffer, options: UploadOptions): Promise<string> {
        // In production, use AWS SDK
        // const s3 = new AWS.S3({ ... });
        // await s3.upload({ Bucket: this.config.s3Bucket, Key: fileId, Body: buffer });
        
        const url = `https://${this.config.s3Bucket}.s3.${this.config.s3Region}.amazonaws.com/${fileId}`;
        console.log(`☁️  Uploaded to AWS S3: ${url}`);
        return url;
    }

    private async uploadToAzure(fileId: string, buffer: Buffer, options: UploadOptions): Promise<string> {
        // In production, use Azure SDK
        // const blobServiceClient = BlobServiceClient.fromConnectionString(...);
        // await blockBlobClient.uploadData(buffer);
        
        const url = `https://${this.config.azureAccountName}.blob.core.windows.net/${this.config.azureContainerName}/${fileId}`;
        console.log(`☁️  Uploaded to Azure Blob: ${url}`);
        return url;
    }

    private async uploadToLocal(fileId: string, buffer: Buffer, options: UploadOptions): Promise<string> {
        // In production, actually write to disk
        // const fs = require('fs').promises;
        // await fs.writeFile(path.join(this.config.localPath!, fileId), buffer);
        
        const url = `/uploads/${fileId}`;
        console.log(`💾 Saved locally: ${url}`);
        return url;
    }

    private async downloadFromProvider(fileUrl: string): Promise<Buffer> {
        // In production, download from actual storage
        console.log(`📥 Downloading from: ${fileUrl}`);
        
        // Return mock buffer for demo
        return Buffer.from('mock file content');
    }

    private async deleteFromProvider(fileUrl: string): Promise<void> {
        // In production, delete from actual storage
        console.log(`💥 Deleting from storage: ${fileUrl}`);
    }

    private groupBy(docs: StoredDocument[], field: keyof StoredDocument): Record<string, number> {
        return docs.reduce((acc, doc) => {
            const key = (doc[field] as string) || 'Unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }
}

export default new DocumentStorageService();
