/**
import logger from '../config/logger';
 * Document Storage Service
 * Supports AWS S3 and Azure Blob Storage
 * Includes virus scanning, encryption, and retention policies
 */
export interface StorageConfig {
    provider: 'S3' | 'AZURE_BLOB' | 'LOCAL';
    s3Region?: string;
    s3Bucket?: string;
    s3AccessKeyId?: string;
    s3SecretAccessKey?: string;
    azureAccountName?: string;
    azureAccountKey?: string;
    azureContainerName?: string;
    localPath?: string;
    encryption: boolean;
    virusScanning: boolean;
    maxFileSize: number;
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
declare class DocumentStorageService {
    private config;
    constructor();
    /**
     * Upload document to storage
     */
    uploadDocument(options: UploadOptions): Promise<StoredDocument>;
    /**
     * Download document from storage
     */
    downloadDocument(documentId: string): Promise<Buffer>;
    /**
     * Delete document from storage
     */
    deleteDocument(documentId: string, deletedBy: string): Promise<boolean>;
    /**
     * Permanently delete document
     */
    permanentlyDeleteDocument(documentId: string): Promise<boolean>;
    /**
     * Get document metadata
     */
    getDocument(documentId: string): StoredDocument | undefined;
    /**
     * List documents for organization
     */
    listDocuments(organizationId: string, filters?: {
        category?: string;
        confidentiality?: string;
        uploadedBy?: string;
    }): StoredDocument[];
    /**
     * Apply retention policy (delete expired documents)
     */
    applyRetentionPolicy(): Promise<number>;
    /**
     * Get storage statistics
     */
    getStatistics(organizationId?: string): {
        totalDocuments: number;
        activeDocuments: number;
        deletedDocuments: number;
        totalSize: number;
        totalSizeGB: string;
        byCategory: Record<string, number>;
        byConfidentiality: Record<string, number>;
        encrypted: number;
        virusScanned: number;
    };
    private validateFile;
    private generateFileId;
    private calculateFileHash;
    private scanForViruses;
    private encryptFile;
    private decryptFile;
    private uploadToProvider;
    private uploadToS3;
    private uploadToAzure;
    private uploadToLocal;
    private downloadFromProvider;
    private deleteFromProvider;
    private groupBy;
}
declare const _default: DocumentStorageService;
export default _default;
//# sourceMappingURL=documentStorageService.d.ts.map