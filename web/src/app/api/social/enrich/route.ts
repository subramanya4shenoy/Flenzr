import { NextResponse } from "next/server";
import { currentIdentity, sameOrigin, accessToken, API_URL } from "@/lib/server/session";
import { getYouTubePublicChannel, YouTubePublicError } from "@/lib/server/youtube-public";

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

    if (!["instagram", "youtube", "linkedin", "x", "facebook"].includes(platform) || typeof handle !== "string" || !/^@?[a-zA-Z0-9_.-]{1,128}$/.test(handle)) {
      return NextResponse.json({ error: "Invalid social account" }, { status: 400 });
    }
    const cleanHandle = handle.replace(/^@/, "").trim().toLowerCase();
    const cleanCode = (verificationCode || "").trim().toUpperCase();

    if (platform === "linkedin" || platform === "x" || platform === "facebook") {
      const token = await accessToken();
      const response = await fetch(`${API_URL}/creators/me/${platform}/stats?handle=${encodeURIComponent(cleanHandle)}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) return NextResponse.json({ error: data.error?.message || "Account profile is unavailable.", code: data.error?.code }, { status: response.status, headers: { "Cache-Control": "no-store" } });
      return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
    }

    // -------------------------------------------------------------
    // 1. LIVE INSTAGRAM SCRAPER & REAL-TIME BIO CODE DETECTOR
    // -------------------------------------------------------------
    if (platform === "instagram") {
      // Official per-owner connection takes precedence over best-effort public data.
      try {
        const token = await accessToken();
        const response = await fetch(`${API_URL}/creators/me/instagram/stats?handle=${encodeURIComponent(cleanHandle)}`, {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(20000),
        });
        const data = await response.json();
        if (response.ok) {
          return NextResponse.json({
            ...data, thumbnailUrl: undefined,
            avatarUrl: data.thumbnailUrl ? `/api/proxy-image?url=${encodeURIComponent(data.thumbnailUrl)}&name=${encodeURIComponent(data.displayName)}` : `/api/proxy-image?name=${encodeURIComponent(data.displayName)}`,
            followersFormatted: data.followers === null ? "--" : formatNumber(data.followers),
            avgViewsFormatted: "--", suggestedRates: [],
            apiVerified: false, canVerifyOfficialApi: false, codeFoundInBio: false,
          }, { headers: { "Cache-Control": "no-store" } });
        }
        if (data.error?.code !== "INSTAGRAM_CONNECTION_REQUIRED") {
          return NextResponse.json({ error: data.error?.message || "Instagram stats are temporarily unavailable.", code: data.error?.code }, { status: response.status });
        }
      } catch {
        return NextResponse.json({ error: "Instagram stats are temporarily unavailable. Please retry." }, { status: 503 });
      }
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
              followersAvailable: typeof user?.edge_followed_by?.count === "number",
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

    // Public YouTube metrics come from the supported Data API, not page scraping.
    if (platform === "youtube") {
      try {
        const token = await accessToken();
        const response = await fetch(`${API_URL}/creators/me/youtube/stats?handle=${encodeURIComponent(cleanHandle)}`, {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(45000),
        });
        const data = await response.json();
        if (response.ok) {
          return NextResponse.json({ ...data, thumbnailUrl: undefined,
            avatarUrl: data.thumbnailUrl ? `/api/proxy-image?url=${encodeURIComponent(data.thumbnailUrl)}&name=${encodeURIComponent(data.displayName)}` : undefined,
            followersFormatted: data.followers === null ? "--" : formatNumber(data.followers),
            avgViewsFormatted: "--", suggestedRates: [], apiVerified: false, canVerifyOfficialApi: false, codeFoundInBio: false,
          }, { headers: { "Cache-Control": "no-store" } });
        }
        if (data.error?.code !== "YOUTUBE_CONNECTION_REQUIRED" && response.status !== 403) {
          return NextResponse.json({ error: data.error?.message || "YouTube connection needs attention.", code: data.error?.code }, { status: response.status });
        }
      } catch {
        return NextResponse.json({ error: "YouTube stats are temporarily unavailable. Please retry." }, { status: 503 });
      }
      try {
        const channel = await getYouTubePublicChannel(cleanHandle);
        const avatarUrl = channel.thumbnailUrl
          ? `/api/proxy-image?url=${encodeURIComponent(channel.thumbnailUrl)}&name=${encodeURIComponent(channel.displayName)}`
          : `/api/proxy-image?name=${encodeURIComponent(channel.displayName)}`;
        return NextResponse.json({
          ...channel, thumbnailUrl: undefined, avatarUrl,
          followersFormatted: channel.followers === null ? "--" : formatNumber(channel.followers),
          avgViewsFormatted: "--",
          tier: channel.followers === null ? null : calculateTier(channel.followers),
          category: "Video Creator",
          suggestedRates: channel.followers !== null && channel.followers > 0 ? generateSuggestedRates("youtube", channel.followers) : [],
        }, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        if (error instanceof YouTubePublicError) {
          return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: { "Cache-Control": "no-store" } });
        }
        return NextResponse.json({ error: "YouTube public stats are temporarily unavailable." }, { status: 503 });
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
      platform: "instagram",
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
