import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import {
    assertDistinctSourceAndTarget,
    assertIsolatedRestoreTarget,
    assertObjectNamespaceIsolated,
    databaseIdentity,
} from './guards';
import { backupObjects, restoreObjects, verifyRestoredObjects, walkObjectRoot } from './objects';
import { populateRecoveryDataset } from './populate';
import { buildRecoveryManifest, compareRecoveryManifests, manifestPassed } from './manifest';
import {
    summarizeChecks,
    verifyAuditContinuity,
    verifyAuthenticationAndRbac,
    verifyBillingLocalState,
    verifyEvidenceObjects,
    verifyMalwarePolicy,
    verifyRiskIntegrity,
    verifyTenantIsolation,
} from './postRestore';
import { renderDecisionBriefPdf } from '../reports/decisionBriefPdf';
import { renderExecutivePdf } from '../reports/executivePdf';
import { renderVendorScorecardPdf } from '../reports/vendorScorecardPdf';
import { renderAssessmentPdf } from '../reports/assessmentPdf';
import { renderFindingsPdf, renderFindingsCsv } from '../reports/findingsExport';
import { renderBoardPdf, renderBoardPptx } from '../reports/boardExport';

function prismaFromEnv() {
    return new PrismaClient();
}

function readJson(file: string) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file: string, value: unknown) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function requireArg(name: string) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return value;
}

async function cmdPopulate() {
    const prisma = prismaFromEnv();
    try {
        const seeded = await populateRecoveryDataset(prisma, requireArg('OBJECT_ROOT'));
        writeJson(process.env.POPULATE_OUT || path.join(requireArg('OBJECT_ROOT'), '_populate.json'), {
            orgA: { id: seeded.orgA.org.id, name: seeded.orgA.org.name, vendors: seeded.orgA.vendors.length },
            orgB: { id: seeded.orgB.org.id, name: seeded.orgB.org.name, vendors: seeded.orgB.vendors.length },
        });
        console.log('POPULATE=PASS');
    } finally {
        await prisma.$disconnect();
    }
}

async function cmdManifest() {
    const prisma = prismaFromEnv();
    try {
        const manifest = await buildRecoveryManifest(prisma, {
            runId: requireArg('CERT_RUN_ID'),
            sourceEnvironment: process.env.SOURCE_ENVIRONMENT || 'isolated-recovery-source',
            sourceSha: requireArg('SOURCE_SHA'),
        });
        writeJson(requireArg('MANIFEST_OUT'), manifest);
        const failed = manifest.invariants.filter((item) => !item.ok);
        if (failed.length) {
            console.log('MANIFEST=FAIL');
            process.exitCode = 1;
            return;
        }
        console.log('MANIFEST=PASS');
    } finally {
        await prisma.$disconnect();
    }
}

function cmdCompare() {
    const expected = readJson(requireArg('EXPECTED_MANIFEST'));
    const actual = readJson(requireArg('ACTUAL_MANIFEST'));
    const diffs = compareRecoveryManifests(expected, actual);
    writeJson(requireArg('DIFF_OUT'), diffs);
    console.log(manifestPassed(diffs) ? 'RECONCILE=PASS' : 'RECONCILE=FAIL');
    if (!manifestPassed(diffs)) process.exitCode = 1;
}

function cmdBackupObjects() {
    const entries = backupObjects(requireArg('OBJECT_ROOT'), requireArg('OBJECT_BACKUP'));
    console.log(`OBJECT_BACKUP=PASS count=${entries.length}`);
}

function cmdRestoreObjects() {
    assertObjectNamespaceIsolated(requireArg('OBJECT_BACKUP'), requireArg('OBJECT_RESTORE'));
    const entries = restoreObjects(requireArg('OBJECT_BACKUP'), requireArg('OBJECT_RESTORE'));
    console.log(`OBJECT_RESTORE=PASS count=${entries.length}`);
}

function cmdVerifyObjects() {
    const manifest = readJson(requireArg('EXPECTED_MANIFEST'));
    const checks = verifyRestoredObjects(
        manifest.evidence.map((item: { storageKey: string; checksum: string; size: number }) => ({
            storageKey: item.storageKey,
            checksum: item.checksum,
            size: item.size,
        })),
        requireArg('OBJECT_RESTORE')
    );
    writeJson(process.env.OBJECT_VERIFY_OUT || requireArg('DIFF_OUT'), checks);
    const ok = checks.every((item) => item.result === 'PASS');
    console.log(ok ? 'OBJECT_VERIFY=PASS' : 'OBJECT_VERIFY=FAIL');
    if (!ok) process.exitCode = 1;
}

function cmdAssertTarget() {
    const target = requireArg('RESTORE_DATABASE_URL');
    const identity = assertIsolatedRestoreTarget(target);
    if (process.env.SOURCE_DATABASE_URL) {
        assertDistinctSourceAndTarget(process.env.SOURCE_DATABASE_URL, target);
    }
    console.log(`TARGET_GUARD=PASS database=${identity.database} host=${identity.host}`);
}

function cmdNegativeMissingObject() {
    const manifest = readJson(requireArg('EXPECTED_MANIFEST'));
    const root = requireArg('OBJECT_RESTORE');
    const target = manifest.evidence[0];
    if (!target) throw new Error('No evidence objects in manifest');
    const full = path.join(root, target.storageKey);
    if (fs.existsSync(full)) fs.unlinkSync(full);
    const checks = verifyRestoredObjects(
        [{ storageKey: target.storageKey, checksum: target.checksum, size: target.size }],
        root
    );
    const detected = checks.some((item) => item.result === 'FAIL');
    console.log(detected ? 'NEGATIVE_MISSING_OBJECT=PASS' : 'NEGATIVE_MISSING_OBJECT=FAIL');
    if (!detected) process.exitCode = 1;
}

function cmdNegativeChecksum() {
    const manifest = readJson(requireArg('EXPECTED_MANIFEST'));
    const tampered = {
        ...manifest,
        evidence: manifest.evidence.map((item: { checksum: string }, index: number) =>
            index === 0 ? { ...item, checksum: '0'.repeat(64) } : item
        ),
    };
    const checks = verifyRestoredObjects(
        tampered.evidence.map((item: { storageKey: string; checksum: string; size: number }) => item),
        requireArg('OBJECT_RESTORE')
    );
    const detected = checks.some((item) => item.result === 'FAIL');
    console.log(detected ? 'NEGATIVE_CHECKSUM=PASS' : 'NEGATIVE_CHECKSUM=FAIL');
    if (!detected) process.exitCode = 1;
}

async function cmdPostRestore() {
    const prisma = prismaFromEnv();
    try {
        const manifest = readJson(requireArg('EXPECTED_MANIFEST'));
        const checks = [
            ...verifyEvidenceObjects(manifest, requireArg('OBJECT_RESTORE')),
            ...verifyMalwarePolicy(manifest),
            ...(await verifyAuthenticationAndRbac(prisma)),
            ...(await verifyTenantIsolation(prisma)),
            ...(await verifyRiskIntegrity(prisma)),
            ...(await verifyAuditContinuity(prisma)),
            ...(await verifyBillingLocalState(prisma)),
        ];
        const summary = summarizeChecks(checks);
        writeJson(requireArg('VERIFY_OUT'), summary);
        console.log(summary.allPassed ? 'POST_RESTORE=PASS' : 'POST_RESTORE=FAIL');
        if (!summary.allPassed) process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

async function cmdReports() {
    const prisma = prismaFromEnv();
    const outDir = requireArg('REPORT_OUT');
    fs.mkdirSync(outDir, { recursive: true });
    try {
        const orgA = await prisma.organization.findFirstOrThrow({ where: { name: 'RECOVERY ORG A' } });
        const orgB = await prisma.organization.findFirstOrThrow({ where: { name: 'RECOVERY ORG B' } });
        const vendorA = await prisma.vendor.findFirstOrThrow({ where: { organizationId: orgA.id } });
        const vendorB = await prisma.vendor.findFirstOrThrow({ where: { organizationId: orgB.id } });
        const briefA = await prisma.riskDecisionBrief.findFirstOrThrow({ where: { organizationId: orgA.id } });
        const assessmentA = await prisma.vendorAssessment.findFirstOrThrow({ where: { organizationId: orgA.id } });

        const jobs: Array<{ name: string; run: () => Promise<{ buffer: Buffer }> }> = [
            { name: 'decision-brief', run: () => renderDecisionBriefPdf(orgA.id, briefA.id) },
            { name: 'executive', run: () => renderExecutivePdf(orgA.id) },
            { name: 'vendor-scorecard', run: () => renderVendorScorecardPdf(orgA.id, vendorA.id) },
            { name: 'assessment', run: () => renderAssessmentPdf(orgA.id, assessmentA.id) },
            { name: 'findings-pdf', run: () => renderFindingsPdf(orgA.id) },
            { name: 'findings-csv', run: () => renderFindingsCsv(orgA.id) },
            { name: 'board-pdf', run: () => renderBoardPdf(orgA.id) },
            { name: 'board-pptx', run: () => renderBoardPptx(orgA.id) },
        ];
        const results = [];
        for (const job of jobs) {
            const { buffer } = await job.run();
            const file = path.join(outDir, `${job.name}.bin`);
            fs.writeFileSync(file, buffer);
            const text = buffer.toString('latin1');
            const leaked = text.includes(orgB.name) || text.includes(vendorB.name);
            results.push({
                name: job.name,
                bytes: buffer.length,
                result: buffer.length > 100 && !leaked ? 'PASS' : 'FAIL',
                detail: leaked ? 'cross-tenant text found' : 'generated',
            });
        }
        const crossBrief = await renderDecisionBriefPdf(orgA.id, (
            await prisma.riskDecisionBrief.findFirstOrThrow({ where: { organizationId: orgB.id } })
        ).id).then(
            () => ({ name: 'cross-tenant-brief', result: 'FAIL', detail: 'Org A rendered Org B brief' }),
            (error: { statusCode?: number }) => ({
                name: 'cross-tenant-brief',
                result: error.statusCode === 404 ? 'PASS' : 'FAIL',
                detail: `denied status=${error.statusCode || 'error'}`,
            })
        );
        results.push(crossBrief);
        writeJson(path.join(outDir, 'report-verification.json'), results);
        const ok = results.every((item) => item.result === 'PASS');
        console.log(ok ? 'REPORTS=PASS' : 'REPORTS=FAIL');
        if (!ok) process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

function cmdScanArtifact() {
    const file = requireArg('ARTIFACT');
    const body = fs.readFileSync(file);
    const text = body.toString('utf8');
    const patterns = [
        /sk_live_[0-9a-zA-Z]+/,
        /sk_test_[0-9a-zA-Z]{10,}/,
        /whsec_[0-9a-zA-Z]+/,
        /re_[0-9a-zA-Z]{20,}/,
        /AKIA[0-9A-Z]{16}/,
        /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
        /DATABASE_URL=postgresql:\/\/[^:\s]+:[^@\s]+@/,
        /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/,
    ];
    const hits = patterns.filter((pattern) => pattern.test(text)).length;
    console.log(hits === 0 ? 'ARTIFACT_SCAN=PASS' : 'ARTIFACT_SCAN=FAIL');
    if (hits) process.exitCode = 1;
}

function cmdListObjects() {
    const entries = walkObjectRoot(requireArg('OBJECT_ROOT'));
    console.log(`OBJECT_LIST count=${entries.length}`);
}

async function main() {
    const cmd = process.argv[2];
    const commands: Record<string, () => Promise<void> | void> = {
        populate: cmdPopulate,
        manifest: cmdManifest,
        compare: cmdCompare,
        'backup-objects': cmdBackupObjects,
        'restore-objects': cmdRestoreObjects,
        'verify-objects': cmdVerifyObjects,
        'assert-target': cmdAssertTarget,
        'negative-missing-object': cmdNegativeMissingObject,
        'negative-checksum': cmdNegativeChecksum,
        'post-restore': cmdPostRestore,
        reports: cmdReports,
        'scan-artifact': cmdScanArtifact,
        'list-objects': cmdListObjects,
        identity: () => {
            const id = databaseIdentity(requireArg('DATABASE_URL'));
            console.log(`database=${id.database} host=${id.host}`);
        },
    };
    const run = commands[cmd];
    if (!run) {
        throw new Error(`Unknown recovery command: ${cmd}`);
    }
    await run();
}

main().catch((error) => {
    console.error((error as Error).message);
    process.exit(1);
});
