type ApiFetchOptions = RequestInit & {
  responseType?: 'json' | 'text';
};

export function getApiBaseUrl(): string {
  const envApiUrl = import.meta.env.VITE_API_URL as string | undefined;
  const apiBase = (envApiUrl || '/api/v1').trim();
  return apiBase.replace(/\/$/, '');
}

export async function fetchApi(endpoint: string, options: ApiFetchOptions = {}) {
  const { responseType = 'json', headers: optionHeaders, ...fetchOptions } = options;

  let token = null;
  // @ts-ignore - window.Clerk is injected by ClerkProvider
  if (window.Clerk?.session) {
    try {
      // @ts-ignore
      token = await window.Clerk.session.getToken();
    } catch (e) {
      console.warn("Failed to get Clerk token", e);
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(optionHeaders as Record<string, string> | undefined),
  };

  const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
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
