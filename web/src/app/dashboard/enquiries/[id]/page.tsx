import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { accessToken, API_URL, currentIdentity } from "@/lib/server/session";
import { Enquiry } from "@/lib/enquiries";
import { EnquiryActivityProvider } from "@/components/enquiries/enquiry-activity";
import { EnquiryInbox } from "@/components/enquiries/enquiry-inbox";
import { NotificationBell } from "@/components/notifications/notification-center";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await currentIdentity();
  if (!identity) redirect(`/login?next=${encodeURIComponent(`/dashboard/enquiries/${id}`)}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const response = await fetch(`${API_URL}/enquiries/${id}`, { headers: { Authorization: `Bearer ${await accessToken()}` }, cache: "no-store" });
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("Could not load this enquiry. Please retry.");
  const enquiry: Enquiry = await response.json();
  return <EnquiryActivityProvider ownerId={identity.user.id}><div className="fl-notification-shell"><main><nav><Link href={enquiry.viewer_role === "brand" ? "/dashboard/brand/enquiries" : "/dashboard/creator"}>← Enquiries</Link><NotificationBell /></nav><EnquiryInbox ownerId={identity.user.id} enquiryId={id} view={enquiry.viewer_role === "brand" ? "sent" : "received"} /></main></div></EnquiryActivityProvider>;
}
