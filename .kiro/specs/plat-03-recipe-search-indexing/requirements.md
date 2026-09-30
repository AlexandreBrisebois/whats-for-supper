# Recipe Search Indexing — Requirements

**Kind:** Current-capability feature specification

**Derivation:** Behavior-first, accelerated cadence

**Source:** `PLAT-03` in [`docs/feature-inventory.md`](../../../docs/feature-inventory.md), verified against current non-archived source, contract, and tests

**Status:** Baseline proposal for future change control; this specification does not authorize implementation

## Outcome

Search documents remain a reproducible, current projection of authoritative recipe facts and support lexical and semantic retrieval without making the index the recipe authority.

## Scope

### In scope

- search-document construction and fingerprinting
- index/update workflow and reconciliation
- lexical and embedding-backed repositories
- safe semantic fallback and backfill

### Non-goals

- treating embeddings as nutritional or dietary interpretation
- persisting user search text as recipe facts
- making index availability a prerequisite for direct recipe access

## Verified current baseline

- `RecipeSearchDocumentBuilder` constructs index content and `SearchFingerprintService` identifies meaningful changes.
- `SearchIndexWorkflow` and `SearchReconciliationWorkflow` run through the workflow engine.
- `RecipeLexicalSearchRepository` and `RecipeSemanticSearchRepository` provide retrieval seams used by `RecipeSearchService`.
- PostgreSQL stores search documents; `GeminiEmbeddingProvider` is optional infrastructure.

The baseline records current ownership; it is evidence to review, not a requirement
that every implementation detail remain unchanged.

## Requirements

### PLAT-03-R1 — Projection ownership

The index shall be derived only from persisted recipe facts and shall never overwrite the source recipe.

### PLAT-03-R2 — Idempotency

An unchanged recipe fingerprint shall not create duplicate or unnecessary index work; changed or restored recipes shall become eligible for refresh.

### PLAT-03-R3 — Eligibility

Deleted, unready, or otherwise excluded recipes shall not appear as eligible search results.

### PLAT-03-R4 — Hybrid availability

Lexical retrieval shall remain available when embeddings or the configured semantic provider are unavailable; degradation shall be observable but non-blocking.

### PLAT-03-R5 — Reconciliation

A bounded reconciliation/backfill process shall detect and repair missing, stale, or ineligible documents without corrupting recipe state.

### PLAT-03-R6 — Privacy and quality

Index/log content shall avoid secrets and unsupported health inference; ranking changes shall retain deterministic correctness and recorded quality evidence.

## Preserved behavior

- Existing household meal workflows remain usable when this capability is degraded,
  except where the capability is the explicit security or persistence prerequisite.
- Changes preserve household/member boundaries and do not broaden collection of
  recipe, identity, or secret data.
- OpenAPI remains authoritative for any affected API operation.

## Acceptance scenarios

1. The primary success path satisfies every `PLAT-03-R*` requirement with the
   selected household/member context.
2. Missing, stale, invalid, or unavailable dependencies produce the specified safe
   fallback or explicit failure rather than false success.
3. A second device, late response, retry, or identity change cannot silently replace
   newer authoritative state.
4. The affected behavior is operable with its required non-pointer alternative and
   exposes meaningful state to assistive technology where a UI exists.
5. Contract, persistence, and workflow changes are proven at their actual seams,
   not inferred from a static or mocked check alone.

## Decisions retained by this baseline

- Current public behavior is the starting compatibility boundary, not immutable
  architecture.
- Household data remains self-hosted and the least-privilege/least-data behavior is
  preferred.
- Background work must report accepted, completed, and failed states distinctly.

## Open questions before a future change

1. Which requirement is being changed, and what current behavior must remain
   backward compatible during rollout?
2. Does the change alter OpenAPI, persistence, deployment configuration, event
   delivery, or another feature spec? If so, approve those handshakes first.
3. What production or real-device evidence is required beyond repository automation
   for the selected change?
