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
} from "lucide-react";
import { Logo } from "@/components/ui/logo";

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
  const [activeTab, setActiveTab] = useState<"ratecards" | "links" | "qr" | "profile">("ratecards");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [creatorName, setCreatorName] = useState("Sarah Miller");
  const [creatorHandle, setCreatorHandle] = useState("sarahmiller");
  const [creatorNiche, setCreatorNiche] = useState("Tech Reviewer & Lifestyle Creator");

  // Rate Cards state
  const [rateCards, setRateCards] = useState<RateCardItem[]>([
    {
      id: "rc-1",
      platform: "YouTube",
      deliverable_type: "Dedicated Video",
      title: "Full 8-10 Min Dedicated Product Review & Tutorial",
      price_dollars: 50000,
      turnaround_days: 14,
    },
    {
      id: "rc-2",
      platform: "Instagram",
      deliverable_type: "Reel / Shorts",
      title: "60-Second Dynamic Product Reel with Bio Link",
      price_dollars: 25000,
      turnaround_days: 5,
    },
    {
      id: "rc-3",
      platform: "Podcast",
      deliverable_type: "Pre-Roll Ad Read",
      title: "60-Second Host Read Sponsorship + Show Notes",
      price_dollars: 15000,
      turnaround_days: 7,
    },
  ]);

  const [instagramHandle, setInstagramHandle] = useState("sarahmiller");
  const [youtubeChannel, setYoutubeChannel] = useState("SarahMillerVlogs");
  const [isInstagramBioVerified, setIsInstagramBioVerified] = useState(true);
  const [isYoutubeBioVerified, setIsYoutubeBioVerified] = useState(false);
  const [verifyingPlatform, setVerifyingPlatform] = useState<"instagram" | "youtube" | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("flenzr_creator_profile");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.fullName) setCreatorName(parsed.fullName);
          if (parsed.handle) setCreatorHandle(parsed.handle);
          if (parsed.niche) setCreatorNiche(parsed.niche);
          if (parsed.instagramHandle) setInstagramHandle(parsed.instagramHandle);
          if (parsed.youtubeChannel) setYoutubeChannel(parsed.youtubeChannel);
          if (parsed.isInstagramBioVerified !== undefined) {
            setIsInstagramBioVerified(parsed.isInstagramBioVerified);
          }
          if (parsed.isYoutubeBioVerified !== undefined) {
            setIsYoutubeBioVerified(parsed.isYoutubeBioVerified);
          }
          if (parsed.rateCards && Array.isArray(parsed.rateCards) && parsed.rateCards.length > 0) {
            setRateCards(
              parsed.rateCards.map((rc: any) => ({
                id: rc.id || `rc-${Date.now()}`,
                platform: rc.platform || "Instagram",
                deliverable_type: rc.deliverable || "Collab",
                title: rc.deliverable || "Sponsored Deliverable",
                price_dollars: Number(rc.price) || 25000,
                turnaround_days: Number(rc.days) || 7,
              }))
            );
          }

          // Hydrate with latest live records from FastAPI backend
          const targetHandle = parsed.handle || "sarahmiller";
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
          fetch(`${apiUrl}/creators/public/${encodeURIComponent(targetHandle)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((liveCreator) => {
              if (liveCreator) {
                if (liveCreator.display_name) setCreatorName(liveCreator.display_name);
                if (liveCreator.niche) setCreatorNiche(liveCreator.niche);
                if (liveCreator.instagram_handle) setInstagramHandle(liveCreator.instagram_handle);
                if (liveCreator.youtube_channel) setYoutubeChannel(liveCreator.youtube_channel);
                if (liveCreator.instagram_verified !== undefined) {
                  setIsInstagramBioVerified(liveCreator.instagram_verified);
                }
                if (liveCreator.youtube_verified !== undefined) {
                  setIsYoutubeBioVerified(liveCreator.youtube_verified);
                }
              }
            })
            .catch(() => {});

          fetch(`${apiUrl}/ratecards/creator/${encodeURIComponent(targetHandle)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((liveCards) => {
              if (Array.isArray(liveCards) && liveCards.length > 0) {
                setRateCards(
                  liveCards.map((rc: any) => ({
                    id: rc.id,
                    platform: rc.platform.charAt(0).toUpperCase() + rc.platform.slice(1),
                    deliverable_type: rc.deliverable_type,
                    title: rc.title,
                    price_dollars: Math.round(rc.base_price_cents / 100),
                    turnaround_days: rc.turnaround_days,
                  }))
                );
              }
            })
            .catch(() => {});
        } catch (e) {
          console.error("Failed to parse stored profile", e);
        }
      }
    }
  }, []);

  // Form for new rate card
  const [newPlatform, setNewPlatform] = useState("YouTube");
  const [newDeliverable, setNewDeliverable] = useState("Integrated Sponsorship");
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("25000");
  const [newTurnaround, setNewTurnaround] = useState("7");
  const [showAddRateCard, setShowAddRateCard] = useState(false);

  // Tracked Links state
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
  const [qrColor, setQrColor] = useState("#c1121f");

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(`http://localhost:8000/r/${code}`);
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
    <div className="min-h-screen bg-white text-black selection:bg-[#c1121f] selection:text-white">
      {/* Top Header */}
      <header className="border-b border-neutral-200 bg-white/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Logo size={30} variant="duotone" withWordmark={true} />
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-100 text-black font-semibold border border-neutral-200">
              Creator Studio
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <Link
              href={`/${creatorHandle}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#c1121f]/10 text-[#c1121f] hover:bg-[#c1121f]/20 border border-[#c1121f]/20 font-semibold transition-colors"
            >
              <span>View Public Media Kit</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Creator Snapshot Bar */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#c1121f] to-black p-0.5 shadow-md shadow-[#c1121f]/10">
              <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center text-2xl font-bold text-black uppercase">
                {creatorName.charAt(0) || "C"}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-black">{creatorName}</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#c1121f]/10 text-[#c1121f] border border-[#c1121f]/20">
                  VERIFIED
                </span>
              </div>
              <p className="text-xs text-neutral-500">@{creatorHandle} • {creatorNiche}</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-center">
            <div>
              <span className="block text-xl font-extrabold text-black">{rateCards.length}</span>
              <span className="text-xs text-neutral-500">Rate Cards</span>
            </div>
            <div className="w-px h-8 bg-neutral-200" />
            <div>
              <span className="block text-xl font-extrabold text-[#c1121f]">
                {trackedLinks.reduce((acc, l) => acc + l.clicks, 0).toLocaleString()}
              </span>
              <span className="text-xs text-neutral-500">Total Clicks</span>
            </div>
            <div className="w-px h-8 bg-neutral-200" />
            <div>
              <span className="block text-xl font-extrabold text-black">5.0 ★</span>
              <span className="text-xs text-neutral-500">Brand Rating</span>
            </div>
          </div>
        </div>

        {/* Channel Verification & Bio Link Status Banner */}
        <div className="bg-neutral-50 border border-neutral-200/90 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">
                <Link2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Universal Bio Link
                </div>
                <div className="text-sm font-extrabold text-black flex items-center gap-2">
                  <span>flenzr.com/@{creatorHandle}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(`https://flenzr.com/@${creatorHandle}`);
                      setCopiedCode("biolink");
                      setTimeout(() => setCopiedCode(null), 2000);
                    }}
                    className="p-1 rounded hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer"
                    title="Copy Bio Link"
                  >
                    {copiedCode === "biolink" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Channels Verification Badges */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Instagram Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs">
                <span className="font-bold text-neutral-800">
                  Instagram (@{instagramHandle || "creator"})
                </span>
                {isInstagramBioVerified ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Verified Owner
                  </span>
                ) : (
                  <button
                    onClick={async () => {
                      setVerifyingPlatform("instagram");
                      await fetch("/api/social/verify-bio", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          platform: "instagram",
                          handle: instagramHandle,
                          verificationCode: "FLENZR-892",
                        }),
                      });
                      setIsInstagramBioVerified(true);
                      setVerifyingPlatform(null);
                    }}
                    disabled={verifyingPlatform === "instagram"}
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-[#c1121f] text-white hover:bg-[#a50e1a] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {verifyingPlatform === "instagram" ? "Verifying..." : "Verify Bio Code"}
                  </button>
                )}
              </div>

              {/* YouTube Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs">
                <span className="font-bold text-neutral-800">
                  YouTube ({youtubeChannel || "Channel"})
                </span>
                {isYoutubeBioVerified ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Verified Owner
                  </span>
                ) : (
                  <button
                    onClick={async () => {
                      setVerifyingPlatform("youtube");
                      await fetch("/api/social/verify-bio", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          platform: "youtube",
                          handle: youtubeChannel,
                          verificationCode: "FLENZR-419",
                        }),
                      });
                      setIsYoutubeBioVerified(true);
                      setVerifyingPlatform(null);
                    }}
                    disabled={verifyingPlatform === "youtube"}
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-[#c1121f] text-white hover:bg-[#a50e1a] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {verifyingPlatform === "youtube" ? "Verifying..." : "Verify Description Code"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-200/60 leading-relaxed">
            💡 <strong>Verification Tip:</strong> Once your profile is verified, you can remove the temporary verification code from your bio, <strong>or keep your link <code>flenzr.com/@{creatorHandle}</code> in your social bio</strong> so brands can book your published rate cards directly without DM haggling.
          </p>
        </div>

        {/* Dashboard Tabs */}
        <div className="flex border-b border-neutral-200 gap-2">
          <button
            onClick={() => setActiveTab("ratecards")}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "ratecards"
                ? "border-[#c1121f] text-black font-bold"
                : "border-transparent text-neutral-500 hover:text-black"
            }`}
          >
            <DollarSign className="w-4 h-4 text-[#c1121f]" />
            <span>Rate Cards ({rateCards.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("links")}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "links"
                ? "border-[#c1121f] text-black font-bold"
                : "border-transparent text-neutral-500 hover:text-black"
            }`}
          >
            <Link2 className="w-4 h-4 text-[#c1121f]" />
            <span>Tracked Links ({trackedLinks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("qr")}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "qr"
                ? "border-[#c1121f] text-black font-bold"
                : "border-transparent text-neutral-500 hover:text-black"
            }`}
          >
            <QrCode className="w-4 h-4 text-[#c1121f]" />
            <span>QR Studio</span>
          </button>
        </div>

        {/* TAB 1: RATE CARDS */}
        {activeTab === "ratecards" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-black">Deliverable Pricing Packages</h2>
                <p className="text-xs text-neutral-500">
                  These packages appear on your public media kit and in brand discovery.
                </p>
              </div>
              <button
                onClick={() => setShowAddRateCard(!showAddRateCard)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#c1121f] hover:bg-[#a50e1a] text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#c1121f]/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Rate Card</span>
              </button>
            </div>

            {/* Add Rate Card Form Drawer */}
            {showAddRateCard && (
              <form
                onSubmit={handleAddRateCard}
                className="bg-white border border-[#c1121f]/40 rounded-2xl p-6 space-y-4 shadow-xl"
              >
                <h3 className="text-sm font-bold text-black">Create New Rate Card Offering</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block text-neutral-600 mb-1 font-medium">Platform</label>
                    <select
                      value={newPlatform}
                      onChange={(e) => setNewPlatform(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-black focus:outline-none focus:border-[#c1121f]"
                    >
                      <option>YouTube</option>
                      <option>Instagram</option>
                      <option>TikTok</option>
                      <option>Podcast</option>
                      <option>Newsletter</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-neutral-600 mb-1 font-medium">Deliverable Type</label>
                    <input
                      type="text"
                      value={newDeliverable}
                      onChange={(e) => setNewDeliverable(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-black focus:outline-none focus:border-[#c1121f]"
                      placeholder="e.g. Dedicated Video"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-600 mb-1 font-medium">Price (INR ₹)</label>
                    <input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-black focus:outline-none focus:border-[#c1121f]"
                      placeholder="25000"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-600 mb-1 font-medium">Turnaround Days</label>
                    <input
                      type="number"
                      value={newTurnaround}
                      onChange={(e) => setNewTurnaround(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-black focus:outline-none focus:border-[#c1121f]"
                      placeholder="7"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-neutral-600 text-xs mb-1 font-medium">Package Title & Details</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-xs text-black focus:outline-none focus:border-[#c1121f]"
                    placeholder="e.g. 60-second product integration with custom call-to-action"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddRateCard(false)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-neutral-100 text-black hover:bg-neutral-200 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#c1121f] text-white hover:bg-[#a50e1a]"
                  >
                    Publish Package
                  </button>
                </div>
              </form>
            )}

            {/* Rate Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {rateCards.map((card) => (
                <div
                  key={card.id}
                  className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col justify-between hover:border-[#c1121f]/50 hover:shadow-md transition-all shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#c1121f]/10 text-[#c1121f] border border-[#c1121f]/20">
                        {card.platform} • {card.deliverable_type}
                      </span>
                      <span className="text-xs text-neutral-500 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-[#c1121f]" />
                        {card.turnaround_days}d
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-black leading-snug">{card.title}</h3>
                  </div>

                  <div className="mt-6 pt-4 border-t border-neutral-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 block font-medium">Base Price</span>
                      <span className="text-lg font-extrabold text-black">
                        ₹{card.price_dollars.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <button
                      onClick={() => setRateCards(rateCards.filter((c) => c.id !== card.id))}
                      className="text-neutral-400 hover:text-[#c1121f] transition-colors p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 2: TRACKED LINKS */}
        {activeTab === "links" && (
          <section className="space-y-6">
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-black mb-4">Create New Short Tracked Link</h3>
              <form onSubmit={handleAddLink} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Link Title</label>
                  <input
                    type="text"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    placeholder="e.g. Sony FX3 Camera"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-black focus:outline-none focus:border-[#c1121f]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Destination URL</label>
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://brand.com/affiliate-link"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-black focus:outline-none focus:border-[#c1121f]"
                    required
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-neutral-600 mb-1 font-medium">Custom Slug (optional)</label>
                    <input
                      type="text"
                      value={newLinkCode}
                      onChange={(e) => setNewLinkCode(e.target.value)}
                      placeholder="fx3-deal"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-black focus:outline-none focus:border-[#c1121f]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#c1121f] text-white font-bold rounded-lg hover:bg-[#a50e1a] cursor-pointer h-[34px] shadow-sm"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>

            {/* Links Table */}
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-neutral-200 font-bold text-sm text-black">
                Active Smart Links
              </div>
              <div className="divide-y divide-neutral-200">
                {trackedLinks.map((link) => (
                  <div key={link.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-black">{link.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span className="font-mono text-[#c1121f] font-semibold">/r/{link.short_code}</span>
                        <span>•</span>
                        <span className="truncate max-w-xs">{link.destination}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="block text-base font-bold text-black">{link.clicks}</span>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Clicks</span>
                      </div>

                      <button
                        onClick={() => handleCopy(link.short_code)}
                        className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-black text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                      >
                        {copiedCode === link.short_code ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#c1121f]" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: QR STUDIO */}
        {activeTab === "qr" && (
          <section className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="max-w-xl mx-auto text-center space-y-6">
              <div>
                <h3 className="text-lg font-bold text-black">Dynamic Profile & Link QR Generator</h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Download high-resolution vector QR codes for your offline business cards, packaging, or event badges.
                </p>
              </div>

              {/* QR Preview Box */}
              <div className="w-56 h-56 mx-auto rounded-2xl bg-white p-4 shadow-md flex items-center justify-center border-4 border-neutral-200">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=http://localhost:8000/sarahmiller&color=${qrColor.replace('#', '')}&bgcolor=ffffff`}
                  alt="Dynamic QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Color Selector */}
              <div className="flex items-center justify-center gap-3">
                <span className="text-xs text-neutral-500 font-medium">Brand Accent:</span>
                {[
                  { name: "Crimson", hex: "#c1121f" },
                  { name: "Black", hex: "#000000" },
                  { name: "White", hex: "#ffffff" },
                ].map((c) => (
                  <button
                    key={c.hex}
                    title={c.name}
                    onClick={() => setQrColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                      qrColor === c.hex ? "scale-125 border-black ring-2 ring-[#c1121f]/50" : "border-neutral-300"
                    }`}
                  />
                ))}
              </div>

              <div className="pt-2">
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=http://localhost:8000/sarahmiller&color=${qrColor.replace('#', '')}&bgcolor=ffffff`}
                  download="flenzr-qr.png"
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-2.5 rounded-xl bg-[#c1121f] hover:bg-[#a50e1a] text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-md shadow-[#c1121f]/20"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Download Print-Ready PNG</span>
                </a>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
