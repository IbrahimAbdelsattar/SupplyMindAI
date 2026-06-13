const API_BASE = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');

type ApiFetchOptions = RequestInit & {
  auth?: boolean;
};

export function getApiBaseUrl() {
  return API_BASE;
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('access_token', token);
    return;
  }

  localStorage.removeItem('access_token');
}

export function getToken(): string | null {
  return localStorage.getItem('access_token');
}

export async function fetchApi(endpoint: string, options: ApiFetchOptions = {}) {
  const { auth = true, headers: optionHeaders, ...fetchOptions } = options;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(optionHeaders as Record<string, string> | undefined),
  };

  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401 && auth) {
      setToken(null);
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw new Error(errorData.detail || `API error: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function apiFetch<T>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  return fetchApi(endpoint, options) as Promise<T>;
}
