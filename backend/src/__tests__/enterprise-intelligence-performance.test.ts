import { collectCandidates, type IntelligenceSnapshot } from '../services/enterpriseIntelligenceEngine';

describe('supreme intelligence performance (synthetic)', () => {
    it('generates a bounded synthetic set in well under a second', () => {
        const now = new Date('2026-09-14T12:00:00.000Z');
        const snapshot: IntelligenceSnapshot = {
            now,
            vendors: Array.from({ length: 80 }, (_, index) => ({
                id: `v-${index}`,
                name: `Vendor ${index}`,
                tier: index % 10 === 0 ? 'CRITICAL' : 'MEDIUM',
                nextReviewDate: new Date('2026-09-20T00:00:00.000Z'),
                updatedAt: now,
            })),
            findings: Array.from({ length: 120 }, (_, index) => ({
                id: `f-${index}`,
                title: `Finding ${index}`,
                severity: index % 5 === 0 ? 'CRITICAL' : 'HIGH',
                status: index % 7 === 0 ? 'CLOSED' : 'OPEN',
                vendorId: `v-${index % 80}`,
                vendorName: `Vendor ${index % 80}`,
                vendorTier: 'HIGH',
                identifiedDate: now,
                closedAt: index % 7 === 0 ? now : null,
            })),
            risks: Array.from({ length: 60 }, (_, index) => ({
                id: `r-${index}`,
                publicId: `RISK-${String(index + 1).padStart(5, '0')}`,
                title: `Risk ${index}`,
                residualRating: index % 4 === 0 ? 'CRITICAL' : 'HIGH',
                appetiteStatus: index % 3 === 0 ? 'OUTSIDE_APPETITE' : 'WITHIN_APPETITE',
                status: 'ASSESSED',
                updatedAt: now,
            })),
            acceptances: [],
            controlTests: Array.from({ length: 40 }, (_, index) => ({
                id: `t-${index}`,
                controlId: `c-${index}`,
                controlKey: `CTL-${index}`,
                controlTitle: `Control ${index}`,
                result: index % 4 === 0 ? 'FAIL' : 'PASS',
                testedAt: now,
                testerUserId: 'u1',
            })),
            evidence: Array.from({ length: 30 }, (_, index) => ({
                storedObjectId: `e-${index}`,
                filename: `file-${index}.pdf`,
                scanStatus: 'CLEAN',
                freshness: index % 3 === 0 ? 'EXPIRED' : 'CURRENT',
                updatedAt: now,
                targets: Array.from({ length: 5 }, (__, req) => ({ type: 'Requirement', id: `req-${index}-${req}`, label: `R${req}`, href: '/compliance' })),
            })),
            gaps: [],
            rights: [],
            transfers: [],
            dpias: [],
            aiSystems: [],
            aiTests: [],
            aiChanges: [],
            decisions: [],
        };
        const started = Date.now();
        const items = collectCandidates(snapshot);
        const durationMs = Date.now() - started;
        expect(items.length).toBeGreaterThan(20);
        expect(items.length).toBeLessThan(500);
        expect(durationMs).toBeLessThan(250);
        expect(items.filter((item) => item.ruleId === 'evidence.unusable')).toHaveLength(10);
    });
});
