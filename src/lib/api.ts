const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export function getApiBaseUrl() {
    return API_BASE;
}

export function setToken(token: string) {
    localStorage.setItem('access_token', token);
}

export function getToken(): string | null {
    return localStorage.getItem('access_token');
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
    const token = getToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API error: ${response.status}`);
    }

    return response.json();
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return fetchApi(endpoint, options) as Promise<T>;
}
