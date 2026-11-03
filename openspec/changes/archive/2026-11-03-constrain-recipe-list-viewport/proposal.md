# Proposal

## Why

At 200% text the Recipes list can extend below its dock-bounded canvas: CI measured 42.23px of container overlap, and five local frame captures settled at 82.5px. The existing immediate geometry test can also pass before that overflow develops, so it does not reliably establish the existing viewport contract.

## Outcome and Scope

A loaded list must shrink to the space remaining above the actual dock when its controls fit, and its final recipe must remain reachable through list scrolling. If controls cannot fit, retain intentional vertical scrolling and usable recipe activation instead of forcing a complete card to fit or collapsing results into an unusable scrollport. Preserve stack sizing, centering, depth, gestures and family actions, and all collection/request semantics.

This is a separate correction to pre-existing list layout, not an extension of the archived stack-depth change. No unresolved product decision blocks the proposal; exact CSS constraints remain a bounded implementation detail subject to the acceptance checks.

## What Changes

- Allow list results to use the dock-bounded remaining height without an enlarged minimum pushing the scrollport below the dock.
- Check settled geometry after text/viewport reflow, retaining the existing 0–8 CSS px dock-gap requirement when controls fit.
- Verify the last recipe and its keyboard activation/focus are reachable after scrolling and appended pages, including English/French and enlarged text.
- Retain existing short-screen fallback, toolbar, grid gutters, full recipe names and stack behavior. No breaking API or data change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: clarify `Use the visible region above the Recipes dock for results` for a settled, shrinkable list viewport and final-item reachability, preserving its existing scenarios.

## Impact

- Expected implementation owner: `pwa/src/app/(app)/recipes/RecipesExperience.tsx`, specifically the shared results wrapper's list sizing. Keep the existing dock/visual-viewport measurement owner.
- Browser acceptance: `pwa/e2e/unified-recipes.spec.ts`, using the existing fixtures, generated recipe DTO builders and API boundary mocks. Nearby list pagination, Search and stack regressions remain preservation checks.
- No backend, OpenAPI, generated client, shared navigation, card design, voting, persisted preferences or dependency changes are planned.
- Evidence: CI run 41706741645, recipes job 126165503093; local `/tmp/wfs-dock-diagnostic/` and `/tmp/wfs-dock-current.log`. These observations establish the current defect, not a verified correction.
