# Implementation status

## Implemented

- Three npm workspaces: `frontend` (Next.js), `backend` (Express API, BullMQ worker,
  Prisma, configuration, Instagram/Facebook/TikTok), and `packages/shared` (browser-safe validation/types).
  Conventional routes/controllers/services and frontend app/components/hooks/lib folders.
- Strict TypeScript, ESLint source/function limits, Prettier/Tailwind sorting,
  Husky/lint-staged, CI, living development docs, and explicit feature commits.
- Responsive public landing, protected `/planner`, Tailwind/shadcn primitives, neutral
  white/graphite design, and locally hosted Roboto across text and controls.
- Better Auth email/password signup/login/logout and database-backed sessions.
- Instagram OAuth sign-in and explicit linking to an existing email workspace.
  Immutable provider identity, browser-bound signed state cookies, ten-minute one-use
  database records, same-session linking, and reserved unverified internal email IDs.
- Facebook managed-Page connection to the current authenticated workspace, granted/granular
  scope and Page identity validation, provider-bound encrypted Page tokens and expiry/revocation
  maintenance. Optional Facebook Login for Business User Access Token configuration.
- Captioned Facebook photos and Page videos through official endpoints, persisted video IDs,
  asynchronous processing/public-status checks, provider dispatch and guarded no-resend recovery.
  Planner account selection/previews/channel actions identify Instagram versus Facebook.
- TikTok Web Login account connection with immutable open_id, actual scopes and encrypted
  access/rotating refresh tokens. Serialized refresh and lost-refresh reconnection guards.
- TikTok photo/video Direct Post, current creator limits, explicit privacy/interactions/commercial
  metadata and per-post consent, private-test defaults and audited-public mode gating. Signed
  owned-domain non-redirecting API media delivery with bounded Cloudinary reads/1080px photos.
  Persisted publish IDs, final-status polling and uncertain-send no-resend recovery.
- Professional account/profile and scope validation. Provider credentials remain encrypted
  with AES-256-GCM and account-bound authenticated data; raw tokens never reach the browser
  or Better Auth Account storage. Independent local key setup and stored key version.
- Token expiry/revocation states, pre-publish validation, and automatic eligible long-lived
  token renewal. Renewal uses the existing credential; no generic refresh token is stored.
- Authenticated, origin-checked and throttled workspace actions. Validated JPEG/PNG/WebP/AVIF photo inputs
  converted to JPEG with metadata removal/orientation/resize/padding, bounded MP4 Reel processing,
  private previews, expiring signed public URLs, and byte-range video playback.
- Cloudinary authenticated JPEG/MP4 storage, expiring owned previews/provider downloads,
  and one-use direct-to-Express upload authorization; file bytes bypass Vercel functions.
  Existing local assets retain their read path; new uploads never use permanent VPS storage.
- Draft creation/editing/deletion, optimistic concurrency, ownership checks, local-timezone
  scheduling, cancellation, editing safe failures, and guarded retries. Post history is retained.
- URL status filters/pagination, caption/hashtag editor, live photo/playable-video preview,
  file-picker/drag-drop media upload, channel actions, inline errors, automatic
  status refresh, and workspace logo/navigation that remain inside the application.
- Compact publishing workspace with a single top bar, counted status tabs, chronological
  next-three agenda, media rows, account health, and accessible composer sheet/action menus.
  Responsive development styles have an explicit source anchor; all app scrollbars are thin.
  New/empty-state/loaded-row editor actions use local URL state without waiting for a server render.
  Development browser/CDN cache protection and versioned asset URLs prevent stale tunnel assets.
- Durable PostgreSQL scheduling plus real Redis ID-only delivery. Database claims/leases,
  attempt history, saved containers/send markers, stale-claim recovery, readiness polling,
  and uncertain-outcome reconciliation without automatic duplicate sends.
- Environment validation, safe logging, health/readiness routes, database diagnostics,
  four reviewed migrations, and persistent local PostgreSQL/Redis configuration.
- Requested frontend skills applied; setup and real-account guide in `instagram-setup.md`.

## Latest structure update — 2026-10-13

The repository now has three workspaces: `backend`, `frontend`, and `packages/shared`.
Express routes/controllers/services, worker, Prisma, environment configuration, Instagram code,
and media processing live together in the backend. Next.js uses app/components/hooks/lib folders.
API and worker run as separate processes from one build; only browser-safe shared code is packaged.
See [the codebase walkthrough](codebase.md) for request flows and common development tasks.

Verification: formatting/lint/types, 81 unit tests, 28 isolated PostgreSQL/Redis/provider-fixture
integration tests, Prisma validation, and production build passed under Node 24. Unchanged
migration SQL deployed to a fresh test database. Compiled API/frontend/worker startup, queue
consumption, database diagnostics, and the root development command passed. Chromium checked
signup/session forwarding, PNG upload, composer, draft save/edit, and 390/768/1280px overflow.
Frontend/worker source comparison confirmed 77 bodies unchanged apart from imports. No creator
records, real provider calls, database model changes, or UI redesign were part of this refactor.

## Cloudinary update — 2026-10-13

Implemented protected Cloudinary storage using the official Node SDK, fresh signed provider
URLs, owned preview redirects, and direct browser-to-Express uploads with scoped one-use tokens.
Next.js proxies the small authorization request; file bytes bypass Vercel's request-body limit.
New uploads need no persistent VPS media directory. Existing local records keep their legacy read
path and are not migrated automatically. See [Cloudinary setup](cloudinary-setup.md).

Verification: formatting/lint/types, 92 unit tests, 34 isolated integration tests, and production
build passed under Node 24. Chromium checked a real 5 MB direct upload, simulated Cloudinary
native preview delivery, and draft round-trip at 390/768/1280px. Compiled process startup,
database diagnostics, and queue delivery passed. No schema migration or authorized live provider
upload/publish was performed; real Cloudinary delivery and Instagram fetch/publish remain pending.

## Facebook update — 2026-10-14

Added Facebook Page connection and captioned photo/video scheduling alongside Instagram.
The Page video endpoint supports the common MP4 composer without claiming dedicated Reels
support. Long-lived Page tokens can have null fixed expiry; actual scopes, Page identity,
token/data-access expiry and revocation are rechecked. Same-session, provider-bound OAuth and
atomic ownership checks protect linking. Instagram credentials/ciphertext/queue jobs remain
compatible, and either configured provider can operate independently. No schema change.

See [setup](facebook-setup.md) and [research](facebook-research.md).

Verification: formatting/lint/strict types, all 111 unit tests, all 53 isolated PostgreSQL/Redis/provider-fixture
integration tests, and the production build passed under Node 24. Existing migrations deployed
successfully to the isolated test database; schema/migrations are unchanged. Chromium checked
320/390/768/820/1024/1280/1440/1920px with mixed providers, long Page names, caption composition,
real stored MP4 metadata/playback availability and provider previews; no page errors or horizontal
overflow. The Facebook button reached the authenticated start endpoint and its Meta redirect was
intercepted before a live request. Desktop/mobile/tablet screenshots and changed UI were reviewed.
No creator records, real provider writes, push or deployment; live Facebook connection/photo/video
and signed Cloudinary delivery remain to verify.

## TikTok update — 2026-10-14

Added account connection and captioned photo/video Direct Post alongside both Meta providers.
Read [setup](tiktok-setup.md) and [research](tiktok-research.md). TikTok requires Login/Content
Posting approval, verified API media-domain ownership and a separate Direct Post audit for
public posting. The default is private-account/Only me testing; an internal/private-only account
utility is not eligible intended use. Live TikTok connection, refresh, transfer and publishing
are unverified. Creator quotas can block posts regardless of local scheduling.

Apply the new nullable MediaAsset.durationSeconds migration before restarting updated code.
Older videos without recorded duration need reupload for TikTok. Only the isolated test database
was migrated. Settings/consent live in existing Publication metadata; tokens are encrypted.
TikTok receives signed API-hosted bytes without redirects; persistent storage remains Cloudinary.

Verification: formatting/lint/strict types, all 135 unit tests, all 75 isolated PostgreSQL/Redis/provider-fixture
integration tests, Prisma validation and the production build passed under Node 24. All four
migrations deployed to a fresh isolated database; a read-only schema comparison reports no drift.
Chromium reviewed all eight required widths, long creator names, no default audience/interactions,
commercial disclosures, disabled settings, caption/media/reopen consent reset, and real MP4
playback. Real API scheduling and TikTok's authenticated start redirect passed; provider navigation
was blocked before a live request. Phone/tablet/desktop screenshots and current UI guidelines were
reviewed, with no page errors or horizontal overflow. No creator records, creator migrations,
live TikTok/Meta/Cloudinary publishing, push or deployment. TikTok app/domain approval and live
connection/refresh/photo/video tests remain pending.

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

The current vertical slice supports one photo or MP4 Reel per post. JPEG/PNG/WebP/AVIF
photos up to 8 MB become JPEGs. H.264/H.265 MP4s up to 64 MB, 3 seconds–15 minutes, are
normalized for Reels; the API requires FFmpeg/FFprobe. HEIC, animated images, carousels,
Stories, analytics and teams remain unsupported. TikTok supports one photo or MP4 Direct Post
with the required creator settings; inbox upload, application sign-in and carousels are unsupported. Facebook supports one photo or
Page video with captions; dedicated Facebook Reels, profiles, Groups, text-only posts and
multi-target crossposting remain unsupported. Live Instagram photo/Reel and Facebook photo/video
publishing remain unverified; TikTok live publishing is also pending review/setup and testing.

New media uses Cloudinary with server-only credentials. Browser uploads go directly to Express,
while Next.js proxies small authorization/auth/workspace requests. Local media remains readable
for pre-Cloudinary records, but is not migrated automatically. Cloudinary account upload/delivery
limits apply; a live Cloudinary upload/download and Instagram photo/Reel publish remain unverified.
Production storage retention/quotas, verified hosting/proxy IP configuration, provider
deauthorization/data-deletion callbacks, account erasure, deployments, and multi-key token rotation remain.
Email verification and
password-reset delivery require a mail provider. Internal Instagram identity emails are not
verified contact addresses. Confirmed container recovery may not recover an external post ID.
An unconfirmed send remains UNCERTAIN and cannot be blindly retried.

Authentication applies conservative shared rate-limit buckets without trusted client IPs.
Workspace writes have separate per-user limits. Tests reset throttling counters and remove
their fixtures: never use a creator database for integration tests.

## Verification

- Formatting, lint, strict workspace/tools types, and 92 unit tests.
- Prisma schema validation; all three migrations applied to isolated PostgreSQL.
- 34 integration tests against real isolated PostgreSQL/Redis and simulated Meta responses:
  session security, OAuth browser/state protection, explicit email linking, ownership,
  upload validation/private and signed media, draft concurrency, scheduling/cancellation,
  duplicate delivery, photo/Reel container polling, real video decoding/normalization, byte ranges,
  token expiry/renewal/revocation, and uncertain sends.
- Cloudinary fixtures cover protected identifiers/downloads, one-use direct uploads, byte validation,
  safe remote errors, cleanup after database failure, and cloud URLs passed into photo/Reel publishing.
- Real BullMQ/Redis delivery verifies PostgreSQL reconciliation repairs missed enqueue
  and queues publication identifiers without captions or credentials.
- Full package/API/worker/Next.js production build; production dependency audit reports zero vulnerabilities.
- Chromium fixture checks: photo upload → draft save/edit, MP4 playback → schedule, real drag/drop,
  preview/save caption+hashtag equality, session redirects,
  workspace logo destination, status URLs, form labels/focus, long names, light controls under
  dark system preference, reduced motion, and viewport overflow from 320 through 1920px.
  Desktop/mobile/tablet editor screenshots inspected. Physical Safari/iPad testing is pending.

Quality/build checks require local test/compilation sockets; restrictive sandbox failures
were rerun with approved local access. A cached failed Turbopack compilation was moved aside
before the successful production build. No configured creator database was migrated.
Docker startup on this machine needs administrator access; temporary user-owned services
were used for verification. A real Instagram publication is the user's next test.

## Update log

### 2026-10-13 — fix development tunnel asset caching

Investigated the user's continued closed composer/missing images after URL changes and refresh.
The published JPEG record was READY and its file existed. The live compiler reported no current
errors. Header inspection showed a concrete environment difference: localhost served CSS with
`no-cache, must-revalidate`, while the HTTPS tunnel returned `max-age=14400, must-revalidate`.
That browser TTL can retain earlier development code/styles after the page changes.
A temporary live-browser check found the composer active but laid out below the content,
with zero-size post images, confirming that the expected layout styles were not applied.

Development responses now set browser, generic CDN, and Cloudflare no-store headers. A stable
source fingerprint versions development assets; changed source gets fresh URLs when config
loads. Production keeps its standard cache policy. Restored development compiler caching is
disabled after an isolated preview restart reproduced a stale-task panic. Restarted only the
live web compiler; the user confirmed the UI now works. Temporary diagnostics were removed.

Verification: live localhost/tunnel styles return private/no-store, the tunnel reports Cloudflare
BYPASS, and media/sheet utilities are present. Two regression checks cover changed-source cache
versions, no-store directives, and preservation of production defaults. Formatting, ESLint,
strict types, all 81 unit tests, and the full production build passed under Node 24.
Published-media checks were read-only. No creator records, migrations, or provider calls changed.
CDN rules that explicitly override origin directives still require host-side configuration;
the current tunnel respects the new directives. Physical Safari/iPad checks remain pending.

### 2026-10-13 — responsive New post and editor navigation

Replaced server navigation for New post, empty-state creation, and loaded post editing with
local native-History URL updates. The composer reads current `compose` state, opens from the
authenticated data already loaded, and closes locally with the existing dirty-close guard.
Active view/cursor, deep links, browser history, and modified-click new tabs remain available.
Actual saving/scheduling and filter data continue using authenticated server/API paths.

A browser check held the old editor navigation response for 2.5 seconds: the address stayed
unchanged and the editor stayed closed until the response arrived. With the updated flow,
the editor appears without making that navigation request. The user's exact live-client
failure was not independently reproduced; the live runtime reported no current compiler errors.

Verification: formatting, ESLint, strict types, 79 unit tests, and the full production build
passed under Node 24. Playwright passed all eight widths, creation from All/Published/Scheduled,
empty-state actions, deep links, back/forward, new tabs, loaded scheduled editing, dirty-close
choices, focus restoration, missing-media feedback, and actual photo upload/scheduling through
the isolated API. No browser errors in the final runs. The isolated preview's compiler cache
needed moving aside after a Turbopack panic. No schema change, live provider call, or creator
database modification occurred.

### 2026-10-13 — compact planner revision and global thin scrollbars

Rebuilt the layout after the supplied development screenshots: one top bar, a centered content
canvas, counted status tabs, portrait media previews, and a restrained account/queue rail.
Removed the sidebar and duplicated summary. Phones keep the title/New post action together;
tablets place account/agenda panels beneath content. Healthy account connection actions use
native disclosure. Page, filter, editor, and textarea scrollbars share a thin neutral treatment.
The brand app icon prevents the missing favicon request found during browser review.

Tailwind detection now explicitly uses the web source directory. A regression test compiles
with an unrelated empty working directory, reproduces missing responsive CSS without the
source anchor, and verifies grid/padding/clamp utilities with it. Fresh localhost and HTTPS
tunnel development CSS applies the expected columns, spacing, and thin scrollbars; the precise
cause of the earlier missing styles could not be conclusively recovered.

Verification: formatting, ESLint, strict types, all 79 unit tests, and the full production build
passed under Node 24. Playwright reviewed the actual development build using isolated local
accounts/media, including one published post like the screenshots, empty-filter states, and
the composer at 320/390/768/820/1024/1280/1440/1920px. Computed columns, padding, media dimensions,
native thin scrollbars, and page/dialog overflow checks passed with no browser errors.
Desktop/tablet/phone screenshots inspected. Physical Safari/iPad checks remain pending.
This revision changes no API contract, database schema, or publishing rule; the prior 28 isolated
integration checks cover those unchanged paths. No creator records or real provider calls used.

### 2026-10-13 — research and redesign the publishing planner

Implemented a quieter, denser workspace with an integrated status overview, media list,
upcoming-post agenda, and Instagram connection health. Phones show connection/next-publication
context before the list. The URL-linked composer opens in an accessible sheet with a scrollable
form/preview, fixed actions, focus trapping/restoration, and guarded dirty closing. Post maintenance
uses keyboard-operable menus with existing confirmations; account maintenance uses native details.
The existing neutral Roboto theme remains, with small labelled semantic status colors.

Added ownership-constrained count and bounded chronological agenda queries independent of active
filters and pagination. Production data stays real; no examples, analytics, future integrations,
or calendar are presented as implemented. No schema migration or publishing-rule change.
Research, design critique, and source links are recorded in [planner research](planner-research.md).

Verification: formatting, ESLint, all strict types, 78 unit tests, 28 isolated integration tests,
and the full production build passed under Node 24. Integration checks verify >30-row pagination,
correct status grouping, chronological agenda limits, and cross-owner isolation. Chromium passed
320/390/768/820/1024/1280/1440/1920px populated, empty, composer, and long-content layouts without
page/dialog overflow; real fixture upload/schedule and draft edit/save, error focus, keyboard menus,
focus trapping/restoration, dirty-close confirmation, expanded/expired connections, dark preference,
and reduced motion. Mobile/tablet/desktop screenshots inspected; no browser console errors.
Physical Safari/iPad and assistive-technology testing remain pending.

Tests and Tailwind/Turbopack compilation needed approved local socket access. A cached sandbox
compiler failure was moved aside before the successful build. All test/preview data uses temporary
local services; no creator database migration, real Instagram call, push, or deployment occurred.

### 2026-10-13 — fix VS Code test-file diagnostics

Added a discoverable root `tsconfig.json` for backend/package unit tests, tooling, and integration
tests. Previously backend/package unit tests were excluded from build configs and had no editor
project, allowing inferred TypeScript defaults to produce incorrect import/type diagnostics.
The typecheck command now covers these tests with strict NodeNext settings; web tests remain
owned by the Next.js config and production builds still exclude backend/package tests.
Reproduced missing Node imports, `RequestInit`, and other globals in publishing source with
VS Code's bundled TypeScript 6.0.3. Explicit `types: ["node"]` in the shared backend config
fixes these editor errors using the existing Node type dependency.

Verification: root test typecheck, formatting, ESLint, all workspace types, all 78 unit tests,
and the full package/API/worker/Next.js production build passed under Node 24. No runtime
behavior or database schema changed. A direct check using VS Code's actual TypeScript server
reports zero semantic errors across 118 source/test files after enabling Node types;
restart its TypeScript server if it retains stale errors.

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

### 2026-10-12 — complete media composer and live preview

Implemented separate captions/hashtags and a responsive preview of actual selected Instagram
account, photo/playable MP4, and exact saved text. Added real drag/drop/file selection, processing
feedback, cancellation/removal, and combined 2,200-character validation. Still JPEG/PNG/WebP/AVIF
inputs become normalized JPEGs; eligible MP4s become H.264/AAC Reels. Private/signed URLs support
byte ranges. Worker guards, saved containers, polling recovery, and uncertain-send behavior also
cover videos. API/CI require FFmpeg/FFprobe; existing schema/storage stay compatible.

Verification: formatting/lint/types, all 78 unit tests, all 26 isolated integration tests, and full
production build passed under Node 24. Chromium passed eight-width layout/labels checks, error
focus, matching preview/save text, editing hashtag separation, PNG drag/drop, real video playback,
byte-range requests, Reel scheduling, light controls under dark preference, and reduced motion.
Desktop/mobile/tablet screenshots were inspected. Creator data was not migrated and no real Meta
publish, push, or deployment occurred. First live photo/Reel publishing remains the user's test.
