import { SharedPageNavigation } from "@/components/navigation/shared-page-navigation";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentIdentity, hasRole } from "@/lib/server/session";
import { SharedCollaborations } from "@/components/collaborations/collaborations";
export default async function Page() {
  const identity = await currentIdentity();
  if (!identity) redirect("/login?next=%2Fdashboard%2Fcollaborations");
  return <div className="fl-shared-shell"><main><SharedPageNavigation>{hasRole(identity, "creator") && <Link href="/dashboard/creator">Creator workspace</Link>} {hasRole(identity, "brand_owner") && <Link href="/dashboard/brand">Brand workspace</Link>} <Link href="/dashboard/calendar">Calendar</Link></SharedPageNavigation><SharedCollaborations /></main></div>;
}
