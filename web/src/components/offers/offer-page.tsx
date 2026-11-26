"use client";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Check, CheckCircle2, ChevronDown, ChevronRight, Copy, FileText, Globe2, History as HistoryIcon, LockKeyhole,
  PauseCircle, Pencil, Play, Rocket, Settings2, UserPlus, Users, X, XCircle,
} from "lucide-react";
import { offerRequest, type PublicOffer, type OfferWorkspace, type OfferApplication } from "@/lib/offers";
import { campaignMoney, campaignRequest, draftBudgetCents, type SavedCampaign } from "@/lib/campaign-drafts";
import { campaignFolderHref } from "@/lib/campaign-folders";
import { offerTicketArtwork, offerTicketPattern } from "@/lib/offer-ticket-pattern";
import { avatarProxyUrl } from "@/lib/collaboration-messages";
import { Logo } from "@/components/ui/logo";
import { campaignActions, type CampaignAction } from "@/lib/campaign-lifecycle";
import { CampaignLifecycleDialog } from "@/components/brand/campaign-lifecycle";
import { CampaignDraftDialog } from "@/components/brand/campaign-drafts";
import { StartCollaboration } from "@/components/collaborations/start-collaboration";
import { CreatorMultiSelect, type SelectedCreator } from "./creator-multi-select";
import { WorkspaceLoader } from "@/components/ui/workspace-loader";
import "@/components/brand/campaign-folders.css";
import "./offers.css";
import "./offer-workspace.css";

const label: Record<string, string> = { draft: "Draft", active: "Open for applications", paused: "Paused", completed: "Closed", cancelled: "Cancelled", expired: "Expired", pending: "Under review", accepted: "Selected · agreement next", rejected: "Declined", withdrawn: "Withdrawn" };
const date = (value: string | null) => value ? new Date(value.slice(0, 10) + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "To discuss";

export function OfferDocument({ offer, topBar, children }: { offer: PublicOffer; topBar?: React.ReactNode; children?: React.ReactNode }) {
  const artwork = offerTicketArtwork[offerTicketPattern(offer.id)];
  const logoSrc = avatarProxyUrl(offer.brand_logo_url);
  const [logoFailed, setLogoFailed] = useState(false);
  return <article className="fl-offer-document">
    <header className="fl-offer-hero" data-artwork={artwork} data-state={offer.status}>
      {topBar}
      <div className="fl-offer-meta">
        <span className="fl-offer-wordmark"><Logo size={17} variant="monochrome" /> FLENZR <span>/ OFFER · {offer.id.slice(0, 8).toUpperCase()}</span></span>
        <span className="fl-offer-state" data-state={offer.status}>{label[offer.status]}</span>
      </div>
      <div className="fl-offer-brand">
        <span className="fl-offer-brand-logo">
          {logoSrc && !logoFailed
            ? <Image key={logoSrc} src={logoSrc} alt={offer.brand_name} width={44} height={44} unoptimized onError={() => setLogoFailed(true)} />
            : <span>{offer.brand_name.slice(0, 1).toUpperCase()}</span>}
        </span>
        <div><small>AN OFFER FROM</small><strong>{offer.brand_name}</strong></div>
      </div>
      <h1>{offer.title}</h1>
      <div className="fl-offer-tags">
        <span>{offer.visibility === "public" ? <Globe2 size={12} /> : <LockKeyhole size={12} />}{offer.visibility === "public" ? "Public Offer" : "Invitation only"}</span>
        {offer.niche && <span>{offer.niche}</span>}
        <span><Users size={12} /> Multiple creators can be selected</span>
      </div>
    </header>
    <div className="fl-offer-terms">
      <div><small>TOTAL PLANNED BUDGET</small><strong>{campaignMoney(offer.budget_cents, offer.currency)}</strong><span>Individual creator quotes are agreed separately.</span></div>
      <div><small>APPLICATIONS CLOSE</small><strong>{offer.ends_at ? date(offer.ends_at) : "Open-ended"}</strong><span>Deadline for new creator pitches.</span></div>
      <div><small>PLANNED START</small><strong>{date(offer.starts_at)}</strong><span>Final timeline confirmed in agreement.</span></div>
    </div>
    <div className="fl-offer-brief">
      <section><h2>The opportunity</h2><p>{offer.brief || "The brand is still preparing this brief."}</p></section>
      <section><h2>What you’ll create</h2><p>{offer.deliverables || "Deliverables are being prepared."}</p></section>
    </div>
    <div className="fl-offer-journey" aria-label="Offer journey"><span>01 · Apply</span><i>→</i><span>02 · Negotiate</span><i>→</i><span>03 · Both agree</span><i>→</i><span>04 · Collaborate</span></div>
    <p className="fl-offer-note">Applying doesn’t reserve work or charge anyone. Selection opens a collaboration; both people still confirm a shared agreement. Payments aren’t live yet.</p>
    {children}
  </article>;
}

type OfferSection = "overview" | "manage" | "applicants";
const offerSections = [
  { id: "overview", label: "Overview", icon: FileText },
  { id: "manage", label: "Manage", icon: Settings2 },
  { id: "applicants", label: "Applicants", icon: Users },
] as const;
function sectionFromHash(): OfferSection {
  const hash = window.location.hash.slice(1);
  return hash === "manage" || hash === "applicants" ? hash : "overview";
}

function ApplicantAvatar({ application }: { application: OfferApplication }) {
  const src = avatarProxyUrl(application.creator_avatar_url);
  const initials = application.creator_name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "C";
  return <span className="fl-offer-applicant-avatar" aria-hidden="true">
    <span>{initials}</span>
    {src && <Image key={src} src={src} alt="" width={30} height={30} unoptimized loading="lazy" onError={event => { event.currentTarget.hidden = true; }} />}
  </span>;
}

export function OfferWorkspacePage({ id }: { id: string }) {
  const [offer, setOffer] = useState<OfferWorkspace | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [page, setPage] = useState(1), [refreshing, setRefreshing] = useState(false);
  const [action, setAction] = useState<CampaignAction | null>(null), [response, setResponse] = useState<{ application: OfferApplication; action: string } | null>(null);
  const [historyApp, setHistoryApp] = useState<OfferApplication | null>(null);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [quote, setQuote] = useState(""), [pitch, setPitch] = useState(""), [selectedCreators, setSelectedCreators] = useState<SelectedCreator[]>([]), [invitationQuote, setInvitationQuote] = useState("");
  const [busy, setBusy] = useState(false), [share, setShare] = useState(""), [editing, setEditing] = useState(false);
  const saving = useRef(false);
  const [section, setSection] = useState<OfferSection>("overview");
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setSection(sectionFromHash());
    const timer = window.setTimeout(sync, 0);
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);
  function selectSection(next: OfferSection) {
    setSection(next);
    if (window.location.hash !== `#${next}`) {
      window.history.pushState(null, "", `${window.location.pathname}${window.location.search}#${next}`);
    }
  }
  function changeApplicantPage(next: number) {
    setRefreshing(true);
    setSelectedApplicantId(null);
    setPage(next);
  }
  const reload = useCallback(async () => {
    setRefreshing(true);
    try { setOffer(await offerRequest<OfferWorkspace>(`/${id}?page=${page}`)); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Could not load Offer."); }
    finally { setRefreshing(false); }
  }, [id, page]);
  useEffect(() => {
    const controller = new AbortController();
    offerRequest<OfferWorkspace>(`/${id}?page=${page}`, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) { setOffer(data); setError(""); }
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not load Offer."); })
      .finally(() => { if (!controller.signal.aborted) setRefreshing(false); });
    return () => controller.abort();
  }, [id, page]);
  async function apply(event: React.FormEvent) {
    event.preventDefault(); if (saving.current || !offer) return;
    saving.current = true; setBusy(true); setError("");
    try { const amount = draftBudgetCents(quote); if (amount < 100) throw Error("Enter a quote of at least 1 in the Offer’s currency."); await campaignRequest(`/${id}/apply`, { method: "POST", body: JSON.stringify({ proposed_rate_cents: amount, pitch_message: pitch.trim() || null, expected_campaign_revision: offer.revision }) }); setNotice("Application saved. Your pitch and quote are private to you and this brand."); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Application failed."); } finally { saving.current = false; setBusy(false); }
  }
  async function invite(event: React.FormEvent) {
    event.preventDefault();
    if (saving.current || !offer) return;
    if (!selectedCreators.length) { setError("Select at least one creator to invite."); return; }
    saving.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const amount = draftBudgetCents(invitationQuote);
      if (amount < 100) throw Error("Enter the quote for these creators.");
      const invitedHandles: string[] = [];
      const failed: { creator: SelectedCreator; reason: string }[] = [];
      for (const creator of selectedCreators) {
        try {
          let creatorId = creator.id;
          if (!creatorId) {
            const recipient = await campaignRequest<{ id: string }>(`/invitation-recipient/${encodeURIComponent(creator.handle.trim().replace(/^@/, ""))}`);
            creatorId = recipient.id;
          }
          await campaignRequest(`/${id}/invite`, { method: "POST", body: JSON.stringify({ creator_id: creatorId, offered_rate_cents: amount, message: "You’re invited to this Offer. Open the Offer page to review the brief and apply with your quote.", expected_campaign_revision: offer.revision }) });
          invitedHandles.push(`@${creator.handle}`);
        } catch (err) {
          failed.push({ creator, reason: err instanceof Error ? err.message : "Invitation failed." });
        }
      }
      if (invitedHandles.length) {
        setNotice(`Invited ${invitedHandles.join(", ")}. Share the Offer link so they can open and apply.`);
      }
      if (failed.length) {
        setError(failed.map(item => `@${item.creator.handle}: ${item.reason}`).join(" · "));
        setSelectedCreators(failed.map(item => item.creator));
      } else {
        setSelectedCreators([]);
        setInvitationQuote("");
      }
    }
    catch (e) { setError(e instanceof Error ? e.message : "Invitation failed."); } finally { saving.current = false; setBusy(false); }
  }
  async function copyShare() { if (offer?.status === "draft") { setShare(""); setNotice(""); setError("This Offer is still a draft. Publish it before sharing — creators can’t open drafts, even public ones."); return; } const url = window.location.origin + `/offers/${id}`; setShare(url); try { await navigator.clipboard.writeText(url); setNotice(offer?.visibility === "invited" ? "Link copied. Only invited creators can open this Offer." : "Public Offer link copied."); } catch { setNotice("Select and copy the share link below."); } }
  if (!offer) return <div className="fl-offer-page">{error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => void reload()}>Retry Offer</button></div> : <WorkspaceLoader label="Opening Offer…" />}</div>;
  const owned = offer.viewer_role === "brand";
  const selectedApplicant = owned ? offer.applications.find(app => app.id === selectedApplicantId) : null;
  const visibleApplications = selectedApplicant ? [selectedApplicant] : offer.applications;
  const fullBleed = owned && section === "overview";
  return <div className="fl-offer-workspace" data-owned={owned} data-applicants={owned && section === "applicants"}>
    {owned && <aside className="fl-offer-section-sidebar" aria-label="Offer navigation">
      <nav aria-label="Offer sections">
        {offerSections.map(item => <button key={item.id} type="button" className="fl-offer-section-link" aria-current={section === item.id ? "page" : undefined} aria-controls="offer-section-content" aria-label={item.label} title={item.label} onClick={() => selectSection(item.id)}>
          <item.icon size={16} aria-hidden="true" /><span className="fl-offer-section-label">{item.label}</span>
          {item.id === "applicants" && <span className="fl-offer-nav-count" aria-hidden="true">{offer.total_applications}</span>}
        </button>)}
      </nav>
    </aside>}
    {owned && <aside className="fl-offer-applicant-sidebar" aria-label="Offer applicants" hidden={section !== "applicants"}>
      <div className="fl-offer-applicant-heading"><strong>Applicants</strong><span>{offer.total_applications} total</span></div>
      <nav aria-label="Select applicant">
        <button type="button" className="fl-offer-applicant-link" aria-current={!selectedApplicant ? "true" : undefined} aria-controls="offer-section-content" onClick={() => setSelectedApplicantId(null)}>
          <span className="fl-offer-applicant-avatar" aria-hidden="true"><Users size={16} /></span><span><strong>All applicants</strong><small>Review this page of applications</small></span>
        </button>
        {offer.applications.map(app => <button key={app.id} type="button" className="fl-offer-applicant-link" aria-current={selectedApplicant?.id === app.id ? "true" : undefined} aria-controls="offer-section-content" onClick={() => setSelectedApplicantId(app.id)}>
          <ApplicantAvatar application={app} />
          <span><strong>{app.creator_name}</strong><small>{app.claimed ? "Claimed" : label[app.status]}</small></span>
        </button>)}
      </nav>
      {!offer.applications.length && <p className="fl-offer-applicant-empty">No applicants yet.</p>}
      {offer.total_applications > 20 && <div className="fl-offer-applicant-pagination">
        <button type="button" aria-label="Previous applicants page" disabled={page === 1 || refreshing} onClick={() => changeApplicantPage(page - 1)}>←</button>
        <span>{page} / {Math.ceil(offer.total_applications / 20)}</span>
        <button type="button" aria-label="Next applicants page" disabled={page * 20 >= offer.total_applications || refreshing} onClick={() => changeApplicantPage(page + 1)}>→</button>
      </div>}
    </aside>}
    <main className="fl-offer-page" id="offer-section-content" data-overview={fullBleed} aria-label={owned ? `${offer.title} · ${offerSections.find(item => item.id === section)?.label}` : undefined}>{(() => {
      const topBar = <div className="fl-offer-page-actions">
        {owned ? <nav className="fl-offer-breadcrumb" aria-label="Breadcrumb"><ol>
          <li><Link href="/dashboard/brand#campaigns">Campaigns</Link></li>
          <li aria-hidden="true"><ChevronRight size={13} /></li>
          <li><Link href={campaignFolderHref(offer.parent_campaign_id || "unassigned")}>{offer.parent_campaign_title || "Unassigned offers"}</Link></li>
          <li aria-hidden="true"><ChevronRight size={13} /></li>
          <li><button type="button" onClick={() => selectSection("overview")}>{offer.title}</button></li>
          <li aria-hidden="true"><ChevronRight size={13} /></li>
          <li>{section === "applicants" && selectedApplicant ? <button type="button" onClick={() => setSelectedApplicantId(null)}>Applicants</button> : <span aria-current="page">{offerSections.find(item => item.id === section)?.label}</span>}</li>
          {section === "applicants" && selectedApplicant && <><li aria-hidden="true"><ChevronRight size={13} /></li><li><span aria-current="page">{selectedApplicant.creator_name}</span></li></>}
        </ol></nav> : <Link href="/dashboard/creator#opportunities">← All Offers</Link>}
        <div><button type="button" onClick={() => void copyShare()}><Copy size={13} /> Share Offer</button><button type="button" disabled={refreshing} onClick={() => void reload()}>{refreshing ? "Refreshing…" : "Refresh Offer"}</button></div></div>;
      return <>
        {!fullBleed && topBar}
        {(!owned || section === "overview") && <OfferDocument offer={offer} topBar={fullBleed ? topBar : undefined} />}
      </>;
    })()}
      {error && <p className="fl-offer-error" role="alert">{error}</p>}{notice && <p className="fl-offer-notice" role="status"><Check size={14} />{notice}</p>}{share && <label className="fl-offer-share">{offer.visibility === "invited" ? "Private link · invited creators still need to sign in" : "Public share link"}<input readOnly value={share} onFocus={e => e.target.select()} /></label>}
      {owned && section !== "overview" && <header className="fl-offer-section-heading">
        <div className="fl-offer-section-title-row">
          <h1>{section === "manage" ? "Manage offer" : selectedApplicant?.creator_name || "Applicants"}</h1>
          {section === "manage" && <span className="fl-offer-state" data-state={offer.status}>{label[offer.status]}</span>}
        </div>
        <p>{section === "manage" ? "Manage publication, lifecycle status, and creator invitations for this offer." : selectedApplicant ? `@${selectedApplicant.creator_handle} · Application and negotiation` : `${offer.total_applications} ${offer.total_applications === 1 ? "application" : "applications"} for this offer`}</p>
      </header>}
      {owned && section === "manage" && <div className="fl-manage-sections">
        <section className="fl-manage-section">
          <div className="fl-manage-section-head">
            <span className="fl-offer-eyebrow">CREATOR INVITATIONS</span>
            <h2>Invite a creator</h2>
            <p>{offer.accepting
              ? "Grant direct access by Flenzr handle with an individual quote, then share the Offer link with them."
              : "Publish or resume this Offer to send new creator invitations."}</p>
          </div>
          {offer.accepting && <form className="fl-manage-invite-form" onSubmit={invite}>
            <div className="fl-manage-field">
              <span className="fl-manage-field-label">Creators to invite</span>
              <CreatorMultiSelect selected={selectedCreators} onChange={setSelectedCreators} disabled={busy} />
            </div>
            <label>Quote per creator · {offer.currency}<input name="offer-invite-quote" inputMode="decimal" placeholder="e.g. 15000" required value={invitationQuote} onChange={e => setInvitationQuote(e.target.value)} /></label>
            <button type="submit" className="fl-manage-btn" data-tone="primary" disabled={busy || !selectedCreators.length}><UserPlus size={14} aria-hidden="true" /> {busy ? "Saving…" : selectedCreators.length > 1 ? `Invite ${selectedCreators.length} creators` : "Invite creator"}</button>
          </form>}
        </section>

        <section className="fl-manage-section">
          <div className="fl-manage-section-head">
            <span className="fl-offer-eyebrow">PUBLICATION &amp; LIFECYCLE</span>
            <h2>Offer controls</h2>
            <p>{offer.status === "draft"
              ? "Edit your draft details until everything is ready, then publish to accept creator applications."
              : "Published briefs stay locked so creators always apply to consistent terms. Existing collaborations keep their own agreements even if you pause or close intake."}</p>
          </div>
          <div className="fl-manage-actions">
            {offer.status === "draft" && <button type="button" className="fl-manage-btn" data-tone="edit" onClick={() => { setNotice(""); setError(""); setEditing(true); }}><Pencil size={14} aria-hidden="true" /> Edit draft</button>}
            {campaignActions((offer.status === "expired" ? "active" : offer.status) as SavedCampaign["status"]).map(a => {
              const meta = a === "publish"
                ? { text: "Publish Offer", icon: Rocket, tone: "primary" }
                : a === "resume"
                  ? { text: "Resume Offer", icon: Play, tone: "primary" }
                  : a === "pause"
                    ? { text: "Pause Offer", icon: PauseCircle, tone: "pause" }
                    : a === "close"
                      ? { text: "Close applications", icon: CheckCircle2, tone: "secondary" }
                      : { text: "Cancel Offer", icon: XCircle, tone: "danger" };
              const Icon = meta.icon;
              return <button key={a} type="button" className="fl-manage-btn" data-tone={meta.tone} onClick={() => setAction(a)}>
                <Icon size={14} aria-hidden="true" /> {meta.text}
              </button>;
            })}
          </div>
          {offer.status !== "draft" && <>
            <dl className="fl-manage-guide">
              <div><dt>Pause Offer</dt><dd>Temporarily hides the Offer from new applicants and stops new selections or counters. You can resume it anytime.</dd></div>
              <div><dt>Close applications</dt><dd>Permanently ends intake once you have the creators you need. Existing collaborations continue normally.</dd></div>
              <div><dt>Cancel Offer</dt><dd>Permanently withdraws this Offer and stops all pending applications. Already-started collaborations keep their saved records.</dd></div>
            </dl>
            <p className="fl-manage-hint">Need to change the brief, deliverables, or budget? Create a new Offer inside this campaign so existing applicants aren’t affected.</p>
          </>}
        </section>
      </div>}
      {!owned && !offer.applications.length && <section className="fl-applicants-flat"><span className="fl-offer-eyebrow">YOUR APPLICATION</span><h2>{offer.accepting ? "Bring your perspective to this Offer" : "Applications aren’t open"}</h2>{offer.invited && <p>You’ve been invited by the brand. Apply with your pitch and proposed quote.</p>}{offer.accepting && <form onSubmit={apply}><label>Your proposed quote · {offer.currency}<input name="offer-quote" inputMode="decimal" required value={quote} onChange={e => setQuote(e.target.value)} /></label><label>Why you’re a fit<textarea name="offer-pitch" rows={4} maxLength={5000} value={pitch} onChange={e => setPitch(e.target.value)} placeholder="Your idea, approach and what you can deliver." /></label><button type="submit" className="fl-manage-btn" data-tone="primary" disabled={busy}>{busy ? "Saving application…" : "Apply for Offer"}</button></form>}</section>}
      {((owned && section === "applicants") || (!owned && offer.applications.length > 0)) && <section className="fl-applicants-flat" aria-label="Offer applications">
        {!owned && <div className="fl-manage-section-head"><span className="fl-offer-eyebrow">PRIVATE TO YOU AND THE BRAND</span><h2>Your application</h2></div>}
        {owned && !selectedApplicant && <p className="fl-applicants-intro">Private to each creator and your brand. Click any row to inspect details, or act directly from the table.</p>}
        {!offer.applications.length && <p className="fl-applicants-empty">No applications yet. Share your Offer or invite creators from Manage.</p>}

        {owned && !selectedApplicant && offer.applications.length > 0 && <div className="fl-campaign-table-wrap" role="region" aria-label="All applicants" tabIndex={0}>
          <table className="fl-campaign-table fl-applicants-table">
            <thead><tr>
              <th scope="col">Applicant</th>
              <th scope="col">Status</th>
              <th scope="col">Quote</th>
              <th scope="col">Pitch</th>
              <th scope="col">History</th>
              <th scope="col"><span className="fl-campaign-visually-hidden">Actions</span></th>
            </tr></thead>
            <tbody>
              {offer.applications.map(app => {
                const expanded = expandedAppId === app.id;
                const toggleRow = () => setExpandedAppId(current => current === app.id ? null : app.id);
                return <Fragment key={app.id}>
                  <tr className="fl-applicants-main-row" data-expanded={expanded} onClick={event => { if (!(event.target as HTMLElement).closest("button, a")) toggleRow(); }}>
                    <td>
                      <div className="fl-offer-application-identity">
                        <span className="fl-applicants-expand-icon" data-expanded={expanded} aria-hidden="true"><ChevronDown size={14} /></span>
                        <ApplicantAvatar application={app} />
                        <div><strong>{app.creator_name}</strong><span>@{app.creator_handle}</span></div>
                      </div>
                    </td>
                    <td><span className="fl-offer-state" data-state={app.status === "accepted" ? "active" : app.status}>{app.claimed ? "Claimed" : label[app.status]}</span></td>
                    <td className="fl-applicants-table-quote">
                      <strong>{campaignMoney(app.amount_cents, offer.currency)}</strong>
                      <small>{app.revision ? `From ${app.proposed_by}` : "Initial quote"}</small>
                    </td>
                    <td className="fl-applicants-table-pitch" title={app.pitch || undefined}>{app.pitch || <span className="fl-campaign-table-muted">—</span>}</td>
                    <td>
                      <button type="button" className="fl-applicants-table-history" aria-expanded={expanded} onClick={toggleRow}>
                        <HistoryIcon size={12} aria-hidden="true" />
                        <span>{app.history.length ? `${app.history.length} ${app.history.length === 1 ? "update" : "updates"}` : "Details"}</span>
                      </button>
                    </td>
                    <td className="fl-applicants-table-actions">
                      {app.status === "pending" && <div className="fl-applicants-row-btns">
                        {offer.accepting && app.proposed_by !== offer.viewer_role && <button className="fl-manage-btn" data-tone="primary" type="button" onClick={() => setResponse({ application: app, action: "accept" })}>Select</button>}
                        {offer.accepting && <button className="fl-manage-btn" data-tone="secondary" type="button" onClick={() => setResponse({ application: app, action: "counter" })}>Counter</button>}
                        <button className="fl-manage-btn" data-tone="danger" type="button" onClick={() => setResponse({ application: app, action: "reject" })}>Decline</button>
                      </div>}
                      {app.status === "accepted" && (app.collaboration_id
                        ? <Link className="fl-applicant-collab-link" href={`/dashboard/collaborations/${app.collaboration_id}`}>Open collab →</Link>
                        : <StartCollaboration sourceKind="application" sourceId={app.id} />)}
                    </td>
                  </tr>
                  {expanded && <tr className="fl-applicants-expanded-row">
                    <td colSpan={6}>
                      <div className="fl-applicants-expanded-body">
                        <section className="fl-applicants-expanded-col">
                          <h4>Creator pitch</h4>
                          {app.pitch ? <p className="fl-applicants-expanded-pitch">{app.pitch}</p> : <p className="fl-applicants-expanded-empty">No pitch note was included with this application.</p>}
                        </section>
                        <section className="fl-applicants-expanded-col">
                          <h4>Negotiation history · {app.history.length} {app.history.length === 1 ? "update" : "updates"}</h4>
                          {app.history.length > 0 ? <ol className="fl-applicants-expanded-history">
                            {app.history.map((event, index) => (
                              <li key={index}>
                                <div>
                                  <strong>{event.author === "brand" ? "Brand" : "Creator"} · {event.action}</strong>
                                  <span>{campaignMoney(event.amount_cents, offer.currency)}</span>
                                </div>
                                <time>{new Date(event.at).toLocaleString()}</time>
                                {event.message && <p>{event.message}</p>}
                              </li>
                            ))}
                          </ol> : <p className="fl-applicants-expanded-empty">No negotiation updates yet.</p>}
                        </section>
                      </div>
                    </td>
                  </tr>}
                </Fragment>;
              })}
            </tbody>
          </table>
        </div>}

        {(!owned || selectedApplicant) && visibleApplications.length > 0 && <div className="fl-applicants-list" data-single="true">{visibleApplications.map(app => <article key={app.id} className="fl-applicant-row">
          <div className="fl-applicant-row-head">
            <div className="fl-offer-application-identity">
              <ApplicantAvatar application={app} />
              <div><h3>{app.creator_name}</h3><span>@{app.creator_handle}</span></div>
            </div>
            <span className="fl-offer-state" data-state={app.status === "accepted" ? "active" : app.status}>{app.claimed ? "Claimed · agreement saved" : label[app.status]}</span>
          </div>
          <div className="fl-applicant-quote">
            <strong>{campaignMoney(app.amount_cents, offer.currency)}</strong>
            <span>{app.revision ? `Latest terms from the ${app.proposed_by}` : "Creator’s initial quote"}</span>
          </div>
          {app.pitch && <p className="fl-applicant-pitch">{app.pitch}</p>}
          {app.history.length > 0 && <button type="button" className="fl-applicant-history-btn" onClick={() => setHistoryApp(app)}>
            <HistoryIcon size={13} aria-hidden="true" />
            <span>Negotiation history · {app.history.length} {app.history.length === 1 ? "update" : "updates"}</span>
            <ChevronRight size={13} aria-hidden="true" />
          </button>}
          {app.status === "pending" && <div className="fl-offer-controls">{offer.accepting && <>{app.proposed_by !== offer.viewer_role && <button className="fl-manage-btn" data-tone="primary" type="button" onClick={() => setResponse({ application: app, action: "accept" })}>{owned ? "Select creator at this quote" : "Accept brand’s counter-offer"}</button>}<button className="fl-manage-btn" data-tone="secondary" type="button" onClick={() => setResponse({ application: app, action: "counter" })}>Make counter-offer</button></>}<button className="fl-manage-btn" data-tone="danger" type="button" onClick={() => setResponse({ application: app, action: owned ? "reject" : "withdraw" })}>{owned ? "Decline application" : "Withdraw application"}</button></div>}
          {app.status === "accepted" && <div className="fl-applicant-selection"><p>{app.claimed ? "Both participants accepted the agreement. Continue in your shared collaboration for deliveries, reviews and publishing proof." : "Selected. Open the collaboration to confirm scope, price, rights and dates together. The Offer is claimed only after both accept the same agreement."}</p>{app.collaboration_id ? <Link className="fl-applicant-collab-link" href={`/dashboard/collaborations/${app.collaboration_id}`}>Open collaboration →</Link> : <StartCollaboration sourceKind="application" sourceId={app.id} />}</div>}
        </article>)}</div>}
      </section>}
      {historyApp && <NegotiationHistoryDialog application={historyApp} currency={offer.currency} onClose={() => setHistoryApp(null)} />}
      {response && <OfferResponseDialog offer={offer} application={response.application} action={response.action} onClose={() => setResponse(null)} onSaved={() => { setResponse(null); setNotice("Response saved. Your collaborator can review the latest terms."); void reload(); }} />}
      {action && <CampaignLifecycleDialog campaignId={id} action={action} onClose={() => setAction(null)} onReloaded={() => void reload()} onEdit={() => { setAction(null); setEditing(true); }} onSaved={() => { setAction(null); void reload(); }} />}
      {editing && <CampaignDraftDialog campaignId={id} onClose={() => setEditing(false)} onReloaded={reload} onSaved={() => { setEditing(false); setNotice("Offer draft saved."); void reload(); }} />}
    </main></div>;
}

function NegotiationHistoryDialog({ application, currency, onClose }: { application: OfferApplication; currency: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="fl-offer-dialog fl-history-dialog" aria-labelledby="negotiation-history-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="fl-history-dialog-head">
      <div>
        <h2 id="negotiation-history-title">Negotiation history</h2>
        <p>{application.creator_name} · @{application.creator_handle} · Current quote {campaignMoney(application.amount_cents, currency)}</p>
      </div>
      <button type="button" className="fl-history-dialog-close" aria-label="Close negotiation history" onClick={onClose}><X size={16} /></button>
    </div>
    <ol className="fl-history-timeline">
      {application.history.map((event, index) => (
        <li key={index}>
          <div className="fl-history-timeline-head">
            <strong>{event.author === "brand" ? "Brand" : "Creator"} · {event.action}</strong>
            <span>{campaignMoney(event.amount_cents, currency)}</span>
          </div>
          <time>{new Date(event.at).toLocaleString()}</time>
          {event.message && <p>{event.message}</p>}
        </li>
      ))}
    </ol>
  </dialog>;
}

function OfferResponseDialog({ offer, application, action, onClose, onSaved }: { offer: OfferWorkspace; application: OfferApplication; action: string; onClose: () => void; onSaved: () => void }) {
  const ref = useRef<HTMLDialogElement>(null), request = useRef(crypto.randomUUID()), saving = useRef(false);
  const [amount, setAmount] = useState((application.amount_cents / 100).toFixed(2)), [message, setMessage] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { ref.current?.showModal(); }, []);
  async function submit(event: React.FormEvent) { event.preventDefault(); if (saving.current) return; saving.current = true; setBusy(true); setError(""); try { await offerRequest(`/${offer.id}/applications/${application.id}/negotiate`, { method: "POST", body: JSON.stringify({ action, request_id: request.current, expected_revision: application.revision, expected_offer_revision: offer.revision, amount_cents: action === "counter" ? draftBudgetCents(amount) : null, message }) }); onSaved(); } catch (e) { setError(e instanceof Error ? e.message : "Response failed."); } finally { saving.current = false; setBusy(false); } }
  return <dialog ref={ref} className="fl-offer-dialog" aria-labelledby="offer-response-title" onCancel={e => { if (busy) e.preventDefault(); else onClose(); }}><div className="fl-offer-panel-heading"><h2 id="offer-response-title">{action === "counter" ? "Make a counter-offer" : action === "accept" ? "Accept these terms?" : action === "reject" ? "Decline this application?" : "Withdraw your application?"}</h2><button type="button" aria-label="Close response" disabled={busy} onClick={onClose}><X size={17} /></button></div><p>Current quote: <strong>{campaignMoney(application.amount_cents, offer.currency)}</strong>. This action does not charge or pay anyone.</p><form onSubmit={submit}>{action === "counter" && <label>Proposed quote · {offer.currency}<input name="offer-counter-quote" inputMode="decimal" required value={amount} onChange={e => { setAmount(e.target.value); request.current = crypto.randomUUID(); }} /></label>}<label>Message · optional<textarea name="offer-response-message" rows={3} maxLength={5000} value={message} onChange={e => { setMessage(e.target.value); request.current = crypto.randomUUID(); }} /></label>{error && <p role="alert" className="fl-offer-error">{error} Close this dialog and Refresh Offer to review newer terms.</p>}<div className="fl-offer-controls"><button type="button" disabled={busy} onClick={onClose}>Keep reviewing</button><button className="fl-offer-primary" type="submit" disabled={busy}>{busy ? "Saving…" : action === "counter" ? "Send counter-offer" : action === "accept" ? "Confirm selection" : action === "reject" ? "Confirm decline" : "Confirm withdrawal"}</button></div></form></dialog>;
}
