import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser } from '../types';
import { authApi, type LoginCredentials } from '../api/auth';
import { extractAuthUser, isTokenExpired } from '../utils/jwt';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    localStorage.removeItem('attendance_token');
    setToken(null);
    setUser(null);
  }, []);

  // Initialize from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('attendance_token');
    if (storedToken) {
      if (isTokenExpired(storedToken)) {
        logout();
      } else {
        const authUser = extractAuthUser(storedToken);
        if (authUser) {
          setToken(storedToken);
          setUser(authUser);
        } else {
          logout();
        }
      }
    }
    setIsLoading(false);
  }, [logout]);

  // Listen for 401 events from api client
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  const login = async (credentials: LoginCredentials): Promise<AuthUser> => {
    const tokenResponse = await authApi.login(credentials);
    const newAccessToken = tokenResponse.access_token;

    const authUser = extractAuthUser(newAccessToken);
    if (!authUser) {
      throw new Error('Failed to parse authentication credentials from server token');
    }

    localStorage.setItem('attendance_token', newAccessToken);
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
