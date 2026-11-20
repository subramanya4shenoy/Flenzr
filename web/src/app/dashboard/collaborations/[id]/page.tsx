import Link from "next/link";
import { redirect } from "next/navigation";
import { currentIdentity } from "@/lib/server/session";
import { SharedCollaborations } from "@/components/collaborations/collaborations";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!await currentIdentity()) redirect(`/login?next=${encodeURIComponent(`/dashboard/collaborations/${id}`)}`);
  return <div className="fl-shared-shell"><main><Link href="/dashboard/collaborations">← Collaborations</Link><SharedCollaborations id={id} /></main></div>;
}
