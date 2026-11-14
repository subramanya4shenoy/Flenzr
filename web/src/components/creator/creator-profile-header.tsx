"use client";

import { connectInstagram, connectYouTube } from "@/lib/social-accounts";

import { useState, useEffect, useId, type ComponentProps } from "react";
import { useTranslation } from "@/lib/i18n/language-context";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  Plus,
  ExternalLink,
  ShieldCheck,
  Tag,
  MapPin,
  Star,
  X,
  Loader2,
  Copy,
  RefreshCw,
  Trash2,
  Camera,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Briefcase,
} from "lucide-react";
import { deleteSocialAccount, getSocialAccounts, saveSocialAccount, mergeSocialAccounts, mergeSocialAvatars, type SocialAccount } from "@/lib/social-accounts";
import { PublicCreatorProfile } from "@/lib/api";

function AccountActionButton({ label, children, ...props }: ComponentProps<"button"> & { label: string }) {
  const tooltipId = useId();
  return (
    <span className="relative inline-flex group/account-action">
      <button
        {...props}
        type="button"
        aria-describedby={tooltipId}
        className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-red-300 hover:bg-red-400/10 hover:text-red-200 focus-visible:outline-2 focus-visible:outline-red-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        {children}
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 whitespace-nowrap rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-[11px] font-medium text-white shadow-lg opacity-0 transition-opacity group-hover/account-action:opacity-100 group-focus-within/account-action:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

// -------------------------------------------------------------
// Vector Social Brand Icons
// -------------------------------------------------------------
export function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function YoutubeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

export function XTwitterIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function TikTokIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.42a6.34 6.34 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 8.68 5.88 6.34 6.34 0 0 0 4.01-5.94V8.75a8.28 8.28 0 0 0 4.76 1.48V6.78c-.34 0-.69-.03-1-.09z"/>
    </svg>
  );
}

export function LinkedInIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
    </svg>
  );
}

export function TwitchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.149 0l-1.612 4.119v16.036h5.451v3.845l3.846-3.845h4.118l7.51-7.51v-12.645h-19.313zm17.159 11.536l-3.845 3.845h-4.656l-2.868 2.868v-2.868h-3.414v-13.238h14.783v9.393zm-8.318-6.107h2.149v6.438h-2.149v-6.438zm5.362 0h2.149v6.438h-2.149v-6.438z"/>
    </svg>
  );
}

export type PlatformKey = "instagram" | "youtube" | "x" | "tiktok" | "linkedin" | "twitch";

export interface LinkedSocialItem {
  id: string;
  platform: PlatformKey;
  handle: string;
  url: string;
  isVerified: boolean;
  avatarUrl?: string;
  createdAt?: number;
}

export interface AvailableAvatar {
  id: string;
  source: string;
  platform: PlatformKey | "default";
  handle: string;
  url: string;
  isEarliest: boolean;
}

export const CREATOR_COVER_IMAGES = [
  "/covers/cover-1.jpg",
  "/covers/cover-2.jpg",
  "/covers/cover-3.jpg",
  "/covers/cover-4.jpg",
  "/covers/cover-5.jpg",
];

interface CreatorProfileHeaderProps {
  creator: PublicCreatorProfile;
  isEditable?: boolean;
  rateCards?: Array<{ deliverable?: string; deliverable_type?: string; title?: string; price?: number; price_dollars?: number }>;
  completedDeals?: Array<{
    id: string;
    brand: string;
    deliverable: string;
    amount: string;
    completedAt?: string;
  }>;
}

export function CreatorProfileHeader({
  creator,
  isEditable = true,
  rateCards,
  completedDeals,
}: CreatorProfileHeaderProps) {
  const { t } = useTranslation();
  const [creatorName, setCreatorName] = useState(creator.display_name);
  const [handle, setHandle] = useState(creator.handle);

  // Cover image random selection (1 of 5)
  const [coverImage, setCoverImage] = useState<string>(CREATOR_COVER_IMAGES[0]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("flenzr_creator_cover_image");
      if (stored && CREATOR_COVER_IMAGES.includes(stored)) {
        setCoverImage(stored);
        return;
      }
    } catch {}
    const randomIndex = Math.floor(Math.random() * CREATOR_COVER_IMAGES.length);
    const chosen = CREATOR_COVER_IMAGES[randomIndex];
    setCoverImage(chosen);
    try {
      localStorage.setItem("flenzr_creator_cover_image", chosen);
    } catch {}
  }, []);

  const handleShuffleCover = () => {
    const currentIndex = CREATOR_COVER_IMAGES.indexOf(coverImage);
    const nextIndex = (currentIndex + 1) % CREATOR_COVER_IMAGES.length;
    const nextCover = CREATOR_COVER_IMAGES[nextIndex];
    setCoverImage(nextCover);
    try {
      localStorage.setItem("flenzr_creator_cover_image", nextCover);
    } catch {}
  };

  // Dynamic skills based on creator's niche
  const dynamicSkills: string[] = [];

  // Dynamic collab formats based on rateCards or niche fallback
  const dynamicCollabFormats = (() => {
    if (rateCards && rateCards.length > 0) {
      const extracted = rateCards
        .map((rc) => rc.deliverable || rc.deliverable_type || rc.title || "")
        .filter(Boolean);
      if (extracted.length > 0) return Array.from(new Set(extracted)).slice(0, 4);
    }
    return [];
  })();

  // Dynamic past brand partnerships
  const dynamicPastPartnerships = (() => {
    if (completedDeals !== undefined) return completedDeals;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("flenzr_collab_pipeline_deals");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed.filter((d: any) => d.stage === "completed");
          }
        }
      } catch {}
    }
    return [];
  })();

  // Socials list with chronological ordering
  const [linkedSocials, setLinkedSocials] = useState<LinkedSocialItem[]>(() => {
    const list: LinkedSocialItem[] = [];
    let order = 1;
    if (creator.instagram_handle) {
      list.push({
        id: "soc-ig",
        platform: "instagram",
        handle: creator.instagram_handle.replace(/^@/, ""),
        url: `https://instagram.com/${creator.instagram_handle.replace(/^@/, "")}`,
        isVerified: Boolean(creator.instagram_verified),
        createdAt: 1000 * order++,
      });
    }
    if (creator.youtube_channel) {
      list.push({
        id: "soc-yt",
        platform: "youtube",
        handle: creator.youtube_channel.replace(/^@/, ""),
        url: `https://youtube.com/@${creator.youtube_channel.replace(/^@/, "")}`,
        isVerified: Boolean(creator.youtube_verified),
        createdAt: 1000 * order++,
      });
    }
    return list;
  });

  // Keep state in sync with incoming creator prop
  useEffect(() => {
    setCreatorName(creator.display_name);
    setHandle(creator.handle);
  }, [creator.display_name, creator.handle]);

  // Active avatar state
  const [activeAvatar, setActiveAvatar] = useState<string>(() => {
    return creator.avatar_url || "";
  });
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);

  // Avatar switcher modal state
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [avatarSuccessMsg, setAvatarSuccessMsg] = useState<string | null>(null);

  // Add social modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSocial, setEditingSocial] = useState<LinkedSocialItem | null>(null);
  const [isSavingSocial, setIsSavingSocial] = useState(false);
  const [socialsReady, setSocialsReady] = useState(false);
  const [socialError, setSocialError] = useState("");
  const [newPlatform, setNewPlatform] = useState<PlatformKey>("instagram");
  const [newHandle, setNewHandle] = useState("");
  const [instagramAccountId, setInstagramAccountId] = useState("");
  const [isVerifyingInModal, setIsVerifyingInModal] = useState(false);
  const [modalVerifyMsg, setModalVerifyMsg] = useState<{ success: boolean; text: string } | null>(null);

  // 1. HYDRATE & CACHE FROM LOCALSTORAGE
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load user chosen avatar or cached avatar
    const chosenAvatar = localStorage.getItem(`flenzr_chosen_avatar_${handle}`);
    const cachedAvatar = localStorage.getItem(`flenzr_avatar_${handle}`);

    const loadedSocials = linkedSocials;

    if (chosenAvatar) {
      setActiveAvatar(chosenAvatar);
    } else if (cachedAvatar) {
      setActiveAvatar(cachedAvatar);
    } else {
      // STRICT DEFAULT: Follow earliest added account's avatar
      const earliest = loadedSocials.find((s) => Boolean(s.avatarUrl));
      if (earliest?.avatarUrl) {
        setActiveAvatar(earliest.avatarUrl);
        localStorage.setItem(`flenzr_avatar_${handle}`, earliest.avatarUrl);
      } else if (creator.avatar_url) {
        setActiveAvatar(creator.avatar_url);
      }
    }
  }, [handle]);

  // Save socials update
  const persistSocials = (newList: LinkedSocialItem[]) => {
    setLinkedSocials(newList);
    if (typeof window !== "undefined") {
      localStorage.setItem(`flenzr_socials_${handle}`, JSON.stringify(newList));
    }
  };

  const applyServerAccounts = (accounts: SocialAccount[], metadata = linkedSocials) => {
    const next = mergeSocialAccounts(accounts, metadata);
    const removed = linkedSocials.filter((old) => !next.some((item) => item.platform === old.platform && item.handle === old.handle));
    persistSocials(next);
    try {
      const raw = localStorage.getItem("flenzr_creator_profile");
      const profile = raw ? JSON.parse(raw) : { handle };
      const instagram = next.find((item) => item.platform === "instagram");
      const youtube = next.find((item) => item.platform === "youtube");
      if (profile.instagramHandle !== (instagram?.handle || "")) { delete profile.instagramStats; delete profile.instagramFollowers; }
      if (profile.youtubeChannel !== (youtube?.handle || "")) { delete profile.youtubeStats; delete profile.youtubeSubscribers; }
      Object.assign(profile, { instagramHandle: instagram?.handle || "", isInstagramBioVerified: instagram?.isVerified || false, youtubeChannel: youtube?.handle || "", isYoutubeBioVerified: youtube?.isVerified || false });
      localStorage.setItem("flenzr_creator_profile", JSON.stringify(profile));
      if (removed.some((item) => item.avatarUrl && (item.avatarUrl === activeAvatar || item.avatarUrl === localStorage.getItem(`flenzr_chosen_avatar_${handle}`)))) {
        const fallback = next.find((item) => item.avatarUrl)?.avatarUrl || creator.avatar_url || "";
        setActiveAvatar(fallback);
        localStorage.removeItem(`flenzr_chosen_avatar_${handle}`);
        if (fallback) localStorage.setItem(`flenzr_avatar_${handle}`, fallback);
        else localStorage.removeItem(`flenzr_avatar_${handle}`);
      }
    } catch { /* Browser metadata is optional; the backend remains authoritative. */ }
    window.dispatchEvent(new Event("flenzr_socials_updated"));
    return next;
  };

  useEffect(() => {
    if (!isEditable || !handle) return;
    let active = true;
    const load = async () => {
      try {
        let accounts = await getSocialAccounts();
        if (!active) return;
        let cached: LinkedSocialItem[] = [];
        try { cached = JSON.parse(localStorage.getItem(`flenzr_socials_${handle}`) || "[]"); } catch {}
        // One-time persistence of links added through the previous browser-only UI.
        const marker = `flenzr_socials_saved_${handle}`;
        if (!localStorage.getItem(marker) && Array.isArray(cached)) {
          for (const item of cached) {
            if (!active) return;
            if (["instagram", "youtube", "x", "tiktok", "linkedin", "twitch"].includes(item.platform) && /^[a-zA-Z0-9_.-]{1,128}$/.test(item.handle) && !accounts.some((account) => account.platform === item.platform)) {
              accounts = await saveSocialAccount(item.platform, item.handle, "");
            }
          }
          localStorage.setItem(marker, "true");
        }
        if (!active) return;
        const next = mergeSocialAccounts(accounts, Array.isArray(cached) ? cached : []);
        persistSocials(next);
        setSocialsReady(true);
      } catch (error) { if (active) setSocialError(error instanceof Error ? error.message : "Could not load linked accounts"); }
    };
    load();
    return () => { active = false; };
  }, [handle, isEditable]);

  const editSocial = (social: LinkedSocialItem) => {
    setEditingSocial(social);
    setNewPlatform(social.platform);
    setNewHandle(social.handle);
    setModalVerifyMsg(null);
    setShowAddModal(true);
  };
  const removeSocial = async (social: LinkedSocialItem) => {
    if (isSavingSocial) return;
    if (social.isVerified && !window.confirm(`Remove @${social.handle} from ${social.platform}? You can add it again, but will need to verify it again.`)) return;
    setIsSavingSocial(true);
    setSocialError("");
    try {
      applyServerAccounts(await deleteSocialAccount(social.platform, social.handle));
      } catch (error) { setSocialError(error instanceof Error ? error.message : "Could not remove account"); }
    finally { setIsSavingSocial(false); }
  };

  const socialIdentity = linkedSocials.map((item) => `${item.platform}:${item.handle}`).join("|");
  // 2. ENRICH MISSING AVATARS FOR CONNECTED SOCIALS
  useEffect(() => {
    if (typeof window === "undefined") return;

    const enrichMissingAvatars = async () => {
      let hasUpdates = false;
      const updatedSocials = [...linkedSocials];

      for (let i = 0; i < updatedSocials.length; i++) {
        const social = updatedSocials[i];
        if (!social.avatarUrl && (social.platform === "instagram" || social.platform === "youtube") && social.handle) {
          try {
            setIsLoadingAvatar(true);
            const res = await fetch("/api/social/enrich", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ platform: social.platform, handle: social.handle }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.avatarUrl) {
                updatedSocials[i] = { ...social, avatarUrl: data.avatarUrl };
                hasUpdates = true;
              }
            }
          } catch (e) {
            console.warn("Failed to enrich avatar for", social.platform, social.handle, e);
          } finally {
            setIsLoadingAvatar(false);
          }
        }
      }

      if (hasUpdates) {
        setLinkedSocials((current) => {
          const next = mergeSocialAvatars(current, updatedSocials);
          localStorage.setItem(`flenzr_socials_${handle}`, JSON.stringify(next));
          return next;
        });


      }
    };

    enrichMissingAvatars();
  }, [socialIdentity, handle]);

  // 3. COMPUTE AVAILABLE AVATARS IN CHRONOLOGICAL ORDER (Earliest account first)
  const earliestSocialWithAvatar = linkedSocials.find((s) => Boolean(s.avatarUrl));
  const availableAvatars: AvailableAvatar[] = [];

  linkedSocials.forEach((social) => {
    if (social.avatarUrl) {
      const isEarliest = earliestSocialWithAvatar?.id === social.id;
      const platformName =
        social.platform === "instagram"
          ? "Instagram"
          : social.platform === "youtube"
          ? "YouTube"
          : social.platform === "x"
          ? "X / Twitter"
          : social.platform.charAt(0).toUpperCase() + social.platform.slice(1);

      availableAvatars.push({
        id: social.id,
        source: `${platformName} Profile`,
        platform: social.platform,
        handle: social.handle,
        url: social.avatarUrl,
        isEarliest,
      });
    }
  });

  // Base profile avatar if present and distinct
  if (
    creator.avatar_url &&
    !creator.avatar_url.includes("dicebear") &&
    !availableAvatars.some((a) => a.url === creator.avatar_url)
  ) {
    availableAvatars.push({
      id: "base-profile",
      source: "Account Profile",
      platform: "default",
      handle: handle,
      url: creator.avatar_url,
      isEarliest: availableAvatars.length === 0,
    });
  }

  // Switch active avatar handler
  const handleSelectAvatar = (url: string) => {
    setActiveAvatar(url);
    if (typeof window !== "undefined") {
      localStorage.setItem(`flenzr_avatar_${handle}`, url);
      localStorage.setItem(`flenzr_chosen_avatar_${handle}`, url);
    }
    setAvatarSuccessMsg("Profile picture updated!");
    setTimeout(() => setAvatarSuccessMsg(null), 2500);
  };

  // Reset to earliest added account avatar
  const handleResetToEarliest = () => {
    const earliest = availableAvatars.find((a) => a.isEarliest) || availableAvatars[0];
    if (earliest) {
      setActiveAvatar(earliest.url);
      if (typeof window !== "undefined") {
        localStorage.setItem(`flenzr_avatar_${handle}`, earliest.url);
        localStorage.removeItem(`flenzr_chosen_avatar_${handle}`);
      }
      setAvatarSuccessMsg("Reset to earliest linked account picture!");
      setTimeout(() => setAvatarSuccessMsg(null), 2500);
    }
  };

  // 4. STRICT VERIFICATION CHECK:
  const allLinkedSocialsVerified = linkedSocials.some((s) => s.isVerified);

  const startAccountConnection = async (platform: "youtube" | "instagram", existingHandle?: string, accountId?: string) => {
    if (isSavingSocial || !socialsReady) return;
    setIsSavingSocial(true);
    setSocialError("");
    setModalVerifyMsg(null);
    try {
      if (platform === "youtube") await connectYouTube(existingHandle);
      else await connectInstagram(existingHandle, accountId);
    }
    catch (error) {
      const text = error instanceof Error ? error.message : `Could not connect ${platform === "youtube" ? "YouTube" : "Instagram"}.`;
      setModalVerifyMsg({ success: false, text });
      setSocialError(text);
      setIsSavingSocial(false);
    }
  };

  // Other platforms retain their existing manual-link flow.
  const handleAddSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlatform === "youtube" || newPlatform === "instagram") {
      await startAccountConnection(newPlatform, editingSocial?.handle,
        newPlatform === "instagram" ? instagramAccountId.trim() || undefined : undefined);
      return;
    }
    const clean = newHandle.trim().replace(/^@/, "").toLowerCase();
    if (!clean || isSavingSocial || !socialsReady) return;
    setIsSavingSocial(true);
    setModalVerifyMsg(null);
    try {
      const existing = editingSocial;
      const accounts = await saveSocialAccount(newPlatform, clean, existing?.handle ?? "");
      applyServerAccounts(accounts);
      setNewHandle("");
      setShowAddModal(false);
      setEditingSocial(null);

    } catch (error) { setModalVerifyMsg({ success: false, text: error instanceof Error ? error.message : "Could not save account" }); }
    finally { setIsSavingSocial(false); }
  };

  const getPlatformIcon = (platform: PlatformKey) => {
    switch (platform) {
      case "instagram":
        return <InstagramIcon className="w-4 h-4 text-[#E1306C]" />;
      case "youtube":
        return <YoutubeIcon className="w-4 h-4 text-[#c1121f]" />;
      case "x":
        return <XTwitterIcon className="w-4 h-4 text-neutral-900" />;
      case "tiktok":
        return <TikTokIcon className="w-4 h-4 text-black" />;
      case "linkedin":
        return <LinkedInIcon className="w-4 h-4 text-[#0077b5]" />;
      case "twitch":
        return <TwitchIcon className="w-4 h-4 text-[#9146FF]" />;
      default:
        return <ExternalLink className="w-4 h-4 text-neutral-600" />;
    }
  };

  return (
    <>
      <section className="bg-[#121215] border border-[#27272a] rounded-2xl overflow-hidden shadow-xl relative text-[#f1f3f7]">
        {/* 1. Sleek Dark Header Banner with Randomly Chosen Cover Image (1 of 5) */}
        <div className="h-28 sm:h-32 relative border-b border-[#27272a] p-3 flex items-start justify-between overflow-hidden group">
          <img
            src={coverImage}
            alt="Creator Profile Cover"
            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121215] via-black/40 to-black/30 pointer-events-none" />
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:14px_14px] pointer-events-none" />

          {/* Switch / Shuffle Cover button */}
          {isEditable && (
            <button
              type="button"
              onClick={handleShuffleCover}
              title="Shuffle Cover Image (1 of 5)"
              className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[10px] font-semibold border border-white/20 flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
            >
              <RefreshCw className="w-2.5 h-2.5 text-neutral-300" />
              <span>Change Cover</span>
            </button>
          )}

          {/* Verified White Badge */}
          {allLinkedSocialsVerified && (
            <div className="relative z-10 ml-auto h-6 px-2.5 rounded-lg bg-white text-black text-[11px] font-bold shadow-md inline-flex items-center gap-1">
              <Check className="w-3 h-3 text-[#c1121f] stroke-[3]" />
              <span>{t("Verified")}</span>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-0 relative space-y-3.5">
          {/* 1. CREATOR AVATAR (Pulled from connected socials, cached in UI) */}
          <div className="relative group shrink-0 -mt-11 mb-2 inline-block">
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden border-4 border-[#121215] bg-[#18181b] shadow-xl relative">
              {isLoadingAvatar ? (
                <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
              ) : activeAvatar ? (
                <img
                  src={activeAvatar}
                  alt={creatorName}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `/api/proxy-image?name=${encodeURIComponent(creatorName)}`;
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-extrabold text-white">
                  {creatorName.charAt(0) || "C"}
                </span>
              )}

              {/* Hover overlay to switch picture if editable */}
              {isEditable && (
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(true)}
                  className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer backdrop-blur-xs z-10"
                  title="Switch profile picture"
                >
                  <Camera className="w-4 h-4 mb-0.5 text-white" />
                  <span>{t("Switch")}</span>
                </button>
              )}
            </div>

            {/* Interactive Switch Picture Pill Button (when editable) */}
            {isEditable && (
              <button
                type="button"
                onClick={() => setShowAvatarPicker(true)}
                title="Switch profile picture from connected accounts"
                className="absolute bottom-0 right-0 bg-[#18181b] hover:bg-[#222226] text-white px-2 py-0.5 rounded-lg border border-[#27272a] shadow-md flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-transform hover:scale-105 active:scale-95 z-20"
              >
                <Camera className="w-3 h-3 text-white" />
                <span>{t("Switch")}</span>
              </button>
            )}
          </div>

          {/* 2. CREATOR INFO (Vertical Stack) */}
          <div className="space-y-2 text-left">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {creatorName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-md bg-white/10 border border-white/20 text-white text-[11px] font-semibold">
                  {creator.niche || "Creator"}
                </span>
              </div>
              <p className="text-xs text-[#7e8697] font-medium mt-0.5">
                @{handle} {creator.location ? `• ${creator.location}` : ""}
              </p>
            </div>

            {/* Rating */}
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-[#18181b] border border-[#27272a] text-white">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {creator.rating > 0 ? creator.rating.toFixed(1) : "No reviews yet"}
                <span className="text-[#71717a] font-normal text-[10px]">({t("Brand reviews")})</span>
              </span>
            </div>

            {creator.bio && (
              <p className="text-[#a1a1aa] text-xs leading-relaxed line-clamp-2 pt-0.5">
                {creator.bio}
              </p>
            )}

            {/* 3. Skills Section (from Virgil Pana screenshot) */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] uppercase tracking-wider text-[#71717a] font-semibold block">
                {t("Skills")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {dynamicSkills.length === 0 && <span className="text-xs text-neutral-500">No skills added yet</span>}
                {dynamicSkills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded-lg bg-[#18181b] text-neutral-300 text-[11px] font-medium border border-[#27272a]"
                  >
                    {t(skill, skill)}
                  </span>
                ))}
              </div>
            </div>

            {/* 4. Position Type Section (Collab Formats) */}
            <div className="space-y-1.5 pt-0.5">
              <span className="text-[11px] uppercase tracking-wider text-[#71717a] font-semibold block">
                {t("Position type")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {dynamicCollabFormats.length === 0 && <span className="text-xs text-neutral-500">No formats published yet</span>}
                {dynamicCollabFormats.map((type) => (
                  <span
                    key={type}
                    className="px-2.5 py-1 rounded-lg bg-[#18181b] text-neutral-300 text-[11px] font-medium border border-[#27272a]"
                  >
                    {t(type, type)}
                  </span>
                ))}
              </div>
            </div>

            {/* 5. Location & Timezone Split Card */}
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
              <div>
                <span className="text-[10px] text-[#71717a] uppercase font-semibold block">{t("Location")}</span>
                <div className="text-xs font-semibold text-white mt-0.5 truncate">
                  {creator.location || "Not provided"}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-[#71717a] uppercase font-semibold block">{t("Timezone")}</span>
                <div className="text-xs font-semibold text-white mt-0.5 truncate">
                  Not provided
                </div>
              </div>
            </div>

            {/* 6. Past Brand Partnerships */}
            <div className="space-y-2 pt-2 border-t border-[#27272a]">
              <span className="text-[11px] uppercase tracking-wider text-[#71717a] font-semibold block">
                {t("Past Brand Partnerships")}
              </span>

              {dynamicPastPartnerships.length > 0 ? (
                <div className="space-y-2">
                  {dynamicPastPartnerships.slice(0, 3).map((deal, idx) => {
                    const initial = (deal.brand || "B").charAt(0).toUpperCase();
                    const colors = [
                      "bg-emerald-950/80 border-emerald-600/30 text-emerald-400",
                      "bg-violet-950/80 border-violet-600/30 text-violet-400",
                      "bg-sky-950/80 border-sky-600/30 text-sky-400",
                    ];
                    const colorClass = colors[idx % colors.length];
                    return (
                      <div
                        key={deal.id || idx}
                        className="p-2.5 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg border flex items-center justify-center font-black text-xs shrink-0 ${colorClass}`}
                          >
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{deal.brand}</div>
                            <div className="text-[10px] text-[#71717a] truncate">{deal.deliverable}</div>
                          </div>
                        </div>
                        <span className="text-[10px] text-white font-bold bg-white/10 px-2 py-0.5 rounded border border-white/10 shrink-0">
                          {deal.amount}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#18181b]/60 border border-dashed border-[#27272a] text-center space-y-1">
                  <div className="text-xs font-semibold text-neutral-300">
                    {t("No completed brand partnerships yet")}
                  </div>
                  <p className="text-[10px] text-[#71717a] leading-relaxed">
                    {t("Lock your first collab in Flenzr Vault to unlock verified performance case studies and GMV proof badges.")}
                  </p>
                </div>
              )}
            </div>

            {/* 7. ROW OF LINKED SOCIAL LOGOS WITH RED TICK ON VERIFIED ONES + '+' BUTTON */}
            <div className="pt-2 border-t border-[#27272a]">
              <span className="text-[10px] uppercase tracking-wider text-[#686f82] font-bold block mb-1.5">
                {t("Connected Accounts")}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {linkedSocials.map((social) => (
                  <div key={social.id} className="w-full flex items-center gap-2 p-2 rounded-xl bg-neutral-900 border border-neutral-800">
                    <a href={social.url} target="_blank" rel="noopener noreferrer" className="w-9 h-9 shrink-0 flex items-center justify-center" aria-label={`Visit ${social.platform} @${social.handle}`}>
                      {getPlatformIcon(social.platform)}
                    </a>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate">@{social.handle}</div>
                      <div className="text-[10px] text-neutral-400">{social.platform} · {social.isVerified ? "Verified" : "Not verified"}</div>
                    </div>
                    {isEditable && <div className="flex flex-wrap gap-1 shrink-0">
                      {(social.platform === "youtube" || social.platform === "instagram") ? (
                        <AccountActionButton
                          label={isSavingSocial ? t("Connecting…") : social.isVerified ? t("Reconnect") : t("Connect")}
                          disabled={isSavingSocial || !socialsReady}
                          onClick={() => startAccountConnection(social.platform as "youtube" | "instagram", social.handle)}
                          aria-label={`${social.isVerified ? "Reconnect" : "Connect"} ${social.platform === "youtube" ? "YouTube" : "Instagram"} @${social.handle}`}
                          aria-busy={isSavingSocial}
                        >
                          {isSavingSocial ? <Loader2 aria-hidden="true" className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw aria-hidden="true" className="w-3.5 h-3.5" />}
                        </AccountActionButton>
                      ) : <button type="button" disabled={isSavingSocial || !socialsReady} onClick={() => editSocial(social)} className="px-2 py-1 text-[10px] text-neutral-300" aria-label={`Edit ${social.platform} @${social.handle}`}>Edit</button>}
                      <AccountActionButton
                        label={t("Remove")}
                        disabled={isSavingSocial || !socialsReady}
                        onClick={() => removeSocial(social)}
                        aria-label={`Remove ${social.platform} @${social.handle}`}
                      >
                        <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                      </AccountActionButton>
                    </div>}
                  </div>
                ))}
                {!linkedSocials.length && <p className="text-xs text-neutral-500">No accounts linked yet.</p>}
                {socialError && <p role="alert" className="text-xs text-red-300">{socialError}</p>}

                {/* THE '+' BUTTON TO ADD MORE SOCIAL LINKS */}
                {isEditable && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSocial(null);
                      setNewHandle("");
                      setInstagramAccountId("");
                      setShowAddModal(true);
                      setModalVerifyMsg(null);
                    }}
                    title="Add More Social Links" disabled={isSavingSocial || !socialsReady}
                    className="w-9 h-9 rounded-xl border border-dashed border-neutral-700 hover:border-neutral-500 bg-neutral-800/80 hover:bg-neutral-750 flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer shadow-xs group"
                  >
                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </button>
                )}
              </div>

              {/* Informational Subtext */}
              {linkedSocials.length > 0 && !allLinkedSocialsVerified && (
                <p className="text-[11px] text-neutral-400 pt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>
                    Verify ownership to earn a verified tag. You can edit or remove any account without verifying it.
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD MORE SOCIAL LINKS                                  */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#141418] border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#c1121f]/20 text-[#c1121f] border border-[#c1121f]/30 flex items-center justify-center">
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{editingSocial ? "Edit linked account" : "Link social account"}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSocial} className="space-y-4 text-xs">
                {editingSocial?.isVerified && <p className="text-amber-300">Changing this handle requires verification again.</p>}
                {modalVerifyMsg && <p role="alert" className="text-red-300">{modalVerifyMsg.text}</p>}
                {/* Platform Selection */}
                <div>
                  <label className="block text-neutral-300 font-bold mb-1.5">Select Social Platform</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "instagram" as PlatformKey, label: "Instagram", icon: InstagramIcon },
                      { key: "youtube" as PlatformKey, label: "YouTube", icon: YoutubeIcon },
                      { key: "x" as PlatformKey, label: "X (Twitter)", icon: XTwitterIcon },
                      { key: "tiktok" as PlatformKey, label: "TikTok", icon: TikTokIcon },
                      { key: "linkedin" as PlatformKey, label: "LinkedIn", icon: LinkedInIcon },
                      { key: "twitch" as PlatformKey, label: "Twitch", icon: TwitchIcon },
                    ].map((p) => {
                      const Icon = p.icon;
                      const isSelected = newPlatform === p.key;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          disabled={Boolean(editingSocial) || isSavingSocial} onClick={() => setNewPlatform(p.key)}
                          className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-white text-black border-white shadow-xs"
                              : "bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300"
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isSelected ? "text-black" : ""}`} />
                          <span className="text-[11px]">{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {newPlatform === "youtube" ? <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2">
                  <p className="font-semibold text-white">Connect your YouTube channel</p>
                  <p className="text-neutral-400 leading-relaxed">Choose your channel on Google and allow read-only access. We’ll add your channel details and verify ownership automatically.</p>
                  <p className="text-[11px] text-neutral-500">No username entry or bio verification code needed. Flenzr cannot upload, edit, or delete your videos with this access.</p>
                </div> : newPlatform === "instagram" ? <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-4 space-y-3">
                  <p className="font-semibold text-white">Connect your Instagram account</p>
                  <p className="text-neutral-400 leading-relaxed">Sign in with Instagram or Facebook, select your business portfolio, and share your Creator or Business account. We’ll add your account details and verify ownership automatically.</p>
                  <p className="text-[11px] text-neutral-500">No username entry or bio code needed. Meta also requests messaging access for this configuration; Flenzr currently does not read or send messages.</p>
                  <p className="text-[11px] text-amber-300">Development mode: choose Continue with Facebook and use the Facebook account listed as an Administrator of the Meta app. Instagram Tester login is not supported by Unified Login.</p>
                  <div className="border-t border-pink-500/15 pt-3">
                    <label htmlFor="instagram-account-id" className="block text-neutral-300 font-bold mb-1">Meta Instagram account ID <span className="font-normal text-neutral-500">(optional)</span></label>
                    <input
                      id="instagram-account-id"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={32}
                      placeholder="Use only if Meta does not return your selected account"
                      value={instagramAccountId}
                      onChange={(e) => setInstagramAccountId(e.target.value.replace(/\D/g, ""))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-pink-500/60"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1.5">Find it in <a href="https://business.facebook.com/settings/" target="_blank" rel="noreferrer" className="text-pink-300 hover:text-pink-200 underline">Meta Business Settings</a> → Instagram accounts. Flenzr still verifies access through OAuth.</p>
                  </div>
                </div> : <div>
                  <label className="block text-neutral-300 font-bold mb-1">
                    Your {newPlatform.charAt(0).toUpperCase() + newPlatform.slice(1)} Handle
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-neutral-500 font-semibold">@</span>
                    <input
                      type="text"
                      placeholder="username"
                      value={newHandle}
                      onChange={(e) => setNewHandle(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-[#c1121f]"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Changing a handle replaces the linked account and requires ownership verification again.
                  </p>
                </div>}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingSocial || !socialsReady}
                    className="px-5 py-2 rounded-xl bg-[#c1121f] hover:bg-[#a50e1a] text-white font-bold cursor-pointer shadow-lg shadow-[#c1121f]/25"
                  >
                    {newPlatform === "youtube" || newPlatform === "instagram" ? (isSavingSocial ? "Connecting…" : newPlatform === "youtube" ? "Connect YouTube" : "Connect Instagram") : isSavingSocial ? "Saving…" : editingSocial ? "Save changes" : "Connect Link"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CHOOSE / SWITCH PROFILE PICTURE                          */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {showAvatarPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#141418] border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-xs text-white max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#c1121f] text-white flex items-center justify-center shadow-xs">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Choose Profile Picture</h3>
                    <p className="text-[11px] text-neutral-400">
                      Default photo follows your earliest linked account. Select any photo below.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Success alert message if switched */}
              {avatarSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 flex items-center gap-2 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{avatarSuccessMsg}</span>
                </div>
              )}

              {/* Available Avatars List / Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-neutral-400">
                    Connected Account Photos ({availableAvatars.length})
                  </span>
                  {availableAvatars.some((a) => a.isEarliest && a.url !== activeAvatar) && (
                    <button
                      type="button"
                      onClick={handleResetToEarliest}
                      className="text-[11px] font-bold text-[#c1121f] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset to Earliest Default</span>
                    </button>
                  )}
                </div>

                {availableAvatars.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400">
                    <p className="font-semibold text-white">No profile photos found yet.</p>
                    <p className="text-[11px] mt-1 text-neutral-400">
                      Connect your Instagram or YouTube account to automatically pull your real profile photo.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableAvatars.map((item) => {
                      const isActive = activeAvatar === item.url;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectAvatar(item.url)}
                          className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                            isActive
                              ? "bg-neutral-800/80 border-[#c1121f] ring-2 ring-[#c1121f]/30 shadow-sm"
                              : "bg-neutral-900 hover:bg-neutral-850 border-neutral-800 hover:border-neutral-700"
                          }`}
                        >
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-950 shrink-0 border border-neutral-800">
                            <img
                              src={item.url}
                              alt={item.source}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = `/api/proxy-image?name=${encodeURIComponent(item.handle || creatorName)}`;
                              }}
                            />
                            {item.platform !== "default" && (
                              <div className="absolute bottom-1 right-1 p-0.5 rounded-md bg-neutral-900/90 border border-neutral-800 shadow-xs">
                                {getPlatformIcon(item.platform as PlatformKey)}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 flex-wrap mb-1">
                              {item.isEarliest && (
                                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-950/60 text-amber-300 border border-amber-800/80">
                                  Earliest Added
                                </span>
                              )}
                              {isActive && (
                                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-[#c1121f] text-white flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Active
                                </span>
                              )}
                            </div>
                            <div className="font-extrabold text-white truncate text-xs">
                              {item.source}
                            </div>
                            <div className="text-[11px] text-neutral-400 font-semibold truncate">
                              @{item.handle}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Custom Image URL Option */}
              <div className="pt-2 border-t border-neutral-800 space-y-2">
                <label className="block text-neutral-300 font-bold text-[11px]">
                  Or paste a custom image URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#c1121f]"
                  />
                  <button
                    type="button"
                    disabled={!customAvatarUrl.trim()}
                    onClick={() => {
                      if (customAvatarUrl.trim()) {
                        handleSelectAvatar(customAvatarUrl.trim());
                        setCustomAvatarUrl("");
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs disabled:opacity-40 cursor-pointer transition-colors shadow-xs"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                <p className="text-[11px] text-neutral-400">
                  Photo selection is saved to your creator profile.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(false)}
                  className="px-5 py-2 rounded-xl bg-[#c1121f] hover:bg-[#a50e1a] text-white font-bold cursor-pointer transition-colors shadow-lg shadow-[#c1121f]/25"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
