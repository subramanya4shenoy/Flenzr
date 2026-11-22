import { redirect } from "next/navigation";
import { currentIdentity } from "@/lib/server/session";
import { OfferCollaborations } from "@/components/collaborations/offer-collaborations";

export default async function Page({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  const identity = await currentIdentity();
  if (!identity) redirect(`/login?next=${encodeURIComponent(`/dashboard/collaborations/offer/${offerId}`)}`);
  return <div className="fl-shared-shell fl-shared-shell-detail"><main><OfferCollaborations offerId={offerId} viewerId={identity.user.id} /></main></div>;
}

