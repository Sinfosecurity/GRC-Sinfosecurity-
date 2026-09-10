import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { ObjectStorageProvider, StoredObjectMeta } from './types';

export class LocalStorageProvider implements ObjectStorageProvider {
    readonly name = 'local';
    private root: string;

    constructor(root = process.env.UPLOAD_DIR || './uploads') {
        this.root = path.resolve(root);
    }

    isConfigured(): boolean {
        return true;
    }

    async putObject(key: string, body: Buffer, contentType: string): Promise<StoredObjectMeta> {
        const full = path.join(this.root, key);
        await fs.mkdir(path.dirname(full), { recursive: true });
        await fs.writeFile(full, body);
        return {
            storageKey: key,
            size: body.length,
            contentType,
            checksum: crypto.createHash('sha256').update(body).digest('hex'),
        };
    }

    async getObject(key: string): Promise<Buffer> {
        return fs.readFile(path.join(this.root, key));
    }

    async deleteObject(key: string): Promise<void> {
        await fs.unlink(path.join(this.root, key)).catch(() => undefined);
    }
}
