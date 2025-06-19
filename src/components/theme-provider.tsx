"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = "light" | "dark";

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "bookshelf-theme",
}: {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedTheme = localStorage.getItem(storageKey) as Theme | null;
        if (storedTheme && (storedTheme === "light" || storedTheme === "dark")) {
          return storedTheme;
        }
        // Fallback to system preference if supported and no stored theme
        // const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        // return prefersDark ? 'dark' : defaultTheme;
        // Keeping it simpler: use defaultTheme if no valid stored theme.
      } catch (e) {
        // localStorage might be disabled or full
        console.error("Error reading theme from localStorage", e);
      }
    }
    return defaultTheme; // Server-side default or if localStorage fails
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    try {
      localStorage.setItem(storageKey, theme);
    } catch (e) {
       console.error("Error saving theme to localStorage", e);
    }
  }, [theme, storageKey]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
