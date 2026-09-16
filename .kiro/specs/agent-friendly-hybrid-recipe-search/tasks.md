# Tasks: Agent-Friendly Hybrid Recipe Search

## Shared required context

Read [ontology.md](ontology.md) before each selected task, together with its
requirements and design sections. Use its names consistently in DTO/storage
mappings, tests, telemetry and completion evidence. A new class/table per concept
is not required. Task 1 resolves the explicitly unverified representation mappings;
later slices update the ontology only when their approved design changes a meaning.

## Implementation status

Review decisions are resolved; implementation has not started. Update this table
when executing a selected task, using Not started, In progress, Blocked, or
Completed. For each update record changed files, satisfied acceptance IDs, actual
commands/results, and remaining work in that task's evidence section. Completed
requires implementation, applicable cleanup, and required acceptance evidence;
unverified deployment/runtime checks cannot be recorded as passed.

| Task | Status | Evidence / remaining work |
| --- | --- | --- |
| 1 — Baseline and facts | Completed | Versioned fixture, factual vocabulary, and isolated PostgreSQL baseline measurement completed; no Task 2 work started |
| 2 — Canonical indexing and dreaming repair | Not started | Implementation, upgrade/backfill and concurrency tests pending |
| 3 — Database lexical retrieval | Not started | Migration, bounded retrieval and real query-plan evidence pending |
| 4 — Semantic retrieval and fusion | Not started | Ranking, fallback and cancellation tests pending |
| 5 — Contract, scrolling and agent compatibility | Not started | API/client/UI changes and continuation/browse tests pending |
| 6 — Rollout and operations | Not started | Load, coverage and rollback evidence pending |
| 7 — Dead-code removal | Not started | Caller migration, deletion inventory and post-removal checks pending |

### Task 1 evidence

- **Starting worktree baseline (2026-09-15):** `HEAD` is
  `41241a6c5d68a26c80e5bd9926357642f56b5170`; staged and unstaged tracked
  changes were empty. The only untracked paths were the four pre-existing files
  in this specification packet. Their pre-edit SHA-256 identities were:
  `ontology.md` `c3e030b18cb59335c04cfb88aa67f5efd88e1df7fa93ae94676cbbad8c1a4858`,
  `requirements.md` `1715f3c3d984d686f6828b2c6e65e6dcfdd02ca3b24989be7b8d47812d06a7bb`,
  `design.md` `4e02224ab52dd2a39e41f1c819adb56fd6261b98b5940fd69c9ec3dc565efb9b`,
  and this file `2edced86123d027d4fe976c883cdcb551266220c20ae647e379d92cfc15295b3`.
  This identity is the Task 1 baseline; later evidence will distinguish the
  task-local edits from the supplied untracked packet.
- **Authorized scope:** Task 1 only. No production search/indexing, OpenAPI,
  schema, generated-client, flag, or deployment changes are authorized.
- **Fixture and harness:** `HybridRecipeSearchBaselineFixture` is version
  `2026.09.15.1`; it seeds eight English/French recipes with accents, near
  matches, cuisines, meal types, categories, dietary profiles, known/unknown
  durations, and an untrusted tag-candidate/absent pair. Its seven judged cases
  record hard constraints and relevant IDs separately. The opt-in PostgreSQL
  harness records top-5/top-20 IDs, serving path, candidate count, total
  latency, and semantic-fallback status. Its precomputed fixture embedding
  outputs are case data, not runtime translation, synonym, or bilingual alias
  logic.
- **Exact included-ingredient representation:** use `Recipe.Ingredients`, the
  JSONB array populated by `SyncRecipeProcessor` from source
  `recipeIngredient` (or legacy `ingredients`). Each scalar string is an exact
  fact after FormKC, trim, invariant lowercase, whitespace collapse, sort and
  deduplication. Legacy object-array elements support only a string `name`.
  Quantities and prose are retained, not stripped or guessed: `fish` does not
  equal `salmon`, and `beef` does not equal a quantity-bearing ingredient line.
  Ingredient exclusions remain out of scope.
- **Dietary-profile projection:** project only normalized non-empty
  `primaryFoodGroup`, `secondaryFoodGroups`, and `proteinSource` from the stored
  `RecipeDietaryProfile` JSON. Do not derive labels from `confidence`, `source`,
  `wholeGrainConfident`, `fopFlags`, or the profile's cuisine/meal duplicates;
  recipe-owned cuisine and meal-type fields remain separate facts.
- **Duration parsing:** accept ISO 8601 `PT#H`, `PT#M`, and `PT#H#M` (the sample
  corpus includes `PT1H5M`); accept legacy positive-integer `m`, `min`, `mins`,
  `minute`, or `minutes`. Other text, including `1 hour 30 minutes`, malformed
  values, and unknown durations are null and must fail a future time cap. This
  is the selected Task 1 vocabulary for the canonical builder, not a change to
  current serving behavior.
- **Tag source decision:** no trustworthy tag source exists. A scan of the
  supplied `data/recipes/**/recipe.json` and `recipe.info` samples found zero
  `tags`/`tag`/`keywords` fields; `SchemaOrgRecipe` declares no tag member and
  `SyncRecipeProcessor` only extracts ingredients and total time from raw
  metadata. Keep indexed tags `[]`; hard tag-filter exposure remains blocked
  until a separately authorized source-owned representation exists. The fixture's
  synthetic `keywords` raw-metadata candidate is a negative parser case, not
  evidence of a supported source.
- **Source validation:** the French recipe shape in the fixture is copied from
  `data/recipes/25f38bfb-33aa-4db6-abbd-e1545cab9090/recipe.json`, including
  accented quantity-bearing `recipeIngredient` values and `PT1H5M`. Focused
  fixture tests: `dotnet test src/RecipeApi.Tests/RecipeApi.Tests.csproj
  --no-restore --filter "FullyQualifiedName~HybridRecipeSearchBaselinePostgresTests|FullyQualifiedName~HybridRecipeSearchFactVocabularyTests"
  --logger "console;verbosity=normal"` — **passed:** 2; the PostgreSQL harness
  was initially skipped until Docker/PostgreSQL became available.
- **Real PostgreSQL measurement:** after `task dev:db` reported the local
  PostgreSQL service healthy, the opt-in isolated harness ran with the local
  Compose connection and passed **1/1** in 1.27 seconds (test body: 428 ms).
  It created and dropped only its `wfs_hybrid_baseline_*` database. The report
  records result-path latency and total latency separately (they are equal in
  the current single service-boundary stopwatch), returned candidate count,
  top-5/top-20 IDs, serving path, and semantic-fallback status. Internal
  pre-fusion candidate timings/counts are not exposed by the current service;
  Task 3/4 owns their retrieval-level instrumentation.
- **Formatting and scope review:** `dotnet format
  src/RecipeApi.Tests/RecipeApi.Tests.csproj --no-restore --verify-no-changes
  --include` restricted to the three new Task 1 test files passed. `git diff
  --check` passed. `task agent:prepare` was not run: its current `task format`
  implementation formats the entire API and PWA trees, an unbounded write effect
  outside this test-only task. The reviewed task-local paths are the three new
  test files above plus this evidence update; no production, contract, schema,
  generated-client, flag, or deployment path changed.
- **Completion boundary:** Task 1 is complete. No Task 2 work has started.

## Agreed decision coverage

| Decision | Implemented by task |
| --- | --- |
| Publish lexical content before embedding; reject stale vectors | 2, 4 |
| Resumable initial backfill and recurring repair through dreaming | 2, 6 |
| Semantic cross-language relevance; no maintained bilingual dictionary | 1, 4 |
| Ingredient exclusions deferred | 5 |
| Keep public response compatible until atomic contract/client changes | 4, 5 |
| One initial request: one top pick plus 12 alternatives; append batches of 12 | 5 |
| Empty-query browse traverses the full eligible library without a total cap | 5 |
| Stable cards, detail-close scroll restoration, accessible loading/retry | 5 |
| 300-ms semantic budget; p95 targets 250-ms lexical and 600-ms hybrid/fallback | 4, 6 |
| Remove superseded code, registrations, prompts, flags and obsolete tests | 2–5 as callers migrate; 7 final verification |
| In-place database upgrade and backfill; no reset or recipe re-import | 2, 3, 6 |

## Planning evidence and limits

- Baseline recorded before this packet: `41241a6c5d68a26c80e5bd9926357642f56b5170`;
  `git status --short` and tracked diff were empty on 2026-09-15.
- This packet authorizes specification only. No product code, contract,
  migration, generated client, deployment, or feature-flag change has been
  made or is authorized by this task.
- The source-owned tag shape is unresolved (see requirements D5). Do not invent
  a persistent tag model or expose hard tag filtering if task 1 cannot verify it.

## 1. Establish the measurable baseline and fact vocabulary

**Requirements:** R1, R2-AC2, R5-AC2.

**Outcome:** A versioned evaluation corpus and a verified map from `Recipe` /
`RawMetadata` to canonical factual fields exist before retrieval behavior moves.

**Authorized files/effects:** New focused API PostgreSQL integration fixture and
evaluation helper under `api/src/RecipeApi.Tests/`; only test documentation or
CI-artifact definitions needed to publish the report. Read
`Recipe`, `SyncRecipeProcessor`, current search tests, OpenAPI, and importer
fixtures first.

**Checks:** Cases and judgments are versioned; report top-5/top-20, path,
candidate counts, timings, and fallback. Run targeted API tests with PostgreSQL.
Confirm exact normalized inputs and the actual tag source/absence using fixtures.
Document exact ingredient inclusion representation, dietary-profile projection,
and supported ISO/legacy duration parsing; unknown duration fails time caps.
Cross-language relevance is tested through embeddings without a maintained
bilingual alias dictionary. Ingredient exclusions are outside the fixture's
required supported behavior.

**Stop condition:** Stop before changing index/search code. If tags have no
reliable source, record the evidence, keep tags empty, and block only hard tag
filter exposure rather than guessing a storage schema.

## 2. Canonical document, sidecar lifecycle, and safe backfill

**Requirements:** R2, R6-AC1.

**Outcome:** One builder owns document text/metadata/fingerprint inputs; every
recipe has a pending sidecar before index work; stale/failed work preserves the
last usable state.

**Authorized files/effects:** `api/src/RecipeApi/Services/` builder, fingerprint,
index workflow, recipe create/update/import seams; search document model,
`RecipeDbContext`, schema/compatibility SQL for the agreed embedding state fields;
focused API tests, workflow YAML, telemetry. One owner must sequence all shared
search-index files.

Include `Workflows/dreaming.yaml`, a search-reconciliation child workflow and its
registered processor, the dreaming report integration, and delivery of revised
bundled workflow definitions to existing installations. Reuse the reconciliation
entry point for initial backfill and recurring repair; no separate scheduler.

**Checks:** Unit tests for deterministic bytes, normalizer, fingerprint
sensitivity, malformed optional metadata, and schema-version bump. Workflow
integration tests cover creation, update, stale queue, embedding failure/retry,
and no-sidecar prevention. Include first-index provider outage, lexical publication
before embedding completion, stale completion/failure races, and fingerprint/model
eligibility. Add SQL/model parity for independent embedding status/fingerprint.
PostgreSQL test verifies persisted text/JSONB/status;
backup/restore confirms rehydration behavior. Preview schema changes with
`task db:schema:push DRY_RUN=true`; inspect compatibility SQL separately.

Reconciliation tests cover missing sidecars, old-version ready rows, current
fingerprints, failed enqueue recovery, bounded pagination/resumption, and
overlapping run deduplication. With a controllable clock, verify dreaming dispatch,
failure reporting, and continued rescheduling during search-provider failure.
Verify initial lexical coverage independently of embedding coverage.
Verify clean-install and populated-database upgrade paths preserve recipe data;
backfill rebuilds derived search documents without recipe re-import or reset.

**Stop condition:** Do not run an existing-data migration or backfill without
approved environment/data scope. Do not remove legacy read paths until R3
lexical fallback evidence exists.

## 3. Bounded PostgreSQL lexical retrieval behind a flag

**Requirements:** R3, R4-AC2, R6-AC2.

**Outcome:** The service can retrieve a bounded lexical candidate set from the
canonical document with shared eligibility/predicates; legacy serving is retained
for comparison and rollback.

**Authorized files/effects:** `api/database/schema.sql`,
`api/database/compatibility.sql`, `RecipeDbContext`, search repository/service,
configuration and telemetry, PostgreSQL integration tests and runbook notes.

**Checks:** PostgreSQL extension/index migration tests; exact, partial, accented,
and short-query cases; no `ToListAsync()` over all eligible recipes on the new
path; candidate cap; filter parity; representative-scale `EXPLAIN (ANALYZE,
BUFFERS)` captured as evidence. Validate semantic-provider outage returns lexical
results. Run relevant API tests and static contract checks.

**Stop condition:** If the intended trigram index is not selected, tune/query
design against the corpus before enabling the flag. Do not use production index
creation or declare live-plan proof from in-memory tests.

## 4. Semantic top-K, bounded fusion, and deterministic reasons

**Requirements:** R4, R5-AC4, R6-AC1.

**Outcome:** Vector top-K and lexical top-K have the same prefilters and merge
into inspectable, configuration-driven ranks with graceful lexical degradation.

**Authorized files/effects:** Search repository/service, configuration,
telemetry, DTO reason mapping, related API integration/unit tests. Preserve
existing similar-search fallback unless its approved contract changes.

**Checks:** PostgreSQL tests prove ready-vector eligibility, top-K bound,
multilingual cases, deduplication, normalized component scoring, vector timeout,
provider exception, and no-embedding recipe lexical discovery. Evaluation report
meets R1/R4 thresholds. Verify raw query is absent from telemetry sinks.
Verify the 300-ms budget covers embedding plus vector retrieval and distinguish
budget exhaustion from caller cancellation. Caller cancellation must propagate;
semantic failure must return lexical results with timeout-inclusive timing.

**Stop condition:** Do not treat a new global similarity threshold as a fix
without evaluation evidence; do not expose score breakdown outside development /
admin diagnostics.
Keep public reason and result-path values compatible in this slice. New internal
classifications reach the public response only through task 5's atomic contract
and client changes.

## 5. Contract-first structured filters and agent compatibility

**Requirements:** R5 and R4-AC2.

**Outcome:** Clients can express hard facts and soft preferences through the
same backward-compatible endpoint; original query survives agent-originated
requests unchanged.

**Authorized files/effects:** `specs/openapi.yaml`; API DTO/controller/service
validation and bounded continuation state; generated PWA client and PWA API wrapper;
`pwa/src/app/(app)/recipes/page.tsx`, related unit/E2E tests and accessible loading/
retry copy; stateful mock builders and API/PWA contract tests.
Follow OpenAPI → tests → implementation → client
generation in one atomic slice.

**Checks:** Contract serialization and 400 validation tests; every D4 predicate;
empty browse; no query embedding for browse; preference cannot bypass cuisine
or time cap; unsupported exclusion-field rejection and no exclusion claims;
legacy query-only compatibility; reason enum parity in OpenAPI,
API, generated client, mocks, and wrapper. Run targeted API and PWA unit tests,
then `task gen:client:check` and applicable drift checks.

Verify one initial request returns one eligible top pick plus up to 12 alternatives;
explicit smaller limits still work and never count the top pick. Verify 12-item
continuation batches, stable order, no duplicates or repeated query embedding,
exhaustion, expiry, changed eligibility, and report-related top-pick suppression.
PWA tests cover append behavior, detail-close scroll preservation, failed-page
retry without losing cards, stale responses after query changes, accessible
recovery, and bounded animations/reduced motion. Document cursor storage limits,
expiry and API recovery errors before implementation.
Add database cursor pagination for empty-query browse, separate from ranked
candidate snapshots. Use `browse-all-stack/page.tsx` and the recipe list explore
ordering as reference; changes remain in the search flow and its API seam.
Test an eligible library larger than 100 recipes: with no query and no filters,
scrolling must traverse all pages without a fixed total cap, duplicate top pick,
or reordered visible cards. Repeat with filter-only browse; test true exhaustion,
concurrent edits/deletion, retries, detail-close position, and stale responses on
transition between browse and search. Each database request remains bounded.

**Stop condition:** If tags remain unverified after task 1, omit the tag filter
from this contract slice and raise the explicit dependency; do not ship a field
with invented semantics. Retire LLM query rewriting/reranking from the serving
path; a future conversational feature needs separate authorization.

## 6. Controlled rollout, operations, and default enablement

**Requirements:** R6 and all preceding acceptance criteria.

**Outcome:** Operators can compare, enable, observe, and independently roll
back search components; hybrid becomes default only on recorded evidence.

**Authorized files/effects:** Feature-flag/configuration documentation and
implementation, telemetry/dashboard/alert definitions, runbook, evaluation/load
artifacts, and synthetic probes. Production flag changes, migrations, and alerts
need their own deployment approval.

**Checks:** Shadow overlap and rank-delta report by query class; representative
load report against p95 targets; backfill coverage; synthetic lexical and hybrid
probes; rollback rehearsal. Classify every check passed, failed, blocked,
not-run, or not-applicable with environment identity.
Measure lexical-only p95 below 250 ms, hybrid p95 below 600 ms, and
semantic-failure fallback p95 below 600 ms as separate populations. Inject
semantic timeouts/provider errors and include their elapsed time in fallback
response measurements. Preserve the 300-ms combined semantic-attempt budget.

**Stop condition:** Do not enable general traffic until relevance, latency,
coverage, privacy review, rollback path, and on-call ownership are evidenced.
Failure of the embedding provider or vector SQL must leave an operating lexical
path before this task can complete.

## Dependency order

Tasks 1 → 2 → 3 → 4 → 5 → 6 → 7 are sequential because each establishes a shared
representation or contract for the next. Read-only review of the evaluation
corpus, OpenAPI delta, or migration safety may run alongside the named owner, but
no parallel writer may modify shared DTO, search, schema, or generated-client
files.

## 7. Remove superseded search code and close the rollout

**Requirements:** R7; R3-AC2 and R4-AC3 must still pass after deletion.

**Outcome:** The shipped solution contains only supported search paths and their
live dependencies. This task is mandatory for feature completion.

**Required context:** All three feature artifacts; callers of each retirement
candidate; `Program.cs`, `RecipeController`, `RecipeSearchService`,
`SearchIndexWorkflow`, `AgentSearchTranslationService`, associated tests and
configuration. Tasks 2–6 must also delete code immediately when it loses its
last useful caller; task 7 closes only deliberate rollout survivors.

**Authorized files/effects when selected for implementation:** Remove displaced
search code, DI entries, dead options/prompts, obsolete tests/mock branches, and
stale search documentation. Regenerate clients for approved contract changes;
never hand-edit generated output. No repository-wide cleanup or recipe-data
deletion is included.

**Checks:** Record each candidate as removed or retained with a concrete active
caller and reason. Search source, tests, DI, workflow/configuration strings and
client references; compiler success alone is insufficient. Run relevant API and
PWA tests, generated-contract checks where affected, and real PostgreSQL tests
proving lexical fallback, similar search, planner/pantry ranking, and bounded
retrieval after deletion. Follow repository preparation/completion checks.

**Stop condition:** Do not remove code while it still owns required behavior;
migrate that caller and its assertions first. Completion requires deletion of
legacy rollout code, a tested database lexical fallback, and documented compatible
release rollback. A disabled old path does not satisfy removal.

## Specification review — 2026-09-15

Status: F1–F6 resolved in the specification. Implementation and runtime acceptance
remain unexecuted; the separately recorded tag-source dependency still applies.

- **F1 — Resolved: publish searchable content first.** User selected option 1:
  canonical text/metadata/fingerprint commit before asynchronous embedding work;
  independent embedding readiness and matching fingerprints gate semantic use.
  Changed recipes temporarily use lexical retrieval. Requirements D2/R2-AC5,
  design indexing transitions, and task 2 checks now capture the decision.
- **F2 — Resolved: resumable reconciliation with ongoing repair via dreaming.**
  User selected option 1 and requested dreaming integration. Reconcile from
  eligible recipes, including missing sidecars and old-version ready documents,
  with current fingerprints, durable progress and duplicate-work protection.
  Dreaming dispatches background repair; normal mutation indexing remains prompt.
  The same workflow handles initial backfill before lexical cutover. Requirements
  R2-AC6, the design, and task 2 now include scheduling and recovery verification.
- **F3 — Resolved: ingredient exclusions deferred by user decision.** No hard or
  best-effort semantic exclusions ship in this feature, and no bilingual ingredient
  dictionary is required. Semantic retrieval supplies cross-language relevance;
  exact inclusion remains limited to documented normalized facts. Requirements
  and contract tests remove the shellfish guarantee and cover unsupported explicit
  exclusion fields. Duration parsing and dietary projection remain required
  representation work in task 1 before the corresponding filters are exposed;
  unknown durations fail time filters.
- **F4 — Resolved: retain public shape until the contract phase.** User selected
  option 1 for sequencing, then approved one initial response with one top pick
  plus 12 alternatives and subsequent batches of 12 as the user scrolls. Task 4
  keeps new classifications internal. Task 5 owns atomic contract/client/mock/UI
  updates, additive reason/path values, limit counting, continuation, stable
  scrolling and recovery. Existing report-related promotion suppression remains.
  Follow-up user decision: empty-query browse must scroll through the full eligible
  library, beyond ranked-search candidate limits. Requirements R5-AC5/9 and the
  design now separate database browse pagination from ranked continuation.
- **F5 — Resolved: separate latency targets.** User selected option 1: retain
  the 300-ms combined semantic budget, target lexical-only p95 below 250 ms and
  hybrid/semantic-failure fallback p95 below 600 ms. Measure each path separately
  and include the semantic attempt in fallback response time. Requirements R6,
  design timing policy and tasks 4/6 capture the targets and cancellation tests.
- **F6 — Medium, addressed: legacy code had no removal gate.** R7 and task 7 now
  require deletion and caller verification; design names initial candidates and
  defines database lexical retrieval as the supported permanent fallback.

Review baseline: existing untracked packet copied to
`/private/tmp/wfs-search-spec-review.o0fFqd/baseline` before this update. Only the
three spec artifacts were edited. Production symbols listed for retirement still
have live callers, so no application code was deleted in this specification turn.
