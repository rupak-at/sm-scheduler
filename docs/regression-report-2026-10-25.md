# Regression and concurrency report — 2026-10-25

The initial 1,000-user test failed. After fixing session throttling, transaction contention
and stale editor revisions, two identical final runs passed **20,000 HTTP requests total**.
Each run started 1,000 independent users simultaneously for each of ten phases. Both queue
runs published all 1,000 fixture publications, with one successful attempt/send per publication.
This is evidence for the tested local workload, not a production capacity certification.

Machine-readable evidence: [baseline and final measurements](testing/regression-2026-10-25.json).
Reproduction instructions: [development guide](development.md#testing).

## Environment and method

- Node 24.21.0; 12 logical CPUs; 15,227 MiB host RAM; PostgreSQL 18.6; Valkey 9.1.2
  providing the Redis protocol; Linux headless Chromium. These differ from CI's PostgreSQL 17/Redis 7.4.
- Fresh user-owned PostgreSQL cluster on loopback port 55449. All four committed migrations
  deployed successfully to separate `scheduler_regression_test` and `scheduler_load_test` databases.
  Isolated Redis-compatible service on port 56449; queue load uses database 1.
- The load test seeds 1,000 distinct users, accounts and real database sessions with valid signed
  cookies. Each phase launches 1,000 fetch operations without a concurrency cap or think time.
  It uses a real TCP Express listener, real auth/session queries, real transactions and photo decoding.
- HTTP generator and API share one process/machine. Recorded memory and event-loop delay include
  both; they are not standalone API resource measurements. No Next.js proxy is in the HTTP load path.
- Uploads use 320 × 400 JPEG fixtures and temporary local test storage. Browser tests exercise
  PNG normalization and actual MP4 preparation through the production frontend and direct-upload path.
  Provider OAuth/Cloudinary calls in integration tests are fixtures. No live provider is contacted.
- Queue tests create 1,000 due durable publications and use actual Redis delivery and worker
  concurrency 2. Repeated reconciliation verifies job deduplication and eventual completion.
  Provider responses have no real network latency, quota or moderation delay. Reconciliation is
  accelerated to roughly 50 ms in the test; production scans every ten seconds.
- Fixtures remove their users/content/media and private queue. The creator database, credentials,
  live accounts and configured development processes were not used for test writes.

## Confirmed defects and fixes

| Finding                                      | Reproduction before fix                                                                                                                                                                         | Fix and regression evidence                                                                                                                                                                                                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared auth bucket blocks session checks     | 100 successful session reads; **900 HTTP 429** responses                                                                                                                                        | Exempt read-only `/get-session` from the shared bucket. Keep credential/OAuth limits. Final runs: 1,000/1,000 valid owned sessions each. A separate test still allows only five of ten simultaneous invalid credential attempts before throttling.                                 |
| Unrelated creators conflict while scheduling | First run: only **486/1,000** schedules succeeded; 342 returned 409, 170 returned 500. Two other requests lacked IDs after earlier create failures. PostgreSQL reported serialization failures. | Use Read Committed with explicit account/media shared locks and publication edit locks. Preserve ownership, eligibility, revision and worker state guards. Final runs: 1,000/1,000 schedules each; a same-revision race still produces exactly one accepted save and 19 conflicts. |
| Burst admission headroom (hardening)         | First run also had two failed draft creates and transaction/adapter errors. Pool waiting was not isolated as their separate cause.                                                              | Allow bounded ten-second pool/admission waits through the existing ten-connection pool alongside the transaction fix. Queries remain limited to three seconds and transactions five seconds. Final runs have no unexpected server errors.                                          |
| Old editor can undo cancellation             | Cancel a draft, then submit its original revision with a schedule: returned 200 and reactivated it                                                                                              | Cancellation/retry advance the parent revision in the same transaction. Saves use strictly increasing millisecond revisions. Tests reject stale cancellation/retry edits and repeat a cancellation/save race ten times.                                                            |
| Vulnerable dependencies                      | npm audit reported **six affected packages**: one critical, two high, three moderate                                                                                                            | Upgrade Next.js/plugin to 16.4.3, Vitest to 4.1.12, and compatible locked body-parser, fast-uri and Zod patches. Final npm audit: zero reported vulnerabilities. This is dependency scanning, not an exploit demonstration.                                                        |

The baseline's later malformed-ID responses cascade from failed creates; they are not separate
ownership defects. The final runs' 1,000 `WorkspaceError` entries each are the expected cross-user
404 rejections, not server failures.

## Repeated 1,000-user results

Each row is 1,000 requests per run. Expected rejection responses count as successful security
checks. Percentiles include client connection queueing and response-body validation.

| Phase                       | Expected status | Valid responses, each run | p95 run A | p95 run B |
| --------------------------- | --------------- | ------------------------- | --------- | --------- |
| Session check               | 200             | 1,000/1,000               | 1,641 ms  | 2,109 ms  |
| Empty planner read          | 200             | 1,000/1,000               | 1,803 ms  | 2,046 ms  |
| Upload authorization        | 201             | 1,000/1,000               | 1,039 ms  | 1,158 ms  |
| Direct photo upload         | 201             | 1,000/1,000               | 1,889 ms  | 1,966 ms  |
| Create draft                | 201             | 1,000/1,000               | 2,730 ms  | 2,593 ms  |
| Schedule post               | 200             | 1,000/1,000               | 2,888 ms  | 2,910 ms  |
| Populated scheduled planner | 200             | 1,000/1,000               | 1,840 ms  | 1,794 ms  |
| Cross-user edit attack      | 404             | 1,000/1,000               | 2,196 ms  | 2,169 ms  |
| Cancel post                 | 200             | 1,000/1,000               | 907 ms    | 897 ms    |
| Delete cancelled draft      | 200             | 1,000/1,000               | 1,324 ms  | 1,392 ms  |

Both runs had zero unexpected statuses, timeouts or invalid response payloads. Populated planner
checks validate the expected post, owner-specific account, counts and agenda; final deletion
checks verify no fixture posts remain. Peak combined process RSS was 1,062/1,017 MiB;
event-loop p99 was 93/90 ms. These measurements require caution for smaller deployment hosts.

Queue run A/B completed in 3,306/3,425 ms under the accelerated fixture conditions above:
1,000 published, 1,000 successful attempts, 1,000 simulated sends, zero duplicate sends or job errors
in each run. These timings must not be interpreted as real provider publishing throughput.

## Regression coverage and verification

| Check                                       | Result                                                                |
| ------------------------------------------- | --------------------------------------------------------------------- |
| Baseline quality/unit suite                 | 135 tests passed                                                      |
| Baseline PostgreSQL/Redis integration suite | 75 tests passed                                                       |
| Final quality checks                        | Formatting, ESLint, strict TypeScript and 135 unit tests passed       |
| Final integration suite                     | 84 tests passed across 20 files                                       |
| Browser suite                               | Three scenario tests passed against the production Next.js frontend   |
| Final load suite                            | Both HTTP/queue tests passed on two identical final runs              |
| Prisma schema / existing migrations         | Validation passed; four migrations applied only to isolated databases |
| Production compilation                      | Backend/shared and Next.js build passed                               |
| Dependency audit                            | Zero reported vulnerabilities                                         |

The browser flow covers protected redirects, real signup and wrong/correct password login,
session cookies/proxying, validation feedback, corrupt-photo rejection, direct PNG/MP4 upload,
caption/hashtag draft round-trip, editing/scheduling, worker result display, cancellation/deletion,
logout and revoked-session redirects. Public/auth pages plus authenticated planner/composer stay
within the viewport at 320, 390, 768, 820, 1024, 1280, 1440 and 1920 px. This is functional/overflow
testing, not a new visual design or accessibility audit.

Existing integration/unit tests additionally cover all three providers' authorization state,
grants, ownership, encrypted token lifecycle, revoked/expired accounts, media limits and ranges,
single-use upload tickets, duplicate jobs, lease recovery, cancelled jobs, lost responses,
uncertain sends and provider processing failures. Nine added integration regressions cover
shared session reads, retained credential throttling, simultaneous edits, cancellation/retry
revisions, cancellation races, cross-owner mutations/previews, mutation throttling and hostile input.

## Limits and remaining work

- This is a short local burst test with existing sessions, not 1,000 real browsers, a distributed
  load test, mass signup/password hashing test, or a long-running soak. Credential routes retain
  the library's shared fallback bucket while trusted client-IP headers are disabled. That still
  constrains simultaneous onboarding/login and requires a deliberate trusted-ingress design
  before mass onboarding; arbitrary forwarded headers must not become trusted.
- Maximum-size concurrent photos/videos, sustained media bandwidth, large historical workspaces,
  production proxy/TLS/CDN behavior, multiple API instances and prolonged resource outages were
  not load-tested. Videos deliberately allow only two concurrent preparations and reject excess
  work; this run does not promise 1,000 simultaneous video transcodes.
- Live Instagram publishing, Facebook/TikTok authorization/publishing, real Cloudinary delivery
  and provider quotas/review gates remain unverified. Fixture success cannot establish those.
- Physical Safari/iOS/Android testing and independent penetration testing remain outside this run.
  Email verification/password-reset delivery remain unimplemented product features.
- Prisma/pg emits a deprecation warning about concurrent queries on a transaction client. Tests
  passed with the current pinned pg driver; investigate driver compatibility before a pg 9 upgrade.

No push, deployment, creator migration or live third-party write was performed.
