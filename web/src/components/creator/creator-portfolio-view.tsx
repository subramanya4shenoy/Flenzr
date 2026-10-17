"use client";

import { useState } from "react";
import {
  Award,
  Plus,
  Eye,
  TrendingUp,
  ShieldCheck,
  ExternalLink,
  Star,
  Quote,
  X,
  CheckCircle2,
} from "lucide-react";

export interface CaseStudy {
  id: string;
  brand: string;
  deliverable: string;
  views: string;
  ctr: string;
  revenueEst: string;
  quote: string;
  author: string;
  role: string;
  tags: string[];
}

const INITIAL_CASE_STUDIES: CaseStudy[] = [
  {
    id: "cs-1",
    brand: "Sony India",
    deliverable: "60s Cinematic FX3 Reel",
    views: "850K Views",
    ctr: "4.2% CTR",
    revenueEst: "₹14.2L Attributed",
    quote: "Subu delivered our highest-converting camera campaign of Q3. Flawless production quality and zero friction with Flenzr Vault.",
    author: "Ananya Sen",
    role: "Senior Marketing Manager, Sony India",
    tags: ["Cinematic", "Camera Tech", "Vault Verified"],
  },
  {
    id: "cs-2",
    brand: "Keychron",
    deliverable: "Dedicated 4K Review",
    views: "420K Views",
    ctr: "6.8% CTR",
    revenueEst: "480+ Units Sold",
    quote: "Exceptional production quality. His audience is exactly the high-intent developers and mechanical keyboard enthusiasts we target.",
    author: "David Chen",
    role: "Global Partnerships, Keychron",
    tags: ["Hardware", "High Conversion", "Vault Verified"],
  },
  {
    id: "cs-3",
    brand: "BoAt Lifestyle",
    deliverable: "Nirvana ANC Commute Reel",
    views: "1.2M Views",
    ctr: "3.9% CTR",
    revenueEst: "28,400 Clicks",
    quote: "Authentic audio benchmark without sounding like a generic sponsor read. Delivered in 4 days ahead of scheduled deadline.",
    author: "Rahul Mehta",
    role: "Lead Creator Growth, BoAt",
    tags: ["Audio", "1M+ Reach", "Vault Verified"],
  },
];

export function CreatorPortfolioView() {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>(INITIAL_CASE_STUDIES);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [brand, setBrand] = useState("");
  const [deliverable, setDeliverable] = useState("");
  const [views, setViews] = useState("");
  const [ctr, setCtr] = useState("");
  const [revenueEst, setRevenueEst] = useState("");
  const [quote, setQuote] = useState("");
  const [author, setAuthor] = useState("");
  const [role, setRole] = useState("");

  const handleAddCaseStudy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand || !quote) return;
    const newCase: CaseStudy = {
      id: `cs-${Date.now()}`,
      brand,
      deliverable: deliverable || "Sponsored Deliverable",
      views: views ? `${views} Views` : "500K Views",
      ctr: ctr ? `${ctr} CTR` : "4.0% CTR",
      revenueEst: revenueEst || "High Attributed ROI",
      quote,
      author: author || "Brand Partnership Lead",
      role: role || `${brand} Marketing`,
      tags: ["Verified Sponsor", "Vault Verified"],
    };
    setCaseStudies([newCase, ...caseStudies]);
    setShowAddModal(false);
    setBrand("");
    setDeliverable("");
    setViews("");
    setCtr("");
    setRevenueEst("");
    setQuote("");
    setAuthor("");
    setRole("");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121215] border border-[#27272a] shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Brand Portfolio &amp; Case Studies
            </h2>
          </div>
          <p className="text-xs text-[#8c94a6] mt-0.5">
            Verified proof-of-performance from past brand collaborations. Displayed to prospective sponsors to justify premium rates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="h-9 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Case Study</span>
        </button>
      </div>

      {/* Case Studies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {caseStudies.map((cs) => (
          <div
            key={cs.id}
            className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] hover:border-neutral-600 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">{cs.brand}</h3>
                  <p className="text-[11px] text-[#8c94a6]">{cs.deliverable}</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>Verified</span>
                </span>
              </div>

              {/* Verified Metrics Row */}
              <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-[#18181b] border border-[#27272a] text-center text-xs">
                <div>
                  <div className="font-bold text-white">{cs.views}</div>
                  <div className="text-[9px] text-[#71717a]">Reach</div>
                </div>
                <div>
                  <div className="font-bold text-white">{cs.ctr}</div>
                  <div className="text-[9px] text-[#71717a]">Engagement</div>
                </div>
                <div>
                  <div className="font-bold text-emerald-400">{cs.revenueEst}</div>
                  <div className="text-[9px] text-[#71717a]">Impact</div>
                </div>
              </div>

              {/* Client Quote */}
              <div className="p-3 rounded-xl bg-[#18181b]/50 border border-dashed border-[#27272a] space-y-2 relative">
                <Quote className="w-4 h-4 text-[#71717a] opacity-40" />
                <p className="text-[11px] text-[#d4d4d8] italic leading-relaxed">
                  "{cs.quote}"
                </p>
                <div className="pt-1 border-t border-[#27272a]/60">
                  <div className="text-[10px] font-bold text-white">{cs.author}</div>
                  <div className="text-[9px] text-[#71717a]">{cs.role}</div>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#27272a]">
              {cs.tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded bg-white/10 text-white text-[9px] font-bold border border-white/20"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#121215] border border-[#27272a] shadow-2xl p-6 space-y-4 text-white">
            <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
              <h3 className="text-base font-bold text-white">Add Past Collab Case Study</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-[#18181b] flex items-center justify-center text-[#8c94a6] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCaseStudy} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8c94a6] mb-1 font-medium">Brand Name</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Asus ROG"
                    required
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2.5 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[#8c94a6] mb-1 font-medium">Deliverable</label>
                  <input
                    type="text"
                    value={deliverable}
                    onChange={(e) => setDeliverable(e.target.value)}
                    placeholder="e.g. 60s Reel"
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2.5 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[#8c94a6] mb-1 font-medium">Views</label>
                  <input
                    type="text"
                    value={views}
                    onChange={(e) => setViews(e.target.value)}
                    placeholder="650K"
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[#8c94a6] mb-1 font-medium">CTR</label>
                  <input
                    type="text"
                    value={ctr}
                    onChange={(e) => setCtr(e.target.value)}
                    placeholder="5.1%"
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[#8c94a6] mb-1 font-medium">Impact/Sales</label>
                  <input
                    type="text"
                    value={revenueEst}
                    onChange={(e) => setRevenueEst(e.target.value)}
                    placeholder="₹8.5L Sales"
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#8c94a6] mb-1 font-medium">Client Testimonial Quote</label>
                <textarea
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  rows={3}
                  placeholder="What did the brand say about your delivery and ROI?"
                  required
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2.5 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8c94a6] mb-1 font-medium">Brand Contact Person</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[#8c94a6] mb-1 font-medium">Designation</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Head of Influencer Marketing"
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[#8c94a6] hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-white text-black font-bold hover:bg-neutral-200 shadow-sm"
                >
                  Save Case Study
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
