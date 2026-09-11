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

    async listKeys(prefix = ''): Promise<string[]> {
        const keys: string[] = [];
        const walk = async (dir: string, relative: string) => {
            const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
            for (const entry of entries) {
                const nextRel = relative ? `${relative}/${entry.name}` : entry.name;
                if (entry.isDirectory()) {
                    await walk(path.join(dir, entry.name), nextRel);
                } else if (nextRel.startsWith(prefix)) {
                    keys.push(nextRel);
                }
            }
        };
        await walk(this.root, '');
        return keys;
    }
}
