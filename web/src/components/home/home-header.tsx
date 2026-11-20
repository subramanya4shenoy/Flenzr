"use client";

import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslation } from "@/lib/i18n/language-context";
import { useAuthSession } from "@/lib/use-auth-session";

export function HomeHeader() {
  const { t } = useTranslation();
  const { session, userAvatar, mounted, profileHref, signOut } = useAuthSession();

  return (
    <header className="relative border-b border-[color:var(--ui-line-neutral-800)]/80 bg-[color:var(--ui-paint-09090b)]/85 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Left: Brand Logo + Nav Links (natural flex flow, no overlapping) */}
        <div className="flex items-center gap-6 xl:gap-8 min-w-0">
          <Link
            href={profileHref}
            className="flex items-center shrink-0"
            title={session ? (session.role === "brand" ? "Brand Portal" : t("nav.creatorStudio", "Creator Studio")) : "Flenzr Home"}
          >
            <Logo size={32} variant="duotone-dark" withWordmark={true} />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium">
            <Link
              href="#how-it-works"
              className="h-8 inline-flex items-center text-[color:var(--ui-ink-neutral-300)] hover:text-[color:var(--ui-ink-ffffff)] transition-colors whitespace-nowrap"
            >
              {t("nav.howItWorks", "How It Works")}
            </Link>
            <Link
              href="#collab-engine"
              className="h-8 inline-flex items-center text-[color:var(--ui-ink-neutral-300)] hover:text-[color:var(--ui-ink-ffffff)] transition-colors whitespace-nowrap"
            >
              {t("nav.collabEngine", "Collab Engine")}
            </Link>
            <Link
              href="#creators"
              className="h-8 inline-flex items-center text-[color:var(--ui-ink-neutral-300)] hover:text-[color:var(--ui-ink-ffffff)] transition-colors whitespace-nowrap"
            >
              {t("nav.creatorMarketplace", "Creator Marketplace")}
            </Link>
            <Link
              href="/sarahmiller"
              className="h-8 inline-flex items-center gap-1.5 text-[color:var(--ui-ink-neutral-300)] hover:text-[color:var(--ui-ink-ffffff)] transition-colors whitespace-nowrap"
            >
              <span>{t("nav.demoRateCard", "Demo Rate Card")}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-[color:var(--ui-paint-c1121f)]/20 text-[color:var(--ui-ink-ff4d5a)] border border-[color:var(--ui-line-c1121f)]/40 leading-none inline-flex items-center justify-center">
                {t("nav.earnInr", "EARN ₹")}
              </span>
            </Link>
          </nav>
        </div>

        {/* Right: Language Switcher + Auth Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Hyper-Local Language Switcher */}
          <ThemeSwitcher /><LanguageSwitcher variant="default" />

          {mounted && session ? (
            <div className="flex items-center gap-2 sm:gap-2.5">
              <Link
                href={profileHref}
                className="h-9 px-3.5 sm:px-4 rounded-full bg-[color:var(--ui-paint-neutral-900)] hover:bg-[color:var(--ui-paint-neutral-800)] border border-[color:var(--ui-line-neutral-800)] hover:border-[color:var(--ui-line-neutral-700)] text-[color:var(--ui-ink-ffffff)] transition-all shadow-sm inline-flex items-center justify-center gap-2.5 leading-none text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer group"
              >
                <div className="theme-on-accent w-5 h-5 rounded-full overflow-hidden bg-[color:var(--ui-paint-c1121f)] text-[color:var(--ui-ink-ffffff)] flex items-center justify-center text-[10px] font-extrabold uppercase shrink-0 ring-1 ring-[color:var(--ui-line-ffffff)]/20">
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
                <ArrowRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform text-[color:var(--ui-ink-neutral-400)] group-hover:text-[color:var(--ui-ink-ffffff)]" />
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="h-9 px-3 rounded-full text-[color:var(--ui-ink-neutral-400)] hover:text-[color:var(--ui-ink-ffffff)] hover:bg-[color:var(--ui-paint-neutral-800)]/80 transition-colors inline-flex items-center justify-center leading-none text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer"
              >
                {t("nav.signOut", "Sign Out")}
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="h-9 px-4 rounded-full text-[color:var(--ui-ink-neutral-300)] hover:text-[color:var(--ui-ink-ffffff)] hover:bg-[color:var(--ui-paint-neutral-800)]/80 transition-colors inline-flex items-center justify-center leading-none text-xs sm:text-sm font-semibold whitespace-nowrap"
              >
                {t("nav.signIn", "Sign In")}
              </Link>
              <Link
                href="/signup/creator"
                className="theme-on-accent h-9 px-4.5 rounded-full bg-[color:var(--ui-paint-c1121f)] hover:bg-[color:var(--ui-paint-a50e1a)] text-[color:var(--ui-ink-ffffff)] transition-all shadow-sm shadow-[#c1121f]/20 inline-flex items-center justify-center gap-1.5 leading-none text-xs sm:text-sm font-semibold whitespace-nowrap"
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

