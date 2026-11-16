# Recent engagement panel

Account Analytics uses a right-side panel on desktop, below the account cards on narrow screens. Its glowing circular chart displays each network’s share of the available interaction count, rather than a fabricated growth series or rate.

The metric is **likes/reactions + comments/replies** on up to ten recent published posts **per account**. Shares, saves, impressions, views and engagement rates are excluded. The networks can cover different dates. Only posts with both metric counts available contribute to the aggregate and the two metric subtotals. Missing counts are null; actual zeros remain zero. The panel reports account and post coverage. Expand a network to inspect each account or access error.

## Data access

Authenticated owner-only endpoints, forwarded through the existing cookie-authenticated Next account gateway:

- `GET /api/v1/creators/me/recent-engagement?platform=...&handle=...` reads the last saved result only. It never calls a social provider, checks provider permissions or refreshes a provider token. Old snapshots remain available regardless of age. Without a saved result it returns `not_refreshed`.
- `POST` to the same endpoint explicitly fetches and saves new metrics. The Next gateway requires a same-origin mutation. The UI exposes **Refresh all** and per-account **Refresh** buttons. No timers, page loads or tab changes initiate provider post reads.

- Instagram: the connected professional account’s `/media` edge, `like_count` and `comments_count`. Supports the existing Unified Login and Instagram Login token modes.
- Facebook Pages: the connected Page’s `/published_posts` edge, reaction/comment summaries. The existing Page token and granted Page-read access are used. In live testing, listing post IDs succeeds with the original two permissions, but requesting reaction/comment summaries requires `pages_read_user_content` as well. Enable it in the Pages use case and Facebook Login for Business configuration, then reconnect; existing tokens are not upgraded automatically. `FACEBOOK_POST_PERMISSION_REQUIRED` identifies this case with a fixed safe message.
- YouTube: the authorized channel’s uploads playlist, followed by a batch statistics request for the latest ten uploads. Only public videos from that selection are included. If some uploads are private/deleted, fewer than ten videos are measured; these are not silently treated as public videos with zero interactions.
- X: manual, unauthenticated `https://x.com/{handle}` HTML retrieval. Extracts exact visible like/reply counts from unambiguous article/permalink pairs for the linked handle. Rounded or ambiguous counts remain unavailable. Keeps up to ten visible posts sorted by post ID, but does **not** guarantee the latest ten or complete timeline coverage. Results carry `source=x-public-profile`, `coverage=public_subset`, `latestTenGuaranteed=false`; the UI labels the public sample and its retrieval time. X refreshes skip OAuth token refresh, paid profile lookups and paid post APIs. There is no paid fallback. A live check retrieved five visible posts for the connected handle, each displaying zero likes/replies.
- LinkedIn, TikTok and Twitch: explicitly unsupported by the current connections. LinkedIn only has `openid profile`; member post analytics requires separate product access and permissions. The UI displays a dash rather than zero.

No new OAuth permissions are requested automatically. Provider permission, billing and rate-limit failures are isolated per account, never fabricated or silently counted as zero. Users can reconnect through the existing account controls when appropriate.

## Caching and isolation

Connection modules retain control of app binding, expiry and refresh-token rotation. Official provider requests use the stored encrypted token for the authenticated creator; foreign handles are rejected. X public-profile requests use no authorization header, cookies or API credentials, but still require an owner-linked account and retain the connection-change check before saving. Only minimal post IDs/timestamps and numeric metrics are cached in the credential’s private JSON, as the last successful snapshot, with its original `fetchedAt` timestamp and no automatic expiry. An explicit refresh performs new post reads; page/profile token checks retain their existing caching behavior. No post bodies, commenter identities or raw provider errors are returned. A late response cannot restore a removed or replaced connection.

The optional UI snapshot cache is keyed by owner, network, handle and connection revision. Saved results are displayed while the backend saved snapshot is read; age never triggers provider reads. Identical pending requests deduplicate. OAuth callbacks/disconnects invalidate cached post counts. Requests use a maximum of three concurrent UI workers. Each account shows its last successful update; the footer identifies the latest saved update. Failed refreshes retain the prior snapshot and its timestamp, alongside the error. A permission/owner denial clears browser display data when needed. Disconnect/removal discards the associated saved results with the private credential. Private tokens remain server-only. No schema migration is required.

## Primary API references

- [YouTube video statistics](https://developers.google.com/youtube/data/docs/reference/videos)
- [YouTube uploads playlist examples](https://developers.google.com/youtube/data/sample_requests)
- [Instagram media fields and limitations](https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/v21.0/)
- [Facebook published Page posts](https://developers.facebook.com/docs/graph-api/reference/page/published_posts)
- [Facebook reaction summaries](https://developers.facebook.com/docs/graph-api/reference/object/reactions)
- [X public profiles](https://x.com/)
- [LinkedIn member post statistics](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/post-statistics)


## X public-source limits

The public source is best effort and manual only. A page may expose fewer than ten posts or a non-chronological selection. Retrieval time is not proof that X refreshed the underlying counts at that instant. The source never fabricates a full timeline, converts rounded counts into exact integers, or treats an inaccessible/empty page as proof of zero engagement. Successful results replace the saved snapshot; access failures, rate limits and unreadable pages preserve the previous snapshot/time. HTML is bounded to 4 MiB and 50,000 elements; redirects, executable script content, login walls and challenges are not followed or bypassed. There are no automatic retries, proxy rotation, browser-session imports or calls to X’s paid API in this path. Only post identifiers/timestamps and numeric counts are saved, never source HTML or post bodies.
