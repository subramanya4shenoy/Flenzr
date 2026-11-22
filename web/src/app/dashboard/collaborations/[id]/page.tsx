import { redirect } from "next/navigation";
import { currentIdentity } from "@/lib/server/session";
import { SharedCollaborations } from "@/components/collaborations/collaborations";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await currentIdentity();
  if (!identity) redirect(`/login?next=${encodeURIComponent(`/dashboard/collaborations/${id}`)}`);
  return <div className="fl-shared-shell fl-shared-shell-detail"><main><SharedCollaborations id={id} viewerId={identity.user.id} /></main></div>;
}
