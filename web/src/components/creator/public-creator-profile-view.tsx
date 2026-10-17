"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  MapPin,
  Star,
  Sparkles,
  ExternalLink,
  Clock,
  Check,
  Copy,
  Share2,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Users,
  Eye,
  Award,
  Calendar,
  Layers,
  FileCheck2,
  DollarSign,
  HelpCircle,
  Video,
  ChevronRight,
  X,
  MessageSquare,
  Lock,
  ChevronDown,
  Globe,
  Bell,
  Briefcase,
  Settings,
  UserCheck,
} from "lucide-react";
import { PublicCreatorProfile, RateCard } from "@/lib/api";
import { Logo } from "@/components/ui/logo";
import {
  InstagramIcon,
  YoutubeIcon,
  XTwitterIcon,
} from "@/components/creator/creator-profile-header";

interface Props {
  creator: PublicCreatorProfile;
  rateCards: RateCard[];
}

export function PublicCreatorProfileView({ creator, rateCards }: Props) {
  const [activeTab, setActiveTab] = useState<"rates" | "audience" | "collabs" | "reviews">("rates");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [copiedLink, setCopiedLink] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedRateCard, setSelectedRateCard] = useState<RateCard | null>(null);
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [showAllCollabs, setShowAllCollabs] = useState(false);
  const [activeRateCardFilter, setActiveRateCardFilter] = useState<"all" | "new" | "vault">("new");

  // Filter rate cards based on selected platform filter
  const filteredRateCards = rateCards.filter((card) => {
    if (selectedPlatform === "all") return true;
    return card.platform.toLowerCase() === selectedPlatform.toLowerCase();
  });

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleOpenBooking = (card?: RateCard) => {
    setSelectedRateCard(card || (rateCards.length > 0 ? rateCards[0] : null));
    setBookingSubmitted(false);
    setBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f1f3f7] antialiased flex selection:bg-[#c1121f] selection:text-white">
      {/* ========================================================= */}
      {/* 1. LEFT SLIM NAVIGATION RAIL                              */}
      {/* ========================================================= */}
      <aside className="hidden lg:flex w-16 shrink-0 bg-[#09090b] border-r border-[#27272a] flex-col items-center py-5 justify-between select-none z-30">
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Official Flenzr Logo */}
          <Link
            href="/"
            title="Flenzr Home"
            className="w-10 h-10 rounded-xl bg-[#121215] border border-[#27272a] hover:border-neutral-700 flex items-center justify-center transition-all hover:scale-105 group"
          >
            <Logo size={24} variant="duotone-dark" />
          </Link>

          {/* Navigation Icons Stack */}
          <nav className="flex flex-col items-center gap-3 w-full px-2 pt-2">
            <button
              onClick={() => setActiveTab("rates")}
              title="Rate Cards & Deliverables"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeTab === "rates"
                  ? "bg-[#18181b] text-white border border-[#27272a]"
                  : "text-[#71717a] hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <Video className="w-4 h-4" />
              {activeTab === "rates" && (
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#c1121f] rounded-r" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("collabs")}
              title="Past Collaborations"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeTab === "collabs"
                  ? "bg-[#18181b] text-white border border-[#27272a]"
                  : "text-[#71717a] hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              {activeTab === "collabs" && (
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#c1121f] rounded-r" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("audience")}
              title="Audience Insights"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeTab === "audience"
                  ? "bg-[#18181b] text-white border border-[#27272a]"
                  : "text-[#71717a] hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <Users className="w-4 h-4" />
              {activeTab === "audience" && (
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#c1121f] rounded-r" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("reviews")}
              title="Brand Reviews"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeTab === "reviews"
                  ? "bg-[#18181b] text-white border border-[#27272a]"
                  : "text-[#71717a] hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <Bell className="w-4 h-4" />
              {activeTab === "reviews" && (
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#c1121f] rounded-r" />
              )}
            </button>

            {/* Pro Badge */}
            <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center text-[9px] font-black tracking-tight text-[#f43f5e] bg-[#29141e] border border-[#f43f5e]/30 mt-1 cursor-default">
              PRO
            </div>
          </nav>
        </div>

        {/* Bottom Booking Trigger */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => handleOpenBooking()}
            title="Book Collab"
            className="w-9 h-9 rounded-xl bg-[#121215] hover:bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. MAIN APPLICATION CONTENT AREA                          */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Breadcrumb & Actions Bar */}
        <header className="h-14 border-b border-[#27272a] bg-[#09090b]/90 backdrop-blur-md px-4 sm:px-5 lg:px-6 flex items-center justify-between sticky top-0 z-20">
          {/* Breadcrumb Path */}
          <div className="flex items-center gap-2 text-xs text-[#8c94a6]">
            <Link href="/" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Creators</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-[#525866]" />
            <span className="px-2.5 py-1 rounded-md bg-[#18181b] border border-[#27272a] text-white font-semibold">
              {creator.display_name}
            </span>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopyLink}
              className="h-9 px-3 rounded-lg bg-[#18181b] hover:bg-[#222226] border border-[#27272a] text-[#a1a1aa] hover:text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleOpenBooking()}
              className="h-9 px-4 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Book Collab</span>
            </button>
          </div>
        </header>

        {/* Profile Content Body */}
        <main className="p-4 sm:p-5 lg:p-6 space-y-5 max-w-[1140px] w-full mx-auto">
          {/* Layout: Left Profile Card (330px) + Right Analytics/Rate Cards (770px) */}
          <div className="flex flex-col lg:flex-row gap-5 items-start justify-center w-full">
            {/* ===================================================== */}
            {/* LEFT PROFILE CARD                                    */}
            {/* ===================================================== */}
            <div className="w-full lg:w-[330px] shrink-0 space-y-5">
              <div className="rounded-2xl bg-[#121215] border border-[#27272a] overflow-hidden shadow-xl">
                {/* 1. Sleek Dark Header Banner with White Mesh & Ambient Glow */}
                <div className="h-28 relative bg-gradient-to-r from-neutral-900 via-neutral-850 to-neutral-900 border-b border-[#27272a] p-3 flex items-start justify-end overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:14px_14px]" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />

                  {/* Verified White Badge */}
                  {creator.is_verified && (
                    <div className="relative z-10 h-6 px-2.5 rounded-lg bg-white text-black text-[11px] font-bold shadow-sm inline-flex items-center gap-1">
                      <Check className="w-3 h-3 text-[#c1121f] stroke-[3]" />
                      <span>Verified</span>
                    </div>
                  )}
                </div>

                {/* Profile Details Container */}
                <div className="px-5 pb-6 pt-0 relative space-y-4">
                  {/* Overlapping Rounded Avatar with Dark Border */}
                  <div className="-mt-12 mb-3">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-[#121215] bg-[#18181b] shadow-lg">
                      <img
                        src={creator.avatar_url || "/images/sarah-miller-avatar.jpg"}
                        alt={creator.display_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Name + White Badge */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-white tracking-tight">
                        {creator.display_name}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-md bg-white/10 border border-white/20 text-white text-[11px] font-semibold">
                        {creator.niche || "Tech Reviewer"}
                      </span>
                    </div>
                    <p className="text-xs text-[#7e8697] mt-1 leading-relaxed">
                      @{creator.handle} • {creator.bio || "In-depth honest hardware reviews, everyday carry gear, and aesthetic workspaces."}
                    </p>
                  </div>

                  {/* Skills / Categories Section (Horizontal Pills) */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] uppercase tracking-wider text-[#71717a] font-semibold block">
                      Creator Niches
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {["Tech Reviews", "Everyday Carry", "Desk Setups", "Smartphones", "Audio"].map((skill) => (
                        <span
                          key={skill}
                          className="px-2.5 py-1 rounded-lg bg-[#18181b] text-neutral-300 text-[11px] font-medium border border-[#27272a]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Position Type / Deliverable Types Section */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] uppercase tracking-wider text-[#71717a] font-semibold block">
                      Collab Formats
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {["4K Dedicated Video", "60s Reel", "Story Link", "Product Shoot"].map((type) => (
                        <span
                          key={type}
                          className="px-2.5 py-1 rounded-lg bg-[#18181b] text-neutral-300 text-[11px] font-medium border border-[#27272a]"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Location & Timezone Split Card */}
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
                    <div>
                      <span className="text-[10px] text-[#71717a] uppercase font-semibold block">Location</span>
                      <div className="text-xs font-semibold text-white mt-0.5 truncate">
                        {creator.location || "Bengaluru, India"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#71717a] uppercase font-semibold block">Timezone</span>
                      <div className="text-xs font-semibold text-white mt-0.5 truncate">
                        IST (UTC+5:30)
                      </div>
                    </div>
                  </div>

                  {/* Brand Collaborations */}
                  <div className="space-y-2 pt-2 border-t border-[#27272a]">
                    <span className="text-[11px] uppercase tracking-wider text-[#71717a] font-semibold block">
                      Past Brand Partnerships
                    </span>

                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-600/30 flex items-center justify-center font-black text-xs text-emerald-400 shrink-0">
                            B
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">BoAt Lifestyle</div>
                            <div className="text-[10px] text-[#71717a] truncate">Audio Launch • 4K Review</div>
                          </div>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          1.2M Views
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-red-950/80 border border-red-600/30 flex items-center justify-center font-black text-xs text-red-400 shrink-0">
                            K
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">Keychron India</div>
                            <div className="text-[10px] text-[#71717a] truncate">Custom Mechanical Keyboards</div>
                          </div>
                        </div>
                        <span className="text-[10px] text-white font-bold bg-white/10 px-1.5 py-0.5 rounded">
                          ₹8.5L GMV
                        </span>
                      </div>

                      {showAllCollabs && (
                        <div className="p-2.5 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-600/30 flex items-center justify-center font-black text-xs text-blue-400 shrink-0">
                              N
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white truncate">Nykaa Man</div>
                              <div className="text-[10px] text-[#71717a] truncate">Everyday Grooming &amp; Tech</div>
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            580K Views
                          </span>
                        </div>
                      )}

                      <button
                        onClick={() => setShowAllCollabs(!showAllCollabs)}
                        className="text-xs text-neutral-300 hover:text-white font-medium flex items-center gap-1 pt-1 cursor-pointer transition-colors"
                      >
                        <span>{showAllCollabs ? "Show less" : "See 1 more"}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllCollabs ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Connected Accounts Section Inside Single Card */}
                  <div className="space-y-2 pt-2 border-t border-[#27272a]">
                    <span className="text-[11px] uppercase tracking-wider text-[#71717a] font-semibold block">
                      Connected Channels
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {creator.youtube_channel ? (
                        <a
                          href={`https://youtube.com/@${creator.youtube_channel.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-[#18181b] hover:bg-[#222226] flex items-center justify-between text-white transition-colors border border-[#27272a]"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <YoutubeIcon className="w-3.5 h-3.5 text-[#ef4444] shrink-0" />
                            <span className="font-medium text-[11px] truncate">YouTube</span>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        </a>
                      ) : (
                        <div className="p-2 rounded-xl bg-[#18181b] flex items-center justify-between text-white border border-[#27272a]">
                          <div className="flex items-center gap-2 truncate">
                            <YoutubeIcon className="w-3.5 h-3.5 text-[#ef4444] shrink-0" />
                            <span className="font-medium text-[11px] truncate">YouTube</span>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-neutral-600 shrink-0" />
                        </div>
                      )}

                      {creator.instagram_handle ? (
                        <a
                          href={`https://instagram.com/${creator.instagram_handle.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-[#18181b] hover:bg-[#222226] flex items-center justify-between text-white transition-colors border border-[#27272a]"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <InstagramIcon className="w-3.5 h-3.5 text-[#ec4899] shrink-0" />
                            <span className="font-medium text-[11px] truncate">Instagram</span>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        </a>
                      ) : (
                        <div className="p-2 rounded-xl bg-[#18181b] flex items-center justify-between text-white border border-[#27272a]">
                          <div className="flex items-center gap-2 truncate">
                            <InstagramIcon className="w-3.5 h-3.5 text-[#ec4899] shrink-0" />
                            <span className="font-medium text-[11px] truncate">Instagram</span>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-neutral-600 shrink-0" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===================================================== */}
            {/* RIGHT COLUMN: KPI Metrics + Aspect / Rate Cards Grid  */}
            {/* ===================================================== */}
            <div className="w-full lg:w-[770px] flex-1 min-w-0 space-y-5">
              {/* 1. TOP ROW KPI CARDS */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-[#121215] border border-[#27272a] shadow-md space-y-1">
                  <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    91%
                  </div>
                  <div className="text-xs text-[#8c94a6] font-medium">
                    Sponsor Retention
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#121215] border border-[#27272a] shadow-md space-y-1">
                  <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    90%
                  </div>
                  <div className="text-xs text-[#8c94a6] font-medium">
                    Availability
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#121215] border border-[#27272a] shadow-md space-y-1">
                  <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    87%
                  </div>
                  <div className="text-xs text-[#8c94a6] font-medium">
                    On-Time Delivery
                  </div>
                </div>
              </div>

              {/* 2. Middle Row: Aspect Score / Overall Score (Gauge) + Collab Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Aspect Score Card */}
                <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8c94a6]">
                      Aspect Score
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white font-bold border border-white/20">
                      TOP 1% TECH
                    </span>
                  </div>

                  {/* Half Circle Arc Gauge with 86 Score */}
                  <div className="flex flex-col items-center justify-center py-2 relative">
                    <div className="relative w-48 h-28 flex items-end justify-center">
                      <svg viewBox="0 0 200 115" className="w-full h-full overflow-visible">
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          stroke="#20222c"
                          strokeWidth="16"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="16"
                          strokeDasharray="251.32"
                          strokeDashoffset="35"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute bottom-1 text-center select-none">
                        <span className="text-4xl font-extrabold text-white tracking-tight">
                          86
                        </span>
                        <span className="block text-[10px] text-[#7e8697] font-semibold tracking-wider mt-0.5">
                          VERIFIED RATING
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-xs text-[#8c94a6] pt-1 border-t border-[#27272a]">
                    High conversion rate for hardware, gadget, and D2C electronics.
                  </div>
                </div>

                {/* Overall Highlights & Badges Card */}
                <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] flex flex-col justify-between space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8c94a6]">
                    Partnership Highlights
                  </span>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#18181b] border border-[#27272a]">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-white font-semibold">Spotlight Creator of Month</div>
                        <div className="text-[10px] text-[#7e8697]">Awarded for highest ROI campaign</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#18181b] border border-[#27272a]">
                      <div className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/10">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-white font-semibold">Flenzr Vault Certified</div>
                        <div className="text-[10px] text-[#7e8697]">Guaranteed payouts held safely in ₹</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#18181b] border border-[#27272a]">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-white font-semibold">Avg. 5 Days Turnaround</div>
                        <div className="text-[10px] text-[#7e8697]">Rapid draft submission &amp; edits</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Sarah's Active Rate Cards & Deliverables */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#121215] border border-[#27272a] space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Available Sponsorship Packages
                    </h3>
                    <p className="text-xs text-[#8c94a6] mt-0.5">
                      Select a deliverable to book instantly through Flenzr Vault
                    </p>
                  </div>

                  <button
                    onClick={() => handleOpenBooking()}
                    className="h-8 px-3 rounded-lg bg-[#18181b] hover:bg-[#222226] border border-[#27272a] text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Custom Offer</span>
                    <ExternalLink className="w-3 h-3 text-white" />
                  </button>
                </div>

                {/* Three-Box Metric Filter Row */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setActiveRateCardFilter("all")}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      activeRateCardFilter === "all"
                        ? "bg-white/10 border-white text-white shadow-sm"
                        : "bg-[#121215] border-[#27272a] hover:bg-[#18181b]"
                    }`}
                  >
                    <div className="text-xl font-bold text-white">{rateCards.length}</div>
                    <div className="text-xs text-[#7e8697] font-medium mt-0.5">All Packages</div>
                    {activeRateCardFilter === "all" && (
                      <div className="h-0.5 bg-white rounded-full mt-2" />
                    )}
                  </button>

                  {/* Active White Accent Card */}
                  <button
                    onClick={() => setActiveRateCardFilter("new")}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      activeRateCardFilter === "new"
                        ? "bg-white/10 border-white text-white shadow-md shadow-white/5"
                        : "bg-[#121215] border-[#27272a] hover:bg-[#18181b]"
                    }`}
                  >
                    <div className="text-xl font-bold text-white">3</div>
                    <div className="text-xs text-neutral-300 font-medium mt-0.5">Top Converting</div>
                    {activeRateCardFilter === "new" && (
                      <div className="h-1 bg-white rounded-full mt-2 w-full shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                    )}
                  </button>

                  <button
                    onClick={() => setActiveRateCardFilter("vault")}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      activeRateCardFilter === "vault"
                        ? "bg-white/10 border-white text-white shadow-sm"
                        : "bg-[#121215] border-[#27272a] hover:bg-[#18181b]"
                    }`}
                  >
                    <div className="text-xl font-bold text-emerald-400">100%</div>
                    <div className="text-xs text-[#7e8697] font-medium mt-0.5">Vault Secured</div>
                    {activeRateCardFilter === "vault" && (
                      <div className="h-0.5 bg-emerald-400 rounded-full mt-2" />
                    )}
                  </button>
                </div>

                {/* Deliverables List */}
                <div className="space-y-3 pt-1">
                  {filteredRateCards.length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-[#18181b] border border-[#27272a] space-y-2">
                      <div className="text-white font-semibold text-sm">No packages published under this filter</div>
                      <p className="text-xs text-[#8c94a6]">Contact {creator.display_name} directly to request custom campaign deliverables</p>
                      <button
                        onClick={() => handleOpenBooking()}
                        className="mt-2 h-8 px-4 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Request Custom Offer</span>
                      </button>
                    </div>
                  ) : (
                    filteredRateCards.map((card) => (
                      <div
                        key={card.id}
                        className="p-4 sm:p-4.5 rounded-xl bg-[#18181b] hover:bg-[#202024] border border-[#27272a] hover:border-neutral-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-white text-[10px] font-bold">
                              {card.platform}
                            </span>
                            <span className="text-[11px] text-[#7e8697] font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3 text-neutral-300" />
                              {card.turnaround_days} Days Turnaround
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-white truncate group-hover:text-white transition-colors">
                            {card.title}
                          </h4>
                          <p className="text-xs text-[#8c94a6] line-clamp-1">
                            {card.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-[#27272a]">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] uppercase text-[#686f82] font-semibold block">Rate</span>
                            <span className="text-base font-bold text-white">
                              {card.currency === "USD" ? "$" : "₹"}
                              {(card.base_price_cents / 100).toLocaleString(
                                card.currency === "USD" ? "en-US" : "en-IN"
                              )}
                            </span>
                          </div>

                          <button
                            onClick={() => handleOpenBooking(card)}
                            className="h-9 px-4 rounded-lg bg-white hover:bg-neutral-200 text-black font-bold text-xs transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ========================================================= */}
      {/* 3. INTERACTIVE BOOKING MODAL                             */}
      {/* ========================================================= */}
      <AnimatePresence>
        {bookingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg rounded-2xl bg-[#121215] border border-[#27272a] shadow-2xl p-6 sm:p-7 relative overflow-hidden"
            >
              <button
                onClick={() => setBookingModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-lg bg-[#18181b] hover:bg-[#222226] text-[#8c94a6] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {bookingSubmitted ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Collab Inquiry Sent!</h3>
                  <p className="text-xs text-[#8c94a6] max-w-sm mx-auto leading-relaxed">
                    {creator.display_name} has received your brief. You will receive a Flenzr Vault payment link and campaign timeline shortly.
                  </p>
                  <button
                    onClick={() => setBookingModalOpen(false)}
                    className="h-10 px-6 rounded-lg bg-white hover:bg-neutral-200 text-black font-bold text-xs shadow-md transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 rounded bg-white/10 border border-white/20 text-white text-[10px] font-bold">
                      FLENZR VAULT BOOKING
                    </span>
                    <h3 className="text-xl font-bold text-white">
                      Book Deliverable with {creator.display_name}
                    </h3>
                    <p className="text-xs text-[#8c94a6]">
                      Your payment is safely held in Flenzr Vault until you approve the draft video.
                    </p>
                  </div>

                  {selectedRateCard && (
                    <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{selectedRateCard.title}</div>
                        <div className="text-[11px] text-[#7e8697]">{selectedRateCard.turnaround_days} Days Delivery</div>
                      </div>
                      <div className="text-base font-bold text-white">
                        ₹{(selectedRateCard.base_price_cents / 100).toLocaleString("en-IN")}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[#a1a1aa] font-medium mb-1">Brand Name</label>
                      <input
                        type="text"
                        placeholder="e.g. BoAt, Swiggy, Nykaa"
                        className="w-full h-10 px-3.5 rounded-lg bg-[#09090b] border border-[#27272a] text-white placeholder-[#525866] focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                      />
                    </div>

                    <div>
                      <label className="block text-[#a1a1aa] font-medium mb-1">Work Email</label>
                      <input
                        type="email"
                        placeholder="brand@company.com"
                        className="w-full h-10 px-3.5 rounded-lg bg-[#09090b] border border-[#27272a] text-white placeholder-[#525866] focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                      />
                    </div>

                    <div>
                      <label className="block text-[#a1a1aa] font-medium mb-1">Campaign Goal / Brief Notes</label>
                      <textarea
                        rows={3}
                        placeholder="Describe the product, key message, and campaign timeline..."
                        className="w-full p-3 rounded-lg bg-[#09090b] border border-[#27272a] text-white placeholder-[#525866] focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <div className="text-[11px] text-[#8c94a6] flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-400" />
                      <span>Zero upfront release to creator</span>
                    </div>

                    <button
                      onClick={() => setBookingSubmitted(true)}
                      className="h-10 px-6 rounded-lg bg-white hover:bg-neutral-200 text-black font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      Submit Booking
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
