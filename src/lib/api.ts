type ApiFetchOptions = RequestInit & {
  auth?: boolean;
};

type AuthTokenProvider = () => Promise<string | null>;

let authTokenProvider: AuthTokenProvider | null = null;

export function setAuthTokenProvider(provider: AuthTokenProvider | null) {
  authTokenProvider = provider;
}

export function getApiBaseUrl(): string {
  // Default to relative API base so local dev hits the backend via Vite (or same-origin nginx) instead of hardcoding the wrong port.
  const apiBase = import.meta.env.VITE_API_URL ?? '/api/v1';
  return apiBase.replace(/\/$/, '');
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

async function resolveAccessToken(): Promise<string | null> {
  if (authTokenProvider) {
    try {
      // If Clerk auth is wired, never fall back to legacy localStorage token.
      const token = await authTokenProvider();
      console.log("[api.ts] resolveAccessToken: resolved token from provider:", token ? `${token.substring(0, 15)}...` : null);
      return token;
    } catch (e) {
      console.error("[api.ts] resolveAccessToken: error calling authTokenProvider:", e);
      return null;
    }
  }

  // Legacy fallback only when no provider is configured.
  const legacyToken = getToken();
  console.log("[api.ts] resolveAccessToken: resolved token from localStorage fallback:", legacyToken ? `${legacyToken.substring(0, 15)}...` : null);
  return legacyToken;
}

export async function fetchApi(endpoint: string, options: ApiFetchOptions = {}) {
  const { auth = true, headers: optionHeaders, ...fetchOptions } = options;
  const token = auth ? await resolveAccessToken() : null;

  // If token is missing, force auth header off so endpoints that don't require auth
  // don't fail with a 401 due to header extraction mismatch.


  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(optionHeaders as Record<string, string> | undefined),
  };

  if (auth) {
    // Backend expects Bearer token in Authorization header.
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (authTokenProvider) {
      console.warn("[api.ts] fetchApi: token was null, attempting provider retry...");
      // Clerk can briefly return null during initial load; retry once before failing.
      try {
        const retryToken = await authTokenProvider();
        if (retryToken) {
          console.log("[api.ts] fetchApi: retry resolved token:", `${retryToken.substring(0, 15)}...`);
          headers.Authorization = `Bearer ${retryToken}`;
        }
      } catch (e) {
        console.error("[api.ts] fetchApi: retry error:", e);
      }
    }

    if (!headers.Authorization) {
      console.error("[api.ts] fetchApi: auth header missing, throwing Error");
      setToken(null);
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
