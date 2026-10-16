# Design

## Context

See proposal.md. BSL-recipe-quality-019 in `docs/openspec-baseline/recipe-quality.md` owns evidence and mappings. First slice: external POST bulk → OpenAPI/generated bulk.post (no body) → RecipeController.BulkTriggerImport → RecipeImportBulkService.TriggerAllPendingAsync → Recipes global soft-delete filter/Name == null snapshot → sequential orchestrator.TriggerAsync(recipe-import, recipeId) → workflow definition validation/per-instance transaction/task persistence → returned workflow IDs → unwrapped Accepted DTO. No PWA application caller was located beyond generated builders and static browser handlers.

## Goals / Non-Goals

**Goals:** Complete connected quality recovery/observation coverage with accurate eligibility, counts, access and acceptance boundaries.

**Non-Goals:** Define acquisition/extraction accuracy, generic scheduling, operator roles, batch rollback, duplicate prevention or another direct single-recipe endpoint.

## Decisions

1. Keep these operation-specific recovery/observation consequences in quality. Capture owns source acquisition and readiness; background-processing owns `Validate workflow definitions before accepting work`, `Persist initial workflow and task identities before returning` and `Read stored lifecycle state by instance identity`. Household-identity owns `Authenticate protected API requests independently`. Reuse these owners instead of extracting their policy again.
2. The bulk service selects only Name == null under the global DeletedAt == null filter. It does not test IsReady, ImageCount, SourceUrl, current workflow, report or member attribution. It always triggers recipe-import with only recipeId, not url-import or repair feedback. Do not equate this with contextual re-import eligibility or Settings retry. TriggerImport/GetImportStatus helpers have service tests but no connected production callers; retired recipe-scoped POST/GET import routes explicitly assert 404. They do not justify a new endpoint specification.
3. Each trigger persists independently. The service has no batch transaction/catch, cancellation token, idempotency key, deduplication or resume cursor. A later exception escapes before Accepted and may leave earlier accepted instances. The supported success response describes all returned identities only; no all-or-nothing, stable order, automatic rollback, successful recovery or safe-repeat promise. Bulk does not call MarkAttemptStartedAsync, so no report linkage or automatic report resolution is inferred.
4. Summary GET → RecipeImportService.GetImportSummary → GroupBy stored status for workflowId exactly recipe-import → RecipeImportSummaryDto. Paused fatal imports do not increment Failed; URL imports are excluded; repeated instances count separately. No time window, recipe-readiness or report predicate applies. The aggregate has no dedicated located assertion; browser handlers return constant zero counters. Avoid broader pipeline health interpretation from comments.
5. Import-ID GET → binder/controller → GetImportByIdAsync validates member, loads instance/tasks, parses exact recipeId, checks Recipes with AddedBy match and global deletion filter → WorkflowInstanceDetailDto.FromModel. No workflow-type restriction is applied. It uses the shared DTO including parameters/tasks, while the detail wrapper consumes status and discards errors. Do not promise Settings-list diagnostic sanitization on this resource. Invalid JSON may throw; parseable missing/unusable recipeId yields absence. Missing member returns implemented 400 but OpenAPI lists only 200/404: withhold exact missing-context status parity. U76 is confirmed, not resolved.

## Risks / Trade-offs

- [Tests substitute orchestration and authentication] → RecipeControllerTests assert empty 202/zero/empty IDs, two null-name 202/count/two IDs, and one named plus one unnamed count one. Default factory uses EF InMemory, disabled household auth and an orchestrator creating Processing plus synthetic Mock task. No actual definition, worker, model, PostgreSQL or partial-batch failure is exercised.
- [Unasserted boundaries] → Empty-string/deleted/source eligibility, repeated bulk calls, cancellation, failing later trigger, summary counters and full import-ID response/error shape are source-only. GetImportById_RequiresFamilyAccessToItsRecipe asserts attributed 200 versus other-known-member 404; its name does not prove household-wide access.
- [Recovery helpers look like public routes] → Preserve tests as unit evidence; inventory marks their public integration missing. No production direct trigger or recipe-scoped status claim.
- [Installed workflow may differ from YAML] → WorkflowRepository loads persisted definitions. Source supports per-instance orchestration, not installed execution or a repair outcome; A34/U01/U78 retained.

## Migration Plan

None. Documentation only, stopping for human review before any promotion or archive.

## Open Questions

No blocking choice. Partial-batch, authenticated API, counter semantics, real-store and execution qualification remain explicitly unrun. No repairs are proposed.
