# OpenSpec brownfield baseline plan

## Purpose and current checkpoint

Progressively document WFS's currently implemented, observable capabilities as an
OpenSpec baseline across multiple work sessions. This is an extraction project,
not a feature, refactoring, bug-fixing, or specification-driven implementation project.
A27/A28 explicitly add desired member-name uniqueness to this draft for future work;
that bounded exception does not imply implementation or verified baseline behavior.

**Current stage: recipe-capture ordinary-household web acquisition promoted, 2026-10-15 (A65).** Main recipe-capture specification created with verbatim Purpose and 9 requirements / 20 scenarios under `openspec/specs/recipe-capture/spec.md`. Main household-identity remains 36/92; main recipe-library remains 55/122; main recipe-sharing remains 9/27. All twelve changes remain active; no archival authorized. BSL-recipe-library-001–027, BSL-household-identity-001–025, BSL-recipe-sharing-001–004, BSL-recipe-capture-001–004, U29–U57, historical member-creation limitations and BSL-015 sentence/caveat remain preserved; U58–U61 added as non-normative. All 84 prior evidence identities rechecked unchanged. Source-supported A10 extraction remains distinct from deferred A34 runtime/database qualification. Stop after promotion; all twelve changes active; no application/runtime work, archival, or successor extraction.


| Item | Recorded state |
| --- | --- |
| Initial discovery date | 2026-10-15 |
| Source snapshot | `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` |
| OpenSpec root | Repository-local `openspec/`, confirmed by CLI |
| Active changes at plan creation | None |
| Main specs at plan creation | None, confirmed by `openspec list --specs --json` |
| Existing user change | Deletion of `openspec/specs/background-task-navigation/spec.md`; preserve it |
| Runtime evidence | None collected during initial discovery; test source was inspected, not executed |
| Next action | Stop after A65 promotion of recipe-capture specification. All twelve changes remain active; no application/runtime work, archival, or successor extraction; A34 qualification deferred. |

The removed navigation spec is not a baseline authority. Do not restore it or
recreate its directory by default. Extract navigation behavior from current flows;
approve its ownership with the rest of the structure.

The former `docs/feature-inventory.md` has also been retired because its claims
drifted from implementation. Do not restore it as a baseline input. Use this plan's
capability map to navigate, then establish each claim from current source and test
assertions. The map remains a proposal, not a replacement requirements authority.

Read [AGENT.md](../AGENT.md) and its active-host loading rules on each new session.
Use [OpenSpec configuration](../openspec/config.yaml) and the installed workflow
skills for artifact mechanics. This plan records scope, evidence, and progress; it
does not replace repository authority or supply authorization beyond the user request.

## Non-negotiable boundaries

- Do not modify application code, tests, generated clients, API contracts, SQL,
  deployment configuration, dependencies, or agent/workflow configuration.
- Do not refactor, repair defects, implement gaps, or invent requirements.
- Do not interpret product intent, comments, archived plans, passing mocks, or a
  test name as proof of implemented behavior.
- Do not rewrite an approved API contract to make it agree with implementation.
  Record the disagreement and withhold the disputed normative assertion.
- Do not generate baseline specs until the user approves the structure and
  authorizes the selected generation scope. Record that approval; do not re-request
  permission already granted within that scope.
- Preserve unrelated dirty work, including the user's deleted navigation spec.
  Do not stage, commit, publish, deploy, or archive changes without authorization.
- Default to one capability and one bounded workflow slice per session. A large
  capability can span sessions; a completed slice does not authorize its successors.
- Ask consequential questions one at a time. Continue independent inspection while
  clarification is pending; do not decide disputed behavior by assumption.

Writing a baseline describes existing behavior; it does not authorize preserving a
defect as desired future behavior. Keep limitations and disagreements outside
normative requirements until their baseline treatment is explicitly settled.

## Evidence standard

Use two separate dimensions: behavior evidence and check outcome.

| Behavior evidence | Meaning |
| --- | --- |
| Verified | An actual check observed the behavior against identified content and environment |
| Implementation-supported | A traced executable path supports the behavior, without a current runtime observation |
| Inferred | An interpretation of purpose, terminology, or intent that requires confirmation before normative use |
| Missing/incomplete | A stub, unconnected path, parameter mismatch, or incomplete integration; not a positive capability claim |

Existing test assertions are a separate evidence reference. Their presence does not
make a behavior verified. Record check outcomes as **passed, failed, blocked,
not-run, or not-applicable**; never collapse them into a single completion label.

Confidence is qualitative: **high** means aligned source and meaningful assertions;
**medium** means incomplete seams, mocks, configuration dependence, or conflicting
evidence; **low** means mostly inferred or untraced. Confidence does not substitute
for verification.

Every significant finding needs repository-relative source and/or test references.
Use symbols or test names as durable anchors; line numbers may supplement them.
Record the commit and relevant dirty inputs. After source changes, recheck affected
claims instead of treating old evidence as current.

### Reusable behavior evidence entry

Copy into this document under the selected capability when doing extraction. Do
not create empty evidence entries for every future scenario.

```text
Evidence ID: BSL-<capability>-<number>
Behavior and actor:
Entry state / trigger / observable outcome:
Business rule and eligibility:
Failure / cancellation / recovery behavior:
Configuration and time assumptions:
Ordered trace: UI/entry -> client/contract -> API/service -> persistence/workflow
Relevant source files and symbols:
Relevant test assertions and substitutions:
API/implementation/test/documentation agreement or mismatch:
Evidence class and confidence:
Check command / outcome / environment / content identity, or not-run reason:
Open question or explicit limitation:
Disposition: candidate / excluded / drafted / accepted
Requirement/scenario mapping, once drafted:
```

## Application map to preserve

WFS is a household meal-planning PWA with a Next.js/React client, an ASP.NET Core
API, PostgreSQL state, local recipe assets, optional external AI work, persisted
background workflows, and household SSE updates. Verify versions from manifests
when relevant rather than copying badges or comments.

| Surface or boundary | Starting evidence |
| --- | --- |
| Entry points and dependency registration | [API Program](../api/src/RecipeApi/Program.cs), [PWA layout](../pwa/src/app/layout.tsx), [package manifest](../pwa/package.json), [API project](../api/RecipeApi.csproj) |
| Routes and access gates | [PWA proxy](../pwa/src/proxy.ts), [navigation](../pwa/src/components/common/Navigation.tsx), [identity validation](../pwa/src/components/identity/IdentityValidator.tsx) |
| API contract and client | [OpenAPI](../specs/openapi.yaml), [client adapter](../pwa/src/lib/api/api-client.ts), [server fetch](../pwa/src/lib/api/server-client.ts) |
| Domain/persistence | [EF context](../api/src/RecipeApi/Data/RecipeDbContext.cs), [SQL schema](../api/database/schema.sql), [compatibility SQL](../api/database/compatibility.sql), [recipe asset store](../api/src/RecipeApi/Infrastructure/LocalRecipeStore.cs) |
| Deployment/configuration | [application Compose](../docker/compose/apps.yml), [Synology template](../release-template/synology/compose.yaml), [feature flags](../api/src/RecipeApi/Services/FeatureFlagService.cs) |
| Existing documentation | [family guide](user-guide.md), [architecture](architecture.md); secondary evidence to reconcile against source |
| Test boundaries | [API test factory](../api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs), [browser fixtures](../pwa/e2e/fixtures.ts), [Playwright config](../pwa/playwright.config.ts) |

Use capability paths and the `BSL-<capability>-<number>` evidence IDs for new
traceability. There is no requirement to preserve the retired inventory's feature
IDs. Archived Kiro plans are historical context, not proof that a capability exists.

## Approved capability structure

Prefer observable business capabilities over classes, components, routes, or
technical layers. Each directory below would contain `spec.md`; no directory or
spec is created by this plan.

```text
openspec/specs/
  household-identity/spec.md
  recipe-library/spec.md
  recipe-sharing/spec.md
  recipe-capture/spec.md
  recipe-quality/spec.md
  recipe-search/spec.md
  recipe-discovery/spec.md
  meal-planning/spec.md
  tonight-meal-decisions/spec.md
  grocery-shopping/spec.md
  cooking/spec.md
  member-preferences/spec.md
  app-installation/spec.md
  household-live-updates/spec.md
  background-processing/spec.md
  data-backup-and-recovery/spec.md
  demo-household/spec.md
```

The earlier discovery report proposed 18 paths including preservation of the old
navigation capability. The approved structure has **17**, with background navigation
extracted within affected journeys unless review establishes a separate owner.

### Capability inventory and source/test starting points

These findings are implementation-supported, not runtime-verified. For each selected
capability, expand its evidence entries to cover all ten discovery fields: name,
business purpose, existing capabilities, important workflows, business rules,
source files, tests, dependencies, uncertainties, and confidence.

| Capability / purpose | Candidate scope and rules to recheck | Source starting point | Existing test starting point | Dependencies / initial confidence |
| --- | --- | --- | --- | --- |
| Household identity: enter the shared household and select an actor | Passphrase/invites, onboarding, member switching, creation/rename, API removal; distinguish access from identity and attribution | [authentication](../pwa/src/lib/auth.ts), [API handler](../api/src/RecipeApi/Infrastructure/HearthAuthenticationHandler.cs), [FamilyService](../api/src/RecipeApi/Services/FamilyService.cs) | [AuthEnforcementTests](../api/src/RecipeApi.Tests/Integration/AuthEnforcementTests.cs), [identity browser tests](../pwa/e2e/identity-persistence.spec.ts) | Configuration; foundational to other domains / high |
| Recipe library: maintain reusable household recipes | Ready/deleted visibility, metadata/ingredients/instructions, ratings/notes, originals/heroes, discoverability, trash/restore/PIN purge, vegetarian recipe fact | [RecipeService](../api/src/RecipeApi/Services/RecipeService.cs), [detail UI](../pwa/src/components/recipes/RecipeDetailSheet.tsx), [purge](../api/src/RecipeApi/Services/RecipePurgeService.cs) | [soft-delete tests](../api/src/RecipeApi.Tests/Integration/RecipeSoftDeleteIntegrationTests.cs), [detail tests](../pwa/src/components/recipes/RecipeDetailSheet.test.tsx) | Identity, assets, planning references, indexing / high; cross-store failures medium |
| Recipe sharing: exchange portable recipes | Privacy-scrubbed export, native share/download, bundle preview/accept/reject, validation; do not assume UI/API eligibility is identical | [bundle methods](../api/src/RecipeApi/Services/RecipeService.cs), [client sharing](../pwa/src/lib/api/recipes.ts), [capture preview](../pwa/src/components/capture/MinimalCapture.tsx) | [RecipeShareIntegrationTests](../api/src/RecipeApi.Tests/Integration/RecipeShareIntegrationTests.cs), [sharing browser tests](../pwa/e2e/sharing-fidelity.spec.ts) | Library, identity, assets, device capabilities / high for format; medium for native sharing |
| Recipe capture: acquire a recipe | Photo, URL, description, link share target, enabled PDF; validation, metadata, acceptance vs delivery, readiness, duplicate checks, configured processing language | [RecipeService](../api/src/RecipeApi/Services/RecipeService.cs), [capture UI](../pwa/src/components/capture/MinimalCapture.tsx), [PDF controller](../api/src/RecipeApi/Controllers/PdfCaptureController.cs), [recipe-import YAML](../api/src/RecipeApi/Workflows/recipe-import.yaml) | [import lifecycle](../api/src/RecipeApi.Tests/Services/RecipeImportLifecycleTests.cs), [PDF API tests](../api/src/RecipeApi.Tests/Integration/PdfCaptureIntegrationTests.cs), [capture browser tests](../pwa/e2e/capture-flow.spec.ts) | Identity, library, workflows, external source/AI, flags / high at acceptance; medium end to end |
| Recipe quality: report and recover content problems | Reasons/notes, manual duplicate reports, contextual re-import eligibility/idempotency, review/resolve, import-ID polling, failed-capture retry/clear | [report service](../api/src/RecipeApi/Services/RecipeImportReportService.cs), [import service](../api/src/RecipeApi/Services/RecipeImportService.cs), [failure service](../api/src/RecipeApi/Services/CaptureFailureService.cs) | [report API tests](../api/src/RecipeApi.Tests/Integration/RecipeImportReportIntegrationTests.cs), [report PostgreSQL tests](../api/src/RecipeApi.Tests/Integration/RecipeImportReportPostgresTests.cs) | Provenance, identity, workflows, search review filters, cooking / high rules; medium recovery |
| Recipe search: find and rank existing recipes | Browse/text/hybrid/similar modes, filters, Top Pick/reasons, continuation/expiry, planner demotion, report exclusion from promotion, server promotion eligibility | [search service](../api/src/RecipeApi/Services/RecipeSearchService.cs), [predicates](../api/src/RecipeApi/Services/RecipeSearchPredicate.cs), `pwa/src/app/(app)/recipes/page.tsx` | [search API tests](../api/src/RecipeApi.Tests/Integration/RecipeSearchIntegrationTests.cs), [PostgreSQL baseline](../api/src/RecipeApi.Tests/Integration/HybridRecipeSearchBaselinePostgresTests.cs), [browser hardening](../pwa/e2e/search-hardening.spec.ts) | Facts, history, calendar, reports, votes, index, optional embeddings / high policy; medium runtime quality |
| Recipe discovery: collect family preferences | Supper-pinned UI vs broader API filters, eligible queue, one vote per member/recipe, like/pass, household counts, consensus suggestions; distinguish any-like matches from consensus | [DiscoveryService](../api/src/RecipeApi/Services/DiscoveryService.cs), [SQL views](../api/database/schema.sql), `pwa/src/app/(app)/discovery/page.tsx` | [DiscoveryServiceTests](../api/src/RecipeApi.Tests/Services/DiscoveryServiceTests.cs), [discovery browser tests](../pwa/e2e/discovery.spec.ts) | Identity, library, planning, live updates / high mechanics; terminology medium |
| Meal planning: maintain dated supper plans | Monday–Sunday weeks, assign/replace, swap/push/cross-week move, defer/remove, week/day states, voting closure, recipe-free plans, overdue completion, groceries side effects | [ScheduleService](../api/src/RecipeApi/Services/ScheduleService.cs), [weekStore](../pwa/src/store/weekStore.ts), `pwa/src/app/(app)/planner/page.tsx` | [ScheduleIntegrationTests](../api/src/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs), [non-cooking PostgreSQL tests](../api/src/RecipeApi.Tests/Integration/NonCookingPostgresTests.cs) | Library, votes, groceries, cooking history, live updates / high states; concurrency medium |
| Tonight meal decisions: decide and recover tonight's supper | Planned/cooked/recipe-free/mystery/empty states, random ready GOTO, Quick Find, replacement, Order In, move tomorrow, defer/drop, pending GOTO creation | [HomeCommandCenter](../pwa/src/components/home/HomeCommandCenter.tsx), [GoToService](../api/src/RecipeApi/Services/GoToService.cs), [QuickFindModal](../pwa/src/components/planner/QuickFindModal.tsx) | [Home tests](../pwa/src/components/home/HomeCommandCenter.test.tsx), [GOTO tests](../api/src/RecipeApi.Tests/Integration/GoToIntegrationTests.cs), [Quick Find tests](../pwa/src/components/planner/QuickFindModal.test.tsx) | Planning, library, capture/readiness / high journeys; multi-request recovery medium |
| Grocery shopping: derive needs and share shopping progress | Structured supply/text fallback, normalized names and unit buckets, quantities, aisle/manual overrides, individual/bulk checks, duplicate rendered rows/shared display-name check state | [recompute service](../api/src/RecipeApi/Services/GroceryRecomputeService.cs), [category service](../api/src/RecipeApi/Services/IngredientCategoryService.cs), [GroceryList](../pwa/src/components/planner/GroceryList.tsx) | [recompute tests](../api/src/RecipeApi.Tests/Services/GroceryRecomputeServiceTests.cs), [grocery integration](../api/src/RecipeApi.Tests/Integration/GroceryItemsIntegrationTests.cs), [UI tests](../pwa/src/components/planner/GroceryList.test.tsx) | Calendar, ingredients, units/categories, live updates / high computation; concurrent writes medium |
| Cooking: prepare and record the recipe actually cooked | Prep checklist, structured/legacy steps, focused/single-page modes, edit/report, completion failure, viewed-recipe history vs matching tonight event, client-held position | [CooksMode](../pwa/src/components/planner/CooksMode.tsx), [step parser](../pwa/src/lib/cooking/stepParser.ts), [plannerStore](../pwa/src/store/plannerStore.ts) | [CooksMode tests](../pwa/src/components/planner/CooksMode.test.tsx), [cooking API tests](../api/src/RecipeApi.Tests/Integration/RecipeCookingIntegrationTests.cs) | Library, calendar/history, quality, flags / high in-session; durable progress unestablished |
| Member preferences: adapt member experience | English/French, member vs browser preference, browse mode, preview modes/overrides; processing language belongs to capture | [FamilyService](../api/src/RecipeApi/Services/FamilyService.cs), [LocaleProvider](../pwa/src/components/common/LocaleProvider.tsx), [flags](../api/src/RecipeApi/Services/FeatureFlagService.cs) | [flag service tests](../api/src/RecipeApi.Tests/Services/FeatureFlagServiceTests.cs), [locale integrity](../pwa/src/locales/locale-integrity.test.ts) | Identity, configuration; consumed by other domains / high semantics; full localization medium |
| App installation: enter through an installed household app | Manifest identity/icons, shortcuts, standalone presentation, link/PDF share transport/staging, interruption; no assumed full offline support | [manifest route](../pwa/src/app/manifest.json/route.ts), [PDF manifest](../pwa/src/lib/pdfManifest.ts), [service worker](../pwa/public/sw.js) | [install browser tests](../pwa/e2e/install-identity.spec.ts), [PDF browser tests](../pwa/e2e/pdf-capture.spec.ts) | Identity, capture, flags, browser/OS/deployment / medium |
| Household live updates: reconcile shared household activity | Connection requirements, current-week initial snapshot, event payloads, week filtering, reconnect/optimistic guards, echo suppression, readiness/failure notices | [stream controller](../api/src/RecipeApi/Controllers/StreamController.cs), [connection manager](../api/src/RecipeApi/Infrastructure/SseConnectionManager.cs), [browser hook](../pwa/src/hooks/useScheduleStream.ts) | [stream integration](../api/src/RecipeApi.Tests/Integration/StreamControllerIntegrationTests.cs), [hook tests](../pwa/src/hooks/useScheduleStream.test.ts) | Identity and domain publishers / high local mechanics; multi-replica guarantees absent |
| Background processing: execute and inspect long-running work | Required parameters, dependency validation/promotion, persisted task states, retries/scheduling, stale-task reaping, diagnostics/reset; observable behavior, not a processor-by-processor spec | [orchestrator](../api/src/RecipeApi/Services/WorkflowOrchestrator.cs), [worker](../api/src/RecipeApi/Services/WorkflowWorker.cs), [workflow API](../api/src/RecipeApi/Controllers/WorkflowController.cs) | [orchestrator tests](../api/src/RecipeApi.Tests/Services/WorkflowOrchestratorTests.cs), [worker tests](../api/src/RecipeApi.Tests/Services/WorkflowWorkerTests.cs), [reaper tests](../api/src/RecipeApi.Tests/Services/WorkflowWorkerReaperTests.cs) | Database, configured workflow definitions and processors / high mechanics; exactly-once unestablished |
| Data backup/recovery: preserve and reconstruct household state | Actual export inclusion/exclusion, restore/merge, asset recovery, search sidecars/reconciliation, reports, cleanup and scheduled maintenance; distinguish app export from infrastructure backup | [ManagementService](../api/src/RecipeApi/Services/ManagementService.cs), [management API](../api/src/RecipeApi/Controllers/ManagementController.cs), [dreaming YAML](../api/src/RecipeApi/Workflows/dreaming.yaml) | [backup integration](../api/src/RecipeApi.Tests/Integration/ManagementBackupIntegrationTests.cs), [search recovery tests](../api/src/RecipeApi.Tests/Integration/SearchIndexBackupRestoreTests.cs), [PDF PostgreSQL recovery](../api/src/RecipeApi.Tests/Integration/PdfCapturePostgresTests.cs) | All persisted domains, assets, workflows/deployment / medium |
| Demo household: operate a resettable showcase | Snapshot capture/restore, activity clearing, restore schedule, health/auth presentation, actual AI bypass boundaries; no blanket no-AI-cost claim | [demo state methods](../api/src/RecipeApi/Services/ManagementService.cs), [demo seeder](../api/src/RecipeApi/Services/DemoWorkflowSeeder.cs), [chat blocker](../api/src/RecipeApi/Services/DemoModeChatClient.cs), [registrations](../api/src/RecipeApi/Program.cs) | [demo seeder tests](../api/src/RecipeApi.Tests/Services/DemoWorkflowSeederTests.cs), [management tests](../api/src/RecipeApi.Tests/Controllers/ManagementControllerTests.cs), [demo browser tests](../pwa/e2e/demo-mode.spec.ts) | Identity, snapshot data/assets, workflows, provider boundaries / medium |

### Shared rule ownership

These owners were approved in phase 0 on 2026-10-15 (A04). A consuming spec
references an owning requirement
and describes its local consequence rather than copying its definition. References
must identify actual accepted requirements once they exist; do not invent IDs now.

| Shared rule | Approved owner | Important consumers |
| --- | --- | --- |
| Household access, member context and attribution | Household identity | All protected/member-attributed journeys |
| Recipe readiness, deletion, provenance and persisted facts | Recipe library | Capture, quality, search, discovery, sharing, cooking |
| Vote identity, totals and consensus meanings | Recipe discovery | Planning, search explanations |
| Week/date interpretation and calendar transitions | Meal planning | Tonight, groceries, cooking, search eligibility |
| Workflow states, acceptance/delivery distinction and retry semantics | Background processing | Capture, quality, indexing, operations |
| SSE delivery/reconnect semantics | Household live updates | Planning, groceries, discovery, notifications |
| Member language/browse preference and preview resolution | Member preferences | Cooking, planning, PDF acquisition |
| Processing language and source acquisition | Recipe capture | Initial import and contextual re-import |
| Background navigation and progress feedback | Affected journey, initially recipe capture | Quality and long-running library actions reference shared behavior if review identifies a common owner |

Do not duplicate server eligibility, affinity, recency, or calendar calculations in
client specifications as independently owned policy. Accessibility/responsiveness
should describe evidenced controls, focus, gestures/alternatives and layouts in
their journeys, without inventing a universal compliance guarantee.

## Progressive extraction workflow

### Phase 0 — approve the baseline frame

- [x] Reference repository behavior at a recorded commit (user confirmed 2026-10-15; A05).
- [x] Approve the 17 capability paths and shared owners, including navigation within affected journeys (user confirmed 2026-10-15; A04).
- [x] Extract ordinary-household behavior first; defer demo, preview and Synology variants to separate slices (user confirmed 2026-10-15; A09).
- [x] Accept implementation-supported behavior for initial drafts with traced source and inspected test assertions; runtime checks explicitly not-run (user confirmed 2026-10-15; A10).
- [x] Include operator/API-only capabilities and workflows in the eventual baseline, through separately selected later slices after household journeys (user confirmed 2026-10-15; A11).
- [x] Record disputed/incomplete behavior as evidence and uncertainty; withhold normative claims until resolved or explicitly accepted as current behavior; no repairs (user confirmed 2026-10-15; A12).
- [x] Authorize only `baseline-household-identity-existing-member-selection`, stopping at a validated draft for human review (user confirmed 2026-10-15; A06).

Ask only the next consequential question; do not require all questions to be
answered before useful independent discovery can continue. Do not infer approval
from this checklist's existence or from a response about a different decision.

### Extraction sequence

The order optimizes functional importance, dependencies, complexity, and available
test assertions. It is not a runtime dependency graph: establish the shared subset
needed by the next journey, then expand its owner when consumers expose more rules.

| Phase | Scope | Why now / verification focus | Initial progress |
| --- | --- | --- | --- |
| 1 | Household identity and core recipe lifecycle | Establish actors, access, readiness/deletion/provenance; focused API and UI assertions | Four identity slices promoted (25 requirements/70 scenarios); member-creation acceptance/lifecycle evidence unresolved (BSL-014/U22); core recipe lifecycle not started |
| 2 | Minimal background-processing and live-update contracts | Establish states, delivery limits and notifications before dependent journeys; reconcile navigation in its actual flow | Not started |
| 3 | Meal planning, one operation/state transition at a time | Central business capability with broad tests; keep week/day states, non-cooking plans and partial failures distinct | Not started |
| 4 | Grocery shopping | Depends on actual assignments/ingredients; trace quantities, unit buckets, keys, corrections and shared checks | Not started |
| 5 | Cooking and tonight decisions, as separate bounded slices | Frequent journeys; validate recipe-specific completion and changed-plan recovery | Not started |
| 6 | Recipe discovery/voting | Settle match vs consensus and suggestion vs persisted assignment before recommendation extraction | Not started |
| 7 | Recipe search | High complexity and cross-domain policy; separate browse/text/similar/continuation and semantic fallback | Not started |
| 8 | Capture: photo, URL, description, then PDF | Trace each source independently; separate accepted ID, launched workflow and ready content | Not started |
| 9 | Recipe quality and recipe sharing, separately | Depends on source/lifecycle/recovery semantics and bundle privacy/validation | Not started |
| 10 | Member preferences and app installation | Reconcile earlier consumers; enumerate deployment/member/device combinations | Not started |
| 11 | Backup/recovery and demo household, separately | Broadest state effects; precisely record inclusion/exclusion, destructive resets and qualification gaps | Not started |
| 12 | Cross-capability reconciliation and final review | Resolve overlaps, missing workflows, stale evidence and unsupported claims; validate accepted baseline | Not started |

### Repeatable loop for one capability slice

1. Resume from the recorded checkpoint and current user scope. Record branch,
   commit and dirty paths; preserve unrelated edits. Read only affected authorities
   and accepted specs, then the selected sources/tests/configuration.
2. Bound one actor/workflow and its states. Trace the actual path from entry to
   persistence or workflow and back to user-visible state. Include API-only entry
   points when selected; do not assume a UI exists for every endpoint.
3. Record the ten discovery fields and behavior evidence entries. Inspect actual
   test assertions and factory substitutions. Compare implementation, OpenAPI,
   generated-client mappings, tests and documentation without editing them.
4. Resolve only decisions blocking this slice. Exclude or qualify disputed
   assertions; record defects as observations without proposing a bundled fix.
5. If drafting is authorized, use the installed OpenSpec workflow and current
   instructions to create a documentation-only change for the bounded slice.
   Prefer a name such as `baseline-<capability>-<slice>`. Let the CLI scaffold
   metadata; never hand-create a change directory. Resolve the root/store before
   writes; do not initialize/reconfigure OpenSpec as a side effect.
6. Obtain artifact instructions and follow their actual dependency order. Keep
   proposal/tasks about evidence reconciliation and specification extraction.
   For a capability with no main spec, draft ADDED requirements. Do not invent
   implementation tasks, test-first cycles, future architecture, or code changes.
   Apply optional-artifact rules from the installed workflow instead of making
   empty design documents. Existing accepted specs require semantic reconciliation.
7. Write observable requirements/scenarios only for supported, settled behavior.
   Include configuration, failure/recovery and compatibility boundaries. Keep
   evidence IDs, confidence and unresolved findings in this plan; map them to the
   drafted requirements/scenarios. Format and grammar come from current OpenSpec
   instructions, not assumptions in this document.
8. Review each normative statement against evidence. Validate selected artifacts
   with the current CLI. Distinguish grammar validity from behavioral verification.
   Present the draft and evidence gaps for human review; do not label it accepted.
9. After authorized acceptance/promotion, use the installed sync workflow for the
   selected delta paths to update main specs. Do not copy delta sections blindly
   or widen the selected capability. Archive only if separately authorized or
   already covered by the user's recorded scope. No application implementation.
10. Update this plan's status, decisions, evidence mapping and next action before
    final verification. Report exactly what was drafted, accepted or promoted.

For each slice, check applicable actor/household scope, entry and exit, state and
eligibility, concurrency, async feedback, failure/recovery, localization, device
and accessibility behavior, contracts/persistence, and acceptance evidence. These
are discovery questions, not assumed guarantees or requirements to add functionality.

When the user has already authorized a stage or a sequence of slices, continue
within that scope without asking again. A newly discovered consequential conflict
still withholds the assertion that depends on it; it need not halt unrelated work.

### Slice acceptance and status

A draft is ready for review when its scope is bounded, every normative assertion
has evidence, shared ownership is coherent, uncertainty is explicit, source links
resolve, and applicable OpenSpec/documentation checks pass. Runtime verification
can remain not-run if the approved extraction standard permits source-supported
claims; never call those claims verified.

Use separate status fields rather than one checkbox implying all forms of success:

| Field | Allowed state |
| --- | --- |
| Discovery | Not started / inspecting / reconciled with listed unknowns |
| Artifact | None / draft / validated |
| Human review | Pending / changes requested / accepted with date and scope |
| Main spec | Absent / promoted with recorded delta and revision |
| Runtime evidence | Not-run / partial / verified for named scenarios and identity |

A capability is baseline-complete only when its approved scope is accepted,
promoted, mapped to evidence, and validated. Known excluded/uncertain behavior must
remain visible. Do not mark the application itself fully tested or qualified.

## Completed baseline slice — household identity / existing-member selection

Authorized drafting, 2026-10-15. A04–A05 and A09–A12 settle the frame;
A06 authorizes only the named documentation-only change, stopping at a validated
draft for human review. A13 subsequently records human acceptance of that spec and
explicit design authoring authority. A14 subsequently authorizes main-spec promotion
of this accepted delta only. A15 authorizes archival of the completed change.
Runtime qualification and application implementation remain outside current authorization.

| Field | Selected scope / finding |
| --- | --- |
| Domain name | Household identity (approved capability path; bounded slice drafting authorized in A06) |
| Business purpose | Choose the household actor used by subsequent journeys; the guide's no-personal-account description is consistent with separate shared access and member context |
| Implemented capabilities inspected | List existing members, select one at onboarding, retain browser identity, recover current member, display selected name on Profile |
| Important workflow | With household access already established, open onboarding, load members, select an existing name, navigate Home, recover identity on a protected route, display selected member on Profile |
| Business rules | Shared access is separate from member ID; API binder prefers a valid header GUID then cookie GUID; current-member lookup requires an existing record; selection itself writes browser identity rather than a database session |
| Dependencies | Next server actions/cookies, Zustand, Kiota client, shared access configuration, API global authorization/filter, EF family-member data; no workflow enqueue in this slice |
| Exclusions | Passphrase entry/invites, member creation/rename/removal, preferences, cross-device synchronization and complete profile-switch qualification |
| Uncertainty / confidence | Medium overall: executable path traced, but asynchronous selection and recovery edges lack current runtime evidence; U08/U10/U11 remain open |
| Status | Discovery reconciled with listed unknowns; spec accepted 2026-10-15; design newly authored for review; strict validation passed; selected slice promoted to main spec 2026-10-15 (A14); runtime not-run |

### BSL-household-identity-001 — select and recover an existing member

**Actor/entry/outcome:** A person with household access chooses an existing member
from onboarding. The handler sets the identity cookie, calls the store selection,
marks onboarding complete and replaces the route with Home. Profile resolves the
selected ID against loaded members and displays the selected name. This is
**implementation-supported**, medium confidence; no current runtime observation.

**Ordered trace and source anchors:**

1. `pwa/src/app/(auth)/onboarding/page.tsx`, `handleFamilyMemberSelected` and
   load effect → [FamilySelector](../pwa/src/components/identity/FamilySelector.tsx)
   → [FamilyMemberList](../pwa/src/components/identity/FamilyMemberList.tsx), name buttons.
2. [useFamily](../pwa/src/hooks/useFamily.ts) →
   [familyStore](../pwa/src/store/familyStore.ts), `loadFamilyMembers`,
   `selectFamilyMember`, `loadCurrentIdentity` →
   [family API adapter](../pwa/src/lib/api/family.ts), `getFamilyMembers` and
   `getCurrentFamilyMember` → [client](../pwa/src/lib/api/api-client.ts),
   `HearthAuthProvider` injects selected ID as `X-Family-Member-Id`.
3. [OpenAPI](../specs/openapi.yaml), GET `/api/family` and `/api/family/me` →
   generated [family builder](../pwa/src/lib/api/generated/api/family/index.ts) and
   [current-member builder](../pwa/src/lib/api/generated/api/family/me/index.ts),
   response `data` deserialization →
   [FamilyController](../api/src/RecipeApi/Controllers/FamilyController.cs),
   `GetAll` / `GetMe` → [FamilyService](../api/src/RecipeApi/Services/FamilyService.cs),
   `GetAllFamilyMembers` orders by name →
   [RecipeDbContext](../api/src/RecipeApi/Data/RecipeDbContext.cs), `FamilyMembers` →
   [SQL](../api/database/schema.sql), `family_members`.
4. [Program](../api/src/RecipeApi/Program.cs) applies shared-access authorization
   and [SuccessWrappingFilter](../api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs)
   supplies the success `data` envelope. The
   [binder](../api/src/RecipeApi/Infrastructure/FamilyMemberIdModelBinder.cs)
   resolves header/cookie identity for `GetMe`; this reads records without creating
   a persisted session.
5. [auth server actions](../pwa/src/lib/auth.ts), `setFamilyMemberCookie` →
   HttpOnly cookie with one-year max age, Lax, root path and configured domain;
   Secure depends on production/test/domain conditions.
   [cookie helper](../pwa/src/lib/identity/cookie.ts) supplies the readable fallback.
   [IdentityValidator](../pwa/src/components/identity/IdentityValidator.tsx) attempts
   cookie/server recovery before redirecting to onboarding.
   `pwa/src/app/(app)/profile/page.tsx` →
   [ProfileDropdown](../pwa/src/components/profile/ProfileDropdown.tsx),
   `selected-member-name`, supplies the visible name.

**Failure/configuration boundaries:** Family-list failures set store error and
`hasLoaded`; onboarding renders an alert. `getCurrentFamilyMember` collapses all
exceptions to null, so unavailable API and absent identity are not distinguished
by recovery. `GetMe` returns 401 for missing/unparseable identity and 404 for an
unknown ID after global access checks. Validator clearing of a missing member
requires a nonempty loaded list; do not claim universal stale-identity rejection.
Onboarding awaits its initial cookie action but does not await the store selection
(which writes the cookie again); profile selection also navigates without awaiting
selection. Successful ordering, error recovery and cookie retention across device
interruptions remain unverified. Cookie domain, HTTPS, test environment and API
base URL affect behavior; no deployed installation was inspected.

**Tests and substitutions inspected:**
[identity-persistence browser tests](../pwa/e2e/identity-persistence.spec.ts) assert
Alex's visible name across Profile/Home/Profile, a populated Settings family list,
and retained name after a browser-intercepted family-fetch 500. They preseed a
cookie and legacy `family-storage` localStorage; the current store uses cookie
initialization, not Zustand persistence. These assertions do not exercise actual
selection or prove server-side fetch failure. [Fixtures](../pwa/e2e/fixtures.ts)
inject access, fix browser time, block unhandled API calls;
[mocks](../pwa/e2e/mock-api.ts) supply members and a successful `/me` even without
an identity cookie; [Playwright config](../pwa/playwright.config.ts) blocks service
workers. `pwa/src/app/(app)/profile/page.test.tsx` only asserts stub controls with
mocked family hook/router. [FamilyServiceTests](../api/src/RecipeApi.Tests/Services/FamilyServiceTests.cs)
assert returned membership, not alphabetical ordering, using
[in-memory EF](../api/src/RecipeApi.Tests/Infrastructure/TestDbContextFactory.cs).
[FamilyControllerTests](../api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs)
assert list envelope and create/list visibility; this file has no `/me` assertions.
Its [factory](../api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs)
defaults to disabled auth and in-memory EF with substituted workflow orchestration.
None of these tests was run in this session.

**Agreement/limits:** Success envelope agrees across filter, contract and client.
The [family guide](user-guide.md) opening journey supports the purpose, but is
secondary evidence. `/me` implementation's unknown-member 404 is absent from its
OpenAPI responses and generated error mapping: **missing/incomplete contract
coverage**, not permission to edit it. Purpose interpretation is consistent with the
approved capability frame; source paths remain **implementation-supported**, not
verified behavior. Personal authentication, guaranteed persistence and complete
recovery remain excluded. Disposition: drafted for supported claims only;
requirement/scenario mapping follows below.

### Phase-0 review recommendation and checks

Recommend repository behavior at the recorded source identity as the baseline
reference, with configuration conditions on individual claims and separate named
deployment qualification. The user confirmed this reference choice on 2026-10-15 (A05). It avoids
turning mock/static evidence into a claim about an unidentified installation.
The user approved the 17 capability paths and shared rule owners on 2026-10-15
(A04), including navigation within affected journeys. This approves the extraction
map, not normative behavior, individual drafts or generation authority.
The loaded mission document still links the deleted navigation spec; record that
stale reference without restoring the capability or editing agent configuration.

Content/environment: branch `moving-to-openspec`, commit
`7e0dcdbe162704debe8a0f916eb1f7327afc77a5`, local macOS workspace on 2026-10-15.
Inspected application/contract/test inputs have no Git changes against HEAD.
Pre-existing README edits, four documentation/navigation deletions and this
untracked plan were present at entry; only this plan is session-owned.

| Check | Outcome / interpretation |
| --- | --- |
| `git status --short`, `git rev-parse HEAD`, `git branch --show-current` | Passed; recorded source and dirty inputs before discovery |
| `openspec --version` | Passed; 1.14.1 |
| `openspec list --json` | Passed; nearest root `/Users/alex/Code/whats-for-supper`, no changes |
| `openspec list --specs --json` | Passed; same root, no main specs |
| `openspec store list --json` | Passed; no registered stores; local `openspec/config.yaml` selects `spec-driven` without a store declaration |
| Bounded source/test/configuration/documentation inspection | Completed static review; behavior remains implementation-supported or qualified above |
| Application/browser/API/PostgreSQL/device checks | Not-run; discovery-only scope, no runtime qualification selected |
| OpenSpec artifact validation | Not-applicable; no spec/change artifacts created |
| `task verify -- docs/openspec-baseline-plan.md` | Passed on review content; rerun after final record/format edits. Final content identity/outcome is in `.task/agent-finish/last-run.json`; checks introduced links and whitespace, not unrelated deletions or application behavior |

**Reference decision settled:** Describe repository behavior at a recorded commit,
per the user on 2026-10-15. Current source remains
`7e0dcdbe162704debe8a0f916eb1f7327afc77a5`; reconcile source identity for each
future slice. This does not establish deployed behavior or runtime verification.

**Structure decision settled:** The user approved the 17 capability paths and shared
rule owners, with navigation within affected journeys and no recreation of the
deleted standalone navigation capability, on 2026-10-15 (A04).

**Profile decision settled:** Extract ordinary-household behavior first; demo,
preview and Synology variants are deferred to separate slices, per the user's
2026-10-15 confirmation (A09). They remain in the eventual extraction map; this is
sequencing, not an assertion about supported deployment behavior.

**Evidence decision settled:** Implementation-supported behavior is sufficient for
initial drafts when backed by traced source and inspected test assertions, with
runtime checks explicitly marked not-run, per the user's 2026-10-15 confirmation
(A10). Runtime qualification remains separate; test-source inspection is not a
passing test. No inferred or disputed normative claim is authorized by this standard.

**Operator/API/workflow scope settled:** The user confirmed “yes and workflows too”
on 2026-10-15 (A11). Include operator/API-only capabilities and workflows in the
eventual baseline, through separate later slices after household journeys. Include
business workflow outcomes within their capability owners and shared orchestration
behavior under background processing; this does not add a new capability path or
authorize a processor-by-processor implementation spec. Trace actual configured
workflow definitions, launch parameters, persisted states and observable outcomes
when their slice is selected. No workflow execution, drafting or application change
is authorized by this inclusion decision.

**Disputed-behavior decision settled:** Per the user's 2026-10-15 confirmation
(A12), keep disputed/incomplete behavior in the evidence and uncertainty register;
withhold normative claims until resolved or explicitly accepted as current behavior.
This does not authorize repairs or settle any individual disputed claim.

**Drafting authorization settled:** On 2026-10-15 the user answered “yes.” to the
explicit request to create `baseline-household-identity-existing-member-selection`
with proposal, spec delta and extraction tasks, then stop at a validated draft for
review (A06). The user subsequently accepted that bounded spec and requested its
design on 2026-10-15 (A13). Main-spec promotion was separately authorized and performed under A14; archival was separately authorized and performed under A15. Application
implementation has not occurred.

### BSL-household-identity-002 — protected entry and recovery boundary

Rechecked at the same commit on 2026-10-15, without application-source changes.
[proxy](../pwa/src/proxy.ts), `proxy`, checks household access first and redirects
protected full-page requests without a member cookie to onboarding. Thus client
recovery is conditional on reaching [IdentityValidator](../pwa/src/components/identity/IdentityValidator.tsx);
it is not recovery from a completely absent browser identity on every entry path.
The validator attempts `/me` only when selected state and a readable cookie are
absent. [family API adapter](../pwa/src/lib/api/family.ts) maps failed/empty recovery
to null; [familyStore](../pwa/src/store/familyStore.ts), `loadCurrentIdentity`, sets
the returned member ID and adds its profile only when not already listed. An
existing local profile is not refreshed by this recovery method. With no recovered
or concurrently selected member the validator requests onboarding; test mode adds
one 100 ms wait before its final check.

Ordered trace: protected request → proxy access/context gates → client validator →
family adapter/generated `/me` builder → binder/controller/service → persisted
`family_members` read → store selection → Profile name display. Browser API base
URL/cookie delivery and access configuration remain prerequisites. Native member
buttons have named labels and selected-state text; no universal keyboard, device,
localization or accessibility qualification is claimed.

Evidence class: **implementation-supported**, medium confidence. No focused
runtime assertion was executed for either server gate or client recovery. The
inspected browser mock defaults `/me` to successful Alex even without a member
cookie, and the identity test preloads that cookie; neither establishes this
negative/recovery path. Disposition: drafted only with explicit client-entry
preconditions. Check outcome: runtime not-run; static reconciliation completed.
U13 retains disputed and missing contract/device behavior.

### Draft requirement/scenario evidence mapping

Selected delta: [household-identity spec](../openspec/changes/archive/2026-10-15-baseline-household-identity-existing-member-selection/specs/household-identity/spec.md).
Every row is implementation-supported, not runtime-verified. Test references are
assertion evidence only; absence of focused assertions is explicit.

| Requirement | Scenarios (exact draft names) | Evidence / source anchors | Inspected assertions / limits |
| --- | --- | --- | --- |
| List existing household members for selection | Existing members are available; The household has no members; Member loading fails | BSL-household-identity-001: onboarding load effect/alert, FamilyMemberList controls/empty text, familyStore.loadFamilyMembers, client GET family, FamilyController.GetAll, FamilyService.GetAllFamilyMembers, EF/SQL | FamilyControllerTests.GetAll_Returns_Ok_With_Array; FamilyServiceTests.GetAllFamilyMembers_Returns_All_Members. No focused onboarding empty/failure assertion found in the selected test set; browser fetch-failure test only retains Profile name |
| Select an existing member from onboarding | Successful existing-member selection | BSL-household-identity-001: FamilyMemberList.onSelect → onboarding handler → auth cookie action / familyStore.selectFamilyMember → Home; selection makes no create API call | Identity-persistence tests preseed identity rather than selecting; no focused live selection assertion inspected; both cookie writes must succeed, no ordering/interruption guarantee |
| Resolve the current member through the API | Header identity takes precedence; Cookie supplies the member identity; No parseable member identity is supplied | BSL-household-identity-001: generated `/me` builder and OpenAPI 200/401, FamilyMemberIdModelBinder, FamilyController.GetMe, FamilyService, success wrapping filter, EF/SQL; BSL-household-identity-002 entry limits | No `/me` assertions in inspected FamilyControllerTests; browser `/me` success is substituted. Unknown-member 404 excluded from normative delta because contract omits it |
| Recover identity when the protected client has no selection | Recover a server-readable identity; Recovery yields no member | BSL-household-identity-001/002: proxy, IdentityValidator recovery branch, family adapter null/error mapping, familyStore.loadCurrentIdentity | No focused negative/recovery runtime check; mock accepts absent identity; full-page missing-cookie redirect precedes client recovery |
| Display the selected member on Profile | Display a loaded selected member | BSL-household-identity-001: useFamily case-insensitive ID matching, ProfilePage → ProfileDropdown.selected-member-name | Identity-persistence tests assert Alex visible across navigation; Profile unit test stubs controls; no focused case-variation assertion inspected |

The source review found no normative claim requiring an application change. The
requirements describe only the settled subset; no shared owner from another
capability needs a new placeholder requirement or fabricated reference.

### Artifact and check handoff

Change directory: `openspec/changes/archive/2026-10-15-baseline-household-identity-existing-member-selection/`.
Created: CLI `.openspec.yaml`, `proposal.md`, `specs/household-identity/spec.md`,
`tasks.md`, and now [design.md](../openspec/changes/archive/2026-10-15-baseline-household-identity-existing-member-selection/design.md).
Main spec created under A14: [household-identity](../openspec/specs/household-identity/spec.md).
Design was initially omitted under the installed conditional
instruction; A13 explicitly requested it after accepting the bounded spec. That
request supersedes the omission. The design documents existing seams and extraction
decisions without changing the accepted requirements. CLI status now reports all
four planning artifacts complete; file-existence status is not runtime evidence
or authorization to apply application implementation.

| Check / review | Outcome and content/environment scope |
| --- | --- |
| `openspec list --json`, `openspec list --specs --json`, `openspec context --json` before scaffolding | Passed; nearest local root `/Users/alex/Code/whats-for-supper`, no active changes or main specs at entry; no store selected or config changed |
| `openspec new change baseline-household-identity-existing-member-selection` | Passed; CLI scaffold created local metadata using configured `spec-driven` schema |
| Artifact `instructions` and `status` commands | Passed; original conditional design skip superseded by explicit A13 request; design instructions re-read and status now reports 4/4 artifacts complete |
| Selected source/contract/client/test recheck and normative review | Completed static review at commit `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`; inspected application inputs unchanged; five requirements / ten scenarios mapped above |
| `openspec validate baseline-household-identity-existing-member-selection --strict --no-interactive` | Passed on draft; rerun after final task/plan edits; grammar validation is not behavior verification |
| `task verify -- <plan, all five change files, and promoted main spec>` | Passed: documentation and `spec:check` (all-strict OpenSpec validation; promotion run: 1 change and 1 main spec passed, 0 failed). Rerun after final record/task/wording edits; final content identity in `.task/agent-finish/last-run.json`; explicit path set excludes unrelated edits/deletions |
| Runtime browser/API/PostgreSQL/device checks | Not-run under A06/A10; no new runtime evidence |
| Behavior TDD, app lint/type/unit/integration checks, contract/client regeneration | Not-applicable to this documentation-only edit |
| Human acceptance / main-spec promotion / archival | Existing five-requirement/ten-scenario spec accepted by user on 2026-10-15 (A13); newly authored design does not extend spec acceptance / promoted 2026-10-15 (A14) / archived 2026-10-15 (A15) |

All check results refer to the local macOS workspace, branch `moving-to-openspec`,
recorded source commit above and task-owned documentation changes. Final harness
identity captures documentation content; it does not qualify an installation.
No failed or sandbox-blocked required check has been observed.

### Main-spec promotion record — 2026-10-15

A14 authorizes only the accepted delta from
`baseline-household-identity-existing-member-selection`. Used the installed
`openspec-sync-specs` workflow: confirmed the nearest local root and resolved
`planningHome.root`, fetched current specs instructions, selected the sole delta
from `artifactPaths.specs.existingOutputPaths`, and confirmed its main spec absent.
The delta contains only ADDED requirements. Created the main spec with its Purpose
verbatim and all five requirements/ten scenarios unchanged under `## Requirements`;
no delta operation headers or placeholder purpose were promoted.

- Main path: `openspec/specs/household-identity/spec.md`.
- Source delta: `openspec/changes/archive/2026-10-15-baseline-household-identity-existing-member-selection/specs/household-identity/spec.md`.
- Main revision: uncommitted promotion, SHA-256 `7e2b599180366ba2d4c2853d7c03848c15fa9b792aa9e3027757c5d973e2d28b`.
- Evidence mapping: the five rows above now also map to identically named main-spec
  requirements/scenarios; BSL-household-identity-001/002 and U13 remain authoritative
  evidence/limitations. Only this slice is baseline-complete; household identity's
  wider scope remains incomplete.
- `openspec validate --specs`: passed, 1 main spec.
- `openspec validate --all --strict --no-interactive`: passed, 1 change and 1 spec,
  0 failed. Final bounded documentation/spec checks use the seven-path set in the
  harness record. No runtime checks run, no source behavior changed.
- Change was subsequently archived under A15; no commit or application implementation.

### Archive record — 2026-10-15

A15 explicitly authorizes the selected completed change's archival. Installed
archive workflow inputs resolved the local root and `spec-driven` schema. All four
artifacts and all seven tracked tasks were complete. Purpose and every accepted
requirement/scenario matched the promoted main spec before the move; no sync was
needed. Moved the complete directory, including `.openspec.yaml`, to
`openspec/changes/archive/2026-10-15-baseline-household-identity-existing-member-selection/`.
Repaired design source links for the additional directory depth and updated
lifecycle references. The accepted delta and promoted main-spec content were not
changed. Archive status does not establish runtime qualification or new behavior.

Final checks: `openspec list --json` for no active changes;
`openspec validate --all --strict --no-interactive` for the promoted main spec;
explicit archived-delta/main Purpose and requirement/scenario comparison; and
`task verify` over this plan, the five archived files and the main spec. The CLI's
all-validation inventory excludes archived changes, so archived document links and
content are covered by explicit checks, not inferred from the remaining main-spec
validation. Final results/content identity are recorded in the session response
and `.task/agent-finish/last-run.json`. No runtime checks were run.

## Completed baseline slice — household identity / shared access

**Scope/authority:** A16 authorized discovery/review of ordinary-household
passphrase entry → access cookie → protected-page/API access → rejection and
recovery. A17 settled token-age treatment. A18, 2026-10-15, now authorizes only
`baseline-household-identity-shared-access`: proposal, ADDED identity delta,
extraction design/tasks, evidence/plan updates and bounded validation, stopping at
a draft for human review. No existing requirement edit, promotion, archival, fix
or runtime exercise is authorized. A19 subsequently records acceptance of the
seven-requirement/21-scenario delta without changing its content. A20 then
authorizes its main-spec promotion only. Demo, preview,
Synology, invites/join and operator workflows remain separate slices. Existing
member selection and `/api/family/me` rules remain owned by the accepted
[identity spec](../openspec/specs/household-identity/spec.md); this review describes
only where shared access hands off to those rules.

| Field | Discovery result |
| --- | --- |
| Purpose / actor | A household visitor supplies the family's shared passphrase to enter the app; it establishes household access before member selection. Purpose interpretation is inferred from Welcome copy and [family guide](user-guide.md), aligned with approved ownership. |
| Implemented workflows | Welcome submission and retry; signed access-cookie storage; PWA access gate then member-context gate; browser same-origin and Home server-fetch API access; independent API challenge. BSL-household-identity-003/004/005 below. |
| Rules / dependencies | PWA and API `HEARTH_SECRET` must agree; browser cookie delivery depends on origin/domain/HTTPS; API URL and routing differ between browser and server; no authentication DB/session write in the traced path. |
| Evidence identity | Branch `moving-to-openspec`, commit `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`, 2026-10-15. Traced source/contract/tests have no local edits. Plan and existing identity main/archive artifacts were already untracked; unrelated README edit and four deletions preserved, including background-task-navigation. |
| Confidence / qualification | High for directly visible action/validator/gate branches; medium end to end because cookie transport, configuration and recovery assertions are incomplete. No runtime-verified shared-access claims. |
| Artifact status | Shared-access spec accepted A19, promoted A20 and archived A25 on 2026-10-15. Seven requirements/21 scenarios remain in main; total identity now 18 requirements/49 scenarios. Archive metadata/delta preserved; prior existing-member-selection archive unchanged. Runtime not-run; evidence limits retained. |
| Discovery/store resolution | `openspec list --json` and `openspec list --specs --json` both exited 0: root path `/Users/alex/Code/whats-for-supper`, source `nearest`; local `openspec/`, no declared external store in config. At discovery changes were empty; only `household-identity`, five requirements. Full `openspec show household-identity --type spec` inspected. A18 rechecked root/context/inventory, then CLI-scaffolded the selected shared-access change; no initialization/reconfiguration. |

### BSL-household-identity-003 — passphrase entry and access-cookie state

**Entry/outcome and ordered trace:**

1. `pwa/src/app/(auth)/welcome/page.tsx`, `WelcomePage.handleSubmit`: blank/whitespace
   input disables Enter; pending submission displays Checking and disables Enter.
   Submit clears the previous error and invokes the Next server action
   [authenticateWithPassphrase](../pwa/src/lib/auth.ts). This is a Next server-action
   boundary, not a generated Kiota/OpenAPI login operation or API service call.
2. The action reads server `HEARTH_SECRET`; missing/empty configuration returns
   `{ success: false }`. Comparison trims both passphrase and configured secret
   and is case-sensitive. Successful comparison calls
   [generateSecretToken](../pwa/src/lib/auth-utils.ts), signing `Date.now()` text
   with HMAC-SHA256 using the original, untrimmed configured secret, returning
   `<timestamp>.<base64url signature>`. No member ID or role is signed.
3. Welcome awaits [setHearthCookie](../pwa/src/lib/auth.ts) with that token before
   requesting `router.replace('/onboarding')`. The setter stores the supplied
   value without revalidation: HttpOnly `h_access`, one-year `maxAge` (31,536,000
   seconds), Lax, path `/`, optional `NEXT_PUBLIC_COOKIE_DOMAIN`. Secure is enabled
   only for production, non-test environment and a domain not containing
   `localhost`. This records source options, not observed browser retention.
4. Persistence is browser cookie state; the traced authentication actions create
   no family member, personal account, database session or workflow. Member
   selection starts at onboarding under the already accepted identity rules.

**Failure/retry:** A false result (wrong input or absent secret) shows the localized
incorrect-passphrase message, suggesting asking a family member. Action/cookie
exceptions show the generic retry message. `finally` clears pending; the input is
retained and can be edited/resubmitted. The ordinary-household health request on
mount is convenience-only; a failure is caught and does not disable the form.
See locale keys `auth.errorIncorrectPassphrase` and `auth.errorGeneric` in
[pwa English copy](../pwa/src/locales/en/common.json) and
[French copy](../pwa/src/locales/fr/common.json). No return-to-original-path logic
is implemented by this submission; success requests onboarding.

**Assertions/substitutions:** [auth-flow.spec.ts](../pwa/e2e/auth-flow.spec.ts),
`user can log in with passphrase`, clears the fixture-injected cookies, fills the
configured/test-default passphrase, clicks Enter, and asserts the onboarding URL.
It does not inspect Set-Cookie attributes or exercise the real API auth handler.
`pwa/src/app/(auth)/welcome/page.test.tsx` mocks router,
health, authentication and cookie actions; its ordinary checks assert branding,
empty input and disabled Enter, with no submit/error/retry assertions. Its demo
assertion is outside this slice. [fixtures](../pwa/e2e/fixtures.ts) mock health and
return 403 for unhandled browser API calls. [Playwright config](../pwa/playwright.config.ts)
uses a test secret/test cookie environment and blocks service workers. Thus test
source supports only the named observations, not real cookie/API integration.

**Evidence/classification:** Implementation-supported, high for direct branches,
medium for browser handoff. No login OpenAPI contract to reconcile because this
is a PWA server action. Tests inspected, not executed; browser/API/device checks
**not-run** by scope. No runtime-verified claim. Disposition: drafted supported observations only under
A18; requirement/scenario mapping below.

### BSL-household-identity-004 — separate page and API access gates

**Ordered trace and observable boundaries:**

1. [proxy.ts](../pwa/src/proxy.ts), `proxy`: before page access, `/_next*`,
   `/favicon*` and paths containing `.` bypass both gates. `/welcome`, `/invite`,
   `/join`, `/api` and their descendants bypass the access gate. Other paths,
   including `/onboarding`, require a configured secret and an `h_access` value
   accepted by [validateSecretToken](../pwa/src/lib/auth-utils.ts). Missing or
   invalid access redirects to Welcome; a present rejected cookie is deleted
   through the response cookie API. These exclusions preclude a claim that every
   PWA URL is access-protected.
2. With access accepted, the separate context gate exempts those public paths
   plus onboarding. Other paths require a nonempty `x-family-member-id` cookie,
   otherwise redirect to onboarding. It does not parse/lookup the member here.
   A member cookie alone cannot pass the preceding access gate. Further member
   recovery belongs to BSL-household-identity-001/002 and the accepted spec.
3. Browser API requests use [api-client.ts](../pwa/src/lib/api/api-client.ts),
   generated endpoint builder → Kiota `FetchRequestAdapter` with
   `HearthAuthProvider` → fetch → API. The provider adds member/SSE/move headers, no household secret or
   Bearer header; it cannot read the HttpOnly access cookie. Default empty
   `NEXT_PUBLIC_API_BASE_URL` uses same-origin `/api` requests and browser cookie
   transport. Installed Kiota `getRequestFromRequestInformation` creates method,
   headers and body without a credentials override and its browser middleware
   forwards to fetch. Inspected local dependency anchors are
   `pwa/node_modules/@microsoft/kiota-http-fetchlibrary/dist/es/src/fetchRequestAdapter.js`
   and its `middlewares/browser/middlewareFactory.js` / `customFetchHandler.js`
   (installed dependency evidence, not a committed-source guarantee).
   Cross-origin authenticated delivery is therefore not an
   established capability; no deployed network/browser observation was made.
4. Home server entry (`pwa/src/app/(app)/home/page.tsx`, `HomePage`) instead uses
   [serverFetch](../pwa/src/lib/api/server-client.ts) for `/api/family` and schedule.
   It reads Next cookies, forwards `h_access` explicitly in Cookie and member ID
   as `X-Family-Member-Id`, calls `API_INTERNAL_URL + endpoint`, throws on non-OK,
   and unwraps `data`. The default internal URL is from
   [config.ts](../pwa/src/lib/constants/config.ts). No PWA API-auth proxy is
   implemented by this wrapper.
5. [Program.cs](../api/src/RecipeApi/Program.cs) registers Hearth authentication,
   middleware and a global controller `AuthorizeFilter(RequireAuthenticatedUser)`.
   [HearthAuthenticationHandler](../api/src/RecipeApi/Infrastructure/HearthAuthenticationHandler.cs),
   `HandleAuthenticateAsync`, independently tries an exact raw `X-Hearth-Secret`,
   then a case-insensitive Bearer scheme with valid HMAC token, then `h_access`.
   Failure of an earlier credential can fall through to a valid later one.
   Missing/empty configured secret fails authentication. Protected controller
   challenges yield 401, not the PWA's Welcome redirect. Health is explicitly
   `[AllowAnonymous]` in [HealthController](../api/src/RecipeApi/Controllers/HealthController.cs).
6. Success creates a `HearthFamily` principal plus `auth_method` claim, without
   member or role claims and without a DB session. It authenticates shared access;
   endpoint member binding/eligibility remains separate. The source-only
   [apps.yml](../docker/compose/apps.yml) provides the same secret variable to PWA
   and API and routes same-origin `/api` to the API. It proves neither effective
   installed values nor network/cookie delivery.

**Contract agreement/mismatch:** [OpenAPI](../specs/openapi.yaml), root `security`
uses alternative `HearthSecret` header and `HearthToken` Bearer schemes; those agree
with implemented alternatives. There is no `h_access` cookie security scheme,
although `/api/stream` prose mentions it. Health explicitly declares `security: []`.
`FamilyMemberId` describes attribution/context and is not proof of household
access. Cookie authentication is implemented but incompletely represented by
contract security metadata (U14); do not change the contract or assert full parity.

**Assertions/substitutions:** [AuthEnforcementTests](../api/src/RecipeApi.Tests/Integration/AuthEnforcementTests.cs)
asserts 401 for missing credentials and wrong raw header on recipe description,
200 for correct raw header plus member ID, and 200 for anonymous health. Its
[factory](../api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs),
`CreateWithAuthAsync`, enables the real handler/filter but constructs a separate
TestServer host rather than running Program; it supplies a test secret, in-memory
EF/recipe store and substituted workflow/AI services. Default business-test hosts
disable auth. There are no cookie/Bearer assertions in that auth test file; targeted
API test search found none elsewhere. [server-client.test.ts](../pwa/src/lib/api/server-client.test.ts)
mocks absent cookies and successful fetch; assertions check URL concatenation,
not authentication forwarding or rejection. Browser mocks cannot establish API
acceptance. Evidence: implementation-supported, high for handler/filter branches,
medium for complete configured request path. Runtime tests **not-run**; no current
passing API assertion claimed. Disposition: supported header/Bearer and separate
gate observations drafted under A18; API cookie acceptance/full parity withheld.

### BSL-household-identity-005 — rejection, recovery and token-age limits

**Rejection/recovery trace:** The proxy's failed access gate redirects to Welcome
and requests deletion of a present rejected `h_access`; it leaves the separate
member cookie untouched. A subsequent correct passphrase submission obtains a
new access cookie and requests onboarding (BSL-003). It does not preserve a return
pathname for the login action. Wrong passphrase and transient action errors can
be retried in-place, as traced above. These branches are implemented; cookie
clearing with optional domain and interrupted navigation remain unobserved.

The API handler independently rejects invalid/missing credentials. Neither the
PWA `HearthAuthProvider` nor `serverFetch` calls `clearAuth` or navigates to Welcome
on 401. `serverFetch` throws; `HomePage` catches/logs failed initial requests and
continues rendering with missing initial data. A targeted search of PWA source
found only the definition of `clearAuth`, no caller. A later proxy-gated page
request with missing/invalid access can re-enter Welcome, but this is not a
universal client-side recovery path. In particular, PWA/API secret disagreement
can let a page through while API calls fail. Do not promise automatic re-login
for every API 401 or successful recovery from configuration disagreement (U15).

**Actual time handling / U08 recheck:** PWA generation signs current millisecond
time as text. PWA `validateSecretToken` requires exactly two dot-separated parts,
base64url-decodes the signature, and verifies HMAC over the first part. API
`ValidateHmacToken` also requires two parts, recomputes the base64url HMAC of the
first part and compares its encoded text. Neither parses that part as a date,
checks its age, rejects a future timestamp by time, or consults session expiry.
Consequently a correctly signed old/future/non-date first part is not rejected
for its age/meaning by those paths: this is source-supported, not a runtime test
or an accepted normative retention policy. Browser cookie `maxAge` controls
browser retention only. A removed/expired browser cookie causes missing-access
rejection, but a retained/replayed signed token has no implemented age cutoff.
Changing the configured secret invalidates old signatures at the corresponding
gate; there is no traced per-token revocation/session store. A17 settles its extraction treatment as a non-normative limitation; U08 remains
open for the deferred identity/reporting boundary, and no one-year server-expiry
claim is supported.

**Shared access versus personal identity:** The principal has no member/role
binding; selecting a member is a distinct context operation. Rechecked the two
U08 boundary examples without expanding their baseline slices:
[WorkflowController](../api/src/RecipeApi/Controllers/WorkflowController.cs),
`GetInstance`/`GetTaskDiagnostics`, has no additional member/role gate beyond global
household access; [RecipeImportService](../api/src/RecipeApi/Services/RecipeImportService.cs),
`GetImportByIdAsync`, separately requires an existing member and matching recipe
`AddedBy`. Capturer-only import details versus household reporting remain deferred
and unreconciled. Neither example justifies a universal personal-role model or a
universal same-access-to-all-data claim.

**Assertions / limits:** [auth-flow.spec.ts](../pwa/e2e/auth-flow.spec.ts),
`unauthenticated user is redirected to /welcome`, clears seeded cookies and checks
the Welcome URL. Its login test checks onboarding navigation only. Neither it
nor the inspected Welcome unit/API auth tests asserts incorrect-passphrase UI,
action/cookie failure retry, invalid-cookie deletion, API-401 recovery, old/future
or malformed token behavior. Targeted auth/proxy test discovery found no dedicated
PWA validator/proxy unit tests. No tests or services were run to fill these gaps.
Evidence: implementation-supported for explicit branches; end-to-end recovery
**missing/incomplete**, medium confidence. Runtime/browser/device/token checks
**not-run** by scope; none runtime-verified. Disposition: supported rejection/retry
observations drafted under A18; disputed expiry/parity/recovery guarantees withheld.

### Shared-access draft requirement/scenario evidence mapping

Delta: [shared-access identity spec](../openspec/changes/archive/2026-10-15-baseline-household-identity-shared-access/specs/household-identity/spec.md).
Seven ADDED requirements, 21 scenarios; no MODIFIED/REMOVED operations. Under A20
these additions are now in the main spec alongside the unchanged five existing
requirements/ten scenarios, for a total of 12 requirements/31 scenarios. All mapped behavior is
implementation-supported; inspected assertions are source evidence, not current
passing runtime checks. Missing focused assertions do not become runtime evidence.

| Draft requirement | Scenarios | Evidence / source anchors | Assertion coverage and limits |
| --- | --- | --- | --- |
| Enter the household with its shared passphrase | Matching passphrase establishes access; Surrounding whitespace is ignored | BSL-003: Welcome.handleSubmit → authenticateWithPassphrase → generateSecretToken → awaited setHearthCookie → onboarding | auth-flow login asserts onboarding URL; no whitespace or full cookie/API integration assertion inspected |
| Give passphrase submission feedback and allow retry | Empty input cannot be submitted through Enter; Submission is pending; Incorrect passphrase can be corrected; Missing secret produces rejection feedback; Submission exception permits another attempt | BSL-003/005: Welcome input/disabled button/pending/error/finally, auth action missing-secret/trim comparison, locale error messages | Welcome unit tests mock actions/router and assert initial disabled control; submit/error/retry branches source-supported without focused assertions |
| Set household access-cookie options | Access cookie is written with configured scope; Production secure-cookie conditions apply; Secure-cookie conditions do not apply | BSL-003: setHearthCookie maxAge, HttpOnly, Lax, root path, optional domain, production/test/localhost Secure expression | No inspected response-cookie-option or deployed retention assertion; options only, no server expiry guarantee |
| Gate protected page entry with household access | Access is missing despite a member selection; Access cookie is rejected; Page gate has no secret configured; Valid access reaches onboarding | BSL-004/005: proxy access-before-context branch, validateSecretToken, redirect and response cookie deletion | auth-flow checks absent-access redirect and login reaches onboarding; invalid-cookie/missing-config/deletion branches lack focused assertions; deletion request is not universal browser-removal qualification |
| Apply member context after household access | Access is accepted but member context is absent; Both page-gate inputs are present | BSL-004: proxy context gate requires nonempty cookie only; BSL-001/002 and existing accepted identity requirements own subsequent member resolution | No focused context-gate assertion inspected; no member-existence guarantee at the proxy, no duplicate member-selection/recovery rules |
| Authenticate protected API requests independently | Raw household secret satisfies API authentication; Signed Bearer token satisfies API authentication; Protected API request has no household credentials; Raw secret is rejected | BSL-004/005: Program global AuthorizeFilter/auth middleware → HearthAuthenticationHandler, OpenAPI HearthSecret/HearthToken alternatives | AuthEnforcementTests asserts raw-header success with member and missing/wrong-header 401; factory is separate TestServer/in-memory/substituted services; Bearer has no focused inspected assertion, API cookie acceptance withheld under U14 |
| Exempt health from household authentication | Health is requested without access | BSL-004: HealthController AllowAnonymous and OpenAPI health security empty | AuthEnforcementTests asserts anonymous health 200 on substituted host; requirement promises authentication exemption only, not healthy backing services |

### Shared-access draft artifact and check handoff

**Treatment settled (A17):** Absent server-side token-age enforcement remains an
acknowledged limitation outside normative claims, not an accepted desired
retention policy. U14/U15 and the remaining identity/reporting boundary stay open.
No claim of API cookie-contract parity, cross-origin delivery, server expiry,
guaranteed persistence or universal API-401 recovery is drafted.

A18 responds to the user's “execute the next step” after the bounded drafting
recommendation and clarification that this is a documentation-only extraction.
It authorizes the selected draft, not acceptance, main-spec promotion, archival,
application implementation or reopening the prior archive. A19 subsequently
records the user's “accepted” for the presented seven requirements/21 scenarios;
the delta remains unchanged. A20 subsequently authorizes its promotion to main
specs without archival.

| Artifact / status | Path or result |
| --- | --- |
| CLI metadata / created | `openspec/changes/archive/2026-10-15-baseline-household-identity-shared-access/.openspec.yaml`, default `spec-driven` schema |
| Proposal / drafted | [proposal](../openspec/changes/archive/2026-10-15-baseline-household-identity-shared-access/proposal.md) |
| Delta / accepted A19, promoted A20 on 2026-10-15 | [identity delta](../openspec/changes/archive/2026-10-15-baseline-household-identity-shared-access/specs/household-identity/spec.md), seven requirements/21 scenarios |
| Extraction design / drafted | [design](../openspec/changes/archive/2026-10-15-baseline-household-identity-shared-access/design.md); security complexity across existing seams warrants the conditional design; no new architecture |
| Extraction tasks / tracked | [tasks](../openspec/changes/archive/2026-10-15-baseline-household-identity-shared-access/tasks.md); documentation work only, task completion does not accept the draft |
| Strict grammar validation / passed | `openspec validate baseline-household-identity-shared-access --strict --no-interactive`, exit 0 |
| Final bounded documentation checks / passed | Six-path command in tasks; documentation and all-strict OpenSpec checks passed (2 items, 0 failed). Final rerun after task/evidence finalization records content identity in the response and `.task/agent-finish/last-run.json`; later edits require fresh verification. |
| Runtime checks / not-run | API, browser, PostgreSQL, token experiments, device and deployment qualification excluded from this session |
| Application-change checks / not-applicable | Behavior TDD, application test execution, client generation and contract changes do not apply to these documentation edits |

Next action: separately authorize archival of the completed shared-access change,
or select another bounded discovery slice. Existing member-selection blocks and
this delta are unchanged; promotion does not authorize archival or application work.

### Shared-access main-spec promotion record — 2026-10-15

A20 authorizes only promotion of the accepted shared-access delta. The installed
sync-specs workflow resolved `planningHome.root` to this repository, selected the
sole delta from `artifactPaths.specs.existingOutputPaths`, and fetched the current
specs rules once before the main-spec write. No OpenSpec initialization or store
reconfiguration occurred.

- Main spec: [household identity](../openspec/specs/household-identity/spec.md),
  12 requirements/31 scenarios. Uncommitted revision SHA-256: `27af7f1e79c2c11c394920e28edb8ebf6c78977650ce59727ed65022690c0def`.
- Added all seven shared-access requirements/21 scenarios verbatim, preserving all
  five existing requirements/ten scenarios, title and Purpose verbatim.
- Retained the accepted page-gate scope paragraph under the main Requirements
  heading. Main spec contains one Requirements section and no delta operation headers.
- BSL-household-identity-003/004/005 mapping now also identifies the identically
  named promoted requirements. A17's token-age treatment and U08/U13/U14/U15
  uncertainties are unchanged; only the selected slice is baseline-complete.
- `openspec validate --specs`: passed, exit 0, one main spec. Final three-path
  documentation/all-strict checks and content identity are reported in the session
  response and `.task/agent-finish/last-run.json` for the finalized files.
- Shared-access change remains active, with its accepted delta unchanged. No
  archival, commit, runtime qualification or application implementation performed.

## Completed baseline slice — household identity / member invite link

Discovery/review A21 and limitation treatment A22 completed; A23 authorizes the
bounded draft, followed by direct user promotion instruction A24 on 2026-10-15.
Source identity: branch
`moving-to-openspec`, commit `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`.
Relevant application sources are unchanged from that commit; the pre-existing
untracked plan/spec/change artifacts and unrelated README edit/document deletions
are retained, including the deleted background-task-navigation spec.

| Field | Finding / status |
| --- | --- |
| Purpose / actor | Let someone with household access share a link that supplies household access and a requested existing member context on another browser. This purpose is inferred from the connected Settings labels and route; it is not personal authentication. |
| Selected workflow | Settings member Invite → link generation → Copy/native Share → recipient `/invite` → validation → access/member cookie actions → family/onboarding state → requested navigation and subsequent identity resolution. |
| Evidence | BSL-household-identity-006/007/008 below; implementation-supported, medium overall confidence, no runtime-verified claims. |
| Existing coverage to reuse | The preceding 12 requirements/31 scenarios cover shared access, page gates, member lookup/recovery and selected-name display. A24 adds only six invite requirements/18 scenarios; main now totals 18/49. Shared rules are referenced without duplication. |
| Artifact state | A23 draft validated, six additions/18 scenarios promoted A24 and archived A25 on 2026-10-15. Main unchanged at 18 requirements/49 scenarios; invite delta/metadata preserved. All three completed identity changes are archived; no active changes. Direct promotion instruction is the recorded authorization, with no separate acceptance message. |
| Root / discovery | `openspec store list --json`: no stores. `openspec list --json` and `openspec list --specs --json`: nearest root `/Users/alex/Code/whats-for-supper`, one active shared-access change, one main identity capability with 12 requirements. Config has no store declaration. Full main spec and shared-access status inspected; 4/4 artifacts and 5/5 tasks complete. No initialization/reconfiguration. |
| Dependencies | PWA server actions/Web Crypto and HEARTH_SECRET; Next cookies/router; Zustand family state and persisted onboarding flag; browser clipboard/share APIs; configured cookie domain/environment; existing page/API access and member lookup boundaries. No invitation persistence/service/workflow found in this trace. |
| Exclusions | Voting-link generation/journey, member creation/rename/removal, broader operator authorization, demo/preview/Synology variants, deployed transport/device qualification. Shared redirect branch inspected only to bound this workflow. |
| Decision / next action | A24 promotion and A25 archival complete. A17/A22 retain expiry, binding, partial-handoff and recovery limitations non-normatively. Select another bounded discovery slice; no automatic successor drafting or application work. |

### BSL-household-identity-006 — connected generation and sharing surface

**Trace and implemented behavior:** Settings at `/profile/settings` renders
`SettingsPageContent` → [FamilyManagement](../pwa/src/components/profile/FamilyManagement.tsx)
→ [FamilySelector](../pwa/src/components/identity/FamilySelector.tsx) →
[FamilyMemberList](../pwa/src/components/identity/FamilyMemberList.tsx).
The member row's Invite button stops propagation and passes that row's ID/name
through `onInvite`, opening [InviteLinkDialog](../pwa/src/components/common/InviteLinkDialog.tsx).
This is a connected household UI caller, not an action-only capability. It does
not select the row by clicking Invite; the dialog title is `Invite {memberName}`,
while the share text says that member invited the recipient (ambiguous role copy,
not evidence that the link authenticates that person).

Dialog mount/member-ID change calls [getInviteLink](../pwa/src/lib/auth.ts)
with `window.location.origin` and the target ID. The action checks only that
`HEARTH_SECRET` is nonempty, then returns
`{baseUrl}/invite?secret={encoded token}&memberId={encoded ID}`. It performs no
member lookup, ID parsing, role/eligibility check or persisted invitation creation.
The action accepts its supplied base URL; the connected UI supplies the origin.
The action itself has no explicit current-access-cookie check; the Settings page
is gated through the already documented access/context rules. Do not infer a
separate issuer-permission policy from the page gate.

[generateSecretToken](../pwa/src/lib/auth-utils.ts) signs only `Date.now()` text
using HMAC-SHA256 with HEARTH_SECRET. Neither member ID, name, redirect nor recipient
is in the signature. Generation/consumption has no traced single-use record,
redemption transaction or age enforcement. A17 remains non-normative; token
format and one-year cookie options do not establish expiry or personal identity.

The dialog displays `Generating link…` until a nonempty result, disables Copy
and Share without a link, and offers Share only when `navigator.share` exists.
Copy awaits `navigator.clipboard.writeText`, displays `Link copied!` for two
seconds, and silently catches failure. Share supplies title/text/URL and silently
catches cancellation/failure. Close button and overlay dismiss the dialog.
Missing server secret returns an empty string, leaving generation text and disabled
controls; a rejected generation promise has no catch or visible error/retry here.
Closing/reopening remounts the generation effect; successful recovery is unverified.
No browser share delivery or clipboard permissions were observed.

**Classification/tests:** Implementation-supported, high for the connected call
and local branches, medium for successful browser handoff. Settings assertions and
substitutions are recorded in BSL-008. Disposition: discovery candidate for supported
generation/copy/dismiss behavior; failure recovery and signed member binding are
not positive capabilities. Supported observations drafted under A23; runtime not-run.

### BSL-household-identity-007 — consumption, writes and member-context handoff

**Ordered trace:** `pwa/src/app/(auth)/invite/page.tsx`, `InvitePage`, reads first
`secret`, `memberId` and `redirect` values with `searchParams.get`. Missing/empty
redirect defaults to `/home`; otherwise its supplied text goes directly to
`router.replace` without an allowlist, origin/path check or signature binding.
The normal member-link generator does not supply a redirect. Do not promise safe
arbitrary redirects, external navigation outcomes or universal arrival at Home.
The [proxy](../pwa/src/proxy.ts) exempts invite from both gates; the root layout's
[IdentityValidator](../pwa/src/components/identity/IdentityValidator.tsx) also
allows the invite page even with an existing selected member.

1. Nonempty secret → await `validateHearthSecret` (Next server action) →
   `validateSecretToken`. Missing configuration/secret rejects; malformed token,
   invalid signature/base64 or crypto error returns false. Validation splits into
   two parts and checks HMAC over the first part; it does not parse a date, test
   age/future time, or bind the query member/redirect. There is no invite OpenAPI
   endpoint in this flow.
2. On true, await `setHearthCookie(secret)`. If memberId is truthy, await
   `setFamilyMemberCookie(memberId)` next. Both setters use the previously traced
   one-year, HttpOnly, Lax, root-path and conditional domain/Secure options.
   Neither setter validates its value or checks membership.
3. With memberId, call `useFamily().selectFamilyMember(memberId)` **without await**.
   [familyStore](../pwa/src/store/familyStore.ts) awaits a second member-cookie
   action before calling the readable-cookie fallback and changing selected state.
   The invite immediately calls `completeOnboarding` and then `router.replace`.
   [onboardingStore](../pwa/src/store/onboardingStore.ts) persists its completion
   flag in `onboarding-storage`; repository search finds no read of that flag
   that overrides these page/identity gates. Completion does not prove membership.
4. Navigation is requested after the first access/member actions resolve, but
   before the second action/store-selection promise is known to have resolved.
   There is no transaction, rollback, cancellation or effect-run guard. The outer
   catch does not catch a later rejection of this unawaited selection promise.
   Store update, fallback cookie write and arrival ordering remain unobserved.

**Absent/malformed/unknown member and existing state:** Missing or empty memberId
skips all member/onboarding writes and still requests the chosen destination after
access-cookie success. Existing member cookie, selection and onboarding flag are
left as-is in that branch. Truthy whitespace, malformed or unknown IDs are passed
through; there is no invite-time existence/eligibility check. With an existing
selection, a truthy supplied ID requests replacement, with a window where old store
state can coexist with new cookies. Valid-token processing overwrites access;
rejected/missing-token processing does not clear pre-existing access/member state.

**Subsequent observable boundary (reuse BSL-001/002/004):** Default Home entry
passes the proxy if access validates and member cookie is merely nonempty. No
member cookie redirects to onboarding; a malformed/unknown nonempty value passes
this gate. `pwa/src/app/(app)/home/page.tsx` calls
[serverFetch](../pwa/src/lib/api/server-client.ts) → `/api/family` (plus schedule),
forwarding access cookie and member header; it logs fetch failure and may omit
StoreInitializer. [StoreInitializer](../pwa/src/components/common/StoreInitializer.tsx)
seeds returned family list/hasLoaded, not selected identity. Client validation
with no selection recovers a readable cookie or calls `loadCurrentIdentity` →
[family API adapter](../pwa/src/lib/api/family.ts) → generated
[GET me builder](../pwa/src/lib/api/generated/api/family/me/index.ts) →
[OpenAPI](../specs/openapi.yaml), `/api/family/me` →
[FamilyController.GetMe](../api/src/RecipeApi/Controllers/FamilyController.cs) →
[FamilyMemberIdModelBinder](../api/src/RecipeApi/Infrastructure/FamilyMemberIdModelBinder.cs)
(header parseable GUID first, then cookie) →
[FamilyService.GetAllFamilyMembers](../api/src/RecipeApi/Services/FamilyService.cs)
→ EF `FamilyMembers` read. API shared access is independent (U14/U15 retained).
No parseable identity yields 401; unknown parsed ID yields implemented 404, omitted
from OpenAPI/generated error mapping (U13). Adapter errors become null and recovery
without selection requests onboarding. With selection, validator checks loaded
membership case-insensitively, clears/redirects only when `hasLoaded`, no match and
a nonempty list. Empty/failed/unloaded lists do not establish universal rejection.
Identity clearing is itself unawaited. Thus late lookup is not an invite-time
eligibility guarantee, and no final outcome for every malformed/stale/racing ID
is established. Normal existing-member selection at onboarding remains BSL-001.

**Classification:** Implementation-supported, high for explicit action order and
query handling, medium for eventual member resolution; partial/racing completion
is missing/incomplete qualification (U13/U16/U17/U18). No runtime-verified result.
Disposition: supported observations drafted under A23; withhold atomic handoff, member-bound credential,
validated-target and universal persistence/recovery claims.

### BSL-household-identity-008 — rejection, Welcome recovery and assertion limits

**Visible route behavior:** Missing/empty secret schedules error state with a
zero-delay timeout without actions. A false validator result or an exception from
awaited validation/access-cookie/first member-cookie actions shows the same
`Invalid invite link` screen and `/welcome` anchor. During processing it displays
`Joining your family...`. The [English](../pwa/src/locales/en/common.json) and
[French](../pwa/src/locales/fr/common.json) error descriptions refer to possible
expiry/tampering. Signature tampering can reject; age alone is not checked by the
validator (A17/U08). Record this copy mismatch, do not change it or assert expiry.

No rejection branch clears cookies/state or rolls back prior writes. Access-cookie
success followed by member-cookie failure can leave household access established
while error is visible; a failure after selection is started can leave additional
partial state. The same screen does not distinguish bad signature, absent secret,
configuration or cookie/action failure. The Welcome anchor is a fresh navigation,
not an automatic resend/retry or saved-destination continuation. Welcome permits
passphrase submission and then onboarding under already accepted shared-access
requirements; invite memberId/redirect are not forwarded by the anchor. Invalid
invite opening does not revoke existing access. Successful recovery from cookie,
configuration, network or device failures was not observed.

**Actual tests inspected (source only; none executed):**

| Test / fixture | Assertions and substitutions / limits |
| --- | --- |
| [auth-flow.spec.ts](../pwa/e2e/auth-flow.spec.ts), `magic invite link works and redirects to home` | Clears cookies in beforeEach, independently generates a token with the test helper, visits invite with a hard-coded member ID, asserts only URL matching `/home/`. Does not call getInviteLink, assert cookies/attributes, selected name, onboarding persistence, membership validation or durable arrival. It does not install setupCommonRoutes: fixture unhandled browser API requests receive 403. The adjacent voting test is only shared-route context, not member-invite coverage. |
| [settings.spec.ts](../pwa/e2e/settings.spec.ts), `invite dialog can copy the generated link and close cleanly` | Installs fake clipboard writeText collecting strings; opens Jordan's Invite, asserts dialog/link includes ID, one captured copy includes ID, and close hides dialog. Does not validate token, open copied link, test native Share, clipboard rejection, generation failure, recipient selection or cookies. Settings setup injects Alex cookie/access, common API mocks and legacy family-storage localStorage; current family store uses cookies, not that legacy persistence. |
| Settings ordinary-name/layout assertions | Inspect Invite accessible label/text and width greater than height at selected viewports. Preview variants are not qualification of this ordinary-household slice. |
| [fixtures.ts](../pwa/e2e/fixtures.ts), [mock-api.ts](../pwa/e2e/mock-api.ts), [auth helper](../pwa/e2e/auth-utils.ts), [Playwright config](../pwa/playwright.config.ts) | Fixture fixes browser time, injects access, mocks health and blocks unhandled browser API with 403. Common routes substitute family list and `/me`, defaulting missing identity to Alex and returning supplied unknown cookie IDs as successful members; this is not real eligibility evidence. Token helper runs separately in Node; browser clock pinning does not pin server/helper time. Config uses test environment, managed-server test secret, internal API URL, conditional browser API base and blocked service workers. Browser route interception does not intercept Home serverFetch. |
| `pwa/src/app/(app)/profile/settings/page.test.tsx` | Stubs FamilyManagement, so section rendering does not exercise invites. Searches of PWA test/spec sources found no focused invite/action unit assertions or negative member-invite assertions. |
| [FamilyControllerTests](../api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs), [FamilyServiceTests](../api/src/RecipeApi.Tests/Services/FamilyServiceTests.cs) | GetAll tests assert array/membership, not invite redemption; controller file has no GetMe assertions. Existing test-factory/in-memory limitations from BSL-001 remain. These do not fill the invite-to-real-member lookup gap. |

**Uncovered selected paths:** missing/bad secret, malformed/empty/unknown member,
unsigned member/redirect edits, existing browser identity, absent server secret,
expired-looking but correctly signed timestamp, action/cookie failures at each
write, repeated/interrupted effects, unawaited rejection, partial state, native
Share/clipboard failures, Welcome recovery and eventual selected-name correctness.
These are evidence gaps, not new requirements or permission to add tests.

**Confidence/check disposition:** Direct source branches implementation-supported;
purpose inferred; final browser transport/state/recovery missing qualification.
Runtime browser/API/PostgreSQL/device checks **not-run**, by discovery scope.
Documentation/OpenSpec validation is recorded separately in the final response
and harness record after final edits; it does not verify this workflow. A23
authorizes the supported invite mapping below; disputed claims remain excluded.

### Member invite-link draft requirement/scenario evidence mapping

Delta: [member invite-link identity additions](../openspec/changes/archive/2026-10-15-baseline-household-identity-member-invite-link/specs/household-identity/spec.md).
All six requirements/18 scenarios are implementation-supported, not runtime-verified.
A17/A22 keep expiry, member/redirect binding, eligibility, atomic handoff and universal
recovery limitations outside normative guarantees. Existing main identity rules are
referenced, not restated or modified.

| Added requirement | Scenarios | Source / evidence | Inspected assertion support and limits |
| --- | --- | --- | --- |
| Generate a member invite link from Settings | Open a member invite while generation is pending; Generation supplies the member link | BSL-006: Settings content → FamilyManagement → FamilySelector/FamilyMemberList.onInvite → InviteLinkDialog effect → getInviteLink → generateSecretToken; origin and encoded query fields | Settings invite test checks dialog and member ID in displayed link. Generation pending, encoding, token content and missing-secret failure are not directly asserted; U18 generation failure retained. |
| Copy share and dismiss the member invite dialog | Copy succeeds; Native sharing is available; Native sharing is unavailable; Close the dialog; Dismiss through the overlay | BSL-006: clipboard handler, copied flag/timer, canShare/handleShare, Close and overlay handlers | Settings invite test substitutes clipboard, checks one copied string includes ID and Close hides dialog. Native sharing, two-second timer, unsupported browser and overlay lack focused inspected assertions; no delivery guarantee. |
| Validate invite access before writing its access cookie | Invite processing is pending; Accepted invite token establishes access | BSL-007: InvitePage status/handleJoin → validateHearthSecret → validateSecretToken → awaited setHearthCookie | Auth-flow independently generates token and checks only Home URL, not validation action ordering, cookie attributes or real API acceptance; runtime not-run. A17 expiry limits retained. |
| Request the invited member context and default Home navigation | Existing member invite requests Home; Invite supplies a different existing member | BSL-007: first member-cookie action → unawaited selectFamilyMember → completeOnboarding → default router.replace; downstream BSL-001/002/004 rules reused | Auth-flow Home URL only; no selection/onboarding/cookie or existing-browser-state assertion. Requests are not durable arrival/atomic completion claims; U13/U16/U17 retained. |
| Preserve member context when an invite supplies no member ID | Member ID is absent with existing context; Member ID is empty without existing context | BSL-007: false memberId branch skips member/onboarding writes; default Home request remains subject to existing gates | No focused inspected assertion for these default-navigation cases; adjacent voting test is excluded as qualification. No voting journey extracted. |
| Show invite rejection and offer Welcome recovery | Token is absent or empty; Token is rejected; Household secret is unconfigured; Initial invite action fails; Follow the recovery link | BSL-007/008: missing-secret error, false result/catch on awaited actions, error screen and `/welcome` anchor; existing Welcome rules reused | No focused negative/recovery invite assertions found. The later unawaited rejection is not covered by the catch scenario; no rollback, expiry or successful retry guarantee (A17/A22). |

### Member invite-link draft artifact and check handoff

A23 records user “i authorise”, 2026-10-15, following the bounded drafting
recommendation. The CLI scaffold selected the existing local root and spec-driven
schema; no initialization, store or configuration changes occurred. Proposal,
ADDED delta, extraction design (security/state boundary condition applies), tasks
and metadata exist. No artifact was conditionally skipped. The design records
integration facts and limits, not implementation work.

- Strict selected-change validation passed, exit 0; all six requirement descriptions
  are below 500 characters and have the mapped scenarios.
- Existing main identity spec stays 12 requirements/31 scenarios, byte-identical;
  prior active shared-access change and archived existing-member selection retained.
- Final six-path documentation/content outcomes belong to the final response and
  `.task/agent-finish/last-run.json` for finalized content, not workflow runtime proof.
- Browser/API/database/device checks not-run; behavior TDD, generated-client and
  application checks not-applicable to these edits. No services or data accessed.
- Human acceptance, main-spec promotion, archival and application work have not
  occurred; stop for human review of this draft.

### Member invite-link main-spec promotion record — 2026-10-15

A24 records user “promote it” after presentation of the validated six-requirement/
18-scenario draft. This directly authorizes promotion of that reviewed content;
there was no separate acceptance message. The installed sync-specs skill resolved
`planningHome.root` to this repository, selected the sole delta from
`artifactPaths.specs.existingOutputPaths`, read current specs instructions once,
and merged its ADDED requirement blocks into the existing main capability.

- Main [household identity spec](../openspec/specs/household-identity/spec.md) now
  contains 18 requirements/49 scenarios. Original title/Purpose, page-gate scope
  and all preceding 12 requirements/31 scenarios are preserved byte-for-byte.
- The six promoted requirement/18 scenario blocks match the invite delta verbatim;
  the delta itself is unchanged. Main has a single Requirements section and no
  delta operation headers. Repeating this merge introduces no further changes.
- BSL-006/007/008 and the mapping above now support the identically named promoted
  requirements. A17/A22, U08 and U13–U18 retain their stated evidence/claim limits.
- `openspec validate --specs --strict --no-interactive` passed, exit 0 (one spec).
  Final bounded three-path documentation/all-strict/content outcomes belong to the
  session response and harness last-run record for finalized content.
- Invite and shared-access changes remain active; existing-member-selection archive
  and unrelated edits/deletions are preserved. No archival, reopening, application
  implementation, commit or runtime qualification occurred.

### Shared-access and member invite-link archive record — 2026-10-15

A25 records user “you can archive both”, referring to the two promoted changes.
The archive-change skill selected their resolved local roots and considered both
archive instruction inputs. Each change reported 4/4 artifacts and 5/5 tasks complete.
Every shared-access (seven/21) and invite (six/18) requirement/scenario block
matched main exactly, so the user's archive instruction required no further sync.
There were no incomplete-artifact/task warnings or destination collisions.

Archived with `spec-driven` schema to:

- [Shared access](../openspec/changes/archive/2026-10-15-baseline-household-identity-shared-access/proposal.md)
- [Member invite link](../openspec/changes/archive/2026-10-15-baseline-household-identity-member-invite-link/proposal.md)

Both `.openspec.yaml` files and delta specs are preserved byte-for-byte. Only
relative Markdown links and archive-status records changed in the moved supporting
documents. Earlier draft/promotion commands and counts remain historical evidence,
not current lifecycle instructions. The plan's artifact links now target archives.
No Git staging or commit was performed; pre-existing index state is preserved.

Main [household identity](../openspec/specs/household-identity/spec.md) is unchanged
at 18 requirements/49 scenarios; all 13 additions/39 scenarios from these two deltas
still match. The previous existing-member-selection archive and unrelated
README/document/navigation-spec edits/deletions are preserved. All completed
identity extractions are archived, but broader household identity remains incomplete.

Final active-inventory, strict main-spec, bounded documentation/all-strict/content
outcomes are reported in the session response and harness last-run record. Runtime
browser/API/database/device checks remain not-run; application/TDD checks are
not-applicable to archival. A17/A22 and U08/U13–U18 remain unchanged. Archival
establishes documentation lifecycle completion, not live behavior qualification.

## Reviewed slice — household identity / ordinary-household member creation

**Current review (A31):** BSL-014 below supersedes stale current-state assertions in
BSL-009–013. Those entries retain historical extraction and prior reported checks.
The application/contract/SQL/tests now have local edits; the change is physically
archived, not active. All four implementation boxes are checked in that archive,
but acceptance and later implementation/archive authorization are not established
by this plan. A27–A29 acceptance/promotion decisions remain recorded unchanged.

**Historical extraction record (BSL-009–013):**

A26 authorized discovery/review and the initial plan update. A27/A28 now authorize
the bounded draft and its explicit desired-behavior exceptions below. A29 accepts
and promotes its unchanged additions. Source identity is
`moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`, inspected
2026-10-15. The traced application, contract, SQL and tests have no local edits.
Existing staged/unstaged plan/spec/archive work, README edit and document deletions,
especially the deleted navigation spec, are pre-existing inputs, not task ownership.

| Field | Selected scope / result |
| --- | --- |
| Domain / purpose | Household identity: add a named household actor for later journeys. Purpose is inferred from connected UI and the approved capability frame; this creates no personal credentials or ownership record. |
| Workflow | Onboarding or Settings → reveal shared form → enter name → submit → hook/store/adapter/generated POST → authorized controller → service/EF row → envelope/adapter/store append → list and caller-specific handoff. |
| Dependencies | React local form state, Zustand family/onboarding stores, Kiota Fetch adapter, approved OpenAPI, shared API access, MVC DTO validation/success filter/error middleware, EF/Npgsql and PostgreSQL schema; cookie server actions and Next router only in onboarding handoff. No workflow enqueue, invitation or SSE publish in the creation path. |
| Existing rules to reuse | Main identity's shared-access/page/API gates, existing-member selection, current-member lookup, recovery and Profile name display; BSL-001–008 remain their evidence owners. Creation does not redefine them. |
| Excluded | Rename/removal, invitations/voting, operator-role design, personal accounts, household ownership, demo/preview/Synology qualification and deployment behavior. Demo guard observed only to delimit ordinary mode. |
| Evidence / confidence | BSL-009–011 below; implementation-supported, medium overall confidence because contract mismatch and untested failure/handoff seams remain. No runtime-verified claims. |
| Artifact status | A27/A28 draft: [proposal](../openspec/changes/archive/2026-10-15-baseline-household-identity-member-creation/proposal.md), [delta](../openspec/changes/archive/2026-10-15-baseline-household-identity-member-creation/specs/household-identity/spec.md), [design](../openspec/changes/archive/2026-10-15-baseline-household-identity-member-creation/design.md), [tasks](../openspec/changes/archive/2026-10-15-baseline-household-identity-member-creation/tasks.md) and CLI metadata. Seven ADDED requirements/21 scenarios accepted/promoted A29 on 2026-10-15; no preceding requirement edits. Main now 25/70; all three prior archives preserved. Change remains active, three extraction tasks complete and four implementation tasks open. |

| Root / discovery | `openspec store list --json`: no stores. `openspec list --json`: nearest root `/Users/alex/Code/whats-for-supper`, changes empty. `openspec list --specs --json`: household-identity, 18 requirements. Config has no store declaration; full main spec inspected. No initialization/reconfiguration or archive reopening. |

### BSL-household-identity-009 — entry, form state and caller-specific handoff

**Actor / entry / outcome:** With ordinary-household access, onboarding mounts
[FamilySelector](../pwa/src/components/identity/FamilySelector.tsx) after requesting
`loadFamily` in `pwa/src/app/(auth)/onboarding/page.tsx`.
An existing selected ID changes the heading to Switch Member; it does not remove
creation. Profile's Settings button routes to Settings →
`pwa/src/app/(app)/profile/settings/SettingsPageContent.tsx`
→ [FamilyManagement](../pwa/src/components/profile/FamilyManagement.tsx) → the same
selector. Settings does not itself load the family list; Profile loads when not
loaded, and root [IdentityValidator](../pwa/src/components/identity/IdentityValidator.tsx)
handles protected-route loading/recovery under existing rules.

**Visibility / input:** Selector-local `showAddForm` starts false. “Don't see your
name? Add it” mounts [AddFamilyMemberForm](../pwa/src/components/identity/AddFamilyMemberForm.tsx).
Cancel unmounts the form; reopening starts with empty name/error. Cancel is enabled
while busy and does not cancel an in-flight request. This local state does not use
`onboardingStore.showAddForm`, despite that store's comment. A successful Settings
submission leaves the form visible and clears its name; no success toast exists in
this path. List controls remain visible and selectable while creation is pending.

The form trims input, rejects empty/whitespace-only values with a local name error,
and clears that error on change. It uses `noValidate`, with no required/min/max-length
input props. [FormInput](../pwa/src/components/common/FormInput.tsx) exposes the
label/error alert. [Button](../pwa/src/components/ui/button.tsx) disables submit and
shows a spinner when busy; the name input is also disabled. There is no handler-level
pending guard in the form or store. Loading is shared with family operations.

**Handoff difference:** `FamilySelector.handleAddAndSelect` awaits `addMember`,
then invokes `onFamilyMemberSelected(member.id)` only for a returned member.
[useFamily](../pwa/src/hooks/useFamily.ts) exposes store actions without additional
creation rules. Settings supplies `() => {}`: creation neither changes selected ID,
writes identity cookies, marks onboarding complete nor navigates. Existing selected
member stays selected; the new row is rendered without automatically being “you.”

Onboarding's async callback first awaits `setFamilyMemberCookie(id)`, then calls
`selectFamilyMember(id)` without await, calls `completeOnboarding()` and requests
`router.replace(HOME)`. The selector's callback type returns void and its invocation
is not awaited; the add-form promise therefore does not include this handoff.
The store's selection separately awaits another server cookie action, attempts the
readable fallback, then sets selected ID. The form may clear and loading already
ends before either handoff has completed. Existing selection is replaced only when
that selection work succeeds; there is no atomic create/select transition.

**Persistence / failure boundary:** Onboarding completion is a Zustand flag persisted
as `onboarding-storage`; it is set before confirmed Home arrival, despite the store
comment. [auth actions](../pwa/src/lib/auth.ts), `setFamilyMemberCookie`, and
[cookie fallback](../pwa/src/lib/identity/cookie.ts) retain BSL-001's configuration
and recovery limits. Persisted creation precedes cookie work; a failed first cookie
action rejects the unawaited callback, and a later selection failure is also not
caught by `addMember`. No compensating delete, rollback, handoff error UI or durable
retry token exists here. A17/A22 remain separate and unchanged; U13 still applies.

Classification: **implementation-supported**, medium confidence; interruption,
selection/cookie rejection and navigation outcomes are **missing/incomplete
qualification** (U21). Disposition: evidence candidate only, no normative mapping.

### BSL-household-identity-010 — request, validation, persistence and returned member

**Ordered trace:** form → `useFamily.addMember` →
[familyStore.addMember](../pwa/src/store/familyStore.ts) →
[family adapter.createFamilyMember](../pwa/src/lib/api/family.ts) →
[generated family POST builder](../pwa/src/lib/api/generated/api/family/index.ts)
(`FamilyRequestBuilderRequestsMetadata.post`, JSON serializer/deserializer) →
[OpenAPI POST /api/family](../specs/openapi.yaml) →
[FamilyController.Create](../api/src/RecipeApi/Controllers/FamilyController.cs) →
[FamilyService.CreateFamilyMember](../api/src/RecipeApi/Services/FamilyService.cs) →
[RecipeDbContext.FamilyMembers](../api/src/RecipeApi/Data/RecipeDbContext.cs) →
[family_members SQL](../api/database/schema.sql).

[API client](../pwa/src/lib/api/api-client.ts) optionally injects the existing member
header; creation has no member-ID binder or ownership check. Global authorization
in [Program](../api/src/RecipeApi/Program.cs) remains the shared access rule. Ordinary
mode passes the controller's demo guard. No caller-generated ID or idempotency key
is supplied. Service creates one new entity per successful call and awaits
`SaveChangesAsync` before returning; it neither selects a member nor writes cookies.

| Layer | Inspected rule / limit |
| --- | --- |
| Form / store | Both trim and skip blank names; UI local error, store blank guard returns null without request. No length, name uniqueness or casing check. Store has no `isLoading` early-return for addMember. |
| Generated client / adapter | `FamilyPostRequestBody.name` is optional/nullable in generated TypeScript even though OpenAPI requires a string. Serialization writes the name; no length/blank validation. Adapter requires truthy response `data.id`, otherwise throws; it does not explicitly validate UUID/existence. |
| Approved OpenAPI | Required JSON body and required string name; no minLength/maxLength or whitespace rule. Summary says “Create or update”; responses document 200 and demo 403, not implemented 201 or ordinary validation 400. Withhold contract-parity/upsert/status guarantees (U19). |
| MVC DTO | [CreateFamilyMemberDto](../api/src/RecipeApi/Dto/CreateFamilyMemberDto.cs): Required and MaxLength(100), ApiController model validation; raw request is validated before service trimming. Thus over-100 raw text can fail even if its trimmed result is short; UI sends trimmed text. Missing/null/empty/whitespace names are invalid under Required. Default validation response differs from the service exception envelope; no current request observation. |
| Service | Trims, throws ArgumentException for empty result, preserves remaining casing/text. No explicit maximum length, duplicate lookup, case folding, uniqueness or idempotency rule. Direct service invocation bypasses DTO validation. |
| Entity / EF / SQL | [FamilyMember](../api/src/RecipeApi/Models/FamilyMember.cs) has required/max-100 name; schema has varchar(100) NOT NULL, UUID primary key, no unique name index or nonblank-name check. No case-insensitive name constraint. Database length enforcement is not established by in-memory tests. |

**Response / defaults:** Entity initializes a new GUID, `browseViewMode = stack`,
null preferred language, and separate UTC created/updated timestamps. SQL also has
stack/time defaults; there is no SQL ID default. Controller maps these fields through
[FamilyMemberDto](../api/src/RecipeApi/Dto/FamilyMemberDto.cs), returning
`CreatedAtAction(GetAll, null, result)` (201 and collection-action Location).
[SuccessWrappingFilter](../api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs)
wraps successful data. Generated response metadata deserializes the `data` envelope;
only demo 403 has an explicit generated error mapping. No live Kiota 201/400
qualification was run. [ErrorHandlingMiddleware](../api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs)
maps ArgumentException to 400 and other unhandled persistence exceptions to generic
500; DTO model-state responses use the MVC path instead.

Adapter returns ID/name, normalizes browse mode to list or stack, normalizes null
language to empty string, and drops timestamps. Store appends returned member to the
current array, clears loading, and returns it without re-fetching, sorting or
changing `hasLoaded`/selection. [FamilyMemberList](../pwa/src/components/identity/FamilyMemberList.tsx)
renders the appended name and uses case-insensitive **ID** matching for “you”; this
is not name normalization. Later GET orders by name through the service, subject
to database ordering; no universal locale/case ordering claim. Duplicate names or
case variants have no prevention in this path, but were not exercised against SQL.

Classification: **implementation-supported**, medium confidence. Happy-path envelope
is aligned; operation semantics/status and validation metadata are **missing/incomplete**
contract coverage (U19). Disposition: candidate observations only; no drafted claims.

### BSL-household-identity-011 — failure, repeat submission and actual assertions

`familyStore.addMember` clears old store error on a nonblank attempt; any adapter or
request exception sets store error, clears loading and returns null. No member is
appended and no selection callback is invoked on that response path. Because the
form's `onSubmit` resolves normally after null, it still clears the name. Onboarding
renders store error as an alert (and generic loading copy while creating); Settings'
FamilyManagement/selector do not consume or render store error. Local blank-name
feedback exists in both forms. Cancel/reopen resets local state but not store error.
These are observed source paths, not an accepted universal retry/recovery design.

Pending UI disabling reduces ordinary repeated clicks but does not establish
idempotency. Cancel can hide/reopen during a request; closing does not abort it.
There is no addMember guard, deduplication, retry policy or request identity. An
ambiguous network failure or missing-ID response can occur after the server saved;
client then reports failure/null while a row may exist. Re-entry/retry can create
another row. Concurrent invocation and shared-loading races are untested. Creation
followed by a handoff failure also leaves the row and client append in place (U21).

| Inspected test / substitution | Exact relevant assertions and limits |
| --- | --- |
| [onboarding.spec.ts](../pwa/e2e/onboarding.spec.ts), `adding a new family member shows the form and accepts input` | Reveals form, fills TestUser-Pinned, asserts input value, clicks submit, asserts returned fixed-ID row visible. It does not reload, despite its comment, or explicitly assert request payload/count/status/name, cookies, selection, completion or Home URL. Its stateful browser route echoes posted name and always uses the same NEW_MEMBER_ID with 201; it bypasses API validation/persistence and cannot qualify distinct IDs across retries. |
| [FamilyServiceTests](../api/src/RecipeApi.Tests/Services/FamilyServiceTests.cs) | `Creates_With_Unique_Id` checks two nonempty/different IDs for Alice/Bob; `Defaults_BrowseViewMode_To_Stack` checks stack; `Empty_Name_Throws` asserts empty and whitespace exceptions. `GetAll...` checks three names/count, not ordering. No trimming-preserves-case, duplicate-name, max-length or concurrency assertion. |
| [FamilyControllerTests](../api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs) | `Create_Returns_Created_With_Member` checks 201, data.name, stack and nonempty GUID. `Create_Appears_In_Subsequent_GetAll` checks the submitted unique name appears after GET, without asserting the POST response. No ordinary creation-invalid-input, length, duplicate-name, timestamp/null-language or Location assertion. The empty-name update test is not creation coverage. Demo test is deferred-profile context only. |
| [TestDbContextFactory](../api/src/RecipeApi.Tests/Infrastructure/TestDbContextFactory.cs) / [TestWebApplicationFactory](../api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs) | Service uses isolated EF InMemory. Controller uses default auth-disabled factory and in-memory EF unless an explicit Postgres override is supplied (none in these creation tests); workflow orchestration is substituted. Neither proves real SQL constraints or household authentication. |
| [browser fixtures](../pwa/e2e/fixtures.ts), [mock API](../pwa/e2e/mock-api.ts), [Playwright config](../pwa/playwright.config.ts) | Inject shared access, clear cookies, pin browser time, reject unhandled browser API calls; service workers blocked. Common POST returns fixture data/201; onboarding overrides with a mutable mock list. `/me` mock defaults to Alex without identity and is not bound to the newly created list. Browser interception does not qualify server-side fetches or real handoff. |
| [auth-flow.spec.ts](../pwa/e2e/auth-flow.spec.ts) and Settings page unit test | Auth-flow checks passphrase and invite URLs; no creation-to-Home test, despite onboarding test comments. `pwa/src/app/(app)/profile/settings/page.test.tsx` stubs FamilyManagement entirely. Targeted source search found no direct form/selector/store/adapter tests or Settings creation test. |

**Uncovered:** cancel/reset, trimmed/blank names in browser, 100/101 boundaries,
case/duplicate names, pending/repeated/concurrent creation, Settings selection
retention/error visibility, request failure/input clearing, malformed/lost response,
real POST→GET/SQL parity, cookie rejection, persisted-create/failed-handoff and durable
Home/selected-name outcome. Tests above were inspected, **not run**. Runtime behavior
is **not-run**, qualification **missing/incomplete**, confidence medium for traced
source and low for universal recovery claims. No runtime-verified assertions.

### Member-creation review handoff — A26 historical recommendation

Superseded in part by A27/A28 below: the user requires 201 contract alignment and
normative uniqueness, rather than retaining those two gaps as exclusions. Other
validation/recovery limits remain evidence, not desired-behavior guarantees.

The A26 recommendation was to first decide to retain U19–U21 as non-normative limitations for this
extraction, withholding upsert, exact contract/status parity, universal validation,
unique-name/idempotent creation, retained failure input, universal error feedback,
and atomic creation/selection/recovery claims. This is a recommendation, not an
accepted decision or authorization to preserve defects as desired behavior.

After that decision, a **separately authorized** bounded draft could describe form
opening/cancellation and blank-name feedback, successful named-member creation and
list display, Settings retaining selection, and onboarding requesting the existing
identity handoff subject to success. Reuse existing shared-access, lookup, selection,
recovery and Profile requirements. Exact disputed API statuses/validation guarantees
remain outside normative claims until resolved/explicitly accepted. No draft now.

Checks for this plan-only session: read-only OpenSpec root/store/inventories and
source/assertion review completed; final `task verify -- docs/openspec-baseline-plan.md`
outcomes and content identity are reported in the session response and harness
record after final edits. Runtime browser/API/PostgreSQL/device checks **not-run**
(discovery-only); application/TDD and new-artifact validation **not-applicable**.

### BSL-household-identity-012 — member-creation draft and explicit future rules

**Authority / evidence distinction:** On 2026-10-15 the user instructed “OpenAPI
must document 201 as is implemented,” “Name Uniqueness MUST be inforced in the new
specs so it gets fixed in future work,” and “I authorize the member-creation draft”
(A27). Follow-up answers settle trim/case-insensitive equivalence and 409 Conflict
(A28). This explicitly permits desired uniqueness in this slice despite the earlier
pure-brownfield rule; it does not turn that missing behavior into source evidence.
The 201 controller behavior remains implementation-supported; OpenAPI correction
and uniqueness/409 remain **not implemented**, with no runtime observation.

**Scope / artifacts:** CLI-scaffolded local `baseline-household-identity-member-creation`
with proposal, seven ADDED requirements/21 scenarios, design and tasks. No artifact
conditionally skipped: cross-layer contract/persistence/migration complexity warrants
design. No main spec, approved API contract, generated client, test, SQL, dependency,
application or configuration edit. Root/config rechecked; one active draft now,
three prior archives preserved. New tasks explicitly retain future work incomplete;
this differs from prior extraction-only completed task lists. Draft acceptance,
promotion, implementation and archival are separate decisions.

| Added requirement | Scenarios / evidence basis | Current implementation and test limit |
| --- | --- | --- |
| Open and cancel the member-creation form | Four: onboarding entry, Settings entry, cancel/reopen, creation while switching; BSL-009 | Source-supported; browser test only opens onboarding form, no cancel/reset/Settings creation assertion. |
| Submit a trimmed nonblank member name | Three: surrounding whitespace, blank, edit clears error; BSL-009/010 | Source-supported; service tests assert blank exceptions, browser uses nonblank text; trim/error/case scenarios not run. |
| Display member-creation pending feedback | One: pending input/submit disabled and progress; BSL-009 | Source-supported shared loading; no current pending assertion or idempotency guarantee. |
| Create and return a named household member | Three: 201 envelope/defaults, later list, OpenAPI 201 creation semantics; BSL-010/011 + A27 | Controller/test source supports 201 and subset of fields/list; OpenAPI still 200/upsert. Contract correction is planned, not completed; timestamps/null language not directly asserted. |
| Prevent duplicate member names during creation | Six: exact, casing, whitespace, stored-whitespace, concurrent equivalent requests, distinct display casing; A27/A28 | Normative desired behavior; service/schema currently lack uniqueness and 409 handling. No duplicate/concurrency regression or runtime evidence. Never describe these scenarios as baseline implementation-supported. |
| Display the created member without switching Settings identity | Two: preserve context, open/empty form after success; BSL-009/010 | Source-supported no-op callback/store append; no Settings creation assertion. |
| Request onboarding identity handoff after creation | Two: first selection and existing-selection handoff; BSL-009/011 | Source-supported request ordering only; callback/selection promises not awaited, no atomic/durable arrival assertion. Existing shared rules reused. |

**Future work / limits:** Tasks plan contract-first 201 alignment, generated-client/
consumer/mock reconciliation, followed by test-first server/persistence uniqueness
and concurrent real-PostgreSQL acceptance, then browser integration. They are not
execution authorization. Duplicate rejection uses 409; no automatic selection of
an existing match. Existing data must not be merged/deleted/renamed automatically;
collision remediation or rename compatibility changes need separate bounded review.
The rule preserves trimmed display casing and does not imply accent equivalence,
personal accounts or network idempotency. Other U19 validation metadata gaps and
U20/U21 input/error/partial-handoff limits stay non-normative, with no universal
recovery claim. A17/A22 remain unchanged.

**Checks / disposition:** Selected strict OpenSpec validation passed, exit 0, before
final documentation checks. Final six-path `task verify` results/content identity
are reported in the session response/harness record after all edits. Browser/API/
PostgreSQL/device checks **not-run**; application TDD **not-applicable to drafting**.
Disposition: accepted and promoted A29 on 2026-10-15; future contract correction/uniqueness not implemented, change not archived.
Source confidence remains medium; future uniqueness is user-authorized intent,
not a confidence-rated implementation claim.

### Member-creation main-spec promotion record — 2026-10-15

A29 records the user's “approved and promote” instruction. The sync-specs skill
resolved `planningHome.root` to this repository and selected the sole delta from
`artifactPaths.specs.existingOutputPaths`; current specs instructions were read
before writing. The seven approved requirement blocks and all 21 scenarios were
appended verbatim to [main household identity](../openspec/specs/household-identity/spec.md).
Preceding 18 requirements/49 scenarios, title, Purpose and page-gate preamble were
preserved. Main now has 25 requirements/70 scenarios with one Requirements section
and no delta operation headings. Delta, proposal, design and metadata are unchanged.

Acceptance/promotion includes 201 OpenAPI alignment and trimmed, case-insensitive
name uniqueness with 409 rejection as normative requirements. The application and
OpenAPI have not been changed by promotion: 201 is current controller behavior,
contract correction and uniqueness enforcement remain future work. Three extraction
tasks remain complete, four future tasks remain open; planning artifact existence
is not implementation completion. Change remains active; no archival authorized.
BSL-009–012 mapping, A17/A22 and residual U19–U21 limits are preserved.

Main-spec strict validation passed, exit 0 (one item). Final three-path documentation,
all-strict OpenSpec and content checks are reported in the response/harness record
after final edits. Runtime browser/API/PostgreSQL/device checks not-run;
application/TDD not-applicable to this documentation-only promotion.

### BSL-household-identity-013 — task 2.1 contract alignment and verification reconciliation

A30 explicitly authorizes only task 2.1. Source commit remains
`7e0dcdbe162704debe8a0f916eb1f7327afc77a5`, with task-local contract/mock/test edits.
[OpenAPI](../specs/openapi.yaml) POST `/api/family` now uses 201 Created and creation
wording; GET/envelope are unchanged. This corrects the 201 part of U19; validation
metadata gaps remain. No production controller/service, SQL or uniqueness change.

[Family client tests](../pwa/src/lib/api/family.test.ts) observed the missing-201
contract regression before correction, then passed real generated-client JSON and
adapter acceptance at a substituted HTTP boundary. A new
[Settings component test](../pwa/src/components/profile/FamilyManagement.creation.test.tsx)
passed the real component/store/client chain with substituted HTTP/server-cookie
boundaries and asserted list display/selection retention/empty form/no completion.
Settings reload behavior was investigated: identity recovery restores only the current
member (/api/family/me), while Settings did not request the full family list. A focused
failing regression was added to `FamilyManagement.creation.test.tsx`, and the minimal fix
was implemented in [FamilyManagement](../pwa/src/components/profile/FamilyManagement.tsx)
to call `loadFamily()` when `!hasLoaded`.

[Shared browser mocks](../pwa/e2e/mock-api.ts) persist created members into later
GET responses, echo trimmed names and assign distinct deterministic test GUIDs.
[Onboarding assertions](../pwa/e2e/onboarding.spec.ts) use that shared owner (5/5 passed);
[Settings assertions](../pwa/e2e/member-creation.spec.ts) cover two 201 creations,
read-after-reload, cookie/selection/onboarding/route retention, and 409 duplicate rejection (2/2 passed).
[Controller tests](../api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs)
add returned default/timestamp and ID-linked subsequent-list assertions;
[new PostgreSQL test](../api/src/RecipeApi.Tests/Integration/FamilyCreationPostgresTests.cs)
uses its own disposable database and independent row read.

`task test:unit`: passed 78 files/741 tests; `task typecheck`: passed exit 0;
`task gen:client:check`: passed exit 0 (Kiota 1.36.0 client up to date);
`task test:api`: passed 898 passed, 0 failed, 40 skipped;
`task test:e2e -- e2e/onboarding.spec.ts e2e/member-creation.spec.ts`: passed 7/7 Playwright tests;
`task agent:drift:endpoints`: passed Tier 0 endpoint diff against live API running on port 5001 (all endpoints match; blocked when API process stopped);
Disposable PostgreSQL: skipped (Docker daemon not running, `WFS_TEST_POSTGRES_CONNECTION` unset).
Task 2.1 acceptance remains open pending disposable PostgreSQL execution; stop before uniqueness and tasks 2.2–2.4. A17/A22, residual U19 and U20/U21 limits remain.


### BSL-household-identity-014 — current member-creation review and evidence limits

**Scope / identity (A31):** Review phase 0 and recommend the next bounded action;
plan-only changes. Domain: household identity. Selected observable workflow:
ordinary-household Settings → add a named member → list result or duplicate
rejection while retaining the selected identity. Onboarding is inspected only as
the immediate shared-form consumer. Business purpose: add a reusable household
actor without changing the current Settings actor (purpose inferred; behavior
implementation-supported). No application or lifecycle actions authorized here.

Branch/HEAD: `moving-to-openspec` /
`7e0dcdbe162704debe8a0f916eb1f7327afc77a5`, 2026-10-15. Relevant dirty inputs:
FamilyManagement (unstaged), identity recovery, creation client/tests/browser mocks,
OpenAPI/generated family builder, controller/service/duplicate exception, SQL and
API/PostgreSQL tests (staged or mixed). The 20-file source/test manifest comprises
FamilyManagement, FamilySelector, AddFamilyMemberForm, familyStore, family adapter,
generated family builder, OpenAPI, FamilyController, FamilyService,
DuplicateFamilyMemberException, schema/compatibility SQL, FamilyCreationPostgresTests,
FamilyControllerTests, FamilyServiceTests, FamilyManagement.creation.test.tsx,
family.test.ts, member-creation.spec.ts, onboarding.spec.ts and mock-api.ts, at their
repository paths linked in BSL-009–013. SHA-256 of sorted `path + NUL + file SHA-256 +
newline` entries: `acb0538483ee38b5bcc13443c935cffbc1cdf8fd90db564c2ab4e6a3ea6f1e33`.
This is source identity, not a runtime-tested identity.

**Ordered trace and observable rules:**

1. Settings content mounts `FamilyManagement`, which now calls `loadFamily` when
   `!hasLoaded`; the old BSL-009 no-load statement is historical. `FamilySelector`
   renders the list and reveals/cancels `AddFamilyMemberForm`. Input/form and
   `familyStore.addMember` trim and reject blank names; pending input/submit are
   disabled. Settings' selection callback remains a no-op.
2. `useFamily` → `familyStore.addMember` → `createFamilyMember` → generated family
   POST → OpenAPI `/api/family`. Current contract documents creation 201 and
   duplicate 409 `{status, message}`; generated POST maps 409 errors. Adapter
   requires a returned ID and normalizes browse mode/language; store appends only
   a successful returned member without selecting it. Full generated-client
   regeneration parity is not established by inspecting this builder.
3. `FamilyController.Create` rejects demo creation (403), otherwise calls
   `FamilyService.CreateFamilyMember`; duplicate exception becomes 409. Service
   trims, queries existing names with `Trim().ToLower()` against `ToLowerInvariant()`
   input, preserves trimmed display casing, saves a new GUID/default profile, and
   translates a recognized unique-violation DbUpdateException into the duplicate
   exception. Success remains CreatedAtAction/GetAll (201), wrapped in `data`.
   Shared access authorization remains owned by BSL-003–005; these creation tests
   do not qualify that gate.
4. `RecipeDbContext.FamilyMembers` persists the entity. Both schema.sql and
   compatibility.sql now declare the unique `lower(trim(name))` index. EF model
   configuration itself does not declare that expression index. Thus PostgreSQL
   concurrency protection depends on installed SQL, not the service precheck or
   EF InMemory. No schema application or household data inspection performed.
5. Successful Settings creation appends the returned member, clears form input,
   and retains selected ID/cookies/onboarding/route. Failure returns null from the
   store without append or selection; form still clears, and Settings still does
   not render the store error (U20). Onboarding's cookie/selection/navigation
   callback remains separate and unawaited by the selector (U21). No enqueue/SSE
   side effect exists in this creation path.

**Assertions, substitutions and dependencies:**

- `FamilyManagement.creation.test.tsx` exercises real component/store/generated
  client with substituted HTTP and cookie actions: 201/list/identity retention,
  409/no append/no selection, and full-list mount loading. The 409 test waits for
  fetch invocation, without asserting completed error feedback or input recovery.
- `family.test.ts` checks 201/409 contract text, decodes a substituted 201 envelope,
  and asserts 409 throws; it does not assert the exact user-visible error message.
- `FamilyControllerTests` asserts 201/defaults/POST→GET and 409 exact/case/space
  rejection with count unchanged for exact duplicate. `FamilyServiceTests` adds
  stored-space and display-casing assertions using `TestDbContextFactory`'s EF
  InMemory provider. Default `TestWebApplicationFactory` omits authentication and
  uses InMemory unless `Tests:PostgresConnectionString` is supplied; it substitutes
  external services. These are not production-access or PostgreSQL proofs.
- `FamilyCreationPostgresTests` creates/drops a random disposable database from
  administrative `WFS_TEST_POSTGRES_CONNECTION`, applies schema.sql, and asserts
  POST→GET/independent row read; a second test asserts sequential 409 variants,
  concurrent 201/409 and row counts. It skips without that variable. It does not
  exercise compatibility.sql against existing collisions, stored-whitespace rows
  on PostgreSQL, or rename compatibility. No current execution observed.
- Browser `member-creation.spec.ts` asserts 201, distinct IDs, list/reload and
  identity retention; duplicate test asserts 409/list count/selected label.
  Onboarding asserts creation/list and duplicate 409/count, without durable Home
  arrival. `setupCommonRoutes` supplies in-memory stateful POST/GET/409 behavior;
  fixtures inject access cookies and fixed time, block unhandled API calls;
  Playwright uses Chromium and local/external BASE_URL per configuration. Browser
  mock outcomes cannot establish API, SQL or end-to-end persistence behavior.
- `docs/user-guide.md` describes shared entry/no personal account, but supplies no
  creation uniqueness or recovery guarantee. Shared dependencies are React/Zustand,
  Kiota, cookie actions, API auth/filter/DTO validation, EF/Npgsql/PostgreSQL and
  installed schema. Ordinary mode only; no deployment/profile qualification.

**Classification / mapping / confidence:** Current 201/409 path, SQL declarations,
Settings mount load and selection retention are **implementation-supported**;
business purpose is **inferred**; current runtime/database/upgrade qualification
is **missing/incomplete**. Medium confidence overall. Map to existing main/delta
requirements “Create and return a named household member”, “Prevent duplicate
member names during creation” (six scenarios), and “Display the created member
without switching Settings identity”. No requirement edited or newly accepted.
Source supports the named ASCII examples; broad whitespace/case equivalence across
JavaScript, .NET and PostgreSQL/collation is unqualified. U19 residual validation
metadata, U20 feedback and U21 non-atomic handoff remain excluded guarantees.

**Actual checks and historical evidence:** CLI 1.14.1 `store list --json` passed
(no stores); `list --json` passed (nearest repository root, zero active changes);
`list --specs --json` passed (household-identity, 25 requirements). Full main spec
inspected (70 scenarios); config has no store declaration. Four archives exist,
including member creation; no initialization/reconfiguration/reopening performed.
Prior `.task/agent-finish/last-run.json`, inspected before this session's final
plan-only verification, records identity
`e8f6b3faa2ea9d3eefe7d88507f92888b63ecab2d222da4c48ed657e44933d2b`,
`automated_checks_passed: false`, database-behavior **blocked**, and task acceptance
not evaluated. Its selected paths exclude the dirty service/controller/SQL and
archived task record. Its other passed checks and BSL-013's reported successes are
historical evidence at their own identity, not current acceptance of all checked
tasks. Archive tasks report PostgreSQL skipped and live parity blocked, conflicting
with their full-completion prose and the plan's older active/unchecked checkpoint
(U22). No new runtime suites, live endpoint probes, database or Docker commands
run: **not-run**, outside this review. Behavior TDD: **not-applicable** to this
plan edit. Final documentation and selected-spec checks are reported in the session
response and current harness record; no runtime claim follows from them.

**Disposition / next bounded action:** Evidence reconciled, acceptance unresolved.
Recommend a separately selected review of member-creation task/lifecycle evidence:
locate any later explicit implementation/archive authorization, reconcile the
checked tasks with actual required checks, and define current-content disposable
PostgreSQL/live parity qualification. Do not infer authorization from their current
location or completion claims, undo existing work, reopen archives, fix gaps or
start the next capability. No need to repeat phase-0 decisions or A29 promotion.

### BSL-household-identity-015 — acceptance and archival evidence review

**Current authority (A32):** The user selected the recommended member-creation
acceptance/archival evidence review before another baseline slice and instructed
that the following sentence be included in the future spec:

> However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.

**Future-spec carry-forward:** Include that exact sentence in the next authorized
spec draft's non-normative evidence/status note, with BSL-014/015 and U22 references.
It describes the recorded review state, not application behavior or a new SHALL/MUST
requirement. Reconcile it with any later supplied evidence rather than silently
turning the historical limitation into a permanent product rule. This instruction
does not select a new capability, authorize generation now, change the accepted
requirements, retroactively authorize implementation/archival, or qualify runtime.

**Identity / reused evidence:** Same branch/HEAD and 20-file manifest as BSL-014;
all 20 source/test digests rechecked unchanged. Domain and observable workflow
remain household identity / Settings creation or duplicate rejection with current
selection retained. Reuse BSL-014's complete trace, purpose, rules, dependencies,
negative paths, test substitutions and medium confidence; no application rescan.
This review adds acceptance/lifecycle evidence, not new behavior claims.

| Review dimension | Evidence / result | Disposition |
| --- | --- | --- |
| Human spec acceptance and promotion | A29 records “approved and promote”; current main has 25 requirements/70 scenarios | Retained; not reopened or newly accepted |
| Delta/main agreement | Read-only requirement-block comparison: all seven member-creation blocks identical, including all 21 scenarios | Passed content comparison; no sync required |
| Physical archival | Archive contains metadata/proposal/design/delta/tasks; CLI reports zero active changes and nearest local root, no stores | Location verified; move authorization and procedure not established |
| Task 2.1 acceptance | 201/list/client source/assertions exist; archived task requires real PostgreSQL POST→GET; `.task/member-creation-2-1.json` explicitly records `task_2_1_complete: false`, PostgreSQL not-run and several sandbox-blocked checks | Acceptance unestablished; checkmark conflicts with required evidence |
| Task 2.2 acceptance | Current 409/index source and tests are implementation-supported; archived checkpoint itself reports PostgreSQL skipped; no current concurrency/constraint observation, stored-whitespace PostgreSQL assertion, compatibility/collision/rename qualification or red/green command record established | Acceptance unestablished; checkmark/full-completion claim unsupported by reviewed evidence |
| Task 2.3 acceptance | Client, shared stateful mocks and Settings/onboarding assertions support intended integration; historical browser/unit passes reported, with different counts in plan/archive | Current-content test-first and full acceptance not established; mock results do not prove persistence |
| Task 2.4 acceptance | Archive requires complete implementation path selection, database concurrency and identity reconciliation; BSL-014's inspected prior finish record had database blocked and excluded service/controller/SQL/archive tasks | No complete acceptance evidence; later plan-only checks cannot close implementation tasks |
| Authorization provenance | Approval registry ends implementation authority at A30 task 2.1; A31/A32 are review-only. Targeted `git log` returns no commits for the plan or this archive; current artifacts are staged additions | No later instruction found in inspected repository evidence; absence from this evidence is not proof no instruction was ever given |
| Archive metadata / procedure | `.openspec.yaml` records schema and creation date only; no approving instruction or archive execution/check log found. Installed archive workflow separates artifact/task counts and delta synchronization; configuration requires separate acceptance evidence | Seven checked boxes are not proof of procedure or acceptance; do not rerun archive/status against a fabricated active change |
| Documentation integrity | Three archive links `../../../docs/openspec-baseline-plan.md` in proposal/design/tasks resolve to missing targets; task handoff still names the old active tasks path. Delta preamble/design retain original future/unimplemented wording; tasks simultaneously retain “four future tasks open” and full-completion prose | Recorded documentation discrepancies; archive edits/reopening not performed in review scope |

**Historical evidence identity:** `.task/member-creation-2-1.json` is scoped to
2.1 at the same HEAD, with 738-unit-pass and blocked/not-run records; every one of
its nine still-present listed files has a different current SHA-256, and its active
tasks path is absent. It is historical evidence only, not a result for current
source. BSL-014 captured a later finish identity with database-behavior blocked;
that record was subsequently replaced by A31's plan-only verification. Current
`.task/agent-finish/last-run.json` therefore cannot be cited as an all-implementation
completion record. No additional current-content runtime result was discovered in
these bounded evidence sources. No broad private conversation/history search.

**Checks / limits:** Read-only CLI store/root/change/spec discovery passed. Main
strict validation passed (`openspec validate household-identity --type spec --strict
--no-interactive`, exit 0); block equality and unchanged 20-file source manifest
checks passed. `WFS_TEST_POSTGRES_CONNECTION` presence-only check is false in this
process; no credential value printed, service connection, Docker probe or database
creation attempted. PostgreSQL/browser/API/live parity: **not-run** this session;
historical blockers are not relabeled as current failures or successes. Three
broken archive links were observed by path resolution; no archive repair check
passes are claimed. TDD/application checks: **not-applicable** to this plan-only
edit. Final bounded documentation outcomes/content identity are in this session's
response and harness record.

**Review conclusion:** Accepted/promoted spec content is intact. Implementation
acceptance and archival provenance remain unresolved (U22); do not mark reviewed
completion claims verified, infer retrospective authority, undo the archive or
select another slice. The focused missing fact has been requested from the user:
whether a later session explicitly authorized tasks 2.2–2.4 and this archival.
The user answered “Yes—I'll provide the instruction or reference” on 2026-10-15.
Record this as user-reported later authorization; the original scope/reference is
still pending, so no retrospective approval entry or lifecycle action is inferred.
A supplied instruction can settle provenance; it cannot substitute for PostgreSQL
or other required runtime evidence. A later separately selected qualification can
run the existing disposable test with a configured administrative test connection:
`dotnet test api/src/RecipeApi.Tests/RecipeApi.Tests.csproj --filter FullyQualifiedName~FamilyCreationPostgresTests`.
That check alone would still not establish the unasserted stored-whitespace,
compatibility/collision/rename cases or historical test-first order. No new tests,
application fixes, data remediation or production migration authorized here.

### BSL-household-identity-016 — bounded PostgreSQL qualification readiness

**Scope / authority:** A33: user “keep going” after BSL-015; continue the next
bounded qualification using existing checks, without implementation, application
test edits, archive repairs/moves or a successor baseline slice. Authorization
reference for earlier tasks 2.2–2.4/archive remains user-reported and pending;
continuation does not backfill that provenance.

**Identity:** `moving-to-openspec` /
`7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus existing dirty inputs. Reuse
BSL-014/015's selected workflow/source/assertion trace and qualification limits.
The fixture config uses Npgsql only with `Tests:PostgresConnectionString`; the
existing PostgreSQL tests create random disposable databases, apply schema.sql,
assert creation/retrieval/duplicate/concurrent outcomes and drop those databases.
An administrative test connection is required; no household connection substituted.

| Actual check | Outcome / scope |
| --- | --- |
| Git status and HEAD | Passed read-only discovery; dirty baseline preserved |
| Presence-only `WFS_TEST_POSTGRES_CONNECTION` check | Passed inspection: unset; no secret printed |
| `docker info --format '{{.ServerVersion}}'` | Blocked, exit 1: permission denied connecting to `/Users/alex/.docker/run/docker.sock`; no daemon-health conclusion |
| `dotnet test ... --filter FullyQualifiedName~FamilyCreationPostgresTests` | Not-run: unconfigured fixture would skip; no disposable server available through permitted Docker access |
| Database qualification | Blocked by runner readiness; no new persistence/concurrency observation |
| Other application/browser/live checks | Not-run; cannot remove the identified database gap |
| TDD / implementation acceptance | Not-applicable to plan edit / not established for application |

**Exact local handoff**, from repository root after configuring
`WFS_TEST_POSTGRES_CONNECTION` for an administrative **disposable test** PostgreSQL
server (the tests create/drop isolated databases):

```sh
dotnet test api/src/RecipeApi.Tests/RecipeApi.Tests.csproj --filter FullyQualifiedName~FamilyCreationPostgresTests
```

Return the passed/failed/skipped counts and tested source identity; both existing
PostgreSQL tests must actually execute. A skipped run is not qualification. Do not
run `task prepare`, migrate household data or repair code merely to run this check.
A passing run would qualify only the assertions in these two tests, not the missing
stored-whitespace PostgreSQL/compatibility/collision/rename cases or historical
red/green order noted in BSL-015. No sandbox retry/escalation attempted. Keep U22,
user-required future-spec note and prior acceptance/promotion distinctions intact.

### BSL-household-identity-017 — remaining requirements coverage audit

**Authority / identity:** A35: user asks whether household identity has anything
left and conditionally directs recipe-library only if it does not. Review at
`moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus existing
dirty inputs. Current CLI inventories confirm nearest local root, zero active
changes and main household-identity with 25 requirements. All main requirement
headings compared against the plan inventory and the targeted connected paths.
This is a bounded coverage audit, not full extraction of all three remaining flows.

Domain / business purpose: household identity; maintain household actors and
choose the current browser actor. Purpose is inferred from UI and existing owner.
Existing main covers onboarding selection/recovery/Profile name display, shared
access, invites and member creation. It does not specify the following paths:

| Remaining slice | Connected evidence and important rules to inspect next | Assertions / limits |
| --- | --- | --- |
| Member renaming | `FamilyManagement`/onboarding → `FamilySelector` → `FamilyMemberList` edit/input/save/cancel → `useFamily.updateMember` → `familyStore.updateMember` → `family.ts:updateFamilyMember` → generated item PUT/OpenAPI `PUT /api/family/{id}` → `FamilyController.Update` → `FamilyService.UpdateFamilyMember` → existing EF row/name/UpdatedAt → returned DTO/store replacement/display. Edit preloads current name; save trims through store/service, blank names are rejected; cancellation resets local edit state. | `FamilyControllerTests.Update_Returns_Ok_With_Updated_Name`, `Update_Empty_Name_Returns_BadRequest`, `Update_NonExistent_Returns_NotFound`; service tests assert name/timestamp/re-fetch, blank and missing-ID paths with EF InMemory. Source reviewed, tests not-run. No focused FamilyMemberList test found in inspected test filenames. |
| Member removal (API-only scope candidate) | `family.ts:deleteFamilyMember` and store action exist; OpenAPI DELETE → `FamilyController.Delete` → `FamilyService.DeleteFamilyMember` → EF remove/save → 204. No delete control in the inspected FamilyMemberList. Do not invent a user-facing removal journey or safe deletion guarantees. | Controller tests assert 204 and absence on later list, plus missing-member 404; service tests use InMemory. Referenced-member FK effects, current-identity recovery and actual client callers need a separate bounded trace before normative claims. |
| Switch active member from Profile | `profile/page.tsx` → `ProfileDropdown` → callback → `selectFamilyMember` cookie/store action, onboarding completion and `router.push(HOME)`. Profile does not await selection before requesting Home. Existing onboarding-selection requirement does not own this distinct trigger/handoff. | Profile unit test stubs dropdown, hook, router and completion; it asserts only stub rendering. Persistence browser tests cited in BSL-001 do not qualify this whole flow. No current runtime result; no atomic/durable switching claim. |

**Dependencies / uncertainty:** Renaming/removal depend on identity shared access,
OpenAPI/client/DTO mapping, EF and PostgreSQL relationships/constraints; Profile
switching depends on cookies/server actions, Zustand and router instead of a new
member write. The current unique-name SQL index can affect rename, while the
rename service has no explicit creation-style duplicate-exception translation.
Contract documents PUT 200/DELETE 204, without their inspected 400/404 negative
responses. These are discovery questions/mismatches to reconcile, not permission
to fix the contract, implement uniqueness on rename or promise deletion safety.
Preferences remain owned by member-preferences; demo/preview/deployment variants
remain deferred under A09. Creation runtime/provenance issues remain deferred A34.

**Classification / confidence:** Presence of the three source paths and absence of
corresponding main requirements are implementation/content-supported; no new
behavior runtime-verified. High confidence in the coverage gap, medium in complete
flow semantics until selected tracing and assertion/configuration reconciliation.
No requirement/scenario mapping created for unextracted behavior. Checks: CLI
inventories passed; source/assertion inspection completed; application/browser/API/
PostgreSQL checks not-run, behavior TDD not-applicable to this plan edit. Final
bounded documentation checks are reported in session response/current harness.

**Disposition / recommendation:** Household identity has requirements work left,
so the user's conditional recipe-library instruction is not activated. Correct the
prior sequence and discover only ordinary-household member renaming next. Removal
and Profile switching remain separate slices; defer them only by explicit decision.
No database instance is needed for source-supported requirements discovery under
A10; implementation/runtime acceptance remains separate.

## Promoted slice — household identity / member renaming

### BSL-household-identity-018 — edit and save an existing member name

**Authority / identity:** A36: user “accepted proceed” to the recommendation to
discover member renaming. Scope: source/assertion discovery and durable plan only;
A34 implementation/database deferral continues. Branch/HEAD:
`moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`, with the existing
staged/mixed family service/controller/SQL/tests and other dirty inputs preserved.
Those existing uniqueness edits affect this trace; they are not this session's work.

| Discovery field | Finding |
| --- | --- |
| Domain / purpose | Household identity: correct a displayed household actor name while retaining the actor's existing ID. Purpose inferred from connected edit controls; no personal-account or ownership system implied. |
| Implemented capabilities | Edit a displayed member in the shared onboarding/Settings list; preload name; cancel/reset; submit nonblank trimmed name; update existing record and return mapped member; replace that member in client list. |
| Important workflow | Onboarding or Settings → FamilySelector → FamilyMemberList pencil → input → Save/Enter → store/client PUT → controller/service/EF → 200 envelope → store replacement → updated label and editor close. |
| Business rules | Any displayed row has edit, including the selected row; edit click stops propagation to selection. Store/service trim; service rejects blank; same ID is updated with new UpdatedAt, keeping other entity fields. No selected-ID/cookie/navigation write in rename. Case is preserved after trimming. |
| Dependencies | Shared household access; React local state; Zustand/useFamily; Kiota JSON/client; global success filter/error middleware; EF/Npgsql and installed schema; current-member display uses existing identity owner. |
| Excluded | Creation uniqueness as rename policy, API removal, Profile switching, preferences, cross-device propagation guarantees, demo/preview/deployment qualification, new UX/error handling, tests or repairs. |
| Evidence / confidence | Implementation-supported, medium overall confidence: positive path aligned; negative/constraint/validation differences and browser substitutions remain. No runtime-verified rename behavior in this session. |
| Artifact status | Discovery candidate only. Main remains 25 requirements/70 scenarios; no rename delta/change/spec created and no acceptance/promotion/archive action. |

**Ordered source trace and observable result:**

1. `pwa/src/app/(auth)/onboarding/page.tsx` and Settings'
   `pwa/src/components/profile/FamilyManagement.tsx` render `FamilySelector`, which
   supplies the loaded list to `pwa/src/components/identity/FamilyMemberList.tsx`.
   Editing preloads the row's name and autofocuses the input. Cancel/Escape clears
   local editing state without issuing PUT; reopening reloads the member name.
   Save is disabled for trimmed-blank input and while shared `isLoading` is true.
   Enter invokes the same `handleUpdate`; blank input returns without request.
2. `useFamily.updateMember` exposes `pwa/src/store/familyStore.ts:updateMember`.
   The store trims, ignores blank input, sets loading/clears old error, and awaits
   `pwa/src/lib/api/family.ts:updateFamilyMember`. The adapter invokes generated
   `api.family.byId(id).put({name})` in
   `pwa/src/lib/api/generated/api/family/item/index.ts`, whose metadata uses PUT,
   JSON and the `data` response decoder. It has no explicit PUT error mappings;
   request name is optional/nullable in the generated representation despite the
   contract's required string. `api-client.ts` uses configured public API base URL
   or same origin and may inject current-member context; no new auth policy here.
3. `specs/openapi.yaml:PUT /api/family/{id}` requires UUID path/name body and
   documents 200 member envelope. `FamilyController.Update` receives
   `UpdateFamilyMemberDto` and calls `FamilyService.UpdateFamilyMember`; global
   Program authorization remains the access owner. There is no action-level
   member-ID binder/actor ownership comparison; do not describe this as own-name
   only permission. The contract's member-ID security notation and global access
   must not be interpreted as proven per-member authorization enforcement.
4. Service trims, rejects blank via ArgumentException, loads by existing ID or
   throws KeyNotFoundException, sets Name/UpdatedAt, awaits SaveChangesAsync and
   returns the same entity. `RecipeDbContext.FamilyMembers`, `FamilyMember` and
   `api/database/schema.sql` map existing UUID/name/varchar(100)/timestamps. Current
   schema and compatibility SQL contain the normalized unique-name index; neither
   schema execution nor PostgreSQL constraint behavior was observed here.
5. Controller returns `Ok(ToDto(member))`; `SuccessWrappingFilter` produces `data`.
   Adapter requires a truthy ID, returns name/defaulted browse/language and drops
   timestamps. Store replaces only the matching original ID in the array; no
   reload/re-sort or selection/cookie change. `FamilyMemberList` exits edit mode
   after the store promise resolves, displays new name/title; `useFamily` resolves
   the selected member against this list, supporting updated current-name display
   through existing Profile requirements. No family workflow or SSE publish exists
   in this update path; no automatic other-device refresh guarantee.

**Negative/pending behavior and mismatches (U23/U24):** Store catches request or
adapter errors, sets store error, clears loading and resolves normally without
replacing the member. List therefore exits edit even on failure. Onboarding renders
the shared error alert; Settings' management/list does not consume it. No inline
retained-input/retry guarantee. Save/Cancel buttons disable while loading, but the
input and Enter/Escape handlers do not; a keyboard action can bypass those button
states. There is no handler/store busy guard, request cancellation or atomic
multi-edit coordination. Do not claim all edits locked, exactly-once submission,
safe cancellation of in-flight updates or universal pending/recovery behavior.

Update DTO has required C# string but no explicit MaxLength/Required annotations;
service has no max-length or duplicate precheck/translation in this method. Entity
max-100 metadata and SQL varchar(100) differ from input/contract constraints. The
installed unique index may reject conflicting rename; an unhandled DbUpdateException
maps to generic 500 through `ErrorHandlingMiddleware`, rather than creation's 409
catch. Service blank/missing exceptions map to 400/404, but PUT OpenAPI documents
only 200. Withhold complete validation/status parity, duplicate rejection policy,
and preservation across concurrent/constraint failures until settled. No fixes.

**Inspected assertions and substitutions:**

- `FamilyControllerTests.Update_Returns_Ok_With_Updated_Name` asserts 200, new name,
  stack default; `Update_Empty_Name_Returns_BadRequest` and
  `Update_NonExistent_Returns_NotFound` assert statuses. Factory defaults to auth
  omitted and EF InMemory; no production access/SQL qualification follows.
- `FamilyServiceTests.UpdateFamilyMember_Updates_Name_And_UpdatedAt` asserts new
  name, increasing timestamp and re-fetch; blank/whitespace and unknown-ID cases
  assert exceptions. `TestDbContextFactory` is EF InMemory. No rename duplicate,
  PostgreSQL length/constraint, concurrency or full preference-preservation runtime
  result was found in this bounded inspected set.
- `pwa/e2e/settings.spec.ts` test “family member name can be edited from settings”
  fills/saves Jordan Chef and asserts updated list label. A per-test PUT override
  returns a fixed 200 with only ID/name: no request-body assertion, server mutation,
  subsequent GET/reload, selection retention or failure assertion. Its response
  omits other contract-required fields. Layout tests open the editor/click Cancel
  and check fit; they do not assert no request, reset, Escape/Enter or failure.
  Shared fixtures/routes inject identity/access and substitute API; tests were
  inspected, not run. No focused FamilyMemberList unit file found by bounded test
  search; that is not a claim of repository-wide absence.
- `docs/user-guide.md` is consistent with shared household identity but provides
  no inspected detailed rename/constraint/recovery guarantee. Shared rule owners
  and creation's desired uniqueness remain separate from supported rename policy.

**Checks / disposition / next decision:** Read-only OpenSpec inventories passed:
nearest repository root, no active changes, household identity 25 requirements.
Source and test assertion inspection completed; application/browser/API/live/
PostgreSQL checks **not-run** (A34), TDD **not-applicable** to the plan edit. Final
plan-only verification results/content identity in session response/current harness.
Recommendation: authorize a documentation-only rename draft covering normal
edit/cancel, trimmed nonblank save, existing-ID update/200 and returned-label display
without selecting another member. Retain U23/U24 non-normatively under A12; no
unsettled duplicate/validation/recovery promises. Generation not authorized by
this discovery approval; any future draft carries BSL-015's required historical
status sentence as a non-normative note. API removal and Profile switching follow
as separate discovery slices after this one; recipe-library remains queued.

### BSL-household-identity-019 — member-renaming draft and scenario mapping

**Authority / identity:** A37: user “propose”, 2026-10-15, explicitly authorizes
only the bounded rename proposal/delta/design/tasks and plan updates. CLI context
resolved nearest repository root `/Users/alex/Code/whats-for-supper`; no store
selection or reconfiguration. CLI scaffold created metadata before artifact writes.
Branch/HEAD unchanged at `moving-to-openspec` /
`7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus dirty inputs recorded in BSL-018.
Relevant discovery inputs rechecked unchanged: shared editor, family store/adapter,
generated item PUT, service/controller, OpenAPI, schema and Settings browser tests.
The full main spec was re-read; no existing requirement redefined.

**Artifacts / status:**
[proposal](../openspec/changes/baseline-household-identity-member-renaming/proposal.md),
[delta](../openspec/changes/baseline-household-identity-member-renaming/specs/household-identity/spec.md),
[design](../openspec/changes/baseline-household-identity-member-renaming/design.md),
[tasks](../openspec/changes/baseline-household-identity-member-renaming/tasks.md)
and CLI metadata. All four planning artifacts exist; no optional artifact omitted.
Design captures cross-layer contract/constraint ambiguity and extraction choices.
Four completed tasks concern extraction/reconciliation/documentation validation only;
none describes application implementation. CLI complete/ready flags mean artifact
existence, not acceptance, production qualification or authorization to apply code.

| Added requirement | Scenarios | Evidence / assertion limit |
| --- | --- | --- |
| Open an existing household member name for editing | Edit from onboarding; Edit from Settings | BSL-018: both callers use FamilySelector/FamilyMemberList; prefilled input and controls, edit click stops selection. Settings browser test opens/fills; no current runtime result or onboarding-edit assertion. |
| Cancel an unsubmitted member-name edit | Cancel through the control; Cancel with Escape; Reopen after cancellation | BSL-018: cancelEditing resets local state; reopening reads current loaded member; unsubmitted-only avoids promising request cancellation. Layout browser assertions click Cancel but do not prove no request/reset/Escape; remaining scenarios source-supported. |
| Submit a trimmed nonblank member-name edit | Submit with Save; Submit with Enter; Blank name is not submitted | BSL-018: handlers/store trim and guard blank; Save disabled for blank. Browser saves a substituted success but does not assert request body; service tests assert blank exceptions. Trim/case/Enter scenarios source-supported, not runtime-qualified. |
| Update and return the existing household member | Successful rename response; Saved name is available on later listing | BSL-018: OpenAPI 200/data, controller/service same-ID Name/UpdatedAt save, entity preferences/creation untouched and list reads persisted rows. Controller asserts 200/name/browse default; service asserts timestamp/re-fetch via InMemory. Full fields, real SQL and later-list scenario are source-supported only. |
| Display a renamed member without changing active identity | Rename another member; Rename the selected member | BSL-018: adapter/store row replacement, editor closure, no selected-ID/cookie/completion/navigation action; existing selected-name owner reused. Settings test asserts new Jordan label through fixed response, without retention/persistence assertions. Selected-member scenario source-supported only. |

**Reconciliation:** Five ADDED requirements/12 scenarios; no MODIFIED/REMOVED/
RENAMED blocks, new capability or main edits. Shared API access and selected-name
requirements referenced by their existing names. Positive requests require valid
nonconflicting names and successful persistence; no invented length, duplicate 409,
own-name authorization, pending-lock, rollback, retained-input or universal retry
claim. U23/U24 remain non-normative evidence. The exact BSL-015 sentence is included
in the delta as requested, labeled historical with the subsequently reported
later authorization/reference status alongside it. No prior archive reopened.

**Checks / classification:** `openspec validate baseline-household-identity-member-renaming
--strict --no-interactive` passed, exit 0. Source/assertion reconciliation supports
implementation-supported behavior, medium confidence; no rename behavior newly
runtime-verified. Final `task verify --` selects only plan plus five change files,
with documentation/content outcomes and identity in the response/harness record.
Application/browser/API/live/PostgreSQL checks **not-run** (A34), behavior TDD and
client generation **not-applicable** to this edit. All unrelated staged/unstaged
work and the deleted navigation spec remain outside task ownership.

**Disposition:** Drafted and validated, pending human review. Acceptance, promotion
and archival are each unauthorized in this session. Next action is review of this
draft; API removal and Profile switching remain separate discovery, library queued.

### Member-renaming main-spec promotion record — 2026-10-15

A38 directly authorizes promotion of the reviewed bounded rename delta and a
continuation prompt; it does not authorize archival, application implementation or
the next slice's generation. No separate acceptance message was supplied. The
installed sync-specs workflow resolved `planningHome.root` and the sole delta via
`artifactPaths.specs.existingOutputPaths`; current specs instructions were fetched
before the main write. Five ADDED requirements/12 scenarios were appended verbatim.

Main household identity now has 30 requirements/82 scenarios. The previous file
is an exact byte prefix, preserving title, Purpose, page-gate preamble and all 25
prior requirements/70 scenarios. One Requirements section and no delta operation
headings remain. The delta/proposal/design/metadata are unchanged. Its requested
historical status note remains in the delta and plan, outside normative additions.
BSL-018/019 mapping, U23/U24 and A34 deferral remain unchanged; promotion is no
runtime observation or constraint/error-handling repair.

Checks: `openspec validate --specs --strict --no-interactive` passed (1/1);
`openspec validate household-identity --type spec --strict --no-interactive` passed.
Final three-path `task verify --` selects main, rename task follow-up and this plan;
check outcomes/content identity are reported in session response/current harness.
Runtime checks not-run; behavior TDD not-applicable. The rename change remains
active; no archive move, commit, staging, database or application action performed.

### Next-session requirements handoff

A38 handoff retained for provenance; the removal discovery requested below is
now completed by A39/BSL-020/021. Use the latest checkpoint for the next action.

Household identity is not complete. Next: **API member removal**, one bounded
read-only workflow slice. Profile switching is still pending after that. Preferences
retain their separate owner; deferred runtime/provenance issues do not block
source-supported requirements work under A10/A34.

Start from `FamilyController.Delete`, `FamilyService.DeleteFamilyMember`,
`family.ts:deleteFamilyMember`, `familyStore.removeMember`, OpenAPI DELETE and
FamilyControllerTests/FamilyServiceTests. Resolve actual UI/API callers before
claiming a user-facing delete journey. Trace persistence relationships/SQL FK
behavior, referenced versus unreferenced member deletion, missing IDs, authorization,
client selection/cookie cleanup and subsequent list/current-member results.
Inspect assertions and substitutions; withhold disputed guarantees. Do not execute
deletion, launch services, fix gaps, request database access or reopen prior archives.
Update this plan with evidence/limits and the next focused drafting recommendation;
no generation until that bounded slice is explicitly authorized. If current source
or approvals show removal is already extracted, select remaining Profile switching;
only after identity coverage is reconciled complete, select recipe-library list
visibility. Do not extract multiple capabilities in one session.

## Reviewed slice — household identity / API member removal

### BSL-household-identity-020 — API removal, relationships and subsequent reads

**Authority / source identity:** A39, discovery/review and this plan only, at
`moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus existing
staged/unstaged inputs. Reuses BSL-017's removal starting points and BSL-001/004/005
identity/access boundaries; rechecks current controller/service, client, tests,
EF and SQL rather than assuming HEAD represents the dirty implementation.
Current family controller/service/tests, schema/compatibility SQL, OpenAPI,
IdentityValidator, family-management UI and mock edits predate this review.
A34 deferral, BSL-018/019, U23/U24 and BSL-014–016/U19–U22 remain unchanged.

| Discovery field | Finding |
| --- | --- |
| Domain / purpose | Household identity: remove a household actor from the member registry. Purpose inferred from API operation and physical row removal; no personal-account erasure or user-facing deletion journey implied. |
| Selected workflow | API consumer/client DELETE → approved operation → controller/service → EF/SQL → 204 on successful save → subsequent family list/current-member lookup. Browser helper/state consequences are inspected evidence, not a connected journey. |
| Implemented behavior / rules | UUID target; existing row physically removed after lookup and successful save; no soft-delete, last-member guard, replacement identity, explicit dependent lookup/reassignment or member-ownership comparison. List reads remaining rows ordered by name. |
| Dependencies | Existing household authorization, Kiota transport/base URL, exception middleware/success filter, EF/Npgsql, installed SQL relationships; browser cookie actions and conditional identity validator are separate boundaries. |
| Exclusions | New delete UI/confirmation, safe account erasure, reassignment, total history cleanup, browser/cross-device synchronization guarantees, preference policy, Profile switching, demo/preview/deployment qualification and all implementation fixes. |
| Class / confidence | Implementation-supported; high for the simple controller/service path with matching unreferenced InMemory assertions; medium overall because relational side effects, failure paths and browser cleanup lack qualification. Runtime verified: none in this session. |
| Status | Reviewed evidence/candidate only; no removal change or normative additions. Main remains 30 requirements/82 scenarios; active rename and all archive artifacts preserved. |

**Ordered trace and observable results:**

1. Caller search in `pwa/src`/`pwa/e2e` finds
   `pwa/src/lib/api/family.ts:deleteFamilyMember` called by
   `pwa/src/store/familyStore.ts:removeMember`, exposed by `useFamily.ts`.
   No component invokes removal. Inspected `FamilyManagement` → `FamilySelector`
   → `FamilyMemberList` offers selection, add, rename and optional invite, without
   a delete control. API controller tests are actual test callers. Do not infer
   a Settings/onboarding delete journey from an exported helper or mock route.
2. Adapter awaits generated `api.family.byId(id).delete()` in
   `pwa/src/lib/api/generated/api/family/item/index.ts`; metadata targets
   `/api/family/{id}` using `sendNoResponseContent`, without DELETE error mappings.
   No body/DTO returned. `api-client.ts` selects `NEXT_PUBLIC_API_BASE_URL` or
   same origin and injects selected/readable-cookie member context; shared-access
   transport/origin limits remain BSL-004/U15, not a new removal policy.
3. `specs/openapi.yaml:DELETE /api/family/{id}` declares required UUID path ID,
   member-header security metadata and only 204 Deleted. Actual
   `FamilyController.Delete(Guid id)` has `{id:guid}` routing, awaits service and
   returns `NoContent()`. It has no member-context binder, own-ID comparison,
   admin role or demo check. `Program.cs` globally requires authenticated shared
   household access. `HearthAuthenticationHandler` uses configured `HEARTH_SECRET`
   and raw header/Bearer/`h_access` paths; reuse shared-access requirements rather
   than treating the member header as personal authorization (U08/U14/U25).
4. `FamilyService.DeleteFamilyMember` finds the row or throws
   `KeyNotFoundException`, calls `FamilyMembers.Remove`, then `SaveChangesAsync`.
   No worker/workflow/SSE publish, explicit related-record update, cookie action
   or external cleanup occurs in this path. `FamilyMember`/`RecipeDbContext` map
   `family_members`; Program selects Npgsql using `POSTGRES_CONNECTION_STRING`
   or `ConnectionStrings:DefaultConnection`. No connection values inspected.
5. With successful save, controller returns 204 without `data`; the global
   `SuccessWrappingFilter` wraps ObjectResult, not this NoContentResult.
   Later authorized `GetAll` → `GetAllFamilyMembers` reads remaining rows ordered
   by Name and returns mapped members in `data`, excluding the deleted ID.
   `GetMe` reuses header-then-cookie GUID binding: a still-supplied deleted ID
   finds no row and returns 404; no parseable identity returns 401. A valid other
   header can still resolve its existing member. GET-me 404 remains the existing
   U13 contract mismatch, not newly accepted normative error behavior.

**Referenced versus unreferenced members — declarative evidence, not DB results:**

| Relationship / source | Declared removal effect | Qualification limit |
| --- | --- | --- |
| `recipes.added_by` / RecipeDbContext Recipe | SET NULL, preserve recipe rows | Soft-deleted recipes are query-filtered in EF but still covered by SQL FK; no live observation. |
| `recipe_import_reports.reported_by`, `updated_by` / RecipeImportReport mapping | SET NULL, preserve report rows | Both nullable relationships agree in EF/SQL; no removal test asserts this. |
| `recipe_votes.family_member_id` / RecipeVote mapping | CASCADE deletes member votes | Does not establish refreshed vote totals, plans or search-affinity caches; no recompute/broadcast in delete service. |
| `feature_flag_overrides.member_id` / FeatureFlagOverride mapping | CASCADE deletes overrides | `compatibility.sql` also declares this when creating the table; installed schema not inspected. |
| `maintenance_commands.requested_by` / schema.sql | SET NULL, preserve commands | Model has scalar RequestedBy without a member navigation/EF FK mapping; InMemory/EnsureCreated cannot qualify this SQL-only relationship. |
| `recipes.deleted_by` / schema.sql and Recipe model | Nullable UUID with no declared member FK | No automatic nulling/erasure supported; arbitrary member IDs in JSON/payloads are not FK cleanup guarantees. |

No RESTRICT/NO ACTION member FK appears in the inspected schema declarations;
this does not establish every deployed schema or guarantee referenced deletion.
An unreferenced member takes the simple remove/save path; a referenced member
relies on actual installed constraints and EF tracking. Withhold universal safe
removal, preservation/erasure of all history and transactional cross-client cleanup.

**Negative paths / contract limits (U25):** Missing valid UUID → service exception
→ `Middleware/ErrorHandlingMiddleware` JSON 404 (`status`, `message`), not a
repeat-success 204. A sequential retry after success therefore reaches missing
ID; concurrent races are unqualified. Malformed IDs fail the GUID route constraint;
no runtime status assertion was found for them. Save/FK/provider exceptions lack
special translation here and fall through to generic 500 with generic message.
No all-members/self/last-member restriction is implemented. DELETE only documents
204, and its member-header metadata differs from actual global shared-access
checks. Record 404/500/authorization differences; do not repair or promise complete
negative-status parity, admin-only/self-only access, or universal repeat success.

**Tests / actual assertions and substitutions:**

- `FamilyControllerTests.Delete_Returns_NoContent_And_Member_Is_Gone` creates an
  unreferenced member, asserts DELETE 204 and absence of ID on later GET. It does
  not assert empty body, dependents, surviving other members, cookies or `/me`.
  `Delete_NonExistent_Returns_NotFound` asserts only 404 for random valid UUID.
- `FamilyServiceTests.DeleteFamilyMember_Removes_Member` creates Frank then asserts
  absence in subsequent service list; missing-member test asserts
  `KeyNotFoundException`. `Infrastructure/TestDbContextFactory` uses fresh EF
  InMemory. No removal relational constraint/failure/concurrency assertion found.
- `TestWebApplicationFactory.CreateAsync()` defaults to auth omitted, InMemory,
  seeded default member, test server and mocked orchestration/storage. Optional
  PostgreSQL override does not mean these tests use it. `AuthEnforcementTests`
  enables auth but exercises recipe description/health, not family DELETE.
  `FamilyCreationPostgresTests` qualifies creation candidates only, not removal.
- `pwa/src/lib/api/family.test.ts` asserts POST contract/201 decoding/409 with
  substituted fetch, without DELETE assertions. Bounded filename/symbol search
  found no dedicated removal-store or connected removal-browser test.
  `pwa/e2e/mock-api.ts` returns DELETE 204 without mutating its family list;
  its `/me` stub supplies a successful synthetic profile rather than checking
  member existence. Mock success cannot establish subsequent absence or recovery.
- Relevant documentation: OpenAPI names deletion with only 204;
  `docs/architecture.md` describes shared access/member cookies and broadcasts
  for planning/grocery/voting, not family-removal broadcast. README provides no
  deletion journey. Reuse prior identity evidence, not retired feature inventory.

### BSL-household-identity-021 — disconnected client removal and stale identity

`familyStore.removeMember` sets loading/clears old error, awaits API deletion,
then compares target ID to selected ID with exact string equality. If selected,
it awaits `auth.ts:clearFamilyMemberCookie` then calls
`identity/cookie.ts:removeFamilyMemberIdCookie`; only afterward does it filter the
local list and set selected ID null. For another member it filters only matching
ID and retains selection. It ends loading without navigation, replacement-member
selection or onboarding-completion changes. This is an exposed helper, not a UI
capability. Case-insensitive UUID matching elsewhere does not apply to this action.

API rejection leaves local list/selection unchanged and records error; the action
catches and resolves. Cookie-action failure after server success also records
error and leaves local list/selection stale; server deletion is not rolled back.
No busy guard, cancellation, repeat suppression or atomic cookie/state cleanup.
Server cookie deletion uses name-only cookies().delete; readable fallback expiry
specifies root path/SameSite but omits the configured domain used at creation.
Cookie-domain/HTTPS/origin delivery and cleanup success remain unverified (U15).

A direct API DELETE neither changes requesting/other browser stores nor expires
identity/access cookies. After later successful family reload, `useFamily` finds
no selected-member object for the deleted ID. `IdentityValidator` attempts clear
and onboarding redirect only when `hasLoaded`, ID absent and loaded list is
nonempty; it does not await `selectFamilyMember(null)`. An empty list after deleting
the final member does not trigger that branch. Loaded lists are not automatically
invalidated by this API; existing `hasLoaded` may prevent another fetch. Load failure
also sets `hasLoaded`, so this is not proof of a fresh authoritative list. PWA
`proxy.ts` checks nonempty member-cookie presence, not row existence; API `/me`
404 is collapsed to null by `getCurrentFamilyMember`, and recovery does not clear
an already selected ID on null. No universal automatic recovery claim (U13/U26).
Prior persistence/browser tests use substituted APIs and do not assert a real
DELETE → list → stale-cookie/current-identity lifecycle.

**Evidence identity / checks / disposition:** BSL-020/021 use the 35-path SHA-256
manifest (sorted `path + space + file-digest + newline`):
`dce614e9dbefd6afaa4285eccdc4a323dc5b27b36204bcc0a029baf853c3f035`.
All paths are the immediate source/test dependencies named above plus main
identity spec. Runtime API/browser/DB checks **not-run** under A34 and explicit
session scope; no deletes, services or database-access requests. Behavior TDD and
application/client-generation checks **not-applicable** to this plan-only edit.
CLI root/stores/active/spec inventories passed; full identity spec reviewed and
contains no removal requirements. Final bounded documentation results belong to
session response/current harness, not to runtime verification.

**Bounded draft boundary — confirmed A40:** Prepare only a separately authorized
`baseline-household-identity-member-removal` documentation
change: successful authorized ordinary-household DELETE for an existing member
when persistence succeeds (204/no content), and absence on a subsequent successful
family-list read. Use an unreferenced-member scenario; avoid an invented connected
UI. Retain FK effects, missing-ID/retry/provider errors and browser cleanup/recovery
as non-normative U25/U26 evidence under A12; reuse existing shared-access and
identity requirements without adding personal authorization or universal recovery.
User “yes” confirms this limited normative boundary and non-normative treatment
(A40); it does not authorize generation. Future authorized draft must carry BSL-015's
exact historical status sentence outside normative requirements. A41 subsequently
authorizes the bounded draft recorded in BSL-022; it is not accepted, promoted or
archived. Profile switching stays pending after removal.

### BSL-household-identity-022 — member-removal draft and scenario mapping

**Authority / identity:** User “draft” (A41), following A40's settled boundary.
CLI-scaffolded `baseline-household-identity-member-removal` using the configured
spec-driven schema and nearest repository root. No store selected or configured;
no root initialization. Branch/HEAD unchanged; all 35 BSL-020/021 evidence inputs
rehashed unchanged before drafting. Reuse those traces, actual assertions,
dependencies, negative paths and medium overall confidence without another scan.
Behavior is implementation-supported; no current removal runtime result.

**Artifacts / status:** [Proposal](../openspec/changes/baseline-household-identity-member-removal/proposal.md),
[delta](../openspec/changes/baseline-household-identity-member-removal/specs/household-identity/spec.md),
[design](../openspec/changes/baseline-household-identity-member-removal/design.md),
[tasks](../openspec/changes/baseline-household-identity-member-removal/tasks.md) and
CLI-created `.openspec.yaml`. All four planning artifacts exist; strict selected
change validation passed, exit 0. Design included because authorization metadata,
relational effects and separate browser cleanup create material baseline ambiguity;
it is extraction rationale, not a new implementation design. Two ADDED blocks,
two scenarios, no MODIFIED/REMOVED/RENAMED operations or new capability.
Requirement descriptions are 282 and 146 characters (installed limit 500).

| Draft requirement | Scenario | Evidence / limits |
| --- | --- | --- |
| Remove an existing household member through the API | Remove an unreferenced member | BSL-020: OpenAPI 204, controller awaits delete/service save then NoContent; filter does not wrap it. Controller test asserts 204, service test asserts absence; neither asserts response-body emptiness. Existing shared-access owner reused; DELETE auth not qualified by auth-disabled removal tests. |
| Exclude a removed member from subsequent family listing | List members after removal | BSL-020: fresh GetAll/GetAllFamilyMembers query and data envelope; controller test asserts ID absent after DELETE and GET, service test asserts absence. Both use InMemory; no relational/browser mutation qualification. |

**Normative review:** Positive cases are conditional on successful persistence and
subsequent successful read, with unreferenced-member scenarios. No connected UI,
referenced-member safety, FK cascades/nulling, missing-ID/retry/provider statuses,
member-specific permission or atomic/browser/cross-device cleanup guarantee added.
U25/U26 remain non-normative under A40 and existing identity/access owners remain
unchanged. Delta carries BSL-015's exact requested historical sentence outside
normative additions, plus the pending later-authorization-reference caveat. Earlier
creation limitations, BSL-018/019 and U23/U24 are preserved.

**Checks / disposition:** Selected strict OpenSpec validation and structural
2-requirement/2-scenario review passed; final six-path documentation/content checks
are reported in session response/current harness. Runtime API/browser/PostgreSQL
checks **not-run** under A34. Behavior TDD/application tests/client generation are
**not-applicable** to this documentation-only edit. No service/database/deletion
execution. Main remains unchanged 30/82; rename remains active. This is a validated
draft for human review, not acceptance, main promotion, archival or application
qualification. No successor slice extracted.

### BSL-household-identity-023 — member-removal draft acceptance-readiness review

**Authority / identity:** A42 review/evidence only, at the same branch and HEAD.
Read-only CLI discovery resolves the nearest repository root to
`/Users/alex/Code/whats-for-supper`, with no registered stores; configured schema
remains `spec-driven`. Both removal and rename remain active, each 4/4 extraction
tasks complete. CLI `complete` is artifact/task readiness, not human acceptance.
All 35 BSL-020/021 paths rehashed unchanged, reproducing
`dce614e9dbefd6afaa4285eccdc4a323dc5b27b36204bcc0a029baf853c3f035`.
Reuse that trace rather than rescan unaffected source. Only this plan is edited.

**Review findings:** No blocking normative issue found; recommend accepting the
exact A41 delta as a source-supported baseline, then separately authorizing its
promotion. No delta or other change-artifact revision is needed.

- Both additions match A40: successful authorized ordinary-household deletion,
  conditional on successful persistence, and absence on a later successful list.
  Both scenarios use an existing unreferenced member. No unconditional
  referenced-member safety or error/retry outcome is promised.
- Main's 30 requirements/82 scenarios were reviewed including scenarios. Existing
  listing concerns onboarding selection; create/rename later-list scenarios concern
  their own triggers. Removal adds a distinct trigger without duplicating them.
  Shared API authentication remains owned by the existing requirement; current
  identity resolution/recovery is neither amended nor expanded by this delta.
- Reinspected `FamilyController.Delete`/`GetAll`/`GetMe`,
  `FamilyService.DeleteFamilyMember`/`GetAllFamilyMembers`, OpenAPI DELETE,
  `SuccessWrappingFilter`, controller/service assertions and factory substitutions.
  Source supports remove/save before 204, an unwrapped NoContentResult, and a fresh
  remaining-members query wrapped in `data`. The controller deletion test asserts
  204 and later ID absence; it does not explicitly assert an empty body or the GET
  status. Service assertions establish list absence within the InMemory test path.
  Default factory auth is omitted; neither test qualifies DELETE authorization,
  real relational effects or browser/current-identity recovery. No tests were run.
- No-body and authorization wording have source/contract or shared-owner support,
  not direct runtime qualification. Existing BSL-022 mapping correctly distinguishes
  these from actual assertions. U25 metadata/errors/FK effects and U26 disconnected
  helper/partial cleanup remain non-normative; no deletion UI is invented.
- BSL-018/019, U23/U24 and creation history remain intact. The exact BSL-015
  sentence and pending later-authorization-reference caveat remain outside ADDED
  requirements. A34 deferral is retained and is not an extraction blocker under A10.

| Status dimension | Review result |
| --- | --- |
| Discovery | Reconciled with existing U25/U26 limits; no new consequential unknown |
| Artifact | Validated draft; proposal/delta/design/tasks/metadata unchanged |
| Review | Agent review complete; human acceptance pending, recommended ready |
| Main spec | Removal not promoted; existing main remains 30/82 |
| Lifecycle | Removal and promoted rename active; no archival |
| Runtime evidence | Not-run; implementation-supported, high simple-path / medium overall confidence retained |

**Check scope / handoff:** Run selected and all-item strict OpenSpec validation,
six-path artifact/content checks and plan-only
`task verify -- docs/openspec-baseline-plan.md` after this update. Exact final outcomes/content
identity belong to the response and `.task/agent-finish/last-run.json`; prior checks
are not attached to this edited plan. Runtime API/browser/PostgreSQL checks remain
**not-run** under A34/session scope; behavior TDD, application tests and generated
client checks are **not-applicable** to the documentation edit. No database access,
services or deletions. Preserve the index, unrelated edits/deletions, main and both
active changes. Stop for the focused human acceptance decision; promotion and
archival need separate authorization. Profile switching remains next after removal;
recipe-library visibility stays queued. No successor capability extracted.

### Member-removal main-spec promotion record — 2026-10-15

**Authority:** A43, user “promote” following BSL-023 review of the exact 2/2 delta.
Direct promotion authorization is recorded separately from the prior review; no
separate acceptance statement or archival authority is inferred. This promotes the
reviewed requirements only, without accepting runtime/application qualification.

**Applied content:** Appended both ADDED requirement blocks and their scenarios
verbatim from the CLI-resolved removal delta into
[main household identity](../openspec/specs/household-identity/spec.md):

- Remove an existing household member through the API — Remove an unreferenced member.
- Exclude a removed member from subsequent family listing — List members after removal.

Main now contains **32 requirements/84 scenarios**. All prior main bytes, title,
Purpose and 30/82 blocks are preserved; no delta-operation header or historical
non-normative note was inserted into main. Main SHA-256 after promotion:
`493ca04ba4bdb07fe8b139dad9752d18f5c19255a69668a017dfd4fe671f5160`. Delta and its exact BSL-015 sentence/caveat remain unchanged.
BSL-020–023 mappings and U25/U26 limits still apply. All 35 evidence inputs matched
the recorded manifest before promotion; only the main-spec input changes now.
Application inputs and rename artifacts remain unchanged, with BSL-018/019,
U23/U24 and historical creation limitations retained.

**Status / checks:** Main-spec sync is promoted under A43; removal and rename stay
active. Four extraction tasks remain complete; follow-up status records promotion.
Run main-spec and all-item strict validation, exact append/count/preservation checks
and three-path documentation verification after final edits. Exact final outcomes
and content identity belong to the response/current harness. Runtime API/browser/
PostgreSQL checks remain **not-run** under A34; behavior TDD/application/client
checks are **not-applicable** to these documentation edits. No deletions, services,
database requests, application work or archival. Next bounded action is separately
authorized Profile-switching discovery; no successor extracted here.

## Reviewed slice — household identity / connected Profile switching

### BSL-household-identity-024 — Profile menu, selection and Home handoff

**Authority / source identity:** A44, discovery/review and this plan only, at
`moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus the existing
dirty worktree. CLI resolves nearest repository-local root
`/Users/alex/Code/whats-for-supper`, no registered stores, two active promoted
changes (rename/removal), one main spec at 32 requirements/84 scenarios. No init,
configuration or lifecycle action. BSL-001/004/005 supply shared read/gate/recovery
evidence; BSL-017 supplies the coverage-audit starting point. Recomputed BSL-014's
20-file source/test manifest matches
`acb0538483ee38b5bcc13443c935cffbc1cdf8fd90db564c2ab4e6a3ea6f1e33` unchanged;
creation, rename and removal history/limitations are retained, not requalified.

| Field | Selected scope / result |
| --- | --- |
| Domain / purpose | Household identity; choose the browser's current household actor from Profile. Purpose is consistent with the approved owner, not personal authentication. |
| Entry / selection surface | `/profile` active-member toggle opens an inline dropdown on Profile. Opening it does not navigate to onboarding or change identity. |
| Connected outcome | Choosing a loaded member requests selection, marks onboarding complete and requests `/home`; completed cookie/store action makes that ID available to subsequent requests and existing selected-name display. Home arrival with the new identity is not runtime-qualified. |
| Dependencies | Loaded family list, useFamily/Zustand, Next cookie server action and readable-cookie fallback, persisted onboarding completion, router, existing access/recovery owners. No member mutation API or background workflow is invoked by selection. |
| Exclusions | New validation/locking/error UX, preference policy, demo/preview/deployment variants, atomic handoff/rollback, post-selection cancellation, fresh server validation or cross-tab/device synchronization guarantees. |
| Status | Discovery reconciled with U27/U28; no draft, acceptance, promotion or archival. Implementation-supported, medium overall confidence; no current runtime evidence. |

**Ordered source trace / observable behavior:**

1. `pwa/src/app/(app)/profile/page.tsx`, `ProfilePage`, calls `loadFamily` only
   when `!hasLoaded`, and renders `ProfileDropdown`. Its Settings control goes to
   `/profile/settings`; it is not the switching entry. Existing app navigation can
   reach Profile; the connected switching surface stays on that route.
2. [ProfileDropdown](../pwa/src/components/profile/ProfileDropdown.tsx) reads
   `familyMembers`, `selectedMember` and `isLoading` through
   [useFamily](../pwa/src/hooks/useFamily.ts). During loading it renders a pulse
   placeholder in place of the toggle. Otherwise `profile-dropdown-toggle`
   toggles local `isOpen`; accessible labels are Open/Close member menu. The
   menu offers each loaded member by name, marking the matching current ID
   case-insensitively with a check and “Current family member” text. The current
   member is still selectable; there is no different-ID guard.
3. Toggle-close or a document `mousedown` outside the dropdown closes it without
   invoking `onSelect`, cookies, onboarding completion or navigation. No dedicated
   Cancel or Escape handler is implemented. This is unsubmitted-menu dismissal,
   not cancellation of a started selection. Option activation calls `onSelect(id)`
   then closes the menu synchronously.
4. Profile's `handleFamilyMemberSelected` calls `selectFamilyMember(id)` without
   awaiting it, calls `completeOnboarding()`, then `router.push(ROUTES.HOME)`.
   This differs from `pwa/src/app/(auth)/onboarding/page.tsx`, whose handler first
   awaits an initial cookie write and later uses `router.replace(HOME)`.
   Profile does not route through that page or perform its initial awaited write.
5. [familyStore](../pwa/src/store/familyStore.ts), `selectFamilyMember`, awaits
   [setFamilyMemberCookie](../pwa/src/lib/auth.ts), invokes
   [setFamilyMemberIdCookie](../pwa/src/lib/identity/cookie.ts), then sets
   `selectedFamilyMemberId`. The server action writes the ID to the HttpOnly
   `x-family-member-id` cookie (one year, Lax, root path, optional configured
   domain; Secure under production/non-test/non-localhost-domain conditions).
   The fallback attempts `document.cookie` with its own HTTPS/domain flags;
   source invocation is not proof it overwrites an HttpOnly cookie. Neither action
   checks membership against the API. Selection changes browser context without
   creating, renaming or deleting a member.
6. [onboardingStore](../pwa/src/store/onboardingStore.ts), `completeOnboarding`,
   sets/persists the completion flag in `onboarding-storage`; it does not wait for
   Home. [api-client](../pwa/src/lib/api/api-client.ts), `HearthAuthProvider`, reads
   the selected store ID (then readable-cookie fallback) for subsequent
   `X-Family-Member-Id` headers. No `/me` request is inherent to selection.
7. Profile's `selectedMember` is a case-insensitive match against the loaded list.
   After a completed store change, existing Profile name display can show the new
   member when Profile is rendered. When a loaded selected member exists,
   `continue-as-btn` displays “Continue as {name}” and only pushes Home: it does
   not select again, write identity cookies or mark onboarding complete.

**Reads / agreement / reuse:** `familyStore.loadFamilyMembers` →
[family adapter](../pwa/src/lib/api/family.ts), `getFamilyMembers` → generated
`pwa/src/lib/api/generated/api/family/index.ts` GET → OpenAPI GET `/api/family`
200 `data` array → `FamilyController.GetAll` →
`FamilyService.GetAllFamilyMembers` ordered EF read. Adapter maps ID/name plus
preferences into local members; GET response shape agrees with these consumers.
Profile can reuse an already loaded list; opening/selecting does not force a new
read. `hasLoaded` also becomes true after failure. No claim of fresh membership
or eligibility validation at switching time is supported.

Subsequent access/context checks remain owned by [proxy](../pwa/src/proxy.ts),
and [IdentityValidator](../pwa/src/components/identity/IdentityValidator.tsx)
mounted in `pwa/src/app/layout.tsx`: access is checked before nonempty member-cookie
presence; client recovery may use readable cookie or `loadCurrentIdentity` →
generated `/me` → `FamilyController.GetMe`. The existing `/me` unknown-ID 404
contract omission and collapsed null/error result remain BSL-001/005 limits.
Validator missing-member cleanup needs a nonempty loaded list and does not await
clearing. These are shared limitations (U13/U26), not new switching guarantees.
Configured cookie scope, HTTPS/test environment and API origin affect the handoff;
no deployed browser/environment was inspected.

| Main requirement owner | Coverage decision |
| --- | --- |
| List existing household members for selection; Select an existing member from onboarding | Already owns onboarding list/loading/error/selection, not the Profile menu trigger or Profile's unawaited Home push. Reuse API listing evidence without copying onboarding scenarios. |
| Display the selected member on Profile | Already owns the resulting loaded name and case-insensitive match; reference it rather than adding a second selected-name requirement. |
| Resolve the current member through the API; Recover identity when the protected client has no selection | Already owns `/me` and conditional recovery; selection itself is not a fresh `/me` validation. |
| Gate protected page entry with household access; Apply member context after household access | Already owns subsequent navigation gates; menu opening neither renews access nor validates membership. |
| Creation, rename, invite and API removal additions | Separate existing triggers and lifecycle boundaries; no additions or re-extraction in this session. |
| Genuinely missing Profile behavior | Menu open/list/current marker and unsubmitted dismissal; Profile-specific selection/completion/Home request; Continue-as navigation without a new selection. Only candidates for a separately authorized bounded draft. |

**Pending / failure / recovery:** List-loading placeholder is supported. Profile
does not render the store error or an explicit empty-menu message; a failed initial
load can leave an empty menu, while a prior list may remain. No automatic retry
control is provided by this surface. Unlike onboarding it shows no list-error
alert. Selection sets no busy flag, disables no choices and catches no rejected
cookie action. Home is requested and completion is marked while the action can
still be pending; rejection can leave the prior store identity, with partial cookie
effects possible. No rollback, success confirmation, selection-error feedback,
exactly-once operation or universal retry/cancellation guarantee. Existing
gate/recovery behavior may run, subject to its prior limits; it does not establish
new-identity Home arrival. U27/U28 record these exclusions without repairs.

**Actual assertions / substitutions:**

- `pwa/src/app/(app)/profile/page.test.tsx` asserts only dropdown/language stub
  rendering. Hook, router, onboarding action and dropdown are mocked; it never
  activates the real menu, option, Continue-as or cookie/store action.
- [profile browser tests](../pwa/e2e/profile.spec.ts) preseed Alex's HttpOnly
  member cookie, use common API mocks, and assert the translated “Table's Set!”
  heading, visible Continue-as Alex and URL `/home` after Continue-as. They do not
  assert a changed identity or menu opening/selection/dismissal/pending/failure.
- [identity-persistence tests](../pwa/e2e/identity-persistence.spec.ts) preseed
  identity and legacy `family-storage`, assert Alex across navigation/Settings and
  after a browser-intercepted family 500. Current family store is not persisted
  there. These do not exercise switching or prove server-fetch failure handling.
- [onboarding tests](../pwa/e2e/onboarding.spec.ts) click a listed member without
  asserting the selection's destination/cookies. Their comment refers Home
  coverage to [auth-flow tests](../pwa/e2e/auth-flow.spec.ts), whose Home assertion
  actually exercises an invite, not onboarding or Profile selection.
- [fixtures](../pwa/e2e/fixtures.ts) inject shared access/fixed time and block
  unhandled browser API calls; [common mocks](../pwa/e2e/mock-api.ts) return loaded
  members and synthetic successful `/me` (cookie ID, default Alex without one),
  without checking real membership. [Playwright config](../pwa/playwright.config.ts)
  blocks service workers. Existing BSL-001 API tests assert list/envelope with
  substituted auth/InMemory EF, not this browser handoff. No focused real-dropdown
  or family-store selection test was found in the bounded filename/assertion search.

**Evidence identity / checks:** The 31 inspected source/spec/test inputs are the
paths in the ordered trace and assertion list, plus routes, English translations,
root layout, proxy, generated family/me builders and main identity spec. SHA-256
of sorted `path + space + file SHA-256 + newline` entries:
`e94ecae6411c2c30fb4639534b1e0a716c56a5061cbe3dd587b8aa9b1945d76a`.
This identifies inspected content, not runtime-tested content. CLI discovery and
20-file reused-input comparison passed. Final selected/all strict OpenSpec and
plan-only documentation/content preservation outcomes belong to the final response
and current harness record. Runtime/browser/API/database checks **not-run** under
A34/session scope; application/client generation and behavior TDD **not-applicable**
to this documentation edit. No service launch, mutation execution or DB request.

**Discovery recommendation — boundary subsequently confirmed by A45:** Confirm that the next separately authorized draft
covers only the missing Profile menu/dismissal, conditional selection/Home-request
handoff and Continue-as behavior, reusing existing list, selected-name, access and
recovery owners; keep U27/U28 non-normative under A12. Do not promise atomic
completion, fresh validation, post-selection cancellation or synchronization.
Drafting, acceptance, promotion and archival require separate authorization. Any
future authorized draft must carry BSL-015's exact sentence and historical caveat;
no draft is generated now. Household identity is not baseline-complete while this
slice remains undrafted; recipe-library visibility remains queued.

### BSL-household-identity-025 — Profile-switching draft and scenario mapping

**Authority / boundary:** A45, user “confirm boundary, proceed to draft”,
2026-10-15, confirms BSL-024's menu/dismissal, conditional selection/Home request
and Continue-as boundary with U27/U28 non-normative. Authorizes this bounded
CLI-scaffolded documentation change and plan only. No application behavior,
acceptance, promotion, archival or successor extraction is authorized.

**Evidence / identity:** All 31 BSL-024 source/spec/test inputs rechecked unchanged
at the same branch/HEAD and manifest
`e94ecae6411c2c30fb4639534b1e0a716c56a5061cbe3dd587b8aa9b1945d76a`.
Reuse the connected trace, actual assertions/substitutions and medium confidence;
no runtime observation added. Source allows mouse-outside dismissal through
`mousedown`; do not generalize it into touch, Escape or post-selection cancellation.

| ADDED requirement | Scenarios / source evidence | Assertion and qualification limits |
| --- | --- | --- |
| Offer the loaded household members in the Profile menu | Three: open choices, current-member marker including case-insensitive matching, loading placeholder. BSL-024 ProfileDropdown toggle/map/isLoading and useFamily selected-member match. | Profile unit replaces dropdown; browser tests do not open the menu or assert loading/marker. Implementation-supported only. Existing selected-name owner reused. |
| Dismiss the Profile member menu before selection | Two: toggle-close and outside mouse press. BSL-024 isOpen toggle and document mousedown close without onSelect. | No inspected assertion for dismissal. Scope explicitly precedes selection; no Escape, touch or request cancellation claim. |
| Request member selection and Home from Profile | Two: different loaded member and current member again, with successful cookie actions for identity outcome. BSL-024 real option callback, unawaited selectFamilyMember, completion/Home push, awaited cookie/fallback/store action. | No direct Profile-switch assertion. Home request and identity outcome are distinct; U27 retains pending/failure/atomicity limits. Existing access/resolution/recovery/display owners reused. |
| Continue from Profile with the loaded selected member | One: Continue-as requests Home without new selection, cookie writes or completion change. BSL-024 conditional Continue-as button and navigation-only handler. | profile.spec.ts asserts visible Alex control and Home URL with preseeded HttpOnly identity/common API mocks. No current execution, backend qualification or fresh validation implied. |

**Artifacts / status:**
[proposal](../openspec/changes/baseline-household-identity-profile-switching/proposal.md),
[delta](../openspec/changes/baseline-household-identity-profile-switching/specs/household-identity/spec.md),
[design](../openspec/changes/baseline-household-identity-profile-switching/design.md)
and [tasks](../openspec/changes/baseline-household-identity-profile-switching/tasks.md)
exist with CLI metadata. Four ADDED requirements/eight scenarios; no existing
requirement is modified. Extraction design is included for the material
cookie/store/navigation ambiguity, not a behavior repair. Delta retains BSL-015's
exact requested sentence and later-authorization-reference caveat non-normatively.
BSL-018–023/U23–26, creation history and the deleted navigation spec remain intact.

| Status dimension | Result |
| --- | --- |
| Discovery | Reconciled; U27/U28 extraction treatment confirmed A45, underlying gaps remain |
| Artifact | Validated bounded draft; all four planning artifacts present |
| Human review | Pending; no acceptance inferred from boundary approval |
| Main spec | Unchanged 32 requirements/84 scenarios; switching not promoted |
| Lifecycle | Switching, rename and removal active; no archival |
| Runtime evidence | Not-run; source-supported under A10, qualification deferred A34 |

**Check handoff / stop:** Selected strict validation passed. Final all-item strict,
four/eight count/description/preservation checks and six-path documentation/content
outcomes are in the response/current harness record. Behavior TDD, application
checks and generated-client synchronization are not-applicable to these docs;
runtime browser/API/PostgreSQL checks not-run. No services, mutations or database
requests. Stop for human review of this exact draft; acceptance, promotion and
archival remain separately authorized. Recipe-library stays queued.

### Profile-switching main-spec promotion record — 2026-10-15

**Authority:** A46, user “promote it”, immediately after the validated A45 draft.
Direct promotion of the exact four additions/eight scenarios; no separate
acceptance statement, archival or runtime qualification inferred.

**Applied:** Appended only the delta's ADDED requirement blocks verbatim to main
household-identity, preserving all preceding bytes, Purpose and shared owners.
Main is now 36 requirements/92 scenarios. The delta and its non-normative evidence
note, including BSL-015's exact historical sentence/caveat, are unchanged.
BSL-024/025 source/assertion mappings and U27/U28 limits remain applicable.
All 31 evidence inputs matched their recorded digests before promotion; main
spec is the only evidence input changed by this sync. New main SHA-256:
`bbf4dc2eaf241f573307cba356b3b9cacce340b31d6249520af02b140b54479b`.

**Artifacts / checks:** Profile switching is promoted; its task follow-up and this
plan record the lifecycle step. Switching, rename and removal stay active, without
archival. Final main/all strict validation, exact append/count/preservation and
three-path documentation/content outcomes belong to the response/current harness.
Runtime/browser/API/database checks remain not-run under A34; application/TDD and
client-generation checks are not-applicable to this documentation-only promotion.
Unrelated edits, index and deletions, including background-task-navigation, remain
preserved. No behavior, test, contract, generated client or SQL changes.

**Next boundary:** BSL-017's outstanding rename, API removal and Profile switching
requirements have now been promoted. This does not qualify runtime or deferred
variants/preferences. Recommend separately selected ordinary-household
recipe-library list-visibility discovery; no successor capability extracted here.

## Promoted slice — recipe-library ordinary-household list visibility

A34 changes the work sequence: continue brownfield requirements discovery while
implementation and real-database qualification wait for a later explicitly selected
session. A10's accepted source-evidence standard applies; a database instance is
not required to inspect implementation/test assertions or produce an authorized
requirements draft with runtime limits clearly recorded.

A35 originally queued this after the remaining identity slices. A46 promoted the
last identified identity slice; A47 selected discovery only. A48 confirms its
bounded drafting recommendation and authorized the draft. A49 separately promotes
only that reviewed delta; the change remains active.

A47 discovery scope (now drafted under A48): ordinary-household recipe-library list visibility,
covering ready/non-deleted eligibility and the connected list's observable outcome.
Start at the actual connected caller and `RecipeService.GetRecipesList`, follow
its approved contract/client and persistence query, and inspect the assertions and
substitutions in the relevant tests. Keep search ranking, capture processing,
recipe editing, restore/purge and deployment variants outside this slice. These
were discovery targets under A47. The two evidence entries below preserve that
review; A48 and BSL-recipe-library-003 record the separately authorized draft.
No uninspected capability or placeholder spec is created.

Member-creation BSL-014–016/U19–U22 remain available as historical evidence and
unresolved limits. Deferral neither accepts checked implementation tasks nor
reopens/moves the archive. The user's report of earlier authorization is retained;
its original reference can be reconciled later without blocking this independent
slice. The required future-spec status sentence in BSL-015 is preserved as a dated
historical limitation, with any later status change explained alongside it.

### BSL-recipe-library-001 — connected library list, eligibility and returned items

**Authority / identity:** A47, discovery/review and plan edits only. Branch
`moving-to-openspec`, HEAD `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`.
Initial Git status includes staged API/SQL/contract/client/identity work, staged
and unstaged plan/main-identity edits, three untracked active identity changes,
and the staged deletion of background-task-navigation. Preserve all of them.
`api/database/schema.sql`, `specs/openapi.yaml` and `pwa/e2e/mock-api.ts` are dirty
inputs, not this session's edits or newly qualified implementation. Current files,
including those inputs, were inspected. Reuse BSL-001–005 identity evidence and
A04 ownership; no repeated access-policy extraction or lifecycle reconsideration.

**Name / purpose / actor:** Recipe library lets a person using the ordinary
household app browse reusable recipes. “List” here is the grid of named recipe
buttons in the Browse Library overlay, not Search results, a notifications queue,
or the discovery voting surface.

**Ordered connected trace:**

1. `pwa/src/components/home/HomeCommandCenter.tsx` renders
   `BrowseLibraryTrigger` from `HomeSections.tsx`: “Browse your library” links via
   `pwa/src/lib/constants/routes.ts` to `/browse-all-stack`. The Search page's
   empty-result “Browse Library” link reaches the same route. Its normal results
   instead use `searchRecipes`/POST search; no search policy is extracted here.
2. `pwa/src/app/(app)/browse-all-stack/page.tsx` (`BrowseAllStackPage`) offers
   “Show recipe cards” and “Show recipe list”. A loaded selected member's list
   preference can choose the initial list view; otherwise stack is the fallback.
   Member-preference resolution/persistence belongs to **member preferences**;
   record only the locally selected presentation and page size. No preference
   policy draft or mutation executed. `(app)/layout.tsx` recognizes this overlay
   and labels `/recipes` as Search, corroborating the surface distinction.
3. There is no intervening list hook or `getRecipes` adapter call here:
   `fetchLibraryData` calls the generated `apiClient` directly. First it awaits
   GET `/api/recipes/library-summary`, then GET `/api/recipes` with
   `order=explore`, `page=1`, `limit=12` in list mode (`20` in stack), and
   `discoverableOnly=false` initially. The All/Discovery control refetches page 1
   with the boolean flipped; view changes also refetch page 1. No ID/name/URL,
   member, rating, category or review filter is sent by this list journey.
4. `pwa/src/lib/api/api-client.ts` configures Kiota's FetchRequestAdapter and
   relative/configured base URL. Its provider adds selected-member ID (cookie
   fallback) and optional SSE/move headers. Existing **household-identity** main
   requirements “Gate protected page entry with household access”, “Apply member
   context after household access”, “Authenticate protected API requests
   independently” and identity resolution/recovery own access/context. List has
   no member binder, per-member eligibility query or `AddedBy` restriction. This
   is the configured household database's eligible collection, not a claim of
   tenant isolation or personal recipe ownership. Existing U13–U15 still apply.
5. `pwa/src/lib/api/generated/api/recipes/index.ts` GET request metadata targets
   `/api/recipes` and deserializes `RecipeListResponse`; `specs/openapi.yaml`
   GET operation documents ready/non-soft-deleted records, explore order,
   optional discoverable filtering, page/limit and unwrapped 200 response.
   `generated/models/index.ts` maps `recipes`, `pagination` and `updatedAt` to
   DTOs. Generated error metadata maps 400; no blanket recovery guarantee follows.
6. `api/src/RecipeApi/Controllers/RecipeController.cs` `List` passes arguments to
   `RecipeService.GetRecipesList`, returning `Ok` with `SkipWrapping`. The query
   in `api/src/RecipeApi/Services/RecipeService.cs` requires
   **`DeletedAt == null && IsReady`**. `RecipeDbContext` also has a non-deleted
   global Recipe query filter. `discoverableOnly == true` adds `IsDiscoverable`;
   false does not mean only non-discoverable. No image/name/synthesis check is
   recalculated here. These are stored facts; readiness production is outside
   capture-processing scope, and no installed database state is qualified.
7. Persistence is EF `db.Recipes`, mapped by `Models/Recipe.cs` and
   `Data/RecipeDbContext.cs` to `recipes` (`is_ready`, `deleted_at`,
   `is_discoverable`, `last_cooked_date`, `created_at`). `api/database/schema.sql`
   declares readiness false/non-null and nullable deletion time. `AddedBy` is
   nullable attribution, not a list filter. No persistence write occurs on GET.
8. Count is taken after eligibility/filtering; page is at least 1 and limit is
   clamped to 1–100. Connected lowercase explore orders never-cooked first,
   then oldest `LastCookedDate`, then descending `CreatedAt`. Skip/Take returns
   one offset page. Equal sort keys have no final ID tie-breaker. Default newest
   order and exact duplicate-check filters exist but are not connected requests
   from this list and are not additional extraction slices.
9. `MapToDto` returns persisted ID/name/time/flags and derived hero URL plus
   other DTO facts. `Dto/RecipeListResponseDto.cs` returns `updatedAt`, `recipes`
   and `pagination` (page/limit/filtered total); `updatedAt` is response-time UTC,
   not a freshness/synchronization token. The page casts returned records to
   `RecipeDto[]`, calls `browseStackStore.setRecipes`, and renders every loaded
   record via `recipes.map` in `browse-list-grid`: named button, hero URL and
   formatted time. No client readiness/deletion refilter or `mapToRecipe` adapter
   runs here. A card requests the detail sheet; detail behavior is outside scope.
   `libraryStore.ts` is a notification queue, not this list's record store.

**Agreement / discrepancies:** Server predicate and the contract's ready/non-deleted
headline agree. Contract/generated prose additionally describes name plus images
or synthesis; this method trusts `IsReady` and does not enforce that derivation.
Do not draft the descriptive formula as a list invariant (U29). Summary schema
prose describes non-deleted totals without readiness, while `GetLibrarySummary`
also requires `IsReady`. Record this adjacent dependency mismatch; no repair.
The controller accepts explore case-insensitively but service branching is exact
lowercase; the connected generated request sends lowercase. Uppercase equivalence
is excluded, not accepted as another ordering promise. `MapToDto` does not populate
`ImportIssue` in this list path, although the page supports a badge and a unit mock
supplies one. No badge-enrichment requirement is supported by that mock (U29).

**Shared ownership / main comparison:** CLI main inventory contains only
household-identity (36 requirements/92 scenarios); no library main requirement
exists to duplicate. A04 gives library ownership of readiness/deletion/provenance
and persisted facts, identity ownership of access/member context, and member
preferences ownership of browse preference. This slice consumes those boundaries;
it does not extract provenance derivation, preference rules, capture processing,
search ranking, editing, restore/purge or demo/preview/deployment behavior.

**Disposition / confidence:** Candidate source-supported baseline, medium overall.
High confidence in the static predicate and connected lowercase request/render
path, reduced by substituted tests and U29–U31. No runtime-verified claim.
No requirement/scenario mapping yet: no draft authorized or generated.

### BSL-recipe-library-002 — paging, pending, empty and failure/recovery limits

**Connected outcomes:** Initial load and All/Discovery or view-mode reload show
“Loading your library…” with a spinner, suppressing list cards while pending.
A successful first response replaces the store and resets current index. In All
mode a successful empty returned array (not `total == 0`) shows `EndCard isEmpty`
with “Your Library is Empty” and “Add New Recipe” linking to `/capture`. This
names the eligible visible collection, not proof that the DB contains no pending
or deleted recipes. The similarly named `BrowseAllEmptyState.tsx` is not used
by this page. Discovery-mode empty results do not meet `isEmpty` and have no
explicit empty-result message in this render path (U30).

For All mode, `effectiveTotal` prefers the separately obtained summary total;
Discovery uses the list's pagination total. Summary is awaited before first-page
fetch and is not fetched on append. `hasMorePages` uses `page * pageSize < total`.
List scroll within 600px of the bottom, IntersectionObserver with the list root
and 600px margin, or the connected custom load-more event can request the next
page. Pending/in-flight/no-more guards apply. Successful append preserves prior
records, adding only previously unseen nonempty IDs in response order via
`browseStackStore.appendRecipes`. Initial replacement does not deduplicate.
Unmount resets this transient store. This is observed implementation structure,
not proof all pages are reachable, totals are fresh or concurrent updates cannot
skip/duplicate records. Summary/count/page reads are separate with no common
snapshot. Same page/filter/view requests share the relevance key; there is no
unique request generation, and catch/finally do not check relevance (U31).

If summary or initial recipe fetching throws, the page shows “Failed to load
recipes.” and Retry. Retry invokes page 1 for the current All/Discovery mode,
including summary again; while pending loading is shown, and a successful result
replaces the list. A summary failure prevents the list request. This local retry
control is source-supported; no promise of successful authentication recovery,
automatic retry or service availability. Append failure leaves loaded cards and
page/total state, sets `prefetchFailed` and ends the spinner; that flag is not
rendered or used to block paging. Another qualifying trigger may request the same
next page, but there is no visible list append-error/Retry control (U30). No new
synchronization, persistence, cross-tab/device or universal recovery claim.

**Actual assertions / substitutions inspected (not executed):**

| Test input | Assertions and limits |
| --- | --- |
| `api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs` | `GetRecipes_Excludes_NotReady_Recipes` directly seeds ready, unnamed pending-photo and named not-ready URL rows, then asserts ready ID present and both pending IDs absent. Explore exclusion test seeds active/deleted-ready rows and asserts inclusion/absence. Never-cooked/oldest-cooked tests assert seeded relative positions; they do not assert equal-key stability or every page. Paginated-list/default-order tests assert 200/envelope keys, not complete data or default ordering. Duplicate-filter tests are separate callers, not this UI's policy. |
| `api/src/RecipeApi.Tests/Integration/RecipeSoftDeleteIntegrationTests.cs` | `Delete_Removes_Recipe_From_Active_Library` seeds ready, issues DELETE, then asserts list 200 and UUID absent from response text; it does not assert DELETE status in that test. Inspected only; no deletion executed this session. |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | These test classes call default `CreateAsync`: TestServer, EF InMemory, InMemory recipe store and mocked orchestrator; auth omitted by default. Seeded eligibility is not real readiness processing, PostgreSQL query/schema qualification or household access verification. |
| `pwa/src/app/(app)/browse-all-stack/page.test.tsx` | Mocks generated API, router and motion; preloads family state. Mount asserts summary call and explore/page 1/20; loaded list preference asserts grid, no stack and limit 12. List append asserts five cards from overlapping mock pages. A 100-item test manually fires custom events and asserts first/last/length plus nine calls. Scroll test defines synthetic element dimensions and asserts page 2/3 requests, final ID and no-more flag. Fixtures omit `isReady`/`deletedAt`, return limit 20 even for list-12 requests, and include a non-GUID ID. These demonstrate consuming supplied records, not server eligibility or contract-valid integration. No focused initial loading/rejected-summary/rejected-list/retry/empty/append-failure assertion in this file. |
| `pwa/src/store/browseStackStore.test.ts` | Real store tests assert replacement/empty, append, duplicate-ID suppression and reset to initial state. Isolated store assertions do not prove pagination completeness or server policy. |
| `pwa/e2e/browse-all-stack.spec.ts`, `fixtures.ts` | Home trigger asserts overlay; list mode asserts restored grid, switch/re-entry grid and 12 then 13 cards after scroll. Setup supplies access/member cookies and localStorage family state, intercepts family/preferences/summary/list; list route slices fixed arrays and does not itself enforce readiness/deletion or discoverable filtering. Empty tests assert empty marker, capture navigation and no end marker in default stack mode, not a live empty DB or list-mode failure. Fixed time/common mocks/unhandled API blocking; no backend persistence exercised. |
| `pwa/e2e/browse-stack.spec.ts` | Mocked Home entry/card/detail/exit and toggle text plus visible card; changing “All” to “Discovery” does not prove filtered membership. No search-ranking or editing assertion reused as library eligibility evidence. |

**Check/evidence status:** Read-only store/root/change/spec discovery passed:
no stores; nearest root `/Users/alex/Code/whats-for-supper`, three active promoted
identity changes, only household-identity main. Source/assertion review is
implementation-supported under A10. API/browser/PostgreSQL/runtime checks are
**not-run** under A34 and explicit session scope, not newly blocked. Behavior TDD,
application verification/client regeneration and lifecycle actions are
**not-applicable** to this plan-only edit. Final strict/documentation/content and
index/preservation outcomes are recorded in the session response/current harness.

**Discovery recommendation — confirmed and drafted under A48:** Confirm a future bounded
recipe-library draft covering the connected entry/list control, ready/non-deleted
server visibility, All/Discovery list filtering, connected explore order and page
shape, display/append of successfully returned items, loading, All-mode empty
feedback and initial-load Retry. Reference household-identity's existing access
requirements and member-preference ownership; keep U29–U31 non-normative under
A12. Withhold readiness derivation, badge enrichment, fresh/complete/stable paging,
Discovery-empty feedback, append-error controls and universal recovery promises.
Drafting, acceptance, promotion and archival remain separately authorized actions.
Any future authorized spec must retain BSL-015's exact historical sentence with
its dated caveat; A34 qualification deferral is not an A10 extraction blocker.

**Inspected content identity:** 33 inputs listed below; SHA-256 of sorted
`path + space + file SHA-256 + newline` entries:
`97085b7ddecce1a829f44c66319fc08802a1c0c9cdb8e732a5c8c76f28456cff`. This is source review identity,
not tested runtime identity. Per-file digests support the next bounded recheck.

| Input | SHA-256 |
| --- | --- |
| `api/database/schema.sql` | `3f7767cd704299374ebdcd89a11709680013ba26a477ad23f41da54e6da55161` |
| `api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs` | `903493f2d741b315edf8ca44a83c5083500f70c9d30117c89db979ca805ff385` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `api/src/RecipeApi.Tests/Integration/RecipeSoftDeleteIntegrationTests.cs` | `8e1ff689f91286891f542b75ca0ba789e88764c984b0cef583e9d32628fb7513` |
| `api/src/RecipeApi/Controllers/RecipeController.cs` | `d1699c2de6f6cca9d879e67c0c7b9c7f0af4b2c4e104bc9ff04634b266eb5a70` |
| `api/src/RecipeApi/Data/RecipeDbContext.cs` | `92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447` |
| `api/src/RecipeApi/Dto/PaginationDto.cs` | `6097e087868a86326ecc81e38b73ccf176ff711dfd6ba0606ec3fb0009a718b2` |
| `api/src/RecipeApi/Dto/RecipeDto.cs` | `45f2c035b157b448dfa6d4ba399262492585b795fa60704e147a758c76d9eb1d` |
| `api/src/RecipeApi/Dto/RecipeListResponseDto.cs` | `12133f1a77a9a77d5387da2cc7f932d89b7aa157db7295f8a7379c59cff38ab1` |
| `api/src/RecipeApi/Models/Recipe.cs` | `810b9ddb9bdcacdb894d713680952f5a32c89256070366dff99b3c16f82bbe82` |
| `api/src/RecipeApi/Services/RecipeService.cs` | `9eec9ab5cd7102081b3765b08a41b8de4d45325858d18ab4573a326afa256b74` |
| `openspec/specs/household-identity/spec.md` | `bbf4dc2eaf241f573307cba356b3b9cacce340b31d6249520af02b140b54479b` |
| `pwa/e2e/browse-all-stack.spec.ts` | `d2e018bbd27f2324dfed9f9e4e654e5deaf06f266f56dbcb64a5a4a883bab90a` |
| `pwa/e2e/browse-stack.spec.ts` | `981326df9fd24dc06b1a4640d005c32564b34de1932b2d40a80ba0ffb6e7aca6` |
| `pwa/e2e/fixtures.ts` | `402b5a1b872f625dc1425f46afdede2c9378dcc473088159774a8455b5d188e2` |
| `pwa/e2e/mock-api.ts` | `063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07` |
| `pwa/src/app/(app)/browse-all-stack/page.test.tsx` | `145ba87c200a3392d01368b0c8f6c45e2745f38b7ff120805cbf9e0b17f4abeb` |
| `pwa/src/app/(app)/browse-all-stack/page.tsx` | `2beaa3dd23a1817db55c037a27fbe92f881444d4285726af1b034a15d8ece947` |
| `pwa/src/app/(app)/layout.tsx` | `4daa1c42696fc0ed77b1e458199844dac241ee87116e2e14f218057dc59bb5e9` |
| `pwa/src/app/(app)/recipes/page.tsx` | `18b9605e8078e8ee46674a0e781836886697ce18e9166c0591aeac6c8fe78bb4` |
| `pwa/src/components/home/HomeCommandCenter.tsx` | `73a338ce995647406f9b7f01c8a3800ab9a6f8c8fc0e00b3fb3ecb7ad8627217` |
| `pwa/src/components/home/HomeSections.tsx` | `f0ea6f4849e5a8387cd498dae984058f30475943a99b617894403cc17a2dab79` |
| `pwa/src/components/recipes/BrowseAllEmptyState.tsx` | `122f58ee27d8708d7af956c65ea42a1a3f267315ac485cf9591441db8aaa29ec` |
| `pwa/src/components/recipes/EndCard.tsx` | `9d080f0f781a3ce5941d4c820f05748630cd05865d6e91e490fd5429860eb9e2` |
| `pwa/src/lib/api/api-client.ts` | `c5cd4cfebddd8d5c1f2827c522a236fe12c504130ea0991c07bc8fc46376aa95` |
| `pwa/src/lib/api/generated/api/recipes/index.ts` | `71e1444413322c5b58634b06ff4979b69305c061a3ec64c46e2a38480c4ea29c` |
| `pwa/src/lib/api/generated/models/index.ts` | `03e19537845755d2cd0d30071284bc8a11007237e380433184d3edbe1ddb05e6` |
| `pwa/src/lib/api/recipes.ts` | `f4e70b39a2060bfc5b25010914f78e288321517db5c52c543d103502718dce7a` |
| `pwa/src/lib/constants/routes.ts` | `790d2da3e039578fd7d291dead52213bfd2282b17517f973029bafac37f34d70` |
| `pwa/src/store/browseStackStore.test.ts` | `17d117441f93ff3f514acf6759d590abb14bbe25b9cc1d0ca77ab6eab6944d52` |
| `pwa/src/store/browseStackStore.ts` | `be7161fbf1069abf6e634697e95dd907880f4584d83e4dac45c94018e835aa12` |
| `pwa/src/store/libraryStore.ts` | `21763b997c1ed09faf5b666ed4ea81f3c8f9f9a8ff366150db5fd8a6563df1b0` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |

### BSL-recipe-library-003 — authorized draft and scenario mapping

**Authority:** A48: user “confirmed, proceed to draft”, 2026-10-15, following the
A47 recommendation. Confirms the bounded library draft and U29–U31 non-normative
treatment; authorizes proposal/delta/design/extraction tasks and this plan only.
No acceptance, main-spec promotion, archival, application work or runtime checks.

**Reused evidence / identity:** Same branch/HEAD and dirty-input context as
BSL-recipe-library-001/002. Rechecked all 33 per-file SHA-256 values unchanged,
including dirty SQL/contract/common mocks and main identity. Reuse that connected
source/assertion trace without rescanning other capabilities. Local CLI context
and list resolve nearest repository root, with household-identity as the only main
spec (36 requirements/92 scenarios). CLI scaffold created
`baseline-recipe-library-list-visibility`; no init or reconfiguration.

**Artifacts / status:**

| Artifact | Status |
| --- | --- |
| [Proposal](../openspec/changes/baseline-recipe-library-list-visibility/proposal.md) | Draft; new recipe-library owner, current list slice only |
| [Delta](../openspec/changes/baseline-recipe-library-list-visibility/specs/recipe-library/spec.md) | Nine ADDED requirements/18 scenarios; explicit Purpose; strict selected validation passed; not accepted/promoted |
| [Design](../openspec/changes/baseline-recipe-library-list-visibility/design.md) | Extraction decisions for summary/query/DTO/paging/feedback boundaries; no implementation design change |
| [Tasks](../openspec/changes/baseline-recipe-library-list-visibility/tasks.md) | Extraction and documentation validation only; no application tasks; final checks in session response/harness |
| `.openspec.yaml` | CLI-generated spec-driven metadata, preserved |
| Main recipe-library | Absent; no promotion |
| Main household-identity / prior changes | Unchanged 36/92; rename/removal/switching remain promoted and active, no archival |

**Requirement/scenario mapping:** Each row names every scenario in its requirement.
Source assertions and current execution results remain separate.

| Added requirement / scenarios | Source evidence | Actual assertion coverage / limits |
| --- | --- | --- |
| Open the household library and offer list presentation — Open from Home; Select list presentation | BSL-001 HomeCommandCenter/BrowseLibraryTrigger/routes → page list control; existing household-identity requirements own gates/context | Browser Home-trigger overlay assertion; unit/browser list-control grid assertions with API/identity substitutions; request conditioned on switching presentation and summary success |
| Return only eligible household library recipes — Ready active recipes are eligible in All mode; Not-ready records are excluded; Deleted records are excluded; Discovery mode narrows eligible records | BSL-001 GetRecipesList stored IsReady/DeletedAt predicate, optional IsDiscoverable and lack of AddedBy restriction | API tests seed ready/pending/deleted and assert IDs; auth-free InMemory fixture. Attribution/discoverable/total consequences source-supported; toggle text/card mocks alone do not prove filtering |
| Return an explore-ordered library page — Explore ordering; Page response and count; Page bounds are normalized | BSL-001 query OrderBy/ThenBy, Count/Skip/Take, page/limit clamps, MapToDto/unwrapped DTO and generated deserializer | API relative never/old/recent cooked positions and envelope-key assertions; equal-key creation order, page-2 count/content and clamp behavior source-supported without focused inspected assertions; no snapshot/stability promise |
| Request list pages for the selected library filter — Load the All list; Change to Discovery | BSL-001 page summary-first fetch, lowercase Explore, page 1, list size 12, discoverable boolean and filter effect | Unit list-size/mount requests and browser view/filter assertions; intercepted route does not itself enforce discoverable eligibility |
| Display successfully returned library items — Display a returned page | BSL-001 generated DTO → setRecipes → grid buttons/name/hero/time → detail request | Unit grid/card counts and browser rendered list counts; detail assertions are for stack, not a full list-detail qualification. Source supports list button request only; no image-delivery or detail-content guarantee |
| Request and append additional library list pages — Scroll requests the next page; Append overlapping results | BSL-002 scroll threshold/pending guards/next-page call → appendRecipes nonempty-ID deduplication | Unit synthetic scroll/page requests, overlapping-page five-card assertion and store dedup; mocked browser 12→13 items. Fixed-page/manual-event 100-item assertion is not complete production pagination |
| Show pending library-load feedback — First-page load is pending | BSL-002 initial-loading set before summary/list and conditional loading renderer | Source-supported; no focused initial pending unit assertion inspected; not a runtime observation |
| Show an empty All-mode library result — No All-mode items are returned | BSL-002 empty-array/All predicate → EndCard empty variant and capture link | Browser empty marker/CTA/no-end-marker assertions with default stack mode and mocked empty data; list-mode branch is shared source support, no empty database proof |
| Offer retry after initial library-load failure — Initial load fails; Retry succeeds | BSL-002 catch/loadError → Retry → repeated summary/page 1 → pending/success rendering | Source-supported; no focused rejected-summary/list/retry assertion inspected. Excludes append failures and universal auth/service recovery |

**Confirmed exclusions:** U29–U31 stay outside normative requirements: readiness
formula, summary prose drift, uppercase-explore equivalence, mocked issue-badge
enrichment, Discovery-empty or append-error feedback, fresh/complete/stable paging,
stale-response immunity and synchronization. No new preference/access policy.
The delta carries BSL-015's exact required sentence as a dated non-normative
historical note with the user's reported later authorization/reference caveat.
No historical identity limitations or lifecycle decisions are reopened.

**Checks / handoff:** Selected strict validation passed. Final all-strict,
six-path documentation/content and preservation results belong to this session's
response/current harness record; checks do not establish runtime behavior or
human acceptance. Browser/API/live/PostgreSQL checks remain **not-run** under A34.
Behavior TDD/application tests/client generation are **not-applicable** to these
artifact edits. Stop for human draft review; no successor extraction.

### Recipe-library list-visibility main-spec promotion — 2026-10-15

**Authority:** A49 user “promote”, immediately after the validated A48 draft.
Direct authority to promote its nine additions/18 scenarios and update plan/task
status. No separate acceptance statement or implementation qualification inferred.
No archival, application/runtime/database work or successor extraction authorized.

**Applied:** Installed `openspec-sync-specs` workflow, using the current status
JSON's sole delta path and resolved `planningHome.root`. The root remains local
`/Users/alex/Code/whats-for-supper`. Current specs instructions were obtained before
writing. Created [main recipe-library](../openspec/specs/recipe-library/spec.md)
with the delta's exact Purpose and all nine complete requirement blocks/18
scenarios under `## Requirements`, without delta-operation headers or placeholders.
The delta, its evidence preamble and BSL-015 historical sentence/caveat are unchanged;
its “draft” status text records its original creation state, superseded here.

**Preserved:** All 33 evidence-input hashes unchanged before promotion, including
main household-identity (36/92). BSL-recipe-library-001–003 mapping and confirmed
U29–U31 exclusions remain authoritative. No shared identity/member-preference
policy duplicated or redefined. BSL-018–025/U23–U28 and all historical creation
limitations remain intact. The library change and three promoted identity changes
remain active; none archived. The index, unrelated edits/deletions and deleted
background-task-navigation spec remain preserved.

**Artifact status:** Main recipe-library now promoted at nine requirements/18
scenarios. Proposal/design/delta/metadata remain unchanged; extraction tasks remain
4/4 complete with a promotion follow-up only. No application implementation or
runtime-qualified status follows from these documentation checkmarks.

**Checks:** Main recipe-library strict validation passed; all-main-spec strict
validation passed 2/2. Final all-item strict and three-path documentation/content,
Purpose/requirement equality and preservation outcomes/content identity are in
this session's response/current harness. Browser/API/live/PostgreSQL checks remain
**not-run** under A34. Application tests/behavior TDD/client regeneration remain
**not-applicable**. No services, mutations or database requests.

**Next:** Separately select the next bounded requirements discovery; this promotion
does not authorize successor extraction, archival or deferred qualification.

## Promoted slice — recipe-library ordinary-household detail reading

| Field | Selected scope / result |
| --- | --- |
| Authority | A50, current user session: discover and draft only loaded library recipe → detail control → retrieve same recipe → returned persisted content → close; stop for review |
| Identity | `moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus existing dirty inputs; all staging, deletions and unrelated edits preserved |
| OpenSpec | CLI list/context resolved nearest root `/Users/alex/Code/whats-for-supper`, repo-local `openspec/`, schema spec-driven, no store pointer/default redirection; no init/reconfiguration |
| Existing owners | Main library nine requirements/18 scenarios; main identity 36/92; approved A04 library facts/eligibility, identity access/context and member-preference ownership reused |
| Draft | `baseline-recipe-library-detail-reading`, seven additions/13 scenarios; proposal, delta, extraction design/tasks; review only |
| Evidence | BSL-recipe-library-004–006; implementation-supported A10, medium confidence overall; runtime not-run A34 |
| Boundaries | No editing, ratings/notes submission, reporting/re-import, sharing, originals, hero generation, cooking mode, planning, search ranking, capture, restore/purge, preferences or deployment variants |

### BSL-recipe-library-004 — connected detail retrieval and returned facts

**Reused inputs:** All 33 per-file SHA-256 entries in BSL-recipe-library-002
were recomputed and match (0 changed). Reuse BSL-recipe-library-001–003 for
entry/list/shared access and U29–U31 without rescanning their unrelated paths.
Inspect newly relevant detail source and assertions below. Existing dirty
schema/OpenAPI/mock inputs are evidence, not newly qualified implementation.

**Ordered connected trace:**

1. `pwa/src/app/(app)/browse-all-stack/page.tsx` maps loaded list records into
   `browse-list-recipe-card` buttons whose onClick invokes
   `handleCardTap(recipe.id!)`. The stack front-card onTap reaches the same
   handler. It stores `detailRecipeId`; a truthy ID mounts `RecipeDetailSheet`
   with that ID and `plannerDayLabel=null`. Existing main library “Display
   successfully returned library items” owns button activation, not detail data.
2. `pwa/src/components/recipes/RecipeDetailSheet.tsx` initializes local recipe
   to null and loading true. Its recipeId effect calls `getRecipe(recipeId)`;
   no hook/store supplies list data as the detail response. Local `setRecipe`
   receives the mapped returned record. The read also calls `loadGoTo` for an
   adjacent family-setting control; it is not the recipe's content source and
   no preference/planning/GOTO capability is extracted. No mutation was executed.
3. `pwa/src/lib/api/recipes.ts` `getRecipe` calls
   `apiClient.api.recipes.byId(id).get()`, rejects absent `result.recipe`, and
   runs `mapToRecipe`. `api-client.ts` provides the configured/relative base and
   existing member/header context. Generated
   `pwa/src/lib/api/generated/api/recipes/item/index.ts` GET metadata selects
   `RecipeDetailResponse` with the ID URI template; generated models deserialize
   `recipe`, `updatedAt` and the nullable/optional RecipeDto properties.
4. `specs/openapi.yaml` GET `/api/recipes/{id}` has UUID path ID, inherited
   household security and only a documented 200 RecipeDetailResponse with
   required `recipe` and `updatedAt`. No detail readiness predicate is documented.
   Household-identity's “Gate protected page entry with household access”,
   “Apply member context after household access” and “Authenticate protected API
   requests independently”, plus existing resolution/recovery, remain owners.
   Detail has no member binder/attribution comparison; do not invent personal
   ownership or tenant isolation from the active-member header.
5. `api/src/RecipeApi/Controllers/RecipeController.cs` `Detail(Guid id)` has
   HttpGet `{id:guid}` and SkipWrapping, calls
   `RecipeService.GetRecipeDetail(id)` and returns Ok. That service calls
   `db.Recipes.FindAsync(id)` then reads the recipe import report with
   AsNoTracking/SingleOrDefaultAsync and maps it into ImportIssue. This adjacent
   report query is a dependency that can fail the whole read, not another
   extracted reporting capability. The GET contains no save call.
6. **Detail predicates:** no IsReady, IsDiscoverable or AddedBy restriction is
   present in GetRecipeDetail. `RecipeDbContext` has Recipe's global
   `DeletedAt == null` filter; ordinary untracked database lookup uses that filter.
   FindAsync can instead return an already tracked entity without a filtered
   lookup. `Program.cs` registers scoped RecipeDbContext with Npgsql; no database
   execution/tracking case was qualified here. A newly unavailable record throws
   KeyNotFoundException, and `Middleware/ErrorHandlingMiddleware.cs` maps it to
   JSON 404. List eligibility `DeletedAt == null && IsReady` is **not** copied
   into a detail requirement. Undocumented 404 and tracked-state caveat are U32;
   no universal deleted exclusion or not-ready rejection assertion is drafted.
7. `Models/Recipe.cs`, `Data/RecipeDbContext.cs` and existing
   `api/database/schema.sql` identify stored name/description/total_time,
   cuisine_type/meal_types, ingredients JSONB, raw_metadata JSONB, readiness and
   deletion time. `RecipeService.MapToDto` passes scalar/array facts;
   `DeserializeIngredients` returns string arrays, empty for null/whitespace,
   names/raw text for legacy objects, and raw-text fallbacks for malformed data.
   These strings are not proof of canonical quantities or complete ingredients.
   `ExtractRecipeInstructions` reads raw_metadata.recipeInstructions, returning
   null on absent/malformed metadata; it does not enforce the contract's array
   shape, so arbitrary stored shapes can diverge (U34). No SQL/data repair.
8. `Dto/RecipeDetailResponseDto.cs` returns response-time UTC UpdatedAt and a
   RecipeDto, unwrapped. `Dto/RecipeDto.cs` includes nullable stored text and
   ingredients/instructions. Hero `/api/recipes/{id}/hero` and numeric photo
   indices are derived references; sourceType derives from source URL/image count,
   canReimport derives from source presence, vegetarian defaults false. No asset
   read occurs in MapToDto. Those derived values are not persisted recipe content
   or evidence of image delivery. Adapter defaults absent strings to empty,
   ingredients to [], cuisine/mealTypes to null and unwraps instruction nodes.
   It discards updatedAt rather than using it as a freshness token.

**Ownership/main comparison:** None of the nine main library requirements covers
GET-by-ID response or detail presentation/loading/dismissal. Each of the seven
additions below fills only that gap; R1 consumes the already-owned activation.
No main requirement or Purpose is rewritten. Approved household identity and
member-preference policy are referenced, not duplicated. BSL-018–025/U23–U28,
member-creation history and U29–U31 remain unchanged.

### BSL-recipe-library-005 — visible detail, pending, failure and close assertions

**Actual presentation:** RecipeDetailSheet's read branch displays h2 recipe.name,
a paragraph only for truthy description, cuisine badge only for truthy cuisine,
and badges from `(recipe.mealTypes ?? []).filter(Boolean)`. `resolveMealTypes`
with category/Supper fallback populates editing drafts only; no read default.
READY IN uses `lib/duration.ts` formatRecipeTime: PT30M → 30 MINS; missing/zero or
unparsed duration gives empty time, not an invented duration. Hero img uses
`getImageUrl(recipe.imageUrl) || '/placeholder-recipe.jpg'` with recipe name alt;
`lib/imageUtils.ts` prefixes configured base for API paths. Nonempty failing URL
has no onError fallback; no successful delivery is inferred. Ingredients heading
always renders with one li per returned string in array order; missing list gives
no rows, not special empty copy. Nullable name maps to empty text; no guaranteed
nonblank/complete recipe or placeholder name. No servings, nutrition, separate
prep/cook time, category/vegetarian/created-at/attribution reading display is
supported by this sheet. Notes/rating widgets exist but submission is excluded.

**Instructions boundary:** recipeInstructions is returned/mapped but never rendered
in the sheet's read branch. STEPS sets showCooksMode and mounts CooksMode with
ID/name/image; this is the excluded cooking-mode boundary, not inline detail
instructions. No instructions-display requirement is drafted. U34 also retains
raw-metadata/array-shape and legacy ingredients completeness limitations.

**Pending/failure/recovery:** new sheet's `isLoading || !recipe` branch shows
Loading recipe...; Close header/backdrop remain outside that branch. Success
sets local recipe, then loading false. Catch logs only; finally clears loading,
but null recipe means a first-load missing/failed/malformed-envelope response
continues showing loading text. No detail-specific error UI or Retry. Closing
and reopening mounts a new sheet/effect and attempts another read; this is not
a universal successful recovery guarantee. A recipeId change on an existing
mounted component does not clear prior recipe; a failed replacement can show old
content after finally. The connected library normally unmounts on close, but no
general stale-response/freshness guarantee is extracted (U33).

**Close:** header `action-close-sheet` and backdrop button call onClose without
awaiting GET. Library `handleDetailSheetClose` clears the ID and unmounts the
sheet; it does not alter loaded recipes, view, index or filter. Effect cleanup
sets isActive false to ignore late state updates; it does not cancel HTTP.
No Escape handler, focus/scroll restoration or history navigation promise is
established. No new notes/rating/edit action is invoked in this read-only trace.

**Inspected assertion coverage (not executed):**

- `api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs`
  `GetRecipeDetail_Returns_Recipe`: POST fixture creation with test upload,
  assert Accepted, then GET and assert 200, top-level recipe and matching ID.
  No assertion on updatedAt, name/description/metadata/ingredients/instructions,
  not-ready eligibility, missing/deleted record or assets. Creation itself does
  not establish an explicit not-ready assertion for detail.
- `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs`:
  CreateAsync disables household auth; substitutes InMemory EF, storage,
  embeddings/chat and workflow orchestration (mock creates workflow rows).
  No real PostgreSQL, household auth or processing/image-delivery qualification.
- `api/src/RecipeApi.Tests/Services/RecipeServiceTests.cs`: ingredient-resilience
  cases seed/read **list** endpoint fixtures and assert empty/string ingredient
  representations (and update cases inspect saved ingredient JSON). Shared
  DeserializeIngredients evidence only; not a detail response/render assertion.
- `pwa/src/app/(app)/browse-all-stack/page.test.tsx` detail tests: stub
  RecipeDetailSheet with data-recipe-id and Close. Invoke captured **stack** onTap,
  assert stand-in mounts; advance to recipe 2, assert its ID, close and assert
  same stack card and recipesGet count 1. Does not exercise real detail GET,
  component/loading/content, backdrop or list-mode close.
- `pwa/src/components/recipes/RecipeDetailSheet.test.tsx`: mock entire recipes
  adapter; Italian/Supper/Lunch fixture, Pasta/Sauce and PT30M. “shows cuisine
  and meal-type badges cluster above description in view mode” actually asserts
  badge visibility only, not position, description or exact labels. “renders
  COOK entry points...” asserts STEPS control; no instruction text assertion.
  Localization stub returns fallback templates without interpolation; imageUtils
  returns supplied path; family/settings are mocked. No focused detail pending,
  load rejection, absent fields, ingredient-row order or Close assertions here.
- `pwa/src/lib/api/recipes.test.ts` sets up byIdGet mock but inspected tests
  import create/search/bundle helpers, not getRecipe. No getRecipe round-trip or
  default-normalization assertion; bundle instruction tests are outside scope.
- `pwa/e2e/browse-all-stack.spec.ts` detail tests use setupBrowseAllStack plus
  GET route returning fixed `{recipe: RECIPE_1}` (omits contract-required
  updatedAt). Assert sheet container appears, then Close removes it and stack
  card/depth remain. Container mounts before GET resolves, so visibility alone
  does not prove loaded detail. Uses stack mode, not list-mode read completeness.
- `pwa/e2e/recipes.spec.ts` “opens and closes ... without losing the search
  results” asserts shared sheet name Homemade Lasagna and READY IN 45 MINS,
  STEPS control and close/result visibility. Entry is Search, outside the selected
  library journey; shared presentation evidence only. Common
  `pwa/e2e/mock-api.ts` routes detail to fixed builders.recipe by requested ID,
  not persisted database state, and cannot prove record existence/deletion,
  freshness, synchronization, instruction completeness or asset delivery.
  Reuse BSL-recipe-library-002's already-inspected fixtures/mocks isolation limits.

All above are implementation-supported/source-inspected evidence under A10,
not newly passed runtime checks. Browser/API/PostgreSQL tests are **not-run**
under A34 and session scope; behavior TDD/application testing/client generation
are **not-applicable** to these documentation edits, not blocked.

### BSL-recipe-library-006 — authorized draft, mapping and artifact status

**Authority:** A50 is this session's pasted instruction explicitly authorizing
CLI scaffolding and bounded proposal/delta/extraction design/tasks/plan once the
source-supported boundary is established. A12 already withholds disputed claims;
no dependent normative assertion requires a new intent decision. U32–U34 record
limitations for review without repair. The draft is not accepted/promoted/archived.

| Added requirement | Scenario | Source support / actual assertion coverage |
| --- | --- | --- |
| Retrieve the selected library recipe for detail reading | Request detail by the activated recipe ID | BSL-004 steps 1–3: handleCardTap → ID prop/effect → getRecipe/byId GET; page unit asserts recipe-2 ID only through a stub, no real GET assertion |
| Return persisted recipe detail for an available record | Return the retrieved record | BSL-004 steps 4–8: OpenAPI/Detail/GetRecipeDetail/MapToDto/EF/DTO; controller test asserts 200/top-level recipe/matching ID only; other fields/updatedAt/real DB not asserted |
| Display returned recipe text and image reference | Show returned name and description | BSL-005 read branch + adapter defaults; Search browser asserts shared name only; no focused read-description assertion |
| Display returned recipe text and image reference | Omit absent description | BSL-005 truthy paragraph/empty default; source-only, no focused assertion |
| Display returned recipe text and image reference | Select the detail image reference | BSL-005 img/getImageUrl/fallback; source-only for reference selection, no delivery assertion |
| Display available recipe metadata in detail | Show cuisine and meal types | BSL-005 read badge branch; component test asserts Italian fixture's cuisine/Supper/Lunch badge visibility with mocked getRecipe |
| Display available recipe metadata in detail | Omit absent metadata badges | BSL-005 conditional cuisine/filter(Boolean)/no read fallback; source-only, no focused absence assertion |
| Display available recipe metadata in detail | Format available time | BSL-005 formatRecipeTime/read label; Search browser asserts shared 45 MINS fixture, not PT30M or absent value; those cases source-only |
| Display returned ingredient strings in detail | Read returned ingredients | BSL-004 DeserializeIngredients/mapToRecipe + BSL-005 array map; Pasta/Sauce are component fixture only, no read-row/order assertion |
| Display returned ingredient strings in detail | No ingredients are returned | BSL-005 heading/empty map; source-only for sheet; service list-null case asserts shared empty DTO representation only |
| Show pending recipe-detail feedback | Detail retrieval is pending | BSL-005 loading branch with Close outside; source-only, no focused pending assertion |
| Dismiss recipe detail back to the loaded library | Close loaded detail | BSL-005 header/backdrop/parent unmount; page unit stubs sheet and verifies retained stack ID/list-call count; library browser tests assert container removal/card/depth with mocked GET, not completion; backdrop/list view source-only |
| Dismiss recipe detail back to the loaded library | Close pending detail | BSL-005 unconditional Close/parent unmount/isActive cleanup; source-only, no focused pending-close assertion |

BSL-004/005 in this mapping abbreviate BSL-recipe-library-004/005. Every assertion
reference is inspected source, not a runtime pass or proof of persistence.

| Artifact | State |
| --- | --- |
| [Proposal](../openspec/changes/baseline-recipe-library-detail-reading/proposal.md) | Draft, existing recipe-library owner only |
| [Delta](../openspec/changes/baseline-recipe-library-detail-reading/specs/recipe-library/spec.md) | Seven ADDED requirements/13 scenarios; no Purpose rewrite or MODIFIED/REMOVED operations |
| [Design](../openspec/changes/baseline-recipe-library-detail-reading/design.md) | Extraction decisions and representation/error/ownership boundaries; no implementation change |
| [Tasks](../openspec/changes/baseline-recipe-library-detail-reading/tasks.md) | Documentation extraction/validation only; no application tasks or lifecycle approval |
| Main specs / other changes | Library nine/18 and identity 36/92 unchanged; list visibility, switching, rename and removal active; no archival |

**Checks:** Selected strict OpenSpec validation **passed**; all-item strict
validation **passed 7/7** (five active changes/two main specs). Six-path
`task verify --` documentation, spec:check and content checks **passed**;
66 unrelated changed paths excluded without verification claims. Mapping/counts
and preservation comparisons **passed**: 1,423 prior tracked/untracked paths,
only the authorized plan changed, staged diff bytes unchanged, deleted navigation
spec absent, prior library evidence/U23–U31 and main specs unchanged. Final
post-checklist-edit results/content identity are in this session response/current
harness. **Failed: none; blocked: none.** Browser/API/PostgreSQL runtime
qualification **not-run** A34; behavior TDD/application suites/client regeneration
**not-applicable** to documentation. Stop at review; no successor work.

**Additional detail-input manifest:** Reuse the unchanged 33-input list manifest;
these 11 additional current-file digests record the targeted new reads. They are
source identity, not runtime qualification. Final preservation compares all
pre-existing tracked/untracked paths and exact staged diff bytes.

| Input | SHA-256 |
| --- | --- |
| `pwa/src/components/recipes/RecipeDetailSheet.tsx` | `bbc1bba8f16f3fa305775d072cb1c3850af34a24bd3979e2228b63984ca1a19c` |
| `pwa/src/components/recipes/RecipeDetailSheet.test.tsx` | `21727367dee891c473635cc2eafde324b0f6863e0dd4db1a7e82203d5e650da0` |
| `pwa/src/lib/api/generated/api/recipes/item/index.ts` | `687fbde658edd62de7455ec634b1d36e8c8b67ee508c689b2ae9de9f8ff4ba2d` |
| `pwa/src/lib/api/recipes.test.ts` | `02b75d719bddca5b88e9cc9760d183fd8e8defd316b0d04cdabf1006bf45ebe4` |
| `pwa/src/lib/duration.ts` | `f3205470722ee9b39409d8e285d00dd90e91e8ebd537f8efc991d8d13567677f` |
| `pwa/src/lib/imageUtils.ts` | `a51d124d0fae2a99257186e607597825299737ca77717813aac3ce72821d46be` |
| `api/src/RecipeApi/Dto/RecipeDetailResponseDto.cs` | `a7a0e1c3190cf711feea3a618716d54fb5b1bcd4f19349c32ec813c13771d342` |
| `api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs` | `b5849eb709ca2bc85efa3051d3a953ca955ef8704848327ad88d0297299d949b` |
| `api/src/RecipeApi.Tests/Services/RecipeServiceTests.cs` | `0019a5854fcf0468783607ff9bbe7d9c58ccc4abd3e48658f2ee3e1c54a50e27` |
| `pwa/e2e/recipes.spec.ts` | `b41683a89d6b1704ecf0a447fdf6493f60314b45b62b3f60143ec190e9eaaa51` |
| `api/src/RecipeApi/Program.cs` | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |

### BSL-recipe-library-007 — approved detail-reading main-spec promotion

**Authority:** A51, user “I approve, move to propotion”, 2026-10-15,
immediately after the validated A50 detail-reading draft. Approval and promotion
cover only that reviewed delta. No application work, runtime qualification,
archival or successor extraction is inferred.

**Reconciliation / identity:** Same branch/HEAD, nearest repository-local
OpenSpec root and spec-driven schema. Read current delta/main/tasks and specs
instructions before writing. Recomputed all 44 source/test/evidence-manifest
hashes from BSL-recipe-library-002/006: unchanged. Evidence stays
implementation-supported under A10 with runtime qualification deferred A34.

**Applied:** Appended the seven ADDED requirement blocks/13 scenarios verbatim
to [main recipe-library](../openspec/specs/recipe-library/spec.md), preserving
its complete preceding bytes, including Purpose and nine list requirements/18
scenarios. Main now has 16 requirements/31 scenarios. Delta, proposal, design,
BSL-recipe-library-001–006 mappings, historical BSL-015 sentence/caveat,
BSL-018–025/U23–U34 and member-creation history remain unchanged. Household
identity remains 36/92. Non-normative detail readiness/deletion, missing-record,
failure/recovery, instructions/content and image-delivery limits are not promoted
into new normative assertions.

**Artifact status:** Detail-reading delta is approved and promoted under A51;
its unchanged evidence preamble records the historical draft state under A50.
The extraction tasks' follow-up records this later authorization. All five
changes (detail reading, list visibility, switching, rename and removal) remain
active; nothing archived. No existing requirement or Purpose rewritten.

**Checks:** Main strict validation **passed**, all-main-spec strict **passed 2/2**,
all-item strict **passed 7/7**. Three-path documentation/spec/content and exact
append/preservation checks **passed**; only main library, task follow-up and plan
changed among 1,428 pre-existing paths, with staged diff bytes unchanged. Final
post-record-edit content identity/results are in this session response/current
harness. **Failed: none; blocked: none.** Browser/API/PostgreSQL checks remain
**not-run** A34; application suites, behavior TDD and client generation
**not-applicable** to this documentation promotion.

## Promoted slice — recipe-library ordinary-household detail editing

**Current lifecycle:** A53 promotes the exact reviewed nine/17 delta. The A52 draft-state tables and evidence below record extraction-time status; BSL-recipe-library-011 records the current promotion.

| Field | Scope / status |
| --- | --- |
| Authority | A52: current pasted request explicitly permits discovery, CLI scaffolding and bounded drafting, then stop for review |
| Identity | `moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus pre-existing staged/unstaged/untracked inputs; before-image hashes and staged binary diff captured privately |
| Root | Read-only `openspec list --json`, `context --json`, spec inventory/show resolved nearest repository root `/Users/alex/Code/whats-for-supper`; schema spec-driven, no store redirection or initialization/reconfiguration |
| Main/owners | Recipe-library 16/31 and household-identity 36/92 unchanged; A04 facts/read ownership and identity access/member requirements reused |
| Draft | `baseline-recipe-library-detail-editing`: proposal, nine additions/17 scenarios, extraction design/tasks; validated draft for review only |
| Evidence | BSL-recipe-library-008–010; source-inspected, implementation-supported under A10, medium confidence; runtime not-run A34 |
| Exclusions | Ratings/notes submission, reporting/re-import, sharing, originals, hero generation, cooking mode/instruction editing, planning, ranking, capture, deletion/restore/purge, preference policy and demo/preview/deployment variants |

### BSL-recipe-library-008 — connected detail editor and update semantics

**Reused evidence:** Recomputed all 44 per-file identities in BSL-recipe-library-002/006: 44 unchanged, zero changed. Reuse BSL-recipe-library-001–007 for list/detail entry, facts, mapping and shared ownership; no rescan of unrelated capabilities. Existing dirty OpenAPI/SQL/mock inputs remain evidence, not newly qualified implementation. Additional inspected identities follow BSL-010.

**Ordered trace and representations:**

1. `pwa/src/app/(app)/browse-all-stack/page.tsx` `handleCardTap`/`detailRecipeId` and mounted `RecipeDetailSheet` preserve the selected loaded recipe ID. `handleDetailSheetClose` clears it. No field-update callback or list refresh is passed. Existing main owns card activation and GET-backed reading; this slice starts after that GET succeeds.
2. `pwa/src/components/recipes/RecipeDetailSheet.tsx:58–81,103–166,223–290,578–590` provides nine meal options, `resolveMealTypes`, loaded local recipe, drafts and Settings/Edit. `ActionGearMenu.tsx` toggles Settings, offers Edit only with onEdit, calls it and closes the menu. Parent calls `resetDrafts(recipe)` then enters editing. Draft name copies mapped name; description/cuisine use empty text for absence; ingredients use []; nonempty mealTypes are filtered for truthy values, otherwise trimmed recognized category, otherwise Supper. These defaults are draft state, not inferred stored facts. Read badges do not use that fallback.
3. Sheet `688–751,799–856,941–969` exposes name/cuisine inputs, description textarea, editable ingredient rows plus Add/remove, and toggled meal-type buttons. Name.trim empty or no selected meals disables Save; there is no form-submit/Enter path. No local required description/cuisine/ingredient count, length or duplicate validation. Fields are controlled text state; Save and Cancel are buttons. Time/instructions/images/source/provenance/readiness/deletion/attribution are not edited by this field-save handler; nearby hero controls and other update handlers are excluded.
4. `handleSaveRecipeFields` captures `nextRecipe` by spreading loaded recipe and replacing all five drafts. It trims name/description/each ingredient, drops blank rows in order, trims cuisine to string or null, and uses draft mealTypes. It sets Saving and clears editError, then calls updateRecipe with loaded recipe.id and all five fields even if unchanged. Blank description is empty string; all-blank ingredients become []; blank cuisine is null. `handleCancelEdit` resets drafts from loaded recipe, clears error and exits editing. Before submission no field PATCH occurs; reopening repeats reset. Cancel is disabled pending, so it is not an in-flight abort/rollback. Closing unmounts; reopening the connected sheet performs its existing GET, not guaranteed recovery.
5. `pwa/src/lib/api/recipes.ts:577–609` forwards optional fields into generated `api.recipes.byId(id).patch` and returns Promise<void>, ignoring its response. Generated `api/recipes/item/index.ts` PATCH uses the ID URI template, UpdateRecipeDto serializer and generated PatchResponse. Generated models `serializeUpdateRecipeDto` writes strings/ingredients and non-null meal arrays. `generated/apiClient.ts` registers JsonSerializationWriterFactory; inspected installed JSON writer emits null for null, omits undefined strings and writes [] as an empty array. This is source review of serializer behavior, not an executed HTTP capture for clearing/omission.
6. `specs/openapi.yaml:496–524,1725–1750` declares optional nullable fields, meal-item enum and 200 data object for PATCH with UUID path ID. `api/src/RecipeApi/Dto/UpdateRecipeDto.cs` uses nullable strings/List<string>/string[], without field validation attributes. `RecipeController.Update` forwards ID/DTO to `RecipeService.UpdateRecipe`; no member binding or attribution comparison is introduced. Reuse household-identity “Gate protected page entry with household access”, “Apply member context after household access”, “Authenticate protected API requests independently” and existing resolution/recovery. Do not interpret OpenAPI member security as personal ownership enforcement.
7. `RecipeService.cs:354–465` FindAsync by ID uses the same global deletion-filter/tracked-entity qualification caveat as U32. Non-null fields replace values verbatim; no server trim/nonblank name/nonempty meal/enum validation is present for this slice. Null or omitted DTO fields do not clear stored values. Empty strings replace strings, [] replaces ingredients or meals; empty meals also set Category=Supper, without synthesizing a meal array. Nonempty meal update does not synchronize Category. Schema/EF store name/description/cuisine text, ingredient JSONB and meal text[]; UpdatedAt is assigned before SaveChangesAsync. Main recipe ID and other unsupplied facts are not reassigned here. Not a real PostgreSQL persistence qualification.
8. Any supplied relevant field marks search indexing/embedding pending, even unchanged values. New sidecar or existing pending/reset-fingerprint changes are saved with the recipe. After SaveChangesAsync the service attempts `index-recipe-search` with recipeId and source fingerprint; trigger exceptions are caught/logged. It then awaits `ImageService.UpdateRecipeInfo` without that catch. That method reads or creates recipe.info and writes supplied name/description (and excluded other supported arguments); ingredients/cuisine/meal types are not arguments. File failure may reject after DB save, so atomic database/file save or rollback cannot be inferred. IsReady/DeletedAt are not assigned and this update contains no explicit event publish; no broader downstream/indexing/event-completion capability is extracted.
9. Server maps the updated entity and returns RecipeDetailResponseDto/UpdatedAt. `Infrastructure/SuccessWrappingFilter.cs` exempts ResponseDto types, so actual PATCH bypasses data wrapping despite OpenAPI/generated PatchResponse data shape (U36). Client ignores response; successful await applies the captured nextRecipe, cleans draftIngredients and exits editing. No GET, response reconciliation, library-store update or parent callback occurs here. Existing main owns resulting detail text/badges/ingredient presentation; the new requirement owns when its local source changes. Blank cuisine therefore hides locally on success but retains a prior stored cuisine (U35).
10. Pending only disables Save/Cancel and changes Save label to Saving. Inputs, meal toggles, ingredient controls, Close and backdrop remain active. Edits made while pending are not merged into the captured submission on success. Catch logs and shows “Could not save changes. Try again.”, retaining current draft/edit state; finally ends Saving. Locally eligible retry clears error and sends a fresh snapshot; failure does not prove no commit. No abort, cancellation token, concurrency/version precondition, safe retry/idempotency or stale-response guard is established for Save (U37).

**Main/shared-owner comparison:** All 16 main library requirements were read, including scenarios. None owns field editing/partial PATCH, Cancel, save feedback or local completion. Each of the nine additions below fills those gaps only; read requirements remain intact. Household-identity 36/92 and A04 ownership remain consumers, with no identity/member-creation or preference policy rewrite.

### BSL-recipe-library-009 — actual assertion coverage and substitutions

Inspected assertions, not executed tests:

- **C1 — RecipeDetailSheet.test.tsx**, “shows only edit actions ... cancel”: opens Settings/Edit; asserts Save/Cancel visible, adjacent view controls hidden; Cancel restores those controls. It changes no draft and asserts neither no-PATCH nor reset/reopen. “shows cuisine input ... pill board” asserts input and Supper/Lunch visibility, not position, initialization values or all options. “disables save when no meal types ...” clicks both fixture choices and asserts disabled Save. “sends cuisineType and mealTypes ...” resolves mocked updateRecipe(undefined), edits Greek/deselects Lunch and asserts adapter call ID and objectContaining Greek/['Supper']; no actual PATCH, other fields, return rendering, DB or response assertion. Entire recipes adapter is mocked; fixture Pasta/Sauce, Italian/Supper/Lunch and family/localization/image helpers are substitutions. No focused pending/rejection/retry, whitespace, null clearing, blank-name, Add/remove, draft-discard or default-resolution assertions were found here.
- **B1 — pwa/e2e/recipes.spec.ts**, “edits recipe card fields from a single edit mode”: entry is Search `/recipes`, not library. Overrides `**/api/recipes/*`; GET fixed MOCK_DETAIL_RECIPE omits required updatedAt, PATCH captures body and returns mocked `{recipe: {...fixture,...body}}`. Edits name/description/one ingredient; poll asserts those three payload fields; then asserts local title/ingredient text. Does not assert cuisine/meals, trimming, ID targeting, response use, refetch, reopening or persistence. Handler is stateless; subsequent GET returns old fixture. Shared editor evidence only, not connected-library or real backend qualification.
- **A1 — RecipeServiceTests.cs:161–207**, `PatchRecipe_WithEditableCardFields_PersistsFieldsAndQueuesSearchIndexWorkflow`: seeds old name/description/ingredient; PATCH asserts 200, then reads another DI scope and asserts new name/description/deserialized ingredient array, exactly one workflow and matching recipeId/nonblank fingerprint. No response fields, timestamp, sidecar state, disk, later GET or PostgreSQL assertions.
- **A2 — same file:210–245**, multiple editable fields: PATCH name/description/ingredients plus excluded notes; asserts 200 and one workflow only. This is evidence for a single trigger on supplied fields, not an extraction of notes or index completion.
- **A3 — same file:248–283**, cuisine/meals: seeds Category Lunch; PATCH Italian/Supper/Lunch; asserts 200 and EF cuisine/meal values in another scope. No Category synchronization, blank/null or response assertion.
- **A4 — same file:287–320**, empty meals: PATCH []; asserts 200 and Category Supper only. It does not assert stored empty MealTypes. That storage assertion is supported by service assignment, not this test's name.
- **F1 — TestWebApplicationFactory.cs** CreateAsync disables household authentication; defaults use InMemory EF and InMemoryRecipeStore. Orchestrator mock writes workflow/task rows in another scope; real index/embedding work is not executed. API tests inspect substituted database state, not PostgreSQL/disk/auth/event qualification. Existing BSL-005 controller GET identity assertion and fixture limitations remain unchanged.
- **M1 — pwa/e2e/mock-api.ts:691–727** common PATCH returns a fixed recipe/updatedAt without applying request or storing data; GET returns builders.recipe by ID. `pwa/src/lib/api/recipes.test.ts` declares byIdPatch but contains no updateRecipe assertions. Page unit detail is stubbed, as recorded BSL-005; no connected-library real editor Save assertion. Mock successful responses cannot establish durable persistence or freshness.

Runtime unit/browser/API/PostgreSQL checks **not-run** under A34 and explicit session boundary. Application TDD, client generation, service launch, live parity and database qualification are **not-applicable** to documentation-only changes, not newly blocked. Confidence is medium: connected source path strong, failure/normalization/default edges largely source-only.

### BSL-recipe-library-010 — draft mapping, artifacts and review handoff

A52 authorizes the CLI-scaffolded bounded proposal/delta/design/tasks/plan. No consequential intent choice is needed for supported assertions; U35–U37 retain disputed/unsupported guarantees outside normative text under A12 and this request. Reuse prior evidence and keep U29–U34, BSL-018–025/U23–U28 and historical member-creation evidence intact. Delta contains BSL-015's exact requested historical sentence plus its dated caveat.

Every row maps both its owning requirement and exact scenario. Step references below mean BSL-008 steps; C/B/A/F/M references mean BSL-009 inspected assertions, never runtime passes.

| Added requirement | Scenario | Source support / actual assertion coverage |
| --- | --- | --- |
| Open initialized recipe-detail field drafts | Edit loaded detail | Steps 1–3: library ID/loaded recipe/ActionGearMenu/resetDrafts/inputs; C1 visibility only; initialization values source-only |
| Open initialized recipe-detail field drafts | Initialize meal-type choices | Step 2 resolveMealTypes/MEAL_TYPE_OPTIONS; C1 shows two fixture pills, does not assert default/filter/category/all choices |
| Edit ingredient rows in the detail draft | Change and add ingredients | Steps 3–4 handlers/row UI; B1 asserts changed ingredient payload/local text; Add/empty row source-only |
| Edit ingredient rows in the detail draft | Remove an ingredient | Step 3 remove filter by index/UI; source-only, no focused remove/order assertion |
| Restrict local detail Save eligibility | Name is blank | Step 3 Save disabled expression; source-only, no blank-name assertion |
| Restrict local detail Save eligibility | No meal type is selected | Step 3 Save expression/toggle; C1 explicitly asserts disabled after deselecting Supper/Lunch |
| Submit normalized detail fields for the loaded recipe | Submit edited fields | Steps 4–6 capture/adapter/byId/serializer/contract; C1 asserts loaded ID/Greek/Supper adapter fields; B1 asserts three actual mocked PATCH body fields; trimming/all-five/real backend source-only |
| Submit normalized detail fields for the loaded recipe | Submit blank optional drafts | Steps 4–5 trim/filter/null/serializer; source-only; fixtures/success mocks do not assert this |
| Apply supplied non-null recipe-detail update fields | Store supplied detail fields | Steps 6–9 DTO/FindAsync/assignments/EF Save/MapToDto; A1 name/description/ingredients and A3 cuisine/meals in InMemory; timestamp/response/real DB source-only; F1 applies |
| Apply supplied non-null recipe-detail update fields | Preserve omitted or null values | Step 7 non-null guards; source-only, no focused preservation/null-cuisine assertions |
| Apply supplied non-null recipe-detail update fields | Replace with empty values | Step 7 assignment/JSON serialization/empty-meal Category; A4 asserts only Category Supper, remaining empty-storage assertions source-only |
| Show pending detail-save feedback | Save is pending | Step 10 isSavingRecipe/disabled labels; source-only, no focused pending assertion |
| Discard unsubmitted recipe-detail drafts with Cancel | Cancel before submission | Step 4 resetDrafts/handleCancelEdit; C1 restores view controls only; no-PATCH/changed-draft discard source-only |
| Discard unsubmitted recipe-detail drafts with Cancel | Reopen after Cancel | Steps 2/4 reset on Edit; source-only, no reopen/reset assertion |
| Display the submitted snapshot after successful detail Save | Save resolves successfully | Step 9 local nextRecipe and existing read owner; B1 asserts local name/ingredient after mocked success only, not response reconciliation/GET/DB |
| Retain editing and offer another attempt after detail Save failure | Save rejects | Step 10 catch/finally/editError; source-only, no focused reject/retention/control assertion |
| Retain editing and offer another attempt after detail Save failure | Retry after failure | Steps 4/10 fresh capture/clear error; source-only, no retry assertion; no idempotency inferred |

| Artifact | State |
| --- | --- |
| [Proposal](../openspec/changes/baseline-recipe-library-detail-editing/proposal.md) | Draft, existing owner only |
| [Delta](../openspec/changes/baseline-recipe-library-detail-editing/specs/recipe-library/spec.md) | Nine ADDED requirements/17 scenarios; no Purpose/MODIFIED/REMOVED operations |
| [Design](../openspec/changes/baseline-recipe-library-detail-editing/design.md) | Extraction boundaries/representations/risks; no application design change |
| [Tasks](../openspec/changes/baseline-recipe-library-detail-editing/tasks.md) | Documentation extraction and validation only; completion does not mean acceptance |
| Main specs / prior artifacts | Library 16/31; identity 36/92; all five prior active changes unchanged and active; archives unchanged |
| Review | Stop with validated draft; no acceptance, promotion, archival or successor extraction |

**Checks:** selected strict validation passed. Final applicable all-item strict, six-path documentation/content/mapping and full before-image/index preservation outcomes are reported in the final response/current harness. No runtime result is attached to these source identities. Runtime **not-run** A34; application TDD/client generation/live parity/database qualification **not-applicable** to documentation. No application mutations or services executed.

**Additional inspected inputs:** Reuse unchanged 44-input manifests. These additional source/dependency hashes support future targeted rechecks, not runtime qualification.

| Input | SHA-256 |
| --- | --- |
| `api/src/RecipeApi/Dto/UpdateRecipeDto.cs` | `580894849abf965a787e9124a8de1ee1ffea5800e60a081f543e28aac4a8a1ab` |
| `pwa/src/components/recipes/ActionGearMenu.tsx` | `d0c0c5ee92658de43cfb9fddc40b4d69030a02c348396e9044d1c77e218b8e75` |
| `api/src/RecipeApi/Services/ImageService.cs` | `c73bb4f976bd6355ec9aa6c18937bed12d4dc14ff7efe718a84351cb4f1abc2d` |
| `api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs` | `6fa3cd08587220fc4e18803f6ba020e494b81211cf99c53ec10de23ddd46f11d` |
| `pwa/src/lib/api/generated/apiClient.ts` | `092579e3714bf5c34eb2e425997a9e73349abc85c9fba37f5fb546b667d866f9` |
| `pwa/node_modules/@microsoft/kiota-serialization-json/dist/es/src/jsonSerializationWriter.js` | `48b9388859f3a017fd3d0eb1637b32bc644fc02bb5d5016ea539aa3449844fb3` |

### BSL-recipe-library-011 — detail-editing main-spec promotion

**Authority:** A53, user “promote it”, 2026-10-15, immediately following the validated A52 draft. This directly authorizes promotion of that reviewed delta and documentation status updates; no separate acceptance statement, archival, successor extraction or application work is inferred.

**Result:** Appended the exact nine requirement blocks/17 scenarios from [detail-editing delta](../openspec/changes/baseline-recipe-library-detail-editing/specs/recipe-library/spec.md) to [main recipe-library](../openspec/specs/recipe-library/spec.md). Main now has 25 requirements/48 scenarios. All earlier main bytes, including its Purpose and 16 prior requirements/31 scenarios, are retained as an exact prefix. Only ADDED content was appended; no delta operation header or non-normative preamble copied into main.

**Preservation:** Full delta, proposal/design/metadata and historical BSL-015 sentence/caveat unchanged. BSL-recipe-library-001–010 mappings, U29–U37, BSL-018–025/U23–U28 and member-creation history remain intact. Household-identity remains 36/92. All six changes remain active and archives/deleted navigation spec are preserved. Rechecked all 50 source/dependency digests in the library manifests: unchanged. Source support remains implementation-supported under A10, with runtime/database qualification deferred A34; promotion supplies no new runtime evidence.

**Checks / handoff:** Final main/specs/all strict validation, exact-append/delta equality and three-path documentation/content/full preservation checks are reported in the final response/current harness. Runtime browser/API/PostgreSQL **not-run** A34; application suites, TDD, client generation and live/database behavior checks **not-applicable** to documentation promotion. Changed only main recipe-library, this plan and detail-editing task follow-up; staging and unrelated dirty work retained. No application mutations/services executed.

**Next:** Separately select bounded discovery or lifecycle work; this promotion does not authorize archival, successor extraction or deferred qualification.

## Promoted slice — recipe-library ordinary-household ratings and notes

**Current lifecycle:** A55 promotes the exact reviewed six/15 delta. A54 draft-state tables and evidence below record extraction-time status; BSL-recipe-library-015 records current promotion.

| Field | Selected scope / status |
| --- | --- |
| Authority | A54: current pasted session request authorizes connected discovery, CLI scaffolding and this bounded draft, then stop for review |
| Identity | `moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus pre-existing staged/unstaged/untracked inputs; full before-image hashes and staged binary diff captured privately |
| Root/schema | Read-only list/context/spec inventory/store discovery resolves nearest root `/Users/alex/Code/whats-for-supper`; no registered stores; existing spec-driven schema; no initialization/reconfiguration |
| Boundary | Successfully loaded library detail → rating choice or Notes input → supported PATCH/persistence → local visible state; no adjacent field editing or discovery-vote policy |
| Main/owners | Recipe-library 25/48 and household-identity 36/92 unchanged; reuse library fact/read/update and identity access/member owners |
| Draft | `baseline-recipe-library-ratings-notes`: six additions/15 scenarios, proposal and extraction design/tasks; review pending, not accepted/promoted/archived |
| Confidence | Implementation-supported under A10, medium overall: connected trace strong; direct assertion coverage sparse; no runtime qualification A34 |

### BSL-recipe-library-012 — connected ratings/notes path and persisted facts

**Reuse:** Recomputed all 50 per-file digests in BSL-recipe-library-002/006/010: 50 unchanged, zero changed. Reuse BSL-recipe-library-001–011 and U29–U37 for entry, detail retrieval, existing partial-update side effects and test substitutions; no rescan of unrelated capabilities. New targeted inputs appear below. Dirty contract/schema/mock content remains evidence, not newly qualified implementation.

**Business purpose:** record a shared assessment and free-text household notes on a reusable recipe, directly in loaded detail. The rating is the recipe's persisted 0–3 fact, not a member's discovery vote or a computed household consensus.

**Ordered trace / representations:**

1. **Connected entry:** `pwa/src/app/(app)/browse-all-stack/page.tsx:469–475,828–838` stores the tapped recipe ID and mounts `RecipeDetailSheet`; close sets that ID to null and unmounts it. The caller passes no rating/notes completion callback or library refresh. Existing retrieval and dismissal requirements retain ownership; this slice starts only after detail loading succeeds.
2. **Returned facts and initialization:** `pwa/src/lib/api/recipes.ts:150–161,231–235` getRecipe maps the detail recipe: rating uses returned value or 0; notes uses returned value or null. `RecipeDetailSheet.tsx:103–116,137–166` starts with notes empty/rating 0, then initializes from the fetched recipe using notes ?? '' and rating ?? 0. `:53–57,868–931` offers the Notes textarea and three labeled, aria-pressed buttons: Dislike 1, Like 2, Love 3. Rating 0 selects none; there is no Unknown button. A missing/null notes value becomes empty input. No rating/notes Edit/Save mode is required; these controls remain in the sheet alongside its field editor.
3. **Rating action:** sheet `:199–205,897–931` compares current local rating to the chosen value, substitutes 0 when equal, sets rating immediately and awaits updateRecipe(recipe.id,{rating:newValue}). The click wrapper discards the handler promise. No pending guard, request serialization, catch, rollback, save-error message or automatic retry is present. Choice buttons remain usable, so a later click can dispatch while an earlier request is pending. Local pressed state is optimistic, not proof of persistence.
4. **Notes text and timing:** sheet `:183–197,883–890` controls the textarea with notes/onChange. If recipe is absent, or notes equals recipe.notes ?? '', no timer is scheduled. Otherwise an 800 ms timer calls void updateRecipe(recipe.id,{notes}). Text is neither trimmed nor normalized to null: spaces remain spaces; clearing nonempty loaded notes submits ''. No blur/Enter/dedicated Save trigger appears. Cleanup clears that unstarted timer on notes/recipe dependency changes and unmount. Repeated edits before dispatch replace the timer; dispatched requests are not cancelled or serialized.
5. **Baseline and feedback limits:** notes submission never advances recipe.notes. Returning to the original loaded text after a different text was dispatched can skip the restoring PATCH (U38), including empty-original cases. At dispatch, setNotesSaved(true) runs without awaiting PATCH; an existing savedTimerRef timeout is cleared and a 2000 ms timeout hides Saved. The label is therefore local dispatch feedback; an edit does not immediately hide a prior label. That removal timer has no unmount cleanup. No notes-request catch, rollback, displayed error or automatic retry exists (U39). A later differing edit can schedule another request; unchanged notes do not automatically retry. There is no flush-on-close. Close cleanup covers only unstarted submission; no dispatched-transport cancellation or settled final-state guarantee follows.
6. **Request/omission boundary:** `recipes.ts:577–609` awaits generated `api.recipes.byId(id).patch` and returns void without reading its result. It constructs optional properties from updates; for either rating-only or notes-only calls the others are undefined. `generated/api/recipes/item/index.ts` supplies the ID PATCH route/serializer. `generated/models/index.ts:5965–5990` writes notes as string and rating as number. The installed Kiota JSON writer `:19–52` skips undefined strings/numbers while retaining empty text and numeric 0; null remains null. This is inspected serializer source, not an executed network capture for every edge. OpenAPI `UpdateRecipeDto` permits optional nullable notes and rating, range 0–3.
7. **API/validation/ownership:** `RecipeController.cs:150–160` forwards ID/DTO to UpdateRecipe, without member-specific rating/notes binding. `UpdateRecipeDto.cs` uses string? Notes/int? Rating. `RecipeService.cs:354–375` finds the recipe, validates non-null rating through `ValidationService.cs:42–46` (reject <0 or >3), casts to RecipeRating and assigns non-null notes exactly. Recipe enum/columns in `Models/Recipe.cs:8–33`, EF short conversion/check in `Data/RecipeDbContext.cs:62–66` and SQL recipes rating smallint NOT NULL/range check plus notes text agree on recipe-level storage. AddedBy is separate attribution, not a key for personal notes/ratings. SQL declarations are not installed-database qualification.
8. **Successful partial persistence:** service `:354–434` leaves null/omitted rating/notes unchanged; '' and whitespace notes replace stored text, and 0 replaces a prior rating. Other content guards are untouched by rating-only/notes-only requests, retaining name/description/ingredients/cuisine/meals/instructions/discoverability, attribution, readiness and deletion state. UpdatedAt is assigned. Non-null notes or supplied rating count as search-relevant even when the value equals storage, setting/creating a pending sidecar before SaveChangesAsync. Reuse existing partial-update owner rather than duplicate its five-field/timestamp rule. A successful subsequent existing detail read maps rating/notes from the recipe (`MapToDto:707–708`); no local feedback establishes that read.
9. **Direct side effects/response:** service `:436–465` tries the index workflow after save and catches/logs trigger errors, then awaits ImageService.UpdateRecipeInfo with supplied notes/rating. `ImageService.cs:68–86` reads existing metadata or creates it, changes only non-null supplied metadata fields and writes it. `Infrastructure/LocalRecipeStore.cs:31–45` serializes recipe.info to disk; `Models/RecipeInfo.cs` carries notes/rating. These writes are not one proven atomic operation; file failure can follow database commit. The inspected method has no direct event publication; downstream event/index completion is not established or extracted. Returned RecipeDetailResponseDto maps the recipe, but adapter ignores it. U36's documented data object versus actual unwrapped DTO persists; missing-record 404 and validation 400 are absent from PATCH responses (U40).
10. **Completion/reopening:** rating and notes success handlers neither setRecipe nor apply returned fields, request another GET or invoke onClose/library update. With the sheet mounted and no later edits, it retains local selection/text and stays open. Reopening mounts the existing GET-backed detail path; it is not evidence that pending updates finished or that latest-write ordering/freshness is guaranteed. Library cards/summary are not explicitly refreshed. No inferred transport abort, rollback, atomicity, idempotency, concurrency ordering, freshness or synchronization requirement.

**Shared-owner comparison:** Main recipe-library's retrieval and persisted-detail requirements omit rating/notes from their enumerated facts; its partial-update requirement covers name/description/ingredients/cuisine/meals, leaving this narrower addition missing. The six new headers do not duplicate any existing requirement. Reuse those named owners and household-identity “Gate protected page entry with household access”, “Apply member context after household access” and “Authenticate protected API requests independently”; no new access/header/tenant rule. A04 keeps discovery vote identity/totals/consensus separately owned; this extraction follows only Recipe.Rating/Notes.

### BSL-recipe-library-013 — actual assertions and substitutions

Source inspected, tests **not executed**:

- **B1 — `pwa/e2e/recipes.spec.ts:345–386`:** notes test enters Search `/recipes`, not library, opens its shared detail sheet, fills “kids loved it”, polls captured PATCH body with toMatchObject({notes:'kids loved it'}) and asserts the sheet remains visible. Custom wildcard GET always returns fixed MOCK_DETAIL_RECIPE; PATCH returns merged fixture/body without storing it, and omits required updatedAt. No assertion for initial notes/rating, exact delay, whitespace, empty clearing, omitted keys, selected recipe ID, Saved, rejection, retries, pending controls, another GET, closing/reopening or real persistence. Its fixture rating 3/nonempty notes is not an assertion. This is shared-component request/display evidence, not connected-library or database qualification.
- **C1 — `RecipeDetailSheet.test.tsx`:** whole recipes adapter mocked; fixture rating 2 and notes null. Inspected assertions exercise other actions/field editing, not rating/notes input, selected state or autosave. Its fake timers exercise import polling, not notes debounce/Saved cleanup. No focused rating toggle/clearing, timing, success/failure or overlap assertion is established by these fixtures/test names.
- **V1 — `Services/ValidationServiceTests.cs:34–54`:** direct ValidateRating calls assert ArgumentException at -1/4/100 and no exception at 0/1/2/3. This supports range assertions only, not PATCH status, persisted values or UI meanings. Create invalid-rating controller test concerns multipart creation, not this PATCH, and adds no coverage here.
- **A1 — `RecipeServiceTests.cs:210–245`:** PATCH includes notes “Keep this one” along with name/description/ingredients; assertions check 200 and one index-workflow instance only. No stored notes/rating, empty/null/omission, metadata-file, response or subsequent GET assertion. Other established A1/A3 field tests in BSL-009 cover different fields; they do not prove notes/rating storage.
- **I1 — `Integration/RecipeUpdateIntegrationTests.cs`:** only instructions update tested; asserts DB JSON and recipe.info instruction array plus one index trigger/no recipe_ready trigger. Neither notes nor rating is updated/asserted. Do not transfer those side-effect assertions to this slice. BSL-009 factory substitutions apply: auth disabled, default InMemory EF and InMemoryRecipeStore, orchestrator mocked (writes workflow rows without executing index/embedding work). No PostgreSQL/disk/auth/event qualification.
- **M1 — adapter/common mock/library tests:** `recipes.test.ts` has no updateRecipe assertions; share/export notes/rating assertions (including an unrelated rating 5 fixture) are outside this path and do not establish supported PATCH ratings. Common `pwa/e2e/mock-api.ts:691–727` PATCH returns fixed recipe/updatedAt without applying/storing request, GET builds a separate recipe. Previously inspected library page tests stub detail, and library browser tests do not qualify this control-to-storage journey. Reuse BSL-005/009 substitutions; mocked successful responses do not prove durable persistence.

Runtime browser/API/PostgreSQL checks **not-run** under A34/current instruction. Application TDD/suites/client generation/live parity/database qualification are **not-applicable** to these documentation edits. Confidence medium overall; most scenarios below are source-only.

### BSL-recipe-library-014 — draft mapping, artifacts and review handoff

A54 authorizes this CLI-scaffolded proposal/delta/design/tasks/plan. Supported assertions require no new consequential intent choice; U38–U40 withhold disputed guarantees under A12/current instruction. BSL-001–011, U29–U37, BSL-018–025/U23–U28 and member-creation history remain intact. Delta retains BSL-015's exact historical sentence and caveat. All scenario evidence is source-inspected, not a current test pass.

Step numbers refer to BSL-012 above; assertion IDs refer to BSL-013. Every row maps the owning requirement and exact scenario.

| Added requirement | Scenario | Source support / actual assertion coverage |
| --- | --- | --- |
| Initialize recipe-detail ratings and notes controls | Load existing notes and rating | Steps 1–2 loaded ID/GET mapping/setters/value/aria-pressed; source-only; B1/C1 fixture values are not initial-state assertions |
| Initialize recipe-detail ratings and notes controls | Load absent notes and rating | Step 2 null/absence defaults and equality; source-only; C1 null fixture has no corresponding value assertion |
| Initialize recipe-detail ratings and notes controls | Offer the three rating meanings | Steps 2/7 RATING_OPTIONS/enum and button labels; source-only; V1 asserts valid numbers, not labels/pressed meanings |
| Select or clear the loaded recipe rating | Select a different rating | Steps 3/6 local setRating/byId/serializer; source-only, no rating-interaction assertion |
| Select or clear the loaded recipe rating | Clear the current rating | Steps 3/6 equality-to-0/number writer; source-only; V1 accepts 0 but does not assert toggling/submission |
| Select or clear the loaded recipe rating | Select from Unknown | Steps 2–3/6; source-only, no initial-Unknown click/payload/omission assertion |
| Submit changed recipe notes after the editing delay | Submit exact notes text | Steps 4/6 exact controlled text/timer/string writer; B1 asserts notes payload for ordinary text only; whitespace/delay/omission/target ID source-only |
| Submit changed recipe notes after the editing delay | Clear initially nonempty notes | Steps 4/6 empty string retained; source-only, no empty-clear assertion; requires initial nonempty baseline |
| Submit changed recipe notes after the editing delay | Replace a pending notes edit | Steps 4–5 effect dependencies/cleanup/timer; source-only; C1 polling fake timers do not assert notes debounce |
| Persist supplied recipe ratings and exact notes | Store a rating or clear it to Unknown | Steps 7–9 DTO/validation/recipe field/Save; V1 only accepts 0–3; no rating PATCH/storage/member-specific assertion |
| Persist supplied recipe ratings and exact notes | Store notes without trimming | Steps 7–9 direct notes assignment/Save; source-only; A1 asserts 200/workflow, not notes value; no PostgreSQL evidence |
| Persist supplied recipe ratings and exact notes | Durably clear notes with empty text | Steps 7–9 non-null empty assignment/Save/MapToDto; source-only, no storage/GET/file empty-string assertion; not inferred from B1 success |
| Preserve omitted recipe content during ratings and notes updates | Preserve null and omitted facts | Steps 6–8 writer/non-null guards; source-only, no focused null/omission/preservation assertion |
| Preserve omitted recipe content during ratings and notes updates | Preserve unrelated recipe content | Steps 6–9 guards/no member binding/side-effect qualification; source-only, no rating-only/notes-only stored-content preservation assertion |
| Retain local ratings and notes display on successful completion | Complete an update with the sheet open | Steps 3–6/10 no response mapping/refetch/onClose; B1 asserts sheet visible after request capture only, not resolved-request ordering/local values/no GET; remaining assertions source-only |

| Artifact | Status |
| --- | --- |
| [Proposal](../openspec/changes/baseline-recipe-library-ratings-notes/proposal.md) | Draft, existing owner only |
| [Delta](../openspec/changes/baseline-recipe-library-ratings-notes/specs/recipe-library/spec.md) | Six ADDED requirements/15 scenarios; no Purpose or MODIFIED/REMOVED operations |
| [Design](../openspec/changes/baseline-recipe-library-ratings-notes/design.md) | Extraction decisions and integration limits; no application design change |
| [Tasks](../openspec/changes/baseline-recipe-library-ratings-notes/tasks.md) | Documentation extraction/validation only; completion is not acceptance |
| Main / prior artifacts | Library 25/48 and identity 36/92 unchanged; six prior active changes and all archives preserved; this seventh change is draft only |
| Review | Stop at validated draft. Acceptance, main promotion, archival and successor extraction require separate authorization |

**Checks / handoff:** Selected `openspec validate baseline-recipe-library-ratings-notes --strict --no-interactive` passed (exit 0). All-item strict passed 9/9, zero failures. Six-path `task verify -- <plan and all five change files>` passed documentation, spec:check and content (exit 0). Bounded content/mapping/link and full before-image/index preservation checks passed: six requirements/15 scenarios mapped, all pre-existing files except the authorized plan unchanged, index bytes and deletions retained. Failed: none; blocked: none. These first-pass results precede the final checklist/evidence recording edits; final post-edit documentation/all-strict/content/preservation outcomes and tested identity are in the final response/current harness. No runtime result is attached to source digests. Runtime **not-run** A34; application TDD/client generation/live parity/database qualification **not-applicable** to documentation. No application mutations, service launch or database access attempted.

**New inspected inputs:** Reuse 50 unchanged prior input identities. Additional current source/test identities (not runtime qualification):

| Input | SHA-256 |
| --- | --- |
| `api/src/RecipeApi/Services/ValidationService.cs` | `bf2ed2aaffef7c4e7dd320c3f53f7772eaacfe8cceb4251acc6f0792b19fa1a1` |
| `api/src/RecipeApi.Tests/Services/ValidationServiceTests.cs` | `1957400792e1899c0e93f979532930f797baa45c909b8f5e9f0eedec76298acb` |
| `api/src/RecipeApi.Tests/Integration/RecipeUpdateIntegrationTests.cs` | `8b3b2d9ed80c77f39061d31054410e02d6e63e9cdb39de6f9ce2896ae4c8acc7` |
| `api/src/RecipeApi/Infrastructure/LocalRecipeStore.cs` | `6f3f2893b4ae03ef3328efad306de1e8fc33ab470c4c430bfbe5d3ed1ae17efc` |
| `api/src/RecipeApi/Models/RecipeInfo.cs` | `7a154a58b5f360279cd1891f9a9e33c4ad3097f382f088dccc855ec27c957452` |

### BSL-recipe-library-015 — ratings and notes main-spec promotion

**Authority:** A55, user “promote this spec, then produce the prompt for me to generate the next spec”, 2026-10-15, following the validated A54 draft. Authorizes promotion of this reviewed delta and a next-session prompt, not execution of successor extraction, application work or archival. No separate acceptance statement is inferred beyond the direct promotion instruction.

**Result:** Appended exactly the six requirement blocks/15 scenarios from the [ratings/notes delta](../openspec/changes/baseline-recipe-library-ratings-notes/specs/recipe-library/spec.md) to [main recipe-library](../openspec/specs/recipe-library/spec.md), now 31 requirements/63 scenarios. All prior main bytes, including the original Purpose and 25 requirements/48 scenarios, remain an exact prefix. No delta operation header or non-normative evidence note was copied into main. All seven changes remain active.

**Evidence/preservation:** All 55 source/dependency digests from the library manifests rechecked unchanged. Full delta (including BSL-015 historical sentence/caveat), metadata, proposal and design retained byte-for-byte. BSL-recipe-library-001–014, U29–U40, BSL-018–025/U23–U28 and historical member-creation limitations remain intact. Household-identity stays 36/92; archives, all unrelated tracked/untracked inputs, index bytes and deletions are preserved. Source-supported A10 assertions remain distinct from deferred A34 runtime/database qualification.

**Checks / handoff:** Final main/specs/all strict validation, bounded three-path documentation/content, exact-append/delta equality and full preservation results are in the final response/current harness. Runtime browser/API/PostgreSQL **not-run** A34; application suites/TDD/client generation/live parity/database checks **not-applicable** to documentation promotion. No application mutations, database access or service launch attempted. Changed only main recipe-library, this plan and the ratings/notes task follow-up.

**Next-session prompt:** Recommend the missing recipe-library loaded-detail discoverability control slice: actual control/initial state → activation → PATCH partial update → persistence → visible completion/failure, reusing existing list eligibility/filter requirements. Treat optimistic state, pending controls, rollback/error and refresh as discovery targets. Exclude discovery votes/consensus, search ranking and other lifecycle/quality/sharing actions. Prompt requests bounded discovery and source-supported draft only, stop for review; it is supplied for later use and not executed now. No next change scaffolded or accepted.

## Promoted slice — recipe-library ordinary-household detail discoverability

**Current lifecycle:** A57 promotes the exact six/13 delta. A56 draft-state tables and evidence below record extraction-time status; BSL-recipe-library-019 records current promotion.

| Item | Recorded state |
| --- | --- |
| Domain / purpose | Recipe library: let the household mark a loaded recipe for discoverability using its stored recipe-level flag |
| Actor / entry / result | Ordinary-household person, successful library detail GET, viewing-mode Ask the Family button; inverse boolean submission and local completion or restoration |
| Source identity | `moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus preserved dirty/staged/untracked inputs; OpenAPI/SQL/mock edits are not newly qualified |
| Authorization / evidence | A56; BSL-recipe-library-016–018; source-inspected, implementation-supported A10, medium overall confidence; runtime not-run A34 |
| Dependencies | Existing identity gates/member context, React state, Kiota generated PATCH/JSON serializer, controller/EF/database, orchestrator and recipe store |
| Boundary / stop | Loaded library detail → control → supported submission/persistence → local visible result. Draft only; no application mutations, DB access, services or lifecycle actions |

### BSL-recipe-library-016 — connected discoverability control and partial update

**Reused evidence:** Recomputed every one of the 55 prior per-file library source/dependency hashes in BSL-recipe-library-002/006/010/014: 55 unchanged, zero changed. Reuse BSL-recipe-library-001–015, including established partial-update, list/filter and detail retrieval evidence. Do not rescan unrelated capabilities. Before-images of all pre-existing tracked/untracked files and index hash were saved privately for preservation checks; the plan's pre-existing staged/unstaged differences are retained.

**Ordered trace and representation changes:**

1. `pwa/src/app/(app)/browse-all-stack/page.tsx` `handleCardTap` sets detailRecipeId; `handleDetailSheetClose` clears it; conditional RecipeDetailSheet receives ID and close/planning/find callbacks, with no field-update notification or refresh callback. Existing main owns entry and detail reading. This extraction begins after successful loading; the card-level StackActionBar update path is not the selected detail path.
2. `pwa/src/lib/api/recipes.ts` `getRecipe`/`mapToRecipe` maps returned isDiscoverable with `?? false`. `RecipeDetailSheet.tsx:110,138–170` independently initializes local state false, then sets it from loaded nextRecipe.isDiscoverable ?? false. True remains true, false remains false, absent/null becomes false. This does not assert absent storage: Recipe.IsDiscoverable is a non-null boolean. The loaded recipe object and the separate control state are different representations.
3. `RecipeDetailSheet.tsx:974–1026` renders DiscoveryToggleCard while not editing. `DiscoveryToggleCard.tsx` is a type=button, data-testid action-toggle-discovery, with title Ask the Family and subtitle Shows in Discovery voting. English strings are confirmed in `pwa/src/locales/en/common.json`, resolved through `pwa/src/locales/index.ts`. True uses sage background/on knob position and action label Turn off Discovery for this recipe; false uses subdued track/off position and Turn on Discovery for this recipe. Track is aria-hidden, without role=switch/aria-checked/aria-pressed. No switch semantic or universal localization/accessibility guarantee is inferred.
4. `RecipeDetailSheet.tsx:207–223` `handleToggleDiscovery` returns if no recipe, takes next = !isDiscoverable, immediately sets that local state and pending, then awaits updateRecipe(recipe.id,{isDiscoverable:next}). The target is loaded recipe.id, not a member/vote ID. Only this boolean is supplied. `DiscoveryToggleCard` disabled={isLoading}, opacity/cursor-wait are connected to isUpdatingDiscovery. Ordinary clicks on the disabled button cannot repeat submission after pending renders; the handler has no isUpdatingDiscovery guard. Do not generalize into single-flight, deduplication or concurrency ordering.
5. `recipes.ts:577–609` forwards optional fields to generated `api.recipes.byId(id).patch` and discards its result (Promise<void>). `generated/api/recipes/item/index.ts` binds the ID PATCH route and UpdateRecipeDto serializer. `generated/models/index.ts` serializeUpdateRecipeDto uses writeBooleanValue. Installed Kiota JSON writer writes true/false (including false), skips undefined unrelated properties; strings, arrays, rating/instructions remain undefined here. OpenAPI `/api/recipes/{id}` PATCH and UpdateRecipeDto agree on optional nullable boolean; no required field or special discoverability validation. This is serializer-source inspection, not an executed HTTP capture for omission/false.
6. `RecipeController.cs:150–160` forwards ID and DTO. `Dto/UpdateRecipeDto.cs` uses bool? IsDiscoverable. `RecipeService.cs:354–465` finds recipe by ID with existing U32 tracked/deletion-filter caveat, assigns IsDiscoverable only when HasValue (either true or false), and does not assign null/omitted fields. Readiness, deletion, attribution, notes/rating, name/description/ingredients/instructions/cuisine/meals are untouched by this boolean-only path. `Models/Recipe.cs` maps non-null flag/default false to is_discoverable, separately from is_ready/deleted_at; `api/database/schema.sql` declares boolean NOT NULL. SaveChangesAsync follows UpdatedAt assignment. `MapToDto` (same service, :700 onward) returns IsDiscoverable; existing GET mapping/read ownership applies. No member vote or consensus update occurs in this method; no policy for those capabilities is extracted.
7. A supplied boolean is search-relevant even when equal to storage. Before save, the method creates/marks the search sidecar index/embedding pending (clearing existing fingerprint); after save it attempts index-recipe-search with ID/fingerprint and catches/logs trigger exceptions. Reuse BSL-008/012 partial-update side effects, without indexing completion guarantees. It then awaits `ImageService.UpdateRecipeInfo` with all metadata arguments null on this path. That method reads or creates recipe.info, writes it, and does not assign discoverability; `RecipeInfo.IsDiscoverable` exists/defaults false but is not propagated here. Existing file value can remain stale; a new info defaults false. Broad controller/DTO comments claiming DB/file synchronization exceed this path (U42). LocalRecipeStore disk implementation is reused evidence; actual persistence not executed. Save precedes uncaught file failure, so rejection does not establish absence of a DB commit. No direct event publication exists in this inspected method, without a global/downstream event-absence guarantee.
8. Successful await leaves optimistic state as-is, clears pending in finally and keeps the sheet open. There is no setRecipe update, response reconciliation, completion GET, library store write or parent callback. PATCH actual RecipeDetailResponseDto bypasses success wrapping while OpenAPI/generated PATCH describes a data object (U36). Client discards both shapes. No immediate list removal/summary update or freshness/synchronization guarantee follows.
9. Catch logs Failed to toggle discovery, restores !next and finally clears pending; action label/visual state follow restored state. There is no dedicated visible error, automatic retry or unchanged-state retry loop. Another activation after restoration submits a fresh inverse for loaded ID. Local restoration is not persistence rollback/safe retry. Close/backdrop remain usable pending and library close unmounts. Reopening mounts with existing detail GET; no transport abort, PATCH cleanup, response-generation check or promise of final ordering exists. An old request may settle after close/new detail; scope completion scenarios to same mounted detail/no intervening state changes (U41), without concurrent-request guarantees.

**Main/shared-owner comparison:** Read all 31 existing library requirements/scenarios. None owns the loaded-detail discoverability control/update or enumerates that fact in persisted detail. Reuse “Return only eligible household library recipes” and “Request list pages for the selected library filter” unchanged; do not restate their rules or assert immediate list consequences. “Retrieve the selected library recipe for detail reading”, “Return persisted recipe detail for an available record” and “Apply supplied non-null recipe-detail update fields” remain owners for the surrounding seam; the new persistence requirement adds only the missing boolean and its partial-update consequences. Household-identity gate/access/member context requirements are referenced, not copied or broadened. A04 assigns vote identity/totals/consensus to recipe discovery, workflow lifecycle to background processing and SSE semantics to household live updates. Each of the six additions below fills a missing control/fact outcome only; Purpose and prior requirements remain unchanged.

### BSL-recipe-library-017 — actual assertions, fixtures and substitutions

These are inspected assertions, not current passing tests:

- **B1 — `pwa/e2e/recipes.spec.ts:606–650`**, “toggling discovery from the detail sheet calls PATCH with isDiscoverable without navigating”: enters `/recipes` Search, searches chicken and opens the top pick. Overrides GET/PATCH `**/api/recipes/*`; fixed MOCK_DETAIL_RECIPE from builders.recipe; GET/PATCH omit required updatedAt; PATCH spreads captured body into a mock response, GET always returns the old fixture. Actual poll asserts only objectContaining isDiscoverable expect.any(Boolean), then detail visible and /recipes URL retained. Does not assert exact true/false, target ID, omitted fields, initial labels/state, optimism/pending, success reconciliation, reject/restore/retry, close/reopen, storage or connected library. It is stateless mocked shared-detail evidence, not real persistence.
- **C1 — `pwa/src/components/recipes/RecipeDetailSheet.test.tsx`**, “shows only edit actions while editing and restores viewing actions on cancel”: real detail component, getRecipe/updateRecipe adapter mocked; fixture isDiscoverable false, localization returns English fallbacks, family/image helpers substituted. Asserts discovery button visible before Edit, absent in Edit and visible after Cancel. Does not activate the detail toggle or assert its boolean/labels/pending/rejection/retry/persistence. `pwa/src/lib/api/recipes.test.ts` defines a byIdPatch mock but no updateRecipe assertion; preserve BSL-009 adapter gap.
- **C2 — `pwa/src/components/recipes/StackActionBar.test.tsx`**: actual assertions in the two aria-label tests expect Turn on Discovery for this recipe for false and Turn off Discovery for this recipe for true; the first test title still says Ask the Family, so rely on its assertion. It renders the shared DiscoveryToggleCard through a different caller with mocked callbacks/fallback localization. Adjacent tests assert callback recipe-abc/true or false; StackActionBar.tsx has its own pendingValue/loadingForId/reentry guard. Those interaction/pending/rollback assertions must not be imported as detail-handler coverage. C2 provides shared-card label evidence only for this draft.
- **A1/F1 — reuse BSL-recipe-library-009 API assertion inspection:** RecipeServiceTests PATCH editable-fields/cuisine/meals cases assert HTTP 200, other fields in another scope and indexing workflow; no discoverability PATCH assertion. BSL-013's RecipeUpdateIntegrationTests asserts instructions in EF/recipe.info and workflow count, not this flag. Default TestWebApplicationFactory disables auth and substitutes InMemory EF/recipe store/orchestrator; no real DB/file/index/auth qualification. Wider isDiscoverable fixture/property occurrences are not evidence of this connected PATCH persistence. No focused assertion for boolean/null/omission/unrelated preservation, detail-read-after-toggle or file parity was identified in the inspected update tests.
- **M1 — reuse BSL-009/013 common browser handler:** common PATCH returns fixed mocked success, not a request-applied durable store. The library page unit test stubs RecipeDetailSheet; it cannot establish connected detail behavior. No new tests or application edits are authorized.

Confidence: medium overall. Source path is directly connected; labels have shared-card assertions and browser dispatch/open-sheet has a stateless Search assertion. Most behavioral edges and all discoverability storage/recovery requirements are source-only. Runtime unit/API/browser/PostgreSQL checks **not-run** A34; application TDD/client generation/live parity/database qualification **not-applicable** to documentation edits, not newly blocked.

### BSL-recipe-library-018 — draft mapping, artifact status and review handoff

A56 authorizes CLI scaffolding and this bounded proposal/delta/extraction design/tasks/plan. No unresolved consequential intent decision is needed for the supported subset; U41–U43 withhold stronger disputed/unsupported assertions under A12. Preserve BSL-recipe-library-001–015/U29–U40, BSL-018–025/U23–U28, member-creation history and BSL-015's exact historical sentence/caveat in the delta's non-normative note.

Each row maps its owning requirement and exact scenario. Step numbers mean BSL-016; C/B/A/F/M labels mean inspected BSL-017 assertions, never test passes.

| Added requirement | Exact scenario | Source support / actual assertion coverage |
| --- | --- | --- |
| Initialize the loaded-detail discoverability control | Load discoverability enabled | Steps 1–3: map/load/state/card/English labels; C2 true label in shared card; detail initialization/on graphic source-only |
| Initialize the loaded-detail discoverability control | Load discoverability disabled | Steps 1–3; C2 false label in shared card, C1 false fixture/control visibility only; detail off-state mapping source-only |
| Initialize the loaded-detail discoverability control | Load an absent discoverability value | Steps 2–3 nullish fallbacks and card strings; source-only, no absent/null/title/subtitle assertion |
| Submit the inverse discoverability state for the loaded recipe | Turn discoverability on | Steps 4–5 inverse/loaded ID/serializer; B1 asserts boolean PATCH only, no exact value/ID/omissions/optimism; C2 callback is different caller |
| Submit the inverse discoverability state for the loaded recipe | Turn discoverability off | Steps 4–5 include false serializer; same B1 limit; exact off/ID/omissions/optimism source-only |
| Persist the supplied recipe discoverability fact | Store enabled discoverability | Steps 6–7 HasValue/assignment/EF Save/MapToDto/GET; source-only, A1/F1 other-field InMemory evidence cannot qualify flag |
| Persist the supplied recipe discoverability fact | Store disabled discoverability | Step 6 false is assigned; source-only; no flag PATCH/read assertion or PostgreSQL qualification |
| Persist the supplied recipe discoverability fact | Preserve an omitted or null discoverability flag | Step 6 bool?/HasValue; source-only, no focused null/omission assertion |
| Persist the supplied recipe discoverability fact | Retain unrelated facts during a discoverability update | Steps 5–7 omission/non-null guards and separate readiness/deletion/attribution; source-only, no preservation assertion; timestamp/sidecar/file limits explicit |
| Disable the detail discoverability button while pending | Request remains pending | Steps 3–4 disabled/opacity/cursor/state; source-only; C2 different handler coverage not transferred |
| Retain the local discoverability display after success | Complete with the sheet open | Steps 8–9 adapter void/finally/no navigation/GET/callback; B1 open-sheet and URL only, not confirmed local state/re-enable/response/GET assertion |
| Restore local discoverability after rejection and allow another activation | Request rejects | Step 9 catch !next/finally/card derives label; source-only, no focused detail rejection assertion; DB commit may already exist |
| Restore local discoverability after rejection and allow another activation | Activate again after rejection | Steps 4/9 fresh inverse after pending cleared; source-only, no retry assertion or idempotency guarantee |

| Artifact | State |
| --- | --- |
| [Proposal](../openspec/changes/baseline-recipe-library-detail-discoverability/proposal.md) | Draft; documentation only |
| [Delta](../openspec/changes/baseline-recipe-library-detail-discoverability/specs/recipe-library/spec.md) | Six ADDED requirements/13 scenarios; no Purpose/MODIFIED/REMOVED/RENAMED operations |
| [Design](../openspec/changes/baseline-recipe-library-detail-discoverability/design.md) | Extraction approach/representations/risks, no application design change |
| [Tasks](../openspec/changes/baseline-recipe-library-detail-discoverability/tasks.md) | Documentation extraction/validation only; checkbox completion does not establish acceptance |
| Main / lifecycle | Recipe-library 31/63 and household-identity 36/92 unchanged; seven prior active changes retained, new eighth draft; no acceptance/promotion/archive |
| Review handoff | Human review of this bounded draft only; no successor extraction authorized |

**Checks:** selected strict validation passed (exit 0); first-pass all-item strict passed 10/10, zero failures (exit 0). Six-path `task verify` passed documentation, spec:check and content (exit 0). Bounded checks passed six requirements/13 scenarios mapped, all 60 evidence identities matching, no duplicate main headers/Purpose edits, historical note/previous evidence/approval/uncertainty rows retained, every pre-existing file except the authorized plan unchanged, index hash/deletions preserved and exactly five new artifacts/eight active changes. These checks precede the final checklist/evidence recording edits; final post-edit strict/documentation/content/preservation outcomes and tested identity are in the final response/current harness. No runtime result is attached to a source digest. Failed/blocked applicable checks: none. Runtime **not-run** under A34; behavior TDD/application suites/client generation/live parity/database qualification **not-applicable** to documentation. No services, application mutations or database access attempted.

**Additional inspected identities:** Prior 55 inputs unchanged; these five additions bring the reusable library manifest to 60 unique inputs. Digests identify source evidence, not runtime qualification.

| Input | SHA-256 |
| --- | --- |
| `pwa/src/components/recipes/DiscoveryToggleCard.tsx` | `21b426b8e855d59c7a34cd3e16da648eca1534192c8f9eb3c683ace3eec45141` |
| `pwa/src/components/recipes/StackActionBar.tsx` | `c1e5ec187b69238e583ed83e9573c9acedaac78cc7706e9a5bc4c33773d50a30` |
| `pwa/src/components/recipes/StackActionBar.test.tsx` | `8aae6e07eab7ca6e433e9edc01bd31ef2fb43981ea9fcc7ed846970b2206a0ca` |
| `pwa/src/locales/en/common.json` | `3519f2d7e0140a11786597976b6868fa195312e0bc3feb3e4d3c3e144a41d0bc` |
| `pwa/src/locales/index.ts` | `898e7367a9d83aec4e5673b5cc541fe7e6ea29211d7a2b14ed23e9b4a5a2c5ae` |

### BSL-recipe-library-019 — discoverability main-spec promotion

**Authority:** A57, user “promote”, 2026-10-15, immediately after the validated A56 draft. Authorizes exact promotion of that reviewed delta and plan/task lifecycle follow-up. No separate acceptance statement, archival, successor extraction or application work is inferred.

**Result:** Appended the exact six requirement blocks/13 scenarios from [discoverability delta](../openspec/changes/baseline-recipe-library-detail-discoverability/specs/recipe-library/spec.md) to [main recipe-library](../openspec/specs/recipe-library/spec.md), now 37 requirements/76 scenarios. All previous main bytes, including original Purpose and 31 requirements/63 scenarios, remain an exact prefix. Only ADDED requirement blocks were appended; no operation header or non-normative evidence note was copied into main.

**Evidence/preservation:** Full delta, historical BSL-015 sentence/caveat, proposal/design/metadata and BSL-recipe-library-001–018/U29–U43 evidence/limits remain unchanged. BSL-018–025/U23–U28 and historical member-creation limitations retained. All 60 source/dependency digests rechecked unchanged. Household-identity stays 36/92. All eight changes remain active; archives, index, unrelated tracked/untracked work and deletions are preserved. Promotion adds no runtime evidence and does not resolve file propagation, contract, retry, synchronization or database qualification limits.

**Checks / stop:** Main recipe-library strict validation and all-spec strict validation (2/2) passed, exit 0. Final all-item strict, three-path documentation/content, exact-append/delta-equality and full preservation outcomes are in the final response/current harness at final content identity. Failed/blocked applicable checks: none observed. Runtime unit/browser/API/PostgreSQL **not-run** under A34; application TDD, client generation, live parity and database behavior checks **not-applicable** to documentation edits. No services or application mutations executed. Stop after this promotion; no archival or successor extraction authorized.

## Drafted slice — recipe-library ordinary-household View Original

**Current lifecycle:** A58 authorizes discovering and drafting only ordinary-household View Original behavior from successfully loaded library detail, stopping at a validated draft for review.

| Field | Scope / status |
| --- | --- |
| Authority | A58: user session instruction authorizes read-only discovery, CLI scaffolding, proposal, recipe-library ADDED delta, extraction design/tasks and plan updates once supported boundary is established; stop for review |
| Identity | `moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus pre-existing staged/unstaged/untracked inputs; before-image hashes and staged diff preserved |
| Root | Read-only `openspec list --json`, `openspec list --specs --json` resolved nearest repository root `/Users/alex/Code/whats-for-supper`; schema spec-driven, no store redirection or initialization/reconfiguration |
| Main/owners | Recipe-library 37/76 and household-identity 36/92 unchanged; A04 detail-loading, displayed-hero-reference, fact/read/update and identity access/member requirements reused |
| Draft | `baseline-recipe-library-view-original`: proposal, seven ADDED requirements/17 scenarios, extraction design/tasks; validated draft for review only |
| Evidence | BSL-recipe-library-020–022; source-inspected, implementation-supported under A10, medium confidence; runtime not-run A34 |
| Exclusions | Uploading/replacing originals, selecting a new finished-dish image, hero generation/regeneration, recipe capture/import, sharing/export/download workflows, detail editing, ratings/notes submission, discoverability changes, reporting/re-import, cooking, planning, search/discovery ranking, votes/consensus, deletion/restore/purge, preference policy and demo/preview/deployment variants |

### BSL-recipe-library-020 — connected View Original availability, activation, and photo viewer semantics

**Reused evidence:** Recomputed all 60 per-file identities in the library manifests: all 60 unchanged, zero changed. Reuse BSL-recipe-library-001–019 for list/detail entry, facts, mapping and shared ownership; no rescan of unrelated capabilities.

**Ordered trace and representations:**

1. `pwa/src/components/recipes/RecipeDetailSheet.tsx:620–642` renders the View Original button when `!isEditing && (recipe.imageCount > 0 || recipe.sourceType === 'url')`. In editing mode (`isEditing === true`), the control is suppressed. When `imageCount <= 0` and `sourceType !== 'url'` (e.g. `synthesized` with zero images), the control is omitted.
2. The control displays inside the hero container at bottom-right (`absolute bottom-4 right-4`). It renders `<span>{t('recipes.viewOriginal', 'View Original')}</span>` which resolves to `"View Original"` in English (`pwa/src/locales/en/common.json:422`). It renders `<span data-testid="view-original-icon">` containing `<ExternalLink size={18} />` when `recipe.sourceType === 'url'`, and `<Images size={18} />` when `recipe.sourceType !== 'url'`.
3. Fact representation and defaults: in `Recipe.cs`, `SourceUrl` is a nullable string column `source_url`, `ImageCount` is an integer column `image_count` (default 0), and `FinishedDishIndex` is an integer column `finished_dish_index` (default -1). In `RecipeService.MapToDto(Recipe r)`, `sourceType` is computed: `!string.IsNullOrEmpty(r.SourceUrl) ? "url" : (r.ImageCount > 0 ? "photos" : "synthesized")`. In `pwa/src/lib/api/recipes.ts:165–170`, `mapRecipeDto` defaults `sourceType` to `'synthesized'`, `imageCount` to `dto.imageCount || 0`, `finishedDishIndex` to `dto.finishedDishIndex ?? -1`, and `sourceUrl` to `dto.sourceUrl ?? null`.
4. Activation branch: in `RecipeDetailSheet.tsx:624–630`:
   - If `recipe.sourceType === 'url' && recipe.sourceUrl`: calls `window.open(recipe.sourceUrl, '_blank', 'noopener,noreferrer')`. This requests opening the URL in a new browser browsing context without altering current application navigation, unmounting the detail sheet, or making an API call. External page loading success, popup blocker allowance, or URL scheme validity cannot be guaranteed (U45).
   - Else (when `recipe.sourceType !== 'url'`, or when `recipe.sourceType === 'url'` but `recipe.sourceUrl` is null/empty): calls `setShowOriginals(true)`. For a URL-imported recipe with absent URL and zero images, `OriginalPhotosViewer` mounts with `imageCount: 0`, displaying counter `1 / 0`, requesting `/api/recipes/{id}/original/undefined`, and modulo navigation produces `NaN` (U44).
5. Photo viewer mounting: `RecipeDetailSheet.tsx:1033–1039` renders `<OriginalPhotosViewer recipeId={recipe.id} imageCount={recipe.imageCount} finishedDishIndex={recipe.finishedDishIndex} onClose={() => setShowOriginals(false)} />`.
6. Image ordering: `OriginalPhotosViewer.tsx:23–31` computes `imageIndices`. Base indices are `Array.from({ length: imageCount }, (_, i) => i)`. `heroIndex` is `finishedDishIndex >= 0 && finishedDishIndex < imageCount ? finishedDishIndex : -1`. If `heroIndex !== -1`, it returns `[heroIndex, ...indices.filter((i) => i !== heroIndex)]`, placing the finished dish photo first. If `heroIndex === -1`, it returns `indices` in ascending index order `[0, ..., imageCount - 1]`.
7. Displayed image path and serving route: `OriginalPhotosViewer.tsx:105–108,180–188` sets `currentPhotoIndex = imageIndices[currentIndex]` (where `currentIndex` initializes to 0), and constructs `imageUrl = /api/recipes/${recipeId}/original/${currentPhotoIndex}` rendered via native `<img src={imageUrl} ... />`. No Kiota generated client, request wrapper, or bearer token is used.
8. API endpoint handling: in `RecipeController.cs:359–365`, `[HttpGet("{recipeId:guid}/original/{photoIndex:int}")]` is marked `[AllowAnonymous]` and has no security requirements in `specs/openapi.yaml:2068–2092`. It calls `ImageService.GetImage(recipeId, photoIndex)`, which delegates to `IRecipeStore.ReadOriginalImageAsync(recipeId, photoIndex)`. `LocalRecipeStore.cs:84–94` resolves `{Root}/{recipeId}/original/{index}.{ext}` checking `.jpg`, `.png`, `.webp`. If found, it returns HTTP 200 `File(stream, contentType)`. If not found, `ImageService` throws `KeyNotFoundException`, translated to HTTP 404 by `ErrorHandlingMiddleware.cs:35`.
9. Photo navigation and wrapping: `OriginalPhotosViewer.tsx:54–64,213–261` provides desktop chevrons (`hidden sm:contents`), mobile pager chevrons (`sm:hidden`), pager dot buttons, and window `keydown` listeners (`ArrowRight` calls `handleNext`, `ArrowLeft` calls `handlePrev`). Next advances `currentIndex` via `(prev + 1) % imageIndices.length`, wrapping from last to first. Prev decrements `currentIndex` via `(prev - 1 + imageIndices.length) % imageIndices.length`, wrapping from first to last. Navigation resets `scale` to 1 if `scale > 1`. Activating dot `idx` sets `direction` and `currentIndex` to `idx`.
10. Zooming and panning: `OriginalPhotosViewer.tsx:34–52,66–89,164–210` initializes `scale = 1`. Activating the zoom button (bottom right) or clicking the photo toggles between scale 1 and scale 2.5 (`toggleZoom`). At scale 1, the button displays `<Maximize2 size={24} />`. At scale > 1, the button displays `<Minimize2 size={20} />` and `"Fit to Screen"`. Framer-motion `<motion.div drag={scale > 1} dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }} ...>` enables dragging only when `scale > 1`. Two-finger pinch touch gestures in `handleTouchMove` calculate touch distance delta and clamp scale between 1 and 5. Returning to scale 1 animates back to `{ scale: 1, x: 0, y: 0 }`.
11. Dismissal and absence of side effects: clicking the close button (`data-testid="action-close-viewer"`) or pressing `Escape` triggers `onClose()`, which calls `setShowOriginals(false)` in `RecipeDetailSheet`. The viewer unmounts and the detail sheet remains open in its loaded viewing state. Viewing, navigating, zooming, panning, or dismissing performs no data mutation (no POST/PATCH/DELETE), no selection persistence in storage, no detail refetch (no GET `/api/recipes/{id}`), and no live stream notification. Reopening mounts fresh with `currentIndex = 0` and `scale = 1`.

### BSL-recipe-library-021 — actual assertion coverage and substitutions

Inspected assertions, not executed tests:

- **C1 — `pwa/src/components/recipes/RecipeDetailSheet.test.tsx`**:
  - Line 101, `renders Share in the visible action slot while keeping View Original separate`: asserts `screen.getByTestId('action-view-original')` is visible.
  - Line 502, `hides action-view-original for synthesized recipes with no source URL`: fixture `sourceType: 'synthesized'`, `imageCount: 0`, `sourceUrl: null`; asserts `action-view-original` is null (`expect(screen.queryByTestId('action-view-original')).toBeNull()`).
  - Line 531, `shows action-view-original with ExternalLink icon for url-type recipes`: fixture `sourceType: 'url'`, etc.; asserts `action-view-original` is visible, contains text `/View Original/i`, and has child `[data-testid="view-original-icon"]`. Does not assert click, `window.open`, or icon type difference.
- **B1 — `pwa/e2e/recipe-original-viewer.spec.ts`**:
  - Line 73, `View Original is hidden for synthesized description-only recipes`: mocks recipe `sourceType: 'synthesized'`, `imageCount: 0`, `sourceUrl: null`; asserts `action-view-original` is not visible.
  - Line 83, `View Original shows ExternalLink icon and opens URL for URL-based recipes`: mocks `sourceType: 'url'`, `sourceUrl: 'https://example.com/test-recipe'`, `imageCount: 0`; asserts `action-view-original` is visible, contains text 'View Original', and icon is visible. Does not click or assert `window.open`.
  - Line 99, `View Original shows Images icon and opens viewer for photo-based recipes`: mocks `sourceType: 'photos'`, `imageCount: 2`, `sourceUrl: null`; asserts `action-view-original` is visible, clicks it, and asserts `page.getByTestId('action-close-viewer')` is visible. Does not assert photo ordering, chevrons, keyboard controls, zoom, gestures, or dismissal return state.
- **A1 — `api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs:440–459`**, `GetImage_Returns_Image_Binary`: writes fake image to store at index 0, calls GET `/api/recipes/{recipeId}/original/0`, asserts HTTP 200 OK, ContentType `image/jpeg`, and binary length > 0. Does not assert 404 response for missing index or nonexistent recipe.
- **F1 — `TestWebApplicationFactory.cs`**: substitutes in-memory `IRecipeStore` (`InMemoryRecipeStore.cs`); does not test real disk filesystem access or PostgreSQL.
- **M1 — `pwa/e2e/mock-api.ts`**: provides mock recipe builders; Playwright tests use route mocking without live backend services.

Confidence: medium overall. Connected source path is clear and consistent across component, viewer, and API controller; existing unit and browser tests cover button visibility, label, and viewer opening, but leave gestures, photo ordering, navigation wrapping, zoom toggling, keyboard shortcuts, and 404 handling source-supported without focused test assertions. Runtime unit/browser/API/PostgreSQL checks **not-run** under A34; application TDD/client generation/database qualification **not-applicable** to documentation edits.

### BSL-recipe-library-022 — draft mapping, artifact status and review handoff

A58 authorizes CLI scaffolding and this bounded proposal, recipe-library delta, extraction design, tasks, and plan updates. No unresolved intent decision is needed for the supported subset; U44–U47 withhold stronger disputed/unsupported assertions under A12. Preserve BSL-recipe-library-001–019/U29–U43, BSL-018–025/U23–U28, member-creation history and BSL-015's exact historical sentence/caveat in the delta's non-normative note.

Each row maps its owning requirement and exact scenario. Step numbers mean BSL-recipe-library-020; C/B/A/F/M labels mean inspected BSL-recipe-library-021 assertions.

| Added requirement | Exact scenario | Source support / actual assertion coverage |
| --- | --- | --- |
| Offer View Original control for eligible loaded library recipes | Offer URL original control | Steps 1–3: `!isEditing && sourceType === 'url'`, ExternalLink icon, English label; B1/C1 visibility and label assertions; ExternalLink vs Images icon selection source-only |
| Offer View Original control for eligible loaded library recipes | Offer photo original control | Steps 1–3: `!isEditing && imageCount > 0`, Images icon, English label; B1 visible/click assertion; Images icon selection source-only |
| Offer View Original control for eligible loaded library recipes | Hide control while editing | Step 1: `!isEditing` guard; source-only, no dedicated test asserts entering edit mode hides View Original |
| Offer View Original control for eligible loaded library recipes | Hide control for recipes without original source or images | Step 1: `imageCount <= 0 && sourceType !== 'url'`; C1 line 502 and B1 line 73 assert `action-view-original` not visible |
| Open external source URL in a new browser context | Open external URL in a new context | Step 4: `recipe.sourceType === 'url' && recipe.sourceUrl` calls `window.open(..., '_blank', 'noopener,noreferrer')`; source-only, B1 asserts button presence without click or popup verification |
| Present original photos in the photo viewer overlay | Open photo viewer with finished dish first | Steps 5–6: `imageIndices` orders `finishedDishIndex` first when in bounds; source-only, no test asserts index reordering |
| Present original photos in the photo viewer overlay | Open photo viewer with sequential ordering | Steps 5–6: `imageIndices` returns `[0, ..., imageCount - 1]` when `finishedDishIndex` is -1 or out of bounds; source-only, B1 line 99 asserts viewer opening only |
| Present original photos in the photo viewer overlay | Open photo viewer as fallback for absent source URL | Step 4: `else` branch calls `setShowOriginals(true)` when `sourceUrl` is null/empty; source-only, no test asserts absent URL fallback |
| Navigate between original photos with wrapping | Advance to next photo with wrapping | Step 9: `handleNext` advances index modulo `length` and resets scale; source-only, no test asserts next chevron or ArrowRight |
| Navigate between original photos with wrapping | Return to previous photo with wrapping | Step 9: `handlePrev` decrements index modulo `length` and resets scale; source-only, no test asserts prev chevron or ArrowLeft |
| Navigate between original photos with wrapping | Select photo via pager indicator | Step 9: pager dot click sets direction and index; source-only, no test asserts pager dot selection |
| Support photo zooming and panning | Toggle zoom with control or image activation | Step 10: `toggleZoom` sets scale 2.5, enables drag with constraints, button shows Fit to Screen; source-only, no zoom assertion |
| Support photo zooming and panning | Reset zoom to fit to screen | Step 10: scale > 1 click or button resets scale 1 and centers image; source-only, no zoom-reset assertion |
| Dismiss photo viewer and retain detail state | Dismiss viewer via close button | Step 11: `onClose` calls `setShowOriginals(false)`, unmounting viewer and retaining detail sheet; B1 line 116 asserts close button visibility without click |
| Dismiss photo viewer and retain detail state | Dismiss viewer via Escape key | Step 11: keydown Escape listener calls `onClose`; source-only, no keyboard dismissal assertion |
| Dismiss photo viewer and retain detail state | Reopen photo viewer after dismissal | Step 11: `showOriginals` toggle mounts fresh viewer at index 0 and scale 1; source-only, no reopen assertion |
| Serve raw original photo image binary | Serve raw original photo binary | Steps 7–8: GET `/api/recipes/{id}/original/{index}` with `[AllowAnonymous]` returns HTTP 200 with MIME stream; A1 asserts 200 OK and binary length for seeded index 0 |
| Serve raw original photo image binary | Return not found for nonexistent photo | Step 8: `ImageService` throws `KeyNotFoundException`, middleware returns HTTP 404; source-only, no 404 assertion in controller tests |

| Artifact | State |
| --- | --- |
| [Proposal](../openspec/changes/baseline-recipe-library-view-original/proposal.md) | Draft; documentation only |
| [Delta](../openspec/changes/baseline-recipe-library-view-original/specs/recipe-library/spec.md) | Seven ADDED requirements/18 scenarios; no Purpose/MODIFIED/REMOVED/RENAMED operations |
| [Design](../openspec/changes/baseline-recipe-library-view-original/design.md) | Extraction approach/representations/risks, no application design change |
| [Tasks](../openspec/changes/baseline-recipe-library-view-original/tasks.md) | Documentation extraction/validation only; checkbox completion does not establish acceptance |
| Main / lifecycle | Recipe-library promoted to 44/94 (A59) and household-identity 36/92 unchanged; all nine changes remain active; no archival |
| Review handoff | Human review completed; promoted under A59; no successor extraction authorized |

**Checks:** selected strict validation passed (exit 0); all-item strict passed 11/11, zero failures (exit 0). Six-path `task verify` passed documentation, spec:check and content (exit 0). Bounded checks passed seven requirements/18 scenarios mapped, all 60 prior evidence identities matching, no duplicate main headers/Purpose edits, historical note/previous evidence/approval/uncertainty rows retained, every pre-existing file except the authorized plan unchanged, index hash/deletions preserved and exactly five new artifacts/nine active changes. These checks precede the final checklist/evidence recording edits; final post-edit strict/documentation/content/preservation outcomes and tested identity are in the final response/current harness. No runtime result is attached to a source digest. Failed/blocked applicable checks: none. Runtime **not-run** under A34; behavior TDD/application suites/client generation/live parity/database qualification **not-applicable** to documentation. No services, application mutations or database access attempted.

**Additional inspected identities:** Prior 60 inputs unchanged; these five additions bring the reusable library manifest to 65 unique inputs. Digests identify source evidence, not runtime qualification.

| Input | SHA-256 |
| --- | --- |
| `pwa/src/components/recipes/OriginalPhotosViewer.tsx` | `31cd87fa5cf47dca80148c5bcd6298b674e15eb7f5c2b79cf99c5ed6c1869236` |
| `pwa/e2e/recipe-original-viewer.spec.ts` | `71fdec75120c87150e92f9055e6e6f4c8fb2bbeab788c085ec1b575f4eb48d5e` |
| `api/src/RecipeApi/Infrastructure/IRecipeStore.cs` | `3e75a0ee6f4b2e16f4319d13edfcd50baf7340288b46ddc53dfab2b288a8204d` |
| `api/src/RecipeApi/Infrastructure/InMemoryRecipeStore.cs` | `cbfd7fcc70656d85dea89be8941d360f69ef1a622badf73e2ab5e719867cdcbb` |
| `pwa/src/locales/fr/common.json` | `b5d957a8f395091038e1c3ab64fed1b300cd7f015e0e11172ed1cba611d4e198` |

### BSL-recipe-library-023 — View Original main-spec promotion

**Authority:** A59, user “promote”, 2026-10-15, immediately after the validated A58 draft. Authorizes exact promotion of that reviewed delta and plan/task lifecycle follow-up. No separate acceptance statement, archival, successor extraction or application work is inferred.

**Result:** Appended the exact seven requirement blocks/18 scenarios from [View Original delta](../openspec/changes/baseline-recipe-library-view-original/specs/recipe-library/spec.md) to [main recipe-library](../openspec/specs/recipe-library/spec.md), now 44 requirements/94 scenarios. All previous main bytes, including original Purpose and 37 requirements/76 scenarios, remain an exact prefix. Only ADDED requirement blocks were appended; no operation header or non-normative evidence note was copied into main.

**Evidence/preservation:** Full delta, historical BSL-015 sentence/caveat, proposal/design/metadata and BSL-recipe-library-001–022/U29–U47 evidence/limits remain unchanged. BSL-018–025/U23–U28 and historical member-creation limitations retained. All 65 source/dependency digests rechecked unchanged. Household-identity stays 36/92. All nine changes remain active; archives, index, unrelated tracked/untracked work and deletions are preserved. Promotion adds no runtime evidence and does not resolve absent URL, external navigation, native image error or gesture limits.

**Checks / stop:** Main recipe-library strict validation and all-spec strict validation (2/2) passed, exit 0. Final all-item strict, three-path documentation/content, exact-append/delta-equality and full preservation outcomes are in the final response/current harness at final content identity. Failed/blocked applicable checks: none observed. Runtime unit/browser/API/PostgreSQL **not-run** under A34; application TDD, client generation, live parity and database behavior checks **not-applicable** to documentation edits. No services or application mutations executed. Stop after this promotion; no archival or successor extraction authorized.

### BSL-recipe-library-024 — Ordinary-household recipe deletion, Recycle Bin, restore, and PIN-protected purge discovery

**Behavior and actor:** An authenticated household member in viewing mode moves a loaded recipe to the Recycle Bin (`action-move-to-bin`), views deleted recipes in the Recycle Bin bottom sheet opened from the library browse header (`recycle-bin-entry`), restores a soft-deleted recipe back to active library listings (`action-restore-${id}`), or permanently purges a soft-deleted recipe by submitting the elevated actions PIN (`action-purge-${id}`).

**Entry state / trigger / observable outcome:**
1. Loaded detail sheet Move to Bin trigger: when `!isLoading && recipe && !isEditing` in `RecipeDetailSheet.tsx:579–588`, `ActionGearMenu` is rendered (`action-gear-menu`). Opening the gear menu reveals `action-move-to-bin` with a trash icon. Clicking it immediately invokes `handleMoveToBin()` without a secondary confirmation prompt.
2. Soft-delete request and active-planner conflict check: `deleteRecipe(recipe.id)` sends `DELETE /api/recipes/{id}`. `RecipeController.Delete` reads `familyMemberId` (defaulting to `Guid.Empty` if omitted) and calls `RecipeService.SoftDeleteRecipe`. The service queries `db.CalendarEvents.Where(e => e.RecipeId == id && e.Date >= today)`. If any active or future calendar events exist, it returns HTTP 409 Conflict with `{ errorCode: "RECIPE_ASSIGNED_TO_PLANNER", message: "...", assignedDays: [...] }`. Past calendar events (`Date < today`) are ignored.
3. Soft-delete persistence and search doc cleanup: when unassigned to active slots, the service sets `recipe.DeletedAt = DateTimeOffset.UtcNow` and `recipe.DeletedBy = deletedBy`. It finds and removes the `RecipeSearchDocuments` row for `id` synchronously, then calls `db.SaveChangesAsync()`. It returns HTTP 200 with the soft-deleted recipe detail response (`deletedAt` populated). No background workflow is triggered and no SSE event is emitted.
4. Detail dismissal and library list refresh: on success, `handleMoveToBin` invokes `onDeleted?.()` and `onClose()`. In `RecipesPage` (`recipes/page.tsx:891–893`), `onDeleted` calls `runSearch(...)`, refreshing the active recipe query and removing the deleted recipe card from view without page navigation or URL changes. On failure (e.g. 409 Conflict or network error), the catch block logs `console.error('Failed to move recipe to bin', error)`, no user-facing toast or inline banner is shown, and the detail sheet remains open (U48).
5. Global query filtering on soft-deleted recipes: `RecipeDbContext.cs:81` configures `entity.HasQueryFilter(e => e.DeletedAt == null)` on `Recipes`. This filter automatically excludes soft-deleted recipes from standard queries: `GET /api/recipes` (paged list), `POST /api/recipes/search` (search queries), and `GET /api/recipes/{id}` (returning HTTP 404 NotFound).
6. Recycle Bin sheet presentation and listing: in `browse-all-stack/page.tsx:675–684`, the header provides `data-testid="recycle-bin-entry"` with the `Recycle` icon. Clicking it sets `isTrashOpen(true)`, rendering `RecycleBinSheet.tsx`. The sheet mounts with `isLoading = true`, showing a loading indicator, and calls `getTrashItems()` (`GET /api/recipes/trash`). `RecipeService.GetTrash()` uses `.IgnoreQueryFilters().Where(r => r.DeletedAt != null).OrderByDescending(r => r.DeletedAt)`. If empty, the sheet displays "Your Recycle Bin is empty." If populated, it renders `trash-list` with each item's name (or "Unknown Recipe"), localized deletion date, Restore button (`action-restore-${id}`), and Delete button (`action-purge-${id}`).
7. Restore execution and side effects: clicking Restore sends `POST /api/recipes/{id}/restore`. `RecipeService.RestoreRecipe` locates the recipe with `IgnoreQueryFilters()`, clears `DeletedAt` and `DeletedBy` to null, updates `UpdatedAt`, and saves changes. It then triggers the background workflow `index-recipe-search` with `recipeId` and source fingerprint (wrapped in a non-fatal try/catch). It returns HTTP 200 with restored recipe detail. On success, `RecycleBinSheet` removes the item from local state. The recipe immediately becomes visible in standard library reads and search. No SSE broadcast occurs (U49).
8. Elevated PIN dialog and permanent purge: clicking Delete (`action-purge-${id}`) opens `elevated-pin-dialog`. The dialog renders a destructive warning, a password PIN input, a Cancel button, and a Delete Forever button (disabled when PIN is empty or submitting). Submitting sends `DELETE /api/recipes/{id}/purge` with `X-Elevated-Pin`.
9. Purge verification, filesystem asset deletion, and database cascade: `RecipePurgeService.PurgeAsync` checks `ELEVATED_ACTIONS_PIN` from the environment. If unconfigured, returns 503 `PIN_NOT_CONFIGURED`. If the provided PIN does not match, returns 403 `FORBIDDEN`. If the recipe is not found, returns 404. If `recipe.DeletedAt == null`, returns 409 `NOT_IN_TRASH`. Inside a database transaction, it cancels pending index jobs (`WorkflowStatus.Failed`), removes `RecipeSearchDocuments`, `RecipeVotes`, and all `CalendarEvents` (both past and future). It recursively deletes the recipe directory on disk (`RecipesRootResolver.Root/{id}`) before removing the recipe from the database. On success, returns HTTP 200 `{ data: { purged: true } }`. The client removes the item from the bin list and closes the dialog. On error, the dialog stays open and displays a generic error message (U51).

**Business rule and eligibility:**
- Soft-delete: available on any loaded recipe in viewing mode; blocked if scheduled on or after the current date; persists deletion timestamp and member attribution.
- Recycle Bin: accessible from the browse library header; lists all soft-deleted recipes in descending deletion date order.
- Restore: re-includes recipe in active library listings and triggers search index re-indexing.
- Permanent Purge: restricted to recipes already in the Recycle Bin; requires server-configured elevated PIN; deletes filesystem directory assets and all related database records.

**Failure / cancellation / recovery behavior:**
- Soft-delete failure (e.g. 409 Conflict): logs to console, keeps sheet open and recipe visible; no user-facing error message (U48).
- PIN dialog cancellation: dismisses dialog without sending purge request.
- Purge rejection: displays inline error message in dialog; item remains in Recycle Bin.

**Configuration and time assumptions:**
- `ELEVATED_ACTIONS_PIN` environment variable controls purge authorization.
- Deletion timestamps use UTC (`DateTimeOffset.UtcNow`).
- Active planner conflict evaluates `CalendarEvent.Date >= DateOnly.FromDateTime(DateTime.UtcNow)`.

**Ordered trace:**
- Detail sheet: `RecipeDetailSheet.tsx` (action gear menu `action-move-to-bin`) → `handleMoveToBin` → client `deleteRecipe(id)` → `DELETE /api/recipes/{id}` → `RecipeController.Delete` → `RecipeService.SoftDeleteRecipe` → `RecipeDbContext.Recipes` / `RecipeSearchDocuments`
- Recycle Bin view: `browse-all-stack/page.tsx` (`recycle-bin-entry`) → `RecycleBinSheet.tsx` → client `getTrashItems()` → `GET /api/recipes/trash` → `RecipeController.GetTrash` → `RecipeService.GetTrash` → `RecipeDbContext.Recipes.IgnoreQueryFilters()`
- Restore: `RecycleBinSheet.tsx` (`action-restore-${id}`) → `restoreRecipe(id)` → `POST /api/recipes/{id}/restore` → `RecipeController.Restore` → `RecipeService.RestoreRecipe` → `SearchFingerprintService` / `IWorkflowOrchestrator`
- Purge: `RecycleBinSheet.tsx` (`action-purge-${id}` → `elevated-pin-dialog`) → `purgeRecipe(id, pin)` → `DELETE /api/recipes/{id}/purge` with `X-Elevated-Pin` → `RecipeController.Purge` → `RecipePurgeService.PurgeAsync` → `RecipesRootResolver` / filesystem `Directory.Delete` / `RecipeDbContext` transaction

**Relevant source files and symbols:**
- `pwa/src/components/recipes/RecipeDetailSheet.tsx` (`handleMoveToBin`, `ActionGearMenu` render)
- `pwa/src/components/recipes/ActionGearMenu.tsx` (`action-move-to-bin`, `handleMoveToBin`)
- `pwa/src/components/recipes/RecycleBinSheet.tsx` (`RecycleBinSheet`, `handleRestore`, `handlePinSubmit`, `openPinDialog`)
- `pwa/src/lib/api/recipes.ts` (`deleteRecipe`, `getTrashItems`, `restoreRecipe`, `purgeRecipe`, `TrashItem`)
- `pwa/src/app/(app)/recipes/page.tsx` (`onDeleted` callback and `runSearch` refresh)
- `pwa/src/app/(app)/browse-all-stack/page.tsx` (`recycle-bin-entry` trigger, `isTrashOpen` state)
- `api/src/RecipeApi/Controllers/RecipeController.cs` (`Delete`, `GetTrash`, `Restore`, `Purge`)
- `api/src/RecipeApi/Services/RecipeService.cs` (`SoftDeleteRecipe`, `GetTrash`, `RestoreRecipe`)
- `api/src/RecipeApi/Services/RecipePurgeService.cs` (`PurgeAsync`, `CancelPendingIndexJobsAsync`, `DeleteRecipeDirectory`)
- `api/src/RecipeApi/Data/RecipeDbContext.cs` (`HasQueryFilter(e => e.DeletedAt == null)`)
- `api/src/RecipeApi/Models/Recipe.cs` (`DeletedAt`, `DeletedBy`)
- `specs/openapi.yaml` (`DELETE /api/recipes/{id}`, `GET /api/recipes/trash`, `POST /api/recipes/{id}/restore`, `DELETE /api/recipes/{id}/purge`)

**Relevant test assertions and substitutions:**
- `RecipeSoftDeleteIntegrationTests.cs`: asserts `DELETE /api/recipes/{id}` sets `deleted_at`, returns 200, excludes from `GET /api/recipes`, detail 404, excludes from search, removes search doc, includes in trash, returns 409 Conflict when assigned to active planner; asserts `GetTrash` returns soft-deleted recipes; asserts `Restore` clears `deleted_at`, re-includes in active reads/search, and removes from trash.
- `RecipePurgeIntegrationTests.cs`: asserts `Purge` removes DB row, returns 200 `{ purged: true }`, rejects 409 when not in trash, rejects 403 on missing/incorrect PIN, rejects 503 when PIN unconfigured, removes search doc, cancels pending index workflows, removes votes/calendar events, and recursively deletes recipe directory from disk.
- `recipes/page.test.tsx`: asserts moving recipe to bin closes detail sheet, refreshes search results, and keeps sheet open without refresh on failure.
- `search-hardening.spec.ts`: E2E soft-delete, trash verification, restore, and PIN purge with success/error verification.
- `browse-all-stack.spec.ts`: asserts recycle-bin-entry visibility and opening trash view.

**Evidence class and confidence:** Implementation-supported; confidence high for endpoint, query filtering, and dialog mechanics; medium for unasserted multi-client synchronization.

**Check command / outcome / environment / content identity:** Runtime not-run under A34; implementation-supported under A10. Checked with source snapshot `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`.

**Open question or explicit limitation:** U48–U52 record confirmation omission, silent soft-delete rejection, absence of live SSE, generic purge error UI, and missing RecycleBinSheet unit tests.

**Disposition:** drafted under A60.

### BSL-recipe-library-025 — Recipe deletion, Recycle Bin, restore, and PIN purge assertion review

**Inspected test assertions and coverage boundaries:**
- `api/src/RecipeApi.Tests/Integration/RecipeSoftDeleteIntegrationTests.cs`:
  - `Delete_SetsDeletedAt_On_Recipe_Row`: asserts `DELETE /api/recipes/{id}` returns HTTP 200 and sets `DeletedAt` on entity with `IgnoreQueryFilters()`.
  - `Delete_Returns200_With_SoftDeleted_RecipeBody`: asserts HTTP 200 payload returns `{ id, deletedAt }`.
  - `Delete_Removes_Recipe_From_Active_Library`: asserts deleted recipe ID is absent from `GET /api/recipes`.
  - `Delete_Makes_RecipeDetail_Return404`: asserts `GET /api/recipes/{id}` returns HTTP 404 after soft-delete.
  - `Delete_Removes_Recipe_From_Search_Results`: asserts deleted recipe is excluded from `POST /api/recipes/search`.
  - `Delete_Removes_SearchDocument`: asserts corresponding `RecipeSearchDocuments` row is removed.
  - `Delete_Includes_Recipe_In_Trash`: asserts deleted recipe is present in `GET /api/recipes/trash` items.
  - `Delete_Returns409_When_Recipe_Is_Assigned_To_Planner`: asserts `DELETE` returns HTTP 409 Conflict with `RECIPE_ASSIGNED_TO_PLANNER` and `assignedDays` when scheduled for `tomorrow`.
  - `GetTrash_Returns_All_SoftDeleted_Recipes`: asserts `GET /api/recipes/trash` lists multiple soft-deleted recipes.
  - `Restore_Clears_DeletedAt_And_Returns_Recipe`: asserts `POST /api/recipes/{id}/restore` returns 200 and sets `DeletedAt = null`.
  - `Restore_ReIncludes_Recipe_In_Active_Surfaces`: asserts restored recipe appears in `GET /api/recipes` and `POST /api/recipes/search`.
  - `Restore_Removes_Recipe_From_Trash`: asserts restored recipe is omitted from `GET /api/recipes/trash`.
- `api/src/RecipeApi.Tests/Integration/RecipePurgeIntegrationTests.cs`:
  - `Purge_RemovesRecipeRow_FromDatabase`: asserts `DELETE /api/recipes/{id}/purge` with valid PIN removes DB entity row.
  - `Purge_Returns200_WithPurgedTrue`: asserts response is `{ data: { purged: true } }`.
  - `Purge_Returns409_WhenRecipeIsNotInTrash`: asserts 409 Conflict when recipe `DeletedAt` is null.
  - `Purge_Returns403_WhenPinHeaderMissing`: asserts 403 Forbidden without `X-Elevated-Pin` header.
  - `Purge_Returns403_WhenPinIsWrong`: asserts 403 Forbidden with incorrect PIN.
  - `Purge_TrimsConfiguredPinAndHeaderValue`: asserts trimming whitespace around PIN.
  - `Purge_Returns503_WhenPinEnvVarNotConfigured`: asserts 503 `PIN_NOT_CONFIGURED` when env var is null.
  - `Purge_RemovesSearchDocument_FromDatabase`: asserts search doc removed during purge.
  - `Purge_CancelsPendingWorkflowInstances_ForRecipe`: asserts pending index jobs are cancelled.
  - `Purge_RemovesRealisticTrashDependencies_AndRecipeDirectory`: asserts directory deleted from disk, search doc removed, votes removed, calendar events removed.
- `pwa/src/app/(app)/recipes/page.test.tsx`:
  - `refreshes %s results after moving a recipe to the bin without navigating`: asserts clicking `action-gear-menu` → `action-move-to-bin` calls `mocks.deleteRecipe(id)`, closes sheet, removes card, and re-executes `searchRecipes` with current filter parameters.
  - `keeps the recipe available and the detail sheet open when moving to the bin fails`: asserts rejected `deleteRecipe` logs to `console.error`, leaves detail sheet open and recipe card in document, with no search re-execution.
- `pwa/src/components/recipes/ActionGearMenu.test.tsx`:
  - Asserts `action-move-to-bin` renders in dropdown and invoking it calls `onMoveToBin()`.
- `pwa/e2e/search-hardening.spec.ts`:
  - Scenario: moves recipe to bin from `/recipes`, navigates to `/browse-all-stack`, clicks `recycle-bin-entry`, verifies `trash-list` and `trash-item-${id}`, clicks `action-restore-${id}`, verifies item removed.
  - Scenario: opens bin, clicks `action-purge-${id}`, enters PIN into `elevated-pin-dialog`, submits, verifies dialog closes and item removed.
  - Scenario: incorrect PIN in dialog shows `elevated-pin-error` and keeps item in list.
- `pwa/e2e/browse-all-stack.spec.ts`:
  - Asserts `recycle-bin-entry` button visibility and click opening `trash-list`.

**Evidence class and confidence:** Implementation-supported; integration and E2E assertions provide high confidence for API routes, PIN validation, DB/file purge, and sheet interaction; medium for unasserted multi-client synchronization.

**Open question or explicit limitation:** U48–U52.

**Disposition:** drafted under A60.

### BSL-recipe-library-026 — Recipe deletion, Recycle Bin, restore, and PIN purge baseline proposal and draft

**Authority:** A60 session instruction, 2026-10-15. Authorizes discovery and drafting only ordinary-household recipe deletion (Move to Bin / soft-delete), Recycle Bin listing, recipe restore, and PIN-protected permanent purge behavior. Stop at validated draft for human review; no application changes, promotion, archival, or successor extraction.

**Artifacts produced:**
| Artifact | Status |
| --- | --- |
| [Proposal](../openspec/changes/baseline-recipe-library-deletion-restore-purge/proposal.md) | Draft; documentation only |
| [Delta](../openspec/changes/baseline-recipe-library-deletion-restore-purge/specs/recipe-library/spec.md) | 11 ADDED requirements/28 scenarios; no Purpose/MODIFIED/REMOVED/RENAMED operations |
| [Design](../openspec/changes/baseline-recipe-library-deletion-restore-purge/design.md) | Technical extraction approach, representations, and risks; no application design change |
| [Tasks](../openspec/changes/baseline-recipe-library-deletion-restore-purge/tasks.md) | Documentation extraction/validation checklist only; checkbox completion does not establish acceptance |
| Main / lifecycle | Recipe-library 44/94 and household-identity 36/92 unchanged; all ten changes remain active; no archival |
| Review handoff | Human draft review pending; promotion and archival require separate authorization |

**Requirements and scenario mapping:**
1. `Offer Move to Bin control for loaded library recipe detail`:
   - `Access Move to Bin from the detail gear menu`: `RecipeDetailSheet.tsx:579–588`, `ActionGearMenu.tsx:84–93`, `ActionGearMenu.test.tsx:21–52`, `recipes/page.test.tsx:740–741`.
   - `Trigger Move to Bin immediately without confirmation`: `RecipeDetailSheet.tsx:309–321`, `ActionGearMenu.tsx:34–37`, `recipes/page.test.tsx:781–786`, `recipes.spec.ts:190–192`.
2. `Soft-delete the loaded recipe when not assigned to active planner slots`:
   - `Soft-delete unassigned recipe successfully`: `RecipeController.cs:412–436`, `RecipeService.cs:616–640`, `RecipeSoftDeleteIntegrationTests.cs:32–60`, `specs/openapi.yaml:1750–1772`.
   - `Record actor and timestamp on soft-deleted recipe`: `RecipeService.cs:630–631`, `RecipeSoftDeleteIntegrationTests.cs:32–44`.
3. `Reject soft-delete when recipe is assigned to active planner slots`:
   - `Reject deletion of scheduled recipe with Conflict`: `RecipeService.cs:621–628`, `RecipeController.cs:422–428`, `RecipeSoftDeleteIntegrationTests.cs:139–151`, `specs/openapi.yaml:1759–1772`.
   - `Retain recipe availability on deletion rejection`: `RecipeService.cs:627–628`, `RecipeSoftDeleteIntegrationTests.cs:139–151`.
4. `Synchronize library view and dismiss detail after deletion`:
   - `Dismiss detail sheet and refresh library on deletion success`: `RecipeDetailSheet.tsx:313–315`, `recipes/page.tsx:891–893`, `recipes/page.test.tsx:754–814`, `recipes.spec.ts:187–198`.
   - `Retain detail sheet and library state on deletion failure`: `RecipeDetailSheet.tsx:316–318`, `recipes/page.test.tsx:816–831`.
5. `Exclude soft-deleted recipes from standard library listings and search`:
   - `Exclude soft-deleted recipe from standard paged library reads`: `RecipeDbContext.cs:81`, `RecipeSoftDeleteIntegrationTests.cs:64–75`.
   - `Exclude soft-deleted recipe from recipe search results`: `RecipeService.cs:633–636`, `RecipeSoftDeleteIntegrationTests.cs:92–119`.
   - `Return NotFound for soft-deleted recipe detail lookup`: `RecipeDbContext.cs:81`, `RecipeSoftDeleteIntegrationTests.cs:78–88`.
6. `Open Recycle Bin sheet from library browse header`:
   - `Present Recycle Bin sheet from browse header trigger`: `browse-all-stack/page.tsx:675–696`, `browse-all-stack/page.test.tsx:990–1005`, `browse-all-stack.spec.ts:742–747`.
   - `Dismiss Recycle Bin sheet back to browse view`: `RecycleBinSheet.tsx:94–110`, `browse-all-stack/page.tsx:696`, `browse-all-stack/page.test.tsx:1006–1011`.
7. `List soft-deleted recipes in Recycle Bin`:
   - `Show loading indicator while retrieving trash items`: `RecycleBinSheet.tsx:21–44, 114–117`.
   - `Display empty bin message when no recipes are deleted`: `RecycleBinSheet.tsx:120–127`.
   - `Render soft-deleted recipes with name, date, and actions`: `RecycleBinSheet.tsx:128–166`, `RecipeService.cs:643–658`, `RecipeSoftDeleteIntegrationTests.cs:122–135, 154–171`.
8. `Restore soft-deleted recipe to active library`:
   - `Restore soft-deleted recipe to active status`: `RecycleBinSheet.tsx:46–60`, `recipes.ts:685–687`, `RecipeController.cs:447–459`, `RecipeService.cs:661–671`, `RecipeSoftDeleteIntegrationTests.cs:174–218`.
   - `Trigger search index re-indexing upon recipe restore`: `RecipeService.cs:673–687`.
   - `Remove restored recipe from trash list view`: `RecycleBinSheet.tsx:50`, `RecipeSoftDeleteIntegrationTests.cs:220–234`, `search-hardening.spec.ts:248–252`.
9. `Present elevated PIN dialog for permanent purge`:
   - `Open PIN confirmation dialog for selected trash recipe`: `RecycleBinSheet.tsx:62–64, 172–229`, `search-hardening.spec.ts:269–272`.
   - `Dismiss PIN dialog on cancel without sending request`: `RecycleBinSheet.tsx:66–68, 209–216`.
10. `Permanently purge soft-deleted recipe with valid elevated PIN`:
    - `Purge recipe, filesystem assets, and dependencies with valid PIN`: `RecycleBinSheet.tsx:70–80`, `recipes.ts:689–702`, `RecipeController.cs:462–480`, `RecipePurgeService.cs:17–110`, `RecipePurgeIntegrationTests.cs:36–64, 170–190`, `search-hardening.spec.ts:254–278`.
    - `Cancel pending index workflows during purge`: `RecipePurgeService.cs:112–141`, `RecipePurgeIntegrationTests.cs:150–167`.
    - `Remove purged recipe from trash list and close PIN dialog`: `RecycleBinSheet.tsx:78–79`, `search-hardening.spec.ts:276–278`.
11. `Reject permanent purge on invalid PIN, missing configuration, or non-trash recipe`:
    - `Reject purge with 403 on missing or incorrect PIN`: `RecipePurgeService.cs:43–57`, `RecipeController.cs:486`, `RecipePurgeIntegrationTests.cs:77–97`, `specs/openapi.yaml:2040–2048`.
    - `Reject purge with 503 when elevated PIN is unconfigured`: `RecipePurgeService.cs:37–41`, `RecipeController.cs:481–485`, `RecipePurgeIntegrationTests.cs:114–128`, `specs/openapi.yaml:2059–2066`.
    - `Reject purge with 409 when recipe is not in trash`: `RecipePurgeService.cs:65–66`, `RecipeController.cs:487–491`, `RecipePurgeIntegrationTests.cs:66–74`, `specs/openapi.yaml:2049–2057`.
    - `Display error feedback and retain dialog on purge rejection`: `RecycleBinSheet.tsx:80–90`, `search-hardening.spec.ts:535–538`.

**Additional inspected identities:** Prior 65 inputs unchanged; these two additions bring the reusable library manifest to 67 unique inputs. Digests identify source evidence, not runtime qualification.

| Input | SHA-256 |
| --- | --- |
| `pwa/src/components/recipes/RecycleBinSheet.tsx` | `b91f5e1a53e5ec7997de650c61e5b4b9f1af5708435644dcfdb7a1c49d637021` |
| `api/src/RecipeApi.Tests/Integration/RecipePurgeIntegrationTests.cs` | `3c777812c36cf7e0652bf0fedbbfc01f6b354eeff0570828fb8759b7b73cc7e8` |

### BSL-recipe-library-027 — Recipe deletion, Recycle Bin, restore, and PIN purge main-spec promotion

**Authority:** A61, user “promote”, 2026-10-15, immediately after the validated A60 draft. Authorizes exact promotion of that reviewed delta and plan/task lifecycle follow-up. No separate acceptance statement, archival, successor extraction or application work is inferred.

**Result:** Appended the exact 11 requirement blocks/28 scenarios from [Deletion, Recycle Bin, restore, and purge delta](../openspec/changes/baseline-recipe-library-deletion-restore-purge/specs/recipe-library/spec.md) to [main recipe-library](../openspec/specs/recipe-library/spec.md), now 55 requirements/122 scenarios. All previous main bytes, including original Purpose and 44 requirements/94 scenarios, remain an exact prefix. Only ADDED requirement blocks were appended; no operation header or non-normative evidence note was copied into main.

**Evidence/preservation:** Full delta, historical BSL-015 sentence/caveat, proposal/design/metadata and BSL-recipe-library-001–026/U29–U52 evidence/limits remain unchanged. BSL-018–025/U23–U28 and historical member-creation limitations retained. All 67 source/dependency digests rechecked unchanged. Household-identity stays 36/92. All ten changes remain active; archives, index, unrelated tracked/untracked work and deletions are preserved. Promotion adds no runtime evidence and does not resolve confirmation omission, silent deletion failure, absent live SSE broadcasts, generic purge UI error messages, or calendar event cleanup asymmetry.

**Checks / stop:** Main recipe-library strict validation and all-spec strict validation (2/2) passed, exit 0. Final all-item strict, three-path documentation/content, exact-append/delta-equality and full preservation outcomes are in the final response/current harness at final content identity. Failed/blocked applicable checks: none observed. Runtime unit/browser/API/PostgreSQL **not-run** under A34; application TDD, client generation, live parity and database behavior checks **not-applicable** to documentation edits. No services or application mutations executed. Stop after this promotion; no archival or successor extraction authorized.

### BSL-recipe-sharing-001 — Loaded detail Share action, privacy scrubbing, and delivery fallback

**Behavior and actor:** A person in an ordinary household with household access and member context opens a ready recipe possessing a real non-placeholder hero image in `RecipeDetailSheet`. The header action area displays a Share control (`recipe-share-btn`). Activating the control shows a persistent loading toast ("Preparing recipe…"), disables the button, and requests the export bundle from GET `/api/recipes/{id}/share`. The API verifies member context and the existence of a stored hero image (returning 400 Bad Request if missing), then generates a version 1.0 bundle with source `wfs-share`. The bundle preserves core metadata, ingredients, structured instructions (HowToSections and steps; wrapping flat arrays in a default section), and up to 5 original images, while scrubbing household notes and ratings to null, and omitting member attribution and top-level recipe ID. The client formats the payload as JSON in a plain text file (`{slugified-name}.txt`). If `navigator.canShare` permits file sharing, `navigator.share` is invoked; user cancellation (`AbortError`) returns cleanly without error feedback or download. If native sharing is unsupported or throws a non-cancellation error, the client falls back to browser file download. If the bundle request fails, the loading toast is dismissed and an inline error message is displayed in `recipe-share-error`.

**Ordered trace:**
1. UI: `pwa/src/components/recipes/RecipeDetailSheet.tsx` (`handleShareRecipe`, `recipe-share-btn` conditional rendering lines 563–577) → `pwa/src/locales/` strings (`recipes.preparingShare`, `recipes.shareRecipe`, `recipes.shareFailedWithDetail`).
2. Client/API: `pwa/src/lib/api/recipes.ts` (`getRecipeShareBundle`, `downloadRecipeBundleFile`, `createRecipeBundleFile`) → `pwa/src/lib/api/api-client.ts` → `specs/openapi.yaml:1905–1956` (`GET /api/recipes/{id}/share`).
3. API/Service: `api/src/RecipeApi/Controllers/RecipeController.cs` (`Share` action, lines 121–150) → `api/src/RecipeApi/Services/RecipeService.cs` (`ExportRecipeShareBundle`, lines 238–273, `MapInstructionsToHowToSections`, `ReadOriginalImages`).
4. Persistence/Storage: `RecipeDbContext` (reads `Recipe`), `LocalRecipeStore` / `IImageService` (reads hero image and original images).
5. Delivery: `navigator.share` or temporary `<a>` element blob download via `URL.createObjectURL(file)`.

**Relevant source files and symbols:**
- `pwa/src/components/recipes/RecipeDetailSheet.tsx`: `handleShareRecipe`, `recipe-share-btn`, `recipe-share-error`, `isSharingRecipe`, `shareError`.
- `pwa/src/lib/api/recipes.ts`: `getRecipeShareBundle`, `downloadRecipeBundleFile`, `createRecipeBundleFile`, `slugifyRecipeName`.
- `api/src/RecipeApi/Controllers/RecipeController.cs`: `Share(Guid id, Guid? familyMemberId)`.
- `api/src/RecipeApi/Services/RecipeService.cs`: `ExportRecipeShareBundle`, `MapInstructionsToHowToSections`, `ReadOriginalImages`, `RecipeShareBundleVersion = "1.0"`.
- `specs/openapi.yaml`: `/api/recipes/{id}/share`, `RecipeShareBundleDto`, `ImportedRecipeDto`, `RecipeShareInfoDto`, `SharedImageDto`.

**Relevant test assertions and substitutions:**
- `api/src/RecipeApi.Tests/Integration/RecipeShareIntegrationTests.cs`:
  - `GetShareBundle_ExportsAllowedFieldsOnly_AndCapsOriginalImagesAtFive`: asserts version 1.0, bundleSource `wfs-share`, scrubbed notes/rating (null/omitted), omitted addedBy/id/dietaryProfile, max 5 original images.
  - `GetShareBundle_PreservesStructuredInstructions_WhenPresentInRawMetadata`: asserts preservation of HowToSection and HowToStep arrays.
  - `GetShareBundle_WrapsFlatInstructions_InDefaultSection`: asserts flat strings are converted to default "Instructions" section.
  - `GetShareBundle_ReturnsBadRequest_IfHeroIsMissing`: asserts 400 Bad Request if hero image missing.
- `pwa/e2e/sharing-fidelity.spec.ts`:
  - `Privacy scrubbing: Share bundle excludes personal metadata`: verifies downloaded bundle JSON has `notes: null` and `rating: null`.
- `pwa/e2e/recipe-share.spec.ts`:
  - `detail share uses the visible action slot while edit stays in overflow`: asserts button visibility and `.txt` file download.
  - `share button is hidden if imageUrl is a placeholder`: asserts button hidden for placeholder hero.
- `pwa/src/components/recipes/RecipeDetailSheet.test.tsx`:
  - `renders Share in the visible action slot while keeping View Original separate`
  - `hides the share button if the recipe has no hero image`
  - `hides the share button if the recipe is not ready`
  - `hides the share button if the imageUrl is a placeholder`
  - `shows recipe-share-error when export fails`
  - `keeps a preparation toast visible through a slow share bundle and prevents duplicate shares`
  - `removes the preparation toast before preserving the existing share failure message`
- `pwa/src/lib/api/recipes.test.ts`:
  - `createRecipeBundleFile / privacy scrubbing`: verifies bundle serialization into File object.

**API/implementation/test/documentation agreement or mismatch:**
- Agreement: Core export metadata, hero requirement, privacy scrubbing of notes/ratings, and delivery fallback agree across source, tests, and OpenAPI schemas.
- Mismatch / discrepancy: Client packages the bundle as `{slugified-name}.txt` with `text/plain` MIME type, whereas test fixtures and parser error messages refer to `.recipe` files (U53).
- Discrepancy: `navigator.share` cancellation suppresses error feedback, while unexpected failure falls back to download (U55).

**Evidence class and confidence:** Implementation-supported; integration, component, and E2E tests provide high confidence for export generation, privacy scrubbing, hero gating, and client fallback.

**Open question or explicit limitation:** U53, U55.

**Disposition:** drafted under A62.

### BSL-recipe-sharing-002 — Capture bundle intake, validation, preview, duplicate warning, and library acceptance

**Behavior and actor:** A person in an ordinary household with household access visits `/capture` and activates "Import recipe file" (`import-recipe-file-btn`). The file picker accepts text/plain files (`.txt,text/plain`). Upon selecting a file, `parseRecipeBundleFile` reads the file text and parses JSON. If parsing fails, it displays an unreadable file error; if the payload fails schema validation, it displays an invalid bundle error. On success, the view transitions to a review screen with `bundle-preview-card` showing the hero photo, name, source attribution, synthesis badge, original photo count, structured instructions, and optional notes/ratings if present in the bundle. Simultaneously, the client performs duplicate detection by querying the library for matching source recipe ID or name: if found, an advisory warning banner (`duplicate-recipe-warning`) is displayed with a "View existing recipe" button that opens `RecipeDetailSheet`. The user can cancel preview via `reject-bundle-btn`, returning to capture without changes, or accept via `accept-bundle-btn`. Activating import submits the bundle to POST `/api/recipes/import-bundle`. The server validates version 1.0, source `wfs-share`, non-empty required fields, max 5 original images, and base64 payloads (returning 400 on violations). If the recipe ID collides with an existing entity, a new UUID is allocated. The recipe is saved synchronously with `IsReady = true`, member attribution, notes/ratings, hero image, and original images, returning 201 Created. The capture view transitions to `bundle-import-success` with a "Done" button (`bundle-import-done-btn`) that navigates to Home (`/`).

**Ordered trace:**
1. UI: `pwa/src/components/capture/MinimalCapture.tsx` (`handleRecipeBundleFileChange`, `import-recipe-file-btn`, `import-recipe-file-input`, `bundle-preview-card`, `duplicate-recipe-warning`, `accept-bundle-btn`, `reject-bundle-btn`, `bundle-import-success`, `bundle-import-done-btn`).
2. Client/API: `pwa/src/lib/api/recipes.ts` (`parseRecipeBundleFile`, `importRecipeShareBundle`) → `specs/openapi.yaml:1957–1985` (`POST /api/recipes/import-bundle`).
3. API/Service: `api/src/RecipeApi/Controllers/RecipeController.cs` (`ImportBundle` action, lines 279–302) → `api/src/RecipeApi/Services/RecipeService.cs` (`ImportRecipeShareBundle`, lines 275–348, `ValidateBundle`, `ValidateImagePayload`).
4. Persistence/Storage: `RecipeDbContext` (adds `Recipe` with `IsReady = true`, `AddedBy = familyMemberId`, UUID collision re-assignment), `LocalRecipeStore` (saves hero image and original images), `ImageService` (writes `recipe.info`).
5. Completion/Navigation: UI displays `bundle-import-success` and clicking Done pushes to `ROUTES.HOME` (`/`).

**Relevant source files and symbols:**
- `pwa/src/components/capture/MinimalCapture.tsx`: `handleRecipeBundleFileChange`, `handleAcceptBundle`, `handleRejectBundle`, `parsedBundle`, `fileDuplicate`, `bundleImportSucceeded`.
- `pwa/src/lib/api/recipes.ts`: `parseRecipeBundleFile`, `importRecipeShareBundle`.
- `api/src/RecipeApi/Controllers/RecipeController.cs`: `ImportBundle(RecipeShareBundleDto dto, Guid? familyMemberId)`.
- `api/src/RecipeApi/Services/RecipeService.cs`: `ImportRecipeShareBundle`, `ValidateBundle`, `ValidateImagePayload`.
- `specs/openapi.yaml`: `/api/recipes/import-bundle`.

**Relevant test assertions and substitutions:**
- `api/src/RecipeApi.Tests/Integration/RecipeShareIntegrationTests.cs`:
  - `ImportBundle_WithUnsupportedVersion_ReturnsBadRequest`: asserts 400 Bad Request when version is `"99.0"`.
  - `ImportBundle_WithMalformedPayload_ReturnsBadRequest`: asserts 400 Bad Request when recipe payload is null.
  - `ImportBundle_WithValidPayload_CreatesReadyRecipe_AndPreservesSynthesizedFlag`: asserts 201 Created, `isReady = true`, `isSynthesized` preserved, entity persisted in DB.
  - `ImportBundle_RestoresNotesAndRating_WhenPresentInBundle`: asserts notes and rating persisted when provided.
- `pwa/src/components/capture/MinimalCapture.recipe-import.test.tsx`:
  - `enters bundle review state after selecting a valid .txt file`: asserts preview card, sections, steps, accept/reject buttons.
  - `renders optional notes in the bundle preview if present`: asserts notes rendering.
  - `shows bundle-import-error for invalid bundle files`: asserts error message on broken JSON.
  - `returns to the default capture view after rejecting a parsed bundle`: asserts cancel button behavior.
  - `File Import Duplicate: shows warning banner and lets the user view the existing recipe`: asserts duplicate banner and detail sheet opening.
- `pwa/e2e/sharing-fidelity.spec.ts`:
  - `Backup fidelity: Export preserves structured instructions, notes, and rating during round-trip`: asserts round-trip preview and import completion.
- `pwa/e2e/recipe-share.spec.ts`:
  - `manual .recipe import starts on capture, shows review, and exits back home`: asserts full UI flow from file selection to home arrival.
- `pwa/src/lib/api/recipes.test.ts`:
  - `parseRecipeBundleFile`: unit tests for structured sections, invalid files, missing steps, `@type` fields, and missing optional fields.

**API/implementation/test/documentation agreement or mismatch:**
- Agreement: Server validation, preview rendering, duplicate warning banner, cancellation, and 201 persistence agree across source, tests, and contract.
- Mismatch / discrepancy: Server strictly enforces `Version == "1.0"`, while client parser accepts any string and test fixture uses `"1.1"` (U54).
- Mismatch / discrepancy: Duplicate detection in UI is advisory warning only; server does not reject duplicate names and reassigns IDs on collision (U56).
- Mismatch / discrepancy: Bundle import directly creates a ready recipe without background workflow queueing or live SSE broadcast (U57).

**Evidence class and confidence:** Implementation-supported; integration, component, and E2E tests provide high confidence for parsing, previewing, duplicate warning, validation, and database/disk persistence.

**Open question or explicit limitation:** U54, U56, U57.

**Disposition:** drafted under A62.

### BSL-recipe-sharing-003 — Recipe sharing baseline proposal and draft

**Authority:** A62 session instruction, 2026-10-15. Authorizes discovery and drafting only ordinary-household recipe sharing: privacy-scrubbed export bundle generation (native share or file download fallback), capture intake, schema validation, preview card presentation, duplicate detection advisory warning, cancellation, and acceptance into the recipe library as a ready recipe. Stop at validated draft for human review; no application changes, promotion, archival, or successor extraction.

**Artifacts produced:**
| Artifact | Status |
| --- | --- |
| [Proposal](../openspec/changes/baseline-recipe-sharing-bundle-export-import/proposal.md) | Draft; documentation only |
| [Delta](../openspec/changes/baseline-recipe-sharing-bundle-export-import/specs/recipe-sharing/spec.md) | 9 ADDED requirements/27 scenarios; no MODIFIED/REMOVED/RENAMED operations |
| [Design](../openspec/changes/baseline-recipe-sharing-bundle-export-import/design.md) | Technical extraction approach, representations, and risks; no application design change |
| [Tasks](../openspec/changes/baseline-recipe-sharing-bundle-export-import/tasks.md) | Documentation extraction/validation checklist only; checkbox completion does not establish acceptance |
| Main / lifecycle | Recipe-library 55/122 and household-identity 36/92 unchanged; all eleven changes remain active; no archival |
| Review handoff | Human draft review pending; promotion and archival require separate authorization |

**Requirements and scenario mapping:**
1. `Offer Share action on eligible ready recipes in loaded detail`:
   - `Ready recipe with hero image displays Share control`: `RecipeDetailSheet.tsx:563–577`, `RecipeDetailSheet.test.tsx:101–114`, `recipe-share.spec.ts:79–83`.
   - `Not-ready recipe hides Share control`: `RecipeDetailSheet.tsx:565`, `RecipeDetailSheet.test.tsx:322–345`.
   - `Placeholder hero image hides Share control`: `RecipeDetailSheet.tsx:564`, `RecipeDetailSheet.test.tsx:347–370`, `recipe-share.spec.ts:96–115`.
   - `Detail sheet in editing mode hides Share control`: `RecipeDetailSheet.tsx:563`, `RecipeDetailSheet.test.tsx:372–421`.
2. `Generate privacy-scrubbed portable export bundle`:
   - `Scrub personal notes and rating`: `RecipeService.cs:260–261`, `RecipeShareIntegrationTests.cs:34–108`, `sharing-fidelity.spec.ts:135–182`, `specs/openapi.yaml:1911–1956`.
   - `Preserve structured instructions and original images up to five`: `RecipeService.cs:251, 271, 978–989`, `RecipeShareIntegrationTests.cs:34–108, 110–173`.
   - `Wrap flat instruction strings in a default section`: `RecipeService.cs:251`, `RecipeShareIntegrationTests.cs:175–216`.
   - `Reject export when recipe lacks hero image`: `RecipeController.cs:132–135`, `RecipeShareIntegrationTests.cs:218–250`, `specs/openapi.yaml:1946–1955`.
   - `Reject export when member context header is missing`: `RecipeController.cs:127–128`, `RecipeShareIntegrationTests.cs:75–77`.
   - `Reject export when recipe is not found`: `RecipeService.cs:240–241`, `RecipeController.cs:140–143`.
3. `Deliver export bundle via native sharing with download fallback`:
   - `Native share dispatch when supported`: `RecipeDetailSheet.tsx:471–485`, `recipes.ts:371–383`.
   - `Cancellation of native share suppresses error and file download`: `recipes.ts:384–386`, `RecipeDetailSheet.tsx:486–487`.
   - `Fallback to browser file download when native share is unavailable or fails`: `recipes.ts:387–399`, `sharing-fidelity.spec.ts:96–100`, `recipe-share.spec.ts:84–88`.
   - `Present inline error feedback when bundle request fails`: `RecipeDetailSheet.tsx:485–493`, `RecipeDetailSheet.test.tsx:423–441, 483–500`.
4. `Offer recipe bundle intake on capture entry`:
   - `Import recipe file action available on capture view`: `MinimalCapture.tsx:1140–1144`, `MinimalCapture.recipe-import.test.tsx:175–193`, `recipe-share.spec.ts:120–123`.
   - `File picker accepts text plain files`: `MinimalCapture.tsx:1146–1155`, `MinimalCapture.recipe-import.test.tsx:188–193`.
5. `Parse and validate imported bundle file payload`:
   - `Successfully parse valid bundle payload`: `recipes.ts:401–492`, `MinimalCapture.tsx:432–434`, `recipes.test.ts:243–287, 324–399`, `MinimalCapture.recipe-import.test.tsx:195–239`.
   - `Reject unreadable non-JSON file`: `recipes.ts:405–409`, `recipes.test.ts:289–294`, `MinimalCapture.tsx:470–473`, `MinimalCapture.recipe-import.test.tsx:282–293`.
   - `Reject bundle with malformed schema or invalid image payloads`: `recipes.ts:411–454`, `recipes.test.ts:296–322`, `MinimalCapture.tsx:470–473`.
6. `Present bundle review card and cancellation`:
   - `Present preview card with bundle metadata and structured content`: `MinimalCapture.tsx:827–963`, `MinimalCapture.recipe-import.test.tsx:228–239`, `sharing-fidelity.spec.ts:105–120`.
   - `Render restored notes and star rating when present in bundle`: `MinimalCapture.tsx:928–961`, `MinimalCapture.recipe-import.test.tsx:241–280`, `sharing-fidelity.spec.ts:121–126`.
   - `Cancel bundle preview and return to default capture view`: `MinimalCapture.tsx:551–557, 986–992`, `MinimalCapture.recipe-import.test.tsx:295–336`.
7. `Display advisory warning for existing library duplicates`:
   - `Display duplicate warning when recorded recipe ID matches existing recipe`: `MinimalCapture.tsx:442–451, 842–857`, `MinimalCapture.recipe-import.test.tsx:338–401`.
   - `Display duplicate warning when recipe name matches existing recipe`: `MinimalCapture.tsx:454–463, 842–857`.
   - `View existing recipe opens recipe detail overlay`: `MinimalCapture.tsx:850–855, 994–1003`, `MinimalCapture.recipe-import.test.tsx:389–401`.
   - `Duplicate warning permits import acceptance`: `MinimalCapture.tsx:842–857, 975–984`.
8. `Accept and persist imported recipe bundle into library`:
   - `Accept valid bundle and persist ready recipe with importing member attribution`: `MinimalCapture.tsx:573–592`, `recipes.ts:358–364`, `RecipeController.cs:279–302`, `RecipeService.cs:275–348`, `RecipeShareIntegrationTests.cs:298–376`.
   - `Reassign recipe identifier when bundle identifier collides with existing entity`: `RecipeService.cs:282–285`.
   - `Restore optional notes and rating into newly persisted entity`: `RecipeService.cs:307–308, 328–329`, `RecipeShareIntegrationTests.cs:377–421`.
   - `Reject bundle with unsupported version`: `RecipeService.cs:939–940`, `RecipeShareIntegrationTests.cs:253–283`.
   - `Reject bundle with malformed payload or invalid image base64`: `RecipeService.cs:945–976`, `RecipeShareIntegrationTests.cs:284–297`.
9. `Present import success screen and navigate home`:
   - `Present success screen upon import acceptance`: `MinimalCapture.tsx:649–675`, `MinimalCapture.recipe-import.test.tsx:519–526`, `sharing-fidelity.spec.ts:128–130`, `recipe-share.spec.ts:131–134`.
   - `Done action navigates to Home`: `MinimalCapture.tsx:666–673`, `sharing-fidelity.spec.ts:130–133`, `recipe-share.spec.ts:134–137`.
   - `Present inline error feedback upon import API failure`: `MinimalCapture.tsx:586–588, 965–972`.

**Additional inspected identities:** Prior 67 inputs unchanged; these five additions bring the reusable manifest to 72 unique inputs. Digests identify source evidence, not runtime qualification.

| Input | SHA-256 |
| --- | --- |
| `api/src/RecipeApi.Tests/Integration/RecipeShareIntegrationTests.cs` | `5d928618b1fd36945eec667356e23b8345106e71c8f1005825bceff645e47e2d` |
| `pwa/e2e/sharing-fidelity.spec.ts` | `60903905d1e318b47d9230c54029c18b4732eb87a45e8b53b027cab41ae49b8d` |
| `pwa/e2e/recipe-share.spec.ts` | `0b4db40ae6c558d34b3c7565298825eb48e6c35f367d64638a95b2d15cbc9078` |
| `pwa/src/components/capture/MinimalCapture.recipe-import.test.tsx` | `a34f4e0686200f03800c12b8c2433f770f2b3a041e9734cb55e170de45be0fb8` |
| `pwa/e2e/fixtures/shared-lasagna.recipe` | `2a7b896437b61cdcab538b476e5ffd5590c20213e66ac35301ae849bad9601e5` |

### BSL-recipe-sharing-004 — Recipe sharing main specification creation and promotion

**Authority:** A63 user instruction “promote”, 2026-10-15. Authorizes creating main specification `openspec/specs/recipe-sharing/spec.md` with verbatim Purpose and the 9 requirements / 27 scenarios from the reviewed delta `openspec/changes/baseline-recipe-sharing-bundle-export-import/specs/recipe-sharing/spec.md`, and updating plan and tasks. No archival, successor extraction, application changes, or runtime/database qualification authorized.

**Promotion details:**
- Destination: `openspec/specs/recipe-sharing/spec.md` created with Purpose and 9 requirements / 27 scenarios under single `## Requirements` section.
- Main specs inventory: `recipe-sharing` (9 requirements / 27 scenarios), `recipe-library` (55 requirements / 122 scenarios), `household-identity` (36 requirements / 92 scenarios).
- Delta preservation: Delta spec, proposal, design, and extraction tasks under `openspec/changes/baseline-recipe-sharing-bundle-export-import/` preserved intact.
- Active changes: All eleven changes remain active; none archived.
- Non-normative notes: Evidence/limits note and exact BSL-015 sentence/caveat remain preserved in change delta; U53–U57 limitations remain recorded.

**Validation:**
- `openspec validate --specs --strict --no-interactive`: passed (3/3 main specs valid).
- `openspec validate --all --strict --no-interactive`: passed (14/14 items valid: 11 active changes, 3 main specs).
- `task verify`: passed documentation and content integrity checks.


### BSL-recipe-capture-001 — Capture entry, link review, client validation, and background tracking

**Behavior and actor:** A person in an ordinary household with household access and member context visits `/capture` (or shares a link to `/capture?url=...` / `/capture?text=...`). If a `url` parameter or URL within `text` is present, or if the person activates the secondary link action on the capture screen, the view switches to the URL review form displaying the link in a multi-line input (`capture-url-input`). The client debounces URL input queries against GET `/api/recipes?url={trimmed}`: if a match exists, an advisory warning banner (`duplicate-recipe-warning`) is displayed with a "View existing recipe" button that opens `RecipeDetailSheet`. The review form also offers appreciation rating (1–3: "Not for me", "It was OK", "Loved it!") and optional notes. The Save button (`capture-url-save-btn`) is enabled only when the trimmed URL is non-empty. Activating Save submits POST `/api/recipes/capture-url` with `{ url, notes, rating }` and header `X-Family-Member-Id`. If submission fails (network or non-2xx status), an inline error is displayed in `capture-url-error` while preserving the form state. On 202 Accepted with a valid recipe ID, the client stores the pending recipe in `useCaptureStore`, transitions to a queued progress screen (`capture-success-screen`) showing "Recipe queued" and starts a 10-second countdown to auto-redirect to `/home`. If a matching `recipe_ready` SSE event arrives while on this screen, the countdown is cancelled and the view updates to "{Name} is ready!" with an "Add to this week" button and a "Done" button navigating to `/home`.

**Ordered trace:**
1. UI: `pwa/src/components/capture/MinimalCapture.tsx` (`handleUrlCapture`, `capture-url-input`, `capture-url-save-btn`, `capture-url-error`, `capture-url-review-heading`, `capture-success-screen`, `capture-done-btn`, `capture-add-to-week-btn`).
2. Prefill / Navigation: `pwa/src/app/(app)/capture/page.tsx` (`CapturePage`, passes `url`, `text`, `title`, `intent`, `mode`) → `MinimalCapture.tsx` (`extractUrl`, `showUrlReview`, `urlInput`).
3. Client / API: `pwa/src/lib/api/recipes.ts` (`captureUrl`) → `pwa/src/lib/api/api-client.ts` → `specs/openapi.yaml:2769–2790` (`POST /api/recipes/capture-url`).
4. State & Events: `pwa/src/store/captureStore.ts` (`addPending`), `pwa/src/store/libraryStore.ts` (listens to SSE `recipe_ready` and dismisses notification on inline match).

**Relevant source files and symbols:**
- `pwa/src/components/capture/MinimalCapture.tsx`: `handleUrlCapture`, `urlInput`, `setUrlInput`, `showUrlReview`, `urlDuplicate`, `urlCaptureError`, `wasUrlCaptured`, `onSuccess`, `readyRecipeName`, `countdown`.
- `pwa/src/app/(app)/capture/page.tsx`: `CapturePage`, `CapturePageProps`.
- `pwa/src/lib/api/recipes.ts`: `captureUrl`.
- `specs/openapi.yaml`: `/api/recipes/capture-url`, `CaptureUrlDto`.

**Relevant test assertions and substitutions:**
- `pwa/src/components/capture/MinimalCapture.test.tsx`:
  - `shows Done button and auto-navigates to /home after 10 seconds (non-GOTO path)`: asserts countdown, Done button presence, and 10-second navigation to `/home`.
  - `does NOT auto-navigate when onSuccess=true and isGoto=true (GOTO path)`: asserts success heading visible and no automatic navigation.
- `pwa/e2e/capture-flow.spec.ts`:
  - `user can enter recipe URL, view review screen, and save recipe`: asserts review form prefilled with query URL, rating/notes entry, POST payload verification (`body.url`).
  - `capture flow extracts URL from shared text parameter`: asserts URL extracted from free-form text.
  - `failed URL capture shows error message`: asserts 500 error display on `capture-url-error`.
  - `malformed 202 with missing recipe id shows error message`: asserts error display when 202 response omits `data.id`.
  - `clicking the link secondary action shows the URL review form`: asserts manual entry activation.
  - `clicking Back from URL review form returns to capture controls`: asserts back navigation clears review view.

**API/implementation/test/documentation agreement or mismatch:**
- Agreement: URL input, prefill, duplicate advisory warning, 202 Accepted response, error presentation, queued countdown, and inline ready transition agree across source, tests, and contract.
- Discrepancy: Duplicate warning is client-side advisory only; the server does not enforce URL uniqueness (U58).
- Discrepancy: Auto-navigation countdown is local to the active browser tab; tab closure or early navigation drops client countdown without interrupting server processing (U60).

**Evidence class and confidence:** Implementation-supported; component tests and Playwright E2E tests provide high confidence for URL review, validation, submission, queued progress, and inline completion.

**Open question or explicit limitation:** U58, U60.

**Disposition:** drafted under A64.

### BSL-recipe-capture-002 — Backend recipe capture intake, workflow dispatch, and acquisition processing

**Behavior and actor:** An authenticated household member issues POST `/api/recipes/capture-url` with `CaptureUrlDto` (`url`, optional `notes`, `rating`). `RecipeController.CaptureUrl` checks for `familyMemberId` (returning 400 Bad Request if missing), then invokes `RecipeService.CaptureUrl`. The service generates a new recipe UUID, creates an initial `Recipe` entity with name `"Captured Recipe"`, `IsReady = false`, `ImageCount = 0`, `IsDiscoverable = false`, and `AddedBy = familyMemberId`, writes initial `recipe.info` to disk via `IImageService`, saves DB changes, and triggers the `url-import` workflow with parameters `recipeId` and `url`. Workflow orchestration executes:
1. `WebAcquisitionAgent` (`FetchUrlContent`): Fetches webpage HTML using `HttpClient`. If HTTP 403 Forbidden is returned, it logs a warning and proceeds with partial metadata. Uses `chatClient` with prompt `WebContextExtraction` to extract title and hero image URL. If title extraction fails, it falls back to `"Recipe from " + Uri.Host`. If hero image URL is present, it downloads the image bytes and saves it as original image `0`, setting `ImageCount = 1` and `FinishedDishImageIndex = 0`. It saves `original/content.html` and persists `SourceUrl` in `recipe.info`.
2. `RecipeAgent` (`ExtractRecipe`): Reads `original/content.html` and image artifacts, formats chat messages with HTML context (truncated to safe token limits), and runs extraction using prompt `WebRecipeExtraction`. Parses and semantically validates the JSON (requiring a name, ingredients, and instruction steps; running refinement if incomplete). Saves normalized `recipe.json` and updates `recipe.info`.
3. Subsequent workflow tasks run hero generation (`GenerateHero`), sync (`SyncRecipe`), ingredient categorization (`CategorizeIngredients`), and recipe categorization (`CategorizeRecipe`).
4. `RecipeReadyProcessor` (`RecipeReady`): Sets `recipe.IsReady = true`, `recipe.IsDiscoverable = true`, updates `UpdatedAt`, saves DB changes, and broadcasts `publisher.PublishRecipeReadyAsync(recipeId, name, imageUrl)`.

**Ordered trace:**
1. API / Controller: `api/src/RecipeApi/Controllers/RecipeController.cs` (`CaptureUrl`, lines 266–276).
2. Service / Orchestration: `api/src/RecipeApi/Services/RecipeService.cs` (`CaptureUrl`, lines 524–575) → `api/src/RecipeApi/Services/WorkflowOrchestrator.cs` (`TriggerAsync`).
3. Workflow Definition: `api/src/RecipeApi/Workflows/url-import.yaml`.
4. Acquisition Agent: `api/src/RecipeApi/Services/Agents/WebAcquisitionAgent.cs` (`ExecuteAsync`, `ProcessUrlAsync`, lines 19–128).
5. Extraction Agent: `api/src/RecipeApi/Services/Agents/RecipeAgent.cs` (`DoExtractRecipeAsync`, lines 114–210).
6. Readiness Processor: `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs` (`ExecuteAsync`, lines 21–65).

**Relevant source files and symbols:**
- `api/src/RecipeApi/Controllers/RecipeController.cs`: `CaptureUrl(CaptureUrlDto dto, Guid? familyMemberId)`.
- `api/src/RecipeApi/Services/RecipeService.cs`: `CaptureUrl(CaptureUrlDto dto, Guid familyMemberId)`, `GetRecipeStatus(Guid id)`.
- `api/src/RecipeApi/Workflows/url-import.yaml`: tasks `fetch_url_content`, `extract_recipe`, `recipe_ready`.
- `api/src/RecipeApi/Services/Agents/WebAcquisitionAgent.cs`: `ProcessorName => "FetchUrlContent"`, `ProcessUrlAsync`.
- `api/src/RecipeApi/Services/Agents/RecipeAgent.cs`: `ProcessorName => "ExtractRecipe"`, `DoExtractRecipeAsync`.
- `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs`: `ProcessorName => "RecipeReady"`, `ExecuteAsync`.

**Relevant test assertions and substitutions:**
- `api/src/RecipeApi.Tests/Services/Agents/WebAcquisitionAgentTests.cs`:
  - `ProcessUrlAsync_DoesNotWriteRecipeJson`: asserts `recipe.json` is not prematurely written by acquisition agent.
  - `ProcessUrlAsync_WritesContentHtml`: asserts source HTML is saved to `original/content.html`.
  - `ProcessUrlAsync_SetsSourceUrlInRecipeInfo`: asserts `recipe.info.SourceUrl` matches the input URL.
  - `RecipeJson_NeverContainsRawHtml_AfterWebAcquisitionAgent`: property-based test asserting no `rawHtml` leak in `recipe.json`.
- `pwa/e2e/capture-flow.spec.ts`:
  - `user can enter recipe URL, view review screen, and save recipe`: asserts API receives valid URL capture request.

**API/implementation/test/documentation agreement or mismatch:**
- Agreement: Initial entity creation with pending readiness, workflow parameters, HTML artifact persistence, semantic extraction validation, readiness status transition, and SSE notification agree across implementation and tests.
- Discrepancy: `RecipeService.CaptureUrl` commits the DB transaction before awaiting workflow launch; if workflow triggering fails, the pending record remains in the DB without automated rollback (U61).
- Discrepancy: Scraping 403 Forbidden is treated as non-fatal with host-name fallback, which may result in minimal recipes without ingredients (U59).
- Discrepancy: U01 discrepancy noted in `RecipeImportReportService` (omission of `url` parameter during repair re-import) does not affect initial capture intake.

**Evidence class and confidence:** Implementation-supported; unit, property-based, and integration tests provide high confidence for initial creation, web acquisition, artifact saving, and ready transition.

**Open question or explicit limitation:** U59, U61.

**Disposition:** drafted under A64.

### BSL-recipe-capture-003 — Recipe capture baseline proposal and draft

**Authority:** A64 session instruction, 2026-10-15. Authorizes discovery and drafting only ordinary-household recipe capture: URL web acquisition entry (`/capture` URL input and submit), client/backend validation, web acquisition workflow dispatch (WebAcquisitionAgent / Gemini fetch and parse), background task / progress tracking, error / unparseable feedback, and initial recipe creation into the library with stored readiness status. Produce a bounded, source-supported draft and stop for review; no application behavior changes, promotion, archival, or successor extraction.

**Artifacts produced:**
| Artifact | Status |
| --- | --- |
| [Proposal](../openspec/changes/baseline-recipe-capture-url-entry/proposal.md) | Draft; documentation only |
| [Delta](../openspec/changes/baseline-recipe-capture-url-entry/specs/recipe-capture/spec.md) | 9 ADDED requirements / 20 scenarios; new capability `recipe-capture` |
| [Design](../openspec/changes/baseline-recipe-capture-url-entry/design.md) | Technical architecture, component boundaries, and risks; no application design change |
| [Tasks](../openspec/changes/baseline-recipe-capture-url-entry/tasks.md) | Documentation extraction/validation checklist only; all 8 tasks checked |
| Main / lifecycle | Recipe-sharing 9/27, recipe-library 55/122, household-identity 36/92 unchanged; all twelve changes remain active; no archival |
| Review handoff | Human draft review pending; promotion and archival require separate authorization |

**Requirements and scenario mapping:**
1. `Enter and review a recipe link at capture entry`:
   - `Open capture with shared URL parameter`: `MinimalCapture.tsx:98, 123`, `CapturePageProps` in `page.tsx:6–14`, `capture-flow.spec.ts:180–186`.
   - `Extract URL from shared text parameter`: `MinimalCapture.tsx:54–58, 99, 103`, `capture-flow.spec.ts:216–226`.
   - `Manual entry from capture controls`: `MinimalCapture.tsx:1109–1118`, `capture-flow.spec.ts:324–332`.
   - `Return to capture controls`: `MinimalCapture.tsx:1310–1323`, `capture-flow.spec.ts:334–351`.
2. `Advisory duplicate warning for existing recipe link`:
   - `Existing recipe matching link URL`: `MinimalCapture.tsx:190–216, 1340–1355`.
   - `Unique link URL`: `MinimalCapture.tsx:195–198, 1340`.
3. `Validate and submit recipe link for acquisition`:
   - `Submit valid recipe link`: `MinimalCapture.tsx:322–362, 1410–1422`, `useCapture.ts:147–167`, `recipes.ts:333–346`, `RecipeController.cs:266–276`, `capture-flow.spec.ts:187–205`.
   - `Save disabled when URL is empty`: `MinimalCapture.tsx:1417`.
   - `Missing member context rejects submission`: `RecipeController.cs:271–272`.
4. `Initial recipe creation and workflow dispatch`:
   - `Initial recipe stored with pending readiness`: `RecipeService.cs:524–575`, `url-import.yaml:1–64`.
5. `Background web acquisition and recipe extraction`:
   - `Fetch webpage content and hero image`: `WebAcquisitionAgent.cs:45–128`, `WebAcquisitionAgentTests.cs:120–158`.
   - `Scraping forbidden fallback`: `WebAcquisitionAgent.cs:54–58, 78–82`.
   - `AI-assisted extraction and semantic validation`: `RecipeAgent.cs:114–210`, `WebAcquisitionAgentTests.cs:100–117, 160–218`.
6. `Finalize recipe readiness and broadcast completion`:
   - `State transition to ready`: `RecipeReadyProcessor.cs:21–65`.
7. `Track background capture progress and auto-redirect`:
   - `Display queued progress screen`: `MinimalCapture.tsx:760–824`, `capture-flow.spec.ts:206–214`.
   - `Complete countdown redirects to Home`: `MinimalCapture.tsx:305–320`, `MinimalCapture.test.tsx:201–223`.
   - `Done button manual dismissal`: `MinimalCapture.tsx:806–813`, `MinimalCapture.test.tsx:209–210`.
8. `Inline transition to ready status upon completion`:
   - `Ready notification received during active session`: `MinimalCapture.tsx:170–187, 344–350, 678–757`.
9. `Display error feedback on capture failure`:
   - `API rejection or network error`: `MinimalCapture.tsx:355–357, 1424–1431`, `capture-flow.spec.ts:228–247`.
   - `Missing recipe ID in response`: `useCapture.ts:154–156`, `capture-flow.spec.ts:249–266`.

**Additional inspected identities:** Prior 72 inputs unchanged; these 12 additions bring the reusable manifest to 84 unique inputs. Digests identify source evidence, not runtime qualification.

| Input | SHA-256 |
| --- | --- |
| `pwa/src/components/capture/MinimalCapture.tsx` | `aadbb37ec2fe548af6e41c5460ea3339377fb215f66f19eac054666416742af5` |
| `pwa/src/app/(app)/capture/page.tsx` | `28026fd2a95ea0563e13522d10a945030cb4f8ccd45a910e1c594306ebdbdbb9` |
| `pwa/src/lib/api/recipes.ts` | `f4e70b39a2060bfc5b25010914f78e288321517db5c52c543d103502718dce7a` |
| `api/src/RecipeApi/Controllers/RecipeController.cs` | `d1699c2de6f6cca9d879e67c0c7b9c7f0af4b2c4e104bc9ff04634b266eb5a70` |
| `api/src/RecipeApi/Services/RecipeService.cs` | `9eec9ab5cd7102081b3765b08a41b8de4d45325858d18ab4573a326afa256b74` |
| `api/src/RecipeApi/Workflows/url-import.yaml` | `6f142f8831390021091f5c3ca9603f056d138719d1904ae72cd75827beb73787` |
| `api/src/RecipeApi/Services/Agents/WebAcquisitionAgent.cs` | `688cfe3ff3c1b0dad7885794f725fcfca29e990477b3e2ce1246c7e2ebb743b2` |
| `api/src/RecipeApi/Services/Agents/RecipeAgent.cs` | `b23761d819726cf5dd8c50000cabc05198fba855865e6beba05de0ea8a6097af` |
| `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs` | `4206f98256cadae88d7be13a44e9d9d18b6c46679ba7b9f0aee0dcef8a848a74` |
| `pwa/src/components/capture/MinimalCapture.test.tsx` | `8a8c1d66ccae98223cb0754cdd155c30a2d75911aea6cfff09284f54816bbf53` |
| `pwa/e2e/capture-flow.spec.ts` | `4683a2c0590f0c4c562ed4350afb6aa208a88d856ff4c27688732f4bc6d42911` |
| `api/src/RecipeApi.Tests/Services/Agents/WebAcquisitionAgentTests.cs` | `f414a13b7756ff6fa8dcc1824cb515fc05aba9f5b83aa8e22f17542513bd278d` |


### BSL-recipe-capture-004 — Recipe capture main specification creation and promotion

**Authority:** A65 user instruction “promote”, 2026-10-15. Authorizes creating main specification `openspec/specs/recipe-capture/spec.md` with verbatim Purpose and the 9 requirements / 20 scenarios from the reviewed delta `openspec/changes/baseline-recipe-capture-url-entry/specs/recipe-capture/spec.md`, and updating plan and tasks. No archival, successor extraction, application changes, or runtime/database qualification authorized.

**Promotion details:**
- Destination: `openspec/specs/recipe-capture/spec.md` created with Purpose and 9 requirements / 20 scenarios under single `## Requirements` section.
- Main specs inventory: `recipe-capture` (9 requirements / 20 scenarios), `recipe-sharing` (9 requirements / 27 scenarios), `recipe-library` (55 requirements / 122 scenarios), `household-identity` (36 requirements / 92 scenarios).
- Delta preservation: Delta spec, proposal, design, and extraction tasks under `openspec/changes/baseline-recipe-capture-url-entry/` preserved intact.
- Active changes: All twelve changes remain active; none archived.
- Non-normative notes: Evidence/limits note and exact BSL-015 sentence/caveat remain preserved in change delta; U58–U61 limitations remain recorded.

**Validation:**
- `openspec validate --specs --strict --no-interactive`: passed (4/4 main specs valid).
- `openspec validate --all --strict --no-interactive`: passed (16/16 items valid: 12 active changes, 4 main specs).
- `task verify`: passed documentation and content integrity checks.


## Discrepancy and uncertainty register

All entries below are initial static findings; recheck selected paths before use.
Their presence authorizes documentation of uncertainty, not fixes.

| ID | Finding / risk | Evidence and required extraction treatment | Status |
| --- | --- | --- | --- |
| U01 | Contextual URL repair omits a required workflow parameter | Compare `WorkflowParameters` in [report service](../api/src/RecipeApi/Services/RecipeImportReportService.cs), required `url` in [URL workflow](../api/src/RecipeApi/Workflows/url-import.yaml), and [orchestrator validation](../api/src/RecipeApi/Services/WorkflowOrchestrator.cs). Mocked workflow launch is not real launch evidence. Do not claim successful URL correction. | Open |
| U02 | Navigation doctrine was removed; capture includes a queued screen/timer | [MinimalCapture](../pwa/src/components/capture/MinimalCapture.tsx) and [its tests](../pwa/src/components/capture/MinimalCapture.test.tsx). Re-extract each source/GOTO/PDF path; do not assume immediate navigation or restore old doctrine. | Open |
| U03 | Week-flow documentation drifts from implementation | [Week lifecycle document](flows/data-flows/week-lifecycle.md), [WeeklyPlan](../api/src/RecipeApi/Models/WeeklyPlan.cs), [ScheduleService](../api/src/RecipeApi/Services/ScheduleService.cs): three week states, separate day states, actual event types, mutable locked weeks. Keep docs as secondary evidence. | Open |
| U04 | Match, consensus, suggestion and assignment are different | [SQL views](../api/database/schema.sql), [DiscoveryService](../api/src/RecipeApi/Services/DiscoveryService.cs), [weekStore closure](../pwa/src/store/weekStore.ts). Lock clears global votes; client promotion and lock use separate requests. | Open |
| U05 | Duplicate prevention is not a universal server guarantee | [MinimalCapture](../pwa/src/components/capture/MinimalCapture.tsx), [recipe list filtering and bundle import](../api/src/RecipeApi/Services/RecipeService.cs). Source-dependent checks, post-creation photo detection and possible repeated uncertain uploads need separate scenarios. | Open |
| U06 | Grocery keys, aggregation and concurrency need precise language | [GroceryRecomputeService](../api/src/RecipeApi/Services/GroceryRecomputeService.cs), [grocery toggle](../api/src/RecipeApi/Services/ScheduleService.cs), [UI duplicate-row tests](../pwa/src/components/planner/GroceryList.test.tsx). Do not promise multilingual canonical identity or atomic concurrent map updates. Aisle correction has implemented UI controls and focused tests. | Open |
| U07 | Demo chat blocking is narrower than all-AI blocking | [registrations](../api/src/RecipeApi/Program.cs), [chat decorator](../api/src/RecipeApi/Services/DemoModeChatClient.cs), [WebAcquisitionAgent](../api/src/RecipeApi/Services/Agents/WebAcquisitionAgent.cs), [hero agent](../api/src/RecipeApi/Services/Agents/RecipeHeroAgent.cs), [embedding provider](../api/src/RecipeApi/Services/GeminiEmbeddingProvider.cs). Recheck processor names/direct calls; no blanket no-cost guarantee. | Open |
| U08 | Shared access is not personal identity; token age is not enforced | BSL-household-identity-003–005 rechecks both validators: no date parse, age/future cutoff or persisted session; one-year cookie retention is not server expiry. Household principal has no member/role binding; workflow diagnostics and import AddedBy checks differ. A17 settles token-age extraction treatment as a non-normative limitation; withhold expiry guarantees. Capturer/reporting reconciliation remains deferred. | Partly settled 2026-10-15 (A17); boundary reconciliation open |
| U09 | Placeholder paths can look like capabilities | Fixed [recommendations endpoint](../api/src/RecipeApi/Controllers/RecipeController.cs), placeholder [SettingsService synthesis](../api/src/RecipeApi/Services/SettingsService.cs), real description path in [RecipeService](../api/src/RecipeApi/Services/RecipeService.cs). Exclude placeholders from positive functional claims; do not mistake them for the actual description workflow. | Open |
| U10 | Tests may prove substituted behavior only | [API factory](../api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs) defaults to in-memory storage/DB, mocked orchestration and disabled auth; [browser fixtures](../pwa/e2e/fixtures.ts) mock API and [Playwright config](../pwa/playwright.config.ts) blocks service workers. Read assertions, not names; [search tests](../api/src/RecipeApi.Tests/Integration/RecipeSearchIntegrationTests.cs) retain an exclusion name for demotion assertions. | Open |
| U11 | Runtime/device/deployment qualification is incomplete | [PostgreSQL PDF tests](../api/src/RecipeApi.Tests/Integration/PdfCapturePostgresTests.cs) require explicit configuration; [PDF flow](flows/user-flows/pdf-recipe-import.md), [release status](../README.md), [template](../release-template/synology/compose.yaml). Device sharing, offline use, NAS rendering/recovery and deployment flag propagation require separate evidence. | Open |
| U12 | Filesystem, DB, enqueue and broadcasts are separate failure boundaries | [RecipeService](../api/src/RecipeApi/Services/RecipeService.cs), [PdfCaptureService](../api/src/RecipeApi/Services/PdfCaptureService.cs), [ManagementService](../api/src/RecipeApi/Services/ManagementService.cs), [SSE manager](../api/src/RecipeApi/Infrastructure/SseConnectionManager.cs). No inferred transactional file/DB consistency, durable replay, exactly-once execution or cross-replica delivery. | Open |
| U13 | Existing-member recovery has contract and qualification limits | BSL-household-identity-001: `/api/family/me` implements 404 absent from OpenAPI; browser mock supplies success without identity; UI does not await all selection writes. Withhold universal persistence/recovery guarantees; no fixes authorized. | Open; rechecked 2026-10-15 |
| U14 | Cookie authentication is incompletely represented in OpenAPI security metadata | BSL-household-identity-004: API accepts `h_access`; root security declares only raw header/Bearer alternatives, stream prose mentions cookie. No contract edit or blanket parity claim authorized. | Open; discovered 2026-10-15 |
| U15 | API rejection and cookie/configuration recovery lack a universal flow | BSL-household-identity-003–005: browser adapter adds no shared credential header/cross-origin credentials override; serverFetch throws, Home logs; no central 401 re-login/clearAuth caller found. Secret agreement, cookie domain/Secure deletion, origin delivery and interrupted retries unobserved. Withhold universal recovery/transport guarantees. | Open; discovered 2026-10-15 |
| U16 | Invite token does not bind the supplied member or establish eligibility | BSL-006/007: HMAC covers timestamp text only; memberId and redirect are unsigned; generator/consumer/cookie setter perform no member lookup. Late page/API resolution is conditional and U13 still applies. Withhold personal authentication, member-bound credential, single-use/persisted invitation and invite-time eligibility claims. | Extraction treatment settled 2026-10-15 (A22): non-normative limitation; behavior/qualification gap remains |
| U17 | Invite handoff and rejection are not atomic | BSL-007/008: first two cookie writes awaited; selectFamilyMember repeats member action without await; onboarding/navigation proceed and outer catch misses later rejection. No rollback or existing-state reset. Withhold universal completion, persistence and clean retry guarantees. | Extraction treatment settled 2026-10-15 (A22): non-normative limitation; behavior/qualification gap remains |
| U18 | Invite redirect and generation/recovery limits | BSL-006–008: nonempty redirect passed to router.replace unchecked; missing configuration leaves dialog generating, rejected generation promise uncaught; error copy mentions expiry although validator has no age check. Withhold safe arbitrary target, expiry and universal recovery claims; A17 unchanged. | Extraction treatment settled 2026-10-15 (A22): non-normative limitation; behavior/qualification gap remains |
| U19 | Creation operation and validation contract diverge (historical; BSL-014 supersedes current status) | BSL-010/012/013 historically recorded 201 alignment under A30; BSL-014 confirms current OpenAPI 201/409 and matching controller branches. Current generated-client parity/live qualification is not-run. OpenAPI length/400 and generated optional/null-name gaps remain non-normative; no complete validation-parity claim. No contract/client/application edits in drafting. | 201/409 present in current source (BSL-014); current runtime/parity not-run; other validation gaps open |
| U20 | Creation failure clears input; Settings omits request error | BSL-009/011: store catches and returns null, form then clears name; onboarding shows store alert but Settings does not render it. Cancel unmounts local state without aborting request. Withhold retained-input and universal retry/error-feedback claims. | Open; retained non-normatively in A27/A28 draft, no fix authorized |
| U21 | Creation and identity handoff are separate; repeated creation is unguarded | BSL-009–012: save precedes append/cookies; callback and later selection promises are unawaited. No rollback, idempotency key or busy guard. A27/A28 explicitly require trimmed case-insensitive uniqueness/409; BSL-014 now traces enforcement in dirty source, without current runtime qualification. Uniqueness does not imply atomic handoff, exactly-once delivery or universal recovery; those limits remain non-normative. | Uniqueness/409 intent settled A27/A28; enforcement now source-supported (BSL-014), runtime unqualified; handoff/retry gaps open |
| U22 | Member-creation lifecycle/completion record diverges from plan and evidence | BSL-014/015: archive exists and tasks 2.1–2.4 are checked; A30 records task 2.1 only and no member-creation archive authority. Existing finish record has database-behavior blocked, excludes service/controller/SQL and archive tasks, and does not evaluate task acceptance. No later authorization established here. BSL-015 confirms 7/21 delta/main equality, stale task-specific hashes, and three broken archive links; user requires quoted limitation in future spec. Preserve artifacts pending later authorization provenance and required qualification. | Deferred under A34; user reports later authorization, original instruction/reference pending; no new archival or verified implementation acceptance; independent requirements discovery may proceed |

| U23 | Rename contract and persistence limits differ | BSL-018: PUT documents only 200, while service/middleware support blank 400/missing 404. DTO/contract omit length bounds; SQL varchar(100) and current unique-name index affect rename without creation-style duplicate translation. No own-name authorization comparison. | Non-normative in A37 draft; validation/duplicate/authorization guarantees withheld; no repairs or database qualification |
| U24 | Rename edit completion obscures failure and pending keyboard paths remain active | BSL-018: store catches failure and resolves; editor closes, Settings omits store error. Input/Enter/Escape remain active while Save/Cancel disable; no guard/cancellation/idempotency. | Non-normative in A37 draft; universal error recovery, retained input, pending lock and atomic cancellation guarantees withheld |
| U25 | Removal errors/security metadata and referenced-member effects exceed the settled API contract | BSL-020: DELETE documents only 204 and member-header security; actual shared-access gate, missing-ID 404 and generic provider 500 differ. EF/SQL declare cascades/nulling, including a SQL-only maintenance requester FK and unconstrained deleted_by. InMemory tests cover unreferenced success/missing UUID only; installed schema unqualified. | Extraction treatment settled A40: non-normative under A12; behavior/qualification gaps remain. No repairs; DB qualification deferred A34, not an extraction gate |
| U26 | Removal helper is disconnected and cleanup/recovery is partial | BSL-021: no UI caller; exact-ID cleanup after API save can fail with stale local state, domain deletion unqualified. Direct API leaves cookies/stores; validator needs nonempty list and does not await clearing. Mock DELETE does not mutate list and mock me returns synthetic success. | Extraction treatment settled A40: non-normative; behavior/qualification gaps remain. Withhold connected deletion journey/atomic or universal recovery guarantees |
| U27 | Profile selection completion and failure/pending paths are not coordinated | BSL-024: Profile does not await selection before completion/Home push; store awaits server cookie, attempts readable fallback, then sets ID. No selection busy flag, caught rejection, rollback, post-selection cancellation or success/error UI. Menu dismissal only precedes selection. | Extraction treatment confirmed A45: non-normative under A12; underlying gaps remain. Withhold atomic handoff, pending lock, retained/rolled-back state and universal recovery guarantees; no repairs |
| U28 | Profile list freshness, recovery and switching qualification are limited | BSL-024: hasLoaded can reuse prior/error list; opening/selection makes no fresh member lookup. Profile omits list-error/empty feedback. Existing gate/recovery limits U13/U26 apply. Tests stub menu or preseed identity; none asserts real Profile option switching. | Extraction treatment confirmed A45: non-normative under A12; underlying gaps remain. No fresh server eligibility, new-identity Home arrival, durable/cross-tab/device synchronization or runtime-qualified switching claim |
| U29 | List readiness prose/summary descriptions and badge mocks exceed local enforcement | BSL-recipe-library-001: list trusts stored IsReady, not name/image/synthesis formula; summary schema omits readiness; mocked importIssue is not populated by list MapToDto. Uppercase explore controller/service branch differs; connected caller uses lowercase. Withhold derivation/enrichment/case-equivalence claims; no repairs. | Extraction treatment confirmed A48: non-normative under A12; underlying discrepancies remain |
| U30 | Empty and failure/recovery paths differ by mode/request stage | BSL-recipe-library-002: All empty array uses EndCard; Discovery empty has no explicit feedback. Initial summary/list failure shows Retry; append failure only sets unused flag, retaining cards. No focused loading/error/retry unit assertions; browser empty assertions use mocked stack mode. | Extraction treatment confirmed A48: non-normative gaps; supported initial feedback drafted, universal recovery withheld |
| U31 | List paging/freshness and stale-request handling are limited | BSL-recipe-library-002: separate summary/count/page reads, cached All total, offset paging without final ID tie-breaker; relevance key lacks generation and errors/finally lack relevance guard. Fixed mocked pages/custom events do not prove complete fresh pagination or synchronization. | Extraction treatment confirmed A48: non-normative; fresh/complete/stable/concurrent paging guarantees withheld, no repairs or runtime qualification |
| U32 | Detail predicates and missing-record response differ from list assumptions | BSL-recipe-library-004: FindAsync uses no readiness/discoverability/attribution predicate; fresh query has global non-deleted filter but tracked entities can bypass another filtered lookup. Missing record throws middleware 404 while GET documents only 200. | Non-normative under A12/A50; no universal deleted exclusion, not-ready rejection or error-contract repair; DB qualification deferred A34 |
| U33 | Detail failure/recovery and replacement-state limits | BSL-recipe-library-005: new-sheet failure logs then null recipe keeps loading text, no error/Retry; malformed envelope throws; replacement-ID failure can expose old recipe, cleanup ignores late state but does not abort transport. | Non-normative under A12/A50; pending feedback/close only drafted, universal recovery/freshness/synchronization/cancellation guarantees withheld |
| U34 | Detail content/asset completeness and assertions are limited | BSL-recipe-library-004/005: metadata optional, instructions mapped but not inline; raw metadata need not match array contract, ingredients may be legacy raw text, hero URL is a reference only. Stubbed/mocked tests do not qualify persistence/content completeness/image delivery. | Non-normative under A12/A50; no cooking-mode extraction, missing-content synthesis, full-content or delivery guarantee; no repairs |
| U35 | Draft normalization/defaults differ from stored facts | BSL-008 steps 2–7/9: blank cuisine becomes null and server ignores it, though successful local snapshot hides the badge; draft meals default category/Supper and are submitted even untouched. Local name/nonempty-meal eligibility exceeds DTO validation; empty API meal array stores empty and sets Category only. | Non-normative limitations; no durable cuisine-clear, synchronized category or universal server validation claims; no repairs |
| U36 | PATCH response and mock shapes diverge from contract | BSL-008 step 9/BSL-009: OpenAPI/generated PatchResponse expects data object; actual RecipeDetailResponseDto is unwrapped by filter exemption. Adapter ignores it. Browser routes/common mocks return stateless success and miss persistence/refetch. Missing-record 404 undocumented. | Non-normative; no envelope/reconciliation guarantee, contract/client/mock repair or runtime qualification |
| U37 | Save completion/failure/pending boundaries do not provide transactional or fresh-state guarantees | BSL-008 steps 8–10: commit before caught index trigger and uncaught recipe.info write; Save success uses captured snapshot, no refetch/list callback; inputs/dismissal remain available pending. Tests omit focused reject/retry/normalization/discard/pending assertions. | Non-normative; no rollback, atomic refresh, cancellation, idempotency, concurrency, library freshness/sync or index/event completion claims; retain supported feedback only |

| U38 | Notes timer compares against the original loaded snapshot rather than the last submitted value | BSL-recipe-library-012 steps 4–5: later original text can suppress a restoring PATCH; unstarted timers clear on dependencies/unmount without flush. Saved-removal timer lacks unmount cleanup. | Non-normative under A12/A54; no every-edit durability, flush-on-close, dispatched transport cancellation or lossless reopening guarantee; no repairs |
| U39 | Rating is optimistic and Saved marks dispatch; failure/overlap recovery is absent | BSL-012 steps 3–5/10: no await before Saved, notes void request, rating promise discarded by click; no save-error UI/catch/rollback/automatic retry/pending guard. Multiple requests can overlap; local recipe snapshot does not reconcile. | Non-normative under A12/A54; no confirmed Saved, automatic recovery, safe retry, request ordering, idempotency, freshness/library synchronization guarantee |
| U40 | Rating/notes contract/error and actual assertion boundaries remain limited | BSL-012 steps 6–9 and BSL-013: supported range agrees, but PATCH 400/404 undocumented; response-envelope U36 persists. Browser notes test is Search/stateless; range unit tests are direct; no focused rating/clear/storage/null/timer/error/close assertion. DB save precedes file failure possibility. | Non-normative; no disputed HTTP/envelope, atomicity or runtime-qualified persistence claim; source-supported successful storage remains extractable A10/A34 |
| U41 | Detail discoverability optimism/pending/restoration is local; close/overlap recovery remains limited | BSL-recipe-library-016 steps 4/8/9: disabled button but no handler reentry guard, catch !next/finally, no visible error/automatic retry/abort/generation guard, no setRecipe/GET/library callback. Reopening uses existing GET. | Non-normative limits under A12/A56; supported same-detail/no-intervening-change display/restoration is drafted, without storage rollback, safe retry, freshness, sync or request-order guarantee |
| U42 | Discoverability DB update is not propagated by the connected recipe.info writer | BSL-016 steps 6–7: flag SaveChangesAsync, caught index attempt, then uncaught file read/write with all metadata arguments null; ImageService does not assign RecipeInfo.IsDiscoverable. Controller/DTO broad disk-sync comments overstate this path. | Non-normative discrepancy; no repair, file parity, atomicity, persistence rollback or index/event completion requirement |
| U43 | Discoverability PATCH assertions and contract/error coverage are limited | BSL-017: stateless Search browser asserts any boolean/body plus open sheet; component visibility/shared-card label assertions only, no inspected flag-storage/recovery qualification. U36 envelope mismatch/undocumented 404 persists; auth-disabled InMemory/store/orchestrator substitutions. | Non-normative; source-supported subset extractable A10/A34; no disputed HTTP/envelope or runtime-qualified persistence claims |
| U44 | Absent source URL fallback in URL-type recipes opens photo viewer with zero images | BSL-recipe-library-020 step 4: when `sourceType === 'url'` but `sourceUrl` is null or empty, activation falls back to `setShowOriginals(true)`. For typical URL imports with zero original images, the viewer mounts with `imageCount: 0`, displaying counter `1 / 0`, requesting `/api/recipes/{id}/original/undefined`, and navigation modulo produces `NaN`. | Non-normative edge-case limitation; withhold zero-image recovery or fallback URL guarantees |
| U45 | External URL navigation does not guarantee external page loading or popup permission | BSL-recipe-library-020 step 4: `window.open(recipe.sourceUrl, '_blank', 'noopener,noreferrer')` requests browser navigation to an external context without changing current application page state or validating URL reachability. Popup blockers or browser restrictions may prevent opening. | Non-normative limitation; supported browsing-context request only drafted, external success withheld |
| U46 | Original photo asset serving uses anonymous access and native image failure handling | BSL-recipe-library-020 steps 7–8: GET `/api/recipes/{id}/original/{index}` is marked `[AllowAnonymous]` with no OpenAPI security requirement. The photo viewer uses native `<img>` without custom loading spinners or error banners; 404 responses or failed transfers rely strictly on native browser image rendering. | Non-normative discrepancy; no custom image error feedback or retry UI extracted |
| U47 | Original photo viewer test assertions omit gesture, keyboard, zoom and navigation paths | BSL-recipe-library-021: component and browser tests assert button visibility, label and viewer opening against mocked fixtures only. Photo ordering, chevrons, keyboard shortcuts, wrapping, pager dots, zoom toggling, touch pinch clamping, and drag panning are not asserted. | Non-normative; source-supported subset extractable under A10, runtime/cross-device gesture qualification deferred under A34 |
| U48 | Move to Bin activates immediately without confirmation; deletion failure is logged without user-facing feedback | BSL-recipe-library-024 steps 1/4: ActionGearMenu triggers onMoveToBin directly without a confirmation prompt or dialog. If deleteRecipe fails (e.g. 409 Conflict due to active planner assignment, or network error), the error is logged to console.error and no user-facing toast or error banner is displayed; the detail sheet remains open with the recipe unchanged. | Non-normative limitations under A12/A60; supported immediate dispatch and sheet retention drafted, user error notifications and confirmation safeguards withheld |
| U49 | Soft-deleted recipes are excluded by global query filter; delete/restore/purge omit real-time SSE broadcasts | BSL-recipe-library-024 steps 3/5/7: RecipeDbContext configures HasQueryFilter(e => e.DeletedAt == null), excluding deleted recipes from GET /api/recipes, search, and detail reads (returning 404). Neither soft-delete, restore, nor purge triggers an SSE event broadcast. Multi-client synchronization relies on manual or route-driven query refreshes. | Non-normative; supported filter and re-search behaviors drafted, real-time multi-device sync guarantees withheld |
| U50 | RecycleBinSheet lacks dedicated unit tests and relies on mocked container and E2E coverage | BSL-recipe-library-025: there is no RecycleBinSheet.test.tsx in the repository. Component coverage relies on browse-all-stack/page.test.tsx (which mocks RecycleBinSheet with a stub div) and Playwright E2E tests (search-hardening.spec.ts and browse-all-stack.spec.ts). | Non-normative testing gap; source-supported implementation extracted under A10, runtime qualification deferred under A34 |
| U51 | Permanent purge collapses distinct API error responses into a single generic UI message | BSL-recipe-library-024 step 9: when purgeRecipe fails with non-2xx status (403 invalid PIN, 503 PIN not configured, 409 not in trash, 404 not found), RecycleBinSheet displays a single generic error message ("Incorrect PIN or permanent delete is not available.") without distinguishing the underlying cause. | Non-normative UI limitation; supported error display drafted, distinct error recovery withheld |
| U52 | Calendar event cleanup is asymmetric between soft-deletion and permanent purge | BSL-recipe-library-024 steps 2/9: SoftDeleteRecipe checks only future/today calendar events (Date >= today) and rejects with 409 Conflict if found, leaving past events untouched. In contrast, PurgeAsync cascades and removes all calendar events (both past and future), votes, search documents, and filesystem directory assets unconditionally. | Non-normative asymmetry; exact behavioral boundaries drafted without repair |
| U53 | File format extension vs MIME type mismatch | BSL-recipe-sharing-001/002: export creates `.txt` file with MIME type `text/plain` containing JSON, and the file picker accept attribute expects `.txt,text/plain`, while parser error messages cite `.recipe file` and test fixtures use `.recipe`. | Non-normative limitation; supported plain-text JSON delivery and intake drafted, extension naming discrepancy withheld |
| U54 | Bundle version enforcement divergence | BSL-recipe-sharing-001/002: server strictly enforces `Version == "1.0"` (returning 400 Bad Request on any other version), while client parser accepts any string for `version` and test fixtures use `"1.1"`. | Non-normative divergence; server 1.0 enforcement drafted, client/fixture version tolerance withheld |
| U55 | Native share cancellation and fallback error boundaries | BSL-recipe-sharing-001: `navigator.share` cancellation (`AbortError`) returns cleanly without error UI or download, while non-abort share failures fall back to immediate file download; native share availability depends on browser environment and `navigator.canShare`. | Non-normative limitation; supported native share and download fallback drafted, universal device sharing guarantees withheld |
| U56 | Duplicate detection is client advisory warning only; backend permits duplicate names and reallocates collision GUIDs | BSL-recipe-sharing-002: client checks existing recipes by source ID or name and renders an advisory warning banner with a link to view the existing recipe without blocking import; upon acceptance, server reallocates fresh GUID on ID collision and persists duplicate names without error. | Non-normative; supported advisory warning and server collision handling drafted, blocking duplicate prevention guarantees withheld |
| U57 | Bundle import creates synchronous ready recipe without SSE broadcast | BSL-recipe-sharing-002: unlike web/photo capture workflows that queue background tasks and emit `recipe_ready` SSE events, bundle import directly and synchronously writes DB entity and asset files and returns 201 Created immediately, omitting real-time live update broadcasts. | Non-normative limitation; synchronous creation drafted, multi-device live update synchronization withheld |
| U58 | Client-side duplicate check by URL is advisory only; API permits duplicate URL imports without collision rejection | BSL-recipe-capture-001/002: MinimalCapture debounces URL queries against GET `/api/recipes?url={trimmed}` and renders an advisory warning banner with a link to view the existing recipe without blocking submission. The API's `CaptureUrl` creates a new UUID entity and triggers `url-import` workflow regardless of whether the URL already exists in the library. | Non-normative limitation; client advisory warning and server intake drafted, server duplicate rejection guarantees withheld |
| U59 | External scraping failure fallback continues with partial metadata | BSL-recipe-capture-002: WebAcquisitionAgent catches HTTP 403 Forbidden, logs a warning, and continues with limited metadata, falling back to "Recipe from " + Uri.Host if no recipe name was extracted. Other HTTP exceptions or unparseable JSON from LLM fail the background task without surfacing fine-grained error reasons to the client. | Non-normative limitation; supported fallback drafted, external site accessibility guarantees withheld |
| U60 | Queued timer auto-navigation is local to the active browser tab | BSL-recipe-capture-001: MinimalCapture initiates a 10-second countdown to navigate to `/home`. If the user navigates away early or closes the tab, background processing continues asynchronously on the server, but client-side timer completion and inline transition to ready status are lost for that tab session. | Non-normative limitation; supported local timer and inline transition drafted, cross-device/tab synchronization guarantees withheld |
| U61 | Initial recipe persistence commits before workflow triggering | BSL-recipe-capture-002: RecipeService saves initial Recipe record with `IsReady = false` to DB and disk before awaiting `orchestrator.TriggerAsync("url-import", ...)`. If workflow triggering throws, the exception is caught and logged, leaving a pending non-ready recipe in the library without active workflow execution. | Non-normative discrepancy; supported pending creation and trigger drafted, transactional rollback guarantees withheld |

## Validation and scope review

Use [Taskfile.yml](../Taskfile.yml) and the
[execution harness](../.agents/core/execution-harness.md) as command authority.

- Discovery-only sessions: inspect current evidence and report findings; do not
  manufacture passing application checks.
- Plan/spec-only changes: review links, meaning, evidence and whitespace; behavior
  TDD and generated-client/application tests are not applicable to the edit itself.
- When runtime qualification is explicitly selected, run relevant existing checks
  with isolated resources. Inspect their effects first. Do not run broad suites,
  launch services, install dependencies or touch real household data merely to
  make a source-supported baseline appear verified.
- A sandbox-blocked command is a blocker, not permission to retry with escalation.
  Give the user the shortest exact local command and its purpose if needed.
- Check the installed CLI before copying commands across sessions. For current
  spec/change grammar validation, the available command is:

  ```sh
  openspec validate --all --strict --no-interactive
  ```

  Prefer validating the selected change/spec during a slice; validate all at final
  reconciliation. An empty spec inventory does not establish baseline acceptance.
- Before completion, review actual changed/new/deleted files. Run the bounded
  documentation verification with the complete task-owned path set, for example:

  ```sh
  task verify -- docs/openspec-baseline-plan.md
  ```

  Future sessions must include their selected change/spec paths too. Exclude the
  user's unrelated deletion from task ownership; do not claim it was validated by
  an explicit path selection that excludes it. Inspect the generated verification
  record and report passed/failed/blocked/not-run/not-applicable accurately.

## Cross-session record

Keep the latest checkpoint, decisions and behavior evidence in this file so future
sessions do not need the original chat. Add detail only for selected slices. Once
large, retain a compact index here and move evidence only with user-authorized
documentation scope; do not create a second competing progress tracker by default.

### Approval and decisions

| ID | Decision | State / authority |
| --- | --- | --- |
| A01 | Use a brownfield extraction with no application changes or invented requirements | Confirmed by user discovery request |
| A02 | Remove the existing navigation spec and start fresh | Confirmed by user; deletion observed in worktree |
| A03 | Persist this plan and reusable GPT-6.1 Sol prompt | Confirmed by user request to write the plan |
| A04 | Approve the 17 capability paths and shared rule owners; navigation belongs within affected journeys | Confirmed 2026-10-15 by user “yes” to the explicit structure/ownership question; no restoration of deleted navigation capability, no drafting authorization |
| A05 | Reference repository behavior at a recorded commit | Confirmed 2026-10-15 by user: “describe repository behavior at a recorded commit”; current commit `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`. Initial profile recorded in A09 and evidence standard in A10; no drafting authorization |
| A06 | Create only `baseline-household-identity-existing-member-selection`, documentation-only proposal/spec delta/extraction tasks; stop at validated draft for review | Authorized 2026-10-15 by user “yes.” to the explicit bounded drafting question; optional design only if required; no wider drafting, application changes, acceptance, promotion or archival |
| A07 | Retire the stale feature inventory, replace its README link, and remove it from baseline inputs | User instruction to delete the out-of-sync inventory, 2026-10-15; useful discovery checklist retained here |
| A08 | Review phase 0, inspect one slice and update this plan only | Authorized by current session instruction, 2026-10-15; no generation authority |
| A09 | Extract ordinary-household behavior first; defer demo, preview and Synology variants to separately selected slices | Confirmed 2026-10-15 by user “yes” to the explicit profile-sequencing question; eventual map retained; no drafting authorization |
| A10 | Allow implementation-supported initial drafts backed by traced source and inspected test assertions; runtime checks explicitly not-run | Confirmed 2026-10-15 by user “yes” to the explicit evidence-standard question; source support is not runtime verification; no drafting authorization |
| A11 | Include operator/API-only capabilities and workflows in the eventual baseline, in separate later slices after household journeys | Confirmed 2026-10-15 by user “yes and workflows too” to the explicit inclusion/sequencing question; shared orchestration remains owned by background processing; no slice drafting or execution authorized |
| A12 | Record disputed/incomplete behavior as evidence and uncertainty; withhold normative claims until resolved or explicitly accepted as current behavior | Confirmed 2026-10-15 by user “yes” to the explicit treatment question; no individual disputed claim accepted, no repairs or drafting authorized |
| A13 | Accept the reviewed bounded household-identity spec and create its design document | User instruction 2026-10-15: “I have reviewed and accepted. build the design”; acceptance covers the existing five requirements/ten scenarios, design newly authored for review; no promotion, archival or application implementation authorized |
| A14 | Promote only the accepted household-identity existing-member-selection delta into main specs | User instruction 2026-10-15: “promotion”, following acceptance and design authoring; no archival, wider slice, application implementation or runtime qualification authorized |
| A15 | Archive only the completed household-identity existing-member-selection change, preserving main specs | User instruction 2026-10-15: “i authorize the archiva of this spec”; context identifies the completed change; no successor slice, runtime qualification or application implementation authorized |
| A16 | Discover/review only ordinary-household shared access and update evidence/plan; stop with findings and next focused decision or bounded drafting recommendation | User session instruction 2026-10-15: passphrase → cookie → protected-page/API access → rejection/recovery; no specifications, existing requirement edits, fixes, lifecycle steps or runtime manufacture authorized |
| A17 | Keep U08 absent server token-age enforcement as an acknowledged non-normative limitation; no expiry guarantee or desired retention policy accepted | User “yes” on 2026-10-15 to the shared-access review recommendation; no shared-access drafting, fix or archival reversal authorized. User also asked whether prior archival was appropriate/reversible; review confirms completed change is archived while main spec remains active. |
| A18 | Create and validate only `baseline-household-identity-shared-access`, with proposal, ADDED identity delta, extraction design/tasks and plan/evidence updates; stop for human review | User “execute the next step”, 2026-10-15, following the bounded shared-access drafting recommendation; no application work, existing requirement edits, acceptance, promotion, archival or archive reversal authorized. A17 and U13/U14/U15 limits retained. |
| A19 | Accept the reviewed shared-access spec, seven ADDED requirements/21 scenarios | User “accepted”, 2026-10-15, following presentation of the validated bounded draft. Delta content and A17/U13/U14/U15 limits unchanged; no promotion, archival, application work or runtime qualification authorized. |
| A20 | Promote only the accepted shared-access delta into the main household-identity spec | User “promote it”, 2026-10-15, following A19 acceptance; preserve existing requirements, scope and uncertainty limits. No archival, successor drafting, application work or runtime qualification authorized. |
| A21 | Discover/review only ordinary-household member invite-link creation, opening, validation, cookie/state handoff, navigation and recovery; update evidence/plan | User session instruction 2026-10-15; no drafting, existing requirement edits, fixes, new change, promotion, archival or reopening. U16–U18 recorded without accepting desired behavior. |
| A22 | Keep U16–U18 invite binding/eligibility, partial handoff and redirect/generation/recovery gaps as non-normative limitations | User “yes”, 2026-10-15, to the focused decision following invite discovery. This settles extraction treatment only; no new desired behavior, drafting, fixes, acceptance, promotion, archival or reopening authorized. A17 and U08/U13/U14/U15 limits remain. |
| A23 | Create and validate only `baseline-household-identity-member-invite-link`: proposal, ADDED household-identity delta, extraction design/tasks and plan/evidence updates; stop at a validated draft for review | User “i authorise”, 2026-10-15, following the bounded member invite-link drafting recommendation. A17/A22 exclusions retained; no existing requirement edits, application changes, acceptance, promotion, archival or reopening authorized. |
| A24 | Promote only the reviewed member invite-link delta into main household-identity; six additions/18 scenarios unchanged | User “promote it”, 2026-10-15, after presentation of the validated A23 draft. Direct promotion authorization; no separate acceptance message. Preserve preceding requirements, A17/A22 and all evidence limits. No archival, reopening, successor drafting, application work or runtime qualification authorized. |
| A25 | Archive only the completed promoted shared-access and member invite-link changes, preserving main household-identity | User “you can archive both”, 2026-10-15, immediately after confirmation both are promoted. Scope includes archival link/status/plan updates; no re-sync changes, application work, successor drafting, runtime qualification or reopening prior archive authorized. |
| A26 | Discover/review only ordinary-household member creation from onboarding and Settings through persistence, response/list and selection/navigation handoff; update evidence and durable plan | User session instruction 2026-10-15 in pasted request. No specifications, existing requirement edits, new change, fixes, lifecycle steps, runtime qualification or archive reopening authorized. U19–U21 documented; their extraction treatment remains pending. |
| A27 | Draft only the member-creation proposal, ADDED household-identity delta, design/tasks and plan/evidence; require 201 OpenAPI alignment and future name uniqueness | User 2026-10-15: “OpenAPI must document 201 as is implemented”; “Name Uniqueness MUST be inforced in the new specs so it gets fixed in future work”; “I authorize the member-creation draft”. Explicit desired-behavior exception to pure baseline extraction. Planning only; no current contract/application/client/SQL/test edits, acceptance, promotion or archival. |
| A28 | Trim names and ignore casing for creation uniqueness; reject duplicates with 409 Conflict | User 2026-10-15 selected “Yes, trim and ignore casing (Recommended)” then “409 Conflict (Recommended)” in separate focused questions. Covers draft behavior and future-work planning only; no implementation or data-remediation authorization. |
| A29 | Accept and promote only the member-creation seven-requirement/21-scenario delta into main household-identity | User “approved and promote”, 2026-10-15, following the validated A27/A28 draft. Includes 201 alignment and future trimmed case-insensitive uniqueness/409 intent. Preserve earlier requirements, evidence limits and four incomplete future implementation tasks. No contract/application/client/SQL/test edits, archival or unrelated work authorized. |
| A30 | Apply only member-creation task 2.1 and stop after verification before uniqueness enforcement | User 2026-10-15 explicitly selected task 2.1. Authorizes its 201 contract alignment, generated-client reconciliation, mocks and required tests/verification. No tasks 2.2–2.4, uniqueness/409 implementation, unrelated fixes, archival, commits or staging. |
| A31 | Review phase 0 and one current slice; update this plan and recommend the next bounded action | Current user session instruction, 2026-10-15. Documentation-only discovery/review; no drafting, implementation resumption, runtime qualification, acceptance, promotion, archival or reopening. Prior decisions retained; later artifact/source existence supplies no new authority. |
| A32 | Review member-creation acceptance and archival evidence before selecting another baseline slice; carry quoted limitation into future spec | User 2026-10-15 explicitly selected the recommended review and requested the quoted sentence (BSL-015). Authorizes this evidence/plan update and future non-normative carry-forward. No new draft scope, retroactive implementation/archive approval, task acceptance, runtime qualification, application changes or archive reopening. |
| A33 | Continue bounded member-creation qualification using existing checks | User “keep going”, 2026-10-15, after acceptance review and next qualification recommendation. Covers readiness/existing focused qualification and plan results, not application edits, new tests, archive changes, historical approval reconstruction or another baseline slice. |
| A34 | Defer implementation/database qualification and focus on requirements extraction | User 2026-10-15: “can we keep the implementation work for later? I need to figure out how to give you a database instante. I want to focus on the requirements work”. Resume independent bounded discovery under A10; member-creation qualification/provenance remains recorded for later. No application work, database setup, task acceptance, archive repair or new slice drafting authorization inferred. |
| A35 | Audit remaining household-identity requirements; proceed to recipe-library only if none remain | User 2026-10-15: “was there anything left under household-identity ? if not then proceed with recipe-library”. BSL-017 finds rename, API removal and Profile switching coverage outstanding. Conditional library progression not activated; recommend rename discovery next. No drafting/application/runtime/lifecycle authority inferred. |
| A36 | Proceed with bounded ordinary-household member-renaming discovery | User “accepted proceed”, 2026-10-15, in response to BSL-017 recommendation for rename discovery. Source/assertion tracing and durable evidence/plan update only; acceptance of that recommendation does not authorize generation, implementation, runtime qualification, promotion or archival. |
| A37 | Propose only the bounded household-identity member-renaming baseline | User “propose”, 2026-10-15, immediately after the BSL-018 bounded-draft recommendation. Authorizes CLI scaffolding/proposal/ADDED delta/extraction design/tasks and plan. U23/U24 remain non-normative under A12; preserve requested BSL-015 status sentence. Stop at validated draft; no application work, runtime qualification, acceptance, promotion or archival. |
| A38 | Promote the reviewed member-renaming additions and provide a new-session continuation prompt | User 2026-10-15: “promote the specs, then provide me with the continuation prompt for a new session to contiunue with the next item in household-identity. if household-identity is complete move to the next capability”. Direct promotion authority for five additions/12 scenarios only; includes plan/task status updates and handoff. No separate acceptance statement, archival, application work, runtime qualification or next-slice drafting. |
| A39 | Discover/review only household-identity API member removal and update evidence/plan | User session instruction, 2026-10-15. Covers bounded callers/client/contract/controller/service/EF/SQL/read-result trace, assertions/config/docs and plan checks; stop at findings and next drafting decision. No specs, application/test/contract/client/SQL changes, deletes, services, database requests, acceptance/promotion/archive or Profile-switching extraction. |
| A40 | Confirm the limited removal-draft boundary and non-normative U25/U26 treatment | User “yes”, 2026-10-15, to “Should the next draft use that limited boundary, keeping U25/U26 non-normative?” Settles successful authorized API deletion and later list absence as draft candidates; FK effects, undocumented errors and browser cleanup remain evidence/limitations. Covers this plan update, not spec generation, application changes, runtime qualification, promotion or archival. |
| A41 | Draft only the bounded API member-removal baseline | User “draft”, 2026-10-15, after A40 boundary confirmation. Authorizes CLI-scaffolded proposal, two-requirement/two-scenario ADDED delta, extraction design/tasks and plan mapping/checkpoint. U25/U26 remain non-normative and BSL-015 historical note retained. Stop at validated draft for human review; no application/test/contract/client/SQL changes, runtime/database/deletion execution, acceptance, promotion, archival or successor slice. |
| A42 | Review only the API member-removal draft and update evidence/plan | User session instruction, 2026-10-15. Reconcile the agreed boundary, main requirements, unchanged source and actual assertions; record readiness recommendation and bounded checks. No acceptance, promotion, archival, application/test/contract/client/SQL edits, database access, deletion execution, services or successor extraction. |
| A43 | Promote only the reviewed API member-removal delta | User “promote”, 2026-10-15, immediately after BSL-023 review. Direct authority to append the exact two additions/two scenarios to main and update plan/task status. No separate acceptance statement, archival, application/runtime/database work or successor extraction authorized. |
| A44 | Discover/review only the connected Profile-switching slice and update evidence/plan | User session instruction, 2026-10-15. Trace actual control/destination, member selection, cookie/store/navigation and visible result; compare shared main owners and actual assertions. Plan only; no specs, acceptance/promotion/archive, application/test/contract/client/SQL changes, services, mutations or database access. Stop at findings and one bounded drafting decision; U27/U28 treatment not yet confirmed. |
| A45 | Confirm the Profile-switching boundary and draft only that baseline | User “confirm boundary, proceed to draft”, 2026-10-15, after BSL-024 recommendation. Settles U27/U28 as non-normative and authorizes CLI-scaffolded proposal, four ADDED requirements/eight scenarios, extraction design/tasks and plan. Preserve shared owners and BSL-015 sentence/caveat; stop at validated draft for review. No application/test/contract/client/SQL edits, runtime/database work, acceptance, promotion, archival or successor extraction. |
| A46 | Promote only the Profile-switching delta | User “promote it”, 2026-10-15, immediately after the validated A45 draft. Authorizes exact four-requirement/eight-scenario main-spec append and plan/task status updates. No separate acceptance statement, archival, application/runtime/database work or successor extraction authorized. |
| A47 | Discover/review only ordinary-household recipe-library list visibility and update evidence/plan | User session instruction, 2026-10-15. Trace actual connected caller through generated contract/API/query/store/visible result; inspect assertions and meaningful eligibility, empty/loading/failure paths. Plan/evidence only. No specs, application/test/contract/client/SQL changes, mutations, database access, services, successor capability or lifecycle actions. Stop at findings and one focused drafting recommendation. |
| A48 | Confirm the library boundary and draft only its ordinary-household list-visibility baseline | User “confirmed, proceed to draft”, 2026-10-15, after A47 findings/recommendation. Confirms U29–U31 non-normative treatment and authorizes CLI-scaffolded proposal, nine ADDED requirements/18 scenarios, extraction design/tasks and plan mapping. Preserve shared owners and BSL-015 historical sentence/caveat. Stop at validated draft for review; no application/test/contract/client/SQL changes, services/runtime/database work, acceptance, promotion, archival or successor capability. |
| A49 | Promote only the reviewed recipe-library list-visibility delta | User “promote”, 2026-10-15, immediately after the validated A48 draft. Authorizes creating main recipe-library with the exact Purpose and nine requirements/18 scenarios and updating plan/task status. No separate acceptance statement, archival, application/runtime/database work or successor extraction authorized. |
| A50 | Discover and draft only ordinary-household recipe-library detail reading | User pasted session instruction, 2026-10-15: authorizes read-only connected discovery, CLI scaffolding, proposal, recipe-library ADDED delta, extraction design/tasks and plan updates once supported boundary is established. Stop at validated draft for review. Preserve shared owners/history and withhold unsupported claims; no application/test/contract/client/SQL edits, data mutations/access, services, runtime qualification, acceptance, promotion, archival or successor extraction. |
| A51 | Approve and promote only the recipe-library detail-reading delta | User “I approve, move to propotion”, 2026-10-15, immediately after validated A50 draft. Approves reviewed seven additions/13 scenarios and authorizes exact main-spec append plus plan/task follow-up updates. Preserve original Purpose/list requirements and non-normative evidence. No archival, successor extraction, application changes or runtime/database qualification. |
| A52 | Discover and draft only ordinary-household recipe-library detail editing | User pasted session instruction, 2026-10-15: authorizes connected loaded detail → Edit → supported fields → Save or Cancel → visible result, CLI proposal/delta/extraction design/tasks and plan after source support is established. Keep discrepancies non-normative and all prior evidence/limits; stop with validated draft for review. No application/test/contract/client/SQL edits, mutations, DB access, services, acceptance, promotion, archival or successor extraction. |
| A53 | Promote only the reviewed recipe-library detail-editing delta | User “promote it”, 2026-10-15, immediately after the validated A52 draft. Authorizes exact nine-requirement/17-scenario append to main recipe-library and plan/task follow-up. No separate acceptance statement, archival, successor extraction, application changes or runtime/database qualification authorized. |
| A54 | Discover and draft only ordinary-household recipe-library ratings and notes | User pasted session instruction, 2026-10-15: authorizes loaded library detail → rating/notes controls → supported submission/persistence → visible result; CLI scaffolding, proposal, ADDED delta, extraction design/tasks and plan updates after source support. Preserve prior evidence/history, keep discrepancies non-normative, stop at validated draft for review. No application/test/contract/client/SQL edits, mutations, database access, services, acceptance, promotion, archival or successor extraction. |
| A55 | Promote reviewed ratings/notes delta and provide the next-spec prompt | User “promote this spec, then produce the prompt for me to generate the next spec”, 2026-10-15. Authorizes exact six-requirement/15-scenario main append and plan/task follow-up, plus a next-session prompt. Preserve original Purpose/prior requirements and delta/evidence. No archival, successor extraction execution, application changes or runtime/database qualification. |
| A56 | Discover and draft only ordinary-household loaded-library-detail discoverability controls | User attached session instruction, 2026-10-15: authorizes connected discovery, CLI scaffolding, bounded proposal/recipe-library ADDED delta/extraction design/tasks and plan updates once source-supported boundary is established. Preserve all prior evidence/history, keep discrepancies non-normative and stop at validated draft for review. No application/test/contract/client/SQL edits, mutations, database access, services, acceptance, promotion, archival or successor extraction. |
| A57 | Promote only the reviewed loaded-detail discoverability delta | User “promote”, 2026-10-15, immediately following the validated A56 draft. Authorizes exact six-requirement/13-scenario main recipe-library append and plan/task follow-up. Preserve original Purpose, prior main bytes, full delta/evidence/history and all eight active changes. No separate acceptance statement, archival, successor extraction, application changes or runtime/database qualification inferred. |
| A58 | Discover and draft only ordinary-household loaded-detail View Original | User session instruction, 2026-10-15: authorizes connected loaded detail → View Original availability/activation → source URL or photo viewer → navigation/dismissal/result; CLI scaffolding, proposal, ADDED delta, extraction design/tasks and plan updates after source support. Preserve prior evidence/history, keep discrepancies non-normative, stop at validated draft for review. No application/test/contract/client/SQL edits, mutations, database access, services, acceptance, promotion, archival or successor extraction. |
| A59 | Promote only the reviewed loaded-detail View Original delta | User “promote”, 2026-10-15, immediately following the validated A58 draft. Authorizes exact seven-requirement/18-scenario main recipe-library append and plan/task follow-up. Preserve original Purpose, prior main bytes, full delta/evidence/history and all nine active changes. No separate acceptance statement, archival, successor extraction, application changes or runtime/database qualification inferred. |
| A60 | Discover and draft only ordinary-household recipe deletion (Move to Bin / soft-delete), Recycle Bin listing, recipe restore, and PIN-protected permanent purge | User session instruction, 2026-10-15: authorizes connected loaded detail → Move to Bin / browse header Recycle Bin → trash listing → restore or PIN purge; CLI scaffolding, proposal, ADDED delta, extraction design/tasks and plan updates after source support. Preserve prior evidence/history, keep discrepancies non-normative, stop at validated draft for review. No application/test/contract/client/SQL edits, mutations, database access, services, acceptance, promotion, archival or successor extraction. |
| A61 | Promote only the reviewed recipe deletion, Recycle Bin, restore, and PIN purge delta | User “promote”, 2026-10-15, immediately following the validated A60 draft. Authorizes exact 11-requirement/28-scenario main recipe-library append and plan/task follow-up. Preserve original Purpose, prior main bytes, full delta/evidence/history and all ten active changes. No separate acceptance statement, archival, successor extraction, application changes or runtime/database qualification inferred. |
| A62 | Discover and CLI-draft only ordinary-household recipe sharing: privacy-scrubbed export (download and native share fallback), bundle import preview, schema validation, duplicate detection warning, cancellation, and library acceptance; update evidence and durable plan | Authorized 2026-10-15 by user session instruction. CLI-scaffolded proposal, 9 ADDED requirements/27 scenarios in recipe-sharing, extraction design/tasks and BSL-recipe-sharing-001–003 mapping; U53–U57 retain format/mime, version tolerance, share fallback, duplicate advisory, and no-SSE limits. Stop at validated draft for human review; no application/test/contract/client/SQL edits, runtime/database qualification, promotion or archival. |
| A63 | Promote only the reviewed recipe-sharing delta into a new main specification | User “promote”, 2026-10-15, immediately following the validated A62 draft. Authorizes creating main specification `openspec/specs/recipe-sharing/spec.md` with exact Purpose and 9 requirements/27 scenarios, and plan/task follow-up. Preserve original Purpose and all prior bytes in existing main specs (`household-identity` 36/92, `recipe-library` 55/122), full delta/evidence/history and all eleven active changes. No separate acceptance statement, archival, successor extraction, application changes or runtime/database qualification inferred. |
| A64 | Discover and CLI-draft only ordinary-household recipe capture: URL web acquisition entry, validation, workflow dispatch, background progress tracking, error feedback, and initial recipe creation | Authorized 2026-10-15 by user session instruction. CLI-scaffolded proposal, 9 ADDED requirements/20 scenarios in recipe-capture, extraction design/tasks and BSL-recipe-capture-001–003 mapping; U58–U61 retain advisory duplicate limits, external scraping fallback, local queued timer, and DB persistence before trigger. Stop at validated draft for human review; no application/test/contract/client/SQL edits, runtime/database qualification, promotion or archival. |
| A65 | Promote only the reviewed recipe-capture delta into a new main specification | User “promote”, 2026-10-15, immediately following the validated A64 draft. Authorizes creating main specification `openspec/specs/recipe-capture/spec.md` with exact Purpose and 9 requirements/20 scenarios, and plan/task follow-up. Preserve original Purpose and all prior bytes in existing main specs (`household-identity` 36/92, `recipe-library` 55/122, `recipe-sharing` 9/27), full delta/evidence/history and all twelve active changes. No separate acceptance statement, archival, successor extraction, application changes or runtime/database qualification inferred. |

When recording approval, include date, exact scope, conditions, and the user's
instruction or durable reference. Do not treat edits to a status cell as approval.


### Latest checkpoint

```text
Session: recipe-capture ordinary-household web acquisition promotion, 2026-10-15
Source: moving-to-openspec / 7e0dcdbe162704debe8a0f916eb1f7327afc77a5 + preserved dirty inputs
Authorization: A65 user instruction; promote recipe-capture delta
Delivered: main recipe-capture specification created (9 requirements/20 scenarios); BSL-recipe-capture-004 promotion record
Main: recipe-capture 9/20, recipe-sharing 9/27, recipe-library 55/122, household-identity 36/92; all four main specs active
Preserved: all twelve changes active; archives/index/deletions/dirty inputs
Evidence: BSL-recipe-library-001–027, BSL-household-identity-001–025, BSL-recipe-sharing-001–004, BSL-recipe-capture-001–004; all 84 source/dependency identities match
Limits: U29–U57, U58–U61, BSL-018–025/U23–U28/creation history and BSL-015 caveat retained
Checks: main strict (4/4), all-spec strict (4/4) and all-item strict (16/16) passed; documentation/content/preservation passed
Changed: docs/openspec-baseline-plan.md, openspec/specs/recipe-capture/spec.md, openspec/changes/baseline-recipe-capture-url-entry/tasks.md
Next: stop after promotion; all twelve changes active; no application/runtime work, archival, or successor extraction;
  runtime not-run and implementation/database qualification deferred A34
```

### Session log

| Date | Scope and result | Evidence / next action |
| --- | --- | --- |
| 2026-10-15 | Initial source discovery and durable extraction plan; no specs generated | Commit above; runtime not-run; phase 0 approval pending |
| 2026-10-15 | Retired stale feature inventory, replaced README link, removed catalog dependency and retained discovery checklist | Documentation-only; phase 0 and generation approvals remain pending |
| 2026-10-15 | Phase-0 review; household existing-member selection/recovery traced as BSL-household-identity-001; no specs or application edits | Local CLI root/inventories confirmed; recommend repository-reference decision first; A04–A06 unchanged |
| 2026-10-15 | Recorded user decision: baseline describes repository behavior at a recorded commit; phase-0 reference checkbox and A05 updated | Source commit unchanged; runtime checks not-run; next decision is capability paths/shared ownership; no drafting authorized |
| 2026-10-15 | Recorded user approval of 17 capability paths and shared owners, including navigation within affected journeys; updated A04 and phase-0 checklist | Commit unchanged; no new runtime evidence or specs; next decision is included profiles; generation remains unauthorized |
| 2026-10-15 | Recorded ordinary-household-first profile sequence; demo, preview and Synology variants deferred to separate slices; updated A09 and checklist | Commit unchanged; runtime checks not-run; next decision is initial-draft evidence standard; no specs generated |
| 2026-10-15 | Recorded approved initial-draft evidence standard in A10 and checklist; source-supported claims remain distinct from verified behavior | Commit unchanged; runtime checks not-run; next decision is operator/API-only scope; no specs generated |
| 2026-10-15 | Recorded operator/API-only and workflow inclusion in A11 and checklist; retained approved capability ownership and later-slice sequencing | Commit unchanged; runtime checks not-run; no workflows executed or specs generated; next decision is disputed-behavior treatment |
| 2026-10-15 | Recorded disputed-behavior treatment in A12 and checklist; proposed concrete first draft scope under A06 without generation | Commit unchanged; runtime checks not-run; next decision is authorization of the bounded household-identity draft; no specs generated |
| 2026-10-15 | A06 authorized; CLI-scaffolded and drafted only household-identity existing-member selection; added BSL-household-identity-002 and ten-scenario evidence mapping; conditional design omitted | Strict change validation passed; final bounded documentation checks in harness record; runtime not-run; stop for human review, no promotion/archive |
| 2026-10-15 | A13: user accepted existing bounded spec and explicitly requested design; authored design.md and reconciled proposal/tasks/status; accepted spec unchanged | Strict validation passed; final six-path documentation/spec checks in harness record; runtime not-run; no promotion/archive/application changes |
| 2026-10-15 | A14: promoted only accepted household-identity existing-member-selection delta; created main spec with unchanged Purpose/requirements/scenarios and recorded revision | Main validation passed; all-strict validation passed (2 items); runtime not-run; change remains active, archival not authorized |
| 2026-10-15 | A15: archived completed household-identity change after 4/4 artifact, 7/7 task and full delta/main equality checks; retained metadata and repaired archive-relative links | Main spec unchanged; final documentation/spec validation in harness record; runtime not-run; recommend shared-access discovery as next separate slice |
| 2026-10-15 | A16 shared-access discovery/review only; added BSL-household-identity-003/004/005, rechecked U08 and recorded U14/U15; preserved accepted main/archive artifacts and unrelated edits/deletions | CLI root/inventories and full identity spec inspected; runtime not-run; final plan-only checks reported in session response/harness record. Next decision: token-age baseline treatment; no drafting authorized |
| 2026-10-15 | A17: recorded user agreement to keep absent token-age enforcement non-normative; reviewed prior archival as appropriate for the completed bounded extraction | Main spec and archived delta checked for matching Purpose/requirements; no move or spec edit. Archival is reversible without removing main specs; next action remains separately authorized shared-access drafting. |
| 2026-10-15 | A18: CLI-scaffolded and drafted only shared-access baseline change; proposal, seven ADDED requirements/21 scenarios, extraction design/tasks and evidence mapping | Strict selected-change validation passed; final six-path documentation checks in response/harness record; runtime not-run. Stop for human review; main spec, prior archive and unrelated work preserved. |
| 2026-10-15 | A19: recorded user acceptance of the shared-access spec, seven added requirements/21 scenarios; updated plan and task follow-up only | Delta/main specs and prior archive unchanged; final bounded checks in response/harness record; runtime not-run. Next action: separately authorized promotion. |
| 2026-10-15 | A20: promoted accepted shared-access additions into main household identity; now 12 requirements/31 scenarios, preserving original and added requirement blocks, title/Purpose and delta | Main-spec validation passed; final three-path documentation/all-strict results in response/harness record. Change remains active; no archival/application work; runtime not-run. |
| 2026-10-15 | A21: member invite-link discovery/review only; connected Settings caller traced through sharing, token, cookie/state handoff, gates, lookup and recovery; BSL-006/007/008 and U16/U17/U18 added | Plan only; main remains 12 requirements/31 scenarios, shared-access active and prior archive unchanged. Runtime not-run; final bounded checks in response/harness record. Next decision: non-normative treatment of invite binding, partial handoff and redirect/recovery limits; no drafting authorized. |
| 2026-10-15 | A22: user “yes” confirms U16–U18 remain non-normative limitations; updated selected slice, uncertainty dispositions and checkpoint | Plan only; underlying behavior/qualification gaps remain. No new runtime evidence, specs or lifecycle changes. Next action: separately authorized bounded invite draft. |
| 2026-10-15 | A23: user “i authorise”; CLI-scaffolded and drafted only member invite-link baseline proposal, six ADDED requirements/18 scenarios, extraction design/tasks and plan/evidence mapping | Strict selected-change validation passed; final bounded six-path documentation outcomes in response/harness record. Runtime not-run; main and prior active/archive artifacts preserved. Stop for human review; no acceptance, promotion, archival or application work. |
| 2026-10-15 | A24: user “promote it”; promoted only the reviewed six member invite-link requirements/18 scenarios verbatim into main, now 18 requirements/49 scenarios | Main-spec strict validation passed; final three-path documentation/all-strict outcomes in response/harness record. Earlier requirements, delta and prior artifacts preserved; both changes remain active. No archival/application work; runtime not-run. |
| 2026-10-15 | A25: user “you can archive both”; archived shared-access and member invite-link after 4/4 artifact, 5/5 task and full delta/main equality checks for each | Main remains unchanged at 18 requirements/49 scenarios; metadata/deltas and previous archive preserved; moved artifact links/status repaired. Final bounded checks in response/harness record; runtime not-run. No active changes or application work. |
| 2026-10-15 | A26: ordinary-household member-creation discovery/review only; traced both shared-form callers, validation/client/API/EF/SQL and response/list/handoff, including failure and repeated-submission limits; added BSL-009–011 and U19–U21 | Plan only; main remains 18 requirements/49 scenarios, three archives preserved, no active/new changes or application work. Runtime not-run; final bounded documentation outcomes in response/harness record. Next decision: extraction treatment of U19–U21; no drafting authorized. |
| 2026-10-15 | A27/A28: CLI-scaffolded bounded member-creation draft, seven additions/21 scenarios, proposal/design/tasks and BSL-012 mapping. User requires future 201 contract alignment and trimmed case-insensitive uniqueness/409; no application edits | Selected strict validation passed; final six-path checks in response/harness record. Future implementation tasks remain incomplete; runtime not-run. Stop for draft review; main 18/49 and prior archives preserved. |
| 2026-10-15 | A29: user approved and promoted member-creation delta; appended seven requirements/21 scenarios verbatim to main, now 25/70; preserved prior content and delta | Main strict passed; final three-path documentation/all-strict/content results in response/harness. Change active with four future implementation tasks open; 201 contract correction and uniqueness not implemented; runtime not-run. No archival/application work. |
| 2026-10-15 | A30 task 2.1: corrected POST OpenAPI to 201, stateful mocks and focused test coverage; BSL-013 records scoped results | Unit 738 passed; Kiota timeout and socket blocks halted verification. Task remained unchecked. |
| 2026-10-15 | A30 task 2.1 resumed: Settings reload bug resolved (failing regression added in `FamilyManagement.creation.test.tsx`, `FamilyManagement.tsx` loads family on mount); Kiota check passed, API tests passed (898), Playwright passed (7/7: onboarding and member-creation), live endpoint parity confirmed; PostgreSQL skipped/blocked (Docker daemon down, connection unset) | Unit 741 passed; Kiota passed; Playwright 7/7 passed; API 898 passed; live parity passed on 5001; disposable PostgreSQL blocked. Task 2.1 remains open pending PostgreSQL check. Stop before uniqueness/tasks 2.2–2.4. |
| 2026-10-15 | A31 phase-0 review and bounded current member-creation trace; plan-only reconciliation BSL-014/U22 | Frame remains approved. CLI root/inventories passed; zero active changes, main 25/70, four archives. Current 409/index and checked archived tasks conflict with older plan and incomplete database evidence. Historical runtime outcomes retained at their identity; current runtime not-run. Recommend separately selected acceptance-evidence review before new baseline work. |
| 2026-10-15 | A32 member-creation acceptance/archival evidence reviewed; required future-spec status sentence captured in BSL-015 | Seven requirement blocks/21 scenarios match main exactly; source manifest unchanged. Acceptance/provenance remains unresolved U22: PostgreSQL unqualified, historical record stale, later authorization not found. Three broken archive links recorded without repair. Current runtime not-run; user reports later authorization, original reference pending. Plan only; no successor slice or lifecycle action. |
| 2026-10-15 | A33 bounded qualification readiness, BSL-016 | PostgreSQL variable unset; Docker socket sandbox-denied, exit 1. Focused PostgreSQL test not-run; qualification blocked. Exact local handoff recorded; no escalation or application/archive changes. Authorization reference remains pending. |
| 2026-10-15 | A34 requirements focus restored; implementation/database qualification explicitly deferred | A10 remains sufficient for initial source-supported drafts. Selected next discovery: recipe-library ordinary-household list visibility, with no generation yet. Member-creation gaps and future-spec note retained; they do not block independent requirements work. No runtime/application/archive actions. |
| 2026-10-15 | A35 household-identity coverage audit BSL-017 | Found three remaining requirements slices: rename, API removal and Profile switching. Corrected premature library progression; recommend rename discovery first. Source/test assertion review only, runtime not-run; A34 implementation/database deferral preserved. |
| 2026-10-15 | A36 member-renaming discovery BSL-018 completed | Full shared-list PUT/service/EF/returned-label path and meaningful test substitutions inspected. U23/U24 record constraint/contract and failure/pending gaps; runtime not-run. Recommend bounded rename draft under A12 without repairs. No specs/generated artifacts or application changes. |
| 2026-10-15 | A37 CLI-scaffolded member-renaming baseline proposal, five additions/12 scenarios, extraction design/tasks and BSL-019 mapping | Strict selected-change validation passed; final six-path documentation checks in response/harness. U23/U24 non-normative; required historical sentence included. Stop for human draft review, no acceptance/promotion/archive/application changes; runtime deferred. |
| 2026-10-15 | A38 member-renaming promotion and new-session handoff | Five additions/12 scenarios appended unchanged; main now 30/82 with all prior bytes preserved. Strict spec validation passed; final three-path checks in response/harness. Rename remains active. Next discovery API removal, then Profile switching; database/implementation deferred, library queued. |
| 2026-10-15 | A39 API member-removal discovery/review only; BSL-020/021 traces disconnected client/API deletion, FK declarations, list/current-identity outcomes and actual test substitutions; U25/U26 added | Plan only; main unchanged 30/82, rename remains active, all unrelated staging/edits/deletions preserved. Runtime not-run under A34; final bounded documentation checks in response/harness. Next decision: limited API-success/list-only draft with error/FK/browser limits non-normative; no generation. |
| 2026-10-15 | A40 user “yes” confirms the API-success/list-only removal-draft boundary and non-normative U25/U26 treatment | Plan only; no new behavior/runtime evidence, specs or lifecycle changes. Main 30/82, rename active, unrelated edits/index/deletions preserved. Final bounded documentation checks in response/harness; generation awaits separate authorization. |
| 2026-10-15 | A41 CLI-scaffolded bounded API member-removal draft: proposal, two ADDED requirements/two scenarios, extraction design/tasks and BSL-022 mapping | Selected strict validation passed; final six-path documentation/content results in response/harness. U25/U26 non-normative; historical BSL-015 sentence retained. Main unchanged 30/82, rename active, runtime not-run. Stop for human draft review; no application, acceptance, promotion or archival work. |
| 2026-10-15 | A42 bounded member-removal draft review; BSL-023 records no blocking normative issue and recommends exact 2/2 delta ready for acceptance | All 35 evidence inputs unchanged; main 30/82 and both active changes preserved. Plan only; final strict/content/documentation outcomes in response/harness. Human acceptance pending; no promotion/archive/application or runtime work. Next decision: accept exact delta, with promotion separately authorized. |
| 2026-10-15 | A43 promoted the reviewed API member-removal 2/2 delta verbatim; main now 32 requirements/84 scenarios | All previous main bytes and delta retained; removal/rename active, no archival. Final main/all strict and three-path documentation/content outcomes in response/harness. Runtime not-run under A34. Next: separately selected Profile-switching discovery; no successor extraction. |
| 2026-10-15 | A44 connected Profile-switching discovery/review, BSL-024; inline menu opening/dismissal, actual Profile handoff, Continue-as, shared owners and test substitutions reconciled; U27/U28 added | Plan only; main unchanged 32/84, rename/removal active, unrelated edits/index/deletions retained. Reused 20-file manifest unchanged; 31-input switching manifest recorded. Runtime not-run; final bounded strict/documentation/content results in response/harness. Next decision: confirm bounded Profile-menu/handoff draft boundary with U27/U28 non-normative; no generation authorized. |
| 2026-10-15 | A45 user confirmed Profile boundary and authorized draft; CLI-scaffolded proposal, four ADDED requirements/eight scenarios, extraction design/tasks and BSL-025 mapping | Selected strict validation passed; final all strict, six-path documentation/content and preservation outcomes in response/harness. U27/U28 non-normative, BSL-015 exact historical sentence/caveat retained. Main unchanged 32/84; all three changes active, no acceptance/promotion/archive. Runtime not-run; stop for human draft review, library queued. |
| 2026-10-15 | A46 promoted Profile-switching four/eight delta verbatim; main now 36 requirements/92 scenarios | Prior main bytes/delta retained; all three changes remain active, no archival. Final main/all strict and three-path doc/content/preservation outcomes in response/harness. Runtime not-run; next separately selected discovery is queued recipe-library ordinary-household list visibility. No successor extraction. |
| 2026-10-15 | A47 recipe-library ordinary-household list-visibility discovery/review; BSL-recipe-library-001/002 trace actual library route/control, direct generated list request, stored eligibility, query/page/DTO/store/render, actual assertions and local loading/empty/failure/retry; U29–U31 added | Plan only; main identity unchanged 36/92 and all three promoted changes active. Runtime not-run under A34; final bounded strict/documentation/content/preservation results in response/harness. Next decision: confirm bounded draft with U29–U31 non-normative; drafting/lifecycle/application work unauthorized. |
| 2026-10-15 | A48 confirmed library boundary and authorized draft; CLI-scaffolded proposal, nine ADDED requirements/18 scenarios, extraction design/tasks and BSL-recipe-library-003 mapping | Selected strict validation passed; final all-strict/six-path documentation/content/preservation outcomes in response/harness. All 33 inputs unchanged; U29–U31 non-normative, BSL-015 sentence/caveat retained. Main identity 36/92 and three promoted changes preserved; library remains draft only. Runtime not-run under A34; stop for human review, no lifecycle/application work. |
| 2026-10-15 | A49 promoted recipe-library list-visibility delta; created main with verbatim Purpose and nine requirements/18 scenarios | Main strict and all-spec strict 2/2 passed; final all-item strict/three-path documentation/content/equality/preservation results in response/harness. Delta and all 33 evidence inputs unchanged, household identity stays 36/92, four promoted changes active. No archival, application/runtime/database work or successor extraction. |
| 2026-10-15 | A50 discovered and drafted only recipe-library detail reading; BSL-recipe-library-004–006 maps seven additions/13 scenarios and U32–U34 records predicates/error/content limitations | Prior 33 source digests unchanged; eleven additional detail inputs recorded. Main library nine/18 and identity 36/92/four active changes preserved. Selected/final strict, six-path docs/content and preservation results in response/harness; runtime not-run A34. Stop for review, no lifecycle/application/successor work. |
| 2026-10-15 | A51 user approved and promoted detail reading; seven requirements/13 scenarios appended verbatim, main recipe-library now 16/31 | Prior main Purpose/list blocks, full delta and 44 inputs unchanged; identity remains 36/92, five changes active. Final strict/three-path docs/content/equality/preservation results in response/harness; runtime not-run A34. No archival, application or successor work. |
| 2026-10-15 | A52 discovered and CLI-drafted only ordinary-household recipe-library detail editing; nine additions/17 scenarios, extraction design/tasks and BSL-recipe-library-008–010 mapping; U35–U37 records normalization/contract/completion limits | 44 prior inputs unchanged; main library 16/31 and identity 36/92, five prior active changes, archives and unrelated dirty/staged/deleted work preserved. Selected strict passed; final all strict/six-path docs/content/preservation in response/harness. Runtime not-run A34; stop for review, no lifecycle/application/successor work. |
| 2026-10-15 | A53 promoted the reviewed detail-editing nine/17 delta verbatim; main recipe-library now 25 requirements/48 scenarios | Prior Purpose and all 16/31 bytes, full delta and 50 source/dependency identities unchanged; household-identity 36/92 and all six changes active. Final strict/three-path docs/content/equality/preservation in response/harness. Runtime not-run A34; no archival, application or successor work. |
| 2026-10-15 | A54 discovered and CLI-drafted only loaded library ratings/notes: six additions/15 scenarios, proposal/extraction design/tasks and BSL-recipe-library-012–014 mapping; U38–U40 retain baseline/timer, premature Saved, failure/overlap and contract/assertion limits | All 50 prior evidence digests unchanged; main library 25/48, identity 36/92, six prior active changes, archives, unrelated work/index/deletions preserved. Selected/final strict, six-path docs/content/mapping and preservation outcomes in BSL-014/final response/harness. Runtime not-run A34; stop for human draft review; no lifecycle, application or successor work. |
| 2026-10-15 | A55 promoted reviewed ratings/notes six/15 delta verbatim; main recipe-library now 31 requirements/63 scenarios; supplied prompt for next loaded-detail discoverability extraction without executing it | Original Purpose/prior 25/48 bytes, full delta, all 55 source digests, identity 36/92, all seven active changes, archives/index/unrelated work/deletions retained. Final main/specs/all strict, three-path docs/content/equality/preservation in response/harness. Runtime not-run A34; no application, archival or successor artifacts. |
| 2026-10-15 | A56 discovered and CLI-drafted only loaded library detail discoverability: six additions/13 scenarios, proposal/extraction design/tasks and BSL-recipe-library-016–018 mapping; U41–U43 retain local restoration/overlap, file propagation and contract/assertion limits | All 55 prior evidence hashes unchanged; main library 31/63, identity 36/92, seven prior active changes/archives/index/unrelated dirty work/deletions preserved. Selected strict passed; final all-strict/six-path documentation/content/mapping/preservation in final response/current harness. Runtime not-run A34; stop for review, no lifecycle/application/successor work. |
| 2026-10-15 | A57 promoted reviewed loaded-detail discoverability six/13 delta verbatim; main recipe-library now 37 requirements/76 scenarios | Original Purpose/prior 31/63 bytes, full delta, all 60 source identities, household-identity 36/92, eight active changes, archives/index/unrelated work/deletions preserved. Main/specs strict passed; final all strict/three-path docs/content/equality/preservation in final response/current harness. Runtime not-run A34; no archival/application/successor work. |
| 2026-10-15 | A58 discovered and CLI-drafted only loaded library detail View Original: seven additions/18 scenarios, proposal/extraction design/tasks and BSL-recipe-library-020–022 mapping; U44–U47 retain absent URL fallback, external navigation, native image errors and gesture limits | All 60 prior evidence hashes unchanged; five new inputs recorded (65 total); main library 37/76, identity 36/92, eight prior active changes/archives/index/unrelated dirty work/deletions preserved. Selected strict passed; final all-strict/six-path documentation/content/mapping/preservation in final response/current harness. Runtime not-run A34; stop for review, no lifecycle/application/successor work. |
| 2026-10-15 | A59 promoted reviewed loaded-detail View Original seven/18 delta verbatim; main recipe-library now 44 requirements/94 scenarios | Original Purpose/prior 37/76 bytes, full delta, all 65 source identities, household-identity 36/92, nine active changes, archives/index/unrelated work/deletions preserved. Main/specs strict passed; final all strict/three-path docs/content/equality/preservation in final response/current harness. Runtime not-run A34; no archival/application/successor work. |
| 2026-10-15 | A60 discovered and CLI-drafted only ordinary-household recipe deletion, Recycle Bin, restore, and PIN-protected purge: 11 additions/28 scenarios, proposal/extraction design/tasks and BSL-recipe-library-024–026 mapping; U48–U52 retain confirmation omission, silent deletion failure, no live SSE, generic purge error UI, and calendar cleanup asymmetry | All 65 prior evidence hashes unchanged; two new inputs recorded (67 total); main library 44/94, identity 36/92, nine prior active changes/archives/index/unrelated dirty work/deletions preserved. Selected strict passed; final all-strict/six-path documentation/content/mapping/preservation in final response/current harness. Runtime not-run A34; stop for review, no lifecycle/application/successor work. |
| 2026-10-15 | A61 promoted reviewed recipe deletion, Recycle Bin, restore, and PIN purge 11/28 delta verbatim; main recipe-library now 55 requirements/122 scenarios | Original Purpose/prior 44/94 bytes, full delta, all 67 source identities, household-identity 36/92, ten active changes, archives/index/unrelated work/deletions preserved. Main/specs strict passed; final all strict/three-path docs/content/equality/preservation in final response/current harness. Runtime not-run A34; no archival/application/successor work. |
| 2026-10-15 | A62 discovered and CLI-drafted only ordinary-household recipe sharing: nine additions/27 scenarios in recipe-sharing, proposal/extraction design/tasks and BSL-recipe-sharing-001–003 mapping; U53–U57 retain format/mime, version tolerance, share fallback, duplicate advisory, and no-SSE limits | All 67 prior evidence hashes unchanged; five new inputs recorded (72 total); main library 55/122, identity 36/92, eleven active changes, archives/index/unrelated dirty work/deletions preserved. Selected strict passed; final all-strict/six-path documentation/content/mapping/preservation in final response/current harness. Runtime not-run A34; stop for review, no lifecycle/application/successor work. |
| 2026-10-15 | A63 user “promote”; created main recipe-sharing specification with verbatim Purpose and nine requirements/27 scenarios; now recipe-sharing 9/27 | Original Purpose/prior content retained in existing main specs (household-identity 36/92, recipe-library 55/122); full delta and all 72 source/dependency identities unchanged; eleven active changes, archives/index/unrelated work/deletions preserved. Main/specs strict passed; final all strict/three-path docs/content/equality/preservation in final response/current harness. Runtime not-run A34; no archival/application/successor work. |
| 2026-10-15 | A64 discovered and CLI-drafted only ordinary-household recipe capture: nine additions/20 scenarios in recipe-capture, proposal/extraction design/tasks and BSL-recipe-capture-001–003 mapping; U58–U61 retain advisory duplicate limits, external scraping fallback, local queued timer, and DB persistence before trigger | All 72 prior evidence hashes unchanged; 12 new inputs recorded (84 total); main library 55/122, identity 36/92, sharing 9/27, twelve active changes, archives/index/unrelated dirty work/deletions preserved. Selected strict passed; final all-strict/six-path documentation/content/mapping/preservation in final response/current harness. Runtime not-run A34; stop for review, no lifecycle/application/successor work. |
| 2026-10-15 | A65 user “promote”; created main recipe-capture specification with verbatim Purpose and nine requirements/20 scenarios; now recipe-capture 9/20 | Original Purpose/prior content retained in existing main specs (household-identity 36/92, recipe-library 55/122, recipe-sharing 9/27); full delta and all 84 source/dependency identities unchanged; twelve active changes, archives/index/unrelated work/deletions preserved. Main/specs strict passed; final all strict/three-path docs/content/equality/preservation in final response/current harness. Runtime not-run A34; no archival/application/successor work. |
### End-of-session update template

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

## Reusable prompt for GPT-6.1 Sol

Select GPT-6.1 Sol in your host, then paste this prompt. The prompt does not change
the model setting. Replace the session instruction with the scope you want; leave
it at review to keep the next session discovery-only.

```text
We are progressively extracting OpenSpec baseline specifications for the existing
What's for Supper application. This is brownfield documentation work.

Repository: /Users/alex/Code/whats-for-supper
Durable plan: docs/openspec-baseline-plan.md
Session instruction: Review phase 0 and recommend the next bounded action.

Read AGENT.md, its context-loading rules and the adapter for the active host.
Then read the durable plan, especially approvals, latest checkpoint, uncertainty
register and selected capability evidence. Treat this prompt's session instruction
and current user messages as the work scope. Do not infer drafting authority from
the plan, checkboxes, prior artifact existence or a discussion answer.

Start with git status and current source identity. Preserve unrelated edits,
including deletion of the old background-task-navigation spec. Never restore or
recreate that capability by default. Run read-only OpenSpec discovery and resolve
the configured root/store; do not initialize or reconfigure OpenSpec.

Choose one capability and one observable workflow slice within the authorized
scope. Reuse accepted decisions and current evidence; recheck anything affected
by source changes. Trace entry/UI -> client/OpenAPI -> API/service -> persistence
or workflow -> observable result. Inspect tests' assertions and substitutions,
configuration, negative paths and relevant documentation. Do not rescan the whole
repository when the selected slice is already bounded.

For the slice, document domain name, business purpose, implemented capabilities,
important workflows, business rules, source files, tests, dependencies,
uncertainties and confidence. Record evidence IDs and distinguish verified,
implementation-supported, inferred and missing/incomplete behavior. A test file
or mock success is not a current passing runtime result. Record actual checks as
passed, failed, blocked, not-run or not-applicable with content/environment identity.

Do not change application code, tests, API contracts, generated clients, SQL,
dependencies, deployment or agent configuration. Do not refactor, fix defects,
implement gaps, invent requirements or equate intended behavior with implemented
behavior. Record mismatches; withhold disputed normative claims. Ask consequential
questions one at a time, continuing independent useful discovery when possible.

If structure or generation approval is missing, remain in discovery/review mode,
update the plan within the authorized documentation scope, and stop with the next
focused decision. If the user has already approved the structure and authorized
this slice's drafting, continue without asking for the same permission again.

For authorized drafting, follow the currently installed OpenSpec workflow and
artifact instructions. Use a documentation-only change scoped to the selected
baseline slice; scaffold it with the CLI, not by hand. Tasks describe extraction,
evidence reconciliation and spec validation, not application implementation.
Use only supported, settled observable behavior and reference shared rule owners.
Do not write placeholder specs for uninspected capabilities. Keep source evidence
and uncertainties in the durable plan with requirement/scenario mappings.

Review and validate the selected draft. Human acceptance, main-spec promotion and
archival are separate statuses/actions; perform them only within current recorded
authorization. Never apply application implementation. Run applicable bounded
documentation/OpenSpec checks after final edits. If a command is sandbox-blocked,
report it and provide the exact local command; do not request escalation.

Before stopping, update this plan's selected slice, approvals/decisions, evidence,
artifact status, session log and latest checkpoint. Do not mark a draft accepted
or source-supported behavior runtime-verified. Report changed files, exact check
outcomes, unresolved limits, and the next bounded action. Stop at the session's
authorized boundary; do not generate the remaining baseline in one pass.
```

### Example session instructions

- First review: `Review phase 0. Ask the first consequential question and continue independent discovery. Do not generate specs.`
- After explicit structure approval: `Draft only household-identity's shared-access and member-selection slice. Stop for review before main-spec promotion.`
- Further discovery: `Trace grocery check-state identity and concurrent updates for grocery-shopping/U06. Update evidence only; no specs or fixes.`
- Draft review: `Review the selected baseline change against implementation and tests. Report unsupported assertions; do not edit application behavior.`
- After draft acceptance: `Sync only the accepted delta paths into main specs using the installed workflow; validate and update the checkpoint. Do not archive or implement.`
- Subsequent session: `Continue the next incomplete slice within the recorded drafting authorization. Reconcile current source changes first; preserve all existing decisions.`

These examples illustrate scope; they are not active authorizations.
