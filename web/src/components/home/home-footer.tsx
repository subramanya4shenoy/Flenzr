"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslation } from "@/lib/i18n/language-context";

export function HomeFooter() {
  const { t } = useTranslation();

  return (
    <footer className="relative z-10 border-t border-[color:var(--ui-line-neutral-800)]/80 bg-[color:var(--ui-paint-070709)] mt-auto text-xs text-[color:var(--ui-ink-neutral-400)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 space-y-4">
            <Logo size={32} variant="duotone-dark" withWordmark={true} />
            <p className="text-[color:var(--ui-ink-neutral-400)] text-xs max-w-sm leading-relaxed">
              Flenzr is the hyper-local marketplace where creators monetize their audience with upfront rate cards in ₹ and brands scale high-converting sponsorship campaigns across India &amp; globally.
            </p>
            <div className="pt-2">
              <LanguageSwitcher variant="default" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="font-bold text-[color:var(--ui-ink-ffffff)] uppercase tracking-wider text-[11px]">
              For Influencers
            </div>
            <ul className="space-y-2">
              <li>
                <Link href="/signup/creator" className="hover:text-[color:var(--ui-ink-ffffff)] transition-colors">
                  {t("nav.joinAsInfluencer", "Join as Influencer")}
                </Link>
              </li>
              <li>
                <Link href="/sarahmiller" className="hover:text-[color:var(--ui-ink-ffffff)] transition-colors">
                  {t("nav.demoRateCard", "Demo Rate Card")}
                </Link>
              </li>
              <li>
                <Link href="/dashboard/creator" className="hover:text-[color:var(--ui-ink-ffffff)] transition-colors">
                  {t("nav.creatorStudio", "Creator Studio")}
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="font-bold text-[color:var(--ui-ink-ffffff)] uppercase tracking-wider text-[11px]">
              For Brands
            </div>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard/brand" className="hover:text-[color:var(--ui-ink-ffffff)] transition-colors">
                  Brand Portal
                </Link>
              </li>
              <li>
                <Link href="/dashboard/brand" className="hover:text-[color:var(--ui-ink-ffffff)] transition-colors">
                  Hire Top Creators
                </Link>
              </li>
              <li>
                <Link href="/dashboard/brand" className="hover:text-[color:var(--ui-ink-ffffff)] transition-colors">
                  Flenzr Vault Payments in ₹
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[color:var(--ui-line-neutral-800)]/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[color:var(--ui-ink-neutral-500)]">
          <div>
            © 2026 Flenzr Inc. Hyper-local marketplace for creators and brands.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sarahmiller" className="hover:text-[color:var(--ui-ink-ffffff)] transition-colors">
              Sample Rate Card Profile
            </Link>
            <span>•</span>
            <a
              href={new URL("/docs", process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8210/api/v1").toString()}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[color:var(--ui-ink-c1121f)] transition-colors"
            >
              Developer API
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
