"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { HowItWorks } from "@/components/help/how-it-works";
import { CampaignList, CampaignDraftDialog, useBrandCampaigns } from "@/components/brand/campaign-drafts";
import { CampaignActivity } from "@/components/campaigns/campaign-activity";
import { CampaignLifecycleDialog } from "@/components/brand/campaign-lifecycle";
import { campaignActionInfo, type CampaignAction } from "@/lib/campaign-lifecycle";
import { CampaignPipeline } from "@/components/brand/campaign-pipeline";
import { BrandShortlists } from "@/components/brand/shortlists";
import { CreatorDiscovery } from "@/components/brand/creator-discovery";
import { useTranslation } from "@/lib/i18n/language-context";


export default function BrandDashboardPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"discovery" | "campaigns" | "shortlists" | "how_it_works">("discovery");

  function selectTab(tab: "discovery" | "campaigns" | "shortlists" | "how_it_works") {
    setActiveTab(tab);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${tab === "how_it_works" ? "#how-it-works" : tab === "discovery" ? "" : `#${tab}`}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
  useEffect(() => {
    const restore = () => setActiveTab(window.location.hash === "#how-it-works" ? "how_it_works" : window.location.hash === "#campaigns" ? "campaigns" : window.location.hash === "#shortlists" ? "shortlists" : "discovery");
    const timer = window.setTimeout(restore, 0);
    window.addEventListener("hashchange", restore);
    window.addEventListener("popstate", restore);
    return () => { window.clearTimeout(timer); window.removeEventListener("hashchange", restore); window.removeEventListener("popstate", restore); };
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
  const [editor, setEditor] = useState<{ id: string | null } | null>(null);
  const [action, setAction] = useState<{ id: string; action: CampaignAction } | null>(null);
  const [shortlistId, setShortlistId] = useState<string | undefined>(undefined);
  const [activity, setActivity] = useState<{ id: string; title: string; kind?: "applications" | "invitations" } | null>(null);
  const [campaignNotice, setCampaignNotice] = useState("");
  const [summaryRevision, setSummaryRevision] = useState(0);


  return (
    <main className="fl-brand-dashboard">
      {activeTab !== "how_it_works" && <>
        <div className="fl-brand-page-heading"><div><h1>{activeTab === "discovery" ? "Discover creators" : activeTab === "campaigns" ? "Offers" : "Shortlists"}</h1><p>{activeTab === "discovery" ? "Find the right creators for your next collaboration." : activeTab === "campaigns" ? "Manage your briefs, applications and invitations." : "Keep your favourite creators organised."}</p></div>
          <button type="button" onClick={() => { setCampaignNotice(""); setActivity(null); selectTab("campaigns"); setEditor({ id: null }); }} disabled={campaignState.missingOrganization} title={campaignState.missingOrganization ? "Set up your brand profile first" : undefined} className="h-9 px-3 rounded-lg text-xs font-semibold bg-[#c1121f] hover:bg-[#a50e1a] text-white transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"><Plus className="w-3.5 h-3.5" /><span>{t("New Offer")}</span></button>
        </div>
        <CampaignPipeline revision={summaryRevision} />
      </>}
      <div className="fl-brand-section-content">
        {activeTab === "how_it_works" && <HowItWorks audience="brand" />}
        {activeTab === "shortlists" && <BrandShortlists key={shortlistId || "groups"} initialId={shortlistId} onManageCampaigns={() => { setActivity(null); selectTab("campaigns"); }} onViewCampaign={campaign => { setActivity({ id: campaign.id, title: campaign.title, kind: "invitations" }); selectTab("campaigns"); }} />}
        {activeTab === "discovery" && <CreatorDiscovery onViewShortlist={group => { setShortlistId(group.id); selectTab("shortlists"); }} onManageCampaigns={() => { setActivity(null); selectTab("campaigns"); }} onViewCampaign={campaign => { setActivity({ id: campaign.id, title: campaign.title, kind: "invitations" }); selectTab("campaigns"); }} />}

        {campaignNotice && <p className="fl-campaign-notice" role="status">{campaignNotice}</p>}
        {activeTab === "campaigns" && activity && <CampaignActivity key={`${activity.id}:${activity.kind || "applications"}`} initialKind={activity.kind} audience="brand" campaignId={activity.id} campaignTitle={activity.title} onBack={() => { setActivity(null); setSummaryRevision(value => value + 1); }} />}
        {activeTab === "campaigns" && !activity && <CampaignList {...campaignState} onActivity={(campaign) => setActivity({ id: campaign.id, title: campaign.title })} onOpen={(id) => { setCampaignNotice(""); setEditor({ id }); }} onAction={(campaign, nextAction) => { setCampaignNotice(""); setAction({ id: campaign.id, action: nextAction }); }} />}
        {action && <CampaignLifecycleDialog key={`${action.id}:${action.action}`} campaignId={action.id} action={action.action} onClose={() => setAction(null)} onReloaded={campaignState.retry} onEdit={(id) => { setAction(null); setEditor({ id }); }} onSaved={(campaign) => { campaignState.saved(campaign); setSummaryRevision(value => value + 1); setCampaignNotice(campaignActionInfo[action.action].done); }} />}
        {editor && <CampaignDraftDialog key={editor.id || "new"} campaignId={editor.id} onReloaded={campaignState.retry} onClose={() => setEditor(null)} onSaved={(campaign) => { campaignState.saved(campaign); setSummaryRevision(value => value + 1); setCampaignNotice("Draft saved."); selectTab("campaigns"); setEditor(null); }} />}
      </div>
    </main>
  );
}
