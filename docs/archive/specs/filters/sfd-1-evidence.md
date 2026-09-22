# SFD-1 reconciliation and red integration coverage

> **Archived — historical reference only.** Tasks, status, commands, and instructions below are historical, not an active work queue or current authority. See [archive guidance](../README.md).

Scope: SFD-1 only, requested 2026-09-19. No production search, Discovery,
contract, generated-client, or dormant-field implementation. SFD-2 and later
slices remain unexecuted.

## Starting state and branch reconciliation

- Branch `main`, HEAD and locally recorded `origin/main`:
  `31e5d4a718ab78575eaa72451545c12d1a0a2f59`.
- Local `search-fix` and `origin/search-fix`:
  `e2c6d0a7b60bb730ea41d0b49d07f87a57dae1d7`.
  `git merge-base --is-ancestor search-fix main` exits 0;
  `git log main..search-fix` is empty. Search services/repositories, DTOs,
  and OpenAPI have no diff between those branches. Existing work is already
  present; no checkout, merge, cherry-pick, or duplicate production work needed.
  These are local refs, not a claim that remotes were freshly fetched.
- Starting staged diff was empty. Unstaged change:
  `api/src/RestClient/07-workflow.rest`; untracked: the filters spec directory.
  Private content snapshot and binary diffs: `/tmp/wfs-sfd1-baseline`.
  The snapshot includes original untracked files, not merely filenames.

## Ordered trace and findings

1. `specs/openapi.yaml` publishes `filters.cuisines`, `filters.mealTypes`,
   and `preferences.concepts` as string arrays. The corresponding
   `RecipeSearchRequestDto`, `RecipeSearchFiltersDto`, and
   `RecipeSearchPreferencesDto` deserialize the same fields without a new shape.
   The current query description says empty means browse; SFD-2 must clarify
   the approved concept-only exception and fallback. No contract edit in SFD-1.
2. `api/src/RecipeApi/Controllers/RecipeController.cs`, POST search, forwards
   the DTO and cancellation token to `RecipeSearchService.SearchAsync`.
   It validates limits, rejects excluded ingredients, and maps expired or
   mismatched continuation state to HTTP 409 restart guidance.
3. `RecipeSearchService` trims the query into a local variable and does not
   rewrite caller Query. It applies readiness/deletion eligibility and
   `RecipeSearchPredicate.Apply` before browse or retrieval. AppliedFilters
   is returned but that echo does not establish enforcement.
4. `RecipeSearchPredicate.Apply` (EF) and `BuildSql` (PostgreSQL) contain
   existing boolean predicates, but neither applies CuisineType or MealTypes.
   Therefore OR within either selected group and AND across groups are missing
   in browse, lexical, semantic, and continuation eligibility.
5. `RecipeLexicalSearchRepository.SearchAsync` uses canonical ready documents,
   phrase/term ILIKE matches, word_similarity ordering and a bounded limit.
   `BuildSql` is inserted before LIMIT. Blank retrieval text is explicitly
   rejected. Cuisine and Meal Type need to enter that pre-limit predicate.
6. `RecipeSemanticSearchRepository.SearchAsync` uses current compatible ready
   vectors, fingerprint/model/version/dimension checks, cosine ordering and a
   candidate limit. It also inserts `BuildSql` before LIMIT. Existing boolean
   eligibility works; the two structured groups are missing here too.
7. Standard typed search retrieves lexically with the original trimmed query,
   embeds that same query, and merges candidates. Concepts never enter the
   embedding input or ranking. A shared 300 ms semantic budget and typed-query
   lexical fallback already exist, including caller cancellation propagation.
   Query plus concepts must influence semantic relevance without becoming an
   exact included-ingredient restriction or changing typed lexical retrieval.
8. Empty query unconditionally takes BrowseAsync before semantic retrieval.
   Thus concept-only semantic search, concept lexical fallback for disabled,
   missing, timed-out or failing semantics, and successful zero-match behavior
   are all missing. Empty input without usable concepts already browses.
9. `CreateContinuationFingerprint` hashes query, filters, preferences and search
   context; `RecipeSearchContinuationStore` checks fingerprint/expiry. This
   already invalidates tokens when concepts change. Ranked continuation
   rechecks eligibility against the EF query; browse uses the EF query and
   keyset position. Both inherit the missing Cuisine/Meal predicates. Ranked
   continuation reuses stored ranks without another embedding call.

The default-branch assumptions in the design are confirmed on this build
branch. Quick browse pagination and later rediscovery requirements remain
outside SFD-1. No other dormant DTO behavior is implemented or newly required
by these tests. Discovery production code and tests remain unchanged.

## Focused coverage

- `RecipeLexicalSearchPostgresTests.cs`: make the existing fixture partial,
  reusing its random per-test database, schema setup, vectors and cleanup.
- `RecipeLexicalSearchPostgresTests.Filters.cs`: six repository cases for
  Cuisine/Meal/both across lexical/vector retrieval, OR/AND semantics, null
  facts, complete eligibility and bounded candidate selection; typed concept
  ranking using deterministic vectors and a recipe without exact fish text;
  four concept-only fallback cases; successful semantic zero-match; semantic
  hard-group authority; browse/ranked continuation eligibility changes; and
  blank-concept browse plus preference fingerprint invalidation.
- `RecipeSearchIntegrationTests.cs`: three HTTP request/deserialization/service
  cases for typed Cuisine, typed Meal, and combined browse hard filters.
  These use the existing in-memory web factory and are not SQL evidence.
- This evidence file and the task-specific HANDOVER checkpoint document the
  reconciliation and stopping point. Original spec documents are preserved.

## Verification

Focused command (dedicated local disposable pgvector/pgvector:pg18 container,
loopback port 55439, no shared database or application process):

```sh
WFS_TEST_POSTGRES_CONNECTION='Host=127.0.0.1;Port=55439;Database=postgres;Username=postgres' \
  dotnet test api/src/RecipeApi.Tests/RecipeApi.Tests.csproj --no-restore \
  --filter 'FullyQualifiedName~RecipeLexicalSearchPostgresTests|FullyQualifiedName~RecipeSearchIntegrationTests' \
  --logger 'trx;LogFileName=sfd1-search.trx' --results-directory /tmp/wfs-sfd1-results
```

- Initial sandboxed attempt: build passed; test execution blocked by VSTest
  SocketException (13), local socket bind denied. No feature evidence from
  that aborted attempt. Retried with approved socket access.
- Executed run: 53 total, 35 passed, 18 expected missing-feature failures,
  zero skipped. All failures are assertions in the SFD-1 tests, not database,
  provider setup, compilation, or connection errors. Existing 34 cases pass;
  the new blank-concept/fingerprint regression also passes.
- Red breakdown: 6 repository hard-group cases; 3 HTTP hard-filter cases;
  1 typed concept ranking; 4 concept-only fallback; 1 semantic zero-match;
  1 concept-only semantic hard-filter case; 2 continuation eligibility cases.
- Deterministic embedding doubles establish service/vector integration, not
  live provider quality. PostgreSQL tests execute actual repository SQL.
- TRX: `/tmp/wfs-sfd1-results/sfd1-search.trx`; log:
  `/tmp/wfs-sfd1-tests.log`. Broad completion/preparation status follows below.

## Readiness and stop

SFD-2 is ready for contract/configuration definition using these reconciled
facts. It must clarify concept-only query semantics and define its own policy
before implementation. SFD-5 owns production fixes for the red tests; this is
not authorization to execute it. SFD-1 intentionally leaves red feature tests.
No claim of feature release readiness, performance improvement, or live model
qualification. No commit or deployment.

## Final broad checks and scope review

- `task agent:prepare`: failed (Task exit 201). `dotnet format` build host
  could not bind its named-pipe socket: SocketException (13), Permission
  denied; host exit 134. Infrastructure failure, not a formatting finding.
  No formatter changes occurred; PWA preparation was not reached.
- `task agent:finish`: failed (Task exit 201). Documentation/links/whitespace,
  PWA formatting, PWA typecheck and PWA unit commands passed. PWA unit output:
  510 passed, 4 skipped. .NET lint failed on the same build-host socket restriction.
- Finish's identity guard reported mutation after PWA unit tests and stopped.
  Impact/E2E, full API, and static contract checks are **not-run** in that gate.
  Harness tests, live endpoint parity and generic database-behavior checks were
  **not-applicable** to its selected application/documentation classes. The
  task-specific PostgreSQL evidence above remains separate and executed.
- The guard hashes runtime files including node_modules; it records no per-file
  mutation delta. The exact changed runtime input is unproven. A source review
  found no additional tracked/untracked source edits, and all three test-file
  SHA-256 hashes still match. Do not infer a successful immutable final gate.
  The final evidence append here is a later documentation change, not content
  covered by the earlier finish identity.
- Gate record: `.task/agent-finish/last-run.json`; initial tested identity:
  `73e0145a5637a2548404b86107338a4a8e42125fcf94051c40e92a01c6a169e7`.
  Logs: `/tmp/wfs-sfd1-prepare.log`, `/tmp/wfs-sfd1-finish.log`.
- Final scope review compared actual test/HANDOVER diffs and the new test and
  evidence files to `/tmp/wfs-sfd1-baseline`. Original REST patch, empty staged
  diff and every original untracked spec file match byte-for-byte. Only the
  five task files listed in Focused coverage changed; no production or Discovery
  changes, branch switch, stage, commit, or deployment. The disposable test
  container and volume were removed after the focused run.

Test-source SHA-256 identities (unchanged through final review):

```text
fed49cc216c885d1a5793429949a9393f12b8ef78389b4627e72108241d7d6ec  RecipeLexicalSearchPostgresTests.cs
d9e2119c43d5032b5347b9368246113941eb0c58ba13fef911b23427dc12ef40  RecipeLexicalSearchPostgresTests.Filters.cs
f565c230498986a640bf1aa856015c0b5f37434ea05e0865c5bad0a375371792  RecipeSearchIntegrationTests.cs
```

The PWA generated model (`pwa/src/lib/api/generated/models/index.ts`) also
contains these arrays and concept serialization; `pwa/src/lib/api/recipes.ts`
accepts filters/preferences and JSON-serializes the request intact. This is
static seam inspection, not a new PWA behavior qualification.
