import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPublicCreatorProfile,
  getPublicCreatorRateCards,
  PublicCreatorProfile,
  RateCard,
} from "@/lib/api";
import { PublicCreatorProfileView } from "@/components/creator/public-creator-profile-view";

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

  return <PublicCreatorProfileView creator={profile} rateCards={rateCards} />;
}
