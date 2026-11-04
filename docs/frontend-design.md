# Frontend design

Social Scheduler is a workspace for independent creators preparing photos and videos across connected channels.
Use a precise, quiet interface with expressive typography and original studio photography.
The public site introduces the product; the authenticated app prioritizes everyday clarity.

YouTube extends the existing composer rather than introducing a separate editing surface.
Keep the shared Roboto/neutral tokens and left-aligned controls: media and description first,
then title, visibility, audience, disclosures and consent in one labelled section. Native selects
begin without visibility/audience choices; checkboxes begin off. Show the actual video/title in
the existing preview and the selected visibility in the saved row. Consent resets after edits
and reopening. Provider availability and connection state always come from the API.

## Shared visual system

- White `#ffffff`: content, forms, and public page background.
- Porcelain `#fafafa`: workspace background and quiet secondary sections.
- Soft gray `#f4f4f5`: secondary controls and illustration surfaces.
- Graphite `#27272a`: body text, selected navigation, primary controls, and editorial panels.
- Slate `#71717a`: supporting text.
- Silver `#e4e4e7`: structural separators; input boundaries use stronger `#8a8a93`.
- Roboto: locally hosted variable font for **all** text, headings, labels, inputs, and buttons.
  Body 14–16px; supporting copy 12px; page headings 28–32px; public hero 44–88px with fluid sizing.
  Use weight 400 for body, 500 for display copy/controls, and 600 for compact app headings.

Use hierarchy, alignment, and whitespace instead of bright accent colors. Public actions use
rounded pills; form fields use 8px corners; larger editorial surfaces use 24–32px corners.
No gradients, autoplay animation, fake performance metrics, or invented creator testimonials.
Keep shadcn/ui primitives and Tailwind utilities consistent with the root theme tokens.
System dark preference must not partially darken controls in this explicitly light theme.

## Brand mark — 2026-11-04

The Social Scheduler mark is a custom continuous S-shaped route with a detached endpoint:
the line carries a prepared idea forward, while the dot marks its destination. It is
monochrome so it stays legible at 32px and does not add a provider-like accent color.
The graphite rounded square is the app icon; the white path can also stand alone on dark
surfaces. The wordmark uses the local Roboto variable font with a heavier “Social” and a
lighter “Scheduler”. Use the same mark in headers, the landing editorial panel, and the
browser icon. Downloadable SVG, 512px PNG, and TikTok-sized 1024px PNG files live in
`frontend/public/brand`.

## Public landing page

`/` is a static page that does not call the authentication API. It has a strong centered
headline, a studio photograph beside editorial copy, a labelled workspace preview, an
availability roadmap, and a closing invitation. Navigation links go to real routes or sections.
The product preview shows an empty workspace rather than simulated creator data.

```text
[Brand / Workspace / Roadmap / Log in / Get started]
[Fluid heading / short product context / primary action]
[Editorial copy | Original creator-studio photograph]
[Product story  | Labelled workspace preview]
[Available now / upcoming development roadmap]
[Closing invitation / footer]
```

Photography comes from an original imagegen asset, converted to a 200KB WebP and delivered
through Next.js Image. See `frontend/public/images/README.md` for provenance.
Mobile places the photograph before its companion copy; tablet uses a two-column composition.
The layout reflows naturally rather than scaling a desktop canvas down to a phone.

## Authentication and planner

Login/signup share a compact brand header, a focused form, and an inset photographic panel.
Mobile prioritizes form fields and hides the companion panel. Controls have explicit labels,
comfortable touch targets, autocomplete, visible focus, and readable error/pending states.

`/planner` is authenticated. A single 64px top bar holds the brand, connection health, profile,
and labelled logout action. The centered canvas has a content list beside a 288px account/queue
rail at laptop/desktop widths. Tablets place those panels side by side below the list; phones
stack them. Long names truncate. Status tabs include actual workspace-wide counts.
Filters remain URL links at `/planner?view=…`; the editor is deep-linked through `compose`.
Opening/closing the loaded editor updates native History state immediately; it does not wait
for a new workspace render. Keep the current view/cursor and retain normal new-tab links.
The neutral channel panel shows actual account status and offers connect/reconnect, validation,
and disconnect. The media composer pairs labelled upload/caption/hashtag/account/scheduling
controls with a live Instagram composition preview; it becomes one column on phones/tablets.
Content rows use the uploaded photo/video and real status/attempt information. Failed/uncertain items have an attention tab.

Instagram sign-in, photo/MP4 drafts/uploads, live previews, scheduling, and worker outcomes are implemented;
provider eligibility and a real publish still require the user's live account/app test.
No sample creator posts are seeded into authenticated workspaces.

## Media composer — 2026-10-12

Use the existing white `#ffffff`, porcelain `#fafafa`, graphite `#27272a`, slate `#71717a`,
and silver `#e4e4e7` tokens and local Roboto. The creator's selected media is the visual focus.
Keep controls left aligned, with a live preview beside them at roomy desktop widths and below
them on phones/tablets. The preview uses the actual selected account and authored text;
it has no invented engagement counts or inactive Instagram controls.

```text
[Create a post                                      Close]
[Drop / browse photo or MP4]   [Live preview / account]
[Caption                  ]   [Selected photo/video ]
[Hashtags                 ]   [Caption + hashtags   ]
[Account / publish time   ]   [Preview guidance     ]
[Save draft / Schedule post]
```

The brief requires practical composition, not new branding. Preserve the established palette
and typography instead of introducing a different visual theme. Separate caption and hashtags
while showing their combined character limit, and preview the same text that will be saved.
Uploads provide keyboard/file-picker access, real drag/drop, visible processing/errors, and
photo/playable-video previews. JPEG/PNG/WebP/AVIF photo inputs are normalized to JPEG and
MP4s are prepared for Reels through API/worker. Caption typing stays available during upload;
saving waits for prepared media. The preview shows that prepared asset and exact saved text.
Existing unsaved-navigation protection covers the close link without duplicate confirmations.

## References and review

- [Linear UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui): alignment,
  quiet app chrome, and information hierarchy.
- [Buffer Publish](https://buffer.com/publish): content status and channel organization.

Reference principles inform the design; no brand artwork, product screenshots, or page layouts
are copied. Use frontend-design for design planning and web-design-guidelines for final review.
Review 320, 390, 768, 820, 1024, 1280, 1440, and 1920px viewports, including long names,
keyboard focus, expanded setup guidance, system dark preference, and reduced motion.

## Publishing desk — 2026-10-13

See [planner research](planner-research.md) for the sources, decisions, and rejected alternatives.
The revised planner uses one top bar and a centered 1,360px content area at wide widths,
compact counted status tabs, a dominant media/content list, and a 288px account/agenda rail.
On phones the page title shortens to Planner so New post fits alongside it; connection health
remains in the top bar and full account/agenda controls follow the content list. Healthy accounts
keep secondary connection actions inside native details. Filters scroll intentionally on narrow
screens. Page, filter, sheet, and textarea scrollbars use a shared thin neutral treatment.

Tailwind source detection is explicitly rooted in `frontend/src` through the global import.
Review development and production CSS: checking overflow alone does not establish that grid,
spacing, and media utilities were generated. Assert computed columns, padding, and image sizes.

Counts cover the complete owned workspace, independent of the current page/filter. The agenda
shows the next three scheduled publications in chronological order. There is no calendar,
engagement analytics, suggested posting time, or simulated account/post data.

Small green tokens (#256348 foreground, #edf7f0 surface) communicate connected/published states
with text labels; red remains reserved for failures and attention. Roboto and the neutral base
palette remain unchanged. Status links, aligned media rows, and a single New post action carry
the hierarchy. Secondary actions use an accessible menu with existing confirmations.

The URL-linked composer is an accessible Radix sheet with a full-height mobile layout,
scrollable form/preview, a fixed header/action bar, focus trapping/restoration, and dirty-close
confirmation. Existing real uploads, captions, hashtags, account selection, schedule validation,
and provider/reliability behavior remain. Use touch-sized controls and preserve safe-area padding.

## Facebook integration — 2026-10-14

Retain the existing white/graphite tokens, local Roboto, touch-sized shadcn buttons and account
rail. Group actual channels under Instagram and Facebook Pages within Your accounts. Composer
selection includes the provider and uses Page names without Instagram's @ prefix; previews use
the selected provider icon and name and disclose that Page posts are public. Content rows and
uncertain-outcome guidance identify the actual provider. Keep the selected media as the visual
focus; no new colors, layout redesign or invented account/post data.

## TikTok composer — 2026-10-14

Retain white (#ffffff), porcelain (#fafafa), graphite (#27272a), slate (#71717a) and silver
(#e4e4e7), local Roboto and the existing account rail/composer sheet. Add TikTok as a third
actual account group. Place its current nickname, blank audience choice, interactions, photo
title/music, AI label, commercial disclosure and consent below the shared schedule controls.
The chosen media remains the visual focus; the preview names TikTok and describes processing.
Use labeled native selects/checkboxes with shared hit targets and visible focus. Privacy has
no new-post default; unsupported interactions are visibly unavailable. State why scheduling is
blocked, and retain draft saving. Consent resets after edits, media changes and reopening.
Keep photo-only/video-only controls distinct and preserve the existing phone/desktop layout.
