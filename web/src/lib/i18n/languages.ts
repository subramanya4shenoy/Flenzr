export interface Language {
  code: string;
  name: string;
  nativeName: string;
  region: "Indian" | "International";
  script: string;
  dir?: "ltr" | "rtl";
  flag?: string;
  popular?: boolean;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  // --- Indian Languages (Hyper-local) ---
  {
    code: "en",
    name: "English",
    nativeName: "English",
    region: "Indian",
    script: "Latin",
    dir: "ltr",
    flag: "🇮🇳",
    popular: true,
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    region: "Indian",
    script: "Devanagari",
    dir: "ltr",
    flag: "🇮🇳",
    popular: true,
  },
  {
    code: "kn",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    region: "Indian",
    script: "Kannada",
    dir: "ltr",
    flag: "🇮🇳",
    popular: true,
  },
  {
    code: "ta",
    name: "Tamil",
    nativeName: "தமிழ்",
    region: "Indian",
    script: "Tamil",
    dir: "ltr",
    flag: "🇮🇳",
    popular: true,
  },
  {
    code: "te",
    name: "Telugu",
    nativeName: "తెలుగు",
    region: "Indian",
    script: "Telugu",
    dir: "ltr",
    flag: "🇮🇳",
    popular: true,
  },
  {
    code: "ml",
    name: "Malayalam",
    nativeName: "മലയാളം",
    region: "Indian",
    script: "Malayalam",
    dir: "ltr",
    flag: "🇮🇳",
    popular: true,
  },
  {
    code: "mr",
    name: "Marathi",
    nativeName: "मराठी",
    region: "Indian",
    script: "Devanagari",
    dir: "ltr",
    flag: "🇮🇳",
  },
  {
    code: "bn",
    name: "Bengali",
    nativeName: "বাংলা",
    region: "Indian",
    script: "Bengali",
    dir: "ltr",
    flag: "🇮🇳",
  },
  {
    code: "gu",
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    region: "Indian",
    script: "Gujarati",
    dir: "ltr",
    flag: "🇮🇳",
  },
  {
    code: "pa",
    name: "Punjabi",
    nativeName: "ਪੰਜਾਬੀ",
    region: "Indian",
    script: "Gurmukhi",
    dir: "ltr",
    flag: "🇮🇳",
  },
  {
    code: "or",
    name: "Odia",
    nativeName: "ଓଡ଼ିଆ",
    region: "Indian",
    script: "Odia",
    dir: "ltr",
    flag: "🇮🇳",
  },

  // --- Foreign / International Languages ---
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    region: "International",
    script: "Latin",
    dir: "ltr",
    flag: "🇪🇸",
    popular: true,
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    region: "International",
    script: "Latin",
    dir: "ltr",
    flag: "🇫🇷",
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    region: "International",
    script: "Latin",
    dir: "ltr",
    flag: "🇩🇪",
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    region: "International",
    script: "Arabic",
    dir: "rtl",
    flag: "🇦🇪",
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    region: "International",
    script: "Japanese",
    dir: "ltr",
    flag: "🇯🇵",
  },
];

export const DEFAULT_LANGUAGE: Language = SUPPORTED_LANGUAGES[0];
