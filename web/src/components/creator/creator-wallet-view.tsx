"use client";

import { useState } from "react";
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

const INVOICES: TaxInvoice[] = [
  {
    id: "inv-1",
    invoiceNo: "FLZ-2026-089",
    brand: "Sony India Pvt Ltd",
    date: "Oct 12, 2026",
    grossAmount: "₹45,000",
    tdsDeducted: "₹4,500 (10%)",
    netPayout: "₹40,500",
    status: "paid",
  },
  {
    id: "inv-2",
    invoiceNo: "FLZ-2026-084",
    brand: "OnePlus Technology India",
    date: "Oct 04, 2026",
    grossAmount: "₹75,000",
    tdsDeducted: "₹7,500 (10%)",
    netPayout: "₹67,500",
    status: "paid",
  },
  {
    id: "inv-3",
    invoiceNo: "FLZ-2026-079",
    brand: "ASUSTeK Computer Inc",
    date: "Sep 28, 2026",
    grossAmount: "₹60,000",
    tdsDeducted: "₹6,000 (10%)",
    netPayout: "₹54,000",
    status: "paid",
  },
  {
    id: "inv-4",
    invoiceNo: "FLZ-2026-072",
    brand: "Sonova Consumer Hearing (Sennheiser)",
    date: "Sep 15, 2026",
    grossAmount: "₹40,000",
    tdsDeducted: "₹4,000 (10%)",
    netPayout: "₹36,000",
    status: "paid",
  },
];

export function CreatorWalletView() {
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleWithdraw = () => {
    setIsWithdrawing(true);
    setTimeout(() => {
      setIsWithdrawing(false);
      setWithdrawSuccess(true);
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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121215] border border-[#27272a] shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Flenzr Vault &amp; Tax-Compliant Invoicing
            </h2>
          </div>
          <p className="text-xs text-[#8c94a6] mt-0.5">
            Zero platform fees. Automated GST-compliant invoices and Section 194J TDS certificates for every brand deal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Vault Protected</span>
          </span>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Withdrawal Card */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#8c94a6] tracking-wider block">
              Available for Instant Payout
            </span>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              ₹1,45,000
            </div>
            <p className="text-[11px] text-[#71717a] flex items-center gap-1 pt-0.5">
              <Building2 className="w-3 h-3 text-neutral-400" />
              <span>HDFC Bank •••• 4892 (IMPS Enabled)</span>
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleWithdraw}
              disabled={isWithdrawing}
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
                  ₹1,45,000 Transferred to Bank!
                </span>
              ) : (
                <>
                  <span>Withdraw to Bank Account</span>
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
              Secured in Flenzr Vault
            </span>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              ₹65,000
            </div>
            <p className="text-[11px] text-[#71717a]">
              2 brand milestones currently in filming &amp; review
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] text-xs space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white font-medium">Sony FX3 Reel</span>
              <span className="font-bold text-white">₹45,000</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white font-medium">Keychron Q1 Script</span>
              <span className="font-bold text-white">₹20,000</span>
            </div>
          </div>
        </div>

        {/* Lifetime Earnings Card */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#8c94a6] tracking-wider block">
              Lifetime Collab Revenue
            </span>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              ₹6,85,000
            </div>
            <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <span>+34% growth vs previous quarter</span>
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-[#8c94a6] pt-2 border-t border-[#27272a]">
            <span>Total Deals: 14</span>
            <span>Zero Chargebacks</span>
          </div>
        </div>
      </div>

      {/* Tax Invoices & Payout Ledger */}
      <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Auto-Generated Brand Tax Invoices</h3>
            <p className="text-xs text-[#8c94a6]">
              All brand deliverables include downloadable GST invoices with Section 194J TDS deductions.
            </p>
          </div>
        </div>

        {/* Invoices Table */}
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
              {INVOICES.map((inv) => (
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
      </div>
    </div>
  );
}
