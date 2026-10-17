"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Globe, Check, Search, X, ChevronDown, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { Language } from "@/lib/i18n/languages";

interface LanguageSwitcherProps {
  variant?: "default" | "compact" | "minimal";
  className?: string;
}

export function LanguageSwitcher({
  variant = "default",
  className = "",
}: LanguageSwitcherProps) {
  const { currentLanguage, setLanguage, languages, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<"all" | "indian" | "international">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Filter languages by search and category
  const filteredLanguages = useMemo(() => {
    return languages.filter((lang) => {
      // Tab filter
      if (selectedTab === "indian" && lang.region !== "Indian") return false;
      if (selectedTab === "international" && lang.region !== "International") return false;

      // Search filter (matches English name, native script name, or code)
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        lang.name.toLowerCase().includes(q) ||
        lang.nativeName.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q) ||
        lang.script.toLowerCase().includes(q)
      );
    });
  }, [languages, selectedTab, searchQuery]);

  const handleSelectLanguage = (code: string) => {
    setLanguage(code);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      {variant === "minimal" ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer flex items-center justify-center"
          title={`${t("common.selectLanguage")}: ${currentLanguage.nativeName} (${currentLanguage.name})`}
        >
          <Globe className="w-4 h-4" />
        </button>
      ) : variant === "compact" ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-neutral-800 hover:border-neutral-700 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-[#c1121f]" />
          <span className="font-bold">{currentLanguage.nativeName}</span>
          <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="h-9 inline-flex items-center justify-center gap-2 px-3 rounded-full border border-neutral-800 hover:border-neutral-700 bg-neutral-900/90 hover:bg-neutral-800 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer group leading-none"
        >
          <div className="w-4 h-4 rounded-full bg-[#c1121f]/20 text-[#c1121f] flex items-center justify-center shrink-0">
            <Globe className="w-2.5 h-2.5" />
          </div>
          <span className="font-bold tracking-tight text-neutral-100 leading-none">{currentLanguage.nativeName}</span>
          <ChevronDown className={`w-3 h-3 text-neutral-400 group-hover:text-white transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      )}

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#121215] border border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs"
          >
            {/* Header */}
            <div className="p-3.5 border-b border-neutral-800 bg-neutral-900/80">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-extrabold text-white text-xs">
                  <Globe className="w-3.5 h-3.5 text-[#c1121f]" />
                  <span>{t("common.selectLanguage", "Select Language")}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#c1121f]/20 text-[#c1121f] border border-[#c1121f]/30">
                  Hyper-Local
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={t("common.searchLanguage", "Search language or script...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-7 py-2 text-xs font-medium text-white focus:outline-none focus:border-[#c1121f] placeholder:text-neutral-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 mt-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedTab("all")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                    selectedTab === "all"
                      ? "bg-white text-black"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                  }`}
                >
                  All ({languages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab("indian")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    selectedTab === "indian"
                      ? "bg-[#c1121f] text-white"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                  }`}
                >
                  <span>🇮🇳 Indian</span>
                  <span className="text-[9px] opacity-80">(11)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab("international")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    selectedTab === "international"
                      ? "bg-white text-black"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                  }`}
                >
                  <span>🌐 International</span>
                  <span className="text-[9px] opacity-80">(5)</span>
                </button>
              </div>
            </div>

            {/* Language Grid / List */}
            <div className="max-h-72 overflow-y-auto p-2 space-y-1 divide-y divide-neutral-800/50">
              {filteredLanguages.length === 0 ? (
                <div className="p-6 text-center text-neutral-400 text-xs font-semibold">
                  No languages found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredLanguages.map((lang) => {
                  const isActive = currentLanguage.code === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelectLanguage(lang.code)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between group ${
                        isActive
                          ? "bg-[#c1121f]/15 border border-[#c1121f]/40"
                          : "hover:bg-neutral-850/80 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-base select-none">{lang.flag || "🌐"}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-extrabold truncate ${
                                isActive ? "text-[#c1121f]" : "text-neutral-100 group-hover:text-white"
                              }`}
                            >
                              {lang.nativeName}
                            </span>
                            {lang.region === "Indian" && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700/60">
                                {lang.script}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-400 font-medium truncate">
                            {lang.name}
                          </div>
                        </div>
                      </div>

                      {isActive && (
                        <div className="w-5 h-5 rounded-full bg-[#c1121f] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Notice */}
            <div className="p-2.5 bg-neutral-900/90 border-t border-neutral-800 text-[10px] text-neutral-400 flex items-center justify-between">
              <span className="flex items-center gap-1 font-semibold">
                <Sparkles className="w-3 h-3 text-[#c1121f]" />
                <span>Supports 11 Indian &amp; 5 Global Languages</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="font-bold text-neutral-300 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
