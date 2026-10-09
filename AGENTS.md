# Social Scheduler — development context

Read this file before making changes. Read `idea.md` for the full product plan and
`docs/project-status.md` for what is actually implemented.
Follow `docs/development.md` for setup and the development workflow.

## What we are building

A social media scheduler for solo creators and small teams. A creator signs in, connects
an eligible Instagram account, uploads supported media, writes a caption, schedules a
publication, and later sees its outcome after closing the browser.

Phase 1 supports Instagram only. Facebook and TikTok are future providers. Their enum
values and shared contracts are architectural preparation, not implemented integrations.
Use official APIs and authorization flows. Verify account eligibility, permissions,
formats, limits, and app-review requirements against official documentation before
promising support. A successful authorized test publish is still a prerequisite.

## Current scope

This repository includes npm workspaces, a protected Next.js planner, email/password
authentication through Better Auth, an Express health API, an infrastructure-check worker,
shared contracts, Prisma models/migrations, and local PostgreSQL/Redis configuration.

Instagram OAuth, uploads, draft CRUD, scheduling, actual publishing, and recovery are future work.
Email verification and password-reset delivery require a mail provider and remain unimplemented.
Do not present empty scaffolding as a completed product feature.

## Architecture and module ownership

- `apps/web`: Next.js App Router frontend. Group components, styles, and view logic by
  feature under `src/features`. Keep pages and layouts thin.
- `apps/api`: Express HTTP interface. `app.ts` assembles middleware/routes;
  `server.ts` starts the process. Group business features under `src/modules`.
- `apps/worker`: always-on BullMQ process, deployed separately from web/API. Currently
  consumes `system-checks` only. Add publishing only after durable job handling exists.
- `packages/shared`: browser-safe validation schemas, domain types, and job contracts.
- `packages/config`: server-only environment loading, validation, logging, Redis options.
- `packages/database`: Prisma schema, migrations, generated client, connection factory.
- `packages/publishing`: platform-neutral publisher contracts; future provider adapters.
- `infra`: local service configuration. Development credentials are never production credentials.
- `docs`: architecture, setup decisions, feasibility results, and implementation status.

Import workspace packages through their public exports. Do not import another
application's internals or another package's source files. Never import database,
credentials, Redis, or server configuration into the frontend. Use a single root lockfile.
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
  to the browser. The ciphertext field is a storage boundary, not an encryption implementation.
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
Use shadcn/ui primitives from `apps/web/src/components/ui`; add only needed components.
Use semantic elements, labels, visible focus, keyboard navigation, accessible empty and
error states, mobile layouts, and reduced-motion support when introducing motion.
Keep filter/navigation state in URLs. Do not render fake posts, connected accounts,
unsupported provider formats, or inert actions that look available.

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
- `npm run dev`: build shared packages, then watch packages and all three applications.
- `npm run queue:check`: enqueue an infrastructure check; inspect worker completion logs.
- `npm run check`: formatting, linting, type checking, and tests.
- `npm run test:integration`: authentication integration checks against isolated services.
  Set `TEST_DATABASE_URL` and `TEST_REDIS_URL`; migrate that test database first.
- `npm run build`: compile packages, API, worker, and Next.js.
- `npm run infra:down`: stop services while retaining local volumes.

Application imports use emitted package APIs. Run `npm run build:packages` before launching
an individual app, `npm run test:watch`, or directly invoking Vitest.
