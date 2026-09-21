import { EngagementStatus } from '@prisma/client';
import { buildDedupKey, normalizeAttentionPriority } from '../services/engagementMonitoringService';
import { engagementPrimaryAction } from '../tprm/engagementWorkspace';
import { hasPermission, PERMISSIONS } from '../security/rbac';

describe('#12 Wave 6 monitoring helpers', () => {
    it('normalizes source severity without calling it residual risk', () => {
        expect(normalizeAttentionPriority('CRITICAL').attentionPriority).toBe('CRITICAL');
        expect(normalizeAttentionPriority('HIGH').explanation).toMatch(/not residual risk/);
        expect(normalizeAttentionPriority('unknown').attentionPriority).toBe('MEDIUM');
    });

    it('deduplicates by source, vendor, type, and day rather than title', () => {
        const day = new Date('2026-09-21T12:00:00Z');
        const a = buildDedupKey({ sourceType: 'MANUAL_OBSERVATION', sourceRecordRef: 'ref-1', vendorId: 'v1', signalType: 'BREACH', observedAt: day });
        const b = buildDedupKey({ sourceType: 'MANUAL_OBSERVATION', sourceRecordRef: 'ref-1', vendorId: 'v1', signalType: 'BREACH', observedAt: new Date('2026-09-21T23:00:00Z') });
        const c = buildDedupKey({ sourceType: 'MANUAL_OBSERVATION', sourceRecordRef: 'ref-2', vendorId: 'v1', signalType: 'BREACH', observedAt: day });
        expect(a).toBe(b);
        expect(a).not.toBe(c);
    });

    it('keeps one primary monitoring next action after activation', () => {
        expect(engagementPrimaryAction(EngagementStatus.ACTIVE).label).toBe('Configure monitoring profile');
        expect(engagementPrimaryAction(EngagementStatus.ACTIVE, { monitoringProfileStatus: 'ACTIVE', openMonitoringSignals: 2 }).label).toBe('Review monitoring signal');
        expect(engagementPrimaryAction(EngagementStatus.ACTIVE, { highPrioritySignals: 1 }).label).toBe('Review high-priority monitoring signal');
        expect(engagementPrimaryAction(EngagementStatus.ACTIVE, { reassessmentRecommended: true }).label).toBe('Reassessment recommended / due');
    });

    it('uses smallest monitoring capabilities', () => {
        expect(hasPermission('BUSINESS_OWNER', PERMISSIONS['monitoring.triage'])).toBe(false);
        expect(hasPermission('ASSESSOR', PERMISSIONS['monitoring.triage'])).toBe(true);
        expect(hasPermission('ASSESSOR', PERMISSIONS['monitoring.manage'])).toBe(false);
        expect(hasPermission('RISK_MANAGER', PERMISSIONS['monitoring.manage'])).toBe(true);
        expect(hasPermission('RISK_MANAGER', PERMISSIONS['monitoring.escalate'])).toBe(true);
    });
});
