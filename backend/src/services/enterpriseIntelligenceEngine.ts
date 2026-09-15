import crypto from 'crypto';

export const INTELLIGENCE_RULE_VERSION = 'supreme-intelligence-1.0.0';

export type IntelligencePriority = 'CRITICAL_ATTENTION' | 'HIGH_ATTENTION' | 'REVIEW' | 'POSITIVE';
export type IntelligenceDomain =
    | 'THIRD_PARTY'
    | 'RISK'
    | 'CONTROL'
    | 'EVIDENCE'
    | 'COMPLIANCE'
    | 'PRIVACY'
    | 'AI_GOVERNANCE'
    | 'DECISION'
    | 'CROSS_PLATFORM';

export type IntelligenceFact = { label: string; value: string; kind: 'FACT' };
export type IntelligenceLink = { label: string; href: string };
export type IntelligenceAffectedObject = {
    type: string;
    id: string;
    publicId?: string;
    label: string;
    href: string;
};

export type IntelligenceCandidate = {
    groupingKey: string;
    ruleId: string;
    ruleVersion: string;
    domain: IntelligenceDomain;
    changeType: string;
    priority: IntelligencePriority;
    polarity: 'NEGATIVE' | 'POSITIVE';
    title: string;
    summary: string;
    whyItMatters: string;
    reviewGuidance: string;
    ownerLabel?: string;
    ownerUserId?: string;
    sourceProduct: string;
    sourceModel: string;
    sourceId: string;
    sourcePublicId?: string;
    sourceTimestamp: Date;
    facts: IntelligenceFact[];
    affected: { counts: Record<string, number>; objects: IntelligenceAffectedObject[] };
    links: IntelligenceLink[];
    roleAudience: string[];
    requiredPermissions: string[];
    fingerprint: string;
};

export type IntelligenceSnapshot = {
    now: Date;
    vendors: Array<{
        id: string;
        publicId?: string | null;
        name: string;
        tier: string;
        nextReviewDate?: Date | null;
        businessOwnerUserId?: string | null;
        updatedAt: Date;
    }>;
    findings: Array<{
        id: string;
        title: string;
        severity: string;
        status: string;
        vendorId: string;
        vendorName: string;
        vendorTier: string;
        identifiedDate: Date;
        closedAt?: Date | null;
        assignedTo?: string | null;
        targetRemediationDate?: Date | null;
    }>;
    risks: Array<{
        id: string;
        publicId: string;
        title: string;
        residualRating: string;
        appetiteStatus: string;
        status: string;
        ownerUserId?: string | null;
        reviewDate?: Date | null;
        updatedAt: Date;
    }>;
    acceptances: Array<{
        id: string;
        riskId: string;
        riskPublicId: string;
        riskTitle: string;
        residualRating: string;
        expiresAt?: Date | null;
        status: string;
        createdAt: Date;
    }>;
    controlTests: Array<{
        id: string;
        controlId: string;
        controlKey: string;
        controlTitle: string;
        result: string;
        testedAt: Date;
        testerUserId: string;
    }>;
    evidence: Array<{
        storedObjectId: string;
        filename: string;
        scanStatus: string;
        freshness: string;
        expiresAt?: Date | null;
        validTo?: Date | null;
        updatedAt: Date;
        vendorId?: string | null;
        vendorName?: string | null;
        vendorTier?: string | null;
        controlId?: string | null;
        controlKey?: string | null;
        targets: Array<{ type: string; id: string; label: string; href: string }>;
    }>;
    gaps: Array<{
        id: string;
        publicId: string;
        title: string;
        status: string;
        ownerUserId?: string | null;
        dueDate?: Date | null;
        updatedAt: Date;
        controlKey?: string | null;
    }>;
    rights: Array<{
        id: string;
        publicId: string;
        requestType: string;
        status: string;
        dueAt?: Date | null;
        ownerUserId?: string | null;
        updatedAt: Date;
    }>;
    transfers: Array<{
        id: string;
        publicId: string;
        status: string;
        destinationJurisdiction: string;
        ownerUserId?: string | null;
        updatedAt: Date;
    }>;
    dpias: Array<{
        id: string;
        publicId: string;
        title: string;
        status: string;
        ownerUserId?: string | null;
        updatedAt: Date;
    }>;
    aiSystems: Array<{
        id: string;
        publicId: string;
        name: string;
        lifecycle: string;
        ownerUserId?: string | null;
        updatedAt: Date;
        hasCurrentApproval: boolean;
    }>;
    aiTests: Array<{
        id: string;
        publicId: string;
        kind: string;
        result: string;
        testedAt: Date;
        systemPublicId?: string | null;
    }>;
    aiChanges: Array<{
        id: string;
        systemPublicId: string;
        systemName: string;
        changeType: string;
        summary: string;
        createdAt: Date;
    }>;
    decisions: Array<{
        id: string;
        title: string;
        status: string;
        vendorId?: string | null;
        vendorName?: string | null;
        updatedAt: Date;
    }>;
};

const OPEN_FINDINGS = new Set(['OPEN', 'IN_PROGRESS', 'PENDING_VENDOR', 'PENDING_VALIDATION', 'ESCALATED']);
const CLOSED_FINDINGS = new Set(['CLOSED', 'RESOLVED', 'REMEDIATED']);
const OPEN_GAPS = new Set(['OPEN', 'IN_PROGRESS', 'LINKED_FINDING']);
const PENDING_DECISIONS = new Set(['DRAFT', 'IN_REVIEW', 'PENDING', 'SUBMITTED', 'AWAITING_DECISION']);
const ALL_ROLES = ['EXECUTIVE', 'RISK_MANAGER', 'TPRM', 'COMPLIANCE', 'PRIVACY', 'AI', 'BUSINESS_OWNER', 'VIEWER'];

function daysFrom(now: Date, value?: Date | null) {
    if (!value) return null;
    return Math.ceil((value.getTime() - now.getTime()) / 86400000);
}

function fingerprint(parts: Array<string | number | boolean | null | undefined>) {
    return crypto.createHash('sha256').update(parts.map((part) => String(part ?? '')).join('|')).digest('hex');
}

function fact(label: string, value: string): IntelligenceFact {
    return { label, value, kind: 'FACT' };
}

function countsFrom(objects: IntelligenceAffectedObject[]) {
    const counts: Record<string, number> = {};
    for (const object of objects) {
        counts[object.type] = (counts[object.type] || 0) + 1;
    }
    return counts;
}

function candidate(input: Omit<IntelligenceCandidate, 'ruleVersion' | 'fingerprint'> & { fingerprintParts: Array<string | number | boolean | null | undefined> }): IntelligenceCandidate {
    const { fingerprintParts, ...rest } = input;
    return {
        ...rest,
        ruleVersion: INTELLIGENCE_RULE_VERSION,
        fingerprint: fingerprint(fingerprintParts),
    };
}

export function honestyCopy() {
    return 'Supreme Intelligence interprets recorded Supreme facts. It does not approve, reject, score, close, or legally determine anything. Facts, derived intelligence, and AI narrative are labeled separately.';
}

export function humanizePriority(value: string) {
    if (value === 'CRITICAL_ATTENTION') return 'Critical attention';
    if (value === 'HIGH_ATTENTION') return 'High attention';
    if (value === 'POSITIVE') return 'Positive movement';
    return 'Review';
}

export function collectCandidates(snapshot: IntelligenceSnapshot): IntelligenceCandidate[] {
    const items: IntelligenceCandidate[] = [];
    const now = snapshot.now;
    const vendorById = new Map(snapshot.vendors.map((vendor) => [vendor.id, vendor]));

    for (const vendor of snapshot.vendors) {
        const due = daysFrom(now, vendor.nextReviewDate);
        if (due !== null && due <= 14 && (vendor.tier === 'CRITICAL' || vendor.tier === 'HIGH')) {
            items.push(candidate({
                groupingKey: `vendor-reassessment:${vendor.id}`,
                ruleId: 'vendor.reassessment_due',
                domain: 'THIRD_PARTY',
                changeType: 'VENDOR_REASSESSMENT_DUE',
                priority: vendor.tier === 'CRITICAL' || due <= 0 ? 'HIGH_ATTENTION' : 'REVIEW',
                polarity: 'NEGATIVE',
                title: due <= 0 ? 'Vendor reassessment is overdue' : 'Vendor reassessment is due',
                summary: `${vendor.name} is recorded as ${vendor.tier.toLowerCase()} tier and the next review date is ${due <= 0 ? 'past' : `in ${due} days`}.`,
                whyItMatters: `A ${vendor.tier.toLowerCase()}-tier third party without a current reassessment can hide residual-risk change before the next decision.`,
                reviewGuidance: 'Review the vendor assessment posture before the next vendor decision.',
                ownerUserId: vendor.businessOwnerUserId || undefined,
                ownerLabel: vendor.name,
                sourceProduct: 'Supreme Third Party',
                sourceModel: 'Vendor',
                sourceId: vendor.id,
                sourcePublicId: vendor.publicId || undefined,
                sourceTimestamp: vendor.nextReviewDate || vendor.updatedAt,
                facts: [
                    fact('Vendor', vendor.name),
                    fact('Tier', vendor.tier),
                    fact('Next review', vendor.nextReviewDate?.toISOString() || 'Not recorded'),
                ],
                affected: { counts: { vendors: 1 }, objects: [{ type: 'Vendor', id: vendor.id, publicId: vendor.publicId || undefined, label: vendor.name, href: `/vendor-management/${vendor.id}` }] },
                links: [{ label: 'Open vendor', href: `/vendor-management/${vendor.id}` }],
                roleAudience: ['EXECUTIVE', 'TPRM', 'RISK_MANAGER', 'BUSINESS_OWNER', 'VIEWER'],
                requiredPermissions: ['vendor.read'],
                fingerprintParts: ['vendor.reassessment_due', vendor.id, vendor.tier, vendor.nextReviewDate?.toISOString()],
            }));
        }
    }

    for (const finding of snapshot.findings) {
        const vendor = vendorById.get(finding.vendorId);
        const overdue = daysFrom(now, finding.targetRemediationDate);
        if (OPEN_FINDINGS.has(finding.status) && (finding.severity === 'CRITICAL' || finding.severity === 'HIGH')) {
            const critical = finding.severity === 'CRITICAL' || vendor?.tier === 'CRITICAL';
            items.push(candidate({
                groupingKey: `finding-open:${finding.id}`,
                ruleId: 'finding.open_high_critical',
                domain: 'THIRD_PARTY',
                changeType: 'FINDING_OPENED',
                priority: critical ? 'CRITICAL_ATTENTION' : 'HIGH_ATTENTION',
                polarity: 'NEGATIVE',
                title: `${finding.severity === 'CRITICAL' ? 'Critical' : 'High'} finding is open`,
                summary: `${finding.title} remains ${finding.status.toLowerCase().replace(/_/g, ' ')} for ${finding.vendorName}.`,
                whyItMatters: [
                    `Severity: ${finding.severity}`,
                    vendor ? `Vendor tier: ${vendor.tier}` : null,
                    overdue !== null && overdue <= 0 ? 'Remediation: Overdue' : null,
                ].filter(Boolean).join('. ') + '.',
                reviewGuidance: 'Review the finding and remediation before the next vendor decision.',
                ownerLabel: finding.assignedTo || finding.vendorName,
                sourceProduct: 'Supreme Third Party',
                sourceModel: 'VendorIssue',
                sourceId: finding.id,
                sourceTimestamp: finding.identifiedDate,
                facts: [
                    fact('Finding', finding.title),
                    fact('Severity', finding.severity),
                    fact('Status', finding.status),
                    fact('Vendor', finding.vendorName),
                    fact('Vendor tier', finding.vendorTier),
                ],
                affected: {
                    counts: { findings: 1, vendors: 1 },
                    objects: [
                        { type: 'Finding', id: finding.id, label: finding.title, href: `/findings` },
                        { type: 'Vendor', id: finding.vendorId, label: finding.vendorName, href: `/vendor-management/${finding.vendorId}` },
                    ],
                },
                links: [
                    { label: 'Open finding', href: '/findings' },
                    { label: 'Open vendor', href: `/vendor-management/${finding.vendorId}` },
                ],
                roleAudience: ['EXECUTIVE', 'TPRM', 'RISK_MANAGER', 'BUSINESS_OWNER', 'VIEWER'],
                requiredPermissions: ['finding.read'],
                fingerprintParts: ['finding.open_high_critical', finding.id, finding.status, finding.severity],
            }));
        }
        if (CLOSED_FINDINGS.has(finding.status) && (finding.severity === 'CRITICAL' || finding.severity === 'HIGH') && finding.closedAt) {
            items.push(candidate({
                groupingKey: `finding-closed:${finding.id}`,
                ruleId: 'finding.closed_high_critical',
                domain: 'THIRD_PARTY',
                changeType: 'FINDING_CLOSED',
                priority: 'POSITIVE',
                polarity: 'POSITIVE',
                title: `${finding.severity === 'CRITICAL' ? 'Critical' : 'High'} finding closed`,
                summary: `${finding.title} is recorded as ${finding.status.toLowerCase().replace(/_/g, ' ')} for ${finding.vendorName}.`,
                whyItMatters: 'Recorded remediation closed a high-severity finding. This is not an approval that the vendor is safe.',
                reviewGuidance: 'Confirm residual evidence still supports the next vendor decision.',
                ownerLabel: finding.vendorName,
                sourceProduct: 'Supreme Third Party',
                sourceModel: 'VendorIssue',
                sourceId: finding.id,
                sourceTimestamp: finding.closedAt,
                facts: [
                    fact('Finding', finding.title),
                    fact('Severity', finding.severity),
                    fact('Status', finding.status),
                    fact('Closed', finding.closedAt.toISOString()),
                ],
                affected: { counts: { findings: 1, vendors: 1 }, objects: [{ type: 'Finding', id: finding.id, label: finding.title, href: '/findings' }] },
                links: [{ label: 'Open finding', href: '/findings' }],
                roleAudience: ['EXECUTIVE', 'TPRM', 'RISK_MANAGER', 'VIEWER'],
                requiredPermissions: ['finding.read'],
                fingerprintParts: ['finding.closed_high_critical', finding.id, finding.status],
            }));
        }
    }

    for (const risk of snapshot.risks) {
        const high = risk.residualRating === 'HIGH' || risk.residualRating === 'CRITICAL';
        if (high && (risk.appetiteStatus === 'OUTSIDE_APPETITE' || risk.appetiteStatus === 'NEAR_TOLERANCE')) {
            items.push(candidate({
                groupingKey: `risk-appetite:${risk.id}`,
                ruleId: 'risk.outside_appetite',
                domain: 'RISK',
                changeType: risk.appetiteStatus === 'OUTSIDE_APPETITE' ? 'RISK_OUTSIDE_APPETITE' : 'RISK_NEAR_TOLERANCE',
                priority: risk.appetiteStatus === 'OUTSIDE_APPETITE' && risk.residualRating === 'CRITICAL' ? 'CRITICAL_ATTENTION' : risk.appetiteStatus === 'OUTSIDE_APPETITE' ? 'HIGH_ATTENTION' : 'REVIEW',
                polarity: 'NEGATIVE',
                title: risk.appetiteStatus === 'OUTSIDE_APPETITE' ? 'Risk is outside appetite' : 'Risk is near tolerance',
                summary: `${risk.publicId} ${risk.title} is recorded as ${risk.residualRating.toLowerCase()} residual and ${risk.appetiteStatus.toLowerCase().replace(/_/g, ' ')}.`,
                whyItMatters: `Residual rating: ${risk.residualRating}. Appetite: ${risk.appetiteStatus.replace(/_/g, ' ').toLowerCase()}. This is a recorded appetite position, not a new score.`,
                reviewGuidance: 'Review whether treatment or acceptance still matches the recorded residual risk.',
                ownerUserId: risk.ownerUserId || undefined,
                sourceProduct: 'Supreme Risk',
                sourceModel: 'EnterpriseRisk',
                sourceId: risk.id,
                sourcePublicId: risk.publicId,
                sourceTimestamp: risk.updatedAt,
                facts: [
                    fact('Risk', `${risk.publicId} ${risk.title}`),
                    fact('Residual rating', risk.residualRating),
                    fact('Appetite', risk.appetiteStatus),
                    fact('Status', risk.status),
                ],
                affected: { counts: { risks: 1 }, objects: [{ type: 'Risk', id: risk.id, publicId: risk.publicId, label: risk.title, href: `/risks/${risk.publicId}` }] },
                links: [{ label: 'Open risk', href: `/risks/${risk.publicId}` }],
                roleAudience: ['EXECUTIVE', 'RISK_MANAGER', 'VIEWER'],
                requiredPermissions: ['risk.read'],
                fingerprintParts: ['risk.outside_appetite', risk.id, risk.residualRating, risk.appetiteStatus],
            }));
        }
        if (high && risk.appetiteStatus === 'WITHIN_APPETITE') {
            items.push(candidate({
                groupingKey: `risk-within:${risk.id}`,
                ruleId: 'risk.within_appetite',
                domain: 'RISK',
                changeType: 'RISK_WITHIN_APPETITE',
                priority: 'POSITIVE',
                polarity: 'POSITIVE',
                title: 'Risk returned within appetite',
                summary: `${risk.publicId} is recorded as ${risk.residualRating.toLowerCase()} residual and within appetite.`,
                whyItMatters: 'The recorded appetite position improved. Residual rating is unchanged by this intelligence item.',
                reviewGuidance: 'Confirm the next review date still matches residual rating.',
                ownerUserId: risk.ownerUserId || undefined,
                sourceProduct: 'Supreme Risk',
                sourceModel: 'EnterpriseRisk',
                sourceId: risk.id,
                sourcePublicId: risk.publicId,
                sourceTimestamp: risk.updatedAt,
                facts: [fact('Risk', `${risk.publicId} ${risk.title}`), fact('Residual rating', risk.residualRating), fact('Appetite', risk.appetiteStatus)],
                affected: { counts: { risks: 1 }, objects: [{ type: 'Risk', id: risk.id, publicId: risk.publicId, label: risk.title, href: `/risks/${risk.publicId}` }] },
                links: [{ label: 'Open risk', href: `/risks/${risk.publicId}` }],
                roleAudience: ['EXECUTIVE', 'RISK_MANAGER', 'VIEWER'],
                requiredPermissions: ['risk.read'],
                fingerprintParts: ['risk.within_appetite', risk.id, risk.appetiteStatus, risk.residualRating],
            }));
        }
    }

    for (const acceptance of snapshot.acceptances) {
        const due = daysFrom(now, acceptance.expiresAt);
        if (due === null) continue;
        if (due <= 14) {
            items.push(candidate({
                groupingKey: `risk-acceptance:${acceptance.id}`,
                ruleId: 'risk.acceptance_expiry',
                domain: 'DECISION',
                changeType: due <= 0 ? 'RISK_ACCEPTANCE_EXPIRED' : 'RISK_ACCEPTANCE_EXPIRING',
                priority: due <= 0 ? 'HIGH_ATTENTION' : 'REVIEW',
                polarity: 'NEGATIVE',
                title: due <= 0 ? 'Risk acceptance expired' : 'Risk acceptance is nearing expiry',
                summary: `Acceptance for ${acceptance.riskPublicId} ${due <= 0 ? 'has expired' : `expires in ${due} days`}.`,
                whyItMatters: 'Expired acceptance does not rewrite residual risk. A person still has to decide whether to renew.',
                reviewGuidance: 'Review whether this risk acceptance should be renewed before or after expiry.',
                sourceProduct: 'Supreme Risk',
                sourceModel: 'EnterpriseRiskDecision',
                sourceId: acceptance.id,
                sourcePublicId: acceptance.riskPublicId,
                sourceTimestamp: acceptance.expiresAt || acceptance.createdAt,
                facts: [
                    fact('Risk', `${acceptance.riskPublicId} ${acceptance.riskTitle}`),
                    fact('Residual rating', acceptance.residualRating),
                    fact('Acceptance expiry', acceptance.expiresAt?.toISOString() || 'Not recorded'),
                ],
                affected: { counts: { risks: 1, decisions: 1 }, objects: [{ type: 'Risk', id: acceptance.riskId, publicId: acceptance.riskPublicId, label: acceptance.riskTitle, href: `/risks/${acceptance.riskPublicId}` }] },
                links: [{ label: 'Open risk', href: `/risks/${acceptance.riskPublicId}` }],
                roleAudience: ['EXECUTIVE', 'RISK_MANAGER', 'VIEWER'],
                requiredPermissions: ['risk.read'],
                fingerprintParts: ['risk.acceptance_expiry', acceptance.id, acceptance.expiresAt?.toISOString()],
            }));
        }
    }

    const latestTest = new Map<string, IntelligenceSnapshot['controlTests'][number]>();
    for (const test of [...snapshot.controlTests].sort((a, b) => a.testedAt.getTime() - b.testedAt.getTime())) {
        latestTest.set(test.controlId, test);
    }
    for (const test of latestTest.values()) {
        if (test.result === 'FAIL') {
            items.push(candidate({
                groupingKey: `control-test-fail:${test.controlId}`,
                ruleId: 'control.test_failed',
                domain: 'CONTROL',
                changeType: 'CONTROL_TEST_FAILED',
                priority: 'HIGH_ATTENTION',
                polarity: 'NEGATIVE',
                title: 'Control failed testing',
                summary: `${test.controlKey} ${test.controlTitle} latest test is recorded as fail.`,
                whyItMatters: 'A failed test is a recorded effectiveness fact. Evidence presence does not override it.',
                reviewGuidance: 'Review the failed test, linked risks, and whether replacement evidence is required.',
                sourceProduct: 'Shared Control & Evidence',
                sourceModel: 'OrganizationControlTest',
                sourceId: test.id,
                sourcePublicId: test.controlKey,
                sourceTimestamp: test.testedAt,
                facts: [fact('Control', `${test.controlKey} ${test.controlTitle}`), fact('Latest test', 'FAIL'), fact('Tested', test.testedAt.toISOString())],
                affected: { counts: { controls: 1 }, objects: [{ type: 'Control', id: test.controlId, publicId: test.controlKey, label: test.controlTitle, href: '/control-center' }] },
                links: [{ label: 'Open control', href: '/control-center' }],
                roleAudience: ['EXECUTIVE', 'RISK_MANAGER', 'COMPLIANCE', 'VIEWER'],
                requiredPermissions: ['control.read'],
                fingerprintParts: ['control.test_failed', test.controlId, test.id, test.result],
            }));
        }
        if (test.result === 'PASS') {
            items.push(candidate({
                groupingKey: `control-test-pass:${test.controlId}`,
                ruleId: 'control.test_passed',
                domain: 'CONTROL',
                changeType: 'CONTROL_TEST_PASSED',
                priority: 'POSITIVE',
                polarity: 'POSITIVE',
                title: 'Control passed testing',
                summary: `${test.controlKey} latest test is recorded as pass.`,
                whyItMatters: 'A passing test is recorded effectiveness. It is not certification.',
                reviewGuidance: 'Keep the next test date current.',
                sourceProduct: 'Shared Control & Evidence',
                sourceModel: 'OrganizationControlTest',
                sourceId: test.id,
                sourcePublicId: test.controlKey,
                sourceTimestamp: test.testedAt,
                facts: [fact('Control', `${test.controlKey} ${test.controlTitle}`), fact('Latest test', 'PASS')],
                affected: { counts: { controls: 1 }, objects: [{ type: 'Control', id: test.controlId, publicId: test.controlKey, label: test.controlTitle, href: '/control-center' }] },
                links: [{ label: 'Open control', href: '/control-center' }],
                roleAudience: ['EXECUTIVE', 'RISK_MANAGER', 'COMPLIANCE', 'VIEWER'],
                requiredPermissions: ['control.read'],
                fingerprintParts: ['control.test_passed', test.controlId, test.id, test.result],
            }));
        }
    }

    const evidenceByFile = new Map<string, IntelligenceSnapshot['evidence']>();
    for (const row of snapshot.evidence) {
        const list = evidenceByFile.get(row.storedObjectId) || [];
        list.push(row);
        evidenceByFile.set(row.storedObjectId, list);
    }
    for (const [storedObjectId, rows] of evidenceByFile) {
        const row = rows[0];
        const objects = rows.flatMap((item) => item.targets);
        const unique = new Map(objects.map((object) => [`${object.type}:${object.id}`, object]));
        const affectedObjects = [...unique.values()];
        const failed = row.scanStatus === 'FAILED' || row.scanStatus === 'INFECTED';
        const expired = row.freshness === 'EXPIRED' || row.freshness === 'REVOKED' || (row.expiresAt && row.expiresAt < now);
        const expiring = row.freshness === 'EXPIRING';
        const renewed = row.freshness === 'CURRENT' && row.scanStatus === 'CLEAN';
        if (failed || expired) {
            const criticalVendor = row.vendorTier === 'CRITICAL';
            items.push(candidate({
                groupingKey: `evidence-attention:${storedObjectId}`,
                ruleId: 'evidence.unusable',
                domain: 'EVIDENCE',
                changeType: failed ? 'EVIDENCE_SCAN_FAILED' : 'EVIDENCE_EXPIRED',
                priority: criticalVendor || failed ? 'CRITICAL_ATTENTION' : 'HIGH_ATTENTION',
                polarity: 'NEGATIVE',
                title: failed ? 'Evidence scan failed' : 'Evidence expired',
                summary: `${row.filename} is recorded as ${failed ? row.scanStatus.toLowerCase() : 'expired or revoked'}.`,
                whyItMatters: `The file supports ${affectedObjects.length} mapped governance object${affectedObjects.length === 1 ? '' : 's'}${row.vendorName ? ` including ${row.vendorName}` : ''}.`,
                reviewGuidance: 'Review replacement evidence before the next vendor or control decision.',
                ownerLabel: row.vendorName || row.controlKey || undefined,
                sourceProduct: 'Shared Control & Evidence',
                sourceModel: 'StoredObject',
                sourceId: storedObjectId,
                sourceTimestamp: row.expiresAt || row.updatedAt,
                facts: [
                    fact('File', row.filename),
                    fact('Scan status', row.scanStatus),
                    fact('Freshness', row.freshness),
                    fact('Mapped objects', String(affectedObjects.length)),
                ],
                affected: { counts: countsFrom(affectedObjects), objects: affectedObjects },
                links: [
                    { label: 'Open evidence', href: '/documents' },
                    ...(row.controlKey ? [{ label: 'Open control', href: '/control-center' }] : []),
                    ...(row.vendorId ? [{ label: 'Open vendor', href: `/vendor-management/${row.vendorId}` }] : []),
                ],
                roleAudience: ['EXECUTIVE', 'TPRM', 'COMPLIANCE', 'RISK_MANAGER', 'VIEWER'],
                requiredPermissions: ['evidence.read'],
                fingerprintParts: ['evidence.unusable', storedObjectId, row.scanStatus, row.freshness, row.expiresAt?.toISOString()],
            }));
        } else if (expiring) {
            items.push(candidate({
                groupingKey: `evidence-expiring:${storedObjectId}`,
                ruleId: 'evidence.expiring',
                domain: 'EVIDENCE',
                changeType: 'EVIDENCE_EXPIRING',
                priority: 'REVIEW',
                polarity: 'NEGATIVE',
                title: 'Evidence is expiring',
                summary: `${row.filename} is recorded as expiring.`,
                whyItMatters: 'Expiring evidence still supports mapped objects until the recorded expiry.',
                reviewGuidance: 'Review replacement evidence before expiry.',
                sourceProduct: 'Shared Control & Evidence',
                sourceModel: 'StoredObject',
                sourceId: storedObjectId,
                sourceTimestamp: row.expiresAt || row.updatedAt,
                facts: [fact('File', row.filename), fact('Freshness', row.freshness)],
                affected: { counts: countsFrom(affectedObjects), objects: affectedObjects },
                links: [{ label: 'Open evidence', href: '/documents' }],
                roleAudience: ['TPRM', 'COMPLIANCE', 'VIEWER'],
                requiredPermissions: ['evidence.read'],
                fingerprintParts: ['evidence.expiring', storedObjectId, row.freshness],
            }));
        } else if (renewed && row.expiresAt) {
            items.push(candidate({
                groupingKey: `evidence-renewed:${storedObjectId}`,
                ruleId: 'evidence.renewed',
                domain: 'EVIDENCE',
                changeType: 'EVIDENCE_RENEWED',
                priority: 'POSITIVE',
                polarity: 'POSITIVE',
                title: 'Evidence renewed',
                summary: `${row.filename} is recorded as current and clean.`,
                whyItMatters: 'Replacement or current evidence is recorded. This is not proof that a control is effective.',
                reviewGuidance: 'Confirm the mapped control still uses this file.',
                sourceProduct: 'Shared Control & Evidence',
                sourceModel: 'StoredObject',
                sourceId: storedObjectId,
                sourceTimestamp: row.updatedAt,
                facts: [fact('File', row.filename), fact('Scan status', row.scanStatus), fact('Freshness', row.freshness)],
                affected: { counts: countsFrom(affectedObjects), objects: affectedObjects },
                links: [{ label: 'Open evidence', href: '/documents' }],
                roleAudience: ['EXECUTIVE', 'TPRM', 'COMPLIANCE', 'VIEWER'],
                requiredPermissions: ['evidence.read'],
                fingerprintParts: ['evidence.renewed', storedObjectId, row.scanStatus, row.freshness],
            }));
        }
    }

    for (const gap of snapshot.gaps) {
        if (OPEN_GAPS.has(gap.status)) {
            items.push(candidate({
                groupingKey: `gap-open:${gap.id}`,
                ruleId: 'compliance.gap_open',
                domain: 'COMPLIANCE',
                changeType: 'COMPLIANCE_GAP_OPENED',
                priority: 'HIGH_ATTENTION',
                polarity: 'NEGATIVE',
                title: 'Compliance gap is open',
                summary: `${gap.publicId} ${gap.title} is recorded as ${gap.status.toLowerCase().replace(/_/g, ' ')}.`,
                whyItMatters: 'An open gap is a recorded coverage gap. It is not a legal finding of non-compliance.',
                reviewGuidance: 'Review the gap, mapped control, and whether an exception is still required.',
                ownerUserId: gap.ownerUserId || undefined,
                sourceProduct: 'Supreme Compliance',
                sourceModel: 'ComplianceGap',
                sourceId: gap.id,
                sourcePublicId: gap.publicId,
                sourceTimestamp: gap.updatedAt,
                facts: [fact('Gap', `${gap.publicId} ${gap.title}`), fact('Status', gap.status), ...(gap.controlKey ? [fact('Control', gap.controlKey)] : [])],
                affected: { counts: { gaps: 1 }, objects: [{ type: 'Compliance gap', id: gap.id, publicId: gap.publicId, label: gap.title, href: '/compliance/gaps' }] },
                links: [{ label: 'Open compliance gap', href: '/compliance/gaps' }],
                roleAudience: ['EXECUTIVE', 'COMPLIANCE', 'VIEWER'],
                requiredPermissions: ['compliance.read'],
                fingerprintParts: ['compliance.gap_open', gap.id, gap.status],
            }));
        }
        if (gap.status === 'CLOSED') {
            items.push(candidate({
                groupingKey: `gap-closed:${gap.id}`,
                ruleId: 'compliance.gap_closed',
                domain: 'COMPLIANCE',
                changeType: 'COMPLIANCE_GAP_CLOSED',
                priority: 'POSITIVE',
                polarity: 'POSITIVE',
                title: 'Compliance gap closed',
                summary: `${gap.publicId} is recorded as closed.`,
                whyItMatters: 'A closed gap is a recorded coverage change. It is not certification.',
                reviewGuidance: 'Confirm the mapped control test and evidence still support the requirement.',
                sourceProduct: 'Supreme Compliance',
                sourceModel: 'ComplianceGap',
                sourceId: gap.id,
                sourcePublicId: gap.publicId,
                sourceTimestamp: gap.updatedAt,
                facts: [fact('Gap', `${gap.publicId} ${gap.title}`), fact('Status', gap.status)],
                affected: { counts: { gaps: 1 }, objects: [{ type: 'Compliance gap', id: gap.id, publicId: gap.publicId, label: gap.title, href: '/compliance/gaps' }] },
                links: [{ label: 'Open compliance gap', href: '/compliance/gaps' }],
                roleAudience: ['EXECUTIVE', 'COMPLIANCE', 'VIEWER'],
                requiredPermissions: ['compliance.read'],
                fingerprintParts: ['compliance.gap_closed', gap.id, gap.status],
            }));
        }
    }

    for (const request of snapshot.rights) {
        const due = daysFrom(now, request.dueAt);
        if (due !== null && due <= 7 && !['COMPLETED', 'DENIED', 'CLOSED'].includes(request.status)) {
            items.push(candidate({
                groupingKey: `dsr:${request.id}`,
                ruleId: 'privacy.dsr_deadline',
                domain: 'PRIVACY',
                changeType: due <= 0 ? 'PRIVACY_DSR_OVERDUE' : 'PRIVACY_DSR_DUE',
                priority: due <= 0 ? 'CRITICAL_ATTENTION' : 'HIGH_ATTENTION',
                polarity: 'NEGATIVE',
                title: due <= 0 ? 'Privacy request is overdue' : 'Privacy request deadline is near',
                summary: `${request.publicId} ${request.requestType.replace(/_/g, ' ').toLowerCase()} is recorded as ${request.status.toLowerCase().replace(/_/g, ' ')}.`,
                whyItMatters: 'This is a recorded deadline. Intelligence does not decide the request.',
                reviewGuidance: 'Review the rights request before the recorded due date.',
                ownerUserId: request.ownerUserId || undefined,
                sourceProduct: 'Supreme Privacy',
                sourceModel: 'PrivacyRightsRequest',
                sourceId: request.id,
                sourcePublicId: request.publicId,
                sourceTimestamp: request.dueAt || request.updatedAt,
                facts: [fact('Request', request.publicId), fact('Type', request.requestType), fact('Status', request.status), fact('Due', request.dueAt?.toISOString() || 'Not recorded')],
                affected: { counts: { privacyRequests: 1 }, objects: [{ type: 'Privacy request', id: request.id, publicId: request.publicId, label: request.requestType, href: `/privacy-ops/rights` }] },
                links: [{ label: 'Open privacy item', href: '/privacy-ops/rights' }],
                roleAudience: ['EXECUTIVE', 'PRIVACY', 'VIEWER'],
                requiredPermissions: ['privacy.read', 'rightsRequest.read'],
                fingerprintParts: ['privacy.dsr_deadline', request.id, request.status, request.dueAt?.toISOString()],
            }));
        }
    }

    for (const transfer of snapshot.transfers) {
        if (transfer.status === 'REVIEW_REQUIRED' || transfer.status === 'IN_PROGRESS') {
            items.push(candidate({
                groupingKey: `transfer:${transfer.id}`,
                ruleId: 'privacy.transfer_review',
                domain: 'PRIVACY',
                changeType: 'PRIVACY_TRANSFER_CHANGED',
                priority: 'HIGH_ATTENTION',
                polarity: 'NEGATIVE',
                title: 'Privacy transfer needs review',
                summary: `${transfer.publicId} to ${transfer.destinationJurisdiction} is recorded as ${transfer.status.toLowerCase().replace(/_/g, ' ')}.`,
                whyItMatters: 'Transfer review is a recorded privacy state. This is not a legal validity finding.',
                reviewGuidance: 'Review the transfer mechanism and any linked vendor or processing activity.',
                ownerUserId: transfer.ownerUserId || undefined,
                sourceProduct: 'Supreme Privacy',
                sourceModel: 'PrivacyTransfer',
                sourceId: transfer.id,
                sourcePublicId: transfer.publicId,
                sourceTimestamp: transfer.updatedAt,
                facts: [fact('Transfer', transfer.publicId), fact('Destination', transfer.destinationJurisdiction), fact('Status', transfer.status)],
                affected: { counts: { transfers: 1 }, objects: [{ type: 'Privacy transfer', id: transfer.id, publicId: transfer.publicId, label: transfer.destinationJurisdiction, href: '/privacy-ops/transfers' }] },
                links: [{ label: 'Open privacy item', href: '/privacy-ops/transfers' }],
                roleAudience: ['EXECUTIVE', 'PRIVACY', 'VIEWER'],
                requiredPermissions: ['privacy.read'],
                fingerprintParts: ['privacy.transfer_review', transfer.id, transfer.status],
            }));
        }
    }

    for (const dpia of snapshot.dpias) {
        if (!['COMPLETED', 'APPROVED', 'CLOSED'].includes(dpia.status)) {
            items.push(candidate({
                groupingKey: `dpia:${dpia.id}`,
                ruleId: 'privacy.dpia_state',
                domain: 'PRIVACY',
                changeType: 'PRIVACY_DPIA_CHANGED',
                priority: 'REVIEW',
                polarity: 'NEGATIVE',
                title: 'DPIA still needs review',
                summary: `${dpia.publicId} ${dpia.title} is recorded as ${dpia.status.toLowerCase().replace(/_/g, ' ')}.`,
                whyItMatters: 'DPIA state is recorded operating status. It is not a legal conclusion.',
                reviewGuidance: 'Review the DPIA before treating the activity as assessed.',
                ownerUserId: dpia.ownerUserId || undefined,
                sourceProduct: 'Supreme Privacy',
                sourceModel: 'PrivacyDpia',
                sourceId: dpia.id,
                sourcePublicId: dpia.publicId,
                sourceTimestamp: dpia.updatedAt,
                facts: [fact('DPIA', `${dpia.publicId} ${dpia.title}`), fact('Status', dpia.status)],
                affected: { counts: { dpias: 1 }, objects: [{ type: 'DPIA', id: dpia.id, publicId: dpia.publicId, label: dpia.title, href: '/privacy-ops/activities' }] },
                links: [{ label: 'Open privacy item', href: '/privacy-ops/activities' }],
                roleAudience: ['PRIVACY', 'VIEWER'],
                requiredPermissions: ['privacy.read'],
                fingerprintParts: ['privacy.dpia_state', dpia.id, dpia.status],
            }));
        }
    }

    for (const system of snapshot.aiSystems) {
        if ((system.lifecycle === 'PRODUCTION' || system.lifecycle === 'PILOT') && !system.hasCurrentApproval) {
            items.push(candidate({
                groupingKey: `ai-unapproved:${system.id}`,
                ruleId: 'ai.unapproved_production',
                domain: 'AI_GOVERNANCE',
                changeType: 'AI_APPROVAL_CHANGED',
                priority: 'CRITICAL_ATTENTION',
                polarity: 'NEGATIVE',
                title: 'Production AI lacks a current human approval',
                summary: `${system.publicId} ${system.name} is recorded as ${system.lifecycle.toLowerCase().replace(/_/g, ' ')} without a current human approval.`,
                whyItMatters: 'Intelligence does not approve the system. A person still has to record the approval.',
                reviewGuidance: 'Review the AI approval before continuing production use.',
                ownerUserId: system.ownerUserId || undefined,
                sourceProduct: 'Supreme AI Governance',
                sourceModel: 'AiSystem',
                sourceId: system.id,
                sourcePublicId: system.publicId,
                sourceTimestamp: system.updatedAt,
                facts: [fact('AI system', `${system.publicId} ${system.name}`), fact('Lifecycle', system.lifecycle), fact('Current approval', 'Not recorded')],
                affected: { counts: { aiSystems: 1 }, objects: [{ type: 'AI system', id: system.id, publicId: system.publicId, label: system.name, href: `/ai-governance/systems/${system.publicId}` }] },
                links: [{ label: 'Open AI approval', href: `/ai-governance/systems/${system.publicId}` }],
                roleAudience: ['EXECUTIVE', 'AI', 'VIEWER'],
                requiredPermissions: ['ai.read'],
                fingerprintParts: ['ai.unapproved_production', system.id, system.lifecycle, system.hasCurrentApproval],
            }));
        }
    }

    for (const test of snapshot.aiTests) {
        if (test.result === 'FAIL') {
            items.push(candidate({
                groupingKey: `ai-test:${test.id}`,
                ruleId: 'ai.test_failed',
                domain: 'AI_GOVERNANCE',
                changeType: 'AI_TEST_FAILED',
                priority: 'HIGH_ATTENTION',
                polarity: 'NEGATIVE',
                title: 'AI test failed',
                summary: `${test.publicId} ${test.kind.replace(/_/g, ' ').toLowerCase()} is recorded as fail.`,
                whyItMatters: 'This is a recorded test result. Intelligence does not invent model performance.',
                reviewGuidance: 'Review the failed test before continuing approval.',
                sourceProduct: 'Supreme AI Governance',
                sourceModel: 'AiTest',
                sourceId: test.id,
                sourcePublicId: test.publicId,
                sourceTimestamp: test.testedAt,
                facts: [fact('Test', test.publicId), fact('Kind', test.kind), fact('Result', test.result)],
                affected: { counts: { aiTests: 1 }, objects: [{ type: 'AI test', id: test.id, publicId: test.publicId, label: test.kind, href: '/ai-governance/testing' }] },
                links: [{ label: 'Open AI approval', href: '/ai-governance/testing' }],
                roleAudience: ['AI', 'EXECUTIVE', 'VIEWER'],
                requiredPermissions: ['ai.read'],
                fingerprintParts: ['ai.test_failed', test.id, test.result],
            }));
        }
    }

    for (const change of snapshot.aiChanges) {
        items.push(candidate({
            groupingKey: `ai-change:${change.id}`,
            ruleId: 'ai.provider_or_model_changed',
            domain: 'AI_GOVERNANCE',
            changeType: 'AI_PROVIDER_CHANGED',
            priority: 'HIGH_ATTENTION',
            polarity: 'NEGATIVE',
            title: 'AI provider or model changed',
            summary: `${change.systemPublicId} ${change.systemName}: ${change.summary}`,
            whyItMatters: 'A recorded model or provider change can affect privacy, vendor, and approval posture.',
            reviewGuidance: 'Review the vendor AI-provider change before continuing approval.',
            sourceProduct: 'Supreme AI Governance',
            sourceModel: 'AiChange',
            sourceId: change.id,
            sourcePublicId: change.systemPublicId,
            sourceTimestamp: change.createdAt,
            facts: [fact('AI system', `${change.systemPublicId} ${change.systemName}`), fact('Change', change.changeType), fact('Summary', change.summary)],
            affected: { counts: { aiSystems: 1 }, objects: [{ type: 'AI system', id: change.id, publicId: change.systemPublicId, label: change.systemName, href: `/ai-governance/systems/${change.systemPublicId}` }] },
            links: [{ label: 'Open AI approval', href: `/ai-governance/systems/${change.systemPublicId}` }],
            roleAudience: ['AI', 'EXECUTIVE', 'PRIVACY', 'TPRM', 'VIEWER'],
            requiredPermissions: ['ai.read'],
            fingerprintParts: ['ai.provider_or_model_changed', change.id, change.changeType],
        }));
    }

    for (const decision of snapshot.decisions) {
        if (PENDING_DECISIONS.has(decision.status) || /pending|review|draft|await/i.test(decision.status)) {
            items.push(candidate({
                groupingKey: `decision:${decision.id}`,
                ruleId: 'decision.pending',
                domain: 'DECISION',
                changeType: 'DECISION_PENDING',
                priority: 'HIGH_ATTENTION',
                polarity: 'NEGATIVE',
                title: 'Decision needs a person',
                summary: `${decision.title} is recorded as ${decision.status.toLowerCase().replace(/_/g, ' ')}.`,
                whyItMatters: 'Intelligence can surface the decision. It cannot approve the vendor or accept the risk.',
                reviewGuidance: 'Open the authoritative decision record and decide there.',
                ownerLabel: decision.vendorName || undefined,
                sourceProduct: 'Supreme Third Party',
                sourceModel: 'RiskDecisionBrief',
                sourceId: decision.id,
                sourceTimestamp: decision.updatedAt,
                facts: [fact('Decision', decision.title), fact('Status', decision.status), ...(decision.vendorName ? [fact('Vendor', decision.vendorName)] : [])],
                affected: { counts: { decisions: 1 }, objects: [{ type: 'Decision', id: decision.id, label: decision.title, href: '/decision-briefs' }] },
                links: [{ label: 'Open decision', href: '/decision-briefs' }],
                roleAudience: ['EXECUTIVE', 'RISK_MANAGER', 'TPRM', 'BUSINESS_OWNER', 'VIEWER'],
                requiredPermissions: ['approval.read'],
                fingerprintParts: ['decision.pending', decision.id, decision.status],
            }));
        }
    }

    return items;
}

export function filterForRole(items: IntelligenceCandidate[], role: string, permissions: string[], actorUserId?: string) {
    const lens = roleLens(role);
    return items.filter((item) => {
        if (!item.requiredPermissions.every((permission) => permissions.includes(permission))) return false;
        if (lens === 'BUSINESS_OWNER') {
            return Boolean(actorUserId && item.ownerUserId === actorUserId);
        }
        if (lens === 'EXECUTIVE') {
            return item.priority !== 'REVIEW' || item.domain === 'DECISION' || item.domain === 'CROSS_PLATFORM';
        }
        if (lens === 'ALL') return true;
        return item.roleAudience.includes(lens) || item.roleAudience.includes('VIEWER');
    });
}

export function roleLens(role: string): string {
    if (['ORGANIZATION_ADMIN', 'ADMIN', 'ORG_ADMIN', 'ORG_OWNER'].includes(role)) return 'EXECUTIVE';
    if (['RISK_MANAGER', 'MANAGER'].includes(role)) return 'RISK_MANAGER';
    if (['ASSESSOR', 'COMPLIANCE_OFFICER', 'COMPLIANCE_MANAGER'].includes(role)) return role.includes('COMPLIANCE') ? 'COMPLIANCE' : 'TPRM';
    if (['APPROVER'].includes(role)) return 'RISK_MANAGER';
    if (['BUSINESS_OWNER', 'DEPARTMENT_MANAGER'].includes(role)) return 'BUSINESS_OWNER';
    if (['PRIVACY_OFFICER', 'DPO'].includes(role)) return 'PRIVACY';
    if (['AI_GOVERNANCE_LEAD', 'AI_OWNER'].includes(role)) return 'AI';
    if (['AUDITOR', 'VIEWER', 'USER'].includes(role)) return 'VIEWER';
    return 'ALL';
}

export function periodComparison(input: {
    current: Record<string, number>;
    previous?: Record<string, number> | null;
    previousEstablished: boolean;
}) {
    if (!input.previousEstablished || !input.previous) {
        return { available: false, label: 'Trend not yet established', current: input.current, previous: null };
    }
    const delta: Record<string, number> = {};
    for (const key of Object.keys(input.current)) {
        delta[key] = input.current[key] - (input.previous[key] || 0);
    }
    return { available: true, label: 'Compared with the previous period', current: input.current, previous: input.previous, delta };
}

export { ALL_ROLES };
