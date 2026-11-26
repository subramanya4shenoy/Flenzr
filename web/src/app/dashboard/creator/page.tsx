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
  Calendar,
  Bot,
  Sliders,
} from "lucide-react";
import { HowItWorks } from "@/components/help/how-it-works";
import { useCreatorWorkspace } from "@/components/creator/creator-workspace";
import { CreatorProfileHeader } from "@/components/creator/creator-profile-header";
import { CreatorScheduleCalendar } from "@/components/creator/creator-schedule-calendar";
import {
  getInitialDealsForProfile,
  PipelineDeal,
} from "@/components/creator/creator-collab-pipeline";
import { CampaignOpportunities } from "@/components/campaigns/campaign-opportunities";
import { CampaignActivity } from "@/components/campaigns/campaign-activity";
import { CreatorAnalyticsView } from "@/components/creator/creator-analytics-view";
import { CreatorPortfolioView } from "@/components/creator/creator-portfolio-view";
import { CreatorWalletView } from "@/components/creator/creator-wallet-view";
import { CreatorAiPitcher } from "@/components/creator/creator-ai-pitcher";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { useTranslation } from "@/lib/i18n/language-context";

export type { CreatorDashboardTab } from "@/components/creator/creator-sidebar";

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

export default function CreatorDashboardPage() {
  const { t } = useTranslation();
  const workspace = useCreatorWorkspace();
  if (!workspace) throw new Error("Creator workspace is unavailable");
  const { activeTab, selectTab: setActiveTab, updateProfile } = workspace;
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [creatorName, setCreatorName] = useState("Creator");
  const [creatorHandle, setCreatorHandle] = useState("");
  useEffect(() => { if (creatorHandle) updateProfile(creatorName, creatorHandle); }, [creatorName, creatorHandle, updateProfile]);
  const [creatorNiche, setCreatorNiche] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  // AI Pitcher shared state
  const [aiPitchBrand, setAiPitchBrand] = useState("");
  const [aiPitchOffer, setAiPitchOffer] = useState("");

  // Rate Cards state
  const [rateCards, setRateCards] = useState<RateCardItem[]>([]);

  const [instagramHandle, setInstagramHandle] = useState("");
  const [youtubeChannel, setYoutubeChannel] = useState("");
  const [isInstagramBioVerified, setIsInstagramBioVerified] = useState(false);
  const [isYoutubeBioVerified, setIsYoutubeBioVerified] = useState(false);

  // Dynamic pipeline deals & vault balance
  const [pipelineDeals, setPipelineDeals] = useState<PipelineDeal[]>([]);
  const [vaultBalance, setVaultBalance] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8210/api/v1";

    const loadBackendData = async () => {
      let liveCreator: any = null;
      try {
        const res = await fetch("/api/account/creators/me", { cache: "no-store" });
        if (res.ok) liveCreator = await res.json();
        else if (res.status === 401 || res.status === 403) window.location.assign("/login");
      } catch {}

      if (liveCreator) {
        if (liveCreator.display_name) setCreatorName(liveCreator.display_name);
        if (liveCreator.handle) setCreatorHandle(liveCreator.handle);
        if (liveCreator.niche) setCreatorNiche(liveCreator.niche);
        if (liveCreator.avatar_url) setAvatarUrl(liveCreator.avatar_url);
        setInstagramHandle(liveCreator.instagram_handle || "");
        setYoutubeChannel(liveCreator.youtube_channel || "");
        if (liveCreator.instagram_verified !== undefined) {
          setIsInstagramBioVerified(liveCreator.instagram_verified);
        }
        if (liveCreator.youtube_verified !== undefined) {
          setIsYoutubeBioVerified(liveCreator.youtube_verified);
        }

        try {
          const email = localStorage.getItem("flenzr_account_email") || "";
          localStorage.setItem(
            "flenzr_auth_session",
            JSON.stringify({
              email,
              fullName: liveCreator.display_name || "Creator",
              handle: liveCreator.handle || "",
              role: "creator",
              avatarUrl: liveCreator.avatar_url || null,
            })
          );
        } catch {}

        const handleForRatecards = liveCreator.handle;
        try {
          const cardsRes = await fetch(`${apiUrl}/ratecards/creator/${encodeURIComponent(handleForRatecards)}`);
          if (cardsRes.ok) {
            const liveCards = await cardsRes.json();
            if (Array.isArray(liveCards)) {
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

    const syncPipelineAndVaultData = () => {
      try {
        const storedDeals = localStorage.getItem("flenzr_collab_pipeline_deals");
        if (storedDeals) {
          const parsed = JSON.parse(storedDeals);
          if (Array.isArray(parsed)) {
            setPipelineDeals(parsed);
          }
        } else {
          setPipelineDeals([]);
        }
      } catch {}

      try {
        const storedBal = localStorage.getItem("flenzr_vault_available_balance");
        if (storedBal) {
          const parsedBal = parseInt(storedBal, 10);
          if (!isNaN(parsedBal)) setVaultBalance(parsedBal);
        } else {
          setVaultBalance(0);
        }
      } catch {}
    };

    loadBackendData();
    syncPipelineAndVaultData();

    window.addEventListener("flenzr_socials_updated", loadBackendData);
    window.addEventListener("flenzr_pipeline_updated", syncPipelineAndVaultData);
    window.addEventListener("flenzr_vault_updated", syncPipelineAndVaultData);

    return () => {
      window.removeEventListener("flenzr_socials_updated", loadBackendData);
      window.removeEventListener("flenzr_pipeline_updated", syncPipelineAndVaultData);
      window.removeEventListener("flenzr_vault_updated", syncPipelineAndVaultData);
    };
  }, []);

  // Form for new rate card
  const [newPlatform, setNewPlatform] = useState("YouTube");
  const [newDeliverable, setNewDeliverable] = useState("Dedicated Video");
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newTurnaround, setNewTurnaround] = useState("7");
  const [showAddRateCard, setShowAddRateCard] = useState(false);

  // Tracked Links state
  const [linksSubTab, setLinksSubTab] = useState<"links" | "qr">("links");
  const [trackedLinks, setTrackedLinks] = useState<TrackedLinkItem[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkCode, setNewLinkCode] = useState("");

  // QR state
  const [qrColor, setQrColor] = useState("#09090b");

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(new URL(`/r/${encodeURIComponent(code)}`, process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8210/api/v1").toString());
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
      price_dollars: Number(newPrice) || 0,
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

  const completedDeals = pipelineDeals.filter((d) => d.stage === "completed");
  const activeBrandCollabs = pipelineDeals.filter(
    (d) => d.stage === "locked" || d.stage === "review"
  );
  const completedRevenue = completedDeals.reduce((sum, d) => {
    const num = parseInt(d.amount?.replace(/[^0-9]/g, "") || "0", 10) || 0;
    return sum + num;
  }, 0);

  const dynamicAspectScore = 0; // No trust-score data is available yet.
  const tierBadge = "Not rated yet";

  return (
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
                    rating: 0,
                    is_verified: isInstagramBioVerified || isYoutubeBioVerified,
                    profile_theme: "default",
                    avatar_url: avatarUrl,
                    instagram_handle: instagramHandle,
                    instagram_verified: isInstagramBioVerified,
                    youtube_channel: youtubeChannel,
                    youtube_verified: isYoutubeBioVerified,
                  }}
                  isEditable={true}
                  rateCards={rateCards}
                  completedDeals={completedDeals}
                />
              </div>

              {/* Center Column: KPIs & Highlights */}
              <div className="w-full lg:w-[740px] xl:w-[750px] 2xl:w-[770px] space-y-5">
                {/* KPI Cards */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-4 sm:p-5 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] shadow-md space-y-1">
                    <div className="text-2xl sm:text-3xl font-bold text-[color:var(--ui-ink-ffffff)] tracking-tight">
                      {completedDeals.length > 0 ? `₹${completedRevenue.toLocaleString("en-IN")}` : "₹0"}
                    </div>
                    <div className="text-xs text-[color:var(--ui-ink-8c94a6)] font-medium">
                      {completedDeals.length > 0 ? t("Total Collab Earnings") : t("Total Collab Earnings (Ready for 1st Deal)")}
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] shadow-md space-y-1">
                    <div className="text-2xl sm:text-3xl font-bold text-[color:var(--ui-ink-ffffff)] tracking-tight">
                      {"--"}
                    </div>
                    <div className="text-xs text-[color:var(--ui-ink-8c94a6)] font-medium">
                      {t("Sponsor Retention Rate")}
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] shadow-md space-y-1">
                    <div className="text-2xl sm:text-3xl font-bold text-[color:var(--ui-ink-ffffff)] tracking-tight">
                      {"--"}
                    </div>
                    <div className="text-xs text-[color:var(--ui-ink-8c94a6)] font-medium">
                      {t("On-Time Delivery")}
                    </div>
                  </div>
                </div>

                {/* Aspect Score Gauge + Collab Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--ui-ink-8c94a6)]">
                        {t("Aspect Score")}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[color:var(--ui-paint-ffffff)]/10 text-[color:var(--ui-ink-ffffff)] font-bold border border-[color:var(--ui-line-ffffff)]/20">
                        {t(tierBadge, tierBadge)}
                      </span>
                    </div>

                    {/* Half Circle Arc Gauge with Dynamic Score */}
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
                            strokeDashoffset={Math.round(251.32 * (1 - dynamicAspectScore / 100))}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute bottom-1 text-center select-none">
                          <span className="text-4xl font-extrabold text-[color:var(--ui-ink-ffffff)] tracking-tight">
                            {"--"}
                          </span>
                          <span className="block text-[10px] text-[color:var(--ui-ink-7e8697)] font-semibold tracking-wider mt-0.5">
                            {t("Not rated yet")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[color:var(--ui-line-27272a)] flex items-center justify-between text-xs">
                      <span className="text-[color:var(--ui-ink-8c94a6)]">{t("Industry Tier")}</span>
                      <span className="font-semibold text-[color:var(--ui-ink-ffffff)]">{t(tierBadge, tierBadge)}</span>
                    </div>
                  </div>

                  {/* Trust Highlights */}
                  <div className="p-5 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] flex flex-col justify-between space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--ui-ink-8c94a6)]">
                      {t("Flenzr Trust Highlights")}
                    </span>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)]">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-[color:var(--ui-ink-emerald-400)] flex items-center justify-center shrink-0">
                          <Award className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[color:var(--ui-ink-ffffff)] font-semibold">{t("Spotlight Creator Badge")}</div>
                          <div className="text-[10px] text-[color:var(--ui-ink-7e8697)]">{t("Complete your profile to help brands discover you")}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)]">
                        <div className="w-7 h-7 rounded-lg bg-[color:var(--ui-paint-ffffff)]/10 text-[color:var(--ui-ink-ffffff)] flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[color:var(--ui-ink-ffffff)] font-semibold">{t("Flenzr Vault Payouts")}</div>
                          <div className="text-[10px] text-[color:var(--ui-ink-7e8697)]">{t("Zero commission fees directly to your bank")}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)]">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-[color:var(--ui-ink-emerald-400)] flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[color:var(--ui-ink-ffffff)] font-semibold">
                            {t("Delivery performance pending")}
                          </div>
                          <div className="text-[10px] text-[color:var(--ui-ink-7e8697)]">
                            {completedDeals.length > 0
                              ? t("Delivery metrics are not available yet")
                              : t("Milestone delivery timelines protected by Vault")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Collab Pipeline Preview Card */}
                <div className="p-5 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[color:var(--ui-ink-ffffff)]">{t("Active Brand Collabs")}</h3>
                      <p className="text-xs text-[color:var(--ui-ink-8c94a6)]">{t("Deals currently secured in Flenzr Vault")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("pipeline")}
                      className="text-xs text-[color:var(--ui-ink-ffffff)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>{t("Open Full Pipeline")}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {activeBrandCollabs.length > 0 ? (
                    <div className="space-y-2.5">
                      {activeBrandCollabs.map((deal) => (
                        <div
                          key={deal.id}
                          className="p-3.5 rounded-xl bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)] flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-[color:var(--ui-ink-ffffff)] text-[13px] truncate">{deal.brand}</div>
                            <div className="text-[10px] text-[color:var(--ui-ink-8c94a6)] truncate">
                              {deal.deliverable} • {t("Due")} {deal.dueDate}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-[color:var(--ui-ink-ffffff)] block">{deal.amount}</span>
                            <span
                              className={`text-[10px] font-semibold ${
                                deal.stage === "review" ? "text-[color:var(--ui-ink-amber-400)]" : "text-[color:var(--ui-ink-emerald-400)]"
                              }`}
                            >
                              {deal.stage === "review" ? t("In Review") : t("In Vault")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[color:var(--ui-paint-18181b)]/70 border border-dashed border-[color:var(--ui-line-27272a)] text-center space-y-2">
                      <div className="text-xs font-semibold text-[color:var(--ui-ink-neutral-300)]">
                        {t("No active deals in Vault yet")}
                      </div>
                      <p className="text-[11px] text-[color:var(--ui-ink-8c94a6)] max-w-sm mx-auto">
                        {t("Review inbound brand proposals or pitch brands using AI Pitcher to lock upfront escrow payments.")}
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab("pipeline")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[color:var(--ui-paint-ffffff)]/10 hover:bg-[color:var(--ui-paint-ffffff)]/15 text-[color:var(--ui-ink-ffffff)] text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <span>{t("Check Inbound Deals")}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Calendar & Wallet */}
              <div className="w-full xl:w-[320px] 2xl:w-[340px] shrink-0 space-y-5">
                <CreatorScheduleCalendar compact />

                {/* Quick Wallet Snippet */}
                <div className="p-5 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-[color:var(--ui-line-emerald-500)]/20 text-[color:var(--ui-ink-emerald-400)] flex items-center justify-center">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[color:var(--ui-ink-ffffff)]">{t("Flenzr Vault")}</h4>
                        <p className="text-[10px] text-[color:var(--ui-ink-7e8697)]">No payout account connected</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("wallet")}
                      className="text-[10px] text-[color:var(--ui-ink-ffffff)] hover:underline font-semibold cursor-pointer"
                    >
                      {t("Invoices →")}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[color:var(--ui-ink-686f82)] tracking-wider block">
                      {t("Available for Payout")}
                    </span>
                    <div className="text-3xl font-extrabold text-[color:var(--ui-ink-ffffff)] tracking-tight">
                      ₹{vaultBalance.toLocaleString("en-IN")}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab("wallet")}
                    className="w-full h-9 rounded-xl bg-[color:var(--ui-paint-ffffff)] hover:bg-[color:var(--ui-paint-neutral-200)] text-[color:var(--ui-ink-000000)] font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    <span>{t("Manage Payouts")}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COLLAB PIPELINE */}
          {activeTab === "pipeline" && (
            <CampaignActivity audience="creator" includeDirectOffers initialKind="direct" />
          )}

          {activeTab === "opportunities" && <CampaignOpportunities onViewApplications={() => {
            setActiveTab("pipeline");
            window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#pipeline`);
          }} />}

          {/* TAB 3: RATE CARDS & PACKAGES */}
          {activeTab === "ratecards" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] shadow-md">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[color:var(--ui-ink-ffffff)] tracking-tight">
                    {t("Active Deliverables & Rate Cards")}
                  </h2>
                  <p className="text-xs text-[color:var(--ui-ink-8c94a6)] mt-0.5">
                    {t("Packages displayed on your public media kit and in brand discovery.")}
                  </p>
                </div>

                <button
                  onClick={() => setShowAddRateCard(!showAddRateCard)}
                  className="h-9 px-4 rounded-xl text-xs font-semibold bg-[color:var(--ui-paint-ffffff)] hover:bg-[color:var(--ui-paint-neutral-200)] text-[color:var(--ui-ink-000000)] transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t("Add Rate Card")}</span>
                </button>
              </div>

              {/* Add Rate Card Drawer */}
              {showAddRateCard && (
                <form
                  onSubmit={handleAddRateCard}
                  className="bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)] rounded-xl p-5 space-y-4 shadow-xl text-[color:var(--ui-ink-ffffff)] text-xs"
                >
                  <h4 className="font-bold text-[color:var(--ui-ink-ffffff)]">{t("New Deliverable Offering")}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[color:var(--ui-ink-8c94a6)] mb-1 font-medium">{t("Platform")}</label>
                      <select
                        value={newPlatform}
                        onChange={(e) => setNewPlatform(e.target.value)}
                        className="w-full bg-[color:var(--ui-paint-09090b)] border border-[color:var(--ui-line-27272a)] rounded-lg p-2 text-[color:var(--ui-ink-ffffff)] focus:outline-hidden focus:border-[color:var(--ui-line-ffffff)] focus:ring-1 focus:ring-[color:var(--ui-line-ffffff)]/30"
                      >
                        <option>YouTube</option>
                        <option>Instagram</option>
                        <option>TikTok</option>
                        <option>Podcast</option>
                        <option>Newsletter</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[color:var(--ui-ink-8c94a6)] mb-1 font-medium">{t("Deliverable Type")}</label>
                      <input
                        type="text"
                        value={newDeliverable}
                        onChange={(e) => setNewDeliverable(e.target.value)}
                        className="w-full bg-[color:var(--ui-paint-09090b)] border border-[color:var(--ui-line-27272a)] rounded-lg p-2 text-[color:var(--ui-ink-ffffff)] focus:outline-hidden focus:border-[color:var(--ui-line-ffffff)] focus:ring-1 focus:ring-[color:var(--ui-line-ffffff)]/30"
                        placeholder="e.g. Dedicated Video"
                      />
                    </div>
                    <div>
                      <label className="block text-[color:var(--ui-ink-8c94a6)] mb-1 font-medium">{t("Price (INR ₹)")}</label>
                      <input
                        type="number"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-full bg-[color:var(--ui-paint-09090b)] border border-[color:var(--ui-line-27272a)] rounded-lg p-2 text-[color:var(--ui-ink-ffffff)] focus:outline-hidden focus:border-[color:var(--ui-line-ffffff)] focus:ring-1 focus:ring-[color:var(--ui-line-ffffff)]/30"
                        placeholder="25000"
                      />
                    </div>
                    <div>
                      <label className="block text-[color:var(--ui-ink-8c94a6)] mb-1 font-medium">{t("Turnaround Days")}</label>
                      <input
                        type="number"
                        value={newTurnaround}
                        onChange={(e) => setNewTurnaround(e.target.value)}
                        className="w-full bg-[color:var(--ui-paint-09090b)] border border-[color:var(--ui-line-27272a)] rounded-lg p-2 text-[color:var(--ui-ink-ffffff)] focus:outline-hidden focus:border-[color:var(--ui-line-ffffff)] focus:ring-1 focus:ring-[color:var(--ui-line-ffffff)]/30"
                        placeholder="7"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[color:var(--ui-ink-8c94a6)] mb-1 font-medium">{t("Package Title & Details")}</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-[color:var(--ui-paint-09090b)] border border-[color:var(--ui-line-27272a)] rounded-lg p-2 text-[color:var(--ui-ink-ffffff)] focus:outline-hidden focus:border-[color:var(--ui-line-ffffff)] focus:ring-1 focus:ring-[color:var(--ui-line-ffffff)]/30"
                      placeholder="e.g. 60-second product integration with custom call-to-action"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddRateCard(false)}
                      className="px-3 py-1.5 rounded-lg bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)] text-[color:var(--ui-ink-a1a1aa)] hover:text-[color:var(--ui-ink-ffffff)] font-medium cursor-pointer"
                    >
                      {t("Cancel")}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg font-semibold bg-[color:var(--ui-paint-ffffff)] text-[color:var(--ui-ink-000000)] hover:bg-[color:var(--ui-paint-neutral-200)] cursor-pointer shadow-sm"
                    >
                      {t("Publish Package")}
                    </button>
                  </div>
                </form>
              )}

              {/* Rate Cards Grid */}
              <div className="space-y-3">
                {rateCards.map((card) => (
                  <div
                    key={card.id}
                    className="p-4 rounded-xl bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[color:var(--ui-paint-ffffff)]/10 border border-[color:var(--ui-line-ffffff)]/20 text-[color:var(--ui-ink-ffffff)] text-[10px] font-bold">
                          {card.platform}
                        </span>
                        <span className="text-[11px] text-[color:var(--ui-ink-7e8697)] font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[color:var(--ui-ink-neutral-400)]" />
                          {card.turnaround_days} {t("Days Turnaround")}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-[color:var(--ui-ink-ffffff)] truncate group-hover:text-[color:var(--ui-ink-neutral-300)] transition-colors">
                        {card.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-[color:var(--ui-line-27272a)]">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase text-[color:var(--ui-ink-686f82)] font-semibold block">{t("Base Rate")}</span>
                        <span className="text-base font-bold text-[color:var(--ui-ink-ffffff)]">
                          ₹{card.price_dollars.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <button
                        onClick={() => setRateCards(rateCards.filter((c) => c.id !== card.id))}
                        className="text-[color:var(--ui-ink-686f82)] hover:text-[color:var(--ui-ink-rose-400)] p-1.5 rounded-lg hover:bg-[color:var(--ui-paint-222226)] transition-colors cursor-pointer"
                        title="Delete package"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Rights & Licensing Add-ons */}
              <div className="p-5 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] space-y-4">
                <h3 className="text-sm font-bold text-[color:var(--ui-ink-ffffff)]">{t("Deliverable Licensing & Usage Add-Ons")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)] space-y-1">
                    <div className="font-bold text-[color:var(--ui-ink-ffffff)]">{t("UGC Brand Social Rights")}</div>
                    <div className="text-[11px] text-[color:var(--ui-ink-8c94a6)]">+30% of base fee</div>
                    <p className="text-[10px] text-[color:var(--ui-ink-71717a)]">Allows brand to repost video on their own social handles</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)] space-y-1">
                    <div className="font-bold text-[color:var(--ui-ink-ffffff)]">{t("30-Day Paid Meta Whitelisting")}</div>
                    <div className="text-[11px] text-[color:var(--ui-ink-8c94a6)]">+50% of base fee</div>
                    <p className="text-[10px] text-[color:var(--ui-ink-71717a)]">Brand runs paid ad campaigns from your verified handle</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)] space-y-1">
                    <div className="font-bold text-[color:var(--ui-ink-ffffff)]">{t("Category Exclusivity (90d)")}</div>
                    <div className="text-[11px] text-[color:var(--ui-ink-8c94a6)]">+100% of base fee</div>
                    <p className="text-[10px] text-[color:var(--ui-ink-71717a)]">Guarantees no competing brands promoted for 3 months</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CALENDAR */}
          {activeTab === "calendar" && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] shadow-md">
                <h2 className="text-base sm:text-lg font-bold text-[color:var(--ui-ink-ffffff)] tracking-tight">
                  Collab &amp; Shoot Schedule
                </h2>
                <p className="text-xs text-[color:var(--ui-ink-8c94a6)] mt-0.5">
                  Agreed delivery deadlines shared with your collaborators.
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] shadow-md">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[color:var(--ui-ink-ffffff)] tracking-tight">
                    Smart Attribution Links &amp; Dynamic QR Studio
                  </h2>
                  <p className="text-xs text-[color:var(--ui-ink-8c94a6)] mt-0.5">
                    Track real-time commercial clicks for sponsors and generate print-ready dynamic QR codes.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-[color:var(--ui-paint-18181b)] p-1 rounded-xl border border-[color:var(--ui-line-27272a)] text-xs">
                  <button
                    type="button"
                    onClick={() => setLinksSubTab("links")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      linksSubTab === "links"
                        ? "bg-[color:var(--ui-paint-ffffff)] text-[color:var(--ui-ink-000000)] font-bold shadow-sm"
                        : "text-[color:var(--ui-ink-8c94a6)] hover:text-[color:var(--ui-ink-ffffff)]"
                    }`}
                  >
                    Tracked Links ({trackedLinks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinksSubTab("qr")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      linksSubTab === "qr"
                        ? "bg-[color:var(--ui-paint-ffffff)] text-[color:var(--ui-ink-000000)] font-bold shadow-sm"
                        : "text-[color:var(--ui-ink-8c94a6)] hover:text-[color:var(--ui-ink-ffffff)]"
                    }`}
                  >
                    Dynamic QR Studio
                  </button>
                </div>
              </div>

              {linksSubTab === "links" ? (
                <div className="space-y-5">
                  <div className="bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)] rounded-xl p-5 shadow-sm text-[color:var(--ui-ink-ffffff)]">
                    <h4 className="font-bold text-[color:var(--ui-ink-ffffff)] text-xs mb-3">Create New Short Tracked Link</h4>
                    <form onSubmit={handleAddLink} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[color:var(--ui-ink-8c94a6)] mb-1 font-medium">Link Title</label>
                        <input
                          type="text"
                          value={newLinkTitle}
                          onChange={(e) => setNewLinkTitle(e.target.value)}
                          placeholder="e.g. Sony FX3 Camera"
                          className="w-full bg-[color:var(--ui-paint-09090b)] border border-[color:var(--ui-line-27272a)] rounded-lg p-2 text-[color:var(--ui-ink-ffffff)] focus:outline-hidden focus:border-[color:var(--ui-line-ffffff)] focus:ring-1 focus:ring-[color:var(--ui-line-ffffff)]/30"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[color:var(--ui-ink-8c94a6)] mb-1 font-medium">Destination URL</label>
                        <input
                          type="url"
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          placeholder="https://brand.com/affiliate-link"
                          className="w-full bg-[color:var(--ui-paint-09090b)] border border-[color:var(--ui-line-27272a)] rounded-lg p-2 text-[color:var(--ui-ink-ffffff)] focus:outline-hidden focus:border-[color:var(--ui-line-ffffff)] focus:ring-1 focus:ring-[color:var(--ui-line-ffffff)]/30"
                          required
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-[color:var(--ui-ink-8c94a6)] mb-1 font-medium">Custom Slug</label>
                          <input
                            type="text"
                            value={newLinkCode}
                            onChange={(e) => setNewLinkCode(e.target.value)}
                            placeholder="fx3-deal"
                            className="w-full bg-[color:var(--ui-paint-09090b)] border border-[color:var(--ui-line-27272a)] rounded-lg p-2 text-[color:var(--ui-ink-ffffff)] focus:outline-hidden focus:border-[color:var(--ui-line-ffffff)] focus:ring-1 focus:ring-[color:var(--ui-line-ffffff)]/30"
                          />
                        </div>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[color:var(--ui-paint-ffffff)] text-[color:var(--ui-ink-000000)] font-bold rounded-lg hover:bg-[color:var(--ui-paint-neutral-200)] cursor-pointer h-[34px] shadow-sm"
                        >
                          Create
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Links Table */}
                  <div className="space-y-2">
                    {trackedLinks.length === 0 ? (
                      <div className="p-8 rounded-xl bg-[color:var(--ui-paint-18181b)]/70 border border-dashed border-[color:var(--ui-line-27272a)] text-center space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-[color:var(--ui-paint-ffffff)]/[0.05] border border-[color:var(--ui-line-ffffff)]/10 flex items-center justify-center mx-auto text-[color:var(--ui-ink-neutral-400)]">
                          <Link2 className="w-5 h-5 text-[color:var(--ui-ink-neutral-400)]" />
                        </div>
                        <div className="space-y-1">
                          <h5 className="text-sm font-semibold text-[color:var(--ui-ink-ffffff)]">No Tracked Links Created Yet</h5>
                          <p className="text-xs text-[color:var(--ui-ink-8c94a6)] max-w-sm mx-auto">
                            Generate short branded tracking links for brand sponsors, affiliate gear, and product reviews to measure conversion clicks in real time.
                          </p>
                        </div>
                      </div>
                    ) : (
                      trackedLinks.map((link) => (
                        <div
                          key={link.id}
                          className="p-3.5 rounded-xl bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <h5 className="font-semibold text-[color:var(--ui-ink-ffffff)] truncate">{link.title}</h5>
                            <div className="flex items-center gap-2 text-[color:var(--ui-ink-7e8697)]">
                              <span className="font-mono text-[color:var(--ui-ink-ffffff)]">/r/{link.short_code}</span>
                              <span>•</span>
                              <span className="truncate max-w-xs">{link.destination}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <span className="block font-bold text-[color:var(--ui-ink-ffffff)]">{link.clicks}</span>
                              <span className="text-[10px] text-[color:var(--ui-ink-686f82)] uppercase font-semibold">Clicks</span>
                            </div>

                            <button
                              onClick={() => handleCopy(link.short_code)}
                              className="px-3 py-1.5 rounded-lg bg-[color:var(--ui-paint-18181b)] hover:bg-[color:var(--ui-paint-222226)] border border-[color:var(--ui-line-27272a)] text-[color:var(--ui-ink-ffffff)] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              {copiedCode === link.short_code ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-[color:var(--ui-ink-emerald-400)]" />
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
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="max-w-md mx-auto text-center space-y-5 py-4 p-6 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)]">
                  <div>
                    <h4 className="text-base font-bold text-[color:var(--ui-ink-ffffff)]">Dynamic Media Kit QR Code</h4>
                    <p className="text-xs text-[color:var(--ui-ink-8c94a6)] mt-0.5">
                      Scan directly to your live Flenzr media kit &amp; rate card profile
                    </p>
                  </div>

                  <div className="w-52 h-52 mx-auto rounded-2xl bg-[color:var(--ui-paint-ffffff)] p-3 shadow-xl flex items-center justify-center border-4 border-[color:var(--ui-line-27272a)]">
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
                    <span className="text-xs text-[color:var(--ui-ink-8c94a6)] font-medium">QR Color:</span>
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
                          qrColor === c.hex ? "scale-125 border-[color:var(--ui-line-ffffff)] ring-2 ring-[color:var(--ui-line-ffffff)]" : "border-[color:var(--ui-line-3d4254)]"
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
                      className="h-10 px-5 rounded-lg bg-[color:var(--ui-paint-ffffff)] hover:bg-[color:var(--ui-paint-neutral-200)] text-[color:var(--ui-ink-000000)] font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Download Print-Ready PNG</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "notifications" && <NotificationCenter />}

          {activeTab === "how_it_works" && <HowItWorks audience="creator" />}

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
  );
}
