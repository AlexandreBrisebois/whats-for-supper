# Design

## Context and Existing Ownership

`GroceryList` groups extras by `grocerySection` and recipe lines by `section` without changing either source array's order (`pwa/src/components/planner/GroceryList.tsx:285-303`). Within an aisle it partitions recipe lines by the display-name check map (`:668-675`), then renders every extra before those lines (`:765-766`). The extra checkbox instead reads its occurrence's `checked` field and uses identity-based optimistic mutation (`:171-219`, `:471-481`). The week store upserts extras in place; schedule reads and `grocery_extras_updated` events reconcile them before passing them to this view. The existing `grocery-shopping` requirement owns visual ordering, and its identity and reconciliation requirements own the check states.

The Library screenshot's extracted text describes the Pantry section and identifies checked and extra rows, but its original image bytes could not be transferred for pixel inspection. This design relies on source and the approved contract rather than claims about unverified screenshot geometry.

## Decisions and Tradeoffs

1. Partition each aisle's extra rows into unchecked and checked groups and place them around the already-partitioned recipe rows: unchecked extras, unchecked recipe rows, checked extras, checked recipe rows. This makes the existing source-first presentation stable within each check group and applies the same aisle rule to both source types. It avoids introducing a new cross-source name sort or changing server order.
2. Derive order at render time from the loaded check state. Do not mutate the incoming arrays or store an independent position. An optimistic extra check, authoritative response, failed mutation rollback, fresh schedule read, or eligible household event then uses the same ordering path.
3. Give each rendered extra row a test-only stable identity attribute and change the duplicate-extra Playwright interaction to locate the intended occurrence by identity before enabling reorder. Its current `rows.first()` locator is live and would select a different occurrence after a check. The identity attribute does not change the visible row or API contract.

## First Observable Slice

Render one aisle containing at least one unchecked recipe row and a checked extra. The extra appears below the unchecked row. Toggle another extra and observe its optimistic move, acknowledged position, and source-relative return on uncheck through the existing store-backed component. The browser seam is the grocery checklist with the existing stateful grocery mock handling `PATCH /api/grocery-extras/{occurrenceId}` and subsequent schedule `GET`; no new mock route or contract shape is required.

## State, Concurrency and Recovery

Ordering uses each extra's loaded `checked` value, not the recipe display-name map. Existing identity/version reconciliation remains authoritative. A failed or stale extra mutation that restores the prior occurrence also restores its prior position; a newer accepted occurrence takes the position implied by its check state. Future-week projections still omit checked current-week extras under the existing store contract. A completed aisle retains its existing collapse behavior.

## User Experience

Checked extras move to the bottom of their category, after all unchecked recipe rows, while retaining their `Extra` label and controls. The category header's count and completion status continue to include both row types. Row DOM order matches visual and keyboard order after each update.
