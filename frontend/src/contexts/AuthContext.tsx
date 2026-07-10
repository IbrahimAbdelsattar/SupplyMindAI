import React, { createContext, useContext, useCallback, useEffect, useState, useRef } from 'react';

export type AppRole = 'admin' | 'manager' | 'analyst' | 'viewer';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
}

interface AuthContextType {
  user: AuthUser | null;
  userRole: AppRole | null;
  isDomainValid: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
  refreshAccessToken: () => Promise<string | null>;
}

const ACCESS_TOKEN_KEY = 'sm_access_token';
const REFRESH_TOKEN_KEY = 'sm_refresh_token';
const USER_KEY = 'sm_user';

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthContextProvider');
  }
  return context;
};

export const AuthContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<AuthUser | null>(loadStoredUser);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: validate stored access token by decoding it locally
  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const storedUser = loadStoredUser();

    if (!token || !storedUser) {
      clearTokens();
      setUserState(null);
      setIsLoading(false);
      return;
    }

    // Decode JWT locally to check expiry
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp && payload.exp < now) {
        // Token expired — attempt refresh (then always set loading done)
        refreshAccessToken().finally(() => {
          setIsLoading(false);
        });
        return;
      }

      // Token valid — schedule refresh before expiry
      setUserState(storedUser);
      scheduleRefresh(payload.exp);
      setIsLoading(false);
    } catch {
      clearTokens();
      setUserState(null);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scheduleRefresh(expiresAt: number) {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    const now = Math.floor(Date.now() / 1000);
    // Refresh 60s before expiry, but at least in 5s
    const delayMs = Math.max((expiresAt - now - 60) * 1000, 5000);

    refreshTimerRef.current = setTimeout(() => {
      refreshAccessToken().catch(() => {
        clearTokens();
        setUserState(null);
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      });
    }, delayMs);
  }

  const _ctxRefreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (_ctxRefreshPromiseRef.current) return _ctxRefreshPromiseRef.current;

    const promise = _doCtxRefresh();
    _ctxRefreshPromiseRef.current = promise;
    promise.finally(() => { _ctxRefreshPromiseRef.current = null; });
    return promise;
  }, []);

  const _doCtxRefresh = useCallback(async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;

    try {
      const res = await fetch('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) throw new Error('Refresh failed');

      const data = await res.json();
      storeTokens(data.access_token, data.refresh_token);

      // Decode new access token to schedule next refresh
      try {
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        scheduleRefresh(payload.exp);
      } catch { /* ignore decode errors */ }

      return data.access_token;
    } catch {
      clearTokens();
      setUserState(null);
      return null;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let err: any;
      try {
        err = await res.json();
      } catch {
        err = { detail: 'Login failed' };
      }
      
      console.error('[Login Failed Details]:', err);
      
      let errorMsg = 'Login failed';
      if (err && err.detail) {
        if (typeof err.detail === 'string') {
          errorMsg = err.detail;
        } else if (Array.isArray(err.detail)) {
          errorMsg = err.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
        } else if (typeof err.detail === 'object') {
          errorMsg = err.detail.message || JSON.stringify(err.detail);
        }
      } else if (err && err.message) {
        errorMsg = err.message;
      }
      
      throw new Error(errorMsg);
    }

    const data = await res.json();
    const authUser: AuthUser = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      role: data.user.role as AppRole,
    };

    storeTokens(data.access_token, data.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    setUserState(authUser);

    // Schedule refresh
    try {
      const payload = JSON.parse(atob(data.access_token.split('.')[1]));
      scheduleRefresh(payload.exp);
    } catch { /* ignore */ }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    // Best-effort server-side logout (blacklist refresh token)
    if (refreshToken) {
      try {
        await fetch('/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch { /* ignore — local cleanup still happens */ }
    }

    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    clearTokens();
    setUserState(null);
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return null;

    // Check if expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        const newToken = await refreshAccessToken();
        return newToken;
      }
    } catch {
      return null;
    }

    return token;
  }, [refreshAccessToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole: user?.role ?? null,
        isDomainValid: true,
        isLoading,
        login,
        logout,
        getToken,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
