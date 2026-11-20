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

const INITIAL_CASE_STUDIES: CaseStudy[] = [];

export function CreatorPortfolioView() {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("flenzr_creator_case_studies");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });
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
      views: views ? `${views} Views` : "Views not provided",
      ctr: ctr ? `${ctr} CTR` : "CTR not provided",
      revenueEst: revenueEst || "Impact not provided",
      quote,
      author: author || "Author not provided",
      role: role || "Role not provided",
      tags: [],
    };
    const updated = [newCase, ...caseStudies];
    setCaseStudies(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("flenzr_creator_case_studies", JSON.stringify(updated));
    }
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="theme-on-accent w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold text-[color:var(--ui-ink-ffffff)] tracking-tight">
              Brand Portfolio &amp; Case Studies
            </h2>
          </div>
          <p className="text-xs text-[color:var(--ui-ink-8c94a6)] mt-0.5">
            Case studies from past brand collaborations. Displayed to prospective sponsors to justify premium rates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="h-9 px-4 rounded-xl bg-[color:var(--ui-paint-ffffff)] hover:bg-[color:var(--ui-paint-neutral-200)] text-[color:var(--ui-ink-000000)] font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Case Study</span>
        </button>
      </div>

      {/* Case Studies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {caseStudies.length === 0 ? (
          <div className="col-span-full p-8 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-dashed border-[color:var(--ui-line-27272a)] text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[color:var(--ui-paint-ffffff)]/[0.05] border border-[color:var(--ui-line-ffffff)]/10 flex items-center justify-center mx-auto text-[color:var(--ui-ink-neutral-400)]">
              <Award className="w-6 h-6 text-[color:var(--ui-ink-neutral-400)]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-[color:var(--ui-ink-ffffff)]">No Case Studies Published Yet</h4>
              <p className="text-xs text-[color:var(--ui-ink-7e8697)] max-w-md mx-auto">
                Showcase verified reach, CTR, and sponsor testimonials to prospective brands. Case studies are automatically featured on your public media kit.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="h-9 px-4 rounded-xl bg-[color:var(--ui-paint-ffffff)] hover:bg-[color:var(--ui-paint-neutral-200)] text-[color:var(--ui-ink-000000)] font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First Case Study</span>
            </button>
          </div>
        ) : (
          caseStudies.map((cs) => (
          <div
            key={cs.id}
            className="p-5 rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] hover:border-[color:var(--ui-line-neutral-600)] transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[color:var(--ui-ink-ffffff)]">{cs.brand}</h3>
                  <p className="text-[11px] text-[color:var(--ui-ink-8c94a6)]">{cs.deliverable}</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-[color:var(--ui-ink-emerald-400)] text-[9px] font-bold border border-[color:var(--ui-line-emerald-500)]/20 flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>Creator provided</span>
                </span>
              </div>

              {/* Verified Metrics Row */}
              <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)] text-center text-xs">
                <div>
                  <div className="font-bold text-[color:var(--ui-ink-ffffff)]">{cs.views}</div>
                  <div className="text-[9px] text-[color:var(--ui-ink-71717a)]">Reach</div>
                </div>
                <div>
                  <div className="font-bold text-[color:var(--ui-ink-ffffff)]">{cs.ctr}</div>
                  <div className="text-[9px] text-[color:var(--ui-ink-71717a)]">Engagement</div>
                </div>
                <div>
                  <div className="font-bold text-[color:var(--ui-ink-emerald-400)]">{cs.revenueEst}</div>
                  <div className="text-[9px] text-[color:var(--ui-ink-71717a)]">Impact</div>
                </div>
              </div>

              {/* Client Quote */}
              <div className="p-3 rounded-xl bg-[color:var(--ui-paint-18181b)]/50 border border-dashed border-[color:var(--ui-line-27272a)] space-y-2 relative">
                <Quote className="w-4 h-4 text-[color:var(--ui-ink-71717a)] opacity-40" />
                <p className="text-[11px] text-[color:var(--ui-ink-d4d4d8)] italic leading-relaxed">
                  "{cs.quote}"
                </p>
                <div className="pt-1 border-t border-[color:var(--ui-line-27272a)]/60">
                  <div className="text-[10px] font-bold text-[color:var(--ui-ink-ffffff)]">{cs.author}</div>
                  <div className="text-[9px] text-[color:var(--ui-ink-71717a)]">{cs.role}</div>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[color:var(--ui-line-27272a)]">
              {cs.tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded bg-[color:var(--ui-paint-ffffff)]/10 text-[color:var(--ui-ink-ffffff)] text-[9px] font-bold border border-[color:var(--ui-line-ffffff)]/20"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))
      )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-27272a)] shadow-2xl p-6 space-y-4 text-[color:var(--ui-ink-ffffff)]">
            <div className="flex items-center justify-between pb-2 border-b border-[color:var(--ui-line-27272a)]">
              <h3 className="text-base font-bold text-[color:var(--ui-ink-ffffff)]">Add Past Collab Case Study</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-[color:var(--ui-paint-18181b)] flex items-center justify-center text-[color:var(--ui-ink-8c94a6)] hover:text-[color:var(--ui-ink-ffffff)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCaseStudy} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[color:var(--ui-ink-8c94a6)] mb-1 font-medium">Brand Name</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Asus ROG"
                    required
                    className="w-full bg-[color:var(--ui-paint-09090b)] border border-[color:var(--ui-line-27272a)] rounded-lg p-2.5 text-[color:var(--ui-ink-ffffff)] focus:outline-hidden focus:border-[color:var(--ui-line-ffffff)] focus:ring-1 focus:ring-[color:var(--ui-line-ffffff)]/30"
                  />
                </div>
                <div>
                  <label className="block text-[color:var(--ui-ink-8c94a6)] mb-1 font-medium">Deliverable</label>
                  <input
                    type="text"
                    value={deliverable}
                    onChange={(e) => setDeliverable(e.target.value)}
                    placeholder="e.g. 60s Reel"
                    className="w-full bg-[color:var(--ui-paint-09090b)] border border-[color:var(--ui-line-27272a)] rounded-lg p-2.5 text-[color:var(--ui-ink-ffffff)] focus:outline-hidden focus:border-[color:var(--ui-line-ffffff)] focus:ring-1 focus:ring-[color:var(--ui-line-ffffff)]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[color:var(--ui-ink-8c94a6)] mb-1 font-medium">Views</label>
                  <input
                    type="text"
                    value={views}
                    onChange={(e) => setViews(e.target.value)}
                    placeholder="650K"
                    className="w-full bg-[color:var(--ui-paint-09090b)] border border-[color:var(--ui-line-27272a)] rounded-lg p-2 text-[color:var(--ui-ink-ffffff)] focus:outline-hidden focus:border-[color:var(--ui-line-ffffff)] focus:ring-1 focus:ring-[color:var(--ui-line-ffffff)]/30"
                  />
                </div>
                <div>
                  <label className="block text-[color:var(--ui-ink-8c94a6)] mb-1 font-medium">CTR</label>
                  <input
                    type="text"
                    value={ctr}
                    onChange={(e) => setCtr(e.target.value)}
                    placeholder="5.1%"
                    className="w-full bg-[color:var(--ui-paint-09090b)] border border-[color:var(--ui-line-27272a)] rounded-lg p-2 text-[color:var(--ui-ink-ffffff)] focus:outline-hidden focus:border-[color:var(--ui-line-ffffff)] focus:ring-1 focus:ring-[color:var(--ui-line-ffffff)]/30"
                  />
                </div>
                <div>
                  <label className="block text-[color:var(--ui-ink-8c94a6)] mb-1 font-medium">Impact/Sales</label>
                  <input
                    type="text"
                    value={revenueEst}
                    onChange={(e) => setRevenueEst(e.target.value)}
                    placeholder="₹8.5L Sales"
                    className="w-full bg-[color:var(--ui-paint-09090b)] border border-[color:var(--ui-line-27272a)] rounded-lg p-2 text-[color:var(--ui-ink-ffffff)] focus:outline-hidden focus:border-[color:var(--ui-line-ffffff)] focus:ring-1 focus:ring-[color:var(--ui-line-ffffff)]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[color:var(--ui-ink-8c94a6)] mb-1 font-medium">Client Testimonial Quote</label>
                <textarea
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  rows={3}
                  placeholder="What did the brand say about your delivery and ROI?"
                  required
                  className="w-full bg-[color:var(--ui-paint-09090b)] border border-[color:var(--ui-line-27272a)] rounded-lg p-2.5 text-[color:var(--ui-ink-ffffff)] focus:outline-hidden focus:border-[color:var(--ui-line-ffffff)] focus:ring-1 focus:ring-[color:var(--ui-line-ffffff)]/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[color:var(--ui-ink-8c94a6)] mb-1 font-medium">Brand Contact Person</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full bg-[color:var(--ui-paint-09090b)] border border-[color:var(--ui-line-27272a)] rounded-lg p-2 text-[color:var(--ui-ink-ffffff)] focus:outline-hidden focus:border-[color:var(--ui-line-ffffff)] focus:ring-1 focus:ring-[color:var(--ui-line-ffffff)]/30"
                  />
                </div>
                <div>
                  <label className="block text-[color:var(--ui-ink-8c94a6)] mb-1 font-medium">Designation</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Head of Influencer Marketing"
                    className="w-full bg-[color:var(--ui-paint-09090b)] border border-[color:var(--ui-line-27272a)] rounded-lg p-2 text-[color:var(--ui-ink-ffffff)] focus:outline-hidden focus:border-[color:var(--ui-line-ffffff)] focus:ring-1 focus:ring-[color:var(--ui-line-ffffff)]/30"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[color:var(--ui-line-27272a)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-[color:var(--ui-paint-18181b)] border border-[color:var(--ui-line-27272a)] text-[color:var(--ui-ink-8c94a6)] hover:text-[color:var(--ui-ink-ffffff)] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[color:var(--ui-paint-ffffff)] text-[color:var(--ui-ink-000000)] font-bold hover:bg-[color:var(--ui-paint-neutral-200)] shadow-sm"
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
