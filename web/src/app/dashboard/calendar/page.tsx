import { SharedPageNavigation } from "@/components/navigation/shared-page-navigation";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentIdentity, hasRole } from "@/lib/server/session";
import { CollaborationCalendar } from "@/components/collaborations/calendar";
import "@/components/collaborations/collaborations.css";

export default async function Page() {
  const identity = await currentIdentity();
  if (!identity) redirect("/login?next=%2Fdashboard%2Fcalendar");
  return <div className="fl-shared-shell"><main><SharedPageNavigation>{hasRole(identity, "creator") && <Link href="/dashboard/creator">Creator workspace</Link>} {hasRole(identity, "brand_owner") && <Link href="/dashboard/brand">Brand workspace</Link>} <Link href="/dashboard/collaborations">Collaborations</Link></SharedPageNavigation><CollaborationCalendar /></main></div>;
}
