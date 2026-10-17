# Recipe search baseline plan

## Current capability ownership after domain split — 2026-10-16

Use the current owners below for this former combined capability. All dated extraction records, source digests, BSL/U/A identifiers and qualification limits below remain historical evidence. Requirements and ordered scenarios were relocated unchanged; no runtime qualification is inferred. Earlier meal-planning navigation remains applicable.

| Current capability | Requirements / scenarios |
|---|---:|
| [recipe-search](../../openspec/specs/recipe-search/spec.md) | 39 / 90 |
| [search-indexing](../../openspec/specs/search-indexing/spec.md) | 10 / 19 |
| [data-backup-and-recovery](../../openspec/specs/data-backup-and-recovery/spec.md) | 24 / 58 |
| [scheduled-maintenance](../../openspec/specs/scheduled-maintenance/spec.md) | 5 / 14 |

The complete cross-source block identities and ownership map are recorded in the [archived split ownership map](../../openspec/changes/archive/2026-10-16-split-remaining-broad-capabilities/design.md). The existing source evidence below is preserved, including any older combined-capability counts and exclusions.

## Current planning ownership — 2026-10-16

The combined meal-planning spec has been split by responsibility. Use these current requirement owners; earlier extraction references to the combined owner, source identities and evidence below remain historical. Qualification limits are unchanged.

- [Read the explicit Search target before assignment](../../openspec/specs/meal-assignment/spec.md#requirement-read-the-explicit-search-target-before-assignment)
- [Preserve caller-specific Search and Browse recovery routes](../../openspec/specs/meal-assignment/spec.md#requirement-preserve-caller-specific-search-and-browse-recovery-routes)
- [Assign first-open placement through the shared assignment operation](../../openspec/specs/meal-assignment/spec.md#requirement-assign-first-open-placement-through-the-shared-assignment-operation)
- [Compose voting suggestions separately from persisted assignments](../../openspec/specs/meal-planning/spec.md#requirement-compose-voting-suggestions-separately-from-persisted-assignments)
- [Keep relative operations anchored to their intended calendar week](../../openspec/specs/deployment-calendar/spec.md#requirement-keep-relative-operations-anchored-to-their-intended-calendar-week)

## Current lifecycle checkpoint — consolidated, 2026-10-16

This capability's main spec now contains **47 requirements / 105 scenarios**.
All baseline source changes were archived after the user's explicit approval;
there is no active baseline extraction/promotion queue. Historical checkpoint,
next-session and "changes active" text below records earlier sessions only.
Evidence limitations and unresolved findings remain in the [live backlog](backlog/README.md).
See [consolidation completion](backlog/consolidation-completion.md) for accepted
scope, preserved corrections, archive warnings and verification. Archival does not
establish application correctness, runtime qualification or resolution of defects.

## SR-R01 — bounded PostgreSQL test repair, 2026-10-16

The user authorized repair of two reproduced search tests, without commit,
deployment, spec synchronization or archival. This section tracks that correction;
it does not absorb related backlog items or change serving/ranking policy. Entry
HEAD was `e41e1c6b9a41c6f77c6d9eaefd68c48f930b4461` on
`moving-to-openspec`, with a clean index/worktree. Historical baseline results and
source hashes below describe their original snapshots, not these later test edits.

- **Baseline cause/correction:** the relational harness omitted the required
  lexical repository. Register both real PostgreSQL retrieval repositories and
  publish compatible ready fixture embeddings with matching model, version and
  fingerprint. Lexical-only wiring still failed the existing cross-language
  relevance assertion. Retain all seven top-five relevance cases and timing
  assertions; additionally require the hybrid path. Synthetic `fixture-v1`
  embeddings qualify fixture behavior only, not external model relevance.
- **Similar cause/correction:** all four candidates have equal structured scores.
  Serving sorts score descending, creation time descending, then ID ascending;
  insertion order is not a ranking rule. The shared `ResultIds` helper also
  appends Top Pick after alternatives. The corrected test explicitly checks Top
  Pick and its alternate, uses controlled creation times plus an ID tie, and
  asserts all four IDs in their exact initial order through two continuations.
  Changing a remaining candidate's creation time after the first page must not
  rerank the snapshot. Source exclusion, uniqueness, lexical reasons and equal
  scores remain asserted. Rename the test to
  `FindSimilar_UnavailableSemanticRetrievalFallsBackWithStableContinuations`;
  the former zero-contribution name made a claim it did not test. SR-U02 remains
  unresolved: the common semantic offset does not explain this ordering failure.
- **Scope:** only the two test files and this evidence document changed. No
  production code, contract, SQL, main spec or corrective ranking policy changed.
  A production red/green cycle is not applicable to this fixture/expectation
  correction; both original failures were observed before edits.
- **Real PostgreSQL evidence:** a new labelled disposable container,
  `wfs-search-repair-20261016`, used `pgvector/pgvector:pg18-trixie`, loopback
  port `52363`, admin database `postgres`, and the fixtures' isolated
  create/schema/drop databases. The existing `wfs-search-check` container was
  left untouched. With `WFS_TEST_POSTGRES_CONNECTION` set to the new container,
  `task test:api -- --filter '<filter>' --logger 'console;verbosity=detailed'`
  produced these results:

  | Check / filter | Result | Local log |
  | --- | --- | --- |
  | `FullyQualifiedName~BaselineHarness_RecordsVersionedRelevanceMeasurements\|FullyQualifiedName~FindSimilar_UnavailableSemanticRetrievalFallsBackWithZeroSemanticContributionAndStableContinuations` | Failed 2/2 before edits: missing repository; incorrect first ID | `/tmp/wfs-search-repair-red.log` |
  | `FullyQualifiedName~BaselineHarness_RecordsVersionedRelevanceMeasurements\|FullyQualifiedName~FindSimilar_UnavailableSemanticRetrievalFallsBackWithStableContinuations` | Passed 2/2 after correction; no skips | `/tmp/wfs-search-repair-green.log` |
  | `FullyQualifiedName~HybridRecipeSearchBaselinePostgresTests\|FullyQualifiedName~RecipeLexicalSearchPostgresTests\|FullyQualifiedName~RecipeSearchFilterMaterializerPostgresTests` | Passed 32/32; no skips | `/tmp/wfs-search-repair-suites.log` |

Preparation and final repository verification use the complete three-path scope
above. Their durable `record_path` and check statuses are reported by the final
verifier, separately from this task-specific database acceptance. External model,
live HTTP and real browser qualification are not run by these database suites.

## Current checkpoint and scope

**SR-P01 (2026-10-16):** the user's “promote” accepts the five reviewed,
source-supported recipe-search deltas and authorizes their documentation-only
promotion into [the main recipe-search spec](../../openspec/specs/recipe-search/spec.md).
All **39 requirements / 90 scenarios** are promoted with unchanged requirement
and scenario wording. U04/U09/U80/U82, SR-U01–U10 and SR-X01–X04 remain explicit
limitations/exclusions; acceptance does not adopt defects as desired behavior.
Final promotion validation is recorded below. Changes remain active, unarchived;
runtime qualification remains not-run/deferred under A34.

SR-P01 supersedes the pending-review/promotion labels in historical SR-D01/SR-D05
generation and verification records below. It authorizes no application changes,
successor extraction, staging, commit, publication, deployment or archival.

### Historical generation authorization

SR-D01 (2026-10-16): the user authorized discovery, evidence reconciliation and
all documentation-only ordinary-household recipe-search draft successors, using
the approved capability structure and shared ownership. Five sequential slices
are drafted for human review. **Acceptance and main-spec promotion are pending;
this capability is not baseline-complete.** No runtime/database qualification,
application repair, archival, staging, commit, publication or deployment is authorized.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md). No full history
or unrelated capability-plan loading is needed. Current user authorization
supersedes this plan's historical A84 not-started/review-only checkpoint.

**Phase-12 reconciliation R12 (2026-10-16):** Recorded promoted documentation remains 39 requirements / 90 scenarios; no additional supported extraction gap was found within this plan's explicit boundary.
[Cross-capability review](reconciliation.md) records current inventory, shared-owner
reconciliation, evidence drift and exclusions. Current main SHA-256: `1ff3f41cb400af98d4631c853a75c452a2dd9cc77fe53a6910ecddac592438f2`.
This session grants no new acceptance or promotion. Earlier session-specific
“current user” and next-action statements retain their historical scope. A34 and
all local unresolved/excluded behavior remain in force; runtime checks are not-run.


## Initial generation identity and preservation (historical SR-D01 record)

- Session: 2026-10-16; branch `moving-to-openspec`; HEAD
  `04a1c4570f9bbb01b47436790d4248635ac3179a`.
- OpenSpec CLI resolved nearest root and planning home to
  `/Users/alex/Code/whats-for-supper`, repo store `openspec/changes`, configured
  `spec-driven` schema. No initialization or reconfiguration. No existing search
  change or main search spec existed at discovery. CLI created each change.
- Proposal → specs/design → tasks dependency instructions were resolved for each
  slice. Reconciliation designs are substantive because of cross-layer policy,
  ownership and compatibility ambiguity; no empty optional artifacts were added.
- Search source, tests, contract and generated client were clean against HEAD.
  Relevant pre-existing staged inputs included `Taskfile.yml`, accepted owner specs
  `openspec/specs/{recipe-library,recipe-discovery,recipe-quality,meal-planning,household-live-updates}/spec.md`
  and their capability plans. `recipe-quality` main spec/plan also had unstaged
  edits; the baseline index had staged and unstaged edits. Existing cooking,
  grocery and member-preference drafts and many other staged drafts are unrelated.
- A before-image captured 235 pre-existing dirty file identities and the complete
  staged binary diff outside the repository. Concurrent work changed `Taskfile.yml`, execution-harness guidance, grocery/member-preference/sharing drafts and the grocery/sharing index rows, and added further unrelated artifacts after the initial snapshot; none are task edits. Only this plan, the five selected
  search changes and the single search summary row in the index are task-owned.
  This task changes only the Search row; observed concurrent grocery/sharing index edits are left intact. No tracked deletion appeared
  in the observed initial status; any previously deleted navigation work is not
  restored or edited. Git status alone does not establish task ownership.
- Current evidence content hashes appear below. `Taskfile.yml` was re-read after its independent unstaged change; current `verify` remains the explicit-path documentation harness. The staged binary diff is unchanged by this task. Shared accepted owners are read
  as they exist in this dirty worktree; no claim that they equal committed HEAD.

## Recorded decisions

| ID | Decision / boundary |
| --- | --- |
| SR-D01 | User authorization covers all bounded ordinary-household recipe-search draft successors; do not stop at first slice. Stop at validated drafts, before acceptance/promotion. |
| SR-D02 | Reuse approved flat `recipe-search` path across five additive changes with unique requirement titles. No new capability split or dependency requirement is invented. |
| SR-D03 | Implementation-supported claims can be drafted under A10/A34; inspected assertions are references, not passed tests. Keep inferred, incomplete and disputed behavior non-normative under A12. |
| SR-D04 | U04/U09/U80/U82 and source/contract/test disagreements are reconciled below. Withhold disputed claims; no defect is silently repaired or adopted as desired behavior. No unresolved choice blocks independent settled slices. |

## Ten discovery fields — reconciled resume (SR-D05, 2026-10-16)

| Discovery field | Reconciled finding and evidence |
| --- | --- |
| Name | `recipe-search`, the approved flat capability; five existing additive draft slices, not five new capabilities. |
| Business purpose | Help an ordinary household member find an existing recipe, inspect its detail and hand off a chosen recipe to the accepted planning journey. Search, Top Pick and Surprise Me do not themselves assign or establish consensus. |
| Existing capabilities | Search entry/results/detail return (BSL-001–004); filter drafts, combinations, reset, mounted state and vocabulary (BSL-005–008/013); browse, lexical, semantic, combined and Similar retrieval (BSL-009–012); ranking/promotion/reasons/Surprise Me (BSL-014–017); continuation, expiry, stale success suppression and received freshness signals (BSL-018–022). Short BSL numbers in this table mean `BSL-recipe-search-<number>`. |
| Important workflows | Navigation or planner/deep-link entry → initial browse; typing/Enter → ranked search; Filters → draft Apply/dismiss/reset; card → detail → close or successful-deletion refresh; Find similar → source-based retrieval; sentinel → append or retry/restart; received promotion invalidation → withhold old cards and attempt browse refresh. Every named scenario is mapped below. |
| Business rules | Server owns readiness/deletion predicates, hard-filter combination, candidate retrieval/fusion, family modifiers, affinity/recency/calendar eligibility, report-related promotion exclusion and continuation rechecks. Browser retains mounted selections, consumes eligibility and swaps only eligible loaded alternatives. Immediate owner requirements below remain authoritative for shared facts and side effects. |
| Source files | Ordered per-BSL traces and the SHA-256 input table below identify UI/state, raw POST adapter or generated vocabulary client, approved OpenAPI, controller/service, PostgreSQL documents/recipe facts/materialized snapshots and immediate indexing boundary. No production source edits. |
| Tests | Actual assertions and substitutions inspected in the listed page, API, PostgreSQL, filter/materializer, index and browser suites. InMemory retrieval, fixed embedding providers and fulfilled browser HTTP are distinguished from production seams. No application suite was executed; a test name or checked task does not establish behavior verification. |
| Dependencies | Accepted recipe-library, recipe-quality, recipe-discovery, meal-planning, household-live-updates and household-identity requirements, plus optional semantic provider/configuration and asynchronously maintained search documents/affinity vocabulary. Search does not take ownership of assignment, report lifecycle, consensus, SSE delivery or workflow retry policy. |
| Uncertainties | U04/U09/U80/U82 retained; SR-U01–U10 and SR-X01–X04 below preserve enum drift, unused fields, path-specific Quick predicates, incomplete error/recovery/freshness integrations and deferred variants/operator work. No disputed assertion requires a decision to complete the settled drafts. |
| Confidence | Implementation-supported: high for aligned entry/filter/ranking paths with meaningful inspected assertions; medium where snapshots, factory substitutions, configuration or incomplete seams qualify the outcome. No runtime-observed behavior claim; runtime qualification remains not-run/deferred under A34. |

### Resume authorization, identity and preservation

- The current request authorizes discovery, reconciliation, drafting and validation
  through all five named existing slices, without approval between slices. Reuse
  sound artifacts; stop at review readiness, before acceptance or promotion.
- Resume branch `moving-to-openspec`, HEAD
  `04a1c4570f9bbb01b47436790d4248635ac3179a`. Unlike the historical initial
  generation record, all five changes already existed at this session's entry.
  CLI context/list/status resolved the nearest repository root, repo planning
  home and `spec-driven` schema; the registered store list was empty. All four
  artifact instructions were resolved for each change. No scaffolding or duplicate
  change was created; no configuration was changed.
- Before edits, captured full staged/unstaged binary diffs, per-file SHA-256
  identities and all 27 selected before-images outside the repository. Initial
  status contained 196 staged paths, 12 unstaged paths, 124 untracked files and no
  tracked deletions (overlapping staged/unstaged paths counted in both groups).
  Full path inventories, diffs and before-images are retained in
  `/var/folders/7x/450tvgfj1lg2gx9p89txzx0w0000gn/T/recipe-search-resume-7xty4_31/`.
  Relevant dirty
  inputs include the existing search plan/drafts, index, accepted owner specs,
  `Taskfile.yml` and execution-harness guidance. Search application source,
  tests, OpenAPI, generated client and SQL have not changed in this resume.
- Concurrent edits to this plan corrected `(app)` links, counts and verification
  bookkeeping after the snapshot. They are preserved as existing work, with a
  second before-image captured before this reconciliation. Historical command
  results below describe their own identities; this resume performs fresh checks.
- Stale A84 “not started” text is historical provenance, superseded by the actual
  five drafts and this authorization. Discovery is reconciled; human review is
  pending; the main search spec remains absent; runtime evidence is not-run.

## Coverage and draft lifecycle map

Each mapped requirement and **all named scenarios** are listed with its evidence
entry below. All slices are documentation extraction, not application work.

| Order | Journey / coverage | Promoted source delta (still active) | Requirements / scenarios | Disposition |
| --- | --- | --- | --- | --- |
| 1 | Entry/nav, initial read, text submission, loading/cards, successful empty, detail close/deletion return | [baseline-recipe-search-entry-results](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-entry-results) | 6/13 | Accepted/promoted SR-P01; validation recorded below |
| 2 | Implemented filter groups, combinations, drafts/reset, mounted state and vocabulary/config fallback | [baseline-recipe-search-filters-state](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-filters-state) | 10/22 | Accepted/promoted SR-P01; validation recorded below |
| 3 | Browse/text/hybrid/concept-only/Similar, compatible index availability, cancellation and lexical fallback | [baseline-recipe-search-retrieval-modes](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-retrieval-modes) | 9/20 | Accepted/promoted SR-P01; validation recorded below |
| 4 | Mode-specific ranking/reasons, calendar demotion, reports, server promotion and local Surprise Me | [baseline-recipe-search-ranking-promotion](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-ranking-promotion) | 6/17 | Accepted/promoted SR-P01; validation recorded below |
| 5 | Limits, sentinel/batches, expiry/recovery, stale response guards and received invalidation | [baseline-recipe-search-continuation-freshness](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-continuation-freshness) | 8/18 | Accepted/promoted SR-P01; validation recorded below |

Total: **39 requirements / 90 scenarios**, accepted and promoted under SR-P01. Every selected change retains CLI metadata, proposal, reconciliation design, one `specs/recipe-search/spec.md` delta and documentation tasks. The main `openspec/specs/recipe-search/spec.md` contains their single combined Requirements section.

### Shared owners and immediate journey boundaries

- [Recipe library](../../openspec/specs/recipe-library/spec.md): Retrieve the selected library recipe for detail reading; Dismiss recipe detail back to the loaded library; relevant detail-save/rating/notes/discoverability requirements; Soft-delete the loaded recipe when not assigned to active planner slots; Exclude soft-deleted recipes from standard library listings and search; Mark search-derived recipe state pending with supported updates; Attempt one index dispatch after saving a supported recipe update. Search adds its local caller/return consequences only.
- [Recipe quality](../../openspec/specs/recipe-quality/spec.md): Discover and apply recipe review filters; Select saved issue membership for review; Present review matches as ordinary results; Display returned issue indicators; Apply successful resolution to the open detail; Reflect persisted resolution in subsequent successful reads. Search owns general retrieval, other constraints and promotion consequences, not report lifecycle.
- [Recipe discovery](../../openspec/specs/recipe-discovery/spec.md): Count likes separately from passes; Calculate consensus from all stored members; Return consensus candidates as suggestions without assignment. A match count, Search Top Pick and Surprise Me selection establish none of consensus, suggestion acceptance, persisted assignment or lock.
- [Meal planning](../../openspec/specs/meal-planning/spec.md): Read the explicit Search target before assignment; Submit chosen-recipe assignment through the protected operation; Preserve caller-specific Search and Browse recovery routes; Assign first-open placement through the shared assignment operation; Compose voting suggestions separately from persisted assignments. Search detail Cook tonight/targeted use/Plan for later delegate to these existing requirements; no second assignment or calendar policy is drafted.
- [Household live updates](../../openspec/specs/household-live-updates/spec.md): Signal candidate freshness separately from fetching results and existing received slot/week dispatch requirements. Search owns its observed version response; delivery/reconnect/replay remain shared-owner boundaries.
- Existing household access/member transport remains household-identity ownership. Search raw POST forwards selected identity/SSE headers through the adapter; this extraction invents no per-search member-existence or household-isolation rule.

## Discrepancies, exclusions and withheld guarantees

All below are static observations/limitations. Withholding a guarantee does not
make the observed defect a normative requirement or authorize its repair.

| ID | Reconciliation / evidence | Draft treatment or remaining boundary |
| --- | --- | --- |
| U04 | SQL `vw_recipe_matches` counts likes; discovery calculates consensus; smart defaults are suggestions; server Search planner demotion reads persisted calendar content. Browser composed pending suggestions and persisted assignments differ. BSL-015. | Existing discovery/planning owners retained. No consensus/assignment/lock inferred from Search ranking, match, swap or navigation; no atomic promotion+lock/global vote-clear guarantee. |
| U09 | `RecipeController.GetRecommendations` is fixed development data; `SettingsService.SynthesizeRecipeAsync` returns a placeholder, while `RecipeService.DescribeRecipe` persists a recipe and dispatches goto-synthesis. Actual description import remains capture. | Excluded: no positive recommendation/synthesis capability derived from placeholders. Search uses POST search, not fixed recommendations. |
| U80 | Actual Reported/Ready to review controls use the shared responsive chooser, active drafts and ready-subset precedence. BSL-005/007/016. | Reconciled with accepted recipe-quality requirements; no Needs review route or separate desktop review view. |
| U82 | Detail resolution changes local recipe; only successful deletion invokes parent refresh; close restores scroll. BSL-004/016/022. | Reconciled with recipe-quality later-read requirement. Immediate loaded-card badge/membership refresh and continuation freshness withheld. |
| SR-U01 | `SearchAsync` emits resultPath `semantic-only` and `similar`; approved enum omits both. Similar lexical reason emits `lexical-match`, absent approved reason enum. BSL-010/011/012. | Contract mismatch remains unresolved; describe settled outcomes without adopting those enum additions. Do not edit contract/generated output or promise strict live parity. |
| SR-U02 | Similar lexical fallback passes raw semantic 0, but scorer normalizes it to .5 (weighted .20). Original docs/test name said zero contribution; tests did not assert zero component. SR-R01 removes that unsupported test name, without changing the scorer. BSL-012. | Withhold zero semantic contribution; structured ranking and fallback remain supported. No score repair. |
| SR-U03 | DTO/contract fields includedIngredients, categories, maximumTotalMinutes, preferences.ingredients/cuisines have no executing serving predicate/modifier. ExcludedIngredients nonempty explicitly400. BSL-006/007/018. | Unused fields missing/incomplete; no normative filtering/preference claims. Broader agent/API-only inputs deferred, not promoted from schemas. |
| SR-U04 | Quick browse regex and ranked indexed minutes use different representations; ranked continuation LINQ has no Quick check; indexed duration can lag. BSL-007/020. | Initial Quick behavior drafted with supported-duration boundary. Uniform parsing and current Quick revalidation on ranked continuation withheld. |
| SR-U05 | Initial/replacement failures are logged then represented as empty search; no distinct initial error/retry state. BSL-003/021. | Missing/incomplete error journey; normative empty scenarios require successful responses. Do not adopt hidden errors as desired behavior. |
| SR-U06 | Ranked continuation clones old DTOs without IsPromotionEligible and does not update scores/reasons/report status. BSL-020. | Limited current LINQ eligibility only; no fresh report/promotion metadata or reranking guarantee. Missing eligibility defaults false in adapter, so no ineligible fallback promotion. |
| SR-U07 | Browse recomputes ranking then searches anchor ID; if absent it can end. Second successor cursor omits selected WeekOffset. BSL-020. | Withhold stable full mutable-catalog traversal, selected-week continuity and full freshness. No cursor repair. |
| SR-U08 | Only browse has automatic version refresh; non-browse can remain withheld/loading after invalidation. Obsolete failures check generation, not always promotion version. No browser AbortController; timers not uniformly canceled across filter/similar/unmount actions. BSL-002/021/022. | Missing/incomplete general recovery; claim only observed success suppression and browse refresh attempt. Withhold universal cancellation, race freedom, failure immunity or immediate loaded-result freshness. |
| SR-U09 | Older flow docs say max5, clamp rather than controller rejection, bounded browse DB work, hybrid implies vectors contributed, and special notes boosts. Current source differs. BSL-009/010/015/018. | Current source/contract-backed outcomes drafted; docs not edited outside authorized files. No guaranteed semantic quality, synonym/fuzzy/translation quality, scaling or latency promise. |
| SR-U10 | Materialized affinity/cuisine state and search documents update separately; Search never refreshes them synchronously; metadata fetch once per mount. BSL-013/014/022. | Snapshot/config fallback drafted; immediate materialization/index completion and request-time cuisine discovery withheld. Full maintenance/backfill/index/backup workflows separately scoped operator/API-only work deferred. |
| SR-X01 | Demo, preview and Synology-specific variants. | Explicitly deferred by current authorization; no alternate runtime qualification. |
| SR-X02 | General discovery recommendation queues, cooking execution, recipe editing/report persistence, schedule mutation/recovery. | Accounted for by actual accepted owner requirements above; Search caller consequences drafted, no duplicated policies. |
| SR-X03 | External API/agent-only workflows, management backfill, telemetry operations, search-index backup/restore and load/relevance benchmarking. | Explicitly deferred as separately scoped workflows; inspect only immediate read/config boundaries needed here. |
| SR-X04 | All live API, browser/device, PostgreSQL, network/SSE and external model checks. | Not run under A34 and current instruction. Application tests not required for these documentation-only edits. |

No consequential unresolved decision is silently settled. For disputed semantics,
the next review can decide **one issue at a time**; these withheld claims do not
block the settled ordinary-household draft set.

## Evidence standard and test substitutions

Every BSL entry below is **implementation-supported**, not behavior-verified by
this session. Source/contract reading and actual assertion inspection support
confidence, not runtime acceptance. Inferred intent (for example natural-language
quality) is excluded; ignored fields and disconnected recovery are explicitly
missing/incomplete. Passed documentation validation only checks artifacts.

The common executable search chain is `RecipesPage` local state → `searchRecipes`
raw POST adapter → approved `POST /api/recipes/search` request/response →
`RecipeController.Search` → `RecipeSearchService.SearchAsync` → the per-entry
recipe/document/snapshot repositories or continuation store. Vocabulary instead
uses the generated GET search/filters builder → approved GET operation →
`GetSearchFilters` → saved singleton state. Pure chooser and local Surprise Me
actions do not reach a server until Apply or a later search. These shared chain
segments apply to the narrower BSL traces below; the generated POST builder is
present but is not the executing browser POST transport.

Test references use these concrete repository files (short names in entries mean
these paths). No tests below were executed for this extraction:

- [pwa/src/app/(app)/recipes/page.test.tsx][search-page-tests]
- [pwa/e2e/recipes.spec.ts](../../pwa/e2e/recipes.spec.ts)
- [pwa/e2e/search-hardening.spec.ts](../../pwa/e2e/search-hardening.spec.ts)
- [pwa/e2e/fixtures.ts](../../pwa/e2e/fixtures.ts)
- [pwa/src/hooks/useScheduleStream.test.ts](../../pwa/src/hooks/useScheduleStream.test.ts)
- [pwa/src/lib/api/search-contract.test.ts](../../pwa/src/lib/api/search-contract.test.ts)
- [api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs](../../api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs)
- [api/src/RecipeApi.Tests/Integration/RecipeSearchIntegrationTests.cs](../../api/src/RecipeApi.Tests/Integration/RecipeSearchIntegrationTests.cs)
- [api/src/RecipeApi.Tests/Integration/HybridSearchTests.cs](../../api/src/RecipeApi.Tests/Integration/HybridSearchTests.cs)
- [api/src/RecipeApi.Tests/Integration/HybridRecipeSearchBaselinePostgresTests.cs](../../api/src/RecipeApi.Tests/Integration/HybridRecipeSearchBaselinePostgresTests.cs)
- [api/src/RecipeApi.Tests/Integration/Fixtures/HybridRecipeSearchBaselineFixture.cs](../../api/src/RecipeApi.Tests/Integration/Fixtures/HybridRecipeSearchBaselineFixture.cs)
- [api/src/RecipeApi.Tests/Integration/RecipeLexicalSearchPostgresTests.cs](../../api/src/RecipeApi.Tests/Integration/RecipeLexicalSearchPostgresTests.cs)
- [api/src/RecipeApi.Tests/Integration/RecipeLexicalSearchPostgresTests.Filters.cs](../../api/src/RecipeApi.Tests/Integration/RecipeLexicalSearchPostgresTests.Filters.cs)
- [api/src/RecipeApi.Tests/Integration/RecipeLexicalSearchPostgresTests.Similar.cs](../../api/src/RecipeApi.Tests/Integration/RecipeLexicalSearchPostgresTests.Similar.cs)
- [api/src/RecipeApi.Tests/Integration/RecipeSearchFilterDiscoveryIntegrationTests.cs](../../api/src/RecipeApi.Tests/Integration/RecipeSearchFilterDiscoveryIntegrationTests.cs)
- [api/src/RecipeApi.Tests/Services/RecipeSearchFilterOptionsTests.cs](../../api/src/RecipeApi.Tests/Services/RecipeSearchFilterOptionsTests.cs)
- [api/src/RecipeApi.Tests/Services/RecipeSearchFilterMaterializerTests.cs](../../api/src/RecipeApi.Tests/Services/RecipeSearchFilterMaterializerTests.cs)
- [api/src/RecipeApi.Tests/Services/SearchIndexWorkflowTests.cs](../../api/src/RecipeApi.Tests/Services/SearchIndexWorkflowTests.cs)

`TestWebApplicationFactory` substitutes EF InMemory by default, a zero embedding
provider, chat/workflow/assets as configured, and lacks production lexical/vector
repository registration in that path. Search's factory-only in-memory lexical
scorer is not available to relational serving. PostgreSQL suites instead create
isolated databases from schema.sql when WFS_TEST_POSTGRES_CONNECTION is set; their
fixed/delayed/failing embedding providers do not qualify a live model. The older
HybridRecipeSearchBaselinePostgresTests originally constructed a relational service
without a lexical repository, hitting the explicit registration exception. That
historical fixture could not be cited as a passing baseline. SR-R01 above records
the later repository/embedding wiring repair and actual PostgreSQL execution;
its relevance/timing checks still do not qualify a live embedding model.

Browser recipes/search-hardening fixtures fulfill HTTP responses and inject
member/auth state and fixed time. search-hardening's vector timeout case returns
fallback-lexical directly; it does not time out production semantic work. Generated
search-contract tests inspect file text/symbols rather than prove runtime parity.

## Slice evidence and complete requirement/scenario mappings

### BSL-recipe-search-001

- **Behavior and actor:** Household Search entry/navigation and optional URL context (ordinary household member).
- **Entry state / trigger / observable outcome:** Search nav -> /recipes; initial request has empty text and 12 alternatives; addToDay/weekOffset forward planner context; open selects detail.
- **Business rule and eligibility:** Search is a read; availability follows library facts; assignment remains meal-planning.
- **Failure / cancellation / recovery:** Initial effect ignores inactive/obsolete success; planning Cancel pushes /planner.
- **Configuration and time assumptions:** Browser-local planning label; server calendar remains UTC. No storage persistence.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/components/common/Navigation.tsx](../../pwa/src/components/common/Navigation.tsx) (navItems)
  - [pwa/src/app/(app)/recipes/page.tsx][search-page-source] (RecipesPage initial effect and openIdFromUrl)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (searchRecipes)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (POST /api/recipes/search; RecipeSearchRequestDto)
  - [api/src/RecipeApi/Controllers/RecipeController.cs](../../api/src/RecipeApi/Controllers/RecipeController.cs) (Search)
  - [api/src/RecipeApi/Services/RecipeSearchService.cs](../../api/src/RecipeApi/Services/RecipeSearchService.cs) (SearchAsync)
  - [api/src/RecipeApi/Data/RecipeDbContext.cs](../../api/src/RecipeApi/Data/RecipeDbContext.cs) (Recipes)
- **Relevant test assertions and substitutions:** page.test.tsx: mount asserts query/limit and planning parameters; planning banner asserted. searchParams, router and API functions substituted. recipes.spec.ts: Enter/card assertions use fulfilled routes; fixtures.ts injects auth/member/time and blocks unmocked API calls.
- **API/implementation/test/documentation agreement:** Contract/client/controller align on target fields and raw success. General navigation is not a separate capability. Flow docs incorrectly describe context as mount-only; live dependencies include parsed target.
- **Evidence class and confidence:** implementation-supported / high; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** No successful initial runtime fetch, access qualification or target validity guarantee. Malformed URL integers and browser/server date divergence are withheld.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Enter Search with optional planning and detail context](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-entry-results/specs/recipe-search/spec.md): `Ordinary entry`; `Planning entry`; `Detail link`.

### BSL-recipe-search-002

- **Behavior and actor:** Typed query submission (ordinary household member).
- **Entry state / trigger / observable outcome:** Text changes debounce at 500 ms; Enter clears timer, blurs and runs current text.
- **Business rule and eligibility:** Client JSON preserves text; SearchAsync trims for retrieval. Enter without similar argument clears similar mode, unlike typing callback.
- **Failure / cancellation / recovery:** New search generation rejects obsolete completion; no browser AbortController.
- **Configuration and time assumptions:** Timer is a scheduling delay, not an end-to-end latency promise.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/app/(app)/recipes/page.tsx][search-page-source] (handleQueryChange; onKeyDown)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (searchRecipes JSON.stringify)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (query description)
  - [api/src/RecipeApi/Controllers/RecipeController.cs](../../api/src/RecipeApi/Controllers/RecipeController.cs) (Search)
  - [api/src/RecipeApi/Services/RecipeSearchService.cs](../../api/src/RecipeApi/Services/RecipeSearchService.cs) (query normalization)
- **Relevant test assertions and substitutions:** page.test.tsx: mount/Enter called-with assertions; settled typing asserts call count and latest query; blur assertion uses mocked API/navigation and DOM. recipes.spec.ts: fulfilled request -> Top Pick visibility.
- **API/implementation/test/documentation agreement:** Query transport is verbatim, service-local retrieval text trimmed; no automatic translation or natural-language parsing established.
- **Evidence class and confidence:** implementation-supported / high; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** Pending debounce is not uniformly canceled by filters/similar/unmount; no general race-free action or network cancellation guarantee.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Submit typed search after settling or Enter](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-entry-results/specs/recipe-search/spec.md): `Settled typing`; `Submit now`.

### BSL-recipe-search-003

- **Behavior and actor:** Loading, loaded-card and successful empty presentation (ordinary household member).
- **Entry state / trigger / observable outcome:** Current response renders optional Top Pick plus alternatives; loading hides result section; successful empty exposes Clear Filters and Browse Library.
- **Business rule and eligibility:** Card names/images/time; first Top Pick reason; issue badges only for report statuses.
- **Failure / cancellation / recovery:** Initial/replacement catch fabricates an empty standard/lexical-only response; no distinct initial error/retry presentation.
- **Configuration and time assumptions:** No min result count or relevance quality guarantee.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/app/(app)/recipes/page.tsx][search-page-source] (runSearch; displayedTopPick; showEmptyState; cards)
  - [pwa/src/components/recipes/RecipeImportIssueBadge.tsx](../../pwa/src/components/recipes/RecipeImportIssueBadge.tsx) (RecipeImportIssueBadge)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (mapSearchResult)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (RecipeSearchResponseDto; RecipeSearchResultDto)
  - [api/src/RecipeApi/Services/RecipeSearchService.cs](../../api/src/RecipeApi/Services/RecipeSearchService.cs) (MapResult)
- **Relevant test assertions and substitutions:** page.test.tsx: asserts Top Pick name, alternate cards, empty test ID, Reported/Ready badge labels and absent badge for no report. All search/detail calls mocked. search-hardening.spec.ts scenario 8 fulfills fallback-lexical instead of causing backend timeout.
- **API/implementation/test/documentation agreement:** Loaded card fields supported. Initial failure shares empty UI, so normative empty scenarios explicitly require a successful response. resultPath enums mismatch is separate SR-U01.
- **Evidence class and confidence:** implementation-supported / high; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** Initial-error concealment remains non-normative SR-U05, not a promised no-match diagnosis or adopted desired error policy.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Represent search results and loading feedback](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-entry-results/specs/recipe-search/spec.md): `Results available`; `Replacement pending`.
  - [Offer recovery navigation for successful empty results](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-entry-results/specs/recipe-search/spec.md): `Unfiltered empty response`; `Filtered empty response`.

### BSL-recipe-search-004

- **Behavior and actor:** Detail handoff, close/return and deletion refresh (ordinary household member).
- **Entry state / trigger / observable outcome:** Select card -> RecipeDetailSheet; close clears selection and requests scroll restoration; deletion callback reruns current search.
- **Business rule and eligibility:** Library owns detail reads/updates/deletion; planning owns assignments. Opening or closing does not assign.
- **Failure / cancellation / recovery:** Failed deletion has no success callback and leaves detail available; local edits/resolution do not refresh parent cards.
- **Configuration and time assumptions:** Scroll captured before local card opening, default zero for initial deep link.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/app/(app)/recipes/page.tsx][search-page-source] (handleOpenRecipe; RecipeDetailSheet callbacks)
  - [pwa/src/components/recipes/RecipeDetailSheet.tsx](../../pwa/src/components/recipes/RecipeDetailSheet.tsx) (recipe load; onClose; onDeleted; local recipe state)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (getRecipe; deleteRecipe)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (recipe detail/delete operations)
  - [api/src/RecipeApi/Controllers/RecipeController.cs](../../api/src/RecipeApi/Controllers/RecipeController.cs) (Get; Delete)
  - [api/src/RecipeApi/Services/RecipeService.cs](../../api/src/RecipeApi/Services/RecipeService.cs) (GetRecipeDetail; SoftDeleteRecipe)
- **Relevant test assertions and substitutions:** page.test.tsx: opens detail, asserts notes/rating controls, closes, asserts unchanged search call count/cards; successful Top Pick/alternate deletion asserts second search, failure leaves sheet/card and one search. Detail API mocked. recipes.spec.ts close test uses route fixtures.
- **API/implementation/test/documentation agreement:** Accepted library detail-reading/editing/deletion and meal-planning search-target assignment requirements own effects. U82 confirmed: callback only deletion, not report resolution.
- **Evidence class and confidence:** implementation-supported / high; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** No immediate loaded-parent update after edits, rating, notes, discoverability or report resolution; no cross-remount state or actual scroll/browser qualification.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Return from Search detail to mounted results](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-entry-results/specs/recipe-search/spec.md): `Close a card`; `Open another linked identity`.
  - [Refresh Search after a successful detail deletion](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-entry-results/specs/recipe-search/spec.md): `Deleted card`; `Deletion rejected`.

### BSL-recipe-search-005

- **Behavior and actor:** Responsive filter draft lifecycle (ordinary household member).
- **Entry state / trigger / observable outcome:** Filters opens copy of active state; Apply commits and reruns; Close/Escape/backdrop discard; draft Clear waits for Apply.
- **Business rule and eligibility:** One chooser on all layouts; active count sums array values, true booleans and concepts.
- **Failure / cancellation / recovery:** Built-in controls survive metadata request error; failed metadata is not retried within this mount.
- **Configuration and time assumptions:** Draft/component state only; selected secondary options survive disclosure collapse.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/app/(app)/recipes/page.tsx][search-page-source] (handleApplyFilters; activeFilterCount; Filters button)
  - [pwa/src/components/recipes/RecipeFiltersSheet.tsx](../../pwa/src/components/recipes/RecipeFiltersSheet.tsx) (RecipeFiltersSheet; Chip; Disclosure)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (searchRecipes)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (RecipeSearchFiltersDto; RecipeSearchPreferencesDto)
  - [api/src/RecipeApi/Controllers/RecipeController.cs](../../api/src/RecipeApi/Controllers/RecipeController.cs) (Search)
  - [api/src/RecipeApi/Services/RecipeSearchPredicate.cs](../../api/src/RecipeApi/Services/RecipeSearchPredicate.cs) (Apply; BuildSql)
- **Relevant test assertions and substitutions:** page.test.tsx: one Filters control; draft Reported dismissal does not call search; applying two report flags count=2; Clear+Apply sends no filters and count=0. Full UI uses mocked API. recipes.spec.ts 390px chooser request assertion uses route.fulfill.
- **API/implementation/test/documentation agreement:** U80 confirmed: actual labels Reported and Ready to review via chooser, not separate Needs review view. Source supports Escape/backdrop and selected hidden choice visibility; no universal focus-trap guarantee.
- **Evidence class and confidence:** implementation-supported / high; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** No accessibility compliance or exact viewport qualification; no immediate server effect until Apply.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Apply or discard filter drafts](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-filters-state/specs/recipe-search/spec.md): `Dismiss selection`; `Apply selection`.
  - [Clear selections without clearing the search text](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-filters-state/specs/recipe-search/spec.md): `Clear then dismiss`; `Apply cleared draft`.
  - [Expose supported shortcut and grouped controls](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-filters-state/specs/recipe-search/spec.md): `Retain visible selection`; `Reveal additional vocabulary`.

### BSL-recipe-search-006

- **Behavior and actor:** Meal/Cuisine hard groups and Focus preferences (ordinary household member).
- **Entry state / trigger / observable outcome:** Chooser populates separate filter arrays and preference concepts; Vegetarian sets known-true filter.
- **Business rule and eligibility:** Normalize hard arrays; OR within each, AND across groups; apply before ranked candidate limits. Focus does not become includedIngredients.
- **Failure / cancellation / recovery:** No exact ingredient exclusion supported; unavailable metadata uses built-ins without Cuisine list.
- **Configuration and time assumptions:** Nonblank concepts normalized separately for semantic query.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/components/recipes/RecipeFiltersSheet.tsx](../../pwa/src/components/recipes/RecipeFiltersSheet.tsx) (toggleMain; toggleArray; mainVisible; cuisineVisible)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (searchRecipes)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (filters; preferences; filter discovery)
  - [api/src/RecipeApi/Controllers/RecipeController.cs](../../api/src/RecipeApi/Controllers/RecipeController.cs) (Search)
  - [api/src/RecipeApi/Services/RecipeSearchPredicate.cs](../../api/src/RecipeApi/Services/RecipeSearchPredicate.cs) (NormalizeValues; Apply; BuildSql)
  - [api/src/RecipeApi/Services/RecipeLexicalSearchRepository.cs](../../api/src/RecipeApi/Services/RecipeLexicalSearchRepository.cs) (SearchAsync)
  - [api/src/RecipeApi/Services/RecipeSemanticSearchRepository.cs](../../api/src/RecipeApi/Services/RecipeSemanticSearchRepository.cs) (SearchAsync)
- **Relevant test assertions and substitutions:** RecipeLexicalSearchPostgresTests.Filters.cs: Sfd1_HardGroups_UseOrWithinAndAcross_BeforeCandidateLimit asserts exact allowed IDs on lexical/vector with tight limits. Sfd1_TypedConcept asserts request.Query unchanged, no includedIngredients and provider text contains query+fish; synthetic ConceptEmbeddingProvider. recipes.spec.ts combined custom Focus/Vegetarian/Meal/Cuisine request body inspected; all HTTP fulfilled.
- **API/implementation/test/documentation agreement:** Hard groups aligned across SQL/LINQ; contract-only includedIngredients/categories/maximumTotalMinutes and non-concept preferences have no executing predicate/ranker.
- **Evidence class and confidence:** implementation-supported / high; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** No positive capability claim for unused DTO fields, concept ingredient identity, semantic quality or live hard-filter performance.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Separate Focus preferences from hard selections](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-filters-state/specs/recipe-search/spec.md): `Combined selection`; `Toggle off`.
  - [Constrain cuisine and meal groups together](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-filters-state/specs/recipe-search/spec.md): `Multiple values`; `No matching group`.

### BSL-recipe-search-007

- **Behavior and actor:** Supported booleans and report combinations (ordinary household member).
- **Entry state / trigger / observable outcome:** New/Never Tried/Family Favorite/Quick/Vegetarian/While and report choices constrain reads.
- **Business rule and eligibility:** New >= UtcNow-30d; never null date; favorite rating>=2 AND(discoverable OR notes non-null); while non-null date; known vegetarian true; report superset/ready subset with ready precedence.
- **Failure / cancellation / recovery:** Contradictory never+while empty; report matches ordinary results, never promotion.
- **Configuration and time assumptions:** Quick browse uses raw-time regex; ranked SQL uses indexed totalTimeMinutes <=30; continuation LINQ lacks Quick predicate. New uses wall clock, not injected IClock.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/components/recipes/RecipeFiltersSheet.tsx](../../pwa/src/components/recipes/RecipeFiltersSheet.tsx) (RECIPE_FILTER_OPTIONS)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (searchRecipes)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (RecipeSearchFiltersDto)
  - [api/src/RecipeApi/Controllers/RecipeController.cs](../../api/src/RecipeApi/Controllers/RecipeController.cs) (Search validation)
  - [api/src/RecipeApi/Services/RecipeSearchPredicate.cs](../../api/src/RecipeApi/Services/RecipeSearchPredicate.cs) (Apply; BuildSql)
  - [api/src/RecipeApi/Services/RecipeSearchService.cs](../../api/src/RecipeApi/Services/RecipeSearchService.cs) (ApplyBrowseQuickEligibility; ContinueRankedAsync)
  - [api/src/RecipeApi/Services/RecipeSearchDocumentBuilder.cs](../../api/src/RecipeApi/Services/RecipeSearchDocumentBuilder.cs) (ParseTotalMinutes)
- **Relevant test assertions and substitutions:** RecipeSearchIntegrationTests: vegetarian exact ID set; report superset/subset/both and combined text+filters ID assertions; appliedFilters echoes booleans (echo does not prove all filtering). InMemory factory uses test lexical scorer. RecipeLexicalSearchPostgresTests.Filters: vegetarian before limits and sparse Quick browse exact traversal with seeded rows; opt-in PostgreSQL not run.
- **API/implementation/test/documentation agreement:** Quick representations are path-specific, not one universal duration parser. NotCookedInLongTime means non-null date, not configured rediscovery age. Family Favorite is not consensus. API-only discoverable predicate exists but separate broader API journey deferred.
- **Evidence class and confidence:** implementation-supported / medium; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** SR-U03 withholds unused structured fields; SR-U04 withholds Quick continuation revalidation and uniform parsing; source-supported initial filter outcomes drafted only.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Apply supported boolean filters from stored facts](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-filters-state/specs/recipe-search/spec.md): `Contradictory cooking filters`; `Unknown vegetarian classification`; `Duration unknown`.
  - [Use report membership without a separate review route](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-filters-state/specs/recipe-search/spec.md): `Both report choices`; `Reported with other constraints`.

### BSL-recipe-search-008

- **Behavior and actor:** Search state lifetime (ordinary household member).
- **Entry state / trigger / observable outcome:** Same mounted page retains query/filters/preferences through detail; reload initializes empty selections with URL similar/open only.
- **Business rule and eligibility:** useState owns page selection; searchPromotionStore is nonpersisted version only.
- **Failure / cancellation / recovery:** Chooser remount resets unsubmitted draft; detail close does not reload parent.
- **Configuration and time assumptions:** No search localStorage/sessionStorage or persisted search store.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/app/(app)/recipes/page.tsx][search-page-source] (state initializers; detail callbacks)
  - [pwa/src/components/recipes/RecipeFiltersSheet.tsx](../../pwa/src/components/recipes/RecipeFiltersSheet.tsx) (draft initializers)
  - [pwa/src/store/searchPromotionStore.ts](../../pwa/src/store/searchPromotionStore.ts) (create, version)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (searchRecipes)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (search request)
  - [api/src/RecipeApi/Services/RecipeSearchService.cs](../../api/src/RecipeApi/Services/RecipeSearchService.cs) (request-local mode)
- **Relevant test assertions and substitutions:** page.test.tsx: close-detail keeps query/cards and call count; chooser Cancel retains active count. No reload persistence assertion; state lifetime follows source initializers.
- **API/implementation/test/documentation agreement:** Docs say same results on close; source supports mounted state only. Planning URL parameters read live, query/filters not URL-persisted.
- **Evidence class and confidence:** implementation-supported / medium; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** Cross-route remount/browser reload/search-history persistence not implemented; no persistence requirement invented.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Keep mounted search state through detail and chooser use](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-filters-state/specs/recipe-search/spec.md): `Return from detail`; `Reload Search`.

### BSL-recipe-search-009

- **Behavior and actor:** Empty browse availability and ordinary ordering (ordinary household member).
- **Entry state / trigger / observable outcome:** Blank query/concepts, no Similar -> BrowseAsync, no embedding call.
- **Business rule and eligibility:** Base ready/undeleted recipes; discoverability only when filtered. Ordinary order never-cooked, oldest last-cooked, newest creation, ID; promotion block first.
- **Failure / cancellation / recovery:** No published document required; no successful-provider requirement.
- **Configuration and time assumptions:** Clock is injected UTC for rediscovery; all eligible browse projections are materialized, not bounded database reads.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/app/(app)/recipes/page.tsx][search-page-source] (initial search)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (searchRecipes)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (query; resultPath browse)
  - [api/src/RecipeApi/Controllers/RecipeController.cs](../../api/src/RecipeApi/Controllers/RecipeController.cs) (Search)
  - [api/src/RecipeApi/Services/RecipeSearchService.cs](../../api/src/RecipeApi/Services/RecipeSearchService.cs) (BrowseAsync; GetBrowseRankedRecipesAsync; BrowseProjection)
  - [api/src/RecipeApi/Data/RecipeDbContext.cs](../../api/src/RecipeApi/Data/RecipeDbContext.cs) (Recipes; RecipeSearchAffinityFacts)
- **Relevant test assertions and substitutions:** RecipeSearchIntegrationTests: Search_WithEmptyQuery_Returns_Newest_Recipes_First actually asserts no Top Pick and ordered newest never-cooked rows; NotCookedInLongTime asserts oldest dates with no eligible affinity. Browse_Uses_Continuation reaches 55 unique seeded IDs. Factory uses InMemory and manually seeded facts, not materializer.
- **API/implementation/test/documentation agreement:** Empty browse aligned with contract. Older data flow claims bounded database ordering; actual source ToListAsync ranks all matching projections.
- **Evidence class and confidence:** implementation-supported / high; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** No bounded-memory/scalability/runtime latency claim; no fallback Top Pick invented when no eligible favorite exists.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Choose browse only without usable search content](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-retrieval-modes/specs/recipe-search/spec.md): `Blank content`; `Recipe not indexed`.

### BSL-recipe-search-010

- **Behavior and actor:** Ranked lexical and semantic text retrieval (ordinary household member).
- **Entry state / trigger / observable outcome:** Nonblank trimmed text retrieves <=50 lexical candidates; enabled optional semantic attempt unions by identity, then modifiers/order.
- **Business rule and eligibility:** Canonical document ready/nonempty; base ready/undeleted; SQL filters before candidate caps. Semantic vectors require ready index+embedding, fingerprint equality, configured model/version/dimensions.
- **Failure / cancellation / recovery:** Semantic exceptions/budget exhaustion return typed lexical; caller cancellation propagates.
- **Configuration and time assumptions:** Program binds WFS_ENABLE_SEMANTIC_RETRIEVAL default true, WFS_SEMANTIC_CANDIDATE_LIMIT default 50, EMBEDDING_DIMENSIONS default1536, model/version; 300ms linked token is not request latency guarantee.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/app/(app)/recipes/page.tsx][search-page-source] (runSearch)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (searchRecipes)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (POST search; request/response)
  - [api/src/RecipeApi/Controllers/RecipeController.cs](../../api/src/RecipeApi/Controllers/RecipeController.cs) (Search)
  - [api/src/RecipeApi/Services/RecipeSearchService.cs](../../api/src/RecipeApi/Services/RecipeSearchService.cs) (SearchAsync; GetLexicalCandidatesAsync; VectorSearchAsync; MergeCandidates)
  - [api/src/RecipeApi/Services/RecipeLexicalSearchRepository.cs](../../api/src/RecipeApi/Services/RecipeLexicalSearchRepository.cs) (SearchAsync)
  - [api/src/RecipeApi/Services/RecipeSemanticSearchRepository.cs](../../api/src/RecipeApi/Services/RecipeSemanticSearchRepository.cs) (SearchAsync)
  - [api/src/RecipeApi/Program.cs](../../api/src/RecipeApi/Program.cs) (search registrations)
- **Relevant test assertions and substitutions:** RecipeLexicalSearchPostgresTests: database fallback asserts fallback-lexical and seeded match; compatibility case excludes stale/wrong-model/pending vectors with bounded count; timeout uses delayed provider and asserts 250..1500ms plus pre-cancel exception. Opt-in isolated PostgreSQL, fixed/synthetic providers, no live model. HybridSearchTests allows hybrid OR lexical-only OR fallback and does not prove vectors contributed.
- **API/implementation/test/documentation agreement:** Production PostgreSQL lexical uses ILIKE phrase/terms + word_similarity; factory-only scorer can fuzzy/notes match and has different reasons. Hybrid resultPath denotes successful attempt, not proof of nonzero semantic contribution.
- **Evidence class and confidence:** implementation-supported / high; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** No universal fuzzy/accent/translation guarantee, model quality, full catalog recall, end-to-end 300ms SLA or strict parity with factory scorer.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Retrieve typed lexical candidates from published documents](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-retrieval-modes/specs/recipe-search/spec.md): `Published text matches`; `No matching document`.
  - [Attempt compatible semantic retrieval when enabled](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-retrieval-modes/specs/recipe-search/spec.md): `Stale or incompatible vector`; `Compatible pool`.
  - [Fall back from unavailable semantic work without promising relevance](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-retrieval-modes/specs/recipe-search/spec.md): `Typed provider failure`; `Concept fallback`; `Caller cancels`.
  - [Keep semantic availability a serving option](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-retrieval-modes/specs/recipe-search/spec.md): `Semantic disabled`; `External embedding endpoint unavailable`.
  - [Combine ranked retrieval candidates by recipe identity](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-retrieval-modes/specs/recipe-search/spec.md): `Both paths retrieve the recipe`; `Semantic-only candidate in a typed search`.

### BSL-recipe-search-011

- **Behavior and actor:** Concept-only semantic search and fallback (ordinary household member).
- **Entry state / trigger / observable outcome:** Usable concepts with blank text select ranked path; semantic query joins trimmed text and normalized distinct concepts.
- **Business rule and eligibility:** Concepts influence retrieval rather than exact hard ingredient filters; successful zero-vector concept search stays empty.
- **Failure / cancellation / recovery:** Disabled/unavailable/timeout/error falls back to concept lexical text with filters.
- **Configuration and time assumptions:** No usable concepts -> browse; whitespace query preserved on request object.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/components/recipes/RecipeFiltersSheet.tsx](../../pwa/src/components/recipes/RecipeFiltersSheet.tsx) (toggleConcept)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (searchRecipes)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (RecipeSearchPreferencesDto concepts)
  - [api/src/RecipeApi/Services/RecipeSearchService.cs](../../api/src/RecipeApi/Services/RecipeSearchService.cs) (NormalizeConcepts; CreateSemanticQuery; conceptOnly branch)
  - [api/src/RecipeApi/Services/RecipeSemanticSearchRepository.cs](../../api/src/RecipeApi/Services/RecipeSemanticSearchRepository.cs) (SearchAsync)
  - [api/src/RecipeApi/Services/RecipeLexicalSearchRepository.cs](../../api/src/RecipeApi/Services/RecipeLexicalSearchRepository.cs) (SearchAsync)
- **Relevant test assertions and substitutions:** RecipeLexicalSearchPostgresTests.Filters.cs: concept fallback all four failure cases asserts only Japanese/Supper fish and original whitespace request; concept success no vectors asserts empty and one provider call; typed concept asserts vector choice changes and no exact ingredient filter. ConceptEmbeddingProvider maps text to fixed unit vectors.
- **API/implementation/test/documentation agreement:** Contract text explicitly supports successful semantic zero-match; response emits semantic-only absent from approved resultPath enum (SR-U01).
- **Evidence class and confidence:** implementation-supported / high; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** Draft outcome without adopting disputed resultPath value or promising conceptual relevance; no non-concept preference behavior invented.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Use Focus concepts as semantic search content](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-retrieval-modes/specs/recipe-search/spec.md): `Concept-only request`; `Semantic zero match`.

### BSL-recipe-search-012

- **Behavior and actor:** Find Similar retrieval and structured ranking (ordinary household member).
- **Entry state / trigger / observable outcome:** Find similar closes detail, clears visible query, sends source identity; missing/deleted/not-ready source -> empty.
- **Business rule and eligibility:** Source excluded before caps; compatible ready source vector used when available, otherwise source-name/ingredient/cuisine/category/meal compact query; structured scorer uses facts without family signals.
- **Failure / cancellation / recovery:** Semantic errors fall back, cancellation propagates; planner demotion can still apply with both context fields.
- **Configuration and time assumptions:** Scorer weights: semantic .40, ingredients .25, cuisine/category .10 each, meals/known vegetarian/time .05 each; normalization maps raw cosine 0 to .5, so fallback does NOT give zero weighted semantic term.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/app/(app)/recipes/page.tsx][search-page-source] (handleFindSimilar)
  - [pwa/src/components/recipes/RecipeDetailSheet.tsx](../../pwa/src/components/recipes/RecipeDetailSheet.tsx) (onFindSimilar action)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (searchRecipes)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (similarToRecipeId; searchMode)
  - [api/src/RecipeApi/Services/RecipeSearchService.cs](../../api/src/RecipeApi/Services/RecipeSearchService.cs) (SimilarSearchAsync; SimilarLexicalFallbackAsync; BuildSimilarLexicalQuery)
  - [api/src/RecipeApi/Services/RecipeSimilarityScorer.cs](../../api/src/RecipeApi/Services/RecipeSimilarityScorer.cs) (Score; NormalizeSemanticScore)
  - [api/src/RecipeApi/Services/RecipeSemanticSearchRepository.cs](../../api/src/RecipeApi/Services/RecipeSemanticSearchRepository.cs) (source exclusion)
- **Relevant test assertions and substitutions:** page.test.tsx: action submits empty text/source and closes detail (mocked API). RecipeSearchIntegrationTests: Similar structured vs family signals and planner explanation, factory lexical substitute. RecipeLexicalSearchPostgresTests.Similar: semantic/lexical source exclusion+filters before caps, structured candidate promoted, failure fallback, stable unique continuation IDs and caller cancellation. The original ZeroSemanticContribution title did not establish a zero score component; SR-R01 records its corrected name and stronger order assertions.
- **API/implementation/test/documentation agreement:** SearchMode similar supported; resultPath similar and reason lexical-match absent approved enums. Docs/test name zero semantic contribution contradict normalization; withhold exact zero claim (SR-U02).
- **Evidence class and confidence:** implementation-supported / medium; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** No live relevance quality, disputed enum values, zero-semantic term or full-catalog closest-neighbor guarantee.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Enter Similar from loaded detail](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-retrieval-modes/specs/recipe-search/spec.md): `Find similar action`; `Source unavailable`.
  - [Rank Similar using source recipe facts with lexical recovery](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-retrieval-modes/specs/recipe-search/spec.md): `Source embedding unavailable`; `Strongly aligned recipe`; `Family favorite unrelated`.

### BSL-recipe-search-013

- **Behavior and actor:** Vocabulary and meaningful configuration availability (ordinary household member).
- **Entry state / trigger / observable outcome:** First chooser opening requests GET search/filters; API reads singleton materialized state; absent/malformed payload safe fallback.
- **Business rule and eligibility:** Configured Main order; unique trimmed IDs/concepts and custom labels; fixed Meals; stored promoted/all cuisines; invalid Main fallback entire default list; interval default28 accepts7..365.
- **Failure / cancellation / recovery:** Metadata browser catch keeps built-ins; request marked attempted so no same-mount retry; stored stale state served.
- **Configuration and time assumptions:** Cuisine/affinity materialization is separate startup/workflow work, not synchronous search; no freshness deadline.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/app/(app)/recipes/page.tsx][search-page-source] (filterMetadataRequestedRef)
  - [pwa/src/components/recipes/RecipeFiltersSheet.tsx](../../pwa/src/components/recipes/RecipeFiltersSheet.tsx) (DEFAULT_MAIN; DEFAULT_MEAL_TYPES)
  - [pwa/src/lib/api/generated/api/recipes/search/filters/index.ts](../../pwa/src/lib/api/generated/api/recipes/search/filters/index.ts) (get)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (GET search/filters)
  - [api/src/RecipeApi/Controllers/RecipeController.cs](../../api/src/RecipeApi/Controllers/RecipeController.cs) (GetSearchFilters)
  - [api/src/RecipeApi/Services/RecipeSearchFilterOptions.cs](../../api/src/RecipeApi/Services/RecipeSearchFilterOptions.cs) (TryNormalizeMain; interval)
  - [api/src/RecipeApi/Services/RecipeSearchFilterMaterializer.cs](../../api/src/RecipeApi/Services/RecipeSearchFilterMaterializer.cs) (MaterializeAsync; BuildFact; BuildSnapshot)
  - [api/src/RecipeApi/Models/RecipeSearchFilterState.cs](../../api/src/RecipeApi/Models/RecipeSearchFilterState.cs) (singleton)
- **Relevant test assertions and substitutions:** RecipeSearchFilterDiscoveryIntegrationTests: asserts configured order/custom label, fixed meals, saved cuisines/timestamp, no-state empty cuisines despite catalog/history, old timestamp served and malformed config built-in fallback. RecipeSearchFilterOptionsTests inspects custom/built-in labels and interval bounds. Factory InMemory, seeded materialized snapshot. MaterializerTests InMemory transaction warnings ignored; PostgreSQL counterpart separate opt-in.
- **API/implementation/test/documentation agreement:** GET contract agrees; generatedAt is snapshot timestamp not read freshness or schema migration. Filter config and semantic config are distinct.
- **Evidence class and confidence:** implementation-supported / high; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** No request-time cuisine discovery, guaranteed backfill completion, automatic metadata retry, live transaction qualification or operator maintenance workflow drafted.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Load filter vocabulary without blocking built-in choices](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-filters-state/specs/recipe-search/spec.md): `No materialized state`; `Metadata request fails`; `Stored snapshot is old`.
  - [Use validated filter configuration defaults](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-filters-state/specs/recipe-search/spec.md): `Invalid custom definition`; `Invalid interval`.
  - [Keep semantic availability a serving option](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-retrieval-modes/specs/recipe-search/spec.md): `Semantic disabled`; `External embedding endpoint unavailable`.

### BSL-recipe-search-014

- **Behavior and actor:** Browse server-owned affinity/calendar promotion (ordinary household member).
- **Entry state / trigger / observable outcome:** Browse consumes saved affinity and event-date facts plus live calendar.
- **Business rule and eligibility:** Affinity positive AND saved LastCookedOn<=UTC today-interval AND not blocked; blocked active Planned/Locked/AwaitingConsensus >=today or Cooked within selected week. Default week0. Ordinary membership retained.
- **Failure / cancellation / recovery:** No eligible report-free candidate within initial limit+2 window -> no Top Pick; never-cooked positive facts not eligible.
- **Configuration and time assumptions:** Materialized affinity = like-dislike+cooked count for ready recipes with cuisine; rating not direct input; positive rating alone does not imply eligibility.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/app/(app)/recipes/page.tsx][search-page-source] (search response consumer)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (mapSearchResult)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (isPromotionEligible browse-only)
  - [api/src/RecipeApi/Services/RecipeSearchService.cs](../../api/src/RecipeApi/Services/RecipeSearchService.cs) (GetBrowseRankedRecipesAsync; BrowseAsync)
  - [api/src/RecipeApi/Services/RecipeSearchFilterMaterializer.cs](../../api/src/RecipeApi/Services/RecipeSearchFilterMaterializer.cs) (BuildFact)
  - [api/src/RecipeApi/Services/RecipeSearchFilterOptions.cs](../../api/src/RecipeApi/Services/RecipeSearchFilterOptions.cs) (RediscoveryIntervalDays)
  - [api/src/RecipeApi/Models/RecipeSearchAffinityFact.cs](../../api/src/RecipeApi/Models/RecipeSearchAffinityFact.cs)
  - [api/src/RecipeApi/Services/ScheduleService.cs](../../api/src/RecipeApi/Services/ScheduleService.cs) (persisted CalendarEvents)
- **Relevant test assertions and substitutions:** RecipeSearchIntegrationTests browse promotion asserts favorite flagged true, disliked/never-cooked false; guards assert blocked favorite ordinary false; skipping one assignment does not unblock another active event, removing active event does. FixedClock TestNow, manually seeded affinity, EF InMemory; not current materialization or live calendar qualification. MaterializerTests inspects positive/negative vote+cook facts and last event date.
- **API/implementation/test/documentation agreement:** Server policy aligns with public browse-only flag. Recipe dates and materialized event dates differ; no client recomputation. Ranked Top Pick deliberately uses a separate rule.
- **Evidence class and confidence:** implementation-supported / high; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** No guaranteed promotable item across whole catalog beyond initial window, affinity snapshot freshness or client-owned calendar policy.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Keep browse rediscovery eligibility on the server](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-ranking-promotion/specs/recipe-search/spec.md): `No cooked evidence`; `Active future calendar entry`; `Skipped entry only`.
  - [Order browse promotion before ordinary rediscovery](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-ranking-promotion/specs/recipe-search/spec.md): `Two eligible favorites`; `No promotable candidate in initial window`; `Equal ordinary cooking dates`.

### BSL-recipe-search-015

- **Behavior and actor:** Standard reranking and mode-specific Top Pick (ordinary household member).
- **Entry state / trigger / observable outcome:** Retrieved standard candidates receive rating and like boosts; with both target parameters server schedule recipe IDs get demotion; similar omits family signals.
- **Business rule and eligibility:** Love +.15 Like+.08 Dislike-.10; likes min(count*.05,.15); planner -10; sort score desc/creation desc/ID, while swaps creation with LastCookedDate.
- **Failure / cancellation / recovery:** Planned candidate retained, not excluded; no candidate invention from boost.
- **Configuration and time assumptions:** GetScheduleAsync reads persisted calendar; browser pending suggestions not part of demotion; status not filtered before recipe-ID demotion.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/app/(app)/recipes/page.tsx][search-page-source] (planner query context)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (searchRecipes)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (search reason schema)
  - [api/src/RecipeApi/Services/RecipeSearchService.cs](../../api/src/RecipeApi/Services/RecipeSearchService.cs) (ApplyFamilySignals; ApplyPlannerAwareRerankingAsync; finalCandidates)
  - [api/src/RecipeApi/Services/ScheduleService.cs](../../api/src/RecipeApi/Services/ScheduleService.cs) (GetScheduleAsync)
  - [api/src/RecipeApi/Services/DiscoveryService.cs](../../api/src/RecipeApi/Services/DiscoveryService.cs) (stored likes versus consensus)
  - [api/database/schema.sql](../../api/database/schema.sql) (vw_recipe_matches)
- **Relevant test assertions and substitutions:** RecipeSearchIntegrationTests: Love/Dislike order and rating reason; bounded vote boost cases assert promoted identity and reason; nonmatch not retrieved. Planner test name says Excludes but assertion requires assigned item and planner-fit explanation. Similar tests reject rating/vote reasons. EF InMemory scorer differs from production SQL.
- **API/implementation/test/documentation agreement:** U04 rechecked: match view counts likes without consensus threshold; consensus owner calculates threshold; suggestions are not persisted events. Browser promotion and lock separate requests/global vote clear remain planning boundaries, not Search guarantees.
- **Evidence class and confidence:** implementation-supported / high; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** No consensus/assignment inference from Top Pick or reason; exact notes-match reason from factory not generalized to production; no actual score equality assertion claimed from capped test name.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Apply family signals only to retrieved standard ranked candidates](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-ranking-promotion/specs/recipe-search/spec.md): `Equivalent candidates`; `More likes than cap`; `Similar mode`.
  - [Demote ranked candidates already shown in the target week](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-ranking-promotion/specs/recipe-search/spec.md): `Candidate appears in selected schedule`; `Context incomplete`.

### BSL-recipe-search-016

- **Behavior and actor:** Reports exclude promotion but not ordinary matching (ordinary household member).
- **Entry state / trigger / observable outcome:** Candidate report status mapped to reported/readyToReview; all active rows excluded from initial Top Pick; review mode suppresses Top Pick.
- **Business rule and eligibility:** Reuse recipe-quality Select saved issue membership for review; Present review matches as ordinary results; Display returned issue indicators.
- **Failure / cancellation / recovery:** Manual resolution changes persisted reads and local detail; no parent callback/SSE for resolution.
- **Configuration and time assumptions:** Ranked continuation holds old report/display fields unless LINQ report filter removes candidate.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/app/(app)/recipes/page.tsx][search-page-source] (hasReviewFilters; displayedTopPick)
  - [pwa/src/components/recipes/RecipeDetailSheet.tsx](../../pwa/src/components/recipes/RecipeDetailSheet.tsx) (resolution setRecipe)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (mapSearchResult)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (importIssueStatus)
  - [api/src/RecipeApi/Services/RecipeSearchService.cs](../../api/src/RecipeApi/Services/RecipeSearchService.cs) (reportStatuses; promotionCandidates; MapResult)
  - [api/src/RecipeApi/Services/RecipeSearchPredicate.cs](../../api/src/RecipeApi/Services/RecipeSearchPredicate.cs) (review predicates)
  - [api/src/RecipeApi/Services/RecipeImportReportService.cs](../../api/src/RecipeApi/Services/RecipeImportReportService.cs) (DeleteAsync)
- **Relevant test assertions and substitutions:** RecipeSearchIntegrationTests: public statuses/ordinary assigned candidate/no diagnostic fields; active report never Top Pick; review filters subset/superset/both. page.test.tsx suppresses even a mocked Top Pick under Reported. recipe-quality accepted resolution requirements retain later-read versus loaded snapshot distinction.
- **API/implementation/test/documentation agreement:** U80 and U82 confirmed with accepted owning requirements; no duplicated client eligibility policy. report exclusion independent of browse-only promotion flag.
- **Evidence class and confidence:** implementation-supported / high; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** New report on already-snapshotted ranked cursor not fully refreshed; no immediate loaded-card badge or membership guarantee.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Select ranked Top Pick separately from browse promotion flags](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-ranking-promotion/specs/recipe-search/spec.md): `Highest ranked has a report`; `All candidates reported`; `Review mode`.
  - [Order browse promotion before ordinary rediscovery](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-ranking-promotion/specs/recipe-search/spec.md): `Two eligible favorites`; `No promotable candidate in initial window`; `Equal ordinary cooking dates`.

### BSL-recipe-search-017

- **Behavior and actor:** Local Surprise Me and safe default mapping (ordinary household member).
- **Entry state / trigger / observable outcome:** Local random choice among loaded server-flagged issue-free alternatives swaps cards; previous Top Pick returned to alternatives.
- **Business rule and eligibility:** Eligibility true required; missing flag defaults false; no candidate fallback to ineligible list.
- **Failure / cancellation / recovery:** Disabled with accessible description if no eligible alternate or obsolete version; makes no search/assignment request.
- **Configuration and time assumptions:** Random choice in current loaded pool, not sampling entire catalog.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/app/(app)/recipes/page.tsx][search-page-source] (handleFeelLucky; hasEligibleAlternate)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (mapSearchResult defaults)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (isPromotionEligible)
  - [api/src/RecipeApi/Services/RecipeSearchService.cs](../../api/src/RecipeApi/Services/RecipeSearchService.cs) (MapResult browse flag)
- **Relevant test assertions and substitutions:** page.test.tsx: fixed Math.random promotes eligible Chicken, skips ineligible/import issue, keeps current cards when unavailable and asserts no search call. recipes.spec.ts: browser promoted card changes and previous hero becomes alternate, route fixtures inject eligibility even for lexical-only response.
- **API/implementation/test/documentation agreement:** Client consumes server eligibility, no affinity/calendar recreation. Browser fixture does not prove production ranked-mode flags (ranked maps false).
- **Evidence class and confidence:** implementation-supported / high; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** No candidate-invention fallback, model choice, server persistence or continuation eligibility-flag continuity.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Use server eligibility for local Surprise Me](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-ranking-promotion/specs/recipe-search/spec.md): `Eligible alternate exists`; `No eligible alternate`; `Obsolete promotion generation`.

### BSL-recipe-search-018

- **Behavior and actor:** Contract, mapping, request validation and pagination boundaries (ordinary household member).
- **Entry state / trigger / observable outcome:** Raw POST sends current context and status-preserving error; success accepts raw or data envelope.
- **Business rule and eligibility:** Default12 alternatives, range1..50; Top Pick outside limit; nonempty excludedIngredients returns400.
- **Failure / cancellation / recovery:** 409 mapped via error status for restart; absent/marker Top Pick maps null.
- **Configuration and time assumptions:** Controller raw SkipWrapping; compatibility envelope tolerated client-side.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (RecipeSearchRequestError; mapSearchResult; searchRecipes)
  - [pwa/src/lib/api/generated/api/recipes/search/index.ts](../../pwa/src/lib/api/generated/api/recipes/search/index.ts) (generated builder)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (POST search; search schemas)
  - [api/src/RecipeApi/Controllers/RecipeController.cs](../../api/src/RecipeApi/Controllers/RecipeController.cs) (Search)
  - [api/src/RecipeApi/Dto/RecipeSearchRequestDto.cs](../../api/src/RecipeApi/Dto/RecipeSearchRequestDto.cs)
  - [api/src/RecipeApi/Services/RecipeSearchService.cs](../../api/src/RecipeApi/Services/RecipeSearchService.cs) (limit; results)
- **Relevant test assertions and substitutions:** RecipeSearchIntegrationTests out-of-range asserts400, continuation counts12 plus Top Pick then2 alternatives. search-contract.test.ts reads generated source symbols/field strings, not HTTP or requiredness/runtime equality. page tests substitute searchRecipes entirely.
- **API/implementation/test/documentation agreement:** Raw success plus tolerated envelope matches wrapper; generated schema test alone cannot prove API parity. Controller rejects supplied out-of-range rather than docs clamp diagram.
- **Evidence class and confidence:** implementation-supported / high; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** No strict generated-client runtime parity, broader unused structured filter behavior or externally scoped API-only workflow qualification.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Bound alternatives and reject unsupported requests](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-continuation-freshness/specs/recipe-search/spec.md): `Out-of-range limit`; `Unsupported exclusion`; `Top Pick plus alternatives`.

### BSL-recipe-search-019

- **Behavior and actor:** Sentinel and continuation append/exhaustion (ordinary household member).
- **Entry state / trigger / observable outcome:** Observer within400px starts continuation; browse24/ranked12; generation-ref prevents duplicate in-flight calls.
- **Business rule and eligibility:** Append only IDs absent existing alternatives; preserve current Top Pick; adopt nextCursor; no cursor -> no sentinel.
- **Failure / cancellation / recovery:** Initial/continuation generation checks suppress obsolete successes, not physical requests.
- **Configuration and time assumptions:** IntersectionObserver unavailable -> no observer; no normal manual Show more button.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/app/(app)/recipes/page.tsx][search-page-source] (handleShowMore; resultsSentinelRef; observer)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (searchRecipes)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (nextCursor; continuationToken)
  - [api/src/RecipeApi/Services/RecipeSearchService.cs](../../api/src/RecipeApi/Services/RecipeSearchService.cs) (remainingResults; ContinueAsync)
- **Relevant test assertions and substitutions:** page.test.tsx: mocked IntersectionObserver observes sentinel with400px margin and no manual button; trigger asserts browse limit24 and cursor/context. Repeated observer asserts two total calls including mount while pending. RecipeSearchIntegrationTests continuation exact batch sizes/no repeated first IDs/exhausted nextCursor; browse55 unique IDs.
- **API/implementation/test/documentation agreement:** Page uses continuous sentinel, not old five-result list or normal manual button. Dedup compares against existing alternatives, not arbitrary duplicates inside a malformed batch.
- **Evidence class and confidence:** implementation-supported / high; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** No universal duplicate-free mutable browse traversal, infinite-scroll support without observer, exhaustive ranked catalog recall or absent-anchor recovery.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Load continuation through the result sentinel](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-continuation-freshness/specs/recipe-search/spec.md): `Repeated observer notifications`; `No cursor`.
  - [Append current continuation without repeating loaded alternatives](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-continuation-freshness/specs/recipe-search/spec.md): `Page arrives`; `Ranked pool exhausted`.

### BSL-recipe-search-020

- **Behavior and actor:** Process-local cursor and limited continuation freshness (ordinary household member).
- **Entry state / trigger / observable outcome:** Token get checks entry/fingerprint/expiry; ranked snapshot rechecks current LINQ eligibility; browse rereads order and scans after anchor ID.
- **Business rule and eligibility:** 10min per stored entry, capacity1000, process-local eviction; fingerprint includes trimmed query, similar/planner fields, filters/preferences (serialized form), not limit.
- **Failure / cancellation / recovery:** Missing/expired/incompatible token ->409 restart; deleted/filtered-out browse anchor can end traversal.
- **Configuration and time assumptions:** Ranked clone omits IsPromotionEligible; browse second successor position omits WeekOffset; raw filter/preference representation affects fingerprint.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/app/(app)/recipes/page.tsx][search-page-source] (handleShowMore)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (searchRecipes)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (409; continuationToken)
  - [api/src/RecipeApi/Controllers/RecipeController.cs](../../api/src/RecipeApi/Controllers/RecipeController.cs) (Search catch)
  - [api/src/RecipeApi/Services/RecipeSearchService.cs](../../api/src/RecipeApi/Services/RecipeSearchService.cs) (CreateContinuationFingerprint; ContinueRankedAsync; ContinueBrowseAsync)
  - [api/src/RecipeApi/Services/RecipeSearchContinuationStore.cs](../../api/src/RecipeApi/Services/RecipeSearchContinuationStore.cs) (Get; Store; Clone; BrowsePosition)
- **Relevant test assertions and substitutions:** RecipeSearchIntegrationTests unknown token asserts409+restart text (does not advance10min clock). RecipeLexicalSearchPostgresTests.Filters changes unserved cuisine/meal then asserts continuation empty, preference change throws. Similar continuation test asserts unique served IDs/order not DTO refresh or clone flags.
- **API/implementation/test/documentation agreement:** Eligibility recheck is narrower than fresh rerank. LINQ lacks Quick; report status/score/reasons remain snapshot in ranked continuation. Browse first cursor captures selectedWeekOffset; later cursor construction drops it.
- **Evidence class and confidence:** implementation-supported / medium; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** SR-U04/U06/U07 withhold full freshness, eligible-flag continuity, selected-week cursor continuity, stable mutable browse traversal, durable or cross-process cursor guarantees.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Keep ranked continuation eligibility narrower than a fresh search](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-continuation-freshness/specs/recipe-search/spec.md): `Cuisine changes`; `Ranked state changes`.
  - [Reject unavailable or incompatible continuation state](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-continuation-freshness/specs/recipe-search/spec.md): `Unknown token`; `Changed preferences`; `Changed batch size`.

### BSL-recipe-search-021

- **Behavior and actor:** Continuation recovery and stale-response guards (ordinary household member).
- **Entry state / trigger / observable outcome:** Continuation failure retains cards; current-generation409 exposes Restart search, other failures Load more; restart retains current search context.
- **Business rule and eligibility:** Success requires current request and promotion generations; initial effect also active flag.
- **Failure / cancellation / recovery:** Old failure only checks request generation, not promotion version; loading-more flags are not uniformly reset by runSearch. Browser has no AbortController.
- **Configuration and time assumptions:** State races around pending debounce/action boundaries remain outside guarantees.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/app/(app)/recipes/page.tsx][search-page-source] (requestGenerationRef; handleShowMore catch/finally; runSearch)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (RecipeSearchRequestError)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (409 restart guidance)
  - [api/src/RecipeApi/Controllers/RecipeController.cs](../../api/src/RecipeApi/Controllers/RecipeController.cs) (continuation exception catch)
- **Relevant test assertions and substitutions:** page.test.tsx: deferred older initial browse completion does not replace New search result; repeated continuation lock inspected. No direct continuation409 retry/restart assertion found in inspected page suite; source and contract support those controls. Browser hardening fallback is route-fulfilled, not service timeout.
- **API/implementation/test/documentation agreement:** Success guards narrower than all-race/all-failure immunity. Buttons implement attempts only; observer remains active while error flags set.
- **Evidence class and confidence:** implementation-supported / medium; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** No browser request cancellation, robust all-action timer cleanup, automatic successful recovery, failure-version immunity or network timing guarantee.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Retain cards and expose continuation retry or restart](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-continuation-freshness/specs/recipe-search/spec.md): `Continuation expired`; `Continuation fails otherwise`.
  - [Suppress obsolete search success without claiming network cancellation](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-continuation-freshness/specs/recipe-search/spec.md): `Older initial browse finishes`; `Old continuation finishes`.

### BSL-recipe-search-022

- **Behavior and actor:** Received invalidation and catalog/index freshness limits (ordinary household member).
- **Entry state / trigger / observable outcome:** slot_updated/week_updated/fill_the_gap_invalidated advance Search version if prior handler work returns; browse effect reruns current state; non-browse does not auto-rerun.
- **Business rule and eligibility:** Old-version cards and Surprise Me withheld. Shared event delivery stays household-live-updates; no unconditional fresh data guarantee.
- **Failure / cancellation / recovery:** Local report resolution/edits do not notify parent; only deletion callback refreshes. Indexing is asynchronous lexical-before-vector with stale fingerprint guards.
- **Configuration and time assumptions:** Saved affinity/cuisine snapshot can be stale; no metadata reread after first chooser attempt.
- **Ordered trace / relevant source symbols:**
  - [pwa/src/hooks/useScheduleStream.ts](../../pwa/src/hooks/useScheduleStream.ts) (slot_updated; week_updated; fill_the_gap_invalidated)
  - [pwa/src/store/searchPromotionStore.ts](../../pwa/src/store/searchPromotionStore.ts) (invalidate)
  - [pwa/src/app/(app)/recipes/page.tsx][search-page-source] (promotion refresh effect; isPromotionDataCurrent)
  - [pwa/src/components/recipes/RecipeDetailSheet.tsx](../../pwa/src/components/recipes/RecipeDetailSheet.tsx) (local resolution/update state)
  - [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) (searchRecipes)
  - [specs/openapi.yaml](../../specs/openapi.yaml) (search operations; continuation)
  - [api/src/RecipeApi/Services/SearchIndexWorkflow.cs](../../api/src/RecipeApi/Services/SearchIndexWorkflow.cs) (IndexRecipeInternalAsync)
  - [api/src/RecipeApi/Services/RecipeSearchDocumentBuilder.cs](../../api/src/RecipeApi/Services/RecipeSearchDocumentBuilder.cs) (Build)
  - [api/src/RecipeApi/Services/RecipeService.cs](../../api/src/RecipeApi/Services/RecipeService.cs) (search pending update/index dispatch)
- **Relevant test assertions and substitutions:** page.test.tsx: invalidation causes browse new initial request and fresh fixture result; retains filters/Focus/planner context. useScheduleStream.test.ts asserts Search version increments on received events. SearchIndexWorkflowTests and HybridSearchTests stale job assert newer ready document not overwritten; provider/workflow substitutes. No live SSE/database/browser run.
- **API/implementation/test/documentation agreement:** Accepted live-update Signal candidate freshness separately from fetching results and recipe-quality Reflect persisted resolution in subsequent successful reads preserve U82. Index failure can leave lexical ready with failed embedding, not a failed Search UI guarantee despite workflow comment.
- **Evidence class and confidence:** implementation-supported / medium; test assertions inspected, not run.
- **Check command / outcome / environment / content identity:** runtime/API/database/browser/model checks not-run by authorization; static trace at recorded HEAD plus source SHA-256 table below. Artifact check outcomes are in Verification.
- **Open question or explicit limitation:** Ranked invalidation can leave loader until another manual search; no immediate loaded-parent refresh, continuation/report freshness, guaranteed index completion, semantic model qualification or replay.
- **Disposition:** accepted/promoted SR-P01; implementation-supported, runtime qualification not-run under A34.
- **Requirement and every scenario mapping:**
  - [Restart mounted browse after received promotion invalidation](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-continuation-freshness/specs/recipe-search/spec.md): `Browse invalidated`; `Ranked data invalidated`.
  - [Return from Search detail to mounted results](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-entry-results/specs/recipe-search/spec.md): `Close a card`; `Open another linked identity`.
  - [Refresh Search after a successful detail deletion](../../openspec/changes/archive/2026-10-16-baseline-recipe-search-entry-results/specs/recipe-search/spec.md): `Deleted card`; `Deletion rejected`.

## Source and dependency content identity

SHA-256 of inspected inputs at reconciliation; source hashes are rechecked before
completion. Later source/owner edits require affected claims to be rechecked.

| Repository-relative input | SHA-256 |
| --- | --- |
| [.agents/core/execution-harness.md](../../.agents/core/execution-harness.md) | `07bad376f6af0bcc2df3fda6401ef1170f9b93ba1a60da4655277005060959c3` |
| [Taskfile.yml](../../Taskfile.yml) | `c29b20235a44e5d078e8946fe3538324c9f67e11d176861bf194661617c3e0c6` |
| [api/database/schema.sql](../../api/database/schema.sql) | `3f7767cd704299374ebdcd89a11709680013ba26a477ad23f41da54e6da55161` |
| [api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs](../../api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs) | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| [api/src/RecipeApi.Tests/Integration/Fixtures/HybridRecipeSearchBaselineFixture.cs](../../api/src/RecipeApi.Tests/Integration/Fixtures/HybridRecipeSearchBaselineFixture.cs) | `8c5da6e2953bc0ce71f6409db285622a66811502e897cd2262e58cc2badc5e05` |
| [api/src/RecipeApi.Tests/Integration/HybridRecipeSearchBaselinePostgresTests.cs](../../api/src/RecipeApi.Tests/Integration/HybridRecipeSearchBaselinePostgresTests.cs) | `8d060a451b50aab6457aa8320efe6e78b983a2ad065ac539e434a668a6bf0e30` |
| [api/src/RecipeApi.Tests/Integration/HybridSearchTests.cs](../../api/src/RecipeApi.Tests/Integration/HybridSearchTests.cs) | `404cbc9a18008e6521e7110c29e73009a24f0d08ccd3375bc755c2bd737ea852` |
| [api/src/RecipeApi.Tests/Integration/RecipeLexicalSearchPostgresTests.Filters.cs](../../api/src/RecipeApi.Tests/Integration/RecipeLexicalSearchPostgresTests.Filters.cs) | `f1f13414491bdec61067d840f5796a5adaefd4d7d1fadcf56ec0ddf3fb84acc6` |
| [api/src/RecipeApi.Tests/Integration/RecipeLexicalSearchPostgresTests.Similar.cs](../../api/src/RecipeApi.Tests/Integration/RecipeLexicalSearchPostgresTests.Similar.cs) | `f57d0b614b07ff9ed393b5cf7b777f3a93b3e4e01ce72728977edf21894bd660` |
| [api/src/RecipeApi.Tests/Integration/RecipeLexicalSearchPostgresTests.cs](../../api/src/RecipeApi.Tests/Integration/RecipeLexicalSearchPostgresTests.cs) | `9e6fc2f071f3172f54609a0d3289c6e5f6361b77b602fe32ec0e9330e35b5087` |
| [api/src/RecipeApi.Tests/Integration/RecipeSearchFilterDiscoveryIntegrationTests.cs](../../api/src/RecipeApi.Tests/Integration/RecipeSearchFilterDiscoveryIntegrationTests.cs) | `3b9932450e4f4b36c53505d75da218219f92e7bc0a2c2ed6aef6792bd861abbe` |
| [api/src/RecipeApi.Tests/Integration/RecipeSearchIntegrationTests.cs](../../api/src/RecipeApi.Tests/Integration/RecipeSearchIntegrationTests.cs) | `27fc0d86492bcaa25f440543e65ff5e4df5f05f3e1fc315bc4c6b73bd9aa1ce6` |
| [api/src/RecipeApi.Tests/Services/RecipeSearchFilterMaterializerTests.cs](../../api/src/RecipeApi.Tests/Services/RecipeSearchFilterMaterializerTests.cs) | `915483ca67dea3d60a6be77a17000ebd544c8ff5dcf170033df69549a03d7794` |
| [api/src/RecipeApi.Tests/Services/RecipeSearchFilterOptionsTests.cs](../../api/src/RecipeApi.Tests/Services/RecipeSearchFilterOptionsTests.cs) | `747ae565debad0259df15fcb319d2d7221486f8b801490ae4822ccb776fb355e` |
| [api/src/RecipeApi.Tests/Services/SearchIndexWorkflowTests.cs](../../api/src/RecipeApi.Tests/Services/SearchIndexWorkflowTests.cs) | `df6a5b1e6eaf80a85ef2ddea54fd6fc09af08ca84c8042814b8dd866a06cc389` |
| [api/src/RecipeApi/Controllers/RecipeController.cs](../../api/src/RecipeApi/Controllers/RecipeController.cs) | `d1699c2de6f6cca9d879e67c0c7b9c7f0af4b2c4e104bc9ff04634b266eb5a70` |
| [api/src/RecipeApi/Data/RecipeDbContext.cs](../../api/src/RecipeApi/Data/RecipeDbContext.cs) | `92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447` |
| [api/src/RecipeApi/Dto/RecipeSearchRequestDto.cs](../../api/src/RecipeApi/Dto/RecipeSearchRequestDto.cs) | `df6479026539772b77350408104d290bf399a055dd8b58d5228b2cc4a035f9ed` |
| [api/src/RecipeApi/Models/RecipeSearchAffinityFact.cs](../../api/src/RecipeApi/Models/RecipeSearchAffinityFact.cs) | `d732f98a4e50e6069a2cc018d5247e41f773d55c15c4250cde900eb5b31287dd` |
| [api/src/RecipeApi/Models/RecipeSearchFilterState.cs](../../api/src/RecipeApi/Models/RecipeSearchFilterState.cs) | `b8d82aeeb1440fae16f3e5778d1d78e582504edd6b05e7e1d4b31eaee2b281b5` |
| [api/src/RecipeApi/Program.cs](../../api/src/RecipeApi/Program.cs) | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |
| [api/src/RecipeApi/Services/DiscoveryService.cs](../../api/src/RecipeApi/Services/DiscoveryService.cs) | `d441c27013fa3c5f329b336c400ee523307ec8f6bf18e3e5b5bcadf653629adb` |
| [api/src/RecipeApi/Services/RecipeImportReportService.cs](../../api/src/RecipeApi/Services/RecipeImportReportService.cs) | `99776d8ddfb954d0def99460d868d43a3f3f24e08c4459bd30c132959e30acb3` |
| [api/src/RecipeApi/Services/RecipeLexicalSearchRepository.cs](../../api/src/RecipeApi/Services/RecipeLexicalSearchRepository.cs) | `4e46ed444e8b5a0c72836d9c96047cf2cd4554929117cada245cace5a98e0e71` |
| [api/src/RecipeApi/Services/RecipeSearchContinuationStore.cs](../../api/src/RecipeApi/Services/RecipeSearchContinuationStore.cs) | `4802100fb948856c0ca3eab415c17b448c7ac843ee952b9aa2e104391d6457b7` |
| [api/src/RecipeApi/Services/RecipeSearchDocumentBuilder.cs](../../api/src/RecipeApi/Services/RecipeSearchDocumentBuilder.cs) | `588b608ad1cb1b27315d2282326703bb84cf9acc2d5bc66c45246ab5c4df2767` |
| [api/src/RecipeApi/Services/RecipeSearchFilterMaterializer.cs](../../api/src/RecipeApi/Services/RecipeSearchFilterMaterializer.cs) | `d22d18ff83159625452a6641b78923cc5ec2492139491ec95b86d038b1cfa5da` |
| [api/src/RecipeApi/Services/RecipeSearchFilterOptions.cs](../../api/src/RecipeApi/Services/RecipeSearchFilterOptions.cs) | `d08eef119705f5bdb6c840bf7ae29d01b3ac31577a4d94f003b20709969c5a06` |
| [api/src/RecipeApi/Services/RecipeSearchPredicate.cs](../../api/src/RecipeApi/Services/RecipeSearchPredicate.cs) | `188a9a6285d5762f275fe16c3a7cc62f1f25395ddc59ae51a2b17d1c36d82e9b` |
| [api/src/RecipeApi/Services/RecipeSearchService.cs](../../api/src/RecipeApi/Services/RecipeSearchService.cs) | `31e2bf8a197582b4852ce3a98820827504f410a5ae281bc3a247aa19b5674377` |
| [api/src/RecipeApi/Services/RecipeSemanticSearchRepository.cs](../../api/src/RecipeApi/Services/RecipeSemanticSearchRepository.cs) | `55e0ef03fca3480d752c05bce2cbbcb3e8340926012cea306996157236f0579d` |
| [api/src/RecipeApi/Services/RecipeService.cs](../../api/src/RecipeApi/Services/RecipeService.cs) | `9eec9ab5cd7102081b3765b08a41b8de4d45325858d18ab4573a326afa256b74` |
| [api/src/RecipeApi/Services/RecipeSimilarityScorer.cs](../../api/src/RecipeApi/Services/RecipeSimilarityScorer.cs) | `d07dec49a618c4085e5afe2fef06718b0baa345a0fbd7014905c0ddb6166b6f3` |
| [api/src/RecipeApi/Services/ScheduleService.cs](../../api/src/RecipeApi/Services/ScheduleService.cs) | `8c1e8403f759425b8882eecb26f2bc8f4c9692f81bcf6e9bc3777c78013c40ec` |
| [api/src/RecipeApi/Services/SearchIndexWorkflow.cs](../../api/src/RecipeApi/Services/SearchIndexWorkflow.cs) | `a1f11d78e11734cd8bbead72d85448549691e6bee4a4ef69c691da337395bf7b` |
| [api/src/RecipeApi/Services/SettingsService.cs](../../api/src/RecipeApi/Services/SettingsService.cs) | `e2b46104f51321992cd8a3ed3fbcb99a17b6a3dd34ae21d3bdd256055faa5572` |
| [docs/flows/data-flows/recipe-search-index-and-recovery.md](../../docs/flows/data-flows/recipe-search-index-and-recovery.md) | `9ec24f8bee5e76acdf6f456ec5610dbdd1fded758db3eee1b463df3f770e0a41` |
| [docs/flows/user-flows/recipe-search-and-library-recovery.md](../../docs/flows/user-flows/recipe-search-and-library-recovery.md) | `7b89569eb8b2514470b5639141f7886159700de734cea357278426450e9fad56` |
| [docs/user-guide.md](../../docs/user-guide.md) | `0e37a5178897e2e82699c3e5b9585bc774be81c5c74644c77249169e3f95cd2d` |
| [openspec/specs/household-live-updates/spec.md](../../openspec/specs/household-live-updates/spec.md) | `1c1c906831ca1770e2afd8174bdd31f5447b67d48b0325fc52e353c12ce28de6` |
| [openspec/specs/meal-planning/spec.md](../../openspec/specs/meal-planning/spec.md) | `96467d593b80c53d6582502c1f798caa741a22ca13e374265a03f8a0360df9f6` |
| [openspec/specs/recipe-discovery/spec.md](../../openspec/specs/recipe-discovery/spec.md) | `e5c764fce830ce637a6faf2a0a186f34bf5b053ba902ab44b2dd0b27d107efb9` |
| [openspec/specs/recipe-library/spec.md](../../openspec/specs/recipe-library/spec.md) | `7fd80218a8551dba51d70f057f82d40cce9cd3fe5356c6d3d82d6a07a4f857d2` |
| [openspec/specs/recipe-quality/spec.md](../../openspec/specs/recipe-quality/spec.md) | `8e564c9f00e9ee157cfff812c90d8d23c343d0a99a529143c9512c2d751f61c9` |
| [pwa/e2e/fixtures.ts](../../pwa/e2e/fixtures.ts) | `402b5a1b872f625dc1425f46afdede2c9378dcc473088159774a8455b5d188e2` |
| [pwa/e2e/recipes.spec.ts](../../pwa/e2e/recipes.spec.ts) | `b41683a89d6b1704ecf0a447fdf6493f60314b45b62b3f60143ec190e9eaaa51` |
| [pwa/e2e/search-hardening.spec.ts](../../pwa/e2e/search-hardening.spec.ts) | `5ced566ad08583dd75abf434d0a15bc6c5be0e380483f7147cbc29e9b1bf6a03` |
| [pwa/src/app/(app)/recipes/page.test.tsx][search-page-tests] | `4e43afaf0d59302a1c219fba02e5df5c08bb03e143dc4d2c8f9b0393f69257e6` |
| [pwa/src/app/(app)/recipes/page.tsx][search-page-source] | `18b9605e8078e8ee46674a0e781836886697ce18e9166c0591aeac6c8fe78bb4` |
| [pwa/src/components/common/Navigation.tsx](../../pwa/src/components/common/Navigation.tsx) | `58a6d6011fd9027f4cfa3e0e654ffd5a2964f1ffe7e458bd3e60d4d03e282d78` |
| [pwa/src/components/recipes/RecipeDetailSheet.tsx](../../pwa/src/components/recipes/RecipeDetailSheet.tsx) | `bbc1bba8f16f3fa305775d072cb1c3850af34a24bd3979e2228b63984ca1a19c` |
| [pwa/src/components/recipes/RecipeFiltersSheet.tsx](../../pwa/src/components/recipes/RecipeFiltersSheet.tsx) | `c588ae862e5482fcbd64c16803705829e3cd73b7d8f47b7628d3737bb8782e78` |
| [pwa/src/components/recipes/RecipeImportIssueBadge.tsx](../../pwa/src/components/recipes/RecipeImportIssueBadge.tsx) | `9b95eac67d842a064c9a54a3b94f87a93c4664153a51646e11b7da8ff625b5e3` |
| [pwa/src/hooks/useScheduleStream.test.ts](../../pwa/src/hooks/useScheduleStream.test.ts) | `cb10d4613fb4430cfc8b9e33c494f8ae9051a079048dc34da376f40e0575acef` |
| [pwa/src/hooks/useScheduleStream.ts](../../pwa/src/hooks/useScheduleStream.ts) | `0e1f1b91e459b77fd90ca6a071ff5cb8fc0cbcc64e8cab54a00b8232c9ab2107` |
| [pwa/src/lib/api/generated/api/recipes/search/filters/index.ts](../../pwa/src/lib/api/generated/api/recipes/search/filters/index.ts) | `4c03007dab6510cc3bffcd296ba139eefe65305acbe82ffc5dcde2874cf1088a` |
| [pwa/src/lib/api/generated/api/recipes/search/index.ts](../../pwa/src/lib/api/generated/api/recipes/search/index.ts) | `a3515a1910d6028767770a4080284e1d47bdfcf475e9257da3d2f1d33d6f3666` |
| [pwa/src/lib/api/recipes.ts](../../pwa/src/lib/api/recipes.ts) | `f4e70b39a2060bfc5b25010914f78e288321517db5c52c543d103502718dce7a` |
| [pwa/src/lib/api/search-contract.test.ts](../../pwa/src/lib/api/search-contract.test.ts) | `987eb23bb72c716ae303643bd538537513c6b4e1cad44215057ae0fe6305128b` |
| [pwa/src/store/searchPromotionStore.ts](../../pwa/src/store/searchPromotionStore.ts) | `9b1fd64d9ea5549161233734a976392b1ba8cbd75333492296284784004e2fd8` |
| [pwa/src/store/weekStore.ts](../../pwa/src/store/weekStore.ts) | `e58ca9aaf2755fc5b95aacd0518d443456937febec82c0ab3955c8eb14cae3b8` |
| [specs/openapi.yaml](../../specs/openapi.yaml) | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |

## Verification and artifact status

- Individual strict validation: passed for all five selected changes after initial
  generation; rerun after final claim review. Complete-store strict validation and
  final scoped documentation verification are recorded in the session completion
  record below. No result establishes behavior acceptance.
- Exact final harness command is `task verify --` followed by this plan, the baseline
  index and every file under the five selected `baseline-recipe-search-*` changes
  listed in the coverage table. Include `.openspec.yaml`, proposal, design, delta
  spec and tasks: 27 paths in total. The harness record at
  the invocation-specific `.task/agent-finish/runs/<id>.json` identifies checked content and outcomes; `last-run.json` is a convenience copy that another invocation can replace;
  it is generated verification evidence, not an application edit.
- Application tests/test-first implementation: not-applicable to documentation-only
  extraction. Runtime/API/browser/device/PostgreSQL/model qualification: not-run by
  authorization. No runtime or database command was issued. No acceptance,
  promotion, archive, commit or deploy action is included.

## Session completion record (2026-10-16, SR-D01)

- Authorized outcome: complete ordinary-household supported draft scope, through
  all five bounded slices; disputed claims explicitly withheld, other journeys
  accounted for by accepted owners or reasoned deferrals.
- Completed discovery: BSL-recipe-search-001–022; U04/U09/U80/U82 rechecked.
- Artifact state: drafted for human review, not accepted or promoted. Capability
  baseline-complete remains false. No main recipe-search specification exists.
- Decisions needed: none blocking settled claims; SR-U01–U10 remain explicit
  limitations for review, not automatic implementation requests.
- Checks: the initial complete-store strict run passed 89/89 items. The first scoped verify (`.task/agent-finish/runs/c8994027d0e748bb82536013aebfee87.json`) failed documentation links because the simple inline-link parser truncated `(app)` paths; all five selected spec checks and content identity passed. Those file links now use standard reference syntax; no harness code is changed. Corrected scoped verification passed; its immutable record and final bookkeeping recheck are listed below. Existing unrelated
  staged/unstaged/untracked work is preserved; independent concurrent changes
  are reported separately if observed.
- Exact next lifecycle action: human review the five deltas in coverage-map order
  against their linked BSL entries and exclusions; settle any chosen consequential
  issue one at a time. Only a later explicit acceptance/promotion request may
  copy accepted requirements into `openspec/specs/recipe-search/spec.md` and
  mark accepted coverage. Do not apply application tasks or archive these drafts.

## Resume guidance

Re-read this checkpoint, CLI context and current Git state before further action.
The prior review-only execution template is superseded by SR-D01 for this session;
it must not accidentally limit the authorized successor drafting or authorize a
later promotion. Reuse settled decisions, preserve unrelated work, inspect changed
evidence identities and select only the newly authorized lifecycle action.

[search-page-source]: <../../pwa/src/app/(app)/recipes/page.tsx>

[search-page-tests]: <../../pwa/src/app/(app)/recipes/page.test.tsx>

### Recorded check outcomes and final handoff boundary

- **Passed:** all five selected `openspec validate <change> --strict --no-interactive`
  checks. `openspec validate --all --strict --no-interactive`: **89 passed, 0 failed**
  on the complete store. Informational archive-conflict notices concern unrelated
  previously promoted capture/library deltas and do not fail validation or authorize
  archival.
- **Passed after correction:** `task verify -- <all 27 task-owned paths>`:
  documentation links/whitespace, selected `spec:check` and content identity all
  passed in `.task/agent-finish/runs/e6a55d512e3645408c44877515635bab.json`.
  This record identifies its pre-bookkeeping content. Final bookkeeping updates
  in this plan and all five task files are followed by another identical scoped
  verification; use that invocation's immutable record reported at handoff for the
  final content identity. This avoids attaching an old digest to edited documents.
- **Passed:** all 39 distinct requirements and 90 named scenarios have BSL mappings;
  each source link/file was checked; descriptions fit schema limits; source and
  dependency identities are rechecked before completion; selected deltas remain
  separate from main specs. The staged binary diff is unchanged by this task.
- **Failed, corrected:** first `task verify` link check truncated inline `(app)`
  paths; files existed. Switched only those links to valid reference-style links
  and checked targets independently. Selected spec/content checks already passed.
- **Blocked:** none for the settled draft set. Disputed claims remain withheld in
  SR-U01–U10, rather than treated as successful qualification.
- **Not-run:** live API, runtime, browser/device, PostgreSQL, external model,
  database and SSE delivery qualification, as authorized.
- **Not-applicable:** application test-first implementation, application unit/API/E2E
  tests, lint/types/client generation and migrations for this documentation-only work.
- **Pending human lifecycle:** review, acceptance and promotion. The capability is
  not baseline-complete; no archival or application implementation is requested by
  checked documentation tasks.


## Resume verification and review handoff (SR-D05)

- **Passed:** fresh strict, non-interactive validation for each of the five named
  changes; required artifact closure exists under the resolved `spec-driven`
  workflow. No artifact was duplicated or missing.
- **Passed:** `openspec validate --all --strict --no-interactive`: **90 passed,
  0 failed**, with all 422 OpenSpec file identities stable across the command.
  This current store count supersedes earlier 89-item snapshots; unrelated
  member-preferences generation/promotion was observed and left intact.
  Existing capture/library archive-conflict notices were informational, not
  failures; no unrelated artifacts were edited.
- **Passed:** exact requirement/scenario-to-BSL coverage check: **39/39 distinct
  requirements and 90/90 scenarios**, 22 populated BSL entries, no missing or
  stale named scenario mappings; source/dependency SHA-256 entries agree with
  the current files. Requirement descriptions satisfy the installed length rule.
- **Scope review:** retained all existing edits and concurrent plan/task/index
  bookkeeping, inspected the selected deltas and the reconciliation against
  before-images, and confirmed the staged binary diff is unchanged. Only the
  authorized plan/change/index scope is selected for final verification;
  concurrent member-preferences artifacts are outside this task's claims.
- **Final repository check:** run `task verify --` with the 27 repository-relative
  paths in the coverage scope (plan, index and all five files in each change).
  The immutable `.task/agent-finish/runs/<id>.json` returned by that invocation
  and reported in the final response is authoritative for the final identity;
  earlier records above remain historical. Do not append its outcome to these
  inputs after verification, since that would invalidate the checked identity.
- **Failed/blocked:** none in the fresh selected/global validation or coverage
  checks. The historical corrected link failure remains recorded above.
- **Not-run/deferred under A34:** all runtime/live API/browser/device/PostgreSQL,
  network/SSE and model qualification. **Not-applicable:** application tests,
  test-first implementation, client generation, migrations and deployment.
- **Review state:** artifacts validated; human review pending; acceptance pending;
  main search spec absent and promotion unperformed; baseline-complete false.
  U04/U09/U80/U82, SR-U01–U10 and SR-X01–X04 remain visible limitations/exclusions.
- **Exact next action:** human review entry/results → filters/state → retrieval
  modes → ranking/promotion → continuation/freshness against each mapped BSL
  entry. Resolve any chosen disputed assertion one at a time before adopting it.
  Acceptance and main-spec promotion require a later explicit lifecycle request;
  no application apply or archive follows from these documentation tasks.


## Acceptance and promotion record (SR-P01, 2026-10-16)

- **Authorization:** the user's “promote” follows presentation of the five validated
  drafts and accepts their settled scope for main-spec promotion. It does not
  authorize disputed assertions, runtime qualification, application work or archive.
- **Identity:** branch `moving-to-openspec`, HEAD
  `04a1c4570f9bbb01b47436790d4248635ac3179a`; 196 staged paths, 13 unstaged
  paths, 127 untracked files and no tracked deletions before this operation.
  Complete path inventories, binary staged/unstaged diffs and selected before-images
  are retained in
  `/var/folders/7x/450tvgfj1lg2gx9p89txzx0w0000gn/T/recipe-search-promote-iiogx32e/`.
  Relevant dirty inputs are the existing five changes, capability plan/index,
  accepted owner specs and verification harness. Existing edits are preserved.
- **Workflow:** installed openspec-sync-specs skill; fresh CLI context/list/store
  resolution confirmed nearest repository root, no registered store and repo
  planning home. Status returned each selected delta's concrete path; current
  specs instructions/rules were resolved successfully for all five changes.
- **Merge:** created the previously absent main spec at
  [openspec/specs/recipe-search/spec.md](../../openspec/specs/recipe-search/spec.md),
  with the first delta's Purpose verbatim and one Requirements section. Added all
  39 distinct requirement blocks and 90 scenarios in coverage-map order without
  changing their wording. No MODIFIED, REMOVED or RENAMED operation was needed;
  no delta operation headers or evidence/uncertainty narrative entered the main spec.
- **Evidence mapping:** BSL-recipe-search-001–022 now have accepted/promoted
  disposition. Their existing requirement titles and scenario names identify the
  identical blocks in the main spec as well as the retained source deltas.
  All ten discovery fields, assertion substitutions, source identities and shared
  owner references remain available; no new policy or runtime guarantee is added.
- **Limitations:** U04/U09/U80/U82, SR-U01–U10 and SR-X01–X04 remain non-normative
  limitations/exclusions. Source-supported acceptance does not repair contract
  drift, unused fields, incomplete error/freshness paths or deferred integrations.
- **Artifact lifecycle:** main spec promoted; human acceptance recorded for all
  five settled deltas. Changes remain active and unarchived; extraction tasks
  remain documentation tasks. Current promotion validation/check results follow.
- **Runtime:** not-run/deferred under A34; application tests and test-first
  implementation are not-applicable to this documentation promotion.
- **Exact next action:** use the promoted recipe-search spec as the accepted
  documentation baseline for this bounded ordinary-household scope. Await a
  separately selected uncertainty resolution, runtime qualification or lifecycle
  action; do not extract successors, implement repairs or archive automatically.


### SR-P01 promotion validation and completion boundary

- **Passed:** `openspec validate recipe-search --type spec --strict --no-interactive`;
  `openspec validate --specs --strict --no-interactive` (**13 passed, 0 failed**);
  each of the five selected changes with `--type change --strict --no-interactive`.
- **Passed:** exact merge equality (39 distinct requirements / 90 scenarios),
  original Purpose retained, one main Requirements section, no delta operation
  headers, source deltas byte-identical to their pre-promotion before-images,
  complete BSL coverage, all 22 evidence dispositions accepted/promoted, and
  unchanged source/dependency SHA-256 identities.
- **Failed — unrelated global check:** `openspec validate --all --strict --no-interactive`
  returned **93 passed, 1 failed (94 items)** on a store stable across the command
  (434 file identities). `baseline-tonight-meal-decisions-goto-choices` had no delta
  spec. This concurrently created capability is outside recipe-search promotion;
  no repair or lifecycle action was taken on it. Existing capture/library archive
  conflict notices were informational. This failure is not a recipe-search failure
  and does not establish a passing repository-wide reconciliation.
- **Final scoped repository verification:** `task verify --` selects 28 paths:
  the main search spec, capability plan, baseline index and all 25 files under
  the five selected changes. Review links, whitespace, exact scoped diff and
  preservation before that invocation; its immutable record is reported at handoff.
  Do not edit these inputs afterward to attach a stale digest to new content.
- **Blocked:** none for this accepted promotion. **Not-run:** live API/runtime,
  browser/device, PostgreSQL, network/SSE and model qualification under A34.
  **Not-applicable:** application test-first work, application test suites,
  client generation, SQL migrations and deployment.
- **Current lifecycle:** the five-slice ordinary-household documentation scope is
  accepted, promoted and validated; all deferred/excluded behavior remains visible.
  Whole-repository reconciliation has the unrelated failure above. No claim of
  application/runtime qualification or coverage of excluded journeys is made.
  All five changes remain active and unarchived. Next action remains the bounded
  SR-P01 handoff above; no additional work is authorized by task checkboxes.
