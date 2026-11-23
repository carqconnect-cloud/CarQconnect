"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'fioner_superadmin_theme';
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    let initial: Theme = 'dark';
    try {
      const stored = (localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('fioner-theme')) as Theme | null;
      if (stored === 'light' || stored === 'dark') {
        initial = stored;
      } else {
        initial = 'dark';
      }
    } catch {
      initial = 'dark';
    }

    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
        localStorage.setItem('fioner-theme', next);
      } catch {}
      document.documentElement.setAttribute('data-theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Provide safe fallback if accessed outside Provider
    return {
      theme: 'dark' as Theme,
      toggleTheme: () => {
        if (typeof document !== 'undefined') {
          const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', cur);
          document.documentElement.classList.toggle('dark', cur === 'dark');
        }
      }
    };
  }
  return ctx;
};
