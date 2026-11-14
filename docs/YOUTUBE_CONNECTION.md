# YouTube account connection

YouTube authorization is separate from Google sign-in and public channel lookups. In Studio Overview, open **Link social account**, select **YouTube**, then click **Connect YouTube**. Google authorization supplies the channel handle, ID and basic details; Flenzr adds the account and verifies ownership automatically, without username entry or a bio code. Existing links can be connected or reconnected from their row or Analytics card; these must authorize the matching channel ID. Reauthorizing the same channel does not create a duplicate. Multiple linked channels are supported independently. Channels without a handle must set one in YouTube before connecting.

## Local configuration

The downloaded Google **Web application** credential is stored at `backend/.secrets/youtube-oauth-client.json`. This directory is ignored by Git; never publish the file or its client secret. Relative paths are resolved from `backend`, independent of the server working directory. The file location can be overridden with `YOUTUBE_OAUTH_CLIENT_FILE`.

Backend settings:

```dotenv
YOUTUBE_OAUTH_CLIENT_FILE=.secrets/youtube-oauth-client.json
YOUTUBE_REDIRECT_URI=http://localhost:3210/api/social/youtube/callback
SOCIAL_TOKEN_ENCRYPTION_KEY=<persistent Fernet encryption key>
```

Retain the encryption key across restarts. It also encrypts Instagram credentials. Changing it requires reconnecting previously connected accounts. Migration `0007_instagram_credentials` supplies the shared encrypted credential column; apply pending migrations with `DEBUG=false .venv/bin/alembic upgrade head` from `backend`.

In Google Cloud, enable **YouTube Data API v3**, configure an External OAuth audience in Testing, add the channel owner's Google account as a test user, and add `https://www.googleapis.com/auth/youtube.readonly` under Data Access. In the newly created YouTube Web client, register this exact **Authorized redirect URI**:

```text
http://localhost:3210/api/social/youtube/callback
```

No JavaScript origin is required for this server-side authorization flow. Use Flenzr through `http://localhost:3210`, not a different hostname, when connecting. HTTPS preview/deployment requires updating the backend redirect URI, Google client allowlist, and frontend canonical origin together. Restart the backend after setting credentials/environment variables.

## Security and lifecycle

Routes require the active creator and scope all reads/writes to their profile. Random hashed state expires after ten minutes, is single-use, and is consumed before provider exchange under a database row lock. PKCE uses S256; the verifier and access/refresh tokens are encrypted at rest. Removal/editing invalidates that channel's credentials and pending flow. One pending YouTube authorization per creator is supported. Callback responses contain fixed status messages, never provider tokens or error bodies.

Access tokens refresh on demand when stats are requested near expiry; there is no background scheduler. Stats snapshots are cached for five minutes. Revoked/expired refresh grants require reconnecting. External apps in Testing can receive refresh tokens with a short lifetime (typically seven days for these scopes); test reconnection as part of rollout.

Disconnect deletes local credentials and clears the ownership badge while retaining the linked handle. It does not revoke the entire Google application grant: users can revoke that separately in their Google Account's third-party connections. Public stats may still load after disconnect when the separate public API key is configured.

Only channel identification and basic channel counts are included. Watch time, revenue, demographics, and time-series analytics are not implemented and need separate permissions/API work. Public launch requires completing applicable OAuth verification and branding requirements on a domain controlled by Flenzr.

## Validation

Backend tests mock Google and exercise state, owner binding, channel mismatch, missing permission, replay, encrypted storage, refresh, removal, disconnect and public-schema token exclusion. Web tests cover callback redirects and owner-stat enrichment. Passing these tests does not establish live Google authorization: that requires registering the callback and completing consent with a test channel.

References:
- https://developers.google.com/youtube/data/guides/auth/server-side-web-apps
- https://developers.google.com/youtube/data/reference/rest/v3/channels/list
