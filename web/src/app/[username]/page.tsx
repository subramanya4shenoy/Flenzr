import { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle, MapPin, Sparkles, Star, Tag, Clock, ExternalLink } from "lucide-react";
import {
  getPublicCreatorProfile,
  getPublicCreatorRateCards,
  PublicCreatorProfile,
  RateCard,
} from "@/lib/api";
import { Logo } from "@/components/ui/logo";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  let creator = await getPublicCreatorProfile(username);

  if (!creator && username.toLowerCase() === "sarahmiller") {
    creator = {
      handle: "sarahmiller",
      display_name: "Sarah Miller",
      bio: "420K+ tech lovers across YouTube & Instagram. In-depth honest hardware reviews, everyday carry gear, and aesthetic workspace tours.",
      avatar_url: "/images/sarah-miller-avatar.jpg",
      niche: "Technology & Hardware",
      location: "Bengaluru, India",
      is_verified: true,
      rating: 5.0,
      profile_theme: "duotone",
    };
  }

  if (!creator) {
    return {
      title: "Creator Not Found | Flenzr",
      description: "The requested creator profile could not be found on Flenzr.",
    };
  }

  const title = `${creator.display_name} (@${creator.handle}) | Official Media Kit & Rate Card`;
  const description =
    creator.bio ||
    `Explore verified rate cards, collaborations, and partnership opportunities with ${creator.display_name} on Flenzr.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: creator.avatar_url ? [creator.avatar_url] : [],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PublicCreatorProfilePage({ params }: Props) {
  const { username } = await params;
  let creator = await getPublicCreatorProfile(username);
  let rateCards: RateCard[] = [];

  if (!creator && username.toLowerCase() === "sarahmiller") {
    creator = {
      handle: "sarahmiller",
      display_name: "Sarah Miller",
      bio: "420K+ tech lovers across YouTube & Instagram. In-depth honest hardware reviews, everyday carry gear, and aesthetic workspace tours.",
      avatar_url: "/images/sarah-miller-avatar.jpg",
      niche: "Technology & Hardware",
      location: "Bengaluru, India",
      is_verified: true,
      rating: 5.0,
      profile_theme: "duotone",
    };
    rateCards = [
      {
        id: "rc-1",
        creator_id: "c-sarah-miller",
        platform: "YouTube",
        deliverable_type: "Dedicated Video",
        title: "Full 8-10 Min Dedicated Product Review & Tutorial",
        description: "Comprehensive 4K product overview, dedicated B-roll, link in bio & video description with UTM tracking.",
        base_price_cents: 5000000,
        currency: "INR",
        turnaround_days: 14,
        is_active: true,
      },
      {
        id: "rc-2",
        creator_id: "c-sarah-miller",
        platform: "Instagram",
        deliverable_type: "Reel / Shorts",
        title: "60-Second Dynamic Product Reel with Bio Link",
        description: "High-energy vertical reel showcasing unboxing, hands-on demonstration, and 24-hour story with swipe-up/link sticker.",
        base_price_cents: 2500000,
        currency: "INR",
        turnaround_days: 5,
        is_active: true,
      },
      {
        id: "rc-3",
        creator_id: "c-sarah-miller",
        platform: "Podcast",
        deliverable_type: "Host-Read Ad",
        title: "60-Second Mid-Roll Host Read with Custom Code",
        description: "Personal authentic endorsement during episode mid-roll with dedicated sponsor link and promo discount code in show notes.",
        base_price_cents: 1500000,
        currency: "INR",
        turnaround_days: 7,
        is_active: true,
      },
    ];
  } else if (creator) {
    if (creator.handle === "sarahmiller" && !creator.avatar_url) {
      creator.avatar_url = "/images/sarah-miller-avatar.jpg";
    }
    rateCards = await getPublicCreatorRateCards(username);
  }

  if (!creator) {
    notFound();
  }

  const profile = creator;

  return (
    <div className="min-h-screen bg-white text-black antialiased selection:bg-[#c1121f] selection:text-white">
      {/* Background Subtle Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-[#c1121f]/10 via-[#c1121f]/3 to-transparent blur-3xl opacity-80" />
      </div>

      <main className="relative max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Creator Header Card */}
        <section className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-10 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-tr from-[#c1121f] to-black p-1 shadow-md shadow-[#c1121f]/15">
                <div className="w-full h-full rounded-xl bg-white flex items-center justify-center overflow-hidden">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-extrabold text-black">
                      {profile.display_name.charAt(0)}
                    </span>
                  )}
                </div>
              </div>
              {profile.is_verified && (
                <div className="absolute -bottom-2 -right-2 bg-[#c1121f] text-white rounded-full p-1.5 shadow-md">
                  <CheckCircle className="w-5 h-5 fill-[#c1121f] text-white" />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black flex items-center justify-center sm:justify-start gap-2">
                    {profile.display_name}
                    {profile.is_verified && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#c1121f]/10 text-[#c1121f] border border-[#c1121f]/20">
                        Verified
                      </span>
                    )}
                  </h1>
                  <p className="text-sm font-semibold text-[#c1121f]">@{profile.handle}</p>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 border border-neutral-200 text-black">
                    <Star className="w-3.5 h-3.5 fill-[#c1121f] text-[#c1121f]" />
                    {profile.rating.toFixed(1)} / 5.0
                  </span>
                </div>
              </div>

              {profile.bio && (
                <p className="text-neutral-600 text-sm sm:text-base leading-relaxed max-w-2xl">
                  {profile.bio}
                </p>
              )}

              {/* Tags & Location */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-xs font-medium text-neutral-600">
                {profile.niche && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-100 border border-neutral-200 font-medium">
                    <Tag className="w-3.5 h-3.5 text-[#c1121f]" />
                    {profile.niche}
                  </span>
                )}
                {profile.location && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-100 border border-neutral-200 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-[#c1121f]" />
                    {profile.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Rate Cards & Sponsorship Offerings */}
        <section className="mt-12 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-black flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#c1121f]" />
                Verified Rate Cards & Deliverables
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500">
                Guaranteed response and escrow-protected collaborations through Flenzr.
              </p>
            </div>
          </div>

          {rateCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 p-8 text-center bg-white">
              <p className="text-neutral-500 text-sm">
                No active public rate cards published by this creator yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rateCards.map((card) => (
                <div
                  key={card.id}
                  className="group bg-white hover:bg-neutral-50 transition-all duration-300 border border-neutral-200 hover:border-[#c1121f]/50 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#c1121f]/10 text-[#c1121f] border border-[#c1121f]/20">
                        {card.platform} • {card.deliverable_type.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-neutral-500 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-[#c1121f]" />
                        {card.turnaround_days}d turnaround
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-black transition-colors">
                      {card.title}
                    </h3>

                    {card.description && (
                      <p className="text-xs text-neutral-600 line-clamp-3 leading-relaxed">
                        {card.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-neutral-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-neutral-500 block font-medium">Starting at</span>
                      <span className="text-xl font-bold text-black tracking-tight">
                        {card.currency === "INR" || !card.currency ? "₹" : "$"}
                        {(card.base_price_cents / 100).toLocaleString(
                          card.currency === "INR" || !card.currency ? "en-IN" : "en-US"
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#c1121f] hover:bg-[#a50e1a] text-white transition-colors shadow-md shadow-[#c1121f]/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      Book Deliverable
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Flenzr Brand Footer */}
        <footer className="mt-16 flex flex-col items-center justify-center gap-2 border-t border-neutral-200 pt-8 pb-12 text-xs text-neutral-500">
          <Logo size={24} variant="duotone" withWordmark={true} />
          <p className="mt-1">
            Powered by <strong className="text-black">Flenzr</strong> — The Unified Creator & Brand Marketplace.
          </p>
        </footer>
      </main>
    </div>
  );
}
