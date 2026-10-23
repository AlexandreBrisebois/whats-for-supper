# Design

## Context and Existing Ownership

`RecipeSearchService.SearchAsync` currently derives a semantic query from trimmed text and normalized concepts, but it does not own an explicit Discovery-versus-Explicit classification. Blank semantic content enters `BrowseAsync` even when effective filters are present. Ranked standard requests then call planner and family rerankers, capture `HistoricalInterestService`, and select the first report-free candidate as Top Pick. Similar skips family/history but still receives planner demotion and report-free promotion.

`RecipeSearchPredicate` is the existing owner of supported hard-filter meaning for queryable and SQL retrieval. Several DTO fields are present but not implemented as predicates; those fields cannot count as effective merely because they are populated. `RecipeSearchContinuationStore` already supports immutable ranked snapshots and is reusable for filter-only Explicit results. `specs/openapi.yaml` owns the response `searchMode` enum and generated PWA types; the current enum exposes only `standard | similar`.

The existing `HybridRecipeSearchBaselineFixture` provides eight safe recipes and seven query cases, but it is not large enough for the approved development/held-out protocol and has no fixed metric scorer. Search indexing, stored embeddings and provider serialization remain outside this change.

## Decisions and Tradeoffs

### One field-aware intent classifier

Add an internal search-mode value (`Discovery`, `Explicit`, `Similar`) and one classifier invoked after text/concept normalization. Find Similar takes precedence. Explicit is selected by nonblank text, retained concepts or `RecipeSearchPredicate.HasEffectiveFilters`; all other requests are Discovery.

`HasEffectiveFilters` will recognize only currently enforced filter fields: normalized Cuisine/Meal selections and true supported boolean filters. Empty lists, blank values, false/null booleans and `{}` are inactive. Unsupported `excludedIngredients` retains its controller error. Present-but-unimplemented DTO fields do not silently change mode; implementing them requires their own contract and predicate.

The classifier result drives routing, telemetry, response metadata and the canonical continuation fingerprint. Canonical fingerprints include normalized text, concepts, supported effective filter values, Similar source and planner target so semantically equivalent empty/default representations do not create different policies.

### Separate filter-only Explicit from Discovery browse

Blank text/concepts plus effective filters enters a dedicated filter-only path after shared eligibility predicates. It reuses existing quick-duration filtering where applicable, materializes the eligible household set as current Browse ranking already does, and orders by an explicit filter order (`NotCookedInLongTime` uses oldest `LastCookedDate`) or `CreatedAt` descending and normalized name ascending.

The ordered sequence is stored with `StoreRanked`, avoiding the existing Browse keyset whose identity tie-break and history generation are part of personalized Discovery. Snapshot storage trades bounded process memory for exact continuation stability; this is acceptable within the existing process-local, capacity/expiry-bounded continuation contract and existing household-scale materialization. No GUID participates in filter-only user-visible ranking.

### Mode-owned ranking pipeline

Discovery alone uses `BrowseAsync`, historical interest, affinity, family signals and its existing promotion behavior. Explicit ranked search uses lexical/semantic fusion followed only by base score and existing non-personalized deterministic ties; it does not call family, historical or planner-preference rerankers. Similar retains `RecipeSimilarityScorer`, source exclusion and hard filters but skips planner-preference demotion.

Mandatory planner rules, when introduced by an approved request contract, belong in eligibility before retrieval limits. The current `weekOffset/dayIndex` pair expresses context and the existing already-planned behavior is a preference, so this change removes its demotion from Explicit and Similar rather than converting it into an exclusion.

### Top Pick is a view of rank 1 in strict modes

Explicit and Similar use one helper that inspects only rank 1. If review mode or active report status prevents Top Pick presentation, no candidate is removed and ordinary results begin with rank 1. Otherwise rank 1 is returned once as Top Pick and alternatives retain the remaining order. Discovery keeps its promotion-eligible report-free selection.

### Search-mode API metadata changes with the policy

Update OpenAPI `searchMode` from `standard | similar` to `discovery | explicit | similar`, regenerate the Kiota client and update mocks/fixtures. This is an enum-value compatibility break, but retaining `standard` would conceal the policy boundary the response is required to report. The response object shape and `resultPath` enum do not change.

### Evaluation is deterministic and offline by default

Expand the versioned fixture to at least 40 development and 20 held-out cases with English/French, cross-language, short, natural-language, dish/ingredient, ambiguous, negated, hard-negative and no-match tags. Store arm-independent relevance grades and named hard negatives. A pure scorer consumes already-produced ranked IDs and reports the frozen metrics; it does not own retrieval or call a provider.

The committed harness proves data/metric reproducibility, not Gemini quality. Real-provider arm generation, query/document formatting, runtime qualification and production migration remain later evidence-gated changes.

## First Observable Slice

Start with POST `/api/recipes/search` using blank text and `newRecipes: true`. Add an API integration test with two matching recipes whose household signals favor the older recipe. The request must return `searchMode: explicit`, order by creation/name rather than household signals, and present only rank 1 as Top Pick when eligible. This traverses OpenAPI/DTO serialization, controller, classifier, shared hard filters, filter-only ordering, Top Pick mapping and response serialization without external providers.

Red evidence is the focused API test failing under the current Browse classification and `standard` metadata. Green requires the OpenAPI enum update and generated client/mock synchronization in the same slice, followed by focused API and client adapter checks.

Subsequent slices add typed/concept ranking invariants, Similar/planner invariants, report-ineligible rank 1, canonical continuation, and the offline evaluation scorer.

## State, Concurrency and Recovery

Initial strict-mode results freeze the complete ordered candidate sequence in the existing ranked continuation store. Continuations recheck current recipe/filter eligibility but do not recalculate household signals, history, planner preferences or retrieval order. Existing expiry, eviction and request-fingerprint mismatch return 409 restart guidance.

The canonical fingerprint includes the selected mode and normalized effective intent. A changed source, query, concept, effective filter, planner target or recovery generation rejects reuse. Changes limited to inactive/default filter representation do not change mode. This change does not introduce an embedding-generation identity; that remains required before any later representation migration.

## Compatibility, Rollout and Reversal

There is no database or vector migration. Reversal is a code/spec rollback. Search clients must accept the new `searchMode` enum values in the same release; generated types and mock responses prevent mixed contract state in the repository. Existing result rendering is mode-agnostic, while continuation batch-size selection continues to use `resultPath`.

Discovery behavior and Search UI structure remain unchanged. Search indexing and provider code remain byte-for-byte outside the implementation scope except where tests read their established interfaces.

## Operational Diagnosis

Existing request/completion telemetry will emit the classified mode and effective-filter boolean instead of DTO-object presence. It must continue excluding query, concepts, recipe identities, continuation tokens and private household facts. Result-path and semantic failure-class events remain the evidence separating provider failure from a successful empty result.

Offline evaluation output records fixture version, split, configuration identity and metric values. Default repository checks must be network-free; any absent real-model evidence is reported as not run rather than passed or failed.

## Risks and Deferrable Questions

- Materializing all filter-only eligible recipes preserves exact snapshots but follows the existing Browse scalability profile. If household corpus growth makes this material, a later change can add a meaningful unique sort key or bounded persisted snapshot without changing the approved order.
- Current DTO fields for included ingredients, categories and maximum total minutes are not enforced by the shared predicate. They remain inactive for mode classification until their filter behavior is specified and implemented; this avoids falsely advertising constraints.
