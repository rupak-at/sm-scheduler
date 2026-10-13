# Planner research and design — 2026-10-13

## Brief and audience

A solo creator should see content progress, the next publications, and Instagram connection
health in one place. The workspace should feel polished and quiet, and remain useful on a phone.
Retain local Roboto and the existing neutral visual system. All data must come from the creator's
workspace; no demo posts, engagement metrics, suggested posting times, or future-provider actions.

## Research and decisions

| Source                                                                                                                       | Observation                                                                                              | Application to this planner                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [Linear's 2026 refresh](https://linear.app/now/behind-the-latest-design-refresh)                                             | Navigation recedes, task content carries emphasis, and separators establish relationships.               | Narrow, quiet navigation; aligned media rows; restrained borders and one dominant New post action.                                 |
| [Linear's redesign process](https://linear.app/now/how-we-redesigned-the-linear-ui)                                          | Density and hierarchy need testing across views, environments, and content extremes.                     | Review empty, populated, attention, and composer states across eight widths and long names/captions.                               |
| [Buffer's publishing calendar](https://support.buffer.com/articles/how-to-use-buffers-calendar-feature-FSSKbH32DN)           | Status filters, channel context, and editing coexist in the planning surface.                            | Keep status navigation and account health beside content; open the composer over the same workspace.                               |
| [Buffer on mobile](https://support.buffer.com/en-us/articles/using-the-calendar-feature-on-the-buffer-mobile-app-YxB7DmpyJI) | Mobile exposes focused daily content and explicit creation/edit controls.                                | Use compact list rows, touch-sized controls, and a full-height composer rather than shrinking a desktop calendar.                  |
| [Later's mobile guide](https://help.later.com/hc/en-us/articles/360043244813-A-Guide-to-the-Later-Mobile-App)                | List, preview, and calendar serve different scanning tasks.                                              | Prioritize list scanning for the current one-account workflow; media and schedule remain visible together.                         |
| [NN/g: progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/)                                     | Secondary options appear on demand while essential choices stay visible.                                 | Keep Edit visible; put cancel/delete/retry in a labelled keyboard-operable menu. Expand connection maintenance on demand.          |
| [NN/g: operational dashboards](https://www.nngroup.com/articles/dashboards-preattentive/)                                    | An overview should answer actionable questions with little interpretation.                               | Show real draft/scheduled/published/attention totals and the earliest queued posts. Avoid decorative charts.                       |
| [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)    | Semantic controls, URL state, focus, responsive layouts, and honest empty/error states are foundational. | Retain URL filters/pagination/compose, labelled forms, dialog focus management, dirty-form protection, and explicit timezone text. |

These are design inferences from published product workflows and research, not usability findings
from this project's users. No external artwork or product layouts are copied.

## Direction before implementation

Palette: white #ffffff, porcelain #fafafa, soft gray #f4f4f5, graphite #27272a,
slate #71717a, silver #e4e4e7. Small semantic green/red markers communicate health;
they are accompanied by text and never act as decorative accents.

Type: local Roboto throughout. Page title 28–32px; summary values 28px; section titles
15–16px; post content 14px; metadata 12px. Use tabular numerals for counts and dates.

Layout: a publishing desk with a compact summary strip, a dominant content list, and an
adjacent agenda/account rail. Alignment is left-led; creator media supplies visual character.

```text
Desktop
[Quiet nav] [Publishing planner                    New post]
            [Drafts      Scheduled      Published      Attention]
            [Content filters / list       ] [Up next         ]
            [Photo | caption / status     ] [Next dates/media]
            [Photo | caption / schedule   ] [Instagram health]
            [Pagination / refresh         ] [Account controls]

Phone
[Brand                                    Account]
[Publishing planner                     New post]
[Drafts / Scheduled] [Published / Attention]
[Content filters — horizontal scroll]
[Photo | caption / status / edit / menu]
[Up next]
[Instagram / expandable controls]

Composer
[Underlying planner retained] [Focused sheet on desktop]
[Full-height sheet on phone: header / form / preview / actions]
```

## Critique and scope

An initial concept with separate metric cards, a month calendar, and a second tall editor above
the list would make the page feel busier and hide useful context. Replace the cards with one
segmented overview, use an agenda for the next three scheduled publications, and move editing
into an accessible sheet. A month calendar is a separate product capability requiring date-range
queries; this change does not present one as implemented.

Counts and agenda must be independent of the active filter and pagination. Fetch them on the
backend with ownership constraints; do not infer workspace totals from the current 30-row page.
No database migration is needed. Preserve publishing, cancellation, retry, ownership, and token
rules. Reuse existing Radix/shadcn primitives for dialog and menu behavior.
