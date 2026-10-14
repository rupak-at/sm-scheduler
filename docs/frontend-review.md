# Frontend review

Reviewed the landing page, auth screens, and protected planner against the current
[Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)
using web-design-guidelines. Applied frontend-design and original imagegen artwork.

## Findings addressed

`frontend/src/app/globals.css:3` — fixed: system dark preference previously recolored shadcn
controls within a light page; dark styling now requires an explicit `.dark` ancestor.

`frontend/src/app/globals.css:24` — fixed: stronger input boundaries distinguish fields from white surfaces.

`frontend/src/components/landing/landing-footer.tsx:25` — fixed: footer sits outside
main so the public page has a proper content-information landmark.

`frontend/src/components/landing/landing-hero.tsx:38` — fixed: tablet imagery uses
side-by-side layout; mobile places photography first rather than a tall text-only panel.

## Reviewed implementation

`frontend/src/app/layout.tsx:26` — pass: visible-on-focus skip link, local font, matching light theme metadata.

`frontend/src/components/landing/landing-hero.tsx:10` — pass: fluid headings, functional
links, honest availability copy, explicit responsive image containers and sizes.

`frontend/src/components/auth/auth-form.tsx:14` — pass: labels, autocomplete,
native validation, live feedback, pending state, and reduced-motion-aware spinner.

`frontend/src/hooks/auth/use-auth-form.ts:44` — pass: successful auth opens `/planner`.

`frontend/src/components/planner/content-filters.tsx:13` — pass: URL filters,
current-page indication, keyboard focus, and intentional horizontal scrolling on narrow screens.

`frontend/src/components/planner/sidebar.tsx:41` — pass: long profile names truncate;
logout retains an accessible name when its desktop text is visually hidden.

`frontend/src/components/planner/connection-guide.tsx:6` — pass: native keyboard-operable
expandable guidance; upcoming features are explanatory content.

## Browser validation

Chromium review covers 320, 390, 768, 820, 1024, 1280, 1440, and 1920px viewports across
landing, login, signup, and planner. Checked horizontal page overflow, labels/autocomplete,
keyboard focus, dark system preference, reduced motion, expanded guidance, URL filters,
and long profile names. Roboto is verified in computed styles across headings, body text,
and form controls. Desktop/mobile/tablet screenshots reviewed. Login submission and signed-in
login/signup redirects are checked against the temporary auth fixture.

The running app's public pages were inspected directly. Protected planner review uses a
separate production preview with a temporary session fixture, avoiding writes to the user's
database. Layout checks do not replace real Safari/iPad or assistive-technology testing.

## Instagram workspace update — 2026-10-09

Reviewed the functional photo editor, channel actions, content rows, URL filters, and auth
Instagram controls against the current Web Interface Guidelines. Controls have native semantics,
labels, focus states, disabled/pending states, and inline live errors. Caption length and image
constraints are visible; dates use Intl and recorded timezone. Edits keep their original revision
so background polling cannot silently overwrite another editor's changes. Dirty forms guard
navigation; cancel/delete/disconnect/retry ask for confirmation. Token/secrets stay on the backend.

Chromium fixture checks passed the browser photo upload → draft save and photo upload → schedule
flows, URL filters, workspace logo destination, session redirects, long names, keyboard focus,
and 320/390/768/820/1024/1280/1440/1920px overflow checks. Desktop/mobile/tablet editor screenshots
were inspected. Meta was not contacted; physical Safari/iPad and live Instagram tests remain pending.

## Media composer review — 2026-10-12

Reviewed the updated composer against the current Web Interface Guidelines using the requested
frontend-design and web-design-guidelines skills. The existing neutral Roboto/Tailwind/shadcn
system is retained. No remaining findings in the reviewed composer after these corrections:

`frontend/src/components/planner/media-field.tsx:35` — fixed: asynchronous processing
and ready state are announced through polite status regions; native file selection accompanies drag/drop.

`frontend/src/components/planner/caption-fields.tsx:16` — pass: labelled caption/hashtag
controls, descriptive examples, combined counter, associated errors, and inexpensive live text updates.

`frontend/src/components/planner/post-fields.tsx:19` — fixed: native account selection
has explicit light background/foreground colors; selected account drives the live preview.

`frontend/src/components/planner/editor-header.tsx:17` — pass: close link preserves
URL filters and uses the existing unsaved-navigation guard without a second confirmation.

`frontend/src/components/planner/post-preview.tsx:37` — pass: native video controls,
no autoplay, playsInline, media descriptions, dimensions on images, and actual user-authored text.
Preview guidance explains provider cropping/display differences without invented engagement/actions.

`frontend/src/components/planner/post-editor.tsx:38` — pass: submit errors receive focus;
caption entry remains usable while media prepares; save/schedule wait for confirmed upload completion.

Chromium used a separate production web instance, real local API, and isolated PostgreSQL fixtures.
All eight required widths (320/390/768/820/1024/1280/1440/1920px) passed label and overflow checks.
Inspected mobile, tablet, and desktop screenshots with actual decoded photo/video previews.
Verified PNG drag/drop and removal, caption/hashtag preview/save equality, draft editing, MP4
playback through byte ranges, Reel scheduling, dark system preference, reduced motion, and focus.
Fixture provider calls are blocked; no creator database or real Instagram account was changed.
Physical Safari/iPad and assistive-technology testing remain pending.

## Publishing desk review — 2026-10-13

Reviewed the planner, overview, agenda, post rows, action menus, account details, and composer
against the current Web Interface Guidelines. Research and design choices are recorded in
[planner research](planner-research.md); the existing neutral Roboto system is retained.

`frontend/src/components/planner/planner.tsx` — fixed: explicit one-column mobile grid
tracks prevent long agenda captions from widening the page at 320px.

`frontend/src/components/planner/mobile-workspace-context.tsx` — pass: account health
and the next queued publication remain reachable before the mobile content list.

`frontend/src/components/planner/workspace-overview.tsx` — pass: real workspace-wide
counts, tabular numerals, URL links, focus/current states, and useful attention emphasis.

`frontend/src/components/planner/post-actions.tsx` — pass: visible edit action,
labelled keyboard-operable Radix menu, and confirmations before cancel/delete/retry.

`frontend/src/components/planner/post-editor.tsx` — pass: named Radix dialog,
focus trapping/restoration, initial heading focus without a mobile keyboard, dirty-close guard,
scrollable content, inline error focus, and save/schedule actions outside the scroll region.

`frontend/src/components/planner/channel-row.tsx` — pass: real account status,
long-name truncation, native expandable details, and accessible connection maintenance.

Browser validation results and limits are recorded in [implementation status](project-status.md).
The preview uses a separate production web instance, real local API, and isolated PostgreSQL
accounts/media. No creator records or live Instagram account were used. Physical Safari/iPad
and assistive-technology testing remain pending.

`frontend/src/components/planner/post-status.tsx` — fixed: darkened neutral badge labels
so small text clears 4.5:1 contrast against the soft gray status surface.

`frontend/src/components/planner/editor-header.tsx` — fixed: mobile sheet header/body/actions
respect horizontal device safe areas; header/footer also respect top/bottom insets.

Chromium passed 320/390/768/820/1024/1280/1440/1920px populated, empty, composer, and long-content
states with no page/dialog overflow or console errors. Verified actual fixture upload/schedule,
draft editing, error focus, keyboard menu navigation, dialog focus trapping/restoration, accepted
and declined dirty-close confirmation, expanded/expired connections, dark preference, and reduced
motion. Inspected desktop/tablet/mobile screenshots. Browser verification used isolated local
records and never called a real Instagram provider. Physical Safari/iPad checks remain pending.

## Compact planner revision — 2026-10-13

Fetched the current Web Interface Guidelines again and reviewed the revised top bar, counted
filters, media rows, account disclosures, mobile header, composer, and scrollbar treatment.

`frontend/src/app/globals.css:2` — fixed: utility detection is rooted in web source instead of
depending on compiler cwd. A real PostCSS/Tailwind regression check covers missing responsive CSS.

`frontend/src/app/globals.css:36` — pass: thin scrollbars remain visible on both axes, including
nested regions and textareas; neutral thumb contrast and hover indication are retained.

`frontend/src/app/icon.svg:1` — fixed: the browser tab now uses the brand mark rather than
requesting a missing favicon.

`frontend/src/components/planner/workspace-nav.tsx:20` — pass: connection status has an
accessible name on phones, 44px targets, keyboard focus, and a working account-details anchor.
The profile name truncates and the compact logout control retains its accessible label.

`frontend/src/components/planner/content-filters.tsx:6` — pass: real counts, URL state,
current-page semantics, intentional narrow-screen scrolling, and visible inset keyboard focus.

`frontend/src/components/planner/planner-header.tsx:8` — fixed: a short phone heading
keeps the page title and New post action aligned at 320px without hiding the primary action.

Playwright used an isolated **development** web/API/database and a single published-post fixture
matching the supplied screenshots. All eight required widths passed computed grid/padding/media
dimensions and page/dialog overflow checks; page and textarea scrollbar widths resolve to thin.
Reviewed empty filters, composer, long profile names, dark preference, and reduced motion with
no browser errors. Inspected mobile/tablet/desktop screenshots after waiting for fonts and decoded
media. Fresh anonymous localhost/tunnel pages also serve and apply the correct development CSS.
Historical production-only checks did not catch the supplied development-style failure; both
compiler source detection and browser layout assertions now cover that gap.

## Planner action response — 2026-10-13

Reviewed against freshly fetched Web Interface Guidelines. Reproduced the unresponsive-looking
New post transition by delaying its server response, then verified the local URL-state flow.

`frontend/src/components/planner/composer-link.tsx:16` — fixed: editor links respond
without waiting for a server render. They retain real hrefs and standard modified-click behavior;
account hash links retain their normal navigation.

`frontend/src/components/planner/planner.tsx:29` — pass: live URL state drives the
composer, including direct URLs and browser history. Authenticated workspace data still owns
media/account/post visibility; server validation still controls save/schedule.

`frontend/src/components/planner/post-editor.tsx:20` — pass: local closing preserves
view/cursor, checks unsaved changes, and restores focus to New post.

Playwright passed all eight viewport checks and verified creation from All/Published/Scheduled,
empty creation, direct URLs, back/forward, Ctrl-click new tabs, loaded scheduled editing,
accepted/declined dirty close, focus restoration, missing-media validation, and actual fixture
photo upload/scheduling. Final runs have no browser errors. The delayed-navigation check makes
zero editor server requests after the change. Tests use isolated services; the exact failure in
the user's open client was not reproduced. Physical Safari/iPad checks remain pending.

## Live tunnel cache review — 2026-10-13

The user reported that the changed editor URL still showed no sheet after refreshing, with
missing post images. Read-only media checks confirmed the JPEG was ready and present. Live
asset headers exposed a four-hour browser cache TTL added through the tunnel, which the separate
localhost previews did not exercise. Added development-only no-store directives, source-versioned
asset URLs, and a fresh development compiler. The user confirmed working UI afterward.

`frontend/development-cache.ts:20` — fixed: development source versions and browser/CDN cache
policy prevent earlier assets from surviving page updates. Production retains Next.js defaults.

`frontend/next.config.ts:12` — fixed: avoid restoring a development compiler cache that reproduced
stale-task failures on workspace/media endpoints in the isolated preview.

Final live localhost and HTTPS-tunnel styles include image dimensions, fixed sheet positioning,
and expected responsive utilities. Cache-Control is private/no-store; Cloudflare reports BYPASS.
The preceding eight-size editor/history/upload/schedule browser checks remain valid. Temporary
diagnostic route/hook removed; no diagnostics or fixture data ship in the interface.

## Facebook provider UI — 2026-10-14

Reviewed the changed account panel/button, channel rows, composer selection/preview, content rows,
connection notices, navigation and empty state against the current Web Interface Guidelines
(fetched 2026-10-14). Semantic buttons/selects/labels, native details, explicit provider names,
focus rings, accessible alerts and reduced-motion loading indicators remain consistent. No
outstanding findings in the changed UI. Existing white/graphite/Roboto layout is retained.

Chromium used the production frontend and an isolated authenticated API/database with actual
fixture JPEG/MP4 uploads and real mixed-provider account/post records. All eight required widths
(320, 390, 768, 820, 1024, 1280, 1440, 1920px) passed page/composer overflow checks, long Page
names, Facebook selection, live caption composition, stored video metadata/native playback
controls and correct photo/video provider preview labels. Desktop, tablet and phone screenshots
were inspected. The Facebook connection button reached the real authenticated start route;
its Facebook redirect was intercepted before provider contact. No browser page errors occurred.

This review uses provider fixtures, not live Facebook authorization/publication or a live
Cloudinary asset. Physical Safari/iPad behavior remains untested. No creator data changed.
