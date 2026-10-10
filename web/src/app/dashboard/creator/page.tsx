"use client";

import { useState } from "react";
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

  // Rate Cards state
  const [rateCards, setRateCards] = useState<RateCardItem[]>([
    {
      id: "rc-1",
      platform: "YouTube",
      deliverable_type: "Dedicated Video",
      title: "Full 8-10 Min Dedicated Product Review & Tutorial",
      price_dollars: 2500,
      turnaround_days: 14,
    },
    {
      id: "rc-2",
      platform: "Instagram",
      deliverable_type: "Reel / Shorts",
      title: "60-Second Dynamic Product Reel with Bio Link",
      price_dollars: 1200,
      turnaround_days: 5,
    },
    {
      id: "rc-3",
      platform: "Podcast",
      deliverable_type: "Pre-Roll Ad Read",
      title: "60-Second Host Read Sponsorship + Show Notes",
      price_dollars: 850,
      turnaround_days: 7,
    },
  ]);

  // Form for new rate card
  const [newPlatform, setNewPlatform] = useState("YouTube");
  const [newDeliverable, setNewDeliverable] = useState("Integrated Sponsorship");
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("1500");
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
  const [qrColor, setQrColor] = useState("#10b981");

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
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950">
                F
              </div>
              <span className="font-extrabold text-white tracking-tight">FLENZR</span>
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
              Creator Studio
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <Link
              href="/sarahmiller"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 font-semibold transition-colors"
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md shadow-emerald-500/10">
              <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center text-2xl font-bold text-emerald-400">
                S
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">Sarah Miller</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  VERIFIED
                </span>
              </div>
              <p className="text-xs text-slate-400">@sarahmiller • Tech Reviewer & Lifestyle Creator</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-center">
            <div>
              <span className="block text-xl font-extrabold text-white">{rateCards.length}</span>
              <span className="text-xs text-slate-400">Rate Cards</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <span className="block text-xl font-extrabold text-emerald-400">
                {trackedLinks.reduce((acc, l) => acc + l.clicks, 0).toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">Total Clicks</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <span className="block text-xl font-extrabold text-amber-300">5.0 ★</span>
              <span className="text-xs text-slate-400">Brand Rating</span>
            </div>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab("ratecards")}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "ratecards"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Rate Cards ({rateCards.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("links")}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "links"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Tracked Links ({trackedLinks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("qr")}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "qr"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Studio</span>
          </button>
        </div>

        {/* TAB 1: RATE CARDS */}
        {activeTab === "ratecards" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Deliverable Pricing Packages</h2>
                <p className="text-xs text-slate-400">
                  These packages appear on your public media kit and in brand discovery.
                </p>
              </div>
              <button
                onClick={() => setShowAddRateCard(!showAddRateCard)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Rate Card</span>
              </button>
            </div>

            {/* Add Rate Card Form Modal/Drawer */}
            {showAddRateCard && (
              <form
                onSubmit={handleAddRateCard}
                className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 space-y-4 shadow-xl"
              >
                <h3 className="text-sm font-bold text-white">Create New Rate Card Offering</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Platform</label>
                    <select
                      value={newPlatform}
                      onChange={(e) => setNewPlatform(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    >
                      <option>YouTube</option>
                      <option>Instagram</option>
                      <option>TikTok</option>
                      <option>Podcast</option>
                      <option>Newsletter</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Deliverable Type</label>
                    <input
                      type="text"
                      value={newDeliverable}
                      onChange={(e) => setNewDeliverable(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      placeholder="e.g. Dedicated Video"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Price (USD)</label>
                    <input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      placeholder="1500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Turnaround Days</label>
                    <input
                      type="number"
                      value={newTurnaround}
                      onChange={(e) => setNewTurnaround(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      placeholder="7"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Package Title & Details</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    placeholder="e.g. 60-second product integration with custom call-to-action"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddRateCard(false)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400"
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
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {card.platform} • {card.deliverable_type}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {card.turnaround_days}d
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white leading-snug">{card.title}</h3>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Base Price</span>
                      <span className="text-lg font-extrabold text-white">
                        ${card.price_dollars.toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => setRateCards(rateCards.filter((c) => c.id !== card.id))}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-4">Create New Short Tracked Link</h3>
              <form onSubmit={handleAddLink} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Link Title</label>
                  <input
                    type="text"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    placeholder="e.g. Sony FX3 Camera"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Destination URL</label>
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://brand.com/affiliate-link"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    required
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-slate-400 mb-1">Custom Slug (optional)</label>
                    <input
                      type="text"
                      value={newLinkCode}
                      onChange={(e) => setNewLinkCode(e.target.value)}
                      placeholder="fx3-deal"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-lg hover:bg-emerald-400 cursor-pointer h-[34px]"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>

            {/* Links Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 font-bold text-sm text-white">
                Active Smart Links
              </div>
              <div className="divide-y divide-slate-800">
                {trackedLinks.map((link) => (
                  <div key={link.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-white">{link.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono text-emerald-400">/r/{link.short_code}</span>
                        <span>•</span>
                        <span className="truncate max-w-xs">{link.destination}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="block text-base font-bold text-white">{link.clicks}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Clicks</span>
                      </div>

                      <button
                        onClick={() => handleCopy(link.short_code)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedCode === link.short_code ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
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
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div className="max-w-xl mx-auto text-center space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Dynamic Profile & Link QR Generator</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Download high-resolution vector QR codes for your offline business cards, packaging, or event badges.
                </p>
              </div>

              {/* QR Preview Box */}
              <div className="w-56 h-56 mx-auto rounded-2xl bg-white p-4 shadow-xl flex items-center justify-center border-4 border-slate-800">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=http://localhost:8000/sarahmiller&color=${qrColor.replace('#', '')}`}
                  alt="Dynamic QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Color Selector */}
              <div className="flex items-center justify-center gap-3">
                <span className="text-xs text-slate-400">Accent Color:</span>
                {["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b", "#0f172a"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setQrColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      qrColor === c ? "scale-125 border-white" : "border-transparent"
                    }`}
                  />
                ))}
              </div>

              <div className="pt-2">
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=http://localhost:8000/sarahmiller&color=${qrColor.replace('#', '')}`}
                  download="flenzr-qr.png"
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2"
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
