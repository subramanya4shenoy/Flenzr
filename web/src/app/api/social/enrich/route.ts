import { NextResponse } from "next/server";
import { currentIdentity, sameOrigin } from "@/lib/server/session";

function parseSubscriberText(text: string): number {
  const clean = text.toLowerCase().replace(/subscribers?/g, "").trim();
  if (clean.includes("million") || clean.endsWith("m")) {
    const num = parseFloat(clean.replace("million", "").replace("m", "").trim());
    return Math.round(num * 1000000);
  }
  if (clean.includes("lakh")) {
    const num = parseFloat(clean.replace("lakh", "").trim());
    return Math.round(num * 100000);
  }
  if (clean.includes("crore")) {
    const num = parseFloat(clean.replace("crore", "").trim());
    return Math.round(num * 10000000);
  }
  if (clean.includes("k") || clean.includes("thousand")) {
    const num = parseFloat(clean.replace("thousand", "").replace("k", "").trim());
    return Math.round(num * 1000);
  }
  const parsed = parseInt(clean.replace(/,/g, ""), 10);
  return isNaN(parsed) ? 0 : parsed;
}

function calculateTier(followers: number): "Nano" | "Micro" | "Mid-Tier" | "Macro" | "Mega" {
  if (followers >= 1000000) return "Mega";
  if (followers >= 250000) return "Macro";
  if (followers >= 50000) return "Mid-Tier";
  if (followers >= 10000) return "Micro";
  return "Nano";
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return num.toString();
}

function generateSuggestedRates(platform: "instagram" | "youtube", followers: number) {
  if (platform === "youtube") {
    return [
      {
        deliverable: "Dedicated 8-10 Min In-Depth Review",
        price: Math.max(Math.round((followers * 0.45) / 1000) * 1000, 15000),
        days: 14,
      },
      {
        deliverable: "60-Second Video Sponsor Integration / Segment",
        price: Math.max(Math.round((followers * 0.22) / 1000) * 1000, 8000),
        days: 7,
      },
      {
        deliverable: "YouTube Short + Pinned Comment Link",
        price: Math.max(Math.round((followers * 0.15) / 1000) * 1000, 5000),
        days: 5,
      },
    ];
  } else {
    return [
      {
        deliverable: "60-Second Dynamic Product Reel",
        price: Math.max(Math.round((followers * 0.25) / 1000) * 1000, 10000),
        days: 5,
      },
      {
        deliverable: "3x Interactive Story Sequence + Sticker Link",
        price: Math.max(Math.round((followers * 0.1) / 1000) * 1000, 5000),
        days: 3,
      },
      {
        deliverable: "Feed Carousel Post + Link in Bio (7 Days)",
        price: Math.max(Math.round((followers * 0.18) / 1000) * 1000, 7500),
        days: 6,
      },
    ];
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!await currentIdentity()) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const body = await request.json();
    const { platform, handle, verificationCode, manualFollowers } = body;

    if (!handle || typeof handle !== "string") {
      return NextResponse.json(
        { error: "Handle is required" },
        { status: 400 }
      );
    }

    if (!["instagram", "youtube"].includes(platform) || typeof handle !== "string" || !/^@?[a-zA-Z0-9_.-]{1,128}$/.test(handle)) {
      return NextResponse.json({ error: "Invalid social account" }, { status: 400 });
    }
    const cleanHandle = handle.replace(/^@/, "").trim().toLowerCase();
    const cleanCode = (verificationCode || "").trim().toUpperCase();

    // -------------------------------------------------------------
    // 1. LIVE INSTAGRAM SCRAPER & REAL-TIME BIO CODE DETECTOR
    // -------------------------------------------------------------
    if (platform === "instagram") {
      try {
        const igUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${cleanHandle}`;
        const igRes = await fetch(igUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "x-ig-app-id": "936619743392459",
            Referer: "https://www.instagram.com/",
          },
          next: { revalidate: 60 },
        });

        if (igRes.ok) {
          const igJson = await igRes.json();
          const user = igJson?.data?.user;
          if (user) {
            const rawFollowers = user?.edge_followed_by?.count ?? 0;
            const followers = rawFollowers;
            const displayName = user?.full_name || cleanHandle;
            const rawPic = user?.profile_pic_url_hd || user?.profile_pic_url;
            const avatarUrl = rawPic
              ? `/api/proxy-image?url=${encodeURIComponent(rawPic)}&name=${encodeURIComponent(displayName)}`
              : `/api/proxy-image?name=${encodeURIComponent(displayName)}`;
            const bio = (user?.biography || "").toUpperCase();
            const bioLinks = JSON.stringify(user?.bio_links || []).toLowerCase();

            // Detect if creator placed code or link in bio
            const codeFound = cleanCode
              ? bio.includes(cleanCode) ||
                bioLinks.includes(`flenzr.com/@${cleanHandle}`) ||
                bio.toLowerCase().includes(`flenzr.com/@${cleanHandle}`)
              : false;

            const engagementRate = null;
            const avgViews = null;

            return NextResponse.json({
              platform: "instagram",
              handle: cleanHandle,
              displayName,
              avatarUrl,
              followers,
              followersFormatted: formatNumber(followers),
              engagementRate,
              avgViews,
              avgViewsFormatted: "--",
              tier: calculateTier(followers),
              category: user?.category_name || "Content Creator",
              suggestedRates: followers > 0 ? generateSuggestedRates("instagram", followers) : [],
              apiVerified: user?.is_verified || false,
              canVerifyOfficialApi: false,
              isRealData: true,
              codeFoundInBio: codeFound,
            });
          }
        }
      } catch (igErr) {
        console.warn("Instagram live fetch failed, continuing to fallback:", igErr);
      }
    }

    // -------------------------------------------------------------
    // 2. LIVE YOUTUBE SCRAPER & REAL-TIME DESCRIPTION CODE DETECTOR
    // -------------------------------------------------------------
    if (platform === "youtube") {
      try {
        const ytUrl = `https://www.youtube.com/@${cleanHandle}`;
        const res = await fetch(ytUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
          },
          next: { revalidate: 60 },
        });

        if (res.ok) {
          const html = await res.text();
          const subMatch = html.match(
            /"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"/
          );
          const nameMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
          const avatarMatch = html.match(/<meta property="og:image" content="([^"]+)"/);

          if (nameMatch || subMatch) {
            const rawSubs = subMatch ? subMatch[1] : "";
            const followers = parseSubscriberText(rawSubs);
            const displayName = nameMatch ? nameMatch[1] : cleanHandle;
            const rawPic = avatarMatch ? avatarMatch[1] : null;
            const avatarUrl = rawPic
              ? `/api/proxy-image?url=${encodeURIComponent(rawPic)}&name=${encodeURIComponent(displayName)}`
              : `/api/proxy-image?name=${encodeURIComponent(displayName)}`;

            // Check if code or universal link is in channel text
            const codeFound = cleanCode
              ? html.toUpperCase().includes(cleanCode) ||
                html.toLowerCase().includes(`flenzr.com/@${cleanHandle}`)
              : false;

            const engagementRate = null;
            const avgViews = null;

            return NextResponse.json({
              platform: "youtube",
              handle: cleanHandle,
              displayName,
              avatarUrl,
              followers,
              followersFormatted: formatNumber(followers),
              engagementRate,
              avgViews,
              avgViewsFormatted: "--",
              tier: calculateTier(followers),
              category: "Video Creator",
              suggestedRates: followers > 0 ? generateSuggestedRates("youtube", followers) : [],
              apiVerified: false,
              canVerifyOfficialApi: false,
              isRealData: true,
              codeFoundInBio: codeFound,
            });
          }
        }
      } catch (ytErr) {
        console.warn("YouTube live scrape error:", ytErr);
      }
    }

    // -------------------------------------------------------------
    // 3. CLEAN MANUAL FALLBACK (If account is private or offline)
    // -------------------------------------------------------------
    const baseFollowers = Number.isFinite(Number(manualFollowers)) && Number(manualFollowers) > 0 ? Number(manualFollowers) : 0;
    const engagement = null;
    const views = null;
    const displayName = cleanHandle.charAt(0).toUpperCase() + cleanHandle.slice(1).replace(/_/g, " ");

    return NextResponse.json({
      platform: platform === "youtube" ? "youtube" : "instagram",
      handle: cleanHandle,
      displayName,
      avatarUrl: `/api/proxy-image?name=${encodeURIComponent(displayName)}`,
      followers: baseFollowers,
      followersFormatted: baseFollowers > 0 ? formatNumber(baseFollowers) : "--",
      engagementRate: engagement,
      avgViews: views,
      avgViewsFormatted: "--",
      tier: calculateTier(baseFollowers),
      category: "Content Creator",
      suggestedRates: baseFollowers > 0 ? generateSuggestedRates(platform, baseFollowers) : [],
      apiVerified: false,
      canVerifyOfficialApi: false,
      isRealData: false,
      codeFoundInBio: false,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to enrich social profile" },
      { status: 500 }
    );
  }
}
