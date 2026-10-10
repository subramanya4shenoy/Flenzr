import { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle, MapPin, Sparkles, Star, Tag, Clock, ExternalLink, Share2 } from "lucide-react";
import { getPublicCreatorProfile, getPublicCreatorRateCards } from "@/lib/api";

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
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-emerald-600/20 via-teal-700/10 to-transparent blur-3xl opacity-70" />
      </div>

      <main className="relative max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Creator Header Card */}
        <section className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-emerald-950/30">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-1 shadow-lg shadow-emerald-500/20">
                <div className="w-full h-full rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden">
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={creator.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-extrabold text-emerald-400">
                      {creator.display_name.charAt(0)}
                    </span>
                  )}
                </div>
              </div>
              {creator.is_verified && (
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 rounded-full p-1.5 shadow-md">
                  <CheckCircle className="w-5 h-5 fill-slate-950 text-emerald-400" />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center justify-center sm:justify-start gap-2">
                    {creator.display_name}
                    {creator.is_verified && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Verified
                      </span>
                    )}
                  </h1>
                  <p className="text-sm font-medium text-emerald-400">@{creator.handle}</p>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-amber-300">
                    <Star className="w-3.5 h-3.5 fill-amber-300" />
                    {creator.rating.toFixed(1)} / 5.0
                  </span>
                </div>
              </div>

              {creator.bio && (
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                  {creator.bio}
                </p>
              )}

              {/* Tags & Location */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-xs font-medium text-slate-400">
                {creator.niche && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    <Tag className="w-3.5 h-3.5 text-emerald-400" />
                    {creator.niche}
                  </span>
                )}
                {creator.location && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
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
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Verified Rate Cards & Deliverables
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Guaranteed response and escrow-protected collaborations through Flenzr.
              </p>
            </div>
          </div>

          {rateCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center bg-slate-900/40">
              <p className="text-slate-400 text-sm">
                No active public rate cards published by this creator yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rateCards.map((card) => (
                <div
                  key={card.id}
                  className="group bg-slate-900/70 hover:bg-slate-900 transition-all duration-300 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between shadow-lg hover:shadow-emerald-500/5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {card.platform} • {card.deliverable_type.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {card.turnaround_days}d turnaround
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-white group-hover:text-emerald-300 transition-colors">
                      {card.title}
                    </h3>

                    {card.description && (
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                        {card.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 block">Starting at</span>
                      <span className="text-xl font-bold text-white tracking-tight">
                        ${(card.base_price_cents / 100).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
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
        <footer className="mt-16 text-center text-xs text-slate-600 border-t border-slate-900 pt-8 pb-12">
          <p>
            Powered by <strong className="text-slate-400">Flenzr</strong> — The Unified Creator & Brand Marketplace.
          </p>
        </footer>
      </main>
    </div>
  );
}
