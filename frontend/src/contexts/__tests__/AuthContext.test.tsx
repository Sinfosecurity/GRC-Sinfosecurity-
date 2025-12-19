import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with no user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('updates user and token on login', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER' as const,
      organizationId: 'org1',
    };

    act(() => {
      result.current.updateUser(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
  });

  it('clears user and token on logout', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER' as const,
      organizationId: 'org1',
    };

    act(() => {
      result.current.updateUser(mockUser);
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('persists auth state to localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER' as const,
      organizationId: 'org1',
    };

    act(() => {
      result.current.updateUser(mockUser);
    });

    expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
  });
});
