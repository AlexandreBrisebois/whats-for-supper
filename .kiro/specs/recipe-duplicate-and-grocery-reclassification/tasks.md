# Tasks: Duplicate Recipe Reporting and Grocery Reclassification Repair

## Execution contract

- Execute one numbered slice at a time.
- Every slice follows Contract → Tests (red) → Implementation (green).
- Stop at slice boundaries with changed files, passed checks, blocked checks, and remaining risks.
- Preserve unrelated worktree changes.
- Do not implement duplicate matching/merging or a new grocery synchronization channel.
- Run `task agent:finish` exactly once, in the final closure slice.

## Dependency graph

```json
{
  "waves": [
    {
      "wave": 1,
      "parallel": [
        "1-duplicate-contract-and-persistence",
        "4-grocery-regression-repair"
      ]
    },
    {
      "wave": 2,
      "sequential": [
        "2-duplicate-api-lifecycle",
        "3-duplicate-pwa-and-digital-twin"
      ]
    },
    {
      "wave": 3,
      "sequential": [
        "5-end-to-end-closure"
      ]
    }
  ]
}
```

Workstreams A and B are product-independent. Do not run them with parallel agents unless explicitly authorized; the graph only records file/dependency independence.

## 1. [x] Duplicate contract and persistence seam

**Goal:** Make `duplicate` legal and durable across clean installs, existing databases, EF metadata, OpenAPI, and generated clients before runtime logic changes.

**Model fit:** MEDIUM — cross-authority constraint and generated-contract work.

**Requirements:** DR-1, DR-5

**Tests first:**

1. Extend `api/src/RecipeApi.Tests/Integration/SchemaIntegrityTests.cs` with failing assertions that `schema.sql`, `compatibility.sql`, and EF metadata allow exactly `ingredients`, `steps`, and `duplicate`, while rejecting duplicates and unknown values.
2. Add a compatibility regression proving a currently installed `recipe_import_reports_reasons_check` containing `array_positions` but not `duplicate` is replaced.
3. Extend `pwa/src/lib/api/recipe-import-report-contract.test.ts` to require `RecipeImportIssueReasonObject.Duplicate` without weakening existing field checks.
4. Reach the red state before editing contract/schema authorities.

**Implementation:**

1. Add `duplicate` to `RecipeImportIssueReason` and high-fidelity duplicate-only/mixed OpenAPI examples.
2. Update the reasons constraint in `api/database/schema.sql`.
3. Update `api/database/compatibility.sql` so existing two-reason constraints are reliably dropped and recreated.
4. Update the EF constraint in `api/src/RecipeApi/Data/RecipeDbContext.cs`.
5. Regenerate the Kiota client through the repository task; do not hand-edit generated files.

**Forbidden zones:**

- No new table, column, endpoint, status, or migration framework.
- No API service/UI behavior in this slice.

**Validation:**

1. `task gen:client:check`
2. `task agent:drift:schemas`
3. `task test:api`
4. `task test:unit`

**Escalate if:** clean-install and compatibility authorities cannot express equivalent constraints, or client generation changes unrelated schemas.

## 2. [x] Duplicate eligibility and lifecycle behavior

**Depends on:** Slice 1

**Goal:** Accept universal duplicate-only reports while keeping content reasons and re-import transitions semantically correct.

**Model fit:** MEDIUM — guarded relational/InMemory state transitions.

**Requirements:** DR-2, DR-4, DR-5

**Tests first:**

1. Extend `RecipeImportReportIntegrationTests` with the full eligibility matrix:
   - reimportable: every valid non-empty subset accepted;
   - non-reimportable: duplicate-only accepted;
   - non-reimportable: any set containing ingredients/steps rejected;
   - invalid/empty/repeated reasons rejected.
2. Add tracked and relational lifecycle tests proving:
   - duplicate-only attempt start is a complete no-op;
   - content-only success becomes ready-to-review;
   - mixed success becomes reported and retains all reasons;
   - mixed failure and stale-instance behavior preserve existing guards.
3. Extend management backup/restore tests with duplicate-only and mixed rows.
4. Reach red before changing `RecipeImportReportService`.

**Implementation:**

1. Expand `AllowedReasons` and validation copy.
2. Replace whole-recipe eligibility with content-reason eligibility after normalization.
3. Guard `MarkAttemptStartedAsync` against duplicate-only rows in relational and tracked paths.
4. Branch matching success status on persisted presence of `duplicate`, preserving timestamps and error clearing from the design.
5. Preserve active-report recommendation exclusion and public status collapsing.

**Forbidden zones:**

- No duplicate lookup, merge, deletion, history, or new status.
- No change to non-import workflows.

**Validation:**

1. `task test:api`
2. `task agent:drift:schemas`
3. `task gate`

**Escalate if:** the relational bulk-update path cannot branch atomically on the text-array contents or a duplicate-only report is created by re-import rather than explicit reporting.

## 3. [x] Universal duplicate-reporting UI and mock parity

**Depends on:** Slice 2

**Goal:** Let users report duplicates from any recipe without adding irrelevant controls to Cook Mode.

**Model fit:** SMALL_SAFE — bounded UI extension after contract/lifecycle are fixed.

**Requirements:** DR-2, DR-3, DR-5

**Tests first:**

1. Extend action-menu/detail tests so the report/review action exists when `canReimport=false`, while the re-import action remains hidden.
2. Extend issue-sheet tests for duplicate-only, all mixed combinations, prepopulation, no-reason copy, and content-reason eligibility.
3. Add a regression proving Cook Mode exposes only contextual ingredients/steps controls.
4. Extend `recipe-import-reporting.spec.ts` and its stateful mock for duplicate-only save on a non-reimportable recipe and mixed-report success returning Reported.
5. Use only the data-test IDs from `design.md`; reach red first.

**Implementation:**

1. Make the detail report action universal and use non-import-specific visible copy.
2. Pass content eligibility into `RecipeImportIssueSheet`.
3. Add the thumb-sized Duplicate reason control and accessible ineligibility explanation.
4. Update empty-reason guidance to name all available options dynamically.
5. Update the stateful Playwright mock to preserve all three reasons and conditional lifecycle output.

**Forbidden zones:**

- No duplicate action in Cook Mode.
- No new sheet, store, permanent card action, or visual overhaul.

**Validation:**

1. `task test:unit`
2. `task agent:audit AREA=recipe-import-reporting`
3. `task gate`

**Escalate if:** universal report visibility conflicts with an authorization rule rather than `canReimport` eligibility.

## 4. [x] Grocery category regression repair

**Goal:** Restore immediate visible category movement after the existing PATCH succeeds, with deterministic failure and race handling.

**Model fit:** SMALL_SAFE — PWA-only state repair with an established API seam.

**Requirements:** GR-1, GR-2, GR-3

**Tests first:**

1. In `GroceryList.test.tsx`, add a failing regression that selects a new category and asserts the item disappears from the source aisle and appears in the destination aisle after the mocked PATCH resolves.
2. Add unit coverage for failure/no movement, same-section no duplication, checked-state preservation, pending double-tap prevention, and response-after-week-navigation no-op.
3. Add/extend a `weekStore` test for immutable replacement by `normalizedKey` and authoritative snapshot overwrite.
4. Add E2E coverage in `pwa/e2e/grocery.spec.ts` using only indexed test IDs, with the PATCH mock returning `204` and the next schedule response returning the persisted section.
5. Reach red before editing production code.

**Implementation:**

1. Add the minimal `weekStore` action that updates one item's section by normalized key.
2. In `GroceryList`, record the starting week and pending normalized key.
3. After PATCH success, apply the store action only if the same week remains loaded; close the picker and clear pending state.
4. On failure, do not mutate the store; expose the existing scoped error and allow retry.
5. Do not change `useScheduleStream`, the PATCH contract, backend services, SQL, or recomputation unless the focused red test demonstrates a second defect.

**Forbidden zones:**

- No component-local grocery-items shadow state.
- No new SSE event/payload, backend endpoint, schema change, or adjacent grocery refactor.

**Validation:**

1. `task test:unit`
2. `task agent:audit AREA=grocery`
3. `task gate`

**Escalate if:** the focused API integration test shows the PATCH fails to persist/recompute, or `normalizedKey` is absent in a real schedule response.

## 5. [ ] End-to-end closure and integrity review

**Depends on:** Slices 2, 3, and 4

**Goal:** Prove both correction paths and close contract, SQL, mock, accessibility, and regression gaps without expanding scope.

**Model fit:** MEDIUM — cross-layer verification and drift diagnosis.

**Requirements:** All

**Tests first:**

1. Complete any missing E2E assertions before production repairs.
2. Prove duplicate-only reporting on a non-reimportable recipe, mixed re-import returning Reported, manual resolution, and content-only Ready to review regression.
3. Prove grocery category movement, failed selection stability, retry, and authoritative mocked reconciliation.

**Implementation:**

1. Fix only defects exposed by the closure tests.
2. Reconcile OpenAPI, SQL authorities, EF metadata, runtime DTOs, generated client, mocks, and backup/restore.
3. Verify Mère-Designer constraints: no Cook Mode clutter, thumb targets remain adequate, selected states are not color-only, and neither flow leaves a dead end.

**Validation:**

1. `task gen:client:check`
2. `task agent:drift:schemas`
3. `task test:api`
4. `task test:unit`
5. `task test:e2e`
6. `task agent:audit AREA=recipe-import-reporting`
7. `task agent:audit AREA=grocery`
8. `task gate`
9. `task agent:finish` exactly once

**Done when:** all applicable checks pass; environment-blocked checks are reported separately with evidence; no implementation task remains hidden in Risks.

**Escalate if:** validation reveals a contract or persistence dependency not listed in the seam inventories, or required E2E execution is blocked by the local-server environment.

## First-batch execution prompts

```yaml
- id: duplicate-report-contract-persistence
  title: Add duplicate to the recipe report contract and persistence authorities
  model_fit: MEDIUM
  required_context:
    - .kiro/specs/recipe-duplicate-and-grocery-reclassification/requirements.md
    - .kiro/specs/recipe-duplicate-and-grocery-reclassification/design.md
  slice: 1
  tests_first: true
  stop_after_slice: true

- id: grocery-reclassification-visible-state
  title: Restore immediate grocery item movement after category selection
  model_fit: SMALL_SAFE
  required_context:
    - .kiro/specs/recipe-duplicate-and-grocery-reclassification/requirements.md
    - .kiro/specs/recipe-duplicate-and-grocery-reclassification/design.md
  slice: 4
  tests_first: true
  stop_after_slice: true
```
