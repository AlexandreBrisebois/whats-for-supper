# GROC-01 — Derived weekly grocery list: requirements

## Status

- **Status:** Implemented capability baseline.
- **Kind:** Capability baseline; behavior-first.

## Outcome

The planner shows a grocery checklist for the selected week, derived from recipes assigned to that week's calendar days.

## Implemented behavior

- **GROC-01-AC-01 — Week-derived lines.** `GET /api/schedule?weekOffset={n}` returns that week's `groceryItems` with the schedule. `weekStore` retains the returned items and the planner renders them through `GroceryList`.
- **GROC-01-AC-02 — Recompute and aggregation.** Schedule assignment, removal, move, and defer paths recompute affected weeks. `GroceryRecomputeService` reads structured recipe `supply` entries, falls back to stored ingredients when needed, normalizes names, aggregates compatible quantities by normalized ingredient and unit bucket, retains contributing `recipeIds`, and persists the resulting JSON on `WeeklyPlan`.
- **GROC-01-AC-03 — Aisle presentation.** Each line has a server-resolved section: a saved ingredient category takes precedence over the server keyword mapper. The browser groups the returned lines in the fixed aisle order, places checked rows after unchecked rows, renders quantity/unit hints, and supplies an empty-list path back to planning.
- **GROC-01-AC-04 — Week and stream refresh.** `weekStore.init` and `sync` load the selected offset; snapshots from `week_updated` replace `groceryItems` only for that offset. Assignment fetches the schedule after success; remove and local reclassification have narrower local updates.
- **GROC-01-AC-05 — State preservation.** Recompute preserves the persisted grocery check-state map, removing keys only when a prior line disappears or no longer matches the new line's normalized/legacy key and display name. It creates an otherwise absent `WeeklyPlan` when recomputing a week.

## Scope and boundaries

This packet owns the derived grocery-line representation and planner display. `plan-02-meal-assignment-replacement` and `plan-03-schedule-movement-exceptions` own schedule commands that trigger recomputation. `plat-04-ingredient-categorization` owns normalization, stored category authority, and background categorization; GROC-03 owns the correction interaction. GROC-02 owns checked-state commands and convergence.

It does not define recipe parsing, schedule semantics, category vocabulary, or SSE transport.

## Current limitations

- Grocery lines are precomputed only after covered schedule mutations; this baseline makes no freshness guarantee for direct recipe-content edits outside those paths.
- The durable checked-state map and single-item command are keyed by `displayName`, even though display rows are distinguished by normalized key/unit. Equal display names therefore share a check state.
- The browser's initial empty state is populated locally from displayed items when no grocery state arrived; it is not persisted until a toggle.
- `GroceryList` has no explicit list-loading or list-fetch error surface; it receives items from the planner store.
- The fallback to raw ingredient strings cannot provide structured quantities or units.

## Preserved behavior

The API remains the source of grocery line data. Aisle grouping is presentation-only; unknown sections fall into `Grocery`. The feature remains usable with an empty week and does not alter recipes, votes, or another week's plan.
