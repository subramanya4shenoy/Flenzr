"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

export type Theme = "light" | "dark";
const KEY = "flenzr_theme";
const EVENT = "flenzr-theme-change";
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null);

function apply(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f5f6f9" : "#09090b");
}

function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    apply(event.newValue === "light" ? "light" : "dark");
    listener();
  };
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", storage);
  };
}

const snapshot = (): Theme => document.documentElement.dataset.theme === "light" ? "light" : "dark";

export function ThemeProvider({ children, initialTheme }: { children: ReactNode; initialTheme: Theme }) {
  const theme = useSyncExternalStore(subscribe, snapshot, () => initialTheme);
  function setTheme(next: Theme) {
    apply(next);
    try { localStorage.setItem(KEY, next); } catch { /* The switch works when storage is blocked. */ }
    try {
      document.cookie = `${KEY}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    } catch { /* A session-only preference still works. */ }
    window.dispatchEvent(new Event(EVENT));
  }
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeProvider is required");
  return context;
}
