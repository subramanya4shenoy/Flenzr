# Facebook Pages connection

Flenzr connects Facebook Pages managed by the signed-in person. Personal Facebook profiles are not imported. This is separate from the Instagram configuration, even when both use the same Meta app.

## Meta setup

1. Open the existing [Flenzr Meta app](https://developers.facebook.com/apps/29262710206659047/).
2. Enable the Facebook Login for Business / Pages use case if it is not available in the app yet. Under **Facebook Login for Business → Configurations**, create a **new configuration** for Facebook Pages. Keep the existing Instagram configuration unchanged.
3. Choose **User access token**, permissions `pages_show_list`, `pages_read_engagement` and `pages_read_user_content` (needed for recent-post reactions and comments). The Assets step is skipped for User tokens; Pages are shared during consent. A system-user / Instagram-only configuration is unsuitable for this connection.
4. Register the exact callback under Facebook Login's **Valid OAuth Redirect URIs**:
   `https://chloride-sesame-capably.ngrok-free.dev/api/social/facebook/callback`
5. Copy the new configuration ID into `FACEBOOK_CONFIG_ID` in `backend/.env`.
6. Keep `FACEBOOK_REDIRECT_URI` equal to that registered callback. Restart the backend after changing environment variables. Start from the same HTTPS origin and sign in there, so the callback has the session cookie.
7. For development, test with a Meta app administrator/tester who also has access to the Pages, and explicitly share the Pages during consent. If adding a permission to an existing configuration, reconnect each Page to obtain a new grant; existing tokens do not acquire permissions automatically. For other customers, obtain the required Advanced Access through Meta App Review and complete any verification requirements shown in the app dashboard.

The existing `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET` are reused if both Facebook app credential settings are blank. If using a separate app, set **both** `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET`. Reuse the existing `SOCIAL_TOKEN_ENCRYPTION_KEY`; rotating it would invalidate existing social tokens. These settings belong only in the backend environment.

## User experience

Studio Overview → **Connect Facebook Pages** → approve Page access at Meta. A single accessible Page imports automatically. With multiple Pages, Flenzr shows their names/photos and lets the user choose up to 20. Nothing is selected by default. Reloading the selection URL reopens the chooser while its ten-minute session is valid. Cancel discards pending credentials. Another connection can add more Pages later without duplicating existing Pages.

Cards show the Page name, photo, category, followers and available likes. Missing metrics display a dash. Likes are intentionally unavailable unless Meta explicitly identifies a classic Page: `fan_count` can represent followers on New Pages Experience. This integration does not request publishing, messaging or insights permissions, and does not manufacture post analytics, engagement or demographics.

## Storage and validation

OAuth state is hashed, owner-bound, single-use, expires after ten minutes and is pinned to the app/configuration/callback/API version. Page discovery uses the User token; only encrypted Page tokens are persisted. User tokens are not stored. Pending selection exposes only Page IDs/names/avatar URLs plus an owner-bound selection ID; it never exposes access tokens. Page profile reads use the Page token and `appsecret_proof`.

Imports validate the selected IDs against that owner's pending grant and read every selected Page before saving the batch. A reconnect must return the existing Page ID. Removal invalidates its reconnect flow; late callbacks cannot restore it. Unselected staged tokens are discarded after successful import, cancellation or a recorded provider failure. Pending grants stop being usable at expiry; they are overwritten on the next connection.

Page token use is conservatively limited to the long-lived User grant's expiry. Reconnect after expiry/revocation or an app credential change. Stats are cached for five minutes on the backend and use the existing owner-scoped UI cache and image proxy. Disconnect deletes local Page credentials while retaining the listed Page; Remove deletes the listing and credentials. Other connected networks are preserved. No database migration is required: the existing private social credential storage is used.

Provider failures expose fixed messages and numeric diagnostic codes only. Troubleshooting: `FACEBOOK_NOT_CONFIGURED` → check configuration/env; `FACEBOOK_USER_LOGIN_REQUIRED` → choose User access token in the new configuration; `FACEBOOK_PERMISSION_REQUIRED` → grant both permissions; `FACEBOOK_NO_PAGES` → verify Page access and explicitly share Pages; `FACEBOOK_POST_PERMISSION_REQUIRED` → enable `pages_read_user_content` in the Pages use case and login configuration, then reconnect the Page. Unpublished apps cannot connect arbitrary public users.

## References

- [Facebook Login for Business](https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business)
- [User Pages edge](https://developers.facebook.com/docs/graph-api/reference/user/accounts/)
- [Page fields and Page access tokens](https://developers.facebook.com/docs/graph-api/reference/page/)
