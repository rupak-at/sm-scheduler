# Facebook integration research — 2026-10-14

The user requested Facebook alongside Instagram, including photos and videos with captions.
This implementation targets **managed Facebook Pages** through official Meta APIs. Real
Facebook authorization and publishing are pending; fixtures verify application behavior.

## Sources and findings

Read Meta's live documentation directly on 2026-10-14. The browser research service received
429 responses; direct retrieval succeeded. Current endpoint examples use Graph API v26.0.
The application requires an explicit version supported by the configured Meta app.

| Question                                     | Official evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Implementation decision                                                                                                                                                                                                                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Which accounts can publish?                  | [Page photos reference](https://developers.facebook.com/docs/graph-api/reference/page/photos/) and [Page videos reference](https://developers.facebook.com/docs/graph-api/reference/page/videos/) require a Page token obtained by someone with `CREATE_CONTENT` task access.                                                                                                                                                                                        | Connect authorized managed Pages; do not offer personal profiles or Groups.                                                                                                                                                                                                                           |
| Which scopes are necessary?                  | These two endpoint references and [Video API publishing](https://developers.facebook.com/docs/video-api/guides/publishing/) specify `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`. [Permissions reference](https://developers.facebook.com/docs/permissions/) lists the latter's dependencies.                                                                                                                                                    | Request only these three scopes; inspect granted scopes before saving or publishing. Broad guides include permissions for other Page operations; comments, moderation, ads and webhooks are outside this release.                                                                                     |
| How are Pages discovered?                    | [User accounts edge](https://developers.facebook.com/docs/graph-api/reference/user/accounts/) and [Page access-token guide](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/) return Page IDs, names, tokens and tasks.                                                                                                                                                                                                      | Exchange the code for a user token, exchange that for a long-lived user token, then enumerate authorized Pages. Filter `CREATE_CONTENT`; connect all eligible Pages the user allows in Meta's consent UI.                                                                                             |
| How does authorization work?                 | [Manual Facebook Login flow](https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow/) documents code/state/callback handling. [Facebook Login for Business](https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/) documents configurations and different token types.                                                                                                                                           | Require an existing app session; bind a ten-minute signed cookie and atomic state record to that same user/session. Optional Business configuration must issue a **User Access Token**, from which Page tokens are obtained. Business integration system-user tokens are outside this implementation. |
| Can Page access be assumed permanent?        | [Long-lived tokens](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/) describes Page tokens without a fixed expiration and conditions that invalidate them. [Debug token reference](https://developers.facebook.com/docs/graph-api/reference/debug_token/) exposes app, type, validity, Page identity, scopes, granular targets, token expiry and data-access expiry.                                                        | Validate these fields plus Page identity. Store the earliest nonzero token/data-access expiry; null represents no reported fixed expiry. Recheck before sending and periodically; require reconnection after expiry/revocation. Never reuse Instagram's refresh endpoint.                             |
| How are captions and photos sent?            | [Page posts guide](https://developers.facebook.com/docs/pages-api/posts/) and [Page photos](https://developers.facebook.com/docs/graph-api/reference/page/photos/) document the photo URL/caption and returned photo/post IDs.                                                                                                                                                                                                                                       | Send the prepared JPEG's fresh signed Cloudinary URL and caption to `/{page-id}/photos`, with `published=true`. Save the returned Page post ID.                                                                                                                                                       |
| How are videos sent?                         | [Page videos](https://developers.facebook.com/docs/graph-api/reference/page/videos/) documents `file_url`, `description` and `published`; [Video API publishing](https://developers.facebook.com/docs/video-api/guides/publishing/) uses the `graph-video.facebook.com` host. Meta's [official generated video schema](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/advideo.py) includes `published` and `status`. | Send the prepared MP4's signed URL with its caption as `description`. Persist the returned video ID immediately. Poll `id,status,published`; mark published only when the returned ID matches, the video is ready and `published` is true.                                                            |
| Why not use the Reels endpoint for all MP4s? | [Reels publishing guide](https://developers.facebook.com/docs/video-api/guides/reels-publishing/) specifies a separate upload/finalize flow and narrower media constraints. Meta's [official Postman collection](https://www.postman.com/meta/facebook/documentation/r56bjfd/facebook-api?entity=request-23987686-a9ea20fe-d410-4804-8bbe-5cc5985e9443) illustrates that flow but contains older limits.                                                             | Use the documented Page video endpoint. Do not label Facebook uploads as Reels or inherit Instagram Reel limits as a Facebook API promise. Dedicated Facebook Reels and Stories are outside this release.                                                                                             |

## Reliability and security decisions

Scheduling remains durable in PostgreSQL; the shared BullMQ queue carries only publication IDs.
Keep its existing deployed name, `instagram-publishing`, so pending Instagram jobs survive rollout.
The worker dispatches using the stored account provider, with concrete provider modules.
Both configured providers can run together; Facebook can also run without Instagram credentials.

Before each remote write, check owner/media/type, connection validity and scope evidence.
Persist the send marker under the active lease, with a final connection/ciphertext guard.
Duplicate deliveries cannot claim the same active lease. A confirmed provider rejection permits
a deliberate retry; transport failures, malformed success responses and 5xx responses remain
ambiguous. A known video ID can be polled across restarts without another upload. Readiness does
not alone prove publication: require both ready status and Meta's public `published` flag.

A lost photo response or lost video response before its ID is saved has no trustworthy remote
identifier to reconcile. Keep it `UNCERTAIN`; never match by caption, guess a post ID or resend.
The user must inspect Facebook before creating another copy. A crash between saving the send
marker and receiving a result has the same conservative outcome. Video processing exceeding
one hour is flagged uncertain, with subsequent read-only checks. Explicit processing failure
retains the send marker and is not automatically retried.

Reuse AES-256-GCM TokenVault with a separate `facebook:1:<page-id>` authenticated-data namespace.
Existing Instagram ciphertext keeps its original namespace. Store no long-lived user token,
provider token in Better Auth, browser credential, raw response or secret in logs. Graph requests
use bearer authorization and app-secret proof; token exchanges/inspection remain server-only.
Provider pagination URLs are never followed: rebuild requests on the trusted Graph host from
validated cursors, with a bounded page count. All authorized Pages save in one transaction;
a cross-workspace ownership conflict rolls back the entire connection.

## Product constraints and release gates

The existing upload policy remains: still JPEG/PNG/WebP/AVIF inputs up to 8 MB become JPEGs;
H.264/H.265 MP4 inputs up to 64 MB, 3 seconds–15 minutes, become H.264/AAC. These are application
limits, not the maximum formats/durations Facebook offers. The shared caption editor retains
its 2,200-character and 30-hashtag limits. One post targets one account/Page and contains one
photo or video. Personal-profile publishing, multi-target crossposting, text-only posts,
carousels, Facebook Login as an application sign-in method and dedicated Reels are outside scope.

Meta's [access levels](https://developers.facebook.com/docs/graph-api/overview/access-levels/),
[App Review](https://developers.facebook.com/docs/app-review/) and
[Business Verification](https://developers.facebook.com/docs/development/release/business-verification/)
are production setup gates. App-role tests do not establish access for external users.
Use the app dashboard to confirm required advanced access, verification and review for the
chosen app/use case. Existing missing deauthorization/data-deletion and account-erasure work
remains part of production readiness. No public rollout or real feasibility claim is made here.

The live test must separately prove Page authorization, a captioned photo and a captioned MP4
scheduled through the worker, Cloudinary delivery to Meta, returned IDs, and public visibility.
The agent did not make a live provider write. See [Facebook setup](facebook-setup.md).
