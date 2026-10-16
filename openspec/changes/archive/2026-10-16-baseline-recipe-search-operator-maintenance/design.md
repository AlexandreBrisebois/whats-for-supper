# Design

## Context

This is a documentation extraction, not a new implementation. See proposal.md. The first observable slice is startup → overdue calendar persistence → materialization → later filter vocabulary and browse consumption. Operator workflow acceptance, stored task results and classifier/index child completion remain separate boundaries. The source-backed omissions were found by inventorying all 17 packaged YAML definitions, including dreaming.yaml, rather than comparing draft counts.

## Goals / Non-Goals

**Goals:** Describe implemented producers under existing fact owners, with precise outcomes and qualifications.

**Non-Goals:** New UI, contract corrections, distributed execution guarantees, model accuracy, cost qualification, crash-atomic cross-store recovery, promotion, fixes or runtime execution.

## Decisions

Use recipe-search for materialized vocabulary/affinity and index publication. Use recipe-library for vegetarian fact production; its existing DTO representation requirement covers only consumption. The alternative of placing every processor in background-processing would obscure business ownership. Keep shared retries, cron, child acceptance and dependency promotion in background-processing, Dreaming composition in data-backup-and-recovery, and overdue calendar policy in meal-planning. Existing requirements remain intact.

The following mappings cover every new requirement and its scenarios. Paths are repository-relative; tests were inspected, not executed. Source identities are retained in evidence-sha256.md.

| Requirement | Source | Inspected assertion or source-only scenario |
|---|---|---|
| Materialize affinity from eligible stored recipes | api/src/RecipeApi/Services/RecipeSearchFilterMaterializer.cs:19–83 | RecipeSearchFilterMaterializerTests.MaterializeAsync_UsesOnlyEligibleStoredCuisines_AndSeparatesRecipeFacts asserts excluded hidden/deleted/null cuisine, two facts, relative affinity, last cooked date and timestamp. Exact arithmetic scenario also traced to BuildFact. |
| Materialize deterministic cuisine choices | same file:85–105 | MaterializeAsync_RecentCookingLowersPromotionWithoutErasingAffinity_AndIsClockDeterministic asserts repeat-equivalent lists/facts and Old before Recent with equal affinity; ordinal tie and max-six traced directly to source. |
| Persist filter snapshot and facts as one materialization | same file:44–63 | repeated test asserts stable rows; MaterializeAsync_FailureLeavesThePreviousGoodSnapshotUntouched uses pre-cancelled token, not mid-commit failure. |
| Initialize filters after overdue finalization | same file:112–142; api/src/RecipeApi/Program.cs; Workflows/dreaming.yaml | InitialBackfill_FinalizesOverdueMealsThenReusesAtomicMaterializationOnRetry asserts Cooked event, one state row, expected fact date. Hosted failure catch is source-only. |
| Skip obsolete or contentless search index work | api/src/RecipeApi/Services/SearchIndexWorkflow.cs:51–100 | SearchIndexWorkflowTests.ExecuteAsync_ExitsWithoutWriting_WhenFingerprintMismatches and WhenRecipeIsSoftDeleted assert pending document unchanged; ExecuteAsync_DefersEmptyPdfDocument_ThenIndexesExtractedContent asserts pending empty text then ready extracted content. Missing document branch source-only. |
| Publish lexical content before optional embedding work | same file:100–151 | ExecuteAsync_TransitionsStatus_PendingToIndexingToReady asserts ready statuses/fingerprint/time/vector. Provider absent path source-only. |
| Protect superseding search content during embedding publication | same file:126–139 | reload/fingerprint guard traced; inspected tests do not establish production concurrent publication. |
| Retain lexical content when embedding work fails | same file:153–190 | ExecuteAsync_SetsStatus_Failed_WhenEmbeddingProviderThrows asserts thrown exception plus lexical ready/embedding failed. ExecuteAsync_RejectsEmptyEmbedding_WithoutSavingAnInvalidVector asserts ready lexical, failed embedding, null vector/fingerprint. |
| Classify stored vegetarian facts from ingredient evidence | api/src/RecipeApi/Services/Processors/ClassifyRecipeVegetarianProcessor.cs | Services/Processors/ClassifyRecipeVegetarianProcessorTests.ExecuteAsync_AcceptsExplicitClassificationForIngredientCases and ExecuteAsync_ClassifiesFromIngredientsAndDoesNotRequireRecipeTitle assert stored boolean and ingredients in prompt. Missing/no-ingredients branches source-only. |
| Preserve confirmed facts when classification is ambiguous | same processor | ExecuteAsync_AcceptsMarkdownFencedClassificationJson checks boolean; ExecuteAsync_MalformedResponsePreservesConfirmedFact asserts JsonException and retained true. Null response source-only. |
| Queue bounded vegetarian classification batches | api/src/RecipeApi/Services/Processors/BackfillVegetarianClassificationProcessor.cs; Workflows/vegetarian-classification-backfill.yaml | Services/Processors/BackfillVegetarianClassificationProcessorTests asserts 25 child launches plus successor for 26 rows, known skipped by default/queued with force, only unknown ID queued. |
| Distinguish classification launch counts from current facts | same processor; Processors/VegetarianClassificationStatusProcessor.cs | backfill test retains26 recipes and queued25; VegetarianClassificationStatusProcessorTests.ExecuteAsync_ReturnsLiveClassificationCounts asserts4/2/2/1/1. |

Test paths above are under api/src/RecipeApi.Tests/. TestDbContextFactory uses EF InMemory with transaction-warning suppression; chat, embedding and coordinator dependencies are substituted. These assertions do not prove PostgreSQL rollback, provider quality, packaged YAML execution or live recurrence.

## Calendar policy and observed implementation

The user settled the policy: UX dates use the deployment-fixed local timezone, internal timestamps remain UTC, and clocks are always injected (no direct DateTime.Now or equivalent). WFS-BL-005 owns resolution across calendar and clock boundaries. This documentation draft does not claim that current code complies.

Non-normative current evidence: RecipeSearchFilterMaterializer.BuildSnapshot derives today from the injected clock's UTC date, counts Cooked events dated at or after that date minus 28 days, and ranks summed affinity minus twice that count, then summed affinity descending, then ordinal cuisine ascending. The current arithmetic and UTC cutoff are observed implementation, not accepted calendar policy. The prior recent-cooking scenario is replaced with deterministic identical-input behavior; the disputed calendar reference/window is withheld until WFS-BL-005 resolution. SearchIndexWorkflow directly reads DateTimeOffset.UtcNow for indexing time, another implementation gap against injected-clock policy; this draft does not endorse that mechanism.

The source invokes a transaction for materialization, but the normative persistence claim is conditional on successful saves and commit. Inspected pre-cancellation and InMemory tests do not qualify relational rollback, concurrent snapshot consistency or crash recovery.

## Risks / Trade-offs

- Previously excluded operator behavior (SR-U10/SR-X03) → explicitly add only observed producers; retain benchmarks, relevance and successful deployment outside normative scope.
- Startup materialization failure → log boundary documented; no hidden current-process retry guarantee. A cancelled test does not prove mid-write rollback.
- Non-atomic child launches and snapshot/consumer freshness → preserve shared-owner limitations; no exactly-once or synchronous Search refresh promise.
- Classification force looked suspect in quoted YAML → WorkflowOrchestrator.SubstituteVariables converts bool.TryParse results to JSON booleans before processor dispatch. This is affirmative counter-evidence, not a defect to fix.
- Embedding guard checks stored source fingerprint; it is not a general concurrency proof → qualify concurrent races and do not promise complete stale-job elimination.
- Demo may block decorated chat while embeddings use a separate provider → demo-household owns its actual boundaries; no blanket zero-cost claim.

## Migration Plan

No deployment or data migration. Draft generation and strict validation only; human review, acceptance and main-spec promotion remain separate. Documentation can be revised within this isolated change without changing runtime behavior.
