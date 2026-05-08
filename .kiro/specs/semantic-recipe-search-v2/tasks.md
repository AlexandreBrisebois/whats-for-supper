# Tasks v2: Semantic Recipe Search

## Operating rules for all tasks

**Read before you act:**
- `requirements.md` in this directory
- `design.md` in this directory
- `docs/flows/user-flows/recipe-search-and-library-recovery.md`
- `docs/flows/data-flows/recipe-search-index-and-recovery.md`

**Before marking any task done:**
1. `task agent:drift` — zero schema drift
2. `task agent:test:impact` — impacted tests pass
3. `task review` — lint, typecheck, all tests pass

**Small-model execution rules:**
- One primary seam per task (contract, service, or UI — not all three).
- Tests FIRST: write the test, watch it fail, then implement until it passes.
- Do not invent UX, endpoints, `data-testid` values, or DTO fields beyond what the spec authorizes.
- Do not touch files outside the task scope. Surface "while I'm in here" improvements as a note, not inline changes.
- Every new E2E mock route MUST be added to `setupCommonRoutes` in `pwa/e2e/mock-api.ts` unless
  the task explicitly authorizes a per-test override.
- Every new MOCK_ID constant MUST be added to `pwa/e2e/mock-ids.ts`.

**E2E selector rule — non-negotiable:**
ALL E2E test interactions and assertions MUST use `page.getByTestId(...)`.
`getByText`, `getByRole`, `getByLabel`, `getByPlaceholder`, CSS class selectors,
and XPath are FORBIDDEN in E2E tests for this feature.
The authoritative list of valid `data-testid` values is in `design.md`.
Do not introduce a `data-testid` not listed there. Do not reference a `data-testid` that
does not yet exist in `design.md` — add it to `design.md` first, then use it.

**Completion definition** (from `contract-testing.md`):
- OpenAPI spec updated, drift passes.
- Unit tests pass on both API and PWA sides when a contract seam is touched.
- E2E tests added for the user-visible behaviour introduced by the task.
- `task review` passes.

---

## Phase 1 — Search Contract And UI Loop

Phase 1 ships a working search shell. No vector logic. No detail sheet yet.
Users can type a query, press Enter, and see Top Pick + alternates from a lexical backend.
Planner handoff still works.

---

### Task 1 — OpenAPI search contract + generated client

**Seam:** Contract only.

**Tracer bullet:**
Write a contract snapshot test that fails because `RecipeSearchRequestDto` does not yet exist.
Add the schema to `specs/openapi.yaml`. Watch the snapshot test pass.
Regenerate the TS client. Confirm `/recipes` page can import the generated types without
compiler errors.

**Write tests first:**
1. Contract snapshot test: `RecipeSearchRequestDto` schema exists in the generated client.
2. Contract snapshot test: `RecipeSearchResponseDto` schema exists.
3. Contract snapshot test: `RecipeSearchResultDto` has `id`, `name`, `imageUrl`, `reasons`,
   `plannerFitNote`.
4. Contract snapshot test: `RecipeSearchReasonDto` has `source` and `label`.
5. Contract snapshot test: `RecipeSearchFiltersDto` has all six boolean fields.

**Implementation:**
1. Add to `specs/openapi.yaml`:
   - `POST /api/recipes/search` endpoint with request body `RecipeSearchRequestDto`
     and response body `RecipeSearchResponseDto`.
   - Schemas: `RecipeSearchRequestDto`, `RecipeSearchResponseDto`, `RecipeSearchResultDto`,
     `RecipeSearchReasonDto`, `RecipeSearchFiltersDto`.
2. `limit` field: `type: integer, minimum: 1, maximum: 5, default: 5`.
3. `mode` field: `type: string, enum: [standard, agent]`.
4. `resultPath` field on response: `type: string, enum: [lexical-only, hybrid, fallback-lexical]`.
5. `searchMode` field on response: `type: string, enum: [standard, agent, similar, pantry-assisted]`.
6. Run `task api:generate` to regenerate the TS client.
7. Verify `pwa/src/lib/api/generated` compiles without errors.

**Add to `setupCommonRoutes` in `pwa/e2e/mock-api.ts`:**
```ts
await page.route('**/api/recipes/search', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: {
        topPick: null,
        results: [],
        appliedFilters: {},
        searchMode: 'standard',
        resultPath: 'lexical-only',
      },
    }),
  });
});
```

**Definition of done:**
- Contract snapshot tests pass.
- Generated client compiles.
- `task agent:drift` passes.
- New mock route is in `setupCommonRoutes`.

**No PWA UI changes in this task.**

- [ ] Task 1 complete

---

### Task 2 — `/recipes` search shell with Enter-to-search and state preservation

**Seam:** PWA UI only. Consumes the contract from Task 1. No new API endpoints.

**Tracer bullet:**
Write an E2E test that navigates to `/recipes`, types a query, presses Enter, and asserts that
`data-testid="recipe-card-top-pick"` is visible. Watch it fail. Implement the page changes.
Watch it pass.

**Write tests first (PWA unit tests):**
1. Search input renders immediately with `data-testid="recipe-search-input"`.
2. Typing a query and pressing Enter calls `POST /api/recipes/search` with the query string.
3. Top Pick card renders when response contains a `topPick`.
4. Each alternate card renders with `data-testid="recipe-card-<recipeId>"`.
5. `data-testid="search-empty-state"` is visible when `results` is empty and `topPick` is null.
6. `data-testid="agent-search-trigger"` is present.
7. `data-testid="inventory-camera-trigger"` is present.
8. `data-testid="recycle-bin-entry"` is present (placeholder — non-functional in Phase 1).

**Write tests first (E2E):**
1. Navigate to `/recipes` →
   `page.getByTestId('recipe-search-input')` is visible →
   fill `recipe-search-input` with "chicken" → press Enter →
   mock returns a `topPick` result →
   `page.getByTestId('recipe-card-top-pick')` is visible.
2. Navigate to `/recipes?addToDay=2&weekOffset=0` →
   `page.getByTestId('planning-mode-banner')` is visible →
   `page.getByTestId('planning-mode-cancel').click()` →
   URL becomes `/planner`.
3. Navigate to `/recipes` → mock search returns `{ topPick: null, results: [] }` →
   `page.getByTestId('search-empty-state')` is visible.

**Implementation:**
1. Replace `getRecommendations()` call in `pwa/src/app/(app)/recipes/page.tsx` with a call to
   `POST /api/recipes/search` (using the generated client type).
2. Default call on mount: `{ query: '', mode: 'standard', limit: 5 }`.
3. Enter key handler: fire search with current `query`.
4. Result rendering: use `RecipeSearchResultDto` shape. Top Pick uses `data-testid="recipe-card-top-pick"`. Alternates use `data-testid="recipe-card-<id>"`.
5. Empty state: when `topPick == null && results.length == 0`, render `data-testid="search-empty-state"` with copy "No matches yet. Try a different description or clear filters." and a "Clear Filters" button.
6. Add placeholder `data-testid="agent-search-trigger"` (non-functional button — wire in Task 12).
7. Add placeholder `data-testid="inventory-camera-trigger"` (non-functional — wire in Task 13).
8. Add placeholder `data-testid="recycle-bin-entry"` (non-functional — wire in Task 15).
9. State shape: see `RecipeSearchPageState` in `design.md`. All fields initialized on mount.
   `openDetailRecipeId` starts as null. `similarToRecipeId` starts as null.

**Important:** The planner-context mock (`/api/recipes/search` with planner params) should be
handled by the default `setupCommonRoutes` mock added in Task 1.

**Definition of done:**
- E2E tests pass.
- PWA unit tests pass.
- Planner handoff (`addToDay` + `weekOffset`) still works end-to-end.
- `task review` passes.

- [ ] Task 2 complete

---

### Task 3 — Deterministic lexical/fuzzy search service (API)

**Seam:** API service + controller only. No PWA changes.

**Tracer bullet:**
Write an API integration test asserting that `POST /api/recipes/search` with `{ query: "chicken" }`
returns at least the recipe named "Chicken Stir Fry" from a seeded test database.
Watch it fail. Implement `RecipeSearchService` until it passes.

**Write tests first (API unit/integration):**
1. Query "chicken" matches recipe whose name contains "chicken" (trigram fuzzy match).
2. Query matches recipe whose `document_text` notes section contains the query word.
3. Query with no exact keyword still returns fuzzy text candidates (trigram similarity > 0).
4. Search excludes recipes where `deleted_at IS NOT NULL`.
5. Search returns at most 5 results regardless of how many candidates match.
6. `resultPath` is `"lexical-only"` on all responses in Phase 1 (no vector path yet).
7. `reasons` array is non-empty for results; each reason has `source` and `label`.
8. Empty query with no filters returns up to 5 default results (ordered by `createdAt DESC`).
9. `appliedFilters` in response mirrors the filters sent in the request.

**Implementation:**
1. Create `RecipeSearchService` (or equivalent) with lexical/fuzzy retrieval using
   `pg_trgm` similarity on `document_text`.
   - `document_text` is temporarily built at query time from `recipes` columns
     (full `recipe_search_documents` table lands in Task 9).
   - Build text as: `<name>. <description>. Ingredients: <comma-joined>. Notes: <notes>.`
2. Exclude `deleted_at IS NOT NULL` recipes from all candidate queries.
3. Return explainable reasons per result. Logic:
   - Name trigram similarity > 0.3 → reason `{ source: "name-match", label: "Name matches your search" }`
   - Notes trigram similarity > 0.3 → reason `{ source: "notes-match", label: "Your notes mention this" }`
4. Clamp results to `limit` (default 5, max 5).
5. Set `resultPath = "lexical-only"` on all responses.
6. Wire service into `POST /api/recipes/search` controller.

**Definition of done:**
- API integration tests pass.
- `task agent:drift` passes.
- `task review` passes.
- No PWA changes needed.

- [ ] Task 3 complete

---

### Task 4 — Planner-aware top pick reranking

**Seam:** API service extension only. No new contracts. No PWA changes.

**Tracer bullet:**
Write an API test asserting that when `weekOffset=0` and `dayIndex=2` are passed and recipe A is
already assigned to day 2 of that week, recipe A does NOT appear in results. Watch it fail.
Implement planner exclusion logic. Watch it pass.

**Write tests first (API unit/integration):**
1. Search with `weekOffset` + `dayIndex`: excludes recipes already assigned in that week.
2. When weekly balance data shows a vegetable gap and a vegetable recipe is a candidate,
   that recipe is promoted to `topPick`.
3. When no planner context provided, `topPick` is based on query fit only.
4. `topPick.plannerFitNote` is a non-empty string when planner context is provided.
5. `topPick.plannerFitNote` is null when no planner context is provided.
6. Query containing "quick" with planner context boosts recipes with `totalTime ≤ 30 min`.

**Implementation:**
1. In `RecipeSearchService`, after lexical retrieval, apply planner-aware reranking
   when `weekOffset` and `dayIndex` are present:
   a. Load current week assignments from the schedule service.
   b. Exclude recipes already assigned in the target week.
   c. Load `WeeklyBalanceSummaryDto` from the planner service.
   d. Apply score modifier `+0.20` to recipes that close a balance gap.
   e. Apply urgency modifier `+0.10` to recipes with `totalTime ≤ 30 min` when query
      implies urgency ("quick", "fast", "tonight").
2. Set `plannerFitNote` on the result that becomes `topPick`.
   Examples: `"Helps add vegetables to this week"`, `"Quick option for tonight"`,
   `"Not yet planned this week"`.
3. Planner reranker MUST NOT call the embedding provider. Deterministic only.

**Definition of done:**
- API integration tests pass.
- Existing planner E2E tests still pass.
- `task review` passes.

- [ ] Task 4 complete

---

## Phase 2 — Family Memory And Detail Actions

Phase 2 ships household signal ranking and the full recipe detail sheet.
Users can tap a result, see the full recipe, edit notes/rating, toggle discovery,
and navigate to "Find Similar" — all without leaving search context.

---

### Task 5 — Notes, rating, and discovery-aware ranking

**Seam:** API service extension only. No new contracts (except `isDiscoverable` on `UpdateRecipeDto` — see Task 7). No PWA changes.

**Tracer bullet:**
Write an API unit test asserting that a recipe with `rating == 3` scores higher than an
otherwise equal recipe with `rating == 0`. Watch it fail. Add the rating boost. Watch it pass.

**Write tests first (API unit):**
1. Recipe with `rating == 3` (Love) ranked above an equivalent `rating == 0` recipe.
2. Recipe with `rating == 1` (Dislike) ranked below an equivalent `rating == 0` recipe.
3. Recipe whose `notes` contain the query term ranked above a non-notes match.
4. Discovery positive-vote count contributes a bounded `+boost_votes` modifier.
5. Vote boost is capped at `0.15` regardless of vote count.
6. Reasons array includes `{ source: "rating-boost", label: "..." }` for Love/Like/Dislike.
7. Reasons array includes `{ source: "notes-match", label: "Your notes mention this" }` when notes hit.
8. Reasons array includes `{ source: "vote-boost", label: "Family has shown interest" }` when vote boost applies.
9. Boosts are bounded: a Love rating alone cannot overcome a completely non-matching query.

**Score constants to extract (as named constants, not magic numbers):**
```
BOOST_LOVE       = 0.15
BOOST_LIKE       = 0.08
BOOST_DISLIKE    = 0.10
BOOST_VOTES_MAX  = 0.15
BOOST_VOTES_RATE = 0.05
```

**Implementation:**
1. Add family-fit modifier stage to `RecipeSearchService` after planner reranking.
2. Extract all score constants as named values in one configuration location.
3. Add reasons for each active boost.

**Definition of done:**
- API unit tests pass.
- No PWA changes.
- `task review` passes.

- [ ] Task 5 complete

---

### Task 6 — Recipe detail sheet from search results

**Seam:** PWA UI only. Consumes existing `GET /api/recipes/{id}` and `PATCH /api/recipes/{id}`.

**Tracer bullet:**
Write an E2E test:
`page.getByTestId('recipe-card-top-pick').click()` →
`page.getByTestId('recipe-detail-sheet')` is visible →
`page.getByTestId('recipe-detail-name')` contains the recipe name →
`page.getByTestId('action-close-sheet').click()` →
`page.getByTestId('recipe-detail-sheet')` is not visible →
`page.getByTestId('recipe-card-top-pick')` is still visible.
Watch it fail. Implement the sheet. Watch it pass.

**Write tests first (PWA unit):**
1. Tapping a result card sets `openDetailRecipeId` and renders `data-testid="recipe-detail-sheet"`.
2. Sheet renders recipe name, time, difficulty, ingredients, notes, rating.
3. Sheet renders `data-testid="action-close-sheet"` button.
4. Closing the sheet does NOT trigger a new `POST /api/recipes/search` call.
5. Search state (`topPick`, `results`, `query`) is unchanged after sheet close.
6. Notes input (`data-testid="recipe-notes-input"`) is editable; changing it calls
   `PATCH /api/recipes/{id}` with `{ notes: "<new value>" }`.
7. Rating selector (`data-testid="recipe-rating-selector"`) calls
   `PATCH /api/recipes/{id}` with `{ rating: <value> }`.
8. Sheet renders context-appropriate primary CTA:
   - `action-use-for-day` when `addToDay` is in URL.
   - `action-save-for-tonight` otherwise.
9. `action-find-similar` is present in the sheet.
10. `action-move-to-bin` is present in the sheet (non-functional in Phase 2 — wired in Phase 5).

**Write tests first (E2E):**
1. Navigate to `/recipes` → mock search returns a `topPick` result →
   `page.getByTestId('recipe-card-top-pick').click()` →
   `page.getByTestId('recipe-detail-sheet')` is visible →
   `page.getByTestId('recipe-detail-name')` contains the recipe name →
   `page.getByTestId('action-close-sheet').click()` →
   `page.getByTestId('recipe-detail-sheet')` is not visible →
   `page.getByTestId('recipe-card-top-pick')` is still visible.
2. Navigate to `/recipes` → mock search returns a result →
   `page.getByTestId('recipe-card-top-pick').click()` →
   `page.getByTestId('recipe-notes-input')` is visible →
   fill `recipe-notes-input` with "kids loved it" →
   PATCH `/api/recipes/{id}` is called with `{ notes: "kids loved it" }` →
   `page.getByTestId('recipe-detail-sheet')` is still visible.
3. Navigate to `/recipes?addToDay=2&weekOffset=0` → mock search returns a result →
   `page.getByTestId('recipe-card-top-pick').click()` →
   `page.getByTestId('action-use-for-day')` is visible →
   `page.getByTestId('action-use-for-day').click()` →
   planner assignment API called → URL becomes `/planner?success=1&dayIndex=2`.

**Implementation:**
1. Create `RecipeDetailSheet` component (sheet/drawer overlay).
2. Fetch `GET /api/recipes/{id}` on mount.
3. Notes and rating edits call `PATCH /api/recipes/{id}`. Debounce notes by 800 ms.
4. `action-close-sheet` unmounts the sheet; sets `openDetailRecipeId = null` in page state.
   MUST NOT trigger a new search API call.
5. `action-find-similar` sets `similarToRecipeId = recipeId` and `openDetailRecipeId = null`,
   then fires a new search with `{ similarToRecipeId, query: '' }`.
6. Primary CTA in planner mode calls `assignRecipeToDay` (existing function) then navigates.
7. `action-move-to-bin` is rendered but shows "coming soon" or disabled in Phase 2.

**Important:** Do not implement `isDiscoverable` toggle yet. That comes in Task 7 after the
contract change is in place.

**Definition of done:**
- E2E tests pass.
- PWA unit tests pass.
- Planner assignment still works.
- `task review` passes.

- [ ] Task 6 complete

---

### Task 7 — Discovery toggle + `isDiscoverable` contract extension

**Seam:** Contract change (OpenAPI + TS client regen) + API controller + PWA UI.

**This task touches the OpenAPI spec. Follow Atomic Sync:**
1. Update `openapi.yaml` first.
2. Run `task api:generate`.
3. Implement API change.
4. Implement PWA change.
5. Run `task agent:drift`.

**Tracer bullet:**
Write a contract snapshot test that `UpdateRecipeDto` includes `isDiscoverable`.
Watch it fail. Add the field to `openapi.yaml`. Regen client. Watch it pass.

**Write tests first (contract):**
1. Snapshot: `UpdateRecipeDto` has `isDiscoverable: boolean | null` field.
2. API integration: `PATCH /api/recipes/{id}` with `{ isDiscoverable: false }` sets field in DB.
3. PWA unit: toggling `action-toggle-discovery` calls PATCH with the new boolean.
4. PWA unit: toggling and then closing the sheet does NOT navigate away.
5. PWA unit: `Find Similar` from detail sheet re-runs search with `similarToRecipeId` set and
   `query` cleared.
6. API integration: similar search with `similarToRecipeId` excludes the source recipe from results.
7. API integration: similar search with no embedding available falls back to lexical matching
   against the source recipe's `document_text`.

**Implementation:**
1. Add `isDiscoverable: { type: [boolean, 'null'] }` to `UpdateRecipeDto` in `specs/openapi.yaml`.
2. Run `task api:generate`.
3. Add `isDiscoverable` update handling to the API `PATCH /api/recipes/{id}` controller.
4. Add `action-toggle-discovery` to `RecipeDetailSheet`. On toggle: call PATCH immediately
   (no debounce — boolean state change is atomic).
5. Wire `action-find-similar` properly: set `similarToRecipeId`, clear `query`, fire search.
6. Feed `similarToRecipeId` through `POST /api/recipes/search` → service → exclude source recipe.

**Write tests first (E2E):**
1. Navigate to `/recipes` → mock search returns a result with `id = MOCK_IDS.RECIPE_LASAGNA` →
   `page.getByTestId('recipe-card-top-pick').click()` →
   `page.getByTestId('action-find-similar').click()` →
   mock `POST /api/recipes/search` intercept asserts request body has `similarToRecipeId = MOCK_IDS.RECIPE_LASAGNA` →
   `page.getByTestId('recipe-card-top-pick')` is visible with a different recipe →
   `page.getByTestId(`recipe-card-${MOCK_IDS.RECIPE_LASAGNA}`)` is NOT visible (source excluded).

**Definition of done:**
- Contract snapshot tests pass.
- `task agent:drift` passes.
- API integration tests pass (both sides of seam).
- E2E tests pass.
- `task review` passes.

- [ ] Task 7 complete

---

### Task 8 — Quick filters row

**Seam:** PWA UI + API filter logic.

**Tracer bullet:**
Write an E2E test:
`page.getByTestId('filter-never-tried').click()` →
assert `page.getByTestId('filter-never-tried-active')` is visible →
mock `POST /api/recipes/search` returns `{ topPick: null, results: [] }` →
`page.getByTestId('filter-no-results')` is visible.
Watch it fail. Implement the filter pill. Watch it pass.

**Write tests first (PWA unit):**
1. Each of the 5 filter pills renders with its `data-testid`.
2. Tapping a filter pill toggles it visually (active vs inactive).
3. Active filter pill renders with `data-testid="filter-<name>-active"`.
4. Toggling a filter sends a new `POST /api/recipes/search` with updated `filters` payload.
5. Multiple active filters combine in the request as multiple boolean `true` fields.
6. When all 5 filters are active and mock returns empty results, `filter-no-results` is visible.
7. Mobile layout: 5 pills visible without horizontal scroll on a 375px wide viewport.

**Write tests first (API unit):**
1. `neverCooked: true` filter excludes recipes where `lastCookedDate IS NOT NULL`.
2. `familyFavorite: true` filter includes only recipes with `rating >= 2` and
   (`isDiscoverable == true` OR `notes IS NOT NULL`).
3. `quickOnly: true` filter includes only recipes with `totalTime` parsing to ≤ 30 minutes.
4. `notCookedInLongTime: true` filter includes only recipes where
   `lastCookedDate < now() - INTERVAL '60 days'`.
5. `newRecipes: true` filter includes only recipes with `createdAt` within last 30 days.
6. Combining two filters returns the intersection.
7. Over-constrained filters return empty `results` array with HTTP 200 (not an error).

**Implementation:**
1. Add quick filter pill row to `/recipes` page (below agent/camera triggers).
2. Filter pill tap updates `activeFilters` in page state and fires a new search.
3. Add filter application to `RecipeSearchService` (WHERE clause additions).
4. Implement the 5 filter definitions exactly as specified in `requirements.md` R5-AC4.
5. `filter-no-results` element is shown when results are empty AND at least one filter is active.
   Copy: "No matches with these filters. Try removing one."

**Write tests first (E2E):**
1. `page.getByTestId('filter-never-tried').click()` →
   `page.getByTestId('filter-never-tried-active')` is visible →
   mock returns empty results →
   `page.getByTestId('filter-no-results')` is visible.
2. `page.getByTestId('filter-quick').click()` →
   `page.getByTestId('filter-quick-active')` is visible →
   mock `POST /api/recipes/search` intercept asserts request body has `filters.quickOnly: true`.
3. `page.getByTestId('filter-never-tried').click()` →
   `page.getByTestId('filter-quick').click()` →
   mock intercept asserts request body has both `filters.neverCooked: true` AND `filters.quickOnly: true`.

**Definition of done:**
- PWA unit tests pass.
- API unit tests pass.
- E2E tests pass.
- `task review` passes.

- [ ] Task 8 complete

---

## Phase 3 — Durable Index Seams

Phase 3 adds the data infrastructure for vector search. No user-visible semantic improvement yet.
The product continues to function on lexical search. Phase 3 makes Phase 5 possible.

---

### Task 9 — Search index schema, fingerprint utility, and indexing workflow

**Seam:** DB migration + API workflow only. No PWA changes.

**Tracer bullet:**
Write a unit test that computes `source_fingerprint` for a known recipe input and asserts
it equals a pre-computed expected SHA-256 hex string. Watch it fail (function doesn't exist).
Implement the function. Watch it pass.

**Write tests first (API unit):**
1. `computeSourceFingerprint(recipe)` returns the expected SHA-256 hex for a known input.
   Hardcode expected value in test using the canonical field set from requirements.md R8-AC5.
2. Two calls with identical input return identical output (deterministic).
3. Changing any single field in the canonical set changes the output hash.
4. Indexing workflow enqueues when recipe is created.
5. Indexing workflow enqueues when any search-relevant field changes (name, description,
   notes, ingredients, rating, isDiscoverable, dietaryProfile, category, totalTime).
6. Indexing workflow does NOT enqueue when non-search-relevant fields change (e.g. `sourceUrl`).
7. A second enqueue for the same `recipeId + fingerprint` while the first is `pending` is a no-op.
8. `index_status` transitions from `pending` → `indexing` → `ready` on successful embedding.
9. `index_status` transitions to `failed` on embedding provider error.
10. Worker exits without writing when job fingerprint != current recipe fingerprint (stale guard).

**Implementation:**
1. Write and run DB migration adding `recipe_search_documents` table
   (schema from requirements.md R8-AC7).
2. Create `computeSourceFingerprint(recipe)` utility function in one shared location
   (one file, tested in isolation). Implements SHA-256 of canonical JSON from R8-AC5.
3. Create `SearchIndexWorkflow` (or equivalent workflow step) that:
   a. Reads recipe + search-relevant fields.
   b. Builds `document_text` using the template from R8-AC6.
   c. Compares job fingerprint with current recipe fingerprint. Exits if stale.
   d. Calls configured embedding provider (`EMBEDDING_MODEL_ID` env var).
   e. Upserts `recipe_search_documents`.
   f. Sets `index_status = 'ready'` and `last_indexed_at = now()`.
4. Hook workflow enqueue into recipe create/update/restore paths.
5. Implement the no-op dedup guard before enqueue.

**Definition of done:**
- DB migration runs without errors.
- Fingerprint utility unit tests pass.
- Workflow unit tests pass.
- `task agent:drift` passes (schema change is tracked).
- `task review` passes.

- [ ] Task 9 complete

---

### Task 10 — Backup/restore-compatible index persistence

**Seam:** Management service extension only. No PWA changes. No new public API endpoints.

**Tracer bullet:**
Write an integration test: call `BackupAsync`, assert `search.index.json` is written to the
recipe's directory. Then call `RestoreAsync` with that backup. Assert `recipe_search_documents`
is upserted with `index_status = 'ready'`. Watch it fail. Implement. Watch it pass.

**Write tests first (API integration):**
1. `BackupAsync` writes `search.index.json` for each recipe with `index_status = 'ready'`.
2. `BackupAsync` does NOT write `search.index.json` for recipes with `index_status = 'pending'`
   or `'failed'` (no artifact to export).
3. `RestoreAsync` with a present and compatible `search.index.json` upserts
   `recipe_search_documents` with `index_status = 'ready'`.
4. `RestoreAsync` with a present `search.index.json` whose `schemaVersion` differs from 1
   marks the recipe as `index_status = 'pending'`.
5. `RestoreAsync` with a present `search.index.json` whose `embeddingModel` differs from
   the current `EMBEDDING_MODEL_ID` env var marks the recipe as `index_status = 'pending'`.
6. `RestoreAsync` with no `search.index.json` marks the recipe as `index_status = 'pending'`.
7. A restored record with `index_status = 'ready'` is NOT overwritten by an older queued job
   whose fingerprint no longer matches the current recipe state.
8. Emit `recipe_index_restore_rehydrated` when sidecar is compatible.
9. Emit `recipe_index_restore_marked_pending` with reason `"missing"` or `"incompatible"`
   when sidecar is absent or incompatible.

**Implementation:**
1. In `ManagementService.BackupAsync`: for each recipe with `index_status = 'ready'`,
   read `recipe_search_documents` and write `search.index.json` to the recipe directory.
   Use the sidecar schema from requirements.md R8-AC18.
2. In `ManagementService.RestoreAsync`: for each restored recipe, check for `search.index.json`.
   - If present and compatible: upsert `recipe_search_documents`, set `index_status = 'ready'`.
   - Otherwise: set `index_status = 'pending'`, emit telemetry.
3. The compatibility check: `schemaVersion == 1` AND `embeddingModel == EMBEDDING_MODEL_ID`.
4. Restored row establishes current state: stale queued jobs whose fingerprint mismatches
   will not overwrite it (stale-guard in Task 9 handles this).

**Definition of done:**
- Backup/restore integration tests pass.
- Telemetry events emitted correctly.
- `task review` passes.

- [ ] Task 10 complete

---

### Task 11 — Vector backfill and hybrid retrieval

**Seam:** API search service + index workflow extension.

**Tracer bullet:**
Write an integration test that seeds a recipe with an embedding, then sends a search query
that would NOT match lexically but WOULD match semantically. Assert the recipe appears in
results with `resultPath = "hybrid"`. Watch it fail. Wire the vector retrieval path. Watch it pass.

**Write tests first (API integration):**
1. Recipe with an embedding returns in results for a semantically-matching query
   that does not lexically match.
2. `resultPath = "hybrid"` when vector candidates contributed to the result.
3. `resultPath = "lexical-only"` when no recipe has an embedding yet.
4. `resultPath = "fallback-lexical"` when vector retrieval is available but times out (mock timeout).
5. Soft-deleted recipes are excluded from vector candidate retrieval.
6. Stale-job guard: a job with a mismatched fingerprint does not overwrite a newer
   `recipe_search_documents` row.
7. Hard delete of a recipe removes its `recipe_search_documents` row (via ON DELETE CASCADE
   if the purge flow removes the `recipes` row correctly).

**Implementation:**
1. Add vector retrieval to `RecipeSearchService`:
   - Use pgvector cosine similarity query on `recipe_search_documents.embedding`.
   - Apply 300 ms request budget. If exceeded: skip vector, set `resultPath = "fallback-lexical"`,
     emit `recipe_search_fallback_served`.
   - Merge vector candidates with lexical candidates; dedup by `recipeId`, keep max score.
2. Add backfill path: a `BackfillSearchIndexAsync` method that processes all recipes with
   `index_status IN ('pending', 'stale', 'failed')` in batches. Idempotent and safe to rerun.
3. Implement stale-job compare-before-upsert (verify fingerprint before writing).
4. Implement hard-delete invalidation: when a recipe is purged, cancel pending index jobs
   and prevent recreation.

**Definition of done:**
- Integration tests pass.
- Hybrid search works without breaking Phase 1 lexical behaviour.
- `task review` passes.

- [ ] Task 11 complete

---

### Task 11A — Feature instrumentation

**Seam:** Telemetry only. No new contracts. No UI changes.

**Tracer bullet:**
Write a unit test that stubs the telemetry emitter and asserts `recipe_search_completed` is
emitted with `{ mode, resultPath, resultCount, topPickPresent, durationMs }` after a search call.
Watch it fail. Instrument the service. Watch it pass.

**Write tests first (API unit):**
1. `recipe_search_requested` emitted on every search request with `{ mode, hasPlanner, hasFilters, hasPantry }`.
2. `recipe_search_completed` emitted with `{ mode, resultPath, resultCount, topPickPresent, durationMs }`.
3. `recipe_search_fallback_served` emitted with `{ reason: "vector_timeout" }` when vector budget exceeded.
4. `recipe_search_empty_results` emitted when results array is empty.
5. `recipe_index_job_completed` emitted with `{ recipeId, durationMs }` on successful index.
6. `recipe_index_job_failed` emitted with `{ recipeId, error }` on failure.
7. `recipe_index_job_stale` emitted with `{ recipeId, reason: "fingerprint_mismatch" }` on stale guard.
8. `recipe_index_restore_rehydrated` emitted on compatible sidecar restore.
9. `recipe_index_restore_marked_pending` emitted on missing/incompatible sidecar restore.

**Implementation:**
1. Instrument `RecipeSearchService` with structured telemetry calls.
2. Instrument `SearchIndexWorkflow` with structured telemetry calls.
3. Instrument management backup/restore with restore-specific events.
4. All telemetry events use named constants, not inline string literals.
5. Extract `UNHEALTHY_INDEX_AGE_MINUTES = 10` as a named constant.

**Definition of done:**
- Telemetry unit tests pass.
- `task review` passes.

- [ ] Task 11A complete

---

## Phase 4 — Super-Search And Inventory

---

### Task 12 — Agent-mode super-search (stars trigger)

**Seam:** PWA UI (agent trigger) + API agent translation layer.

**Tracer bullet:**
Write an E2E test:
`page.getByTestId('agent-search-trigger').click()` →
`page.getByTestId('agent-search-input')` is visible →
fill `agent-search-input` with "something fresh and quick my kids will like" →
`page.getByTestId('agent-search-submit').click()` →
mock `POST /api/recipes/search` intercept asserts request body has `mode: "agent"` →
`page.getByTestId('recipe-card-top-pick')` is visible.
Watch it fail. Implement. Watch it pass.

**Write tests first (PWA unit):**
1. `getByTestId('agent-search-trigger')` tap shows `getByTestId('agent-search-input')` textarea.
2. `getByTestId('agent-search-submit')` tap calls `POST /api/recipes/search` with `mode: "agent"`.
3. Agent search results render in the same `recipe-card-top-pick` / `recipe-card-<id>` template.
4. Agent search does NOT render a chat UI or conversational response — no `data-testid="chat-response"` element exists in the DOM.
5. `getByTestId('agent-search-close')` tap hides `agent-search-input` and keeps existing results visible.

**Write tests first (API unit):**
1. `mode: "agent"` with a free-form query runs through the same `RecipeSearchService`.
2. Agent translation layer converts free-form query to a structured `RecipeSearchRequestDto`
   (stub the translation function in unit tests).
3. Agent search response is `RecipeSearchResponseDto`, not a chat response.
4. Planner context passed with agent mode is preserved through the translation.
5. `searchMode = "agent"` in the response when `mode: "agent"` was sent.

**Implementation:**
1. Wire `agent-search-trigger` to show/hide `agent-search-input` in the search page state.
2. Agent form submit sets `mode: "agent"` on the search request.
3. Add server-side agent translation layer:
   - Receives `{ query, mode: "agent", ...rest }`.
   - Applies a thin LLM prompt to extract potential filters or rewrite the query.
   - Passes the translated `RecipeSearchRequestDto` to `RecipeSearchService`.
   - MUST NOT fork ranking logic. Same service, different input prep.
4. Translation layer is a thin service boundary. It has its own unit tests (stubbed LLM).

**Write tests first (E2E):**
1. `page.getByTestId('agent-search-trigger').click()` →
   `page.getByTestId('agent-search-input')` is visible →
   fill `agent-search-input` with "something fresh and quick my kids will like" →
   `page.getByTestId('agent-search-submit').click()` →
   mock returns a result →
   `page.getByTestId('recipe-card-top-pick')` is visible →
   no element with `data-testid="chat-response"` exists in the DOM.
2. `page.getByTestId('agent-search-trigger').click()` →
   `page.getByTestId('agent-search-input')` is visible →
   `page.getByTestId('agent-search-close').click()` →
   `page.getByTestId('agent-search-input')` is not visible →
   `page.getByTestId('recipe-card-top-pick')` is still visible (results unchanged).

**Definition of done:**
- E2E tests pass.
- API unit tests pass.
- `task review` passes.

- [ ] Task 12 complete

---

### Task 13 — Pantry/fridge/freezer camera popup and inventory-led search

**Seam:** PWA UI (camera popup) + new API endpoints (`POST /api/inventory-captures`,
`GET /api/inventory-captures/{id}`).

**This task touches the OpenAPI spec. Follow Atomic Sync:**
1. Add endpoints to `openapi.yaml`.
2. Run `task api:generate`.
3. Implement API.
4. Implement PWA.

**New MOCK_IDs to add to `pwa/e2e/mock-ids.ts`:**
```ts
INVENTORY_CAPTURE: '770e8400-e29b-41d4-a716-446655440030',
```

**Write tests first (contract):**
1. Snapshot: `POST /api/inventory-captures` request and response schemas exist in generated client.
2. Snapshot: `GET /api/inventory-captures/{id}` response schema exists.

**Write tests first (API unit):**
1. `POST /api/inventory-captures` writes photos to `tmp/pantry-captures/<requestId>/<index>.jpg`.
2. Temp photos are deleted after snapshot is built (success path).
3. Temp photos are deleted after model-busy/failure response.
4. `POST /api/inventory-captures` returns HTTP 202 with `{ status: "busy", retryAfterSeconds: 30 }`
   when vision model is unavailable.
5. Pantry snapshot is in-memory only; no row written to DB.
6. `pantrySnapshotId` from the response can be passed to `POST /api/recipes/search`.
7. Search with a `pantrySnapshotId` adds `inventory-fit` reasons to matching recipes.

**Write tests first (PWA unit):**
1. `inventory-camera-trigger` tap opens `inventory-capture-popup`.
2. Popup renders `inventory-capture-submit` and `inventory-capture-cancel` buttons.
3. Submitting popup calls `POST /api/inventory-captures`.
4. On success, `pantrySnapshotId` is included in the next search call.
5. On busy (202 + `status: "busy"`), popup shows friendly retry message.
6. `inventory-capture-cancel` closes popup without making any API call.

**Add to `setupCommonRoutes`:**
```ts
await page.route('**/api/inventory-captures', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: {
        snapshotId: MOCK_IDS.INVENTORY_CAPTURE,
        inferredIngredients: ['chicken', 'pasta', 'tomatoes'],
        confidence: 0.85,
      },
    }),
  });
});
await page.route('**/api/inventory-captures/*', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: {
        snapshotId: MOCK_IDS.INVENTORY_CAPTURE,
        inferredIngredients: ['chicken', 'pasta', 'tomatoes'],
        confidence: 0.85,
      },
    }),
  });
});
```

**Write tests first (E2E):**
1. Navigate to `/recipes` →
   `page.getByTestId('inventory-camera-trigger').click()` →
   `page.getByTestId('inventory-capture-popup')` is visible →
   `page.getByTestId('inventory-capture-submit').click()` →
   mock `POST /api/inventory-captures` returns `{ snapshotId: MOCK_IDS.INVENTORY_CAPTURE, ... }` →
   subsequent mock `POST /api/recipes/search` intercept asserts request body has
   `pantrySnapshotId: MOCK_IDS.INVENTORY_CAPTURE` →
   `page.getByTestId('recipe-card-top-pick')` is visible.
2. Navigate to `/recipes` →
   `page.getByTestId('inventory-camera-trigger').click()` →
   `page.getByTestId('inventory-capture-popup')` is visible →
   `page.getByTestId('inventory-capture-cancel').click()` →
   `page.getByTestId('inventory-capture-popup')` is not visible →
   no API call to `/api/inventory-captures` was made.

**Definition of done:**
- Contract tests pass.
- API unit tests pass.
- E2E tests pass.
- Temp files are cleaned up in all paths.
- `task review` passes.

- [ ] Task 13 complete

---

## Phase 5 — Library Recovery

Phase 5 ships safe delete + Recycle Bin + hard purge.
This phase changes an existing mock contract. Read the CRITICAL note in Task 14 carefully.

---

### Task 14 — Soft delete contract and service rules

**Seam:** Contract change + API service + DB migration.

**CRITICAL: This task MUST update `setupCommonRoutes` in `pwa/e2e/mock-api.ts`.**
The existing `DELETE /api/recipes/*` mock returns `{ status: 204 }`.
This MUST be changed to return `{ status: 200, body: <soft-deleted recipe> }`.
Failure to do this will cause all existing E2E tests to pass with stale assumptions.
This mock update is part of the task definition of done.

**New MOCK_IDs to add to `pwa/e2e/mock-ids.ts`:**
```ts
RECIPE_IN_TRASH: '660e8400-e29b-41d4-a716-446655440025',
```

**Write tests first (contract):**
1. Snapshot: `DELETE /api/recipes/{id}` response schema is `RecipeDetailResponse` (not 204).
2. Snapshot: new `RecipeTrashListResponse` and `RecipeTrashItemDto` schemas exist.
3. Snapshot: `POST /api/recipes/{id}/restore` response schema is `RecipeDetailResponse`.

**Write tests first (API integration):**
1. `DELETE /api/recipes/{id}` sets `deleted_at IS NOT NULL` on the recipe row.
2. `DELETE /api/recipes/{id}` returns HTTP 200 with the updated recipe body.
3. After soft delete, `GET /api/recipes` does NOT include the deleted recipe.
4. After soft delete, `POST /api/recipes/search` does NOT return the deleted recipe.
5. After soft delete, `GET /api/recipes/trash` DOES include the deleted recipe.
6. `DELETE /api/recipes/{id}` returns HTTP 409 with `errorCode: "RECIPE_ASSIGNED_TO_PLANNER"`
   and `assignedDays` array when the recipe is in an active/future planner slot.
7. `GET /api/recipes/trash` returns `RecipeTrashListResponse` with all soft-deleted recipes.
8. `POST /api/recipes/{id}/restore` clears `deleted_at` and returns the recipe.
9. Restored recipe appears in `GET /api/recipes` and `POST /api/recipes/search`.
10. Restored recipe does NOT appear in `GET /api/recipes/trash`.

**DB migration:**
Add to `recipes` table:
```sql
ALTER TABLE recipes
  ADD COLUMN deleted_at  timestamptz null,
  ADD COLUMN deleted_by  uuid null,
  ADD COLUMN delete_note text null;
```
Update all active recipe queries to add `WHERE deleted_at IS NULL`.

**MUST update `setupCommonRoutes`:**
```ts
// Replace existing DELETE /api/recipes/* handler
if (route.request().method() === 'DELETE') {
  const id = /* extract from URL */;
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: builders.recipe({ id, deletedAt: new Date().toISOString() }),
    }),
  });
}
```
Note: `RecipeDto` must also gain a `deletedAt` field (nullable) for this to type-check.
Add `deletedAt: { type: [string, 'null'], format: 'date-time' }` to `RecipeDto` in `openapi.yaml`.

**Add to `setupCommonRoutes`:**
```ts
// GET /api/recipes/trash
await page.route('**/api/recipes/trash', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ data: { items: [] } }) });
});

// POST /api/recipes/*/restore
await page.route('**/api/recipes/*/restore', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ data: builders.recipe() }) });
});
```

**Definition of done:**
- Contract tests pass on both API and PWA.
- API integration tests pass.
- `setupCommonRoutes` updated.
- `task agent:drift` passes.
- All existing E2E tests still pass with the updated mock.
- `task review` passes.

- [ ] Task 14 complete

---

### Task 15 — Recycle Bin UI + restore flow

**Seam:** PWA UI only. Consumes endpoints from Task 14.

**Tracer bullet:**
Write an E2E test: navigate to `/recipes` → tap `recycle-bin-entry` → assert `trash-list` is visible →
mock returns one item → `trash-item-<id>` visible → tap `action-restore-<id>` → mock restore →
navigate back → item no longer in trash. Watch it fail. Implement. Watch it pass.

**Write tests first (PWA unit):**
1. `recycle-bin-entry` is visible on the search surface.
2. Tapping `recycle-bin-entry` navigates to or opens the trash view.
3. Trash view renders `data-testid="trash-list"`.
4. Each trash item renders `data-testid="trash-item-<recipeId>"`.
5. Each item has `data-testid="action-restore-<recipeId>"` and
   `data-testid="action-purge-<recipeId>"`.
6. Tapping restore calls `POST /api/recipes/{id}/restore`.
7. After successful restore, the item is removed from the trash list.
8. Empty trash renders `data-testid="trash-empty-state"`.
9. Restore is available without any PIN challenge.

**Write tests first (E2E):**
1. Navigate to `/recipes` →
   `page.getByTestId('recycle-bin-entry').click()` →
   `page.getByTestId('trash-list')` is visible.
2. Override `GET /api/recipes/trash` mock to return one item with `id = MOCK_IDS.RECIPE_IN_TRASH` →
   `page.getByTestId(`trash-item-${MOCK_IDS.RECIPE_IN_TRASH}`)` is visible →
   `page.getByTestId(`action-restore-${MOCK_IDS.RECIPE_IN_TRASH}`).click()` →
   mock `POST /api/recipes/{id}/restore` returns success →
   `page.getByTestId(`trash-item-${MOCK_IDS.RECIPE_IN_TRASH}`)` is not visible.
3. Default `GET /api/recipes/trash` mock returns empty list →
   navigate to trash view →
   `page.getByTestId('trash-empty-state')` is visible.

**Implementation:**
1. Wire `recycle-bin-entry` to navigate to or render the trash surface.
2. Trash surface: call `GET /api/recipes/trash` on mount.
3. Render items with `trash-item-<id>`, `action-restore-<id>`, `action-purge-<id>`.
4. Restore: call `POST /api/recipes/{id}/restore`, remove item from list on success.
5. Purge button: renders as disabled until PIN dialog is implemented in Task 16.
6. Empty state: `trash-empty-state` when items array is empty.

**Definition of done:**
- E2E tests pass.
- PWA unit tests pass.
- `task review` passes.

- [ ] Task 15 complete

---

### Task 16 — Hard delete purge from Recycle Bin

**Seam:** Contract change + API service + PWA UI.

**Follow Atomic Sync:**
1. Add `DELETE /api/recipes/{id}/purge` to `openapi.yaml`.
2. Run `task api:generate`.
3. Implement API.
4. Implement PWA.

**Add to `setupCommonRoutes`:**
```ts
// DELETE /api/recipes/*/purge
await page.route('**/api/recipes/*/purge', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ data: { purged: true } }) });
});
```

**Write tests first (contract):**
1. Snapshot: `DELETE /api/recipes/{id}/purge` endpoint exists with `X-Elevated-Pin` header documented.
2. Snapshot: purge response schema is `{ purged: boolean }`.

**Write tests first (API integration):**
1. Purge removes the recipe row from DB.
2. Purge removes `recipe_search_documents` row.
3. Purge removes disk assets (images, sidecar files).
4. Purge returns HTTP 409 if recipe is NOT soft-deleted.
5. Purge returns HTTP 403 if `X-Elevated-Pin` header is missing.
6. Purge returns HTTP 403 if `X-Elevated-Pin` header value does not match `ELEVATED_ACTIONS_PIN`.
7. Purge returns HTTP 503 if `ELEVATED_ACTIONS_PIN` is not configured.
8. Purge invalidates any queued index jobs for the recipe.

**Write tests first (PWA unit):**
1. Tapping `action-purge-<id>` opens `elevated-pin-dialog`.
2. PIN dialog renders `elevated-pin-input` field.
3. Correct PIN submission calls `DELETE /api/recipes/{id}/purge` with `X-Elevated-Pin` header.
4. Incorrect PIN shows an error message in the dialog.
5. On success (HTTP 200), item removed from trash list.
6. Cancelling PIN dialog does NOT call the purge endpoint.

**Write tests first (E2E):**
1. Override `GET /api/recipes/trash` mock to return one item with `id = MOCK_IDS.RECIPE_IN_TRASH` →
   navigate to trash view →
   `page.getByTestId(`action-purge-${MOCK_IDS.RECIPE_IN_TRASH}`).click()` →
   `page.getByTestId('elevated-pin-dialog')` is visible →
   fill `page.getByTestId('elevated-pin-input')` with "1234" →
   confirm submit →
   mock `DELETE /api/recipes/${MOCK_IDS.RECIPE_IN_TRASH}/purge` returns `{ purged: true }` →
   `page.getByTestId('elevated-pin-dialog')` is not visible →
   `page.getByTestId(`trash-item-${MOCK_IDS.RECIPE_IN_TRASH}`)` is not visible.
2. Override `GET /api/recipes/trash` mock to return one item with `id = MOCK_IDS.RECIPE_IN_TRASH` →
   navigate to trash view →
   `page.getByTestId(`action-purge-${MOCK_IDS.RECIPE_IN_TRASH}`).click()` →
   `page.getByTestId('elevated-pin-dialog')` is visible →
   dismiss/cancel the dialog (close without submitting) →
   `page.getByTestId('elevated-pin-dialog')` is not visible →
   `page.getByTestId(`trash-item-${MOCK_IDS.RECIPE_IN_TRASH}`)` is still visible →
   no `DELETE` call was made to `/api/recipes/*/purge`.

**Implementation:**
1. Add `DELETE /api/recipes/{id}/purge` to `openapi.yaml`.
2. Create `RecipePurgeService` with:
   - Verify `deleted_at IS NOT NULL` (409 if not).
   - Verify `X-Elevated-Pin` header matches `ELEVATED_ACTIONS_PIN` (403 if wrong; 503 if env unset).
   - Invalidate queued index jobs.
   - Delete filesystem assets first.
   - Delete dependent DB rows.
   - Delete `recipe_search_documents`.
   - Delete `recipes` row.
3. Add elevated-PIN dialog component in PWA:
   - Opens when `action-purge-<id>` is tapped.
   - Sends PIN in `X-Elevated-Pin` header on confirm.
   - Shows error on 403.

**Definition of done:**
- Contract tests pass.
- API integration tests pass.
- E2E tests pass.
- `task agent:drift` passes.
- `task review` passes.

- [ ] Task 16 complete

---

## Phase 6 — Capture Recovery In Settings

---

### Task 17 — Persist failed captures and friendly reasons

**Seam:** DB migration + API service extension.

**Tracer bullet:**
Write an integration test that simulates a URL capture workflow failure and asserts that a
`capture_failures` row is inserted with `status = 'failed'` and a non-empty `friendly_reason`.
Watch it fail. Hook failure persistence into the capture workflow. Watch it pass.

**Write tests first (API integration):**
1. Failed URL capture creates a `capture_failures` row with `sourceType = "url"`.
2. Row has `friendlyReason` set to a human-readable string.
3. Row has `technicalReason` set to the raw error detail.
4. Row has `status = "failed"`.
5. Row is accessible via `GET /api/captures/failures`.
6. Resolved rows do NOT appear in `GET /api/captures/failures` (filtered by `status != resolved`).
7. Failure code `"url_unreadable"` maps to friendly reason:
   `"We couldn't read the recipe page. The site may be blocking import right now."`
8. Failure code `"extraction_incomplete"` maps to:
   `"We found the page, but not enough recipe details to save it cleanly."`
9. Failure code `"model_timeout"` maps to:
   `"The recipe took too long to process. Try again in a moment."`
10. Failure code `"image_parse_failure"` maps to:
    `"The photos were too unclear to turn into a recipe."`

**DB migration:**
```sql
CREATE TABLE capture_failures (
  id               uuid primary key,
  family_member_id uuid null,
  source_type      text not null,
  retry_payload    jsonb not null,
  payload_version  integer not null default 1,
  preview_text     text null,
  friendly_reason  text not null,
  technical_reason text null,
  failure_code     text null,
  status           text not null default 'failed',
  retry_count      integer not null default 0,
  recipe_id        uuid null,
  created_at       timestamptz not null,
  last_failed_at   timestamptz not null,
  last_retried_at  timestamptz null
);
```

**Friendly reason mapping** lives in a single `CaptureFailureReasonMapper` (or equivalent).
Tested in isolation with the 4 failure codes above plus a fallback for unknown codes.
Unknown failure code maps to: `"Something went wrong importing the recipe. Try again or come back later."`

**Definition of done:**
- DB migration runs.
- Integration tests pass.
- `task review` passes.

- [ ] Task 17 complete

---

### Task 18 — Settings > Failed Captures queue with retry

**Seam:** Contract change + PWA UI.

**Follow Atomic Sync:**
1. Add `GET /api/captures/failures` and `POST /api/captures/failures/{id}/retry` to `openapi.yaml`.
2. Run `task api:generate`.
3. Implement API endpoints.
4. Implement PWA Settings section.

**New MOCK_IDs to add to `pwa/e2e/mock-ids.ts`:**
```ts
CAPTURE_FAILURE_URL: '880e8400-e29b-41d4-a716-446655440040',
CAPTURE_FAILURE_PHOTO: '880e8400-e29b-41d4-a716-446655440041',
```

**Add to `setupCommonRoutes`:**
```ts
await page.route('**/api/captures/failures', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ data: { items: [] } }) });
});
await page.route('**/api/captures/failures/*/retry', async (route) => {
  await route.fulfill({ status: 202, contentType: 'application/json',
    body: JSON.stringify({ data: { queued: true } }) });
});
```

**Write tests first (contract):**
1. Snapshot: `GET /api/captures/failures` response schema `CaptureFailureListResponse` exists.
2. Snapshot: `CaptureFailureDto` has `id`, `sourceType`, `previewText`, `friendlyReason`,
   `status`, `retryCount`, `createdAt`, `lastFailedAt`.
3. Snapshot: `POST /api/captures/failures/{id}/retry` returns `{ queued: boolean }`.

**Write tests first (API integration):**
1. `POST .../retry` sets `status = 'retrying'` atomically.
2. Second concurrent `POST .../retry` while `status = 'retrying'` returns HTTP 409.
3. `POST .../retry` returns HTTP 202 with `{ queued: true }` for `status = 'failed'`.
4. `payload_version = 2` (unsupported) returns HTTP 422.

**Write tests first (PWA unit):**
1. Settings page renders `failed-captures-section`.
2. Each failure row renders `failed-capture-<id>` with friendly reason visible.
3. `action-retry-<id>` tap calls `POST .../retry`.
4. After successful retry dispatch, button shows "Retrying..." or equivalent in-progress state.
5. Empty state renders `failed-captures-empty`.

**Write tests first (E2E):**
1. Navigate to Settings →
   `page.getByTestId('failed-captures-section')` is visible.
2. Override `GET /api/captures/failures` mock to return one failure with
   `id = MOCK_IDS.CAPTURE_FAILURE_URL` and `friendlyReason = "We couldn't read the recipe page."` →
   navigate to Settings →
   `page.getByTestId(`failed-capture-${MOCK_IDS.CAPTURE_FAILURE_URL}`)` is visible →
   `page.getByTestId(`failed-capture-reason-${MOCK_IDS.CAPTURE_FAILURE_URL}`)` contains
   "We couldn't read the recipe page."
3. `page.getByTestId(`action-retry-${MOCK_IDS.CAPTURE_FAILURE_URL}`).click()` →
   mock `POST /api/captures/failures/${MOCK_IDS.CAPTURE_FAILURE_URL}/retry` returns
   `{ queued: true }` →
   `page.getByTestId(`action-retry-${MOCK_IDS.CAPTURE_FAILURE_URL}`)` shows in-progress state
   (e.g. disabled with `data-testid="action-retry-<id>-retrying"` visible or button text changes).
4. Default `GET /api/captures/failures` mock returns empty list →
   navigate to Settings →
   `page.getByTestId('failed-captures-empty')` is visible.

**Definition of done:**
- Contract tests pass.
- API integration tests pass.
- E2E tests pass.
- `task agent:drift` passes.
- `task review` passes.

- [ ] Task 18 complete

---

## Phase 7 — Hardening And Review

### Task 19 — End-to-end hardening, blind spots, and flow sync

**Seam:** Tests + documentation sync. No new product features.

**Validate (not "write fresh tests" — close coverage gaps).**
Each scenario below MUST be covered by a passing E2E test that uses only `getByTestId` selectors
for all element interactions and assertions. No `getByText`, `getByRole`, or CSS class selectors.

1. **Full planner loop:**
   Navigate to `/recipes?addToDay=2&weekOffset=0` →
   mock returns a result →
   `page.getByTestId('recipe-card-top-pick').click()` →
   `page.getByTestId('action-use-for-day')` is visible →
   `page.getByTestId('action-use-for-day').click()` →
   `POST /api/schedule/assign` was called →
   URL becomes `/planner?success=1&dayIndex=2`.

2. **Detail sheet edit loop:**
   Navigate to `/recipes` → mock returns a result →
   `page.getByTestId('recipe-card-top-pick').click()` →
   fill `page.getByTestId('recipe-notes-input')` with "kids loved it" →
   wait for PATCH debounce →
   `page.getByTestId('action-close-sheet').click()` →
   `page.getByTestId('recipe-card-top-pick').click()` →
   `page.getByTestId('recipe-notes-input')` contains "kids loved it"
   (verified via `GET /api/recipes/{id}` mock returning the patched notes).

3. **Similar search loop:**
   Navigate to `/recipes` → mock returns recipe A as top pick →
   `page.getByTestId('recipe-card-top-pick').click()` →
   `page.getByTestId('action-find-similar').click()` →
   mock search returns recipe B as top pick →
   `page.getByTestId('recipe-card-top-pick')` shows recipe B →
   `page.getByTestId(`recipe-card-${MOCK_IDS.RECIPE_LASAGNA}`)` is NOT in the DOM.

4. **Soft delete → restore → hard delete lifecycle:**
   Navigate to recipe detail (open sheet for `MOCK_IDS.RECIPE_LASAGNA`) →
   `page.getByTestId('action-move-to-bin').click()` →
   mock `DELETE /api/recipes/${MOCK_IDS.RECIPE_LASAGNA}` returns soft-deleted body →
   `page.getByTestId('recipe-detail-sheet')` is not visible →
   `page.getByTestId(`recipe-card-${MOCK_IDS.RECIPE_LASAGNA}`)` is NOT in search results →
   `page.getByTestId('recycle-bin-entry').click()` →
   override trash mock to return `MOCK_IDS.RECIPE_LASAGNA` →
   `page.getByTestId(`trash-item-${MOCK_IDS.RECIPE_LASAGNA}`)` is visible →
   `page.getByTestId(`action-restore-${MOCK_IDS.RECIPE_LASAGNA}`).click()` →
   `page.getByTestId(`trash-item-${MOCK_IDS.RECIPE_LASAGNA}`)` is not visible →
   override trash mock again to return `MOCK_IDS.RECIPE_LASAGNA` →
   `page.getByTestId(`action-purge-${MOCK_IDS.RECIPE_LASAGNA}`).click()` →
   `page.getByTestId('elevated-pin-dialog')` is visible →
   fill `page.getByTestId('elevated-pin-input')` with "1234" →
   confirm →
   `page.getByTestId(`trash-item-${MOCK_IDS.RECIPE_LASAGNA}`)` is not visible.

5. **Failed capture → retry success lifecycle:**
   Override `GET /api/captures/failures` to return `MOCK_IDS.CAPTURE_FAILURE_URL` →
   navigate to Settings →
   `page.getByTestId(`failed-capture-${MOCK_IDS.CAPTURE_FAILURE_URL}`)` is visible →
   `page.getByTestId(`action-retry-${MOCK_IDS.CAPTURE_FAILURE_URL}`).click()` →
   mock retry returns `{ queued: true }` →
   override `GET /api/captures/failures` to return empty list →
   `page.getByTestId(`failed-capture-${MOCK_IDS.CAPTURE_FAILURE_URL}`)` is not visible →
   `page.getByTestId('failed-captures-empty')` is visible.

6. **Agent search — no chat UI:**
   `page.getByTestId('agent-search-trigger').click()` →
   fill `page.getByTestId('agent-search-input')` with "something warm and filling" →
   `page.getByTestId('agent-search-submit').click()` →
   mock returns a result →
   `page.getByTestId('recipe-card-top-pick')` is visible →
   assert `page.locator('[data-testid="chat-response"]').count()` equals 0.

7. **Over-constrained filters — clear resets:**
   `page.getByTestId('filter-never-tried').click()` →
   `page.getByTestId('filter-quick').click()` →
   mock returns empty results →
   `page.getByTestId('filter-no-results')` is visible →
   `page.getByTestId('filter-never-tried-active').click()` (deactivate) →
   `page.getByTestId('filter-quick-active').click()` (deactivate) →
   mock returns a result →
   `page.getByTestId('recipe-card-top-pick')` is visible →
   `page.getByTestId('filter-no-results')` is not visible.

8. **Vector timeout fallback:**
   Override `POST /api/recipes/search` mock to delay 400 ms before responding with
   `{ topPick: null, results: [], resultPath: "fallback-lexical", ... }` →
   navigate to `/recipes` → fill `recipe-search-input` → press Enter →
   results render →
   assert mock response body had `resultPath: "fallback-lexical"`.

9. **Purge blocked by PIN not configured:**
   Override `DELETE /api/recipes/*/purge` mock to return HTTP 503
   `{ errorCode: "PIN_NOT_CONFIGURED" }` →
   override trash mock to return `MOCK_IDS.RECIPE_IN_TRASH` →
   navigate to trash →
   `page.getByTestId(`action-purge-${MOCK_IDS.RECIPE_IN_TRASH}`).click()` →
   `page.getByTestId('elevated-pin-dialog')` is visible →
   submit any PIN →
   `page.getByTestId('elevated-pin-error')` is visible containing "not available".

10. **Retry idempotency:**
    Override `POST /api/captures/failures/*/retry` mock to return HTTP 409
    `{ errorCode: "ALREADY_RETRYING" }` →
    override `GET /api/captures/failures` to return `MOCK_IDS.CAPTURE_FAILURE_URL` →
    navigate to Settings →
    `page.getByTestId(`action-retry-${MOCK_IDS.CAPTURE_FAILURE_URL}`).click()` →
    `page.getByTestId(`action-retry-error-${MOCK_IDS.CAPTURE_FAILURE_URL}`)` is visible →
    no second `POST /api/captures/failures/*/retry` call is made.

**Documentation sync:**
1. Update `docs/flows/user-flows/recipe-search-and-library-recovery.md` if any flow changed.
2. Update `docs/flows/data-flows/recipe-search-index-and-recovery.md` if any data flow changed.
3. Verify all `data-testid` values in the code match the index in `design.md`.

**Implementation:**
1. Add E2E coverage for any scenario above that is not already covered.
2. Update flow docs where implementation decisions diverged from spec.
3. Run `task review` and resolve all outstanding issues.

**Definition of done:**
- All scenarios above are covered by passing E2E tests.
- Flow docs are accurate.
- `task review` passes.
- No `data-testid` drift between code and `design.md` index.

- [ ] Task 19 complete

---

## MOCK_IDs Summary

Add all of the following to `pwa/e2e/mock-ids.ts` as part of the tasks that introduce them.
Never use inline hardcoded string IDs.

| Constant | GUID | Introduced in |
|---|---|---|
| `RECIPE_IN_TRASH` | `660e8400-e29b-41d4-a716-446655440025` | Task 14 |
| `INVENTORY_CAPTURE` | `770e8400-e29b-41d4-a716-446655440030` | Task 13 |
| `CAPTURE_FAILURE_URL` | `880e8400-e29b-41d4-a716-446655440040` | Task 18 |
| `CAPTURE_FAILURE_PHOTO` | `880e8400-e29b-41d4-a716-446655440041` | Task 18 |

---

## Notes / Decisions

- Recycle Bin primary access: recipe library/search surface. Not Settings.
- Failed Captures: Settings only.
- Hard delete only from Recycle Bin. Always requires elevated PIN.
- Search ships lexically first, then backup/restore, then hybrid, then agent + inventory.
- Detail sheet preserves search state in component-local React state. No re-fetch on close.
- `DELETE /api/recipes/{id}` changes from 204 (hard delete) to 200 (soft delete) in Phase 5.
  The mock change in `setupCommonRoutes` is mandatory and high-risk. Treat it as a first-class item.
- `source_fingerprint` is a SHA-256 hex of canonical JSON. One shared utility, tested in isolation.
- Ranking score constants are named values in one configuration location. Never magic numbers.
- Formal ranking-quality evaluation deferred until sufficient household query data exists.
