# Social Scheduler

An Instagram and Facebook Page scheduler for creators and small teams.
Read [AGENTS.md](AGENTS.md) for product context, module boundaries, and development rules.
Follow [the development guide](docs/development.md) for setup, feature work, migrations, testing,
and commits. The guide and implementation status must be updated with every completed change.
The original `idea.md` is a local planning document excluded by the workspace's gitignore.

The project includes email/password and Instagram sign-in, Instagram and Facebook Page connection, photo/MP4 uploads,
caption and hashtag fields, live previews, drafts, scheduling, Cloudinary media storage, and a separate publishing worker.
The user verified real Instagram sign-in;
the first real publish is pending. Follow [Instagram setup](docs/instagram-setup.md) and [Facebook setup](docs/facebook-setup.md)
to configure accounts and test publishing. Facebook supports photos and Page videos with captions;
its live authorization/publishing test is pending.

## Quick start

Use Node 24 LTS and npm. Docker Compose provides the local infrastructure.
Install FFmpeg and FFprobe on the API host's PATH, with the `libx264` and AAC encoders,
for MP4 processing. For example, Debian/Ubuntu packages both tools in `ffmpeg`.

```sh
nvm use
npm ci
npm run setup:env
# Add Cloudinary and provider credentials to the root .env; see the setup guides.
npm run infra:up
npm run db:deploy
npm run dev
```

Open [localhost:3000](http://localhost:3000) and create an account.
The public landing page is `/`; login/signup opens the protected workspace at `/planner`.
The API runs at [localhost:4000](http://localhost:4000); the worker is a separate process.

The planner brings status tabs with workspace-wide counts, your next three scheduled posts,
Instagram connection health, and a compact media list together beneath a single top bar.
App scrollbars are thin throughout. New post and Edit post open immediately in a
URL-linked composer panel, with mobile layouts and fixed save/schedule controls. See the
[planner research and design](docs/planner-research.md) for the decisions behind the interface.
Development responses prevent browser/CDN storage and version asset URLs so the HTTPS test
tunnel cannot mix cached UI code/styles with a newer page. Production keeps Next.js caching.

In **New post**, drop or choose one photo or MP4, write a caption and hashtags, and review
the live photo/playable-video preview before saving or scheduling. Still JPEG, PNG, WebP,
and AVIF photos up to 8 MB become JPEGs. H.264/H.265 MP4s up to 64 MB, 3 seconds–15 minutes,
are prepared as Reels. Caption plus hashtags may contain at most 2,200 characters.
HEIC, animated images, carousels, and Stories are not supported.

On Linux, Docker requires Docker-group or administrator access. If needed, use
`sudo docker compose -f infra/docker-compose.yml up -d --wait`.

Setup preserves existing environment values and generates independent untracked auth and token encryption secrets.
The root `.env` configures API, worker, and Prisma. The web workspace's `.env.local` contains
the server-only `API_BASE_URL`. Browser auth requests go through a same-origin Next.js proxy.
Production uses hosting-injected secrets and an HTTPS `WEB_ORIGIN`.

## Workspace layout

```text
backend/
  prisma/                 # Schema and migrations
  src/
    app.ts                # Assemble Express middleware and routes
    server.ts             # Start the HTTP API
    routes/               # URLs and middleware
    controllers/          # Validate requests and send responses
    services/             # Business rules and transactions
    repositories/         # Database queries and response mapping
    middleware/           # Authentication, origin checks, errors
    config/               # Environment, logging, Redis, resource setup
    database/             # Prisma client and generated types
    integrations/instagram/ # OAuth, Instagram client, encrypted tokens
    integrations/cloudinary/ # Authenticated media uploads and signed downloads
    lib/media/            # Image/video processing and signed storage
    worker/               # Queue startup, publishing, recovery
frontend/
  src/
    app/                  # Next.js pages, layouts, API proxies
    components/           # auth, landing, planner, and reusable ui
    hooks/                # auth and planner client behavior
    lib/                  # API clients, server helpers, utilities
packages/shared/          # Validation and types used by both sides
```

Start with [the codebase walkthrough](docs/codebase.md) for request flows, common edits, and
where to put new code. There are three workspaces and one lockfile. The backend compiles once;
its API and worker run separately. Only browser-safe shared code needs a package build/watch.

```sh
npm run dev               # Everything, including shared compilation and Prisma generation
npm run dev:frontend      # Frontend only, after npm run build:packages
npm run dev:backend       # API + worker, after npm run build:packages
```

After this directory change, stop old development processes, run `npm install`, and restart
with `npm run dev`. Existing local media stays in `.data/media`; the root `.env` stays in place.
The frontend environment file is now `frontend/.env.local`. Hosting root becomes `frontend`.
Production backend commands are `npm run start -w @social-scheduler/backend` and
`npm run start:worker -w @social-scheduler/backend`, after `npm run build:backend`.

## Development commands

```sh
npm run format
npm run lint
npm run typecheck
npm run test
npm run check
npm run build
npm run db:validate
npm run db:check
npm run db:migrate -- --name your_change
npm run db:deploy
npm run db:studio
npm run infra:logs
npm run infra:down
```

Husky runs lint-staged before commits, formatting supported staged files and linting staged JS/TS.
Full checks run separately and in CI. Commit each completed feature with its relevant tests/docs.
ESLint limits authored source files to 250 nonblank lines and functions to 80.

The frontend uses the requested frontend-design and web-design-guidelines skills.
Landing, login/signup, and planner share a neutral theme and local Roboto typography.
See [the design plan](docs/frontend-design.md). Roboto is vendored with its font license
and loaded with `next/font/local`; font downloads are not required during builds.

For HTTPS development tunnels, allow the exact hostname in web `allowedDevOrigins` and
restart Next.js. The current private test hostname is `no.rupakbasnet.com.np`.
See [Instagram setup](docs/instagram-setup.md) for OAuth redirects and token configuration.

## Runtime and integration checks

```sh
curl http://localhost:4000/health/live
curl http://localhost:4000/health/ready
npm run queue:check
```

Readiness returns 503 if PostgreSQL or Redis is unavailable. The queued check verifies database
access from the worker; it does not publish social posts.

Authentication, workspace, and publishing integration tests require **isolated test services**, not a creator's database.
Set `TEST_DATABASE_URL` and `TEST_REDIS_URL`, apply migrations to that test database
by setting `DATABASE_URL` to it, then run `npm run test:integration`.
Tests reset rate limits and clean up fixtures; never point them at a creator database.
CI provisions isolated PostgreSQL/Redis and runs these checks automatically.

## Authentication and remaining work

Better Auth handles password hashing and PostgreSQL-backed sessions.
Cookies are HTTP-only, become secure in production, and are forwarded by the Next.js proxy.
The planner checks sessions on the server, and `GET /api/me` rejects unauthenticated requests.
Authentication writes enforce the configured origin. Database-backed throttling protects
signup/login; production proxy configuration must establish trustworthy per-client IP information.

Instagram Login connects professional accounts and can authenticate the workspace. Tokens remain
encrypted on the backend; the browser receives ordinary application session cookies.
Email verification and password-reset delivery still require a mail provider.

Real publishing tests, production deployment/storage, additional media formats, and account/provider
lifecycle callbacks remain. Cloudinary stores new media; existing local assets retain their legacy read path.
Next.js can run on Vercel; API and worker need separate always-on backend hosting.
Media uploads obtain a small authorization ticket through Next.js, then send bytes directly to
Express at `API_PUBLIC_URL`. The backend validates/prepares the file and uploads it to Cloudinary.
Private previews redirect to expiring Cloudinary downloads; the worker passes a freshly signed
Cloudinary URL to Instagram. The API needs temporary space for video processing, but new uploads
need no persistent media volume. Old local uploads remain readable from their original directory.
See [Cloudinary setup](docs/cloudinary-setup.md) for server-only credentials, domains, limits,
and the first live test. The VPS/proxy must accept uploads up to 64 MB and the processing timeout.

See [implementation status](docs/project-status.md) and [architecture](docs/architecture.md).
