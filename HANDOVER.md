# Active resume checkpoints

Load for resumption or active-state ambiguity via `task agent:status`. These
checkpoints are context, not authority. Follow the shared
[handoff procedure](.agents/core/execution-harness.md#evidence-and-meaningful-handoffs).


## Dietary separation Phase 1

Task/spec: User-directed simplification of the user-pasted `WFS Dietary Separation Migration — Phase 1: EXPAND`; no repository spec package exists.
Worktree/branch: `harness-upgrade`; baseline recorded at HEAD `8bf3503d4a0db028ead78d6c3da73540f77e2130` in ignored `.task/dietary-lifecycle-removal/baseline.md`.
Authorized scope and source: Remove vegetarian-classification lifecycle fields in favor of nullable `recipes.is_vegetarian`, while preserving confirmed data and the public boolean response.
Current checkpoint: Implemented nullable storage, one-time legacy-data conversion guarded by a schema-column comment, removed version/timestamp/failure persistence and writer service, simplified backfill/status/search/backup paths, and updated workflow/docs/tests. Unknown remains internal and maps to `false` at the API boundary.
Verification evidence and content identity: `dotnet build api/src/RecipeApi.Tests/RecipeApi.Tests.csproj --no-restore` passed with zero warnings; `git diff --check` passed; `task agent:reconcile` passed static route/mock reconciliation. `task agent:drift` static schema checks passed but live endpoint parity is blocked. `task agent:prepare` and `task review` are blocked by Kiota generation/check timing out in the restricted runner; focused `dotnet test` is blocked by test-host local socket permission; `task db:schema:push DRY_RUN=true` is blocked by Docker socket permission.
Blocker or next action: On a qualified local runner, complete Kiota generation/check, API tests, and standard database migration verification before running the single `task agent:finish` completion invocation. Review the schema comment guard after observing the sqldef dry-run.

## Find Similar deterministic scorer

Task/spec: User-directed IMPLEMENT slice for `POST /api/recipes/search` `similarToRecipeId` scoring; no spec package selected.
Worktree/branch: `harness-upgrade`; baseline HEAD `9c6743b5f86249c7b4ba88ef948d723a9d114f06` recorded in ignored `.task/find-similar-scorer/baseline.md` before edits.
Authorized scope and source: Pure API service-layer recipe-to-recipe scorer and focused unit tests only; no `RecipeSearchService` integration, contract/client, PWA, indexing, persistence, or workflow changes.
Current checkpoint: Added `RecipeSimilarityScorer`, explicit input/result/immutable weight models, and canonical safe ingredient parsing reuse. The scorer is intentionally not yet integrated into `RecipeSearchService`.
Verification evidence and content identity: `dotnet test api/src/RecipeApi.Tests/RecipeApi.Tests.csproj --filter FullyQualifiedName~RecipeSimilarityScorerTests --no-restore` passed 13/13 on 2026-09-26 after the local test host was permitted to bind its socket; `git diff --check` passed. Task content is the baseline HEAD plus this HANDOVER section, `RecipeSimilarityScorer.cs`, `RecipeSimilarityScorerTests.cs`, and the helper visibility-only extraction in `RecipeSearchDocumentBuilder.cs`.
Blocker or next action: Wire the scorer into retrieval/ranking only under separately authorized work; preserve its current pure, deterministic boundary.

## Find Similar scorer integration (Phase 4)

Task/spec: User-directed IMPLEMENT integration for existing `RecipeSimilarityScorer` in `POST /api/recipes/search` only when `similarToRecipeId` is supplied; no OpenAPI, generated-client, PWA, indexing, or schema changes authorized.
Worktree/branch: `harness-upgrade`; integration baseline recorded in ignored `.task/find-similar-integration/baseline.md` at HEAD `9c6743b5f86249c7b4ba88ef948d723a9d114f06`. The scorer, its unit tests, `RecipeSearchDocumentBuilder.cs`, and the prior HANDOVER section predate this slice and are not attributed to it.
Authorized scope and source: Load one eligible source recipe/document, use only its compatible embedding for bounded semantic candidates, apply filters/source exclusion before both bounded retrievals, score the filtered batch structurally, and preserve Similar response/continuation behavior. Similar suppresses family/pantry reranking but retains planner demotion for a full planner context.
Current checkpoint: Added Similar integration in `RecipeSearchService`, lexical SQL exclusion support, a virtual semantic repository seam for failure coverage, in-memory service regressions, and PostgreSQL-gated Similar retrieval coverage in `RecipeLexicalSearchPostgresTests.Similar.cs`. Existing normal family and pantry paths are deliberately unchanged.
Verification evidence and content identity: `dotnet build api/src/RecipeApi.Tests/RecipeApi.Tests.csproj --no-restore` passed after integration. Focused `dotnet test ... --filter 'FullyQualifiedName~FindSimilar|FullyQualifiedName~RecipeSimilarityScorerTests' --no-restore` passed 16, skipped 6 PostgreSQL tests because `WFS_TEST_POSTGRES_CONNECTION` is not configured. A second focused API invocation was blocked before execution by the restricted runner's test-host socket permission. `git diff --check` passed before the HANDOVER update; rerun it after this documentation change.
Phase 4 verification checklist: On a qualified runner, set `WFS_TEST_POSTGRES_CONNECTION` and run `dotnet test api/src/RecipeApi.Tests/RecipeApi.Tests.csproj --filter FullyQualifiedName~FindSimilar --no-restore`; run the focused normal-family/pantry regressions, then `git diff --check`. Do not run `task agent:prepare` or `task agent:finish` until separately directed.

## Find Similar verify/finish

Task/spec: User-directed VERIFY / FINISH for the implemented `similarToRecipeId` redesign; no spec package selected.
Worktree/branch: `harness-upgrade`; verification baseline at HEAD `9c6743b5f86249c7b4ba88ef948d723a9d114f06` in ignored `.task/find-similar-verify-finish-baseline.md`, with prior integration ownership preserved through `.task/find-similar-integration/baseline.md`.
Authorized scope and source: Verify existing Similar behavior, extend the existing hybrid baseline with bounded pairwise/top-N evaluation, and correct only the two current search-flow documents. No endpoint, client, schema, indexing, or PWA redesign.
Current checkpoint: Added three deterministic fixture-backed Similar evaluation cases (including English/French salmon and chicken), a focused scorer evaluation test, and current flow documentation that distinguishes bounded semantic candidate generation from structured final ranking and lexical fallback. Existing implementation files remain attributed to Phase 4.
Verification evidence and content identity: Focused scorer/evaluation tests passed 17/17; in-memory Similar service integration tests passed 3/3; existing PWA Find Similar request/Top Pick E2E passed 1/1; `git diff --check` passed. PostgreSQL Similar tests were skipped because `WFS_TEST_POSTGRES_CONNECTION` is unset and are blocked, not passed. `task agent:prepare` was invoked once after Taskfile/script inspection; it reached `task format:api` but did not complete in this runner. The single `task agent:finish` invocation recorded documentation, PWA format, typecheck, and 525 PWA unit tests as passed; lint, impact E2E, and API test commands failed on runner socket/pipe permissions, while Kiota contract generation was blocked by timeout. Its record is `.task/agent-finish/last-run.json` (tested identity `90ad47366ba53f404a16ab1505c9f3be49d9e2c0c97ff9e0a47a6b12367bc68a`); this checkpoint wording was updated after that failed completion attempt.
Blocker or next action: On a qualified runner, set `WFS_TEST_POSTGRES_CONNECTION`, then run the PostgreSQL Similar suite and the standard completion workflow in a newly authorized task; do not reuse this failed completion record as final qualification.
