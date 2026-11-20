"use client";

import { useEffect, useRef, useState } from "react";
import type { Organization } from "@/lib/api";
import { brandProfileFields, brandProfileRequest, emptyBrandProfile, type BrandProfileFields } from "@/lib/brand-profile";
import "./brand-profile.css";

export function BrandProfileEditor() {
  const [fields, setFields] = useState<BrandProfileFields>(emptyBrandProfile);
  const [saved, setSaved] = useState<BrandProfileFields>(emptyBrandProfile);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const saving = useRef(false);
  const dirty = JSON.stringify(fields) !== JSON.stringify(saved);

  useEffect(() => {
    let cancelled = false;
    brandProfileRequest("GET").then((org) => {
      if (cancelled) return;
      setOrganization(org);
      const initial = org ? brandProfileFields(org) : emptyBrandProfile;
      setFields(initial); setSaved(initial); setError(""); setLoaded(true); setLoading(false);
    }).catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [attempt]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const org = await brandProfileRequest(organization ? "PATCH" : "POST", fields);
      if (!org) throw new Error("Could not save your brand profile. Please retry.");
      const next = brandProfileFields(org);
      setOrganization(org); setFields(next); setSaved(next); setMessage("Brand profile saved.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save your brand profile. Please retry."); }
    finally { saving.current = false; setBusy(false); }
  }
  function field(key: keyof BrandProfileFields, label: string, maxLength: number, required = false, type = "text") {
    return <label className="fl-brand-profile-field" key={key}><span>{label}{!required && <small>Optional</small>}</span><input
      name={key} type={type} value={fields[key]} maxLength={maxLength} required={required}
      minLength={required && type !== "email" ? 2 : undefined}
      pattern={required && type === "text" ? ".*\\S.*\\S.*" : undefined}
      placeholder={key === "website" ? "https://yourcompany.com" : undefined}
      onChange={(event) => { setFields({ ...fields, [key]: event.target.value }); setMessage(""); }} /></label>;
  }
  if (loading) return <p role="status">Loading brand profile…</p>;
  if (!loaded && error) return <div role="alert"><p>{error}</p><button type="button" onClick={() => { setLoading(true); setError(""); setAttempt(attempt + 1); }}>Retry loading</button></div>;
  return <form className="fl-brand-profile-editor" onSubmit={submit}>
    <div className="fl-brand-profile-summary"><div className="fl-brand-profile-avatar" aria-hidden="true">{(saved.name || "B").slice(0, 1).toUpperCase()}</div><div><h2>{organization ? saved.name : "Set up your brand"}</h2><p>{organization ? `Workspace · ${organization.slug}` : "Add your company details to get started."}</p></div></div>
    <fieldset disabled={busy}><legend>Company details</legend><div className="fl-brand-profile-grid">
      {field("name", "Brand name", 255, true)}{field("company_name", "Company name", 255, true)}
      {field("billing_email", "Billing email", 255, true, "email")}{field("industry", "Industry", 128)}
      {field("website", "Website", 1024, false, "url")}
      <label className="fl-brand-profile-field fl-brand-profile-description"><span>About your brand<small>Optional</small></span><textarea name="description" rows={4} maxLength={5000} value={fields.description} onChange={(event) => { setFields({ ...fields, description: event.target.value }); setMessage(""); }} /><small>{fields.description.length.toLocaleString()} / 5,000 characters</small></label>
    </div></fieldset>
    {error && <p className="fl-brand-profile-error" role="alert">{error}</p>}
    <p className="fl-brand-profile-feedback" role="status">{message || (dirty ? "You have unsaved changes." : "")}</p>
    <div className="fl-brand-profile-actions"><button type="button" disabled={!dirty || busy} onClick={() => { setFields(saved); setError(""); setMessage(""); }}>Discard changes</button><button type="submit" disabled={busy || !dirty}>{busy ? "Saving…" : "Save profile"}</button></div>
  </form>;
}
