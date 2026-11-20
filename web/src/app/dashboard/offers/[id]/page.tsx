import { notFound, redirect } from "next/navigation";
import { currentIdentity } from "@/lib/server/session";
import { OfferWorkspacePage } from "@/components/offers/offer-page";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  if (!await currentIdentity()) redirect(`/login?next=${encodeURIComponent(`/dashboard/offers/${id}`)}`);
  return <OfferWorkspacePage key={id} id={id} />;
}
