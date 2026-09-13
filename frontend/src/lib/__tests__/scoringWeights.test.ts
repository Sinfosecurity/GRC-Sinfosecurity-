import { describe, expect, it } from 'vitest';
import {
    ENGINE_RATING_BANDS,
    mergeScoringWeights,
    ratingBandsAreValid,
    scoringWeightsEqual,
    SUPREME_DEFAULT_WEIGHTS,
    validateScoringWeights,
} from '../scoringWeights';

describe('scoring weights', () => {
    it('fills omitted keys from the Supreme default without inventing new formula fields', () => {
        const merged = mergeScoringWeights({ findingPoints: { HIGH: 20 } });
        expect(merged.findingPoints.HIGH).toBe(20);
        expect(merged.findingPoints.CRITICAL).toBe(SUPREME_DEFAULT_WEIGHTS.findingPoints.CRITICAL);
        expect(merged.tierBase).toEqual(SUPREME_DEFAULT_WEIGHTS.tierBase);
    });

    it('rejects negative, non-numeric, or unbounded drafts before publish', () => {
        expect(validateScoringWeights(SUPREME_DEFAULT_WEIGHTS)).toBeNull();
        expect(validateScoringWeights({ ...SUPREME_DEFAULT_WEIGHTS, fourthPartyPoints: -1 })).toMatch(/zero or greater/i);
        expect(validateScoringWeights({ ...SUPREME_DEFAULT_WEIGHTS, fourthPartyPoints: Number.NaN })).toMatch(/finite/i);
        expect(validateScoringWeights({ ...SUPREME_DEFAULT_WEIGHTS, fourthPartyPoints: Number.POSITIVE_INFINITY })).toMatch(/finite/i);
        expect(validateScoringWeights({ ...SUPREME_DEFAULT_WEIGHTS, fourthPartyPoints: 10001 })).toMatch(/bounded/i);
    });

    it('keeps engine rating bands contiguous and non-overlapping', () => {
        expect(ratingBandsAreValid(ENGINE_RATING_BANDS)).toBe(true);
    });

    it('treats an unchanged merge as equal to the published default', () => {
        expect(scoringWeightsEqual(mergeScoringWeights({}), SUPREME_DEFAULT_WEIGHTS)).toBe(true);
    });
});
