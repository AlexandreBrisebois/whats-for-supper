# Search Filter Discovery --- Requirements

> **Archived — historical reference only.** Tasks, status, commands, and instructions below are historical, not an active work queue or current authority. See [archive guidance](../README.md).

## Outcome

Make recipe filtering faster for a busy family without turning the
filter sheet into an endless tag browser. WFS shall expose a compact set
of fixed and learned filter choices, with learned ordering materialized
by Dreaming so opening Search performs no heavy preference analysis.

This feature is deliberately surgical. It extends the existing recipe
search contract and filter sheet; it does not introduce an ingredient
ontology, a generic recommendation engine, or a new search retrieval
architecture.

## Decisions

**D1 --- Four sections in fixed order: Existing filters, Meal Type, Main, Cuisine.**

**Main**: configurable semantic
concepts. Built-in defaults are `beef`, `poultry`, `pork`, `fish`,
`pasta`, `vegetarian`. - **Meal type**: fixed application values.
Initial compact choices are Supper, Lunch, Breakfast, Dessert. -
**Cuisine**: values are sourced only from existing eligible recipes'
`Recipe.CuisineType`. Dreaming never invents, translates, normalizes, or
expands a cuisine value.

Existing filters initially show Quick, Family Favorite, and Never Tried,
in that order. More filters reveals New, It’s Been a While, Healthy
Choice, Reported, and Ready to Review, with the two management filters
last. Selected disclosed filters stay visible and removable when collapsed.

**D2 --- Ownership.** - Main vocabulary: built-in defaults, overridable
through application configuration; environment configuration may
override the configured list using the repository's normal ASP.NET
configuration binding. - Meal types: fixed application definitions. -
Cuisine vocabulary: recipe catalog. - Cuisine promotion/order: Dreaming
materialization using household evidence. Main always uses configured
order; it has no learned scores or personalization in v1. - Localization: PWA
translation resources for built-in IDs/known meal types. Cuisine values
are displayed as stored. Custom Main IDs require a non-blank configured
display label, returned by the endpoint without requiring PWA code
changes. - Serving: `GET /api/recipes/search/filters`.

**D3 --- Learning evidence.** Dreaming may use recipe votes and cooked
meal history to derive household affinity. Historical cook frequency is
positive affinity evidence. Recent repetition is rotation pressure and
must not erase long-term affinity. The first implementation shall be
deterministic; no LLM is required.

**D4 --- Bounded vocabulary.** Dreaming may rank/promote only cuisines
from their authoritative source. It never invents cuisines or classifies
recipes into Main concepts. A cuisine with no household evidence remains available if
present in the recipe catalog.

**D5 --- Main concepts are semantic preferences.** Broad concepts such
as fish or poultry are not exact ingredient predicates. Selecting a Main
option shall populate the existing search preference concept contract,
not `includedIngredients`. The semantic preference must affect ranked
search while explicit hard filters remain authoritative.

**D6 --- No request-time learning.** `GET /api/recipes/search/filters`
shall not aggregate calendar history, votes, or invoke an LLM. It reads
fixed/configured definitions plus the latest materialized Dreaming
state. If learned state is missing or stale, the endpoint remains usable
with configured Main order and fixed Meal Types. No request-time catalog
query is permitted. Absent state returns `generatedAt: null` and empty
cuisine arrays; the PWA hides Cuisine until materialized options exist.
An explicit initialization/backfill runs the materializer outside Search.

**D7 --- Progressive disclosure.** The compact surface shows only a
small promoted cuisine subset. Complete cuisine choices remain reachable
through progressive disclosure. Main shows the first six configured
choices, with All Main choices revealing any remainder. Existing filters
use More filters; selected choices remain visible when groups collapse.
Personalization changes prominence/order, not
availability.

## Scope

### In scope

1.  Contract for `GET /api/recipes/search/filters`.
2.  Configurable Main concept vocabulary with six built-in defaults.
3.  Fixed Meal Type choices.
4.  Dreaming materialization of cuisine availability and promotion only,
    after meal finalization, including initial backfill.
5.  Household evidence from `RecipeVote` and cooked `CalendarEvent`
    history.
6.  Search serving support for `preferences.concepts`, sufficient for
    Main selections to have semantic effect.
7.  Grouped mobile filter UX in `RecipeFiltersSheet`, preserving
    existing filters.
8.  OpenAPI, generated client, mocks, API/PWA tests and Dreaming tests.
9.  Bounded empty-query browse performance: earlier continuation loading,
    larger continuation batches, lightweight database projection, and Quick
    eligibility before pagination.
10. Recipe-level rediscovery in Search empty-query browse: promote
    liked, long-uncooked recipes; suppress promotion of already-planned
    recipes and recipes cooked in the relevant week. Preserve existing votes.

### Non-goals

-   Any change to Discovery mode eligibility, ordering, voting, contracts,
    cards, or state management. Search promotion rules do not apply there.

-   Ingredient ontology or ingredient-family graph.
-   LLM-generated cuisine names or preference traits.
-   Replacing hybrid search ranking.
-   Redesigning Top Pick or Surprise Me. Applying the shared calendar
    promotion guard to their candidate selection is in scope; planned or
    same-week-cooked recipes must not bypass it through these surfaces.
-   Personalized Meal Type vocabulary or Main ordering/scoring.
-   Hiding catalog cuisines because the household has not used them.
-   Reworking unrelated search filters. Quick browse eligibility before
    pagination is explicitly in scope because Quick is promoted in this UI.

## Acceptance

### SFD-R1 --- Compact filter discovery

-   **AC1.1** Opening recipe filters presents Existing filters, Meal Type,
    Main, then Cuisine (when materialized options exist) without requiring
    a long flat scroll
    through all cuisine values.
-   **AC1.2** Existing filters initially expose Quick, Family Favorite, and
    Never Tried; More filters reveals the other five, with Reported and
    Ready to Review last. Main initially exposes at most six configured
    choices in configured order, with All Main choices for the remainder;
    Cuisine initially exposes a bounded promoted subset and an obvious
    path to all cuisines.
-   **AC1.3** Active selections are visibly selected, removable, and
    preserved until Apply/Clear/Cancel according to the current
    draft-filter interaction. Selected choices from collapsed groups remain
    visible and removable; unselected management filters stay disclosed-only.
-   **AC1.4** Controls remain usable one-handed: minimum existing 44px
    target behavior is preserved, labels are compact, and the
    Apply/Clear actions remain reachable while the choices scroll.

### SFD-R2 --- Authoritative vocabularies

-   **AC2.1** With no override, Main contains beef, poultry, pork, fish,
    pasta, vegetarian.
-   **AC2.2** A valid application configuration override
    replaces/configures Main without code changes; malformed override
    falls back safely to defaults and does not break search. Custom IDs
    require a non-blank display label; built-in IDs use PWA translations.
-   **AC2.3** Meal Type uses fixed application values and is not
    generated by Dreaming.
-   **AC2.4** Every returned Cuisine value equals a `CuisineType` value
    on at least one eligible, ready, non-deleted recipe at
    materialization time.
-   **AC2.5** The endpoint returns Main definitions in configured order. Dreaming
    neither scores Main nor builds recipe-to-concept classifications.

### SFD-R3 --- Learned promotion without a bubble

-   **AC3.1** Dreaming can use `RecipeVote` likes/dislikes and cooked
    `CalendarEvent` history joined to recipes as evidence.
-   **AC3.2** Repeated historical cooking can increase affinity; recent
    repeated cooking applies temporary rotation pressure rather than
    deleting the preference.
-   **AC3.3** A cuisine with zero preference evidence remains present in
    the complete cuisine list.
-   **AC3.4** Learned ordering is deterministic for the same source data
    and clock.
-   **AC3.5** Failure to materialize new learned state leaves the
    previous good state usable; absence of any learned state yields
    configured Main/fixed Meal defaults and hides Cuisine. Materialization
    depends on successful `finalize-overdue-meals`; a failed prerequisite
    leaves previous state intact.

### SFD-R4 --- Cheap serving endpoint

-   **AC4.1** `GET /api/recipes/search/filters` returns the configured
    Main definitions, fixed Meal Types, cuisine options, and
    promotion/order metadata needed by the PWA.
-   **AC4.2** The endpoint performs no vote/calendar aggregation and no
    model call or recipe-catalog discovery query.
-   **AC4.3** The endpoint response is bounded; full cuisine values may
    be returned because they are a distinct materialized catalog, but
    recipe rows/history are never returned.
-   **AC4.4** Endpoint failure does not prevent normal recipe search;
    the PWA can show built-in Main/Meal defaults and existing filters,
    with Cuisine hidden when no materialized options are available. Previously
    fetched materialized options may remain usable on a failed refresh.

### SFD-R5 --- Main selections actually affect search

-   **AC5.1** Selecting Main `fish` sends
    `preferences.concepts: ["fish"]` (or the configured semantic term)
    through the existing recipe search request.
-   **AC5.2** `preferences.concepts` influences ranked semantic search;
    it is not treated as an exact ingredient hard filter.
-   **AC5.3** Explicit structured filters continue to constrain
    candidate eligibility and cannot be bypassed by a concept
    preference.
-   **AC5.4** Continuation fingerprinting includes the selected
    preference, preserving the existing continuation invalidation
    behavior.
-   **AC5.5** Existing query-only searches remain behaviorally
    compatible.

-   **AC5.6** Empty query plus non-blank concepts attempts semantic search. If
    semantics are disabled/unavailable, time out, or fail, use the selected
    concepts as lexical retrieval text without changing the caller query.
    Hard filters remain authoritative. A successful semantic search with
    zero matches remains empty; it does not trigger lexical fallback.
-   **AC5.7** Typed queries retain existing lexical fallback. Empty query
    with no usable concepts retains browse behavior.

### SFD-R6 --- Contract and verification

-   **AC6.1** `specs/openapi.yaml`, API DTO/controller, generated PWA
    client, wrappers and mocks agree.
-   **AC6.2** API tests cover defaults, config override/fallback,
    learned-state absence, endpoint serving, and semantic concept
    application.
-   **AC6.3** Dreaming tests prove bounded-source behavior and
    deterministic vote/cook/recency scoring with a controllable clock.
-   **AC6.4** PWA tests cover section order, all three disclosure controls,
    selected-chip visibility after collapse, hidden Cuisine without state,
    selection mapping, Apply/Clear/Cancel, endpoint failure
    fallback, and accessibility state.
-   **AC6.5** Existing search and filter regression suites continue to
    pass.

### SFD-R7 --- Responsive empty-query browsing

-   **AC7.1** Empty-query browse without semantic concepts keeps an initial
    limit of 12 alternatives. Continuation requests start with a limit of
    24 and trigger earlier than the current 600px bottom margin. Final
    prefetch distance and batch size are justified by measured scrolling
    and API latency, within the existing API limit of 50.
-   **AC7.2** At most one continuation request is in flight for the active
    browse generation. Query/filter/context changes invalidate stale pages;
    old responses cannot append results or replace current error state.
    Existing cards and scroll position remain stable during loading.
-   **AC7.3** Initial and continued browse queries project only fields needed
    for result cards, existing browse behavior, and cursor construction.
    Ingredients, raw metadata, and other unused large recipe fields are
    not loaded. Response shape and report status stay compatible. Ordering
    and promotion eligibility follow SFD-R8; cursor handling must match it.
-   **AC7.4** Quick eligibility is applied before page limits and cursor
    calculation in initial and continued browse. Sparse Quick matches must
    not cause premature exhaustion; all eligible matches remain reachable
    without duplicates or omissions. Keep the existing meaning of Quick.
-   **AC7.5** Capture before/after initial-page and continuation API latency,
    database query duration/payload evidence, and visible scroll-loading
    waits using the same representative dataset, device/network conditions,
    and scroll scenario. Include repeated rapid scrolling and sparse Quick
    matches. Record sample counts and p50/p95 latency; document the selected
    prefetch threshold and batch size. Demonstrate reduced browse waiting
    without an initial-load regression or unbounded background fetching.
    Mock/static checks alone do not establish a live performance improvement.
-   **AC7.6** Preserve continuation expiry/retry behavior and existing typed
    and concept-only search semantics. Browse-specific tuning must not
    accidentally change the pagination policy for ranked search.

### SFD-R8 --- Rediscover favorites without repeating planned meals

-   **AC8.1** Search empty-query browse promotes recipes with positive
    affinity that have not been cooked recently. Use existing likes and
    cooked history; age alone must not turn a disliked recipe into a favorite.
    Keep unseen/never-cooked choices available so favorites do not monopolize
    Search browsing. Use deterministic ranking with a stable recipe-ID tie-break.
-   **AC8.2** A recipe assigned to an active meal today or on any future
    date is ineligible for promotion, regardless of whether it has been
    cooked. Active means Planned, Locked, or AwaitingConsensus with that
    recipe assigned as `RecipeId`; candidate lists alone are not assignments.
    A recipe cooked during the relevant calendar week is also ineligible.
    Use the selected planning week when present, otherwise the current week,
    with the repository's calendar timezone/week conventions.
-   **AC8.3** These are promotion guards, not search-access restrictions.
    Recipes remain accessible through explicit search and the library.
    Empty-query browse puts ineligible recipes after eligible recommendations
    and does not select them as Search Top Pick/Surprise Me. Do not relax
    the guards to fill an empty
    recommendation surface, and do not ban their entire cuisine.
-   **AC8.4** Search may promote previously liked recipes once the configured
    rediscovery interval has elapsed since cooking. Never-cooked liked
    recipes remain eligible, subject to calendar guards. Existing votes are
    read-only evidence: searching or opening a recipe never changes a vote
    or its timestamp. No new voting or non-voting card flow is introduced.
-   **AC8.5** Scheduling, moving, removing, skipping, or cooking a meal updates
    promotion eligibility using current calendar state, without waiting for
    Dreaming. Removal/skip makes a recipe eligible again only if no other
    active assignment or same-week cooked event still blocks it. Already-open
    Search browse surfaces refresh or remove stale promoted candidates;
    stale Search responses cannot re-promote blocked recipes.
-   **AC8.6** Use consistent recipe promotion eligibility across Search browse and
    its Top Pick/Surprise Me selection, within existing candidate boundaries.
    Discovery mode remains entirely unchanged. Keep cuisine-button promotion separate from recipe
    promotion. No recipe-to-Main classification is introduced.
-   **AC8.7** Verify liked-and-old versus recently cooked ordering, preserved
    votes, unvoted/disliked handling, future assignments
    beyond the current week, same-week cooking, skip/removal with duplicate
    assignments, week boundaries, live invalidation, and complete pagination
    under the new order. Record the rediscovery interval and ranking policy
    before implementation; use a controllable clock for boundary tests.

## UX review --- Mère-Designer

The proposed grouping reduces the current flat-chip burden. The smallest
useful corrections are: - keep the first view compact instead of showing
every cuisine; - use familiar labels rather than exposing
scoring/ontology language; - make active state and Apply/Clear recovery
obvious; - do not show affinity scores or counts to Mom; - personalize
Cuisine ordering, not availability. Existing filters lead with Quick,
Family Favorite, and Never Tried; management filters stay behind More
filters unless selected. Meal Type precedes Main, then Cuisine.

## Family review and convergence

**Mom:** wants the fastest path from "what can we eat?" to a manageable
set of recipes. Supports compact Main/Meal/Cuisine groups and
progressive disclosure; rejects a long personalized tag list.

**Dad:** wants configuration and predictable behavior. Supports
config-owned Main defaults and deterministic Dreaming rather than an
opaque LLM-created vocabulary.

**Daughter:** wants her likes to matter but not to make the same food
recur. Supports votes as affinity evidence and rotation pressure after
recent repetition.

**Son:** wants familiar favorites to remain easy to find while still
seeing forgotten choices. Supports preserving long-term affinity
separately from current promotion.

**Convergence:** fixed/configured vocabulary must remain understandable
and controllable; Dreaming learns ordering from actual family behavior;
recent cooking diversifies what is promoted; no learned signal hides
valid choices; search remains authoritative for explicit intent.
