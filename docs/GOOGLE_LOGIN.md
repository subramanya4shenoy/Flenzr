# Google login through Supabase

The app uses the existing Supabase Auth project for Google OAuth and the FastAPI backend for identity validation and access control. No Google client secret is stored in the browser or application repository.

## Current configuration

A read-only request to the configured project's `/auth/v1/settings` confirmed on 20 October 2026 that Google is **disabled**, email login is enabled, and signup is allowed. The application integration is complete, but real Google consent/login cannot be tested until the provider is enabled. No live accounts were created while testing.

## Enable Google

1. In Google Cloud, create an OAuth client of type **Web application**. Configure the consent screen and test users if the client is still in testing mode.
2. Add your website origin as an authorized JavaScript origin. For local development, use the exact host and port you open in the browser, such as `http://localhost:3210`.
3. Add **the Supabase project callback** as the Google client's authorized redirect URI: `<NEXT_PUBLIC_SUPABASE_URL>/auth/v1/callback`. Copy the exact value shown on Supabase's Google provider page.
4. Open **Supabase → Authentication → Sign In / Providers → Google**, enable it, and save the Google client ID and client secret there. Keep nonce checking enabled. Do not put the secret in chat, browser variables, or source code.
5. Open **Supabase → Authentication → URL Configuration**. Set the production Site URL and allow the app callback for each development/production origin you use. This app attaches a random `app_state` query parameter, so use a callback-scoped pattern that includes that query, for example:

   - `http://localhost:3210/api/auth/google/callback?app_state=*`
   - `http://127.0.0.1:3210/api/auth/google/callback?app_state=*` if you use that host
   - `https://your-production-domain/api/auth/google/callback?app_state=*`

   Use your actual port/domain. Avoid wildcard domains. Supabase's Site URL origin also permits redirects on that same origin.
6. Behind a reverse proxy, set server-only `APP_ORIGIN` to the canonical website origin. The callback must use the same browser origin as the sign-in request so its flow cookie is available.
7. Click **Continue with Google** on login or creator signup.

Google Cloud's redirect URI points to Supabase; Supabase's redirect allowlist points back to Flenzr. These are different URLs.

Official references: [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google), [redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls), [PKCE sessions](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

## Application flow

- `POST /api/auth/google`: same-origin request; checks Google availability; creates random verifier and state; stores them in a ten-minute HttpOnly cookie; returns the Supabase Google authorization URL with S256 PKCE.
- `GET /api/auth/google/callback`: checks the browser-bound state, origin, expiry, and verifier; exchanges the authorization code with Supabase; syncs the verified identity through FastAPI; checks the actual database role; creates the normal HttpOnly session cookie.
- `/auth/complete`: verifies the resulting session, clears stale account-local data when switching accounts, and navigates only to allowed internal destinations.
- New creators continue onboarding. Existing creators and brand owners enter the appropriate dashboard. Selecting a role does not grant an existing account that role.
- Failed or cancelled callbacks return a readable login error. Tokens are never passed in redirect URLs or localStorage. A failed or replayed callback cannot create a session.

Email/password login continues to use the same backend identity checks. Sessions currently last up to an hour, after which users sign in again.

## Verification

`cd web && npm run test:google` covers disabled provider, same-origin enforcement, PKCE challenge/cookie properties, missing/mismatched/expired callbacks, token exchange failure, backend denial, role denial, onboarding/dashboard destinations, and replay rejection. Run the access and zero-state suites alongside it. Actual Google login requires enabling the provider above.
