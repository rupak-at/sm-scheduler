# Starter frontend design

The workspace serves solo creators planning Instagram content, including creators in Nepal.
The first screen is an honest empty planner: no sample posts, simulated account connection,
or implied publishing capabilities.

## Design plan

- Paper blue `#eef3fa`: workspace background.
- Ink blue `#19304a`: text and navigation.
- Denim `#235cd6`: active navigation and focus.
- White `#ffffff`: the content canvas.
- Honey `#ebba59`: a small decorative marker in the empty timeline.
- Mist `#d4dfea`: separators and empty schedule slots.
- Roboto: one locally hosted variable family for body and headings, using deliberate weight
  and size rather than extra typefaces.
- Layout: left-aligned navigation beside a spacious planner; the content panel is the central
  visual element, with a three-stage empty timeline that reflects the creator's actual workflow.

```text
Desktop                            Mobile
[Brand | Planner header]           [Brand / Planner]
[Nav   | Status filters]           [Planner header]
[      | Empty workflow canvas]     [Scrollable status filters]
[Acct  | Next-step guidance]        [Empty workflow / Guidance]
```

## Review before implementation

A metrics grid and a calendar filled with demonstration posts would imply functionality and data
we do not have. Use a single empty workflow canvas instead, with functional URL-based filters.
Keep the rest quiet: no gradients, repeated card shadows, artificial counters, or animated reveals.

## Implementation and review

Use the installed frontend-design skill for visual decisions and web-design-guidelines for review.
Use Tailwind CSS utilities with shared theme tokens and Prettier class sorting.
Use native navigation, visible keyboard focus, a skip link, accessible names, semantic headings,
responsive grids, and descriptive empty states. Query parameters preserve filter state.
Next.js optimizes the vendored Roboto font with `next/font/local`; builds do not fetch fonts.

Account connection, media upload, and scheduling remain planned work before creators can
manage real publications from this planner.

## Authentication addition

Login and signup use the same Roboto family, blue tokens, and shared shadcn/ui form primitives.
On desktop, a single ink-blue brand panel balances the form; mobile collapses it to a compact
brand header so fields remain immediately accessible. Submission state and errors are explicit.
The planner now loads the authenticated profile through server-side session verification.
Instagram connection and content creation remain future work.
