# Cloudinary media setup

New uploads are prepared by Express and stored in Cloudinary. The VPS handles requests and
FFmpeg processing; it does not retain new media files. Existing local uploads remain readable
from their original directory until re-uploaded or explicitly migrated. No database migration
is required: `MediaAsset.storageKey` records the remote public ID.

## Configure API and worker

Create/select a Cloudinary product environment and obtain its cloud name, API key, and API
secret from the Cloudinary console. Add these to the backend's root `.env` locally, or the
hosting environment for both the API and worker:

```dotenv
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=social-scheduler-staging
```

Use a separate product environment/folder for staging. Keep the same cloud environment and
credentials in API and worker. Existing Cloudinary public IDs survive changes to the folder
setting, but changing cloud environments does not move media. Never put the API secret or SDK configuration in
`NEXT_PUBLIC_*` variables or commit them. All three credential values must be configured together.
Login and browsing can start without Cloudinary, but new uploads fail with a clear setup error.

The implementation uses the official SDK's `v2` API, `upload_stream`, authenticated assets,
and `private_download_url`. Credentials are passed explicitly to SDK calls without mutating
global SDK configuration. No unsigned upload preset is needed. Images and videos retain their
validated JPEG/H.264/AAC formats, original ownership checks, and current 8 MB/64 MB input limits.
Account-specific Cloudinary limits also apply; check the selected account's video upload limit.

Official references: [Node.js integration](https://cloudinary.com/documentation/node_integration),
[Node uploads](https://cloudinary.com/documentation/node_image_and_video_upload), and
[protected media access](https://cloudinary.com/documentation/control_access_to_media).
Cloudinary documents that private download URLs are uncached and cost twice the delivery bandwidth;
account for this when choosing a plan or later optimizing delivery.

## VPS and Vercel origins

Example staging domains:

```dotenv
# Vercel: server-only environment variable
API_BASE_URL=https://api.example.com

# API
NODE_ENV=production
WEB_ORIGIN=https://app.example.com
API_PUBLIC_URL=https://api.example.com
INSTAGRAM_REDIRECT_URI=https://app.example.com/api/auth/instagram/callback
```

`API_PUBLIC_URL` must be a browser-reachable HTTP(S) origin without a path or credentials,
and must use HTTPS in production. Local development defaults to `http://localhost:4000`.
For HTTPS tunnel testing, expose the API over HTTPS too and set its public origin here; an HTTPS
page cannot upload to an HTTP API. Configure API/proxy body limits for 64 MB and request timeouts
for preparation/upload. The API still needs FFmpeg/FFprobe and temporary disk space for videos.

Browser authentication and workspace requests remain same-origin through the Next.js proxy.
File transfer uses this flow:

1. Authenticated browser sends MIME type and byte count to `/api/workspace/media/ticket`.
2. Express reserves a media record for that owner and issues a scoped ten-minute upload token.
3. Browser sends the file directly to `API_PUBLIC_URL/api/media/upload/:id` using the token,
   with no session cookie. Express enforces the configured origin, MIME, size, and one-use claim.
4. Existing Sharp/FFmpeg processing validates and normalizes the file before Cloudinary upload.
5. Only the confirmed remote upload is saved as `READY`. Owned preview routes redirect to a
   signed Cloudinary download; the worker signs a fresh download when publishing to Instagram.

File bytes bypass Vercel functions. CORS is handled by Express for the exact `WEB_ORIGIN`;
allow `Authorization` and the media `Content-Type` headers if another reverse proxy handles CORS.
Proxying only small ticket requests avoids Vercel's incoming function body limit.

Cloudinary originals are uploaded with delivery type `authenticated` and overwrite disabled.
Preview links expire after one hour; worker download links expire after 24 hours. Signed download URLs include the public cloud/API-key identifiers and a signature, never the API secret.
Signatures are bearer access: don't log or share signed media URLs. Cloudinary performs download/video range
handling for new media. The legacy `/api/media/public` route remains only for old local assets.
`MEDIA_STORAGE_PATH` and `MEDIA_PUBLIC_URL` are no longer required for new Cloudinary uploads.
Automatic media retention, abandoned-upload deletion, and migration of old media are future work.

## Verify a live account

Automated tests use simulated Cloudinary/Instagram responses plus isolated PostgreSQL/Redis.
They verify actual local photo/video preparation, scoped tickets, replay/ownership checks,
remote identifier persistence, safe upload errors, cleanup after database failure, redirects,
and the Cloudinary URL sent to the worker's provider adapter. They do not establish successful
live Cloudinary delivery or Instagram fetching those URLs.

After configuring credentials and restarting API/worker:

1. Upload a photo, save a draft, refresh, and verify its protected preview.
2. Upload a supported MP4 and verify video playback and seeking.
3. Confirm the assets are authenticated in the Cloudinary media library.
4. Schedule a small test photo and then a Reel on your authorized Instagram account, close the
   browser, and check actual provider results and recorded status.

Follow [Instagram setup](instagram-setup.md) for account/app authorization. No real provider
upload, creator-database migration, push, or deployment was performed during implementation.
