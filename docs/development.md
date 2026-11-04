# Development guide

Keep this guide current **on every completed feature or fix**. Update the implementation
status at the same time. Record the change and its verification in the update log below.

## Product and current scope

Social Scheduler helps creators prepare and schedule Instagram and managed Facebook Page
content, plus TikTok photo/video Direct Post with account-specific settings and approval gates.

The current application has email/password and Instagram authentication, a protected planner,
photo/MP4 uploads, caption and hashtag editing with live previews, drafts, durable scheduling,
and a publishing/recovery worker. The user has
verified real Instagram sign-in; a real publish still needs testing. Facebook Page connection and captioned photo/video
publishing are implemented with fixture verification; live Facebook testing remains pending.
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
# Add Cloudinary credentials to the root .env; see cloudinary-setup.md.
npm run infra:up
npm run db:deploy
npm run dev
```

Open [localhost:3000](http://localhost:3000) and create an account.
`/` is the public landing page; `/privacy-policy` and `/terms-of-service` are static public
legal pages linked from its footer. `/login` and `/signup` return authenticated users to `/planner`.
The planner and its content filters live at `/planner` and `/planner?view=…`.
PostgreSQL listens on port 5432, Redis on 6379, and the Express API on 4000.

If your Linux user cannot access Docker, start infrastructure with:

```sh
sudo docker compose -f infra/docker-compose.yml up -d --wait
```

Setup creates an untracked root `.env`, preserves existing values, and adds a random
`BETTER_AUTH_SECRET` if missing. It also creates `frontend/.env.local`.
Never copy development credentials into staging or production.

## Configuration

| Variable                                                               | Used by                 | Purpose                                                                  |
| ---------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`                                                         | API, worker, Prisma CLI | PostgreSQL connection                                                    |
| `REDIS_URL`                                                            | API, worker             | Queue/readiness connection                                               |
| `WEB_ORIGIN`                                                           | API                     | Exact trusted web origin; HTTPS in production                            |
| `BETTER_AUTH_SECRET`                                                   | API                     | High-entropy authentication secret, at least 32 characters               |
| `API_PUBLIC_URL`                                                       | API                     | Browser-reachable Express origin for direct uploads; HTTPS in production |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | API, worker             | Server-only Cloudinary credentials                                       |
| `CLOUDINARY_FOLDER`                                                    | API, worker             | Environment-specific media namespace                                     |
| `API_PORT`                                                             | API                     | HTTP listener, default 4000                                              |
| `LOG_LEVEL`                                                            | API, worker             | Structured log level                                                     |
| `WORKER_CONCURRENCY`                                                   | Worker                  | Concurrent infrastructure checks                                         |
| `API_BASE_URL`                                                         | Web server              | Express origin; never exposed to browser code                            |
| `TEST_DATABASE_URL`                                                    | Integration tests       | Isolated test PostgreSQL database                                        |
| `TEST_REDIS_URL`                                                       | Integration tests       | Isolated test Redis service                                              |

The root environment file serves API, worker, and Prisma CLI. Next.js reads its own
workspace environment file. Hosting supplies production variables and keeps environments separate.

Cloudinary upload errors include a validated provider HTTP status, known transport code or
fixed confirmation-field name. See [upload troubleshooting](cloudinary-setup.md#troubleshoot-failed-uploads)
before changing server credentials or video tools; never log raw SDK errors or signed parameters.

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

Read [the codebase walkthrough](codebase.md) first. It traces a post from the browser to
Express, the database, and the worker, with concrete file links and examples of common edits.

| Concern                                 | Location                                               |
| --------------------------------------- | ------------------------------------------------------ |
| Next.js pages, layouts, proxies         | `frontend/src/app`                                     |
| UI components                           | `frontend/src/components/{auth,landing,planner,ui}`    |
| Client hooks                            | `frontend/src/hooks/{auth,planner}`                    |
| Frontend API clients/helpers            | `frontend/src/lib`                                     |
| Express URLs/middleware wiring          | `backend/src/routes`                                   |
| Request validation/responses            | `backend/src/controllers`                              |
| Business rules and transactions         | `backend/src/services`                                 |
| Database queries and mapping            | `backend/src/repositories`                             |
| Provider calls, OAuth, encrypted tokens | `backend/src/integrations/{instagram,facebook,tiktok}` |
| Media processing/storage                | `backend/src/lib/media`                                |
| Worker startup/publishing/recovery      | `backend/src/worker`                                   |
| Environment and resource setup          | `backend/src/config`                                   |
| Prisma schema/migrations/client         | `backend/prisma`, `backend/src/database`               |
| Browser-safe validation and types       | `packages/shared/src`                                  |

Backend files use ordinary relative imports; frontend files use `@/` imports.
Only shared browser/backend code is an npm package. Avoid adding forwarding wrappers,
generic repositories, or a service for a read that is already clear in a query module.
Services can use Prisma transactions directly to keep locking and business rules together.
Keep authored files small; ESLint enforces 250 nonblank source lines and 80 per function.
Generated clients, migrations, and the lockfile are handled by their tools.

`npm run dev` generates Prisma, builds shared, then watches shared, frontend, API, and worker.
`npm run dev:frontend` runs Next.js; `npm run dev:backend` runs API and worker together.
Run `npm run build:packages` first when starting individual processes or Vitest directly.
`npm run dev:api` and `npm run dev:worker` are useful when debugging one backend process.
`npm run dev:web` remains an alias for the frontend command.

After pulling the directory reorganization, stop old development processes, run `npm install`,
and restart with `npm run dev`. Move an existing `apps/web/.env.local` to `frontend/.env.local`
when updating another checkout; `npm run setup:env` creates it for new installations.
Root `.env` and `.data/media` paths are unchanged. Prisma commands now run inside `backend`;
existing migration SQL and database tables are unchanged, so no new migration is needed.

Build backend with `npm run build:backend`. Run the HTTP API with
`npm run start -w @social-scheduler/backend` and the separate worker with
`npm run start:worker -w @social-scheduler/backend`. Both use the same backend build.
Set Vercel's project root to `frontend`; retain root workspace installation/shared compilation.

Use Tailwind utilities and shared tokens, shadcn/ui primitives, and local Roboto.
Read frontend-design before UI changes; use web-design-guidelines for review.
Keep accessibility, mobile layout, loading/error states, and URL-based filters intact.

The current design uses white/graphite surfaces, subtle gray dividers, and Roboto throughout.
Theme colors are defined in `frontend/src/app/globals.css`; avoid one-off feature palettes.
The planner uses a single top bar, status tabs with real workspace-wide totals, a bounded
upcoming-post agenda, compact media rows, account health, and a URL-linked composer sheet. Read
[planner research](planner-research.md) for the design decisions. Count/agenda queries live in
the workspace repository and check ownership independently of list filters/pagination; do not
derive totals from the loaded page. The web and API must use the same updated workspace contract.
No migration is needed; rebuild shared and restart individual frontend/API processes when
updating them outside `npm run dev`. The composer uses Radix/shadcn sheet and menu primitives.
New post, empty-state creation, and loaded-row editing use `ComposerLink` and the native History
API to change `compose` without a server navigation. `Planner` reads the live URL through
`useSearchParams`; closing removes `compose` locally after checking unsaved changes. Keep these
editor actions in the current view/cursor. Filters and save/schedule still load actual server data;
opening a new browser tab or refreshing an editor URL still uses the authenticated page.
Public page components live in `src/components/landing`. Keep `/` independent of API availability.
The Tailwind import explicitly sets `source('../')` relative to `src/app/globals.css`, so utility
detection covers `src` regardless of the compiler working directory. Keep this source anchor.
The CSS regression test compiles from an empty working directory and checks responsive utilities.
Global scrollbar rules cover page and nested scrolling surfaces with native thin bars and a
6px WebKit fallback. Keep scrollbars visible and keyboard scrolling available.
Development cache settings live in `frontend/development-cache.ts`. The source fingerprint
supplies a consistent development deployment ID when Next.js loads config, producing fresh
asset URLs for changed source on restart. Development responses send browser, generic CDN, and
Cloudflare no-store directives. Production receives none of these overrides. Persistent
Turbopack development caching is disabled after a reproduced stale-task failure; cold starts
recompile rather than restore that state. Recheck cache headers through the tunnel when diagnosing
missing styles or inert UI; a localhost-only browser run cannot expose the CDN's cache policy.
Original website imagery lives in `frontend/public/images` with provenance notes. Use Next.js
Image and responsive sizes; preserve explicit aspect containers to avoid layout shifts.

For substantial visual updates, inspect landing, login, signup, and planner at 320, 390, 768,
820, 1024, 1280, 1440, and 1920px. Check both viewport overflow and intentionally scrollable
filters, long names, labelled controls, keyboard focus, expanded guidance, dark system preference,
and reduced motion. Check development CSS as well as production: assert computed grid columns,
padding, media dimensions, and editor placement rather than relying only on overflow checks.
Chromium viewport checks cover layout; physical-device/Safari behavior
needs its own review when those browser targets are added to the validation environment.

## Database changes

Prisma loads multiple schema files in `backend/prisma`.
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
unit/integration tests, and builds. Provider fixtures exercise Instagram/Facebook/TikTok OAuth,
uploads, ownership, worker claims, duplicate delivery, token lifecycle and uncertain outcomes.

Provider load tests now cover Instagram, TikTok and YouTube independently. TikTok runs the photo
upload plus consent-aware lifecycle; YouTube uses pre-prepared MP4 fixtures for its lifecycle and
worker load, because actual transcoding intentionally permits only two concurrent preparations.
Each provider gets 1,000 distinct sessions/accounts and 1,000 queued publications. TikTok/YouTube
report paths can be overridden with `TIKTOK_LOAD_REPORT_PATH`, `TIKTOK_QUEUE_REPORT_PATH`,
`YOUTUBE_LOAD_REPORT_PATH` and `YOUTUBE_QUEUE_REPORT_PATH`. Browser tests include both real provider
connection start/callback paths with provider navigation intercepted before any live request.

Additional suites deliberately use a **separate loopback database whose name ends in
`_load_test`**. Apply the existing migrations there using an explicit `DATABASE_URL` first.
Do not reuse creator or shared development services. Queue load tests additionally require
a loopback Redis URL selecting dedicated database `/1`. Tests create/delete their own fixtures.

```sh
# Example dedicated services; substitute the isolated ports you provisioned.
export TEST_DATABASE_URL=postgresql://scheduler:scheduler_test@127.0.0.1:55449/scheduler_load_test
export TEST_REDIS_URL=redis://127.0.0.1:56449/1
npm run build
npm run test:browser
npm run test:load
```

Browser tests start an isolated API and production Next.js server on port 3159, and use headless
Chromium at `/usr/bin/chromium` (override `CHROMIUM_PATH` if needed). Install Chromium and FFmpeg
first. They exercise real forms/proxies, direct uploads, photo/video processing, draft editing,
scheduling, a fixture publication, cancellation/deletion, logout and eight viewport widths.
The provider connection and storage are test fixtures; no live credentials are used.

Load tests seed 1,000 independent signed sessions, launch each HTTP phase with 1,000 simultaneous
requests, validate responses and owner isolation, then separately drain 1,000 due publications
through actual Redis with worker concurrency 2. Reports default to
`/tmp/scheduler-load-results.json` and `/tmp/scheduler-load-queue.json`; override `LOAD_REPORT_PATH`
and `QUEUE_REPORT_PATH`. Results are local burst measurements, not a sustained production SLA.
See [the regression report](regression-report-2026-10-25.md) for evidence and exclusions.

Post saves use Read Committed transactions with shared locks on the chosen owned account/media
and an exclusive publication lock for edits. Keep those locks together with revision/state guards
when changing transactions. Cancellation and retry advance the post revision atomically so an
already-open editor cannot undo them. Database pool acquisition and transaction admission wait
at most ten seconds; queries retain a three-second timeout and transactions five seconds.
Read-only auth session checks bypass the shared IP bucket; credential/OAuth and per-user mutation
limits remain. Without a trusted client-IP deployment configuration, credential routes retain
the auth library's shared fallback bucket: the load suite measures existing sessions, not mass signup.

## Verify running applications

YouTube adds `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` and `YOUTUBE_REDIRECT_URI` to API/worker
configuration. Use the existing independent token encryption key; enable YouTube Data API v3
and configure Google web OAuth. Apply `20261025050000_youtube_platform` through your own creator
migration workflow before restarting the updated API/worker. Only isolated test databases were
migrated by the agent. See [YouTube setup](youtube-setup.md) for scopes, channel selection, quotas,
media limits, visibility/audience controls and live verification. Google processing can finish
after the scheduled upload start; the app does not pre-upload or set Google's `publishAt`.

`integrations/youtube` owns Google OAuth, token refresh, channel identity and resumable requests;
`youtube-posts.service` validates video/settings and consent, while `worker/publishing/youtube`
owns markers, encrypted session persistence, suffix recovery and video processing outcomes.
The browser receives only safe post settings; upload sessions stay encrypted/server-only.

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
  is listed in `allowedDevOrigins` in `frontend/next.config.ts`. The current private test
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

Use `backend/src/integrations/instagram` for the HTTP adapter, AES token storage, and
validation/renewal. `backend/src/lib/media` owns signed media storage and processing.
Keep uploads, posts, and channels in their named routes/controllers/services. Worker
claims use database row locks/leases and store container/send markers before remote effects.
Queues carry publication IDs only. Do not clear an uncertain send marker to force a retry.
New media is stored as authenticated Cloudinary assets. Existing local uploads retain their read path;
new uploads never fall back to disk. See [Cloudinary setup](cloudinary-setup.md).

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
output cap; truncated outputs are rejected. The browser upload timeout is 180 seconds.
Upload bodies are bounded while reading. The browser obtains a ten-minute one-use ticket via
Next.js, then uploads directly to `API_PUBLIC_URL`; the API/proxy must support these body/time
limits. File bytes bypass Vercel functions. Cloudinary credentials remain server-only.

Cloudinary stores prepared JPEG/MP4s under immutable UUID identifiers. Private preview routes
check ownership and redirect to expiring protected downloads. Local JPEG/MP4 storage stays readable,
including existing signed routes and byte ranges. `MEDIA_PUBLIC_URL` is needed only for legacy media.
The worker chooses photo or `REELS` containers from persisted media type/MIME, saves the
container before polling, and keeps existing send-marker/uncertain-outcome protections.
No schema migration is needed. HEIC/GIF, multiple attachments/carousels, and Stories remain unsupported.
The preview describes composition; Instagram cover cropping/text display can differ.

## Facebook feature development

Read [Facebook setup](facebook-setup.md) and [the official-source research](facebook-research.md).
Set `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_GRAPH_VERSION` and
`FACEBOOK_REDIRECT_URI` in API and worker environments, sharing the existing independent
`TOKEN_ENCRYPTION_KEY`. Optional `FACEBOOK_LOGIN_CONFIG_ID` supports Business login
configurations issuing User Access Tokens. Callback must match `WEB_ORIGIN` plus
`/api/auth/facebook/callback`. Facebook can run independently of Instagram configuration.

Page connection requires an existing application session. Meta consent selects allowed Pages;
all returned eligible Pages are saved atomically with encrypted, provider-bound Page tokens.
Actual grants/identity/expiry are checked on connect and before sending. Facebook Page tokens
with no fixed expiry store null, with separate data-access expiry checks. Reconnect instead
of using Instagram's refresh endpoint. See setup/research for App Review and production gates.

The common composer saves one photo or MP4 with captions to one chosen account/Page. Its
2,200-character caption and upload limits are application policy. Facebook uses `/photos`
and `/videos`; it does not claim dedicated Reels support. Existing protected Cloudinary URLs
and direct uploads are shared. No schema changes or creator database migrations are required.

The existing `instagram-publishing` queue now dispatches by stored provider. Facebook sends
under a durable marker/lease guard. Known video IDs resume processing/public-status checks;
lost send responses without IDs stay uncertain, with no automatic resend or caption matching.
The full isolated integration suite includes Facebook session/state/ownership, photo/video
outcomes, token expiry/revocation, provider configuration and real Redis recovery.

## TikTok feature development

Read [TikTok setup](tiktok-setup.md) and [the official-source research](tiktok-research.md).
API/worker require `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`,
`TIKTOK_MEDIA_ORIGIN` and the existing independent `TOKEN_ENCRYPTION_KEY`. The callback must
match `WEB_ORIGIN` plus `/api/auth/tiktok/callback`. The media origin is an HTTPS Express
origin verified in TikTok URL properties; it serves signed downloads directly without redirects.
Default `TIKTOK_DIRECT_POST_AUDITED=false` limits testing to private accounts/Only me.
Enable audited mode only after TikTok approves the app's Direct Post audit; scope approval,
creator quotas and intended-use requirements also apply. No live provider feasibility is claimed.

The nullable MediaAsset.durationSeconds migration records normalized MP4 duration for creator
limit checks. Apply `20261014160000_tiktok_media_duration` through the user's migration workflow
before starting updated code. Old videos without duration need reupload for TikTok. Create/test
migrations on isolated services only; never deploy them to the creator database without instruction.

Use `integrations/tiktok` for OAuth/tokens/client/validation, `tiktok-posts.service` for per-post
preparation and `worker/publishing/tiktok.ts` for sends/status recovery. Publication metadata
holds the chosen settings and server-recorded consent time. Creator info is fetched for the
composer, scheduling and sending. Privacy stays unselected initially; interactions/disclosures
are off. Draft choices persist but consent resets on reopening/edits. One-click retry is disabled
for TikTok: review and reschedule after a definite safe failure. Known publish IDs resume polling;
lost initialization responses stay uncertain. Inbox delivery is not marked published.

`services/tiktok-media.service` checks the signed publication/media/owner state and serves
protected Cloudinary bytes from the API. Remote download URLs and redirects are restricted to
Cloudinary hosts, response bytes/time/concurrency are bounded, and photo delivery is resized to
1080px. TikTok receives a two-hour signed owned-domain URL; no new disk storage fallback or
browser credential is introduced. API bandwidth is required for this provider's media fetches.

## Update log

### 2026-11-04 — custom Social Scheduler brand mark

Replaced the stock layers symbol with a custom routed-S mark and refined Roboto wordmark
in the public, authentication, and planner headers. The landing editorial panel and
browser icon now use the same vector shape. Exported SVG, 512px PNG, and TikTok-sized
1024px PNG files for download at `/brand/`. Verification: Node 24 formatting, lint,
types and 177 unit tests passed; the Next.js Webpack production build and responsive
browser review passed. The default Turbopack build could not open its internal PostCSS
port in this environment. No provider, database, or deployment change.

### 2026-11-04 — public Privacy Policy and Terms of Service

Added standalone, API-independent `/privacy-policy` and `/terms-of-service` pages with
page metadata and a public contact address. The landing footer exposes both links for
TikTok app configuration, and TikTok setup now records the full-HTTPS-URL and ownership
verification steps. The policy describes current data handling and explicitly notes that
production retention periods and self-service account deletion are still pending.
Verification: formatting, lint, strict types, unit tests, production build, and static
route checks passed. No provider call, deployment, or creator-database change.

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

### 2026-10-13 — repair stale UI assets through the HTTPS development tunnel

The user still saw a closed editor and missing post images after the address changed and a
refresh. The stored published JPEG was ready and present. Header inspection found localhost
development CSS using revalidation while the tunnel changed it to a four-hour browser TTL.
Added development-only no-store browser/CDN/Cloudflare headers and source-versioned asset URLs.
Disabled restored development compiler caches after reproducing stale-task failures in the
isolated preview. The live web compiler restarted; the user confirmed the UI now works.

Verification: final tunnel assets return private/no-store and Cloudflare BYPASS; expected image
and sheet utilities are generated. Repeated source hashing gives the same ID, changed source
gets a different ID, and production keeps Next.js defaults. Formatting/lint/types, 81 unit tests,
and the full production build passed under Node 24. Temporary UI diagnostics were removed.
Creator-media checking was read-only; no records, migrations, or provider calls were changed.

### 2026-10-13 — simplify backend, frontend, and shared code

Consolidated seven workspaces into `backend`, `frontend`, and `packages/shared`. The backend
now owns Express, worker entry points, Prisma schema/migrations/client, environment validation,
Instagram OAuth/client/tokens, and media processing/storage. Routes wire named controllers;
controllers handle HTTP validation/responses, while services retain business rules and transactions.
API and worker reuse one Instagram resource factory and one backend build. Removed unused generic
provider contracts and redundant server package manifests/build watchers.

Next.js now uses `src/app`, `components/{auth,landing,planner,ui}`, `hooks/{auth,planner}`, and
`lib` with consistent `@/` imports. Updated setup scripts, npm workspaces/lockfile, tooling paths,
frontend/backend import boundaries, and documentation links. Added [a codebase walkthrough](codebase.md)
with the complete post flow and a table of common edits. Restart development processes after
updating; `npm run dev` prepares and starts everything. Production uses the `frontend` hosting
root and separate API/worker commands from the same backend build.

Verification: formatting, lint, strict types, all 81 unit tests, all 28 isolated integration tests,
Prisma validation, and production build passed under Node 24. All three migration SQL files are
byte-for-byte unchanged and deployed successfully to a fresh temporary test database. Compiled
API/frontend/worker startup, database diagnostics, and infrastructure queue consumption passed.
Chromium verified landing, protected redirect, signup/session forwarding, composer, real PNG upload,
and draft save/edit, with no page errors or overflow at 390/768/1280px. Root `npm run dev` started
all processes and the shared watcher successfully. Compared 77 frontend/worker source bodies:
only imports changed. No creator database, live provider calls, publishing rules, or UI design changed.

### 2026-10-13 — Cloudinary storage and direct media uploads

New prepared JPEG/MP4s now upload through the official Cloudinary Node SDK as authenticated
assets, with overwrite disabled and persisted remote identifiers. Owned previews redirect to
one-hour protected downloads; the worker generates a fresh 24-hour Cloudinary URL for Instagram.
API/worker share server-only Cloudinary configuration. Existing local media remains readable;
new uploads never fall back to permanent VPS disk. FFmpeg temporary files remain bounded and removed.

The composer requests a small authenticated upload authorization through Next.js, then transfers
bytes directly to Express at `API_PUBLIC_URL` without cookies. Ten-minute HMAC authorizations
are bound to a media record and atomically claimed once; origin, MIME, declared size, actual bytes,
and the existing photo/video validation are enforced. Failed reservations cannot be saved/replayed;
database-save failures remove the matching remote asset. Auth/workspace proxies retain their role.
Added [Cloudinary setup](cloudinary-setup.md), environment examples, and upload/publishing regression
checks. No schema migration is needed; `MediaAsset.storageKey` stores the Cloudinary identifier.

Verification: formatting/lint/types, 92 unit tests, all 34 isolated PostgreSQL/Redis/provider-fixture
integration tests, and production build passed under Node 24. Real photo/video preparation runs in
fixtures; Cloudinary and Instagram responses are simulated. Chromium checked signup/session proxy,
a 5 MB file upload directly to Express, native redirect/image delivery through a local Cloudinary
fixture, and draft save/reopen/edit, with no page errors or overflow at 390/768/1280px. Compiled
API/frontend/worker startup, database diagnostics, and queue consumption also passed. Creator data
was not migrated; no authorized live Cloudinary upload or Instagram publish, push, or deployment
was performed. Live Cloudinary delivery and Meta fetching the signed photo/Reel URLs remain to test.

### 2026-10-14 — Facebook Pages with captioned photos and videos

Researched current Meta Page, Login, token, photo/video and Reels references; documented
endpoint selection and setup gates. Added authenticated Page connection, encrypted Page
tokens, actual/granular permission and expiry validation, optional Business login configuration,
periodic validation, and provider-aware scheduling/channel actions. The planner offers both
providers with real Page names, provider-specific previews and public Page-post disclosure.

Facebook photos publish with captions; MP4s publish as Page videos with descriptions and
saved IDs, then wait for processing and public status. The worker shares durable scheduling,
ID-only Redis delivery and leases; lost responses retain a no-resend marker. Instagram jobs,
OAuth modes and ciphertext remain compatible. No schema migration or live provider write.

Verification: formatting/lint/strict types, all 111 unit tests, all 53 isolated PostgreSQL/Redis/provider-fixture
integration tests, and the production build passed under Node 24. Existing migrations deployed
successfully to the isolated test database; schema/migrations are unchanged. Chromium checked
320/390/768/820/1024/1280/1440/1920px with mixed providers, long Page names, caption composition,
real stored MP4 metadata/playback availability and provider previews; no page errors or horizontal
overflow. The Facebook button reached the authenticated start endpoint and its Meta redirect was
intercepted before a live request. Desktop/mobile/tablet screenshots and changed UI were reviewed.
No creator records, real provider writes, push or deployment; live Facebook connection/photo/video
and signed Cloudinary delivery remain to verify.

### 2026-10-14 — TikTok connection and captioned photo/video Direct Post

Reviewed current official TikTok Login, token, creator, publishing, media, status and UX
requirements. Implemented same-session account connection, encrypted rotating token bundles,
serialized refresh, explicit per-post settings/consent, account-specific media checks and
private-test/audited mode gates. Added provider-aware composer controls/previews and channel
connection alongside Instagram/Facebook, with consent reset on edits and safe failed-post actions.

The worker sends hosted media only after durable guards, saves publish IDs and polls terminal
outcomes without duplicate sends. A signed, verified-domain API endpoint resolves protected
Cloudinary delivery server-side and serves bounded JPEG/MP4 bytes without redirects. Added a
nullable duration migration for normalized MP4s; the creator database was not migrated.

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

### 2026-10-25 — adversarial regression and 1,000-user concurrency fixes

Added `test:browser` and `test:load` with dedicated loopback service guards, headless production
frontend flows, 1,000-user HTTP bursts and 1,000-publication Redis recovery. Added nine integration
regressions for authorization, concurrent edits, throttling and cancellation/retry revisions.
Fixed shared session throttling, unrelated-save serialization/admission failures and stale editors
undoing status changes; retained row ownership/eligibility/state guards and credential limits.
Patched Next.js/Vitest and compatible vulnerable dependencies. No schema change or creator migration.

Verification: 135 unit tests, 84 integrations, three browser scenarios/eight widths, repeated
10,000-request and 1,000-publication runs, formatting/lint/types, Prisma validation, build and
zero-advisory npm audit. [The report](regression-report-2026-10-25.md) records fixtures and limits;
mass signup, long-running production load and live providers are not verified by these tests.

### 2026-10-25 — YouTube publishing and dedicated provider regressions

Implemented Google channel connection, encrypted offline tokens, explicit video settings/consent
and resumable worker uploads with saved-session recovery and processing/visibility checks.
Added the user-applied YouTube platform enum migration, server environment examples and setup/
research guides. Extended load tests to TikTok/YouTube and browser tests to their connection,
video composer and consent flows. Fixed the new YouTube button's inherited TikTok label found
by the browser regression; corrected stale landing capability text. No creator database migrated.

Verification and repeatable local fixture measurements are recorded in
[the provider regression report](provider-regression-report-2026-10-25.md). Live authorization,
Cloudinary-to-Google transport, provider publishing and real project quotas still need user-run
checks. Uploads begin at the requested time; asynchronous processing can finish later.

### 2026-11-02 — safe Cloudinary upload diagnostics

Separated provider failures from missing/mismatched upload confirmations. The planner receives
safe HTTP-status guidance or allowlisted transport codes instead of one generic confirmation
error. Authenticated-media validation and one-use upload behavior remain enforced. No raw
provider messages, response values or credentials enter diagnostics. Added troubleshooting
for MP4 preparation versus outbound upload failures; the reported live cause remains unverified.

Verification: formatting, lint, strict types, all 177 unit tests and the production build passed
under Node 24. Fixtures cover HTTP status/transport redaction, all four confirmation mismatches,
missing results and stream errors. No live provider request, creator-database write, push or
deployment was performed.

### Future entries

For each completed update, append its date, changed behavior, affected setup/architecture,
and validation results. Update instructions above whenever commands or conventions change.
