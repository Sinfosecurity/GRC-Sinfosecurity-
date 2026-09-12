export type ScanStatus = 'PENDING' | 'CLEAN' | 'INFECTED' | 'FAILED' | 'NOT_CONFIGURED';

export type StoredObjectMeta = {
    storageKey: string;
    size: number;
    contentType: string;
    checksum: string;
};

export interface ObjectStorageProvider {
    readonly name: string;
    isConfigured(): boolean;
    putObject(key: string, body: Buffer, contentType: string): Promise<StoredObjectMeta>;
    getObject(key: string): Promise<Buffer>;
    deleteObject(key: string): Promise<void>;
    getDownloadUrl?(key: string, filename: string): Promise<string | null>;
    listKeys?(prefix?: string): Promise<string[]>;
}

export {
    ALLOWED_CONTENT_TYPES,
    MAX_UPLOAD_BYTES,
    sanitizeFilename,
} from '../malware/filePolicy';
