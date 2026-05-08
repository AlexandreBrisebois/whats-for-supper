# Requirements v2: Semantic Recipe Search

## Revision Notes

This is the high-fidelity v2 of the semantic recipe search spec.
It preserves all intent from v1 and resolves every gap identified in the pre-mortem:
ambiguous HTTP contracts, missing testability anchors, underspecified data shapes,
and silent failure modes that would cause small-model builders to invent incompatible behaviour.

Nothing in v1 is weakened. All requirements are expanded, not replaced.

---

## Introduction

Recipe search in What's for Supper must work the way a tired parent thinks:
fuzzy, fast, and grounded in household reality.

A user should be able to type things like:
- "chicken pasta pesto tonight"
- "fish but quick"
- "it is hot out, I want something fresh"
- "find the salmon bowls the kids loved"
- "show me something similar to this recipe"

The feature must return a **short, decisive list** rather than a noisy catalog.
It must preserve the app's current product loop:
- search from the library or planner,
- open a recipe card without losing context,
- take the next action immediately,
- never strand the user.

This feature also introduces two adjacent safety nets:
- **Recycle Bin** for soft-deleted recipes with restore and later hard delete.
- **Failed Captures** queue in Settings so failed imports can be understood and retried.

---

## Resolved product decisions

1. **Recycle Bin is not a Settings-first feature.**
   Its primary entry point SHALL live in the recipe library/search surface.
2. **Failed Captures live in Settings.**
   Settings is the correct place for a calm maintenance queue.
3. **Hard delete only happens from the Recycle Bin.**
   Hard delete SHALL remove database records and disk assets.
4. **The search route remains `/recipes`.**
   The current Recipes page SHALL evolve into the semantic search destination.
5. **There is no separate user-facing name for lane 2.**
   Agent-powered super-search SHALL be triggered from the search page itself.
6. **There is no admin role in this household model.**
   Dangerous irreversible actions SHALL use an elevated PIN configured via `ELEVATED_ACTIONS_PIN`.
7. **`PATCH /api/recipes/{id}` is the single patch path for notes, rating, and discoverable.**
   No separate endpoints for individual fields. One atomic patch.
8. **Soft delete returns HTTP 200 with the updated recipe state, not 204.**
   This lets the client confirm the new `deletedAt` without a follow-up fetch.
9. **Delete-blocked-by-planner returns HTTP 409 Conflict.**
   The body includes `errorCode: "RECIPE_ASSIGNED_TO_PLANNER"` and a human-readable `message`.
10. **Elevated PIN travels in the `X-Elevated-Pin` request header.**
    It MUST NOT appear in the URL, query string, or request body.
11. **`source_fingerprint` is a SHA-256 hex digest of a canonical JSON string.**
    The canonical string is defined in Requirement 8.
12. **Pantry snapshots are request-scoped in-memory structs.**
    They are never persisted to the database or disk. They exist only for the duration of the search request.
13. **Agent mode search is a server-side translation layer, not a second LLM call for retrieval.**
    The agent prompt is translated to a structured `RecipeSearchRequestDto` server-side
    and then runs through the same `RecipeSearchService`. No separate agent retrieval branch.

---

## Glossary

- **Semantic Search**: Search that understands meaning, not just exact keyword matches.
- **Hybrid Search**: A ranking strategy combining lexical/fuzzy matching, vector similarity, and household signals.
- **Top Pick**: The single result promoted above the rest because it best balances query fit, planner fit, and family fit.
- **Planner Fit**: How well a result fits the currently open planner week/day and helps improve balance.
- **Family Fit**: Signals from notes, ratings, discovery votes, prior cooking history, and similar interactions.
- **Recipe Search Document**: The indexed representation of a recipe used for hybrid search. Includes normalized text, structured metadata, and an embedding vector.
- **source_fingerprint**: SHA-256 hex digest of the canonical search document input JSON (see Requirement 8) for a recipe at a point in time. Used as the idempotency key for index jobs.
- **Recycle Bin Item**: A soft-deleted recipe visible in the trash surface. Hidden from all active surfaces.
- **Failed Capture**: A recipe import attempt that did not complete successfully and can be retried later.
- **Friendly Failure Reason**: A human-readable message explaining capture failure without requiring technical knowledge.
- **Technical Failure Reason**: A developer-readable diagnostic stored alongside the friendly reason. Not shown by default in the UI.
- **Elevated PIN**: A deployment-configured PIN (env var `ELEVATED_ACTIONS_PIN`) that gates dangerous irreversible actions. Sent in the `X-Elevated-Pin` request header.
- **Pantry Snapshot**: A request-scoped in-memory struct containing inferred ingredients from inventory photos. Never persisted; exists only for the lifetime of one search request.

---

## Requirements

### Requirement 1: Semantic Search Entry And No-Dead-End Navigation

**User Story:** As a busy parent, I want search to be reachable from the places where I choose meals,
so I can find supper fast without losing my place.

#### Acceptance Criteria

1. The existing `/recipes` route SHALL be the single search destination for recipe lookup.
2. Search SHALL be reachable from:
   - primary app navigation,
   - Planner `Search Library` action,
   - recipe detail surface via `Find Similar`.
3. When search is opened from Planner, the route SHALL preserve planner context using the existing
   `?addToDay=<dayIndex>&weekOffset=<weekOffset>` pattern so a result can be assigned directly
   back into the planner flow.
4. Search SHALL preserve the current query, active filters, and rendered result list when the user
   opens and closes a recipe detail sheet. Preservation MUST survive the sheet open/close lifecycle
   without re-fetching the search API.
5. **State preservation contract:** Query text, active filters, `topPick`, and `results` array SHALL
   be held in a component-local React state or a page-scoped store (not in the URL). When the detail
   sheet mounts and unmounts, the parent search page state MUST remain unchanged.
6. Every search result detail surface SHALL provide at least one clear next step:
   - add/select recipe (context-dependent CTA label),
   - find similar,
   - edit notes/rating,
   - promote/remove from discovery,
   - move to recycle bin,
   - close and return to results.
7. Closing the detail surface SHALL return the user to the same search state, not a blank page or
   reloaded default state.
8. The primary search affordance SHALL remain the search icon plus search field.
   No separate lane name SHALL appear in the default UI.
9. Pressing `Enter` in the primary search field SHALL execute search.
10. The page SHALL also support a separate long-form text affordance for agent-powered super-search,
    triggered by the star/sparkle icon already present in the app.
11. Agent-powered super-search SHALL return recipe search results, not a chat transcript.
12. The search page SHALL render a `data-testid="recipe-search-input"` input element at all times
    so navigation tests can always locate it regardless of load state.
13. The planning-mode banner SHALL render with `data-testid="planning-mode-banner"` when
    `addToDay` is present in the URL.
14. The planning-mode cancel button SHALL render with `data-testid="planning-mode-cancel"`.
15. The Top Pick card SHALL render with `data-testid="recipe-card-top-pick"`.
16. Each alternate result card SHALL render with `data-testid="recipe-card-<recipeId>"`.
17. The search empty state SHALL render with `data-testid="search-empty-state"`.
18. The Recycle Bin entry point on the search/library surface SHALL render with
    `data-testid="recycle-bin-entry"`.
19. The agent/super-search trigger (stars affordance) SHALL render with
    `data-testid="agent-search-trigger"`.
20. The camera/inventory trigger SHALL render with `data-testid="inventory-camera-trigger"`.

---

### Requirement 2: Hybrid Search Contract

**User Story:** As a user, I want to describe what I want in natural language and still get useful
results, even when my words are imprecise.

#### Acceptance Criteria

1. The API SHALL expose `POST /api/recipes/search` as the hybrid search contract.
2. The request body SHALL conform to `RecipeSearchRequestDto`:
   ```json
   {
     "query": "string (required, may be empty string for filter-only search)",
     "mode": "standard | agent (optional, default: standard)",
     "similarToRecipeId": "uuid | null (optional)",
     "pantrySnapshotId": "uuid | null (optional)",
     "weekOffset": "integer | null (optional)",
     "dayIndex": "integer | null (optional)",
     "limit": "integer | null (optional, default 5, max 5)",
     "filters": {
       "newRecipes": "boolean | null",
       "neverCooked": "boolean | null",
       "familyFavorite": "boolean | null",
       "quickOnly": "boolean | null",
       "notCookedInLongTime": "boolean | null",
       "discoverableOnly": "boolean | null"
     }
   }
   ```
3. `limit` SHALL default to `5` server-side and SHALL NOT exceed `5` in the UI response path.
   An out-of-range `limit` SHALL be clamped silently rather than rejected.
4. The response SHALL conform to `RecipeSearchResponseDto`:
   ```json
   {
     "topPick": "RecipeSearchResultDto | null",
     "results": "RecipeSearchResultDto[]",
     "appliedFilters": "RecipeSearchFiltersDto",
     "searchMode": "standard | agent | similar | pantry-assisted",
     "resultPath": "lexical-only | hybrid | fallback-lexical"
   }
   ```
5. `RecipeSearchResultDto` SHALL contain:
   ```json
   {
     "id": "uuid",
     "name": "string",
     "imageUrl": "string | null",
     "totalTime": "string | null",
     "difficulty": "string | null",
     "rating": "integer",
     "isDiscoverable": "boolean",
     "notes": "string | null",
     "reasons": "RecipeSearchReasonDto[]",
     "plannerFitNote": "string | null"
   }
   ```
6. `RecipeSearchReasonDto` SHALL contain:
   ```json
   {
     "source": "name-match | notes-match | rating-boost | vote-boost | planner-fit | inventory-fit | semantic-match",
     "label": "string (human-readable short explanation)"
   }
   ```
7. `appliedFilters` in the response SHALL mirror the filters that were actually applied.
   This allows the client to confirm which filters were active without re-parsing the request.
8. `resultPath` SHALL reflect which retrieval pipeline served the response:
   - `"lexical-only"` — no vector retrieval was attempted or available,
   - `"hybrid"` — both lexical and vector retrieval contributed,
   - `"fallback-lexical"` — vector retrieval was attempted but timed out or failed;
     lexical results were served instead.
9. Search SHALL work in three modes:
   - **standard mode**: main search field, `Enter` to submit,
   - **agent mode**: long-form text via stars affordance; server translates to a structured request,
   - **similar mode**: `similarToRecipeId` is set; query may be empty.
10. Agent mode SHALL still return normal `RecipeSearchResponseDto` results.
    It SHALL NOT return a chat transcript or a conversational response.
11. When `similarToRecipeId` is set, the server SHALL load that recipe's search document
    and use its embedding as the primary query vector. The original recipe SHALL be
    excluded from results.
12. The search contract SHALL support hybrid search even when lexical and vector matching disagree.
    Both candidate pools are merged before reranking.
13. When vector search is temporarily unavailable, search SHALL degrade to lexical/fuzzy search
    rather than fail closed. `resultPath` SHALL be `"fallback-lexical"` in that case.
14. `pantrySnapshotId` SHALL reference a request-scoped in-memory pantry snapshot, not a durable
    database record. The snapshot is created in the same request as the inventory-photo submission.

---

### Requirement 3: Planner-Aware Top Pick

**User Story:** As the person planning supper, I want the top result to help the week, not just
match the words, so the app feels useful instead of clever.

#### Acceptance Criteria

1. When `weekOffset` and `dayIndex` are provided, search SHALL perform planner-aware reranking.
2. Planner-aware reranking SHALL:
   - exclude recipes already assigned in the target week,
   - prefer recipes that help close weekly balance gaps when `WeeklyBalanceSummaryDto`
     balance data is available,
   - prefer recipes that fit the user's described urgency (for example quick meals when
     "tonight" or "quick" appear in the query),
   - avoid promoting a result that materially worsens weekly balance when a close
     alternative improves it.
3. The `topPick.plannerFitNote` SHALL contain a human-readable explanation of planner fit
   when planner context is present. Examples:
   - `"Helps add vegetables to this week"`
   - `"Matches your quick-tonight need"`
   - `"Not yet planned this week"`
4. Non-top results MAY still be broader matches, even if less optimal for planner balance.
5. When no planner context is present (`weekOffset` and `dayIndex` are null),
   `topPick` SHALL be based on query fit and family fit only.
6. The planner-aware reranker SHALL NOT call the embedding provider.
   It uses only existing schedule data and deterministic scoring rules.

---

### Requirement 4: Search Must Understand Household Signals

**User Story:** As a mom trying to remember what worked before, I want search to understand
my notes, ratings, and family behavior, so I can find the recipe I meant even when I remember
it vaguely.

#### Acceptance Criteria

1. Search indexing SHALL include the following recipe signals:
   - `name`,
   - `description`,
   - `ingredients` (normalized, space-joined),
   - `notes`,
   - `rating` (integer 0–3),
   - discovery vote activity (positive vote count),
   - `isDiscoverable` flag,
   - `lastCookedDate` (or null),
   - `createdAt`,
   - dietary profile / category metadata.
2. Free-text search SHALL match against `notes` as first-class search content,
   with weight equivalent to `description`.
3. Rating signals SHALL influence ranking:
   - `3` (Love) SHALL apply a `+boost_love` score modifier,
   - `2` (Like) SHALL apply a `+boost_like` score modifier,
   - `1` (Dislike) SHALL apply a `−boost_dislike` score modifier,
   - `0` (No rating) SHALL be neutral.
4. These modifiers SHALL be additive on top of the base retrieval score, bounded so that
   a Love rating cannot alone overcome a completely non-matching query.
5. Discovery family interest (repeated positive votes) SHALL apply a `+boost_votes`
   modifier proportional to normalised vote count, capped at a single Love-equivalent boost.
6. All active ranking boosts SHALL be surfaced in `reasons` on the result. A result that
   received a `rating-boost` SHALL include a `RecipeSearchReasonDto` with
   `"source": "rating-boost"` and a human-readable `label`.

---

### Requirement 5: Quick Filters And Shortlist Controls

**User Story:** As a user in a hurry, I want one-tap filters that reflect how I actually think,
so I can narrow results without typing more.

#### Acceptance Criteria

1. The search UI SHALL support quick filter pills for:
   - `New Recipes` (`data-testid="filter-new-recipes"`),
   - `Never Tried` (`data-testid="filter-never-tried"`),
   - `Family Favorite` (`data-testid="filter-family-favorite"`),
   - `Quick` (`data-testid="filter-quick"`),
   - `Haven't Cooked in a Long Time` (`data-testid="filter-not-cooked-long-time"`).
2. The search UI MAY support up to 2 additional contextual pills when space or context allows,
   but the default mobile presentation SHOULD stay at 5 visible pills.
3. Active filters SHALL render with `data-testid="filter-<name>-active"` to enable test assertions.
4. **Filter definitions (deterministic):**
   - `New Recipes`: `createdAt` within the last 30 days AND the recipe has not been cooked
     more than twice.
   - `Never Tried`: `lastCookedDate IS NULL`.
   - `Family Favorite`: `rating >= 2` (Like or Love) AND (`isDiscoverable IS TRUE`
     OR `notes IS NOT NULL`).
   - `Quick`: `totalTime` parsed to ≤ 30 minutes, or recipe has a recognized
     "quick" tag/keyword in name or description when `totalTime` is null.
   - `Haven't Cooked in a Long Time`: `lastCookedDate < now() - INTERVAL '60 days'`.
5. Filters SHALL be combinable. Combined filters are ANDed.
6. Search SHALL still return a short list (max 5) after filters are applied.
7. When all filters are active and no results match, the search SHALL return
   an empty `results` array with `topPick: null` and a non-error HTTP 200 response.
8. The empty state for an over-constrained filter set SHALL display a
   `data-testid="filter-no-results"` element with a suggestion to relax filters.

---

### Requirement 6: Similar Recipe Search

**User Story:** As a user, I want to ask for something similar to a recipe I already know,
so I can branch out without starting from scratch.

#### Acceptance Criteria

1. The recipe detail surface SHALL expose a `Find Similar` action with
   `data-testid="action-find-similar"`.
2. Tapping `Find Similar` SHALL navigate to `/recipes?similarTo=<recipeId>` (or equivalent
   state trigger), re-entering the search page in similar mode.
3. Similar search SHALL work with an empty `query` field by using the target recipe's
   search document embedding as the query vector.
4. When embeddings are not yet available for the target recipe (index is `pending` or
   `stale`), similar search SHALL fall back to lexical matching against the target
   recipe's normalized document text.
5. Similar search SHALL consider:
   - semantic similarity (vector cosine distance),
   - overlapping ingredient keywords,
   - dietary profile proximity (same category or compatible dietary flags),
   - comparable effort/time (within ±15 minutes when time data is present),
   - household fit signals (rating, votes, notes).
6. The original recipe SHALL be excluded from its own similar-results list.
7. Similar results SHALL still return a `topPick` and up to 4 alternates.

---

### Requirement 7: Recipe Detail Surface For Search Results

**User Story:** As a user, I want to review a full recipe card from search results and make
lightweight edits there, so I do not have to bounce between screens.

#### Acceptance Criteria

1. Search results SHALL open a recipe detail sheet on top of `/recipes`, backed by
   `GET /api/recipes/{id}`.
2. The detail sheet container SHALL render with `data-testid="recipe-detail-sheet"`.
3. The detail surface SHALL display at minimum:
   - hero image,
   - recipe name,
   - why it matched (reasons from `RecipeSearchResultDto.reasons`),
   - total time and difficulty,
   - ingredients list,
   - notes (editable inline),
   - rating (editable inline),
   - discoverable status toggle,
   - primary CTA (context-dependent label).
4. **Primary CTA behavior by context:**
   - Planner mode (`addToDay` present): `data-testid="action-use-for-day"`, label "Use for Day X".
   - Library/search mode: `data-testid="action-save-for-tonight"`, label "Save for Tonight".
   - Similar mode (entered via `Find Similar`): `data-testid="action-use-this-one"`, label "Use This One".
5. From this surface, the user SHALL be able to:
   - edit notes (inline; saves via `PATCH /api/recipes/{id}`),
   - set rating (inline; saves via `PATCH /api/recipes/{id}`),
   - toggle `isDiscoverable` (`data-testid="action-toggle-discovery"`),
   - find similar recipes (`data-testid="action-find-similar"`),
   - move the recipe to recycle bin (`data-testid="action-move-to-bin"`),
   - close the sheet and return to results (`data-testid="action-close-sheet"`).
6. **`PATCH /api/recipes/{id}` SHALL accept `isDiscoverable` as a valid patch field**
   alongside `notes` and `rating`. This is a contract extension from v1.
   `UpdateRecipeDto` SHALL be updated before Task 7 is implemented (see Task 7 contract gate).
7. The detail surface SHALL NOT force navigation away from the search page for ordinary edits.
8. Closing the sheet SHALL NOT trigger a new search API call. The results underneath
   SHALL remain exactly as they were before the sheet opened.

---

### Requirement 8: Vector Indexing And Embedding Workflow

**User Story:** As a product owner, I want a real semantic index backed by pgvector and a
workflow, so search improves beyond fuzzy keyword matching.

#### Acceptance Criteria

1. The API SHALL maintain a `recipe_search_documents` table (companion to `recipes`)
   backed by PostgreSQL + pgvector.
2. The embedding model SHALL be externally configurable via `EMBEDDING_MODEL_ID`
   environment variable. It SHALL NOT be hardcoded in feature implementation.
3. Index population SHALL happen through an API-side workflow (`SearchIndexWorkflow`).
4. Index refresh SHALL be enqueued when a recipe is:
   - created,
   - updated in any of these fields: `name`, `description`, `ingredients`, `notes`,
     `rating`, `isDiscoverable`, `dietaryProfile`, `category`, `totalTime`,
   - restored from the Recycle Bin,
   - reclassified.
5. **`source_fingerprint` definition:**
   The fingerprint SHALL be the SHA-256 hex digest of the following canonical JSON string,
   with fields sorted alphabetically and all values coerced to their JSON representation:
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
   Builders MUST use this exact field set and sort order. Any deviation produces an
   incompatible fingerprint.
6. The search document text SHALL be built as:
   ```
   <name>. <description>. Ingredients: <comma-joined ingredients>. Notes: <notes>.
   Category: <category>. Dietary: <dietaryProfile summary>. Time: <totalTime>.
   Difficulty: <difficulty>.
   ```
   Null fields are omitted. This is the normalized `document_text` stored in
   `recipe_search_documents`.
7. `recipe_search_documents` schema:
   ```sql
   recipe_id uuid primary key references recipes(id) on delete cascade,
   document_text text not null,
   search_metadata jsonb not null,
   embedding vector(1536),        -- nullable; null = pending or unsupported dimension
   embedding_model text not null,
   embedding_version text null,
   index_status text not null,    -- pending | indexing | ready | failed | stale
   last_indexed_at timestamptz null,
   source_fingerprint text null,
   schema_version integer not null default 1
   ```
8. `index_status` transitions:
   - `pending` → `indexing` (when job starts),
   - `indexing` → `ready` (on success),
   - `indexing` → `failed` (on error),
   - `ready` → `stale` (when a re-enqueue job detects the fingerprint changed before indexing ran),
   - `stale` → `indexing` (when the stale job picks up).
9. Before writing to `recipe_search_documents`, the index worker SHALL verify the
   current recipe fingerprint still matches the job fingerprint.
   If they do not match, the job exits without writing. No error is raised.
10. Index status SHALL be observable. The management API SHOULD expose index health counts
    (`pending`, `stale`, `failed`) via the existing status endpoint or an extension.
11. Recipes with `embedding IS NULL` SHALL still be searchable lexically via `document_text`.
12. Soft-deleted recipes SHALL be excluded from active vector candidate retrieval.
13. `POST /api/management/backup` SHALL persist a `search.index.json` sidecar for each
    indexed recipe alongside existing backup material.
14. `POST /api/management/seed` SHALL restore `recipe_search_documents` from that sidecar
    when present and compatible (same `schema_version` and `embedding_model`).
15. If the sidecar is absent or incompatible, restore SHALL succeed for the recipe and
    set `index_status = 'pending'`.
16. Hard delete SHALL invalidate any pending or in-flight index jobs and prevent
    deleted recipes from recreating search artifacts.
17. Restore SHALL establish the current valid index state so older queued jobs cannot
    overwrite restored data.
18. **`search.index.json` sidecar schema:**
    ```json
    {
      "schemaVersion": 1,
      "recipeId": "uuid",
      "documentText": "string",
      "searchMetadata": {},
      "embedding": [0.0],
      "embeddingModel": "string",
      "embeddingVersion": "string | null",
      "sourceFingerprint": "string",
      "exportedAt": "ISO 8601 timestamp"
    }
    ```
    Compatibility check: `schemaVersion` and `embeddingModel` must match current config.
    A mismatch in either field is treated as incompatible.
19. Backfill and reindex operations SHALL be idempotent and safe to rerun.

---

### Requirement 9: Agent Search Consumption

**User Story:** As a team building agent features, we want the agent to search the same grounded
index as the UI, so recommendations stay consistent and explainable.

#### Acceptance Criteria

1. Agent-driven recipe suggestion SHALL consume the same `RecipeSearchService`
   used by the UI search endpoint.
2. **Agent translation rule (server-side only):**
   When `mode: "agent"` is set on the request, the API MAY apply an LLM prompt to translate
   the free-form `query` string into a structured `RecipeSearchRequestDto` before passing
   to `RecipeSearchService`. This translation:
   - runs on the API server,
   - does NOT add a second retrieval pass,
   - outputs a `RecipeSearchRequestDto` (may set `filters`, rewrite `query`),
   - the translated request then flows through the identical search pipeline.
3. Agent search SHALL operate on:
   - free-text craving prompts,
   - similar-to-recipe prompts,
   - planner-aware prompts,
   - pantry/fridge/freezer photo-derived ingredient prompts.
4. The search service SHALL return grounded evidence (`reasons`) suitable for
   agent reasoning.
5. The agent SHALL NOT invent recipes outside the indexed library when the intent is
   library search.
6. Agent search SHALL return `RecipeSearchResponseDto` results, not a chat response.
7. The agent translation layer SHALL be a thin service boundary. It MUST NOT fork
   the ranking logic or maintain separate state.

---

### Requirement 10: Pantry, Fridge, And Freezer Photo Search

**User Story:** As a user, I want to take photos of my pantry, fridge, or freezer and have the
app figure out what I have, so I can find recipes that use many of those ingredients.

#### Acceptance Criteria

1. The search page SHALL expose a camera icon (`data-testid="inventory-camera-trigger"`)
   that opens an inventory capture popup.
2. The popup SHALL render with `data-testid="inventory-capture-popup"`.
3. The popup is optimized for live camera use; it SHALL NOT require a multi-step wizard
   before taking a photo.
4. The user SHALL be able to capture multiple photos in one inventory pass.
5. Each submitted photo SHALL be written to a temporary directory path in the format:
   `tmp/pantry-captures/<request-id>/<index>.jpg`.
6. Submitted photos SHALL be processed into a request-scoped pantry snapshot struct:
   ```json
   {
     "snapshotId": "uuid (request-scoped, never persisted to DB)",
     "inferredIngredients": ["string", "..."],
     "confidence": 0.0
   }
   ```
7. The `snapshotId` is an ephemeral handle passed as `pantrySnapshotId` in the subsequent
   search request. It references an in-memory snapshot map keyed by request context.
8. Search SHALL use the pantry snapshot to boost recipes with high ingredient overlap.
9. Results SHOULD surface an `"inventory-fit"` reason when the pantry snapshot contributed.
10. Temporary pantry photos SHALL be deleted immediately after the pantry snapshot is built
    (success, model-busy, or failure), not after the search response is returned.
11. If model processing fails, times out, or is unavailable, the system SHALL delete the
    temporary photos and return HTTP 202 with:
    ```json
    {
      "status": "busy",
      "retryAfterSeconds": 30,
      "message": "We're processing a lot right now. Try again in a moment."
    }
    ```
12. The system SHALL NOT persist pantry-photo history, search history, or pantry snapshots.
13. Temporary pantry artifacts SHALL NOT be included in backup or restore flows.
14. The inventory capture popup SHALL render a submit button with
    `data-testid="inventory-capture-submit"`.
15. The popup close/cancel action SHALL render with `data-testid="inventory-capture-cancel"`.

---

### Requirement 11: Recycle Bin Soft Delete And Restore

**User Story:** As a user, I want deleting a recipe to be reversible first, so I can recover
from mistakes without fear.

#### Acceptance Criteria

1. `DELETE /api/recipes/{id}` SHALL perform a soft delete, setting `deleted_at` and
   `deleted_by` on the recipe row. It SHALL return HTTP 200 with the updated recipe state.
2. The existing `setupCommonRoutes` mock for `DELETE /api/recipes/*` SHALL be updated in
   Phase 5 to return `200` with a soft-deleted recipe body rather than `204`.
   This is a **required mock-api.ts update** that must be included in Task 14.
3. Soft-deleted recipes SHALL:
   - disappear from `GET /api/recipes` (active library),
   - disappear from all discovery surfaces,
   - disappear from planner suggestion systems,
   - disappear from `POST /api/recipes/search` active candidate retrieval,
   - remain visible in `GET /api/recipes/trash`.
4. `recipes` table SHALL add columns:
   - `deleted_at timestamptz null`,
   - `deleted_by uuid null` (references family member ID),
   - `delete_note text null` (optional, reserved for future use).
5. `GET /api/recipes/trash` SHALL return soft-deleted recipes as a
   `RecipeTrashListResponse`:
   ```json
   {
     "items": "RecipeTrashItemDto[]"
   }
   ```
   `RecipeTrashItemDto`:
   ```json
   {
     "id": "uuid",
     "name": "string | null",
     "imageUrl": "string | null",
     "deletedAt": "ISO 8601 timestamp",
     "deletedBy": "uuid | null"
   }
   ```
6. `POST /api/recipes/{id}/restore` SHALL clear `deleted_at` and `deleted_by`,
   re-include the recipe in all active surfaces, and return HTTP 200 with the restored recipe.
   If a `search.index.json` sidecar is present and compatible, it SHALL upsert
   `recipe_search_documents`. Otherwise, it SHALL enqueue a search index job.
7. Restoring a recipe SHALL preserve all original data: notes, rating, `isDiscoverable`,
   and all linked assets.
8. `DELETE /api/recipes/{id}/purge` SHALL permanently remove a soft-deleted recipe.
   - The recipe MUST already have `deleted_at IS NOT NULL` (HTTP 409 if not).
   - The caller MUST provide a valid elevated PIN in the `X-Elevated-Pin` header
     (HTTP 403 if absent or incorrect).
   - On success, the endpoint SHALL remove:
     - all disk assets (images, sidecar files including `search.index.json`),
     - all dependent DB rows,
     - `recipe_search_documents` row,
     - `recipes` row.
   - The endpoint SHALL invalidate any queued index jobs for the recipe.
   - The endpoint SHALL return HTTP 200 with `{ "purged": true }`.
9. If `ELEVATED_ACTIONS_PIN` environment variable is not set, `DELETE /api/recipes/{id}/purge`
   SHALL always return HTTP 503 with:
   ```json
   { "errorCode": "PIN_NOT_CONFIGURED", "message": "Permanent delete is not available." }
   ```
10. `DELETE /api/recipes/{id}` SHALL return HTTP 409 Conflict with the following body
    if the recipe is currently assigned to an active or future planner slot:
    ```json
    {
      "errorCode": "RECIPE_ASSIGNED_TO_PLANNER",
      "message": "This recipe is scheduled for [Day X]. Remove it from the planner first.",
      "assignedDays": ["YYYY-MM-DD"]
    }
    ```
11. Soft delete and restore SHALL be available to any household member without PIN.
12. The Recycle Bin UI entry point SHALL render with `data-testid="recycle-bin-entry"`.
13. The trash list SHALL render with `data-testid="trash-list"`.
14. Each trash item SHALL render with `data-testid="trash-item-<recipeId>"`.
15. The restore button for each item SHALL render with `data-testid="action-restore-<recipeId>"`.
16. The permanent-delete button SHALL render with `data-testid="action-purge-<recipeId>"`.
17. The elevated-PIN entry dialog SHALL render with `data-testid="elevated-pin-dialog"`.
18. The PIN input field SHALL render with `data-testid="elevated-pin-input"`.
19. The Recycle Bin empty state SHALL render with `data-testid="trash-empty-state"`.

---

### Requirement 12: Failed Captures Queue In Settings

**User Story:** As a user, I want to see failed recipe captures in Settings and retry them
later, so failed imports do not vanish into mystery.

#### Acceptance Criteria

1. Settings SHALL contain a `Failed Captures` section rendered with
   `data-testid="failed-captures-section"`.
2. `GET /api/captures/failures` SHALL list active failed capture records.
   Response: `CaptureFailureListResponse`:
   ```json
   {
     "items": "CaptureFailureDto[]"
   }
   ```
   `CaptureFailureDto`:
   ```json
   {
     "id": "uuid",
     "familyMemberId": "uuid | null",
     "sourceType": "url | photos | describe",
     "previewText": "string | null",
     "friendlyReason": "string",
     "failureCode": "string | null",
     "status": "failed | retrying | resolved",
     "retryCount": "integer",
     "createdAt": "ISO 8601 timestamp",
     "lastFailedAt": "ISO 8601 timestamp"
   }
   ```
3. `technicalReason` SHALL NOT appear in the `CaptureFailureDto` response by default.
   A separate `GET /api/captures/failures/{id}/details` endpoint MAY expose it for
   developer debugging. It is not required in Phase 6.
4. `POST /api/captures/failures/{id}/retry` SHALL:
   - set `status = 'retrying'` immediately (idempotent: a second concurrent call returns
     HTTP 409 if `status` is already `'retrying'`),
   - re-enqueue the original capture workflow using the stored `retry_payload`,
   - return HTTP 202 with `{ "queued": true }`.
5. The retry idempotency rule: if `status = 'retrying'` when `POST .../retry` is called,
   return HTTP 409 with:
   ```json
   { "errorCode": "ALREADY_RETRYING", "message": "A retry is already in progress." }
   ```
   This prevents double-enqueue from impatient double-taps.
6. When a retry succeeds (workflow completes), the record SHALL transition to
   `status = 'resolved'` and be removed from the active failed-captures list
   (filtered out of `GET /api/captures/failures` which only returns `status != 'resolved'`).
7. When a retry fails again, `retry_count` is incremented, `last_failed_at` is updated,
   `friendly_reason` and `failure_code` are updated, and `status` returns to `'failed'`.
8. The `capture_failures` table schema:
   ```sql
   id uuid primary key,
   family_member_id uuid null,
   source_type text not null,        -- url | photos | describe
   retry_payload jsonb not null,     -- versioned; see AC9
   preview_text text null,
   friendly_reason text not null,
   technical_reason text null,
   failure_code text null,
   status text not null default 'failed',
   retry_count integer not null default 0,
   recipe_id uuid null,
   payload_version integer not null default 1,
   created_at timestamptz not null,
   last_failed_at timestamptz not null,
   last_retried_at timestamptz null
   ```
9. `retry_payload` MUST be versioned. `payload_version = 1` carries the following shape
   (additional versions may be added later without breaking existing records):
   ```json
   {
     "version": 1,
     "sourceType": "url | photos | describe",
     "url": "string | null",
     "description": "string | null",
     "photoIds": ["string"] | null
   }
   ```
   Implementations MUST check `payload_version` before reconstructing the workflow request.
10. The system SHALL persist enough capture context to retry the failed request without
    re-entering data manually. Photos referenced by `photoIds` in the retry payload MUST
    be validated for existence before retry enqueue; if they are missing, the retry SHALL
    fail gracefully with `friendlyReason` updated to indicate assets were lost.
11. The user-facing list SHALL default to showing `friendlyReason` only.
    The `Details` disclosure (optional in Phase 6) would show `technicalReason`.
12. Failed captures SHALL be accessible from Settings after app reload
    (i.e. they are persisted in `capture_failures`, not in-memory only).
13. The failed-capture queue SHALL NOT retain pantry-photo search history.
14. Each failed capture row SHALL render with `data-testid="failed-capture-<id>"`.
15. The retry button SHALL render with `data-testid="action-retry-<id>"`.
16. The failed captures empty state SHALL render with `data-testid="failed-captures-empty"`.

---

### Requirement 13: Performance, Resilience, And Fallback Behavior

**User Story:** As a user, I want search to feel fast and trustworthy, even while the index is
warming up or parts of the system are degraded.

#### Acceptance Criteria

1. Search SHALL prioritize speed over exhaustive result count.
2. The UI SHALL show at most 5 results in its primary shortlist pattern.
3. Standard lexical search SHOULD target p95 latency under 350 ms.
4. Hybrid lexical + vector search SHOULD target p95 latency under 800 ms.
5. Agent-mode long-form search SHOULD target p95 latency under 1200 ms.
6. Pantry-photo assisted search SHALL return results within 15 seconds or fail with
   the HTTP 202 busy response defined in Requirement 10.
7. Vector lookup inside the hybrid search request path SHALL have a budget of 300 ms.
   If the budget is exceeded, the request completes using only lexical candidates
   for that execution, sets `resultPath = "fallback-lexical"`, and emits fallback telemetry.
   The user-visible response is indistinguishable from a lexical-only response.
8. Normal recipe edits affecting search-relevant fields SHOULD become semantically
   searchable within 3 minutes (index job enqueue + processing time).
9. Restored recipes SHALL be lexically searchable immediately after restore completes.
   Semantic rehydration via embeddings may complete later.
10. Search-index records that remain in `pending` or `stale` status for more than 10 minutes
    SHOULD be treated as unhealthy by operational instrumentation.
11. **Required telemetry events (structured log or metrics):**
    - `recipe_search_requested` — `{ mode, hasPlanner, hasFilters, hasPantry }`
    - `recipe_search_completed` — `{ mode, resultPath, resultCount, topPickPresent, durationMs }`
    - `recipe_search_fallback_served` — `{ reason: "vector_timeout | vector_unavailable" }`
    - `recipe_search_empty_results` — `{ mode, filtersApplied }`
    - `recipe_index_job_started` — `{ recipeId, fingerprint }`
    - `recipe_index_job_completed` — `{ recipeId, durationMs }`
    - `recipe_index_job_failed` — `{ recipeId, error }`
    - `recipe_index_job_stale` — `{ recipeId, reason: "fingerprint_mismatch" }`
    - `recipe_index_restore_rehydrated` — `{ recipeId }`
    - `recipe_index_restore_marked_pending` — `{ recipeId, reason: "missing | incompatible" }`
    - `pantry_photo_processing_started` — `{ requestId, photoCount }`
    - `pantry_photo_processing_completed` — `{ requestId, durationMs, ingredientCount }`
    - `pantry_photo_processing_busy` — `{ requestId }`
12. Latency and freshness targets SHALL be treated as initial defaults to be tuned
    after the first production telemetry pass.
13. The search page SHALL support an explicit empty state with a useful next action.
    When no results are returned, `data-testid="search-empty-state"` SHALL be visible.
14. The Recycle Bin SHALL support an empty state (`data-testid="trash-empty-state"`).
15. The Failed Captures queue SHALL support an empty state
    (`data-testid="failed-captures-empty"`).
16. All new contracts SHALL be covered by contract, unit, integration, and UI tests
    before the implementation phase they belong to is declared complete.

---

## Risks And Blind Spots

1. **`setupCommonRoutes` wildcard gap:** The existing mock for `DELETE /api/recipes/*`
   returns `204`. Phase 5 MUST update this mock to return `200` with a soft-delete body.
   Failure to do so will cause all existing E2E tests to pass with wrong assumptions.
2. **Comfort food signal quality:** Comfort-food matching is heuristic in early phases.
3. **Planner conflict during delete:** Deleting recipes still assigned to planner slots
   creates broken planner state if not explicitly blocked by the 409 response.
4. **Index lag:** A restored recipe may briefly be in lexical-only mode before vector
   refresh completes. Lexical fallback must cover this gap.
5. **Failed capture privacy:** Stored retry payloads must avoid retaining raw photo data
   or unnecessary sensitive information.
6. **Agent scope creep:** The agent translation layer must stay thin and must not fork
   ranking logic or maintain separate state.
7. **Fingerprint compatibility:** Two builders independently computing fingerprints must
   produce identical results. The canonical field set and sort order in Requirement 8 AC5
   is the single source of truth. Any deviation is a silent correctness bug.
8. **Pantry snapshot GC:** In-memory snapshots orphaned by interrupted requests should
   expire automatically. A map entry with a TTL of 60 seconds is sufficient.
   If the process restarts, orphaned entries are gone naturally.
9. **Double-retry race:** The `status = 'retrying'` guard in Requirement 12 AC5 prevents
   double-enqueue but must be implemented as an atomic DB compare-and-set, not two separate
   read-then-write calls.
