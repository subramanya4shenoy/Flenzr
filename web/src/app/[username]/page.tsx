import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPublicCreatorProfile,
  getPublicCreatorRateCards,
  RateCard,
} from "@/lib/api";
import { PublicCreatorProfileView } from "@/components/creator/public-creator-profile-view";

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
  let rateCards: RateCard[] = [];

  if (creator) rateCards = await getPublicCreatorRateCards(username);

  if (!creator) {
    notFound();
  }

  const profile = creator;

  return <PublicCreatorProfileView creator={profile} rateCards={rateCards} />;
}
