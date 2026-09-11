import { LocalStorageProvider } from '../storage/localStorageProvider';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

describe('object storage orphan listing', () => {
    it('lists keys written to local staging storage', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'supreme-orphan-'));
        const store = new LocalStorageProvider(root);
        await store.putObject('org-a/vendor/1/file.txt', Buffer.from('hello'), 'text/plain');
        await store.putObject('org-b/vendor/1/other.txt', Buffer.from('world'), 'text/plain');
        const all = await store.listKeys();
        const orgA = await store.listKeys('org-a/');
        expect(all).toHaveLength(2);
        expect(orgA).toEqual(['org-a/vendor/1/file.txt']);
        await store.deleteObject('org-a/vendor/1/file.txt');
        expect(await store.listKeys('org-a/')).toEqual([]);
    });
});
