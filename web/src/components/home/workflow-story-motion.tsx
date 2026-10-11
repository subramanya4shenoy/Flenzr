"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Link2, DollarSign, CheckCircle2, MessageSquare, Play, Video, QrCode } from "lucide-react";

export function WorkflowStoryMotion() {
  return (
    <section className="py-20 border-t border-neutral-200 overflow-hidden bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold text-[#c1121f] uppercase tracking-wider">
            THE MARKETPLACE ENGINE
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-neutral-900 mt-2 tracking-tight">
            Built for creators to earn and brands to make money.
          </h2>
          <p className="text-neutral-600 text-sm sm:text-base mt-2 leading-relaxed">
            A transparent marketplace where brands hire vetted creators to drive real revenue, and influencers earn guaranteed payouts in ₹ with zero commission cuts.
          </p>
        </div>

        {/* 3 Story Cards Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Brands Pick Top Creators */}
          <motion.div
            whileHover={{ y: -8 }}
            transition={{ duration: 0.3 }}
            className="p-6 rounded-3xl bg-neutral-50 border border-neutral-200/90 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-lg transition-all"
          >
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-[#c1121f]/10 text-[#c1121f] flex items-center justify-center">
                <Link2 className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">
                1. Brands Pick Creators
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Brands filter verified creators by niche, audience size, and engagement. Book high-ROI sponsorship packages with upfront deliverables.
              </p>
            </div>

            {/* Interactive Mockup Preview */}
            <div className="p-3.5 rounded-2xl bg-white border border-neutral-200 shadow-xs space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-500">
                <span>Campaign Booking</span>
                <span className="text-emerald-600">● Verified Creator</span>
              </div>
              <div className="p-2 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                <span className="truncate text-black font-semibold">Sarah Miller • Tech</span>
                <span className="text-[10px] font-black text-[#c1121f]">420K Reach</span>
              </div>
              <div className="p-2 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                <span className="truncate text-black font-semibold">Deliverable: 4K Review</span>
                <span className="text-[10px] font-black text-black">₹50,000</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Where Influence Meets Rate Cards */}
          <motion.div
            whileHover={{ y: -8 }}
            transition={{ duration: 0.3 }}
            className="p-6 rounded-3xl bg-neutral-50 border border-neutral-200/90 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-lg transition-all"
          >
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">
                Standard Rate Cards in ₹
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                No more confusing PDFs or endless WhatsApp negotiations. Publish fixed upfront packages for Reels, YouTube videos, and dedicated shorts.
              </p>
            </div>

            {/* Interactive Mockup Preview */}
            <div className="p-3.5 rounded-2xl bg-white border border-neutral-200 shadow-xs space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-500">
                <span>Upfront Deliverables</span>
                <span className="text-neutral-400">Zero Middlemen</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                  <div className="text-[10px] text-neutral-500">YouTube Review</div>
                  <div className="text-sm font-black text-black mt-0.5">₹50,000</div>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                  <div className="text-[10px] text-neutral-500">Instagram Reel</div>
                  <div className="text-sm font-black text-black mt-0.5">₹25,000</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Draft Review & Escrow Payout */}
          <motion.div
            whileHover={{ y: -8 }}
            transition={{ duration: 0.3 }}
            className="p-6 rounded-3xl bg-neutral-50 border border-neutral-200/90 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-lg transition-all"
          >
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-[#c1121f]/10 text-[#c1121f] flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">
                Review Drafts &amp; Pay
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Creators upload watermarked drafts directly inside Flenzr. Brands give timestamped feedback, give the thumbs up, and release payments securely.
              </p>
            </div>

            {/* Interactive Mockup Preview */}
            <div className="p-3.5 rounded-2xl bg-white border border-neutral-200 shadow-xs space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-black flex items-center gap-1">
                  <Video className="w-3.5 h-3.5 text-[#c1121f]" /> Draft Review v1
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  APPROVED ✓
                </span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold flex items-center justify-between text-[11px]">
                <span>Escrow Payout Released</span>
                <span className="font-black text-emerald-800">₹60,000</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
