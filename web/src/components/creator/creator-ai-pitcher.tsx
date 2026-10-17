"use client";

import { useState } from "react";
import {
  Wand2,
  DollarSign,
  Sparkles,
  Copy,
  Check,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Bot,
  RefreshCw,
} from "lucide-react";

interface CreatorAiPitcherProps {
  initialBrand?: string;
  initialOffer?: string;
  creatorHandle?: string;
}

export function CreatorAiPitcher({
  initialBrand = "Dyson India",
  initialOffer = "₹35,000",
  creatorHandle = "subu_creates",
}: CreatorAiPitcherProps) {
  const [brand, setBrand] = useState(initialBrand);
  const [deliverables, setDeliverables] = useState("1 Dedicated 4K YouTube Video + 2 Instagram Reels");
  const [initialBudget, setInitialBudget] = useState(initialOffer);
  const [exclusivity, setExclusivity] = useState("30d");
  const [whitelisting, setWhitelisting] = useState("organic");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);

  const [result, setResult] = useState<{
    minRate: string;
    targetRate: string;
    maxRate: string;
    lowballPercentage: number;
    rationale: string[];
    pitchEmail: string;
  }>({
    minRate: "₹92,000",
    targetRate: "₹1,05,000",
    maxRate: "₹1,20,000",
    lowballPercentage: 66,
    rationale: [
      "Verified Median Views: 850,000 on YouTube (Tech Industry Avg: 180,000).",
      "Aspect Trust Score 86/100 puts you in the Top 1% tier of Indian tech creators.",
      "Commercial CTR: 4.8% — delivers 2.6x higher conversion than standard category CPMs.",
      "Includes 30-day category exclusivity blocking competing brands.",
    ],
    pitchEmail: `Hi Dyson Partnerships Team,

Thank you for reaching out regarding the Phone / Tech campaign!

Given the scope (1 Dedicated 4K Video + 2 Reels) along with 30-day category exclusivity, our standard package rate is ₹1,05,000. 

For reference, our recent Sony FX3 campaign achieved 850,000 verified views with an industry-leading 4.2% CTR and ₹14.2L in attributed sales. Our audience is heavily concentrated in high-intent tech buyers (78% male, 25-34 demographic in metros).

To make the workflow seamless and protect your campaign budget, all collaborations are secured via Flenzr Vault: funds remain protected in Vault and are only released upon your final milestone review and approval.

You can inspect our live, API-verified metrics and lock in the dates here:
https://flenzr.com/@${creatorHandle}

Looking forward to creating something outstanding for Dyson!

Best regards,
Subramanya Shenoy`,
  });

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      const parsedOffer = Number(initialBudget.replace(/[^0-9]/g, "")) || 40000;
      const targetVal = Math.max(parsedOffer * 2.5, 95000);
      const minVal = Math.round(targetVal * 0.88);
      const maxVal = Math.round(targetVal * 1.15);

      setResult({
        minRate: `₹${minVal.toLocaleString("en-IN")}`,
        targetRate: `₹${targetVal.toLocaleString("en-IN")}`,
        maxRate: `₹${maxVal.toLocaleString("en-IN")}`,
        lowballPercentage: Math.min(Math.round(((targetVal - parsedOffer) / targetVal) * 100), 75),
        rationale: [
          `Verified 850K median YouTube views justifies premium ${brand} tech positioning.`,
          `Flenzr Aspect Score of 86 signals 91% sponsor re-hire rate & zero chargebacks.`,
          `Exclusivity lock blocks competitor promotions during your primary sales window.`,
        ],
        pitchEmail: `Hi ${brand} Partnerships Team,

Thank you for reaching out regarding the campaign collaboration!

Given the deliverable scope (${deliverables}), our verified media package rate is ₹${targetVal.toLocaleString(
          "en-IN"
        )}.

Our tech audience averages 850K organic views with a verified 4.8% commercial click-through rate, delivering high-intent conversions for hardware sponsors.

All campaigns on our channel are backed by Flenzr Vault Protection: your budget remains securely held in Vault until you inspect and approve the final content draft.

You can review our live cross-platform metrics and book directly via our verified media kit:
https://flenzr.com/@${creatorHandle}

Best regards,
Subramanya Shenoy`,
      });
    }, 900);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result.pitchEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121215] border border-[#27272a] shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              AI Deal Negotiator &amp; Rate Estimator
            </h2>
          </div>
          <p className="text-xs text-[#8c94a6] mt-0.5">
            Calculate your true fair market value backed by verified Aspect ratings. Generate assertively polite counter-offers with Flenzr Vault protection.
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-white/10 text-white text-xs font-bold border border-white/20 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Flenzr AI Model</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Deal Input Form (Left 5 Cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Bot className="w-4 h-4 text-neutral-300" />
            <span>Brand Offer Details</span>
          </h3>

          <form onSubmit={handleAnalyze} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[#8c94a6] mb-1 font-medium">Brand or Agency Name</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Dyson India"
                required
                className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2.5 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
              />
            </div>

            <div>
              <label className="block text-[#8c94a6] mb-1 font-medium">Deliverables Scope</label>
              <input
                type="text"
                value={deliverables}
                onChange={(e) => setDeliverables(e.target.value)}
                placeholder="e.g. 1 Dedicated Video + 1 60s Reel"
                required
                className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2.5 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
              />
            </div>

            <div>
              <label className="block text-[#8c94a6] mb-1 font-medium">Brand's Initial Proposed Budget</label>
              <input
                type="text"
                value={initialBudget}
                onChange={(e) => setInitialBudget(e.target.value)}
                placeholder="e.g. ₹35,000"
                required
                className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2.5 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#8c94a6] mb-1 font-medium">Exclusivity</label>
                <select
                  value={exclusivity}
                  onChange={(e) => setExclusivity(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2.5 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                >
                  <option value="none">None</option>
                  <option value="30d">30 Days (+25%)</option>
                  <option value="60d">60 Days (+50%)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#8c94a6] mb-1 font-medium">Usage Rights</label>
                <select
                  value={whitelisting}
                  onChange={(e) => setWhitelisting(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2.5 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                >
                  <option value="organic">Organic Social</option>
                  <option value="whitelisting">Paid Whitelisting (+50%)</option>
                  <option value="perpetual">Perpetual UGC (+100%)</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isAnalyzing}
                className="w-full h-10 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <span className="inline-flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Calculating Market Benchmark...
                  </span>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Calculate Fair Rate &amp; Counter-Offer</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* AI Valuation & Counter Pitch Output (Right 7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Rate Valuation Card */}
          <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#8c94a6] uppercase font-bold tracking-wider block">
                  Fair Market Valuation
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {result.targetRate}
                  </span>
                  <span className="text-xs text-[#8c94a6]">
                    (Range: {result.minRate} – {result.maxRate})
                  </span>
                </div>
              </div>

              {result.lowballPercentage > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold border border-amber-500/20">
                  Initial offer was {result.lowballPercentage}% below market
                </span>
              )}
            </div>

            {/* Rationale Pills */}
            <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] space-y-1.5 text-xs">
              <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Valuation Factors</span>
              </div>
              <ul className="space-y-1 text-[#a1a1aa] text-[11px]">
                {result.rationale.map((r, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-white">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 1-Click Counter Pitch Email */}
          <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <span>AI Generated Counter-Offer Pitch</span>
              </h4>

              <button
                type="button"
                onClick={handleCopy}
                className="h-8 px-3 rounded-lg bg-white text-black font-bold text-xs flex items-center gap-1.5 hover:bg-neutral-200 transition-colors cursor-pointer shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Pitch Script</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#09090b] border border-[#27272a] text-xs font-mono text-[#d4d4d8] whitespace-pre-line leading-relaxed max-h-[300px] overflow-y-auto select-all">
              {result.pitchEmail}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
