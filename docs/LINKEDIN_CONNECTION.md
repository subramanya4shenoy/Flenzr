# LinkedIn member connections

Creators choose **Connected Accounts → Connect LinkedIn**, approve profile access on LinkedIn,
and return to Flenzr with their member name and profile picture imported. Username entry,
bio codes, and posting access are unnecessary.

## Configure the LinkedIn app

1. Create or select an app at https://www.linkedin.com/developers/apps. Complete LinkedIn's
   app registration requirements, including the associated LinkedIn Page when requested.
2. Under **Products**, request **Sign In with LinkedIn using OpenID Connect**. The app must
   have the `openid` and `profile` scopes available before testing. No `email` scope is requested.
3. Under **Auth**, register the exact HTTPS redirect URL. For the current preview it is:

   ```text
   https://chloride-sesame-capably.ngrok-free.dev/api/social/linkedin/callback
   ```

4. Copy the client ID and client secret from **Auth** into private `backend/.env`:

   ```dotenv
   LINKEDIN_CLIENT_ID=your-client-id
   LINKEDIN_CLIENT_SECRET=your-client-secret
   LINKEDIN_REDIRECT_URI=https://chloride-sesame-capably.ngrok-free.dev/api/social/linkedin/callback
   ```

5. Reuse the existing `SOCIAL_TOKEN_ENCRYPTION_KEY`. Changing it would break previously
   encrypted YouTube and Instagram credentials. Restart the backend after changing `.env`.
6. Sign in to Flenzr at the same HTTPS origin, then choose **Connect LinkedIn**. Keep the
   ngrok tunnel running. If its hostname changes, update the app redirect, backend redirect,
   and frontend `APP_ORIGIN` together.

## What is imported

Only the member identifier, name, and profile picture returned by LinkedIn's `/v2/userinfo`
are used. Email is neither requested nor stored. OAuth tokens are encrypted server-side and
never returned to the browser. The name and photo are display metadata.

LinkedIn OIDC does not supply a public vanity URL or follower/post analytics. An internal
opaque account key is never displayed as an `@username` or linked to `/in/<key>`. Existing
manual LinkedIn profile links remain separate: authorizing one member cannot establish
ownership of an arbitrary manually entered vanity URL. No identity-verification badge is
granted; the UI says **Account connected**.

## Lifecycle and security

- Authorization-code flow uses a random hashed owner-bound state, a ten-minute expiry,
  and binding to the configured client and redirect. Consumed callbacks cannot replay.
- The backend exchanges the code using the client secret over HTTPS and reads the profile
  directly from LinkedIn's fixed userinfo endpoint. It does not parse or trust unverified
  ID-token claims. This links a social account; it does not log the user into Flenzr.
- Tokens are encrypted with the existing Fernet key. Profile snapshots cache for five minutes.
  On refresh the returned member must match the stored subject.
- When the access token expires, the creator reconnects. No automatic refresh token support
  or restricted LinkedIn analytics/marketing access is assumed.
- Reconnecting the same member reuses the account. Reconnecting a specific linked member
  rejects a different member. Editing/removal deletes its stored token and pending bound flow.
- Disconnect removes local access credentials while retaining the imported display metadata.
  Members can also revoke Flenzr's access in LinkedIn's own connected-app settings.
- Profile images use the restricted image proxy; only LinkedIn CDN hosts were added to its
  allowlist. Redirects to arbitrary hosts remain blocked.

## Validation

Backend tests cover state/owner/configuration binding, replay, encryption, expiry, profile
subject mismatch, manual-link separation, deduplication, removal, and sanitized failures.
Frontend tests cover callback outcomes, safe redirect handling, and server profile metadata.
These mock-provider checks do not prove live authorization; complete that after app setup.

References:
- https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
- https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
