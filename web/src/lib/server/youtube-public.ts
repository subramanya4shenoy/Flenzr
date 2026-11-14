import "server-only";

export class YouTubePublicError extends Error {
  constructor(public code: string, message: string, public status = 503) { super(message); }
}

type Channel = {
  id?: string;
  snippet?: { title?: string; thumbnails?: Record<string, { url?: string }> };
  statistics?: { hiddenSubscriberCount?: boolean; subscriberCount?: string; viewCount?: string; videoCount?: string };
};

function count(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export async function getYouTubePublicChannel(handle: string) {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) throw new YouTubePublicError("YOUTUBE_NOT_CONFIGURED", "YouTube public stats have not been configured yet.");
  const clean = handle.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_.-]{1,128}$/.test(clean)) throw new YouTubePublicError("YOUTUBE_INVALID_HANDLE", "Enter a valid YouTube handle.", 400);
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("forHandle", clean);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "X-Goog-Api-Key": key },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new YouTubePublicError("YOUTUBE_UNAVAILABLE", "YouTube could not be reached. Please try again later.");
  }
  if (!response.ok) {
    // Never relay Google error text: it can contain configuration or credential details.
    const body = await response.json().catch(() => null);
    const reasons: string[] = body?.error?.errors?.map((error: { reason?: string }) => error.reason) ?? [];
    if (reasons.some((reason) => ["quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"].includes(reason)) || response.status === 429) {
      throw new YouTubePublicError("YOUTUBE_QUOTA_EXCEEDED", "YouTube’s request limit has been reached. Please try again later.");
    }
    if (response.status === 400 || response.status === 403) {
      throw new YouTubePublicError("YOUTUBE_CONFIGURATION_ERROR", "YouTube public stats are unavailable because of an API configuration issue.");
    }
    throw new YouTubePublicError("YOUTUBE_UNAVAILABLE", "YouTube public stats are temporarily unavailable.");
  }
  let channel: Channel | undefined;
  try { channel = (await response.json()).items?.[0]; }
  catch { throw new YouTubePublicError("YOUTUBE_INVALID_RESPONSE", "YouTube returned an unreadable response."); }
  if (!channel?.id) throw new YouTubePublicError("YOUTUBE_CHANNEL_NOT_FOUND", "No public YouTube channel was found for this handle.", 404);
  const stats = channel.statistics;
  const followers = stats?.hiddenSubscriberCount ? null : count(stats?.subscriberCount);
  const thumbnails = channel.snippet?.thumbnails;
  return {
    platform: "youtube" as const, handle: clean, channelId: channel.id,
    displayName: channel.snippet?.title || clean,
    thumbnailUrl: thumbnails?.high?.url || thumbnails?.medium?.url || thumbnails?.default?.url || null,
    followers, followersAvailable: followers !== null,
    subscribersHidden: stats?.hiddenSubscriberCount === true,
    totalViews: count(stats?.viewCount), videoCount: count(stats?.videoCount),
    source: "youtube-data-api", isRealData: true,
    avgViews: null, engagementRate: null,
    // Public counts do not prove ownership of the channel.
    apiVerified: false, canVerifyOfficialApi: false, codeFoundInBio: false,
  };
}
