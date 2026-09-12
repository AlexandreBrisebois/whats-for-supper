# ADR 039 — Search Index Fingerprint And Idempotency Contract

**Date**: 2026-05-08  
**Status**: Accepted  
**Deciders**: Alex Brisebois

---

## Context

Recipe search documents need to be kept in sync with recipe data as recipes are created and updated. Naively re-indexing on every field change would cause unnecessary embedding provider calls, fan-out races when multiple rapid updates arrive, and stale writes if a job completes after the recipe has changed again.

The system also needs to survive backup/restore cycles without requiring a full re-embedding pass. Sidecar artifacts need a way to declare what version of a recipe they represent so restore can decide whether to trust them.

## Decision

Every indexing job and sidecar artifact is keyed by a `source_fingerprint`: the SHA-256 hex digest of a canonical JSON string derived from the recipe's search-relevant fields.

**Canonical field set** (alphabetical, all values as JSON):
```json
{
  "category": "<value or null>",
  "description": "<value or null>",
  "difficulty": "<value or null>",
  "dietaryProfile": "<serialized or null>",
  "ingredients": ["<sorted array of strings>"],
  "isDiscoverable": true,
  "name": "<value>",
  "notes": "<value or null>",
  "rating": 0,
  "recipeId": "<uuid>",
  "totalTime": "<value or null>"
}
```

This exact field set and sort order is the single source of truth. Any deviation produces an incompatible fingerprint — a silent correctness bug that causes index jobs from different code paths to disagree on whether content has changed.

**Idempotency rules enforced by `SearchIndexWorkflow`:**

1. **Dedup on enqueue:** If `index_status = pending` already exists for the same `(recipeId, fingerprint)`, the enqueue call is a no-op.
2. **Stale-guard on write:** Before writing `recipe_search_documents`, the worker recomputes the current recipe fingerprint and compares it to the job fingerprint. If they differ, the job exits without writing. No error is raised — the recipe was updated after enqueue and a newer job will handle it.
3. **Hard delete wins:** If a recipe is purged while a job is in flight, the job detects `deleted_at IS NOT NULL` and exits without writing. No later async job may recreate search artifacts for a purged recipe.
4. **Restore establishes current state:** When a recipe is restored from the Recycle Bin, the current valid index state is written (either from the sidecar or via a fresh enqueue). Older queued jobs with a stale fingerprint cannot overwrite restored data.

**Implementation constraint:** `SearchFingerprintService.ComputeSourceFingerprint` is the only implementation of this algorithm in the codebase. It must not be reimplemented inline elsewhere. Two independent implementations will silently diverge.

## Status

Implemented. `SearchFingerprintService` is covered by unit tests that assert the exact SHA-256 output for a known input, ensuring the canonical field set cannot drift undetected.

## Consequences

- Changing `EMBEDDING_MODEL_ID` in a live deployment does not automatically invalidate existing index documents. The compatibility check in backup/restore (`embeddingModel` must match current config) catches this on seed, but live traffic will mix vectors from different models and produce inconsistent similarity scores. A full reindex is required when changing the model.
- Adding a new field to the canonical set is a breaking change — all existing fingerprints become invalid and the entire index must be rebuilt. This should be treated as a schema migration, not a casual code change.
- The stale-guard means that rapid successive updates to a recipe will only produce one successful index write — the one that ran against the final stable state. This is the correct behaviour: intermediate states do not need to be indexed.
- The dedup guard means that calling `EnqueueAsync` repeatedly for unchanged content is safe and cheap. Callers do not need to track whether they have already enqueued a job.
