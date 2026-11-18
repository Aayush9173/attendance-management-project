const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const NETWORK_ERROR_MESSAGE =
  'Unable to reach the server. Please check your connection and try again.';

function isHtmlPayload(contentType: string, rawText: string): boolean {
  const normalizedType = contentType.toLowerCase();
  if (normalizedType.includes('text/html') || normalizedType.includes('application/xhtml+xml')) {
    return true;
  }
  const trimmed = rawText.replace(/^\uFEFF/, '').trimStart().toLowerCase();
  return trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html');
}

function getFallbackErrorMessage(status: number, isHtml: boolean, defaultPrefix: string): string {
  if (status === 502 || status === 503 || status === 504) {
    return 'The server is temporarily unavailable. Please wait a few seconds and try again.';
  }
  if (status === 404 && isHtml) {
    return 'The requested API endpoint could not be reached. Please try again or contact an administrator.';
  }
  if (isHtml) {
    return `Unexpected server response (HTTP ${status}). Please try again.`;
  }
  return `${defaultPrefix} ${status}`;
}

async function parseResponseBody(
  response: Response,
  defaultErrorPrefix: string
): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();
  const trimmedText = rawText.trim();
  const htmlDetected = isHtmlPayload(contentType, rawText);
  const expectsJson = contentType.toLowerCase().includes('application/json');

  let responseData: any = null;
  let jsonParseFailed = false;

  if (trimmedText.length > 0 && !htmlDetected) {
    if (expectsJson) {
      try {
        responseData = JSON.parse(rawText);
      } catch {
        jsonParseFailed = true;
      }
    } else {
      responseData = rawText;
    }
  }

  if (!response.ok) {
    let errorMessage = getFallbackErrorMessage(response.status, htmlDetected, defaultErrorPrefix);
    const isGatewayError =
      response.status === 502 || response.status === 503 || response.status === 504;

    if (!htmlDetected && !jsonParseFailed && responseData) {
      if (typeof responseData === 'object' && responseData.detail) {
        if (typeof responseData.detail === 'string') {
          errorMessage = responseData.detail;
        } else if (Array.isArray(responseData.detail)) {
          // FastAPI validation errors
          errorMessage = responseData.detail
            .map((d: any) => `${d.loc ? d.loc.join('.') : 'field'}: ${d.msg}`)
            .join('; ');
        }
      } else if (!isGatewayError && typeof responseData === 'string' && responseData.length > 0) {
        errorMessage = responseData;
      }
    }

    throw new ApiError(errorMessage, response.status, htmlDetected ? null : responseData);
  }

  if (htmlDetected) {
    throw new ApiError(
      'Received an unexpected HTML response from the server instead of API data. Please try again.',
      response.status
    );
  }

  if (jsonParseFailed) {
    throw new ApiError(
      'Received an invalid response from the server. Please try again.',
      response.status
    );
  }

  return responseData;
}

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
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0, err);
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

  const responseData = await parseResponseBody(response, 'Request failed with status');
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
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0, err);
  }

  const responseData = await parseResponseBody(response, 'Refresh failed with status');
  return responseData as { access_token: string; token_type: string };
}
