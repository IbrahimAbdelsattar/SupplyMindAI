type ApiFetchOptions = RequestInit & {
  auth?: boolean;
  responseType?: 'json' | 'text';
};

type AuthTokenProvider = () => Promise<string | null>;

let authTokenProvider: AuthTokenProvider | null = null;

/**
 * Register the Clerk token provider. Called once from AuthContext on mount.
 */
export function setAuthTokenProvider(provider: AuthTokenProvider | null) {
  authTokenProvider = provider;
}

export function getApiBaseUrl(): string {
  const envApiUrl = import.meta.env.VITE_API_URL as string | undefined;
  const apiBase = (envApiUrl || '/api/v1').trim();
  return apiBase.replace(/\/$/, '');
}

/**
 * Resolve the current access token from Clerk.
 * Clerk briefly returns null during initial load — we retry once.
 */
async function resolveAccessToken(): Promise<string | null> {
  if (!authTokenProvider) {
    return null;
  }

  try {
    const token = await authTokenProvider();
    if (token) return token;

    // Clerk can briefly return null during initial load; retry once.
    const retryToken = await authTokenProvider();
    return retryToken;
  } catch {
    return null;
  }
}

export async function fetchApi(endpoint: string, options: ApiFetchOptions = {}) {
  const { auth = true, responseType = 'json', headers: optionHeaders, ...fetchOptions } = options;
  const token = auth ? await resolveAccessToken() : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(optionHeaders as Record<string, string> | undefined),
  };

  if (auth) {
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      window.dispatchEvent(new Event('auth:unauthorized'));
      throw new Error('Missing authentication token');
    }
  }

  const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401 && auth) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
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
