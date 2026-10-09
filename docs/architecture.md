# Architecture

## Runtime boundaries

Next.js renders the creator workspace. Express owns authenticated HTTP operations once
implemented. BullMQ runs in a separate always-on Node process. Applications consume shared
packages through public exports; database and runtime configuration are server-only.

The initial worker processes `system-checks` to exercise Redis delivery and PostgreSQL
connectivity. It does not register a publishing processor. The publisher contract deliberately
has no fake provider implementation.

## Data foundation

Prisma models User, SocialAccount, MediaAsset, Post, ordered PostMedia, Publication, and
PublishAttempt. Provider names are extensible while Phase 1 remains Instagram-only.
Post content and account-specific publication outcomes are separate.

Timestamps use PostgreSQL `timestamptz`. Users and publications preserve a timezone.
Account credentials have a ciphertext storage field; encryption and key management still
need implementation. Attempts carry safe error codes, provider identifiers, and outcome history.

Foreign keys preserve references, but they do not enforce matching ownership across a post,
media asset, and social account. Future services must enforce ownership atomically.
Restrictive deletions protect publication history until retention/deletion policy is designed.

## Publishing behavior to implement

PostgreSQL is authoritative. Persist scheduling intent before job delivery, reconcile missed
jobs, and claim publications atomically with state/lease guards. Fetch current state for every
job. Duplicate deliveries, cancellation, rescheduling, rate limits, and expired credentials need
explicit handling.

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
