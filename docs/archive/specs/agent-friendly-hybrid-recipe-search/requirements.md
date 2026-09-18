> **Archived — historical reference only.** Tasks, status, commands, and instructions below are historical, not an active work queue or current authority. See [archive guidance](../README.md).

# Agent-Friendly Hybrid Recipe Search

Read the [feature ontology](ontology.md) for the shared concepts, ownership,
state meanings and distinctions used by these acceptance criteria.

## Outcome

WFS recipe search shall retrieve eligible recipes using persisted canonical text,
structured recipe facts, and optional semantic nearest-neighbour candidates. It
must work for an ordinary search box and for an agent-supplied request without
requiring an LLM, changing the caller's original query, or allowing a soft
preference to bypass an explicit constraint.

## Scope

This specification replaces the unbounded in-memory lexical ranking in
`RecipeSearchService`, makes `recipe_search_documents` the canonical search
representation, adds bounded PostgreSQL lexical and vector retrieval, and
extends `POST /api/recipes/search` with factual filters, preferences, and
structured match reasons. It also includes evaluation, telemetry, feature
flags, backfill, and rollback evidence needed to make the new path the default.

It does not add LLM-derived taste traits, translate source recipe content, or
redesign the PWA search UI beyond the agreed result loading and recovery changes.
Derived traits remain a separately authorized,
evidence-led follow-up.

Ingredient exclusions are a future feature. This release exposes no exclusion
filter, semantic exclusion threshold, or promise to enforce negation in a query.
Semantic retrieval handles cross-language relevance without a maintained bilingual
ingredient dictionary; its quality is measured by the evaluation cases.

Removal of superseded search code is part of feature completion. Cleanup is
bounded to this feature and includes unused registrations, helpers, prompts,
configuration, mocks, and documentation after their callers have migrated.

## Decisions

- **D1 — Canonical representation:** one deterministic builder produces both
  `document_text` and JSONB `search_metadata`; its schema version and every
  source input are covered by the source fingerprint.
- **D2 — Eligibility:** ready, non-deleted recipes remain the common base set.
  A document with no ready embedding remains lexically searchable. A pending,
  failed, or stale replacement must not make a previously usable recipe vanish.
  Publish canonical text, metadata, and source fingerprint before requesting an
  embedding. Track embedding readiness independently. Updated documents use
  lexical retrieval until a vector matching their current fingerprint is ready;
  previous semantic matches are not retained for changed content.
- **D3 — Agent boundary:** `query` is the original caller sentence. A caller or
  optional translator may add structured filters/preferences, but retrieval and
  match reasons are deterministic and work when every LLM dependency is absent.
  The current agent query rewrite and LLM final-choice path are retired from
  search serving.
- **D4 — Filter semantics:** different populated filter categories are ANDed.
  Repeated cuisine/meal-type/tag/dietary/category values are ORed; all
  `includedIngredients` must be present as exact normalized indexed facts.
  Broad ingredient concepts are semantic preferences, not exact ingredient facts.
  Values use one documented normalization rule (trim, Unicode case
  fold, whitespace collapse, deduplicate; no singular/plural or synonym claim).
- **D5 — Facts available in v1:** cuisine, meal types, category, ingredients,
  dietary profile, and parsed total minutes come from current recipe-owned data.
  Tags are included only when the index builder can extract a documented,
  source-owned tag array from existing recipe metadata; absent/unparseable tags
  normalize to `[]`, never to guessed traits.
- **D6 — Bounded retrieval:** lexical and semantic queries each return at most a
  configured 50 candidates initially; fusion receives at most 100 candidates.
  PostgreSQL applies eligibility and hard predicates before either retrieval.
  These are ranked-search candidate limits, not a cap on library browsing.
  Empty-query browsing pages through the full eligible library with bounded
  database requests and no fixed total-result limit.
- **D7 — Rollout:** defaults stay unchanged until a versioned relevance suite,
  production-like query-plan evidence, coverage telemetry, and rollback controls
  are present. Each new retrieval path is independently switchable during rollout.
  Legacy comparison paths and rollout-only flags have a mandatory removal gate
  in task 7; the permanent fallback is database lexical retrieval.

## Requirements and observable acceptance

### R1 — Baseline and evaluation

- R1-AC1: A versioned PostgreSQL integration fixture has English and French
  recipes, near matches, accents, ingredients, cuisines, meal types, dietary
  profiles, categories, total times, and tag-present/tag-absent cases.
- R1-AC2: Versioned cases cover `beef`/`boeuf`, `chicken`/`poulet`, a
  cuisine filter, a maximum-time constraint, `fresh vegetables and fish`, and
  `something hearty for a cold evening`; each records hard constraints and
  human-judged relevant IDs separately.
- R1-AC3: The harness records top-5/top-20 IDs, path, candidate counts,
  per-path and total latency, and semantic fallback. Initial pass condition for
  judged intent cases is at least one relevant recipe in top 5.

### R2 — Canonical index documents

- R2-AC1: Equivalent recipe state produces byte-identical document text and
  metadata. Collection ordering and metadata normalization are deterministic.
- R2-AC2: The document contains available name, description, ingredients,
  notes, category, cuisine, meal types, dietary profile, total time, and only
  documented tag facts. Metadata holds normalized values plus integer
  `totalTimeMinutes` when parsable.
- R2-AC3: Any builder input or metadata-schema version change changes the
  fingerprint. Stale work cannot overwrite a newer indexed state.
- R2-AC4: Creating a recipe transactionally creates a pending sidecar before
  its index workflow can run. Backfill replaces documents safely and reports
  progress, failures, and ready/pending/failed coverage.
- R2-AC5: First-time indexing during an embedding outage still publishes usable
  lexical content. An update invalidates semantic eligibility until its matching
  embedding succeeds. A stale embedding completion or failure cannot overwrite
  newer content or embedding state; retries do not remove lexical readiness.
- R2-AC6: Dreaming periodically reconciles eligible recipes against their search
  documents in bounded, resumable batches. It repairs missing sidecars, obsolete
  schema versions, source mismatches, and retryable embedding failures. Normal
  recipe mutations still trigger indexing promptly. Repeated or overlapping
  repair runs do not enqueue duplicate active work for the same recipe/content.
  Initial deployment uses the same reconciliation path and completes lexical
  coverage before database lexical serving is enabled.

### R3 — Database lexical retrieval

- R3-AC1: PostgreSQL has idempotent `pg_trgm` installation and a trigram index
  on canonical document text using the repository's clean-install and
  compatibility migration conventions.
- R3-AC2: A non-empty lexical request never materializes all eligible recipes
  in application memory; it returns at most the configured lexical candidate
  limit with lexical score.
- R3-AC3: Exact name and ingredient cases retain or improve baseline top-5
  results. The chosen query form and representative `EXPLAIN` plan demonstrate
  use of the intended index.

### R4 — Semantic top-K and fusion

- R4-AC1: Vector retrieval filters to eligible documents with ready,
  non-null embeddings, orders by cosine distance, and returns configured top K;
  it does not use the existing fixed 0.7 inclusion threshold.
- R4-AC2: Both retrieval paths apply identical hard filters before candidate
  selection. Fusion deduplicates by recipe ID, preserves component scores and
  sources, normalizes incomparable scales, and uses configured weights.
- R4-AC3: `beef`/`boeuf` and `chicken`/`poulet` each find judged relevant French
  and English recipes. Semantic failure/timeout returns a successful lexical
  response with `fallback-lexical`, not an error.

### R5 — Agent-compatible contract

- R5-AC1: OpenAPI, API DTOs, generated Kiota client, stateful mocks, and PWA
  wrappers describe `query` (optional for browse), `filters`, `preferences`,
  `limit` (1–50, default 12 additional recipes, excluding `topPick`), continuation,
  and structured reasons in one compatible request/response.
- R5-AC2: Filters support cuisines, meal types, tags, included
  ingredients, dietary profiles, categories, and maximum total minutes with D4
  semantics. Invalid limit or malformed normalized values return documented
  validation errors; unknown well-formed terms are valid and may return zero.
- R5-AC3: Preferences for ingredients, cuisines, tags, and concepts only boost
  candidates already admitted by filters. A request for French cuisine and fish
  with a maximum time of 30 minutes enforces cuisine and time as facts while
  ranking fish relevance semantically. Unknown total time fails the time filter.
- R5-AC6: No exclusion field is published or interpreted by an optional agent
  adapter. Reject an explicitly submitted `excludedIngredients` field with a
  documented 400 unsupported-filter error rather than silently ignoring it.
  Free-text negation remains part of the original query but has no guaranteed
  exclusion behavior and must not be represented as an applied hard filter.
- R5-AC4: Results expose deterministic reason codes such as `lexical`,
  `semantic`, `ingredient`, `cuisine`, `tag`, `time`, `preference`, and existing
  contextual reasons. No retrieval-time prose is generated by an LLM.
- R5-AC5: Existing query-only callers remain compatible. Empty query is browse
  with hard filters, and no query embedding is requested for it.
  In particular, empty query with no filters supports continuous scrolling through
  all eligible recipes, without requiring a search term or imposing the ranked
  candidate limit. Filter-only browse likewise pages through all eligible matches.
- R5-AC7: One initial request returns at most one eligible `topPick` and up to
  12 additional recipes. The PWA requests subsequent batches of 12 near the end
  of the list, appending without duplicates or changes to existing order/top pick.
  Return fewer when relevant candidates run out. Preserve existing report-related
  top-pick suppression; never pad the list with irrelevant candidates.
- R5-AC8: Continuation explicitly indicates exhaustion; the UI does not infer it
  from a full batch. Preserve scroll position when closing recipe details. A
  failed next-page request preserves visible cards and offers an accessible
  "Load more" retry. Query/filter changes invalidate previous continuation and
  discard late responses. Expired continuation preserves cards and offers restart.
- R5-AC9: Browse uses database pagination independent of the ranked-search
  snapshot. Load batches of 12 automatically as the user approaches the bottom,
  continuing beyond 50 or 100 recipes until the eligible library is exhausted.
  If an initial top pick is shown, do not repeat it in the scrolling list. At the
  actual end, show a quiet end-of-library state; do not silently repeat recipes
  or imply that a search/filter is required to continue. Preserve the same loading,
  retry, accessibility and detail-close scroll behavior as ranked search.

### R6 — Operations and controlled rollout

- R6-AC1: Telemetry contains no raw query text and supplies a correlation ID,
  path (`hybrid`, `semantic`, `lexical`, `fallback-lexical`, or `browse`), counts,
  timings, index status coverage, and failure classification.
- R6-AC2: Flags independently control database lexical retrieval, semantic
  retrieval/fusion, and structured-contract exposure. Shadow comparisons record
  overlap/rank deltas without affecting returned results.
- R6-AC3: The runbook covers backfill, provider failure, slow queries, alert
  thresholds, and rollback to a working lexical path. Initial API response targets
  are lexical-only p95 below 250 ms and hybrid/semantic-failure fallback p95 below
  600 ms, measured separately by path under representative load. Keep a 300-ms
  combined query-embedding/vector-retrieval budget. Fallback response timing
  includes the failed or timed-out semantic attempt; it is not just lexical query
  duration. Revise targets only from recorded deployment evidence.
- R6-AC4: Caller cancellation propagates and is not classified as semantic timeout
  or served as successful lexical fallback. Telemetry distinguishes caller
  cancellation, semantic budget exhaustion, and provider/vector errors.

### R7 — Retire superseded code

- R7-AC1: Each implementation slice records a bounded inventory of displaced
  search symbols, their callers (including DI, workflow/configuration references,
  and tests), replacement behavior, and deletion point. Code with no remaining
  purpose is deleted in the slice that removes its last caller.
- R7-AC2: Once rollout acceptance and database lexical fallback are verified,
  delete the old in-memory lexical path, duplicate document builders, unused
  LLM reranking code, and any translator code with no supported caller. Remove
  associated dead registrations, prompts, options, mocks, and obsolete tests;
  migrate still-useful behavioral assertions to the replacement first.
- R7-AC3: Task 7 leaves no dormant legacy search implementation, commented-out
  replacement code, or permanent legacy-path flag. Keep the active semantic
  disable control and database lexical fallback. Release rollback uses a
  recorded compatible prior artifact, not dead code in the current solution.

## Open decision affecting a later task

The source-owned tag shape inside `raw_metadata` is not established by the
current model or OpenAPI. Task 1 must verify it against imported recipe fixtures
and document the parser. If it is not reliable, the task must leave `tags` empty
and stop before exposing a hard tag filter; a separately approved persistent tag
model is required to change that decision.
