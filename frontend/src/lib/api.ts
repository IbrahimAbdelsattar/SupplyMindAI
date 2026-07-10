import { getAuthToken } from './auth';

type ApiFetchOptions = RequestInit & {
  responseType?: 'json' | 'text';
};

export function getApiBaseUrl(): string {
  const envApiUrl = import.meta.env.VITE_API_URL as string | undefined;
  const apiBase = (envApiUrl || '/api/v1').trim();
  return apiBase.replace(/\/$/, '');
}

// Refresh lock — prevents 4 parallel 401s from racing to rotate the refresh token
let _refreshPromise: Promise<boolean> | null = null;

async function _doRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('sm_refresh_token');
  if (!refreshToken) return false;
  try {
    const res = await fetch('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('sm_access_token', data.access_token);
    localStorage.setItem('sm_refresh_token', data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

async function _acquireRefresh(): Promise<boolean> {
  if (!_refreshPromise) {
    _refreshPromise = _doRefresh().finally(() => { _refreshPromise = null; });
  }
  return _refreshPromise;
}

export async function fetchApi(endpoint: string, options: ApiFetchOptions = {}) {
  const { responseType = 'json', headers: optionHeaders, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(optionHeaders as Record<string, string> | undefined),
  };

  // Attach JWT token if available
  const token = await getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Auth endpoints live at /auth on the backend (not under /api/v1).
  // All other endpoints use the configured API base URL.
  const url = endpoint.startsWith('/auth')
    ? endpoint
    : `${getApiBaseUrl()}${endpoint}`;

  let response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // If 401, try refreshing once (with lock) then retry
  if (response.status === 401) {
    if (await _acquireRefresh()) {
      const newToken = localStorage.getItem('sm_access_token');
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...fetchOptions,
        headers,
      });
    }
  }

  if (!response.ok) {
    // If still 401 after refresh, clear tokens and redirect
    if (response.status === 401) {
      localStorage.removeItem('sm_access_token');
      localStorage.removeItem('sm_refresh_token');
      localStorage.removeItem('sm_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API error: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  if (responseType === 'text') {
    return response.text();
  }

  return response.json();
}

export async function apiFetch<T>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  return fetchApi(endpoint, options) as Promise<T>;
}
