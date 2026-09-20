# Search Filter Discovery --- Design

## Repository facts checked

This design is based on the current default branch inspected on
2026-09-18.

-   `Recipe` already owns `CuisineType`, `MealTypes`, `IsVegetarian`,
    `LastCookedDate`, and rating.
-   `RecipeVote` stores per-family-member Like/Dislike votes and vote
    time.
-   `CalendarEvent` stores recipe, date, status and persisted vote
    count; `Cooked` is an explicit status.
-   `RecipeSearchRequestDto` already exposes `filters` and
    `preferences`.
-   `RecipeSearchPreferencesDto` already exposes `ingredients`,
    `cuisines`, and `concepts`.
-   `RecipeSearchFiltersDto` already declares cuisines, mealTypes,
    includedIngredients, dietaryProfiles, categories and
    maximumTotalMinutes plus existing boolean filters.
-   Current `RecipeSearchPredicate` applies the existing boolean filters
    but does not currently apply the declared
    cuisine/meal/ingredient/dietary/category/time fields.
-   Current `RecipeSearchService` includes `dto.Preferences` in its
    continuation fingerprint, but repository search found no serving
    logic that applies `preferences.concepts`.
-   The archived hybrid-search contract explicitly distinguishes broad
    concepts from exact `includedIngredients`: broad concepts belong to
    semantic preferences.
-   `RecipeFiltersSheet` is currently a mobile bottom sheet containing a
    flat wrap of boolean filter chips with local draft state and
    Apply/Clear/Cancel.
-   `RecipeController` already owns `POST /api/recipes/search`, making
    `GET /api/recipes/search/filters` a natural adjacent route.
-   Dreaming is an existing recurring YAML workflow and already contains
    maintenance, overdue-meal finalization and search-reconciliation
    tasks.

These facts create one important implementation requirement: adding the
filter-discovery endpoint alone would produce UI controls whose Main
semantic concepts do not currently affect search. This spec therefore
includes the smallest missing semantic-preference seam and does not
claim that all declared structured filters are implemented.

## Target flow

``` text
Configuration (Main) ─────────────────────────────┐
Fixed Meal Types ────────────────────────────────┤
Eligible Recipe.CuisineType + votes/cooked events │
    → Dreaming (after meal finalization)          │
    → materialized cuisine state ────────────────┤
                                                ↓
                                GET /api/recipes/search/filters
                                                ↓
                  Existing filters → Meal Type → Main → Cuisine
                                                ↓
                                   RecipeSearchRequestDto
                       hard filters → candidate eligibility
                preferences.concepts → semantic relevance
                    (concept text lexical fallback if unavailable)
                                                ↓
                                      existing results
```

## 1. Configuration

Introduce a small options class, e.g. `RecipeSearchFilterOptions`, bound
through normal ASP.NET configuration.

Suggested shape:

``` json
{
  "RecipeSearchFilters": {
    "Main": [
      { "Id": "beef", "Concept": "beef" },
      { "Id": "poultry", "Concept": "poultry" },
      { "Id": "pork", "Concept": "pork" },
      { "Id": "fish", "Concept": "fish" },
      { "Id": "pasta", "Concept": "pasta" },
      { "Id": "vegetarian", "Concept": "vegetarian" }
    ]
  }
}
```

Use these six as code/config defaults. ASP.NET configuration already
allows environment overrides using hierarchical keys; do not invent a
separate environment parser unless deployment needs a single JSON
variable.

`Id` is stable UI identity. `Concept` is the semantic term sent in
`preferences.concepts`. Built-in IDs use PWA localization (`Bœuf`,
`Volaille`, etc.). Custom IDs require a non-blank configured `Label`,
returned as `label` by the endpoint and displayed as configured. No PWA
localization change is required to add a custom choice.

Main always follows configured order. Show its first six choices and
provide All Main choices for any remainder. Keep selected choices visible
when collapsed. Do not store learned Main scores or promotion flags.

Invalid/empty configuration falls back to the six defaults and logs a
warning. It never makes `/search` unavailable.

## 2. Materialized filter state

Avoid a generic preference subsystem. Add one purpose-built persisted
artifact for search-filter discovery. The repository currently has no
verified generic materialized-view abstraction.

A small table/entity is the clearest durable seam,
e.g. `recipe_search_filter_state`, containing one current row:

``` text
id / singleton key
generated_at
payload jsonb
```

Payload:

``` json
{
  "cuisines": [
    { "value": "Italian", "affinity": 0.86, "promotion": 0.49 },
    { "value": "Japanese", "affinity": 0.65, "promotion": 0.78 }
  ]
}
```

Scores are internal. The public endpoint need not expose numeric scores;
it exposes cuisine `promoted` and `all` arrays. Persist the complete
cuisine vocabulary observed at the successful Dreaming run so request
serving never needs `SELECT DISTINCT` over recipes.

Use atomic replacement/upsert. Compute the new payload in memory from
bounded aggregate queries, then replace the singleton only after
successful computation. On failure, retain the previous row.

### Eligibility for cuisine vocabulary

Read `Recipe.CuisineType` only from recipes that are: -
`DeletedAt == null` - `IsReady == true` - `CuisineType`
non-null/non-blank

Preserve the stored cuisine string as the returned value. Deduplicate
with the same comparison rule used by the search hard-filter
implementation when that implementation exists. Dreaming does not
translate or canonicalize it.

## 3. Preference evidence and rotation

First version should be deterministic and explainable.

For each recipe: - **Vote evidence:** Like contributes positive
evidence; Dislike contributes negative evidence. Use current
`RecipeVote` rows, not `CalendarEvent.VoteCount`, because the former
retains member-level preference direction. - **Cook evidence:**
`CalendarEvent.Status == Cooked` contributes positive behavioral
evidence. - **Recency:** recent cooked events reduce current promotion
for the associated cuisine without reducing the stored
long-term affinity.

Do not use an LLM.

Keep the exact weights configuration/internal implementation details
rather than public contract. Tests should lock behavioral invariants
rather than arbitrary magic numbers: 1. more likes cannot lower affinity
all else equal; 2. more historical cooked events cannot lower affinity
all else equal; 3. a recent cook can lower promotion while leaving
affinity unchanged; 4. older repetition pressure decays; 5. a disliked
cuisine may still appear in All Cuisines; 6. no score can create a value
outside source vocabulary.

Inject/use the repository clock abstraction for deterministic tests.

### Main ordering boundary

Main remains in configured order in v1. Among filter choices, Dreaming
personalizes Cuisine only; recipe rediscovery is a separate policy. No Main affinity/promotion state, recipe-to-concept classification,
or semantic association work is part of this feature. Main selection
still affects search through `preferences.concepts`.

## 4. Dreaming integration

Add one bounded processor, e.g. `MaterializeRecipeSearchFilters`, to
`api/src/RecipeApi/Workflows/dreaming.yaml`.

Give the materializer an explicit `depends_on: [finalize-overdue-meals]`
and add it to `report.depends_on`. YAML position alone does not establish
execution order. If finalization fails, materialization must not run and
the previous good state remains usable. It should not block unrelated request
serving; a failed run leaves the previous materialization intact and
follows normal workflow retry/failure behavior.

Provide an explicit initialization/backfill invocation outside the Search
request path, reusing this materializer after meal finalization. It must
be safe to retry and retain the last good state on failure. Cover this
entry point in implementation tasks and tests.

Update Dreaming reporting only enough to show
success/failure/generated-at/counts if the existing report processor
supports task outcomes without broad redesign.

No child workflow is necessary unless measured library size makes
aggregation exceed the normal Dreaming task budget. Start with the
direct processor because the data is local SQL aggregation and no
model/provider call is required.

## 5. Serving endpoint

Add:

`GET /api/recipes/search/filters`

to `RecipeController` (or a tiny dedicated service called by it).

Suggested response contract:

``` json
{
  "generatedAt": "2026-09-18T06:00:00Z",
  "main": [
    { "id": "beef", "concept": "beef" },
    { "id": "poultry", "concept": "poultry" },
    { "id": "pork", "concept": "pork" },
    { "id": "fish", "concept": "fish" },
    { "id": "pasta", "concept": "pasta" },
    { "id": "vegetarian", "concept": "vegetarian" }
  ],
  "mealTypes": ["Supper", "Lunch", "Breakfast", "Dessert"],
  "cuisines": {
    "promoted": ["Japanese", "Mexican", "Italian", "French"],
    "all": ["French", "Italian", "Japanese", "Mexican"]
  }
}
```

Do not expose affinity scores. They are implementation details and
create false certainty in the UI.

Main entries may additionally contain `label`, required for custom IDs.
`generatedAt` is nullable and describes the cuisine materialization only.

With no materialized row, return configured/default Main order, fixed
Meal Types, `generatedAt: null`, and empty cuisine `promoted/all` arrays.
Never query the recipe catalog in this endpoint. Run the initial backfill
outside Search. Until materialized cuisine options exist, hide the entire
Cuisine section; no unavailable placeholder or blocking message is needed.
A stale good snapshot remains usable when refresh fails. A successfully
materialized empty catalog also hides the section.

The endpoint is authenticated under the controller's normal API
security; it does not need `X-Family-Member-Id` because current evidence
is household-global.

## 6. Search semantic concept seam

Do **not** map Main to `includedIngredients`. The archived search
contract says exact included ingredients are hard indexed facts while
broad concepts are semantic preferences.

The existing request already has:

``` json
{
  "preferences": {
    "concepts": ["fish"]
  }
}
```

Current serving does not apply it. Implement the smallest compatible
behavior in the ranked-search path: - retain `dto.Query` as the original
caller query; - derive semantic retrieval text from the original query
plus normalized concept preferences; - lexical retrieval remains based
on the original query for typed searches; - hard predicates are
applied before semantic candidate selection; - preference concepts
affect score/relevance only and never admit a recipe that violates a
hard filter; - empty query + concept preference is ranked semantic
search, not ordinary unfiltered browse; - continuation fingerprint
already includes preferences and should remain unchanged.

For an empty caller query with non-blank concepts, attempt semantic
retrieval without calling the lexical repository with empty text. If
semantics are disabled/unavailable, time out, or fail, derive non-empty
lexical retrieval text from the selected concepts. This is a relevance
fallback, not an exact ingredient predicate; it may miss recipes that do
not contain the concept words. Keep `dto.Query` unchanged and apply the
same hard predicates. A successful semantic search returning zero
candidates remains an empty result, with no lexical retry. Empty query
without usable concepts retains browse behavior. Typed searches retain
their existing original-query lexical fallback.

Before implementation, re-check the active `search-fix` branch: the
GitHub default-branch inspection used for this spec did not expose that
branch, and current `main` has contract fields that are not fully
served. If `search-fix` already implements preferences or structured
filters, reuse it and delete this duplicate task.

## 7. PWA interaction

Keep state ownership in `pwa/src/app/(app)/recipes/page.tsx` and draft
state in `RecipeFiltersSheet`; do not introduce a global filter store.

On Search page load/open, fetch filter metadata once per page session
through the generated client/wrapper. Failure is non-blocking.

Inside `RecipeFiltersSheet`, keep this section order:

``` text
Existing filters
[Quick] [Family Favorite] [Never Tried]
[More filters ›]
  Expanded: [New] [It’s Been a While] [Healthy Choice]
            [Reported] [Ready to Review]

Meal Type
[Supper] [Lunch] [Breakfast] [Dessert]

Main
[Beef] [Poultry] [Pork] [Fish] [Pasta] [Vegetarian]
[All Main choices ›] (only when configuration has more than six)

Cuisine (only when materialized options exist)
[Japanese] [Mexican] [Italian] [French]
[All cuisines ›]
```

Labels above illustrate layout; use existing localization for built-in
choices and stored strings for cuisines. Existing filters use progressive
disclosure within their first section, not a trailing More filters section.
Quick, Family Favorite, and Never Tried are the only default-visible
boolean choices, in that order. Reported and Ready to Review are management
filters and appear last behind More filters when unselected.

For all disclosure groups, retain selected chips in the collapsed view so
selections remain visible and removable. Opening/closing disclosure changes
visibility only, never draft selections. Use accessible disclosure buttons
with expanded state and keep Apply/Clear reachable while choices scroll.
If no materialized options are available, hide Cuisine; on a failed refresh,
previously fetched materialized options may remain usable.

Exact localized cuisine display should not be invented if `CuisineType`
stores English values. In the surgical release, display stored cuisine
values unless there is already a translation mapping. Do not silently
translate values and then send translated strings as hard filters.

Main selection maps to `preferences.concepts`; Meal/Cuisine selection
maps to the corresponding existing structured filter contract **only
after its serving predicate is verified/implemented**. Because current
`main` does not apply those structured fields, the implementation task
must either: 1. include the missing cuisine/meal hard predicates in both
lexical and semantic retrieval paths, or 2. keep those controls disabled
from release until the active `search-fix` work supplies them.

The recommended surgical path is (1) if `search-fix` does not already
contain it: add only Cuisine and Meal Type predicates required by this
UI, not every dormant DTO field.

Within Cuisine or Meal Type, multiple selections are OR. Existing boolean
filters retain their existing combined predicate behavior. Across populated hard-filter
groups, groups are AND. Main concepts are soft semantic preferences and
may be combined.

Keep existing Apply/Clear/Cancel behavior. Active filter count must
count selected array values/preferences intentionally rather than
relying on `Object.values(...).filter(Boolean)` if the new UI displays a
numeric badge.

### Empty-query browse performance

Source inspection found 12 initial alternatives and 12 per continuation,
with loading triggered at a 600px bottom margin. Empty-query browse already
bypasses semantic retrieval. `BrowseAsync` and `ContinueBrowseAsync` load
full recipe entities before mapping cards, including unused JSON fields.
These are optimization candidates, not measured proof of the live bottleneck.

Keep 12 alternatives on the first browse page. Start subsequent browse
pages at 24, and prefetch earlier than 600px before the end. Measure a
representative rapid-scroll scenario to select the final distance and
batch size (at most the existing API maximum of 50). Use the browse result
path to keep this tuning separate from typed/concept-only ranked search.
Do not preload the entire library or introduce a global search cache.

Guard continuation loading with one in-flight request per active browse
generation/cursor. Preserve stale-response protection for success, error,
and completion paths when query, filters, or search context changes.
Append without moving existing cards or resetting scroll; retain existing
expiry and retry recovery. Test repeated observer callbacks so earlier
prefetch cannot issue duplicate requests for the same page.

Project only the fields required for card mapping, browse eligibility,
existing Top Pick/report behavior, and keyset cursor construction. Do not
materialize ingredients/raw metadata/dietary JSON merely to discard it.
Adapt sorting and cursor comparisons together for the approved recipe
rediscovery order below; retain complete, duplicate-free traversal. Measure the
actual query before considering an index; unrelated database tuning is
outside this slice.

Quick currently filters `BuildDefaultCandidates` after `Take(limit + N)`.
This can yield short pages and no continuation even when later eligible
recipes exist. Move Quick eligibility ahead of page limits in both browse
paths, preserving its current duration interpretation. Derive continuation
from eligible rows and their lookahead, not from a partially filtered page.
This is a required correctness fix before promoting Quick in the sheet.

Capture baseline measurements before implementation and repeat them on the
same dataset/runtime/device/network profile: initial and continuation API
p50/p95, database query timing and retrieved payload/fields, and visible
waiting during rapid scrolling. Include a library spanning multiple pages
and a sparse Quick distribution with matches beyond nonmatching pages.
Record sample counts, dataset size, final tuning, and tradeoffs. Mocked
latency tests validate behavior; live measurements establish performance.

### Recipe rediscovery and live calendar eligibility

Cuisine promotion chooses filter buttons. Recipe rediscovery is a separate
scope extension for Search empty-query browse only. Discovery mode is out
of scope: preserve its eligibility, ordering, voting lifecycle, contracts,
card interactions, and store behavior. Do not apply Search calendar guards
to Discovery or modify a shared dependency in a way that changes that mode.

Use one Search recipe-level promotion policy based on existing votes and
cooked history: positive affinity plus time since cooking favors forgotten
favorites; recent cooking reduces promotion. Preserve availability of new
choices. Before implementation, specify the deterministic combination,
rediscovery interval configuration/default, never-cooked treatment, and
stable ID tie-break in SFD-2. Do not infer a recipe-to-Main association.

Keep historical scoring off the Search-open path. Extend the bounded
Dreaming materialization with recipe-ID affinity/recency facts if required;
do not introduce a general recommendation framework. Keep recipe state
separate from the public filter metadata payload. Without learned state,
use deterministic existing browse order within the live eligibility tiers;
never bypass calendar guards. Missing/stale state must not clear votes.

Promotion eligibility is always checked against current calendar state:

- Block recipes assigned as `RecipeId` on today or any future date with
  Planned, Locked, or AwaitingConsensus status. No future-week cutoff.
  Candidate IDs alone do not mean a recipe is already planned.
- Block recipes with a Cooked event in the selected planning week, or the
  current week when no planning context exists. Use the repository calendar
  timezone/week convention, not an independent UTC-date approximation.
- Skipped/removed assignments do not block; another active assignment or
  same-week cooked event still does. Scheduling is not evidence of cooking.

Use an indexed existence check or equivalent current-state lookup for these
calendar guards, not request-time historical vote/calendar aggregation.
The `/search/filters` endpoint remains materialized-only and unchanged.
A planned recipe does not suppress all choices from its cuisine.

Browse orders eligible recommendations ahead of blocked recipes, which
remain reachable in the library. Top Pick and Surprise Me candidates obey
the guard; no eligible candidate means no promoted replacement. Explicit search retains
its matching recipes and hard-filter semantics; blocked recipes must not
be elevated as recommendations within that response.

Read existing likes as Search ranking evidence only. Do not reset votes,
change vote timestamps, add an already-liked card state, or introduce a
voting/skip flow. The approved behavior is to surface forgotten favorites
in Search, not to change how Discovery selects meals through voting.

Reuse existing schedule/SSE invalidation mechanisms for mounted Search.
Recheck eligibility on continuation and invalidate/refetch an open Search
promoted set when planning changes. Apply request-generation protection to
these refreshes; no waiting for the next Dreaming run. Keep any new state
or event handling scoped to Search, preserving Discovery behavior.

The old last-cooked/created-at browse cursor alone cannot represent new
promotion tiers and ranking. SFD-5b must update continuation state and tests
alongside ordering: stable snapshot/version or equivalent deterministic
cursor semantics, deduplication, and explicit restart on invalidation when
necessary. Preserve existing public continuation-token shape and expiry
recovery; never silently paginate with the old sort under the new policy.

## 8. Mère-Designer reflection

The first section preserves familiar filters while showing only Quick,
Family Favorite, and Never Tried by default: speed, confidence, and variety.
Meal Type then Main follows the decision from which meal to what to eat.
Cuisine comes last. Expanding every group inside the current sheet's
`max-h-[50vh]` can become a scroll trap.
Group headings and progressive disclosure are therefore necessary, not
decorative redesign.

Smallest corrections: - show common choices first; - keep All Cuisines
one tap away; - preserve large pill targets; - never display internal
scores/counts; - show selection state immediately in the draft; -
preserve Clear and Apply at the bottom; - if metadata fails, keep the
existing filters usable rather than blocking the sheet.

## 9. Contract impact

OpenAPI is authoritative in this repository. Add response schemas and
the GET operation to `specs/openapi.yaml`, then regenerate the PWA
client using the repository task. Do not hand-edit generated Kiota
files.

Existing request schemas need no new Main field because
`RecipeSearchPreferencesDto.concepts` already exists. Update the query
description to distinguish empty-query browse from concept-only ranked
search, and document the agreed fallback semantics. This changes no
request shape.

If Cuisine/Meal Type serving is missing on the implementation branch, no
OpenAPI shape change is required; the implementation must bring behavior
into parity with the already-published contract.

## 10. Persistence impact

A durable materialized state requires: - model/entity and `DbSet`; -
clean-install schema; - compatibility migration per repository
convention; - backup/demo behavior review because demo restore currently
treats selected tables explicitly.

Keep the table additive and disposable: it can always be regenerated by
Dreaming. Backup/restore may include it for fast startup or omit and
rematerialize; choose one explicitly in implementation tests. Prefer
inclusion in normal DB backup and safe absence after demo restore,
followed by deterministic fallback/next Dreaming rebuild.

## 11. Failure and recovery

  -----------------------------------------------------------------------
  Failure                             Behavior
  ----------------------------------- -----------------------------------
  malformed Main config               log warning; built-in defaults

  no materialized state               fixed/config defaults; null generatedAt;
                                      empty cuisines; hide Cuisine

  Dreaming aggregation fails          preserve last good row; normal
                                      workflow retry/report

  `/search/filters` fails             existing search/filter UI remains
                                      usable; no blocking modal

  stale metadata request completes    ignore if component/page request
  late                                generation has changed/unmounted

  semantic provider unavailable       typed query: existing lexical fallback;
                                      concept-only: concept text lexical
                                      fallback; preserve hard filters

  cuisine removed from catalog after  next Dreaming removes it; search
  materialization                     hard predicate can naturally return
                                      zero meanwhile
  -----------------------------------------------------------------------

## 12. Verification

API: - config binding/default/fallback unit tests; - real DB tests for
cuisine vocabulary eligibility and materialization; -
vote/cooked/recency deterministic tests; - endpoint contract test
proving no history aggregation or catalog discovery path is called;
finalization dependency and initial-backfill tests; custom-label tests; - search integration
tests proving concept preference changes semantic retrieval while hard
filters remain hard; - cuisine/meal hard-filter tests if those
predicates are part of this slice; concept-only disabled/timeout/error
fallback, successful zero-match semantics, unchanged typed fallback, and
empty-input browse regressions.

PWA: - section order and default-visible three filters; - More filters
with management choices last; - All Main choices and All Cuisines; -
selected-chip visibility after collapse; - custom labels; - hidden Cuisine
with absent/empty materialization; -
concept→preferences mapping; - cuisine/meal→filters mapping; -
Apply/Clear/Cancel and active count; - metadata loading/error
fallback; - accessibility `aria-pressed`, dialog semantics, keyboard
escape.

Contract: - OpenAPI validation; - generated client regeneration; - mock
parity.

Browse: - PostgreSQL-backed sparse Quick traversal across all pages; -
projection/query inspection; - repeated observer, single-flight, stale
response/error, expiry/retry, and scroll stability tests; - before/after
API/database/scroll measurements under the same representative conditions.

Rediscovery: - deterministic affinity/recency and live schedule guard
tests; - Search does not mutate votes; - Search SSE invalidation; - same-week and future-plan cases; - pagination
with new ordering and schedule changes.

Regression: - existing recipe search tests; - existing
RecipeFiltersSheet/page tests; - Dreaming workflow tests.

## Impact summary

**Low impact:** existing search page state model, controller route
ownership, Dreaming workflow extension, localization, existing boolean
filters. Search recipe rediscovery additionally affects calendar
invalidation and browse continuation ordering. Discovery mode is unchanged.

**Moderate impact:** new persisted materialized state and endpoint
contract/client generation.

**Important hidden impact:** current `main` publishes structured filters
and semantic preferences that are not fully applied by serving code.
This feature must not ship UI controls that imply those filters work.
Re-check `search-fix` first and implement only the missing
Cuisine/Meal/concept seams.
