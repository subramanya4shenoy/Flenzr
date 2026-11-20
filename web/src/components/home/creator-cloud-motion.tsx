"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { searchCreators } from "@/lib/api";
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

export function CreatorCloudMotion() {
  const [creators, setCreators] = useState<CloudCreator[]>([]);
  useEffect(() => {
    let active = true;
    searchCreators().then((profiles) => {
      if (!active) return;
      setCreators(profiles.map((p) => ({
        id: p.handle, name: p.display_name, handle: p.handle,
        niche: p.niche || "Content Creator", followers: "", rate: "",
        avatar: p.avatar_url || `/api/proxy-image?name=${encodeURIComponent(p.display_name)}`,
        yOffset: 6,
      })));
    });
    return () => { active = false; };
  }, []);
  const CREATORS_ROW_1 = creators.slice(0, 4);
  const CREATORS_ROW_2 = creators.slice(4, 8);

  return (
    <section className="py-24 border-t border-[color:var(--ui-line-neutral-800)]/80 overflow-hidden text-center relative bg-[color:var(--ui-paint-000000)]/40">
      {/* Background Soft Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[600px] h-[300px] bg-[color:var(--ui-paint-c1121f)]/10 blur-3xl rounded-full" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 mb-12">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[color:var(--ui-paint-c1121f)]/20 text-[color:var(--ui-ink-c1121f)] border border-[color:var(--ui-line-c1121f)]/30 mb-4">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>India&apos;s Influencer Marketplace</span>
        </div>

        <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[color:var(--ui-ink-ffffff)] leading-[1.1] mb-4">
          The marketplace to pick creators and drive revenue.
        </h2>

        <p className="text-[color:var(--ui-ink-neutral-400)] text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          Discover creators and explore their published media kits and packages.
        </p>
      </div>

      {creators.length === 0 && <p className="text-sm text-[color:var(--ui-ink-neutral-400)]">No creators yet. Be the first to publish your profile.</p>}
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
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            }}
            className="shrink-0 w-52 sm:w-60 p-3 rounded-2xl bg-[color:var(--ui-paint-neutral-900)]/90 border border-[color:var(--ui-line-neutral-800)] shadow-xl flex items-center gap-3 text-left cursor-pointer transition-all hover:border-[color:var(--ui-line-neutral-700)]"
          >
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[color:var(--ui-line-neutral-800)]">
              <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[color:var(--ui-ink-ffffff)] truncate">{c.name}</span>
                <span className="font-black text-xs text-[color:var(--ui-ink-c1121f)]">{c.rate}</span>
              </div>
              <div className="text-[11px] text-[color:var(--ui-ink-neutral-400)] truncate">{c.niche}</div>
              <div className="text-[10px] text-[color:var(--ui-ink-neutral-500)] font-semibold">@{c.handle}</div>
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
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            }}
            className="shrink-0 w-52 sm:w-60 p-3 rounded-2xl bg-[color:var(--ui-paint-neutral-900)]/90 border border-[color:var(--ui-line-neutral-800)] shadow-xl flex items-center gap-3 text-left cursor-pointer transition-all hover:border-[color:var(--ui-line-neutral-700)]"
          >
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[color:var(--ui-line-neutral-800)]">
              <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[color:var(--ui-ink-ffffff)] truncate">{c.name}</span>
                <span className="font-black text-xs text-[color:var(--ui-ink-ffffff)]">{c.rate}</span>
              </div>
              <div className="text-[11px] text-[color:var(--ui-ink-neutral-400)] truncate">{c.niche}</div>
              <div className="text-[10px] text-[color:var(--ui-ink-neutral-500)] font-semibold">@{c.handle}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom CTA Pill */}
      <div className="mt-10">
        <Link
          href="/dashboard/brand"
          className="theme-on-accent h-12 px-7 rounded-full bg-[color:var(--ui-paint-c1121f)] hover:bg-[color:var(--ui-paint-a50e1a)] text-[color:var(--ui-ink-ffffff)] font-bold text-xs sm:text-sm shadow-lg shadow-[#c1121f]/25 transition-all hover:scale-[1.02] inline-flex items-center justify-center gap-2 cursor-pointer leading-none"
        >
          <span>Explore Creators</span>
        </Link>
      </div>
    </section>
  );
}
