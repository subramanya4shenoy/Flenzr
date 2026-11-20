"use client";

import Link from "next/link";
import { ArrowRight, Star, ExternalLink, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/lib/i18n/language-context";

export function SpotlightBannerMotion() {
  const { t } = useTranslation();

  return (
    <section className="py-16 border-t border-[color:var(--ui-line-neutral-800)]/80 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Large Cinematic Banner (Directly from Pinterest 00:07) */}
        <div className="relative rounded-3xl overflow-hidden bg-[color:var(--ui-paint-neutral-900)] text-[color:var(--ui-ink-ffffff)] border border-[color:var(--ui-line-neutral-800)] shadow-2xl min-h-[420px] flex flex-col justify-end p-6 sm:p-10">
          <img
            src="/images/creator-hero.jpg"
            alt="Creator workspace"
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--ui-paint-000000)] via-[color:var(--ui-paint-000000)]/40 to-transparent" />

          {/* Top Floating Badge */}
          <div className="relative z-10 flex items-center justify-between pb-12 sm:pb-16">
            <div className="h-7 inline-flex items-center justify-center gap-2 px-3.5 rounded-full bg-[color:var(--ui-paint-ffffff)]/10 backdrop-blur-md border border-[color:var(--ui-line-ffffff)]/20 text-xs font-bold text-[color:var(--ui-ink-ffffff)] leading-none">
              <Star className="w-3.5 h-3.5 text-[color:var(--ui-ink-amber-400)] fill-[color:var(--ui-ink-amber-400)]" />
              <span>BUILD YOUR CREATOR BUSINESS</span>
            </div>
            <div className="hidden sm:inline-flex items-center justify-center gap-1.5 h-7 px-3.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-[color:var(--ui-line-emerald-400)]/30 text-[color:var(--ui-ink-emerald-300)] text-xs font-bold leading-none">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Creator profiles</span>
            </div>
          </div>

          {/* Main Headline & Performance Preview */}
          <div className="relative z-10 max-w-2xl space-y-3">
            <h3 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[color:var(--ui-ink-ffffff)] leading-tight">
              {t("spotlight.title", "Gateway to high-converting creator partnerships.")}
            </h3>
            <p className="text-[color:var(--ui-ink-neutral-300)] text-xs sm:text-sm leading-relaxed max-w-lg">
              Publish your media kit, define your packages, and connect with brands.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/dashboard/brand"
                className="theme-on-accent h-12 px-7 rounded-full bg-[color:var(--ui-paint-c1121f)] hover:bg-[color:var(--ui-paint-a50e1a)] text-[color:var(--ui-ink-ffffff)] font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02] inline-flex items-center justify-center gap-2 cursor-pointer leading-none"
              >
                <span>Explore Creators</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/signup/creator"
                className="h-12 px-7 rounded-full bg-[color:var(--ui-paint-ffffff)]/10 hover:bg-[color:var(--ui-paint-ffffff)]/20 backdrop-blur-md border border-[color:var(--ui-line-ffffff)]/20 text-[color:var(--ui-ink-ffffff)] font-semibold text-xs sm:text-sm transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer leading-none"
              >
                <span>{t("spotlight.startEarning", "Start Earning — Creator Sign Up")}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>


      </div>
    </section>
  );
}
