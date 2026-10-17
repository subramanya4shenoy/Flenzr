"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { Language, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from "./languages";
import { TRANSLATIONS, TranslationDictionary } from "./translations";

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (code: string) => void;
  t: (path: string, fallback?: string) => string;
  dir: "ltr" | "rtl";
  languages: Language[];
}

const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (path, fallback) => fallback || path,
  dir: "ltr",
  languages: SUPPORTED_LANGUAGES,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLangCode, setCurrentLangCode] = useState<string>("en");
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("flenzr_locale");
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        setCurrentLangCode(saved);
      } else {
        // Detect browser language if it matches one of our supported codes
        const navLang = navigator.language.split("-")[0]?.toLowerCase();
        if (navLang && SUPPORTED_LANGUAGES.some((l) => l.code === navLang)) {
          setCurrentLangCode(navLang);
        }
      }
    }
  }, []);

  const currentLanguage = useMemo(() => {
    return (
      SUPPORTED_LANGUAGES.find((l) => l.code === currentLangCode) || DEFAULT_LANGUAGE
    );
  }, [currentLangCode]);

  // Keep html lang and dir attributes in sync
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = currentLanguage.code;
      document.documentElement.dir = currentLanguage.dir || "ltr";
    }
  }, [currentLanguage]);

  const setLanguage = (code: string) => {
    if (SUPPORTED_LANGUAGES.some((l) => l.code === code)) {
      setCurrentLangCode(code);
      if (typeof window !== "undefined") {
        localStorage.setItem("flenzr_locale", code);
      }
    }
  };

  // Translation resolver: e.g. t("nav.howItWorks") or t("hero.titleHighlight")
  const t = (path: string, fallback?: string): string => {
    const keys = path.split(".");
    const langDict: any = TRANSLATIONS[currentLangCode] || TRANSLATIONS.en;
    const fallbackDict: any = TRANSLATIONS.en;

    let value = langDict;
    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        value = undefined;
        break;
      }
    }

    if (typeof value === "string") {
      return value;
    }

    // Fallback to English dictionary
    let fallbackVal = fallbackDict;
    for (const key of keys) {
      if (fallbackVal && typeof fallbackVal === "object" && key in fallbackVal) {
        fallbackVal = fallbackVal[key];
      } else {
        fallbackVal = undefined;
        break;
      }
    }

    if (typeof fallbackVal === "string") {
      return fallbackVal;
    }

    return fallback || path;
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        t,
        dir: currentLanguage.dir || "ltr",
        languages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

// Alias for convenience
export const useTranslation = useLanguage;
