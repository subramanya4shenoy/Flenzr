"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

interface CloudCreator {
  id: string;
  name: string;
  handle: string;
  niche: string;
  followers: string;
  rate: string;
  avatar: string;
  yOffset: number;
}

const CREATORS_ROW_1: CloudCreator[] = [
  {
    id: "c1",
    name: "Sarah Miller",
    handle: "@sarahmiller",
    niche: "Tech & Gadgets",
    followers: "420K",
    rate: "₹45K",
    avatar: "/images/sarah-miller-avatar.jpg",
    yOffset: -6,
  },
  {
    id: "c2",
    name: "Kabir Mehta",
    handle: "@kabirmehta",
    niche: "Travel & Style",
    followers: "285K",
    rate: "₹35K",
    avatar: "/images/creator-lifestyle.jpg",
    yOffset: 8,
  },
  {
    id: "c3",
    name: "Ananya Rao",
    handle: "@ananyafit",
    niche: "Fitness & Yoga",
    followers: "190K",
    rate: "₹28K",
    avatar: "/images/creator-fitness.jpg",
    yOffset: -10,
  },
  {
    id: "c4",
    name: "Rhea Kapoor",
    handle: "@rheafoods",
    niche: "Food & Cafes",
    followers: "310K",
    rate: "₹40K",
    avatar: "/images/creator-food.jpg",
    yOffset: 6,
  },
];

const CREATORS_ROW_2: CloudCreator[] = [
  {
    id: "c5",
    name: "Pooja Verma",
    handle: "@poojabeauty",
    niche: "Beauty & Skincare",
    followers: "230K",
    rate: "₹30K",
    avatar: "/images/sarah-miller-avatar.jpg",
    yOffset: 10,
  },
  {
    id: "c6",
    name: "Arjun Sen",
    handle: "@arjundesigns",
    niche: "UI & Product",
    followers: "140K",
    rate: "₹25K",
    avatar: "/images/brand-collab.jpg",
    yOffset: -8,
  },
  {
    id: "c7",
    name: "Rohan Deshmukh",
    handle: "@rohanfinance",
    niche: "Fintech & Investing",
    followers: "520K",
    rate: "₹65K",
    avatar: "/images/creator-hero.jpg",
    yOffset: 6,
  },
  {
    id: "c8",
    name: "Tanya Sharma",
    handle: "@tanyalife",
    niche: "Lifestyle & Vlogs",
    followers: "390K",
    rate: "₹42K",
    avatar: "/images/creator-lifestyle.jpg",
    yOffset: -12,
  },
];

export function CreatorCloudMotion() {
  return (
    <section className="py-24 border-t border-neutral-200 overflow-hidden text-center relative bg-neutral-50/50">
      {/* Background Soft Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[600px] h-[300px] bg-[#c1121f]/5 blur-3xl rounded-full" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 mb-12">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#c1121f]/10 text-[#c1121f] mb-4">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>India&apos;s Influencer Marketplace</span>
        </div>

        <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-neutral-900 leading-[1.1] mb-4">
          The marketplace to pick creators and drive revenue.
        </h2>

        <p className="text-neutral-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          Over 10,000+ creators earning transparent income, and 500+ top consumer brands generating high-converting campaign revenue across India.
        </p>
      </div>

      {/* Floating Cloud Row 1 */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 overflow-x-auto md:overflow-visible no-scrollbar py-3 px-4">
        {CREATORS_ROW_1.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            animate={{
              y: [c.yOffset, -c.yOffset, c.yOffset],
            }}
            whileHover={{
              scale: 1.08,
              y: -12,
              zIndex: 30,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)",
            }}
            className="shrink-0 w-52 sm:w-60 p-3 rounded-2xl bg-white border border-neutral-200 shadow-md flex items-center gap-3 text-left cursor-pointer transition-all"
          >
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-neutral-100">
              <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-black truncate">{c.name}</span>
                <span className="font-black text-xs text-[#c1121f]">{c.rate}</span>
              </div>
              <div className="text-[11px] text-neutral-500 truncate">{c.niche}</div>
              <div className="text-[10px] text-neutral-400 font-semibold">{c.followers} Followers</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Floating Cloud Row 2 */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 overflow-x-auto md:overflow-visible no-scrollbar py-3 px-4 mt-2">
        {CREATORS_ROW_2.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
            animate={{
              y: [-c.yOffset, c.yOffset, -c.yOffset],
            }}
            whileHover={{
              scale: 1.08,
              y: -12,
              zIndex: 30,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)",
            }}
            className="shrink-0 w-52 sm:w-60 p-3 rounded-2xl bg-white border border-neutral-200 shadow-md flex items-center gap-3 text-left cursor-pointer transition-all"
          >
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-neutral-100">
              <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-black truncate">{c.name}</span>
                <span className="font-black text-xs text-black">{c.rate}</span>
              </div>
              <div className="text-[11px] text-neutral-500 truncate">{c.niche}</div>
              <div className="text-[10px] text-neutral-400 font-semibold">{c.followers} Followers</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom CTA Pill */}
      <div className="mt-10">
        <Link
          href="/dashboard/brand"
          className="px-6 py-3 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02] inline-flex items-center gap-2"
        >
          <span>Explore All 10,000+ Creators</span>
        </Link>
      </div>
    </section>
  );
}
