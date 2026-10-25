# YouTube implementation notes — 2026-10-25

Reviewed the current official Google references before implementation. This records the selected
app behavior, not verified live provider feasibility.

| Concern         | Decision                                                                                                                                                                   | Primary reference                                                                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Authorization   | Existing workspace session; Google web authorization-code flow with browser state, PKCE and offline refresh. Request upload/read-only scopes and validate returned grants. | [Web OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)                                                                                                |
| Identity        | Read the authorized channel using `mine=true`; require exactly one channel and preserve its immutable ID. No Google email matching or application login.                   | [channels.list](https://developers.google.com/youtube/data/reference/rest/v3/channels/list)                                                                                    |
| Upload          | Resumable `videos.insert`, with explicit snippet/status/disclosures and subscriber-notification preference. Retain the app's smaller MP4 subset.                           | [videos.insert](https://developers.google.com/youtube/data/reference/rest/v3/videos/insert)                                                                                    |
| Recovery        | Persist and encrypt the session URI. Probe interrupted uploads before resuming the confirmed suffix; do not create a replacement after an ambiguous send.                  | [Resumable protocol](https://developers.google.com/youtube/data/guides/using_resumable_upload_protocol)                                                                        |
| Completion      | Saved video ID; poll upload status and verify channel/visibility. Processing/acceptance alone is insufficient for completion.                                              | [videos.list](https://developers.google.com/youtube/data/reference/rest/v3/videos/list), [video resource](https://developers.google.com/youtube/data/reference/rest/v3/videos) |
| Creator control | Editable title/description; explicit visibility/audience; disclosures and fresh per-post consent. Preserve creator choices.                                                | [Developer policies](https://developers.google.com/youtube/terms/developer-policies)                                                                                           |

The current insert reference says unverified-project uploads are not restricted to private
viewing, unlike older published restrictions. Do not infer a project's actual access or quotas
from historical examples. The setup guide deliberately begins live verification with Private
visibility and asks the user to check the current Cloud console. OAuth verification and YouTube
project/quota requirements are separate from local fixture success.

This implementation schedules upload initiation in its own durable worker, so Google processing
can delay availability. It does not pre-upload, change visibility after sending, or use Google's
native future `publishAt`. OAuth and upload capabilities use separate account/publication-bound
encryption namespaces. Only allowlisted Google upload endpoints receive credentials/video bytes;
only allowlisted Cloudinary hosts supply remote media. No live provider credentials were used.
