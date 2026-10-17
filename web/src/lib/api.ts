const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002/api/v1";

export interface PublicCreatorProfile {
  handle: string;
  display_name: string;
  bio?: string | null;
  niche?: string | null;
  location?: string | null;
  is_verified: boolean;
  rating: number;
  profile_theme: string;
  avatar_url?: string | null;
  instagram_handle?: string | null;
  instagram_verified?: boolean;
  youtube_channel?: string | null;
  youtube_verified?: boolean;
}

export interface CreatorOnboardPayload {
  full_name: string;
  email: string;
  handle: string;
  niche?: string;
  instagram_handle?: string | null;
  instagram_verified?: boolean;
  youtube_channel?: string | null;
  youtube_verified?: boolean;
  rate_cards?: Array<{
    platform: string;
    deliverable: string;
    price: number;
    days: number;
  }>;
}

export interface CreatorOnboardResponse {
  creator: PublicCreatorProfile & {
    id: string;
    user_id: string;
    verification_code?: string;
  };
  access_token: string;
  token_type: string;
  universal_bio_link: string;
  message: string;
}

export interface RateCard {
  id: string;
  creator_id: string;
  platform: string;
  deliverable_type: string;
  title: string;
  description?: string | null;
  base_price_cents: number;
  currency: string;
  turnaround_days: number;
  is_active: boolean;
}

export interface TrackedLink {
  id: string;
  creator_id: string;
  title: string;
  destination_url: string;
  short_code: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  click_count: number;
  is_active: boolean;
  created_at: string;
}

export interface Campaign {
  id: string;
  organization_id: string;
  title: string;
  brief: string;
  target_niche?: string | null;
  deliverable_summary?: string | null;
  budget_total_cents: number;
  currency: string;
  status: "draft" | "active" | "paused" | "completed" | "cancelled";
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  billing_email: string;
  billing_status: string;
  brand_profile?: {
    company_name: string;
    industry?: string | null;
    website?: string | null;
    description?: string | null;
  };
}

// ---------------- Public Endpoints ----------------

export async function getCreatorByEmail(
  email: string
): Promise<PublicCreatorProfile | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/creators/by-email/${encodeURIComponent(email)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error fetching creator by email:", error);
    return null;
  }
}

export async function getPublicCreatorProfile(
  handle: string
): Promise<PublicCreatorProfile | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/creators/public/${encodeURIComponent(handle)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error fetching creator profile:", error);
    return null;
  }
}


export async function getPublicCreatorRateCards(handle: string): Promise<RateCard[]> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/ratecards/creator/${encodeURIComponent(handle)}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Error fetching rate cards:", error);
    return [];
  }
}

export async function searchCreators(params?: {
  q?: string;
  niche?: string;
  location?: string;
  min_rating?: number;
}): Promise<PublicCreatorProfile[]> {
  try {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.niche) query.set("niche", params.niche);
    if (params?.location) query.set("location", params.location);
    if (params?.min_rating) query.set("min_rating", params.min_rating.toString());

    const res = await fetch(`${API_BASE_URL}/discovery/creators?${query.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Error searching creators:", error);
    return [];
  }
}

export async function getExploreCampaigns(niche?: string): Promise<Campaign[]> {
  try {
    const query = niche ? `?niche=${encodeURIComponent(niche)}` : "";
    const res = await fetch(`${API_BASE_URL}/campaigns/explore${query}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Error exploring campaigns:", error);
    return [];
  }
}

export async function generateQRCode(
  url: string,
  fillColor = "#c1121f",
  backColor = "#ffffff",
  token?: string
): Promise<string | null> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/qrcodes/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        url,
        fill_color: fillColor,
        back_color: backColor,
        box_size: 10,
        border: 2,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data_url;
  } catch (err) {
    console.error("Error generating QR code:", err);
    return null;
  }
}

export async function onboardCreator(
  payload: CreatorOnboardPayload
): Promise<CreatorOnboardResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/creators/onboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      console.warn("Onboard API returned non-200:", res.status, errData);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error("Error calling onboard API:", error);
    return null;
  }
}

export async function verifyCreatorBio(
  platform: string,
  handle: string,
  verificationCode: string
): Promise<{ verified: boolean; platform: string; handle: string; message: string } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/creators/verify-bio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
        handle,
        verification_code: verificationCode,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error calling verify-bio API:", error);
    return null;
  }
}

