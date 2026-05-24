"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export const THEME_STORAGE_KEY = "issp-theme";

export const THEMES = [
  {
    id: "system-light",
    name: "System Light",
    background: "#FFFFFF",
    secondary: "#F5F5F7",
    border: "#D2D2D7",
  },
  {
    id: "system-dark",
    name: "System Dark",
    background: "#000000",
    secondary: "#161618",
    border: "#38383A",
  },
  {
    id: "warm-light",
    name: "Warm Light",
    background: "#FAFAF7",
    secondary: "#F2F1EC",
    border: "#E5E3DC",
  },
  {
    id: "warm-dark",
    name: "Warm Dark",
    background: "#1C1A17",
    secondary: "#201E1B",
    border: "#383430",
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "system-light";

export function isThemeId(value: string | null): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

function applyThemeClass(theme: ThemeId) {
  const root = document.documentElement;
  root.classList.remove(...THEMES.map((item) => `theme-${item.id}`));
  root.classList.add(`theme-${theme}`);
}

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  });

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme(nextTheme) {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        setThemeState(nextTheme);
        applyThemeClass(nextTheme);
      },
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
