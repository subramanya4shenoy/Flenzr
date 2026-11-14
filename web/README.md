# Flenzr Web Application

Built with:
- Next.js 15+ (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Supabase Auth SSR Client

## Architecture
- **Public Profile / Link-in-Bio (`/[username]`)**: Server-Side Rendered (SSR) / ISR for optimal SEO and social preview indexing.
- **Creator Dashboard (`/dashboard/creator`)**: Client-side interactive studio for rates, links, analytics, and offers.
- **Brand Dashboard (`/dashboard/brand`)**: Creator discovery, shortlisting, and campaign collaboration management.

## Run locally

Run `npm run dev` here and open `http://localhost:3210`. Production preview with `npm run start` also uses port 3210.
Copy `.env.example` to `.env.local` for a new setup, then supply the existing Supabase project values. Local API requests target `http://127.0.0.1:8210/api/v1`.

## YouTube public statistics

Enable **YouTube Data API v3** in the Flenzr Google Cloud project. Under **APIs & Services → Credentials**, create an API key and restrict its API access to YouTube Data API v3. This is a separate credential from the Google sign-in OAuth client ID/secret.

Add `YOUTUBE_API_KEY=your-key` to `web/.env.local`, then restart the web server. Keep this variable server-only; do not use a `NEXT_PUBLIC_` prefix or commit the key. When deploying with fixed outbound IP addresses, restrict the key to those server IPs as well; browser referrer restrictions are unsuitable for these server requests.

The authenticated enrichment route resolves each handle using `channels.list(part=snippet,statistics, forHandle=...)`. Successful responses are cached for five minutes. Analytics shows public subscriber counts (rounded by YouTube), lifetime channel views, and public video count. Hidden/missing counts display as unavailable; real zeroes remain zero. Missing credentials, exhausted quota, and unavailable channels return explicit errors rather than fabricated values. Public statistics never grant ownership verification. Watch time, retention, revenue, and demographic reports are outside this integration.

Reference: https://developers.google.com/youtube/data/reference/rest/v3/channels/list

## Instagram account statistics

Instagram cards support **Connect Instagram** using Meta Unified Login for eligible Creator/Business accounts and their business portfolio. OAuth grants and encrypted per-account tokens stay on the backend. Configure the Meta app and the HTTPS preview callback before live testing; see [Instagram connection setup](../docs/INSTAGRAM_CONNECTION.md). Local ports remain 3210 and 8210.

## Connect YouTube

Creators can authorize a linked channel from its Analytics card. Server-side OAuth uses a separate downloaded Google Web client, encrypted tokens and on-demand refresh. Register the exact callback before live testing; see [YouTube connection setup](../docs/YOUTUBE_CONNECTION.md).

## Connect LinkedIn

Creators can connect their LinkedIn member account to import their name and profile photo.
This uses `openid profile` permissions without email or posting access. It does not provide
follower analytics, a public vanity URL, or real-world identity verification.
See [LinkedIn connection setup](../docs/LINKEDIN_CONNECTION.md) for app credentials and the callback.

## Connect X

Creators can connect X with OAuth 2.0 to import their username, profile photo, and available
follower/following/post counts. Read-only access renews while authorized, with profile snapshots
cached for fifteen minutes. See [X connection setup](../docs/X_CONNECTION.md) for OAuth credentials,
callback registration, and developer billing requirements.
