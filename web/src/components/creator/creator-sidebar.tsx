"use client";

import {
  Award, Bell, BookOpen, Calendar, Compass, DollarSign, Handshake, Inbox, LayoutDashboard,
  Link2, TrendingUp, Wallet, Wand2,
} from "lucide-react";
import { DashboardSidebar } from "@/components/navigation/dashboard-sidebar";
import { EnquiryUnreadBadge, useEnquiryActivity } from "@/components/enquiries/enquiry-activity";

export const CREATOR_NAV_ITEMS = [
  { id: "overview", label: "Overview", title: "Studio Overview", icon: LayoutDashboard, group: 0 },
  { id: "collaborations", label: "Collabs", title: "Collaborations", icon: Handshake, group: 0 },
  { id: "pipeline", label: "Enquiries", title: "Enquiries & Activity", icon: Inbox, group: 0 },
  { id: "opportunities", label: "Offers", title: "Brand Offers", icon: Compass, group: 0 },
  { id: "ratecards", label: "Rate Cards", title: "Rate Cards & Packages", icon: DollarSign, group: 0 },
  { id: "calendar", label: "Calendar", title: "Collaboration Calendar", icon: Calendar, group: 0 },
  { id: "analytics", label: "Analytics", title: "Analytics", icon: TrendingUp, group: 1 },
  { id: "portfolio", label: "Portfolio", title: "Portfolio", icon: Award, group: 1 },
  { id: "links", label: "Links & QR", title: "Smart Links & Dynamic QR", icon: Link2, group: 1 },
  { id: "wallet", label: "Wallet", title: "Flenzr Vault", icon: Wallet, group: 2 },
  { id: "notifications", label: "Notifications", title: "Notifications", icon: Bell, group: 2 },
  { id: "how_it_works", label: "How it works", title: "How it works", icon: BookOpen, group: 2 },
  { id: "ai_pitcher", label: "AI Pitcher", title: "AI Pitcher", icon: Wand2, group: 2 },
] as const;

export type CreatorDashboardTab = (typeof CREATOR_NAV_ITEMS)[number]["id"];

interface CreatorSidebarProps {
  activeTab: CreatorDashboardTab;
  onSelect: (tab: CreatorDashboardTab) => void;
  creatorHandle: string;
}

export function CreatorSidebar({ activeTab, onSelect, creatorHandle }: CreatorSidebarProps) {
  const activity = useEnquiryActivity();
  const items = CREATOR_NAV_ITEMS.map(item => ({
    ...item,
    href: item.id === "collaborations" ? "/dashboard/collaborations" : item.id === "calendar" ? "/dashboard/calendar" : item.id === "notifications" ? "/dashboard/notifications" : `/dashboard/creator${item.id === "overview" ? "" : "#" + item.id.replaceAll("_", "-")}`,
    unread: item.id === "pipeline" ? activity?.counts?.received : 0,
    badge: item.id === "pipeline" ? <EnquiryUnreadBadge view="received" className="creator-sidebar-count" /> : undefined,
  }));
  return <DashboardSidebar activeTab={activeTab} items={items} audience="Creator" heading="Studio"
    onSelect={item => onSelect(item.id as CreatorDashboardTab)} onHome={() => onSelect("overview")}
    footer={creatorHandle ? { href: `/${creatorHandle}`, title: "View Public Media Kit", label: "Media Kit" } : undefined} />;
}
