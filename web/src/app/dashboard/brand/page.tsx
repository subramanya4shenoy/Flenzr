"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { HowItWorks } from "@/components/help/how-it-works";
import { CampaignList, CampaignDraftDialog, useBrandCampaigns } from "@/components/brand/campaign-drafts";
import { CampaignFolderDialog, CampaignFolderGrid, CampaignFolderOverview, CampaignFoldersLoading, MoveOfferDialog, useCampaignFolders } from "@/components/brand/campaign-folders";
import { CampaignActivity } from "@/components/campaigns/campaign-activity";
import { CampaignLifecycleDialog } from "@/components/brand/campaign-lifecycle";
import { campaignActionInfo, type CampaignAction } from "@/lib/campaign-lifecycle";
import { offersInCampaign, unassignedCampaign, type CampaignFolder } from "@/lib/campaign-folders";
import type { SavedCampaign } from "@/lib/campaign-drafts";
import { BrandShortlists } from "@/components/brand/shortlists";
import { CreatorDiscovery } from "@/components/brand/creator-discovery";
import { useTranslation } from "@/lib/i18n/language-context";

type Tab = "discovery" | "campaigns" | "shortlists" | "how_it_works";

export default function BrandDashboardPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("discovery");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folderEditor, setFolderEditor] = useState<{ folder?: CampaignFolder } | null>(null);
  const [editor, setEditor] = useState<{ id: string | null; parentId?: string } | null>(null);
  const [action, setAction] = useState<{ id: string; action: CampaignAction } | null>(null);
  const [moving, setMoving] = useState<SavedCampaign | null>(null);
  const [shortlistId, setShortlistId] = useState<string | undefined>(undefined);
  const [activity, setActivity] = useState<{ id: string; title: string; kind?: "applications" | "invitations" } | null>(null);
  const [notice, setNotice] = useState("");
  const offerState = useBrandCampaigns();
  const folderState = useCampaignFolders(offerState.campaigns?.[0]?.organization_id);
  const offers = offerState.campaigns || [];
  const folders = folderState.folders || [];
  const folder = folderId === unassignedCampaign
    ? { id: unassignedCampaign, title: "Unassigned offers", objective: "Move your existing offers into a campaign to organise your work." }
    : folders.find(item => item.id === folderId);
  const selectedOffers = folderId ? offersInCampaign(offers, folderId) : [];
  const loading = offerState.loading || folderState.loading;
  const error = offerState.error || folderState.error;

  function selectTab(tab: Tab) {
    setActiveTab(tab); setFolderId(null); setActivity(null); setNotice("");
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}${tab === "how_it_works" ? "#how-it-works" : tab === "discovery" ? "" : `#${tab}`}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
  function openCampaign(id: string) {
    setActiveTab("campaigns"); setFolderId(id); setActivity(null); setNotice("");
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}#campaigns/${encodeURIComponent(id)}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
  function viewActivity(offer: SavedCampaign, kind?: "applications" | "invitations") {
    const parent = offer.parent_campaign_id || offers.find(item => item.id === offer.id)?.parent_campaign_id;
    openCampaign(parent || unassignedCampaign);
    setActivity({ id: offer.id, title: offer.title, kind });
  }
  function retryAll() { offerState.retry(); folderState.retry(); }

  const recordCampaignOpen = folderState.recordOpen;
  useEffect(() => {
    if (folderId) recordCampaignOpen(folderId);
  }, [folderId, recordCampaignOpen]);

  useEffect(() => {
    const restore = () => {
      const hash = window.location.hash;
      const inCampaigns = hash === "#campaigns" || hash.startsWith("#campaigns/");
      const id = hash.startsWith("#campaigns/") ? hash.slice("#campaigns/".length) : null;
      setActiveTab(inCampaigns ? "campaigns" : hash === "#how-it-works" ? "how_it_works" : hash === "#shortlists" ? "shortlists" : "discovery");
      setFolderId(id);
      if (!id) setActivity(null);
    };
    const timer = window.setTimeout(restore, 0);
    window.addEventListener("hashchange", restore);
    window.addEventListener("popstate", restore);
    return () => { window.clearTimeout(timer); window.removeEventListener("hashchange", restore); window.removeEventListener("popstate", restore); };
  }, []);

  useEffect(() => {
    try {
      const email = localStorage.getItem("flenzr_account_email") || "";
      localStorage.setItem("flenzr_auth_session", JSON.stringify({ email, fullName: "Brand Portal", handle: "", role: "brand" }));
    } catch {}
  }, []);

  const insideCampaign = activeTab === "campaigns" && !!folder && folderId !== unassignedCampaign;
  function create() {
    setNotice("");
    if (insideCampaign && folderId) setEditor({ id: null, parentId: folderId });
    else setFolderEditor({});
  }

  return <main className="fl-brand-dashboard">
    {activeTab !== "how_it_works" && <div className="fl-brand-page-heading"><div>
      <h1>{activeTab === "discovery" ? "Discover creators" : activeTab === "shortlists" ? "Shortlists" : folderId ? folder?.title || "Campaign" : "Campaigns"}</h1>
      <p>{activeTab === "discovery" ? "Find the right creators for your next collaboration." : activeTab === "shortlists" ? "Keep your favourite creators organised." : folderId ? "Manage the offers, briefs and creator applications in this campaign." : "Organise your campaigns and create offers within each one."}</p>
    </div><button type="button" onClick={create} disabled={offerState.missingOrganization || loading} title={offerState.missingOrganization ? "Set up your brand profile first" : undefined} className="theme-on-accent h-9 px-3 rounded-lg text-xs font-semibold bg-[color:var(--ui-paint-c1121f)] hover:bg-[color:var(--ui-paint-a50e1a)] text-[color:var(--ui-ink-ffffff)] transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"><Plus className="w-3.5 h-3.5" /><span>{t(insideCampaign ? "New Offer" : "New campaign")}</span></button></div>}
    <div className="fl-brand-section-content">
      {activeTab === "how_it_works" && <HowItWorks audience="brand" />}
      {activeTab === "shortlists" && <BrandShortlists key={shortlistId || "groups"} initialId={shortlistId} onManageCampaigns={() => selectTab("campaigns")} onViewCampaign={offer => viewActivity(offer, "invitations")} />}
      {activeTab === "discovery" && <CreatorDiscovery onViewShortlist={group => { setShortlistId(group.id); selectTab("shortlists"); }} onManageCampaigns={() => selectTab("campaigns")} onViewCampaign={offer => viewActivity(offer, "invitations")} />}
      {notice && <p className="fl-campaign-notice" role="status">{notice}</p>}
      {activeTab === "campaigns" && <>
        {loading || error || offerState.missingOrganization ? <CampaignFoldersLoading loading={loading} error={error} missingOrganization={offerState.missingOrganization} retry={retryAll} /> : <>
          {!folderId && <CampaignFolderGrid unassignedLastOpenedAt={folderState.unassignedLastOpenedAt} folders={folders} offers={offers} onOpen={openCampaign} onCreate={() => setFolderEditor({})} />}
          {folderId && !folder && <div className="fl-campaign-state" role="alert"><p>This campaign could not be found.</p><button type="button" onClick={() => selectTab("campaigns")}>All campaigns</button></div>}
          {folder && <>
            <CampaignFolderOverview folder={folder} offers={selectedOffers} onBack={() => selectTab("campaigns")} onEdit={folderId !== unassignedCampaign ? () => setFolderEditor({ folder: folder as CampaignFolder }) : undefined} />
            {activity ? <CampaignActivity key={`${activity.id}:${activity.kind || "applications"}`} initialKind={activity.kind} audience="brand" campaignId={activity.id} campaignTitle={activity.title} onBack={() => { setActivity(null); offerState.retry(); }} /> : <CampaignList {...offerState} campaigns={selectedOffers} onActivity={offer => viewActivity(offer)} onOpen={id => { setNotice(""); setEditor({ id }); }} onAction={(offer, nextAction) => { setNotice(""); setAction({ id: offer.id, action: nextAction }); }} onMove={setMoving} />}
          </>}
        </>}
      </>}
      {folderEditor && <CampaignFolderDialog key={folderEditor.folder?.id || "new-campaign"} folder={folderEditor.folder} onClose={() => setFolderEditor(null)} onSaved={saved => { folderState.retry(); setFolderEditor(null); openCampaign(saved.id); setNotice(folderEditor.folder ? "Campaign updated." : "Campaign created. Add your first offer below."); }} />}
      {moving && <MoveOfferDialog offer={moving} folders={folders} onClose={() => setMoving(null)} onSaved={saved => { offerState.saved(saved); setMoving(null); setNotice(`Offer moved to ${folders.find(item => item.id === saved.parent_campaign_id)?.title || "campaign"}.`); }} />}
      {action && <CampaignLifecycleDialog key={`${action.id}:${action.action}`} campaignId={action.id} action={action.action} onClose={() => setAction(null)} onReloaded={offerState.retry} onEdit={id => { setAction(null); setEditor({ id }); }} onSaved={offer => { offerState.saved(offer); setNotice(campaignActionInfo[action.action].done); }} />}
      {editor && <CampaignDraftDialog key={editor.id || `new-${editor.parentId}`} campaignId={editor.id} parentCampaignId={editor.parentId} onReloaded={offerState.retry} onClose={() => setEditor(null)} onSaved={offer => { offerState.saved(offer); setEditor(null); if (offer.parent_campaign_id) openCampaign(offer.parent_campaign_id); setNotice("Offer draft saved."); }} />}
    </div>
  </main>;
}
