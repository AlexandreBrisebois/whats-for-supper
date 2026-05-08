# Requirements Document: Semantic Recipe Search

## Introduction

Recipe search in What's for Supper must work the way a tired parent thinks: fuzzy, fast, and grounded in household reality.

A user should be able to type things like:
- "chicken pasta pesto tonight"
- "fish but quick"
- "it is hot out, I want something fresh"
- "find the salmon bowls the kids loved"
- "show me something similar to this recipe"

The feature must return a **short, decisive list** rather than a noisy catalog. It must preserve the app's current product loop:
- search from the library or planner,
- open a recipe card without losing context,
- take the next action immediately,
- never strand the user.

This feature also introduces two adjacent safety nets that prevent library anxiety:
- **Recycle Bin** for soft-deleted recipes with restore and later hard delete.
- **Failed Captures** queue in Settings so failed imports can be understood and retried.

### Resolved product decisions

1. **Recycle Bin is not a Settings-first feature.**
   Its primary entry point SHALL live in the recipe library/search surface because deleting and restoring recipes is a content-management action, not an app-preferences action.
2. **Failed Captures live in Settings.**
   Failed captures are operational recovery work, not meal selection work. Settings is the correct place for a calm maintenance queue.
3. **Hard delete only happens from the Recycle Bin.**
   Hard delete SHALL remove database records and disk assets.
4. **The search route remains `/recipes`.**
   The current Recipes page SHALL evolve into the semantic search destination instead of creating a second search experience.
5. **There is no separate user-facing name for lane 2.**
   Agent-powered super-search SHALL be triggered from the search page itself rather than introduced as a separately branded mode.
6. **There is no admin role in this household model.**
   Normal feature access SHALL be household-wide. Dangerous irreversible actions SHALL use an elevated PIN instead of an admin account model.

---

## Glossary

- **Semantic Search**: Search that understands meaning, not just exact keyword matches.
- **Hybrid Search**: A ranking strategy that combines lexical/fuzzy matching with vector similarity and household signals.
- **Top Pick**: The single result promoted above the rest because it best balances query fit, planner fit, and family fit.
- **Planner Fit**: How well a result fits the currently open planner week/day and helps improve balance for the week.
- **Family Fit**: Signals derived from notes, ratings, discovery votes, prior cooking history, and similar household interactions.
- **Recipe Search Document**: The indexed representation of a recipe used for hybrid search. It includes normalized text, structured signals, and an embedding vector.
- **Recycle Bin Item**: A soft-deleted recipe that is hidden from active product surfaces but can still be restored or permanently deleted.
- **Failed Capture**: A recipe import attempt that did not complete successfully and can be retried later.
- **Friendly Failure Reason**: A human-readable message explaining capture failure without requiring technical knowledge.
- **Elevated PIN**: A deployment-configured PIN that unlocks dangerous irreversible actions for a household that has no admin role.

---

## Requirements

### Requirement 1: Semantic Search Entry And No-Dead-End Navigation

**User Story:** As a busy parent, I want search to be reachable from the places where I choose meals, so I can find supper fast without losing my place.

#### Acceptance Criteria

1. The existing `/recipes` route SHALL be the single search destination for recipe lookup.
2. Search SHALL be reachable from:
   - primary app navigation,
   - Planner `Search Library`,
   - recipe detail action `Find Similar`.
3. When search is opened from Planner, the route SHALL preserve planner context using the existing day/week pattern so a result can be assigned directly back into the planner flow.
4. Search SHALL preserve the current query, active filters, and result list when the user opens and closes a recipe detail sheet/card.
5. Every search result detail surface SHALL provide at least one clear next step:
   - add/select recipe,
   - find similar,
   - edit notes/rating,
   - promote/remove from discovery,
   - move to recycle bin,
   - close and return to results.
6. Closing the detail surface SHALL return the user to the same search state, not a blank page or reloaded default state.
7. The primary search affordance SHALL remain the search icon plus search field; no separate lane name SHALL appear in the default UI.
8. Pressing `Enter` in the primary search field SHALL execute search.
9. The page SHALL also support a separate long-form text affordance for agent-powered super-search.
10. The long-form agent-search trigger SHOULD use the star/sparkle visual language already present in the app.
11. Agent-powered super-search SHALL return recipe search results, not a chat transcript.

---

### Requirement 2: Hybrid Search Contract

**User Story:** As a user, I want to describe what I want in natural language and still get useful results, even when my words are imprecise.

#### Acceptance Criteria

1. The API SHALL expose a search contract for hybrid recipe retrieval.
2. The search request SHALL support:
   ```
   {
     query: string,
       mode?: "standard" | "agent",
     similarToRecipeId?: uuid | null,
          pantrySnapshotId?: uuid | null,
     weekOffset?: integer | null,
     dayIndex?: integer | null,
     limit?: integer,
     filters?: {
       newRecipes?: boolean,
       neverCooked?: boolean,
          familyFavorite?: boolean,
       quickOnly?: boolean,
          notCookedInLongTime?: boolean,
       discoverableOnly?: boolean
     }
   }
   ```
3. `limit` SHALL default to 5 and SHALL NOT exceed 5 for the UI response.
4. The response SHALL contain:
   - one `topPick` or `null`,
   - a `results` array,
   - ranking reasons that explain why each result matched,
   - applied filter metadata.
5. Search SHALL work in two modes:
   - **standard mode** using the main search field and `Enter`,
   - **agent mode** using long-form text input for complex description or ingredient-led super-search,
   - **similar recipe mode** using `similarToRecipeId`.
6. Agent mode SHALL still return normal search results and ranking reasons; it SHALL NOT return a chat transcript.
7. The contract SHALL support hybrid search even when lexical matching and vector matching disagree.
8. When vector search is temporarily unavailable, the search SHALL degrade to lexical/fuzzy search rather than fail closed.
9. If `pantrySnapshotId` is used, it SHALL reference a request-scoped temporary inventory artifact rather than a durable pantry history record.

---

### Requirement 3: Planner-Aware Top Pick

**User Story:** As the person planning supper, I want the top result to help the week, not just match the words, so the app feels useful instead of clever.

#### Acceptance Criteria

1. When `weekOffset` and `dayIndex` are provided, search SHALL perform planner-aware reranking.
2. Planner-aware reranking SHALL:
   - exclude recipes already assigned in the target week,
   - prefer recipes that help close weekly balance gaps when balance data is available,
   - prefer recipes that fit the user's described urgency (for example quick meals for tonight),
   - avoid promoting a result that materially worsens weekly balance when a close alternative improves it.
3. The `topPick` SHALL contain a human-readable explanation of planner fit when planner context is present.
4. Non-top results MAY still be broader matches, even if they are less optimal for planner balance.
5. When no planner context is present, `topPick` SHALL be based on query fit and family fit only.

---

### Requirement 4: Search Must Understand Household Signals

**User Story:** As a mom trying to remember what worked before, I want search to understand my notes, ratings, and family behavior, so I can find the recipe I meant even when I remember it vaguely.

#### Acceptance Criteria

1. Search indexing SHALL include the following recipe signals:
   - name,
   - description,
   - ingredients,
   - notes,
   - rating,
   - discovery vote activity,
   - whether the recipe is discoverable,
   - last cooked date,
   - created date,
   - dietary profile/category metadata.
2. Free-text search SHALL match against notes as first-class search content.
3. A query like "the one my son loved" SHALL be able to hit notes and ranking signals related to family preference.
4. Ratings SHALL influence ranking:
   - `Love` SHALL boost,
   - `Like` SHALL mildly boost,
   - `Dislike` SHALL demote but not fully hide unless explicitly filtered.
5. Discovery family interest or repeated positive vote patterns SHALL be eligible as a ranking boost.
6. Search SHALL remain explainable: boosted household signals SHALL be surfaced in the result reasons.

---

### Requirement 5: Quick Filters And Shortlist Controls

**User Story:** As a user in a hurry, I want one-tap filters that reflect how I actually think, so I can narrow results without typing more.

#### Acceptance Criteria

1. The search UI SHALL support quick filters for:
   - `New Recipes`,
   - `Never Tried`,
   - `Family Favorite`,
   - `Quick`,
   - `Haven't Cooked in a Long Time`.
2. The search UI MAY support up to 2 additional contextual pills when space or context allows, but the default mobile presentation SHOULD stay at 5 visible pills.
3. Filter definitions SHALL be deterministic and documented.
4. `New Recipes` SHALL be based on recent creation date and not-yet-established household usage.
5. `Never Tried` SHALL be based on `LastCookedDate IS NULL`.
6. `Family Favorite` SHALL be based on positive household signals such as rating `Love`, notes, and/or strong family interest.
7. `Quick` SHALL be based on recipe time metadata and/or equivalent normalized readiness signals.
8. `Haven't Cooked in a Long Time` SHALL be based on `LastCookedDate` staleness thresholds.
9. Filters SHALL be combinable.
10. Search SHALL still return a short list after filters are applied; it SHALL not expand into a long catalog.

---

### Requirement 6: Similar Recipe Search

**User Story:** As a user, I want to ask for something similar to a recipe I already know, so I can branch out without starting from scratch.

#### Acceptance Criteria

1. The recipe detail surface SHALL expose a `Find Similar` action.
2. Similar search SHALL work even with no typed query by using the target recipe as the semantic anchor.
3. Similar search SHALL consider:
   - semantic similarity,
   - overlapping ingredients,
   - dietary profile proximity,
   - comparable effort/time,
   - household fit signals.
4. The original recipe SHALL be excluded from its own similar-results list.
5. Similar results SHALL still return a `topPick` and a short list.

---

### Requirement 7: Recipe Detail Surface For Search Results

**User Story:** As a user, I want to review a full recipe card from search results and make lightweight edits there, so I do not have to bounce between screens.

#### Acceptance Criteria

1. Search results SHALL open a recipe detail surface backed by the existing recipe detail contract.
2. The detail surface SHALL show at minimum:
   - hero image,
   - name,
   - why it matched,
   - ingredients,
   - notes,
   - rating,
   - discoverable status,
   - key action buttons.
3. From this surface, the user SHALL be able to:
   - edit notes,
   - set rating,
   - promote the recipe for discovery,
   - remove the recipe from discovery,
   - find similar recipes,
   - add/select the recipe into planner context when applicable,
   - move the recipe to the recycle bin.
4. The detail surface SHALL NOT force navigation away from the search context for ordinary edits.
5. The UI SHALL remain low-noise and action-first.

---

### Requirement 8: Vector Indexing And Embedding Workflow

**User Story:** As a product owner, I want a real semantic index backed by pgvector and an API workflow, so the search improves beyond fuzzy keyword matching.

#### Acceptance Criteria

1. The API SHALL maintain a vector-backed search index for recipes using PostgreSQL + pgvector.
2. The embedding model SHALL be externally configurable; it SHALL NOT be hardcoded in the feature implementation.
3. Search index population SHALL happen through API-side workflow execution.
4. Index generation SHALL run when a recipe is:
   - created,
   - materially updated in search-relevant fields,
   - restored from recycle bin,
   - reclassified where metadata changes search meaning.
5. The search document SHALL include normalized text and structured metadata in addition to the embedding vector.
6. Index status SHALL be observable so stale or failed indexing can be identified and retried.
7. Recipes lacking embeddings SHALL still be searchable lexically.
8. Soft-deleted recipes SHALL be excluded from active vector retrieval.
9. `POST /api/management/backup` SHALL persist a restorable search-index artifact for each indexed recipe.
10. `POST /api/management/seed` SHALL restore `recipe_search_documents` from that artifact without requiring a fresh embedding call when the artifact is present and compatible.
11. If a backup does not contain a compatible search-index artifact, restore SHALL still restore the recipe and mark its index state as pending or stale for backfill.
12. Hard delete from the Recycle Bin SHALL remove any persisted search-index backup artifact from disk.
13. Each search-index job SHALL be keyed by recipe ID and `source_fingerprint` so duplicate jobs for unchanged content are safe no-ops.
14. Before writing `recipe_search_documents` or `search.index.json`, an index worker SHALL verify that the current recipe fingerprint still matches the job fingerprint; stale jobs SHALL exit without overwriting newer state.
15. Hard delete SHALL invalidate any pending index jobs for that recipe and SHALL prevent deleted recipes from recreating search artifacts.
16. Restore SHALL establish the current valid index state for the recipe so older queued jobs cannot overwrite restored data.
17. Backfill and reindex operations SHALL be idempotent and safe to rerun.

---

### Requirement 9: Agent Search Consumption

**User Story:** As a team building agent features, we want the agent to search the same grounded index as the UI, so recommendations stay consistent and explainable.

#### Acceptance Criteria

1. Agent-driven recipe suggestion SHALL consume the same underlying hybrid search service used by the UI.
2. Agent search SHALL be able to operate on:
   - free-text craving prompts,
   - similar-to-recipe prompts,
   - planner-aware prompts,
   - pantry/fridge/freezer photo-derived ingredient prompts.
3. The search service SHALL return grounded evidence suitable for agent reasoning, including why each recipe matched.
4. The agent SHALL NOT invent recipes outside the indexed library when the intent is library search.
5. The agent integration SHALL preserve the short-list pattern and prefer concise recommendation sets.
6. Agent search SHALL return search results, not a chat response.

---

### Requirement 10: Pantry, Fridge, And Freezer Photo Search

**User Story:** As a user, I want to take photos of my pantry, fridge, or freezer and have the app figure out what I have, so I can find recipes that use many of those ingredients.

#### Acceptance Criteria

1. The search page SHALL expose a camera-triggered inventory capture affordance.
2. Tapping the camera affordance SHALL open a lightweight capture popup optimized for live camera use.
3. The popup MAY resemble the existing capture experience, but in Phase 1 it SHALL focus on live photo capture and submit, not the full recipe-capture flow.
4. The user SHALL be able to capture multiple photos in one inventory pass.
5. Submitted photos SHALL be processed into a structured pantry snapshot or equivalent ingredient inventory document.
6. Search SHALL be able to use that pantry snapshot to boost recipes that match a high proportion of available ingredients.
7. Search results SHOULD surface when ingredients are mostly on hand versus when several are missing.
8. Agent-mode search SHALL be able to combine pantry-photo ingredient inference with long-form intent like "something quick" or "something fresh."
9. Pantry/fridge/freezer photos SHALL be stored only in a temporary disk location during active processing.
10. Raw pantry/fridge/freezer photos SHALL be deleted immediately after the user receives a response.
11. If model processing fails, times out, or returns busy/unavailable, the system SHALL delete the temporary photos and return a friendly retry-later message.
12. The system SHALL NOT persist pantry-photo history, search history, or pantry snapshot history for this feature.
13. Temporary pantry-photo artifacts and request-scoped pantry snapshots SHALL NOT be included in backup or restore flows.

---

### Requirement 11: Recycle Bin Soft Delete And Restore

**User Story:** As a user, I want deleting a recipe to be reversible first, so I can recover from mistakes without fear.

#### Acceptance Criteria

1. Deleting a recipe from active surfaces SHALL perform a soft delete, not a hard delete.
2. Soft-deleted recipes SHALL:
   - disappear from active search results,
   - disappear from discovery,
   - disappear from planner suggestion systems,
   - disappear from normal recipe library listings,
   - remain visible in the Recycle Bin.
3. The Recycle Bin SHALL have a primary entry point in the recipe library/search area.
4. A Recycle Bin item SHALL support:
   - restore,
   - permanent delete.
5. Restoring a recipe SHALL return it to active surfaces and re-enqueue index refresh if required.
6. Permanent delete from the Recycle Bin SHALL be a hard delete that removes:
   - database records,
   - disk assets,
   - image files,
   - sidecar recipe files,
   - search index documents.
7. The system SHALL prevent soft delete when the recipe is currently assigned to an active or future planner slot, unless the product later adds a guided removal flow.
8. The user SHALL receive a friendly explanation when delete is blocked by planner usage.
9. Soft delete and restore SHALL be available to any household member; no admin role is required.
10. Permanent delete from the Recycle Bin SHALL require a successful elevated-PIN challenge.
11. The elevated PIN SHALL be configured through deployment-time environment variables rather than per-user profile state.
12. If the elevated PIN is not configured, permanent delete SHALL be unavailable rather than silently unprotected.

---

### Requirement 12: Failed Captures Queue In Settings

**User Story:** As a user, I want to see failed recipe captures in Settings and retry them later, so failed imports do not vanish into mystery.

#### Acceptance Criteria

1. Settings SHALL contain a `Failed Captures` section.
2. The Failed Captures section SHALL list failed capture attempts with:
   - a human-friendly title,
   - source type,
   - when it failed,
   - a friendly failure reason,
   - retry action.
3. The system SHALL persist enough capture context to retry the failed request without re-entering everything manually.
4. The system SHALL store both:
   - a friendly user-facing reason,
   - a technical diagnostic message for future debugging.
5. The user-facing list SHALL default to the friendly reason only.
6. Retrying a failed capture SHALL enqueue the proper workflow again.
7. Resolved capture failures SHALL leave the active failed queue.
8. Failed captures SHALL be accessible from Settings even after app reload.
9. The failed-capture queue SHALL NOT be used to retain pantry-photo search history.
10. Viewing and retrying failed captures SHALL be available to any household member; no admin role is required.

---

### Requirement 13: Performance, Resilience, And Fallback Behavior

**User Story:** As a user, I want search to feel fast and trustworthy, even while the index is still warming up or parts of the system are degraded.

#### Acceptance Criteria

1. Search SHALL prioritize speed over exhaustive result count.
2. The UI SHALL show at most 5 results in its primary shortlist pattern.
3. Standard lexical search SHOULD target p95 latency under 350ms.
4. Hybrid lexical + vector search SHOULD target p95 latency under 800ms.
5. Agent-mode long-form search SHOULD target p95 latency under 1200ms.
6. Pantry-photo assisted search SHALL either return results within 15 seconds or fail with a friendly busy / retry-later response.
7. Search SHALL tolerate partial indexing and fall back gracefully to lexical search when embeddings are unavailable.
8. If vector lookup exceeds a 300ms request budget, the request SHOULD fall back to lexical results for that execution rather than stall the UI.
9. Normal recipe edits that affect search meaning SHOULD become semantically searchable within 3 minutes.
10. Restored recipes SHALL be lexically searchable immediately after restore completes, even if semantic rehydration or backfill is still pending.
11. Search-index records that remain `pending` or `stale` for more than 10 minutes SHOULD be treated as unhealthy by operational instrumentation.
12. The feature SHALL emit instrumentation for:
   - search request duration,
   - search mode,
   - lexical vs hybrid vs fallback-served path,
   - empty-result rate,
   - top-pick generation success,
   - index job duration,
   - index job success/failure,
   - index queue depth,
   - counts of `pending`, `stale`, and `failed` search-index documents,
   - pantry-photo processing duration and busy/failure rate,
   - restore artifact compatibility failures.
13. These latency and freshness targets SHALL be treated as smart defaults that may be tuned after the first production telemetry pass.
14. The search page SHALL support explicit empty states with a useful next action.
15. The recycle bin SHALL support empty states with a clear explanation.
16. The failed captures queue SHALL support empty states and retry-failed states.
17. All new contracts SHALL be covered by contract, unit, integration, and UI tests before implementation is declared complete.

---

## Risks And Blind Spots

- **Comfort Food signal quality**: Comfort-food matching will be heuristic in early phases unless the app introduces a dedicated tag or classifier.
- **Planner conflict during delete**: Deleting recipes that are still assigned can create broken planner state if not explicitly blocked.
- **Index lag**: A recipe restored from bin may briefly be active before vector refresh completes; lexical fallback must cover this gap.
- **Failed capture privacy**: Stored retry payloads must avoid retaining unnecessary sensitive data.
- **Agent scope creep**: The agent must stay grounded in indexed library data and not become a separate recommendation brain with drifted logic.
