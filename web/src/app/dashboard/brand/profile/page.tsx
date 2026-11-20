import Link from "next/link";
import { NotificationBell } from "@/components/notifications/notification-center";
import { BrandProfileEditor } from "@/components/brand/brand-profile-editor";

export default function BrandProfilePage() {
  return <div className="fl-brand-profile-page"><main><nav><Link href="/dashboard/brand">← Brand workspace</Link><NotificationBell /></nav><header><h1>Brand profile</h1><p>Keep your company and contact details up to date.</p></header><BrandProfileEditor /></main></div>;
}
