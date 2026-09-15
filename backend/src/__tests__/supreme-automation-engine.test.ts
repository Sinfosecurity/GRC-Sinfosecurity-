import { evaluateConditions, idempotencyKey, validateDefinition } from '../services/supremeAutomationEngine';
import { isProhibitedAction, TEMPLATES } from '../services/supremeAutomationCatalog';

describe('Supreme Automation engine', () => {
    it('keeps high-finding overdue conditions explainable', () => {
        const template = TEMPLATES.find((row) => row.key === 'high-finding-remediation-follow-up')!;
        const matched = evaluateConditions(template.conditions, { 'finding.severity': 'CRITICAL' });
        const missed = evaluateConditions(template.conditions, { 'finding.severity': 'LOW' });
        expect(matched.matched).toBe(true);
        expect(missed.matched).toBe(false);
        expect(matched.results[0].reason).toMatch(/HIGH/);
    });

    it('uses a deterministic idempotency key so one overdue finding cannot create five reminders the same day', () => {
        const first = idempotencyKey({
            automationId: 'a1',
            versionId: 'v1',
            event: 'finding.overdue',
            sourceModel: 'VendorIssue',
            sourceId: 'f1',
            bucket: '2026-09-14',
        });
        const second = idempotencyKey({
            automationId: 'a1',
            versionId: 'v1',
            event: 'finding.overdue',
            sourceModel: 'VendorIssue',
            sourceId: 'f1',
            bucket: '2026-09-14',
        });
        expect(first).toBe(second);
    });

    it('rejects material auto-decisions', () => {
        expect(isProhibitedAction('AUTO_ACCEPT_RISK')).toBe(true);
        expect(isProhibitedAction('AUTO_APPROVE_VENDOR')).toBe(true);
        expect(isProhibitedAction('AUTO_CLOSE_CRITICAL_FINDING')).toBe(true);
        expect(isProhibitedAction('AUTO_MARK_COMPLIANT')).toBe(true);
        expect(isProhibitedAction('AUTO_APPROVE_AI')).toBe(true);
        expect(isProhibitedAction('AUTO_DECLARE_PRIVACY_TRANSFER_VALID')).toBe(true);
        expect(validateDefinition({
            trigger: { type: 'EVENT', event: 'finding.overdue' },
            actions: [{ type: 'AUTO_ACCEPT_RISK' }],
            humanBoundary: { required: true, before: 'risk_acceptance', label: 'Human' },
        })[0]).toMatch(/not allowed/i);
    });

    it('matches current Critical Attention and rejects High Attention', () => {
        const template = TEMPLATES.find((row) => row.key === 'intelligence-critical-attention')!;
        const matched = evaluateConditions(template.conditions, {
            'intelligence.priority': 'CRITICAL_ATTENTION',
            'intelligence.current': true,
        });
        const high = evaluateConditions(template.conditions, {
            'intelligence.priority': 'HIGH_ATTENTION',
            'intelligence.current': true,
        });
        const resolved = evaluateConditions(template.conditions, {
            'intelligence.priority': 'CRITICAL_ATTENTION',
            'intelligence.current': false,
        });
        expect(matched.matched).toBe(true);
        expect(high.matched).toBe(false);
        expect(resolved.matched).toBe(false);
    });

    it('requires a human boundary before publish', () => {
        const errors = validateDefinition({
            trigger: { type: 'EVENT', event: 'finding.overdue' },
            actions: [{ type: 'NOTIFY_OWNER' }],
            humanBoundary: { required: false, before: '', label: '' },
        });
        expect(errors.join(' ')).toMatch(/human/i);
    });
});
