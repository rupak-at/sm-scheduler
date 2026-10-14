# TikTok integration research — 2026-10-14

The user requested TikTok alongside Instagram and Facebook, following a current official-source
review. Implemented scope is account connection and scheduled **Direct Post** of one photo or
MP4 with a caption. Provider responses are simulated in automated tests; live feasibility is unverified.

## Official sources and decisions

| Subject                                  | Current official source                                                                                                                                                                                                                                                               | Decision                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authorization                            | [Web Login Kit](https://developers.tiktok.com/docs/en/login-kit-web) and [token management](https://developers.tiktok.com/docs/en/oauth-user-access-token-management)                                                                                                                 | Use Web Login Kit code exchange, exact HTTPS callback, signed browser state and same-session connection. Request `user.info.basic` and `video.publish`; validate granted scopes and immutable `open_id`. TikTok is an account connection, not a new application sign-in method.                                        |
| Token lifecycle                          | [User token management](https://developers.tiktok.com/docs/en/oauth-user-access-token-management)                                                                                                                                                                                     | Encrypt access and refresh tokens together; persist provider-reported expiries and rotated refresh values. Serialize refresh under a database row lock. A lost rotation response requires reconnection rather than guessing which refresh token is valid.                                                              |
| Publishing mode                          | [Direct Post](https://developers.tiktok.com/docs/en/content-posting-api-reference-direct-post), [photo posting](https://developers.tiktok.com/docs/en/content-posting-api-reference-photo-post) and [Content Posting API](https://developers.tiktok.com/products/content-posting-api) | Direct Post supports the scheduler's requested outcome. Upload-to-inbox needs user completion inside TikTok and is not implemented or described as automatic publication.                                                                                                                                              |
| Account capabilities                     | [Creator information](https://developers.tiktok.com/docs/en/content-posting-api-reference-query-creator-info)                                                                                                                                                                         | Fetch current nickname, privacy options, interaction restrictions and maximum video duration when rendering the composer; recheck when scheduling and when the worker sends. Provider posting caps/bans stop the attempt. Never silently change the chosen audience or interactions.                                   |
| Creator controls and release eligibility | [Content Sharing Guidelines](https://developers.tiktok.com/docs/en/content-sharing-guidelines)                                                                                                                                                                                        | Use explicit audience selection, interactions off initially, content preview, commercial disclosures and per-post consent. Default to private testing. Public posting requires an audited client. TikTok expects an app for a broad creator audience; an internal account-upload utility is not eligible intended use. |
| Video transport                          | [Media transfer](https://developers.tiktok.com/docs/en/content-posting-api-media-transfer-guide)                                                                                                                                                                                      | Hosted assets use `PULL_FROM_URL`. TikTok requires a verified HTTPS domain/prefix and rejects redirects. Do not use device-style `FILE_UPLOAD` to bypass hosted-media ownership verification.                                                                                                                          |
| Photo transport                          | [Photo API](https://developers.tiktok.com/docs/en/content-posting-api-reference-photo-post) and [media image limits](https://developers.tiktok.com/docs/en/content-posting-api-media-transfer-guide)                                                                                  | Send a JPEG from the signed owned-domain endpoint. Resize that delivery rendition within 1080px; preserve the stored image and existing Instagram/Facebook delivery. Support an optional 90-character photo title and the existing caption as its description.                                                         |
| Asynchronous outcome                     | [Get Post Status](https://developers.tiktok.com/docs/en/content-posting-api-reference-get-video-status)                                                                                                                                                                               | Save `publish_id` immediately; poll it across restarts. Only `PUBLISH_COMPLETE` means completed posting. Inbox delivery remains unconfirmed. Private posts can complete without a public post ID; preserve null instead of inventing one. Parse numeric int64 IDs without rounding.                                    |
| Agreements                               | [Music Usage Confirmation](https://www.tiktok.com/legal/page/global/music-usage-confirmation/en) and [Branded Content Policy](https://www.tiktok.com/legal/page/global/bc-policy/en)                                                                                                  | Link the applicable agreements in the consent control. Paid partnerships cannot use private visibility. Recommended photo music and AI labeling are explicit creator choices.                                                                                                                                          |

The references were retrieved from TikTok's official developer site on 2026-10-14. The inspected
video/photo references report August 24, 2026 updates; Login, token, creator, media and status
references report August 4, 2026 updates. The implementation uses the documented v2 endpoints.

## Implementation and reliability

OAuth keeps TikTok's cookie and `tiktok-connect` mode separate from the two Meta flows.
The account is identified by the token/profile `open_id`, never a nickname or email match.
An existing identity cannot be transferred between workspaces. Neither token reaches the browser,
Better Auth Account fields, queue payloads or logs. TokenVault uses `tiktok:1:<open-id>` authenticated
data; existing Meta ciphertext remains compatible.

Per-post settings and server-recorded consent time live in Publication.providerMetadata.
Privacy starts blank; interactions and disclosures start off. Draft choices are editable and
persisted, while consent resets when reopening or changing content/settings. Scheduling requires
valid choices and explicit consent. Failed TikTok attempts require review/edit/rescheduling;
the generic one-click retry is disabled for this provider. The worker never substitutes settings.

The existing PostgreSQL claims, attempt history and ID-only BullMQ queue remain. Initialization
is a publishing write: save its marker first, with lease, ownership and credential guards.
An interrupted response before `publish_id` is saved remains uncertain and cannot be blindly resent.
A known ID resumes read-only polling. Status reads are POST requests but are classified as reads.
Explicit provider rejection can clear the send marker; ambiguous transport/malformed/5xx outcomes
retain it. Provider processing failure retains the marker. A six-hour processing delay becomes
an attention item with subsequent read-only checks rather than a new posting request.

Cloudinary protected-download URLs can redirect and are unsuitable as the URL given to TikTok.
The API serves a signed publication/asset-bound endpoint at the configured owned HTTPS origin.
It verifies expiry, publication state, owners and media before reading. Cloudinary redirects are
resolved server-side only on allowed Cloudinary hosts, with bounded response size/time and two
concurrent downloads. TikTok receives JPEG/MP4 bytes directly, with byte ranges and no-store
headers. Photos get a bounded 1080px rendition; videos retain their prepared bytes. Signed media
links last two hours to cover TikTok's one-hour download window. New storage remains Cloudinary.

## Constraints and release gates

Existing app upload/caption limits remain: photos up to 8 MB, prepared H.264/AAC MP4s up to 64 MB,
and a shared 2,200-character caption limit. Video dimensions must be at least 360px on both sides;
duration must fit the current creator limit. A nullable MediaAsset.durationSeconds migration
records actual normalized duration. Old videos without duration require reupload for TikTok.
These are the app's supported subset, not a promise of every format TikTok accepts.

`TIKTOK_DIRECT_POST_AUDITED=false` is the default. Private-account/Only me testing is the only
permitted mode until the operator confirms audit approval. Unaudited clients allow at most five
posting users per 24-hour window. TikTok's user cap and
provider-controlled posting caps still apply; changing the environment flag cannot grant approval.
The app must obtain Content Posting scopes, URL ownership verification and the relevant review/audit.
A private internal-only deployment should not be submitted as a broadly available creator app.

No watermark, scraped content, fabricated success, or unofficial automation is added. Dedicated
inbox-upload, carousels, automatic public-ID recovery for private posts, multi-target posting,
webhook processing and TikTok application sign-in are outside this release. Live account
connection, refresh, owned-domain transfer and both media publications remain to prove.
See [setup and the user-run live test](tiktok-setup.md).
