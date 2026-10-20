"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n/language-context";
import {
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  FileText,
  Clock,
  CheckCircle2,
  Download,
  ExternalLink,
  DollarSign,
  AlertCircle,
  Building2,
  Check,
} from "lucide-react";

interface TaxInvoice {
  id: string;
  invoiceNo: string;
  brand: string;
  date: string;
  grossAmount: string;
  tdsDeducted: string;
  netPayout: string;
  status: "paid" | "processing";
}

const INVOICES: TaxInvoice[] = [];

export function CreatorWalletView() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [pipelineDeals, setPipelineDeals] = useState<any[]>([]);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Sync with localStorage
  const loadVaultData = () => {
    if (typeof window === "undefined") return;
    try {
      const storedInvoices = localStorage.getItem("flenzr_vault_invoices");
      if (storedInvoices) {
        const parsed = JSON.parse(storedInvoices);
        if (Array.isArray(parsed)) {
          setInvoices(parsed);
        }
      } else {
        setInvoices([]);
      }

      const storedBalance = localStorage.getItem("flenzr_vault_available_balance");
      if (storedBalance) {
        const parsedBal = parseInt(storedBalance, 10);
        if (!isNaN(parsedBal)) {
          setAvailableBalance(parsedBal);
        }
      } else {
        setAvailableBalance(0);
      }

      const storedDeals = localStorage.getItem("flenzr_collab_pipeline_deals");
      if (storedDeals) {
        const parsed = JSON.parse(storedDeals);
        if (Array.isArray(parsed)) {
          setPipelineDeals(parsed);
        }
      } else {
        setPipelineDeals([]);
      }
    } catch (e) {
      console.warn("Failed to load vault data", e);
    }
  };

  useEffect(() => {
    loadVaultData();
    const handleUpdate = () => loadVaultData();
    window.addEventListener("flenzr_vault_updated", handleUpdate);
    window.addEventListener("flenzr_pipeline_updated", handleUpdate);
    return () => {
      window.removeEventListener("flenzr_vault_updated", handleUpdate);
      window.removeEventListener("flenzr_pipeline_updated", handleUpdate);
    };
  }, []);

  const handleWithdraw = () => {
    if (availableBalance <= 0) return;
    setIsWithdrawing(true);
    setTimeout(() => {
      setIsWithdrawing(false);
      setWithdrawSuccess(true);
      setAvailableBalance(0);
      if (typeof window !== "undefined") {
        localStorage.setItem("flenzr_vault_available_balance", "0");
      }
      setTimeout(() => setWithdrawSuccess(false), 3500);
    }, 1200);
  };

  const handleDownloadInvoice = (id: string, invNo: string) => {
    setDownloadingId(id);
    setTimeout(() => {
      setDownloadingId(null);
      alert(`Tax Invoice ${invNo} downloaded with GSTIN & Form 16A breakdown.`);
    }, 800);
  };

  const escrowDeals = pipelineDeals.filter(
    (d: any) => d.stage === "locked" || d.stage === "review"
  );
  const escrowTotal = escrowDeals.reduce((sum: number, d: any) => {
    const val = parseInt(d.amount?.replace(/[^0-9]/g, "") || "0", 10) || 0;
    return sum + val;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121215] border border-[#27272a] shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {t("Flenzr Vault")}
            </h2>
          </div>
          <p className="text-xs text-[#8c94a6] mt-0.5">
            Your earnings and invoices will appear here after completed collaborations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Payment setup pending</span>
          </span>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Withdrawal Card */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#8c94a6] tracking-wider block">
              {t("Available for Instant Payout")}
            </span>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              ₹{availableBalance.toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-[#71717a] flex items-center gap-1 pt-0.5">
              <Building2 className="w-3 h-3 text-neutral-400" />
              <span>No payout account connected</span>
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleWithdraw}
              disabled title="Connect a payout account before withdrawing"
              className="w-full h-10 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {isWithdrawing ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  Initiating Instant Transfer...
                </span>
              ) : withdrawSuccess ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Transferred to Bank!
                </span>
              ) : availableBalance <= 0 ? (
                <span className="text-neutral-500">No Balance Available</span>
              ) : (
                <>
                  <span>{t("Withdraw to Bank Account")}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Locked Escrow Card */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#8c94a6] tracking-wider block">
              {t("Secured in Flenzr Vault")}
            </span>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              ₹{escrowTotal.toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-[#71717a]">
              {escrowDeals.length > 0
                ? `${escrowDeals.length} brand ${
                    escrowDeals.length === 1 ? "milestone" : "milestones"
                  } currently in filming & review`
                : "No milestones currently in filming escrow"}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] text-xs space-y-1">
            {escrowDeals.length > 0 ? (
              escrowDeals.map((deal: any) => (
                <div key={deal.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-white font-medium truncate max-w-[150px]">
                    {deal.brand} • {deal.deliverable}
                  </span>
                  <span className="font-bold text-white shrink-0">{deal.amount}</span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-[#7e8697] italic text-center py-0.5">
                Funds are held in escrow once brands lock a collaboration milestone.
              </p>
            )}
          </div>
        </div>

        {/* Lifetime Earnings Card */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#8c94a6] tracking-wider block">
              {t("Lifetime Collab Revenue")}
            </span>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {invoices.length > 0
                ? `₹${invoices
                    .reduce((sum, inv) => sum + (parseInt(inv.grossAmount.replace(/[^0-9]/g, ""), 10) || 0), 0)
                    .toLocaleString("en-IN")}`
                : "₹0"}
            </div>
            <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <span>{invoices.length > 0 ? "+34% growth vs previous quarter" : "Ready for your first brand deal"}</span>
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-[#8c94a6] pt-2 border-t border-[#27272a]">
            <span>Total Deals: {invoices.length}</span>
            <span>Zero Chargebacks</span>
          </div>
        </div>
      </div>

      {/* Tax Invoices & Payout Ledger */}
      <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">{t("Auto-Generated Brand Tax Invoices")}</h3>
            <p className="text-xs text-[#8c94a6]">
              All brand deliverables include downloadable GST invoices with Section 194J TDS deductions.
            </p>
          </div>
        </div>

        {/* Invoices Table or Empty State */}
        {invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-[#18181b] text-[#8c94a6] text-[10px] uppercase tracking-wider border-y border-[#27272a]">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Brand / Sponsor</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Gross Amount</th>
                  <th className="py-3 px-4">TDS (10%)</th>
                  <th className="py-3 px-4">Net Received</th>
                  <th className="py-3 px-4 text-right">Invoice Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#18181b]/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">{inv.invoiceNo}</td>
                    <td className="py-3.5 px-4 font-semibold text-white">{inv.brand}</td>
                    <td className="py-3.5 px-4 text-[#8c94a6]">{inv.date}</td>
                    <td className="py-3.5 px-4 font-bold text-white">{inv.grossAmount}</td>
                    <td className="py-3.5 px-4 text-neutral-400 font-mono">{inv.tdsDeducted}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-400">{inv.netPayout}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownloadInvoice(inv.id, inv.invoiceNo)}
                        className="px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#222226] text-white font-semibold text-xs border border-[#27272a] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {downloadingId === inv.id ? (
                          <span className="text-neutral-400 text-[11px]">Generating...</span>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 text-neutral-300" />
                            <span>PDF</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-[#18181b]/60 border border-dashed border-[#27272a] text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto text-neutral-400">
              <FileText className="w-5 h-5 text-neutral-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-white">{t("No tax invoices generated yet")}</h4>
              <p className="text-xs text-[#7e8697] max-w-md mx-auto">
                {t("Invoices and Form 16A TDS certificates are automatically generated upon milestone completion in Flenzr Vault.")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
