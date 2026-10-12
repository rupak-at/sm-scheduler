# Implementation status

## Implemented

- Modular npm workspaces: Next.js web, Express API, BullMQ worker, shared contracts,
  server configuration, PostgreSQL/Prisma, and provider publishing package.
- Strict TypeScript, ESLint source/function limits, Prettier/Tailwind sorting,
  Husky/lint-staged, CI, living development docs, and explicit feature commits.
- Responsive public landing, protected `/planner`, Tailwind/shadcn primitives, neutral
  white/graphite design, and locally hosted Roboto across text and controls.
- Better Auth email/password signup/login/logout and database-backed sessions.
- Instagram OAuth sign-in and explicit linking to an existing email workspace.
  Immutable provider identity, browser-bound signed state cookies, ten-minute one-use
  database records, same-session linking, and reserved unverified internal email IDs.
- Professional account/profile and scope validation. Provider credentials remain encrypted
  with AES-256-GCM and account-bound authenticated data; raw tokens never reach the browser
  or Better Auth Account storage. Independent local key setup and stored key version.
- Token expiry/revocation states, pre-publish validation, and automatic eligible long-lived
  token renewal. Renewal uses the existing credential; no generic refresh token is stored.
- Authenticated, origin-checked and throttled workspace actions. Validated JPEG uploads,
  metadata stripping/orientation/resize, private previews, and expiring signed public URLs.
- Draft creation/editing/deletion, optimistic concurrency, ownership checks, local-timezone
  scheduling, cancellation, editing safe failures, and guarded retries. Post history is retained.
- URL status filters/pagination, photo editor, channel actions, inline errors, automatic
  status refresh, and workspace logo/navigation that remain inside the application.
- Durable PostgreSQL scheduling plus real Redis ID-only delivery. Database claims/leases,
  attempt history, saved containers/send markers, stale-claim recovery, readiness polling,
  and uncertain-outcome reconciliation without automatic duplicate sends.
- Environment validation, safe logging, health/readiness routes, database diagnostics,
  three reviewed migrations, and persistent local PostgreSQL/Redis configuration.
- Requested frontend skills applied; setup and real-account guide in `instagram-setup.md`.

## Limits and pending work

The implementation is ready for a **private real-account integration test**, not a claim
of verified live Instagram publishing. The user supplies a Business/Creator account, a Meta
Instagram Login app, accepted app/tester access, correct scopes, credentials, supported Graph
version, HTTPS callback/media origin, and applies the new migration to their database.
No real Meta authorization or post has been made by the agent. Meta documentation pages were
login/rate-limit restricted during research; professional support/scope names were verified
through Meta's official Postman collection, with linked references for the live setup review.
The user confirmed successful real Instagram sign-in on 2026-10-12 after the permission-check
fix. This verifies their login/account connection, not a successful scheduled publication.

The current vertical slice supports one JPEG photo per post. Reels, video, carousels,
Stories, analytics, teams, Facebook, and TikTok are not implemented. Future provider enum
values do not enable those providers.

Media uses a persistent local API filesystem, not S3. Production storage/retention/quotas,
verified hosting/proxy IP configuration, provider deauthorization/data-deletion callbacks,
account erasure, deployments, and multi-key token rotation remain. Email verification and
password-reset delivery require a mail provider. Internal Instagram identity emails are not
verified contact addresses. Confirmed container recovery may not recover an external post ID.
An unconfirmed send remains UNCERTAIN and cannot be blindly retried.

Authentication applies conservative shared rate-limit buckets without trusted client IPs.
Workspace writes have separate per-user limits. Tests reset throttling counters and remove
their fixtures: never use a creator database for integration tests.

## Verification

- Formatting, lint, strict workspace/tools types, and 45 unit tests.
- Prisma schema validation; all three migrations applied to isolated PostgreSQL.
- 21 integration tests against real isolated PostgreSQL/Redis and simulated Meta responses:
  session security, OAuth browser/state protection, explicit email linking, ownership,
  upload validation/private and signed media, draft concurrency, scheduling/cancellation,
  duplicate delivery, container polling, token expiry/renewal/revocation, and uncertain sends.
- Real BullMQ/Redis delivery verifies PostgreSQL reconciliation repairs missed enqueue
  and queues publication identifiers without captions or credentials.
- Full package/API/worker/Next.js production build; production dependency audit reports zero vulnerabilities.
- Chromium fixture checks: upload → draft save and upload → schedule, session redirects,
  workspace logo destination, status URLs, form labels/focus, long names, light controls under
  dark system preference, reduced motion, and viewport overflow from 320 through 1920px.
  Desktop/mobile/tablet editor screenshots inspected. Physical Safari/iPad testing is pending.

Quality/build checks require local test/compilation sockets; restrictive sandbox failures
were rerun with approved local access. A cached failed Turbopack compilation was moved aside
before the successful production build. No configured creator database was migrated.
Docker startup on this machine needs administrator access; temporary user-owned services
were used for verification. A real Instagram publication is the user's next test.

## Update log

### 2026-10-12 — HTTPS tunnel login fix

Added `no.rupakbasnet.com.np` to Next.js's exact development-origin allowlist. Browser checks
confirmed that the tunnel previously rendered an enabled Instagram button without React
handlers, while localhost worked. After the configuration restart, tunnel HMR connected,
React attached handlers, and clicking invoked the expected Instagram start POST. The diagnostic
intercepted the POST before backend/provider effects; live Meta authorization remains pending.

Verification: cache-disabled Chromium reproduction and successful localhost/tunnel click checks;
formatting, lint, strict types, all 22 unit tests, and full production build passed under Node 24.
HTTP tests and Turbopack compilation needed approved local socket access. A cached sandbox
compiler failure was moved aside before the successful build. Setup docs distinguish OAuth
redirects, webhook verification, automatically obtained provider tokens, and local encryption.

### 2026-10-12 — safe Instagram callback diagnostics

Provider failures retain a fixed OAuth step, HTTP status, and numeric Meta error code/subcode
in the final login/workspace redirect. Handles nested Graph and top-level OAuth error codes
without retaining provider messages/bodies, request URLs, tokens, or authorization codes/state.
This identifies the failed request behind the generic `PROVIDER_REJECTED` notice; it does not
establish the cause of the user's current live rejection or verify live publishing.

Verification: 19 focused adapter/client/redirect tests passed, covering all four request steps,
secret exclusion, response envelopes, error mapping, and uncertain writes.
Full formatting/lint/types checks, all 37 unit tests, and the package/API/worker/Next.js
production build passed under Node 24. No real provider call or creator-database migration
was performed by the agent; the user's fresh login attempt is needed to diagnose the rejection.

### 2026-10-12 — fix rejected permissions lookup; user confirms live sign-in

The diagnostic localized the user's rejection to `/{id}/permissions` (HTTP 400 / Meta 100).
Instagram Login now checks grants returned in code exchange, persists those grants, and uses
professional profile plus read-only publishing quota access for subsequent token checks.
Missing/malformed grant information is rejected; requested scopes never become assumed grants.
Fixtures reject the unsupported edge and exercise permission loss before any provider write.

The user reported successful live Instagram sign-in after this fix. Real publishing remains pending.
Verification: formatting/lint/types, all 45 unit tests, all 22 PostgreSQL/Redis/provider-fixture
integration tests, and full production build passed under Node 24. Committed migrations were
applied only to a new temporary local test database; the creator database was not migrated.
