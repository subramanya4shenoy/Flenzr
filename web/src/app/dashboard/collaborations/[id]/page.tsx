import { redirect } from "next/navigation";
import { currentIdentity } from "@/lib/server/session";
import { SharedCollaborations } from "@/components/collaborations/collaborations";
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ view?: string }> }) {
  const { id } = await params;
  const view = (await searchParams)?.view;
  const target = `/dashboard/collaborations/${id}${view && ["proposal", "deliveries", "proof", "activity"].includes(view) ? `?view=${view}` : ""}`;
  const identity = await currentIdentity();
  if (!identity) redirect(`/login?next=${encodeURIComponent(target)}`);
  return <div className="fl-shared-shell fl-shared-shell-detail"><main><SharedCollaborations id={id} viewerId={identity.user.id} /></main></div>;
}
