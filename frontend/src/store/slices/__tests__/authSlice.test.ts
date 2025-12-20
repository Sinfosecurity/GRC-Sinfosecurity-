import { describe, it, expect } from 'vitest';
import authReducer, { setCredentials, clearAuth, login } from '../authSlice';

describe('authSlice', () => {
    const initialState = {
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
    };

    it('should return initial state', () => {
        expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('should handle setCredentials', () => {
        const user = {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'admin',
            organizationId: 'org1',
            permissions: [],
        };
        const token = 'test-token';
        const refreshToken = 'test-refresh-token';

        const actual = authReducer(initialState, setCredentials({ user, token, refreshToken }));
        expect(actual.user).toEqual(user);
        expect(actual.token).toEqual(token);
        expect(actual.refreshToken).toEqual(refreshToken);
        expect(actual.isAuthenticated).toBe(true);
    });

    it('should handle clearAuth', () => {
        const authenticatedState = {
            user: {
                id: '1',
                email: 'test@example.com',
                name: 'Test User',
                role: 'admin',
                organizationId: 'org1',
                permissions: [],
            },
            token: 'test-token',
            refreshToken: 'test-refresh',
            isAuthenticated: true,
            isLoading: false,
            error: null,
        };

        const actual = authReducer(authenticatedState, clearAuth());
        expect(actual).toEqual(initialState);
    });

    it('should handle login pending', () => {
        const actual = authReducer(initialState, { type: login.pending.type });
        expect(actual.isLoading).toBe(true);
        expect(actual.error).toBe(null);
    });

    it('should handle login rejected', () => {
        const error = 'Invalid credentials';
        const actual = authReducer(initialState, {
            type: login.rejected.type,
            payload: error,
        });
        expect(actual.isLoading).toBe(false);
        expect(actual.error).toBe(error);
        expect(actual.isAuthenticated).toBe(false);
    });
});
