# Retained grocery acknowledgement checkpoint — 2026-11-07

This is implementation evidence, not completion of group 1 or 2. All seven task boxes remain unchecked. The user-approved unit rule remains cup/tsp/tbsp alias normalization within each family, with no automatic metric or cross-family conversion. No specification sync/archive, staging, commit, push, CI trigger, deployment, production-service test, DV/port-3000 change, worker or replacement-session launch occurred.

## Implemented behavior

- Store server-owned checked-demand baselines in `weekly_plans.grocery_checked_demand_baselines`, separate from the public row DTO. Clean-install schema and additive compatibility DDL preserve existing rows and use an empty map for previously unrecorded acknowledgements. No baseline is inferred during upgrade.
- Item and guarded bulk writes capture authoritative quantity/completeness/unit/identity and acknowledgement row version only on false→true. Redundant true writes, identical mutation replays and entries remaining true preserve the baseline. Explicit or proven-increase unchecks clear it. Mutation, versions and baseline save use the existing coordinated transaction.
- Recompute compares exact current minimum against retained baseline maximum, preserves overlaps/decreases/unknown comparisons, and resets once for a proven increase. A later real recheck captures a fresh baseline. Invalid baseline containers/entries are diagnosed and remain unknown; they do not authorize inferring an acknowledgement from current demand.
- Compare persisted JSON by content, because PostgreSQL JSONB reorders object properties. An unchanged recompute must not advance list versions solely from serialization spelling. A real PostgreSQL regression caught the original defect.
- Remove `checkReviewReason` from OpenAPI, generated SDK, DTO/converter, marker UI, both locale strings, acknowledgement cleanup and mock generation. Tests deliberately feed retired metadata to prove it cannot restore the warning. Known subtotals and source consultation remain.
- Stateful mock row ownership retains its own acknowledgement baseline rather than comparing adjacent projections; the former portions mock reset/marker oracle is removed. Current coverage proves the new range/unknown behavior, not every legacy fixture in broader browser suites.
- Reconcile old name-state/merge-inheritance, implicit-count and culinary-conversion fixtures against approved contracts. Legacy name-state cases now prove the safety fence preserves historical data; they do not prove current-format structural split/merge acceptance. Planner movement and stream fixtures use valid rows/guarded checks.
- Catch request-aborted cancellation in the live fixture's development proxy. Earlier response-started errors originated at `/_next/hmr` proxy copying, not at demonstrated grocery SSE publication. No production middleware exception policy was changed.

## Executed evidence and candidates

Detailed logs, before-images, session diff, input hashes and cleanup records: `.task/grocery-baseline-20261107/`.

| Check | Actual outcome |
| --- | --- |
| New retained-baseline service regressions | Intended red: 6 failed/1 passed. Green: 7 passed. After corrupt-container regressions: 9 passed/0 skipped. |
| Corrupt-container regressions | Intended red: 2 failed/0 passed; then included in the 9-pass green. |
| Retired marker components | Intended red: 3 failed/85 passed; then 88 passed. |
| Stateful mock baseline regressions | Intended red: 5 failed; then green, including later broad unit run. |
| First full API run | 6 failed/1,435 passed/293 skipped: stale calendar-stream and movement fixtures. Reconciled, without relaxing the legacy fence. |
| Final full API | `api-full-final.log`: 1,443 passed/293 opt-in or platform skips/0 failed. Required relational/live cases are qualified separately below. |
| First full frontend unit run | 2 failed/1,846 passed: missing snapshot mock method and absent row/version fixture data. |
| Final frontend unit suite | `units-final.log`: 1,848 passed in 125 files, 0 failed. |
| Initial PostgreSQL run | 21 passed/1 failed/0 skipped; failure proved unchanged JSONB recompute advanced list version. Source mutation also invalidated final-content qualification. Failed record `53d2082dc7c84b47a30b733a11d33eaa` is retained. |
| Final focused PostgreSQL | 22 passed/0 skipped. Record `.task/database-tests/runs/1490624d695e4183b111802463cc4c8d/result.json`, tested identity `e0c32a068ed4e490a40fee85a9e17c40d15a088fe409124d145e2aa49cc331e6`. Includes range/bulk/replay/fresh-scope behavior and exact snapshot baseline association. Every copied API/Taskfile/global input matched the current checkout at subsequent source review. Owned DB/SDK/network removed. |
| Isolated development browser | First: 22 passed/4 failed. Second: 22 passed/4 source-case timeouts. One-case diagnostic: timeout. Final `browser-third.log`: all 26 passed/0 retries. English/French, phone/tablet and 320 px/200% source consultation retained. This is development runtime and mocked API evidence. |
| Real two-client browser/API/PostgreSQL method | `live.log`, `live-results/grocery-live.trx`: 1 method passed/0 skipped; nested actual browser case passed and live endpoint drift ran. `live-captured-stdout.log` contains zero response-started/read-only-header/unhandled-exception messages; expected missing-hero warnings remain. Disposable database removed; fixture owns and removes its temporary PWA/API resources. |
| Generation/check | Sandboxed generation timed out once. Supported escalation passed `task gen:client`; scoped preparation generated again; final `task gen:client:check` passed. No generated hand edits. |
| Static checks | Scoped preparation passed; final types, scoped ESLint and diff whitespace passed. A transient duplicate fixture field introduced during reconciliation was caught by TypeScript and removed before final `types-final.log`/`units-final.log`. |

Browser fixture diagnosis preserved the original assertions' purpose: count application `/api/` mutations instead of Next development diagnostics; explicitly return to groceries after consultation; close the full-screen grocery view before navigating underneath it. Checked state and subtotal are explicitly asserted after reopening. Heavy output backpressure was investigated but the one-case diagnostic did not support it as the timeout cause.

## Remaining acceptance, not waived

- Group 1 still needs complete lifecycle/precision and real-seam review. Current recompute continues by demand identity only. It has no contributor-lineage owner proving unmatched incompatible-unit continuation, and the new legacy-fence tests are not a substitute for current-format structural split/merge coverage. Review source-precision refinement versus real demand increase now that baseline resets exist; no fraction may be guessed from rounded decimals.
- Group 2 remains incomplete: reconcile all required scenario/corpus coverage, baseline identity/version integrity, real recompute/check races with measured demands, existing legacy-marked live fixture paths and the broader servings/source browser owners. The selected 22 PostgreSQL cases and one live tracer do not cover every specified baseline transition or the full recovery suite. Additive compatibility DDL has not been rehearsed through the complete existing-data migration runner.
- Group 3 is untouched in this session. `mutateExtra` still focuses Edit after successful checkbox mutations, normal checked/unchecked branches still replace controls, and category parity/focus/scroll acceptance remains to implement.
- Full database suite, full impact browser qualification, complete task-path scope/generated closure review and `task verify` have not run. Scoped preparation is not a final verification claim.
- Required shared production-browser path binds host port 3000; the task forbids altering DV/port 3000. Its owner file `scripts/ci/production-browser.cjs` is protected by `.task/browser-parity/owned-paths.txt`. No protected file was changed, and the host production-browser runner was not invoked. Use a correctly isolated supported runtime or coordinate with that owner; development passes cannot replace it. Hosted same-candidate qualification remains not-run and CI must not be triggered in this scope.
- No later canonical, cooking-step, bilingual or migration implementation was started. They remain in the approved dependency order after grocery acceptance.

All 26 protected-path entry hashes match. The source-copy server on private port 3119 is stopped and its temporary copy removed. Cleanup/source-state records and the precise continuation handoff live in the task evidence directory; the parent arranges any fresh session.
