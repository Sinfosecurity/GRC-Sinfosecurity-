import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import { clearBrowserSessionArtifacts, getAccessToken, setAccessToken } from '../services/sessionStore';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  permissions?: string[];
  plane?: 'CUSTOMER' | 'PLATFORM';
  mfaEnabled?: boolean;
  mfaSatisfied?: boolean;
  enrollOnly?: boolean;
  nextPath?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, plane?: 'CUSTOMER' | 'PLATFORM') => Promise<Record<string, unknown>>;
  completeMfa: (challengeToken: string, code: string) => Promise<Record<string, unknown>>;
  confirmMfaEnrollment: (code: string) => Promise<Record<string, unknown>>;
  signup: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

function persist(token: string, user: User) {
  setAccessToken(token);
  localStorage.setItem('user', JSON.stringify(user));
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const existing = getAccessToken();
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (existing) {
      setToken(existing);
      setAccessToken(existing);
    }
    const confirm = existing
      ? authAPI.getCurrentUser()
      : authAPI.refreshToken().then((response) => {
          const nextToken = response.data.data.token;
          setToken(nextToken);
          setAccessToken(nextToken);
          return authAPI.getCurrentUser();
        });
    confirm
      .then((response) => {
        const next = response.data.data.user;
        setUser(next);
        localStorage.setItem('user', JSON.stringify(next));
      })
      .catch((err: { status?: number }) => {
        if (err?.status && err.status !== 401) {
          return;
        }
        if (existing && storedUser) {
          return;
        }
        setToken(null);
        setUser(null);
        clearBrowserSessionArtifacts();
        localStorage.removeItem('user');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string, plane?: 'CUSTOMER' | 'PLATFORM') => {
    const response = await authAPI.login({ email, password, plane });
    const data = response.data.data as Record<string, unknown> & { token?: string; enrollmentToken?: string; user?: User };
    if (data.enrollmentToken && data.user) {
      setToken(data.enrollmentToken);
      setUser(data.user);
      persist(data.enrollmentToken, data.user);
      return data;
    }
    if (data.token && data.user) {
      setToken(data.token);
      setUser(data.user);
      persist(data.token, data.user);
    }
    return data;
  };

  const completeMfa = async (challengeToken: string, code: string) => {
    const response = await authAPI.verifyMfa({ challengeToken, code });
    const { token: newToken, user: newUser } = response.data.data;
    setToken(newToken);
    setUser(newUser);
    persist(newToken, newUser);
    return response.data.data;
  };

  const confirmMfaEnrollment = async (code: string) => {
    const response = await authAPI.confirmMfaEnrollment(code);
    const { token: newToken, user: newUser } = response.data.data;
    setToken(newToken);
    setUser(newUser);
    persist(newToken, newUser);
    return response.data.data;
  };

  const signup = async (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
  }) => {
    const response = await authAPI.signup(input);
    const { token: newToken, user: newUser } = response.data.data;
    setToken(newToken);
    setUser(newUser);
    persist(newToken, newUser);
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Clear local session even if the server call fails.
    }
    setToken(null);
    setUser(null);
    clearBrowserSessionArtifacts();
    localStorage.removeItem('user');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        signup,
        completeMfa,
        confirmMfaEnrollment,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
