"use client";

import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { useState, useEffect } from "react";
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
import { EnquiryComposer } from "@/components/enquiries/enquiry-composer";
import { Logo } from "@/components/ui/logo";
import { useAuthSession } from "@/lib/use-auth-session";
import {
  InstagramIcon,
  YoutubeIcon,
  XTwitterIcon,
  CREATOR_COVER_IMAGES,
} from "@/components/creator/creator-profile-header";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslation } from "@/lib/i18n/language-context";

interface Props {
  creator: PublicCreatorProfile;
  rateCards: RateCard[];
}

export function PublicCreatorProfileView({ creator, rateCards }: Props) {
  const { t } = useTranslation();
  const { profileHref, session } = useAuthSession();
  const [coverImage, setCoverImage] = useState<string>(CREATOR_COVER_IMAGES[0]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * CREATOR_COVER_IMAGES.length);
    setCoverImage(CREATOR_COVER_IMAGES[randomIndex]);
  }, []);

  const [activeTab, setActiveTab] = useState<"rates" | "audience" | "collabs" | "reviews">("rates");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [copiedLink, setCopiedLink] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedRateCard, setSelectedRateCard] = useState<RateCard | null>(null);
  const [showAllCollabs, setShowAllCollabs] = useState(false);
  const [activeRateCardFilter, setActiveRateCardFilter] = useState<"all" | "new" | "vault">("new");
  // Public profiles must never display another signed-in creator's local deals.
  const completedPartnerships: Array<{ id: string; brand: string; deliverable: string }> = [];

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
    setSelectedRateCard(card || null);
    setBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[color:var(--ui-paint-09090b)] text-[color:var(--ui-ink-f1f3f7)] antialiased flex selection:bg-[color:var(--ui-paint-c1121f)] selection:text-[color:var(--ui-ink-ffffff)]">
      {/* ========================================================= */}
      {/* 1. LEFT SLIM NAVIGATION RAIL                              */}
      {/* ========================================================= */}
      <aside className="hidden lg:flex w-16 shrink-0 bg-[color:var(--ui-paint-09090b)] border-r border-[color:var(--ui-line-27272a)] flex-col items-center py-5 justify-between select-none z-30">
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Official Flenzr Logo */}
          <Link
            href={profileHref}
            title={session ? (session.role === "brand" ? "Brand Portal" : "Creator Studio & Profile") : "Flenzr Home"}
            className="w-10 h-10 rounded-xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] hover:border-[color:var(--ui-line-neutral-700)] flex items-center justify-center transition-all hover:scale-105 group"
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
                  ? "bg-[color:var(--ui-paint-18181b)] text-[color:var(--ui-ink-ffffff)] border border-[color:var(--ui-line-27272a)]"
                  : "text-[color:var(--ui-ink-71717a)] hover:text-[color:var(--ui-ink-ffffff)] hover:bg-[color:var(--ui-paint-18181b)]"
              }`}
            >
              <Video className="w-4 h-4" />
              {activeTab === "rates" && (
                <div className="theme-on-accent absolute left-0 top-2 bottom-2 w-0.5 bg-[color:var(--ui-paint-c1121f)] rounded-r" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("collabs")}
              title="Past Collaborations"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeTab === "collabs"
                  ? "bg-[color:var(--ui-paint-18181b)] text-[color:var(--ui-ink-ffffff)] border border-[color:var(--ui-line-27272a)]"
                  : "text-[color:var(--ui-ink-71717a)] hover:text-[color:var(--ui-ink-ffffff)] hover:bg-[color:var(--ui-paint-18181b)]"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              {activeTab === "collabs" && (
                <div className="theme-on-accent absolute left-0 top-2 bottom-2 w-0.5 bg-[color:var(--ui-paint-c1121f)] rounded-r" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("audience")}
              title="Audience Insights"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeTab === "audience"
                  ? "bg-[color:var(--ui-paint-18181b)] text-[color:var(--ui-ink-ffffff)] border border-[color:var(--ui-line-27272a)]"
                  : "text-[color:var(--ui-ink-71717a)] hover:text-[color:var(--ui-ink-ffffff)] hover:bg-[color:var(--ui-paint-18181b)]"
              }`}
            >
              <Users className="w-4 h-4" />
              {activeTab === "audience" && (
                <div className="theme-on-accent absolute left-0 top-2 bottom-2 w-0.5 bg-[color:var(--ui-paint-c1121f)] rounded-r" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("reviews")}
              title="Brand Reviews"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeTab === "reviews"
                  ? "bg-[color:var(--ui-paint-18181b)] text-[color:var(--ui-ink-ffffff)] border border-[color:var(--ui-line-27272a)]"
                  : "text-[color:var(--ui-ink-71717a)] hover:text-[color:var(--ui-ink-ffffff)] hover:bg-[color:var(--ui-paint-18181b)]"
              }`}
            >
              <Bell className="w-4 h-4" />
              {activeTab === "reviews" && (
                <div className="theme-on-accent absolute left-0 top-2 bottom-2 w-0.5 bg-[color:var(--ui-paint-c1121f)] rounded-r" />
              )}
            </button>

            {/* Pro Badge */}
            <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center text-[9px] font-black tracking-tight text-[color:var(--ui-ink-f43f5e)] bg-[color:var(--ui-paint-29141e)] border border-[color:var(--ui-line-f43f5e)]/30 mt-1 cursor-default">
              PRO
            </div>
          </nav>
        </div>

        {/* Bottom Booking Trigger */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => handleOpenBooking()}
            title="Book Collab"
            className="w-9 h-9 rounded-xl bg-[color:var(--ui-paint-121215)] hover:bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)] text-[color:var(--ui-ink-a1a1aa)] hover:text-[color:var(--ui-ink-ffffff)] flex items-center justify-center transition-colors cursor-pointer"
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
        <header className="h-14 border-b border-[color:var(--ui-line-27272a)] bg-[color:var(--ui-paint-09090b)]/90 backdrop-blur-md px-4 sm:px-5 lg:px-6 flex items-center justify-between sticky top-0 z-20">
          {/* Breadcrumb Path */}
          <div className="flex items-center gap-2 text-xs text-[color:var(--ui-ink-8c94a6)]">
            <Link href={profileHref} className="hover:text-[color:var(--ui-ink-ffffff)] transition-colors flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>{session ? (session.role === "brand" ? "Brand Portal" : "Studio") : "Creators"}</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-[color:var(--ui-ink-525866)]" />
            <span className="px-2.5 py-1 rounded-md bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)] text-[color:var(--ui-ink-ffffff)] font-semibold">
              {creator.display_name}
            </span>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            <ThemeSwitcher /><LanguageSwitcher variant="compact" />
            <button
              onClick={handleCopyLink}
              className="h-9 px-3 rounded-lg bg-[color:var(--ui-paint-18181b)] hover:bg-[color:var(--ui-paint-222226)] border border-[color:var(--ui-line-27272a)] text-[color:var(--ui-ink-a1a1aa)] hover:text-[color:var(--ui-ink-ffffff)] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[color:var(--ui-ink-emerald-400)]" />
                  <span className="text-[color:var(--ui-ink-emerald-400)]">Copied</span>
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
              className="h-9 px-4 rounded-lg bg-[color:var(--ui-paint-ffffff)] hover:bg-[color:var(--ui-paint-neutral-200)] text-[color:var(--ui-ink-000000)] text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t("Book Collab")}</span>
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
              <div className="rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] overflow-hidden shadow-xl">
                {/* 1. Cover Image Banner (Random 1 of 5) */}
                <div className="h-28 relative bg-[color:var(--ui-paint-18181b)] border-b border-[color:var(--ui-line-27272a)] p-3 flex items-start justify-end overflow-hidden group">
                  <img
                    src={coverImage}
                    alt="Creator Profile Cover"
                    className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--ui-paint-121215)] via-[color:var(--ui-paint-000000)]/40 to-[color:var(--ui-paint-000000)]/30 pointer-events-none" />
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:14px_14px] pointer-events-none" />

                  {/* Verified White Badge */}
                  {creator.is_verified && (
                    <div className="relative z-10 h-6 px-2.5 rounded-lg bg-[color:var(--ui-paint-ffffff)] text-[color:var(--ui-ink-000000)] text-[11px] font-bold shadow-md inline-flex items-center gap-1">
                      <Check className="w-3 h-3 text-[color:var(--ui-ink-c1121f)] stroke-[3]" />
                      <span>{t("Verified")}</span>
                    </div>
                  )}
                </div>

                {/* Profile Details Container */}
                <div className="px-5 pb-6 pt-0 relative space-y-4">
                  {/* Overlapping Rounded Avatar with Dark Border */}
                  <div className="-mt-12 mb-3">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-[color:var(--ui-line-121215)] bg-[color:var(--ui-paint-18181b)] shadow-lg">
                      <img
                        src={creator.avatar_url || `/api/proxy-image?name=${encodeURIComponent(creator.display_name)}`}
                        alt={creator.display_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Name + White Badge */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-[color:var(--ui-ink-ffffff)] tracking-tight">
                        {creator.display_name}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-md bg-[color:var(--ui-paint-ffffff)]/10 border border-[color:var(--ui-line-ffffff)]/20 text-[color:var(--ui-ink-ffffff)] text-[11px] font-semibold">
                        {creator.niche || "Tech Reviewer"}
                      </span>
                    </div>
                    <p className="text-xs text-[color:var(--ui-ink-7e8697)] mt-1 leading-relaxed">
                      @{creator.handle} • {creator.bio || "In-depth honest hardware reviews, everyday carry gear, and aesthetic workspaces."}
                    </p>
                  </div>

                  {/* Skills / Categories Section (Horizontal Pills) */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] uppercase tracking-wider text-[color:var(--ui-ink-71717a)] font-semibold block">
                      Creator Niches
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(creator.niche ? [creator.niche] : []).map((skill) => (
                        <span
                          key={skill}
                          className="px-2.5 py-1 rounded-lg bg-[color:var(--ui-paint-18181b)] text-[color:var(--ui-ink-neutral-300)] text-[11px] font-medium border border-[color:var(--ui-line-27272a)]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Position Type / Deliverable Types Section */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] uppercase tracking-wider text-[color:var(--ui-ink-71717a)] font-semibold block">
                      Collab Formats
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(new Set(rateCards.map((card) => card.deliverable_type))).map((type) => (
                        <span
                          key={type}
                          className="px-2.5 py-1 rounded-lg bg-[color:var(--ui-paint-18181b)] text-[color:var(--ui-ink-neutral-300)] text-[11px] font-medium border border-[color:var(--ui-line-27272a)]"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Location & Timezone Split Card */}
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)]">
                    <div>
                      <span className="text-[10px] text-[color:var(--ui-ink-71717a)] uppercase font-semibold block">Location</span>
                      <div className="text-xs font-semibold text-[color:var(--ui-ink-ffffff)] mt-0.5 truncate">
                        {creator.location || "Not provided"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-[color:var(--ui-ink-71717a)] uppercase font-semibold block">Timezone</span>
                      <div className="text-xs font-semibold text-[color:var(--ui-ink-ffffff)] mt-0.5 truncate">
                        Not provided
                      </div>
                    </div>
                  </div>

                  {/* Brand Collaborations */}
                  <div className="space-y-2 pt-2 border-t border-[color:var(--ui-line-27272a)]">
                    <span className="text-[11px] uppercase tracking-wider text-[color:var(--ui-ink-71717a)] font-semibold block">
                      Past Brand Partnerships
                    </span>

                    {completedPartnerships.length > 0 ? (
                      <div className="space-y-2">
                        {completedPartnerships.map((deal: any) => (
                          <div
                            key={deal.id}
                            className="p-2.5 rounded-xl bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)] flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-[color:var(--ui-paint-emerald-950)]/80 border border-[color:var(--ui-line-emerald-600)]/30 flex items-center justify-center font-black text-xs text-[color:var(--ui-ink-emerald-400)] shrink-0">
                                {deal.brand?.charAt(0) || "B"}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-[color:var(--ui-ink-ffffff)] truncate">{deal.brand}</div>
                                <div className="text-[10px] text-[color:var(--ui-ink-71717a)] truncate">{deal.deliverable}</div>
                              </div>
                            </div>
                            <span className="text-[10px] text-[color:var(--ui-ink-emerald-400)] font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              {deal.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-[color:var(--ui-paint-18181b)]/60 border border-dashed border-[color:var(--ui-line-27272a)] text-center space-y-1">
                        <p className="text-[11px] text-[color:var(--ui-ink-8c94a6)]">
                          No completed brand partnerships yet
                        </p>
                        <p className="text-[10px] text-[color:var(--ui-ink-71717a)]">
                          Send a collaboration enquiry to discuss your campaign.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Connected Accounts Section Inside Single Card */}
                  <div className="space-y-2 pt-2 border-t border-[color:var(--ui-line-27272a)]">
                    <span className="text-[11px] uppercase tracking-wider text-[color:var(--ui-ink-71717a)] font-semibold block">
                      Connected Channels
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {creator.youtube_channel ? (
                        <a
                          href={`https://youtube.com/@${creator.youtube_channel.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-[color:var(--ui-paint-18181b)] hover:bg-[color:var(--ui-paint-222226)] flex items-center justify-between text-[color:var(--ui-ink-ffffff)] transition-colors border border-[color:var(--ui-line-27272a)]"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <YoutubeIcon className="w-3.5 h-3.5 text-[color:var(--ui-ink-ef4444)] shrink-0" />
                            <span className="font-medium text-[11px] truncate">YouTube</span>
                          </div>
                          <span className="theme-on-accent w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        </a>
                      ) : (
                        <div className="p-2 rounded-xl bg-[color:var(--ui-paint-18181b)] flex items-center justify-between text-[color:var(--ui-ink-ffffff)] border border-[color:var(--ui-line-27272a)]">
                          <div className="flex items-center gap-2 truncate">
                            <YoutubeIcon className="w-3.5 h-3.5 text-[color:var(--ui-ink-ef4444)] shrink-0" />
                            <span className="font-medium text-[11px] truncate">YouTube</span>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-[color:var(--ui-paint-neutral-600)] shrink-0" />
                        </div>
                      )}

                      {creator.instagram_handle ? (
                        <a
                          href={`https://instagram.com/${creator.instagram_handle.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-[color:var(--ui-paint-18181b)] hover:bg-[color:var(--ui-paint-222226)] flex items-center justify-between text-[color:var(--ui-ink-ffffff)] transition-colors border border-[color:var(--ui-line-27272a)]"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <InstagramIcon className="w-3.5 h-3.5 text-[color:var(--ui-ink-ec4899)] shrink-0" />
                            <span className="font-medium text-[11px] truncate">Instagram</span>
                          </div>
                          <span className="theme-on-accent w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        </a>
                      ) : (
                        <div className="p-2 rounded-xl bg-[color:var(--ui-paint-18181b)] flex items-center justify-between text-[color:var(--ui-ink-ffffff)] border border-[color:var(--ui-line-27272a)]">
                          <div className="flex items-center gap-2 truncate">
                            <InstagramIcon className="w-3.5 h-3.5 text-[color:var(--ui-ink-ec4899)] shrink-0" />
                            <span className="font-medium text-[11px] truncate">Instagram</span>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-[color:var(--ui-paint-neutral-600)] shrink-0" />
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
                <div className="p-4 sm:p-5 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] shadow-md space-y-1">
                  <div className="text-2xl sm:text-3xl font-bold text-[color:var(--ui-ink-ffffff)] tracking-tight">
                    --
                  </div>
                  <div className="text-xs text-[color:var(--ui-ink-8c94a6)] font-medium">
                    Sponsor Retention
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] shadow-md space-y-1">
                  <div className="text-2xl sm:text-3xl font-bold text-[color:var(--ui-ink-ffffff)] tracking-tight">
                    --
                  </div>
                  <div className="text-xs text-[color:var(--ui-ink-8c94a6)] font-medium">
                    Availability
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] shadow-md space-y-1">
                  <div className="text-2xl sm:text-3xl font-bold text-[color:var(--ui-ink-ffffff)] tracking-tight">
                    --
                  </div>
                  <div className="text-xs text-[color:var(--ui-ink-8c94a6)] font-medium">
                    On-Time Delivery
                  </div>
                </div>
              </div>

              {/* 2. Middle Row: Aspect Score / Overall Score (Gauge) + Collab Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Aspect Score Card */}
                <div className="p-5 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--ui-ink-8c94a6)]">
                      Aspect Score
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[color:var(--ui-paint-ffffff)]/10 text-[color:var(--ui-ink-ffffff)] font-bold border border-[color:var(--ui-line-ffffff)]/20">
                      Not available
                    </span>
                  </div>

                  {/* Half Circle Arc Gauge with 86 Score */}
                  <div className="flex flex-col items-center justify-center py-2 relative">
                    <div className="relative w-48 h-28 flex items-end justify-center">
                      <svg viewBox="0 0 200 115" className="w-full h-full overflow-visible">
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          stroke="var(--ui-ink-20222c)"
                          strokeWidth="16"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          stroke="var(--ui-ink-ffffff)"
                          strokeWidth="16"
                          strokeDasharray="251.32"
                          strokeDashoffset="251.32"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute bottom-1 text-center select-none">
                        <span className="text-4xl font-extrabold text-[color:var(--ui-ink-ffffff)] tracking-tight">
                          --
                        </span>
                        <span className="block text-[10px] text-[color:var(--ui-ink-7e8697)] font-semibold tracking-wider mt-0.5">
                          --
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-xs text-[color:var(--ui-ink-8c94a6)] pt-1 border-t border-[color:var(--ui-line-27272a)]">
                    Performance data is not available yet.
                  </div>
                </div>

                {/* Overall Highlights & Badges Card */}
                <div className="p-5 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] flex flex-col justify-between space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--ui-ink-8c94a6)]">
                    Partnership Highlights
                  </span>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)]">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-[color:var(--ui-ink-amber-400)] flex items-center justify-center shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[color:var(--ui-ink-ffffff)] font-semibold">No awards yet</div>
                        <div className="text-[10px] text-[color:var(--ui-ink-7e8697)]">Awards will appear when earned</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)]">
                      <div className="w-7 h-7 rounded-lg bg-[color:var(--ui-paint-ffffff)]/10 text-[color:var(--ui-ink-ffffff)] flex items-center justify-center shrink-0 border border-[color:var(--ui-line-ffffff)]/10">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[color:var(--ui-ink-ffffff)] font-semibold">Payment setup pending</div>
                        <div className="text-[10px] text-[color:var(--ui-ink-7e8697)]">No payment protection status available</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)]">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-[color:var(--ui-ink-emerald-400)] flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[color:var(--ui-ink-ffffff)] font-semibold">Turnaround varies by package</div>
                        <div className="text-[10px] text-[color:var(--ui-ink-7e8697)]">See the delivery time on each package</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Creator's Active Rate Cards & Deliverables */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[color:var(--ui-ink-ffffff)] tracking-tight">
                      Available Sponsorship Packages
                    </h3>
                    <p className="text-xs text-[color:var(--ui-ink-8c94a6)] mt-0.5">
                      Select a package to send an enquiry and discuss the scope
                    </p>
                  </div>

                  <button
                    onClick={() => handleOpenBooking()}
                    className="h-8 px-3 rounded-lg bg-[color:var(--ui-paint-18181b)] hover:bg-[color:var(--ui-paint-222226)] border border-[color:var(--ui-line-27272a)] text-xs font-semibold text-[color:var(--ui-ink-ffffff)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Custom Offer</span>
                    <ExternalLink className="w-3 h-3 text-[color:var(--ui-ink-ffffff)]" />
                  </button>
                </div>

                {/* Three-Box Metric Filter Row */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setActiveRateCardFilter("all")}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      activeRateCardFilter === "all"
                        ? "bg-[color:var(--ui-paint-ffffff)]/10 border-[color:var(--ui-line-ffffff)] text-[color:var(--ui-ink-ffffff)] shadow-sm"
                        : "bg-[color:var(--ui-paint-121215)] border-[color:var(--ui-line-27272a)] hover:bg-[color:var(--ui-paint-18181b)]"
                    }`}
                  >
                    <div className="text-xl font-bold text-[color:var(--ui-ink-ffffff)]">{rateCards.length}</div>
                    <div className="text-xs text-[color:var(--ui-ink-7e8697)] font-medium mt-0.5">All Packages</div>
                    {activeRateCardFilter === "all" && (
                      <div className="h-0.5 bg-[color:var(--ui-paint-ffffff)] rounded-full mt-2" />
                    )}
                  </button>

                  {/* Active White Accent Card */}
                  <button
                    onClick={() => setActiveRateCardFilter("new")}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      activeRateCardFilter === "new"
                        ? "bg-[color:var(--ui-paint-ffffff)]/10 border-[color:var(--ui-line-ffffff)] text-[color:var(--ui-ink-ffffff)] shadow-md shadow-white/5"
                        : "bg-[color:var(--ui-paint-121215)] border-[color:var(--ui-line-27272a)] hover:bg-[color:var(--ui-paint-18181b)]"
                    }`}
                  >
                    <div className="text-xl font-bold text-[color:var(--ui-ink-ffffff)]">--</div>
                    <div className="text-xs text-[color:var(--ui-ink-neutral-300)] font-medium mt-0.5">Top Converting</div>
                    {activeRateCardFilter === "new" && (
                      <div className="h-1 bg-[color:var(--ui-paint-ffffff)] rounded-full mt-2 w-full shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                    )}
                  </button>

                  <button
                    onClick={() => setActiveRateCardFilter("vault")}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      activeRateCardFilter === "vault"
                        ? "bg-[color:var(--ui-paint-ffffff)]/10 border-[color:var(--ui-line-ffffff)] text-[color:var(--ui-ink-ffffff)] shadow-sm"
                        : "bg-[color:var(--ui-paint-121215)] border-[color:var(--ui-line-27272a)] hover:bg-[color:var(--ui-paint-18181b)]"
                    }`}
                  >
                    <div className="text-xl font-bold text-[color:var(--ui-ink-emerald-400)]">--</div>
                    <div className="text-xs text-[color:var(--ui-ink-7e8697)] font-medium mt-0.5">Vault Secured</div>
                    {activeRateCardFilter === "vault" && (
                      <div className="theme-on-accent h-0.5 bg-emerald-400 rounded-full mt-2" />
                    )}
                  </button>
                </div>

                {/* Deliverables List */}
                <div className="space-y-3 pt-1">
                  {filteredRateCards.length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)] space-y-2">
                      <div className="text-[color:var(--ui-ink-ffffff)] font-semibold text-sm">No packages published under this filter</div>
                      <p className="text-xs text-[color:var(--ui-ink-8c94a6)]">Contact {creator.display_name} directly to request custom campaign deliverables</p>
                      <button
                        onClick={() => handleOpenBooking()}
                        className="mt-2 h-8 px-4 rounded-lg bg-[color:var(--ui-paint-ffffff)] hover:bg-[color:var(--ui-paint-neutral-200)] text-[color:var(--ui-ink-000000)] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Request Custom Offer</span>
                      </button>
                    </div>
                  ) : (
                    filteredRateCards.map((card) => (
                      <div
                        key={card.id}
                        className="p-4 sm:p-4.5 rounded-xl bg-[color:var(--ui-paint-18181b)] hover:bg-[color:var(--ui-paint-202024)] border border-[color:var(--ui-line-27272a)] hover:border-[color:var(--ui-line-neutral-700)] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-[color:var(--ui-paint-ffffff)]/10 border border-[color:var(--ui-line-ffffff)]/20 text-[color:var(--ui-ink-ffffff)] text-[10px] font-bold">
                              {card.platform}
                            </span>
                            <span className="text-[11px] text-[color:var(--ui-ink-7e8697)] font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[color:var(--ui-ink-neutral-300)]" />
                              {card.turnaround_days} Days Turnaround
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-[color:var(--ui-ink-ffffff)] truncate group-hover:text-[color:var(--ui-ink-ffffff)] transition-colors">
                            {card.title}
                          </h4>
                          <p className="text-xs text-[color:var(--ui-ink-8c94a6)] line-clamp-1">
                            {card.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-[color:var(--ui-line-27272a)]">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] uppercase text-[color:var(--ui-ink-686f82)] font-semibold block">Rate</span>
                            <span className="text-base font-bold text-[color:var(--ui-ink-ffffff)]">
                              {card.currency === "USD" ? "$" : "₹"}
                              {(card.base_price_cents / 100).toLocaleString(
                                card.currency === "USD" ? "en-US" : "en-IN"
                              )}
                            </span>
                          </div>

                          <button
                            onClick={() => handleOpenBooking(card)}
                            className="h-9 px-4 rounded-lg bg-[color:var(--ui-paint-ffffff)] hover:bg-[color:var(--ui-paint-neutral-200)] text-[color:var(--ui-ink-000000)] font-bold text-xs transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
                          >
                            Send enquiry
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
        {bookingModalOpen && <EnquiryComposer creator={creator} rateCard={selectedRateCard} onClose={() => setBookingModalOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
