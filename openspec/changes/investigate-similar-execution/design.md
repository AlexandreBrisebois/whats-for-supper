# Design

## Context and Existing Ownership

`RecipeDetailSheet` emits a loaded recipe ID. Search's `handleFindSimilar` already closes detail, clears text and calls `runSearch` with retained filters/preferences/planner target. Browse/Cooking navigate with `similarTo`. Planner alone navigates with `open`; Search initializes those as independent detail and Similar states. This is a navigation defect, independent of scoring quality.

`RecipeSearchService.SimilarSearchAsync` owns candidate retrieval and invokes the pure `RecipeSimilarityScorer`. Search document projection owns normalization; neither includes an explicit cooking technique or meal-form field. See [investigation](investigation.md) and [evaluation](evaluation.md) for the bounded trace and evidence, not an approved new scoring algorithm.

## Decisions and Tradeoffs

Correct only Planner's query parameter using the existing navigation convention. Do not pass `addToDay`/`weekOffset`: this detail is explicitly for viewing, and inventing a replacement target could change assignment behavior. No API contract or generated model changes are necessary. Preserve the source ID and all existing Search handling. No Search-page visual edits or PR #285 integration.

Ranking is not implemented: execution evidence, unknown-metadata handling and fallback semantics materially affect the algorithm. The user explicitly requested those questions be recorded for morning review. Candidate generation needs its own evaluation before reranking can claim benefit. Do not add arbitrary weights, infer techniques from title substring lists, or modify shared normalization/indexing on this evidence alone.

## First Observable Slice

Planner assigned recipe title → real detail action → router → Search's existing URL initialization → POST `/api/recipes/search` with empty `query` and correct `similarToRecipeId` → rendered Similar response. Add a failing Planner unit regression first; add a browser regression through real Planner, detail and Search with the existing external mock API boundary. Existing Similar API tests establish backend source/exclusion behavior separately, not live relevance.

## User Experience

The current Planner action sends the person back to the same detail instead of alternatives, demanding repeated attention. The correction uses the existing action, loading, results and recovery controls, with no new copy, styling or choices. Apply the requested Mère-Designer lens to this concrete loop; do not infer usability or ranking success from source alone. Preserve accessible button and interaction test IDs.
