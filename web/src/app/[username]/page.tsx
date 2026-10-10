import { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle, MapPin, Sparkles, Star, Tag, Clock, ExternalLink } from "lucide-react";
import { getPublicCreatorProfile, getPublicCreatorRateCards } from "@/lib/api";
import { Logo } from "@/components/ui/logo";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const creator = await getPublicCreatorProfile(username);

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
  const creator = await getPublicCreatorProfile(username);

  if (!creator) {
    notFound();
  }

  const rateCards = await getPublicCreatorRateCards(username);

  return (
    <div className="min-h-screen bg-[#050505] text-[#fdf0d5] antialiased selection:bg-[#c1121f] selection:text-[#fdf0d5]">
      {/* Background Subtle Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-[#c1121f]/20 via-[#c1121f]/5 to-transparent blur-3xl opacity-80" />
      </div>

      <main className="relative max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Creator Header Card */}
        <section className="bg-[#0e0e0e] border border-[#222222] rounded-3xl p-6 sm:p-10 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-tr from-[#c1121f] to-[#fdf0d5] p-1 shadow-lg shadow-[#c1121f]/20">
                <div className="w-full h-full rounded-xl bg-[#050505] flex items-center justify-center overflow-hidden">
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={creator.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-extrabold text-[#fdf0d5]">
                      {creator.display_name.charAt(0)}
                    </span>
                  )}
                </div>
              </div>
              {creator.is_verified && (
                <div className="absolute -bottom-2 -right-2 bg-[#c1121f] text-[#fdf0d5] rounded-full p-1.5 shadow-md">
                  <CheckCircle className="w-5 h-5 fill-[#c1121f] text-[#fdf0d5]" />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#fdf0d5] flex items-center justify-center sm:justify-start gap-2">
                    {creator.display_name}
                    {creator.is_verified && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#c1121f]/15 text-[#fdf0d5] border border-[#c1121f]/30">
                        Verified
                      </span>
                    )}
                  </h1>
                  <p className="text-sm font-medium text-[#c1121f]">@{creator.handle}</p>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#171717] border border-[#2b2b2b] text-[#fdf0d5]">
                    <Star className="w-3.5 h-3.5 fill-[#c1121f] text-[#c1121f]" />
                    {creator.rating.toFixed(1)} / 5.0
                  </span>
                </div>
              </div>

              {creator.bio && (
                <p className="text-[#fdf0d5]/80 text-sm sm:text-base leading-relaxed max-w-2xl">
                  {creator.bio}
                </p>
              )}

              {/* Tags & Location */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-xs font-medium text-[#fdf0d5]/70">
                {creator.niche && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#141414] border border-[#262626]">
                    <Tag className="w-3.5 h-3.5 text-[#c1121f]" />
                    {creator.niche}
                  </span>
                )}
                {creator.location && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#141414] border border-[#262626]">
                    <MapPin className="w-3.5 h-3.5 text-[#c1121f]" />
                    {creator.location}
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
              <h2 className="text-xl font-bold tracking-tight text-[#fdf0d5] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#c1121f]" />
                Verified Rate Cards & Deliverables
              </h2>
              <p className="text-xs sm:text-sm text-[#fdf0d5]/60">
                Guaranteed response and escrow-protected collaborations through Flenzr.
              </p>
            </div>
          </div>

          {rateCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#222222] p-8 text-center bg-[#0a0a0a]">
              <p className="text-[#fdf0d5]/60 text-sm">
                No active public rate cards published by this creator yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rateCards.map((card) => (
                <div
                  key={card.id}
                  className="group bg-[#0e0e0e] hover:bg-[#121212] transition-all duration-300 border border-[#222222] hover:border-[#c1121f]/50 rounded-2xl p-5 flex flex-col justify-between shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#c1121f]/15 text-[#fdf0d5] border border-[#c1121f]/30">
                        {card.platform} • {card.deliverable_type.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-[#fdf0d5]/60 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#c1121f]" />
                        {card.turnaround_days}d turnaround
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-[#fdf0d5] group-hover:text-[#fdf0d5] transition-colors">
                      {card.title}
                    </h3>

                    {card.description && (
                      <p className="text-xs text-[#fdf0d5]/70 line-clamp-3 leading-relaxed">
                        {card.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#222222] flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#fdf0d5]/50 block">Starting at</span>
                      <span className="text-xl font-bold text-[#fdf0d5] tracking-tight">
                        ${(card.base_price_cents / 100).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#c1121f] hover:bg-[#a50e1a] text-[#fdf0d5] transition-colors shadow-md shadow-[#c1121f]/20 flex items-center gap-1.5 cursor-pointer"
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
        <footer className="mt-16 flex flex-col items-center justify-center gap-2 border-t border-[#1c1c1c] pt-8 pb-12 text-xs text-[#fdf0d5]/50">
          <Logo size={24} variant="duotone" withWordmark={true} />
          <p className="mt-1">
            Powered by <strong className="text-[#fdf0d5]">Flenzr</strong> — The Unified Creator & Brand Marketplace.
          </p>
        </footer>
      </main>
    </div>
  );
}
