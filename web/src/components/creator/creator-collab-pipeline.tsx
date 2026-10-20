"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n/language-context";
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
  Play,
  Eye,
  RefreshCw,
  FileCheck,
  Lock,
  Link as LinkIcon,
  Check,
  HelpCircle,
  ArrowUpRight,
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
  // Draft submission metadata
  draftUrl?: string;
  draftPlatform?: "youtube" | "frameio" | "drive" | "loom" | "other";
  draftVersion?: string;
  draftNotes?: string;
  hasWatermark?: boolean;
  submittedAt?: string;
  revisionCount?: number;
  revisionHistory?: Array<{
    version: string;
    url: string;
    notes: string;
    submittedAt: string;
  }>;
  // Vault payout details
  invoiceNo?: string;
  completedAt?: string;
  netPayout?: string;
}

const INITIAL_DEALS: PipelineDeal[] = [];

export function getInitialDealsForProfile(profile?: any): PipelineDeal[] {
  return [];
}

interface CreatorCollabPipelineProps {
  onNavigateToAI?: (brand: string, offer: string) => void;
  onNavigateToVault?: () => void;
}

export function CreatorCollabPipeline({
  onNavigateToAI,
  onNavigateToVault,
}: CreatorCollabPipelineProps) {
  const { t } = useTranslation();
  const [deals, setDeals] = useState<PipelineDeal[]>(INITIAL_DEALS);
  const [showNewDealModal, setShowNewDealModal] = useState(false);

  // Modal states for Task 1
  const [activeDealForDraft, setActiveDealForDraft] = useState<PipelineDeal | null>(null);
  const [activeDealForFeedback, setActiveDealForFeedback] = useState<PipelineDeal | null>(null);
  const [activeDealForApproval, setActiveDealForApproval] = useState<PipelineDeal | null>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  // Draft Submission Form State
  const [draftUrl, setDraftUrl] = useState("");
  const [draftPlatform, setDraftPlatform] = useState<"youtube" | "frameio" | "drive" | "loom" | "other">("youtube");
  const [draftVersion, setDraftVersion] = useState("v1");
  const [draftNotes, setDraftNotes] = useState("");
  const [hasWatermark, setHasWatermark] = useState(true);

  // Client Feedback Revision Form State
  const [revisionUrl, setRevisionUrl] = useState("");
  const [revisionNotes, setRevisionNotes] = useState("");

  // New Deal Form State
  const [newBrand, setNewBrand] = useState("");
  const [newDeliverable, setNewDeliverable] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newBrief, setNewBrief] = useState("");

  // Load deals from localStorage if available
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("flenzr_collab_pipeline_deals");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setDeals(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to load saved pipeline deals", e);
    }
  }, []);

  // Save deals to localStorage whenever they update
  const persistDeals = (updatedDeals: PipelineDeal[]) => {
    setDeals(updatedDeals);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("flenzr_collab_pipeline_deals", JSON.stringify(updatedDeals));
        window.dispatchEvent(new Event("flenzr_pipeline_updated"));
      } catch (e) {
        console.warn("Failed to persist pipeline deals", e);
      }
    }
  };

  const showToast = (message: string) => {
    setSuccessNotification(message);
    setTimeout(() => {
      setSuccessNotification(null);
    }, 4000);
  };

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
    persistDeals([newDeal, ...deals]);
    setNewBrand("");
    setNewDeliverable("");
    setNewAmount("");
    setNewBrief("");
    setShowNewDealModal(false);
    showToast(`New proposal for ${newBrand} added to Inbound Inquiries.`);
  };

  const handleMoveStage = (id: string, nextStage: PipelineDeal["stage"]) => {
    const updated = deals.map((d) => {
      if (d.id !== id) return d;
      let nextProg = d.progress;
      if (nextStage === "locked") nextProg = 30;
      if (nextStage === "review") nextProg = 85;
      if (nextStage === "completed") nextProg = 100;
      return { ...d, stage: nextStage, progress: nextProg };
    });
    persistDeals(updated);
  };

  // 1. Submit Draft Handler
  const handleOpenDraftModal = (deal: PipelineDeal) => {
    setActiveDealForDraft(deal);
    setDraftUrl(deal.draftUrl || "");
    setDraftPlatform(deal.draftPlatform || "youtube");
    setDraftVersion(deal.draftVersion || "v1");
    setDraftNotes(deal.draftNotes || "");
    setHasWatermark(deal.hasWatermark !== undefined ? deal.hasWatermark : true);
  };

  const handleSubmitDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDealForDraft) return;

    const timestamp = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const updated = deals.map((d) => {
      if (d.id !== activeDealForDraft.id) return d;
      return {
        ...d,
        stage: "review" as const,
        progress: 85,
        draftUrl: draftUrl || "https://youtu.be/sample-unlisted-cut",
        draftPlatform,
        draftVersion,
        draftNotes: draftNotes || "Draft uploaded for brand review.",
        hasWatermark,
        submittedAt: timestamp,
        feedback: "Awaiting sponsor review feedback...",
        revisionCount: (d.revisionCount || 0),
        revisionHistory: [
          ...(d.revisionHistory || []),
          {
            version: draftVersion,
            url: draftUrl || "https://youtu.be/sample-unlisted-cut",
            notes: draftNotes || "Initial submission",
            submittedAt: timestamp,
          },
        ],
      };
    });

    persistDeals(updated);
    setActiveDealForDraft(null);
    showToast(`Draft ${draftVersion} for ${activeDealForDraft.brand} submitted to Brand Review!`);
  };

  // 2. Client Revision Handler
  const handleOpenFeedbackModal = (deal: PipelineDeal) => {
    setActiveDealForFeedback(deal);
    setRevisionUrl("");
    setRevisionNotes("");
  };

  const handleSubmitRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDealForFeedback) return;

    const currentVersionNum = activeDealForFeedback.draftVersion?.match(/\d+/)?.[0] || "1";
    const nextVersion = `v${parseInt(currentVersionNum, 10) + 1}`;
    const timestamp = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const updated = deals.map((d) => {
      if (d.id !== activeDealForFeedback.id) return d;
      return {
        ...d,
        draftUrl: revisionUrl || d.draftUrl,
        draftVersion: nextVersion,
        draftNotes: revisionNotes || "Updated cut incorporating client feedback notes.",
        submittedAt: timestamp,
        feedback: "Revision submitted. Sponsor will review updated cut within 24 hours.",
        revisionCount: (d.revisionCount || 0) + 1,
        revisionHistory: [
          ...(d.revisionHistory || []),
          {
            version: nextVersion,
            url: revisionUrl || d.draftUrl || "",
            notes: revisionNotes || "Revision cut",
            submittedAt: timestamp,
          },
        ],
      };
    });

    persistDeals(updated);
    setActiveDealForFeedback(null);
    showToast(`Revision ${nextVersion} submitted to ${activeDealForFeedback.brand} review team!`);
  };

  // 3. Vault Release & Completion Flow
  const handleOpenApprovalModal = (deal: PipelineDeal) => {
    setActiveDealForApproval(deal);
  };

  const handleConfirmApprovalAndRelease = () => {
    showToast("Payments are not connected yet. No funds have been transferred.");
  };

  const STAGES = [
    { key: "inbound", title: t("Inbound Inquiries"), badge: "Awaiting Action", color: "text-amber-400" },
    { key: "locked", title: t("Vault Secured & Filming"), badge: "Funds Protected", color: "text-white" },
    { key: "review", title: t("Brand Review"), badge: "Revision Round", color: "text-cyan-400" },
    { key: "completed", title: t("Approved & Paid Out"), badge: "Transferred", color: "text-emerald-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successNotification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#121215] border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successNotification}</span>
          {onNavigateToVault && (
            <button
              type="button"
              onClick={onNavigateToVault}
              className="ml-2 px-2.5 py-1 rounded-lg bg-emerald-500 text-black font-bold text-[11px] hover:bg-emerald-400 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
            >
              <span>{t("Flenzr Vault")}</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Top Banner & KPI summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121215] border border-[#27272a] shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {t("Collab Pipeline")}
            </h2>
          </div>
          <p className="text-xs text-[#8c94a6] mt-0.5">
            Zero filmed content without funds secured in Flenzr Vault. Track draft submissions, revision cuts, and automated tax payouts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowNewDealModal(true)}
            className="h-9 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("New Collab Proposal")}</span>
          </button>
        </div>
      </div>

      {/* Pipeline KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {(() => {
          const parseAmountNum = (amountStr?: string) => {
            if (!amountStr) return 0;
            return parseInt(amountStr.replace(/[^0-9]/g, ""), 10) || 0;
          };

          const activeDealsList = deals.filter((d) => d.stage !== "completed");
          const activePipelineValue = activeDealsList.reduce((sum, d) => sum + parseAmountNum(d.amount), 0);

          const vaultProtectedDeals = deals.filter((d) => d.stage === "locked" || d.stage === "review");
          const vaultProtectedValue = vaultProtectedDeals.reduce((sum, d) => sum + parseAmountNum(d.amount), 0);

          const completedStageDeals = deals.filter((d) => d.stage === "completed");
          const completedValue = completedStageDeals.reduce((sum, d) => sum + parseAmountNum(d.amount), 0);

          return (
            <>
              <div className="p-4 rounded-xl bg-[#121215] border border-[#27272a] space-y-1">
                <div className="text-[10px] uppercase font-bold text-[#8c94a6] tracking-wider">
                  {t("Active Pipeline")}
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-white">
                  ₹{activePipelineValue.toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-neutral-400">
                  {activeDealsList.length} {t("active campaigns")}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#121215] border border-[#27272a] space-y-1">
                <div className="text-[10px] uppercase font-bold text-[#8c94a6] tracking-wider">
                  {t("Vault Protected")}
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-white">
                  ₹{vaultProtectedValue.toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{t("100% Guaranteed")}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#121215] border border-[#27272a] space-y-1">
                <div className="text-[10px] uppercase font-bold text-[#8c94a6] tracking-wider">
                  {t("Completed Deals")}
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-white">
                  ₹{completedValue.toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-neutral-400">
                  {completedStageDeals.length} {t("brand campaigns")}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#121215] border border-[#27272a] space-y-1">
                <div className="text-[10px] uppercase font-bold text-[#8c94a6] tracking-wider">
                  {t("Avg Turnaround")}
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-white">
                  {deals.length > 0 ? "5-7 Days" : "--"}
                </div>
                <div className="text-[10px] text-neutral-400">
                  {deals.length > 0 ? t("100% on-time benchmark") : t("No active campaigns")}
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {STAGES.map((stg) => {
          const stageDeals = deals.filter((d) => d.stage === stg.key);
          return (
            <div
              key={stg.key}
              className="p-4 rounded-2xl bg-[#121215] border border-[#27272a] space-y-3.5 flex flex-col min-h-[500px]"
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
                      {/* Deal Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-[13px] truncate">{deal.brand}</h4>
                          <p className="text-[10px] text-[#8c94a6] truncate">{deal.deliverable}</p>
                        </div>
                        <span className="text-xs font-bold text-white shrink-0 px-2 py-0.5 rounded bg-white/10 border border-white/20">
                          {deal.amount}
                        </span>
                      </div>

                      {/* Brief */}
                      <p className="text-[11px] text-[#a1a1aa] line-clamp-2 leading-relaxed">
                        {deal.brief}
                      </p>

                      {/* Review Stage: Draft link & watermark info */}
                      {deal.stage === "review" && deal.draftUrl && (
                        <div className="p-2.5 rounded-lg bg-[#121215] border border-[#27272a] space-y-1.5 text-[10px]">
                          <div className="flex items-center justify-between">
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20 text-[9px] uppercase tracking-wider">
                              Draft {deal.draftVersion || "v1"}
                            </span>
                            {deal.hasWatermark ? (
                              <span className="text-emerald-400 flex items-center gap-1 text-[9px] font-medium">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Watermarked</span>
                              </span>
                            ) : (
                              <span className="text-neutral-400 text-[9px]">Clean Cut</span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-neutral-300">
                            <a
                              href={deal.draftUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-white hover:underline flex items-center gap-1 font-semibold truncate max-w-[170px]"
                            >
                              <Play className="w-3 h-3 text-cyan-400 shrink-0" />
                              <span className="truncate">Preview Submitted Video</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                            </a>
                            <span className="text-[9px] text-neutral-500 shrink-0">
                              {deal.submittedAt?.split(",")[0] || "Recent"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Brand Revision Feedback Box */}
                      {deal.feedback && deal.stage === "review" && (
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold uppercase tracking-wider text-[9px] text-amber-400 flex items-center gap-1">
                              <MessageSquare className="w-2.5 h-2.5" />
                              <span>Sponsor Review Notes:</span>
                            </span>
                          </div>
                          <p className="leading-relaxed line-clamp-2">{deal.feedback}</p>
                        </div>
                      )}

                      {/* Completed Stage: Tax Invoice Reference */}
                      {deal.stage === "completed" && deal.invoiceNo && (
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 flex items-center justify-between">
                          <span className="font-semibold flex items-center gap-1">
                            <FileCheck className="w-3 h-3 text-emerald-400" />
                            <span>Tax Inv: {deal.invoiceNo}</span>
                          </span>
                          <span className="font-bold text-white">{deal.netPayout} Net</span>
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
                        <span className="text-[#8c94a6] flex items-center gap-1 truncate max-w-[110px]">
                          <Clock className="w-3 h-3 text-neutral-400 shrink-0" />
                          <span className="truncate">{deal.dueDate}</span>
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
                                {t("AI Counter")}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleMoveStage(deal.id, "locked")}
                              className="px-2 py-1 rounded bg-white text-black font-bold hover:bg-neutral-200 transition-colors cursor-pointer"
                            >
                              {t("Lock in Vault")}
                            </button>
                          </div>
                        )}

                        {deal.stage === "locked" && (
                          <button
                            type="button"
                            onClick={() => handleOpenDraftModal(deal)}
                            className="px-2.5 py-1 rounded bg-white text-black font-bold hover:bg-neutral-200 transition-all flex items-center gap-1 cursor-pointer shadow-sm hover:scale-[1.02]"
                          >
                            <Video className="w-3 h-3" />
                            <span>{t("Submit Draft")}</span>
                          </button>
                        )}

                        {deal.stage === "review" && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenFeedbackModal(deal)}
                              className="px-2 py-1 rounded bg-[#18181b] hover:bg-[#222226] text-white font-semibold border border-[#27272a] transition-colors cursor-pointer flex items-center gap-1"
                              title="View Client Notes & Submit Revision"
                            >
                              <RefreshCw className="w-2.5 h-2.5 text-cyan-400" />
                              <span>{t("Revise")}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenApprovalModal(deal)}
                              className="px-2 py-1 rounded bg-white text-black font-bold hover:bg-neutral-200 transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>{t("Approve")}</span>
                            </button>
                          </div>
                        )}

                        {deal.stage === "completed" && (
                          <div className="flex items-center gap-1">
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{t("Approved & Paid Out")}</span>
                            </span>
                          </div>
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

      {/* ======================================================== */}
      {/* 1. INTERACTIVE DRAFT SUBMISSION MODAL                    */}
      {/* ======================================================== */}
      {activeDealForDraft && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-[#121215] border border-[#27272a] shadow-2xl p-6 space-y-4 text-white animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-white" />
                  <h3 className="text-base font-bold text-white">Submit Deliverable Draft</h3>
                </div>
                <p className="text-xs text-[#8c94a6] mt-0.5">
                  {activeDealForDraft.brand} • {activeDealForDraft.deliverable}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDealForDraft(null)}
                className="w-7 h-7 rounded-lg hover:bg-[#18181b] flex items-center justify-center text-[#8c94a6] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Flenzr Vault Secured Milestone</span>
              </span>
              <span className="font-extrabold text-white text-sm">{activeDealForDraft.amount}</span>
            </div>

            <form onSubmit={handleSubmitDraft} className="space-y-4 text-xs">
              {/* Hosting Platform Quick Pick */}
              <div>
                <label className="block text-[#8c94a6] mb-1.5 font-medium">
                  Select Video / Asset Platform
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "youtube", label: "YouTube Unlisted" },
                    { id: "frameio", label: "Frame.io" },
                    { id: "drive", label: "Google Drive" },
                    { id: "loom", label: "Loom" },
                  ].map((plat) => (
                    <button
                      key={plat.id}
                      type="button"
                      onClick={() => {
                        setDraftPlatform(plat.id as any);
                        if (!draftUrl) {
                          if (plat.id === "youtube") setDraftUrl("https://youtu.be/sample-preview-v1");
                          if (plat.id === "frameio") setDraftUrl("https://app.frame.io/projects/review-sample");
                          if (plat.id === "drive") setDraftUrl("https://drive.google.com/file/d/sample-preview");
                          if (plat.id === "loom") setDraftUrl("https://loom.com/share/sample-preview");
                        }
                      }}
                      className={`py-2 px-2 rounded-lg text-center font-semibold text-[11px] transition-all cursor-pointer border ${
                        draftPlatform === plat.id
                          ? "bg-white text-black border-white shadow-sm"
                          : "bg-[#18181b] text-[#8c94a6] border-[#27272a] hover:text-white"
                      }`}
                    >
                      {plat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* URL Field */}
              <div>
                <label className="block text-[#8c94a6] mb-1 font-medium">
                  Review Cut URL (Private / Unlisted)
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={draftUrl}
                    onChange={(e) => setDraftUrl(e.target.value)}
                    placeholder="https://youtu.be/... or Frame.io review link"
                    required
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2.5 pl-8 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                  />
                  <LinkIcon className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-3" />
                </div>
                <p className="text-[10px] text-neutral-500 mt-1">
                  Ensure the link is viewable with link-sharing enabled so the brand review team can comment.
                </p>
              </div>

              {/* Version Selector */}
              <div>
                <label className="block text-[#8c94a6] mb-1 font-medium">Version Tag</label>
                <div className="flex items-center gap-2">
                  {[
                    { id: "v1", label: "v1 (Rough Cut)" },
                    { id: "v2", label: "v2 (Fine Cut)" },
                    { id: "v3", label: "v3 (Final Master)" },
                  ].map((ver) => (
                    <button
                      key={ver.id}
                      type="button"
                      onClick={() => setDraftVersion(ver.id)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
                        draftVersion === ver.id
                          ? "bg-white text-black border-white"
                          : "bg-[#18181b] text-[#8c94a6] border-[#27272a] hover:text-white"
                      }`}
                    >
                      {ver.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes for Brand */}
              <div>
                <label className="block text-[#8c94a6] mb-1 font-medium">
                  Review Notes for Sponsor
                </label>
                <textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. 45s product integration begins at 02:40, audio mixed at -14 LUFS, sponsor discount code pinned in description..."
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2.5 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30 resize-none"
                />
              </div>

              {/* Watermark Protection Toggle */}
              <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-between">
                <div className="space-y-0.5 max-w-[80%]">
                  <span className="font-semibold text-white text-xs flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Flenzr Review Watermark Protection</span>
                  </span>
                  <p className="text-[10px] text-[#8c94a6] leading-relaxed">
                    Adds subtle semi-transparent review watermark so brand cannot publish footage prior to Vault release.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHasWatermark(!hasWatermark)}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                    hasWatermark ? "bg-white" : "bg-neutral-800"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-black transition-transform ${
                      hasWatermark ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setActiveDealForDraft(null)}
                  className="px-3.5 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[#8c94a6] hover:text-white font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-white text-black font-bold hover:bg-neutral-200 shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Submit Draft to Brand Review</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CLIENT REVISION & FEEDBACK VIEWER MODAL               */}
      {/* ======================================================== */}
      {activeDealForFeedback && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-[#121215] border border-[#27272a] shadow-2xl p-6 space-y-4 text-white animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div>
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">Brand Review &amp; Revisions</h3>
                </div>
                <p className="text-xs text-[#8c94a6] mt-0.5">
                  {activeDealForFeedback.brand} • {activeDealForFeedback.deliverable}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDealForFeedback(null)}
                className="w-7 h-7 rounded-lg hover:bg-[#18181b] flex items-center justify-center text-[#8c94a6] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Submitted Draft Status */}
            <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#8c94a6] tracking-wider">
                  Active Review Draft ({activeDealForFeedback.draftVersion || "v1"})
                </span>
                <span className="text-[10px] text-neutral-400">
                  Submitted {activeDealForFeedback.submittedAt || "Recently"}
                </span>
              </div>

              {activeDealForFeedback.draftUrl && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#121215] border border-[#27272a]">
                  <a
                    href={activeDealForFeedback.draftUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white hover:underline flex items-center gap-1.5 font-semibold truncate max-w-[280px]"
                  >
                    <Play className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{activeDealForFeedback.draftUrl}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                  </a>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white font-medium shrink-0">
                    {activeDealForFeedback.hasWatermark ? "Watermarked" : "Clean Cut"}
                  </span>
                </div>
              )}

              {activeDealForFeedback.draftNotes && (
                <p className="text-[11px] text-[#a1a1aa] italic">
                  &ldquo;{activeDealForFeedback.draftNotes}&rdquo;
                </p>
              )}
            </div>

            {/* Client Feedback Card */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs">
              <div className="flex items-center justify-between text-amber-400">
                <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>Client Feedback / Revision Request</span>
                </span>
                <span className="text-[10px] text-amber-400/80">Sponsor details</span>
              </div>
              <p className="text-amber-100 text-[11px] leading-relaxed">
                {activeDealForFeedback.feedback ||
                  "Audio mix looks crisp! Please boost the 3s closing logo display by 20% and trim the intro by 2 seconds."}
              </p>
            </div>

            {/* Submit Revision Form */}
            <form onSubmit={handleSubmitRevision} className="space-y-3.5 text-xs pt-1">
              <div>
                <label className="block text-[#8c94a6] mb-1 font-medium">
                  Updated Cut URL (Revision v2)
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={revisionUrl}
                    onChange={(e) => setRevisionUrl(e.target.value)}
                    placeholder="https://youtu.be/... or updated Frame.io link"
                    required
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2.5 pl-8 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30"
                  />
                  <LinkIcon className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-[#8c94a6] mb-1 font-medium">
                  Revision Changelog / Notes
                </label>
                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Addressed feedback: trimmed intro hook by 2.2s, boosted closing logo bumper brightness by +20%."
                  required
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg p-2.5 text-white focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/30 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setActiveDealForFeedback(null)}
                  className="px-3.5 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[#8c94a6] hover:text-white font-medium cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-white text-black font-bold hover:bg-neutral-200 shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Submit Revision Cut</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. VAULT RELEASE & BRAND APPROVAL CONFIRMATION MODAL     */}
      {/* ======================================================== */}
      {activeDealForApproval && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-[#121215] border border-[#27272a] shadow-2xl p-6 space-y-4 text-white animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Approve &amp; Release Vault Funds</h3>
                </div>
                <p className="text-xs text-[#8c94a6] mt-0.5">
                  Milestone approved by {activeDealForApproval.brand}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDealForApproval(null)}
                className="w-7 h-7 rounded-lg hover:bg-[#18181b] flex items-center justify-center text-[#8c94a6] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Campaign Summary */}
            <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{activeDealForApproval.brand}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-[10px]">
                  Vault Secured
                </span>
              </div>
              <p className="text-[11px] text-[#8c94a6]">{activeDealForApproval.deliverable}</p>
            </div>

            {/* Section 194J Financial Breakdown */}
            <div className="p-4 rounded-xl bg-[#09090b] border border-[#27272a] space-y-2.5 text-xs">
              <span className="text-[10px] uppercase font-bold text-[#8c94a6] tracking-wider block">
                Section 194J Tax Payout Breakdown
              </span>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-neutral-300">
                  <span>Gross Deal Amount</span>
                  <span className="font-semibold text-white">{activeDealForApproval.amount}</span>
                </div>

                <div className="flex items-center justify-between text-neutral-400">
                  <span className="flex items-center gap-1">
                    <span>TDS Deduction (Section 194J - 10%)</span>
                    <span title="Deposited to Income Tax Dept with Form 16A" className="cursor-help inline-flex">
                      <HelpCircle className="w-3 h-3 text-neutral-500" />
                    </span>
                  </span>
                  <span className="text-amber-400 font-medium">
                    -₹{(Math.round((parseInt(activeDealForApproval.amount.replace(/[^0-9]/g, "") || "45000", 10) * 0.1))).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex items-center justify-between text-neutral-400">
                  <span>Flenzr Platform Fee (0% Creator-First)</span>
                  <span className="text-emerald-400 font-medium">₹0</span>
                </div>

                <div className="pt-2 border-t border-[#27272a] flex items-center justify-between text-sm font-bold text-white">
                  <span>Net Direct Bank Credit</span>
                  <span className="text-emerald-400 text-base">
                    ₹{(Math.round((parseInt(activeDealForApproval.amount.replace(/[^0-9]/g, "") || "45000", 10) * 0.9))).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Target Destination Info */}
            <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#8c94a6]">Destination Bank Account</span>
                <span className="text-[10px] text-emerald-400 font-semibold">IMPS / Instant Payout</span>
              </div>
              <p className="font-semibold text-white">No payout account connected</p>
              <p className="text-[10px] text-neutral-400">
                A tax invoice with GSTIN &amp; Form 16A TDS certificate will be automatically generated.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#27272a]">
              <button
                type="button"
                onClick={() => setActiveDealForApproval(null)}
                className="px-3.5 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[#8c94a6] hover:text-white font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprovalAndRelease} disabled title="Payments are not connected yet"
                className="px-4 py-2 rounded-lg bg-white text-black font-bold hover:bg-neutral-200 shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Payment release unavailable</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* NEW DEAL PROPOSAL MODAL                                  */}
      {/* ======================================================== */}
      {showNewDealModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#121215] border border-[#27272a] shadow-2xl p-6 space-y-4 text-white">
            <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
              <h3 className="text-base font-bold text-white">New Sponsor Deal Proposal</h3>
              <button
                type="button"
                onClick={() => setShowNewDealModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-[#18181b] flex items-center justify-center text-[#8c94a6] hover:text-white cursor-pointer"
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
                  className="px-3.5 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[#8c94a6] hover:text-white font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-white text-black font-bold hover:bg-neutral-200 shadow-sm cursor-pointer"
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
