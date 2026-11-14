# X account connections

Creators choose **Connected Accounts → Connect X**, sign in on X, approve read access, and
return to Flenzr with their username, name, photo, and available follower/following/post counts.
No manual username or bio code is needed for a new connection.

## App setup

1. Open https://console.x.com and create/select the Flenzr developer app.
2. Enable **OAuth 2.0** under the app's **User authentication settings**. Choose **Web App**
   (a confidential client), not a native or single-page public client. Set the application
   permission to **Read** and provide the website URL and other required app information.
3. Register this exact callback for the current preview:

   ```text
   https://chloride-sesame-capably.ngrok-free.dev/api/social/x/callback
   ```

4. Copy the **OAuth 2.0 Client ID and Client Secret** into private `backend/.env`:

   ```dotenv
   X_CLIENT_ID=your-oauth2-client-id
   X_CLIENT_SECRET=your-oauth2-client-secret
   X_REDIRECT_URI=https://chloride-sesame-capably.ngrok-free.dev/api/social/x/callback
   ```

   OAuth 1.0 API keys, API secrets, standalone bearer tokens, and personal access tokens are
   different credentials and will not work here. Never put the client secret in frontend env
   variables, chat, or Git. Reuse the existing `SOCIAL_TOKEN_ENCRYPTION_KEY` so the other networks
   keep working.
5. Check the X Developer Console for the API access and credit balance required by the
   `/2/users/me` endpoint. X uses usage-based billing. Current prices and spending controls
   are in the console; setting up Flenzr does not buy credits or enable automatic recharge.
6. Restart the backend after saving `.env`, then sign in to Flenzr using the HTTPS preview
   origin and click **Connect X**. Keep ngrok running. If the hostname changes, update the
   provider callback, backend redirect and frontend `APP_ORIGIN` together.

## Permissions and data

The requested scopes are `tweet.read users.read offline.access`. X's endpoint mapping requires
the first two for user lookup; `offline.access` allows automatic renewal. No posting, messaging,
email, follow-list, or follow-write permissions are requested. The app calls only the token
endpoint and `/2/users/me?user.fields=profile_image_url,public_metrics`.

Returned profile counts are used as-is. Missing or invalid counts remain unavailable, while
real zeroes stay zero. Both current `post_count` and legacy `tweet_count` responses are supported.
Impressions, average views, engagement rates, and audience demographics are not fetched or
invented. The ownership badge indicates access to the authorized account, not an X paid badge
or real-world identity verification.

## Storage and lifecycle

- The backend creates a random, hashed, owner-bound state and encrypted PKCE verifier.
  State expires after ten minutes, binds the configured client/redirect, and is consumed
  before provider calls so callbacks cannot race or replay.
- Token exchange uses S256 PKCE and HTTP Basic client authentication over HTTPS.
  Access and refresh tokens are encrypted with the shared Fernet key, never sent to the browser.
- Reconnecting a stored account matches the immutable X user ID, supporting username changes.
  Reconnecting a manually linked handle requires the authorized username to match.
- Repeated authorization of the same X ID does not duplicate the account. Old credentials
  are removed when a changed username is saved. A username change found during a stats read
  asks the creator to reconnect.
- Stats snapshots cache for fifteen minutes on the backend to reduce paid reads. There is
  no background polling. Browser refresh and the stats refresh button respect the same cache.
- Expired access tokens refresh on demand. Rotated refresh tokens are persisted even when
  the subsequent profile read fails. Revoked/invalid access asks the creator to reconnect.
- Disconnect removes local credentials and ownership verification but retains the account
  listing. Edit/remove deletes old tokens and any pending flow bound to that handle.
  The creator can also revoke Flenzr from X's own connected-app settings.
- Photos use the restricted image proxy; only `pbs.twimg.com` was added, without following
  redirects or accepting arbitrary external image hosts.
- Billing, rate limiting, scope rejection, cancellation, expiry and mismatched accounts have
  fixed error outcomes. Provider messages and credentials are not copied into redirect URLs.

## Validation

Mock-provider tests cover PKCE and client authentication, state/owner/configuration binding,
replay, encryption, cache reuse, refresh rotation across failed reads, mismatched accounts,
renaming, deduplication, removal, error sanitization, and missing/zero metrics. Frontend checks
cover safe OAuth destinations and callback outcomes. Live consent still requires real app
credentials and applicable X API access.

References:
- https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code
- https://docs.x.com/fundamentals/authentication/oauth-2-0/user-access-token
- https://docs.x.com/fundamentals/authentication/guides/v2-authentication-mapping
- https://docs.x.com/x-api/users/get-my-user
- https://docs.x.com/x-api/getting-started/pricing
