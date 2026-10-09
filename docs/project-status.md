# Implementation status

## Completed

- npm workspaces for web, API, worker, shared contracts, configuration, database, and publishing.
- Strict TypeScript, package exports, and dependency-ordered builds.
- ESLint, Prettier with Tailwind class sorting, EditorConfig, and source-size limits.
- Husky/lint-staged pre-commit formatting and linting.
- CI with migrations, formatting, linting, types, unit/integration tests, and production builds.
- Environment validation, random local secret setup, and safe event logging.
- Next.js App Router frontend using Tailwind CSS, shadcn/ui, and local Roboto.
- Better Auth email/password signup, login, logout, and PostgreSQL-backed sessions.
- Protected planner, URL-based status filters, and honest empty states.
- Same-origin auth proxy with cookie forwarding and server-side session checks.
- Protected account endpoint, strict auth write origins, and database-backed auth throttling.
- Express liveness/readiness routes and separate BullMQ infrastructure-check worker.
- Prisma domain/authentication models and two reviewed SQL migrations.
- Docker Compose with persistent local PostgreSQL and Redis.
- Requested frontend-design and web-design-guidelines skills installed and applied.
- Living development guide with a required update log for every completed feature or fix.
- Read-only `db:check` command for PostgreSQL connectivity, migration history, and IPv6-only DNS guidance.

## Not implemented

Instagram feasibility/OAuth, encrypted provider credentials, media uploads/storage, draft CRUD,
scheduling, real publishing, reconciliation, publishing retries, and production deployments.
Email verification and password-reset delivery need a mail provider; social sign-in is not enabled.

Future provider enums do not enable Facebook or TikTok. Supported Instagram formats are unverified.
Production proxy trust and per-client IP handling depend on the chosen hosting topology.
Authentication currently applies conservative shared buckets when no trusted client IP is available.

## Verification

- Full formatting, linting, strict type checks, and 12 unit tests pass.
- Prisma schema validation and full package/API/worker/Next.js production builds pass.
- Both migrations applied successfully to an isolated PostgreSQL database.
- Three real authentication integration tests pass: hostile origin rejection, password hashing,
  session persistence/revocation, invalid credentials, and session expiration.
- Browser-proxy runtime checks pass: signup, login, forwarded cookies, protected planner,
  status filters, logout, and throttling.
- Redis-delivered infrastructure checks complete in the separate worker.
- Desktop (1440px) and mobile (390px) login screenshots reviewed.

Docker Compose configuration validates. Starting Docker on this machine requires a sudo password;
temporary user-owned PostgreSQL/Redis instances are used for isolated runtime checks.

The signup failure investigation identified `ENETUNREACH` with an IPv6-only Supabase direct
hostname. A subsequent read-only check after local configuration changed reached PostgreSQL
and reported pending migrations. The user is handling database configuration and migrations.
Use `npm run db:check` to verify the latest state; signup requires a reachable, migrated database.

## Dependency maintenance

Production dependency auditing reports zero vulnerabilities.
The full audit reports four high-severity entries in the Next.js ESLint plugin's
fast-glob/micromatch/braces development dependency chain. The registry currently offers no
compatible patched braces release; do not force-downgrade the Next.js lint plugin.

Overrides pin patched MySQL tooling and deepmerge-ts releases. Prisma generation, schema validation,
migration deployment, and application builds must continue to pass when updating these overrides.
