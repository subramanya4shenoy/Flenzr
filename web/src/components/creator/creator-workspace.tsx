"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, ExternalLink, LogOut, Menu, Users } from "lucide-react";
import { CreatorSidebar, CREATOR_NAV_ITEMS, type CreatorDashboardTab } from "./creator-sidebar";
import { NotificationBell } from "@/components/notifications/notification-center";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { clearLocalAccountData } from "@/lib/local-data";
import "./creator-workspace.css";

const ROOT = "/dashboard/creator";
const WorkspaceContext = createContext<{
  activeTab: CreatorDashboardTab;
  selectTab: (tab: CreatorDashboardTab) => void;
  updateProfile: (name: string, handle: string) => void;
} | null>(null);
export const useCreatorWorkspace = () => useContext(WorkspaceContext);
const hashFor = (tab: CreatorDashboardTab) => tab === "overview" ? "" : `#${tab.replaceAll("_", "-")}`;
const tabFor = (hash: string): CreatorDashboardTab => CREATOR_NAV_ITEMS.find(item => hashFor(item.id) === hash)?.id ?? "overview";

export function CreatorWorkspace({ children, initialName }: { children: ReactNode; initialName: string }) {
  const router = useRouter(), pathname = usePathname();
  const [activeTab, setActiveTab] = useState<CreatorDashboardTab>("overview");
  const [profile, setProfile] = useState({ name: initialName, handle: "" });
  const [signingOut, setSigningOut] = useState(false), [error, setError] = useState("");
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  const updateProfile = useCallback((name: string, handle: string) => setProfile(previous => previous.name === name && previous.handle === handle ? previous : { name, handle }), []);
  useEffect(() => {
    const restore = () => { if (window.location.pathname === ROOT) setActiveTab(tabFor(window.location.hash)); };
    const timer = window.setTimeout(restore, 0);
    window.addEventListener("hashchange", restore); window.addEventListener("popstate", restore);
    return () => { window.clearTimeout(timer); window.removeEventListener("hashchange", restore); window.removeEventListener("popstate", restore); };
  }, [pathname]);
  useEffect(() => {
    // Studio supplies this from its existing request. A shared-route deep link needs its own profile.
    if (pathname === ROOT || profile.handle) return;
    const controller = new AbortController();
    fetch("/api/account/creators/me", { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (!response.ok) return;
      const creator = await response.json();
      if (!controller.signal.aborted) updateProfile(creator.display_name || initialName, creator.handle || "");
    }).catch(() => {});
    return () => controller.abort();
  }, [pathname, profile.handle, initialName, updateProfile]);
  function selectTab(tab: CreatorDashboardTab) {
    if (mobileMenu.current) mobileMenu.current.open = false;
    const href = tab === "calendar" ? "/dashboard/calendar" : tab === "notifications" ? "/dashboard/notifications" : ROOT + hashFor(tab);
    if (pathname === ROOT && href.startsWith(ROOT)) {
      setActiveTab(tab); window.history.replaceState(null, "", href); window.dispatchEvent(new HashChangeEvent("hashchange"));
      window.scrollTo({ top: 0, behavior: "instant" });
    } else router.push(href);
  }
  const sharedTab = pathname.startsWith("/dashboard/offers/") ? "opportunities" : pathname === "/dashboard/calendar" ? "calendar" : pathname === "/dashboard/notifications" ? "notifications" : pathname.startsWith("/dashboard/collaborations") || pathname.startsWith("/dashboard/enquiries/") ? "pipeline" : activeTab;
  const title = pathname.startsWith("/dashboard/collaborations/") ? "Collaboration details" : pathname === "/dashboard/collaborations" ? "Collaborations" : pathname.startsWith("/dashboard/enquiries/") ? "Enquiry details" : CREATOR_NAV_ITEMS.find(item => item.id === sharedTab)?.title || "Studio Overview";
  async function signOut() {
    if (signingOut) return;
    setSigningOut(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out failed");
      clearLocalAccountData(); router.replace("/login"); router.refresh();
    } catch { setError("Could not sign out. Please retry."); setSigningOut(false); }
  }
  return <WorkspaceContext.Provider value={{ activeTab, selectTab, updateProfile }}><div className="fl-creator-shell">
    <CreatorSidebar activeTab={sharedTab} onSelect={selectTab} creatorHandle={profile.handle} />
    <div className="fl-creator-workspace">
      <header className="fl-creator-topbar">
        <div className="fl-creator-breadcrumb"><button type="button" onClick={() => selectTab("overview")}><Users size={14} aria-hidden="true" /><span>Studio</span></button><ChevronRight size={13} aria-hidden="true" /><button className="fl-creator-name" type="button" onClick={() => selectTab("overview")}>{profile.name}</button><ChevronRight size={13} aria-hidden="true" /><strong>{title}</strong></div>
        <div className="fl-creator-header-actions">
          <details ref={mobileMenu} className="fl-creator-mobile-menu"><summary aria-label="Creator menu"><Menu size={16} /><span>Menu</span></summary><nav aria-label="Creator mobile navigation">{CREATOR_NAV_ITEMS.map(item => <button key={item.id} type="button" aria-current={sharedTab === item.id ? "page" : undefined} onClick={() => selectTab(item.id)}><item.icon size={14} aria-hidden="true" />{item.label}</button>)}</nav></details>
          <NotificationBell /><LanguageSwitcher variant="compact" />
          {profile.handle && <Link aria-label="View public media kit" title="View public media kit" className="fl-creator-media-kit" href={`/${profile.handle}`} target="_blank"><span>Media Kit</span><ExternalLink size={13} aria-hidden="true" /></Link>}
          <button className="fl-creator-signout" type="button" aria-label="Sign out" title="Sign out" disabled={signingOut} onClick={() => void signOut()}><LogOut size={14} aria-hidden="true" /><span>{signingOut ? "Signing out…" : "Sign out"}</span></button>
        </div>
      </header>
      {error && <p className="fl-creator-shell-error" role="alert">{error}</p>}
      {children}
    </div>
  </div></WorkspaceContext.Provider>;
}
