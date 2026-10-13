# Working on the codebase

There are three projects: `frontend`, `backend`, and `packages/shared`. Install dependencies
from the repository root. `npm run dev` prepares shared code and Prisma, then starts the
frontend, API, and worker with file watching. See [development.md](development.md) for setup.

## Follow a request

For example, saving a post follows this path:

1. [Post editor](../frontend/src/components/planner/post-editor.tsx) renders the form.
2. [Editor hook](../frontend/src/hooks/planner/use-post-editor.ts) manages form state and submits
   through [the workspace client](../frontend/src/lib/planner/workspace-client.ts).
3. [Next.js proxy](../frontend/src/app/api/workspace/[[...path]]/route.ts) forwards the request
   and cookies to Express. The browser uses the same `/api/workspace` URLs as before.
4. [Express app](../backend/src/app.ts) mounts [workspace routes](../backend/src/routes/workspace.routes.ts).
   Authentication, origin checks, and throttling run before the protected routes.
5. [Post routes](../backend/src/routes/posts.routes.ts) select a
   [controller](../backend/src/controllers/posts.controller.ts). Controllers parse input and
   send HTTP responses. Express forwards rejected async handlers to the error middleware.
6. [PostsService](../backend/src/services/posts.service.ts) checks ownership, revisions, and
   scheduling rules inside database transactions, then saves through Prisma.
7. [Post mapping](../backend/src/repositories/post-view.ts) returns the browser-safe response.

Start at the route when investigating an endpoint. Follow explicit imports to its controller
and service. There is no dependency container or generic base controller to learn.

## Scheduling continues after the request

Saving a schedule writes PostgreSQL. The worker is a separate process started by
[worker/main.ts](../backend/src/worker/main.ts), inside the same backend project.

| File in `backend/src/worker/publishing` | Responsibility                                                         |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `runtime.ts`                            | Connect the queue, processor, periodic scan, and token maintenance     |
| `reconcile.ts`                          | Find due/interrupted publications and enqueue their IDs                |
| `claim.ts`                              | Lock a publication and claim it with an expiring lease                 |
| `processor.ts`                          | Validate the current record, prepare/publish, and handle outcomes      |
| `container.ts`                          | Create or reuse the persisted Instagram media container                |
| `outcomes.ts`                           | Persist success, failure, uncertainty, or a delayed check              |
| `poller.ts`                             | Run periodic tasks without overlapping; finish active work on shutdown |

The worker and API reuse the same database client, environment validation, media storage,
Instagram client, and token handling. They use separate processes so publishing can continue
independently of HTTP requests. Queue jobs contain IDs; the current record is read from PostgreSQL.
Keep the durable send marker and lease guards: a timeout can mean Instagram already published.

## Where to make common changes

| Change                                                | Start here                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| Add/change an endpoint                                | `backend/src/routes`, then the matching `controllers` and `services` file |
| Change post rules                                     | `backend/src/services/posts.service.ts`                                   |
| Change workspace list/count queries                   | `backend/src/repositories/workspace.repository.ts`                        |
| Change upload processing                              | `backend/src/services/media.service.ts`, `backend/src/lib/media`          |
| Change Instagram calls/OAuth                          | `backend/src/integrations/instagram`                                      |
| Change publishing/recovery                            | `backend/src/worker/publishing`                                           |
| Change a database model                               | `backend/prisma/*.prisma`, then create and test a migration               |
| Add an environment variable                           | `backend/src/config/environment.ts`, `.env.example`                       |
| Change a page                                         | `frontend/src/app/<route>/page.tsx`                                       |
| Change UI markup                                      | `frontend/src/components/<feature>`                                       |
| Change form behavior                                  | `frontend/src/hooks/<feature>`                                            |
| Change browser/server API access                      | `frontend/src/lib/<feature>`                                              |
| Change input or response contracts used by both sides | `packages/shared/src`                                                     |

The frontend follows ordinary Next.js conventions. `app` handles routes/layouts;
`components` renders UI; `hooks` manages interactive state; `lib` contains API calls and helpers.
Each group uses `auth`, `landing`, or `planner` subfolders when relevant. Shared UI primitives
stay in `components/ui`. Keep server session helpers out of client components.

## Reuse without adding layers

Extract a helper when two callers need the same behavior or a block has a clear responsibility.
For example, API and worker both call `createInstagramServices`; image and video routes share
media response/range handling. Keep helpers named for what they do.

A controller should not contain a Prisma transaction or provider call. A service owns the
business operation and can call Prisma directly when that keeps its transaction readable.
Use a repository for a substantial query or related persistence operations; avoid creating a
one-line repository wrapper around every Prisma method. Keep request validation at the HTTP
boundary and shared contracts in `packages/shared`. Backend internals use relative imports;
frontend imports use `@/`. Tests stay beside the code they exercise; integration tests live
in `tests/integration` and use isolated PostgreSQL/Redis plus provider fixtures.

## Run and verify

```sh
npm run dev                     # Frontend + API + worker + shared watcher
npm run build:packages          # Prepare shared code/Prisma for individual commands
npm run dev:frontend            # Next.js only
npm run dev:backend             # Both backend processes
npm run dev:api                 # HTTP API only
npm run dev:worker              # Worker only
npm run format
npm run check                   # Formatting, lint, strict types, unit tests
npm run build                   # Shared + backend + Next.js production build
```

`npm run test:integration` requires `TEST_DATABASE_URL` and `TEST_REDIS_URL` pointing to isolated
services with the committed migrations applied. Never use the creator database for these tests.
No database migration is required solely for this folder reorganization. The existing migration
history is now under `backend/prisma/migrations`. Prisma generation writes ignored code under
`backend/src/database/generated`; do not edit or commit it.
