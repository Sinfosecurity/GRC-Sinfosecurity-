import fs from 'fs';
import os from 'os';
import path from 'path';
import { ScanStatus } from '@prisma/client';
import {
    assertDistinctSourceAndTarget,
    assertIsolatedRestoreTarget,
    assertObjectNamespaceIsolated,
    databaseIdentity,
} from '../recovery/guards';
import { backupObjects, restoreObjects, sha256, verifyRestoredObjects } from '../recovery/objects';
import {
    AUTHORITATIVE_TABLES,
    compareRecoveryManifests,
    manifestPassed,
    type RecoveryManifest,
} from '../recovery/manifest';
import { verifyMalwarePolicy } from '../recovery/postRestore';
import { evaluateScanDownloadPolicy } from '../services/objectStorageService';

function manifest(partial: Partial<RecoveryManifest> = {}): RecoveryManifest {
    const counts = Object.fromEntries(AUTHORITATIVE_TABLES.map((table) => [table, 1]));
    return {
        runId: 'cert-test',
        timestamp: '2026-09-12T00:00:00.000Z',
        sourceEnvironment: 'test',
        sourceSha: 'abc',
        migration: ['20260910120000_supreme_risk_saas_foundation'],
        counts,
        tenants: [
            { id: 'org-a', name: 'RECOVERY ORG A', plan: 'PROFESSIONAL', subscriptionStatus: 'active', users: [], vendors: ['v-a'], assessments: ['as-a'], findings: ['f-a'], briefs: ['b-a'] },
            { id: 'org-b', name: 'RECOVERY ORG B', plan: 'STARTER', subscriptionStatus: 'active', users: [], vendors: ['v-b'], assessments: ['as-b'], findings: ['f-b'], briefs: ['b-b'] },
        ],
        evidence: [
            {
                id: 'obj-1',
                organizationId: 'org-a',
                storageKey: 'org-a/clean.pdf',
                size: 12,
                contentType: 'application/pdf',
                checksum: 'aa',
                scanStatus: ScanStatus.CLEAN,
            },
        ],
        risk: [
            {
                vendorId: 'v-a',
                organizationId: 'org-a',
                inherentRiskScore: 80,
                residualRiskScore: 64,
                decision: 'RISK_ACCEPTED',
                residualUnchangedByAcceptance: true,
            },
        ],
        invariants: [{ id: 'two-tenants', ok: true, detail: 'ok' }],
        ...partial,
    };
}

describe('restore target guards', () => {
    const confirm = { RECOVERY_CONFIRM: 'ISOLATED_CERTIFICATION_ONLY' };

    it('accepts an isolated local recovery database', () => {
        const identity = assertIsolatedRestoreTarget(
            'postgresql://supreme_staging:supreme_staging@127.0.0.1:55434/supreme_risk_recovery_target',
            confirm
        );
        expect(identity.database).toBe('supreme_risk_recovery_target');
    });

    it('refuses live staging and production names', () => {
        expect(() =>
            assertIsolatedRestoreTarget('postgresql://u:p@127.0.0.1:55434/supreme_risk_staging', confirm)
        ).toThrow(/live staging or production/);
        expect(() =>
            assertIsolatedRestoreTarget('postgresql://u:p@127.0.0.1:5432/production', confirm)
        ).toThrow(/live staging or production/);
    });

    it('refuses hosted hosts and missing confirmation', () => {
        expect(() =>
            assertIsolatedRestoreTarget(
                'postgresql://u:p@127.0.0.1:55434/supreme_risk_recovery_target',
                {}
            )
        ).toThrow(/RECOVERY_CONFIRM/);
        expect(() =>
            assertIsolatedRestoreTarget(
                'postgresql://u:p@dpg-example.onrender.com:5432/supreme_risk_recovery_target',
                confirm
            )
        ).toThrow(/local isolated target/);
    });

    it('refuses same source and target and live object namespaces', () => {
        const url = 'postgresql://u:p@127.0.0.1:55434/supreme_risk_recovery_target';
        expect(() => assertDistinctSourceAndTarget(url, url)).toThrow(/same/);
        expect(() => assertObjectNamespaceIsolated('/tmp/a', '/tmp/a')).toThrow(/differ/);
        expect(() => assertObjectNamespaceIsolated('/data/staging-objects', '/var/supreme-risk-staging')).toThrow(
            /live staging/
        );
        expect(databaseIdentity(url).database).toBe('supreme_risk_recovery_target');
    });
});

describe('object backup restore and corruption detection', () => {
    it('backs up, restores, and verifies checksums', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'supreme-recovery-'));
        const source = path.join(root, 'source');
        const backup = path.join(root, 'backup');
        const restore = path.join(root, 'restore');
        fs.mkdirSync(path.join(source, 'org-a'), { recursive: true });
        const body = Buffer.from('supreme-recovery-object');
        fs.writeFileSync(path.join(source, 'org-a', 'clean.pdf'), body);
        const entries = backupObjects(source, backup);
        expect(entries).toHaveLength(1);
        expect(entries[0].checksum).toBe(sha256(body));
        restoreObjects(backup, restore);
        const checks = verifyRestoredObjects(
            [{ storageKey: 'org-a/clean.pdf', checksum: sha256(body), size: body.length }],
            restore
        );
        expect(checks.every((item) => item.result === 'PASS')).toBe(true);
    });

    it('fails when an object is missing or checksum is wrong', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'supreme-recovery-neg-'));
        fs.mkdirSync(path.join(root, 'org-a'), { recursive: true });
        fs.writeFileSync(path.join(root, 'org-a', 'clean.pdf'), Buffer.from('present'));
        const missing = verifyRestoredObjects(
            [{ storageKey: 'org-a/gone.pdf', checksum: 'abc', size: 3 }],
            root
        );
        expect(missing[0]).toMatchObject({ result: 'FAIL', reason: 'missing-object' });
        const bad = verifyRestoredObjects(
            [{ storageKey: 'org-a/clean.pdf', checksum: '0'.repeat(64), size: 7 }],
            root
        );
        expect(bad[0]).toMatchObject({ result: 'FAIL', reason: 'checksum-mismatch' });
    });
});

describe('recovery manifest reconciliation', () => {
    it('passes identical manifests and fails count drift', () => {
        const expected = manifest();
        expect(manifestPassed(compareRecoveryManifests(expected, structuredClone(expected)))).toBe(true);
        const drifted = manifest({ counts: { ...expected.counts, Vendor: 99 } });
        const diffs = compareRecoveryManifests(expected, drifted);
        const vendor = diffs.find((item) => item.category === 'count.Vendor');
        expect(vendor?.result).toBe('FAIL');
        expect(manifestPassed(diffs)).toBe(false);
    });

    it('detects tenant and evidence checksum drift', () => {
        const expected = manifest();
        const actual = manifest({
            tenants: expected.tenants.map((tenant, index) => (index === 1 ? { ...tenant, id: 'org-leaked' } : tenant)),
            evidence: expected.evidence.map((item) => ({ ...item, checksum: 'ff' })),
        });
        const diffs = compareRecoveryManifests(expected, actual);
        expect(diffs.find((item) => item.category === 'tenant.ids')?.result).toBe('FAIL');
        expect(diffs.find((item) => item.category === 'evidence.checksums')?.result).toBe('FAIL');
    });
});

describe('restored malware policy', () => {
    it('keeps CLEAN downloadable and non-CLEAN blocked', () => {
        const restored = manifest({
            evidence: [
                { id: '1', organizationId: 'a', storageKey: 'a/clean.pdf', size: 1, contentType: 'application/pdf', checksum: '1', scanStatus: ScanStatus.CLEAN },
                { id: '2', organizationId: 'a', storageKey: 'a/blocked.txt', size: 1, contentType: 'text/plain', checksum: '2', scanStatus: ScanStatus.NOT_CONFIGURED },
            ],
        });
        const checks = verifyMalwarePolicy(restored);
        expect(checks.every((item) => item.result === 'PASS')).toBe(true);
        expect(evaluateScanDownloadPolicy(ScanStatus.CLEAN).allowed).toBe(true);
        expect(evaluateScanDownloadPolicy(ScanStatus.NOT_CONFIGURED).allowed).toBe(false);
        expect(evaluateScanDownloadPolicy(ScanStatus.INFECTED).allowed).toBe(false);
    });
});
