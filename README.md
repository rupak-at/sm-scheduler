# Social Scheduler

An Instagram-first social media scheduler for creators and small teams.
See [idea.md](idea.md) for the product plan and [AGENTS.md](AGENTS.md) for development rules.

The repository currently provides a runnable foundation. Instagram connection,
authentication, media uploads, content management, and publishing are not implemented yet.

## Quick start

Use Node 24 LTS and npm. Docker Compose is required for the local infrastructure.

```sh
nvm use
npm ci
cp .env.example .env
npm run infra:up
npm run db:deploy
npm run dev
```

The web app runs at [localhost:3000](http://localhost:3000), the API at
[localhost:4000](http://localhost:4000), and the worker runs as a separate process.
On Linux, Docker requires Docker-group access or administrator access. If necessary,
run `sudo docker compose -f infra/docker-compose.yml up -d --wait` after reviewing the configuration.

The root `.env` configures API, worker, and Prisma CLI. Deployed services should receive
environment variables from their hosting platform. Shared package generation/builds do not
need database credentials. The starter web app has no backend URL or secrets to configure yet.

## Repository layout

| Path                  | Responsibility                                             |
| --------------------- | ---------------------------------------------------------- |
| `apps/web`            | Next.js planner, Tailwind CSS, feature components, local Roboto |
| `apps/api`            | Express HTTP API, middleware, feature modules              |
| `apps/worker`         | BullMQ infrastructure-check worker                         |
| `packages/shared`     | Browser-safe schemas, domain types, queue contracts        |
| `packages/config`     | Server-only configuration and logging                      |
| `packages/database`   | Prisma models, migrations, PostgreSQL client               |
| `packages/publishing` | Publishing contract and future provider adapters           |
| `infra`               | PostgreSQL and Redis development services                  |
| `docs`                | Architecture, design, implementation status                |

Workspace packages expose their compiled public APIs. Root commands build them in dependency
order. Development starts TypeScript package watchers alongside all applications.

## Development commands

```sh
npm run format          # Apply Prettier
npm run lint            # ESLint, including Next.js and React hooks rules
npm run typecheck       # Strict TypeScript across all workspaces
npm run test            # API, configuration, and worker failure-path tests
npm run check           # All development quality checks
npm run build           # Production builds for all packages and applications
npm run db:validate     # Validate Prisma schema
npm run db:migrate      # Create/apply a development migration
npm run db:deploy       # Apply existing migrations without creating new ones
npm run db:studio       # Inspect local database
npm run infra:logs      # Follow database/Redis logs
npm run infra:down      # Stop services, retaining volumes
```

For a named migration, use
`npm run migrate -w @social-scheduler/database -- --name your_change`.
Do not use development migration commands against production databases.

After `npm run build:packages`, you can run individual applications using
`npm run dev:web`, `npm run dev:api`, and `npm run dev:worker`, or production processes using
`npm run start -w @social-scheduler/web` (likewise `api` and `worker`).

## Verify the running foundation

```sh
curl http://localhost:4000/health/live
curl http://localhost:4000/health/ready
npm run queue:check
```

Liveness reports the API process. Readiness queries PostgreSQL and pings Redis, returning
503 if either dependency fails without exposing connection details.
The queued check verifies PostgreSQL from the worker process. Watch for
`Infrastructure check completed` in worker logs. This queue does not publish social posts.

## Development conventions

Keep files small and features modular. ESLint enforces 250 nonblank source lines per file
and 80 per function; generated code is excluded. Use strict TypeScript and validate external
input. Update the implementation status and commit each completed feature with its relevant
tests and documentation. CI runs schema validation, formatting, linting, types, tests, and builds.

The frontend uses Tailwind CSS with Prettier class sorting and the requested
frontend-design and web-design-guidelines skills; its design
plan is in [docs/frontend-design.md](docs/frontend-design.md).
Roboto is vendored with its license so `next/font/local` can optimize it without a network fetch.

## Next milestones

Prove a supported publish with an authorized Instagram test account and record eligibility,
permissions, formats, limits, and review requirements. Then select authentication, implement
social account connection, and add media/draft management before durable scheduling.

Production hosting, object storage, token encryption, and reconciliation choices remain open.
The frontend can run on Vercel; the API and worker require separate backend hosting.

See [docs/project-status.md](docs/project-status.md) and
[docs/architecture.md](docs/architecture.md) for details.
