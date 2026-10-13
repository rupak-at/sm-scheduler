# Development guide

Keep this guide current **on every completed feature or fix**. Update the implementation
status at the same time. Record the change and its verification in the update log below.

## Product and current scope

Social Scheduler helps creators prepare and schedule Instagram content. Phase 1 is
Instagram-first; future Facebook/TikTok providers share the domain model.

The current application has email/password and Instagram authentication, a protected planner,
photo/MP4 uploads, caption and hashtag editing with live previews, drafts, durable scheduling,
and a publishing/recovery worker. The user has
verified real Instagram sign-in; a real publish still needs testing.
Read [AGENTS.md](../AGENTS.md), [status](project-status.md), and [architecture](architecture.md)
before choosing the next feature.

## First-time setup

Install Node 24 LTS, npm, and Docker with Compose. Use the version in `.nvmrc`
with your preferred Node version manager. Install FFmpeg/FFprobe on the API host’s PATH
with `libx264` and AAC support for MP4 processing (`ffmpeg` package on Debian/Ubuntu).
CI installs these tools before running the real-video integration tests.

From the repository root:

```sh
npm ci
npm run setup:env
npm run infra:up
npm run db:deploy
npm run dev
```

Open [localhost:3000](http://localhost:3000) and create an account.
`/` is the public landing page. `/login` and `/signup` return authenticated users to `/planner`.
The planner and its content filters live at `/planner` and `/planner?view=…`.
PostgreSQL listens on port 5432, Redis on 6379, and the Express API on 4000.

If your Linux user cannot access Docker, start infrastructure with:

```sh
sudo docker compose -f infra/docker-compose.yml up -d --wait
```

Setup creates an untracked root `.env`, preserves existing values, and adds a random
`BETTER_AUTH_SECRET` if missing. It also creates `apps/web/.env.local`.
Never copy development credentials into staging or production.

## Configuration

| Variable             | Used by                 | Purpose                                                    |
| -------------------- | ----------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`       | API, worker, Prisma CLI | PostgreSQL connection                                      |
| `REDIS_URL`          | API, worker             | Queue/readiness connection                                 |
| `WEB_ORIGIN`         | API                     | Exact trusted web origin; HTTPS in production              |
| `BETTER_AUTH_SECRET` | API                     | High-entropy authentication secret, at least 32 characters |
| `API_PORT`           | API                     | HTTP listener, default 4000                                |
| `LOG_LEVEL`          | API, worker             | Structured log level                                       |
| `WORKER_CONCURRENCY` | Worker                  | Concurrent infrastructure checks                           |
| `API_BASE_URL`       | Web server              | Express origin; never exposed to browser code              |
| `TEST_DATABASE_URL`  | Integration tests       | Isolated test PostgreSQL database                          |
| `TEST_REDIS_URL`     | Integration tests       | Isolated test Redis service                                |

The root environment file serves API, worker, and Prisma CLI. Next.js reads its own
workspace environment file. Hosting supplies production variables and keeps environments separate.

## Daily workflow

1. Read the feature context and existing package/module.
2. Use a focused branch for future work, for example `git switch -c feat/post-drafts`.
3. Implement the smallest useful feature through the correct boundaries.
4. Add meaningful checks for behavior and failure paths.
5. Update this guide, [implementation status](project-status.md), and relevant setup/architecture docs.
6. Format the relevant files and run lint, then the required tests and builds.
7. Review the diff, stage explicit relevant paths, and commit the completed change.
8. Report the result, validation, remaining work, and commit hash.

```sh
npm run format
npm run lint
npm run check
npm run build
git diff --check
git status --short
git add path/to/feature path/to/tests docs/development.md docs/project-status.md
git commit -m "feat(posts): add draft validation"
```

Use Conventional Commits such as `feat`, `fix`, `refactor`, or `docs`.
Do not include unrelated changes. Do not push or deploy without authorization.

## Pre-commit automation

`npm ci` activates Husky through the prepare script. The hook runs lint-staged:

- JavaScript/TypeScript: Prettier, then ESLint with zero warnings.
- Markdown/JSON/CSS/YAML: Prettier.
- Generated files follow the formatter/linter ignore rules.

The hook stages formatting changes automatically. It does not replace full checks.
If it fails, fix the reported issue and retry; do not bypass it.
Intentionally ignored generated Next.js types do not produce hook warnings.

## Where features belong

| Concern                                | Location                          |
| -------------------------------------- | --------------------------------- |
| Pages and layout                       | `apps/web/src/app`                |
| Feature UI, hooks, view logic          | `apps/web/src/features/<feature>` |
| Shared UI primitives                   | `apps/web/src/components/ui`      |
| HTTP feature modules                   | `apps/api/src/modules/<feature>`  |
| Worker processors                      | `apps/worker/src/processors`      |
| Domain/request/job schemas             | `packages/shared/src`             |
| Database schema and migrations         | `packages/database/prisma`        |
| Provider publishing contracts/adapters | `packages/publishing/src`         |

Keep pages thin. Separate request handling, validation, business rules, and persistence as
those responsibilities appear. Use public package exports, not another app's internals.
Keep authored files small; ESLint enforces 250 nonblank source lines and 80 per function.
Generated clients, migrations, and the lockfile are handled by their tools.

Use Tailwind utilities and shared tokens, shadcn/ui primitives, and local Roboto.
Read frontend-design before UI changes; use web-design-guidelines for review.
Keep accessibility, mobile layout, loading/error states, and URL-based filters intact.

The current design uses white/graphite surfaces, subtle gray dividers, and Roboto throughout.
Theme colors are defined in `apps/web/src/app/globals.css`; avoid one-off feature palettes.
The planner uses a single top bar, status tabs with real workspace-wide totals, a bounded
upcoming-post agenda, compact media rows, account health, and a URL-linked composer sheet. Read
[planner research](planner-research.md) for the design decisions. Count/agenda queries live in
the workspace repository and check ownership independently of list filters/pagination; do not
derive totals from the loaded page. The web and API must use the same updated workspace contract.
No migration is needed; rebuild shared packages and restart individual web/API processes when
updating them outside `npm run dev`. The composer uses Radix/shadcn sheet and menu primitives.
New post, empty-state creation, and loaded-row editing use `ComposerLink` and the native History
API to change `compose` without a server navigation. `Planner` reads the live URL through
`useSearchParams`; closing removes `compose` locally after checking unsaved changes. Keep these
editor actions in the current view/cursor. Filters and save/schedule still load actual server data;
opening a new browser tab or refreshing an editor URL still uses the authenticated page.
Public page components live in `src/features/landing`. Keep `/` independent of API availability.
The Tailwind import explicitly sets `source('../')` relative to `src/app/globals.css`, so utility
detection covers `src` regardless of the compiler working directory. Keep this source anchor.
The CSS regression test compiles from an empty working directory and checks responsive utilities.
Global scrollbar rules cover page and nested scrolling surfaces with native thin bars and a
6px WebKit fallback. Keep scrollbars visible and keyboard scrolling available.
Original website imagery lives in `apps/web/public/images` with provenance notes. Use Next.js
Image and responsive sizes; preserve explicit aspect containers to avoid layout shifts.

For substantial visual updates, inspect landing, login, signup, and planner at 320, 390, 768,
820, 1024, 1280, 1440, and 1920px. Check both viewport overflow and intentionally scrollable
filters, long names, labelled controls, keyboard focus, expanded guidance, dark system preference,
and reduced motion. Check development CSS as well as production: assert computed grid columns,
padding, media dimensions, and editor placement rather than relying only on overflow checks.
Chromium viewport checks cover layout; physical-device/Safari behavior
needs its own review when those browser targets are added to the validation environment.

## Database changes

Prisma loads multiple schema files in `packages/database/prisma`.
The application domain lives in `schema.prisma`; auth models live in `auth.prisma`.

```sh
npm run db:validate
npm run db:migrate -- --name descriptive_change
npm run db:generate
npm run test:integration
```

Inspect the generated SQL. Include schema and migration together in the commit.
Verify the migration against an isolated test database. Production/staging apply
committed migrations with `npm run db:deploy`; they do not create new migrations.

PostgreSQL is the publication source of truth. Store scheduling instants in UTC and retain
display timezones. Enforce ownership across posts, accounts, and media in services.

## Testing

`npm run check` checks formatting, ESLint, strict types (including unit/tooling/integration tests),
and unit tests. `npm run build` verifies all production builds.

The root `tsconfig.json` gives VS Code a discoverable strict NodeNext project for backend/package
unit tests and tooling/integration tests. Production workspace configs still exclude unit tests
from emitted builds; the web config owns its browser tests. Open the repository root in VS Code.
The shared Node config explicitly loads `node` types so editors using TypeScript 6 also resolve
Node imports and globals such as `Buffer`, `fetch`, and `RequestInit` from installed `@types/node`.
If diagnostics from an inferred project remain after pulling configuration changes, run
**TypeScript: Restart TS Server** from the command palette. Build packages first for workspace types.

Integration tests use a real PostgreSQL database and Redis. Provision isolated test services,
set their test variables, migrate that database using `DATABASE_URL`, and run:

```sh
npm run test:integration
```

Tests cover auth origins, password hashing, session persistence/revocation, invalid credentials,
and expiry. They create and clean up test users. CI provisions fresh services and runs migrations,
unit/integration tests, and builds. Add worker recovery and publishing tests as those features arrive.

## Verify running applications

```sh
curl http://localhost:4000/health/live
curl http://localhost:4000/health/ready
npm run queue:check
```

Readiness returns 503 when PostgreSQL or Redis fails. Watch the worker for
`Infrastructure check completed`. This is an infrastructure job, not a social publish.

Auth requests pass through Next.js to Express. Sessions are checked on the server.
Protected API routes must perform their own authentication and ownership checks.
Never weaken origin checks or expose credentials while adding a feature.

## Troubleshooting

- Signup/login returns 500: check `curl http://localhost:4000/health/ready`, then
  `npm run db:check`. A `database: down` result is a connectivity problem; committed
  migrations cannot be checked until the connection works. The command checks connectivity
  and migration history without writing data or printing database credentials.
- Supabase direct connection fails with `ENETUNREACH`: its default direct hostname can
  resolve only to IPv6. On a machine without IPv6 access, copy the **Session pooler** URI
  (port **5432**) from the Supabase dashboard's **Connect** panel into root `.env`
  as `DATABASE_URL`. Use the supplied pooler username/hostname and URL-encode password
  characters. See [Supabase's connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres).
  Run `npm run db:check`, apply pending migrations with `npm run db:deploy`, then restart
  `npm run dev`. A session check uses database-backed throttling even for anonymous visitors,
  so an unavailable database can prevent the signup page from rendering.
- Missing auth secret: run `npm run setup:env`.
- Database/Redis unavailable: check `npm run infra:logs` and root environment URLs.
- API cannot bind its port: stop the conflicting service or change `API_PORT` and web `API_BASE_URL`.
- Workspace imports missing: run `npm run build:packages` before starting an individual app.
- Auth returns 403: ensure the browser origin exactly matches API `WEB_ORIGIN`.
- Tunnel login buttons do nothing and `/_next/hmr` returns 502: ensure the tunnel hostname
  is listed in `allowedDevOrigins` in `apps/web/next.config.ts`. The current private test
  hostname is `no.rupakbasnet.com.np`; replace it if your tunnel changes, restart Next.js,
  and reload the browser. Next.js blocks unapproved development WebSocket origins, and the
  blocked connection prevented React from attaching auth handlers in the observed dev session.
  This development allowlist is separate from API `WEB_ORIGIN` and the Instagram callback.
- Login throttled: wait a minute before retrying. Configure trusted proxy/client-IP handling when
  choosing production hosting; current fallback buckets are conservative and shared.
- Dependency updates: review the lockfile and audit. Current upstream lint-tool advisories and
  tested overrides are recorded in [implementation status](project-status.md).

## Instagram feature development

Follow [Instagram setup](instagram-setup.md) for account/app credentials, HTTPS callback,
token renewal, media URLs, and the real-account test. Run `npm run setup:env` to create
an independent token encryption key without replacing existing credentials. Restart all
processes after environment/schema changes. The user applies the new migration to their
configured database; automated checks use a temporary isolated database only.

The backend owns provider tokens and publishing. Next.js proxies same-origin workspace/media
requests and forwards cookies; keep API authorization/origin validation even when adding UI.
Workspace writes use per-user database throttles. Tests reset throttling counters; never use
`TEST_DATABASE_URL` for a creator's database. Integration fixtures simulate Meta, without
network authorization or publishing to a real Instagram account.

Use `packages/publishing` for the HTTP adapter, AES token storage, validation/renewal, and
signed media links. Keep uploads, posts, channels, and OAuth separate API modules. Worker
claims use database row locks/leases and store container/send markers before remote effects.
Queues carry publication IDs only. Do not clear an uncertain send marker to force a retry.
Media storage is persistent local disk in this iteration; S3/production retention remain future work.

OAuth failure redirects expose only the application error category, a fixed operation name,
HTTP status, and numeric Meta error code/subcode. The provider adapter accepts nested Graph
errors and top-level token-exchange error codes, discarding raw messages/bodies. Keep these
diagnostics free of request URLs, authorization codes/state, identity details, and credentials.
See [Instagram setup](instagram-setup.md) before diagnosing a failed live authorization.
Instagram Login grants are parsed from the code exchange and stored as granted scopes.
Token validation uses the profile and read-only publishing quota endpoint; do not add an
unsupported `/{id}/permissions` grants lookup to this flow.

## Media and composer development

The composer uses separate caption/hashtag fields and a live preview of the selected account,
media, and exact combined saved text (2,200 characters maximum). Tags accept spaces/commas,
optional `#`, and Unicode letters/marks/numbers/underscores. A trailing hashtag block round-trips
into the hashtag field on editing; ordinary paragraphs remain unchanged. File-picker and real
one-file drag/drop flows share validation. Upload cancellation/replacement cannot apply stale
results; saving waits for prepared media, while caption entry remains available during upload.

Photo inputs are still JPEG, PNG, WebP, or AVIF, at most 8 MB and 40 megapixels, at least
320 px wide after orientation. Signature and decoded format must agree. Sharp strips metadata,
flattens transparency onto white, fits inside 1,440 × 1,800 without enlargement, and pads to
4:5–1.91:1 when needed to retain the whole photo. Stored/published photos remain JPEG.

MP4 inputs are H.264/H.265, at most 64 MB, 3 seconds–15 minutes. FFprobe validates streams and
duration; FFmpeg prepares H.264/yuv420p at 30 fps, fits inside 1,920 × 1,920 without enlargement,
and prepares optional AAC stereo audio at 48 kHz/128 kbps. Input metadata is stripped.
There are at most two transcodes per API process, a 120-second transcode timeout, and a 64 MB
output cap; truncated outputs are rejected. The Next.js/browser upload timeout is 180 seconds.
Upload bodies are bounded while reading. API and production proxy/body/time limits must support
these values; larger Vercel function uploads need a future direct-upload design.

Existing JPEG storage stays compatible. Video storage uses `.mp4`; private/signed media routes
validate ownership or signatures and serve byte ranges, which the web proxy forwards for playback.
The worker chooses photo or `REELS` containers from persisted media type/MIME, saves the
container before polling, and keeps existing send-marker/uncertain-outcome protections.
No schema migration is needed. HEIC/GIF, multiple attachments/carousels, and Stories remain unsupported.
The preview describes composition; Instagram cover cropping/text display can differ.

## Update log

### 2026-10-09 — initial foundation and authentication

Created the npm monorepo, Next.js/Tailwind/shadcn/Roboto frontend, Express API, worker,
PostgreSQL/Prisma domain/auth models, Redis infrastructure, and Better Auth login/signup/logout.
Added ESLint, Prettier, Husky/lint-staged, CI, project context, and this living guide.

Verification: formatting/lint/types/build pass; 12 unit and 3 PostgreSQL integration tests pass.
Runtime checks verify auth proxy cookies, protected planner, filters, session revocation,
throttling, migrations, and worker delivery. Desktop/mobile login screenshots reviewed.
Implementation commit: `0acc647`. Docker startup requires a sudo password on this machine.

### 2026-10-09 — diagnose signup database connection failures

Added `npm run db:check` to distinguish unreachable PostgreSQL from pending/unfinished
migrations using read-only queries. It reports IPv6-only DNS and Supabase session pooler
guidance without logging credentials. Documented the signup session dependency and recovery.

Initial diagnosis: API readiness reported PostgreSQL down and Redis up; the Supabase direct
hostname resolved only to IPv6, and connections failed with `ENETUNREACH`. A subsequent
read-only check after local configuration changed reached PostgreSQL and reported pending
migrations. The user is handling configuration and migrations; no remote migrations were run.

Verification: formatting, lint, strict types, package compilation, and 12 unit tests passed.
Temporary PostgreSQL checks verified the diagnostic's missing, applied, and unfinished
migration paths, including exit codes and credential-safe output.

### 2026-10-09 — public landing and consistent responsive design

Added a static public landing page at `/` and moved the protected workspace to `/planner`.
Updated login/signup destinations and filter URLs. Introduced shared white/graphite tokens,
consistent Roboto typography, original studio photography, focused auth forms, and clearer
planner/setup layouts. Fixed system dark preference partially recoloring light-theme controls.

Public and protected page modules remain separate. Marketing distinguishes available accounts
and planner screens from upcoming Instagram connection, drafts, uploads, and publishing.
The original studio image is a locally hosted 200KB WebP delivered through Next.js Image.

Verification: formatting, lint, types, 12 unit tests, and full production build pass. Browser
checks cover eight widths from 320 to 1920px, labelled forms, focus, dark/reduced-motion
preferences, filters, expanded guidance, and long names. Public landing has no auth API
dependency. Planner UI review uses an isolated session fixture, without database changes.
See [design](frontend-design.md) and [review](frontend-review.md) for scope and limitations.

### 2026-10-09 — Instagram workflow and functional planner

Added Instagram OAuth sign-in/account linking with one-use browser state, immutable identity,
encrypted credentials, permission checks, expiry handling, and automatic long-lived-token renewal.
Added authenticated JPEG upload/validation, draft create/edit/delete, scheduling/cancellation,
retry rules, and live status filters. Fixed the workspace logo returning to the public landing.

A separate BullMQ processor scans durable PostgreSQL scheduling state, claims with leases,
saves container/send markers, records attempts, and reconciles crashes/uncertain sends without
blind duplicate publishing. Setup now generates a separate encryption key; new migration fields
are documented. The user applies migrations to their own database. Added the real-account setup
and test guide, preserving the existing neutral Roboto/Tailwind/shadcn design.

Verification: schema validation and isolated deployment of all three migrations passed.
21 PostgreSQL/Redis/provider-fixture integration checks passed, including
secure auth/linking, real queue recovery, ownership, upload validation, draft races, token lifecycle, duplicate jobs,
and ambiguous outcomes. Real Meta authorization/publishing is still pending user setup/testing.
Final quality/build/browser results are recorded in [implementation status](project-status.md).

### 2026-10-12 — restore Instagram login through the HTTPS tunnel

Allowed the exact private HTTPS test hostname in Next.js `allowedDevOrigins`. Before the
change, the Instagram button rendered enabled but React did not attach its handler through
the tunnel; the same page worked on localhost. After the config restart, HMR connected and
the button invoked `POST /api/auth/instagram/start` through the tunnel. The browser diagnostic
intercepted that request before any backend or Instagram authorization effect.

Verification: Chromium checks reproduced the failure with cache disabled and confirmed
working hydration/click handling after the change. Formatting, lint, strict types, unit tests,
and production build results are recorded in [implementation status](project-status.md).

### 2026-10-12 — diagnose rejected Instagram callback requests

Preserved the OAuth operation and safe numeric provider diagnostics through the adapter and
callback redirect. Previously all unrecognized Meta rejection responses became the same
`PROVIDER_REJECTED` URL, hiding whether code exchange, long-lived-token exchange, profile,
or permissions failed. The existing authorization, error categories, and uncertain-write
handling remain; no raw provider message, response body, token, or authorization code is exposed.

Verification: focused adapter/client/redirect tests cover all four OAuth operations, both error
envelopes, error categories, missing/malformed diagnostics, and secret-safe failure URLs.
Full check/build results are recorded in [implementation status](project-status.md).
The user's live rejection still needs a fresh attempt to obtain the new diagnostic fields.

### 2026-10-12 — repair Instagram Login permission validation

The user's callback reached `permissions` and failed with HTTP 400 / Meta code 100 after
token exchange/profile succeeded. Replaced the unsupported permissions edge with validation
of code-exchange grants plus a read-only publishing-access request. Stores actual granted
scopes and rejects missing/malformed grants rather than trusting requested scopes. Keeps
professional identity, token encryption, ownership, expiry, and revocation checks intact.

The user confirmed successful live Instagram sign-in after the change. Live publishing is
still pending. Regression fixtures reject the old endpoint and exercise denied publishing
access before any media write. Full validation results are in [implementation status](project-status.md).

### 2026-10-12 — media composer with live photo/video previews

Added distinct caption/hashtag fields, a combined character counter, actual account/media/text
previews, playable videos, keyboard file selection, and drag/drop. Photo inputs now include
PNG/WebP/AVIF, converted to validated JPEGs with metadata removal and aspect-ratio padding.
Implemented bounded MP4 normalization, private/signed byte-range playback, and durable Reel
container creation/polling through the existing worker. API/CI now require FFmpeg/FFprobe;
no database migration was added or applied to the creator database.

Verification: 78 unit tests, 26 isolated PostgreSQL/Redis/provider-fixture integration tests,
formatting/lint/types, and full production build passed under Node 24. Chromium checked all
eight required widths, error focus, caption/hashtag draft round-trip, actual PNG drag/drop,
MP4 playback/range responses and scheduling, dark preference, and reduced motion.
Desktop/mobile/tablet screenshots were inspected. No real provider publish was performed;
first live photo/Reel publishing and physical Safari/iPad testing remain pending.

### 2026-10-13 — fix test-file TypeScript project discovery

Added a root TypeScript configuration covering backend/package unit tests and existing tooling
and integration checks, so VS Code resolves their NodeNext imports and Vitest types with the
project's strict settings. The typecheck command now checks this config; production builds
continue excluding test files. Web tests retain their Next.js configuration. Explicitly enabled
Node types in the shared backend config after reproducing missing `node:crypto`, `RequestInit`,
and other Node globals using VS Code's bundled TypeScript 6 server.

Verification: VS Code's TypeScript server reports zero semantic errors across 118 source/test
files after the fix. Strict root test typecheck passed. Full check/build results are recorded in
[implementation status](project-status.md).

### 2026-10-13 — redesign the publishing planner

Researched scheduling workflows, information hierarchy, and mobile disclosure, then rebuilt
the planner as a publishing desk: a quiet sidebar, real workspace-wide status totals, compact
media rows, chronological next-three agenda, connection health, and a mobile summary. Added
Radix/shadcn menus and a URL-linked composer sheet with fixed actions, focus management, and
dirty-close protection. Counts and agenda are independent of filters/pagination and constrained
to the authenticated creator. Existing publishing rules remain; no schema migration is needed.

Verification: 78 unit tests, 28 isolated PostgreSQL/Redis/provider-fixture integration tests,
formatting/lint/types, and production build passed under Node 24. Chromium checked populated,
empty, composer, long-name/caption, and expanded/expired connection layouts at all eight widths.
Verified real upload/schedule and draft editing through the isolated API, error focus, keyboard
menus, focus trapping/restoration, dirty-close protection, dark preference, and reduced motion.
No creator database or real Instagram account was changed. See [review](frontend-review.md).

### 2026-10-13 — revise the planner layout and thin all app scrollbars

Replaced the sidebar, duplicated summary/navigation, and tall empty blocks with a single top
bar, compact counted status tabs, a media list, and a 288px account/queue rail. Tablet panels sit
beneath the list; phone titles/actions fit one row. Healthy account maintenance uses expandable
details. Added thin scrollbars globally, including filters, editor content, and textareas.
Added the brand app icon after browser review found a missing favicon request.

Pinned Tailwind source detection to the web source directory and added a compiler regression
test that reproduces missing responsive utilities without the explicit source. The supplied
screenshots showed missing layout styles; fresh localhost/tunnel CSS now applies the grid,
spacing, media, and thin scrollbar rules. The historical cause was not conclusively established.

Verification: formatting, lint, strict types, 79 unit tests, and the full production build passed
under Node 24. Playwright used an isolated development web/API/database with a single published
post like the supplied screenshots. All eight widths passed computed column/padding/media-size,
page/dialog overflow, scrollbar, empty-filter, and composer checks with no browser errors.
Mobile/tablet/desktop screenshots were inspected. No schema or publishing rules changed.

### 2026-10-13 — make planner editor actions respond without a server render

New post, empty-state creation, and loaded post editing now update URL state and open the
composer locally. Closing keeps the active filter/cursor and existing unsaved-close checks.
Previously these links waited for a fresh authenticated workspace render before updating the
address or showing the editor. A delayed-response browser check reproduced that unchanged
address/closed-editor state; the updated action makes zero editor-navigation requests.

Verification: formatting, lint, strict types, 79 unit tests, and the production build passed
under Node 24. Playwright checked all eight widths, creation from All/Published/Scheduled,
empty-state creation, direct editor URLs, back/forward, new-tab links, loaded scheduled editing,
dirty-close choices, restored focus, real photo upload and scheduling, and validation feedback.
The isolated preview's stale Turbopack cache was moved aside after a compiler panic; no live
compiler failure was found. No creator records, provider calls, or schema changes were used.

### Future entries

For each completed update, append its date, changed behavior, affected setup/architecture,
and validation results. Update instructions above whenever commands or conventions change.
