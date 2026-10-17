"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Star, ExternalLink, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/lib/i18n/language-context";

const BRAND_LOGOS = [
  "BoAt Lifestyle",
  "Nykaa",
  "Zomato",
  "Myntra",
  "Swiggy",
  "Mamaearth",
  "Lenskart",
  "Tata CliQ",
];

export function SpotlightBannerMotion() {
  const { t } = useTranslation();

  return (
    <section className="py-16 border-t border-neutral-800/80 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Large Cinematic Banner (Directly from Pinterest 00:07) */}
        <div className="relative rounded-3xl overflow-hidden bg-neutral-900 text-white border border-neutral-800 shadow-2xl min-h-[420px] flex flex-col justify-end p-6 sm:p-10">
          <img
            src="/images/creator-hero.jpg"
            alt="Sarah Miller"
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

          {/* Top Floating Badge */}
          <div className="relative z-10 flex items-center justify-between pb-12 sm:pb-16">
            <div className="h-7 inline-flex items-center justify-center gap-2 px-3.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-white leading-none">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{t("spotlight.badge", "SPOTLIGHT CREATOR OF THE WEEK")}</span>
            </div>
            <div className="hidden sm:inline-flex items-center justify-center gap-1.5 h-7 px-3.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 text-emerald-300 text-xs font-bold leading-none">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t("spotlight.verified", "Verified Creator ID")}</span>
            </div>
          </div>

          {/* Main Headline & Performance Preview */}
          <div className="relative z-10 max-w-2xl space-y-3">
            <h3 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {t("spotlight.title", "Gateway to high-converting creator partnerships.")}
            </h3>
            <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed max-w-lg">
              {t("spotlight.subtext", "Meet Sarah Miller — tech creator driving ₹12L+ in campaign sales for electronics brands. Hire vetted influencers directly with guaranteed ROI and zero middleman markups.")}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/sarahmiller"
                className="h-12 px-7 rounded-full bg-[#c1121f] hover:bg-[#a50e1a] text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02] inline-flex items-center justify-center gap-2 cursor-pointer leading-none"
              >
                <span>{t("spotlight.viewRateCard", "View Rate Card & Performance")}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/signup/creator"
                className="h-12 px-7 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-semibold text-xs sm:text-sm transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer leading-none"
              >
                <span>{t("spotlight.startEarning", "Start Earning — Creator Sign Up")}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Brand Logos Infinite Ticker (Trusted by the best) */}
        <div className="pt-12 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-6">
            Trusted by fast-growing brands across India
          </p>

          <div className="flex items-center justify-center flex-wrap gap-4 sm:gap-8 text-neutral-300 font-extrabold text-sm sm:text-base">
            {BRAND_LOGOS.map((brand) => (
              <motion.div
                key={brand}
                whileHover={{ scale: 1.05, color: "#ffffff" }}
                className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white shadow-xs cursor-default transition-colors"
              >
                {brand}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
