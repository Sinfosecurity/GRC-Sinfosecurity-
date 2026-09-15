import { evaluateConditions, idempotencyKey } from '../services/supremeAutomationEngine';

describe('Supreme Automation synthetic performance', () => {
    it('deduplicates 1,000 synthetic trigger events for 100 automations without creating duplicate keys', () => {
        const keys = new Set<string>();
        for (let automation = 0; automation < 100; automation += 1) {
            for (let event = 0; event < 10; event += 1) {
                keys.add(idempotencyKey({
                    automationId: `auto-${automation}`,
                    versionId: 'v1',
                    event: 'finding.overdue',
                    sourceModel: 'VendorIssue',
                    sourceId: `finding-${event}`,
                    bucket: '2026-09-14',
                }));
                keys.add(idempotencyKey({
                    automationId: `auto-${automation}`,
                    versionId: 'v1',
                    event: 'finding.overdue',
                    sourceModel: 'VendorIssue',
                    sourceId: `finding-${event}`,
                    bucket: '2026-09-14',
                }));
            }
        }
        expect(keys.size).toBe(1000);
        const started = Date.now();
        for (let i = 0; i < 1000; i += 1) {
            evaluateConditions(
                [{ field: 'finding.severity', op: 'in', value: ['HIGH', 'CRITICAL'] }],
                { 'finding.severity': i % 2 ? 'CRITICAL' : 'LOW' },
            );
        }
        expect(Date.now() - started).toBeLessThan(1000);
    });
});
