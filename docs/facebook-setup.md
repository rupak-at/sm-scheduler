# Facebook Pages setup and live test

Facebook Page connection and captioned photo/video scheduling are implemented. Automated
checks use provider fixtures; real Facebook authorization and publishing remain unverified.
Read [the research and decisions](facebook-research.md) for the official references.

## Meta app and account

Use a Facebook Page you manage, with permission to create content (`CREATE_CONTENT`).
Personal profiles and Groups are unsupported. Sign in to this application with email/password
or Instagram; Facebook connection links publishing Pages to that existing workspace.

In the [Meta app dashboard](https://developers.facebook.com/apps/), configure the appropriate
Page-management/Facebook Login use case. Current dashboard labels and permitted products
vary by app. Enable `pages_show_list`, `pages_read_engagement` and `pages_manage_posts`.
Use the Facebook app ID/secret, which can differ from the Instagram Login credentials.

If the app uses Facebook Login for Business, create a login configuration for these Page
permissions/assets, choose **User Access Token**, and set `FACEBOOK_LOGIN_CONFIG_ID`.
This implementation exchanges user tokens for Page tokens; it does not accept business
integration system-user tokens. Choose Pages in Meta's authorization screen. Eligible Pages
you allow are all connected to your current workspace; publishing does not happen on connection.

Register this exact Valid OAuth Redirect URI:

```text
https://YOUR-WEB-HOST/api/auth/facebook/callback
```

Use an HTTPS tunnel for local testing. API `WEB_ORIGIN`, Instagram's existing callback and
Facebook's callback must refer to the same frontend origin. Keep the API upload origin separate
as documented in [Cloudinary setup](cloudinary-setup.md).

App-role/private tests and production access differ. Check the dashboard's permission access
levels, App Review and business-verification requirements before serving external users.
Do not assume a tester publish authorizes public use. Configure privacy policy and required
production callbacks; outstanding erasure/deauthorization work is listed in project status.

## Server environment

Set these in the root untracked `.env`, or in hosted API and worker environments:

```dotenv
FACEBOOK_APP_ID=YOUR_NUMERIC_FACEBOOK_APP_ID
FACEBOOK_APP_SECRET=YOUR_FACEBOOK_APP_SECRET
FACEBOOK_GRAPH_VERSION=v26.0
FACEBOOK_REDIRECT_URI=https://YOUR-WEB-HOST/api/auth/facebook/callback
# Set only when using a Facebook Login for Business configuration:
FACEBOOK_LOGIN_CONFIG_ID=
```

Pin a version supported by your app; current researched examples use v26.0. Keep the independent
32-byte base64 `TOKEN_ENCRYPTION_KEY` identical on API and worker. `npm run setup:env` generates
it when absent; retain the existing key so connected Instagram tokens remain decryptable.
Keep Facebook, Instagram and Cloudinary secrets server-only. Add the Facebook environment values
manually to an existing environment file; `setup:env` preserves existing files/values.

Restart API and worker after setting credentials. The frontend obtains configuration state
from the API, so it needs no Facebook secret or browser environment variable.
No database schema change or migration is needed for this addition. Never migrate the creator
database as part of the test procedure without a separate instruction.

## Connect and prepare

1. Open `/planner` and select **Connect Facebook Pages** under **Your accounts**.
2. Complete Facebook authorization and allow the requested Pages/permissions.
3. Return to the planner; each eligible Page appears with its real name and connection status.
4. Create a post and choose **Facebook · YOUR PAGE** in **Publish to**.
5. Upload a photo or MP4, write the caption/hashtags, and review the composition preview.
6. Save a draft or choose a time at least one minute ahead and schedule.

Page posts are public. Photos use the prepared JPEG; videos use the Page video API and are
not promised to use Facebook's dedicated Reels surface. The existing application accepts
photos up to 8 MB and MP4s up to 64 MB, 3 seconds–15 minutes, with a shared 2,200-character
caption/hashtag limit. These conservative app limits are not claims about Meta's maximum limits.

The background worker checks the current Page token/scopes before sending. Long-lived Page
tokens may have no fixed expiry; Meta can still revoke them or impose a data-access expiry.
Connection maintenance checks both. **Check connection** validates access; **Disconnect**
removes the local encrypted Page token. Facebook reconnect uses a fresh authorization flow.
Facebook token maintenance never calls Instagram's refresh endpoint.

## Authorized live verification

Use only a Page whose owner has approved the two test publications. The user performs this
live test; implementation is not evidence of provider feasibility.

1. Confirm real authorization returns the expected Page and **Check connection** succeeds.
2. Schedule a harmless photo with a distinctive caption; close the browser.
3. Confirm the worker marks it published and the photo/caption appears publicly on that Page.
4. Schedule a supported MP4 with another caption; close the browser.
5. Expect processing first, then published only after Meta reports the video ready and public.
6. Confirm the public video/caption and the stored provider ID; record the pinned API version.
7. Confirm a cancelled schedule does not publish. Disconnect only after test publications finish.

Keep safe timestamps/IDs and outcomes; never paste tokens, authorization codes, signed media
URLs or raw provider responses into logs/issues. Meta must be able to fetch the fresh signed
Cloudinary URL, including for asynchronous video processing.

If the result is **unconfirmed**, inspect the Page before making another copy. The worker polls
known video IDs but never blindly resends after a lost response. A definite API rejection can
be corrected and deliberately retried. If an accepted video later fails processing, its send
marker remains and retry is blocked; verify Facebook before creating a new post.

Common connection errors: allow all three Page scopes; use a Page with content-creation access;
use a Business login configuration issuing User Access Tokens; restart expired connections;
and use the original signed-in browser session. A Page already linked to another workspace
cannot be transferred by another creator. Reconnect the correct workspace or choose other Pages.
