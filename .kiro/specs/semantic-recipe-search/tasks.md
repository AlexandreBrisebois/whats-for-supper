# Tasks: Semantic Recipe Search

Each task is a vertical slice. Keep each slice small enough that a smaller model can complete it without inventing missing seams.

**Small-model execution rules:**
- Each task should touch one primary seam at a time.
- If a task needs more than one new endpoint plus a workflow plus a new surface, split it.
- Prefer deterministic ranking and UI behavior before introducing model-dependent work.
- Do not invent new UX outside the design and flow docs.

**Before marking any task done:**
- `task agent:drift`
- `task agent:test:impact`
- `task review`

**Flow docs that must stay in sync while implementing this feature:**
- `docs/flows/user-flows/recipe-search-and-library-recovery.md`
- `docs/flows/data-flows/recipe-search-index-and-recovery.md`

---

## Phase 1 — Search Contract And UI Loop

### Task 1 — OpenAPI search contract + generated client

**What:** Add the initial search contract without vector behavior yet.

**Write tests first:**
1. Contract snapshots for search request/response schemas.
2. Client generation expectations for `topPick`, `results`, filters, and planner context fields.

**Implementation:**
1. Add `POST /api/recipes/search` to `specs/openapi.yaml`.
2. Add schemas for:
   - `RecipeSearchRequestDto`
   - `RecipeSearchResponseDto`
   - `RecipeSearchResultDto`
   - `RecipeSearchReasonDto`
   - `RecipeSearchFiltersDto`
3. Regenerate the TS client.
4. Confirm the `/recipes` page can consume the generated types.

**Definition of done:** contract lands cleanly, generated client compiles, drift passes.

- [ ] Task 1 complete

### Task 2 — `/recipes` semantic search shell with preserved context

**What:** Turn the existing recommendations page into a real search shell while keeping planner handoff intact.

**Write tests first:**
1. Planner mode banner still renders when `addToDay` and `weekOffset` are present.
2. Typing a query calls the new search API and renders Top Pick + alternates.
3. Pressing `Enter` in the main field triggers search.
4. Opening and closing a result detail sheet preserves the query and rendered results.
5. Empty state shows a useful next action.

**Implementation:**
1. Replace mock recommendations loading with the new search contract.
2. Keep existing planner assignment behavior.
3. Keep the default UI unbranded: search icon + field, no separate lane name.
4. Add result-state preservation in component/store state.
5. Add a utility row placeholder for Recycle Bin entry.

**Definition of done:** planner flow still works, search shell returns a short list, UI tests pass.

- [ ] Task 2 complete

### Task 3 — Deterministic lexical/fuzzy search service

**What:** Deliver value before embeddings by implementing lexical/fuzzy search with explainable reasons.

**Write tests first:**
1. Query matches recipe name fuzzily.
2. Query matches notes.
3. Query with no exact keyword still returns fuzzy text candidates.
4. Search excludes deleted recipes.
5. Search returns at most 5 results.

**Implementation:**
1. Build `RecipeSearchService` with lexical/fuzzy retrieval.
2. Add explainable reasons for matches.
3. Exclude soft-deleted recipes from active search.
4. Wire the service into `POST /api/recipes/search`.

**Definition of done:** API integration tests pass, UI consumes real results, search is usable without vectors.

- [ ] Task 3 complete

### Task 4 — Planner-aware top pick reranking

**What:** Make `Top Pick` use planner context and weekly balance, not just text similarity.

**Write tests first:**
1. Search with planner context excludes recipes already planned that week.
2. When balance summary shows a gap, a qualifying recipe is promoted to `topPick`.
3. Without planner context, top pick falls back to query + family fit.
4. Planner-fit explanation is returned when context exists.

**Implementation:**
1. Reuse existing schedule/week balance signals.
2. Add a reranking stage after lexical candidate retrieval.
3. Keep result count short.
4. Add planner-fit reason text to the response.

**Definition of done:** `Top Pick` is planner-aware and explainable.

- [ ] Task 4 complete

---

## Phase 2 — Family Memory And Detail Actions

### Task 5 — Notes, rating, and discovery-aware ranking

**What:** Make search reflect household memory.

**Write tests first:**
1. Rating `Love` boosts ranking.
2. `Dislike` demotes ranking.
3. Notes containing query terms boost ranking.
4. Discovery positive-vote signal boosts ranking.
5. Result reasons mention the boost source when used.

**Implementation:**
1. Add ranking boosts for notes/rating/votes.
2. Keep boosts bounded so search fit still matters.
3. Return grounded reasons.

**Definition of done:** family signals affect ranking consistently and transparently.

- [ ] Task 5 complete

### Task 6 — Recipe detail sheet from search results

**What:** Add the full recipe card/detail sheet on top of search results.

**Write tests first:**
1. Result tap opens detail sheet with recipe detail data.
2. Notes edit saves through the existing patch path.
3. Rating change saves through the existing patch path.
4. Closing the sheet returns to the same query/results.

**Implementation:**
1. Create `RecipeQuickViewSheet` or equivalent.
2. Reuse `GET /api/recipes/{id}`.
3. Preserve search page state underneath.
4. Keep the surface action-first and low-noise.

**Definition of done:** search feels continuous and not page-hoppy.

- [ ] Task 6 complete

### Task 7 — Discovery toggle + similar-search entry on detail sheet

**What:** Allow direct discovery management and similar search from the recipe card.

**Write tests first:**
1. Toggling discovery status updates recipe state.
2. `Find Similar` launches search in similar mode.
3. Similar mode excludes the current recipe.
4. Similar mode still preserves planner context if present.

**Implementation:**
1. Extend recipe update contract if needed for `isDiscoverable`.
2. Add `Find Similar` action.
3. Feed `similarToRecipeId` through the search contract.

**Definition of done:** users can branch from a known recipe without leaving the flow.

- [ ] Task 7 complete

### Task 8 — Quick filters row

**What:** Add one-tap quick filters without blowing up the UI.

**Write tests first:**
1. Each quick filter toggles visibly.
2. Filters change the request payload.
3. Combined filters still return a short list.
4. Mobile layout stays calm with 5 default pills.
5. Empty-state copy changes appropriately when filters overconstrain the list.

**Implementation:**
1. Implement `New`, `Never Tried`, `Family Favorite`, `Quick`, `Haven't Cooked in a Long Time`.
2. Allow up to two contextual pills only when relevant.
3. Start with deterministic definitions.
4. Keep filters horizontally scannable and thumb-friendly.

**Definition of done:** filters help narrow results fast and do not add clutter.

- [ ] Task 8 complete

---

## Phase 3 — Durable Index Seams

### Task 9 — Search index schema and indexing workflow contract

**What:** Add the data shape that makes vector search possible.

**Write tests first:**
1. Schema tests for `recipe_search_documents`.
2. Workflow enqueue tests when search-relevant recipe fields change.
3. Index-status tests for success/failure states.
4. Duplicate jobs for the same fingerprint are safe no-ops.

**Implementation:**
1. Add table/schema support for `recipe_search_documents`.
2. Add search-index workflow and search service abstraction for embeddings.
3. Add configuration object for the embedding model ID and artifact schema version.
4. Use `source_fingerprint` as the index-job idempotency key.

**Definition of done:** indexing seam exists without requiring full semantic ranking yet.

- [ ] Task 9 complete

### Task 10 — Backup/restore-compatible index persistence

**What:** Make the semantic index survive the existing management backup/restore loop.

**Write tests first:**
1. Backup writes a search-index artifact for indexed recipes.
2. Restore repopulates `recipe_search_documents` from that artifact without calling the embedding provider.
3. Restore with a missing or incompatible artifact still restores the recipe and marks the index pending/stale.
4. Hard delete removes the persisted search-index artifact from disk.
5. Restore output is not overwritten by older stale jobs.

**Implementation:**
1. Add `search.index.json` export/import support to the management backup/restore path.
2. Version the artifact format explicitly.
3. Rehydrate `recipe_search_documents` during `POST /api/management/seed`.
4. Fall back to pending reindex when artifact compatibility checks fail.
5. Ensure restored rows reject stale async overwrites.

**Definition of done:** backup/restore preserves semantic search readiness without forcing a full re-embed pass.

- [ ] Task 10 complete

### Task 11 — Vector backfill and hybrid retrieval

**What:** Populate embeddings and merge lexical + vector candidates.

**Write tests first:**
1. Indexed recipe stores embedding metadata.
2. Search can return vector-only matches that lexical search missed.
3. Search falls back to lexical-only when embedding lookup is unavailable.
4. Soft-deleted recipes are excluded from vector retrieval.
5. Stale jobs do not overwrite newer search documents.
6. Hard delete prevents later artifact recreation from queued jobs.

**Implementation:**
1. Generate embeddings using the configured model.
2. Merge vector and lexical candidates.
3. Keep reranking and explanations stable.
4. Add a backfill/reindex path.
5. Enforce the vector lookup fallback budget inside the request path.
6. Add stale-job compare-before-upsert checks.

**Definition of done:** hybrid search is live without breaking Phase 1 behavior.

- [ ] Task 11 complete

### Task 11A — Feature instrumentation and operational budgets

**What:** Add the first feature-local instrumentation contract for search performance, fallback behavior, and index health.

**Write tests first:**
1. Search emits mode and duration telemetry.
2. Fallback-served requests emit distinct telemetry from hybrid-served requests.
3. Index job success/failure updates operational counters or structured logs.
4. Pantry-photo busy/failure paths emit telemetry.
5. Restore compatibility failures emit telemetry.

**Implementation:**
1. Instrument search request duration and result path.
2. Instrument index job duration, queue health, and failure counts.
3. Instrument pantry-photo processing duration and busy/failure outcomes.
4. Add feature-local thresholds for unhealthy `pending` / `stale` index age.
5. Treat the latency and freshness targets in the spec as initial defaults to be tuned later.

**Definition of done:** the feature can report whether it is fast, degraded, or unhealthy without requiring guesswork.

- [ ] Task 11A complete

## Phase 4 — Super-Search And Inventory

### Task 12 — Agent-mode super-search integration

**What:** Add the stars-triggered long-form search input that lets the agent take over retrieval without becoming a chatbot.

**Write tests first:**
1. Stars/sparkle affordance opens or expands long-form input.
2. Long-form submission returns normal search results, not a chat transcript.
3. Agent-mode search returns grounded reasons.
4. Similar-search agent prompt returns a short list.
5. Planner-aware agent search preserves planner fit reasoning.

**Implementation:**
1. Expose the search service to the agent layer.
2. Add `mode: agent` support to the search request path.
3. Do not fork ranking logic.
4. Keep UI and agent behavior aligned.

**Definition of done:** the long-form path behaves like super-search and returns recipes from the indexed library with evidence.

- [ ] Task 12 complete

### Task 13 — Pantry/fridge/freezer camera popup and inventory-led search

**What:** Add the camera-triggered popup that captures live inventory photos and feeds ingredient-aware search.

**Write tests first:**
1. Camera icon opens inventory capture popup.
2. Popup supports multi-photo live capture and submit.
3. Parsed inventory can be attached to subsequent search requests.
4. Results reflect inventory fit when a pantry snapshot exists.
5. Temporary pantry photos are deleted after a successful response.
6. Temporary pantry photos are deleted after model busy/failure responses.
7. Pantry-photo search does not create durable history or backup artifacts.

**Implementation:**
1. Reuse the existing capture language where helpful, but scope to live camera + submit.
2. Submit photos to an inventory-processing workflow.
3. Add pantry snapshot ID or equivalent to search requests.
4. Keep pantry artifacts request-scoped and temp-directory backed only.
5. Delete temp photos after response or failure.
6. Add inventory-fit reasoning to results.

**Definition of done:** users can search from what they have on hand without entering ingredients manually.

- [ ] Task 13 complete

---

## Phase 5 — Library Recovery

### Task 14 — Soft delete contract and service rules

**What:** Add safe delete behavior without data loss.

**Write tests first:**
1. Soft delete hides recipe from active library/search/discovery.
2. Soft delete is blocked when recipe is assigned in current/future planner slots.
3. Delete-blocked response returns a friendly reason.
4. Deleted recipe appears in trash list.

**Implementation:**
1. Add delete fields to `recipes`.
2. Add trash list contract.
3. Update all active recipe queries to exclude deleted rows.
4. Add planner-usage guard.

**Definition of done:** delete becomes reversible and safe.

- [ ] Task 14 complete

### Task 15 — Recycle Bin UI + restore flow

**What:** Add the recipe-library recovery surface.

**Write tests first:**
1. Recycle Bin entry is visible on the library/search surface.
2. Trash list shows deleted recipes.
3. Restore returns recipe to active library/search.
4. Restore preserves notes/rating/discovery state.
5. Restore is available without an admin role.

**Implementation:**
1. Add Recycle Bin entry and list view.
2. Add restore action.
3. Preserve search/library calmness and avoid deep navigation traps.
4. Keep restore available to any household member.

**Definition of done:** mistaken deletion is easy to recover from.

- [ ] Task 15 complete

### Task 16 — Hard delete purge from Recycle Bin

**What:** Permanently remove a soft-deleted recipe from DB and disk.

**Write tests first:**
1. Hard delete removes DB row and dependent search document.
2. Hard delete removes disk images/sidecar files.
3. Hard delete only works for recipes already in trash.
4. Purged recipe cannot be restored.
5. Hard delete requires a valid elevated-PIN challenge.
6. Hard delete is unavailable when the deployment PIN is not configured.

**Implementation:**
1. Add purge endpoint/service.
2. Clean up filesystem assets explicitly.
3. Add elevated-PIN challenge using a deployment-time environment variable.
4. Keep failure handling transactional or compensating.

**Definition of done:** purge is real and final, with no orphaned files.

- [ ] Task 16 complete

---

## Phase 6 — Capture Recovery In Settings

### Task 17 — Persist failed captures and friendly reasons

**What:** Make capture failure durable and understandable.

**Write tests first:**
1. Failed URL/photo/describe captures create failure records.
2. Friendly reason is stored for the user.
3. Technical reason is stored separately.
4. Resolved retries leave the active failed queue.

**Implementation:**
1. Add `capture_failures` table/model.
2. Update capture/import paths to persist failure records.
3. Define friendly-message mapping rules.

**Definition of done:** failures stop disappearing into logs.

- [ ] Task 17 complete

### Task 18 — Settings > Failed Captures queue with retry

**What:** Add the UI queue and retry loop in Settings.

**Write tests first:**
1. Settings shows failed capture rows.
2. Friendly reason is visible by default.
3. Retry re-enqueues the right workflow.
4. Successful retry clears or resolves the failure row.
5. Empty state is calm and explicit.

**Implementation:**
1. Add `Failed Captures` section to Settings.
2. Show source, preview, friendly reason, timestamp, retry.
3. Add optional technical details disclosure.

**Definition of done:** capture recovery becomes self-serve.

- [ ] Task 18 complete

---

## Phase 7 — Hardening And Review

### Task 19 — End-to-end hardening, blind spots, and flow sync

**What:** Close the gaps that create future debugging work.

**Write tests first / validate:**
1. Search from Planner works through selection success.
2. Search detail edit loop preserves state.
3. Similar search loop works.
4. Soft delete -> restore -> hard delete lifecycle works.
5. Failed capture -> retry lifecycle works.
6. Flow docs still match implementation.

**Implementation:**
1. Add any missing E2E coverage.
2. Update flow docs with implementation decisions that changed.
3. Run full validation workflow.

**Definition of done:** feature can be handed to a smaller execution model without hidden gaps.

- [ ] Task 19 complete

---

## Notes / Decisions

- Recycle Bin primary access belongs in the recipe library/search surface, not Settings.
- Failed Captures belongs in Settings.
- Hard delete only happens from Recycle Bin and must remove database + disk assets.
- Search should ship lexically first, then add durable index backup/restore, then become hybrid, then add agent-mode and inventory-led super-search.
- Avoid introducing a second detail page if a detail sheet can preserve query context.
- Formal ranking-quality evaluation is deferred to the roadmap until enough real household query data exists to seed a coherent dataset.
