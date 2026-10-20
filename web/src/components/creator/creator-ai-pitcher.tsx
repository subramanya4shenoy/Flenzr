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
  initialBrand = "",
  initialOffer = "",
  creatorHandle = "",
}: CreatorAiPitcherProps) {
  const [brand, setBrand] = useState(initialBrand);
  const [deliverables, setDeliverables] = useState("");
  const [initialBudget, setInitialBudget] = useState(initialOffer);
  const [exclusivity, setExclusivity] = useState("none");
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
  } | null>(null);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim() || Number(initialBudget.replace(/[^0-9]/g, "")) <= 0) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      const parsedOffer = Number(initialBudget.replace(/[^0-9]/g, ""));
      let multiplier = 1.8;
      if (exclusivity === "30d") multiplier += 0.25;
      if (exclusivity === "60d") multiplier += 0.5;
      if (whitelisting === "whitelisting") multiplier += 0.5;
      if (whitelisting === "perpetual") multiplier += 1.0;

      const targetVal = Math.round(parsedOffer * multiplier);
      const minVal = Math.round(targetVal * 0.85);
      const maxVal = Math.round(targetVal * 1.2);
      const lowballPct = Math.min(Math.round(((targetVal - parsedOffer) / targetVal) * 100), 75);

      setResult({
        minRate: `₹${minVal.toLocaleString("en-IN")}`,
        targetRate: `₹${targetVal.toLocaleString("en-IN")}`,
        maxRate: `₹${maxVal.toLocaleString("en-IN")}`,
        lowballPercentage: lowballPct > 0 ? lowballPct : 0,
        rationale: [
          `Illustrative estimate for ${deliverables || "sponsored deliverable"} based on your inputs.`,
          `Confirm payment and delivery terms with the brand before accepting.`,
          exclusivity !== "none" ? `Accounts for ${exclusivity} brand category exclusivity.` : "Non-exclusive delivery term.",
        ],
        pitchEmail: `Hi ${brand} Partnerships Team,

Thank you for reaching out regarding the collaboration!

Given the deliverable scope (${deliverables || "sponsored deliverables"})${exclusivity !== "none" ? ` along with ${exclusivity} exclusivity` : ""}, our media package rate is ₹${targetVal.toLocaleString("en-IN")}.

All campaigns on our channel are backed by Flenzr Vault Protection: your budget remains securely held in Vault until you inspect and approve the final content draft.

You can review our live cross-platform metrics and book directly via our verified media kit:
https://flenzr.com/@${creatorHandle || "creator"}

Looking forward to partnering!

Best regards,`,
      });
    }, 800);
  };

  const handleCopy = () => {
    if (!result) return;
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
              Deal Negotiator &amp; Rate Estimator
            </h2>
          </div>
          <p className="text-xs text-[#8c94a6] mt-0.5">
            Explore an estimate based on your offer and selected usage terms. These estimates are not verified market benchmarks.
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-white/10 text-white text-xs font-bold border border-white/20 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Offer calculator</span>
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
          {result ? (
            <>
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
            </>
          ) : (
            <div className="p-8 rounded-2xl bg-[#121215] border border-dashed border-[#27272a] text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto text-neutral-400">
                <Bot className="w-6 h-6 text-neutral-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-white">AI Deal Negotiator Ready</h4>
                <p className="text-xs text-[#7e8697] max-w-sm mx-auto">
                  Enter the inbound brand name, deliverable scope, and initial proposed budget on the left to calculate your fair market benchmark and generate an escrow-backed counter offer.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
