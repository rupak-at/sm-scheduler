# Test Instagram with your own account

The application now has Instagram sign-in, account connection, JPEG drafts/scheduling,
and an always-on publishing worker. Real authorization and a real publish still need
verification with your account and Meta app. Automated tests simulate Meta responses;
they never authorize or publish to a real account.

## Account and app settings

1. Use your own **Business or Creator** Instagram account. Switch a personal account
   to a professional account in Instagram settings first if necessary.
2. Create/configure a Meta developer app for **Instagram API with Instagram Login**.
   Copy its **Instagram app ID and Instagram app secret** into your local environment.
   This implementation does not use Facebook Login or the retired Basic Display API.
3. For development, give your account the required app/tester role and accept any
   tester invitation. Enable the profile and content-publishing permissions in the app.
   Public users outside your app roles require Meta's applicable review/access settings.
4. Register the exact callback below in the app's Instagram Login configuration.
   Check the currently supported Graph version in your dashboard; pin that version in
   `INSTAGRAM_GRAPH_VERSION`. Do not assume that an arbitrary version remains supported.

Meta's [official Instagram collection](https://www.postman.com/meta/workspace/instagram/documentation/23987686-9386f468-7714-490f-9bfc-9442db5c8f00)
confirms professional account support, Instagram Login without a linked Facebook Page,
and the current `instagram_business_basic` / `instagram_business_content_publish` scope names.

Reference pages: [Business Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login/),
[content publishing](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing/),
[long-lived tokens](https://developers.facebook.com/docs/instagram-platform/reference/access_token/),
and [renewal](https://developers.facebook.com/docs/instagram-platform/reference/refresh_access_token/).
These Meta pages were login/rate-limit restricted during implementation; verify their
current requirements in your developer account before the first live test.

## Local HTTPS and environment

Meta needs a publicly reachable HTTPS callback and photo URL. Expose the Next.js app
(port 3000) through your chosen HTTPS development tunnel. Visit the **tunnel URL** for
the entire login/connection flow: cookies created at `localhost` will not be available
on a different tunnel hostname.

Run `npm run setup:env` to generate an independent token encryption key while preserving
existing values. Fill these in the root `.env`; keep secrets out of git and browser code:

```dotenv
WEB_ORIGIN=https://your-web-tunnel.example
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret
INSTAGRAM_GRAPH_VERSION=v25.0
INSTAGRAM_REDIRECT_URI=https://your-web-tunnel.example/api/auth/instagram/callback
TOKEN_ENCRYPTION_KEY=your_generated_32_byte_base64_key
MEDIA_PUBLIC_URL=https://your-web-tunnel.example
MEDIA_STORAGE_PATH=.data/media
```

`v25.0` is an example; use a supported version from your app dashboard.
The callback must exactly equal `WEB_ORIGIN` plus `/api/auth/instagram/callback`.
`MEDIA_PUBLIC_URL` is an HTTPS **origin**, serving the app's `/api/media/public/:id` route.
Leave `apps/web/.env.local` pointing at the internal API, normally `http://localhost:4000`.
Restart web, API, and worker after changing credentials/origins.

Keep the same `TOKEN_ENCRYPTION_KEY` in API and worker. Losing/changing it prevents
existing ciphertext from being decrypted; reconnect accounts after a planned key change.
Key version 1 is stored with each token; multiple active keys/automated rotation are future work.
The media directory is ignored by git. Back it up and use a persistent API volume.
This first implementation uses local disk, not an S3 bucket or serverless ephemeral storage.
The worker signs media links; it does not download media from the API's disk.

## Apply the migration yourself

The new committed migration adds OAuth attempts, token lifecycle fields, immutable account
ownership, and durable publishing markers. The configured creator database was not migrated
by the agent. Apply it when ready:

```sh
npm run db:check
npm run db:deploy
npm run dev
```

The migration adds a unique provider/account constraint. If an existing database has the
same Instagram identity attached to different users, resolve those duplicates before deployment.
Fresh isolated databases pass all three migrations.

## Sign in, connect, and publish

- From `/login` or `/signup`, choose **Continue with Instagram** and grant both permissions.
  This creates/opens your workspace and connects the approved Instagram account.
- If you already have an email workspace, sign in there first and choose **Connect Instagram**.
  Later Instagram sign-in opens that same workspace. Connecting while signed out is rejected.
- Accounts already owned by another workspace cannot be silently transferred or email-merged.
- Use **New post**, upload a JPEG, select the account, and write a caption (maximum 2,200 characters).
  Uploads are decoded, auto-oriented, re-encoded without original metadata, and resized to
  at most 1,440 px wide. They must be at least 320 px wide and have a 4:5–1.91:1 aspect ratio.
  Maximum upload size is 8 MB. Videos, carousels, and Stories are not implemented.
- **Save draft** persists without publishing. **Schedule post** uses your browser's IANA timezone
  and saves a UTC instant at least one minute ahead. The worker must remain running.
- Edit/reschedule unpublished content, cancel pending posts, or delete unused drafts. Publishing
  history is retained. Safe failures can be edited or retried; unconfirmed sends cannot be retried.
- The worker scans PostgreSQL every 10 seconds. The workspace refreshes statuses every 20 seconds;
  **Refresh status** checks immediately. **Needs attention** shows failed/unconfirmed results.
- If a post is `UNCERTAIN`, inspect Instagram before making another copy. A lost publish response
  may still mean success. The worker checks the saved container and never automatically resends
  after the durable send marker. A confirmed published container can have no recovered post ID.

## Token behavior

The callback exchanges the authorization code on the API, exchanges the short-lived credential
for a long-lived access token, checks professional identity and granted scopes, then encrypts it
with AES-256-GCM. The browser receives session cookies and channel metadata, never provider tokens.

Instagram Login renewal uses the existing long-lived token with `ig_refresh_token`;
there is no separate generic refresh-token credential to store for this flow.
Expiry is always derived from Meta's `expires_in` response, not a hard-coded date.
The worker checks connections every six hours (maintenance runs every 30 minutes) and
before every publish. It renews within ten days of expiry when the credential is at least
24 hours old and still valid. Newly issued tokens are not renewed early.
Expired/revoked credentials or missing permissions require reconnection. Concurrent
updates cannot resurrect a disconnected account because token writes compare the stored ciphertext.

## Verification and deployment limits

Automated integration checks use isolated PostgreSQL/Redis and simulated provider responses.
They cover browser-bound one-use state, real sessions, ownership, image validation, draft
concurrency, cancellation, duplicate delivery, container recovery, token renewal/revocation,
and uncertain outcomes. They do not prove Meta app approval or live publishing eligibility.

Production deployment, verified hosting/proxy IP settings, S3 storage, media retention/quotas,
provider deauthorization/data-deletion callbacks, and account erasure are not implemented.
Keep this as a private development test until those hosting/Meta lifecycle requirements are addressed.
No live Instagram authorization, post, push, or deployment was performed during implementation.
