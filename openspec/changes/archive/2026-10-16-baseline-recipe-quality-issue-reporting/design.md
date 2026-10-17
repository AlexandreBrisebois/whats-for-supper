# Design

## Context

See proposal.md for motivation and scope. This documents existing integration, not an implementation design to apply. A73 authorizes extraction only. Source identity and the detailed assertion/mapping ledger are in `docs/openspec-baseline-plan.md`, BSL-recipe-quality-001–005.

The first observable slice is a manual Duplicate report: loaded detail → ActionGearMenu → RecipeImportIssueSheet → recipes.ts → Kiota importReport.post → POST `/api/recipes/{id}/import-report` → RecipeImportReportService → one recipe_import_reports row → unwrapped submission response → local detail/Reported badge and acknowledgement. It crosses the real request, persistence and DTO boundaries without requiring a model. Those boundaries were inspected, not executed.

The contextual extension snapshots normalized reasons and trimmed note, requests orchestration, links the report to the returned workflow identity and lets detail poll GET `/api/recipe-imports/{importId}`. Completion/failure remains conditional on separate background and persistence boundaries.

## Goals / Non-Goals

**Goals:** Extract observable feedback behavior and conditional outcomes, keep policy server-owned, reuse existing main-spec ownership, and identify where tests substitute integration.

**Non-Goals:** Repair the missing URL parameter, broaden member authorization, resume polling after reopening, coordinate replicas, change error contracts or implement lifecycle actions. Manual resolution is an adjacent control/dependency only; no resolution requirements are extracted. Cooking state and report-review filters/ranking are outside this slice.

## Decisions

1. **Add only recipe-quality-specific requirements.** CLI inventory has no recipe-quality. Reuse household-identity shared access/member selection and recipe-library requirements “Retrieve the selected library recipe for detail reading”, “Return persisted recipe detail for an available record”, “Show pending recipe-detail feedback” and “Dismiss recipe detail back to the loaded library”. Recipe-capture acquisition/extraction/readiness remains unchanged. Alternative: copy those rules into this delta; rejected because it duplicates existing ownership and would propagate historical capture claims into a different flow.
2. **Separate form choices from API reason sets.** The sheet allows Ingredients+Steps or Duplicate, with incompatible selections cleared. OpenAPI and service accept all nonempty unique subsets; any Duplicate suppresses automatic launch. Content-only reports need CanReimport; mixed Duplicate/content bypasses that check in ValidateAsync. Preserve this discrepancy as U75 rather than claiming the UI offers every API subset or that all content is rejected without provenance.
3. **Describe launch as a separate result.** SubmitAsync validates then enters a static per-recipe semaphore, reads the linked workflow snapshot, persists feedback before orchestration, reuses matching active feedback and suppresses unchanged terminal attempts. Material changes reset lifecycle fields. Matching compares sorted lowercase reasons and trimmed note exactly, including note case. Locks are in-process; no distributed exactly-once guarantee. Trigger and MarkAttemptStarted are separate writes. Compensation removes a created workflow when possible; if removal fails, response reports started with its ID. Relational ExecuteUpdate can leave tracked report projection stale; do not guarantee immediate isReimporting true in every submission response (U79).
4. **Withhold successful contextual URL delivery (U01).** WorkflowParameters supplies recipeId, repairReasons and repairNote but not url. Real WorkflowOrchestrator validates the required url declared by url-import.yaml before creating an instance. Generic RecipeImportService.TriggerImport supplies url but is not this submission caller. WorkflowRepository loads stored workflow YAML; deployed definition/version is unqualified. The service catches launch exceptions and returns saved feedback/launch failure. Mocked orchestration skips definition validation, masking this seam.
5. **Constrain member and observation claims (U76/U77).** Submit requires an existing member and recipe without AddedBy ownership matching. GetImportByIdAsync additionally requires recipe.AddedBy equal to the requesting member, returning no result otherwise. The named family-access test asserts owner 200 versus another existing member 404; it does not prove household-wide polling. Detail watches only returned IDs in memory, polls immediately then at one-second intervals, retries caught status/refresh errors, and guards asynchronous results by watched ID. Recipe-ID effect cleanup clears the watch/timer. Loading isReimporting alone does not resume polling; reopening/remount has no active successful import ID. CooksMode calls the same Save and acknowledges started state but has no matching polling loop; its entry context is a dependency, not another journey to specify.
6. **Conditional background outcomes, no automatic resolution (U78).** Both YAML definitions forward the immutable feedback parameters into ExtractRecipe. RecipeAgent appends delimited untrusted focus, preserving source HTML/images as authority and asking for complete recipe JSON. SyncRecipe imports artifacts to the same recipe. RecipeReady may no-op for an already-ready/discoverable record and runs before CompleteRecipeImportReport. That processor invokes MarkSucceededAsync guarded by LastWorkflowInstanceId; content-only becomes ReadyToReview, mixed remains Reported. No report deletion is connected to successful processing. Fatal worker failure pauses the instance then best-effort records matching report failure and publishes failure; failed diagnostic persistence can leave pending report state. The recipe-import search-index queue follows report completion, so later task failure can still change the report outcome. Do not equate a ready SSE event with report completion or promise correction accuracy.
7. **Keep library feedback tied to actual reads.** Detail GET loads the report; search maps report status and card/stack surfaces render the badge when supplied. Report Save updates local detail, without a report-change callback to refresh every parent library list. Normal paged library mapping does not itself attach the issue projection. Existing search/Needs review filters and promotion exclusions are dependency evidence only; extracting their ranking/review behavior would exceed scope.

## Risks / Trade-offs

- [Test doubles mask launch/delivery gaps] → Inspect API factory, browser harness and prompt stubs; record assertions separately from runtime evidence.
- [Launch, report linkage, background completion and polling access can disagree] → Conditional outcome requirements, U01/U76/U79; no atomic delivery or universal recovery claims.
- [Form remains mounted during response-driven updates] → Initial local draft state is retained on errors; no prop-driven draft resynchronization guarantee, and busy Save does not disable every input or dismissal.
- [Public/private diagnostics differ] → Public statuses are reported/readyToReview with separate pending/failure fields; private lifecycle fields and raw LastError are omitted. Safe generic failure guidance and explicit failed import ID remain visible.
- [Historical baseline statements overreach current seams] → Preserve existing bytes and caveats; do not silently repair or broaden them in this delta.

## Migration Plan

None. Documentation-only draft. No services, schema migrations, client generation, implementation, promotion or archival. Review the draft before any separately authorized lifecycle action.

## Open Questions

No unresolved decision blocks this bounded draft: disputed guarantees are withheld under A12/A73. Future separately authorized qualification may establish installed workflow identity, PostgreSQL response freshness, cross-member observation policy and resumed/cooking-entry observation. Such work cannot be inferred from these extraction tasks.

## Historical extraction evidence relocated for OpenSpec 1.14.2

The following non-normative material was moved from this change’s delta preamble to satisfy the upgraded validator. Requirement/scenario blocks and main specifications are unchanged by this relocation. Earlier draft/lifecycle statements remain historical; later recorded authorizations still govern. Relative links retain their original targets.

## Evidence and status (non-normative)

Implementation-supported draft under A73 and BSL-recipe-quality-001–005 in the [durable plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline-plan.md). Inspected assertions were not executed; A34 qualification remains deferred. U01/U75–U79 withhold successful contextual URL delivery, universal member polling access, automatic resolution and resumed observation guarantees. This draft is not accepted, promoted or archived.

Historical BSL-household-identity-014/015 and U22 qualification retained:

> However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.

This records the earlier review state. The user's report of later authorization remains recorded; its original reference is pending. It is not a recipe-quality requirement, new lifecycle approval or runtime result. A69's description-status caveat and feature-enabled PDF boundaries/U70–U74 remain unchanged.
