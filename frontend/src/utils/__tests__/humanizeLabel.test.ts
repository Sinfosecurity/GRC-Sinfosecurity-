import { describe, expect, it } from 'vitest';
import { humanizeEventType, humanizeLabel } from '../humanizeLabel';

describe('customer-facing AI labels', () => {
    it('humanizes canonical enums and keeps public IDs', () => {
        expect(humanizeLabel('NOT_CLASSIFIED')).toBe('Not Classified');
        expect(humanizeLabel('APPROVED_WITH_CONDITIONS')).toBe('Approved with Conditions');
        expect(humanizeLabel('NOT_TESTED')).toBe('Not Tested');
        expect(humanizeLabel('NOT_REVIEWED')).toBe('Not Reviewed');
        expect(humanizeLabel('HUMAN_IN_THE_LOOP')).toBe('Human in the Loop');
        expect(humanizeLabel('NOT_RECORDED')).toBe('Not Recorded');
        expect(humanizeLabel('PENDING_REVIEW')).toBe('Under Review');
        expect(humanizeLabel('SATISFIED_BY')).toBe('Mapped to Control');
        expect(humanizeLabel('SUPPORTED_BY')).toBe('Supported by Evidence');
        expect(humanizeLabel('CLEAN')).toBe('Ready');
        expect(humanizeLabel('PENDING_SCAN')).toBe('Security check in progress');
        expect(humanizeLabel('QUARANTINED')).toBe('Blocked');
        expect(humanizeLabel('INFECTED')).toBe('Blocked');
        expect(humanizeLabel('FAILED')).toBe('Scan failed');
        expect(humanizeLabel('UNKNOWN')).toBe('Security status unavailable');
        expect(humanizeLabel('UNAVAILABLE')).toBe('Security status unavailable');
        expect(humanizeLabel('INITIAL_DUE_DILIGENCE')).toBe('Initial Due Diligence');
        expect(humanizeLabel('AI-00001')).toBe('AI-00001');
        expect(humanizeLabel('Unknown / Not recorded')).toBe('Unknown / Not recorded');
    });

    it('turns dotted event codes into customer language', () => {
        expect(humanizeEventType('assessment.assigned')).toBe('Assessment Assigned');
        expect(humanizeEventType('vendor.review.started')).toBe('Vendor Review Started');
        expect(humanizeEventType('finding.confirmed')).toBe('Finding Confirmed');
        expect(humanizeLabel('assessment.assigned')).toBe('Assessment Assigned');
    });
});
