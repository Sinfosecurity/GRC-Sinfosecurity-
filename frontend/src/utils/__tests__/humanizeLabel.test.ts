import { describe, expect, it } from 'vitest';
import { formatShortDate, humanizeLabel } from '../humanizeLabel';

describe('humanizeLabel', () => {
    it('turns assessment enums into customer language', () => {
        expect(humanizeLabel('INITIAL_DUE_DILIGENCE')).toBe('Initial Due Diligence');
        expect(humanizeLabel('IN_PROGRESS')).toBe('In Progress');
    });
});

describe('formatShortDate', () => {
    it('formats a persisted timestamp', () => {
        expect(formatShortDate('2026-09-13T16:00:00.000Z')).toMatch(/Sep 13, 2026/);
    });
});
