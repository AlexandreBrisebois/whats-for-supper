# Tasks

Planning only; every implementation box remains unchecked. Separate approval is required to apply. Names of new tests below are proposed suites to create; no behavioral test has run in this spec session. Follow [shared corpus](../canonical-ingredient-correction/acceptance-corpus.md) and [CI requirements](../canonical-ingredient-correction/review.md). Alex’s allocation, range, split/merge and fresh-list decisions are settled. Remaining engineering/dataset qualification does not authorize implementation. Contract changes first update `specs/openapi.yaml`, run `task gen:client`, then synchronize generated SDK consumers and method-sensitive `pwa/e2e/mock-api.ts` handlers/builders/state transitions including conflicts, later reads and SSE. Every slice keeps its red/green evidence and usage documentation.

## 1. Independently check displayed rows

**Outcome/scenarios:** C26–C32; stable check identity, optimistic and persisted state.
**Owners/boundaries:** schedule GET, item/bulk PATCH, check coordinator/recompute, PostgreSQL, GroceryList and method-sensitive mock. Prerequisites: approved shared row/version contract; split/merge and range behavior are accepted, with the fresh-list upgrade contract owned by migration.

- [ ] 1.1 Define approved schedule/item/bulk/SSE row-version shapes in OpenAPI and regenerate client. Add water buckets plus same-name extra to `GroceryCheckConcurrencyPostgresTests`, GroceryList units and `grocery.spec.ts`; run `task test:database -- --filter FullyQualifiedName~GroceryCheckConcurrencyPostgresTests` and `task test:e2e -- grocery.spec.ts` for intended red before logic. Add version-conflict, name-only rejection, late response and stateful GET/PATCH mock cases.
- [ ] 1.2 Implement stable row identity and guarded writes through existing coordinator; run 1.1 green and `task test:unit -- src/components/planner/GroceryList.test.tsx src/testing/mock-api.test.ts`, `task gen:client:check`. Prove independent checks via actual API/PostgreSQL fresh scope, preserved extras and absolute-week rollover rejection. Document supported single-instance coordination.

## 2. Preserve checks honestly when demand changes

**Outcome/scenarios:** C27–C32, C35; only proven increases reset continuing rows, no review workflow.
**Owners/boundaries:** exact demand comparison, recompute+check persistence, DTOs and EN/FR UI. Depends on group 1 and the accepted range/continuity contract; new-list upgrade is owned by migration.

- [ ] 2.1 Add intended-red recompute/unit and `GroceryCheckConcurrencyPostgresTests` cases for equivalent 500 g/0.5 kg, complete increase, decrease, unknown→known, incompatible units, range proof against persisted checked baseline, cumulative 2–3→3–4→4–5, interim decrease, false→true recheck, redundant true/bulk/replay baseline preservation, unknown-baseline honesty, late check and unchanged retry. Add locale absence assertions to `GroceryList.refinement.test.tsx` and `grocery-recipe-sources.spec.ts`; run focused database/unit/browser commands before logic.
- [ ] 2.2 Persist checked-demand baselines atomically with unchecked→checked transitions and implement approved comparison against that retained baseline at the coordinated processing position and remove prior-unknown marker, DTO/ack transitions and both-locale warning/reserved space. Run 2.1 green plus real API/DB recompute race and `task test:e2e:ci -- grocery.spec.ts grocery-recipe-sources.spec.ts --workers=4 --retries=0`. Assert only affected continuing row resets once, later checks survive and known subtotals remain honest; document structural new-row behavior separately.

## 3. Keep shopping focus and category interaction dependable

**Outcome/scenarios:** C33–C35, C49; no checkbox scroll-to-Edit and correct normal/extra scopes.
**Owners/boundaries:** GroceryList stable DOM/focus/sort, normal category and extra occurrence APIs. Depends on group 1; category IDs later reuse bilingual contract.

- [ ] 3.1 Add intended-red pointer/touch/Enter/Space tests for extra/normal sort and future-extra disappearance, actual viewport/focus assertions, and normal-vs-extra tag interaction/icon parity in existing grocery browser/unit owners. Run `task test:unit -- src/components/planner/GroceryList.refinement.test.tsx` and `task test:e2e -- grocery.spec.ts` before focus changes.
- [ ] 3.2 Implement scoped focus handling and category-control parity, run 3.1 green on phone/tablet EN/FR and 200% text, then actual category/extra API→PostgreSQL checks proving ingredient scope versus one-occurrence scope. Preserve extra composer/history and contributor disclosure; document visual review and actual scroll/focus evidence.

**Cutover boundary:** migration confirms no active list and creates a fresh unchecked recipe-derived list, preserving historical data and extras. There is no pending ambiguous-active-check transition decision; unexpected active-list evidence must stop/report rather than authorize deletion.

## 4. Final integration and verification

- [ ] 4.1 Reconcile this unit's corpus outcomes and preservation boundaries, run `task gen:client:check` where APIs changed, review the complete task-owned diff, then `task prepare -- <reviewed paths>` when applicable and `task verify -- <reviewed paths>`. Record invocation-specific record_path and actual passed/failed/blocked/skipped/not-run outcomes. Qualify required real seams with zero required skips and the parity owner's production/hosted-candidate requirements; no completion from mocked-only reads or missing stages.
