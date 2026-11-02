# Proposal

## Why

Members currently choose between a full-screen Browse library and a separate Search page, with different navigation and result presentations. One Recipes destination will let them explore and narrow the same library while preserving each source's ordering and their place when hiding search controls.

## Outcome and Scope

Create `unify-recipe-browse-search`: `/recipes` starts in Explore with collapsed search, All scope and the selected member's saved stack/list preference. Expanded search is a disclosure within that screen; hiding it preserves the active collection and pending work. Normal departure ends the session, while explicit contextual entries retain their supplied intent.

This change contains proposal, four capability deltas, designer-reviewed interaction/technical design and tested implementation slices only. Stop before application-code implementation. Keep API shapes, persistence, ranking rules and the Discovery voting journey unchanged; no migrations or new dependencies. The supplied brief is authoritative; prior-chat text is not available in this workspace.

## What Changes

- Rename the bottom Search destination Recipes and retain app navigation on both presentations. Place controls in order: Search → All/Discovery → Go-To → Stack/List → Recycle bin. Remove the former Browse overlay Close action.
- Reveal the input and Filters directly below the toolbar, focus the input and keep all toolbar shortcuts available. Indicate an active Search accessibly even when its controls are hidden.
- Keep Explore on `GET /api/recipes?order=explore`, including when Discovery and/or Go-To alone constrain scope. Use the existing `POST /api/recipes/search` for text, Similar, Focus or other effective Search filters, intersected with scope.
- Preserve complete Browse traversal, Search ranking/cursor continuation, filter drafts, semantic fallback, review flows, pending-request guards, retries, editing, membership stars, discoverability and planning/recovery behavior.
- Show the initial `topPick` as the first ordinary result, followed by alternatives, deduplicated by identity. Remove the spotlight, promotional reasons, Surprise Me and client random promotion.
- Separate hiding controls, Clear Filters and explicit Clear search and browse. Retain mounted state through detail, chooser use and disclosure; discard it on departure. Only existing member presentation preferences persist.
- Remove Home's Browse tile. Home Search and planner Search open controls expanded; installed Search advertises `/recipes?focus=search`. Redirect `/browse-all-stack` to `/recipes` with supported scope/detail/Similar/planning context preserved.
- Specify EN/FR, keyboard/focus, safe-area, short-screen, landscape, tablet, 200% text and reduced-motion acceptance. Browser validation remains implementation work.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: unified entry, toolbar, Explore scope and both presentations, compatibility redirect, collection-aware detail refresh and usable responsive layout.
- `recipe-search`: disclosure/session lifecycle, source selection, ordinary result stream in both views, Similar transitions, synchronized scope/drafts and recovery.
- `tonight-meal-decisions`: retire Home Browse while retaining Capture, voting and contextual Search for today.
- `app-installation`: installed Search opens expanded controls at the unified Recipes destination.

## Impact

Current source separates the routes in `pwa/src/app/(app)/browse-all-stack/page.tsx` and `pwa/src/app/(app)/recipes/page.tsx`. Affected owners include their tests, `browseStackStore`, the Search adapter in `pwa/src/lib/api/recipes.ts`, recipe cards/action bar/detail/filter/bin components, shell layout/navigation, Home handoffs, planner Search links, manifest builder and EN/FR copy. The method-sensitive browser mock owner remains `pwa/e2e/mock-api.ts`; source contracts remain `specs/openapi.yaml` and the generated client.

Reuse [member presentation preferences](../../specs/member-preferences/spec.md), [assignment and recovery](../../specs/meal-assignment/spec.md), [quality and review](../../specs/recipe-quality/spec.md), [editing](../../specs/recipe-editing/spec.md), [recycle-bin behavior](../../specs/recipe-recycle-bin/spec.md) and [live invalidation](../../specs/household-live-updates/spec.md). No new ownership of those behaviors is introduced.

Reported baseline: four existing unit suites passed, 95 tests total. This is supplied historical evidence, not verification of the proposed interactions or layout. See the design and tasks for source evidence, review findings and acceptance still required.
