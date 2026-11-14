# Instagram account connections

New Meta apps use **Instagram API with Unified Login**, built on Facebook Login for Business. Creator/Business accounts authorize a business portfolio and share Instagram assets. A Facebook Page is not required. This is separate from Flenzr sign-in.

## Current local setup

The local frontend is exposed through ngrok at `https://chloride-sesame-capably.ngrok-free.dev`, forwarding to port 3210. Backend remains on 8210. Register this exact redirect in Meta's Unified Login configuration:

```text
https://chloride-sesame-capably.ngrok-free.dev/api/social/instagram/callback
```

In the private `backend/.env`:

```dotenv
INSTAGRAM_LOGIN_MODE=unified
INSTAGRAM_APP_ID=<Meta app ID>
INSTAGRAM_APP_SECRET=<Meta app secret>
INSTAGRAM_CONFIG_ID=1165832983065314
INSTAGRAM_REDIRECT_URI=https://chloride-sesame-capably.ngrok-free.dev/api/social/instagram/callback
INSTAGRAM_API_VERSION=v26.0
SOCIAL_TOKEN_ENCRYPTION_KEY=<existing persistent Fernet key>
```

Keep credentials and tokens server-only. Do not regenerate the encryption key: it also encrypts YouTube credentials. The shared credentials column is provided by migration `0007_instagram_credentials`.

Set `APP_ORIGIN` in `web/.env.local` to the HTTPS origin; Next's development allowlist derives the tunnel hostname from it. Use that HTTPS origin to sign into Flenzr before connecting Instagram, so the session cookie reaches the callback. Localhost cookies are not shared with the tunnel. During preview testing, same-origin mutations must also use the preview origin. To return to localhost development, remove/reset `APP_ORIGIN` and restart the frontend. Google sign-in through Supabase requires separately allowing the preview callback in Supabase; email/password sign-in avoids that extra OAuth configuration.

Ngrok must remain running. If its domain changes, update the Meta redirect, backend redirect and frontend origin together. The configuration ID is not secret; the app secret and access tokens are. Never paste the app secret or token into chat or Git.

## Meta configuration and test flow

1. Create the app with **Manage messaging & content on Instagram**, associated with the Flenzr business portfolio.
2. Under **API setup with Unified login**, create/select the compatible configuration and save the redirect above.
3. The current configuration requests `instagram_basic` and `instagram_manage_messages`; the template locks both as required. Ads, publishing and comments permissions were removed. Flenzr discloses the messaging permission but does not implement message reading/sending. Do not claim this configuration is read-only.
4. Add a professional account as Instagram Tester and accept its invitation for token generation. Unified Login does not support Instagram test-user identity as an app-role substitute. For the login-button test while unpublished, choose **Continue with Facebook** and use a person listed in the app's roles. Standard Access is for app-role people; public access requires applicable Advanced Access/App Review and Live mode.
5. Open the HTTPS Flenzr preview, sign in, open **Studio Overview → Link social account → Instagram → Connect Instagram**. No username entry or bio code is required; the shared Instagram accounts are added and verified on callback. Existing links can reconnect from the account row or Analytics. Select the portfolio owning that account and share the matching account. The ad account is optional and unused.

## Implemented behavior

The backend uses the generated Facebook `/dialog/oauth` URL with client ID, configuration ID, the exact redirect, code response type, `prompt=login` and a random single-use state. Because Flenzr navigates the full browser tab, it omits Meta’s optional `display=popup` parameter. State is stored hashed, owner-scoped, expires after ten minutes, and binds the flow to the app/configuration/mode. The callback exchanges the code server-side at `graph.facebook.com/v26.0/oauth/access_token`.

`/me?fields=client_business_id` identifies the client's business portfolio. `/me/assigned_instagram_accounts?fields=id,username` identifies shared Instagram assets. For new connections, the backend fetches profiles by the shared asset IDs and automatically adds their usernames. For reconnecting a specific existing link, it matches that username against shared assets before verifying. Up to 20 accounts can be added in one connection, and reconnecting existing usernames does not duplicate them. `/me` is never treated as the Instagram profile. Assigned accounts paginate on a fixed Graph endpoint with bounded cursor traversal; provider-supplied URLs are not followed.

The Business Integration System User access token is encrypted in the creator's private credentials, with account ID, business ID, configuration ID, app ID and expiration. A configuration can issue non-expiring tokens; revocation still requires reconnection. Basic profile snapshots cache for five minutes and subsequent refreshes fetch the stored account ID. There is no background refresh or BISU token-management integration. Provider errors are sanitized. Removal/editing invalidates pending authorization and stored access; disconnect deletes local credentials while retaining the linked handle. Users can revoke the business integration separately in Meta.

Available UI data: profile image, followers, following, and media count, when returned. Missing values remain unavailable; zero stays zero. Insights, reach, engagement, demographics, publishing, messages and webhook subscriptions are not implemented by this account-connection flow. No webhook permission is exercised just by connecting. Full platform rollout still needs applicable webhook, privacy/data-deletion and App Review work.

## Existing older apps

`INSTAGRAM_LOGIN_MODE=instagram` retains the older Instagram Login exchange for already eligible apps using Instagram-product credentials and `instagram_business_basic`. It uses `graph.instagram.com`, requires positive token expiry and reconnects on expiration. Do not use Meta Unified Login credentials/configurations with that mode.

## Validation

Tests mock providers and verify mode-specific URLs, owner/state binding, token encryption, assigned-account identity, business ID storage, non-expiring credentials, cached/fresh stats, invalid grants, removal, disconnect, configuration changes and replay. These tests do not prove live Meta consent; that requires completing authorization in a browser with the test account.

Primary references (retrieved through a text reader when Meta blocked direct automated access):
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/authentication
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/permissions
