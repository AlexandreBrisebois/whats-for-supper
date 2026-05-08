# Data Flow: Recipe Search Index And Recovery

**Related spec:** `.kiro/specs/semantic-recipe-search/`

This document defines the intended data flow for:
- hybrid recipe search,
- stars-triggered agent-mode super-search,
- pantry/fridge/freezer photo inventory search,
- vector indexing workflow,
- planner-aware reranking,
- recycle-bin soft delete / hard delete,
- failed capture persistence and retry.

---

## Overview

This feature should share one grounded search service across standard search, agent-mode super-search, inventory-led search, and agent callers.

The implementation is deliberately staged:
1. lexical/fuzzy retrieval,
2. planner-aware reranking,
3. vector indexing seam,
4. backup/restore-compatible index persistence,
5. hybrid retrieval,
6. recovery systems.

That sequence keeps the product shippable at every step.

---

## Hybrid Search Pipeline

```mermaid
flowchart TD
    A[POST /api/recipes/search] --> B[Validate request]
    B --> B2[Check mode: standard or agent]
    B --> C[Load planner context if weekOffset/dayIndex present]
    B --> C2[Load pantry snapshot if pantrySnapshotId present]
    B --> D[Lexical/fuzzy candidate retrieval]
    B --> E[Vector candidate retrieval if embeddings available]
    D --> F[Merge candidate pool]
    E --> F
    C --> G[Planner-aware reranker]
    C2 --> G
    F --> G
    G --> H[Family-fit reranker]
    H --> I[Top Pick selection]
    I --> J[Return topPick + results + reasons]
```

### Retrieval stages

#### Lexical/fuzzy retrieval

Primary sources:
- recipe name,
- description,
- ingredients,
- notes,
- category/dietary metadata.

Implementation candidates:
- `pg_trgm` similarity,
- full-text ranking,
- weighted text columns.

#### Vector retrieval

Primary source:
- `recipe_search_documents.embedding`

Vector retrieval should be optional per query execution. When unavailable, the pipeline must continue with lexical candidates only.

### Request budget rule

- Vector lookup gets a 300ms budget inside the request path.
- If that budget is exceeded, the request should complete using lexical candidates for that execution and emit fallback telemetry.

---

## Planner-Aware Reranking

```mermaid
flowchart TD
    A[Candidate recipes] --> B[Exclude soft-deleted recipes]
    B --> C[Exclude recipes already assigned in target week]
    C --> D[Compute weekly balance gap from ScheduleDays.balanceSummary]
    D --> E[Boost recipes that close the gap]
    E --> F[Apply urgency boosts e.g. quick meals]
    F --> G[Emit planner-fit reason]
```

### Inputs

- `weekOffset`
- `dayIndex`
- current week assignments
- `WeeklyBalanceSummaryDto`
- query semantics (`quick`, `fresh`, `comfort`, etc.)

### Output

A planner-fit score that participates in final ranking and explains why a result became `Top Pick`.

---

## Inventory Photo Search Pipeline

```mermaid
flowchart TD
    A[Camera popup submit] --> B[Write photos to temp directory]
    B --> C[Vision / extraction workflow]
    C --> D[Request-scoped pantry snapshot with inferred ingredients]
    D --> E[Attach pantrySnapshotId to recipe search]
    E --> F[Boost recipes with high ingredient overlap]
    F --> G[Return search results]
    C --> H[Model busy / failure]
    G --> I[Delete temp photos]
    H --> I
```

This path should support pantry, fridge, and freezer photos without becoming a separate recipe-capture flow.

The pantry snapshot is request-scoped only. The feature does not retain pantry-photo history, search history, or pantry snapshot history, and these temporary artifacts are excluded from backup and restore.

---

## Search Document Indexing

### Document shape

A search document should combine raw searchable text and structured signals.

```mermaid
flowchart TD
    A[Recipe row] --> B[Normalize searchable text]
    A --> C[Collect structured metadata]
    B --> D[Build search document]
    C --> D
    D --> E[Embedding provider using configured model]
    E --> F[recipe_search_documents row]
```

### Suggested search document inputs

- `name`
- `description`
- `ingredients`
- `notes`
- `difficulty`
- `totalTime`
- `category`
- `dietaryProfile`
- `rating`
- `isDiscoverable`
- `lastCookedDate`
- discovery/family-interest signals

### Trigger points

Enqueue or refresh index when:
- recipe created,
- notes updated,
- rating updated,
- discoverable status changed,
- dietary profile changes,
- recipe restored from Recycle Bin.

Jobs are keyed by `recipeId + source_fingerprint`. Duplicate jobs for unchanged content are safe no-ops.

### Durable artifact

Each indexed recipe should also have a `search.index.json` sidecar artifact written during management backup so the semantic index can be restored without a new embedding call.

---

## Index Workflow

```mermaid
sequenceDiagram
    autonumber
    participant App as API Service
    participant WF as Search Index Workflow
    participant Embed as Embedding Provider
    participant DB as Postgres/pgvector

    App->>WF: enqueue index job(recipeId)
    WF->>DB: read recipe and search-relevant fields
    WF->>WF: normalize document text + metadata
    WF->>Embed: generate embedding(configured model)
    Embed-->>WF: vector
    WF->>DB: compare queued fingerprint to current fingerprint
    alt fingerprint matches
        WF->>DB: upsert recipe_search_documents
        WF->>DB: mark index_status=ready, last_indexed_at=now
    else stale job
        WF->>WF: exit without writing
    end
```

### Failure handling

If indexing fails:
- `index_status` should become `failed`,
- lexical search should still work,
- the document can be retried later.

If indexing remains `pending` or `stale` for more than 10 minutes, operational instrumentation should treat the index as unhealthy.

If a job fingerprint is stale, it should exit without changing current DB or disk state.

---

## Backup And Restore Management Flow

```mermaid
flowchart TD
    A[POST /api/management/backup] --> B[ManagementService.BackupAsync]
    B --> C[Read recipe_search_documents]
    C --> D[Write search.index.json per recipe directory]

    E[POST /api/management/seed] --> F[ManagementService.RestoreAsync]
    F --> G[Read recipe.info plus search.index.json]
    G --> H{artifact present and compatible?}
    H -->|Yes| I[Upsert recipe_search_documents]
    H -->|No| J[Restore recipe and mark index pending/stale]
```

### Restore rules

- Restore should not block recipe recovery when the search artifact is absent.
- Restore should not re-call the embedding provider when the saved artifact is compatible.
- Model/version mismatch should degrade to pending reindex, not hard failure.
- Restored recipes should remain lexically searchable immediately, even while semantic rehydration is still pending.
- Restore establishes the current valid search state, so older queued jobs may not overwrite restored artifacts.

---

## Soft Delete And Restore Flow

```mermaid
flowchart TD
    A[Soft delete request] --> B{Recipe planned in current/future slot?}
    B -->|Yes| C[Return conflict + friendly message]
    B -->|No| D[Set recipes.deleted_at / deleted_by]
    D --> E[Hide recipe from active queries]
    E --> F[Hide from search, discovery, planner suggestion surfaces]
    F --> G[Show in trash query]

    H[Restore request] --> I[Clear deleted_at / deleted_by]
    I --> J[Re-enqueue index refresh if needed]
    J --> K[Return to active surfaces]
```

### Query rule

All active recipe query paths must exclude `deleted_at IS NOT NULL`, including:
- library listing,
- search candidate retrieval,
- discovery sources,
- planner default/suggestion/search sources.

---

## Hard Delete Purge Flow

```mermaid
flowchart TD
    A[Hard delete from Recycle Bin] --> B[Verify recipe is soft-deleted]
    B --> B1[Verify elevated PIN]
    B1 --> B2[Invalidate queued index jobs for recipe]
    B2 --> C[Load filesystem asset paths]
    C --> D[Delete images and sidecar files including search.index.json]
    D --> E[Delete dependent rows]
    E --> F[Delete recipe_search_documents row]
    F --> G[Delete recipes row]
    G --> H[Return success]
```

### Safety note

This purge must be owned by a dedicated service. The operation should not be a casual controller-level delete.

---

## Failed Capture Persistence And Retry

```mermaid
flowchart TD
    A[Capture/import attempt fails] --> B[Map failure to friendly reason]
    A --> C[Store technical reason]
    B --> D[Insert capture_failures row]
    C --> D
    D --> E[Expose via GET failed captures]
    E --> F[Settings UI shows queue]
    F --> G[Retry request]
    G --> H[Rebuild workflow request from stored payload]
    H --> I{Retry outcome}
    I -->|Success| J[Mark resolved/remove from active queue]
    I -->|Failure| K[Increment retry_count and update reasons]
```

### Stored payload rules

The retry payload should preserve enough information to rerun the import but should avoid unnecessary sensitive data duplication.

---

## Caller Unification: UI, Inventory Search, And Agent

```mermaid
flowchart TD
    A[/recipes UI/] --> C[RecipeSearchService]
    B[Stars-triggered super-search] --> C
    B2[Inventory-led search] --> C
    D2[Agent prompt/workflow] --> C
    C --> E[Hybrid retrieval + rerank]
    E --> F[Grounded results + reasons]
```

### Rule

Do not build separate ranking logic for UI and agent. The caller may request different formatting, but not a different truth source.

---

## Primary Failure Modes

| Failure mode | Expected behavior |
|---|---|
| vector provider unavailable | lexical search still returns results |
| vector lookup exceeds request budget | lexical fallback is served and telemetry records fallback |
| indexing failed for one recipe | recipe still searchable lexically |
| stale index job completes late | worker exits without overwriting newer state |
| restored backup missing search artifact | recipe restores and remains lexically searchable until reindex |
| restored backup has incompatible search artifact | recipe restores and index is marked pending/stale |
| recipe is soft-deleted | excluded from active surfaces, visible in trash |
| elevated PIN missing or invalid for purge | dangerous action is denied safely |
| hard delete filesystem cleanup fails | operation surfaces failure and does not silently half-delete |
| capture retry fails again | failed capture row remains visible with updated reason |

---

## Instrumentation Baseline

The feature should emit structured telemetry for:
- search duration,
- search mode,
- result path (`lexical-only`, `hybrid`, `fallback-lexical`),
- empty-result rate,
- top-pick generation success,
- index job duration,
- index job success/failure,
- queue depth and counts of `pending`, `stale`, `failed`,
- pantry-photo processing duration and busy/failure rate,
- restore artifact compatibility failures.

These defaults should seed a broader app-wide instrumentation pass later.

---

## Test Map

### Unit

- search document building
- ranking boost calculations
- planner-fit scoring
- friendly failure mapping

### Integration

- search endpoint with lexical retrieval
- hybrid retrieval fallback behavior
- management backup/restore round-trip for semantic index
- delete/restore/purge lifecycle
- failed capture persistence and retry

### E2E

- planner search selection loop
- restore from trash loop
- failed capture retry loop

---

## Blind Spots To Watch

1. Query-state loss after detail close is primarily a UX problem but often starts as a data-flow ownership bug.
2. Hard delete without explicit file cleanup can leave orphaned disk state.
3. Restore without reindex can reintroduce a recipe that is invisible to semantic search.
4. If capture failures rely only on SSE or transient stores, Settings recovery will not survive reload.
5. Search-index artifact version drift can silently degrade restore quality if compatibility rules are not explicit.
