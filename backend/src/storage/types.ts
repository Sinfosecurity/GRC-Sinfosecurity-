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

export const ALLOWED_CONTENT_TYPES = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv',
    'text/plain',
    'image/png',
    'image/jpeg',
]);

export const MAX_UPLOAD_BYTES = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10);

export function sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'file';
}
