"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, Search, UserPlus, X } from "lucide-react";
import { avatarProxyUrl } from "@/lib/collaboration-messages";
import type { DiscoveryPage } from "@/lib/creator-discovery";

export interface SelectedCreator {
  id: string | null; // null when added manually by handle
  handle: string;
  display_name: string;
  avatar_url?: string | null;
  niche?: string | null;
}

interface CreatorMultiSelectProps {
  selected: SelectedCreator[];
  onChange: (next: SelectedCreator[]) => void;
  disabled?: boolean;
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || "").join("") || "C";
}

export function CreatorMultiSelect({ selected, onChange, disabled }: CreatorMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SelectedCreator[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Debounced live search against /api/discovery/creators
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setSearchError("");
      try {
        const params = new URLSearchParams({ limit: "12", offset: "0" });
        const trimmed = query.trim().replace(/^@/, "");
        if (trimmed) params.set("q", trimmed);
        const res = await fetch(`/api/discovery/creators?${params}`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error("Could not search creators.");
        const page = (await res.json()) as DiscoveryPage;
        if (!controller.signal.aborted) {
          setResults(page.items.map(item => ({
            id: null,
            handle: item.handle,
            display_name: item.display_name,
            avatar_url: item.avatar_url,
            niche: item.niche,
          })));
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setSearchError(err instanceof Error ? err.message : "Could not search creators.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const selectedHandles = new Set(selected.map(item => item.handle.toLowerCase()));

  function toggle(creator: SelectedCreator) {
    const key = creator.handle.toLowerCase();
    if (selectedHandles.has(key)) {
      onChange(selected.filter(item => item.handle.toLowerCase() !== key));
    } else {
      onChange([...selected, creator]);
    }
    setQuery("");
    inputRef.current?.focus();
  }

  function remove(handle: string) {
    onChange(selected.filter(item => item.handle.toLowerCase() !== handle.toLowerCase()));
  }

  const cleanQuery = query.trim().replace(/^@/, "");
  const canAddManual = Boolean(
    cleanQuery.length >= 2
    && /^[a-zA-Z0-9._-]+$/.test(cleanQuery)
    && !selectedHandles.has(cleanQuery.toLowerCase())
    && !results.some(r => r.handle.toLowerCase() === cleanQuery.toLowerCase()),
  );

  return <div className="fl-creator-picker" ref={rootRef}>
    <div
      className="fl-creator-picker-control"
      data-open={open}
      data-disabled={Boolean(disabled)}
      onClick={() => { if (!disabled) { setOpen(true); inputRef.current?.focus(); } }}
    >
      <div className="fl-creator-picker-chips">
        {selected.map(creator => (
          <span key={creator.handle} className="fl-creator-chip">
            <span>@{creator.handle}</span>
            <button
              type="button"
              disabled={disabled}
              aria-label={`Remove @${creator.handle}`}
              onClick={event => { event.stopPropagation(); remove(creator.handle); }}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="fl-creator-picker-input"
          name="offer-invite-search"
          autoComplete="off"
          disabled={disabled}
          placeholder={selected.length ? "Add more creators…" : "Search creators by name or @handle…"}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={event => { setQuery(event.target.value); setOpen(true); }}
          onKeyDown={event => {
            if (event.key === "Backspace" && !query && selected.length) {
              remove(selected[selected.length - 1].handle);
            }
          }}
        />
      </div>
      <ChevronDown size={15} className="fl-creator-picker-chevron" aria-hidden="true" />
    </div>

    {open && !disabled && <div className="fl-creator-dropdown" role="listbox" aria-multiselectable="true" aria-label="Select creators to invite">
      <div className="fl-creator-dropdown-bar">
        <Search size={12} aria-hidden="true" />
        <span>{loading ? "Searching creators…" : results.length ? `${results.length} matching ${results.length === 1 ? "creator" : "creators"}` : "No matching creators"}</span>
      </div>
      {searchError && <p className="fl-creator-dropdown-msg" role="alert">{searchError}</p>}
      <div className="fl-creator-dropdown-list">
        {results.map(creator => {
          const checked = selectedHandles.has(creator.handle.toLowerCase());
          const src = avatarProxyUrl(creator.avatar_url);
          return <button
            key={creator.handle}
            type="button"
            role="option"
            aria-selected={checked}
            className="fl-creator-option"
            data-selected={checked}
            onClick={() => toggle(creator)}
          >
            <span className="fl-creator-option-avatar" aria-hidden="true">
              <span>{initials(creator.display_name)}</span>
              {src && <Image src={src} alt="" width={28} height={28} unoptimized onError={e => { e.currentTarget.hidden = true; }} />}
            </span>
            <span className="fl-creator-option-copy">
              <strong>{creator.display_name}</strong>
              <small>@{creator.handle}{creator.niche ? ` · ${creator.niche}` : ""}</small>
            </span>
            <span className="fl-creator-option-check" aria-hidden="true">{checked && <Check size={13} />}</span>
          </button>;
        })}
        {canAddManual && <button
          type="button"
          role="option"
          aria-selected={false}
          className="fl-creator-option fl-creator-option-manual"
          onClick={() => toggle({ id: null, handle: cleanQuery, display_name: `@${cleanQuery}` })}
        >
          <span className="fl-creator-option-avatar" aria-hidden="true"><UserPlus size={13} /></span>
          <span className="fl-creator-option-copy">
            <strong>Add @{cleanQuery}</strong>
            <small>Invite by exact Flenzr handle</small>
          </span>
        </button>}
      </div>
    </div>}
  </div>;
}
