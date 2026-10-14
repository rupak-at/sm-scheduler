# Architecture

## Runtime boundaries

Next.js renders the creator workspace. Express owns authenticated account/media/post operations. BullMQ runs in a separate always-on Node process from the same backend build. Frontend and backend consume `packages/shared` through its public exports. The backend owns
Prisma, server configuration, media handling, and Instagram/Facebook/TikTok code; these are ordinary internal modules.

Next.js serves a static public landing page at `/` without requiring the API or database.
The authenticated planner lives at `/planner`; content filters use `/planner?view=…`.
Login/signup redirects and navigation consistently target this protected route.

The worker consumes infrastructure checks and ID-only `instagram-publishing` jobs. A ten-second
PostgreSQL scan repairs missed delivery; an overlap-safe maintenance loop checks credentials.
The Instagram, Facebook and TikTok adapters use official endpoints; automated tests inject provider fixtures.

For folder ownership, request flows, and common edits, see [the codebase walkthrough](codebase.md).

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
PublishAttempt. Provider names are extensible with Instagram and Facebook Pages implemented; TikTok Direct Post now supports photos/videos behind approval gates.
Post content and account-specific publication outcomes are separate.

Timestamps use PostgreSQL `timestamptz`. Users and publications preserve a timezone.
Account credentials use account-bound AES-256-GCM with an independent key and stored key version. Attempts carry safe error codes, provider identifiers, and outcome history.

Foreign keys preserve references, but they do not enforce matching ownership across a post,
media asset, and social account. Post services enforce ownership transactionally; the worker rechecks it at execution.
Restrictive deletions protect publication history until retention/deletion policy is designed.

## Media storage and upload boundary

New JPEG/MP4 assets are stored as authenticated Cloudinary media. `MediaAsset.storageKey` keeps
an immutable `cloudinary:<public-id>.<format>` identifier; URLs are generated at access time.
Cloudinary's Node SDK uploads prepared bytes and signs expiring private downloads. API and worker
use the same server-only Cloudinary configuration; worker publishing requires no media disk mount.

The authenticated, origin-checked workspace endpoint reserves an upload record and issues a
ten-minute HMAC ticket. The browser sends file bytes directly to Express at `API_PUBLIC_URL`,
without cookies. Express checks origin and the scoped token, atomically claims the reservation,
checks declared MIME/size, and runs the existing photo/video preparation before Cloudinary upload.
Failed/interrupted reservations cannot be saved as ready media or replayed. Expired reservations
are marked failed when the owner requests another ticket. Database-save failures trigger remote cleanup.

Next.js retains same-origin auth/workspace proxies. Private media routes verify ownership and
redirect to a signed Cloudinary URL, so Cloudinary delivers the bytes. Legacy local records retain
existing file/signed-route reads until re-uploaded or explicitly migrated; new uploads do not fall
back to local storage. FFmpeg temporary files are removed after processing.

## Publishing and recovery

PostgreSQL is authoritative. Saving a schedule does not require Redis. The scanner delivers due
IDs, and processors lock/claim current rows with three-minute leases. Pending edits/cancellations
and ownership are checked before publishing. Container IDs and send markers are saved durably.
Stale claims resume container polling; once a send was marked, reconciliation never resends it.
Unconfirmed outcomes remain UNCERTAIN with safe attempt codes; explicit safe failures can retry.

The processor records published, processing, failed, or uncertain outcomes. Provider timeouts
after a remote side effect require reconciliation rather than blind retries. The worker uses
concrete Instagram/Facebook/TikTok clients, selected by the stored account provider; there is no unused generic provider interface.

## Tooling choices

- npm workspaces and one lockfile keep dependency installation consistent.
- Strict TypeScript uses NodeNext for backend packages and Next.js bundler resolution for web.
- Shared compilation and Prisma generation precede backend/frontend builds; production Node
  executes emitted ESM. API and worker share one backend compilation.
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

## Facebook publishing

Facebook connects managed Pages to an existing session through its own browser-bound OAuth
mode/cookie. User tokens are exchanged for Page tokens and discarded; Page tokens are encrypted
with a separate authenticated-data namespace. Granted/granular scopes, app/type/Page identity
and actual token/data-access expiry are validated before publishing. Null fixed expiry is valid
for Facebook only. Page ownership conflicts roll back all Pages in a connection transaction.

The shared deployed queue name remains unchanged. Instagram uses media containers; Facebook
uses captioned `/photos` and `/videos` sends under durable markers. Returned Facebook video
IDs persist before polling; ready and public status are both required for success. Lost responses
without IDs cannot be safely matched or resent. See [research](facebook-research.md).

## TikTok Direct Post

TikTok uses a distinct Login Kit connection mode, immutable open_id and encrypted token bundle.
Refresh rotations serialize under a SocialAccount row lock. Publication metadata contains
creator-selected privacy/interactions/disclosures and server-recorded consent. Current creator
info is checked on rendering, scheduling and sending; no privacy/interaction substitution.

Direct Post initialization runs after the durable marker, then publish_id is saved and polled.
Lost init responses cannot be blindly resent. Private success may lack a public post ID; inbox
delivery remains unconfirmed. The API serves signed publication/media-bound bytes from a verified
HTTPS domain, resolving protected Cloudinary redirects server-side under bounded allowlisted
fetching. Photos receive a 1080px rendition. Normalized video duration is stored in the new nullable
media column. TikTok review/audit and real testing remain gates; see [research](tiktok-research.md).
