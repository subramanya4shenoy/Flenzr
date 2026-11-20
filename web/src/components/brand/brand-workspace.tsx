"use client";

import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Briefcase, Calendar, ChevronRight, Handshake, Inbox, LogOut, Menu, Search, Settings2, Users } from "lucide-react";
import { DashboardSidebar, type DashboardNavItem } from "@/components/navigation/dashboard-sidebar";
import { NotificationBell } from "@/components/notifications/notification-center";
import { EnquiryUnreadBadge, useEnquiryActivity } from "@/components/enquiries/enquiry-activity";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { clearLocalAccountData } from "@/lib/local-data";
import "./brand-workspace.css";

const BrandWorkspaceContext = createContext(false);
export const useBrandWorkspace = () => useContext(BrandWorkspaceContext);

const ROOT = "/dashboard/brand";
const ITEMS: readonly DashboardNavItem[] = [
  { id: "discovery", label: "Discover", title: "Creator Discovery", icon: Search, group: 0, href: ROOT },
  { id: "campaigns", label: "Offers", title: "Offers", icon: Briefcase, group: 0, href: ROOT + "#campaigns" },
  { id: "shortlists", label: "Shortlists", title: "Shortlists", icon: Users, group: 0, href: ROOT + "#shortlists" },
  { id: "collaborations", label: "Collabs", title: "Collaborations", icon: Handshake, group: 1, href: "/dashboard/collaborations" },
  { id: "enquiries", label: "Direct Offers", title: "Sent direct Offers", icon: Inbox, group: 1, href: ROOT + "/enquiries" },
  { id: "calendar", label: "Calendar", title: "Collaboration Calendar", icon: Calendar, group: 1, href: "/dashboard/calendar" },
  { id: "profile", label: "Brand profile", title: "Brand profile", icon: Settings2, group: 2, href: ROOT + "/profile" },
  { id: "how_it_works", label: "How it works", title: "How it works", icon: BookOpen, group: 2, href: ROOT + "#how-it-works" },
];

export function BrandWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activity = useEnquiryActivity();
  const [hash, setHash] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const restore = () => setHash(window.location.hash);
    const timer = window.setTimeout(restore, 0);
    window.addEventListener("hashchange", restore);
    window.addEventListener("popstate", restore);
    return () => { window.clearTimeout(timer); window.removeEventListener("hashchange", restore); window.removeEventListener("popstate", restore); };
  }, [pathname]);
  const active = pathname === ROOT
    ? hash === "#campaigns" ? "campaigns" : hash === "#shortlists" ? "shortlists" : hash === "#how-it-works" ? "how_it_works" : "discovery"
    : pathname.startsWith("/dashboard/offers/") ? "campaigns"
    : pathname.startsWith("/dashboard/collaborations") ? "collaborations"
    : pathname === "/dashboard/calendar" ? "calendar"
    : pathname.startsWith(ROOT + "/enquiries") || pathname.startsWith("/dashboard/enquiries/") ? "enquiries"
    : pathname === "/dashboard/notifications" ? "notifications" : "profile";
  const items = ITEMS.map(item => ({ ...item,
    unread: item.id === "enquiries" ? activity?.counts?.sent : 0,
    badge: item.id === "enquiries" ? <EnquiryUnreadBadge view="sent" className="creator-sidebar-count" /> : undefined,
  }));
  function navigate(item: DashboardNavItem) {
    if (mobileMenu.current) mobileMenu.current.open = false;
    if (pathname === ROOT && item.href?.split("#")[0] === ROOT) {
      window.history.replaceState(null, "", item.href);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      window.scrollTo({ top: 0, behavior: "instant" });
    } else if (item.href) router.push(item.href);
  }
  async function signOut() {
    if (signingOut) return;
    setSigningOut(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out failed");
      clearLocalAccountData(); localStorage.removeItem("flenzr_auth_session"); router.replace("/login"); router.refresh();
    } catch { setError("Could not sign out. Please retry."); setSigningOut(false); }
  }
  const current = ITEMS.find(item => item.id === active);
  const title = active === "notifications" ? "Notifications" : current?.title ?? "Brand workspace";
  return <BrandWorkspaceContext.Provider value={true}><div className="fl-brand-shell">
    <DashboardSidebar activeTab={active} items={items} audience="Brand" heading="Brands" onSelect={navigate} onHome={() => navigate(ITEMS[0])} />
    <div className="fl-brand-workspace">
      <header className="fl-brand-topbar">
        <div className="fl-brand-breadcrumb"><span>Brand workspace</span><ChevronRight size={13} aria-hidden="true" /><strong>{title}</strong></div>
        <div className="fl-brand-header-actions">
          <details ref={mobileMenu} className="fl-brand-mobile-menu"><summary aria-label="Brand menu"><Menu size={17} /><span>Menu</span></summary>
            <nav aria-label="Brand mobile navigation">{items.map(item => <button key={item.id} type="button" aria-current={active === item.id ? "page" : undefined} onClick={() => navigate(item)}><item.icon size={15} aria-hidden="true" /><span>{item.label}</span>{item.id === "enquiries" && <EnquiryUnreadBadge view="sent" />}</button>)}</nav>
          </details>
          <NotificationBell /><ThemeSwitcher /><LanguageSwitcher variant="compact" />
          <button className="fl-brand-signout" type="button" aria-label="Sign out" title="Sign out" disabled={signingOut} onClick={() => void signOut()}><LogOut size={15} aria-hidden="true" /><span>{signingOut ? "Signing out…" : "Sign out"}</span></button>
        </div>
      </header>
      {error && <p className="fl-brand-shell-error" role="alert">{error}</p>}
      {children}
    </div>
  </div></BrandWorkspaceContext.Provider>;
}
