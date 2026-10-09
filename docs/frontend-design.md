# Frontend design

Social Scheduler is a workspace for independent creators preparing Instagram content.
Use a precise, quiet interface with expressive typography and original studio photography.
The public site introduces the product; the authenticated app prioritizes everyday clarity.

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
through Next.js Image. See `apps/web/public/images/README.md` for provenance.
Mobile places the photograph before its companion copy; tablet uses a two-column composition.
The layout reflows naturally rather than scaling a desktop canvas down to a phone.

## Authentication and planner

Login/signup share a compact brand header, a focused form, and an inset photographic panel.
Mobile prioritizes form fields and hides the companion panel. Controls have explicit labels,
comfortable touch targets, autocomplete, visible focus, and readable error/pending states.

`/planner` is authenticated. Desktop uses a 232px sidebar, compact workspace bar, and a
content canvas with a channel panel alongside it. Tablets/mobile stack channels beneath content.
The account footer truncates long names; mobile exposes a labelled logout action.
Filters remain URL links at `/planner?view=…`; the editor is deep-linked through `compose`.
The neutral channel panel shows actual account status and offers connect/reconnect, validation,
and disconnect. The photo editor pairs a compact preview/upload column with labelled caption,
account, and local scheduling fields; it becomes one column on phones. Content rows use the
uploaded photo and real status/attempt information. Failed/uncertain items have an attention tab.

Instagram sign-in, JPEG drafts/uploads, scheduling, and worker outcomes are implemented;
provider eligibility and a real publish still require the user's live account/app test.
No sample creator posts are seeded into authenticated workspaces.

## References and review

- [Linear UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui): alignment,
  quiet app chrome, and information hierarchy.
- [Buffer Publish](https://buffer.com/publish): content status and channel organization.

Reference principles inform the design; no brand artwork, product screenshots, or page layouts
are copied. Use frontend-design for design planning and web-design-guidelines for final review.
Review 320, 390, 768, 820, 1024, 1280, 1440, and 1920px viewports, including long names,
keyboard focus, expanded setup guidance, system dark preference, and reduced motion.
