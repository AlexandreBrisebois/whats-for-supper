# Visual Language Session History (Oct–Nov 2026 Archive)

This archive retains chronological design-checkpoint logs, historical source snapshots, and per-session browser/DV observations moved out of the [current visual language reference](../visual-language-reference.md). It is historical context only; runtime owners, OpenSpec specifications, and the current reference govern active implementation.

## Archived 25 October 2026 SVG Boards

- [Archived Board 1 (25 Oct snapshot)](visual-language/01-roles-type-states.svg) — historical green/icon checkpoint with `Order In plan`, `#1F2937` / `#4B5563` cool slate neutrals, `#E1AD01` black-on-yellow contrast reference swatch, and pre-retirement Home `Browse your library` tile.
- [Archived Board 2 (25 Oct snapshot)](visual-language/02-home-state-map.svg) — historical Home state checkpoint with `Quick Find`, `Order In`, full-sage non-cooking card, and `Browse your library` route block.

---

## Creative Revision · 27 October 2026 & Sessions 5–7

**Creative revision: 27 October 2026.** Alex reported that the implemented Home cards lost their refinement and cookbook feel; dark text on yellow was explicitly rejected for that Home direction. The planned-card and pivot cookbook treatments were implemented locally in Sessions 5–6 and reconciled in Session 7. The pre-refinement Home source snapshot was `e4d5be7e`; the original composition reference is its parent `a4d360558d35c2f79e9cca08a9d31638d8d25569`.

User-supplied composition anchors retained under `docs/visual-language/references/`:

- [Screenshot_20261026-212933.png](../visual-language/references/Screenshot_20261026-212933.png) — portrait-shaped white card on cream, dominant nearly square photograph, deeply rounded image/card corners, substantial soft elevation, bold recipe title, and subtle blush duration pill.
- [Screenshot_20261026-212918.png](../visual-language/references/Screenshot_20261026-212918.png) — rounded frame, shadow, and bold title with a wider image, one primary CTA, and a compact row of two secondary actions (its historical yellow primary and faint `Order In` label were not reinstated).

**Sessions 5–7 observations:** matched light/dark photo renders restored the planned card's near-square image, soft elevation, prominent title, blush duration, and quiet outlined `Change plan`, with text-style ingredient disclosure. The pivot retained a wider 5:4 photograph, one primary, and compact icon-bearing secondary choices; French Home used "Recherche". Empty/failed images used a modest warm icon. Local photo-filled comparison artifact was stored under `.task/home-card-session7/final-photo-review.png`. See [2026-10-27 Home meal card design](../../openspec/changes/archive/2026-10-27-home-meal-card-visual-hierarchy/design.md) and [tasks](../../openspec/changes/archive/2026-10-27-home-meal-card-visual-hierarchy/tasks.md).

---

## Demo 0.1.25 Historical Inspection & Sessions 1–4

**Historical inspection, not a ban on brand colours:** the supplied Demo 0.1.25 inspection reported Tonight context at 10 px/900, charcoal 40% on white (`2.35:1`); active Home at 11 px, terracotta on cream (`3.88:1`); and enabled Cook at 10 px, white on ochre (`2.06:1`). Those Tonight context/Cook roles predated Session 1 below; Home navigation was outside that change. Independent opaque calculations reproduced the latter two ratios; compositing charcoal at 40% over white also yielded approximately `2.35:1`. The reported 30 px charcoal recipe title on white measured `14.68:1`.

**Preceding implementation before the 27 Oct cookbook refinement (Sessions 1–4):** the planned and pivot cards used content-driven height, a bounded 4:3 image region (maximum 16 rem high), one restrained outer shadow, wrapping titles, and vertically stacked actions. Context was 16/24 semibold, supporting text was 14 px, and actions were 16 px semibold with at least 56 px unpressed height. Session 2 exposed `Cook` then `Change plan` on the initial planned card ahead of inline ingredient disclosure (`View ingredients` / `Hide ingredients`). Session 3 implemented the pivot hierarchy: a ready family GOTO led with `Make this tonight`; otherwise `Quick Find` led, followed by outlined `Take Out` and Profile setup when no active GOTO existed. Rendered EN/FR acceptance covered `320×844`, `390×844`, `412×915`, `820×1180`, and `1180×820`, with fixture text enlarged to 200%, long/empty details, and absent imagery. Local evidence artifacts were stored under `.task/home-card-session1/`, `.task/home-card-session2/`, and `.task/home-card-session3/`, and recorded in [session evidence and final reconciliation](../../openspec/changes/archive/2026-10-27-home-meal-card-visual-hierarchy/tasks.md).

Anonymous designer feedback from that cycle reported that Capture and Browse were clear, while Home context was confusing, `Order In` looked disabled, and yellow/light-grey treatments were hard to read.

---

## Recipe Detail Composition · 4 November 2026

**Historical implementation before the 5 November refinement:** [RecipeDetailSheet](../../pwa/src/components/recipes/RecipeDetailSheet.tsx) adopted full-screen phone/short-height detail and a bounded larger-screen dialog. The toolbar retained named Recipe actions, eligible sharing, and Close. Recipe identity led compact labeled appreciation, distinct ochre GOTO, and stable opaque View original access. `Ask the Family` preceded Ingredients, followed by parser-backed numbered instructions and Family notes.

**Proposed composition reference:** [accepted local compositions](../../openspec/changes/archive/2026-11-06-redesign-recipe-detail-planning/compositions.md) and [change design](../../openspec/changes/archive/2026-11-06-redesign-recipe-detail-planning/design.md).

---

## Recipe, Portions and Grocery Refinement · 5 November 2026

**Locally verified implementation & initial DV release:** [refine-recipe-planner-grocery proposal](../../openspec/changes/archive/2026-11-06-refine-recipe-planner-grocery/proposal.md) and [design](../../openspec/changes/archive/2026-11-06-refine-recipe-planner-grocery/design.md) developed the family-cookbook direction across recipe detail, Planner portions, and grocery source details.

- **Recipe detail:** Let the recipe lead. Kept GOTO in the top action bar with named controls and visible state, placed known `Ready in` in a quiet readable hero badge, and placed eligible `View Original` at the hero's lower right on a stable surface. Removed standalone Steps and unified cooking entry under `Cook`. Finished ingredients and instructions with **Rating → Family notes → Ask the Family** (immediately writable field, quiet save acknowledgement, explicit retry on failure). Ingredient `2 / 4 / 6` choices acted as temporary previews; `View original ingredients` and `Reset view` sat progressively in Recipe actions.
- **Planner portions & groceries:** Planner's `Portions` used a plate/cutlery icon and visible label (`Save and continue` primary, `Keep editing` secondary, `Discard changes` quiet text). Grocery sources used a compact recipe-book disclosure with actual source titles while keeping incomplete-subtotal and prior-unknown warnings visible outside it.
- **DV checkpoint:** Deployed locally to DV (`https://dv.srvrlss.dev`) alongside full automated gate and live smoke checks.

---

## DV Feedback Follow-up · 5–6 November 2026

**Locally implemented, inspected, and deployed to DV:** [polish-dv-recipe-portions proposal](../../openspec/changes/archive/2026-11-06-polish-dv-recipe-portions/proposal.md) and [design](../../openspec/changes/archive/2026-11-06-polish-dv-recipe-portions/design.md) refined the preceding deployed composition following Alex's review:

- Kept **Rating → Notes → Ask the Family**, restoring evenly spaced, borderless emoji-and-label rating choices and one directly writable Notes field without an enclosing card or duplicate heading.
- Restored `View Original` as a warm translucent rounded hero capsule at the lower right (lowest sampled interior surface ratio ~`9.4:1` against opaque charcoal; `14.23:1` keyboard-visible focus treatment).
- Placed `Plan for date` and icon-only `Change day` beside each other with localized accessible name/tooltip and `48 px` target.
- Moved `Usual portions` into Settings while keeping Planner's compact numeric reset button (e.g., `4`) inside the date/photo/count editor.
- **Observed Group 5 composition:** matched EN/FR real-photo browser specimens across `390×844`, `834×1112`, `844×390`, and `320×740` with ordinary/200% text, missing photo, and unknown yield retained under `.task/dv-polish-apply/`. Deployed to DV on 6 November 2026.

---

## Recipe Detail Docks and Discovery · 6 November 2026

**Local review of `refine-recipe-detail-docks-and-discovery`:** Moved `Cook` to the leading toolbar action, placed dated `Plan` and icon-only `Change day` in one bottom controls row for unplanned detail, kept `Find Similar` as a quiet Search action in the overview before Ingredients, and returned the selected Rating choice to a neutral white raised surface (`aria-pressed`) without the prior red fill or checkmark. Local Chromium specimens (`recipe-detail-layout.spec.ts`, 18/18) and private EN/FR captures were recorded under `.task/recipe-dock-apply/` and `.task/recipe-dock-review/ratings-reference/comparison.html`.

---

## Quiet Recipe Portions — Deployed DV Composition

`quiet-recipe-portions` kept the effective count beside Ingredients and the `2 / 4 / 6` controls, collapsing repeated original-basis/date/count exposition during ordinary reading and exposing `Set recipe portions` cleanly for original-basis edits. Home's expanded assigned ingredients reused the same captured dated projection as Cook. Evidence was recorded under `.task/quiet-portions-browser-acceptance/`, `.task/quiet-recipe-portions/`, and [archived acceptance](../../openspec/changes/archive/2026-11-06-quiet-recipe-portions/design.md) (`BUILD QUIET-1106-2118`).
