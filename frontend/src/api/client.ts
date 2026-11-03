const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers = {}, ...restOptions } = options;

  const requestHeaders = new Headers(headers);

  // If token is provided or stored, attach it
  const authToken = token !== undefined ? token : localStorage.getItem('attendance_token');
  if (authToken) {
    requestHeaders.set('Authorization', `Bearer ${authToken}`);
  }

  const url = `${API_BASE_URL}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
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
    localStorage.removeItem('attendance_token');
    window.dispatchEvent(new Event('auth:unauthorized'));
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
