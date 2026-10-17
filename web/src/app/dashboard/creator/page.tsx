"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  DollarSign,
  Link2,
  QrCode,
  User,
  Plus,
  Copy,
  ExternalLink,
  Check,
  TrendingUp,
  Clock,
  Trash2,
  Share2,
  Award,
  ShieldCheck,
  Video,
  Briefcase,
  Users,
  Bell,
  ChevronRight,
  ChevronDown,
  Wallet,
  ArrowUpRight,
  FileText,
  CheckCircle2,
  LayoutDashboard,
  Calendar,
  Wand2,
  Bot,
  Sliders,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { CreatorProfileHeader } from "@/components/creator/creator-profile-header";
import { CreatorScheduleCalendar } from "@/components/creator/creator-schedule-calendar";
import { CreatorCollabPipeline } from "@/components/creator/creator-collab-pipeline";
import { CreatorAnalyticsView } from "@/components/creator/creator-analytics-view";
import { CreatorPortfolioView } from "@/components/creator/creator-portfolio-view";
import { CreatorWalletView } from "@/components/creator/creator-wallet-view";
import { CreatorAiPitcher } from "@/components/creator/creator-ai-pitcher";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslation } from "@/lib/i18n/language-context";

export type CreatorDashboardTab =
  | "overview"
  | "pipeline"
  | "ratecards"
  | "calendar"
  | "analytics"
  | "portfolio"
  | "links"
  | "wallet"
  | "ai_pitcher";

interface RateCardItem {
  id: string;
  platform: string;
  deliverable_type: string;
  title: string;
  price_dollars: number;
  turnaround_days: number;
}

interface TrackedLinkItem {
  id: string;
  title: string;
  short_code: string;
  destination: string;
  clicks: number;
}

const TAB_TITLES: Record<CreatorDashboardTab, string> = {
  overview: "Studio Overview",
  pipeline: "Collab Pipeline & Vault",
  ratecards: "Rate Cards & Packages",
  calendar: "Shoot & Collab Calendar",
  analytics: "Verified Audience Analytics",
  portfolio: "Brand Portfolio & Case Studies",
  links: "Smart Links & Dynamic QR",
  wallet: "Flenzr Vault & Invoicing",
  ai_pitcher: "AI Deal Negotiator & Rates",
};

export default function CreatorDashboardPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<CreatorDashboardTab>("overview");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [creatorName, setCreatorName] = useState("Subramanya Shenoy");
  const [creatorHandle, setCreatorHandle] = useState("subu_creates");
  const [creatorNiche, setCreatorNiche] = useState("Technology & Hardware");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  // AI Pitcher shared state
  const [aiPitchBrand, setAiPitchBrand] = useState("Dyson India");
  const [aiPitchOffer, setAiPitchOffer] = useState("₹35,000");

  // Rate Cards state
  const [rateCards, setRateCards] = useState<RateCardItem[]>([]);

  const [instagramHandle, setInstagramHandle] = useState("");
  const [youtubeChannel, setYoutubeChannel] = useState("");
  const [isInstagramBioVerified, setIsInstagramBioVerified] = useState(false);
  const [isYoutubeBioVerified, setIsYoutubeBioVerified] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002/api/v1";

    let authSession: any = null;
    let storedProfile: any = null;

    try {
      const rawSession = localStorage.getItem("flenzr_auth_session");
      if (rawSession) authSession = JSON.parse(rawSession);
    } catch (e) {
      console.warn("Could not parse auth session", e);
    }

    try {
      const rawProfile = localStorage.getItem("flenzr_creator_profile");
      if (rawProfile) storedProfile = JSON.parse(rawProfile);
    } catch (e) {
      console.warn("Could not parse stored profile", e);
    }

    let targetHandle = storedProfile?.handle || authSession?.handle || "";
    let targetEmail = storedProfile?.email || authSession?.email || "";

    if (storedProfile) {
      if (storedProfile.fullName) setCreatorName(storedProfile.fullName);
      if (storedProfile.handle) setCreatorHandle(storedProfile.handle);
      if (storedProfile.niche) setCreatorNiche(storedProfile.niche);
      if (storedProfile.instagramHandle) setInstagramHandle(storedProfile.instagramHandle);
      if (storedProfile.youtubeChannel) setYoutubeChannel(storedProfile.youtubeChannel);
      if (storedProfile.isInstagramBioVerified !== undefined) {
        setIsInstagramBioVerified(storedProfile.isInstagramBioVerified);
      }
      if (storedProfile.isYoutubeBioVerified !== undefined) {
        setIsYoutubeBioVerified(storedProfile.isYoutubeBioVerified);
      }
      if (Array.isArray(storedProfile.rateCards) && storedProfile.rateCards.length > 0) {
        setRateCards(
          storedProfile.rateCards.map((rc: any, idx: number) => ({
            id: `stored-${idx}`,
            platform: rc.platform || "Instagram",
            deliverable_type: rc.deliverable || "Dedicated Video",
            title: rc.title || `${rc.platform || "Platform"} Deliverable`,
            price_dollars: rc.price || 500,
            turnaround_days: rc.days || 7,
          }))
        );
      }
    }

    const loadBackendData = async () => {
      let liveCreator: any = null;
      if (targetHandle) {
        try {
          const res = await fetch(`${apiUrl}/creators/public/${encodeURIComponent(targetHandle)}`);
          if (res.ok) liveCreator = await res.json();
        } catch {}
      }

      if (!liveCreator && targetEmail) {
        try {
          const res = await fetch(`${apiUrl}/creators/by-email/${encodeURIComponent(targetEmail)}`);
          if (res.ok) liveCreator = await res.json();
        } catch {}
      }

      if (liveCreator) {
        if (liveCreator.display_name) setCreatorName(liveCreator.display_name);
        if (liveCreator.handle) setCreatorHandle(liveCreator.handle);
        if (liveCreator.niche) setCreatorNiche(liveCreator.niche);
        if (liveCreator.avatar_url) setAvatarUrl(liveCreator.avatar_url);
        if (liveCreator.instagram_handle) setInstagramHandle(liveCreator.instagram_handle);
        if (liveCreator.youtube_channel) setYoutubeChannel(liveCreator.youtube_channel);
        if (liveCreator.instagram_verified !== undefined) {
          setIsInstagramBioVerified(liveCreator.instagram_verified);
        }
        if (liveCreator.youtube_verified !== undefined) {
          setIsYoutubeBioVerified(liveCreator.youtube_verified);
        }

        const handleForRatecards = liveCreator.handle || targetHandle || "subu_creates";
        try {
          const cardsRes = await fetch(`${apiUrl}/ratecards/creator/${encodeURIComponent(handleForRatecards)}`);
          if (cardsRes.ok) {
            const liveCards = await cardsRes.json();
            if (Array.isArray(liveCards) && liveCards.length > 0) {
              setRateCards(
                liveCards.map((rc: any) => ({
                  id: rc.id,
                  platform: rc.platform.charAt(0).toUpperCase() + rc.platform.slice(1),
                  deliverable_type: rc.deliverable_type,
                  title: rc.title,
                  price_dollars: Math.round((rc.base_price_cents || 0) / 100),
                  turnaround_days: rc.turnaround_days,
                }))
              );
            }
          }
        } catch {}
      }
    };

    loadBackendData();
  }, []);

  // Form for new rate card
  const [newPlatform, setNewPlatform] = useState("YouTube");
  const [newDeliverable, setNewDeliverable] = useState("Dedicated Video");
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("25000");
  const [newTurnaround, setNewTurnaround] = useState("7");
  const [showAddRateCard, setShowAddRateCard] = useState(false);

  // Tracked Links state
  const [linksSubTab, setLinksSubTab] = useState<"links" | "qr">("links");
  const [trackedLinks, setTrackedLinks] = useState<TrackedLinkItem[]>([
    {
      id: "tl-1",
      title: "Microphone Audio Setup",
      short_code: "shure-sm7b",
      destination: "https://brand.example.com/products/sm7b",
      clicks: 438,
    },
    {
      id: "tl-2",
      title: "4K Video Lighting Kit",
      short_code: "aputure-light",
      destination: "https://shop.example.com/aputure-100d",
      clicks: 215,
    },
  ]);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkCode, setNewLinkCode] = useState("");

  // QR state
  const [qrColor, setQrColor] = useState("#09090b");

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(`http://localhost:8002/r/${code}`);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleAddRateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    const newItem: RateCardItem = {
      id: `rc-${Date.now()}`,
      platform: newPlatform,
      deliverable_type: newDeliverable,
      title: newTitle,
      price_dollars: Number(newPrice) || 500,
      turnaround_days: Number(newTurnaround) || 7,
    };
    setRateCards([...rateCards, newItem]);
    setNewTitle("");
    setShowAddRateCard(false);
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkTitle || !newLinkUrl) return;
    const code = newLinkCode || Math.random().toString(36).substring(2, 8);
    const newLink: TrackedLinkItem = {
      id: `tl-${Date.now()}`,
      title: newLinkTitle,
      short_code: code,
      destination: newLinkUrl,
      clicks: 0,
    };
    setTrackedLinks([newLink, ...trackedLinks]);
    setNewLinkTitle("");
    setNewLinkUrl("");
    setNewLinkCode("");
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f1f3f7] antialiased flex selection:bg-[#c1121f] selection:text-white">
      {/* ========================================================= */}
      {/* 1. SLIM LEFT NAVIGATION RAIL                              */}
      {/* ========================================================= */}
      <aside className="hidden lg:flex w-16 shrink-0 bg-[#09090b] border-r border-[#27272a] flex-col items-center py-4 justify-between select-none z-30 sticky top-0 h-screen">
        <div className="flex flex-col items-center gap-4 w-full">
          {/* Logo */}
          <Link
            href="/"
            title="Flenzr Home"
            className="w-10 h-10 rounded-xl bg-[#121215] border border-[#27272a] hover:border-neutral-600 flex items-center justify-center transition-all hover:scale-105 group"
          >
            <Logo size={24} variant="duotone-dark" />
          </Link>

          {/* Navigation Items Grouped */}
          <nav className="flex flex-col items-center gap-1.5 w-full px-2">
            {/* 1. WORKSPACE GROUP */}
            <button
              onClick={() => setActiveTab("overview")}
              title="Studio Overview"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeTab === "overview"
                  ? "bg-white text-black font-bold shadow-md shadow-white/20"
                  : "text-[#71717a] hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTab("pipeline")}
              title="Collab Pipeline & Vault (3 Active)"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeTab === "pipeline"
                  ? "bg-white text-black font-bold shadow-md shadow-white/20"
                  : "text-[#71717a] hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#c1121f] text-white text-[9px] font-bold flex items-center justify-center border-2 border-[#09090b]">
                3
              </span>
            </button>

            <button
              onClick={() => setActiveTab("ratecards")}
              title="Rate Cards & Offerings"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeTab === "ratecards"
                  ? "bg-white text-black font-bold shadow-md shadow-white/20"
                  : "text-[#71717a] hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <DollarSign className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTab("calendar")}
              title="Shoot & Collab Calendar (2 Due)"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeTab === "calendar"
                  ? "bg-white text-black font-bold shadow-md shadow-white/20"
                  : "text-[#71717a] hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-black flex items-center justify-center border-2 border-[#09090b]">
                2
              </span>
            </button>

            {/* SEPARATOR */}
            <div className="w-6 h-[1px] bg-[#27272a] my-1" />

            {/* 2. GROWTH & PROOF GROUP */}
            <button
              onClick={() => setActiveTab("analytics")}
              title="Verified Audience Analytics"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeTab === "analytics"
                  ? "bg-white text-black font-bold shadow-md shadow-white/20"
                  : "text-[#71717a] hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTab("portfolio")}
              title="Brand Portfolio & Case Studies"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeTab === "portfolio"
                  ? "bg-white text-black font-bold shadow-md shadow-white/20"
                  : "text-[#71717a] hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <Award className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTab("links")}
              title="Smart Links & QR Studio"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeTab === "links"
                  ? "bg-white text-black font-bold shadow-md shadow-white/20"
                  : "text-[#71717a] hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <Link2 className="w-4 h-4" />
            </button>

            {/* SEPARATOR */}
            <div className="w-6 h-[1px] bg-[#27272a] my-1" />

            {/* 3. TOOLS & FINANCES */}
            <button
              onClick={() => setActiveTab("wallet")}
              title="Flenzr Vault & Auto-Invoicing"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeTab === "wallet"
                  ? "bg-white text-black font-bold shadow-md shadow-white/20"
                  : "text-[#71717a] hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <Wallet className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTab("ai_pitcher")}
              title="AI Deal Negotiator & Rate Estimator"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeTab === "ai_pitcher"
                  ? "bg-white text-black font-bold shadow-md shadow-white/20"
                  : "text-[#71717a] hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <Wand2 className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded bg-white text-black text-[8px] font-black tracking-tight border-2 border-[#09090b]">
                AI
              </span>
            </button>
          </nav>
        </div>

        {/* Bottom Public Link */}
        <div className="flex flex-col items-center gap-2">
          <Link
            href={`/${creatorHandle}`}
            target="_blank"
            title="View Public Media Kit"
            className="w-10 h-10 rounded-xl bg-[#121215] hover:bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. MAIN CREATOR DASHBOARD WORKSPACE                       */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-[#27272a] bg-[#09090b]/90 backdrop-blur-md px-4 sm:px-5 lg:px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs text-[#8c94a6]">
            <Link href="/" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Studio</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-[#525866]" />
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className="px-2.5 py-1 rounded-md bg-[#18181b] border border-[#27272a] text-white font-semibold hover:border-neutral-600 transition-colors cursor-pointer"
            >
              {creatorName}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-[#525866]" />
            <span className="text-white font-bold">{TAB_TITLES[activeTab]}</span>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <LanguageSwitcher variant="compact" />
            <Link
              href={`/${creatorHandle}`}
              target="_blank"
              className="h-9 px-3.5 rounded-lg bg-white hover:bg-neutral-200 text-black font-bold inline-flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02]"
            >
              <span className="hidden sm:inline">View Public Media Kit</span>
              <span className="sm:hidden">Media Kit</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.removeItem("flenzr_auth_session");
                  localStorage.removeItem("flenzr_creator_profile");
                  localStorage.removeItem("flenzr_token");
                  window.location.href = "/login";
                }
              }}
              className="h-9 px-3 rounded-lg border border-[#27272a] bg-[#18181b] hover:bg-[#222226] text-[#a1a1aa] hover:text-white font-medium transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Dashboard Main Workspace */}
        <main className="p-4 sm:p-5 lg:p-6 space-y-5 max-w-[1540px] w-full mx-auto">
          {/* TAB 1: STUDIO OVERVIEW (3-COLUMN COMMAND CENTER) */}
          {activeTab === "overview" && (
            <div className="flex flex-col lg:flex-row gap-5 items-start justify-center w-full">
              {/* Profile Card Column */}
              <div className="w-full lg:w-[330px] shrink-0 space-y-5">
                <CreatorProfileHeader
                  creator={{
                    handle: creatorHandle,
                    display_name: creatorName,
                    niche: creatorNiche,
                    rating: 5.0,
                    is_verified: isInstagramBioVerified && isYoutubeBioVerified,
                    profile_theme: "default",
                    avatar_url: avatarUrl,
                    instagram_handle: instagramHandle,
                    instagram_verified: isInstagramBioVerified,
                    youtube_channel: youtubeChannel,
                    youtube_verified: isYoutubeBioVerified,
                  }}
                  isEditable={true}
                />
              </div>

              {/* Center Column: KPIs & Highlights */}
              <div className="w-full lg:w-[740px] xl:w-[750px] 2xl:w-[770px] space-y-5">
                {/* KPI Cards */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#121215] border border-[#27272a] shadow-md space-y-1">
                    <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      ₹3,80,000
                    </div>
                    <div className="text-xs text-[#8c94a6] font-medium">
                      Collab Revenue (MoM +18%)
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-[#121215] border border-[#27272a] shadow-md space-y-1">
                    <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      91%
                    </div>
                    <div className="text-xs text-[#8c94a6] font-medium">
                      Sponsor Retention Rate
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

                {/* Aspect Score Gauge + Collab Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <div className="pt-2 border-t border-[#27272a] flex items-center justify-between text-xs">
                      <span className="text-[#8c94a6]">Industry Tier</span>
                      <span className="font-semibold text-white">Tier 1 Creator</span>
                    </div>
                  </div>

                  {/* Trust Highlights */}
                  <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] flex flex-col justify-between space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8c94a6]">
                      Flenzr Trust Highlights
                    </span>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#18181b] border border-[#27272a]">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <Award className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-white font-semibold">Spotlight Creator Badge</div>
                          <div className="text-[10px] text-[#7e8697]">Eligible for brand marketplace priority</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#18181b] border border-[#27272a]">
                        <div className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-white font-semibold">Flenzr Vault Payouts</div>
                          <div className="text-[10px] text-[#7e8697]">Zero commission fees directly to your bank</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#18181b] border border-[#27272a]">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-white font-semibold">100% On-Time Delivery</div>
                          <div className="text-[10px] text-[#7e8697]">Avg. turnaround within 5-7 days</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Collab Pipeline Preview Card */}
                <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Active Brand Collabs</h3>
                      <p className="text-xs text-[#8c94a6]">Deals currently secured in Flenzr Vault</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("pipeline")}
                      className="text-xs text-white hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open Full Pipeline</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-white text-[13px]">Sony India</div>
                        <div className="text-[10px] text-[#8c94a6]">60s Cinematic FX3 Reel • Due Oct 21</div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-white block">₹45,000</span>
                        <span className="text-[10px] text-emerald-400 font-semibold">In Vault 🔒</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-white text-[13px]">Keychron</div>
                        <div className="text-[10px] text-[#8c94a6]">Dedicated 4K Review • Due Oct 26</div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-white block">₹35,000</span>
                        <span className="text-[10px] text-emerald-400 font-semibold">In Vault 🔒</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Calendar & Wallet */}
              <div className="w-full xl:w-[320px] 2xl:w-[340px] shrink-0 space-y-5">
                <CreatorScheduleCalendar />

                {/* Quick Wallet Snippet */}
                <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Flenzr Vault</h4>
                        <p className="text-[10px] text-[#7e8697]">HDFC Bank •••• 4892</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("wallet")}
                      className="text-[10px] text-white hover:underline font-semibold cursor-pointer"
                    >
                      Invoices →
                    </button>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#686f82] tracking-wider block">
                      Available for Payout
                    </span>
                    <div className="text-3xl font-extrabold text-white tracking-tight">
                      ₹1,45,000
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab("wallet")}
                    className="w-full h-9 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    <span>Manage Payouts</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COLLAB PIPELINE */}
          {activeTab === "pipeline" && (
            <CreatorCollabPipeline
              onNavigateToAI={(brand, offer) => {
                setAiPitchBrand(brand);
                setAiPitchOffer(offer);
                setActiveTab("ai_pitcher");
              }}
            />
          )}

          {/* TAB 3: RATE CARDS & PACKAGES */}
          {activeTab === "ratecards" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121215] border border-[#27272a] shadow-md">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Active Deliverables &amp; Rate Cards
                  </h2>
                  <p className="text-xs text-[#8c94a6] mt-0.5">
                    Packages displayed on your public media kit and in brand discovery.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddRateCard(!showAddRateCard)}
                  className="h-9 px-4 rounded-xl text-xs font-semibold bg-white hover:bg-neutral-200 text-black transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Rate Card</span>
                </button>
              </div>

              {/* Add Rate Card Drawer */}
              {showAddRateCard && (
                <form
                  onSubmit={handleAddRateCard}
                  className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 space-y-4 shadow-xl text-white text-xs"
                >
                  <h4 className="font-bold text-white">New Deliverable Offering</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[#8c94a6] mb-1 font-medium">Platform</label>
                      <select
                        value={newPlatform}
                        onChange={(e) => setNewPlatform(e.target.value)}
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                      >
                        <option>YouTube</option>
                        <option>Instagram</option>
                        <option>TikTok</option>
                        <option>Podcast</option>
                        <option>Newsletter</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#8c94a6] mb-1 font-medium">Deliverable Type</label>
                      <input
                        type="text"
                        value={newDeliverable}
                        onChange={(e) => setNewDeliverable(e.target.value)}
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                        placeholder="e.g. Dedicated Video"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8c94a6] mb-1 font-medium">Price (INR ₹)</label>
                      <input
                        type="number"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                        placeholder="25000"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8c94a6] mb-1 font-medium">Turnaround Days</label>
                      <input
                        type="number"
                        value={newTurnaround}
                        onChange={(e) => setNewTurnaround(e.target.value)}
                        className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                        placeholder="7"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#8c94a6] mb-1 font-medium">Package Title &amp; Details</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                      placeholder="e.g. 60-second product integration with custom call-to-action"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddRateCard(false)}
                      className="px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:text-white font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg font-semibold bg-white text-black hover:bg-neutral-200 cursor-pointer shadow-sm"
                    >
                      Publish Package
                    </button>
                  </div>
                </form>
              )}

              {/* Rate Cards Grid */}
              <div className="space-y-3">
                {rateCards.map((card) => (
                  <div
                    key={card.id}
                    className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-white text-[10px] font-bold">
                          {card.platform}
                        </span>
                        <span className="text-[11px] text-[#7e8697] font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          {card.turnaround_days} Days Turnaround
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-white truncate group-hover:text-neutral-300 transition-colors">
                        {card.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-[#27272a]">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase text-[#686f82] font-semibold block">Base Rate</span>
                        <span className="text-base font-bold text-white">
                          ₹{card.price_dollars.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <button
                        onClick={() => setRateCards(rateCards.filter((c) => c.id !== card.id))}
                        className="text-[#686f82] hover:text-rose-400 p-1.5 rounded-lg hover:bg-[#222226] transition-colors cursor-pointer"
                        title="Delete package"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Rights & Licensing Add-ons */}
              <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4">
                <h3 className="text-sm font-bold text-white">Deliverable Licensing &amp; Usage Add-Ons</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] space-y-1">
                    <div className="font-bold text-white">UGC Brand Social Rights</div>
                    <div className="text-[11px] text-[#8c94a6]">+30% of base fee</div>
                    <p className="text-[10px] text-[#71717a]">Allows brand to repost video on their own social handles</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] space-y-1">
                    <div className="font-bold text-white">30-Day Paid Meta Whitelisting</div>
                    <div className="text-[11px] text-[#8c94a6]">+50% of base fee</div>
                    <p className="text-[10px] text-[#71717a]">Brand runs paid ad campaigns from your verified handle</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] space-y-1">
                    <div className="font-bold text-white">Category Exclusivity (90d)</div>
                    <div className="text-[11px] text-[#8c94a6]">+100% of base fee</div>
                    <p className="text-[10px] text-[#71717a]">Guarantees no competing brands promoted for 3 months</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CALENDAR */}
          {activeTab === "calendar" && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] shadow-md">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Collab &amp; Shoot Schedule
                </h2>
                <p className="text-xs text-[#8c94a6] mt-0.5">
                  Full production calendar with draft deadlines, brand review rounds, and payout release dates.
                </p>
              </div>

              <div className="max-w-2xl mx-auto">
                <CreatorScheduleCalendar />
              </div>
            </div>
          )}

          {/* TAB 5: ANALYTICS */}
          {activeTab === "analytics" && <CreatorAnalyticsView />}

          {/* TAB 6: PORTFOLIO & CASE STUDIES */}
          {activeTab === "portfolio" && <CreatorPortfolioView />}

          {/* TAB 7: SMART LINKS & QR STUDIO */}
          {activeTab === "links" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121215] border border-[#27272a] shadow-md">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Smart Attribution Links &amp; Dynamic QR Studio
                  </h2>
                  <p className="text-xs text-[#8c94a6] mt-0.5">
                    Track real-time commercial clicks for sponsors and generate print-ready dynamic QR codes.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-[#18181b] p-1 rounded-xl border border-[#27272a] text-xs">
                  <button
                    type="button"
                    onClick={() => setLinksSubTab("links")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      linksSubTab === "links"
                        ? "bg-white text-black font-bold shadow-sm"
                        : "text-[#8c94a6] hover:text-white"
                    }`}
                  >
                    Tracked Links ({trackedLinks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinksSubTab("qr")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      linksSubTab === "qr"
                        ? "bg-white text-black font-bold shadow-sm"
                        : "text-[#8c94a6] hover:text-white"
                    }`}
                  >
                    Dynamic QR Studio
                  </button>
                </div>
              </div>

              {linksSubTab === "links" ? (
                <div className="space-y-5">
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shadow-sm text-white">
                    <h4 className="font-bold text-white text-xs mb-3">Create New Short Tracked Link</h4>
                    <form onSubmit={handleAddLink} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[#8c94a6] mb-1 font-medium">Link Title</label>
                        <input
                          type="text"
                          value={newLinkTitle}
                          onChange={(e) => setNewLinkTitle(e.target.value)}
                          placeholder="e.g. Sony FX3 Camera"
                          className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[#8c94a6] mb-1 font-medium">Destination URL</label>
                        <input
                          type="url"
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          placeholder="https://brand.com/affiliate-link"
                          className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                          required
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-[#8c94a6] mb-1 font-medium">Custom Slug</label>
                          <input
                            type="text"
                            value={newLinkCode}
                            onChange={(e) => setNewLinkCode(e.target.value)}
                            placeholder="fx3-deal"
                            className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                          />
                        </div>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-white text-black font-bold rounded-lg hover:bg-neutral-200 cursor-pointer h-[34px] shadow-sm"
                        >
                          Create
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Links Table */}
                  <div className="space-y-2">
                    {trackedLinks.map((link) => (
                      <div
                        key={link.id}
                        className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <h5 className="font-semibold text-white truncate">{link.title}</h5>
                          <div className="flex items-center gap-2 text-[#7e8697]">
                            <span className="font-mono text-white">/r/{link.short_code}</span>
                            <span>•</span>
                            <span className="truncate max-w-xs">{link.destination}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <span className="block font-bold text-white">{link.clicks}</span>
                            <span className="text-[10px] text-[#686f82] uppercase font-semibold">Clicks</span>
                          </div>

                          <button
                            onClick={() => handleCopy(link.short_code)}
                            className="px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#222226] border border-[#27272a] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            {copiedCode === link.short_code ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-md mx-auto text-center space-y-5 py-4 p-6 rounded-2xl bg-[#121215] border border-[#27272a]">
                  <div>
                    <h4 className="text-base font-bold text-white">Dynamic Media Kit QR Code</h4>
                    <p className="text-xs text-[#8c94a6] mt-0.5">
                      Scan directly to your live Flenzr media kit &amp; rate card profile
                    </p>
                  </div>

                  <div className="w-52 h-52 mx-auto rounded-2xl bg-white p-3 shadow-xl flex items-center justify-center border-4 border-[#27272a]">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                        typeof window !== "undefined"
                          ? `${window.location.origin}/${creatorHandle}`
                          : `https://flenzr.com/@${creatorHandle}`
                      )}&color=${qrColor.replace("#", "")}&bgcolor=ffffff`}
                      alt="Dynamic QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xs text-[#8c94a6] font-medium">QR Color:</span>
                    {[
                      { name: "Black", hex: "#09090b" },
                      { name: "Crimson", hex: "#c1121f" },
                      { name: "Slate", hex: "#475569" },
                      { name: "Emerald", hex: "#10b981" },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        title={c.name}
                        onClick={() => setQrColor(c.hex)}
                        style={{ backgroundColor: c.hex }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                          qrColor === c.hex ? "scale-125 border-white ring-2 ring-white" : "border-[#3d4254]"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="pt-2">
                    <a
                      href={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(
                        typeof window !== "undefined"
                          ? `${window.location.origin}/${creatorHandle}`
                          : `https://flenzr.com/@${creatorHandle}`
                      )}&color=${qrColor.replace("#", "")}&bgcolor=ffffff`}
                      download={`${creatorHandle}-flenzr-qr.png`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-10 px-5 rounded-lg bg-white hover:bg-neutral-200 text-black font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Download Print-Ready PNG</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: WALLET & INVOICES */}
          {activeTab === "wallet" && <CreatorWalletView />}

          {/* TAB 9: AI DEAL NEGOTIATOR */}
          {activeTab === "ai_pitcher" && (
            <CreatorAiPitcher
              initialBrand={aiPitchBrand}
              initialOffer={aiPitchOffer}
              creatorHandle={creatorHandle}
            />
          )}
        </main>
      </div>
    </div>
  );
}
