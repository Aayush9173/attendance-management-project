import type { AuthUser, UserRole } from '../types';

interface JwtPayload {
  sub?: string;
  id?: number;
  user_role?: string;
  exp?: number;
}

export function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function extractAuthUser(token: string): AuthUser | null {
  const payload = parseJwt(token);
  if (!payload || !payload.id || !payload.sub || !payload.user_role) {
    return null;
  }

  // Check if token has expired
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    return null;
  }

  const role: UserRole = payload.user_role.toLowerCase() === 'admin' ? 'admin' : 'employee';

  return {
    id: payload.id,
    username: payload.sub,
    role,
  };
}

export function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return true;
  return payload.exp * 1000 < Date.now();
}
