# Search Filter Discovery --- Tasks

> **Archived — historical reference only.** Tasks, status, commands, and instructions below are historical, not an active work queue or current authority. See [archive guidance](../README.md).

> Specification output only. Stop before product implementation.

## SFD-1 --- Reconcile active search branch and contract

**Requirements:** SFD-R5, SFD-R6

**Outcome:** establish which declared search filters/preferences are
already implemented on the actual build branch.

**Required context:** - `specs/openapi.yaml` -
`RecipeSearchRequestDto.cs` - `RecipeSearchFiltersDto.cs` -
`RecipeSearchPreferencesDto.cs` - `RecipeSearchPredicate.cs` -
lexical/vector repositories and `RecipeSearchService.cs` - active
`search-fix` branch if available

**Work:** 1. Trace Cuisine, Meal Type and `preferences.concepts` from
request to both retrieval paths. 2. Record any main/default-branch
mismatch. 3. Adopt existing `search-fix` implementation when present; do
not duplicate it. 4. Write failing integration tests for only the
missing behavior needed by this feature.

**Checks:** API search integration tests with Cuisine, Meal Type, and
concept preference.

**Stop:** do not implement unrelated dormant filters (`dietaryProfiles`,
categories, maximum time, etc.) unless already required by approved
search work.

## SFD-2 --- Define filter-discovery contract and configuration

**Requirements:** SFD-R1, SFD-R2, SFD-R4, SFD-R6, SFD-R8

**Outcome:** approved OpenAPI contract and server options for
fixed/configured filter vocabulary.

**Authorized effects:** - `specs/openapi.yaml` - API DTO/options
definitions - configuration defaults/binding - contract tests

**Work:** 1. Add `GET /api/recipes/search/filters` and response schemas.
2. Define Main `id` + semantic `concept`; use built-in defaults
beef/poultry/pork/fish/pasta/vegetarian in configured order. Custom IDs
require a non-blank configuration `Label`, returned as `label`; built-in
IDs use PWA translations. No Main score/promotion fields. 3. Define fixed Meal Types:
Supper/Lunch/Breakfast/Dessert. 4. Add configuration binding with safe
fallback. Define nullable `generatedAt` and empty cuisine arrays for
absent materialization. Clarify the existing query description for
concept-only ranked search and its fallback without adding request fields.
5. Define the Search recipe rediscovery ranking and interval/default before
implementation, with clock/never-cooked behavior and stable ties. Approve
only the Search client promotion-eligibility state needed for Top Pick/
Surprise Me. Discovery contracts and voting state remain unchanged. 6. Regenerate
client only after contract approval/tests.

**Checks:** OpenAPI validation, API DTO/config tests, generated-client
diff.

**Stop:** no endpoint implementation until contract tests express the
accepted shape.

## SFD-3 --- Materialize cuisine promotion and recipe affinity in Dreaming

**Requirements:** SFD-R2, SFD-R3, SFD-R4, SFD-R8

**Outcome:** Dreaming writes durable cuisine promotion and bounded recipe
affinity facts without inventing vocabulary; only cuisine metadata is
served by filter discovery.

**Authorized effects:** - materialized-state entity/schema/migration -
`RecipeDbContext` - one Dreaming processor - `dreaming.yaml` - Dreaming
report only if needed for observable outcome - initialization/backfill
entry point reusing the materializer - tests

**Work:** 1. Add disposable singleton materialized state. 2. Query
eligible recipe CuisineType values. 3. Aggregate member-level votes and
cooked CalendarEvents. 4. Compute deterministic affinity and
recency/rotation promotion. 5. Preserve all catalog cuisines; rank a
promoted subset. 6. Atomically replace state only on success. 7.
Preserve previous good state on failure. 8. Add processor before
Dreaming report, with an explicit dependency on successful
`finalize-overdue-meals`; report depends on materialization. 9. Add a
retry-safe initial backfill outside Search, running after meal finalization.
10. Keep Main entirely outside learned state. 11. Materialize bounded
recipe-ID affinity/recency facts needed by SFD-R8, separately from cuisine
metadata. Calendar promotion guards always use current state at serving.

**Checks:** real DB materialization tests; deterministic clock tests;
workflow dependency tests (finalization failure retains previous state);
initial-backfill/retry tests; migration clean-install/upgrade checks.

**Stop:** no LLM, no invented cuisines, no generic preference framework,
no ingredient ontology.

## SFD-4 --- Implement cheap serving endpoint

**Requirements:** SFD-R2, SFD-R4, SFD-R6

**Outcome:** `/api/recipes/search/filters` serves configured/fixed
definitions plus latest Dreaming state without history aggregation.

**Authorized effects:** - `RecipeController` - tiny filter-discovery
service if needed - API tests/mocks

**Work:** 1. Read configured Main definitions. 2. Read fixed Meal Types.
3. Read materialized Cuisine ordering. 4. Return fallback response when
state is absent: configured Main, fixed Meal Types, null `generatedAt`,
and empty cuisine arrays. 5. Never query votes/calendar, discover cuisines
from recipe rows, or call a model in the request path. 6. Keep serving
previous good materialized state when refresh fails.

**Checks:** endpoint integration tests including absent/stale state and
malformed config fallback.

**Stop:** endpoint must not become a recommendation service.

## SFD-5 --- Complete only the search semantics needed by the UI

**Requirements:** SFD-R5

**Outcome:** Main concept, Cuisine and Meal Type selections are
truthful.

**Authorized effects:** - search predicate/repository/service code
required by SFD-1 findings - search integration tests

**Work:** 1. If absent on active branch, apply Cuisine and Meal Type
hard predicates identically before lexical/vector candidate selection.
2. If absent, make `preferences.concepts` affect semantic
retrieval/ranking without changing the original query contract. 3.
Preserve hard-filter authority, lexical fallback, cancellation and
continuation behavior. 4. For concept-only requests, use selected concept
text as lexical fallback if semantics are disabled/unavailable, time out,
or fail; never send blank text to lexical retrieval or mutate the caller
query. A successful semantic zero-match result stays empty. Typed-query
fallback remains unchanged; empty input without usable concepts browses.
5. Do not map Main to `includedIngredients`.

**Checks:** PostgreSQL-backed tests for hard predicates;
concept-only disabled/timeout/error and zero-match tests; unchanged
typed-query fallback and empty-input browse tests; continuation fingerprint
regression.

**Stop:** do not redesign fusion/ranking or implement unrelated
published fields.

## SFD-5a --- Correct and optimize empty-query browse

**Requirements:** SFD-R7

**Dependencies:** SFD-1 reconciliation and SFD-5 search semantics. Complete
before SFD-5b changes ordering, SFD-6 promotes Quick, and SFD-7 verification.
Repeat browse performance measurements after SFD-5b integration.

**Outcome:** Mom can scroll browse results with less waiting, and Quick
cannot prematurely end pagination.

**Authorized effects:** - browse query/projection/predicate code - recipe
page continuation-loading logic - focused API/PWA tests - measurement evidence

**Work:** 1. Measure initial/continuation API latency, database query cost
and retrieved payload, and visible scrolling waits before changing code.
2. Write PostgreSQL-backed regression tests with sparse Quick matches beyond
nonmatching pages, then apply Quick eligibility before limits/cursors in
both initial and continued browse. Preserve its current meaning.
3. Project only the fields required for result cards, existing behavior,
and cursor construction, avoiding unused large recipe JSON fields.
4. Keep the initial 12 alternatives; start browse continuation at 24 and
prefetch earlier than 600px. Tune using the measured scenario within the
existing maximum limit of 50; leave ranked-search policy unchanged.
5. Preserve one in-flight continuation per browse generation, stale success/
error/completion protection, scroll stability, and expiry/retry behavior.
6. Repeat measurements under the same conditions and record sample counts,
p50/p95, visible waits, selected thresholds, and tradeoffs.

**Checks:** complete eligible Quick traversal without duplicates/omissions;
projection/query evidence; repeated observer and stale-response tests;
initial-load and rapid-scroll before/after measurements on representative
data, including sparse Quick matches. Report live measurements separately
from mocked behavior tests; unavailable live evidence remains blocked.

**Stop:** no ranking redesign, full-library preload, global cache, new
pagination contract, or unrelated database optimization. Do not claim a
performance improvement solely from smaller projections or passing mocks.

## SFD-5b --- Rediscover liked recipes in Search with calendar guards

**Requirements:** SFD-R8, SFD-R7

**Dependencies:** SFD-2 approved policy/contracts, SFD-3 historical facts,
and SFD-5a browse correctness/performance work.

**Outcome:** Forgotten favorites resurface in Search browse without promoting
already-planned or same-week-cooked meals. Discovery mode remains unchanged.

**Authorized effects:** - Search promotion policy/current calendar queries -
recipe materialization consumption - browse ranking/continuation - approved
Search DTO/OpenAPI/generated client changes - Search promotion state -
Search schedule/SSE invalidation integration - focused API/PWA/PostgreSQL tests

**Work:** 1. Write deterministic clock-backed tests for SFD-R8 boundaries.
2. Apply liked-and-old Search promotion and live calendar guards before
recommendation selection. Keep explicit search/library access.
3. Read votes as evidence only; preserve all votes and timestamps, without
adding a vote/skip interaction. 4. Apply the calendar guard to Search Top
Pick/Surprise Me candidate selection without redesigning those features.
5. Update browse continuation semantics with ranking; test duplicate-free
complete traversal, schedule invalidation, and restart recovery.
6. Reuse Search schedule/SSE invalidation so planning changes remove stale
promotions. Keep new state/event handling scoped to Search; shared changes
must not alter Discovery behavior. 7. Repeat browse measurements with this
final ranking/eligibility path, not only the pre-rediscovery code.

**Checks:** PostgreSQL-backed scheduled/future/same-week guard tests; liked,
unvoted, disliked and never-cooked cases; preserved vote timestamps/counts;
multiple assignments and removal/skip; calendar boundary tests; open-Search
SSE/stale-response behavior; continuation and performance evidence for the
integrated browse path. Verify the diff leaves Discovery mode logic intact;
run relevant Discovery regressions if a shared dependency is touched.

**Stop:** no Discovery eligibility/order/voting/UI/contract/store changes,
Main ontology, automatic vote resets, broad recommendation framework,
cuisine-wide suppression, or hiding explicit search matches.

## SFD-6 --- Group the filter sheet

**Requirements:** SFD-R1, SFD-R4, SFD-R5, SFD-R6

**Dependencies:** SFD-4, SFD-5, SFD-5a, and SFD-5b (correct eligibility
and Quick pagination before promoting the shortcuts).

**Outcome:** Mom can reach common filters quickly without a long flat
list.

**Authorized effects:** - recipe search page wrapper/state as needed -
`RecipeFiltersSheet.tsx` - localization - PWA tests/mocks

**Work:** 1. Fetch filter metadata once per search-page session/open
lifecycle. 2. Render Existing filters → Meal Type → Main → Cuisine.
Existing filters initially show Quick, Family Favorite, Never Tried;
More filters reveals New, It’s Been a While, Healthy Choice, Reported,
Ready to Review, with management filters last. 3. Show the first six Main
choices in configured order and All Main choices for any remainder; use
custom display labels. Show bounded promoted cuisines and All cuisines.
Hide Cuisine entirely until materialized options exist. Keep selected
chips visible/removable when any disclosure group collapses, and keep
Apply/Clear reachable while choices scroll. 4. Map
Main to `preferences.concepts`. 5. Map Meal/Cuisine to existing
hard-filter fields. 6. Preserve Apply/Clear/Cancel and accessible
selected state. 7. Correct active-selection count for
arrays/preferences. 8. On endpoint failure, preserve built-in Main/Meal
and existing filters; hide Cuisine unless previously fetched materialized
options are available; do not block search.

**Checks:** unit/component tests for section order, default-visible three
filters, management choices behind disclosure, custom Main labels, all
disclosure controls and selected-chip persistence, hidden Cuisine with
absent/empty state, draft Apply/Clear/Cancel, reachable actions, and
accessible expanded/selected state; relevant recipe-search E2E route mocks.

**Stop:** no broader visual redesign. Top Pick/Surprise Me changes are
limited to the shared promotion guards owned by SFD-5b.

## SFD-7 --- Contract sync and regression verification

**Requirements:** SFD-R6, SFD-R7, SFD-R8

**Outcome:** no drift across OpenAPI, API, generated client, mocks,
Dreaming and PWA.

**Work:** 1. Regenerate client with repository command. 2. Update
schema-compliant mock builders/routes. 3. Run API tests on both search
and Dreaming slices. 4. Run PWA unit tests and relevant E2E. 5. Run
repository contract/static checks required by the execution harness. 6.
Review diff against this feature's surgical scope. 7. Include SFD-5a
browse correctness tests and before/after performance evidence; distinguish
measured improvement from blocked or not-run live qualification. 8. Verify
SFD-5b Search-only scope, preserved votes, calendar invalidation, and integrated
browse continuation/performance evidence.

**Stop:** report unrelated findings; do not fix them under this feature.

## Settled v1 boundary

Main always uses configured order. Among filter choices, Dreaming
personalizes Cuisine only; recipe-level rediscovery is separately in scope.
No Main scoring, promotion state, recipe-to-concept classification, or
conditional Main-personalization work belongs in this implementation.

Discovery mode logic is outside this spec and must remain unchanged.
