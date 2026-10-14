# Social Scheduler — development context

Read this file before making changes. Read `idea.md` for the full product plan and
`docs/project-status.md` for what is actually implemented.
Follow `docs/development.md` for setup and the development workflow.

## What we are building

A social media scheduler for solo creators and small teams. A creator signs in, connects
an eligible Instagram account, uploads supported media, writes a caption, schedules a
publication, and later sees its outcome after closing the browser.

The current implementation supports Instagram and managed Facebook Pages. TikTok remains a
future provider; its enum value is architectural preparation, not an implemented integration.
Use official APIs and authorization flows. Verify account eligibility, permissions,
formats, limits, and app-review requirements against official documentation before
promising support. A successful authorized test publish is required before claiming real provider feasibility; the user authorized implementation before their own live test.

## Current scope

This repository includes npm workspaces, a public landing page, a protected Next.js planner,
email/password and Instagram sign-in, Instagram account connection, encrypted tokens,
Facebook Page connection, photo/MP4 uploads, caption/hashtag editing and live previews, draft editing/deletion,
durable scheduling, and a BullMQ publishing/recovery worker.
The user verified real Instagram sign-in on 2026-10-12; the first real publishing test is pending.
Automated provider tests use fixtures.
Read `docs/instagram-setup.md` and `docs/facebook-setup.md` before changing the corresponding
integration or running a live test. Facebook authorization/photo/video publishing remain unverified.

Email verification and password-reset delivery require a mail provider and remain unimplemented.
Do not present empty scaffolding as a completed product feature.

## Architecture and module ownership

There are three npm workspaces. Read `docs/codebase.md` for a walkthrough and common edits.

- `backend`: Express API and BullMQ worker in one Node.js project, with separate process entry
  points (`src/server.ts` and `src/worker/main.ts`). Prisma schema and migrations live in
  `backend/prisma`; client creation and generated types live in `backend/src/database`.
- `backend/src/routes`: URL/middleware wiring. `controllers` validate HTTP input and return
  responses. `services` own business rules and transactions; `repositories` hold database
  queries when a separate query module makes the service easier to read.
- `backend/src/middleware`, `config`, `lib`: reusable request guards, server configuration,
  and focused helpers. `integrations/{instagram,facebook}` own OAuth, provider calls, and encrypted tokens;
  `integrations/cloudinary` owns protected remote media storage.
  `worker/publishing` owns claims, publishing, recovery, and attempt outcomes.
- `frontend`: Next.js App Router. `src/app` contains thin pages/layouts/proxies;
  `src/components/{auth,landing,planner}` holds UI, `src/hooks/{auth,planner}` holds client
  behavior, and `src/lib/{auth,planner}` holds API access and feature helpers.
  Reusable primitives stay in `src/components/ui`.
- `packages/shared`: browser-safe validation, domain types, caption helpers, and job contracts.
  This is the only shared package. Import it through `@social-scheduler/shared`.
- `infra`: local PostgreSQL/Redis services. `docs`: setup, architecture, and implementation status.

Use ordinary relative imports within the backend and `@/` imports within the frontend.
Keep dependencies explicit; reuse concrete helpers without adding generic base classes or
pass-through layers. Frontend code must never import backend code, Prisma, credentials, or Redis.
Use one root lockfile. The backend is built once; deploy API and worker as separate processes.
Web runs on Vercel; API and worker need separate backend hosting.

## Modular, readable code

Prefer files of 50–150 lines and one responsibility. ESLint enforces at most 250
nonblank, noncomment lines per authored JS/TS file and 80 per function. Split earlier
when responsibilities diverge. Keep authored CSS and schemas around 250 lines or less;
split CSS by feature and concern. Generated Prisma/Next.js files and migration SQL
are exempt from source-size limits and must not be edited manually.

For business modules, separate routes/controllers, request schemas, services, and
repositories when those responsibilities exist. Avoid empty boilerplate layers.
HTTP controllers validate input and translate responses; services own business rules;
repositories own persistence; provider adapters own remote calls and error mapping.
Use strict TypeScript, explicit types at public boundaries, and Zod at trust boundaries.
Explain nonobvious intent in comments. Avoid `any`, swallowed errors, speculative
abstractions, fake success responses, and unused dependencies.

## Domain and reliability rules

- A Post is creator content; each Publication targets one SocialAccount.
- Each target has independent status and PublishAttempt history.
- PostgreSQL is the source of truth. Redis is a delivery mechanism.
- Queue payloads contain IDs, never credentials, captions, or media bytes.
- Save scheduling state durably, then enqueue/reconcile. Design for missed and duplicate jobs.
- Atomically claim publications with leases/state guards before contacting a provider.
- Recheck state when jobs run, including edits, cancellations, and account eligibility.
- A timeout after a remote publish can mean `UNCERTAIN`; reconcile before retrying.
- Do not promise exactly-once delivery without provider guarantees.
- Store timestamps as UTC instants; preserve an IANA display timezone.
- Check ownership of posts, accounts, and media together in services; foreign keys alone
  do not enforce matching owners across these relations.
- Encrypt provider tokens at rest, retain key-version metadata, and never return them
  to the browser. Use TokenVault; raw credentials must not be saved in Better Auth Account fields.
- Never log raw tokens, credentials, authorization headers, provider response bodies, or
  sensitive personal data. Log safe event codes and identifiers.
- Add authenticated authorization, upload validation, rate limiting, secure sessions,
  OAuth state verification, and relevant CSRF protection before shipping those features.

## Frontend workflow and skills

The requested `frontend-design` and `web-design-guidelines` skills are installed in
`~/.codex/skills`. Read their SKILL.md files when working on frontend design/review.
Apply the former to design planning and the latter to review; fetch its current
guidelines when reviewing. See `docs/frontend-design.md` for this project's design plan.

Use **Tailwind CSS** for frontend styling and **Roboto**, locally hosted through
`next/font/local`. Keep its font license. Define shared design tokens in the root stylesheet
and use utility classes in feature components. Prettier sorts Tailwind classes.
Use shadcn/ui primitives from `frontend/src/components/ui`; add only needed components.
Use semantic elements, labels, visible focus, keyboard navigation, accessible empty and
error states, mobile layouts, and reduced-motion support when introducing motion.
Keep filter/navigation state in URLs. Do not render fake posts, connected accounts,
unsupported provider formats, or inert actions that look available.
Development assets use source-versioned URLs and no-store browser/CDN headers to prevent
stale code/styles through the HTTPS tunnel. Keep this policy development-only.

The public landing page is `/`; the authenticated workspace is `/planner`.
Successful login/signup returns to `/planner`. Keep the landing page independent of API availability.
Use the neutral visual system in `docs/frontend-design.md` throughout. For substantial UI changes,
review phone/tablet/laptop/desktop layouts at 320, 390, 768, 820, 1024, 1280, 1440, and 1920px.

## Instagram workflow

- Use Instagram Login for Business/Creator accounts, with profile/publishing scopes only.
- Validate and store grants returned by the code exchange. Do not assume requested scopes
  were granted or call a Facebook-style `/permissions` edge on Instagram Login accounts.
  Later checks use professional identity and the read-only `content_publishing_limit` endpoint.
- OAuth attempts are browser-bound, expire after ten minutes, and are consumed atomically.
- Instagram sign-in uses immutable provider identity, never email matching. The internal
  `instagram.users.invalid` email is an unverified compatibility identifier, not a mailbox.
  Block email signup on this reserved domain; do not expose it as a verified contact address.
- Tokens use AES-256-GCM, independent 32-byte key, account-bound authenticated data, and key version.
- Refresh only unexpired long-lived tokens at least 24 hours old; expiry comes from provider responses.
- Accept still JPEG/PNG/WebP/AVIF photos up to 8 MB; decode/validate/auto-orient and convert
  to JPEG. Pad unsupported photo aspect ratios to preserve the full image.
- Accept H.264/H.265 MP4 Reels up to 64 MB, 3 seconds–15 minutes. API requires FFmpeg/FFprobe
  on PATH and normalizes to H.264/AAC with bounded concurrency, time, and output size.
  Ownership and matching media type/MIME are checked when saving and publishing.
- Persist container ID and publish-request marker before sending. Uncertain sends must never be blindly retried.
- New uploads use Cloudinary authenticated assets; server-only credentials and expiring download
  URLs protect media. The browser obtains a ten-minute one-use upload ticket through the frontend
  proxy, then sends bytes directly to Express at `API_PUBLIC_URL` with no session cookie.
  Preserve origin checks, declared type/size checks, atomic claims, and server photo/video validation.
- `.data/media` is a read path for pre-Cloudinary uploads only. Do not silently fall back to local
  storage for new uploads. Temporary FFmpeg files are bounded and removed after processing.
  Read `docs/cloudinary-setup.md` for credentials and the VPS/Vercel upload boundary.
- The user is applying their database migrations. Create/test migrations against isolated services,
  but do not migrate the configured creator database without a new instruction.

## Facebook workflow

- Managed Pages only, using Facebook Login to connect an existing authenticated workspace.
  Facebook application sign-in, personal profiles, Groups and dedicated Reels are unsupported.
- Request `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`; validate actual
  app/type/Page/granular grants with `debug_token` and Page identity. Discover authorized Pages
  with `/me/accounts`, require `CREATE_CONTENT`, and connect all allowed eligible Pages atomically.
- Facebook Login for Business configurations must issue User Access Tokens; system-user flows
  are unsupported. User tokens are exchanged for Page tokens and are never persisted.
- OAuth uses its own signed cookie and `facebook-connect` mode, bound to the same user/session.
  TokenVault uses the `facebook:1:<page-id>` authenticated-data namespace; keep Instagram's namespace.
- Store the earliest nonzero token/data-access expiry; a null Facebook expiry is legitimate.
  Revalidate before publishing and periodically; reconnect revoked/expired Pages instead of
  calling Instagram token refresh. Tokens remain encrypted and server-only.
- Publish prepared photos with captions through `/photos`; publish prepared MP4s with captions
  through `/videos` using `file_url`, `description`, and `published=true`. Persist video IDs,
  then poll `id,status,published`; only ready, public videos become published locally.
- Save the send marker before sending, with lease/ownership/connection/ciphertext guards.
  Lost responses without known IDs remain uncertain and cannot be blindly retried. Known
  video IDs resume read-only polling; definite write rejections permit deliberate retries.
- Keep the existing `instagram-publishing` queue name to preserve pending jobs. Dispatch by
  stored provider, and allow API/worker operation when either or both providers are configured.
- No schema migration is needed for Facebook. See `docs/facebook-research.md` for the source
  review and `docs/facebook-setup.md` for credentials, App Review gates and user-run live tests.

## Development flow

1. Read the relevant product context, existing module, and package public interfaces.
2. Implement one focused feature or fix, keeping apps/modules independently understandable.
3. Add meaningful tests for business rules, failure paths, authorization, migrations,
   and worker behavior when those change. Do not test trivial markup just to increase counts.
4. **On every completed feature or fix, update `docs/development.md` and
   `docs/project-status.md`.** Keep guide instructions current and append a concise update-log
   entry with changed behavior and verification. Update README for changed setup or capabilities.
   Update this file when enduring architecture, commands, or conventions change.
5. Run `npm run format`, then `npm run check`. Run `npm run build` for application,
   dependency, configuration, or public-contract changes. For schema changes run
   `npm run db:validate`, create/review a migration, and verify it against a test database.
6. Inspect `git diff`, `git diff --check`, and `git status --short`.
7. **For every completed feature or fix, stage its relevant files and commit them.**
   The user explicitly requires commits. Use focused Conventional Commit messages,
   such as `feat(posts): add draft validation` or `fix(worker): guard duplicate jobs`.
   Stage explicit paths, include related tests/docs and lockfile changes, and preserve
   unrelated user changes. Never commit secrets, .env files, build output, or generated clients.
   Husky runs lint-staged before commits: format supported staged files and lint staged JS/TS.
   Do not bypass hooks. Format all relevant files and run lint before staging as well.
8. Report what changed, which checks passed, any actual limitation, and the commit hash.

Do not push, deploy, or contact third parties without user authorization.
Never skip a required check silently or claim unrun checks passed.

## Commands

Use Node 24 LTS (`.nvmrc`) and npm. From the repository root:

- `npm ci`: install the lockfile.
- `npm run setup:env`: create local environment files and a random untracked auth secret.
- `npm run infra:up`: start local PostgreSQL and Redis.
- `npm run db:generate`: generate the client without a running database.
- `npm run db:check`: check database connectivity and committed migration history without writes.
- `npm run db:migrate -- --name feature_name`: create/apply a development migration.
- `npm run db:deploy`: apply committed migrations in CI/staging/production.
- `npm run dev`: generate Prisma, build shared, then watch shared, frontend, API, and worker.
- `npm run queue:check`: enqueue an infrastructure check; inspect worker completion logs.
- `npm run check`: formatting, linting, type checking, and tests.
- `npm run test:integration`: authentication integration checks against isolated services.
  Set `TEST_DATABASE_URL` and `TEST_REDIS_URL`; migrate that test database first. Tests reset throttling counters and remove their fixtures, so never use a creator database.
- `npm run build`: compile packages, API, worker, and Next.js.
- `npm run infra:down`: stop services while retaining local volumes.

Only `packages/shared` uses an emitted package API. Run `npm run build:packages` (Prisma generation
and shared compilation) before launching an individual app, `npm run test:watch`, or Vitest.
`npm run dev` performs this preparation and watches shared, frontend, API, and worker.
Use `npm run dev:frontend` or `npm run dev:backend` for one side; backend runs both processes.
Production uses `npm run start -w @social-scheduler/backend` for the API and
`npm run start:worker -w @social-scheduler/backend` for publishing.
