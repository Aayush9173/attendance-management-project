const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

let inMemoryToken: string | null = null;
let sessionGeneration = 0;
let refreshPromise: Promise<string> | null = null;

export function getAccessToken(): string | null {
  return inMemoryToken;
}

export function setAccessToken(token: string | null): void {
  inMemoryToken = token;
  if (token === null) {
    sessionGeneration++;
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  token?: string | null;
  _retry?: boolean;
}

function isAuthEndpoint(endpoint: string): boolean {
  const normalized = endpoint.toLowerCase();
  return (
    normalized.includes('/auth/login') ||
    normalized.includes('/auth/refresh') ||
    normalized.includes('/auth/logout')
  );
}

async function executeRefresh(generationAtStart: number): Promise<string> {
  try {
    const data = await rawRefreshToken();

    // Stale check: If logout or a re-login occurred while network request was in flight
    if (sessionGeneration !== generationAtStart) {
      throw new ApiError('Session was terminated during refresh.', 401);
    }

    const newAccessToken = data.access_token;
    inMemoryToken = newAccessToken;

    window.dispatchEvent(
      new CustomEvent('auth:token-refreshed', { detail: { token: newAccessToken } })
    );

    return newAccessToken;
  } catch (error) {
    // Only clear and dispatch unauthorized if session was not already intentionally invalidated
    if (sessionGeneration === generationAtStart) {
      setAccessToken(null);
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw error;
  }
}

export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const generationAtStart = sessionGeneration;

  const currentPromise = executeRefresh(generationAtStart).finally(() => {
    // Promise identity check guarantees cleanup on both success and failure
    if (refreshPromise === currentPromise) {
      refreshPromise = null;
    }
  });

  refreshPromise = currentPromise;
  return currentPromise;
}

export async function waitForInFlightRefresh(): Promise<void> {
  if (refreshPromise) {
    try {
      await refreshPromise;
    } catch {
      // Swallowed: if refresh failed, session is already invalid
    }
  }
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, _retry, headers = {}, ...restOptions } = options;

  const requestHeaders = new Headers(headers);

  // If token is provided or stored in memory, attach it
  const authToken = token !== undefined ? token : getAccessToken();
  if (authToken) {
    requestHeaders.set('Authorization', `Bearer ${authToken}`);
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const requestGeneration = sessionGeneration;

  let response: Response;
  try {
    response = await fetch(url, {
      credentials: restOptions.credentials || 'include',
      ...restOptions,
      headers: requestHeaders,
    });
  } catch (err) {
    throw new ApiError(
      'Unable to connect to the backend server. Please verify the FastAPI service is running on port 8000.',
      0,
      err
    );
  }

  // Handle 401 Unauthorized - token expired or invalid
  if (response.status === 401) {
    // Stale request check: if session changed since request was initiated, reject immediately
    if (requestGeneration !== sessionGeneration) {
      throw new ApiError('Request cancelled: session was terminated.', 401);
    }

    // If request is eligible for automatic refresh
    if (!isAuthEndpoint(endpoint) && !_retry) {
      let newAccessToken: string;
      try {
        newAccessToken = await refreshAccessToken();
      } catch (refreshErr) {
        throw new ApiError('Session expired. Please log in again.', 401, refreshErr);
      }

      // Check if session was terminated while waiting for refresh
      if (sessionGeneration !== requestGeneration) {
        throw new ApiError('Request cancelled: session was terminated during refresh.', 401);
      }

      // Retry original request exactly once with the new access token
      return apiClient<T>(endpoint, {
        ...options,
        _retry: true,
        token: newAccessToken,
      });
    }

    // Retried request that failed again, or refresh endpoint failure
    if (_retry || endpoint.includes('/auth/refresh')) {
      setAccessToken(null);
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
  }

  // Parse response body
  const contentType = response.headers.get('content-type') || '';
  let responseData: any = null;

  if (contentType.includes('application/json')) {
    responseData = await response.json();
  } else {
    responseData = await response.text();
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;

    if (responseData) {
      if (typeof responseData === 'object' && responseData.detail) {
        if (typeof responseData.detail === 'string') {
          errorMessage = responseData.detail;
        } else if (Array.isArray(responseData.detail)) {
          // FastAPI validation errors
          errorMessage = responseData.detail
            .map((d: any) => `${d.loc ? d.loc.join('.') : 'field'}: ${d.msg}`)
            .join('; ');
        }
      } else if (typeof responseData === 'string' && responseData.length > 0) {
        errorMessage = responseData;
      }
    }

    throw new ApiError(errorMessage, response.status, responseData);
  }

  return responseData as T;
}

/**
 * Dedicated raw fetch for refresh operation directly against /auth/refresh.
 * Does NOT go through apiClient or normal interceptors to avoid circular calls.
 */
export async function rawRefreshToken(): Promise<{ access_token: string; token_type: string }> {
  const url = `${API_BASE_URL}/auth/refresh`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (err) {
    throw new ApiError(
      'Unable to connect to the backend server. Please verify the FastAPI service is running on port 8000.',
      0,
      err
    );
  }

  const contentType = response.headers.get('content-type') || '';
  let responseData: any = null;

  if (contentType.includes('application/json')) {
    responseData = await response.json();
  } else {
    responseData = await response.text();
  }

  if (!response.ok) {
    let errorMessage = `Refresh failed with status ${response.status}`;

    if (responseData) {
      if (typeof responseData === 'object' && responseData.detail) {
        if (typeof responseData.detail === 'string') {
          errorMessage = responseData.detail;
        } else if (Array.isArray(responseData.detail)) {
          errorMessage = responseData.detail
            .map((d: any) => `${d.loc ? d.loc.join('.') : 'field'}: ${d.msg}`)
            .join('; ');
        }
      } else if (typeof responseData === 'string' && responseData.length > 0) {
        errorMessage = responseData;
      }
    }

    throw new ApiError(errorMessage, response.status, responseData);
  }

  return responseData as { access_token: string; token_type: string };
}
