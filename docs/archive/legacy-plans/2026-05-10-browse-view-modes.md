# Browse View Modes And Endless Navigation

## Summary

Add a persistent per-member browse mode to the Browse Library experience. The page will support the existing card stack and a new list/grid view. The list view is a fast scanning surface: no top pick, only adaptive recipe columns.

Mere-Designer opinion: this reduces mealtime anxiety. Cards are useful when the user wants a focused, one-recipe-at-a-time browsing rhythm; list view is better when a busy parent needs to scan quickly on iPad or web. The view toggle belongs before the All/Discovery filter because it changes the browsing mode before it changes the recipe set.

## Key Changes

- Add per-member browse preference:
  - Add `browse_view_mode text NOT NULL DEFAULT 'stack'` to `family_members`, constrained to `stack | list`.
  - Extend `FamilyMemberDto` and `specs/openapi.yaml` with `browseViewMode`.
  - Add `PUT /api/family/{id}/preferences` accepting `{ browseViewMode: 'stack' | 'list' }` and returning the updated member.
  - Regenerate the PWA API client and update family API helpers/store to read and save the selected member's browse mode.

- Update `/browse-all-stack` into a two-mode browse page:
  - Keep the route stable.
  - Add a segmented pill at the top: `Cards` / `List`, placed before `All Recipes` / `Discovery Recipes`.
  - Load the selected member's saved mode on entry; default to `stack`.
  - On toggle, optimistically switch views and persist to the member preferences endpoint.

- Stack mode behavior:
  - Swap directions: swipe left means next, swipe right means back.
  - Show the empty/end card only when the full library has zero recipes.
  - For non-empty libraries, loop endlessly both ways with no end card.

- List mode behavior:
  - Do not render a top-pick hero.
  - Render only recipe cards in an adaptive grid: 2 columns on mobile/tablet widths and 3 columns on wider screens.
  - Use page size `12`.
  - Use IntersectionObserver infinite scroll with deduped recipe IDs.
  - Prefetch before the user reaches the end, while keeping a bounded retained window so long sessions do not grow memory endlessly.

## Test Plan

- API and contract tests:
  - `FamilyMemberDto` includes `browseViewMode`.
  - `PUT /api/family/{id}/preferences` persists `stack` and `list`.
  - Invalid browse modes are rejected.
  - Updating preferences preserves the member name.
  - `task agent:drift` passes after client regeneration.

- PWA unit tests:
  - Saved member preference selects the initial browse mode.
  - Toggling mode calls the preference API and updates the UI.
  - Swipe left advances and swipe right backs up.
  - A non-empty stack never shows the end card.
  - An empty library still shows the empty capture CTA.
  - List mode requests pages of `12` and appends/deduplicates results.

- E2E tests:
  - User switches to List, leaves the page, returns, and List is restored.
  - Cards loop forward and backward with no end card for a non-empty library.
  - Empty library still shows the capture CTA.
  - List infinite scroll loads additional pages without a manual button.

## Assumptions

- Default browse mode is `stack`.
- Preference is stored per selected family member.
- Existing `/api/recipes?order=explore&page=&limit=&discoverableOnly=` remains the browse data source.
- Page size is `12` because it divides cleanly into 2- and 3-column layouts while keeping payloads modest.
