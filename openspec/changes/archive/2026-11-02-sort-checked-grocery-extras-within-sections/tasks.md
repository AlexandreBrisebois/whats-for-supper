# Tasks

## 1. Sort mixed grocery rows within each aisle

**Outcome and scenarios:** `grocery-shopping` / Order unchecked rows before checked rows within an aisle: Mixed rows in one aisle, Extra check and uncheck, Authoritative check state arrives, Failed extra check restores order; preserve Move down and back and Duplicate completion.

**Owners and boundaries:** `GroceryList` rendering and its component tests. Keep recipe check-map behavior, extra occurrence identity/version reconciliation, category grouping, counts, collapse, and future-week visibility unchanged. No API, database, generated-client, or method-sensitive mock changes.

**Dependencies and prerequisites:** Use source order from the supplied extra and recipe arrays. The existing grocery browser fixture already handles `PATCH /api/grocery-extras/{occurrenceId}` and schedule `GET` with checked occurrence state.

**Acceptance boundary:** Component tests exercise the actual checklist and week store for optimistic/authoritative ordering; Playwright exercises the planner grocery surface and existing stateful API mock. Mocked browser behavior does not establish production persistence, which is unchanged by this render-only fix.

- [x] 1.1 Add focused mixed-source ordering regressions in `pwa/src/components/planner/GroceryList.test.tsx` before production edits. Cover at least two extras and two recipe rows with mixed checks, including duplicate extra names, unchanged count, and stable source order within each check group. Run `task test:unit -- src/components/planner/GroceryList.test.tsx` and record the intended behavioral red result, not a tooling failure.
- [x] 1.2 Add a stable occurrence identity attribute to extra row markup and replace the live positional `rows.first()` locator in `pwa/e2e/grocery.spec.ts` with an identity-scoped locator **before** enabling row sorting. Add Playwright order assertions for an extra check and reload. Keep the existing duplicate-extra independent-action assertions. Run `task test:e2e -- e2e/grocery.spec.ts` and record the intended order assertion red result; the locator update itself must continue to address the same occurrence after reorder.
- [x] 1.3 Render unchecked extras, unchecked recipe rows, checked extras, then checked recipe rows within each aisle, without mutating the source arrays. Run `task test:unit -- src/components/planner/GroceryList.test.tsx` and `task test:e2e -- e2e/grocery.spec.ts` green. Verify check and uncheck movement, authoritative rerender/reload, failure rollback, duplicate independence, section counts, completed-aisle collapse, and unchanged `Extra` label/accessibility.

## 2. Final integration and verification

- [x] 2.1 Review the complete change-owned diff against the scenarios and preservation boundaries. Run `task spec:check -- sort-checked-grocery-extras-within-sections --type change`, `task verify:plan -- <complete reviewed changed-path set>`, and `task verify -- <same changed-path set>` after implementation. Record actual results, content identity, and verification `record_path`; mark tasks complete only when their required acceptance checks pass.

## Implementation evidence

- Unit red before render change: `task test:unit -- src/components/planner/GroceryList.test.tsx` failed 1 of 57 tests for the intended mixed-row order; checked Coffee appeared ahead of unchecked Coffee, Tea, and Rice.
- Browser red before render change: `task test:e2e -- e2e/grocery.spec.ts -g 'checked extras follow unchecked rows'` failed at the first order assertion with `Jam, Tea, Pasta, Tomato Sauce` instead of `Tea, Pasta, Tomato Sauce, Jam`. The sandbox initially denied the local server bind; the same test ran with approved local bind access. An earlier test attempt also exposed a fixture capitalization mismatch, corrected before the meaningful red run.
- Unit green after render change: `task test:unit -- src/components/planner/GroceryList.test.tsx` passed 59 of 59 tests, including optimistic check/uncheck, authoritative rerender, duplicate rows, count, and rejected-check rollback.
- Browser green after render change: `task test:e2e -- e2e/grocery.spec.ts` passed 20 of 20 Chromium tests, including the new mixed-section check/uncheck/reload path and the duplicate-extra identity-scoped interaction.
- `npx tsc --noEmit` passed after correcting the test fixture's generated section/date types. Focused ESLint and Prettier checks passed for the three grocery PWA paths. The screenshot's actual pixels remain unavailable because Library byte transfer failed; its metadata and extracted text were used only as supporting context.
- Final combined 29-path `task verify -- <reviewed paths>` passed on tested content identity `ae42ff182b7dc934349eaee565d3d11aa8dc39f0c2f82382f5406ca701fbd576`, record `.task/agent-finish/runs/0c6c5c09a11240eab312258f23cae788.json`. It passed strict OpenSpec validation (including this change), lint, Prettier, typecheck, 1,421 unit tests, browser impact (714 passed, 47 skipped), API tests (1,268 passed, 173 skipped), and static contract review. `task verify:plan` passed for the same selection before the gate. The harness did not itself evaluate task acceptance; the component and browser ordering/reload assertions above provide it. Skipped API/Postgres cases are not represented as passed.
