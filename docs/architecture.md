# Architecture

## Runtime boundaries

Next.js renders the creator workspace. Express owns authenticated account/media/post operations. BullMQ runs in a separate always-on Node process. Applications consume shared
packages through public exports; database and runtime configuration are server-only.

Next.js serves a static public landing page at `/` without requiring the API or database.
The authenticated planner lives at `/planner`; content filters use `/planner?view=…`.
Login/signup redirects and navigation consistently target this protected route.

The worker consumes infrastructure checks and ID-only `instagram-publishing` jobs. A ten-second
PostgreSQL scan repairs missed delivery; an overlap-safe maintenance loop checks credentials.
The Instagram adapter uses official endpoints; automated tests inject provider fixtures.

## Authentication boundary

Express hosts Better Auth before JSON body parsing and stores accounts, hashed passwords,
and sessions in PostgreSQL. Next.js forwards same-origin auth requests and Set-Cookie headers
to the browser. Server-rendered pages verify sessions against the API and redirect guests
to login. `/api/me` independently enforces authentication.

State-changing authentication requests require the configured web origin. Sessions expire
after seven days, refresh daily, and are revoked on logout. Production requires HTTPS and secure
cookies. Rate-limit counters live in PostgreSQL; deployment-specific trusted client IP handling
still needs configuration when hosting is chosen. Verification and recovery email are not enabled.
See [Better Auth Express integration](https://better-auth.com/docs/integrations/express).

## Domain data

Prisma models User, SocialAccount, MediaAsset, Post, ordered PostMedia, Publication, and
PublishAttempt. Provider names are extensible while Phase 1 remains Instagram-only.
Post content and account-specific publication outcomes are separate.

Timestamps use PostgreSQL `timestamptz`. Users and publications preserve a timezone.
Account credentials use account-bound AES-256-GCM with an independent key and stored key version. Attempts carry safe error codes, provider identifiers, and outcome history.

Foreign keys preserve references, but they do not enforce matching ownership across a post,
media asset, and social account. Post services enforce ownership transactionally; the worker rechecks it at execution.
Restrictive deletions protect publication history until retention/deletion policy is designed.

## Publishing and recovery

PostgreSQL is authoritative. Saving a schedule does not require Redis. The scanner delivers due
IDs, and processors lock/claim current rows with three-minute leases. Pending edits/cancellations
and ownership are checked before publishing. Container IDs and send markers are saved durably.
Stale claims resume container polling; once a send was marked, reconciliation never resends it.
Unconfirmed outcomes remain UNCERTAIN with safe attempt codes; explicit safe failures can retry.

Adapters return published, processing, failed, or uncertain outcomes. Provider timeouts after a
remote side effect require reconciliation rather than blind retries. The contract will evolve
after real API feasibility testing; its shapes do not promise provider capabilities.

## Tooling choices

- npm workspaces and one lockfile keep dependency installation consistent.
- Strict TypeScript uses NodeNext for backend packages and Next.js bundler resolution for web.
- Shared package builds precede app builds; production Node executes emitted ESM.
- Prisma 7 uses the generated TypeScript client and PostgreSQL driver adapter.
  [Prisma client setup](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/introduction).
- ESLint runs independently from Next.js builds, using the official Next.js plugin plus React
  hooks rules. [Next.js installation](https://nextjs.org/docs/app/getting-started/installation).
- Prettier handles formatting; EditorConfig aligns editor defaults; CI verifies all checks.
- Worker Redis connections retry continuously; API connections fail promptly so readiness can
  report unavailable infrastructure. [BullMQ connections](https://docs.bullmq.io/guide/connections).

## Environment boundaries

The root `.env.example` contains public local development values only. Configuration validation
fails on missing or malformed server URLs without printing their values.
Production and staging use separate databases, Redis services, storage buckets, provider apps,
secrets, and allowed origins. Hosting injects secrets; no production fallback credentials exist.

PostgreSQL and Redis containers bind to loopback. Redis persists queue state and uses
`noeviction`; PostgreSQL remains the recovery authority. Shutdown hooks close HTTP requests,
workers, and database connections, with a bounded termination deadline.
