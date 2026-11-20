import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { API_URL, currentIdentity } from "@/lib/server/session";
import { OfferDocument } from "@/components/offers/offer-page";
import type { PublicOffer } from "@/lib/offers";
import { Logo } from "@/components/ui/logo";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const destination = `/dashboard/offers/${id}`;
  if (await currentIdentity()) redirect(destination);
  let offer: PublicOffer | null = null;
  let unavailable = false;
  try {
    const response = await fetch(`${API_URL}/offers/${id}/public`, { cache: "no-store" });
    if (response.ok) offer = await response.json();
    else unavailable = response.status !== 404;
  } catch { unavailable = true; }
  const login = `/login?next=${encodeURIComponent(destination)}`;
  return <div className="fl-offer-public"><nav><Link href="/"><Logo size={28} variant="duotone-dark" withWordmark /></Link><div className="fl-public-header-actions"><ThemeSwitcher /><Link href={login}>Sign in</Link></div></nav>{offer ? <main className="fl-offer-page"><OfferDocument offer={offer}><div className="fl-offer-visitor-action"><Link href={login}>{offer.accepting ? "Sign in to apply for this Offer" : "Sign in to view Offer"}</Link></div></OfferDocument></main> : <main className="fl-offer-gate"><h1>{unavailable ? "We couldn’t load this Offer" : "This Offer requires access"}</h1><p>{unavailable ? "Please retry in a moment." : "Sign in to check your access. Private Offers can only be opened by the brand and its invited creators."}</p><Link href={login}>Sign in to Flenzr</Link></main>}</div>;
}
