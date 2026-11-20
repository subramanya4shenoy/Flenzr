"use client";

import { useState, useEffect } from "react";
import { clearLocalAccountData } from "@/lib/local-data";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Plus,
  Briefcase,
} from "lucide-react";
import { HowItWorks } from "@/components/help/how-it-works";
import { Logo } from "@/components/ui/logo";
import { CampaignList, CampaignDraftDialog, useBrandCampaigns } from "@/components/brand/campaign-drafts";
import { CampaignActivity } from "@/components/campaigns/campaign-activity";
import { CampaignLifecycleDialog } from "@/components/brand/campaign-lifecycle";
import { campaignActionInfo, type CampaignAction } from "@/lib/campaign-lifecycle";
import { CampaignPipeline } from "@/components/brand/campaign-pipeline";
import { BrandShortlists } from "@/components/brand/shortlists";
import { CreatorDiscovery } from "@/components/brand/creator-discovery";
import { NotificationBell } from "@/components/notifications/notification-center";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { EnquiryUnreadBadge } from "@/components/enquiries/enquiry-activity";
import { useTranslation } from "@/lib/i18n/language-context";


export default function BrandDashboardPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"discovery" | "campaigns" | "shortlists" | "how_it_works">("discovery");

  function selectTab(tab: "discovery" | "campaigns" | "shortlists" | "how_it_works") {
    setActiveTab(tab);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${tab === "how_it_works" ? "#how-it-works" : ""}`);
  }
  useEffect(() => {
    const restore = () => setActiveTab(window.location.hash === "#how-it-works" ? "how_it_works" : "discovery");
    const timer = window.setTimeout(restore, 0);
    window.addEventListener("hashchange", restore);
    return () => { window.clearTimeout(timer); window.removeEventListener("hashchange", restore); };
  }, []);

  useEffect(() => {
    try {
      const email = localStorage.getItem("flenzr_account_email") || "";
      localStorage.setItem(
        "flenzr_auth_session",
        JSON.stringify({
          email,
          fullName: "Brand Portal",
          handle: "",
          role: "brand",
        })
      );
    } catch {}
  }, []);


  const campaignState = useBrandCampaigns();
  const campaigns = campaignState.campaigns;
  const [editor, setEditor] = useState<{ id: string | null } | null>(null);
  const [action, setAction] = useState<{ id: string; action: CampaignAction } | null>(null);
  const [shortlistId, setShortlistId] = useState<string | undefined>(undefined);
  const [activity, setActivity] = useState<{ id: string; title: string; kind?: "applications" | "invitations" } | null>(null);
  const [campaignNotice, setCampaignNotice] = useState("");
  const [summaryRevision, setSummaryRevision] = useState(0);
  const metricsReady = !campaignState.loading && !campaignState.error && campaigns !== null;

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 selection:bg-[#c1121f] selection:text-white">
      {/* Top Header */}
      <header className="border-b border-neutral-800 bg-[#09090b]/85 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-3 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/brand" className="flex items-center gap-2" title="Brand Portal">
              <Logo size={30} variant="duotone-dark" withWordmark={true} />
            </Link>
            <span className="h-6 px-3 rounded-full bg-neutral-900 text-neutral-200 font-semibold border border-neutral-800 text-xs inline-flex items-center justify-center leading-none">
              Brand Portal
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
            <Link href="/dashboard/brand/enquiries" className="h-9 px-3 rounded-xl border border-neutral-800 text-xs inline-flex items-center gap-2">Enquiries <EnquiryUnreadBadge view="sent" /></Link>
            <Link href="/dashboard/brand/profile" className="h-9 px-3 rounded-xl border border-neutral-800 text-xs inline-flex items-center">Brand profile</Link>
            <Link href="/dashboard/calendar" className="h-9 px-3 rounded-xl border border-neutral-800 text-xs inline-flex items-center">Calendar</Link>
            <Link href="/dashboard/collaborations" className="h-9 px-3 rounded-xl border border-neutral-800 text-xs inline-flex items-center">Collaborations</Link>
            <NotificationBell /><LanguageSwitcher variant="compact" />
            <button type="button" onClick={async () => {
              const res = await fetch("/api/auth/logout", { method: "POST" });
              if (!res.ok) { alert("Could not sign out. Please retry."); return; }
              clearLocalAccountData();
              localStorage.removeItem("flenzr_auth_session");
              window.location.assign("/login");
            }} className="h-9 px-3 rounded-xl border border-neutral-800 text-xs">Sign Out</button>
            <button
              onClick={() => { setCampaignNotice(""); setActivity(null); selectTab("campaigns"); setEditor({ id: null }); }}
              disabled={campaignState.missingOrganization}
              title={campaignState.missingOrganization ? "Set up your brand profile first" : undefined}
              className="h-9 px-4 rounded-xl text-xs font-bold bg-[#c1121f] hover:bg-[#a50e1a] text-white transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#c1121f]/25 leading-none"
            >
              <Plus className="w-4 h-4" />
              <span>{t("New campaign")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeTab !== "how_it_works" && <CampaignPipeline revision={summaryRevision} />}

        {/* Dashboard Tabs */}
        <div className="flex flex-wrap border-b border-neutral-800 gap-2">
          <button
            onClick={() => { setCampaignNotice(""); selectTab("discovery"); }}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "discovery"
                ? "border-[#c1121f] text-white font-bold"
                : "border-transparent text-neutral-400 hover:text-white"
            }`}
          >
            <Search className="w-4 h-4 text-[#c1121f]" />
            <span>Creator Discovery</span>
          </button>

          <button
            onClick={() => selectTab("campaigns")}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "campaigns"
                ? "border-[#c1121f] text-white font-bold"
                : "border-transparent text-neutral-400 hover:text-white"
            }`}
          >
            <Briefcase className="w-4 h-4 text-[#c1121f]" />
            <span>Campaigns ({metricsReady ? campaigns.length : "—"})</span>
          </button>
          <button type="button" onClick={() => { setShortlistId(undefined); setCampaignNotice(""); selectTab("shortlists"); }} className={`pb-3 px-4 text-sm font-semibold border-b-2 ${activeTab === "shortlists" ? "border-[#c1121f] text-white" : "border-transparent text-neutral-400"}`}>Shortlists</button>
          <button type="button" aria-current={activeTab === "how_it_works" ? "page" : undefined} onClick={() => selectTab("how_it_works")} className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${activeTab === "how_it_works" ? "border-[#c1121f] text-white" : "border-transparent text-neutral-400 hover:text-white"}`}><BookOpen className="w-4 h-4 text-[#c1121f]" aria-hidden="true" /><span>How it works</span></button>
        </div>

        {activeTab === "how_it_works" && <HowItWorks audience="brand" />}
        {activeTab === "shortlists" && <BrandShortlists key={shortlistId || "groups"} initialId={shortlistId} onManageCampaigns={() => { setActivity(null); selectTab("campaigns"); }} onViewCampaign={campaign => { setActivity({ id: campaign.id, title: campaign.title, kind: "invitations" }); selectTab("campaigns"); }} />}
        {activeTab === "discovery" && <CreatorDiscovery onViewShortlist={group => { setShortlistId(group.id); selectTab("shortlists"); }} onManageCampaigns={() => { setActivity(null); selectTab("campaigns"); }} onViewCampaign={campaign => { setActivity({ id: campaign.id, title: campaign.title, kind: "invitations" }); selectTab("campaigns"); }} />}

        {campaignNotice && <p className="fl-campaign-notice" role="status">{campaignNotice}</p>}
        {activeTab === "campaigns" && activity && <CampaignActivity key={`${activity.id}:${activity.kind || "applications"}`} initialKind={activity.kind} audience="brand" campaignId={activity.id} campaignTitle={activity.title} onBack={() => { setActivity(null); setSummaryRevision(value => value + 1); }} />}
        {activeTab === "campaigns" && !activity && <CampaignList {...campaignState} onActivity={(campaign) => setActivity({ id: campaign.id, title: campaign.title })} onOpen={(id) => { setCampaignNotice(""); setEditor({ id }); }} onAction={(campaign, nextAction) => { setCampaignNotice(""); setAction({ id: campaign.id, action: nextAction }); }} />}
        {action && <CampaignLifecycleDialog key={`${action.id}:${action.action}`} campaignId={action.id} action={action.action} onClose={() => setAction(null)} onReloaded={campaignState.retry} onEdit={(id) => { setAction(null); setEditor({ id }); }} onSaved={(campaign) => { campaignState.saved(campaign); setSummaryRevision(value => value + 1); setCampaignNotice(campaignActionInfo[action.action].done); }} />}
        {editor && <CampaignDraftDialog key={editor.id || "new"} campaignId={editor.id} onReloaded={campaignState.retry} onClose={() => setEditor(null)} onSaved={(campaign) => { campaignState.saved(campaign); setSummaryRevision(value => value + 1); setCampaignNotice("Draft saved."); selectTab("campaigns"); setEditor(null); }} />}
      </main>
    </div>
  );
}
