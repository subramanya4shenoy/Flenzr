"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, PanelLeftClose, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useTranslation } from "@/lib/i18n/language-context";
import "@/components/creator/creator-sidebar.css";

export interface DashboardNavItem {
  id: string;
  label: string;
  title: string;
  icon: LucideIcon;
  group: number;
  href?: string;
  unread?: number;
  badge?: ReactNode;
}

export function DashboardSidebar({ activeTab, items, audience, heading, onSelect, onHome, footer }: {
  activeTab: string;
  items: readonly DashboardNavItem[];
  audience: string;
  heading: string;
  onSelect: (item: DashboardNavItem) => void;
  onHome: () => void;
  footer?: { href: string; title: string; label: string };
}) {
  const navigationId = useId();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const selectedIndex = items.findIndex((item) => item.id === activeTab);
  const highlightedIndex = hoveredIndex ?? focusedIndex ?? selectedIndex;
  // Rows are 32px with 2px gaps. Each group divider adds 13px inside its row wrapper.
  const highlightTop = Math.max(0, highlightedIndex) * 34 + (items[highlightedIndex]?.group ?? 0) * 13;

  return (
    <aside className="creator-sidebar" data-expanded={expanded} aria-label={`${audience} sidebar`}>
      <div className="creator-sidebar-body">
        <div className="creator-sidebar-header">
          <button type="button" onClick={onHome} className="creator-sidebar-brand" aria-label={`${audience} workspace`}>
            <span className="creator-sidebar-logo"><Logo size={20} variant="duotone-dark" /></span>
            <span className="creator-sidebar-label creator-sidebar-brandLabel" aria-hidden="true">{t(heading)}</span>
          </button>
          <button
            type="button"
            className="creator-sidebar-toggle"
            onClick={() => setExpanded((value) => !value)}
            aria-label={expanded ? "Collapse menu" : "Expand menu"}
            title={expanded ? "Collapse menu" : "Expand menu"}
            aria-expanded={expanded}
            aria-controls={navigationId}
          >
            <PanelLeftClose className="creator-sidebar-toggleIcon" aria-hidden="true" />
          </button>
        </div>

        <div className="creator-sidebar-scroller">
          <nav
            id={navigationId}
            aria-label={`${audience} navigation`}
            className="creator-sidebar-navigation"
            onPointerLeave={() => setHoveredIndex(null)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setFocusedIndex(null);
            }}
          >
            <span className="creator-sidebar-highlight" style={{ transform: `translate3d(0, ${highlightTop}px, 0)`, opacity: highlightedIndex < 0 ? 0 : 1 }} aria-hidden="true" />
            {items.map((item, index) => {
              const Icon = item.icon;
              const unread = item.unread ?? 0;
              const itemLabel = t(item.title) + (unread ? ` · ${unread} unread enquiries` : "");
              return (
                <div key={item.id} className="creator-sidebar-itemGroup">
                  {index > 0 && items[index - 1].group !== item.group && <div className="creator-sidebar-divider" aria-hidden="true" />}
                  {item.href ? <Link
                    href={item.href}
                    className="creator-sidebar-item"
                    onClick={event => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                      event.preventDefault(); onSelect(item);
                    }}
                    onPointerEnter={(event) => { if (event.pointerType !== "touch") setHoveredIndex(index); }}
                    onFocus={() => setFocusedIndex(index)}
                    title={expanded ? undefined : itemLabel}
                    aria-label={itemLabel}
                    aria-current={activeTab === item.id ? "page" : undefined}
                  >
                    <span className="creator-sidebar-icon"><Icon size={14} aria-hidden="true" /></span>
                    <span className="creator-sidebar-label" aria-hidden="true">{t(item.label)}</span>{item.badge}
                  </Link> : <button
                    type="button" className="creator-sidebar-item" onClick={() => onSelect(item)}
                    onPointerEnter={(event) => { if (event.pointerType !== "touch") setHoveredIndex(index); }}
                    onFocus={() => setFocusedIndex(index)} title={expanded ? undefined : itemLabel}
                    aria-label={itemLabel} aria-current={activeTab === item.id ? "page" : undefined}
                  >
                    <span className="creator-sidebar-icon"><Icon size={14} aria-hidden="true" /></span>
                    <span className="creator-sidebar-label" aria-hidden="true">{t(item.label)}</span>{item.badge}
                  </button>}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {footer && <div className="creator-sidebar-footer">
        <Link href={footer.href} target="_blank" className="creator-sidebar-item creator-sidebar-publicLink" title={t(footer.title)} aria-label={t(footer.title)}>
          <span className="creator-sidebar-icon"><ExternalLink size={14} aria-hidden="true" /></span>
          <span className="creator-sidebar-label" aria-hidden="true">{t(footer.label)}</span>
        </Link>
      </div>}
    </aside>
  );
}
