# TikTok and YouTube regression report — 2026-10-25

TikTok was already implemented. This update adds dedicated 1,000-user load coverage and real
browser tests of its connection/composer/consent flow. YouTube was absent and is now implemented
with channel connection, MP4 scheduling and resumable upload recovery. Neither provider's live
publishing was exercised; all remote authorization/upload/status responses are fixtures.

Raw evidence: [provider measurements](testing/provider-regression-2026-10-25.json).
Setup: [YouTube](youtube-setup.md), [TikTok](tiktok-setup.md).
Reproduction commands and isolated-service requirements: [development guide](development.md#testing).

## What changed

- YouTube: existing-session Google OAuth/PKCE, actual grants and immutable channel validation,
  offline encrypted tokens/serialized refresh, video-only drafts and schedules, title/description,
  visibility/audience/disclosures and fresh consent. Added the user-applied platform enum migration.
- Worker: durable send marker, encrypted publication-bound resumable capability, server-confirmed
  suffix recovery, saved video ID and processing/visibility verification. Lost initialization,
  expired sessions and ambiguous outcomes never create an automatic replacement upload.
- Definite quota rejection before an upload session is created clears only that new-init marker
  and uses bounded deferred retries. Accepted sessions and uncertain responses keep their guard.
- Final compatibility review removed the public-download-URL requirement for YouTube legacy
  media: its worker sends owned bytes itself. A regression schedules a legacy video while the
  public-URL method is unavailable; new uploads still require Cloudinary.
- Token maintenance orders by the oldest check, preventing a repeatedly selected fresh batch
  from starving other one-hour Google credentials. A 101-account regression exercises two batches.
- Browser regression found the new YouTube connection button still displaying TikTok's inherited
  label. Fixed it and reran both full provider flows. Updated obsolete landing capability text.
- Existing Instagram/Facebook/TikTok reliability and provider gates remain covered by the full
  unit/integration suite. No dependency change or creator-database migration was needed beyond
  the new committed enum migration, which was deployed only to isolated databases.

## Method

Same local environment as [the earlier report](regression-report-2026-10-25.md): Node 24.21.0,
12 logical CPUs, 15,227 MiB host RAM, PostgreSQL 18.6 and a separate Valkey 9.1.2 Redis-compatible
service. Integration and load databases are separate. The HTTP generator and API share a process;
latencies include request queueing and response validation. They are not standalone server metrics.

Each provider gets 1,000 distinct users, encrypted accounts and real signed database sessions.
Each phase starts 1,000 HTTP operations without a concurrency cap/think time. Tests check owned
sessions/accounts, post contents/counts/agenda, foreign edits and final cleanup.

TikTok includes 1,000 actual 320 × 400 photo authorizations/uploads through temporary fixture
storage, plus creator validation and consent-aware scheduling. YouTube starts with independent
owned prepared MP4 fixtures for its HTTP/queue workload. It deliberately does **not** try to
transcode 1,000 videos simultaneously: production normalization is limited to two concurrent jobs.
Browser/integration tests separately use actual MP4 uploads and FFmpeg preparation.

Queue workloads persist 1,000 due publications per provider, reconcile repeatedly, and use real
Redis delivery with worker concurrency 2. They require exactly 1,000 successful attempts and
simulated sends with no duplicate sends. Polling is accelerated to roughly 50 ms in tests;
provider responses have no real network/processing delay. Timings are not provider throughput.

## Repeated results

Both complete load-suite runs passed all six parameterized HTTP/queue tests across Instagram,
TikTok and YouTube: **56,000 HTTP requests and 6,000 fixture publication completions** in total.
The TikTok/YouTube portion accounts for 36,000 HTTP requests and 4,000 completions.

| Metric                                             | TikTok run A / B      | YouTube run A / B     |
| -------------------------------------------------- | --------------------- | --------------------- |
| Requests per run                                   | 10,000 / 10,000       | 8,000 / 8,000         |
| Unexpected statuses, invalid responses or timeouts | 0 / 0                 | 0 / 0                 |
| Session-check p95                                  | 1,586 / 1,734 ms      | 1,624 / 1,632 ms      |
| Draft-create p95                                   | 2,567 / 2,876 ms      | 2,784 / 2,626 ms      |
| Schedule p95                                       | 3,664 / 3,542 ms      | 3,718 / 3,864 ms      |
| Populated planner p95                              | 1,934 / 1,912 ms      | 1,872 / 2,500 ms      |
| Peak combined process RSS                          | 1,157 / 1,164 MiB     | 1,233 / 1,186 MiB     |
| Queue completion under accelerated fixtures        | 4,034 / 4,670 ms      | 4,339 / 5,723 ms      |
| Published / successful attempts / sends, each run  | 1,000 / 1,000 / 1,000 | 1,000 / 1,000 / 1,000 |
| Duplicate sends                                    | 0 / 0                 | 0 / 0                 |

Expected cross-user 404 responses are passing authorization checks. The recorded `WorkspaceError`
counts correspond to those rejections, not internal server failures. Instagram's existing workload
also passed twice; its raw measurements are included to make the compatibility check reviewable.

## Functional and adversarial verification

- Full quality gate: formatting, lint, strict types and 151 unit tests.
- Full isolated integration suite: 101 tests, including all existing providers and 17 new YouTube
  cases. New coverage includes browser/session-bound OAuth, replay/expired/wrong-mode/denied state,
  actual scopes/offline tokens, channel takeover races, concurrent refresh and ambiguous refresh.
- YouTube scheduling checks: title/privacy/audience/consent, UTF-8 description bounds, rejecting
  photos and foreign inputs, setting round-trip, server-only credentials/capabilities, reviewed retry.
- Worker checks: duplicate claims, processing waits, lost completed response, partial suffix resume,
  lost init, expired session, quota rejection, malicious session host, rejected video and changed visibility.
- Five browser scenarios cover the existing app and both new provider flows. Provider navigation is
  intercepted before live contact, while real start/callback/session/upload/workspace routes execute.
  New provider flows upload an actual MP4, retain draft settings, reset consent after caption edits
  and reopening, schedule, process duplicate deliveries and render completion.
- Browser checks at 320/390/768/820/1024/1280/1440/1920px, with inspected phone/tablet/desktop
  screenshots. Current Web Interface Guidelines reviewed against the new labelled controls.
- Schema validation, isolated migration deployment and full backend/shared/Next.js production build.

The two recorded complete load runs exercise the ordinary successful path. The final definite-quota
rejection recovery change has an additional focused publishing regression and YouTube load rerun.

## Boundaries

These are short local bursts with existing sessions and small fixture media, not a production SLA,
1,000 real browsers, sustained traffic/large-history soak, maximum-size concurrent uploads or real
Google/TikTok quota tests. Memory includes the generator/API and calls still use fixture storage.
The service/driver versions differ from CI's PostgreSQL 17/Redis 7.4.

No live Google/TikTok authorization, real Cloudinary-to-provider transfer or publishing occurred.
Actual app access, review/audit requirements, assigned quotas, public visibility and media processing
remain user-run verification. TikTok still defaults to private testing. YouTube upload initiation is
scheduled locally; video processing can complete later. Physical Safari/mobile checks remain pending.

The existing shared credential-route fallback rate limit still constrains mass signup/login when
trusted client-IP headers are disabled. The readonly session exemption and per-user mutation limits
remain tested. Prisma/pg still emits its existing transaction-query deprecation warning.

No push, deployment, creator migration or live provider write was performed.
