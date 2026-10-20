"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, Video, DollarSign, MessageSquare } from "lucide-react";
import { useTranslation } from "@/lib/i18n/language-context";

interface ShowcaseCard {
  id: string;
  creator: string;
  handle: string;
  category: string;
  deliverable: string;
  price: string;
  status: string;
  image: string;
  feedback: string;
}

const SHOWCASE_CARDS: ShowcaseCard[] = [
  {
    id: "collab-1",
    creator: "Your creator profile",
    handle: "Your media kit",
    category: "Tech & Gadgets",
    deliverable: "Dedicated 4K Review Video",
    price: "Set your rate",
    status: "No active collaboration",
    image: "/images/creator-hero.jpg",
    feedback: "Brand feedback will appear after a draft is reviewed.",
  },
  {
    id: "collab-2",
    creator: "Your creator profile",
    handle: "Your media kit",
    category: "Streetwear & Travel",
    deliverable: "60s Cinematic Reel",
    price: "Set your rate",
    status: "No active collaboration",
    image: "/images/creator-lifestyle.jpg",
    feedback: "Brand feedback will appear after a draft is reviewed.",
  },
  {
    id: "collab-3",
    creator: "Your creator profile",
    handle: "Your media kit",
    category: "Fitness & Wellness",
    deliverable: "Workout Reel + 2 Stories",
    price: "Set your rate",
    status: "No active collaboration",
    image: "/images/creator-fitness.jpg",
    feedback: "Brand feedback will appear after a draft is reviewed.",
  },
  {
    id: "collab-4",
    creator: "Your creator profile",
    handle: "Your media kit",
    category: "Food & Cafes",
    deliverable: "Artisanal Dessert Reel",
    price: "Set your rate",
    status: "No active collaboration",
    image: "/images/creator-food.jpg",
    feedback: "Brand feedback will appear after a draft is reviewed.",
  },
];

export function CollabShowcaseMotion() {
  const { t } = useTranslation();
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const activeCard = SHOWCASE_CARDS[activeCardIndex];

  return (
    <section className="py-20 border-t border-neutral-800/80 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Typography & CTAs (Directly from Pinterest 00:04) */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="h-7 inline-flex items-center justify-center gap-2 px-3.5 rounded-full text-xs font-bold bg-[#c1121f]/20 text-[#c1121f] border border-[#c1121f]/30 leading-none">
              <span>{t("collab.tag", "CREATOR & BRAND MARKETPLACE")}</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.12]">
              {t("collab.title", "Where Creators Earn, & Brands Make Money.")}
            </h2>

            <p className="text-neutral-400 text-sm sm:text-base leading-relaxed max-w-xl">
              {t("collab.subtitle", "A performance-driven marketplace where brands pick verified influencers to drive scalable ROI, and creators monetize their audience with upfront rate cards and guaranteed Flenzr Vault payouts in ₹.")}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/signup/creator"
                className="h-12 px-7 rounded-full bg-[#c1121f] hover:bg-[#a50e1a] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#c1121f]/25 transition-all hover:scale-[1.02] inline-flex items-center justify-center gap-2 cursor-pointer leading-none"
              >
                <span>{t("collab.startEarning", "Start Earning as a Creator")}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard/brand"
                className="h-12 px-7 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 hover:border-neutral-700 font-semibold text-xs sm:text-sm transition-all hover:scale-[1.02] cursor-pointer inline-flex items-center justify-center leading-none"
              >
                {t("collab.hireInfluencers", "Hire Influencers — Brand Portal")}
              </Link>
            </div>

            {/* Quick 4 Points */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-neutral-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#c1121f] shrink-0" />
                <span>Brands: Drive profitable sales</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#c1121f] shrink-0" />
                <span>Creators: Upfront rates in ₹</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#c1121f] shrink-0" />
                <span>Review draft videos before publishing</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#c1121f] shrink-0" />
                <span>Guaranteed Flenzr Vault payouts</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Fanned Stack with Smooth Card Flip */}
          <div className="lg:col-span-6 relative flex justify-center items-center py-6">
            {/* Floating Handle Badges above Stack */}
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-3 right-8 z-30 hidden sm:block"
            >
              <div className="relative h-6 px-3 rounded-full inline-flex items-center justify-center bg-[#c1121f] text-white text-[11px] font-bold shadow-md leading-none">
                <span>{activeCard.handle}</span>
                <div className="absolute -bottom-1 left-4 w-2 h-2 bg-[#c1121f] rotate-45" />
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -bottom-2 left-6 z-30 hidden sm:block"
            >
              <div className="relative h-6 px-3 rounded-full inline-flex items-center justify-center bg-neutral-900 text-white text-[11px] font-bold shadow-md border border-neutral-700 leading-none">
                <span>@boat.lifestyle • Collab</span>
                <div className="absolute -top-1 right-4 w-2 h-2 bg-neutral-900 rotate-45" />
              </div>
            </motion.div>

            {/* Stacked Cards Container */}
            <div className="relative w-72 sm:w-80 md:w-96 h-[420px]">
              {SHOWCASE_CARDS.map((item, idx) => {
                const isActive = idx === activeCardIndex;
                const offset = (idx - activeCardIndex + SHOWCASE_CARDS.length) % SHOWCASE_CARDS.length;

                return (
                  <motion.div
                    key={item.id}
                    onClick={() => setActiveCardIndex(idx)}
                    animate={{
                      scale: isActive ? 1 : 1 - offset * 0.05,
                      x: offset * 18,
                      y: offset * 10,
                      rotate: offset * 3,
                      zIndex: 30 - offset,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 120,
                      damping: 15,
                    }}
                    className={`absolute inset-0 rounded-3xl overflow-hidden bg-neutral-900 border-2 shadow-2xl cursor-pointer transition-shadow ${
                      isActive ? "border-[#c1121f] shadow-black/80 shadow-2xl" : "border-neutral-800 opacity-90"
                    }`}
                  >
                    <img
                      src={item.image}
                      alt={item.creator}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/30" />

                    {/* Top Status */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white text-xs">
                      <span className="h-6 px-2.5 rounded-full bg-black/70 backdrop-blur-md font-bold text-[10px] border border-white/20 inline-flex items-center justify-center leading-none">
                        {item.category}
                      </span>
                      <span className="h-6 px-2.5 rounded-full bg-emerald-600 font-bold text-[10px] inline-flex items-center justify-center leading-none">
                        {item.status}
                      </span>
                    </div>

                    {/* Bottom Review & Rate Overlay */}
                    <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-[#09090b]/90 backdrop-blur-md border border-neutral-800 text-white text-left space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-extrabold text-sm text-white">{item.creator}</div>
                          <div className="text-[11px] text-neutral-400">{item.deliverable}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-neutral-400">Fixed Rate</div>
                          <div className="font-black text-base text-[#c1121f]">{item.price}</div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-[11px] text-neutral-300 italic flex items-start gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-[#c1121f] shrink-0 mt-0.5" />
                        <span className="leading-snug">{item.feedback}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
