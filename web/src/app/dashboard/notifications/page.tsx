import Link from "next/link";
import { redirect } from "next/navigation";
import { currentIdentity } from "@/lib/server/session";
import { EnquiryActivityProvider } from "@/components/enquiries/enquiry-activity";
import { NotificationCenter } from "@/components/notifications/notification-center";
export default async function Page() {
  const identity = await currentIdentity();
  if (!identity) redirect("/login?next=%2Fdashboard%2Fnotifications");
  const workspace = identity.active_roles.includes("creator") ? "/dashboard/creator" : "/dashboard/brand";
  return <EnquiryActivityProvider ownerId={identity.user.id}><div className="fl-notification-shell"><main><nav><Link href={workspace}>← Workspace</Link></nav><NotificationCenter /></main></div></EnquiryActivityProvider>;
}
