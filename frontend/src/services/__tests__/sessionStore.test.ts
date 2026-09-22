import { describe, it, expect, beforeEach } from 'vitest';
import { clearBrowserSessionArtifacts, getAccessToken, setAccessToken } from '../sessionStore';

describe('sessionStore', () => {
    beforeEach(() => {
        localStorage.clear();
        clearBrowserSessionArtifacts();
    });

    it('keeps the access token in memory and removes refresh tokens from localStorage', () => {
        localStorage.setItem('refreshToken', 'legacy-refresh');
        localStorage.setItem('token', 'legacy-access');
        setAccessToken('memory-access');
        expect(getAccessToken()).toBe('memory-access');
        expect(localStorage.getItem('refreshToken')).toBeNull();
        clearBrowserSessionArtifacts();
        expect(getAccessToken()).toBeNull();
    });
});
