"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check, QrCode } from "lucide-react";
import { useTranslation } from "@/lib/i18n/language-context";

interface CardItem {
  id: string;
  name: string;
  tag: string;
  stats: string;
  rating: string;
  package: string;
  rate: string;
  image?: string;
  isCenterpiece?: boolean;
  isQR?: boolean;
  fan: {
    rotate: number;
    y: number;
  };
}

const CARDS: CardItem[] = [
  { id: "profile", name: "Your creator profile", tag: "Media Kit", stats: "Connect your socials", rating: "Not rated yet", package: "Publish your packages", rate: "Set your rate", image: "/images/creator-hero.jpg", fan: { rotate: -8, y: 10 } },
  { id: "campaign", name: "Your next collaboration", tag: "Brand Collab", stats: "No active deals", rating: "", package: "Manage briefs and drafts", rate: "Get started", image: "/images/brand-collab.jpg", isCenterpiece: true, fan: { rotate: 0, y: -8 } },
  { id: "links", name: "Your shareable media kit", tag: "Bio Link", stats: "Build your portfolio", rating: "", package: "Connect with brands", rate: "Create your profile", image: "/images/creator-lifestyle.jpg", fan: { rotate: 8, y: 10 } },
];

export function HeroMotionDeck() {
  const { t } = useTranslation();

  return (
    <section className="pt-10 sm:pt-16 pb-20 overflow-hidden text-center">
      {/* Minimal Confident Headline */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.h1
          initial={{ opacity: 0, y: 22, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.08] mb-4"
        >
          {t("hero.headline", "A place to display your influence.")}
        </motion.h1>
      </div>

      {/* Fanned Card Showcase Container with Floating Speech Tags */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-6">
        {/* Floating Speech Tag 1 - Left (@sarahmiller) */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 14,
            delay: 0.65,
          }}
          className="hidden md:flex absolute top-2 left-[12%] z-30 items-center pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative h-7 px-3.5 rounded-full inline-flex items-center justify-center bg-[#c1121f] text-white text-xs font-bold shadow-lg shadow-[#c1121f]/25 pointer-events-auto cursor-pointer leading-none"
          >
            <span>@sarahmiller</span>
            <div className="absolute -bottom-1 left-4 w-2.5 h-2.5 bg-[#c1121f] rotate-45 rounded-[1px]" />
          </motion.div>
        </motion.div>

        {/* Floating Speech Tag 2 - Center-Right (@kabirmehta) */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 14,
            delay: 0.8,
          }}
          className="hidden md:flex absolute top-0 right-[34%] z-30 items-center pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4,
            }}
            className="relative h-7 px-3.5 rounded-full inline-flex items-center justify-center bg-neutral-900 text-white text-xs font-bold shadow-lg shadow-black/40 border border-neutral-700 pointer-events-auto cursor-pointer leading-none"
          >
            <span>@kabirmehta</span>
            <div className="absolute -bottom-1 right-5 w-2.5 h-2.5 bg-neutral-900 rotate-45 rounded-[1px]" />
          </motion.div>
        </motion.div>

        {/* Floating Speech Tag 3 - Far Right (@ananyafit) */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 14,
            delay: 0.95,
          }}
          className="hidden md:flex absolute top-4 right-[10%] z-30 items-center pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, -7, 0] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.8,
            }}
            className="relative h-7 px-3.5 rounded-full inline-flex items-center justify-center bg-neutral-900 text-white text-xs font-bold shadow-lg shadow-black/40 border border-neutral-700 pointer-events-auto cursor-pointer leading-none"
          >
            <span>@ananyafit</span>
            <div className="absolute -bottom-1 left-5 w-2.5 h-2.5 bg-neutral-900 rotate-45 rounded-[1px]" />
          </motion.div>
        </motion.div>

        {/* Fanned Cards Deck with Spring Fan-out on Mount */}
        <div className="flex items-center justify-start md:justify-center overflow-x-auto md:overflow-visible no-scrollbar py-6 px-4 md:px-0 -space-x-8 sm:-space-x-12 md:-space-x-14 lg:-space-x-16">
          {CARDS.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{
                opacity: 0,
                y: 35,
                rotate: 0,
                scale: 0.88,
              }}
              animate={{
                opacity: 1,
                y: card.fan.y,
                rotate: card.fan.rotate,
                scale: 1,
              }}
              transition={{
                type: "spring",
                stiffness: 95,
                damping: 15,
                delay: 0.15 + index * 0.07,
              }}
              whileHover={{
                scale: 1.1,
                rotate: 0,
                y: -22,
                zIndex: 40,
                transition: { duration: 0.25, ease: "easeOut" },
              }}
              className={`relative shrink-0 w-52 sm:w-60 md:w-64 h-72 sm:h-84 md:h-96 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-black/60 cursor-pointer group ${
                card.isCenterpiece
                  ? "border-2 border-[#c1121f] z-20 shadow-[#c1121f]/20"
                  : "border border-neutral-800"
              } ${card.isQR ? "bg-gradient-to-br from-neutral-900 via-neutral-950 to-black text-white p-4 flex flex-col justify-between text-left" : "bg-neutral-900"}`}
            >
              {card.isQR ? (
                <>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className="h-5 px-2.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-400/30 inline-flex items-center justify-center leading-none">
                        {card.tag}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold leading-none">
                        {card.rating}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white mb-1">
                      {card.name}
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-tight">
                      {t("hero.escrowDesc", "Guaranteed payouts held in Flenzr Vault. Released directly to Indian bank account on draft approval.")}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center space-y-1 text-center">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">
                      {t("hero.totalPayout", "Total Monthly Payout")}
                    </span>
                    <span className="text-xl font-black text-emerald-400">
                      {card.stats}
                    </span>
                    <span className="text-[10px] text-neutral-300 font-medium">
                      {t("hero.dealsCompleted", "3 Brand Deals Completed ✓")}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between text-[11px]">
                    <span className="text-neutral-300">{t("hero.creatorEarnings", "Creator Earnings")}</span>
                    <span className="font-extrabold text-[#c1121f] text-xs">
                      {t("hero.zeroCommission", "Zero Commission")}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <img
                    src={card.image}
                    alt={card.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/30" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-white text-[11px]">
                    <span
                      className={`h-6 px-2.5 rounded-full font-bold text-[10px] shadow-sm inline-flex items-center justify-center gap-1 leading-none ${
                        card.isCenterpiece
                          ? "bg-emerald-600"
                          : card.tag === "Tech Review" || card.tag === "Food & Cafes"
                          ? "bg-[#c1121f]"
                          : "bg-black/80 backdrop-blur-md border border-white/20"
                      }`}
                    >
                      {card.isCenterpiece && <Check className="w-2.5 h-2.5" />}
                      <span>{card.stats}</span>
                    </span>
                    <span className="h-6 px-2 rounded-md bg-black/60 backdrop-blur-md font-semibold text-[10px] inline-flex items-center justify-center leading-none">
                      {card.tag}
                    </span>
                  </div>

                  {/* Bottom Glass Card Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-[#09090b]/90 backdrop-blur-md border border-neutral-800 text-white text-left shadow-lg">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-white truncate">
                        {card.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          card.isCenterpiece
                            ? "h-5 px-1.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center justify-center leading-none"
                            : "text-amber-400"
                        }`}
                      >
                        {card.rating}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                      <span className="truncate pr-1">{card.package}</span>
                      <span
                        className={`font-extrabold shrink-0 ${
                          card.isCenterpiece
                            ? "text-emerald-400"
                            : card.tag === "Tech Review" || card.tag === "Food & Cafes"
                            ? "text-[#c1121f]"
                            : "text-white"
                        }`}
                      >
                        {card.rate}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Minimal Subtext Below Deck - Creator Earnings & Brand Marketplace */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="max-w-2xl mx-auto px-4 sm:px-6 mt-4"
      >
        <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
          {t("hero.subtext", "Creators monetize their audience with upfront rate cards and secure Flenzr Vault payouts, while brands discover verified influencers to drive high-converting campaigns in ₹.")}
        </p>

        {/* Minimal Clean Pill CTAs */}
        <div className="flex items-center justify-center gap-3.5 mt-6">
          <Link
            href="/signup/creator"
            className="h-12 px-7 rounded-full bg-[#c1121f] hover:bg-[#a50e1a] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#c1121f]/25 transition-all hover:scale-[1.02] cursor-pointer inline-flex items-center justify-center leading-none"
          >
            {t("hero.startEarning", "Start Earning — Join as Creator")}
          </Link>
          <Link
            href="/dashboard/brand"
            className="h-12 px-7 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 hover:border-neutral-700 font-semibold text-xs sm:text-sm transition-all hover:scale-[1.02] cursor-pointer inline-flex items-center justify-center leading-none"
          >
            {t("hero.hireCreators", "Hire Creators — Brand Portal")}
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
