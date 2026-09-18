import { describe, it, expect, vi } from 'vitest';
import { loadHomeSlice, resetHomeDashboardLoads } from '../homeDashboardLoad';

describe('Home dashboard load', () => {
    it('joins an in-flight request instead of starting a duplicate', async () => {
        resetHomeDashboardLoads();
        const work = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('live'), 20)));
        const first = loadHomeSlice('tprm.attention', work);
        const second = loadHomeSlice('tprm.attention', work);
        await expect(Promise.all([first, second])).resolves.toEqual(['live', 'live']);
        expect(work).toHaveBeenCalledTimes(1);
    });

    it('starts a new request after the previous one settles', async () => {
        resetHomeDashboardLoads();
        const work = vi.fn()
            .mockResolvedValueOnce('first')
            .mockResolvedValueOnce('second');
        await expect(loadHomeSlice('vendors.statistics', work)).resolves.toBe('first');
        await expect(loadHomeSlice('vendors.statistics', work)).resolves.toBe('second');
        expect(work).toHaveBeenCalledTimes(2);
    });
});
