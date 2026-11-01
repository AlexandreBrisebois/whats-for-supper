# Design

## Context and Existing Ownership

Observed at clean branch `review/solar-earth-continuation`, HEAD `9e0db0e2720ab5abad296f88fdd861a288217bd7`:

- `pwa/src/components/home/TonightMenuCard.tsx:122`: Change plan (`skip-tonight-btn`) renders Lucide `ArrowRightLeft`, size 16, decorative (`aria-hidden`). This is the requested source glyph.
- `pwa/src/app/(app)/planner/page.tsx:1225`: `PlannerDayCard` renders `RefreshCw`, size 18, within `change-recipe-button`. It is the only corresponding Planner placement. The schedule map at line 650 reuses this component for every row and both layouts (`isWide`, breakpoint 1024px).
- The Planner button has `h-9 w-9`, existing ochre treatment/motion, localized title and accessible name from `planner.choosePathTitle`: English “Change this recipe”, French “Changer cette recette”. Activation stops propagation, then calls `onPivot`; the parent selects the row and opens `PlanningPivotSheet`.
- Its existing conditions require recipe content, a non-pending row and the enclosing row-action availability expression. Preserve those expressions exactly.
- `pwa/src/components/planner/PlanningPivotSheet.tsx:124` also uses `RefreshCw`, but for `pivot-plan-later` / Save for Next Week. It is a different action and outside scope.

## Decisions and Tradeoffs

Replace the Planner page's `RefreshCw` import and single JSX use with `ArrowRightLeft`, retaining size 18. Reuse the existing library glyph directly; copying the home button or introducing a shared icon wrapper would expand a two-reference change without a useful ownership boundary. “Same icon” means the same glyph, with the Planner's existing dimensions retained rather than copying the home's size 16.

The design review resolves which circling arrows to replace: the entry point for changing the assigned recipe, not the Save for Next Week option. No navigation/refresh icons, translations, API boundaries or persistence change. No material unresolved choices remain.

## First Observable Slice

Render `/planner` with an assigned recipe: its row action shows the home glyph, retains its localized accessible name and dimensions, and opens options for the selected row. This slice touches only the existing React render path. Existing `page.test.tsx` coverage exercises pivot opening and pending-row suppression; `pwa/e2e/planner.spec.ts` covers the rendered recipe-row actions and layout/contrast checks. No new logic test is warranted for an icon-only edit; use existing behavior checks and rendered inspection.

## User Experience

Inspect the icon at narrow and wide viewports and compare it with the home meal card. Confirm the Planner glyph remains 18px, button target remains 36px, and localized title/name, keyboard activation, focus and pivot behavior remain intact. The existing 36px target is retained by request; this change makes no broader accessibility compliance claim. English/French copy and all loading, empty, pending and error states retain their current behavior.
