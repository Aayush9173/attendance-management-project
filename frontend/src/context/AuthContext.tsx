import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser } from '../types';
import { authApi, type LoginCredentials } from '../api/auth';
import { setAccessToken, waitForInFlightRefresh } from '../api/client';
import { extractAuthUser } from '../utils/jwt';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => void | Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(async () => {
    // 1. Immediately invalidate frontend state & session generation
    setAccessToken(null);
    setToken(null);
    setUser(null);

    try {
      // 2. Wait for any in-flight refresh to settle so the browser holds the rotated cookie
      await waitForInFlightRefresh();
      // 3. Revoke current session on backend using the rotated cookie
      await authApi.logout();
    } catch (err) {
      console.warn('Backend logout encountered an error:', err);
    } finally {
      // 4. Guarantee state remains cleared even if network fails
      setAccessToken(null);
      setToken(null);
      setUser(null);
    }
  }, []);

  // Restore session from HttpOnly refresh cookie on application startup
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const tokenResponse = await authApi.refresh();
        if (!isMounted) return;

        const newAccessToken = tokenResponse.access_token;
        const authUser = extractAuthUser(newAccessToken);

        if (authUser) {
          setAccessToken(newAccessToken);
          setToken(newAccessToken);
          setUser(authUser);
        } else {
          setAccessToken(null);
          setToken(null);
          setUser(null);
        }
      } catch {
        if (isMounted) {
          setAccessToken(null);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for auth events from api client (background refresh and session expiry)
  useEffect(() => {
    const handleUnauthorized = () => {
      setAccessToken(null);
      setToken(null);
      setUser(null);
    };

    const handleTokenRefreshed = (event: Event) => {
      const customEvent = event as CustomEvent<{ token: string }>;
      const newToken = customEvent.detail?.token;
      if (newToken) {
        const authUser = extractAuthUser(newToken);
        if (authUser) {
          setToken(newToken);
          setUser(authUser);
        }
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('auth:token-refreshed', handleTokenRefreshed);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('auth:token-refreshed', handleTokenRefreshed);
    };
  }, []);

  const login = async (credentials: LoginCredentials): Promise<AuthUser> => {
    // 1. Invalidate old session generation immediately
    setAccessToken(null);

    // 2. Wait for any in-flight refresh to settle before sending login request
    await waitForInFlightRefresh();

    // 3. Send login request with clean state
    const tokenResponse = await authApi.login(credentials);
    const newAccessToken = tokenResponse.access_token;

    const authUser = extractAuthUser(newAccessToken);
    if (!authUser) {
      throw new Error('Failed to parse authentication credentials from server token');
    }

    // 4. Store new access token in memory and React state
    setAccessToken(newAccessToken);
    setToken(newAccessToken);
    setUser(authUser);

    return authUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
