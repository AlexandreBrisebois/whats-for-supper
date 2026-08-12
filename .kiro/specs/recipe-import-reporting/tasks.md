# Recipe Import Issue Reporting — Tasks

## Execution contract

- Execute one numbered slice at a time with the repository task executor.
- Follow Contract → Tests → Implementation inside every slice.
- Use Taskfile commands for validation; do not substitute ad-hoc build/test commands when a task exists.
- Stop at each slice boundary with changed files, passed checks, blocked checks, and remaining risks.
- Do not build the future Dreaming workflow in this feature.

## Dependency graph

```text
1 Active-report seam + contract repair
├── 2 Detail report/update/resolve UX
├── 3 Re-import lifecycle integration
└── 4 Search and recommendation safety
    └── 6 Responsive filters and card status
2 ──┬── 5 Cook Mode contextual reporting
    └── 6 Responsive filters and card status
3 + 4 + 5 + 6 ──> 7 End-to-end closure
```

## 1. [x] Slice 1 — Active-report seam and contract repair

**Goal:** Establish the one-row-per-recipe report contract and persistence seam without changing recipe-screen behavior yet.

**Model fit:** MEDIUM — cross-layer contract/schema work with established repository patterns.

**Requirements:** R0, R2, R3, R4, R5, R9

**Files likely involved:**

- `specs/openapi.yaml`
- API recipe entities/context/migrations
- API recipe routes/services/mappers/tests
- generated PWA API client
- contract drift tests

**Tests first:**

1. Add a regression proving `healthyOnly` survives OpenAPI generation and remains on the generated search-filter type.
2. Add failing contract/integration tests for:
   - PUT create with Ingredients;
   - PUT update with Ingredients and Steps plus a note;
   - empty/duplicate/invalid reasons and note bounds;
   - one active row under repeated/concurrent saves;
   - material edits reset status/attempt linkage while identical saves preserve status;
   - eligibility and family-member authorization;
   - public status mapping and private-field omission;
   - idempotent DELETE returning `importIssue: null`.
3. Add persistence tests for cascade deletion and nullable reporter/updater references.

**Implementation:**

1. Restore `healthyOnly` in OpenAPI before running client generation.
2. Define public reason/status/request/DTO schemas, `RecipeDto.importIssue`, search status, review filters, PUT, and DELETE with high-fidelity examples.
3. Add `recipe_import_reports` with the design's constraints, indexes, and internal fields.
4. Add thin routes and a report service/repository for eligibility, normalization, material-change invalidation, upsert, delete, and public projection.
5. Extend recipe detail reads to return the optional public issue.
6. Regenerate the client using the repository task and repair only resulting contract drift.

**Constraints:**

- Do not place report flags on the recipe record.
- Do not add report history.
- Do not expose internal workflow or failure fields.
- PUT and DELETE response envelopes must match generated-client expectations.

**Validation:**

1. `task gen:client:check`
2. `task agent:drift:schemas`
3. `task test:api`
4. `task test:unit`
5. `task gate`

**Done when:**

- Contract, generated client, database, and API agree on one active report per recipe.
- `healthyOnly` remains intact.
- No new UI entry point exists yet.

---

## 2. [X] Slice 2 — Recipe detail create, update, and resolve UX

**Depends on:** Slice 1

**Goal:** Let Mom report, revise, and resolve an import issue from recipe detail with minimal mental weight.

**Model fit:** SMALL — bounded component behavior after the seam exists.

**Requirements:** R1, R2, R3, R4, R5, R10

**Tests first:**

1. Add component tests for eligibility and `Report import issue` versus `Review import issue` menu labels.
2. Add sheet tests for one/both reasons, disabled save with no reason, optional collapsed note, 500-character limit, and prepopulation.
3. Add tests proving create/update use the server response and keep the draft open on failure.
4. Add resolve tests for copy, visual priority, idempotent response handling, sheet close, and success toast.
5. Add accessibility checks for focus management, labels, keyboard operation, and status text.

**Implementation:**

1. Add the overflow-menu entry only when `canReimport` is true.
2. Build `RecipeImportIssueSheet` with local draft state and the exact copy in the design.
3. Create/update through the generated PUT client and replace detail state with the response.
4. Resolve through generated DELETE, close the sheet, clear the badge, and show `Marked as resolved`.
5. Add the shared accessible `RecipeImportIssueBadge` for Reported and Ready to review.

**Constraints:**

- No confirmation dialog, Undo action, red/destructive styling, or technical error details.
- The note remains optional and collapsed unless populated.
- Do not add a permanent action to recipe cards.

**Validation:**

1. `task test:unit`
2. `task gate`

**Done when:**

- Mom can create, update, or resolve the single report from detail.
- The interaction uses only the two public statuses and settled copy.

---

## 3. [x] Slice 3 — Manual re-import lifecycle and internal diagnostics

**Depends on:** Slice 1

**Goal:** Move an active report from Reported to Ready to review after a successful matching photo/URL re-import while retaining internal failure context.

**Model fit:** MEDIUM — workflow concurrency and failure-boundary changes require careful integration testing.

**Requirements:** R4, R6, R7, R9

**Tests first:**

1. Add service tests for attempt start with and without an active report.
2. Add photo and URL workflow tests for matching success, matching failure, and stale-instance no-op.
3. Prove failure stores bounded internal details but public mapping remains `reported`.
4. Prove synthesis, recategorization, and unrelated workflows do not mutate reports.
5. Add a regression proving import-status lookup finds both photo and URL workflows for a recipe.
6. Add detail-component tests for polling a manual attempt to terminal state and refetching authoritative recipe detail.

**Implementation:**

1. After manual import orchestration, record `reimporting`, workflow instance ID, and attempt time only when an active report exists.
2. Add a dedicated successful-report transition after recipe readiness in photo and URL import workflows only.
3. At the existing terminal failure boundary, record matching `reimport_failed` plus a sanitized, bounded error summary without changing workflow failure semantics.
4. Guard every terminal update by the latest workflow instance ID.
5. Extend the existing import-status query to cover both photo and URL imports.
6. Have recipe detail watch the initiated manual attempt and refetch the recipe on success or failure.

**Constraints:**

- Success means Ready to review, never resolved.
- Failure details are internal only.
- Do not create a report for an unreported recipe.
- Do not add SSE/global live invalidation.
- Do not implement the future Dreaming scheduler/processor.

**Validation:**

1. `task test:api`
2. `task test:unit`
3. `task gate`

**Done when:**

- Matching success becomes Ready to review.
- Failure remains publicly Reported and is internally diagnosable.
- Older attempts cannot overwrite newer state.

---

## 4. [x] Slice 4 — Search filtering and recommendation safety

**Depends on:** Slice 1

**Goal:** Make report status queryable while keeping active-report recipes out of every promoted or automatic recommendation path.

**Model fit:** MEDIUM — multiple selection paths must share one eligibility rule.

**Requirements:** R4, R8

**Tests first:**

1. Add API tests for `reportedOnly`, `readyToReviewOnly`, both together, and composition with text/Healthy/existing filters.
2. Add tests proving an active report remains in ordinary results and assigned meal plans.
3. Add tests proving active-report recipes are excluded from Top Pick, Feeling Lucky, and agent-selected recommendations.
4. Add tests proving either review filter returns no Top Pick and all matches are regular results.
5. Add public search projection tests for Reported/Ready/null without internal details.

**Implementation:**

1. Project public issue status onto search result DTOs.
2. Add the two predicates with Reported-as-superset semantics.
3. Centralize or consistently apply active-report exclusion to Top Pick, Feeling Lucky, and agent recommendation selection.
4. Suppress Top Pick whenever a review filter is active.
5. Preserve ordinary search, editing, cooking, and planning behavior.

**Constraints:**

- Do not exclude reported recipes from normal results.
- Do not change Browse All filtering in this slice.
- Do not expose reasons/notes on search cards.

**Validation:**

1. `task test:api`
2. `task test:unit`
3. `task gate`

**Done when:**

- Report state filters correctly.
- No active-report recipe can be promoted or automatically selected.

---

## 5. [x] Slice 5 — Cook Mode contextual reporting

**Depends on:** Slice 2

**Goal:** Let Mom report Ingredients or Steps where she notices the problem without disrupting cooking.

**Model fit:** SMALL — localized UI integration with explicit state-preservation rules.

**Requirements:** R1, R2, R3, R10

**Tests first:**

1. Add tests proving Check & Prep merges Ingredients and a step merges Steps.
2. Prove existing reasons and note are preserved and duplicate reasons are not created.
3. Prove Mom can still select both reasons before save.
4. Prove open/save/close preserves current step, checked ingredients, and Cook Mode state.
5. Add responsive/accessibility tests for placement outside the Back/Next thumb zone.

**Implementation:**

1. Add the contextual entry action beside the relevant heading/edit affordance.
2. Reuse `RecipeImportIssueSheet`; pass only the contextual reason and existing issue.
3. Implement the deterministic merge algorithm from design.
4. Replace local recipe issue state with the server response without resetting Cook Mode.

**Constraints:**

- Do not duplicate the report sheet.
- Do not put the action in the bottom navigation controls.
- Do not overwrite existing report content when opening contextually.

**Validation:**

1. `task test:unit`
2. `task gate`

**Done when:**

- Contextual reporting feels native to cooking and never loses progress.

---

## 6. [x] Slice 6 — Responsive search filters and card status

**Depends on:** Slices 2 and 4

**Goal:** Show the two report states on recipe cards and provide compact review filtering only where needed.

**Model fit:** SMALL — responsive UI refinement against completed API behavior.

**Requirements:** R4, R8, R10

**Tests first:**

1. Add card tests for no badge, ochre Reported, and sage Ready to review with accessible names.
2. Add mobile tests for one Filters button, all existing controls in the sheet, Reported/Ready options, draft/apply/cancel/clear, and active-count behavior.
3. Add desktop tests for existing inline filters plus the two review options.
4. Add Browse All tests for badges with no review filter control.
5. Add page tests proving active review filters render regular results and omit Top Pick.

**Implementation:**

1. Reuse `RecipeImportIssueBadge` on `/recipes` and Browse All cards.
2. Consolidate mobile `/recipes` filters behind an accessible bottom sheet.
3. Add Reported and Ready to review filters with the designed subset semantics.
4. Keep/extend desktop inline filters.
5. Verify AA token pairings and non-color status cues.

**Constraints:**

- No permanent mobile review pill.
- No Browse All review filter.
- No reasons, notes, workflow status, or failure details on cards.

**Validation:**

1. `task test:unit`
2. `task gate`

**Done when:**

- Mom can distinguish and filter the two actionable states without crowding the small screen.

---

## 7. [x] Slice 7 — End-to-end closure and spec integrity

**Depends on:** Slices 3, 4, 5, and 6

**Goal:** Prove the complete human-in-the-loop lifecycle and close all contract, accessibility, and regression gaps.

**Model fit:** MEDIUM — cross-layer E2E diagnosis may span API, worker, and responsive UI.

**Requirements:** All

**Tests first:**

1. Add or complete `pwa/e2e/recipe-import-reporting.spec.ts` before remaining production repairs.
2. Cover detail report → update to both reasons/note → successful manual re-import → Ready to review → Mark as resolved.
3. Cover Cook Mode contextual merge and state preservation.
4. Cover failed re-import staying Reported without any diagnostic text in the UI.
5. Cover mobile Reported/Ready filtering with regular results and no Top Pick.
6. Cover recommendation/Feeling Lucky exclusion of any active report.
7. Cover an ineligible synthesized recipe and Healthy-filter regression.

**Implementation:**

1. Fix only issues exposed by the end-to-end and integrity checks.
2. Reconcile high-fidelity OpenAPI examples, generated client, DTOs, mocks, and fixtures.
3. Verify the final migration/schema and task-executor documentation references.

**Validation:**

1. `task gen:client:check`
2. `task agent:drift:schemas`
3. `task test:api`
4. `task test:unit`
5. `task test:e2e`
6. `task agent:audit AREA=recipe-import-reporting`
7. `task gate`
8. `task review`

**Done when:**

- The full report/re-import/human-resolution loop passes at mobile and desktop sizes.
- Internal failure data is absent from all UI and public DTOs.
- All active-report recommendation exclusions are verified.
- The Kiro spec, implementation, and generated seams have zero known drift.

## First batch prompt

```yaml
id: recipe-import-reporting-s1-active-seam
title: Implement the active recipe import report seam
model_fit: MEDIUM
depends_on: []
scope:
  - Restore healthyOnly in OpenAPI before client generation.
  - Add public import-issue schemas and PUT/DELETE endpoints.
  - Add the one-row-per-recipe active report table and migration.
  - Implement eligibility, atomic upsert, idempotent resolve, and public projection.
  - Extend recipe detail with importIssue and regenerate the PWA client.
tests_first:
  - healthyOnly generation regression
  - report create/update/validation/concurrency/auth/eligibility
  - public status mapping and private field omission
  - idempotent delete and persistence lifecycle
constraints:
  - No UI entry points.
  - No recipe-table flags or report history.
  - No workflow integration yet.
  - Internal workflow/error fields never enter the public contract.
references:
  - .kiro/specs/recipe-import-reporting/requirements.md
  - .kiro/specs/recipe-import-reporting/design.md
validation:
  - task gen:client:check
  - task agent:drift:schemas
  - task test:api
  - task test:unit
  - task gate
handoff:
  - List changed files.
  - Separate passed and blocked checks.
  - State migration and generated-client risks.
  - Stop after Slice 1.
```
