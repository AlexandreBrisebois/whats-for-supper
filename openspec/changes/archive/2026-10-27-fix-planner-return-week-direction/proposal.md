# Proposal

## Why

Source inspection shows that Back to this week always has a left-pointing chevron before its label. When viewing a past week, returning to this week moves forward in time, so that visual direction conflicts with the destination. Human designer feedback identified this mismatch; no runtime reproduction has been performed during planning.

## Outcome and Scope

For a negative selected week offset, show the existing label followed by a right-pointing chevron. For a positive selected offset, retain the left-pointing chevron before the label. At offset zero, keep the return control absent. Preserve the existing navigation destination, query-parameter handling, localization and accessible name.

## What Changes

- Make the return chevron direction and placement reflect the selected week's relation to this week.
- Add focused regression coverage for past, future and current weeks, including return navigation.
- Extend the existing meal-planning navigation requirement with these visual semantics.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-planning`: direction and placement of the return-to-current-week arrow.

## Impact

- `pwa/src/app/(app)/planner/page.tsx`: return-control contents only; existing ChevronLeft and ChevronRight imports can be reused.
- `pwa/src/app/(app)/planner/page.test.tsx` and `pwa/e2e/planner.spec.ts`: focused rendering and navigation assertions.
- No API, generated client, persistence, locale-value or dependency changes.
- Independent of `remove-planner-planned-count`: the changes touch different controls and different requirements in the same capability. Preserve that plan and reconcile shared-file edits if implementation overlaps.

No consequential unresolved decisions remain. Other Planner styling, contrast, drag and grocery changes are outside this increment.
