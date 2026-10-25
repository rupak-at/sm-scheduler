# YouTube setup and live verification

YouTube channel connection, MP4 drafts/scheduling and resumable worker uploads are implemented.
Automated tests simulate Google responses. Real Google authorization, Cloudinary video delivery,
YouTube processing and publishing remain unverified; fixture success does not establish feasibility.

## Google project and credentials

Enable YouTube Data API v3 in a Google Cloud project. Create a Web application OAuth client,
configure the consent screen, add development test users and register this exact redirect URI:

```text
https://YOUR-FRONTEND-HOST/api/auth/youtube/callback
```

Set these server-only values in the root `.env` or API/worker hosting environment:

```dotenv
YOUTUBE_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID
YOUTUBE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
YOUTUBE_REDIRECT_URI=https://YOUR-FRONTEND-HOST/api/auth/youtube/callback
```

Keep the existing independent `TOKEN_ENCRYPTION_KEY` identical on API and worker; do not replace
it while adding this provider. No Google secret belongs in Next.js/browser configuration.
The callback must equal `WEB_ORIGIN` plus `/api/auth/youtube/callback`. Restart API and worker
after configuration changes; the planner obtains provider availability from the API.

The app requests `youtube.upload` and `youtube.readonly`, validates actual returned grants,
and requests offline access with explicit account/consent selection. It requires a refresh token
so publishing can continue after closing the browser. Existing workspace login comes first;
Google does not provide application sign-in. Select the intended Google/Brand account with a
single authorized YouTube channel. Channel IDs, rather than emails/names, determine ownership.
[Google's web OAuth guide](https://developers.google.com/identity/protocols/oauth2/web-server)
and [channel lookup](https://developers.google.com/youtube/data/reference/rest/v3/channels/list)
describe these authorization and identity boundaries.

External-user OAuth verification, project access and quotas must be checked in your Google
console before launch. Testing-mode refresh tokens can be short-lived; authorization can be
revoked independently of access-token expiry. See [Google token expiry](https://developers.google.com/identity/protocols/oauth2#expiration).
The current [upload reference](https://developers.google.com/youtube/data/reference/rest/v3/videos/insert)
lists 100 uploads per day in the Video Uploads quota bucket. A 1,000-publication local fixture
test is not evidence of real quota capacity. Confirm the quota actually assigned to your project.

## Apply the migration yourself

`20261025050000_youtube_platform` adds the `YOUTUBE` platform enum value. It does not rewrite
existing accounts/content. The agent applied it only to isolated test databases. Before starting
the updated application against your creator database, apply it through your normal workflow:

```sh
npm run db:check
npm run db:deploy
```

## Compose and schedule

1. Log in and choose **Connect YouTube** under Your accounts. Complete Google authorization.
2. Create a post, select the real connected channel and upload an MP4.
3. Write the caption/hashtags; these become the video description. Add a video title.
4. Choose Private, Unlisted or Public and explicitly answer whether the video is made for kids.
5. Disclose realistic altered/synthetic content and paid promotion where applicable. Subscriber
   notifications start off and can be enabled deliberately.
6. Save a draft or set a time at least one minute ahead. Review the settings and give consent
   after the final edit, then schedule. Reopening/editing/media replacement resets consent.

The app's current media subset is normalized H.264/AAC MP4, up to 64 MB and 3 seconds–15 minutes.
Photos, live streams, playlists, custom thumbnails and dedicated Shorts controls are unsupported.
YouTube may classify eligible uploads independently; this app does not promise Shorts placement.
Titles allow up to 100 characters without angle brackets. The shared caption/hashtag field keeps
its 2,200-character cap and additionally respects YouTube's 5,000-byte UTF-8 description limit.
Category is People & Blogs. See [video metadata](https://developers.google.com/youtube/data/reference/rest/v3/videos).

Uploads **begin at the scheduled time**; the worker does not pre-upload or use `publishAt`.
Processing can finish later. Published means processed and delivered with the chosen visibility;
a Private upload is not a public release. The worker checks channel ownership and requested
visibility again before recording completion. It does not silently change visibility to make a test pass.

## Delivery, recovery and disconnection

The worker reads the owned prepared MP4 from protected Cloudinary (or an existing legacy asset),
verifies its length/header and sends bytes to Google's resumable upload endpoint. Cloudinary
credentials and upload-session capabilities stay server-side. Worker video reads are bounded
to two concurrent downloads, 64 MB each; no permanent new local media storage is introduced.

It saves the send marker before initialization, encrypts the returned upload-session URI, then
uploads. On interruption it probes that exact saved session and resumes only from Google's
confirmed offset. Known video IDs resume read-only processing checks. A lost init response,
expired session or unknown outcome never causes an automatic fresh upload. Review YouTube Studio
before making another copy. Failed uploads require editing/review rather than one-click retry.
These choices follow [Google's resumable protocol](https://developers.google.com/youtube/data/guides/using_resumable_upload_protocol)
with conservative handling of unknown outcomes.

Disconnect stops local publishing and removes encrypted local account credentials; it does not
delete uploaded videos or revoke the entire Google grant, which may be shared with another
connected channel. Users can revoke access in [Google account permissions](https://myaccount.google.com/permissions).
Production privacy-policy, account-erasure and data-retention work remains listed in project status.

## User-run live check

Use your own authorized channel and original video. Start with Private visibility.

1. Connect and confirm the intended channel name/identity and Check connection result.
2. Upload a small MP4, add a distinct title/description, select Private and the correct audience.
3. Schedule, close the browser and keep API/worker running.
4. Verify processing followed by completion in the planner and the matching private video in Studio.
5. Verify title, description, visibility, audience/disclosures and provider video ID.
6. Test cancellation before sending, then test Unlisted/Public only after confirming project access
   and deliberately selecting the desired visibility.

Record safe IDs/timestamps/outcomes only. Never share Google codes, access/refresh tokens,
encrypted credentials, upload-session URIs or signed Cloudinary URLs. No live upload was performed
by the agent as part of implementation/testing.
