import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type ObjectManifestEntry = {
    key: string;
    size: number;
    checksum: string;
    contentType?: string;
};

export function sha256(buffer: Buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function walkObjectRoot(root: string): ObjectManifestEntry[] {
    if (!fs.existsSync(root)) return [];
    const entries: ObjectManifestEntry[] = [];
    const visit = (dir: string, relative: string) => {
        for (const name of fs.readdirSync(dir)) {
            const full = path.join(dir, name);
            const rel = relative ? `${relative}/${name}` : name;
            if (fs.statSync(full).isDirectory()) {
                visit(full, rel);
            } else {
                const body = fs.readFileSync(full);
                entries.push({
                    key: rel,
                    size: body.length,
                    checksum: sha256(body),
                });
            }
        }
    };
    visit(root, '');
    return entries.sort((a, b) => a.key.localeCompare(b.key));
}

export function backupObjects(sourceRoot: string, destinationRoot: string): ObjectManifestEntry[] {
    fs.mkdirSync(destinationRoot, { recursive: true });
    const entries = walkObjectRoot(sourceRoot);
    for (const entry of entries) {
        const from = path.join(sourceRoot, entry.key);
        const to = path.join(destinationRoot, entry.key);
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(from, to);
        const copied = fs.readFileSync(to);
        if (sha256(copied) !== entry.checksum) {
            throw new Error(`Object backup checksum mismatch for ${entry.key}`);
        }
    }
    fs.writeFileSync(path.join(destinationRoot, '_object-manifest.json'), JSON.stringify(entries, null, 2));
    return entries;
}

export function restoreObjects(backupRoot: string, targetRoot: string): ObjectManifestEntry[] {
    const manifestPath = path.join(backupRoot, '_object-manifest.json');
    const entries: ObjectManifestEntry[] = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    fs.mkdirSync(targetRoot, { recursive: true });
    for (const entry of entries) {
        const from = path.join(backupRoot, entry.key);
        const to = path.join(targetRoot, entry.key);
        if (!fs.existsSync(from)) {
            throw new Error(`Missing backup object ${entry.key}`);
        }
        const body = fs.readFileSync(from);
        if (sha256(body) !== entry.checksum || body.length !== entry.size) {
            throw new Error(`Corrupt backup object ${entry.key}`);
        }
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.writeFileSync(to, body);
    }
    return entries;
}

export function verifyRestoredObjects(
    expected: Array<{ storageKey: string; checksum: string; size: number }>,
    targetRoot: string
) {
    return expected.map((item) => {
        const full = path.join(targetRoot, item.storageKey);
        if (!fs.existsSync(full)) {
            return { key: item.storageKey, result: 'FAIL' as const, reason: 'missing-object' };
        }
        const body = fs.readFileSync(full);
        if (sha256(body) !== item.checksum || body.length !== item.size) {
            return { key: item.storageKey, result: 'FAIL' as const, reason: 'checksum-mismatch' };
        }
        return { key: item.storageKey, result: 'PASS' as const, reason: 'matched' };
    });
}
