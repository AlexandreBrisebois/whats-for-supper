# Grocery shopping baseline plan

## Current lifecycle checkpoint — consolidated, 2026-10-16

This capability's main spec now contains **37 requirements / 82 scenarios**.
All baseline source changes were archived after the user's explicit approval;
there is no active baseline extraction/promotion queue. Historical checkpoint,
next-session and "changes active" text below records earlier sessions only.
Evidence limitations and unresolved findings remain in the [live backlog](backlog/README.md).
See [consolidation completion](backlog/consolidation-completion.md) for accepted
scope, preserved corrections, archive warnings and verification. Archival does not
establish application correctness, runtime qualification or resolution of defects.

## Current checkpoint and scope

On 2026-10-16 the user accepted and authorized promotion of all seven reviewed
ordinary-household grocery-shopping deltas by instructing “promote” (G06).
The [main grocery-shopping specification](../../openspec/specs/grocery-shopping/spec.md)
now contains **37 requirements / 82 scenarios**. All seven changes remain active
and unarchived. This is documentation acceptance/promotion, not application or
runtime/database/device qualification. U06/U100 and G-U01–G-U07 remain unchanged.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md), then this file.
The current user request authorizes discovery, evidence reconciliation and all
necessary documentation-only drafts, sequentially through the whole capability.
It supersedes the retained default review-only prompt below. Application changes,
tests, contracts, generated clients, SQL, configuration, dependencies, staging,
commits, publishing, deployment and qualification remain outside scope.

**Phase-12 reconciliation R12 (2026-10-16):** Recorded promoted documentation remains 37 requirements / 82 scenarios; no additional supported extraction gap was found within this plan's explicit boundary.
[Cross-capability review](reconciliation.md) records current inventory, shared-owner
reconciliation, evidence drift and exclusions. Current main SHA-256: `f30bac5e8d0eaff1c459b805a5ab4f868d28dd2453cef22fde626338dd63dd8c`.
This session grants no new acceptance or promotion. Earlier session-specific
“current user” and next-action statements retain their historical scope. A34 and
all local unresolved/excluded behavior remain in force; runtime checks are not-run.


## Source identity and preserved inputs

- Branch: `moving-to-openspec`; HEAD: `04a1c4570f9bbb01b47436790d4248635ac3179a`.
- Initial status and both staged/unstaged patches were captured privately before
  edits, with SHA-256 before-images for 1,726 tracked/untracked files. Executable
  grocery source, tests, OpenAPI, generated clients and SQL were clean relative
  to this commit and have not been edited by this task. This plan was clean;
  the index already had staged and unstaged edits.
- Relevant staged inputs: `openspec/specs/household-identity/spec.md`,
  `openspec/specs/meal-planning/spec.md`, `openspec/specs/recipe-library/spec.md`,
  `openspec/specs/household-live-updates/spec.md`,
  `openspec/specs/background-processing/spec.md`; their associated owner plans
  and existing baseline changes; `Taskfile.yml` and `.github/workflows/validate.yml`.
  These remain evidence/harness inputs owned by other work.
- Relevant unstaged input: `docs/openspec-baseline-plan.md` (also staged).
  Unrelated unstaged cooking/quality plans and untracked cooking/quality change
  directories were present. No grocery draft existed; no relevant deleted input
  or initial deletion was reported. No deleted navigation artifact was recreated.
- Concurrent changes observed during discovery: cooking/quality plans, quality
  main spec and three quality task files; new search artifacts also appeared. Later shared workflow/harness and Taskfile edits were also observed; none was made or reverted by this grocery task.
  Preserve these. The index was reread immediately before a one-row grocery
  replacement; every other byte of that pre-edit index remains owned by others.
- Installed OpenSpec root: `/Users/alex/Code/whats-for-supper`, source `nearest`,
  repo-local planning home, no selected or declared store; schema `spec-driven`.
  Resolved with `openspec context --json`, `list --json`, and `list --specs --json`.
  CLI scaffolded all `.openspec.yaml` files; instructions/status were read in
  proposal → specs/design → tasks dependency order for each change.

The dirty owner-spec content read during extraction has these SHA-256 identities
(the commit alone would not identify accepted working-tree requirements):

| Owner input | SHA-256 |
| --- | --- |
| `openspec/specs/household-identity/spec.md` | `4c7f5a1faafd5439ab6f261b1efb140a4b0c10643cf16d087874c3c52ee9b749` |
| `openspec/specs/meal-planning/spec.md` | `96467d593b80c53d6582502c1f798caa741a22ca13e374265a03f8a0360df9f6` |
| `openspec/specs/recipe-library/spec.md` | `7fd80218a8551dba51d70f057f82d40cce9cd3fe5356c6d3d82d6a07a4f857d2` |
| `openspec/specs/household-live-updates/spec.md` | `1c1c906831ca1770e2afd8174bdd31f5447b67d48b0325fc52e353c12ce28de6` |
| `openspec/specs/background-processing/spec.md` | `7023ac794f9119ec995215a431f9667934c69434a22815c2a9e40dbddc796e76` |

## Recorded decisions

| Decision | Authority and treatment |
| --- | --- |
| G01 | Current user request, 2026-10-16: generate the entire selected documentation-only capability through validated drafts, sequential bounded slices; no repeated slice-approval question. |
| G02 | Reuse shared A01–A05/A07/A09–A12/A34 from workflow.md: ordinary household first, implementation-supported evidence allowed, disputes withheld, runtime deferred. Demo, preview and Synology variants excluded. |
| G03 | Seven small deltas share `grocery-shopping`, because no main spec exists. Added requirements extract existing behavior; no application implementation or test-writing tasks. Seventh category-default slice follows the additional entry-point inventory. |
| G04 | U06/U100 remain qualifications. Contract wording and mock test names do not establish concurrency safety, full reconciliation or atomic visibility. |
| G05 | No consequential product question was needed to draft the supported subset. Withheld defects remain separate from acceptance of the supported requirements. |
| G06 | User instruction “promote”, 2026-10-16, accepts the seven reviewed deltas and authorizes their documentation-only merge into the main grocery-shopping spec. No archival, implementation or runtime qualification authorized. |

## Ten discovery fields

| Field | Current discovery |
| --- | --- |
| Name | Grocery shopping, ordinary household. |
| Business purpose | Turn scheduled recipe supplies into a sectioned shopping checklist and persist shared shopping progress. |
| Existing capabilities | Structured supply/text fallback, mechanical name normalization, unit conversion and aggregation, stored/default categories, manual correction, shared display-name checks, duplicate row rendering, full-map API and provider-assisted category caching. |
| Important workflows | Scheduled-needs extraction → quantities → sections/corrections → individual checks → week/read/recompute consequences → bulk API → processing category defaults. Each is mapped below. |
| Business rules | Date interval and ownership from meal planning; recipe facts from library/capture owners. Group by normalized name and unit bucket, not canonical UUID. Check by display name, category correction by normalized key. Unknown amounts/units remain bounded. |
| Source files | Ordered per-entry traces below; principal files are GroceryRecomputeService, IngredientNormalizer, UnitNormalizer, AisleMapper, IngredientCategoryService, CategorizeIngredientsProcessor, ScheduleService/Controller, WeeklyPlan, generated models and GroceryList/weekStore/useScheduleStream. |
| Tests | Actual assertions and substitutions are recorded per entry below. InMemory, mocked API/chat/publisher/workflow, and raw-wrapper test payloads limit the conclusions. Tests were inspected, not run. |
| Dependencies | Accepted household identity, calendar/read/navigation, recipe facts, workflow acceptance/lifecycle, and SSE delivery requirements listed below. No other capability expanded. |
| Uncertainties | U06/U100 plus G-U01–G-U07 below. Unsupported assertions are withheld; no runtime/database/device evidence. |
| Confidence | High for traced computation and local UI logic with aligned assertions; medium at raw snapshot, provider and concurrent/multi-step boundaries. No behavior marked Verified. |

## Accepted owner requirements consumed

These references identify existing accepted main requirements; grocery describes
local consequences without taking over their policy.

| Owner | Exact requirements and grocery consequence |
| --- | --- |
| [Household identity](../../openspec/specs/household-identity/spec.md) | “Authenticate protected API requests independently”; “Apply member context after household access”; “Carry browser member context on shared SDK requests”. Protected grocery operations consume access policy; direct-fetch grocery adapters send member context but do not gain all SDK interception behavior by inference. |
| [Meal planning](../../openspec/specs/meal-planning/spec.md) | “Return seven dates from the server UTC week”; “Select the planner week from the URL”; “Navigate relative weeks and return to this week”; “Read week status and stored adjuncts without creating a plan”; “Discard initialization results for a different selected offset”; “Retain content after missing or failed initialization reads”; “Complete defer after affected-week follow-ups”. Groceries use that selected offset and stored adjuncts, not a second calendar policy. Calendar assignment, replacement, movement, deferral, clearing and non-cooking eligibility stay with this owner. |
| [Recipe library](../../openspec/specs/recipe-library/spec.md) | “Display returned ingredient strings in detail”; “Represent persisted recipe attribution and readiness”; “Read stored array instructions through recipe detail”. Grocery consumes persisted recipe ingredient text/raw metadata only; no multilingual identity, readiness or acquisition policy is inferred from presentation requirements. |
| [Household live updates](../../openspec/specs/household-live-updates/spec.md) | “Apply available snapshot adjuncts conditionally”; “Reconcile only the displayed snapshot week”; “Defer day replacement during local moves”; “Attempt grocery check-map publication at supported saves”; “Replace received grocery checks only for the loaded week”; “Bound delivery to current process registrations”. Reuse these for raw snapshot limitations, conditional publication, week filtering and delivery bounds; no new transport guarantee. |
| [Background processing](../../openspec/specs/background-processing/spec.md) | “Bind generic workflow trigger parameters without an API schedule”; “Apply shared household authentication to generic workflow operations”; “Record processor execution and successful task completion”; “Promote dependencies after successful task completion”. The API-only recategorization entry consumes these; grocery owns the processor's cache/default result, not task acceptance or retries. |

No required owner assertion was fabricated. Broader recipe eligibility, translation,
provider quality, universal refresh and delivery claims have no sufficient owner
plus executable support and remain withheld.

## Slice status and complete journey accounting

All rows below are **accepted / promoted under G06**; individual draft validation
preceded promotion. Changes remain active and unarchived.
Dependencies indicate review order, not a request to implement them.

| Order / change | Coverage | Requirements / scenarios | Evidence |
| --- | --- | --- | --- |
| 1. [scheduled-needs](../../openspec/changes/archive/2026-10-16-baseline-grocery-shopping-scheduled-needs/proposal.md) | Scheduled recipe needs | 5/11 | BSL-grocery-shopping-001 |
| 2. [aggregation-quantities](../../openspec/changes/archive/2026-10-16-baseline-grocery-shopping-aggregation-quantities/proposal.md) | Normalization, aggregation and amount display | 6/15 | BSL-grocery-shopping-002 |
| 3. [sections-corrections](../../openspec/changes/archive/2026-10-16-baseline-grocery-shopping-sections-corrections/proposal.md) | Sections and manual corrections | 7/15 | BSL-grocery-shopping-003 |
| 4. [individual-checks](../../openspec/changes/archive/2026-10-16-baseline-grocery-shopping-individual-checks/proposal.md) | Individual checks and duplicate rows | 7/15 | BSL-grocery-shopping-004 |
| 5. [week-refresh-boundaries](../../openspec/changes/archive/2026-10-16-baseline-grocery-shopping-week-refresh-boundaries/proposal.md) | Week reading, refresh and reconciliation boundaries | 7/15 | BSL-grocery-shopping-005 |
| 6. [bulk-check-map-api](../../openspec/changes/archive/2026-10-16-baseline-grocery-shopping-bulk-check-map-api/proposal.md) | API-only full check-map replacement | 2/4 | BSL-grocery-shopping-006 |
| 7. [category-default-processing](../../openspec/changes/archive/2026-10-16-baseline-grocery-shopping-category-default-processing/proposal.md) | Category defaults from processing | 3/7 | BSL-grocery-shopping-007 |

| Discovered journey/boundary | Disposition |
| --- | --- |
| Supply preference, fallback, names, quantities, contributors and empty persisted lists | Drafted 001/002; structured facts are consumed, not redefined as recipe-owner rules. |
| Section default/cache priority, display order, picker cancel/no-op/pending/failure/retry and stale correction response | Drafted 003. Arbitrary incomplete/duplicate configuration defects remain G-U03. |
| Check/uncheck, sequential persistence, shared duplicates, per-item rollback, amounts, counts, keyboard checkbox activation and collapsible regions | Drafted 002/004. Bulk UI is absent; do not invent check-all controls. |
| Week URL/navigation, calendar interpretation, schedule status/read and calendar operation eligibility | Already covered by accepted meal-planning owner. Grocery local display/load consequences drafted 005. |
| Assignment/replacement/removal, cross-week move and deferral recomputation; same-week movement | 005 covers affected persisted needs; deferral recomputation is already covered by the accepted “Complete defer after affected-week follow-ups” owner requirement. Same-week reorder does not change the recipe supply set. Assignment displacement can recompute the next week, as traced in ScheduleService.AssignRecipeAsync. Owner retains assignment/deferral/non-cooking policy. |
| sync() vs init(), snapshot, pending moves, failure retention and stale responses | 005 plus accepted live-update owner; `weekStore.sync` refreshes schedule/status but not grocery adjuncts. This incomplete path is G-U04, not a full-refresh requirement. |
| Raw connected/week_updated dictionary, grocery_updated map-only event, echo behavior, reconnect/delivery | Accepted live-update owner, U100/G-U05; no new complete reconciliation claim. |
| Check-map retention and normalization merge/rename migration | Drafted 005; general retention assertions with previousItems=[] do not negate supported transitions. |
| Full-map bulk PATCH and adapter, including clearing/unchecking and removed keys | API-only slice 006 after household journeys; no UI caller found. |
| Cached/provider category defaults, validation, failure fallback and generic recategorize workflow | Drafted 007; trigger/lifecycle accepted background owner. Subsequent grocery propagation is withheld under G-U06. |
| Backup/restore export/import of ingredient categories in ManagementService | Separate backup-recovery owner; excluded from grocery shopping. No management behavior extracted or edited. |
| Demo, preview, Synology variants; provider, database, concurrency, browser/device qualification | Explicitly deferred under shared decisions and current request. No service launches or dependencies installed. |

## Discrepancies and non-normative qualifications

| ID | Current source/evidence and treatment | Status |
| --- | --- | --- |
| U06 | `GroceryRecomputeService` groups normalized name/unit, not multilingual registry IDs. `ScheduleService.ToggleGroceryItemAsync` reads and rewrites the full JSON map without atomic key mutation or a concurrency token. OpenAPI and generated item-builder comments claim atomic concurrent merges; withhold that disputed guarantee. Duplicate rendered rows share display-name checks. | Rechecked; stronger identity/concurrency claims withheld. |
| U100 | `StreamController` serializes plain dictionaries, `useScheduleStream` JSON.parse forwards them, and `weekStore.applySnapshot` reads only groceryState.additionalData. Eligible snapshots replace groceryItems while retaining the loaded check map when that wrapper is absent. Separate week/planner writes expose ordered notifications. | Rechecked; no complete connected reconciliation or atomic multi-store visibility. |
| G-U01 | `IngredientCategoryService` and tests persist source manual; OpenAPI says human. No normative source-marker spelling. Stored section validation is case-insensitive but does not canonicalize casing. | Contract disagreement recorded; no contract/code repair. |
| G-U02 | `ExtractSupplies` catches JSON syntax errors and numeric extraction, not every wrong node kind. Text ingredients have no parsed quantity; mixed known/unknown contributions sum only known numbers. | No total malformed-input resilience, complete quantity or serving-scale promise. |
| G-U03 | `aisleOrder.parseAisleOrder` accepts partial lists and duplicates, including lists without Grocery. Group fallback can become invisible or listed sections can repeat. | Default-order behavior drafted; arbitrary configuration completeness/uniqueness withheld. |
| G-U04 | `init` checks only current offset equality. Same-offset overlap, away-and-back requests, `assignRecipe` follow-up and item-failure rollback do not have universal freshness guards. `sync` does not set groceryItems/checks. | No universal stale-response, offline or full-refresh guarantee. |
| G-U05 | Direct-fetch check/category adapters use base URL/member header, bypass shared SDK auth/connection interception. Persistence precedes publication and category save precedes recomputation. Missing-plan check writes throw; grocery endpoint contracts do not declare its status. | No all-or-nothing save/publication/recompute guarantee, exact missing-plan HTTP status or universal echo exclusion. |
| G-U06 | `CategorizeIngredientsProcessor` does not recompute lines after category saves; import workflows sync/recompute before categorization; recategorize workflow runs category then RecipeReady. It does not verify returned keys belong to the request or range-check confidence. | No immediate propagation, provider-output correctness, forced recategorization or validated confidence claim. |
| G-U07 | InMemory ingredient recomputation uses string containment; production uses PostgreSQL JSON containment. Factories/auth/provider/publisher substitutions are not deployed parity. No current application checks. | Runtime/database/device/provider qualification deferred, not passed. |

## Slice evidence and requirement/scenario mappings

Evidence class throughout is implementation-supported (or missing/incomplete for
the expressly withheld paths), never Verified. Source paths below are relative to
the repository root. All entries share the recorded HEAD, clean executable input
identity and dirty owner-spec identities above. No relevant grocery application
input was edited. Check outcome: documentation checks described in the session;
application behavior checks **not-run**, as authorized scope excludes them.


Inspected assertion files (all test execution remains not-run):

| Layer | Repository-relative test files |
| --- | --- |
| Derivation/amounts | `api/src/RecipeApi.Tests/Services/GroceryRecomputeServiceTests.cs`, `api/src/RecipeApi.Tests/Utils/IngredientNormalizerTests.cs`, `api/src/RecipeApi.Tests/Utils/UnitNormalizerTests.cs`, `api/src/RecipeApi.Tests/Integration/GroceryItemsIntegrationTests.cs` |
| Categories | `api/src/RecipeApi.Tests/Services/AisleMapperTests.cs`, `api/src/RecipeApi.Tests/Services/IngredientCategoryServiceTests.cs`, `api/src/RecipeApi.Tests/Integration/IngredientCategoryIntegrationTests.cs`, `api/src/RecipeApi.Tests/Services/Processors/CategorizeIngredientsProcessorTests.cs` |
| Week persistence/read | `api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs`, `api/src/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs` |
| Local UI/store | `pwa/src/components/planner/GroceryList.test.tsx`, `pwa/src/store/weekStore.test.ts`, `pwa/src/lib/grocery/aisleOrder.test.ts` |
| Browser substitutes | `pwa/e2e/grocery.spec.ts` and its route/builders/SSE helpers in `pwa/e2e/mock-api.ts`; mocked network boundaries, not backend qualification |

### BSL-grocery-shopping-001

- **Behavior and actor:** Household member derives needs by planning recipes
- **Entry state / trigger / observable outcome:** Scheduled recipe needs; the requirement/scenario table below enumerates triggers and returned/UI results.
- **Business rule and eligibility:** Use the exact extracted rules below; shared-owner rules remain as referenced above. No inferred eligibility or provider correctness.
- **Failure / cancellation / recovery behavior:** Calendar-event query filters date and non-null RecipeId, not day status, servings or recipe readiness; no new eligibility assertion. Broken JSON syntax is caught, but wrong JSON node kinds can throw. Recipe edits are not universally wired directly to recompute; only traced call sites count. No inference that all malformed metadata is safe or that completion of every recipe change refreshes every browser.
- **Configuration and time assumptions:** Ordinary household; server UTC relative week from meal-planning owner, browser visibility from GroceryList. Default complete aisle order unless a scenario states otherwise; no demo/preview/Synology qualification.
- **Ordered trace:** Planner grocery tab/embedded list → pwa/src/lib/api/planner.ts:getSchedule → generated schedule GET and ScheduleDays → specs/openapi.yaml GET /api/schedule → ScheduleController.GetSchedule → ScheduleService.GetScheduleAsync → WeeklyPlan.GroceryItems → weekStore.init → GroceryList. Mutations reach GroceryRecomputeService.RecomputeForWeekAsync through ScheduleService; SyncRecipeProcessor.ExecuteAsync reaches RecomputeForRecipeAsync after its save.
- **Relevant source files and symbols:** `pwa/src/app/(app)/planner/page.tsx`; `pwa/src/lib/api/planner.ts`; `pwa/src/lib/api/generated/api/schedule/index.ts`; `api/src/RecipeApi/Controllers/ScheduleController.cs`; `api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs`; `api/src/RecipeApi/Services/ScheduleService.cs`; `api/src/RecipeApi/Services/GroceryRecomputeService.cs`; `api/src/RecipeApi/Services/Processors/SyncRecipeProcessor.cs`; `api/src/RecipeApi/Models/WeeklyPlan.cs`; `api/database/schema.sql`; `specs/openapi.yaml` and named symbols in the trace.
- **Relevant test assertions and substitutions:** GroceryItemsIntegrationTests.AssignRecipe_ThenGetSchedule_GroceryItemsHaveRequiredFields asserts displayName, normalizedKey, section and contributing recipeIds; AssignThenRemoveRecipe_GroceryItemsBecomesEmpty and AssignTwoRecipes_RemoveOne_GroceryItemsRetainsRemainingRecipeItems inspect subsequent GETs. ScheduleIntegrationTests.AssignRecipe_RecomputesPersistedGroceryItems_AndPreservesGroceryState uses ingredient-text fallback and inspects the stored normalized line. TestWebApplicationFactory defaults to auth-disabled EF InMemory and a mocked workflow orchestrator; none proves PostgreSQL or household authentication.
- **API/implementation/test/documentation agreement or mismatch:** Core request/DTO shapes agree at inspected seams. Retain U06/U100 and G-U01–G-U07 exactly; source/test comments and wrapper fixtures do not resolve those disagreements.
- **Evidence class and confidence:** Implementation-supported; high for bounded source and aligned local assertions; medium for unsupported seams.
- **Check command / outcome / environment / content identity:** Source/assertion inspection at the recorded commit plus dirty owner identities; no runtime check. `openspec validate baseline-grocery-shopping-scheduled-needs --strict --no-interactive`: passed locally. Application tests, PostgreSQL, model, connected browser and device checks: not-run under A34/current authorization.
- **Open question or explicit limitation:** Calendar-event query filters date and non-null RecipeId, not day status, servings or recipe readiness; no new eligibility assertion. Broken JSON syntax is caught, but wrong JSON node kinds can throw. Recipe edits are not universally wired directly to recompute; only traced call sites count. No inference that all malformed metadata is safe or that completion of every recipe change refreshes every browser.
- **Disposition:** Accepted and promoted under G06; active change retained, runtime qualification deferred.

Requirement/scenario mapping to [the delta](../../openspec/changes/archive/2026-10-16-baseline-grocery-shopping-scheduled-needs/specs/grocery-shopping/spec.md):

| Requirement (exact title) | Scenarios (exact titles) |
| --- | --- |
| Derive grocery needs from recipe-bearing entries in the selected week | Recipe is scheduled twice; Recipe-free date |
| Prefer usable structured supply over ingredient text | Structured supply exists; No named structured entry |
| Read supported structured quantity representations | Nested quantity; Top-level values; Unknown amount |
| Use ingredient text after invalid JSON syntax | Invalid syntax with ingredients; No usable source |
| Persist the recomputed list for subsequent schedule reads | Remove only recipe; First recomputation |

### BSL-grocery-shopping-002

- **Behavior and actor:** Household member reads combined amounts
- **Entry state / trigger / observable outcome:** Normalization, aggregation and amount display; the requirement/scenario table below enumerates triggers and returned/UI results.
- **Business rule and eligibility:** Use the exact extracted rules below; shared-owner rules remain as referenced above. No inferred eligibility or provider correctness.
- **Failure / cancellation / recovery behavior:** No canonical ingredient registry or multilingual UUID identity is connected here. Names such as ground beef and bœuf hache remain distinct; œ does not become oe. Unknown units are bucketed by their original raw spelling; no density conversion, serving rescaling or general plural stemming. Null quantities are not a completeness assertion. U06 remains qualified.
- **Configuration and time assumptions:** Ordinary household; server UTC relative week from meal-planning owner, browser visibility from GroceryList. Default complete aisle order unless a scenario states otherwise; no demo/preview/Synology qualification.
- **Ordered trace:** Scheduled-needs extraction → IngredientNormalizer.Normalize → UnitNormalizer.Normalize → GroceryRecomputeService grouped projection → GroceryLineItemDto → WeeklyPlan jsonb → ScheduleDays generated DTO → GroceryList.formatQuantityHint. Contract: specs/openapi.yaml GroceryLineItemDto and ScheduleDays.
- **Relevant source files and symbols:** `api/src/RecipeApi/Utils/IngredientNormalizer.cs`; `api/src/RecipeApi/Utils/UnitNormalizer.cs`; `api/src/RecipeApi/Services/GroceryRecomputeService.cs`; `api/src/RecipeApi/Dto/GroceryLineItemDto.cs`; `pwa/src/lib/api/generated/models/index.ts`; `pwa/src/components/planner/GroceryList.tsx`; `specs/openapi.yaml` and named symbols in the trace.
- **Relevant test assertions and substitutions:** GroceryRecomputeServiceTests.RecomputeForWeekAsync_CrossUnitSameFamily_ConvertsAndSums asserts 500 g plus 1 kg becomes 1500 g; ApprovedMechanicalPair_WithCompatibleUnits_Aggregates_AndIncompatibleUnitsRemainSeparate asserts 720 ml and separate 3 g; ProtectedDescriptors_RemainSeparateGroceryLines asserts five keys; ReorderedSources_ProduceIdenticalDisplaySectionUnitRecipeOrderAndPersistedLineOrder compares persistence. IngredientNormalizerTests.Normalize_AccentedFrench_ProducesExpectedKey asserts bœuf hache (ligature retained). GroceryList tests amount hints with mocked stores/API, motion, locale and two-aisle order; no browser/backend claim.
- **API/implementation/test/documentation agreement or mismatch:** Core request/DTO shapes agree at inspected seams. Retain U06/U100 and G-U01–G-U07 exactly; source/test comments and wrapper fixtures do not resolve those disagreements.
- **Evidence class and confidence:** Implementation-supported; high for bounded source and aligned local assertions; medium for unsupported seams.
- **Check command / outcome / environment / content identity:** Source/assertion inspection at the recorded commit plus dirty owner identities; no runtime check. `openspec validate baseline-grocery-shopping-aggregation-quantities --strict --no-interactive`: passed locally. Application tests, PostgreSQL, model, connected browser and device checks: not-run under A34/current authorization.
- **Open question or explicit limitation:** No canonical ingredient registry or multilingual UUID identity is connected here. Names such as ground beef and bœuf hache remain distinct; œ does not become oe. Unknown units are bucketed by their original raw spelling; no density conversion, serving rescaling or general plural stemming. Null quantities are not a completeness assertion. U06 remains qualified.
- **Disposition:** Accepted and promoted under G06; active change retained, runtime qualification deferred.

Requirement/scenario mapping to [the delta](../../openspec/changes/archive/2026-10-16-baseline-grocery-shopping-aggregation-quantities/specs/grocery-shopping/spec.md):

| Requirement (exact title) | Scenarios (exact titles) |
| --- | --- |
| Normalize grocery names through supported mechanical transformations | Accent and whitespace; Apostrophe and separator |
| Merge supported optional plurals while retaining descriptors | Mechanical plural; Protected descriptors; No translation identity |
| Aggregate only matching normalized names and unit buckets | Compatible weight; Incompatible families; Unknown unit |
| Convert supported quantities and retain unknown amounts | Culinary volume; Count and unknown amount; All amounts unknown |
| Return deterministic grocery lines and contributors | Repeat source ordering; Repeated recipe |
| Show an amount hint only with quantity and unit | Amount shown; Missing amount or unit |

### BSL-grocery-shopping-003

- **Behavior and actor:** Household member reviews/corrects sections
- **Entry state / trigger / observable outcome:** Sections and manual corrections; the requirement/scenario table below enumerates triggers and returned/UI results.
- **Business rule and eligibility:** Use the exact extracted rules below; shared-owner rules remain as referenced above. No inferred eligibility or provider correctness.
- **Failure / cancellation / recovery behavior:** OpenAPI category description says source human, source and assertions persist manual: withhold normative source-marker spelling. DB save precedes affected-week recomputation; failure can leave category saved. PostgreSQL JSON containment branch is not established by InMemory string-contains tests. Configured aisle order accepts partial/duplicate lists; complete unique section visibility under arbitrary configuration is not promised. Case-insensitive API acceptance does not canonicalize stored casing.
- **Configuration and time assumptions:** Ordinary household; server UTC relative week from meal-planning owner, browser visibility from GroceryList. Default complete aisle order unless a scenario states otherwise; no demo/preview/Synology qualification.
- **Ordered trace:** GroceryList.handleReclassify → pwa/src/lib/api/ingredients.ts:reclassifyIngredient (direct fetch; generated category builder exists but is not used) → specs/openapi.yaml PATCH /api/ingredients/{normalizedKey}/category → IngredientsController.ReclassifyCategory → IngredientCategoryService.ReclassifyAsync → IngredientCategories save → GroceryRecomputeService.RecomputeForIngredientAsync → WeeklyPlan.GroceryItems → 204 → weekStore.reclassifyGroceryItem → rendered aisles.
- **Relevant source files and symbols:** `api/src/RecipeApi/Services/AisleMapper.cs`; `api/src/RecipeApi/Services/IngredientCategoryService.cs`; `api/src/RecipeApi/Controllers/IngredientsController.cs`; `api/src/RecipeApi/Models/IngredientCategory.cs`; `pwa/src/lib/api/ingredients.ts`; `pwa/src/components/planner/GroceryList.tsx`; `pwa/src/lib/grocery/aisleOrder.ts`; `pwa/src/store/weekStore.ts`; `specs/openapi.yaml` and named symbols in the trace.
- **Relevant test assertions and substitutions:** IngredientCategoryServiceTests assert insert/update source manual, confidence 1, timestamp and one mocked recompute invocation (CallBase=false). IngredientCategoryIntegrationTests assert 204/manual persistence and invalid section 400 using auth-disabled InMemory factory. GroceryRecomputeServiceTests assert DB override, mapper fallback and legacy category retention. GroceryList tests assert aisle movement only after success, retained checked state, no duplication, same-section no request, pending aria-busy/disabled controls, retry after failure and no stale success mutation after changing offset. API and planner store are substituted; E2E grocery.spec.ts uses route-owned categoryOverrides and mocked schedule/SSE.
- **API/implementation/test/documentation agreement or mismatch:** Core request/DTO shapes agree at inspected seams. Retain U06/U100 and G-U01–G-U07 exactly; source/test comments and wrapper fixtures do not resolve those disagreements.
- **Evidence class and confidence:** Implementation-supported; high for bounded source and aligned local assertions; medium for unsupported seams.
- **Check command / outcome / environment / content identity:** Source/assertion inspection at the recorded commit plus dirty owner identities; no runtime check. `openspec validate baseline-grocery-shopping-sections-corrections --strict --no-interactive`: passed locally. Application tests, PostgreSQL, model, connected browser and device checks: not-run under A34/current authorization.
- **Open question or explicit limitation:** OpenAPI category description says source human, source and assertions persist manual: withhold normative source-marker spelling. DB save precedes affected-week recomputation; failure can leave category saved. PostgreSQL JSON containment branch is not established by InMemory string-contains tests. Configured aisle order accepts partial/duplicate lists; complete unique section visibility under arbitrary configuration is not promised. Case-insensitive API acceptance does not canonicalize stored casing.
- **Disposition:** Accepted and promoted under G06; active change retained, runtime qualification deferred.

Requirement/scenario mapping to [the delta](../../openspec/changes/archive/2026-10-16-baseline-grocery-shopping-sections-corrections/specs/grocery-shopping/spec.md):

| Requirement (exact title) | Scenarios (exact titles) |
| --- | --- |
| Choose stored category before keyword fallback | Stored correction; Legacy correction |
| Use supported keyword section defaults | Known ingredient; No keyword |
| Group returned grocery rows using the configured aisle order | Server section; Invalid configuration; Missing row section at defaults |
| Open and cancel an ingredient section picker | Open picker; No change |
| Persist a supported category correction before success | Valid correction; Invalid correction |
| Update matching loaded grocery rows after correction success | Matching rows; Navigation during request |
| Bound correction pending and failure feedback to the ingredient | Pending correction; Rejected then retry |

### BSL-grocery-shopping-004

- **Behavior and actor:** Household shopper checks/unchecks a row
- **Entry state / trigger / observable outcome:** Individual checks and duplicate rows; the requirement/scenario table below enumerates triggers and returned/UI results.
- **Business rule and eligibility:** Use the exact extracted rules below; shared-owner rules remain as referenced above. No inferred eligibility or provider correctness.
- **Failure / cancellation / recovery behavior:** U06: OpenAPI and generated comment promise atomic concurrent merge, but service rewrites whole JSON without atomic key update/concurrency token. Withhold concurrency safety; sequential success is supported. Direct fetch sets member header but bypasses shared SDK auth/connection interceptors; same echo-exclusion behavior is not promised. No per-toggle pending lock, stale-week rollback guard, offline queue or conflict resolution is established. No bulk checkbox UI found.
- **Configuration and time assumptions:** Ordinary household; server UTC relative week from meal-planning owner, browser visibility from GroceryList. Default complete aisle order unless a scenario states otherwise; no demo/preview/Synology qualification.
- **Ordered trace:** GroceryList.handleToggle → plannerStore.setGroceryItemToggle optimistic map → pwa/src/lib/api/schedule.ts:useSchedule.toggleGroceryItem (direct fetch; generated item_Escaped builder unused) → specs/openapi.yaml PATCH /api/schedule/{weekOffset}/grocery/item → ScheduleController.ToggleGroceryItem → ScheduleService.ToggleGroceryItemAsync → WeeklyPlan.GroceryState JSON read/modify/write → save → publisher attempt → 204. Event delivery/remote replacement stays under household-live-updates.
- **Relevant source files and symbols:** `pwa/src/components/planner/GroceryList.tsx`; `pwa/src/store/plannerStore.ts`; `pwa/src/lib/api/schedule.ts`; `pwa/src/lib/api/generated/api/schedule/item/grocery/item_Escaped/index.ts`; `api/src/RecipeApi/Dto/ToggleGroceryItemDto.cs`; `api/src/RecipeApi/Services/ScheduleService.cs`; `specs/openapi.yaml` and named symbols in the trace.
- **Relevant test assertions and substitutions:** GroceryList tests explicitly rerender after mutating mockGroceryState, assert shared checks for three Eau rows, row counts/order across toggles/remotes/remount, rollback/error without global spinner; API is mocked. Tests assert complete header, initial collapsed section, re-collapse on visibility return and final-check stays expanded. ScheduleServiceTests.GetScheduleAsync_IncludesGroceryState inspects two dictionary values; GetScheduleAsync_ReturnsNullGroceryState_WhenNoWeeklyPlan asserts null. ScheduleIntegrationTests.GroceryState_Persists_And_Can_Be_Retrieved only round-trips arbitrary stored JSON, not toggle API or bool-map validity.
- **API/implementation/test/documentation agreement or mismatch:** Core request/DTO shapes agree at inspected seams. Retain U06/U100 and G-U01–G-U07 exactly; source/test comments and wrapper fixtures do not resolve those disagreements.
- **Evidence class and confidence:** Implementation-supported; high for bounded source and aligned local assertions; medium for unsupported seams.
- **Check command / outcome / environment / content identity:** Source/assertion inspection at the recorded commit plus dirty owner identities; no runtime check. `openspec validate baseline-grocery-shopping-individual-checks --strict --no-interactive`: passed locally. Application tests, PostgreSQL, model, connected browser and device checks: not-run under A34/current authorization.
- **Open question or explicit limitation:** U06: OpenAPI and generated comment promise atomic concurrent merge, but service rewrites whole JSON without atomic key update/concurrency token. Withhold concurrency safety; sequential success is supported. Direct fetch sets member header but bypasses shared SDK auth/connection interceptors; same echo-exclusion behavior is not promised. No per-toggle pending lock, stale-week rollback guard, offline queue or conflict resolution is established. No bulk checkbox UI found.
- **Disposition:** Accepted and promoted under G06; active change retained, runtime qualification deferred.

Requirement/scenario mapping to [the delta](../../openspec/changes/archive/2026-10-16-baseline-grocery-shopping-individual-checks/specs/grocery-shopping/spec.md):

| Requirement (exact title) | Scenarios (exact titles) |
| --- | --- |
| Use display name as the shared check identity | Duplicate names; Uncheck duplicate |
| Initialize an empty loaded check map from displayed names | Empty map; Existing map |
| Submit one optimistic grocery check at a time | Check succeeds; Uncheck succeeds |
| Persist a sequential single-key check update | Set one key; Set false |
| Recover a rejected individual check locally | Failed check; Retry |
| Order unchecked rows before checked rows within an aisle | Move down and back; Duplicate completion |
| Allow aisle collapse without immediately hiding a final checked item | Final item; Return to app; Manual expand |

### BSL-grocery-shopping-005

- **Behavior and actor:** Household member selects/reloads a week or receives updates
- **Entry state / trigger / observable outcome:** Week reading, refresh and reconciliation boundaries; the requirement/scenario table below enumerates triggers and returned/UI results.
- **Business rule and eligibility:** Use the exact extracted rules below; shared-owner rules remain as referenced above. No inferred eligibility or provider correctness.
- **Failure / cancellation / recovery behavior:** U100 reconfirmed: plain JSON dictionary in connected/week_updated is not the AdditionalDataHolder object expected by applySnapshot; groceryItems still replace, map is retained. Store subscribers observe week then planner writes. No atomic multi-store claim. init guards offset inequality, not same-offset request ordering or away-and-back races. Toggle rollback has no offset guard; assignRecipe follow-up lacks captured-offset guard. No full reconciliation or universal stale-response guarantee. Recompute event is conditional on check transition and does not carry lines.
- **Configuration and time assumptions:** Ordinary household; server UTC relative week from meal-planning owner, browser visibility from GroceryList. Default complete aisle order unless a scenario states otherwise; no demo/preview/Synology qualification.
- **Ordered trace:** Planner selected offset/tab and width → weekStore.init → planner.getSchedule → generated schedule reader/additional-data dictionary → protected GET → ScheduleService.GetScheduleAsync → WeeklyPlan stored adjuncts → weekStore and plannerStore → GroceryList. SSE uses JSON.parse → applySnapshot or grocery_updated handler. Calendar mutations call recompute; SyncRecipeProcessor follows save with RecomputeForRecipeAsync; section correction follows save with affected-week recomputation.
- **Relevant source files and symbols:** `pwa/src/store/weekStore.ts`; `pwa/src/hooks/useScheduleStream.ts`; `api/src/RecipeApi/Controllers/StreamController.cs`; `api/src/RecipeApi/Infrastructure/SseEventPublisher.cs`; `api/src/RecipeApi/Services/GroceryRecomputeService.cs`; `api/src/RecipeApi/Services/ScheduleService.cs`; `api/src/RecipeApi/Services/Processors/SyncRecipeProcessor.cs`; `specs/openapi.yaml` and named symbols in the trace.
- **Relevant test assertions and substitutions:** weekStore.test.ts asserts older init offset is ignored; snapshot mismatch ignored; authoritative snapshot replaces a local section. Its atomic-named test builds groceryState.additionalData and asserts week subscription fires before planner, not atomic visibility. GroceryRecomputeServiceTests.P9_GroceryStateIsNotMutatedByRecompute uses previousItems=[] so only nonmigration retention; NewlyMergedLines_RequireEveryPredecessorChecked_ReplaceObsoleteState_AndPublishResult enumerates true/false/missing predecessors with mocked publisher and fixed clock. E2E jitter case likewise injects additionalData in raw SSE. ScheduleIntegrationTests cross-week move inspects both stored lists and retained maps, with InMemory and mocked publisher.
- **API/implementation/test/documentation agreement or mismatch:** Core request/DTO shapes agree at inspected seams. Retain U06/U100 and G-U01–G-U07 exactly; source/test comments and wrapper fixtures do not resolve those disagreements.
- **Evidence class and confidence:** Implementation-supported; medium confidence at API/provider boundaries.
- **Check command / outcome / environment / content identity:** Source/assertion inspection at the recorded commit plus dirty owner identities; no runtime check. `openspec validate baseline-grocery-shopping-week-refresh-boundaries --strict --no-interactive`: passed locally. Application tests, PostgreSQL, model, connected browser and device checks: not-run under A34/current authorization.
- **Open question or explicit limitation:** U100 reconfirmed: plain JSON dictionary in connected/week_updated is not the AdditionalDataHolder object expected by applySnapshot; groceryItems still replace, map is retained. Store subscribers observe week then planner writes. No atomic multi-store claim. init guards offset inequality, not same-offset request ordering or away-and-back races. Toggle rollback has no offset guard; assignRecipe follow-up lacks captured-offset guard. No full reconciliation or universal stale-response guarantee. Recompute event is conditional on check transition and does not carry lines.
- **Disposition:** Accepted and promoted under G06; active change retained, runtime qualification deferred.

Requirement/scenario mapping to [the delta](../../openspec/changes/archive/2026-10-16-baseline-grocery-shopping-week-refresh-boundaries/specs/grocery-shopping/spec.md):

| Requirement (exact title) | Scenarios (exact titles) |
| --- | --- |
| Present grocery shopping for the selected planner week | Narrow shopping; Wide shopping |
| Show the grocery empty state for no loaded lines | Empty list; Start planning |
| Restore available grocery adjuncts during week initialization | Generated check map; Absent checks |
| Retain loaded grocery content on failed or superseded initialization | Read fails; Older offset |
| Refresh persisted needs after supported schedule changes | Remove one of two recipes; Cross-week move |
| Refresh scheduled recipe and ingredient affected weeks at connected service boundaries | Scheduled recipe sync; Unscheduled recipe sync |
| Carry forward supported predecessor checks during mechanical normalization | Mixed predecessor checks; All checked; Single rename |

### BSL-grocery-shopping-006

- **Behavior and actor:** Authenticated API caller replaces weekly checks
- **Entry state / trigger / observable outcome:** API-only full check-map replacement; the requirement/scenario table below enumerates triggers and returned/UI results.
- **Business rule and eligibility:** Use the exact extracted rules below; shared-owner rules remain as referenced above. No inferred eligibility or provider correctness.
- **Failure / cancellation / recovery behavior:** No UI check-all/uncheck-all control found. Full-map writes replace omitted keys and are not merge-safe. Missing WeeklyPlan throws KeyNotFoundException; endpoint-specific contract only declares 200, so no missing-plan HTTP status claim. Publication follows persistence; a later error cannot be assumed to roll back storage. Direct fetch auth/echo interception differs from generated reader.
- **Configuration and time assumptions:** Ordinary household; server UTC relative week from meal-planning owner, browser visibility from GroceryList. Default complete aisle order unless a scenario states otherwise; no demo/preview/Synology qualification.
- **Ordered trace:** API-only caller or unreferenced useSchedule.updateGroceryState adapter → direct PATCH /api/schedule/{weekOffset}/grocery (generated GroceryRequestBuilder exists, unused here) → approved dictionary body/200 data envelope → ScheduleController.UpdateGroceryState → ScheduleService.UpdateGroceryStateAsync → existing WeeklyPlan.GroceryState JSON replacement → SaveChangesAsync → PublishGroceryUpdatedAsync → data dictionary. Subsequent GET uses ScheduleService.GetScheduleAsync. No household bulk-control caller found by repository search.
- **Relevant source files and symbols:** `pwa/src/lib/api/schedule.ts`; `pwa/src/lib/api/generated/api/schedule/item/grocery/index.ts`; `api/src/RecipeApi/Controllers/ScheduleController.cs`; `api/src/RecipeApi/Services/ScheduleService.cs`; `api/src/RecipeApi/Models/WeeklyPlan.cs`; `specs/openapi.yaml` and named symbols in the trace.
- **Relevant test assertions and substitutions:** ScheduleServiceTests.GetScheduleAsync_IncludesGroceryState asserts typed bool dictionary on reads; ScheduleIntegrationTests.GroceryState_Persists_And_Can_Be_Retrieved merely round-trips unrelated arbitrary JSON, not this operation. ScheduleIntegrationTests.UpdateGroceryStateAsync_Persists_State_To_Database invokes the service and asserts only that stored JSON contains tomatoes; UpdateGroceryState_PublishesGroceryUpdatedEvent verifies one mocked publisher call with tomatoes true and milk false. These use EF InMemory and a mocked publisher, not the HTTP operation, real PostgreSQL or connected clients. Adapter returns response.data or its submitted map after successful JSON parsing. Service and controller trace supplies medium-confidence implementation evidence, not API/runtime qualification.
- **API/implementation/test/documentation agreement or mismatch:** Core request/DTO shapes agree at inspected seams. Retain U06/U100 and G-U01–G-U07 exactly; source/test comments and wrapper fixtures do not resolve those disagreements.
- **Evidence class and confidence:** Implementation-supported; medium confidence at API/provider boundaries.
- **Check command / outcome / environment / content identity:** Source/assertion inspection at the recorded commit plus dirty owner identities; no runtime check. `openspec validate baseline-grocery-shopping-bulk-check-map-api --strict --no-interactive`: passed locally. Application tests, PostgreSQL, model, connected browser and device checks: not-run under A34/current authorization.
- **Open question or explicit limitation:** No UI check-all/uncheck-all control found. Full-map writes replace omitted keys and are not merge-safe. Missing WeeklyPlan throws KeyNotFoundException; endpoint-specific contract only declares 200, so no missing-plan HTTP status claim. Publication follows persistence; a later error cannot be assumed to roll back storage. Direct fetch auth/echo interception differs from generated reader.
- **Disposition:** Accepted and promoted under G06; active change retained, runtime qualification deferred.

Requirement/scenario mapping to [the delta](../../openspec/changes/archive/2026-10-16-baseline-grocery-shopping-bulk-check-map-api/specs/grocery-shopping/spec.md):

| Requirement (exact title) | Scenarios (exact titles) |
| --- | --- |
| Replace the weekly check map through the full-map API | Replace populated map; Clear map |
| Return the full-map result in the declared success envelope | Successful response; Checks without line mutation |

### BSL-grocery-shopping-007

- **Behavior and actor:** Workflow processor supplies category defaults for household shopping
- **Entry state / trigger / observable outcome:** Category defaults from processing; the requirement/scenario table below enumerates triggers and returned/UI results.
- **Business rule and eligibility:** Use the exact extracted rules below; shared-owner rules remain as referenced above. No inferred eligibility or provider correctness.
- **Failure / cancellation / recovery behavior:** No model output correctness or provider qualification. Returned normalizedKey is not checked against requested names; confidence is not range-validated. These defects are withheld, not specified as desired behavior. Categorization saves no weekly lines and invokes no recompute. Import/goto-synthesis definitions run sync_recipe before categorization, while recategorize-ingredients runs category then RecipeReady only; withhold immediate propagation or force-refresh semantics. Generic trigger acceptance, retries and completion stay with background-processing.
- **Configuration and time assumptions:** Ordinary household; server UTC relative week from meal-planning owner, browser visibility from GroceryList. Default complete aisle order unless a scenario states otherwise; no demo/preview/Synology qualification.
- **Ordered trace:** API-only generic POST /api/workflows/{workflowId}/trigger (background-processing owner) → WorkflowController.Trigger → WorkflowOrchestrator.TriggerAsync → persisted WorkflowTask → recategorize-ingredients.yaml or import workflow categorize_ingredients task → CategorizeIngredientsProcessor.ExecuteAsync/CategorizeAsync → recipe RawMetadata supply names → IngredientNormalizer → IngredientCategories cache → IChatClient batch → validated section rows → later GroceryRecomputeService category lookup. No generated client participates in processor execution; workflow trigger client/contract belongs to the accepted background owner.
- **Relevant source files and symbols:** `api/src/RecipeApi/Controllers/WorkflowController.cs`; `api/src/RecipeApi/Services/Processors/CategorizeIngredientsProcessor.cs`; `api/src/RecipeApi/Workflows/recategorize-ingredients.yaml`; `api/src/RecipeApi/Workflows/recipe-import.yaml`; `api/src/RecipeApi/Workflows/url-import.yaml`; `api/src/RecipeApi/Workflows/goto-synthesis.yaml`; `specs/openapi.yaml` and named symbols in the trace.
- **Relevant test assertions and substitutions:** CategorizeIngredientsProcessorTests uses TestDbContextFactory EF InMemory plus Moq IChatClient. AllIngredientsCached_NoLlmCall verifies Times.Never; SomeUncached_LlmCalledWithOnlyUncachedNames captures prompt, asserts uncached names present/cached tomato absent and one call; LlmReturnsInvalidSection_InvalidDiscarded_ValidUpserted checks stored valid row and missing invalid row; LlmCallFails_ProcessorCompletesWithoutThrowing asserts no exception and no saved olive-oil category. No current model call or workflow run. Manual-overwrite protection and deferred grocery propagation are supported by source, not explicit assertions in that file.
- **API/implementation/test/documentation agreement or mismatch:** Core request/DTO shapes agree at inspected seams. Retain U06/U100 and G-U01–G-U07 exactly; source/test comments and wrapper fixtures do not resolve those disagreements.
- **Evidence class and confidence:** Implementation-supported; medium confidence at API/provider boundaries.
- **Check command / outcome / environment / content identity:** Source/assertion inspection at the recorded commit plus dirty owner identities; no runtime check. `openspec validate baseline-grocery-shopping-category-default-processing --strict --no-interactive`: passed locally. Application tests, PostgreSQL, model, connected browser and device checks: not-run under A34/current authorization.
- **Open question or explicit limitation:** No model output correctness or provider qualification. Returned normalizedKey is not checked against requested names; confidence is not range-validated. These defects are withheld, not specified as desired behavior. Categorization saves no weekly lines and invokes no recompute. Import/goto-synthesis definitions run sync_recipe before categorization, while recategorize-ingredients runs category then RecipeReady only; withhold immediate propagation or force-refresh semantics. Generic trigger acceptance, retries and completion stay with background-processing.
- **Disposition:** Accepted and promoted under G06; active change retained, runtime qualification deferred.

Requirement/scenario mapping to [the delta](../../openspec/changes/archive/2026-10-16-baseline-grocery-shopping-category-default-processing/specs/grocery-shopping/spec.md):

| Requirement (exact title) | Scenarios (exact titles) |
| --- | --- |
| Request category suggestions only for uncached structured names | All names cached; Partly cached |
| Store valid category suggestions while preserving manual corrections | Mixed validity; Manual category exists; Legacy alias |
| Keep category-provider failure from blocking the processor completion path | Provider failure; Missing recipe |

## Drafting session record — 2026-10-16 (superseded by G06 promotion below)

- Authorization: current request G01; complete documentation drafting scope only.
- Completed discovery: BSL-grocery-shopping-001–007; every discovered journey
  accounted for in the table above. No further drafting slice remains selected.
- Artifacts: seven CLI-scaffolded proposal/design/specs/tasks sets, plus this plan
  and the grocery index row. All remain drafts; no main spec was created.
- Passed: each selected change's strict OpenSpec validation; repository-wide
  `openspec validate --all --strict --no-interactive` observed 83 passed, zero
  failed before final review. Current final result is reported with the final
  harness/check evidence, because concurrent unrelated changes may add items.
- Final checks: review local links, exact requirement/scenario mappings, normative
  source support, whitespace and task-owned diff; run `task verify --` with this
  plan, the index and every file in all seven change directories. The final
  reported immutable `.task/agent-finish/runs/<id>.json` is the content-specific check record (`last-run.json` may be overwritten by concurrent work); the
  final response reports its inspected results without modifying this plan after
  verification.
- Failed/blocked: no selected OpenSpec validation failure observed. Any final
  failure must be classified from the actual harness record, including unrelated
  input failures; it is not predeclared successful here.
- Not-run: application unit/API/integration/E2E tests, runtime/real database,
  live/model/SSE/browser/device qualification; no services launched or dependencies
  installed. Not-applicable: implementation red/green, client generation,
  migrations, deployment, acceptance, promotion and archival.
- Questions: none blocking supported draft generation. Known limitations remain
  U06/U100 and G-U01–G-U07; they require later disposition/qualification, not repair
  in this task.
- **Exact next action:** human review of all seven proposals, their deltas and
  this evidence ledger in table order; accept or request revisions to a named
  draft subset and explicitly decide whether any later promotion is authorized.
  Do not run apply, sync, archive or application work from checkbox completion.

## Promotion session record — 2026-10-16 (G06)

- Branch/HEAD remain `moving-to-openspec` / `04a1c4570f9bbb01b47436790d4248635ac3179a`.
  Current status and immediate plan/index before-images were captured before writes.
  The grocery plan/index and all seven untracked change directories were existing
  inputs; no grocery main spec existed. Unrelated staged, unstaged and concurrent
  work was preserved. Shared workflow/history, application and change artifacts
  were not edited by this promotion.
- Selected exactly the seven change names in the slice table, resolved their
  delta paths through current CLI status, reread the deltas, and obtained current
  specs artifact rules. The repo-local root/schema remain unchanged.
- Promoted every requirement and scenario verbatim into a single main Requirements
  section, preserving the first delta's Purpose verbatim. No delta operation headers,
  duplicate requirements, extra normative claims or placeholder Purpose remain.
- Acceptance/promotion applies to the supported 37/82 subset only. U06/U100 and
  G-U01–G-U07 retain their recorded findings; runtime and database evidence remain
  not-run. Earlier draft-only status/authorization statements are historical.
- Validation: run `openspec validate --specs --strict --no-interactive`, validate
  grocery-shopping and the seven selected changes, then
  `openspec validate --all --strict --no-interactive`; compare exact delta/main
  blocks, inspect links/whitespace and the promotion-only diff. Run `task verify --`
  with the main spec, this plan and the index, and inspect its immutable reported
  record. Final check outcomes are reported in the session response, without a
  later edit invalidating that record.
- **Exact next action:** no further grocery drafting or promotion remains in this
  selected scope. Any archival, implementation or runtime qualification requires
  a separately selected user instruction. Keep the seven active changes in place.

The retained prompt below is the default for future sessions only; G01 superseded
its review-only boundary for this completed drafting session.

## Execution prompt

Paste this prompt and replace the session instruction with the desired bounded
scope. The default authorizes review only. Select the model in your host.

```text
Work on the grocery-shopping OpenSpec brownfield baseline in
/Users/alex/Code/whats-for-supper.
Session instruction: Review this capability's checkpoint and recommend the next
bounded slice. Do not generate specs or change application behavior.

Read AGENT.md and its active-host loading rules, then
 docs/openspec-baseline/workflow.md and
 docs/openspec-baseline/grocery-shopping.md.
Use these as the execution context; do not read the full history or other
capability plans unless an immediate dependency requires a specific section.
Resolve installed OpenSpec workflow/root before artifact writes. Preserve staged,
unstaged and untracked work. Recheck source identity and affected evidence.

Current user messages define scope. Reuse recorded decisions without asking for
approval again within already authorized work. Do not infer new drafting,
promotion, archive, implementation or runtime qualification authority from history.
Trace one selected observable journey through source, contracts and actual test
assertions/substitutions. Keep disputed claims non-normative. No application,
test, contract, client, SQL, configuration or dependency edits.

Update this capability plan's evidence/mappings, decisions, uncertainty, artifact
status, session log and next action. Update the small index only if its routing or
summary changes. Validate selected artifacts and run task verify with every changed
path. Distinguish passed, failed, blocked, not-run and not-applicable; source
support is not runtime verification. Stop at the authorized session boundary.
```

## Next-session record

Use this section for new capability sessions after the split. The earlier evidence
and lifecycle records above retain their original chronology.

```text
Session/date:
Branch, commit, relevant dirty inputs:
Current user authorization and selected capability/slice:
Completed discovery/evidence IDs:
Artifact paths and status (draft/validated/accepted/promoted separately):
Human decisions and unresolved questions:
Checks: passed / failed / blocked / not-run / not-applicable, with reasons:
Limitations and excluded assertions:
Exact next bounded action:
```
