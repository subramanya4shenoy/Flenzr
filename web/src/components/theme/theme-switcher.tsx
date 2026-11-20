"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button type="button" className="fl-theme-switcher" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={label} title={label} aria-pressed={theme === "light"}>
      {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  );
}
