"use client";

import { useState } from "react";
import {
  Briefcase,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  ExternalLink,
  DollarSign,
  Video,
  FileText,
  MessageSquare,
  Sparkles,
  ChevronRight,
  X,
} from "lucide-react";

export interface PipelineDeal {
  id: string;
  brand: string;
  deliverable: string;
  amount: string;
  stage: "inbound" | "locked" | "review" | "completed";
  dueDate: string;
  progress: number;
  brief: string;
  feedback?: string;
}

const INITIAL_DEALS: PipelineDeal[] = [
  {
    id: "deal-1",
    brand: "Nothing India",
    deliverable: "Dedicated 4K Video + 2 Reels",
    amount: "₹1,20,000",
    stage: "inbound",
    dueDate: "Nov 14",
    progress: 0,
    brief: "Exclusive unboxing & camera performance benchmark for Phone (3) launch event.",
  },
  {
    id: "deal-2",
    brand: "Zebronics Sound",
    deliverable: "60s Instagram Reel",
    amount: "₹35,000",
    stage: "inbound",
    dueDate: "Nov 02",
    progress: 0,
    brief: "Feature ANC soundbar bass test & desktop setup aesthetic integration.",
  },
  {
    id: "deal-3",
    brand: "Sony India",
    deliverable: "60s Cinematic FX3 Reel",
    amount: "₹45,000",
    stage: "locked",
    dueDate: "Oct 21",
    progress: 75,
    brief: "Color grading breakdown & low-light street photography b-roll.",
  },
  {
    id: "deal-4",
    brand: "Keychron",
    deliverable: "Dedicated 4K Review",
    amount: "₹35,000",
    stage: "locked",
    dueDate: "Oct 26",
    progress: 35,
    brief: "ASMR typing sound test, wireless multi-device switching review.",
  },
  {
    id: "deal-5",
    brand: "BoAt Lifestyle",
    deliverable: "Nirvana ANC Reel",
    amount: "₹45,000",
    stage: "review",
    dueDate: "Oct 28",
    progress: 90,
    brief: "Commute noise cancellation test.",
    feedback: "Audio mix looks crisp! Please boost the 3s closing logo display by 20%.",
  },
  {
    id: "deal-6",
    brand: "OnePlus India",
    deliverable: "Nord 4 Review Video",
    amount: "₹75,000",
    stage: "completed",
    dueDate: "Released Oct 12",
    progress: 100,
    brief: "Metal unibody durability test & gaming battery drain test.",
  },
  {
    id: "deal-7",
    brand: "Asus ROG",
    deliverable: "Ally X Showcase",
    amount: "₹60,000",
    stage: "completed",
    dueDate: "Released Oct 04",
    progress: 100,
    brief: "AAA gaming benchmark on 24W turbo mode.",
  },
];

interface CreatorCollabPipelineProps {
  onNavigateToAI?: (brand: string, offer: string) => void;
}

export function CreatorCollabPipeline({ onNavigateToAI }: CreatorCollabPipelineProps) {
  const [deals, setDeals] = useState<PipelineDeal[]>(INITIAL_DEALS);
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>("all");
  const [showNewDealModal, setShowNewDealModal] = useState(false);

  // New Deal Form
  const [newBrand, setNewBrand] = useState("");
  const [newDeliverable, setNewDeliverable] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newBrief, setNewBrief] = useState("");

  const handleCreateDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand || !newAmount) return;
    const newDeal: PipelineDeal = {
      id: `deal-${Date.now()}`,
      brand: newBrand,
      deliverable: newDeliverable || "Brand Deliverable",
      amount: newAmount.startsWith("₹") ? newAmount : `₹${newAmount}`,
      stage: "inbound",
      dueDate: "Flexible",
      progress: 0,
      brief: newBrief || "Custom brand collaboration draft.",
    };
    setDeals([newDeal, ...deals]);
    setNewBrand("");
    setNewDeliverable("");
    setNewAmount("");
    setNewBrief("");
    setShowNewDealModal(false);
  };

  const handleMoveStage = (id: string, nextStage: PipelineDeal["stage"]) => {
    setDeals(
      deals.map((d) => {
        if (d.id !== id) return d;
        let nextProg = d.progress;
        if (nextStage === "locked") nextProg = 30;
        if (nextStage === "review") nextProg = 85;
        if (nextStage === "completed") nextProg = 100;
        return { ...d, stage: nextStage, progress: nextProg };
      })
    );
  };

  const STAGES = [
    { key: "inbound", title: "Inbound Inquiries", badge: "Awaiting Action", color: "text-amber-400" },
    { key: "locked", title: "Vault Secured & Filming", badge: "Funds Protected", color: "text-white" },
    { key: "review", title: "Brand Review", badge: "Revision Round", color: "text-cyan-400" },
    { key: "completed", title: "Approved & Paid Out", badge: "Transferred", color: "text-emerald-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121215] border border-[#27272a] shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Collab Pipeline &amp; Vault Deals
            </h2>
          </div>
          <p className="text-xs text-[#8c94a6] mt-0.5">
            Zero filmed content without funds secured in Flenzr Vault. Track client briefs, revisions, and automated payouts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowNewDealModal(true)}
            className="h-9 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Collab Proposal</span>
          </button>
        </div>
      </div>

      {/* Pipeline KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#121215] border border-[#27272a] space-y-1">
          <div className="text-[10px] uppercase font-bold text-[#8c94a6] tracking-wider">Active Pipeline</div>
          <div className="text-xl sm:text-2xl font-extrabold text-white">₹2,80,000</div>
          <div className="text-[10px] text-neutral-400">4 active campaigns</div>
        </div>

        <div className="p-4 rounded-xl bg-[#121215] border border-[#27272a] space-y-1">
          <div className="text-[10px] uppercase font-bold text-[#8c94a6] tracking-wider">Vault Protected</div>
          <div className="text-xl sm:text-2xl font-extrabold text-white">₹1,25,000</div>
          <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>100% Guaranteed</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#121215] border border-[#27272a] space-y-1">
          <div className="text-[10px] uppercase font-bold text-[#8c94a6] tracking-wider">Completed (This Month)</div>
          <div className="text-xl sm:text-2xl font-extrabold text-white">₹1,75,000</div>
          <div className="text-[10px] text-neutral-400">3 brand campaigns</div>
        </div>

        <div className="p-4 rounded-xl bg-[#121215] border border-[#27272a] space-y-1">
          <div className="text-[10px] uppercase font-bold text-[#8c94a6] tracking-wider">Avg Turnaround</div>
          <div className="text-xl sm:text-2xl font-extrabold text-white">5.4 Days</div>
          <div className="text-[10px] text-neutral-400">87% on-time benchmark</div>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {STAGES.map((stg) => {
          const stageDeals = deals.filter((d) => d.stage === stg.key);
          return (
            <div
              key={stg.key}
              className="p-4 rounded-2xl bg-[#121215] border border-[#27272a] space-y-3.5 flex flex-col min-h-[480px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-tight">{stg.title}</span>
                  <span className="w-5 h-5 rounded-full bg-[#18181b] border border-[#27272a] text-[10px] font-bold text-white flex items-center justify-center">
                    {stageDeals.length}
                  </span>
                </div>
              </div>

              {/* Deals Cards */}
              <div className="space-y-3 flex-1">
                {stageDeals.length > 0 ? (
                  stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-neutral-600 transition-all space-y-2.5 text-xs group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-[13px] truncate">{deal.brand}</h4>
                          <p className="text-[10px] text-[#8c94a6] truncate">{deal.deliverable}</p>
                        </div>
                        <span className="text-xs font-bold text-white shrink-0 px-2 py-0.5 rounded bg-white/10 border border-white/20">
                          {deal.amount}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#a1a1aa] line-clamp-2 leading-relaxed">
                        {deal.brief}
                      </p>

                      {/* Brand Revision Feedback Box */}
                      {deal.feedback && (
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-200 space-y-0.5">
                          <span className="font-bold uppercase tracking-wider block text-[9px] text-amber-400">
                            Client Note:
                          </span>
                          <p>{deal.feedback}</p>
                        </div>
                      )}

                      {/* Progress bar for active filming */}
                      {deal.stage === "locked" && (
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-[9px] text-[#8c94a6]">
                            <span>Production progress</span>
                            <span className="text-white font-semibold">{deal.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#09090b] overflow-hidden">
                            <div
                              className="h-full bg-white rounded-full transition-all duration-300"
                              style={{ width: `${deal.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Due Date & Action Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#27272a] text-[10px]">
                        <span className="text-[#8c94a6] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          <span>Due {deal.dueDate}</span>
                        </span>

                        {/* Stage Specific Actions */}
                        {deal.stage === "inbound" && (
                          <div className="flex items-center gap-1">
                            {onNavigateToAI && (
                              <button
                                type="button"
                                onClick={() => onNavigateToAI(deal.brand, deal.amount)}
                                className="px-2 py-1 rounded bg-[#18181b] hover:bg-[#222226] text-white font-semibold border border-[#27272a] transition-colors cursor-pointer"
                                title="Negotiate with AI"
                              >
                                AI Counter
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleMoveStage(deal.id, "locked")}
                              className="px-2 py-1 rounded bg-white text-black font-bold hover:bg-neutral-200 transition-colors cursor-pointer"
                            >
                              Lock in Vault
                            </button>
                          </div>
                        )}

                        {deal.stage === "locked" && (
                          <button
                            type="button"
                            onClick={() => handleMoveStage(deal.id, "review")}
                            className="px-2 py-1 rounded bg-white text-black font-bold hover:bg-neutral-200 transition-colors cursor-pointer"
                          >
                            Submit Draft
                          </button>
                        )}

                        {deal.stage === "review" && (
                          <button
                            type="button"
                            onClick={() => handleMoveStage(deal.id, "completed")}
                            className="px-2 py-1 rounded bg-white text-black font-bold hover:bg-neutral-200 transition-colors cursor-pointer"
                          >
                            Release Funds
                          </button>
                        )}

                        {deal.stage === "completed" && (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Paid</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-40 rounded-xl bg-[#18181b]/40 border border-dashed border-[#27272a] flex flex-col items-center justify-center text-center p-4 space-y-1">
                    <p className="text-xs text-[#71717a]">No deals in this stage</p>
                    <p className="text-[10px] text-[#525866]">Move items across workflow</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Deal Modal */}
      {showNewDealModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#121215] border border-[#27272a] shadow-2xl p-6 space-y-4 text-white">
            <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
              <h3 className="text-base font-bold text-white">New Sponsor Deal Proposal</h3>
              <button
                type="button"
                onClick={() => setShowNewDealModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-[#18181b] flex items-center justify-center text-[#8c94a6] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#8c94a6] mb-1 font-medium">Brand or Agency Name</label>
                <input
                  type="text"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  placeholder="e.g. Dyson India"
                  required
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2.5 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                />
              </div>

              <div>
                <label className="block text-[#8c94a6] mb-1 font-medium">Deliverable Package</label>
                <input
                  type="text"
                  value={newDeliverable}
                  onChange={(e) => setNewDeliverable(e.target.value)}
                  placeholder="e.g. 1 Dedicated Video + 1 60s Reel"
                  required
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2.5 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                />
              </div>

              <div>
                <label className="block text-[#8c94a6] mb-1 font-medium">Agreed Deal Amount (Secured in Vault)</label>
                <input
                  type="text"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g. ₹65,000"
                  required
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2.5 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                />
              </div>

              <div>
                <label className="block text-[#8c94a6] mb-1 font-medium">Campaign Brief &amp; Expectations</label>
                <textarea
                  value={newBrief}
                  onChange={(e) => setNewBrief(e.target.value)}
                  rows={3}
                  placeholder="Product specs, key talking points, link tracking parameters..."
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2.5 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setShowNewDealModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[#8c94a6] hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-white text-black font-bold hover:bg-neutral-200 shadow-sm"
                >
                  Create Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
