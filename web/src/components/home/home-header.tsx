"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslation } from "@/lib/i18n/language-context";

interface AuthSession {
  provider?: string;
  email: string;
  fullName: string;
  handle: string;
  role: "creator" | "brand";
}

export function HomeHeader() {
  const { t } = useTranslation();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("flenzr_auth_session");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.email || parsed.handle)) {
            setSession(parsed);

            // 1. Check user's selected profile picture from avatar switcher
            const chosen = localStorage.getItem(`flenzr_chosen_avatar_${parsed.handle}`);
            const cached = localStorage.getItem(`flenzr_avatar_${parsed.handle}`);
            if (chosen) {
              setUserAvatar(chosen);
            } else if (cached) {
              setUserAvatar(cached);
            } else {
              // 2. Check creator profile in localStorage
              const rawProfile = localStorage.getItem("flenzr_creator_profile");
              if (rawProfile) {
                try {
                  const prof = JSON.parse(rawProfile);
                  if (prof.avatar_url || prof.avatarUrl) {
                    setUserAvatar(prof.avatar_url || prof.avatarUrl);
                  }
                } catch {}
              }
            }
          }
        } catch {}
      }
    }
  }, []);

  // Fallback: Fetch live avatar from creator public profile if handle exists
  useEffect(() => {
    if (!session?.handle || userAvatar) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8210/api/v1";
    fetch(`${apiUrl}/creators/public/${encodeURIComponent(session.handle)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.avatar_url) {
          setUserAvatar(data.avatar_url);
        }
      })
      .catch(() => {});
  }, [session?.handle, userAvatar]);

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("flenzr_auth_session");
      localStorage.removeItem("flenzr_creator_profile");
      localStorage.removeItem("flenzr_token");
      setSession(null);
      setUserAvatar(null);
      window.location.reload();
    }
  };

  return (
    <header className="relative border-b border-neutral-800/80 bg-[#09090b]/85 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Left: Brand Logo + Nav Links (natural flex flow, no overlapping) */}
        <div className="flex items-center gap-6 xl:gap-8 min-w-0">
          <Link href="/" className="flex items-center shrink-0">
            <Logo size={32} variant="duotone-dark" withWordmark={true} />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium">
            <Link
              href="#how-it-works"
              className="h-8 inline-flex items-center text-neutral-300 hover:text-white transition-colors whitespace-nowrap"
            >
              {t("nav.howItWorks", "How It Works")}
            </Link>
            <Link
              href="#collab-engine"
              className="h-8 inline-flex items-center text-neutral-300 hover:text-white transition-colors whitespace-nowrap"
            >
              {t("nav.collabEngine", "Collab Engine")}
            </Link>
            <Link
              href="#creators"
              className="h-8 inline-flex items-center text-neutral-300 hover:text-white transition-colors whitespace-nowrap"
            >
              {t("nav.creatorMarketplace", "Creator Marketplace")}
            </Link>
            <Link
              href="/sarahmiller"
              className="h-8 inline-flex items-center gap-1.5 text-neutral-300 hover:text-white transition-colors whitespace-nowrap"
            >
              <span>{t("nav.demoRateCard", "Demo Rate Card")}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-[#c1121f]/20 text-[#ff4d5a] border border-[#c1121f]/40 leading-none inline-flex items-center justify-center">
                {t("nav.earnInr", "EARN ₹")}
              </span>
            </Link>
          </nav>
        </div>

        {/* Right: Language Switcher + Auth Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Hyper-Local Language Switcher */}
          <LanguageSwitcher variant="default" />

          {mounted && session ? (
            <div className="flex items-center gap-2 sm:gap-2.5">
              <Link
                href={session.role === "brand" ? "/dashboard/brand" : "/dashboard/creator"}
                className="h-9 px-3.5 sm:px-4 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-white transition-all shadow-sm inline-flex items-center justify-center gap-2.5 leading-none text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer group"
              >
                <div className="w-5 h-5 rounded-full overflow-hidden bg-[#c1121f] text-white flex items-center justify-center text-[10px] font-extrabold uppercase shrink-0 ring-1 ring-white/20">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={session.fullName || session.handle}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span>{session.fullName?.charAt(0) || session.handle?.charAt(0) || "U"}</span>
                  )}
                </div>
                <span>
                  {session.role === "brand" ? "Brand Portal" : t("nav.creatorStudio", "Creator Studio")}
                </span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform text-neutral-400 group-hover:text-white" />
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="h-9 px-3 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors inline-flex items-center justify-center leading-none text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer"
              >
                {t("nav.signOut", "Sign Out")}
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="h-9 px-4 rounded-full text-neutral-300 hover:text-white hover:bg-neutral-800/80 transition-colors inline-flex items-center justify-center leading-none text-xs sm:text-sm font-semibold whitespace-nowrap"
              >
                {t("nav.signIn", "Sign In")}
              </Link>
              <Link
                href="/signup/creator"
                className="h-9 px-4.5 rounded-full bg-[#c1121f] hover:bg-[#a50e1a] text-white transition-all shadow-sm shadow-[#c1121f]/20 inline-flex items-center justify-center gap-1.5 leading-none text-xs sm:text-sm font-semibold whitespace-nowrap"
              >
                <span>{t("nav.joinAsInfluencer", "Join as Influencer")}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
