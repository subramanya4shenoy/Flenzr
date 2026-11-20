"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award, BookOpen, Briefcase, Calendar, Compass, DollarSign, ExternalLink, LayoutDashboard,
  Link2, PanelLeftClose, TrendingUp, Wallet, Wand2,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useTranslation } from "@/lib/i18n/language-context";
import { EnquiryUnreadBadge, useEnquiryActivity } from "@/components/enquiries/enquiry-activity";
import "./creator-sidebar.css";

const ITEMS = [
  { id: "overview", label: "Overview", title: "Studio Overview", icon: LayoutDashboard, group: 0 },
  { id: "pipeline", label: "Collabs", title: "Collab Pipeline", icon: Briefcase, group: 0 },
  { id: "opportunities", label: "Opportunities", title: "Campaign Opportunities", icon: Compass, group: 0 },
  { id: "ratecards", label: "Rate Cards", title: "Rate Cards & Packages", icon: DollarSign, group: 0 },
  { id: "calendar", label: "Calendar", title: "Collaboration Calendar", icon: Calendar, group: 0 },
  { id: "analytics", label: "Analytics", title: "Analytics", icon: TrendingUp, group: 1 },
  { id: "portfolio", label: "Portfolio", title: "Portfolio", icon: Award, group: 1 },
  { id: "links", label: "Links & QR", title: "Smart Links & Dynamic QR", icon: Link2, group: 1 },
  { id: "wallet", label: "Wallet", title: "Flenzr Vault", icon: Wallet, group: 2 },
  { id: "how_it_works", label: "How it works", title: "How it works", icon: BookOpen, group: 2 },
  { id: "ai_pitcher", label: "AI Pitcher", title: "AI Pitcher", icon: Wand2, group: 2 },
] as const;

export type CreatorDashboardTab = (typeof ITEMS)[number]["id"];

interface CreatorSidebarProps {
  activeTab: CreatorDashboardTab;
  onSelect: (tab: CreatorDashboardTab) => void;
  creatorHandle: string;
}

export function CreatorSidebar({ activeTab, onSelect, creatorHandle }: CreatorSidebarProps) {
  const { t } = useTranslation();
  const enquiryActivity = useEnquiryActivity();
  const [expanded, setExpanded] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const selectedIndex = ITEMS.findIndex((item) => item.id === activeTab);
  const highlightedIndex = hoveredIndex ?? focusedIndex ?? selectedIndex;
  // Rows are 32px with 2px gaps. Each group divider adds 13px inside its row wrapper.
  const highlightTop = highlightedIndex * 34 + ITEMS[highlightedIndex].group * 13;

  return (
    <aside className="creator-sidebar" data-expanded={expanded} aria-label="Creator sidebar">
      <div className="creator-sidebar-body">
        <div className="creator-sidebar-header">
          <button type="button" onClick={() => onSelect("overview")} className="creator-sidebar-brand" aria-label="Creator Studio & Profile">
            <span className="creator-sidebar-logo"><Logo size={20} variant="duotone-dark" /></span>
            <span className="creator-sidebar-label creator-sidebar-brandLabel" aria-hidden="true">{t("Studio")}</span>
          </button>
          <button
            type="button"
            className="creator-sidebar-toggle"
            onClick={() => setExpanded((value) => !value)}
            aria-label={expanded ? "Collapse menu" : "Expand menu"}
            title={expanded ? "Collapse menu" : "Expand menu"}
            aria-expanded={expanded}
            aria-controls="creator-navigation"
          >
            <PanelLeftClose className="creator-sidebar-toggleIcon" aria-hidden="true" />
          </button>
        </div>

        <div className="creator-sidebar-scroller">
          <nav
            id="creator-navigation"
            aria-label="Creator navigation"
            className="creator-sidebar-navigation"
            onPointerLeave={() => setHoveredIndex(null)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setFocusedIndex(null);
            }}
          >
            <span className="creator-sidebar-highlight" style={{ transform: `translate3d(0, ${highlightTop}px, 0)` }} aria-hidden="true" />
            {ITEMS.map((item, index) => {
              const Icon = item.icon;
              const unread = item.id === "pipeline" ? enquiryActivity?.counts?.received || 0 : 0;
              const itemLabel = t(item.title) + (unread ? ` · ${unread} unread enquiries` : "");
              return (
                <div key={item.id} className="creator-sidebar-itemGroup">
                  {index > 0 && ITEMS[index - 1].group !== item.group && <div className="creator-sidebar-divider" aria-hidden="true" />}
                  <button
                    type="button"
                    className="creator-sidebar-item"
                    onClick={() => onSelect(item.id)}
                    onPointerEnter={(event) => { if (event.pointerType !== "touch") setHoveredIndex(index); }}
                    onFocus={() => setFocusedIndex(index)}
                    title={expanded ? undefined : itemLabel}
                    aria-label={itemLabel}
                    aria-current={activeTab === item.id ? "page" : undefined}
                  >
                    <span className="creator-sidebar-icon"><Icon size={14} aria-hidden="true" /></span>
                    <span className="creator-sidebar-label" aria-hidden="true">{t(item.label)}</span>
                    {item.id === "pipeline" && <EnquiryUnreadBadge view="received" className="creator-sidebar-count" />}
                  </button>
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="creator-sidebar-footer">
        <Link href={`/${creatorHandle}`} target="_blank" className="creator-sidebar-item creator-sidebar-publicLink" title={t("View Public Media Kit")} aria-label={t("View Public Media Kit")}>
          <span className="creator-sidebar-icon"><ExternalLink size={14} aria-hidden="true" /></span>
          <span className="creator-sidebar-label" aria-hidden="true">{t("Media Kit")}</span>
        </Link>
      </div>
    </aside>
  );
}
