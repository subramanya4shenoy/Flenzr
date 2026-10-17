"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslation } from "@/lib/i18n/language-context";

export function HomeFooter() {
  const { t } = useTranslation();

  return (
    <footer className="relative z-10 border-t border-neutral-800/80 bg-[#070709] mt-auto text-xs text-neutral-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 space-y-4">
            <Logo size={32} variant="duotone-dark" withWordmark={true} />
            <p className="text-neutral-400 text-xs max-w-sm leading-relaxed">
              Flenzr is the hyper-local marketplace where creators monetize their audience with upfront rate cards in ₹ and brands scale high-converting sponsorship campaigns across India &amp; globally.
            </p>
            <div className="pt-2">
              <LanguageSwitcher variant="default" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">
              For Influencers
            </div>
            <ul className="space-y-2">
              <li>
                <Link href="/signup/creator" className="hover:text-white transition-colors">
                  {t("nav.joinAsInfluencer", "Join as Influencer")}
                </Link>
              </li>
              <li>
                <Link href="/sarahmiller" className="hover:text-white transition-colors">
                  {t("nav.demoRateCard", "Demo Rate Card")}
                </Link>
              </li>
              <li>
                <Link href="/dashboard/creator" className="hover:text-white transition-colors">
                  {t("nav.creatorStudio", "Creator Studio")}
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">
              For Brands
            </div>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard/brand" className="hover:text-white transition-colors">
                  Brand Portal
                </Link>
              </li>
              <li>
                <Link href="/dashboard/brand" className="hover:text-white transition-colors">
                  Hire Top Creators
                </Link>
              </li>
              <li>
                <Link href="/dashboard/brand" className="hover:text-white transition-colors">
                  Flenzr Vault Payments in ₹
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500">
          <div>
            © 2026 Flenzr Inc. Hyper-local marketplace for creators and brands.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sarahmiller" className="hover:text-white transition-colors">
              Sample Rate Card Profile
            </Link>
            <span>•</span>
            <a
              href="http://localhost:8002/docs"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#c1121f] transition-colors"
            >
              Developer API
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
