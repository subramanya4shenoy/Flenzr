"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Link2, DollarSign, CheckCircle2, MessageSquare, Play, Video, QrCode } from "lucide-react";
import { useTranslation } from "@/lib/i18n/language-context";

export function WorkflowStoryMotion() {
  const { t } = useTranslation();

  return (
    <section className="py-20 border-t border-neutral-800/80 overflow-hidden bg-transparent">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold text-[#c1121f] uppercase tracking-wider">
            {t("engine.tag", "THE MARKETPLACE ENGINE")}
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mt-2 tracking-tight">
            {t("engine.title", "Built for creators to earn and brands to make money.")}
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base mt-2 leading-relaxed">
            {t("engine.subtext", "A transparent marketplace where brands hire vetted creators to drive real revenue, and influencers earn guaranteed payouts in ₹ with zero commission cuts.")}
          </p>
        </div>

        {/* 3 Story Cards Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Brands Pick Top Creators */}
          <motion.div
            whileHover={{ y: -8 }}
            transition={{ duration: 0.3 }}
            className="p-6 rounded-3xl bg-neutral-900/80 border border-neutral-800 shadow-xl flex flex-col justify-between space-y-6 hover:shadow-2xl hover:border-neutral-700 transition-all"
          >
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-[#c1121f]/20 text-[#c1121f] border border-[#c1121f]/30 flex items-center justify-center">
                <Link2 className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white">
                1. Brands Pick Creators
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Brands filter verified creators by niche, audience size, and engagement. Book high-ROI sponsorship packages with upfront deliverables.
              </p>
            </div>

            {/* Interactive Mockup Preview */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/90 shadow-xs space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400">
                <span>Campaign Booking</span>
                <span className="text-emerald-400">Connect your socials</span>
              </div>
              <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                <span className="truncate text-white font-semibold">Your creator profile</span>
                <span className="text-[10px] font-black text-[#c1121f]">No audience data</span>
              </div>
              <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                <span className="truncate text-white font-semibold">Deliverable: 4K Review</span>
                <span className="text-[10px] font-black text-white">Set your rate</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Where Influence Meets Rate Cards */}
          <motion.div
            whileHover={{ y: -8 }}
            transition={{ duration: 0.3 }}
            className="p-6 rounded-3xl bg-neutral-900/80 border border-neutral-800 shadow-xl flex flex-col justify-between space-y-6 hover:shadow-2xl hover:border-neutral-700 transition-all"
          >
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white">
                Standard Rate Cards in ₹
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                No more confusing PDFs or endless WhatsApp negotiations. Publish fixed upfront packages for Reels, YouTube videos, and dedicated shorts.
              </p>
            </div>

            {/* Interactive Mockup Preview */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/90 shadow-xs space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400">
                <span>Upfront Deliverables</span>
                <span className="text-neutral-500">Zero Middlemen</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <div className="text-[10px] text-neutral-400">YouTube Review</div>
                  <div className="text-sm font-black text-white mt-0.5">Set your rate</div>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <div className="text-[10px] text-neutral-400">Instagram Reel</div>
                  <div className="text-sm font-black text-white mt-0.5">Set your rate</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Draft Review & Vault Payout */}
          <motion.div
            whileHover={{ y: -8 }}
            transition={{ duration: 0.3 }}
            className="p-6 rounded-3xl bg-neutral-900/80 border border-neutral-800 shadow-xl flex flex-col justify-between space-y-6 hover:shadow-2xl hover:border-neutral-700 transition-all"
          >
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-[#c1121f]/20 text-[#c1121f] border border-[#c1121f]/30 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white">
                Review Drafts &amp; Pay
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Creators upload watermarked drafts directly inside Flenzr. Brands give timestamped feedback, give the thumbs up, and release payments securely.
              </p>
            </div>

            {/* Interactive Mockup Preview */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/90 shadow-xs space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-white flex items-center gap-1">
                  <Video className="w-3.5 h-3.5 text-[#c1121f]" /> Draft Review v1
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                  NO DRAFTS YET
                </span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 font-bold flex items-center justify-between text-[11px]">
                <span>No payouts yet</span>
                <span className="font-black text-emerald-400">₹0</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
