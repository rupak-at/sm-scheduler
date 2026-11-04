# TikTok setup and live testing

TikTok account connection and captioned photo/video scheduling are implemented through
Content Posting Direct Post. Automated tests use fixtures. Real TikTok authorization, media
fetching and publishing remain unverified. Read [the research](tiktok-research.md) first.

## App prerequisites

Create/configure your application in [TikTok for Developers](https://developers.tiktok.com/).
Add Web Login Kit and Content Posting API Direct Post. Obtain authorization for
`user.info.basic` and `video.publish`. Register the exact HTTPS callback:

```text
https://YOUR-FRONTEND-HOST/api/auth/tiktok/callback
```

Use your existing application login before selecting Connect TikTok. TikTok links a publishing
account to that workspace; it does not provide application sign-in. Other creators cannot take
an already-linked TikTok identity by matching its name/email.

TikTok's app review and Direct Post audit are separate from code completion. Its guidelines
expect a broadly available app helping creators publish original content; an internal tool
limited to your team's accounts is not eligible intended use. Prepare a real creator-facing
product, privacy policy, appropriate required callbacks and review demonstration before applying.
Existing production deauthorization/account-erasure work is recorded in project status.

The frontend serves the Privacy Policy at `/privacy-policy` and Terms of Service at
`/terms-of-service`, linked directly from the public homepage footer. In TikTok app details,
enter their full HTTPS URLs on the same official website origin and verify those URL
properties before production review. The pages use `rupakb802@gmail.com` as the public
contact. Review their wording and complete production retention/account-erasure work before
submitting; public pages alone do not satisfy all review criteria. TikTok's current
[app review guidelines](https://developers.tiktok.com/docs/en/app-review-guidelines) also
require a fully developed public website, not only a landing or login page.
The [app registration guide](https://developers.tiktok.com/docs/en/getting-started-create-an-app)
specifies a 1024 × 1024 PNG/JPEG icon up to 5 MB. The downloadable project icon is
`frontend/public/brand/social-scheduler-icon-1024.png`; review it alongside the app name
before uploading it in TikTok's app details.

Until the client passes its Direct Post audit, use a **private TikTok account** and explicitly
choose **Only me**. Unaudited clients have a small test-user cap; provider quotas can block posts.
Do not treat a private test as approval for public posting or set the audit flag to bypass review.

## Environment and migration

Add these server-only values to the API and worker environment:

```dotenv
TIKTOK_CLIENT_KEY=YOUR_CLIENT_KEY
TIKTOK_CLIENT_SECRET=YOUR_CLIENT_SECRET
TIKTOK_REDIRECT_URI=https://YOUR-FRONTEND-HOST/api/auth/tiktok/callback
TIKTOK_MEDIA_ORIGIN=https://YOUR-API-HOST
TIKTOK_DIRECT_POST_AUDITED=false
```

The callback must equal API `WEB_ORIGIN` plus `/api/auth/tiktok/callback`. Share the existing
independent `TOKEN_ENCRYPTION_KEY` between API and worker; keep its value so connected Meta
accounts remain decryptable. TikTok access and rotating refresh tokens are both encrypted.
No TikTok credentials belong in frontend/browser environment variables.

The API media origin must route to Express over HTTPS without redirects. In TikTok's app
**URL properties**, verify that domain (for example using its DNS verification) or the exact
`https://YOUR-API-HOST/api/media/tiktok/` prefix. Both photos and videos require this verified
property. Verify the API domain, not the frontend domain unless it serves the same endpoint.

This release adds `20261014160000_tiktok_media_duration`, a nullable normalized-MP4 duration
column. Apply it to your creator database yourself through your usual migration workflow:

```sh
npm run db:deploy
```

The agent tested migrations only on an isolated database. New code selects the duration column,
so apply the migration before starting the updated API/worker. Then restart both processes.
Old records remain; TikTok requires reupload of older videos without recorded duration.
No backfill or migration was run against your configured creator database.

## Cloudinary and media delivery

Continue using [Cloudinary setup](cloudinary-setup.md). Do not pass its protected download
redirect to TikTok. The worker instead supplies a two-hour signed URL on your verified API
origin. Express checks its publication, asset, owner and expiration, reads the protected asset,
and serves bytes directly without redirecting. Photos receive a 1080px delivery rendition;
the stored image and Meta delivery remain unchanged. Video byte ranges are supported.

Keep this endpoint public at the network/proxy boundary: its signed URL authorizes the request,
so TikTok does not send an app session cookie. Retain HTTPS and signature checks. Configure
proxy timeouts/bandwidth for downloads and avoid logging signed query strings. Serving the
asset uses VPS bandwidth while persistent storage remains Cloudinary. Expired, wrong-owner,
wrong-publication and cancelled links fail rather than exposing another creator's media.

## Compose and schedule

1. Log in, open `/planner`, and choose **Connect TikTok** under Your accounts.
2. Grant profile and direct-post permissions; return to the real connected account.
3. Create a post and select TikTok in **Publish to**. Current creator settings load from TikTok.
4. Upload one photo or MP4 and write an editable caption. Photos have an optional title.
5. Explicitly select who may view the post; no privacy option is preselected for a new post.
6. Turn on only the available interactions you want. Photos have no Duet/Stitch controls.
7. Disclose commercial content when relevant, selecting Your brand, Branded content or both.
   Private visibility cannot be used for a paid partnership. Optional AI labeling and recommended
   photo music are deliberate choices.
8. Choose a future time and confirm the TikTok consent/agreement control, then schedule.

The app checks current creator settings again on save and at send time. A changed audience,
interaction restriction, duration limit or posting cap stops the attempt; settings are not
silently substituted. Draft settings persist, but edits/reopening require consent again.
The common MP4 limit is 64 MB, 3 seconds–15 minutes; TikTok additionally requires both dimensions
at least 360px and duration within that account's returned limit. Photos are up to 8 MB before
preparation. Shared captions retain the 2,200-character limit.

## User-authorized live verification

Use only your own consenting test creator and original media. Keep private testing configured
until real audit approval. The user performs these tests; fixture successes prove code behavior.

1. Prove connection returns the intended TikTok account and current posting options.
2. Schedule a small original photo with a caption and Only me visibility. Close the browser.
3. Confirm processing, then completed posting, and inspect the content inside your TikTok account.
4. Repeat with a supported MP4 and distinct caption. Confirm chosen interaction settings.
5. Confirm the signed API URL was fetched without a redirect and the profile's chosen visibility.
6. Verify refresh with the provider-reported token lifecycle and cancellation before sending.
7. Record safe publication/publish IDs, timing and outcome. Do not share tokens, auth codes,
   raw provider bodies or signed download URLs in issues/logs.

A completed private post can have no public post ID. Completion follows TikTok's final status,
not merely accepted upload or inbox delivery, and processing/moderation can take additional time.
Known publish IDs are polled after restarts. If initialization loses its response before an ID
is saved, the outcome stays unconfirmed: inspect TikTok before creating another copy.
Failed TikTok posts require editing/review/rescheduling rather than one-click retry; accepted
failed/uncertain sends retain their duplicate guard. A lost refresh response requires reconnection.
