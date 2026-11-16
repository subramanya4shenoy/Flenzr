import Link from "next/link";
import { redirect } from "next/navigation";
import { currentIdentity } from "@/lib/server/session";
import { EnquiryInbox } from "@/components/enquiries/enquiry-inbox";

export default async function BrandEnquiriesPage() {
  const identity = await currentIdentity();
  if (!identity) redirect("/login");
  return <div className="fl-brand-enquiries-page"><main><nav><Link href="/dashboard/brand">← Brand workspace</Link></nav><EnquiryInbox view="sent" ownerId={identity.user.id} /></main></div>;
}
