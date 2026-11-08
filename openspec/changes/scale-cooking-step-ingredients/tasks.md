# Tasks

Planning only; every implementation box remains unchecked. Separate approval is required to apply. Names of new tests below are proposed suites to create; no behavioral test has run in this spec session. Follow [shared corpus](../canonical-ingredient-correction/acceptance-corpus.md) and [CI requirements](../canonical-ingredient-correction/review.md). Alex’s allocation, range, split/merge and fresh-list decisions are settled. Remaining engineering/dataset qualification does not authorize implementation. Contract changes first update `specs/openapi.yaml`, run `task gen:client`, then synchronize generated SDK consumers and method-sensitive `pwa/e2e/mock-api.ts` handlers/builders/state transitions including conflicts, later reads and SSE. Every slice keeps its red/green evidence and usage documentation.

## 1. Project one proven whole use coherently

**Outcome/scenarios:** C01–C03, C12–C18, C46; validated step projection without extra demand.
**Owners/boundaries:** existing projection endpoints, canonical IDs/bindings, CooksMode/stepParser, Home/detail/Cook and PostgreSQL. Depends on canonical foundation; independent of dictionary completeness.

- [ ] 1.1 Transcribe approved binding/span/role/coverage/context shapes to OpenAPI and regenerate client. Add proposed `CookingStepScalingPostgresTests`, CooksMode units and `cooking-step-scaling.spec.ts`: original 200→250 whole use at target eight, one demand, stale/repeated/Unicode/overlap spans, no time/temp/package replacement. Run `task test:database -- --filter FullyQualifiedName~CookingStepScalingPostgresTests` and `task test:e2e -- cooking-step-scaling.spec.ts` before projection logic. Add GET projection and guarded instruction PATCH mocks including revision conflict and later reads.
- [ ] 1.2 Implement validated whole/absolute original-basis projection with coherent revision install and original draft editing; run 1.1 green, `task test:unit -- src/components/planner/CooksMode.test.tsx src/lib/cooking/stepParser.test.ts src/testing/mock-api.test.ts` and client check. Add proposed real `LiveBrowser_CookingStepScaling` via `WFS_CALENDAR_LIVE=1 task test:database -- --filter FullyQualifiedName~LiveBrowser_CookingStepScaling`; prove Home→detail→Cook agrees and groceries count once with actual API/DB.

## 2. Support bounded allocation forms and quiet uncertainty

**Outcome/scenarios:** C02–C06, C12–C13, C45–C46; supported roles, remainder evidence and nonblocking uncertainty.
**Owners/boundaries:** validated allocation graph and same shared projection/rendering. Depends on group 1; arbitrary formula/recipe nesting excluded.

- [ ] 2.1 Add intended-red `CookingStepAllocationTests` plus PostgreSQL cases for two 1 tbsp uses, absolute 50 g, half, known/unknown/incompatible/correlated-range remainder, alternatives, fixed/per-item count-dose and over-allocation. Run `task test:api -- --filter FullyQualifiedName~CookingStepAllocationTests` plus CookingStepScalingPostgresTests filter before logic; implement role validation/rendering in that bounded slice and run green. Verify grocery demand independent of binding count and source text unchanged where uncertain.
- [ ] 2.2 Add mixed valid/uncertain UI, step text edit conflict, explicit refresh and no-clutter EN/FR cases to existing cooking and original-source browser/unit owners before UI changes. Run red→green focused CooksMode units, `task test:e2e:ci -- cook-mode-steps.spec.ts cooking-instruction-recovery.spec.ts --workers=4 --retries=0`, and actual API/PostgreSQL concurrency. Document one contextual notice, retained work and completion availability.

- [ ] 2.3 Implement the approved ingredient-total reconciliation rule only after intended-red `CookingStepAllocationTests` and PostgreSQL cases: 200→250 total keeps explicit 50 original/75 at factor 1.5, half becomes half of corrected total, whole follows total, and reduction below exhaustive uses invalidates affected remainder quietly. Run the group 2 unit/database/browser commands red→green with guarded PATCH and stateful mocks; assert no redistribution, no extra grocery demand, and no cooking/completion block. Retain evidence and document this approved rule.

## 3. Preserve prepared and active cooking contexts

**Outcome/scenarios:** C17–C21, C43, C49; current recipe at recorded count and report-triggered refresh.
**Owners/boundaries:** context resolver, preparation receipts, CooksMode explicit content refresh and quality submission. Depends on groups 1–2 and unchanged cooked-baseline protections.

- [ ] 3.1 Add intended-red current-recipe/prepared-count and report-response coherent refresh tests to `PreparedSupperPostgresTests`, `SupperServingsPostgresTests`, `CooksMode.sse.test.tsx`, `prepared-supper.spec.ts` and `supper-servings-context.spec.ts`. Run focused database and unit/browser commands before extending consumers; retain recorded null/original contexts and no historical snapshot assertion.
- [ ] 3.2 Implement those bounded consumer changes and run 3.1 green plus current cooked-baseline/serving movement regression filters and `task test:e2e:ci -- prepared-supper.spec.ts supper-servings-context.spec.ts supper-servings-movement.spec.ts --workers=4 --retries=0`. Prove stale refresh cannot change receipt/date/count, active session installs one revision, reports/repairs remain available, and source overlays/bookmarks/drafts/offset survive; document current-content historical reading.

## 4. Final integration and verification

- [ ] 4.1 Reconcile this unit's corpus outcomes and preservation boundaries, run `task gen:client:check` where APIs changed, review the complete task-owned diff, then `task prepare -- <reviewed paths>` when applicable and `task verify -- <reviewed paths>`. Record invocation-specific record_path and actual passed/failed/blocked/skipped/not-run outcomes. Qualify required real seams with zero required skips and the parity owner's production/hosted-candidate requirements; no completion from mocked-only reads or missing stages.
