# Frontend review — 2026-10-09

Reviewed the landing page, auth screens, and protected planner against the current
[Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)
using web-design-guidelines. Applied frontend-design and original imagegen artwork.

## Findings addressed

`apps/web/src/app/globals.css:3` — fixed: system dark preference previously recolored shadcn
controls within a light page; dark styling now requires an explicit `.dark` ancestor.

`apps/web/src/app/globals.css:24` — fixed: stronger input boundaries distinguish fields from white surfaces.

`apps/web/src/features/landing/components/landing-footer.tsx:25` — fixed: footer sits outside
main so the public page has a proper content-information landmark.

`apps/web/src/features/landing/components/landing-hero.tsx:38` — fixed: tablet imagery uses
side-by-side layout; mobile places photography first rather than a tall text-only panel.

## Reviewed implementation

`apps/web/src/app/layout.tsx:26` — pass: visible-on-focus skip link, local font, matching light theme metadata.

`apps/web/src/features/landing/components/landing-hero.tsx:10` — pass: fluid headings, functional
links, honest availability copy, explicit responsive image containers and sizes.

`apps/web/src/features/auth/components/auth-form.tsx:14` — pass: labels, autocomplete,
native validation, live feedback, pending state, and reduced-motion-aware spinner.

`apps/web/src/features/auth/hooks/use-auth-form.ts:44` — pass: successful auth opens `/planner`.

`apps/web/src/features/planner/components/content-filters.tsx:13` — pass: URL filters,
current-page indication, keyboard focus, and intentional horizontal scrolling on narrow screens.

`apps/web/src/features/planner/components/sidebar.tsx:41` — pass: long profile names truncate;
logout retains an accessible name when its desktop text is visually hidden.

`apps/web/src/features/planner/components/connection-guide.tsx:6` — pass: native keyboard-operable
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

`apps/web/src/features/planner/components/media-field.tsx:35` — fixed: asynchronous processing
and ready state are announced through polite status regions; native file selection accompanies drag/drop.

`apps/web/src/features/planner/components/caption-fields.tsx:16` — pass: labelled caption/hashtag
controls, descriptive examples, combined counter, associated errors, and inexpensive live text updates.

`apps/web/src/features/planner/components/post-fields.tsx:19` — fixed: native account selection
has explicit light background/foreground colors; selected account drives the live preview.

`apps/web/src/features/planner/components/editor-header.tsx:17` — pass: close link preserves
URL filters and uses the existing unsaved-navigation guard without a second confirmation.

`apps/web/src/features/planner/components/post-preview.tsx:37` — pass: native video controls,
no autoplay, playsInline, media descriptions, dimensions on images, and actual user-authored text.
Preview guidance explains provider cropping/display differences without invented engagement/actions.

`apps/web/src/features/planner/components/post-editor.tsx:38` — pass: submit errors receive focus;
caption entry remains usable while media prepares; save/schedule wait for confirmed upload completion.

Chromium used a separate production web instance, real local API, and isolated PostgreSQL fixtures.
All eight required widths (320/390/768/820/1024/1280/1440/1920px) passed label and overflow checks.
Inspected mobile, tablet, and desktop screenshots with actual decoded photo/video previews.
Verified PNG drag/drop and removal, caption/hashtag preview/save equality, draft editing, MP4
playback through byte ranges, Reel scheduling, dark system preference, reduced motion, and focus.
Fixture provider calls are blocked; no creator database or real Instagram account was changed.
Physical Safari/iPad and assistive-technology testing remain pending.
