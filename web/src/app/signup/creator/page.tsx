"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { selectLocalAccount } from "@/lib/local-data";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Link2,
  DollarSign,
  QrCode,
  Share2,
  Copy,
  Radio,
  ExternalLink,
  ShieldCheck,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  Flame,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Eye,
  Shield,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { getSocialAccounts, saveSocialAccount, deleteSocialAccount } from "@/lib/social-accounts";
import { startGoogleLogin } from "@/lib/google-login";
import { onboardCreator } from "@/lib/api";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslation } from "@/lib/i18n/language-context";

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function YoutubeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

const NICHES = [
  "Technology & Hardware",
  "Fashion & Streetwear",
  "Fitness & Wellness",
  "Food & Cafes",
  "Travel & Lifestyle",
  "Gaming & Tech",
  "Beauty & Skincare",
  "Fintech & Investing",
];

interface RateCardItem {
  id: string;
  platform: string;
  deliverable: string;
  price: number;
  days: number;
}

interface SocialEnrichedData {
  platform: "instagram" | "youtube";
  handle: string;
  displayName: string;
  avatarUrl: string;
  followers: number;
  followersFormatted: string;
  engagementRate: number | null;
  avgViews: number | null;
  avgViewsFormatted: string;
  tier: "Nano" | "Micro" | "Mid-Tier" | "Macro" | "Mega";
  category: string;
  suggestedRates: {
    deliverable: string;
    price: number;
    days: number;
  }[];
  apiVerified: boolean;
  canVerifyOfficialApi: boolean;
  isRealData?: boolean;
  codeFoundInBio?: boolean;
}

export default function CreatorSignupPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [accountReady, setAccountReady] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);



  // Google sign-in uses the server-side Supabase OAuth flow.
  const [isAccountConnected, setIsAccountConnected] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Step 1: Identity & Handle
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [niche, setNiche] = useState("Technology & Hardware");

  // Step 2: Social Presence & Enrichment
  const [instagramHandle, setInstagramHandle] = useState("");
  const [instagramFollowers, setInstagramFollowers] = useState("");
  const [isEnrichingInstagram, setIsEnrichingInstagram] = useState(false);
  const [instagramStats, setInstagramStats] = useState<SocialEnrichedData | null>(null);

  // Helper to generate a long, high-entropy verification token (e.g. FLENZR-8K7M4P2Q)
  const generateSecureBioCode = () => instagramBioCode;
  const [instagramBioCode, setInstagramBioCode] = useState("");
  const [showInstagramVerify, setShowInstagramVerify] = useState(false);
  const [isVerifyingInstagramBio, setIsVerifyingInstagramBio] = useState(false);
  const [isInstagramBioVerified, setIsInstagramBioVerified] = useState(false);
  const [copiedIgCode, setCopiedIgCode] = useState(false);
  const [instagramVerifyMsg, setInstagramVerifyMsg] = useState<{ success: boolean; text: string } | null>(null);

  const [youtubeChannel, setYoutubeChannel] = useState("");
  const [youtubeSubscribers, setYoutubeSubscribers] = useState("");
  const [isEnrichingYoutube, setIsEnrichingYoutube] = useState(false);
  const [youtubeStats, setYoutubeStats] = useState<SocialEnrichedData | null>(null);

  // YouTube Description Code Verification (Long 15-char secure code)
  const [youtubeBioCode, setYoutubeBioCode] = useState("");
  const [showYoutubeVerify, setShowYoutubeVerify] = useState(false);
  const [isVerifyingYoutubeBio, setIsVerifyingYoutubeBio] = useState(false);
  const [isYoutubeBioVerified, setIsYoutubeBioVerified] = useState(false);
  const [copiedYtCode, setCopiedYtCode] = useState(false);
  const [youtubeVerifyMsg, setYoutubeVerifyMsg] = useState<{ success: boolean; text: string } | null>(null);

  const [podcastOrOther, setPodcastOrOther] = useState("");
  const [removingSocial, setRemovingSocial] = useState<"instagram" | "youtube" | null>(null);
  const socialVersion = useRef({ instagram: 0, youtube: 0 });
  useEffect(() => {
    fetch("/api/account/creators/me").then(async (res) => {
      if (!res.ok) return;
      const creator = await res.json();
      setAccountReady(true);
      setFullName(creator.display_name || "");
      setHandle(creator.handle || "");
      setInstagramHandle(creator.instagram_handle || "");
      setYoutubeChannel(creator.youtube_channel || "");
      setIsInstagramBioVerified(Boolean(creator.instagram_verified));
      setIsYoutubeBioVerified(Boolean(creator.youtube_verified));
      setInstagramBioCode(creator.verification_code || "");
      setYoutubeBioCode(creator.verification_code || "");
      const session = await fetch("/api/auth/session").then((r) => r.json());
      if (session.identity) {
        setEmail(session.identity.user.email);
        setIsAccountConnected(true);
      }
    }).catch(() => {});
  }, []);

  const removeSignupAccount = async (platform: "instagram" | "youtube") => {
    if (removingSocial) return;
    const verified = platform === "instagram" ? isInstagramBioVerified : isYoutubeBioVerified;
    if (verified && !window.confirm("Remove this verified account? Adding it again requires verification.")) return;
    setRemovingSocial(platform);
    try {
      const saved = (await getSocialAccounts()).find((item) => item.platform === platform);
      if (saved) await deleteSocialAccount(platform, saved.handle);
      socialVersion.current[platform]++;
      if (platform === "instagram") {
        setInstagramHandle(""); setInstagramStats(null); setInstagramFollowers("");
        setIsInstagramBioVerified(false); setInstagramVerifyMsg(null); setShowInstagramVerify(false);
      } else {
        setYoutubeChannel(""); setYoutubeStats(null); setYoutubeSubscribers("");
        setIsYoutubeBioVerified(false); setYoutubeVerifyMsg(null); setShowYoutubeVerify(false);
      }
      try {
        const cacheKey = `flenzr_socials_${handle}`;
        const cached = JSON.parse(localStorage.getItem(cacheKey) || "[]");
        if (Array.isArray(cached)) {
          const removed = cached.filter((item: { platform: string }) => item.platform === platform);
          const next = cached.filter((item: { platform: string }) => item.platform !== platform);
          localStorage.setItem(cacheKey, JSON.stringify(next));
          const selected = localStorage.getItem(`flenzr_chosen_avatar_${handle}`);
          if (removed.some((item: { avatarUrl?: string }) => item.avatarUrl === selected)) localStorage.removeItem(`flenzr_chosen_avatar_${handle}`);
        }
      } catch {}
      // Remove stale metrics from the browser profile, if onboarding was resumed.
      const raw = localStorage.getItem("flenzr_creator_profile");
      if (raw) {
        const profile = JSON.parse(raw);
        const keys = platform === "instagram" ? ["instagramHandle", "instagramStats", "instagramFollowers", "isInstagramBioVerified"] : ["youtubeChannel", "youtubeStats", "youtubeSubscribers", "isYoutubeBioVerified"];
        keys.forEach((key) => delete profile[key]);
        localStorage.setItem("flenzr_creator_profile", JSON.stringify(profile));
      }
    } catch (error) { alert(error instanceof Error ? error.message : "Could not remove account. Please retry."); }
    finally { setRemovingSocial(null); }
  };

  const handleVerifyInstagramBio = async () => {
    setIsVerifyingInstagramBio(true);
    setInstagramVerifyMsg(null);
    try {
      await saveSocialAccount("instagram", instagramHandle);
      const res = await fetch("/api/social/verify-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "instagram",
          handle: instagramHandle || "creator",
          verificationCode: instagramBioCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || "Verification request failed. Please sign in again and retry.");
      if (data.verified) {
        setIsInstagramBioVerified(true);
        setInstagramVerifyMsg({
          success: true,
          text: data.message || "Ownership confirmed live on Instagram!",
        });
      } else {
        setInstagramVerifyMsg({
          success: false,
          text: data.message || `Code ${instagramBioCode} not found in bio. Please paste it into your bio and try again.`,
        });
      }
    } catch (e) {
      setInstagramVerifyMsg({
        success: false,
        text: e instanceof Error ? e.message : "Scan request failed. Please check your network and try again.",
      });
    } finally {
      setIsVerifyingInstagramBio(false);
    }
  };

  const handleVerifyYoutubeBio = async () => {
    setIsVerifyingYoutubeBio(true);
    setYoutubeVerifyMsg(null);
    try {
      await saveSocialAccount("youtube", youtubeChannel);
      const res = await fetch("/api/social/verify-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "youtube",
          handle: youtubeChannel || "creator",
          verificationCode: youtubeBioCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || "Verification request failed. Please sign in again and retry.");
      if (data.verified) {
        setIsYoutubeBioVerified(true);
        setYoutubeVerifyMsg({
          success: true,
          text: data.message || "Ownership confirmed live on YouTube!",
        });
      } else {
        setYoutubeVerifyMsg({
          success: false,
          text: data.message || `Code ${youtubeBioCode} not detected in channel description.`,
        });
      }
    } catch (e) {
      setYoutubeVerifyMsg({
        success: false,
        text: e instanceof Error ? e.message : "Scan request failed. Please check your network and try again.",
      });
    } finally {
      setIsVerifyingYoutubeBio(false);
    }
  };

  // Step 3: Rate Cards in ₹
  const [rateCards, setRateCards] = useState<RateCardItem[]>([]);

  // Clean handle formatting
  const handleCleanChange = (val: string) => {
    const sanitized = val.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setHandle(sanitized);
  };

  // Google 1-Click Connect
  const handleGoogleConnect = async () => {
    setIsGoogleLoading(true);
    try { await startGoogleLogin("creator", true); }
    catch (error) { alert(error instanceof Error ? error.message : "Could not sign in with Google"); setIsGoogleLoading(false); }
  };

  // Fetch Live Stats for Instagram Handle
  const fetchInstagramStats = async (overrideHandle?: string, manualCount?: number) => {
    const target = (overrideHandle || instagramHandle).trim();
    if (!target || removingSocial) return;
    const version = ++socialVersion.current.instagram;
    setIsEnrichingInstagram(true);
    try {
      await saveSocialAccount("instagram", target);
      if (version !== socialVersion.current.instagram) return;
      const res = await fetch("/api/social/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "instagram",
          handle: target,
          verificationCode: instagramBioCode,
          manualFollowers: manualCount,
        }),
      });
      if (res.ok) {
        const data: SocialEnrichedData = await res.json();
        if (version !== socialVersion.current.instagram) return;
        setInstagramStats(data);

        // Automatically calibrate suggested rate cards based on exact followers
        if (data.suggestedRates && data.suggestedRates.length > 0) {
          setRateCards((prev) => [
            ...prev.filter((rc) => rc.platform !== "Instagram"),
            ...data.suggestedRates.map((sr, idx) => ({
              id: `rc-ig-${idx}`,
              platform: "Instagram",
              deliverable: sr.deliverable,
              price: sr.price,
              days: sr.days,
            })),
          ]);
        }
      }
    } catch (e) {
      console.error("Enrich error", e);
    } finally {
      setIsEnrichingInstagram(false);
    }
  };

  // Fetch Live Stats for YouTube Channel
  const fetchYoutubeStats = async (overrideHandle?: string, manualCount?: number) => {
    const target = (overrideHandle || youtubeChannel).trim();
    if (!target || removingSocial) return;
    const version = ++socialVersion.current.youtube;
    setIsEnrichingYoutube(true);
    try {
      await saveSocialAccount("youtube", target);
      if (version !== socialVersion.current.youtube) return;
      const res = await fetch("/api/social/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "youtube",
          handle: target,
          verificationCode: youtubeBioCode,
          manualFollowers: manualCount,
        }),
      });
      if (res.ok) {
        const data: SocialEnrichedData = await res.json();
        if (version !== socialVersion.current.youtube) return;
        setYoutubeStats(data);
        setYoutubeSubscribers(data.followersFormatted);

        if (data.suggestedRates && data.suggestedRates.length > 0) {
          setRateCards((prev) => [
            ...data.suggestedRates.map((sr, idx) => ({
              id: `rc-yt-${idx}`,
              platform: "YouTube",
              deliverable: sr.deliverable,
              price: sr.price,
              days: sr.days,
            })),
            ...prev.filter((rc) => rc.platform !== "YouTube"),
          ]);
        }
      }
    } catch (e) {
      console.error("Enrich error", e);
    } finally {
      setIsEnrichingYoutube(false);
    }
  };

  // Recalibrate when creator adjusts follower count manually
  const updateFollowersCount = (platform: "instagram" | "youtube", count: number) => {
    if (platform === "instagram") {
      fetchInstagramStats(instagramHandle, count);
    } else {
      fetchYoutubeStats(youtubeChannel, count);
    }
  };

  const handleNextStep = async () => {
    if (isCreatingAccount) return;
    if (currentStep === 1) {
      if (!fullName.trim() || !email.includes("@") || !handle.trim()) return alert("Please enter your name, email, and username");
      if (!accountReady) {
        if (password.length < 8) return alert("Use a password of at least 8 characters");
        setIsCreatingAccount(true);
        try {
          const res = await fetch("/api/auth/signup", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, fullName }),
          });
          const data = await res.json();
          if (data.confirmationRequired) { alert(data.message); return; }
          if (!res.ok) { alert(data.error || "Could not create your account"); return; }
          selectLocalAccount(data.identity.user.email);
          const creatorRes = await fetch("/api/account/creators/me");
          if (!creatorRes.ok) { alert("Could not load your creator profile"); return; }
          const creator = await creatorRes.json();
          setInstagramBioCode(creator.verification_code || "");
          setYoutubeBioCode(creator.verification_code || "");
          setAccountReady(true);
        } catch { alert("Could not create your account. Please retry."); return; }
        finally { setIsCreatingAccount(false); }
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const [isFinishing, setIsFinishing] = useState(false);

  const handleFinishOnboarding = async () => {
    if (!fullName.trim() || !email.trim() || !handle.trim()) {
      alert("Please enter your name, email, and username.");
      return;
    }
    selectLocalAccount(email.trim().toLowerCase());
    setIsFinishing(true);
    const cleanHandle = (handle || "creator").replace(/[^a-zA-Z0-9_]/g, "");

    try {
      const res = await onboardCreator({
        full_name: fullName || "Creator",
        email: email || `${cleanHandle}@flenzr.user`,
        handle: cleanHandle,
        niche: niche || "Content Creator",
        instagram_handle: instagramHandle ? instagramHandle.replace(/^@/, "").trim() : null,
        instagram_verified: isInstagramBioVerified,
        youtube_channel: youtubeChannel ? youtubeChannel.replace(/^@/, "").trim() : null,
        youtube_verified: isYoutubeBioVerified,
        rate_cards: rateCards.map((rc) => ({
          platform: rc.platform,
          deliverable: rc.deliverable,
          price: rc.price,
          days: rc.days,
        })),
      });

      if (!res?.creator) {
        alert("Could not create your profile. Please check the connection and try again.");
        setIsFinishing(false);
        return;
      }

    } catch (err) {
      console.warn("Backend onboarding failed:", err);
      setIsFinishing(false);
      alert("Could not create your profile. Please try again.");
      return;
    }

    const profileData = {
      fullName: fullName || "Creator",
      handle: cleanHandle,
      niche,
      email,
      isAccountConnected,
      instagramHandle,
      instagramFollowers,
      instagramStats,
      isInstagramBioVerified,
      youtubeChannel,
      youtubeSubscribers,
      youtubeStats,
      isYoutubeBioVerified,
      rateCards,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("flenzr_creator_profile", JSON.stringify(profileData));

    }
    setIsFinishing(false);
    router.push("/dashboard/creator");
  };

  const updateRateCardPrice = (id: string, price: number) => {
    setRateCards((prev) =>
      prev.map((rc) => (rc.id === id ? { ...rc, price } : rc))
    );
  };

  const updateRateCardDays = (id: string, days: number) => {
    setRateCards((prev) =>
      prev.map((rc) => (rc.id === id ? { ...rc, days } : rc))
    );
  };

  const handleCopyLink = () => {
    const url = `https://flenzr.com/@${handle || "yourhandle"}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 selection:bg-[#c1121f] selection:text-white flex flex-col font-sans">
      {/* Background Subtle Accent Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-[#c1121f]/15 via-transparent to-transparent blur-3xl opacity-75" />
      </div>

      {/* Top Header */}
      <header className="relative border-b border-neutral-800 bg-[#09090b]/85 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center shrink-0">
            <Logo size={32} variant="duotone-dark" withWordmark={true} />
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="compact" />
            <div className="text-xs text-neutral-400 font-medium flex items-center gap-2">
              <Link
                href="/login"
                className="text-[#c1121f] font-bold hover:underline"
              >
                {t("Sign In")}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Wizard Area */}
      <main className="relative z-10 flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Step Progress Tracker */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3 text-xs font-bold text-neutral-400">
            <span className={currentStep >= 1 ? "text-white" : ""}>
              1. Claim Handle
            </span>
            <span className={currentStep >= 2 ? "text-white" : ""}>
              2. Connect Socials &amp; Stats
            </span>
            <span className={currentStep >= 3 ? "text-white" : ""}>
              3. Rate Card (₹)
            </span>
            <span className={currentStep >= 4 ? "text-white" : ""}>
              4. Bio Link &amp; QR
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden flex">
            <motion.div
              className="h-full bg-gradient-to-r from-neutral-400 to-[#c1121f]"
              initial={{ width: "25%" }}
              animate={{ width: `${(currentStep / 4) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Wizard Form Card */}
        <div className="bg-[#121215] border border-neutral-800 rounded-3xl p-6 sm:p-10 shadow-2xl text-white">
          <AnimatePresence mode="wait" initial={false}>
            {/* STEP 1: IDENTITY & CLAIM HANDLE */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 text-left"
              >
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#c1121f]/15 text-[#e63946] border border-[#c1121f]/20 mb-2">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Step 1 of 4: Influencer Profile</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Claim your unique Flenzr handle.
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-1 leading-relaxed">
                    This will be your universal bio link (e.g.{" "}
                    <code className="text-[#e63946]">flenzr.com/@yourname</code>) where followers and brand
                    partners discover your verified rate card.
                  </p>
                </div>

                {/* Google 1-Click Fast Connect Option */}
                {!isAccountConnected ? (
                  <button
                    type="button"
                    onClick={handleGoogleConnect}
                    disabled={isGoogleLoading}
                    className="w-full py-3.5 px-4 rounded-2xl border border-neutral-700 hover:border-neutral-500 bg-neutral-900 hover:bg-neutral-800 font-bold text-xs sm:text-sm text-white transition-all flex items-center justify-center gap-2.5 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <GoogleIcon className="w-4 h-4 shrink-0" />
                    <span>
                      {isGoogleLoading
                        ? "Connecting Google Account..."
                        : "Continue with Google"}
                    </span>
                  </button>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                        G
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                          <span>Account Connected</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <div className="text-[11px] text-emerald-400/80">
                          {email || "No email entered"}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-700/50 text-emerald-300">
                      Verified
                    </span>
                  </div>
                )}

                <div className="relative my-4 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-800" />
                  </div>
                  <span className="relative px-3 bg-[#121215] text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                    Or customize handle manually
                  </span>
                </div>

                {/* Handle Input with Live Validation Preview */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                    Your Username Handle
                  </label>
                  <div className="flex items-center rounded-2xl border border-neutral-800 focus-within:border-[#c1121f] transition-colors px-3 py-2.5 bg-neutral-950">
                    <span className="text-sm font-bold text-neutral-500 select-none">
                      flenzr.com/@
                    </span>
                    <input
                      type="text"
                      placeholder="yourname"
                      value={handle}
                      onChange={(e) => handleCleanChange(e.target.value)}
                      className="w-full bg-transparent outline-hidden font-bold text-sm text-white placeholder-neutral-600 pl-1"
                    />
                    {handle.length > 2 && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 shrink-0 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Available
                      </span>
                    )}
                  </div>
                </div>

                {/* Full Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sarah Miller or Kabir Mehta"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 text-white px-4 py-3 text-sm font-semibold outline-hidden focus:border-[#c1121f] transition-colors placeholder:text-neutral-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="you@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 text-white px-4 py-3 text-sm font-semibold outline-hidden focus:border-[#c1121f] transition-colors placeholder:text-neutral-600"
                    />
                  </div>
                </div>

                {/* Password (if not google connected) */}
                {!isAccountConnected && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                      Password
                    </label>
                    <input
                      type="password"
                      placeholder="Create a secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 text-white px-4 py-3 text-sm font-semibold outline-hidden focus:border-[#c1121f] transition-colors placeholder:text-neutral-600"
                    />
                  </div>
                )}

                {/* Niche Picker */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                    Primary Content Niche
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {NICHES.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNiche(n)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          niche === n
                            ? "bg-[#c1121f] text-white shadow-md shadow-[#c1121f]/25"
                            : "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="h-12 px-7 rounded-full bg-[#c1121f] hover:bg-[#a50e1a] text-white font-bold text-sm shadow-lg shadow-[#c1121f]/25 transition-all hover:scale-[1.02] inline-flex items-center justify-center gap-2 cursor-pointer leading-none"
                  >
                    <span>Continue to Socials &amp; Stats</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: CONNECT SOCIAL PRESENCE & STATS ENRICHMENT */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-6 text-left"
              >
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#c1121f]/15 text-[#e63946] border border-[#c1121f]/20 mb-2">
                    <Link2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Step 2 of 4: Social Presence &amp; Stats</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Link your social media &amp; pull stats.
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-1 leading-relaxed">
                    Enter your handles to pull your current follower count, estimated views, and engagement rate. This automatically tunes your suggested ₹ rate card.
                  </p>
                </div>

                {/* Official API Verification Notice */}
                <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-white flex items-start gap-3.5 text-xs shadow-md">
                  <Shield className="w-5 h-5 text-[#c1121f] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>How Social Stats Work</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#c1121f] text-white">
                        2-Stage Verification
                      </span>
                    </div>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      We auto-enrich public metrics now for fast onboarding. You can link your official <strong>Instagram Professional</strong> &amp; <strong>YouTube OAuth API</strong> in your Creator Dashboard anytime to earn the <strong>&ldquo;Verified by Meta&rdquo;</strong> gold badge on the marketplace.
                    </p>
                  </div>
                </div>

                {/* Instagram Channel */}
                <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <InstagramIcon className="w-4 h-4 text-pink-500" />
                      <span>Instagram Profile</span>
                      {instagramHandle && <button type="button" aria-label="Remove Instagram account" disabled={Boolean(removingSocial) || isEnrichingInstagram || isVerifyingInstagramBio} onClick={() => removeSignupAccount("instagram")} className="text-xs text-red-300 font-medium">{removingSocial === "instagram" ? "Removing…" : "Remove"}</button>}
                    </div>
                    {isInstagramBioVerified ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Verified Owner
                      </span>
                    ) : instagramStats ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                        Pending Bio Verification
                      </span>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. techburner, tanmaybhat, or your_handle"
                      value={instagramHandle}
                      onChange={(e) => {
                        socialVersion.current.instagram++;
                        setInstagramHandle(e.target.value);
                        setIsInstagramBioVerified(false);
                        setInstagramVerifyMsg(null);
                        setInstagramStats(null);
                      }}
                      className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-xs font-semibold text-white outline-hidden focus:border-[#c1121f] placeholder:text-neutral-600"
                    />
                    <button
                      type="button"
                      onClick={() => fetchInstagramStats()}
                      disabled={isEnrichingInstagram || !instagramHandle.trim()}
                      className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isEnrichingInstagram ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Pulling...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Pull Stats</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Enriched Stats Pill / Card */}
                  {instagramStats && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 shadow-md space-y-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={instagramStats.avatarUrl}
                            alt={instagramStats.displayName}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = `/api/proxy-image?name=${encodeURIComponent(instagramStats.displayName || instagramStats.handle)}`;
                            }}
                            className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-700 object-cover shrink-0"
                          />
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{instagramStats.displayName}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 font-semibold">
                                {instagramStats.tier}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              @{instagramStats.handle} • {instagramStats.category}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-center">
                          <div>
                            <div className="font-extrabold text-sm text-white">
                              {instagramStats.followersFormatted}
                            </div>
                            <div className="text-[10px] text-neutral-400 uppercase font-semibold">
                              Followers
                            </div>
                          </div>
                          <div>
                            <div className="font-extrabold text-sm text-emerald-400 flex items-center justify-center gap-0.5">
                              <Flame className="w-3 h-3" />
                              <span>{instagramStats.engagementRate == null ? "--" : `${instagramStats.engagementRate}%`}</span>
                            </div>
                            <div className="text-[10px] text-neutral-400 uppercase font-semibold">
                              Engagement
                            </div>
                          </div>
                          <div>
                            <div className="font-extrabold text-sm text-white">
                              {instagramStats.avgViewsFormatted}
                            </div>
                            <div className="text-[10px] text-neutral-400 uppercase font-semibold">
                              Avg Views
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Follower Calibration */}
                      <div className="pt-2 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span className="text-neutral-400 font-medium">
                          Tune followers to calibrate ₹ rate cards:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {[
                            { label: "10K", val: 10000 },
                            { label: "25K", val: 25000 },
                            { label: "50K", val: 50000 },
                            { label: "100K", val: 100000 },
                            { label: "250K", val: 250000 },
                            { label: "500K", val: 500000 },
                            { label: "1M", val: 1000000 },
                          ].map((pill) => (
                            <button
                              key={pill.label}
                              type="button"
                              onClick={() => updateFollowersCount("instagram", pill.val)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                instagramStats.followers === pill.val
                                  ? "bg-[#c1121f] text-white"
                                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                              }`}
                            >
                              {pill.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Always-Visible Instagram Bio Verification Module */}
                  <div className="pt-1">
                    {isInstagramBioVerified ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-bold text-emerald-300">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            Instagram Ownership Confirmed
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 text-[10px] uppercase">
                            Gold Badge Active
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                          ✓ Verified! You can now remove <code>{instagramBioCode}</code> from your bio, <strong>or keep your official link <code>flenzr.com/@{handle || "yourhandle"}</code></strong> in your bio so brands can book your upfront rate cards directly.
                        </p>
                      </motion.div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-[#c1121f]" />
                            Step-by-Step Bio Verification
                          </span>
                          <span className="text-[10px] font-bold text-neutral-400 uppercase">
                            Takes 30 Seconds
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] text-neutral-400 font-semibold uppercase">
                              Your Verification Code:
                            </div>
                            <code className="text-sm font-black text-white tracking-wider">
                              {instagramBioCode}
                            </code>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setInstagramBioCode(generateSecureBioCode());
                                setIsInstagramBioVerified(false);
                                setInstagramVerifyMsg(null);
                              }}
                              title="Generate new verification code"
                              className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(instagramBioCode);
                                setCopiedIgCode(true);
                                setTimeout(() => setCopiedIgCode(false), 2000);
                              }}
                              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              {copiedIgCode ? (
                                <>
                                  <Check className="w-3 h-3" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" /> Copy Code
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-neutral-400 leading-normal">
                          1. Paste <code className="text-white">{instagramBioCode}</code> in your Instagram Bio.
                          <br />
                          2. Click <strong>Verify Bio Code</strong> below to confirm channel ownership and earn your verified badge.
                        </p>

                        <button
                          type="button"
                          onClick={handleVerifyInstagramBio}
                          disabled={isVerifyingInstagramBio || !instagramHandle.trim()}
                          className="w-full py-2.5 rounded-xl bg-[#c1121f] hover:bg-[#a50e1a] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#c1121f]/20 disabled:opacity-50"
                        >
                          {isVerifyingInstagramBio ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Scanning @{instagramHandle || "account"} Bio...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verify Bio Code</span>
                            </>
                          )}
                        </button>

                        {instagramVerifyMsg && !isInstagramBioVerified && (
                          <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-[11px] flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{instagramVerifyMsg.text}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* YouTube Channel */}
                <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <YoutubeIcon className="w-4 h-4 text-[#c1121f]" />
                      <span>YouTube Channel</span>
                      {youtubeChannel && <button type="button" aria-label="Remove YouTube account" disabled={Boolean(removingSocial) || isEnrichingYoutube || isVerifyingYoutubeBio} onClick={() => removeSignupAccount("youtube")} className="text-xs text-red-300 font-medium">{removingSocial === "youtube" ? "Removing…" : "Remove"}</button>}
                    </div>
                    {isYoutubeBioVerified ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Verified Owner
                      </span>
                    ) : youtubeStats ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                        Pending Channel Verification
                      </span>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. mkbhd, CarryMinati, or Fireship"
                      value={youtubeChannel}
                      onChange={(e) => {
                        socialVersion.current.youtube++;
                        setYoutubeChannel(e.target.value);
                        setIsYoutubeBioVerified(false);
                        setYoutubeVerifyMsg(null);
                        setYoutubeStats(null);
                      }}
                      className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-xs font-semibold text-white outline-hidden focus:border-[#c1121f] placeholder:text-neutral-600"
                    />
                    <button
                      type="button"
                      onClick={() => fetchYoutubeStats()}
                      disabled={isEnrichingYoutube || !youtubeChannel.trim()}
                      className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isEnrichingYoutube ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Scraping Live...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Pull Stats</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* YouTube Enriched Stats Card */}
                  {youtubeStats && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 shadow-md space-y-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={youtubeStats.avatarUrl}
                            alt={youtubeStats.displayName}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = `/api/proxy-image?name=${encodeURIComponent(youtubeStats.displayName || youtubeStats.handle)}`;
                            }}
                            className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-700 object-cover shrink-0"
                          />
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{youtubeStats.displayName}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 font-semibold">
                                {youtubeStats.tier}
                              </span>
                              {youtubeStats.isRealData && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#c1121f]/20 border border-[#c1121f]/30 text-[#e63946] font-bold">
                                  Live YouTube Data
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              @{youtubeStats.handle} • {youtubeStats.category}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-center">
                          <div>
                            <div className="font-extrabold text-sm text-[#e63946]">
                              {youtubeStats.followersFormatted}
                            </div>
                            <div className="text-[10px] text-neutral-400 uppercase font-semibold">
                              Subscribers
                            </div>
                          </div>
                          <div>
                            <div className="font-extrabold text-sm text-emerald-400 flex items-center justify-center gap-0.5">
                              <Flame className="w-3 h-3" />
                              <span>{youtubeStats.engagementRate == null ? "--" : `${youtubeStats.engagementRate}%`}</span>
                            </div>
                            <div className="text-[10px] text-neutral-400 uppercase font-semibold">
                              Engagement
                            </div>
                          </div>
                          <div>
                            <div className="font-extrabold text-sm text-white">
                              {youtubeStats.avgViewsFormatted}
                            </div>
                            <div className="text-[10px] text-neutral-400 uppercase font-semibold">
                              Avg Views
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Subscriber Calibration */}
                      <div className="pt-2 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span className="text-neutral-400 font-medium">
                          Tune subscribers to calibrate ₹ rate cards:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {[
                            { label: "10K", val: 10000 },
                            { label: "50K", val: 50000 },
                            { label: "100K", val: 100000 },
                            { label: "250K", val: 250000 },
                            { label: "500K", val: 500000 },
                            { label: "1M", val: 1000000 },
                          ].map((pill) => (
                            <button
                              key={pill.label}
                              type="button"
                              onClick={() => updateFollowersCount("youtube", pill.val)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                youtubeStats.followers === pill.val
                                  ? "bg-[#c1121f] text-white"
                                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                              }`}
                            >
                              {pill.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Always-Visible YouTube Bio Verification Module */}
                  <div className="pt-1">
                    {isYoutubeBioVerified ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-bold text-emerald-300">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            YouTube Channel Verified
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 text-[10px] uppercase">
                            Gold Badge Active
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                          ✓ Description verified! You can now remove <code>{youtubeBioCode}</code> from your channel, <strong>or keep your link <code>flenzr.com/@{handle || "yourhandle"}</code></strong> in your channel links for upfront brand bookings.
                        </p>
                      </motion.div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-[#c1121f]" />
                            Channel Description Verification
                          </span>
                          <span className="text-[10px] font-bold text-neutral-400 uppercase">
                            Instant Scan
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] text-neutral-400 font-semibold uppercase">
                              Your Verification Code:
                            </div>
                            <code className="text-sm font-black text-white tracking-wider">
                              {youtubeBioCode}
                            </code>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setYoutubeBioCode(generateSecureBioCode());
                                setIsYoutubeBioVerified(false);
                                setYoutubeVerifyMsg(null);
                              }}
                              title="Generate new verification code"
                              className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(youtubeBioCode);
                                setCopiedYtCode(true);
                                setTimeout(() => setCopiedYtCode(false), 2000);
                              }}
                              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              {copiedYtCode ? (
                                <>
                                  <Check className="w-3 h-3" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" /> Copy Code
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-neutral-400 leading-normal">
                          1. Paste <code className="text-white">{youtubeBioCode}</code> in your YouTube Channel About description or links.
                          <br />
                          2. Click <strong>Verify Channel Code</strong> below to confirm ownership.
                        </p>

                        <button
                          type="button"
                          onClick={handleVerifyYoutubeBio}
                          disabled={isVerifyingYoutubeBio || !youtubeChannel.trim()}
                          className="w-full py-2.5 rounded-xl bg-[#c1121f] hover:bg-[#a50e1a] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#c1121f]/20 disabled:opacity-50"
                        >
                          {isVerifyingYoutubeBio ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Scanning {youtubeChannel || "Channel"} Description...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verify Channel Code</span>
                            </>
                          )}
                        </button>

                        {youtubeVerifyMsg && !isYoutubeBioVerified && (
                          <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-[11px] flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{youtubeVerifyMsg.text}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Podcast / Other (Optional) */}
                <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Radio className="w-3.5 h-3.5 text-purple-400" />
                    <span>Other Platforms (Spotify, TikTok, Twitter/X)</span>
                  </div>
                  <input
                    type="text"
                    placeholder="URL or handle (optional)"
                    value={podcastOrOther}
                    onChange={(e) => setPodcastOrOther(e.target.value)}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 text-white px-3.5 py-2.5 text-xs font-semibold outline-hidden focus:border-[#c1121f] placeholder:text-neutral-600"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="h-10 px-5 rounded-full text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer leading-none"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="h-12 px-7 rounded-full bg-[#c1121f] hover:bg-[#a50e1a] text-white font-bold text-sm shadow-lg shadow-[#c1121f]/25 transition-all hover:scale-[1.02] inline-flex items-center justify-center gap-2 cursor-pointer leading-none"
                  >
                    <span>Continue to Rate Card</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: SETUP STANDARD UPFRONT RATE CARD (₹) */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-6 text-left"
              >
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#c1121f]/15 text-[#e63946] border border-[#c1121f]/20 mb-2">
                    <DollarSign className="w-3.5 h-3.5 shrink-0" />
                    <span>Step 3 of 4: Upfront Rate Card</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Set your standard rates in Indian Rupee (₹).
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-1 leading-relaxed">
                    Zero haggling in DMs. Brands book you directly at your published prices. Rates below were calibrated based on your synced reach.
                  </p>
                </div>

                {/* Rate Card Items */}
                <div className="space-y-3">
                  {rateCards.length === 0 && <p className="p-4 text-sm text-neutral-400">No packages yet. You can add packages in your dashboard after signup.</p>}
                  {rateCards.map((rc) => (
                    <div
                      key={rc.id}
                      className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 uppercase">
                          {rc.platform}
                        </span>
                        <div className="text-sm font-bold text-white mt-1">
                          {rc.deliverable}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Price Input in ₹ */}
                        <div className="flex items-center rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-1.5 focus-within:border-[#c1121f]">
                          <span className="text-sm font-extrabold text-[#c1121f] mr-1">
                            ₹
                          </span>
                          <input
                            type="number"
                            value={rc.price}
                            onChange={(e) =>
                              updateRateCardPrice(rc.id, Number(e.target.value))
                            }
                            className="w-24 bg-transparent outline-hidden font-black text-sm text-white"
                          />
                        </div>

                        {/* Turnaround Days */}
                        <div className="text-xs text-neutral-400 flex items-center gap-1">
                          <input
                            type="number"
                            value={rc.days}
                            onChange={(e) =>
                              updateRateCardDays(rc.id, Number(e.target.value))
                            }
                            className="w-12 rounded-lg border border-neutral-800 bg-neutral-950 text-white px-2 py-1 text-center font-bold text-xs"
                          />
                          <span>days</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 rounded-2xl bg-[#c1121f]/10 border border-[#c1121f]/30 flex items-center gap-3 text-xs text-neutral-300">
                  <ShieldCheck className="w-5 h-5 text-[#c1121f] shrink-0" />
                  <span>
                    <strong className="text-white">Escrow Protection:</strong> Brands prepay into escrow before you start filming, and funds release immediately upon draft approval.
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="h-10 px-5 rounded-full text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer leading-none"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="h-12 px-7 rounded-full bg-[#c1121f] hover:bg-[#a50e1a] text-white font-bold text-sm shadow-lg shadow-[#c1121f]/25 transition-all hover:scale-[1.02] inline-flex items-center justify-center gap-2 cursor-pointer leading-none"
                  >
                    <span>Generate Bio Link &amp; QR</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: BIO LINK & DYNAMIC QR CODE READY */}
            {currentStep === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-6 text-center"
              >
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 border border-emerald-800 text-emerald-400 mb-2">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Ready to create your profile</span>
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                    Your Bio Link and QR Code preview
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-md mx-auto">
                    Share this URL in your Instagram, YouTube, and TikTok bio. Brands can book your upfront rate card in 1-click.
                  </p>
                </div>

                {/* Universal Bio Link Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 max-w-md mx-auto flex items-center justify-between gap-3">
                  <div className="min-w-0 text-left">
                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Universal Bio Link
                    </div>
                    <div className="text-sm font-extrabold text-white truncate">
                      flenzr.com/@{handle || "yourhandle"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Dynamic QR Code Mockup */}
                <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 max-w-xs mx-auto space-y-3">
                  <div className="aspect-square bg-white border border-neutral-300 rounded-xl p-3 flex flex-col items-center justify-center relative shadow-inner">
                    <QrCode className="w-full h-full text-black stroke-[1.5]" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-white p-1 rounded-md shadow-xs">
                        <Logo size={20} variant="duotone" />
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] font-bold text-neutral-400">
                    Scan to view {fullName || "Creator"}&apos;s rate card &amp; bio
                  </div>
                </div>

                {/* CTA to Creator Dashboard */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleFinishOnboarding}
                    disabled={isFinishing}
                    className="w-full sm:w-auto h-12 px-10 rounded-full bg-[#c1121f] hover:bg-[#a50e1a] disabled:opacity-60 text-white font-bold text-sm shadow-lg shadow-[#c1121f]/25 transition-all hover:scale-[1.02] inline-flex items-center justify-center gap-2 cursor-pointer leading-none"
                  >
                    {isFinishing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Provisioning Media Kit...</span>
                      </>
                    ) : (
                      <>
                        <span>Enter Creator Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
