"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Loader2, X } from "lucide-react";
import { FacebookIcon } from "./creator-profile-header";
import "./facebook-page-selection.css";

interface PageChoice { id: string; name: string; avatarUrl?: string | null }

export function FacebookPageSelection({ onConnected, onCancel }: { onConnected: () => void; onCancel: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [pages, setPages] = useState<PageChoice[]>([]);
  const [selectionId, setSelectionId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const element = dialog.current;
    element?.showModal();
    const load = async () => {
      try {
        const response = await fetch("/api/account/creators/me/facebook/pending-pages", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw Error(data.error?.message || "Could not load your Facebook Pages.");
        if (active) { setPages(data.pages); setSelectionId(data.selectionId); }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Could not load your Facebook Pages."); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; element?.close(); };
  }, []);

  const cancel = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/account/creators/me/facebook/pending-pages", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw Error(data.error?.message || "Could not cancel Page selection. Please retry.");
      onCancel();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not cancel Page selection.");
      setSaving(false);
    }
  };

  const connect = async () => {
    if (!selected.length || saving || !selectionId) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/account/creators/me/facebook/select", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection_id: selectionId, page_ids: selected }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error?.message || "Could not connect these Facebook Pages.");
      onConnected();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not connect these Facebook Pages.");
      setSaving(false);
    }
  };

  return (
    <dialog ref={dialog} className="facebook-pages-dialog" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); void cancel(); }}>
      <header>
        <span className="facebook-pages-dialog-brand"><FacebookIcon className="h-4 w-4" /></span>
        <div><h3 id={titleId}>Choose your Pages</h3><p>Select up to 20 Facebook Pages to add to Flenzr.</p></div>
        <button type="button" aria-label="Cancel Page selection" disabled={saving} onClick={cancel}><X size={16} /></button>
      </header>
      {loading ? <p className="facebook-pages-dialog-loading" role="status"><Loader2 size={14} className="animate-spin" />Loading your Pages…</p> : (
        <div className="facebook-pages-dialog-list">
          {pages.map((page) => (
            <label key={page.id} data-selected={selected.includes(page.id)}>
              <span className="facebook-pages-dialog-avatar">
                <FacebookIcon className="h-4 w-4" />
                {page.avatarUrl?.startsWith("/api/proxy-image?") && <Image src={page.avatarUrl} width={36} height={36} unoptimized alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
              </span>
              <span className="facebook-pages-dialog-page"><strong>{page.name}</strong><a href={`https://www.facebook.com/${encodeURIComponent(page.id)}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>View Page <ArrowUpRight size={10} /></a></span>
              <input type="checkbox" aria-label={`Select ${page.name}`} checked={selected.includes(page.id)} disabled={saving || (!selected.includes(page.id) && selected.length >= 20)} onChange={(event) => {
                setSelected((current) => event.target.checked ? [...current, page.id] : current.filter((id) => id !== page.id));
              }} />
            </label>
          ))}
        </div>
      )}
      {error && <p className="facebook-pages-dialog-error" role="alert">{error}</p>}
      <footer>
        <span>{selected.length} selected</span>
        <button type="button" disabled={saving} onClick={cancel}>Cancel</button>
        <button type="button" disabled={loading || saving || !selected.length} onClick={connect}>{saving ? <Loader2 size={13} className="animate-spin" /> : null}{saving ? "Saving…" : selected.length === 1 ? "Connect Page" : "Connect Pages"}</button>
      </footer>
    </dialog>
  );
}
