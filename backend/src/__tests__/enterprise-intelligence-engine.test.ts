import {
    collectCandidates,
    filterForRole,
    periodComparison,
    INTELLIGENCE_RULE_VERSION,
    type IntelligenceSnapshot,
} from '../services/enterpriseIntelligenceEngine';

function emptySnapshot(overrides: Partial<IntelligenceSnapshot> = {}): IntelligenceSnapshot {
    return {
        now: new Date('2026-09-14T12:00:00.000Z'),
        vendors: [],
        findings: [],
        risks: [],
        acceptances: [],
        controlTests: [],
        evidence: [],
        gaps: [],
        rights: [],
        transfers: [],
        dpias: [],
        aiSystems: [],
        aiTests: [],
        aiChanges: [],
        decisions: [],
        ...overrides,
    };
}

describe('supreme intelligence engine', () => {
    it('deduplicates one expired evidence file mapped to many requirements', () => {
        const targets = Array.from({ length: 14 }, (_, index) => ({
            type: 'Requirement',
            id: `req-${index}`,
            label: `REQ-${index}`,
            href: '/compliance',
        }));
        const items = collectCandidates(emptySnapshot({
            evidence: targets.map((target) => ({
                storedObjectId: 'file-1',
                filename: 'mfa-evidence.pdf',
                scanStatus: 'CLEAN',
                freshness: 'EXPIRED',
                expiresAt: new Date('2026-08-01T00:00:00.000Z'),
                updatedAt: new Date('2026-08-01T00:00:00.000Z'),
                vendorId: 'vendor-1',
                vendorName: 'Supreme Investigation',
                vendorTier: 'CRITICAL',
                targets: [target],
            })),
        }));
        const expired = items.filter((item) => item.ruleId === 'evidence.unusable');
        expect(expired).toHaveLength(1);
        expect(expired[0].affected.objects).toHaveLength(14);
        expect(expired[0].priority).toBe('CRITICAL_ATTENTION');
        expect(expired[0].ruleVersion).toBe(INTELLIGENCE_RULE_VERSION);
        expect(expired[0].facts.every((fact) => fact.kind === 'FACT')).toBe(true);
    });

    it('emits positive movement when a high finding is closed', () => {
        const items = collectCandidates(emptySnapshot({
            findings: [{
                id: 'finding-1',
                title: 'MFA not enforced',
                severity: 'HIGH',
                status: 'CLOSED',
                vendorId: 'vendor-1',
                vendorName: 'Acme',
                vendorTier: 'HIGH',
                identifiedDate: new Date('2026-08-01T00:00:00.000Z'),
                closedAt: new Date('2026-09-10T00:00:00.000Z'),
            }],
        }));
        expect(items.some((item) => item.ruleId === 'finding.closed_high_critical' && item.polarity === 'POSITIVE')).toBe(true);
    });

    it('does not invent a period trend', () => {
        const comparison = periodComparison({
            current: { highCriticalFindingsOpened: 2 },
            previous: null,
            previousEstablished: false,
        });
        expect(comparison.available).toBe(false);
        expect(comparison.label).toBe('Trend not yet established');
    });

    it('hides source-restricted and business-owner-irrelevant items', () => {
        const items = collectCandidates(emptySnapshot({
            rights: [{
                id: 'dsr-1',
                publicId: 'DSR-00001',
                requestType: 'ACCESS',
                status: 'IN_PROGRESS',
                dueAt: new Date('2026-09-15T00:00:00.000Z'),
                ownerUserId: 'owner-1',
                updatedAt: new Date('2026-09-14T00:00:00.000Z'),
            }],
        }));
        const withoutPrivacy = filterForRole(items, 'VIEWER', ['vendor.read', 'intelligence.read']);
        expect(withoutPrivacy).toHaveLength(0);
        const ownerOnly = filterForRole(items, 'BUSINESS_OWNER', ['privacy.read', 'rightsRequest.read', 'intelligence.read'], 'someone-else');
        expect(ownerOnly).toHaveLength(0);
    });
});
