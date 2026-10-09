# Social Scheduler

An Instagram-first social media scheduler for creators and small teams.
Read [AGENTS.md](AGENTS.md) for product context, module boundaries, and development rules.
Follow [the development guide](docs/development.md) for setup, feature work, migrations, testing,
and commits. The guide and implementation status must be updated with every completed change.
The original `idea.md` is a local planning document excluded by the workspace's gitignore.

The project includes email/password signup, login, logout, and a protected planner.
Instagram connection, uploads, drafts, scheduling, and actual publishing remain future work.

## Quick start

Use Node 24 LTS and npm. Docker Compose provides the local infrastructure.

```sh
nvm use
npm ci
npm run setup:env
npm run infra:up
npm run db:deploy
npm run dev
```

Open [localhost:3000](http://localhost:3000) and create an account.
The API runs at [localhost:4000](http://localhost:4000); the worker is a separate process.

On Linux, Docker requires Docker-group or administrator access. If needed, use
`sudo docker compose -f infra/docker-compose.yml up -d --wait`.

Setup preserves existing environment values and generates an untracked random auth secret.
The root `.env` configures API, worker, and Prisma. The web workspace's `.env.local` contains
the server-only `API_BASE_URL`. Browser auth requests go through a same-origin Next.js proxy.
Production uses hosting-injected secrets and an HTTPS `WEB_ORIGIN`.

## Workspace layout

| Path                  | Responsibility                                            |
| --------------------- | --------------------------------------------------------- |
| `apps/web`            | Next.js App Router, Tailwind CSS, shadcn/ui, local Roboto |
| `apps/api`            | Express health/auth endpoints and feature modules         |
| `apps/worker`         | BullMQ infrastructure-check worker                        |
| `packages/shared`     | Browser-safe validation and domain/job contracts          |
| `packages/config`     | Server-only configuration and logging                     |
| `packages/database`   | Prisma models, migrations, PostgreSQL client              |
| `packages/publishing` | Platform-neutral publishing contracts                     |
| `infra`               | Persistent local PostgreSQL and Redis                     |
| `docs`                | Architecture, design, and implementation status           |

Packages expose their emitted public APIs. Root commands build them in dependency order.
Development watches shared packages and all three applications.

## Development commands

```sh
npm run format
npm run lint
npm run typecheck
npm run test
npm run check
npm run build
npm run db:validate
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
See [the design plan](docs/frontend-design.md). Roboto is vendored with its font license
and loaded with `next/font/local`; font downloads are not required during builds.

## Runtime and integration checks

```sh
curl http://localhost:4000/health/live
curl http://localhost:4000/health/ready
npm run queue:check
```

Readiness returns 503 if PostgreSQL or Redis is unavailable. The queued check verifies database
access from the worker; it does not publish social posts.

Authentication integration tests require **isolated test services**, not a creator's database.
Set `TEST_DATABASE_URL` and `TEST_REDIS_URL`, apply migrations to that test database
by setting `DATABASE_URL` to it, then run `npm run test:integration`.
CI provisions isolated PostgreSQL/Redis and runs these checks automatically.

## Authentication and remaining work

Better Auth handles password hashing and PostgreSQL-backed sessions.
Cookies are HTTP-only, become secure in production, and are forwarded by the Next.js proxy.
The planner checks sessions on the server, and `GET /api/me` rejects unauthenticated requests.
Authentication writes enforce the configured origin. Database-backed throttling protects
signup/login; production proxy configuration must establish trustworthy per-client IP information.

Email verification, password-reset delivery, and social sign-in require further integration.
Application login is separate from connecting an Instagram account.

Prove an authorized Instagram publish before choosing supported media formats and building the
connection/upload/scheduling flows. Hosting, object storage, token encryption, and recovery
decisions remain open. Web can run on Vercel; API and worker need separate backend hosting.

See [implementation status](docs/project-status.md) and [architecture](docs/architecture.md).
