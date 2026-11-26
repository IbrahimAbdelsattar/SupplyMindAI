import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuthContext } from './AuthContext';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuthContext();
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme;
      if (stored) return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  // Load theme preference from backend
  useEffect(() => {
    if (!user) return;
    const loadSettings = async () => {
      try {
        const { fetchApi } = await import('@/lib/api');
        const res = await fetchApi('/settings');
        const s = (res as { settings?: { theme?: Theme } })?.settings || {};
        if (s.theme && (s.theme === 'light' || s.theme === 'dark')) {
          setTheme(s.theme);
        }
      } catch {
        // use default
      }
    };
    loadSettings();
  }, [user]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);

    if (!user) return;

    // Sync to backend (fire-and-forget)
    import('@/lib/api').then(({ fetchApi }) => {
      fetchApi('/settings', {
        method: 'PUT',
        body: JSON.stringify({ theme }),
      }).catch(() => {});
    });
  }, [theme, user]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
