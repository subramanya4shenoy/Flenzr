"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check, QrCode } from "lucide-react";

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
  {
    id: "sarah",
    name: "Sarah Miller",
    tag: "Tech Review",
    stats: "YouTube 420K",
    rating: "★ 4.9",
    package: "Reel / Video Package",
    rate: "₹45,000",
    image: "/images/creator-hero.jpg",
    fan: { rotate: -10, y: 16 },
  },
  {
    id: "kabir",
    name: "Kabir Mehta",
    tag: "Travel & Streetwear",
    stats: "Instagram 285K",
    rating: "★ 5.0",
    package: "60s Reel Collab",
    rate: "₹35,000",
    image: "/images/creator-lifestyle.jpg",
    fan: { rotate: -5, y: 4 },
  },
  {
    id: "collab",
    name: "BoAt Audio Launch",
    tag: "Brand Collab",
    stats: "Draft Approved ✓",
    rating: "PAID",
    package: "Draft Video Accepted",
    rate: "₹60,000",
    image: "/images/brand-collab.jpg",
    isCenterpiece: true,
    fan: { rotate: -1, y: -8 },
  },
  {
    id: "ananya",
    name: "Ananya Rao",
    tag: "Fitness & Yoga",
    stats: "Instagram 190K",
    rating: "★ 4.9",
    package: "Workout Reel + Story",
    rate: "₹28,000",
    image: "/images/creator-fitness.jpg",
    fan: { rotate: 4, y: 0 },
  },
  {
    id: "rhea",
    name: "Rhea Kapoor",
    tag: "Food & Cafes",
    stats: "Reels 310K",
    rating: "★ 5.0",
    package: "Cafe Review Shoot",
    rate: "₹40,000",
    image: "/images/creator-food.jpg",
    fan: { rotate: 8, y: 8 },
  },
  {
    id: "qr",
    name: "Creator Escrow Payouts",
    tag: "Marketplace Escrow",
    stats: "₹1,85,000 Earned",
    rating: "● Secured",
    package: "Instant Bank Transfer",
    rate: "Zero Haggling",
    isQR: true,
    fan: { rotate: 12, y: 18 },
  },
];

export function HeroMotionDeck() {
  return (
    <section className="pt-10 sm:pt-16 pb-20 overflow-hidden text-center">
      {/* Minimal Confident Headline */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.h1
          initial={{ opacity: 0, y: 22, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-neutral-900 max-w-4xl mx-auto leading-[1.08] mb-4"
        >
          A place to display your influence.
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
            className="relative bg-[#c1121f] text-white px-3.5 py-1 rounded-full text-xs font-bold shadow-lg shadow-[#c1121f]/25 pointer-events-auto cursor-pointer"
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
            className="relative bg-black text-white px-3.5 py-1 rounded-full text-xs font-bold shadow-lg shadow-black/25 pointer-events-auto cursor-pointer"
          >
            <span>@kabirmehta</span>
            <div className="absolute -bottom-1 right-5 w-2.5 h-2.5 bg-black rotate-45 rounded-[1px]" />
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
            className="relative bg-neutral-900 text-white px-3.5 py-1 rounded-full text-xs font-bold shadow-lg shadow-black/25 pointer-events-auto cursor-pointer"
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
              className={`relative shrink-0 w-52 sm:w-60 md:w-64 h-72 sm:h-84 md:h-96 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl shadow-black/10 cursor-pointer group ${
                card.isCenterpiece
                  ? "border-2 border-black z-20"
                  : "border border-neutral-200/80"
              } ${card.isQR ? "bg-gradient-to-br from-neutral-900 via-neutral-950 to-black text-white p-4 flex flex-col justify-between text-left" : "bg-neutral-900"}`}
            >
              {card.isQR ? (
                <>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-400/30">
                        {card.tag}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">
                        {card.rating}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white mb-1">
                      {card.name}
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-tight">
                      Guaranteed payouts held in escrow. Released directly to Indian bank account on draft approval.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center space-y-1 text-center">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">
                      Total Monthly Payout
                    </span>
                    <span className="text-xl font-black text-emerald-400">
                      {card.stats}
                    </span>
                    <span className="text-[10px] text-neutral-300 font-medium">
                      3 Brand Deals Completed ✓
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between text-[11px]">
                    <span className="text-neutral-300">Creator Earnings</span>
                    <span className="font-extrabold text-[#c1121f] text-xs">
                      Zero Commission
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/30" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-white text-[11px]">
                    <span
                      className={`px-2.5 py-1 rounded-full font-bold text-[10px] shadow-sm ${
                        card.isCenterpiece
                          ? "bg-emerald-600 flex items-center gap-1"
                          : card.tag === "Tech Review" || card.tag === "Food & Cafes"
                          ? "bg-[#c1121f]"
                          : "bg-black/80 backdrop-blur-md border border-white/20"
                      }`}
                    >
                      {card.isCenterpiece && <Check className="w-2.5 h-2.5" />}
                      {card.stats}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md font-semibold text-[10px]">
                      {card.tag}
                    </span>
                  </div>

                  {/* Bottom Glass Card Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-white/95 backdrop-blur-md border border-white/20 text-black text-left shadow-md">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-black truncate">
                        {card.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          card.isCenterpiece
                            ? "px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800"
                            : "text-amber-500"
                        }`}
                      >
                        {card.rating}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-600 flex items-center justify-between">
                      <span className="truncate pr-1">{card.package}</span>
                      <span
                        className={`font-extrabold shrink-0 ${
                          card.isCenterpiece
                            ? "text-emerald-700"
                            : card.tag === "Tech Review" || card.tag === "Food & Cafes"
                            ? "text-[#c1121f]"
                            : "text-black"
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
        <p className="text-neutral-600 text-sm sm:text-base leading-relaxed">
          Creators monetize their audience with upfront rate cards and secure escrow payouts, while brands discover verified influencers to drive high-converting campaigns in ₹.
        </p>

        {/* Minimal Clean Pill CTAs */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link
            href="/signup/creator"
            className="px-6 py-3 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02] cursor-pointer"
          >
            Start Earning — Join as Creator
          </Link>
          <Link
            href="/dashboard/brand"
            className="px-6 py-3 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
          >
            Hire Creators — Brand Portal
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
