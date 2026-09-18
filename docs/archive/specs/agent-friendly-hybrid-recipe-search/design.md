> **Archived — historical reference only.** Tasks, status, commands, and instructions below are historical, not an active work queue or current authority. See [archive guidance](../README.md).

# Design: Agent-Friendly Hybrid Recipe Search

The [feature ontology](ontology.md) defines the domain concepts, ownership and
state boundaries used here. These terms describe behavior, not mandatory new types.

## Current seam and target ownership

Today `RecipeController.Search` invokes `AgentSearchTranslationService` for
agent mode, then `RecipeSearchService` loads all eligible recipes for lexical
ranking. `SearchIndexWorkflow.BuildDocumentText` and
`RecipeSearchService.BuildDocumentText` diverge. Vector SQL is bounded, but it
uses a fixed similarity gate. `RecipeSearchDocument` already supplies text,
JSONB metadata, embedding state, fingerprint, and schema version.

The target seam is:

```text
Recipe create/update/import
  -> transaction: recipe + pending recipe_search_documents sidecar
  -> IndexRecipeSearch: publish canonical content -> asynchronous embedding

POST /api/recipes/search
  -> validate original query + filters + preferences
  -> common eligibility and hard predicates in PostgreSQL
  -> lexical top-K (pg_trgm) + optional vector top-K (pgvector)
  -> bounded union and deterministic application rerank
  -> typed match reasons and response
```

PostgreSQL owns predicates and candidate retrieval. `RecipeSearchService` owns
fusion, configured score composition, the existing planner/pantry/family signals,
and response mapping. An external agent may construct the public request; no
search serving decision depends on `AgentSearchTranslationService` or an LLM.

## Representation and indexing

Introduce `IRecipeSearchDocumentBuilder` and an immutable result such as
`RecipeSearchContent(DocumentText, Metadata, SchemaVersion)`. Its normalizer is
the only normalizer for indexed fact values. It must deserialize only known
recipe-owned representations and treat malformed optional JSON as no value while
recording a safe failure reason; it must not infer tags, ingredients, or traits.

The builder deterministically composes document text from current fields in a
fixed field order. It serializes `search_metadata` with stable property and
collection ordering. The minimum metadata schema is:

```json
{
  "cuisineTypes": ["mediterranean"],
  "ingredients": ["salmon", "tomato"],
  "tags": [],
  "mealTypes": ["supper"],
  "category": "main",
  "dietaryProfiles": ["..."],
  "totalTimeMinutes": 25
}
```

`SearchFingerprintService` must fingerprint the builder schema version and its
canonical source values, rather than maintain a separately guessed field list.
This removes the present mismatch where instruction changes enqueue indexing but
are not fingerprinted. The index workflow computes content and fingerprint before
writing. Publish text, metadata, schema version, and source fingerprint atomically
before calling the embedding provider. `index_status` describes canonical content
readiness; add independent `embedding_status` and nullable `embedding_fingerprint`
fields to SQL and the runtime model. Embedding status transitions through pending,
indexing, ready, and failed without withdrawing canonical content readiness.
`last_indexed_at` records canonical publication; embedding model/version describe
the vector actually stored, not an attempted replacement.

When indexed content changes, mark embedding work pending and invalidate semantic
eligibility. Semantic retrieval requires ready embedding status, a matching
embedding/source fingerprint, and the configured compatible model/version and
vector dimensions. Publish the vector, its fingerprint, model/version, and ready
embedding status together. Provider failure updates only embedding status;
lexical retrieval continues over current canonical content, including the first
index of a recipe. Old vectors must never contribute to changed documents.

Canonical publication must serialize with recipe mutation, using a short
transactional row lock or equivalent conditional concurrency check against the
persisted source. Do not hold a transaction across provider calls. Embedding
completion and failure writes are conditional on the same source fingerprint and
current work ownership, so late jobs cannot overwrite a newer result or mark it
failed. Verify concurrent source edits, overlapping jobs, and retry recovery.

Recipe creation must add the sidecar in the same database save as the recipe;
the workflow can then never find no row. Import/update flows enqueue only after
the persisted source change. Reconciliation starts from eligible recipes with a
left join to search documents, covering absent sidecars, obsolete schema versions,
changed source fingerprints, and missing/incompatible/failed embeddings. Compute
the current source fingerprint when submitting work; do not reuse an old document
fingerprint as the requested source version.

Use the existing `api/src/RecipeApi/Workflows/dreaming.yaml` schedule for recurring
repair. Add a bounded dispatch step that starts a separate search-reconciliation
workflow; provider calls and the full library scan run in that child workflow,
outside dreaming's report/reschedule dependency chain. Dispatch outcome and the
latest reconciliation progress/failures appear in the dreaming report. A failed
dispatch must be observable without preventing the next dreaming cycle from being
scheduled. Normal create/update/import indexing remains immediate.

The reconciliation workflow uses stable keyset pagination with durable progress,
a per-run scan/enqueue/time budget, submission rate limits, and retry backoff.
Resume unfinished passes on later runs and restart completed passes to catch
changes behind the cursor. Use durable work deduplication so overlapping dreaming,
manual reconciliation, and mutation events do not create duplicate active indexing
jobs for the same recipe/fingerprint/model version. Recheck source state at write
time using the indexing concurrency rules. Retain automatic retries for transient
failures, with subsequent dreaming passes repairing exhausted or missed work.

Initial deployment invokes the same resumable reconciliation workflow on demand;
it need not wait for the next dreaming cycle. Verify full eligible-recipe lexical
coverage before enabling database lexical serving. Report lexical coverage
separately from embedding coverage, so an embedding outage does not prevent text
search readiness. No additional recurring scheduler is introduced. Update the
bundled workflow and verify delivery to stored workflow definitions on upgrade;
editing bundled YAML alone is not evidence that an existing installation uses it.

Database changes update `api/database/schema.sql`,
`api/database/compatibility.sql`, `RecipeDbContext`, model mapping, and backup /
restore coverage together. `pg_trgm` enablement and the GIN index must use an
existing-data-safe compatibility path; if concurrent index creation cannot run
in the migration transaction, it is a documented, resumable operational step.

## Retrieval and reranking

`RecipeSearchRepository` (or a similarly bounded, dedicated query component)
receives normalized hard predicates and returns a recipe projection plus score;
it never returns all candidates. A shared predicate builder applies ready and
non-deleted eligibility plus metadata filters before lexical or vector ordering.

Lexical retrieval uses the persisted document only. The implementation team must
select its exact `pg_trgm` predicate/ranking (and a short-query exact/token
branch if the evaluation proves one necessary) from the fixture corpus, capture
an `EXPLAIN (ANALYZE, BUFFERS)` result at representative scale, and preserve the
plan assertion in PostgreSQL integration coverage. Query parameters are always
parameterized. During backfill, documents with usable canonical text are lexical
eligible even without an embedding; recipes that have no sidecar use the prior
lexical implementation only under the lexical flag until coverage reaches the
release threshold, with that fallback measured explicitly.

Semantic retrieval generates one embedding only for a non-empty query and asks
pgvector for eligible ready vectors ordered by cosine distance and limited by
configuration. Its combined query-embedding/vector-retrieval budget is 300 ms,
linked to caller cancellation. Budget exhaustion or provider/vector errors produce
the lexical candidate set and `fallback-lexical`. If the caller has cancelled,
propagate cancellation instead of continuing with fallback. Empty legitimate
lexical results remain empty; do not invent matches. The similar-recipe feature uses the same bounded
vector policy, with the existing lexical fallback when its source has no vector.

Candidate records retain `RecipeId`, recipe projection, lexical score, semantic
score, sources, and factual reason codes. Fusion unions by ID, maps each source
score to a documented 0–1 normalized scale, then applies configured weights.
Planner, pantry, family, ratings, and schedule signals remain separate named
components after fusion. Hard filters run first; preferences are additive,
capped components after fusion and cannot create a candidate. Final ties use the
existing stable created-at tie-breaker. Development/admin diagnostics may expose
component scores; public responses expose only approved reason codes and labels.

## Contract and compatibility

OpenAPI is updated first. The new request keeps legacy fields used by the PWA
(mode/similar/pantry/planner) while adding optional `query`, `filters`, and
`preferences`. The contract specifies the D4 semantics and bounds. Existing
boolean library filters retain their current meanings; factual filters are added
without overloading those booleans. A query-only payload remains valid and maps
to empty factual filters/preferences. Task 4 keeps existing public reason/path
values; new retrieval classifications remain internal until task 5 atomically
updates OpenAPI, API, generated clients, wrappers and mocks. Retain existing enum
values for compatible clients and add approved values rather than renaming them.

### Result loading

Use one initial search response for `topPick` plus up to 12 alternatives. `limit`
counts only entries in `results`, excluding `topPick`, defaults to 12 and accepts
1–50. Preserve smaller explicit limits and existing report-related promotion
suppression. If no top pick is eligible, it is null and the alternatives retain
their normal batch size. This resolves the prior OpenAPI 5/service 6 default drift
as an intentional contract change in task 5.

Add an opaque `continuationToken` request field and nullable `nextCursor` response
field in task 5. For ranked search, serve continuation from a bounded, expiring snapshot of ranked
candidate IDs and initial ranking, scoped to the same caller/access context and
search parameters. Continuation does not regenerate the query embedding or rerank
the displayed results. It returns only the next alternatives (`topPick` is null),
and the PWA retains the original top pick. Recheck recipe eligibility and hard
filters before returning stored IDs; skip removed/ineligible recipes without
reordering survivors. Retries with the same cursor are idempotent in position.
Do not log tokens or query content. Cache size and expiry are bounded; document
the configured limits and expiry/restart response in the approved contract.

For ranked search only, paginate within the bounded retrieved candidate set (initial maximum 100
before deduplication and eligibility changes). A null `nextCursor` means this
search is exhausted; no full-library scan or irrelevant padding extends it.
The PWA requests batches of 12 near the end of the existing two-column grid and
appends them without moving cards. Preserve detail-close scroll position, provide
an accessible "Load more" retry on failure, and stop automatic retry loops. On
cursor expiry retain the displayed cards and offer an explicit search restart.
Query/filter changes clear continuation and use a request-generation guard to
ignore old responses. Preserve reduced-motion behavior and avoid animation delays
that grow with the cumulative result index. This is the bounded UI change approved
through the mère-designer review; broader visual redesign remains out of scope.

Ingredient exclusions are deferred. Do not add exclusion SQL, semantic veto
thresholds, ingredient-group expansion, or a bilingual alias dictionary. Keep
ingredient text in the canonical document for semantic retrieval. Exact inclusion
filters match only normalized indexed facts; they do not claim that `fish` equals
`salmon` or that a quantity-bearing phrase equals an ingredient name. Task 1 must
document that representation before the inclusion contract is exposed. Concepts
such as fish or vegetables can remain in the original query and soft preferences.
An explicitly submitted `excludedIngredients` field returns a documented 400
unsupported-filter error; query negation is not converted into a hard constraint.
No applied filter or match reason may claim that excluded ingredients are absent.

Maximum-time filters require a known parsed duration at or below the limit.
Duration parsing must handle the repository's ISO 8601 hour/minute representation
and documented legacy forms; malformed or unknown time never passes a time cap.
Task 1 also records the explicit projection of the dietary-profile object to
searchable facts; it must not invent dietary labels from its confidence fields.

The controller no longer replaces `query` for agent mode. If an adapter is kept,
it may populate a separate optional augmentation object only after preserving the
original query; its result must be validated like a client request and be
observable as agent-supplied metadata. Search calls never invoke LLM reranking.
Reasons are a closed OpenAPI enum aligned across DTOs, generated client, mocks,
API mapper, and PWA wrapper. The PWA adopts the result-loading interaction above
and forwards the expanded compatible request shape.

Empty query is browse: database eligibility/hard filters, no lexical/vector
retrieval, deterministic ordering, and `browse` result path. Browse continuation
uses database keyset pagination through the entire eligible library, not the
ranked-search snapshot or its 100-candidate ceiling. This applies both with no
filters and with factual filters alone. Use the existing browse page's explore
ordering (never-cooked first, least recently cooked next, newest creation date
for ties), with recipe ID as a
unique final tie-breaker. Return up to 12 alternatives per batch; an initial top
pick, if present under the existing promotion rules, is omitted from subsequent
pages. Keep the initial top pick stable while scrolling.

The browse cursor carries validated ordering position, browse context and any
initial top-pick ID needed for duplicate suppression; it must not carry a full
library of IDs. Bound each database query and keep requests parameterized.
Determine continuation from an additional eligible row rather than a full page
alone. Recheck current eligibility. Concurrent edits can alter the traversable
library: deduplicate appended IDs client-side, never reorder visible cards, and
refresh the browse session to reflect recipes moved behind its cursor. No claim
of a transactionally frozen full-library snapshot is made.

The existing search screen remains browsable when query and filters are cleared.
Prefetch before the bottom, append without jumping, retain cards on page failure,
and provide an accessible retry. The mother-focused design intent is a continuous
stream of choices without forcing her to name a meal first. "Endless" means no
artificial total cap: once all available recipes have been seen, quietly indicate
the real end, rather than recycling cards. Use windowing or equivalent bounded
rendering if required for large libraries while preserving scroll restoration and
accessible focus. Test enough pages to cross the ranked candidate ceiling.

Malformed
payloads and out-of-range limits are 400 validation errors. A well-formed term
unknown to the indexed vocabulary is accepted and can yield no results.

## Rollout, privacy, recovery, and verification

Configuration exposes distinct lexical DB, semantic/fusion, structured exposure,
shadow, candidate-limit, quality-floor, and weight controls. Defaults preserve
the existing serving path until shadow evaluation passes. Record configuration
version in telemetry, never raw text. Per request telemetry uses an opaque
correlation ID and path/count/timing/failure fields only.

Measure API response latency from request entry through response preparation,
including retrieval and reranking. Lexical-only serving has a p95 target below
250 ms. Hybrid serving and semantic-failure fallback each have a p95 target below
600 ms; the fallback measurement includes time spent on the unsuccessful semantic
attempt. Report these populations separately so fast requests cannot conceal slow
fallback. Record embedding, vector, lexical and reranking durations independently.
The 300-ms semantic budget is an internal deadline, not an end-to-end latency
claim. Load reports identify corpus size, concurrency, environment and configuration;
these are acceptance targets until measured, not established performance results.

Rollout proceeds: baseline → canonical/backfill → lexical shadow → lexical
internal cohort → semantic/fusion shadow → hybrid internal cohort → structured
agent/internal clients → general enablement. Low-overlap examples are reviewed,
not automatically treated as regressions. Alerts cover vector fallback, slow DB
queries, indexing failures/coverage, and zero-result spikes. Rollback turns off
the newest flag first, retaining a known lexical path. Full rollout requires
evaluation pass, latency targets under representative load, ready-document
coverage, and operator runbook rehearsal.

Verification is layered: builder/fingerprint units; real PostgreSQL integration
tests for extensions, predicates, indexes, vector timeout/fallback and query
plans; OpenAPI/generated-client/mock/PWA contract tests; workflow and
backup/restore tests; evaluation and load reports. In-memory provider results do
not prove PostgreSQL trigram or pgvector behavior.

## Mandatory retirement and migration boundary

Maintain a deletion inventory while replacing search behavior. Initial candidates
(currently called, therefore not dead yet) are the two `BuildDocumentText`
implementations, the unbounded lexical retrieval/ranking helpers and their
trigram utilities, and `AgentSearchTranslationService.RerankAsync` plus its
prompt. Trace `TranslateAsync` separately: the design permits optional intent
augmentation, so retain a revised translator only if an actual supported caller
uses it. Otherwise delete the service, its `Program.cs` registration, constructor
dependencies, and obsolete tests. Audit `OriginalQuery`, fixed scoring constants,
and helper methods by caller; do not delete shared planner/pantry behavior.

Delete duplicate builders when the canonical builder replaces their callers.
Retain the legacy lexical path only while it has an active shadow/rollout role,
with task 7 owning its deletion. At final completion, database lexical retrieval
is the active permanent fallback, semantic retrieval can be disabled, and the
old application-memory scan and obsolete rollout options are absent. Tests must
prove fallback still works after deletion. Preserve useful regression assertions
by moving them to the new implementation before retiring old fixtures.

Deployment needs an in-place schema migration for `pg_trgm` and the trigram
index, followed by a resumable data backfill/re-embedding of search documents.
Existing recipes and the current pgvector table/index remain. Add separate
`embedding_status` and `embedding_fingerprint` columns; existing vectors without
verified fingerprint/model compatibility are ineligible until rebuilt. The migration
runner currently executes `compatibility.sql` with psql before sqldef; validate
both clean install and populated upgrade, including any concurrent index step.
No database reset or recipe re-import is part of this feature. Backfill is a
distinct operational step using the same reconciliation as dreaming; it covers
missing sidecars and old schema versions. After legacy code retirement, rollback is a compatible prior application
artifact against retained additive schema; test that compatibility before release.
