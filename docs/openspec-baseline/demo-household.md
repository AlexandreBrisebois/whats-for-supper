# Demo household baseline plan

## Current lifecycle checkpoint — consolidated, 2026-10-16

This capability's main spec now contains **26 requirements / 62 scenarios**.
All baseline source changes were archived after the user's explicit approval;
there is no active baseline extraction/promotion queue. Historical checkpoint,
next-session and "changes active" text below records earlier sessions only.
Evidence limitations and unresolved findings remain in the [live backlog](backlog/README.md).
See [consolidation completion](backlog/consolidation-completion.md) for accepted
scope, preserved corrections, archive warnings and verification. Archival does not
establish application correctness, runtime qualification or resolution of defects.

## Current checkpoint and scope

2026-10-16, DH-P01: all six selected deltas passed repeat verification and were
accepted/promoted into [the main demo-household specification](../../openspec/specs/demo-household/spec.md)
under the user's conditional instruction “verify again, then if it passes promote”.
The main baseline contains 26 requirements and 62 scenarios. The six source changes
remain active and unarchived. Runtime qualification remains not-run/deferred under
A34; promotion is documentation-only and retains U07/DH-U01–DH-U09.

Exact next action: retain the promoted baseline and its evidence qualifications.
No further lifecycle action, application implementation or runtime qualification
is authorized by this promotion. Final post-promotion verification is reported
against the final content identity in the response and its invocation-specific record.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md), then this file.

**Phase-12 reconciliation R12 (2026-10-16):** Recorded promoted documentation remains 26 requirements / 62 scenarios; no additional supported extraction gap was found within this plan's explicit boundary.
[Cross-capability review](reconciliation.md) records current inventory, shared-owner
reconciliation, evidence drift and exclusions. Current main SHA-256: `129c138c9bd67208a848af1c71b2c05810bdee3bb22fa1d688bff70787567801`.
This session grants no new acceptance or promotion. Earlier session-specific
“current user” and next-action statements retain their historical scope. A34 and
all local unresolved/excluded behavior remain in force; runtime checks are not-run.


## Capability map and starting points

| Capability / purpose | Candidate scope and rules to recheck | Source starting point | Existing test starting point | Dependencies / initial confidence |
| --- | --- | --- | --- | --- |
| Demo household: operate a resettable showcase | Snapshot capture/restore, activity clearing, restore schedule, health/auth presentation, actual AI bypass boundaries; no blanket no-AI-cost claim | [demo state methods](../../api/src/RecipeApi/Services/ManagementService.cs), [demo seeder](../../api/src/RecipeApi/Services/DemoWorkflowSeeder.cs), [chat blocker](../../api/src/RecipeApi/Services/DemoModeChatClient.cs), [registrations](../../api/src/RecipeApi/Program.cs) | [demo seeder tests](../../api/src/RecipeApi.Tests/Services/DemoWorkflowSeederTests.cs), [management tests](../../api/src/RecipeApi.Tests/Controllers/ManagementControllerTests.cs), [demo browser tests](../../pwa/e2e/demo-mode.spec.ts) | Identity, snapshot data/assets, workflows, provider boundaries / medium |

Shared owners and evidence policy live in [workflow.md](workflow.md). Recheck
these source/test starting points before using them as current evidence.

## Authorization, decisions and input identity

- DH-A01 (2026-10-16): the current pasted user request explicitly selects the whole
  demo-household capability and authorizes discovery, reconciliation and all supported
  drafts through necessary bounded slices without another generation approval.
- DH-A02: stop at validated drafts ready for human review. Acceptance, promotion,
  sync, archival, application changes, runtime qualification and service startup are
  outside scope. A10/A12 evidence treatment and A34 remain in force.
- DH-A03: no main demo-household specification or existing demo change was found by
  current `openspec context`, change inventory and main-spec inventory. Resolved root
  is `/Users/alex/Code/whats-for-supper` (nearest, repo-local); schema spec-driven.
  Six complementary deltas therefore use ADDED requirements, not a duplicate owner.
- DH-A04: household-identity owns shared access, selection and transport; background-
  processing owns acceptance, states, dependency promotion, retries and child cron.
  Exact owning requirement titles appear in the deltas. Main app-installation covers
  ordinary non-demo behavior; demo artwork here does not redefine ordinary installation.
- DH-A05: unsupported broad claims are withheld under A12, not accepted as desired
  defects. No consequential unresolved product choice was needed for the narrower
  supported drafts. The unresolved findings below remain for human review.

Baseline: branch `moving-to-openspec`, commit
`04a1c4570f9bbb01b47436790d4248635ac3179a`. Before the first write, expanded Git status
had 357 entries: 196 with staged changes, 14 with unstaged changes (counts overlap),
and 149 untracked files; no deleted entry. The selected plan had no prior HEAD diff;
no demo artifact existed. Other baseline plans/main specs/changes were extensively
dirty. Relevant shared main specs household-identity and background-processing were
already staged modifications; app-installation main was untracked at discovery.
Evidence describes their current working content, not only HEAD.

Pre-existing harness inputs include unstaged `.agents/core/execution-harness.md`,
staged `.github/workflows/validate.yml`, staged and unstaged `Taskfile.yml`, unstaged
`scripts/agent/finish.py` and untracked
`scripts/agent/tests/test_parallel_documentation.py`. These were read, not adopted or
edited. Source, tests, API contract, generated clients, SQL and deployment starting
points had no selected demo implementation edits. No input was staged or committed.
During the session, unrelated app-installation and tonight-meal-decisions plans,
tasks and app-installation main-spec content changed concurrently. Those edits were
not made or reverted by this task. The index edit is limited to the Demo household
row and preserves the other current rows. Main app-installation was rechecked in
full after its concurrent promotion; demo artwork remains outside its ordinary
identity requirements.

Private before-images, full expanded status/staged/unstaged lists and SHA-256 map
were captured before writes at `/tmp/wfs-demo-baseline`; the relevant durable source
identity table below permits rechecking evidence after a source change.

## Ten discovery fields

| Field | Discovery |
| --- | --- |
| Name | demo-household: resettable showcase |
| Business purpose | Let visitors explore a shared showcase whose host can capture core content and clear later activity through restore |
| Existing capabilities | Boolean demo activation, anonymous API diagnostics, Welcome prefill, creation restriction, localized presentation/artwork, core snapshot capture/restore, transient-state clearing, scheduled restores, five processor bypasses and decorated-chat rejection |
| Important workflows | Activation/access → capture → restore/clear → initial scheduled restore → dependent recurrence → diagnostic observation; direct providers are separate boundaries |
| Business rules | Existing household authentication/member context; current active recipe query filtering; four required core files; Pending/Processing seed suppression; future UTC cron scheduling; bypass names do not imply all-AI blocking |
| Source files | BSL-demo-household-001–016 ordered traces and source identity table below |
| Tests | Listed starting suites rechecked; actual assertions and substitutions recorded in every evidence entry; none executed as runtime qualification |
| Dependencies | Identity, recipe library facts/query filtering, EF/SQL constraints, filesystem roots, background-processing, workflow definition storage, AI providers and recipe-search owner |
| Uncertainties | U07 and DH-U01–DH-U09 below; runtime/database/device/provider qualification deferred under A34 |
| Confidence | High for simple aligned configuration/API/presentation paths; medium for restore/assets/concurrency/provider integrations; confidence does not establish runtime verification |

## Dependency-ordered coverage and current lifecycle

Each directory contains CLI-scaffolded `.openspec.yaml`, proposal.md,
`specs/demo-household/spec.md` and documentation-only tasks.md. Optional design.md
is deliberately omitted under the installed conditional rule: no implementation or
architectural design is proposed. No empty design placeholder or application task
is created. File-existence status may list the omitted design as ready; that is not
an implementation blocker or authority to apply.

| Order / capability-map item | Selected change / evidence | Extracted scope | CLI validation | Accepted | Promoted / archived |
| --- | --- | --- | --- | --- | --- |
| 1. Demo activation and household access | [baseline-demo-household-activation-access](../../openspec/changes/archive/2026-10-16-baseline-demo-household-activation-access/proposal.md); BSL-demo-household-001/002/003/004 | 6 requirements / 14 scenarios | Passed strict CLI validation | Yes, DH-P01 | Yes, DH-P01 / no |
| 2. Demo snapshot capture | [baseline-demo-household-snapshot-capture](../../openspec/changes/archive/2026-10-16-baseline-demo-household-snapshot-capture/proposal.md); BSL-demo-household-005/006/007 | 3 requirements / 8 scenarios | Passed strict CLI validation | Yes, DH-P01 | Yes, DH-P01 / no |
| 3. Demo restore and activity clearing | [baseline-demo-household-snapshot-restore-activity](../../openspec/changes/archive/2026-10-16-baseline-demo-household-snapshot-restore-activity/proposal.md); BSL-demo-household-005/007/008/009 | 6 requirements / 12 scenarios | Passed strict CLI validation | Yes, DH-P01 | Yes, DH-P01 / no |
| 4. Automatic demo restore scheduling | [baseline-demo-household-automatic-restore](../../openspec/changes/archive/2026-10-16-baseline-demo-household-automatic-restore/proposal.md); BSL-demo-household-001/010/011 | 4 requirements / 12 scenarios | Passed strict CLI validation | Yes, DH-P01 | Yes, DH-P01 / no |
| 5. Demo workflow execution and diagnostics | [baseline-demo-household-workflow-observation](../../openspec/changes/archive/2026-10-16-baseline-demo-household-workflow-observation/proposal.md); BSL-demo-household-005/006/008/010/011/016 | 4 requirements / 10 scenarios | Passed strict CLI validation | Yes, DH-P01 | Yes, DH-P01 / no |
| 6. Demo AI bypass and provider boundaries | [baseline-demo-household-ai-boundaries](../../openspec/changes/archive/2026-10-16-baseline-demo-household-ai-boundaries/proposal.md); BSL-demo-household-012/013/014/015 | 3 requirements / 6 scenarios | Passed strict CLI validation | Yes, DH-P01 | Yes, DH-P01 / no |

All six original capability-map areas have mapped draft coverage. Activity clearing
is included in restore; there is no independent clear API. Workflow seeding covers
both packaged definition copying and initial instance scheduling, not fabricated
sample data. AI-provider gaps are explicitly excluded under BSL-demo-household-014.
No supported scope is left as a recommendation for successor extraction.

## Discrepancies, exclusions and unresolved review findings

| ID | Evidence-backed finding | Baseline treatment / status |
| --- | --- | --- |
| U07 | BSL-012–014: five first-match worker bypasses and decorated chat do not cover GenerateHero SDK calls or GeminiEmbeddingProvider HTTP calls | Narrow bypass/chat requirements drafted; global AI blocking/no-cost claims excluded; broad policy remains unresolved |
| DH-U01 | BSL-006/008: recipe HasQueryFilter omits soft-deleted rows during capture and deletion; search documents are independently queried. Captured IDs later soft-deleted can collide on insertion | Active/compatible recipe case without concurrent writes only; complete library reset/soft-delete recovery and referential completeness withheld; no repair |
| DH-U02 | BSL-007/008: sequential capture writes; DB restore commits before destructive directory replacement; absent source recipe directory creates an empty destination | No atomic capture/restore, complete asset coverage, missing-assets safety, rollback after file failure or recovery promise; destructive missing-directory behavior remains non-normative |
| DH-U03 | BSL-009: explicit clear sets plus FK cascades are narrower than all-state reset; settings/categories/maintenance/filter state not recaptured | Actual explicit clearing without concurrent writes drafted; no universal preservation or full reset. Affinity/feature-override cascade outcomes remain unqualified |
| DH-U04 | BSL-010/011: non-atomic active check then insert, no distributed lock; recurrence depends on restore success; manual restore can spawn chains even when demo disabled | No exactly-once, guaranteed reset deadline, catch-up, guaranteed future child or automatic chain recovery |
| DH-U05 | BSL-002/004: PWA identity uses its own environment; PWA-local /api/health returns false and incomplete diagnostics, while API health reports options | Specify API and PWA boundaries separately; deployment routing/consistency not qualified |
| DH-U06 | BSL-005: status is latest management workflow, not selected request; result can come from reschedule. SnapshotReady checks four files, SeederHealthy means cron-valid only. No-history 404 absent from approved OpenAPI | Aligned successful response drafted; disputed 404 assertion withheld, contract unchanged; no successful seed or asset-integrity guarantee |
| DH-U07 | BSL-006/009/014: user guide says plans/votes restored and AI disabled to avoid costs, contradicting executable paths | Guide claims excluded as normative evidence; guide left untouched under selected file boundary |
| DH-U08 | BSL-003/005/010/012/015: auth-off EF InMemory factory, mocked orchestration/chat/embedding, simplified seed YAML and browser mocked API do not exercise production seams | Assertions inspected only; no PostgreSQL rollback, DI integration, recurrence, provider isolation or production-auth qualification |
| DH-U09 | BSL-016: workflow seeder copies to WorkflowRootResolver but repository storage reads DataRoot/workflows; custom roots can diverge | Copy behavior drafted; successful custom-root workflow execution withheld; packaged build/startup checks not run |

No current blocking product question was silently answered: the supported subset
uses existing owner rules and the user's explicit extraction authority. Whether to
adopt any withheld broader/disputed behavior requires a subsequent human decision;
these exclusions do not authorize a defect fix or change the approved API contract.

## Evidence entries

All entries describe the working content at the identity recorded above.
Runtime check command/outcome/environment: **not-run**, A34 and current user scope;
no services, real household data, database, browser or provider were accessed.
Observed verification of these documents is recorded separately below. No behavior
entry is classified Verified merely because its source or test was inspected.

### BSL-demo-household-001

- **Behavior and actor:** API host / demo activation and cron options.
- **Entry state / trigger / observable outcome:** Process configuration → enabled flag and resolved restore cron.
- **Business rule and eligibility:** Boolean parsing; absent/blank and invalid disable demo; cron defaults to 0 3 * * *.
- **Failure / cancellation / recovery behavior:** Invalid activation logs warning; invalid cron is diagnosed separately.
- **Configuration and time assumptions:** DEMO_MODE; DEMO_RESTORE_CRON_UTC; configuration is read into singleton options.
- **Ordered trace:** configuration → DemoModeOptions → Program registrations / consumers.
- **Relevant source files and symbols:** [DemoModeOptions.cs](../../api/src/RecipeApi/Services/DemoModeOptions.cs), [Program.cs](../../api/src/RecipeApi/Program.cs), [DemoModeOptionsTests.cs](../../api/src/RecipeApi.Tests/Services/DemoModeOptionsTests.cs). Symbols are named in the ordered trace.
- **Relevant test assertions and substitutions:** Enabled_WhenDemoModeValueInvalid_LogsWarningWithRawValue asserts disabled and warning contains raw invalid input; no valid-value matrix in this API test. PWA parser has its own matrix.
- **API/implementation/test/documentation agreement or mismatch:** Health contracts expose enabled/raw state, not IsRawValueValid. No claim that independently configured hosts agree.
- **Evidence class and confidence:** Implementation-supported, high; current runtime verification not observed.
- **Check command / outcome / environment / content identity:** Runtime not-run under A34; source identity below; static documentation checks have their separate session record.
- **Open question or explicit limitation:** No activation API, runtime toggle or zero-cost implication.
- **Disposition:** accepted/promoted under DH-P01; initially drafted in the extraction session.
- **Requirement/scenario mapping:** `activation-access` → **Resolve demo activation from API configuration** → “Enable demo”, “Disable demo”, “Invalid activation”; `automatic-restore` → **Default the automatic restore schedule to daily UTC** → “Before daily target”, “At daily target”, “Custom daily target”

### BSL-demo-household-002

- **Behavior and actor:** Anonymous API visitor / health diagnostics.
- **Entry state / trigger / observable outcome:** GET /api/health → diagnostics and DB-driven status.
- **Business rule and eligibility:** Connectivity and core queries determine 200/503; cron validity independent.
- **Failure / cancellation / recovery behavior:** CanConnect/Any exceptions become unhealthy checks; cron exceptions become false.
- **Configuration and time assumptions:** Options singleton; health uses current UTC for cron check.
- **Ordered trace:** shared client health.get → approved health contract → HealthController.Get → RecipeDbContext checks → raw response.
- **Relevant source files and symbols:** [HealthController.cs](../../api/src/RecipeApi/Controllers/HealthController.cs), [HealthCheckResponseDto.cs](../../api/src/RecipeApi/Dto/HealthCheckResponseDto.cs), [HealthControllerTests.cs](../../api/src/RecipeApi.Tests/Controllers/HealthControllerTests.cs), [openapi.yaml](../../specs/openapi.yaml), [index.ts](../../pwa/src/lib/api/generated/api/health/index.ts), [index.ts](../../pwa/src/lib/api/generated/models/index.ts), [route.ts](../../pwa/src/app/api/health/route.ts). Symbols are named in the ordered trace.
- **Relevant test assertions and substitutions:** Health_Response_Includes_Required_Checks asserts default false and checks; Health_Response_Reports_DemoMode_When_Enabled asserts true; healthy checks use EF InMemory, not PostgreSQL. demo-diagnostics-contract.test inspects schema/generated text.
- **API/implementation/test/documentation agreement or mismatch:** Approved API fields align with controller/DTO/generated model. PWA-local health route instead returns status ok and demoMode false without full diagnostics; routing is deployment-dependent.
- **Evidence class and confidence:** Implementation-supported, medium; current runtime verification not observed.
- **Check command / outcome / environment / content identity:** Runtime not-run under A34; source identity below; static documentation checks have their separate session record.
- **Open question or explicit limitation:** No live-route equivalence or healthy-seeder guarantee; cron does not affect overall health.
- **Disposition:** accepted/promoted under DH-P01; initially drafted in the extraction session.
- **Requirement/scenario mapping:** `activation-access` → **Report API demo diagnostics through anonymous health** → “Healthy diagnostics”, “Invalid cron diagnostics”, “Unhealthy storage”

### BSL-demo-household-003

- **Behavior and actor:** Household visitor / Welcome and member creation.
- **Entry state / trigger / observable outcome:** Health convenience load → editable prefill → ordinary passphrase submit; valid family POST in demo → forbidden.
- **Business rule and eligibility:** Existing identity owner retains passphrase/cookie/member context; only creation is demo-restricted.
- **Failure / cancellation / recovery behavior:** Health failure is swallowed; current typed value preserved; failed auth follows shared owner.
- **Configuration and time assumptions:** API demo flag drives prefill; configured HEARTH_SECRET still decides access.
- **Ordered trace:** Welcome → api-client health.get → health; submit → authenticateWithPassphrase → cookie/onboarding; family client → OpenAPI POST family → FamilyController.Create.
- **Relevant source files and symbols:** [page.tsx][demo-welcome-source], [page.test.tsx][demo-welcome-test], [auth.ts](../../pwa/src/lib/auth.ts), [api-client.ts](../../pwa/src/lib/api/api-client.ts), [proxy.ts](../../pwa/src/proxy.ts), [FamilyController.cs](../../api/src/RecipeApi/Controllers/FamilyController.cs), [HearthAuthenticationHandler.cs](../../api/src/RecipeApi/Infrastructure/HearthAuthenticationHandler.cs), [FamilyControllerTests.cs](../../api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs), [Program.cs](../../api/src/RecipeApi/Program.cs), [openapi.yaml](../../specs/openapi.yaml). Symbols are named in the ordered trace.
- **Relevant test assertions and substitutions:** Welcome test pre-populates the passphrase in demo mode stubs health/router/auth actions; no backend auth executed. Create_Returns_Forbidden_When_DemoMode_Enabled asserts 403 and message in an auth-disabled factory.
- **API/implementation/test/documentation agreement or mismatch:** POST family explicitly documents demo 403. Program global authorization remains; management has no extra admin/member role or demo-enabled guard. Household-identity access/selection requirements are referenced, not redefined.
- **Evidence class and confidence:** Implementation-supported, high; current runtime verification not observed.
- **Check command / outcome / environment / content identity:** Runtime not-run under A34; source identity below; static documentation checks have their separate session record.
- **Open question or explicit limitation:** Prefill is a hardcoded convenience, not proof host secret equals it or auto-login. No production auth qualification.
- **Disposition:** accepted/promoted under DH-P01; initially drafted in the extraction session.
- **Requirement/scenario mapping:** `activation-access` → **Prefill Welcome without bypassing household access** → “Empty welcome passphrase”, “User already typed”, “Health unavailable”; `activation-access` → **Reject demo member creation** → “Demo creation refused”

### BSL-demo-household-004

- **Behavior and actor:** Visitor / localized identity and demo artwork.
- **Entry state / trigger / observable outcome:** PWA runtime demo configuration → note and selected icon paths.
- **Business rule and eligibility:** Demo/ Démo has precedence over beta label; beta description remains accessible; name unchanged.
- **Failure / cancellation / recovery behavior:** Invalid PWA demo input defaults false with warning.
- **Configuration and time assumptions:** PWA DEMO_MODE independent of API; baked stable/beta release-channel JSON.
- **Ordered trace:** resolveAppIdentity → layout provider/metadata → IdentityHint; manifest route → icon and shortcut prefix.
- **Relevant source files and symbols:** [app-identity.ts](../../pwa/src/lib/server/app-identity.ts), [app-identity.test.ts](../../pwa/src/lib/server/app-identity.test.ts), [deployment-identity.test.ts](../../pwa/src/lib/server/deployment-identity.test.ts), [install-icons.test.ts](../../pwa/src/lib/server/install-icons.test.ts), [IdentityHint.tsx](../../pwa/src/components/identity/IdentityHint.tsx), [IdentityHint.test.tsx](../../pwa/src/components/identity/IdentityHint.test.tsx), [layout.tsx](../../pwa/src/app/layout.tsx), [route.ts](../../pwa/src/app/manifest.json/route.ts), [apps.yml](../../docker/compose/apps.yml), [compose.yaml](../../release-template/synology/compose.yaml). Symbols are named in the ordered trace.
- **Relevant test assertions and substitutions:** IdentityHint tests assert role/name/description in en/fr, SPAN, no tabindex/interactive descendants and pointer-events-none. app-identity tests cover parsing/variant matrix and runtime re-resolution. Install-icon tests inspect artifact existence, dimensions and safe circle using sharp; not device installs.
- **API/implementation/test/documentation agreement or mismatch:** Compose passes the same DEMO_MODE default to API/PWA; independently deployed hosts can diverge. Existing main app-installation requirements are explicitly ordinary/non-demo, so no existing demo artwork rule is modified.
- **Evidence class and confidence:** Implementation-supported, high; current runtime verification not observed.
- **Check command / outcome / environment / content identity:** Runtime not-run under A34; source identity below; static documentation checks have their separate session record.
- **Open question or explicit limitation:** No universal accessibility or responsiveness, installed-device refresh or host-consistency guarantee.
- **Disposition:** accepted/promoted under DH-P01; initially drafted in the extraction session.
- **Requirement/scenario mapping:** `activation-access` → **Present demo identity independently of authentication** → “Demo hint”, “Beta demo identity”; `activation-access` → **Select demo installation artwork** → “Stable demo artwork”, “Beta demo artwork”

### BSL-demo-household-005

- **Behavior and actor:** Household-authenticated API operator / management acceptance and status.
- **Entry state / trigger / observable outcome:** POST demo-capture or demo-restore → 202/taskId; GET status → latest management instance.
- **Business rule and eligibility:** Empty parameters; no action demo guard, admin role or member binder. Status considers five workflow names; newest CreatedAt, latest updated completed nonnull task result.
- **Failure / cancellation / recovery behavior:** No history returns implementation 404, absent from status OpenAPI responses; withhold normative 404 assertion. Trigger failure passes shared handling.
- **Configuration and time assumptions:** Presence-only four-file check; cron computed from current UTC.
- **Ordered trace:** generated management builders → OpenAPI → ManagementController → orchestrator → workflow rows; status → DB / demo file existence / cron.
- **Relevant source files and symbols:** [ManagementController.cs](../../api/src/RecipeApi/Controllers/ManagementController.cs), [ManagementStatus.cs](../../api/src/RecipeApi/Models/ManagementStatus.cs), [ManagementProcessor.cs](../../api/src/RecipeApi/Services/Processors/ManagementProcessor.cs), [WorkflowOrchestrator.cs](../../api/src/RecipeApi/Services/WorkflowOrchestrator.cs), [WorkflowWorker.cs](../../api/src/RecipeApi/Services/WorkflowWorker.cs), [ManagementControllerTests.cs](../../api/src/RecipeApi.Tests/Controllers/ManagementControllerTests.cs), [TestWebApplicationFactory.cs](../../api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs), [openapi.yaml](../../specs/openapi.yaml), [index.ts](../../pwa/src/lib/api/generated/api/management/demoCapture/index.ts), [index.ts](../../pwa/src/lib/api/generated/api/management/demoRestore/index.ts), [index.ts](../../pwa/src/lib/api/generated/api/management/status/index.ts), [demo-diagnostics-contract.test.ts](../../pwa/src/lib/api/demo-diagnostics-contract.test.ts). Symbols are named in the ordered trace.
- **Relevant test assertions and substitutions:** Demo_Management_Endpoints_Enqueue_Workflows asserts 202, message, GUID and persisted workflow name; factory substitutes orchestrator mock persisting Processing instances, with auth off and no production worker. Status tests assert four missing files, INVALID_CRON, and healthy cron despite missing snapshot; no capture/restore execution.
- **API/implementation/test/documentation agreement or mismatch:** 202 raw message/taskId and required status diagnostics align. Default test instance status differs from real orchestrator Pending, so no inferred Pending assertion from controller tests. Status 404 omitted from approved contract.
- **Evidence class and confidence:** Implementation-supported, high; current runtime verification not observed.
- **Check command / outcome / environment / content identity:** Runtime not-run under A34; source identity below; static documentation checks have their separate session record.
- **Open question or explicit limitation:** No demo management UI/call-site consumer found beyond generated builders; taskId is workflow-instance ID. Latest result may be reschedule launch output, not restore counts.
- **Disposition:** accepted/promoted under DH-P01; initially drafted in the extraction session.
- **Requirement/scenario mapping:** `snapshot-capture` → **Accept demo snapshot capture as background work** → “Capture accepted”, “Capture outside automatic mode”; `snapshot-restore-activity` → **Accept demo snapshot restore as background work** → “Restore accepted”, “Missing snapshot at acceptance”; `workflow-observation` → **Execute demo management workflows through their declared tasks** → “Capture execution result”, “Restore execution result”, “Startup seed meaning”; `workflow-observation` → **Read latest management workflow diagnostics** → “Latest management selection”, “Completed task result”; `workflow-observation` → **Report snapshot-file and cron diagnostics with management status** → “Missing core snapshot”, “Valid cron with missing snapshot”, “Invalid restore cron”

### BSL-demo-household-006

- **Behavior and actor:** Operator / core snapshot capture.
- **Entry state / trigger / observable outcome:** Successful CaptureDemoStateAsync → three core JSON artifacts.
- **Business rule and eligibility:** All members/search docs, only filtered active recipes; no votes/plans/calendar export; retired recipe fields stripped.
- **Failure / cancellation / recovery behavior:** Writes are sequential and propagate errors; existing snapshot may be partially replaced.
- **Configuration and time assumptions:** Resolved dataRoot/demo; cancellation tokens used for queries/JSON writes.
- **Ordered trace:** demo-capture YAML → ManagementProcessor → CaptureDemoStateAsync → EF queries → JSON files.
- **Relevant source files and symbols:** [ManagementService.cs](../../api/src/RecipeApi/Services/ManagementService.cs), [demo-capture.yaml](../../api/src/RecipeApi/Workflows/demo-capture.yaml), [RecipeDbContext.cs](../../api/src/RecipeApi/Data/RecipeDbContext.cs), [ManagementServiceTests.cs](../../api/src/RecipeApi.Tests/Services/ManagementServiceTests.cs). Symbols are named in the ordered trace.
- **Relevant test assertions and substitutions:** CaptureDemoStateAsync_Writes_Core_Snapshot_And_Excludes_Dynamic_State checks four JSON files and absence of votes/plans/calendar artifacts; no serialized content equality or copied-file assertions. BackupAsync_DoesNotEmitRetiredHealthDietaryOrBalanceFields also reads demo recipes.json and asserts no dietaryProfile.
- **API/implementation/test/documentation agreement or mismatch:** Current implementation supersedes guide claim of restoring plans/votes. Main recipe library owns recipe meanings; this slice describes only capture selection and serialized artifacts.
- **Evidence class and confidence:** Implementation-supported, medium; current runtime verification not observed.
- **Check command / outcome / environment / content identity:** Runtime not-run under A34; source identity below; static documentation checks have their separate session record.
- **Open question or explicit limitation:** Recipe query filter excludes DeletedAt rows, search-doc query is unfiltered; a snapshot may contain docs for omitted recipes. No cross-table consistent read or schema migration guarantee.
- **Disposition:** accepted/promoted under DH-P01; initially drafted in the extraction session.
- **Requirement/scenario mapping:** `snapshot-capture` → **Capture the core demo data set** → “Core snapshot”, “Activity omitted”, “Retired recipe fields”

### BSL-demo-household-007

- **Behavior and actor:** Operator / snapshot and active recipe-file boundaries.
- **Entry state / trigger / observable outcome:** Capture replaces demo/recipes; restore replaces active recipe root after DB commit.
- **Business rule and eligibility:** Recursive file copying with relative paths; manifest counts after capture copy; roots configurable.
- **Failure / cancellation / recovery behavior:** ReplaceDirectory deletes destination first; missing source creates empty destination and returns; partial-copy failures propagate without rollback.
- **Configuration and time assumptions:** DataRoot: DATA_ROOT → DataRoot → /data; recipes: RECIPES_ROOT → RecipesRoot → dataRoot/recipes.
- **Ordered trace:** ManagementService.ReplaceDirectory → physical filesystem; manifest clock; LocalRecipeStore shares resolved recipe root.
- **Relevant source files and symbols:** [ManagementService.cs](../../api/src/RecipeApi/Services/ManagementService.cs), [DataRootResolver.cs](../../api/src/RecipeApi/Infrastructure/DataRootResolver.cs), [RecipesRootResolver.cs](../../api/src/RecipeApi/Infrastructure/RecipesRootResolver.cs), [LocalRecipeStore.cs](../../api/src/RecipeApi/Infrastructure/LocalRecipeStore.cs), [ManagementServiceTests.cs](../../api/src/RecipeApi.Tests/Services/ManagementServiceTests.cs). Symbols are named in the ordered trace.
- **Relevant test assertions and substitutions:** Existing core snapshot tests assert JSON existence and DB facts only; no meaningful demo original/hero/PDF file round-trip, missing-assets, cancellation or partial-copy assertions inspected.
- **API/implementation/test/documentation agreement or mismatch:** Physical files beneath recipe root are copied indiscriminately, including source PDFs if present; assets elsewhere are not traversed. Presence checks never require demo/recipes or verify manifest contents/version/checksums.
- **Evidence class and confidence:** Implementation-supported, medium; current runtime verification not observed.
- **Check command / outcome / environment / content identity:** Runtime not-run under A34; source identity below; static documentation checks have their separate session record.
- **Open question or explicit limitation:** No complete asset coverage, permission/symlink fidelity, safe overlapping-root configuration, atomicity or recovery. Missing asset directory is an evidence-backed limitation, not a normative desired erase behavior.
- **Disposition:** accepted/promoted under DH-P01; initially drafted in the extraction session.
- **Requirement/scenario mapping:** `snapshot-capture` → **Copy recipe-root files into the snapshot** → “Recipe-root files”, “Configured roots”, “Manifest written”; `snapshot-restore-activity` → **Replace active recipe files after database commit** → “Files restored”, “File replacement fails”

### BSL-demo-household-008

- **Behavior and actor:** Operator / core snapshot restore.
- **Entry state / trigger / observable outcome:** Existing core files parse → replacement transaction → commit → file replacement.
- **Business rule and eligibility:** Four files required by existence; manifest content not read; members/active recipes/search docs reloaded.
- **Failure / cancellation / recovery behavior:** Missing core files fail before deletion; malformed core JSON fails before transaction; DB catch attempts rollback, file failure after commit does not compensate.
- **Configuration and time assumptions:** Current compatible JSON entity shapes; no cross-version migration established.
- **Ordered trace:** demo-restore YAML → ManagementProcessor → RestoreDemoStateAsync → core JSON → EF transaction → ReplaceDirectory.
- **Relevant source files and symbols:** [ManagementService.cs](../../api/src/RecipeApi/Services/ManagementService.cs), [RecipeDbContext.cs](../../api/src/RecipeApi/Data/RecipeDbContext.cs), [schema.sql](../../api/database/schema.sql), [ManagementServiceTests.cs](../../api/src/RecipeApi.Tests/Services/ManagementServiceTests.cs). Symbols are named in the ordered trace.
- **Relevant test assertions and substitutions:** RestoreDemoStateAsync_Restores_Core_State_And_Clears_Dynamic_State asserts captured member/recipe/document restoration and temporary-member removal. RestoreDemoStateAsync_When_Snapshot_Missing_Does_Not_Clear_Active_Data asserts exception and original member retained. Factory EF InMemory suppresses TransactionIgnoredWarning; these are not rollback/PostgreSQL tests.
- **API/implementation/test/documentation agreement or mismatch:** Source transaction boundaries explicit; guide overstates scope. Filtered recipe deletion omits soft-deleted rows; reinserting a captured ID that later became soft-deleted can collide. No full library reset assertion drafted.
- **Evidence class and confidence:** Implementation-supported, medium; current runtime verification not observed.
- **Check command / outcome / environment / content identity:** Runtime not-run under A34; source identity below; static documentation checks have their separate session record.
- **Open question or explicit limitation:** Snapshot compatibility, deleted-row conflicts, related-data constraints and rollback are unqualified; tests never run here under A34.
- **Disposition:** accepted/promoted under DH-P01; initially drafted in the extraction session.
- **Requirement/scenario mapping:** `snapshot-restore-activity` → **Check core snapshot presence before destructive restore** → “Required artifact absent”, “Malformed core JSON”; `snapshot-restore-activity` → **Replace supported core state during successful restore** → “Restore captured records”, “Database replacement fails”

### BSL-demo-household-009

- **Behavior and actor:** Operator / actual activity clearing during restore.
- **Entry state / trigger / observable outcome:** Successful replacement transaction → removed activity and nonactive history.
- **Business rule and eligibility:** Import reports/votes/weekly plans/calendar events removed; terminal or Paused instances removed with tasks, Pending/Processing retained.
- **Failure / cancellation / recovery behavior:** No separate activity-clear action; active work is not canceled and may subsequently write.
- **Configuration and time assumptions:** No retention cutoff in demo restore; predicate is status not age.
- **Ordered trace:** RestoreDemoStateAsync → explicit RemoveRange sets → WeeklyPlan grocery fields / workflow cascade → SaveChanges commit.
- **Relevant source files and symbols:** [ManagementService.cs](../../api/src/RecipeApi/Services/ManagementService.cs), [WeeklyPlan.cs](../../api/src/RecipeApi/Models/WeeklyPlan.cs), [RecipeDbContext.cs](../../api/src/RecipeApi/Data/RecipeDbContext.cs), [schema.sql](../../api/database/schema.sql), [ManagementServiceTests.cs](../../api/src/RecipeApi.Tests/Services/ManagementServiceTests.cs). Symbols are named in the ordered trace.
- **Relevant test assertions and substitutions:** Restore demo test explicitly asserts reports/votes/plans/calendar empty. No demo-specific assertions for retained active/removed Paused history or grocery field effects. PruneWorkflows tests exercise a different retention-based method and cannot substitute.
- **API/implementation/test/documentation agreement or mismatch:** WeeklyPlan owns GroceryState and GroceryItems; deleting its row removes them. EF/SQL workflow task cascade agrees. Recipe-search affinity and member feature-override cascades exist but are not explicitly recaptured; no all-state restore claim.
- **Evidence class and confidence:** Implementation-supported, medium; current runtime verification not observed.
- **Check command / outcome / environment / content identity:** Runtime not-run under A34; source identity below; static documentation checks have their separate session record.
- **Open question or explicit limitation:** FamilySettings, IngredientCategories, MaintenanceCommands and RecipeSearchFilterStates are not explicitly cleared/captured. FK cascades can affect affinity/feature overrides and maintenance requested_by. No preserve-all-other-tables promise.
- **Disposition:** accepted/promoted under DH-P01; initially drafted in the extraction session.
- **Requirement/scenario mapping:** `snapshot-restore-activity` → **Clear transient activity when restoring core state** → “Activity cleared”, “Grocery state cleared with plans”; `snapshot-restore-activity` → **Retain active workflow instances during activity clearing** → “Remove nonactive history”, “Keep active work”

### BSL-demo-household-010

- **Behavior and actor:** API host / initial automatic restore seed.
- **Entry state / trigger / observable outcome:** Hosted startup → enabled/no active restore → scheduled workflow.
- **Business rule and eligibility:** Pending or Processing demo-restore suppresses seed; Paused does not; no snapshot check.
- **Failure / cancellation / recovery behavior:** Invalid cron logs INVALID_CRON then returns; hosted wrapper catches/logs other errors with no retry loop.
- **Configuration and time assumptions:** Injected clock, options cron; distributed startup races unguarded.
- **Ordered trace:** Program hosted service → DemoWorkflowSeeder.SeedAsync → DB AnyAsync → CronScheduleCalculator → TriggerAsync → initial root scheduledAt.
- **Relevant source files and symbols:** [DemoWorkflowSeeder.cs](../../api/src/RecipeApi/Services/DemoWorkflowSeeder.cs), [CronScheduleCalculator.cs](../../api/src/RecipeApi/Services/CronScheduleCalculator.cs), [WorkflowOrchestrator.cs](../../api/src/RecipeApi/Services/WorkflowOrchestrator.cs), [Program.cs](../../api/src/RecipeApi/Program.cs), [DemoWorkflowSeederTests.cs](../../api/src/RecipeApi.Tests/Services/DemoWorkflowSeederTests.cs), [CronScheduleCalculatorTests.cs](../../api/src/RecipeApi.Tests/Services/CronScheduleCalculatorTests.cs), [TestDbContextFactory.cs](../../api/src/RecipeApi.Tests/Infrastructure/TestDbContextFactory.cs). Symbols are named in the ordered trace.
- **Relevant test assertions and substitutions:** Seeder tests assert disabled creates none, enabled yields one Pending root scheduled next day at exact 03:00, existing Pending suppresses duplicate, invalid logs once/no instance. Uses FixedClock, TestDbContextFactory and in-memory workflow storage; test YAML has only restore, no reschedule. Cron tests assert before/at daily target and custom/weekly dates.
- **API/implementation/test/documentation agreement or mismatch:** Source supports Processing suppression but tests exercise only Pending; sequential AnyAsync then Trigger is not atomic or unique. Test fixture does not validate production startup or recurrence.
- **Evidence class and confidence:** Implementation-supported, high; current runtime verification not observed.
- **Check command / outcome / environment / content identity:** Runtime not-run under A34; source identity below; static documentation checks have their separate session record.
- **Open question or explicit limitation:** No exactly-once, deadline or concurrent-seeder guarantee; hosted catch can absorb cancellation. Healthy diagnostics mean cron-valid only.
- **Disposition:** accepted/promoted under DH-P01; initially drafted in the extraction session.
- **Requirement/scenario mapping:** `automatic-restore` → **Seed an initial restore only for eligible demo startup** → “Disabled startup”, “Existing active restore”, “Eligible startup”, “Only paused history”; `automatic-restore` → **Contain startup restore seeding failures** → “Invalid cron”, “Trigger fails”

### BSL-demo-household-011

- **Behavior and actor:** Worker / restore recurrence and failure.
- **Entry state / trigger / observable outcome:** Successful restore dependency → StartWorkflow task → next demo-restore.
- **Business rule and eligibility:** Root scheduling/dependency promotion/child acceptance/retry/failure semantics retain background-processing ownership.
- **Failure / cancellation / recovery behavior:** Restore failure blocks dependency; child failure follows shared worker policy, no independent timer/recovery scheduler.
- **Configuration and time assumptions:** YAML ${DEMO_RESTORE_CRON_UTC:-0 3 * * *}; next future whole UTC minute; five-year horizon per shared owner.
- **Ordered trace:** demo-restore.yaml → WorkflowWorker dependency reconciliation → WorkflowProcessor → CronScheduleCalculator → orchestrator → child roots.
- **Relevant source files and symbols:** [demo-restore.yaml](../../api/src/RecipeApi/Workflows/demo-restore.yaml), [WorkflowProcessor.cs](../../api/src/RecipeApi/Services/Processors/WorkflowProcessor.cs), [CronScheduleCalculator.cs](../../api/src/RecipeApi/Services/CronScheduleCalculator.cs), [WorkflowOrchestrator.cs](../../api/src/RecipeApi/Services/WorkflowOrchestrator.cs), [WorkflowWorker.cs](../../api/src/RecipeApi/Services/WorkflowWorker.cs), [spec.md](../../openspec/specs/background-processing/spec.md). Symbols are named in the ordered trace.
- **Relevant test assertions and substitutions:** DemoWorkflowSeederTests uses simplified YAML and never runs recurrence. Shared-owner assertions/qualifications are reused; inspected worker completion/failure handling and actual YAML establish implementation support only.
- **API/implementation/test/documentation agreement or mismatch:** Shared owner requirements Start child workflows through shared acceptance, Resolve child cron schedules against future UTC minutes, Promote dependencies after successful task completion and Retain terminal task failure and pause its workflow remain authoritative.
- **Evidence class and confidence:** Implementation-supported, medium; current runtime verification not observed.
- **Check command / outcome / environment / content identity:** Runtime not-run under A34; source identity below; static documentation checks have their separate session record.
- **Open question or explicit limitation:** Manual restore can launch a recurrence chain even with demo disabled; no demo guard in YAML or child launcher. Multiple chains and repeated launch side effects remain possible. No automatic repair guarantee after Failed/Paused tasks.
- **Disposition:** accepted/promoted under DH-P01; initially drafted in the extraction session.
- **Requirement/scenario mapping:** `automatic-restore` → **Schedule recurrence after successful restore dependency** → “Restore dependency succeeds”, “Restore dependency fails”, “Child scheduling fails”

### BSL-demo-household-012

- **Behavior and actor:** Demo worker / processor bypass.
- **Entry state / trigger / observable outcome:** Dispatch named task → first registered matching processor → bypass result.
- **Business rule and eligibility:** Five names registered before ordinary processors; first-match selection wins.
- **Failure / cancellation / recovery behavior:** Direct bypass invocation with demo disabled throws; downstream normal tasks still run.
- **Configuration and time assumptions:** Registration uses initial demo configuration; tasks retain ordinary lifecycle.
- **Ordered trace:** Program ordered registrations → WorkflowWorker.GetServices/FirstOrDefault → DemoModeBypassProcessor.ExecuteAsync → result persistence.
- **Relevant source files and symbols:** [Program.cs](../../api/src/RecipeApi/Program.cs), [WorkflowWorker.cs](../../api/src/RecipeApi/Services/WorkflowWorker.cs), [DemoModeBypassProcessor.cs](../../api/src/RecipeApi/Services/Processors/DemoModeBypassProcessor.cs), [DemoModeBypassProcessorTests.cs](../../api/src/RecipeApi.Tests/Services/DemoModeBypassProcessorTests.cs). Symbols are named in the ordered trace.
- **Relevant test assertions and substitutions:** ExecuteAsync_Returns_Bypass_Result_Without_Invoking_AI_Processor constructs bypass directly, checks name/message and an unconnected ThrowingProcessor WasInvoked false. That processor is never injected; this is not a production DI selection proof. Source order supplies that evidence.
- **API/implementation/test/documentation agreement or mismatch:** Five names: ExtractRecipe, GenerateDescription, SynthesizeRecipe, WebAcquisition, CategorizeIngredients. GenerateHero, IndexRecipeSearch, CategorizeRecipe and ClassifyRecipeVegetarian are not in bypass list.
- **Evidence class and confidence:** Implementation-supported, medium; current runtime verification not observed.
- **Check command / outcome / environment / content identity:** Runtime not-run under A34; source identity below; static documentation checks have their separate session record.
- **Open question or explicit limitation:** Bypass returns message/name only, creates no sample recipe content, readiness or external acquisition result.
- **Disposition:** accepted/promoted under DH-P01; initially drafted in the extraction session.
- **Requirement/scenario mapping:** `ai-boundaries` → **Bypass the five demo workflow processor names** → “Each named processor bypassed”, “Bypass result completes task”

### BSL-demo-household-013

- **Behavior and actor:** Chat consumer / decorated response boundary.
- **Entry state / trigger / observable outcome:** Response/stream call → demo exception before base delegation.
- **Business rule and eligibility:** Registered IChatClient wraps OpenAI-compatible Gemini chat with DemoModeChatClient.
- **Failure / cancellation / recovery behavior:** Caller-specific handling applies: CategorizeRecipe catches chat exceptions then persists defaults/heuristics; vegetarian classifier catches and reports provider_failed; no claim all callers fail the workflow.
- **Configuration and time assumptions:** DEMO_MODE; chat endpoint/model/key configured independently; no provider invocation performed.
- **Ordered trace:** Program AddChatClient.Use → DemoModeChatClient → response/stream rejection; RecipeAgent/WebAcquisition/CategorizeIngredients and unbypassed classifiers consume chat.
- **Relevant source files and symbols:** [Program.cs](../../api/src/RecipeApi/Program.cs), [DemoModeChatClient.cs](../../api/src/RecipeApi/Services/DemoModeChatClient.cs), [RecipeAgent.cs](../../api/src/RecipeApi/Services/Agents/RecipeAgent.cs), [WebAcquisitionAgent.cs](../../api/src/RecipeApi/Services/Agents/WebAcquisitionAgent.cs), [CategorizeIngredientsProcessor.cs](../../api/src/RecipeApi/Services/Processors/CategorizeIngredientsProcessor.cs), [CategorizeRecipeProcessor.cs](../../api/src/RecipeApi/Services/Processors/CategorizeRecipeProcessor.cs), [ClassifyRecipeVegetarianProcessor.cs](../../api/src/RecipeApi/Services/Processors/ClassifyRecipeVegetarianProcessor.cs). Symbols are named in the ordered trace.
- **Relevant test assertions and substitutions:** No dedicated decorated-chat integration assertion found among listed demo tests. TestWebApplicationFactory injects StubChatClient instead of the production decoration, so controller tests cannot qualify this registration.
- **API/implementation/test/documentation agreement or mismatch:** Executable overrides support only registered decorated response/stream calls. Class comment claiming all LLM/no costs is broader than those executable boundaries.
- **Evidence class and confidence:** Implementation-supported, medium; current runtime verification not observed.
- **Check command / outcome / environment / content identity:** Runtime not-run under A34; source identity below; static documentation checks have their separate session record.
- **Open question or explicit limitation:** No all-AI/no-cost claim. WebAcquisition fetches HTML before decorated chat when invoked ordinarily; worker selects bypass, so do not claim ordinary demo worker fetches it.
- **Disposition:** accepted/promoted under DH-P01; initially drafted in the extraction session.
- **Requirement/scenario mapping:** `ai-boundaries` → **Block outgoing calls through the decorated chat client** → “Response blocked”, “Stream blocked”, “Normal chat delegation”

### BSL-demo-household-014

- **Behavior and actor:** Visitor/operator/worker / direct provider exceptions to global blocking.
- **Entry state / trigger / observable outcome:** Hero regeneration or search/indexing → Gemini SDK/HTTP paths outside decorated chat.
- **Business rule and eligibility:** GenerateHero not bypassed; embedding provider unconditionally registered without DemoModeOptions.
- **Failure / cancellation / recovery behavior:** Hero skips existing image unless forced and skips absent key; otherwise direct SDK call can occur. Semantic search catches budget/provider failures into lexical fallback; index failure handling independent.
- **Configuration and time assumptions:** GEMINI_API_KEY, GEMINI_MODEL_ID_HERO; GEMINI_ENDPOINT, EMBEDDING_MODEL_ID, EMBEDDING_DIMENSIONS; semantic enabled/provider/repository prerequisites.
- **Ordered trace:** regenerateHero client → OpenAPI hero/regenerate → RecipeController → RecipeService → recipe-hero-regeneration YAML force true → RecipeHeroAgent → Google.GenAI → hero file; Search UI/client → RecipeSearchService → GeminiEmbeddingProvider HTTP; IndexRecipeSearch → SearchIndexWorkflow → same provider → search-document persistence.
- **Relevant source files and symbols:** [recipes.ts](../../pwa/src/lib/api/recipes.ts), [RecipeController.cs](../../api/src/RecipeApi/Controllers/RecipeController.cs), [RecipeService.cs](../../api/src/RecipeApi/Services/RecipeService.cs), [recipe-hero-regeneration.yaml](../../api/src/RecipeApi/Workflows/recipe-hero-regeneration.yaml), [RecipeHeroAgent.cs](../../api/src/RecipeApi/Services/Agents/RecipeHeroAgent.cs), [RecipeSearchService.cs](../../api/src/RecipeApi/Services/RecipeSearchService.cs), [SearchIndexWorkflow.cs](../../api/src/RecipeApi/Services/SearchIndexWorkflow.cs), [GeminiEmbeddingProvider.cs](../../api/src/RecipeApi/Services/GeminiEmbeddingProvider.cs), [Program.cs](../../api/src/RecipeApi/Program.cs), [openapi.yaml](../../specs/openapi.yaml). Symbols are named in the ordered trace.
- **Relevant test assertions and substitutions:** Demo browser test mocks health/search and never observes providers. Factory replaces IEmbeddingProvider with all-zero-vector mock. No production demo provider-isolation or spend assertion.
- **API/implementation/test/documentation agreement or mismatch:** Trace contradicts blanket no-AI-cost claims in DemoModeChatClient comment and docs/user-guide.md Showcase. Do not convert an unblocked paid-provider path into a required future provider call.
- **Evidence class and confidence:** Implementation-supported, medium; current runtime verification not observed.
- **Check command / outcome / environment / content identity:** Runtime not-run under A34; source identity below; static documentation checks have their separate session record.
- **Open question or explicit limitation:** Disposition excluded: global AI blocking and no-cost guarantee. Actual calls depend on prerequisites and credentials; no spend occurred or was measured in this session.
- **Disposition:** excluded (no normative requirement).
- **Requirement/scenario mapping:** U07 / DH-U07 exclusion; no requirement makes an unblocked provider call mandatory or claims global isolation.

### BSL-demo-household-015

- **Behavior and actor:** Household visitor / standard Search presentation.
- **Entry state / trigger / observable outcome:** Recipes renders with mocked demo health → ordinary search input.
- **Business rule and eligibility:** No demo gate wraps recipe-search-input.
- **Failure / cancellation / recovery behavior:** Visibility proves no search success, provider suppression or complete result behavior.
- **Configuration and time assumptions:** Browser fixture fixed date 2026-05-04; fixture provides signed h_access and mocks all API traffic.
- **Ordered trace:** Recipes page → ordinary Search input; browser test setupCommonRoutes + health override → rendered input.
- **Relevant source files and symbols:** [page.tsx][demo-recipes-source], [demo-mode.spec.ts](../../pwa/e2e/demo-mode.spec.ts), [fixtures.ts](../../pwa/e2e/fixtures.ts), [mock-api.ts](../../pwa/e2e/mock-api.ts). Symbols are named in the ordered trace.
- **Relevant test assertions and substitutions:** keeps standard search available in demo mode repeats the same toBeVisible assertion twice; cookies/localStorage establish member context, fixture already supplies signed access. No search submission, semantic request or reset observed.
- **API/implementation/test/documentation agreement or mismatch:** Source input has no demo condition; existing recipe-search owner retains search behavior. Raw x-hearth-secret cookie in this test is not evidence of backend auth bypass.
- **Evidence class and confidence:** Implementation-supported, medium; current runtime verification not observed.
- **Check command / outcome / environment / content identity:** Runtime not-run under A34; source identity below; static documentation checks have their separate session record.
- **Open question or explicit limitation:** Narrow visibility requirement only; no runtime browser qualification.
- **Disposition:** accepted/promoted under DH-P01; initially drafted in the extraction session.
- **Requirement/scenario mapping:** `ai-boundaries` → **Keep the ordinary Search entry visible in demo presentation** → “Search input available”

### BSL-demo-household-016

- **Behavior and actor:** API startup / packaged workflow definition seeding.
- **Entry state / trigger / observable outcome:** Startup before host run → YAML copy into workflow root.
- **Business rule and eligibility:** Overwrites packaged *.yaml names, including demo definitions when packaged.
- **Failure / cancellation / recovery behavior:** Missing both packaged directories logs warning; copy errors caught/logged; partial copying possible.
- **Configuration and time assumptions:** WORKFLOWS_ROOT → WorkflowsRoot → dataRoot/workflows. Repository reads LocalStorageProvider dataRoot/workflows independently.
- **Ordered trace:** Program SeedCoreWorkflows → WorkflowRootResolver → WorkflowSeeder file copy; WorkflowRepository → LocalStorageProvider loads definitions.
- **Relevant source files and symbols:** [Program.cs](../../api/src/RecipeApi/Program.cs), [WorkflowRootResolver.cs](../../api/src/RecipeApi/Infrastructure/WorkflowRootResolver.cs), [WorkflowSeeder.cs](../../api/src/RecipeApi/Infrastructure/WorkflowSeeder.cs), [WorkflowRepository.cs](../../api/src/RecipeApi/Services/WorkflowRepository.cs), [LocalStorageProvider.cs](../../api/src/RecipeApi/Infrastructure/LocalStorageProvider.cs), [demo-capture.yaml](../../api/src/RecipeApi/Workflows/demo-capture.yaml), [demo-restore.yaml](../../api/src/RecipeApi/Workflows/demo-restore.yaml). Symbols are named in the ordered trace.
- **Relevant test assertions and substitutions:** No dedicated packaged-definition seeding assertion found in selected demo test starting points; in-memory seeder tests manually save their own simplified YAML.
- **API/implementation/test/documentation agreement or mismatch:** Default workflow-root paths align. A custom WORKFLOWS_ROOT/WorkflowsRoot can differ from LocalStorageProvider dataRoot/workflows; do not guarantee successful trigger after copying to a custom root.
- **Evidence class and confidence:** Implementation-supported, medium; current runtime verification not observed.
- **Check command / outcome / environment / content identity:** Runtime not-run under A34; source identity below; static documentation checks have their separate session record.
- **Open question or explicit limitation:** File seeding is not data seeding. Actual packaged output/bootstrap/alternate-root execution not qualified.
- **Disposition:** accepted/promoted under DH-P01; initially drafted in the extraction session.
- **Requirement/scenario mapping:** `workflow-observation` → **Seed packaged demo workflow definitions at startup** → “Packaged definitions available”, “Definition source unavailable”

[demo-welcome-source]: <../../pwa/src/app/(auth)/welcome/page.tsx>
[demo-welcome-test]: <../../pwa/src/app/(auth)/welcome/page.test.tsx>
[demo-recipes-source]: <../../pwa/src/app/(app)/recipes/page.tsx>

## Complete requirement/scenario coverage map

The evidence column supports both the requirement and **every named scenario** in
that row. Scenario names are local to their enclosing requirement. No scenario is
mapped merely to a test title; evidence entries identify the inspected assertion
and its missing integration boundaries.

| Delta | Requirement | Every scenario | Evidence |
| --- | --- | --- | --- |
| activation-access | Resolve demo activation from API configuration | Enable demo; Disable demo; Invalid activation | BSL-demo-household-001 |
| activation-access | Report API demo diagnostics through anonymous health | Healthy diagnostics; Invalid cron diagnostics; Unhealthy storage | BSL-demo-household-002 |
| activation-access | Prefill Welcome without bypassing household access | Empty welcome passphrase; User already typed; Health unavailable | BSL-demo-household-003 |
| activation-access | Reject demo member creation | Demo creation refused | BSL-demo-household-003 |
| activation-access | Present demo identity independently of authentication | Demo hint; Beta demo identity | BSL-demo-household-004 |
| activation-access | Select demo installation artwork | Stable demo artwork; Beta demo artwork | BSL-demo-household-004 |
| snapshot-capture | Accept demo snapshot capture as background work | Capture accepted; Capture outside automatic mode | BSL-demo-household-005 |
| snapshot-capture | Capture the core demo data set | Core snapshot; Activity omitted; Retired recipe fields | BSL-demo-household-006 |
| snapshot-capture | Copy recipe-root files into the snapshot | Recipe-root files; Configured roots; Manifest written | BSL-demo-household-007 |
| snapshot-restore-activity | Accept demo snapshot restore as background work | Restore accepted; Missing snapshot at acceptance | BSL-demo-household-005 |
| snapshot-restore-activity | Check core snapshot presence before destructive restore | Required artifact absent; Malformed core JSON | BSL-demo-household-008 |
| snapshot-restore-activity | Replace supported core state during successful restore | Restore captured records; Database replacement fails | BSL-demo-household-008 |
| snapshot-restore-activity | Clear transient activity when restoring core state | Activity cleared; Grocery state cleared with plans | BSL-demo-household-009 |
| snapshot-restore-activity | Retain active workflow instances during activity clearing | Remove nonactive history; Keep active work | BSL-demo-household-009 |
| snapshot-restore-activity | Replace active recipe files after database commit | Files restored; File replacement fails | BSL-demo-household-007 |
| automatic-restore | Seed an initial restore only for eligible demo startup | Disabled startup; Existing active restore; Eligible startup; Only paused history | BSL-demo-household-010 |
| automatic-restore | Default the automatic restore schedule to daily UTC | Before daily target; At daily target; Custom daily target | BSL-demo-household-001 |
| automatic-restore | Contain startup restore seeding failures | Invalid cron; Trigger fails | BSL-demo-household-010 |
| automatic-restore | Schedule recurrence after successful restore dependency | Restore dependency succeeds; Restore dependency fails; Child scheduling fails | BSL-demo-household-011 |
| workflow-observation | Seed packaged demo workflow definitions at startup | Packaged definitions available; Definition source unavailable | BSL-demo-household-016 |
| workflow-observation | Execute demo management workflows through their declared tasks | Capture execution result; Restore execution result; Startup seed meaning | BSL-demo-household-005 |
| workflow-observation | Read latest management workflow diagnostics | Latest management selection; Completed task result | BSL-demo-household-005 |
| workflow-observation | Report snapshot-file and cron diagnostics with management status | Missing core snapshot; Valid cron with missing snapshot; Invalid restore cron | BSL-demo-household-005 |
| ai-boundaries | Bypass the five demo workflow processor names | Each named processor bypassed; Bypass result completes task | BSL-demo-household-012 |
| ai-boundaries | Block outgoing calls through the decorated chat client | Response blocked; Stream blocked; Normal chat delegation | BSL-demo-household-013 |
| ai-boundaries | Keep the ordinary Search entry visible in demo presentation | Search input available | BSL-demo-household-015 |

## Source identity for future reconciliation

SHA-256 of the read-only source/test/contract/shared-owner starting points in this
session. A changed digest requires rechecking affected claims. Runtime execution
and complete deployment qualification are not implied by this table.

| Repository-relative input | SHA-256 |
| --- | --- |
| `api/database/schema.sql` | `3f7767cd704299374ebdcd89a11709680013ba26a477ad23f41da54e6da55161` |
| `api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs` | `5c4e0f84545455fcc77c38e3ab78e34c6f0fcd4387ffb56227357fe2d9d2cc27` |
| `api/src/RecipeApi.Tests/Controllers/HealthControllerTests.cs` | `29ee2cb45f4836813ede2d12a795a028b2ad8db9c8ddd376af8a97575686229c` |
| `api/src/RecipeApi.Tests/Controllers/ManagementControllerTests.cs` | `755e9127dac0119adab11185000f72154f2cc0f9525c276a2d3a818fdcb207cd` |
| `api/src/RecipeApi.Tests/Infrastructure/TestDbContextFactory.cs` | `4f292fc990b79f5db66d06d166a8317a13748dc0003e2c1f5dc1ed615954db82` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `api/src/RecipeApi.Tests/Services/CronScheduleCalculatorTests.cs` | `72ddb975ee9a322ecc575517f191b974137390b40913221afb4c1c0d3d0334a5` |
| `api/src/RecipeApi.Tests/Services/DemoModeBypassProcessorTests.cs` | `70a3c9b2d43aa9f12baa8c9f28f4b2eaecd6adbb2f96c57fe4d28a8def22f2ef` |
| `api/src/RecipeApi.Tests/Services/DemoModeOptionsTests.cs` | `f63e62a0a9b8aec40904586c9e58893f5dc8d097cadacc4711b5ee2114e02f27` |
| `api/src/RecipeApi.Tests/Services/DemoWorkflowSeederTests.cs` | `b103d3a15f778182fb7da6886d546901ba01a0e0b185bd164e8447e1aef7ee59` |
| `api/src/RecipeApi.Tests/Services/ManagementServiceTests.cs` | `a1a038a13567186c47eb26e7dde7db4942dcbd8c128511c95e121bd70f59cfca` |
| `api/src/RecipeApi/Controllers/FamilyController.cs` | `a6c1bced4b82ecf32927ad801b7c0c037914ea51577fb3ceabfd8291e41852ee` |
| `api/src/RecipeApi/Controllers/HealthController.cs` | `28029e30038a367a6279e48baf8a4749cbd2969eef814278f747622fff49f0fc` |
| `api/src/RecipeApi/Controllers/ManagementController.cs` | `6f9a8569553c9b242779f059af1d0d3990aa5c102258eac9bb0bfcbca00b31ea` |
| `api/src/RecipeApi/Controllers/RecipeController.cs` | `d1699c2de6f6cca9d879e67c0c7b9c7f0af4b2c4e104bc9ff04634b266eb5a70` |
| `api/src/RecipeApi/Data/RecipeDbContext.cs` | `92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447` |
| `api/src/RecipeApi/Dto/HealthCheckResponseDto.cs` | `6cd7aec72fb511a18ed0c7361e608a350f03e5cf523404aa6e60e73648aa1eea` |
| `api/src/RecipeApi/Infrastructure/DataRootResolver.cs` | `e9fbf25da9b1ecd698375da0b623801afd0dba456852987f20537466831eb15a` |
| `api/src/RecipeApi/Infrastructure/HearthAuthenticationHandler.cs` | `51ecd8a5be459e1ffaae7e3a33646de57aa13bf0fec088a7e388083da08ee817` |
| `api/src/RecipeApi/Infrastructure/LocalRecipeStore.cs` | `6f3f2893b4ae03ef3328efad306de1e8fc33ab470c4c430bfbe5d3ed1ae17efc` |
| `api/src/RecipeApi/Infrastructure/LocalStorageProvider.cs` | `5a07af200857eec99fe0dd90f04fd2c1ce3fe4f3f64b86d5abb4eb09ae875225` |
| `api/src/RecipeApi/Infrastructure/RecipesRootResolver.cs` | `79b44a0105d75a9c651e2f7f378d0144a481ae380d7a378b9cc88f4bfc8025aa` |
| `api/src/RecipeApi/Infrastructure/WorkflowRootResolver.cs` | `1f58fe4c6e0a37ba684b1c9b36a38f5a5fdc980eebf863da5a571b2b6cdc2767` |
| `api/src/RecipeApi/Infrastructure/WorkflowSeeder.cs` | `52c827096989bbe689d27b5aab8a8afc4e50b2feea9d895f6e396b5e79e6b4ba` |
| `api/src/RecipeApi/Models/ManagementStatus.cs` | `4d0665650a9d286743bc05bd83dad111b13c3bfa91dcf4a355a76a8c3fd8f5e2` |
| `api/src/RecipeApi/Models/WeeklyPlan.cs` | `cb342c8c26394264a00401c7eb8ef16693af7315e845e88ac5d5307535aec4b5` |
| `api/src/RecipeApi/Program.cs` | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |
| `api/src/RecipeApi/Services/Agents/RecipeAgent.cs` | `b23761d819726cf5dd8c50000cabc05198fba855865e6beba05de0ea8a6097af` |
| `api/src/RecipeApi/Services/Agents/RecipeHeroAgent.cs` | `7b0c4a8ddb00aec33283aeca27d7bfae0be3bd21562394b68f573e6025d17eb1` |
| `api/src/RecipeApi/Services/Agents/WebAcquisitionAgent.cs` | `688cfe3ff3c1b0dad7885794f725fcfca29e990477b3e2ce1246c7e2ebb743b2` |
| `api/src/RecipeApi/Services/CronScheduleCalculator.cs` | `53e9f4964fb2286c3d4e67720fa884602575c0742334259b875ce5e0433ae43d` |
| `api/src/RecipeApi/Services/DemoModeChatClient.cs` | `da0b004ed35a3fc25384c1f8ef408f706796793baa9b197a83164299dd3cecee` |
| `api/src/RecipeApi/Services/DemoModeOptions.cs` | `952ea16d8540c2fcc2f409d2afdb82880f22137aff1db1d3eed395a0a32c38e0` |
| `api/src/RecipeApi/Services/DemoWorkflowSeeder.cs` | `0fff5ce09ab6025e809813fb602731e9cb7075bc551388de96f360efeed3d02a` |
| `api/src/RecipeApi/Services/GeminiEmbeddingProvider.cs` | `963c8c3485d00b5d71ee639b88c6a84bd7459a723b2dad6eea4868a2e089caa8` |
| `api/src/RecipeApi/Services/ManagementService.cs` | `c24464baa8f853c7195e30de61b168ef2b8eda059545a5449580807448811c4f` |
| `api/src/RecipeApi/Services/Processors/CategorizeIngredientsProcessor.cs` | `7527ad62014150de56c91ebeae3475ab22fbfd650eb13363429d851bf0a14788` |
| `api/src/RecipeApi/Services/Processors/CategorizeRecipeProcessor.cs` | `66fb7ec2679fec184dd2210cf23a6baa65e1ccc6676ee7a183f0268fa337e447` |
| `api/src/RecipeApi/Services/Processors/ClassifyRecipeVegetarianProcessor.cs` | `ad64a8cf3fca0d7216cadb42d19396b97d7a6740419c254bbcd293df9b991f34` |
| `api/src/RecipeApi/Services/Processors/DemoModeBypassProcessor.cs` | `4a41daf7e52820adc7ea4e065920d74197ee418d567160743f68dfac61093c21` |
| `api/src/RecipeApi/Services/Processors/ManagementProcessor.cs` | `484abcf7eb3d3e5c2882c785edea3a4a3083f7f7c2efc3c5e479aad7e561096f` |
| `api/src/RecipeApi/Services/Processors/WorkflowProcessor.cs` | `661a85f17a1ddcc00ec96e51af5b13fc7e7f2b5b8236ca1639d2a5a292772a40` |
| `api/src/RecipeApi/Services/RecipeSearchService.cs` | `31e2bf8a197582b4852ce3a98820827504f410a5ae281bc3a247aa19b5674377` |
| `api/src/RecipeApi/Services/RecipeService.cs` | `9eec9ab5cd7102081b3765b08a41b8de4d45325858d18ab4573a326afa256b74` |
| `api/src/RecipeApi/Services/SearchIndexWorkflow.cs` | `a1f11d78e11734cd8bbead72d85448549691e6bee4a4ef69c691da337395bf7b` |
| `api/src/RecipeApi/Services/WorkflowOrchestrator.cs` | `9812d17bface86d79fef75eab2ef7668c7c0bde18455c1ea46774b46dcc0b14c` |
| `api/src/RecipeApi/Services/WorkflowRepository.cs` | `1356e4b126077506c07633c2d977a419d96641e8a03f976d45f4e945775214d3` |
| `api/src/RecipeApi/Services/WorkflowWorker.cs` | `69f9023b0003ff2f0a5dda6d85bcb42e13ebf064b5c8529bc6b0866e5b3871df` |
| `api/src/RecipeApi/Workflows/demo-capture.yaml` | `70a50f80527452c92d4ae585473d38e1210c023d83927f8281e959f57151a131` |
| `api/src/RecipeApi/Workflows/demo-restore.yaml` | `df55fbb2039239c302c3d0f92bcaac1ead913b568d030b269640a5f8ccedc584` |
| `api/src/RecipeApi/Workflows/recipe-hero-regeneration.yaml` | `87addab442ff254d60eacdda4ab0a42af395cf30d0a008856ae9f7b3e9fa4406` |
| `docker/compose/apps.yml` | `84890a4d95cde113b58f5c0981be1afa9d688f5417c57e5cb1bdc6e91c3b20e2` |
| `openspec/specs/app-installation/spec.md` | `d8f73dd6e53468b73191316ed87a61685fccbc59d8b74ccd18dd84ecc8d2863c` |
| `openspec/specs/background-processing/spec.md` | `7023ac794f9119ec995215a431f9667934c69434a22815c2a9e40dbddc796e76` |
| `openspec/specs/household-identity/spec.md` | `4c7f5a1faafd5439ab6f261b1efb140a4b0c10643cf16d087874c3c52ee9b749` |
| `pwa/e2e/demo-mode.spec.ts` | `accd09dc06336bd85af3af2c24ca814cf70da54f2327f1b534d66148febb44f7` |
| `pwa/e2e/fixtures.ts` | `402b5a1b872f625dc1425f46afdede2c9378dcc473088159774a8455b5d188e2` |
| `pwa/e2e/mock-api.ts` | `063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07` |
| `pwa/src/app/(app)/recipes/page.tsx` | `18b9605e8078e8ee46674a0e781836886697ce18e9166c0591aeac6c8fe78bb4` |
| `pwa/src/app/(auth)/welcome/page.test.tsx` | `469bff6f71c2c15bb8a4fe5af0058cb8ba78cc98261ebf527ab1fdb543991514` |
| `pwa/src/app/(auth)/welcome/page.tsx` | `5f6085d7e8125b80f0318995bf6a076e42bdc65f5ea2c1d0c33cfd8203b21d8f` |
| `pwa/src/app/api/health/route.ts` | `ea463577df87d72d319bdeff9e43915a38d00fc42b59fe0c88720f192fc5d467` |
| `pwa/src/app/layout.tsx` | `96482e0e3859142238b3d99c98e5e685e884d26a2f75907281c0dc18ddc8d5f6` |
| `pwa/src/app/manifest.json/route.ts` | `70cde023700c660c39dac2cd090607143ab1bfcc81393941cf9929e211864c95` |
| `pwa/src/components/identity/IdentityHint.test.tsx` | `a044684449193d7ffce2431b7f0d64e180b49e7244f36ed6b9d047faea4c39cc` |
| `pwa/src/components/identity/IdentityHint.tsx` | `f56d062effd4323a6ad82775d637c4ab27d51e45e0d580e7c727ad33bec7b5cc` |
| `pwa/src/lib/api/api-client.ts` | `c5cd4cfebddd8d5c1f2827c522a236fe12c504130ea0991c07bc8fc46376aa95` |
| `pwa/src/lib/api/demo-diagnostics-contract.test.ts` | `0c118a4c31f881e42fa75f4c42d338a75b703256b62229ffdec04f1a248a544e` |
| `pwa/src/lib/api/generated/api/health/index.ts` | `5dd9e2e05e5398bc24a2f7a07d5e931b3dc012fca3683c59e1929927740b4c14` |
| `pwa/src/lib/api/generated/api/management/demoCapture/index.ts` | `9bd0b1ada03424fc7e33c1ed39694544957e9fb5dc4d2717271fe5fca010a64f` |
| `pwa/src/lib/api/generated/api/management/demoRestore/index.ts` | `7f5937d84328347c87dea27e2674689436d952d6c6977db1fd7c8f3082eb3a75` |
| `pwa/src/lib/api/generated/api/management/status/index.ts` | `fe1a3a8781a7d064884e5da4b6342a8d7cc4732350d45da0ac1007e39505411d` |
| `pwa/src/lib/api/generated/models/index.ts` | `03e19537845755d2cd0d30071284bc8a11007237e380433184d3edbe1ddb05e6` |
| `pwa/src/lib/api/recipes.ts` | `f4e70b39a2060bfc5b25010914f78e288321517db5c52c543d103502718dce7a` |
| `pwa/src/lib/auth.ts` | `d9b122b42cccfdc8a589c05a3e05deaa4a4864dee9cf17c4a403ec5f6db09f2a` |
| `pwa/src/lib/server/app-identity.test.ts` | `67d776e9d739da24dd79193fb6024bf6b3ea1e3edd8e357a857f40dffff05b66` |
| `pwa/src/lib/server/app-identity.ts` | `61c308a8e5962339df4ea74d73f732fc314fcd88ceb5f945c3c9a2cb74c89d21` |
| `pwa/src/lib/server/deployment-identity.test.ts` | `817a5a9d0aeb60b22b56f77ae59c74f0371f7f2bd753beb85c8bcf9c7ceaaffa` |
| `pwa/src/lib/server/install-icons.test.ts` | `d6d3145e7eef78ae20c4c9e4463bd1ee35c79ef7ee281b2f8ad9eb25480f8502` |
| `pwa/src/proxy.ts` | `5070867f5cb42505922f4cacb491aa77d254e12684a04a1e57e683df0b2e1aef` |
| `release-template/synology/compose.yaml` | `7b77915a7032cd57026cedf1790a261811da1e314ddb9c4c25c9b09a0fd0b76b` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |

## Session and exact verification record

Session/date: 2026-10-16, whole-capability brownfield extraction.
Completed discovery: ten fields, BSL-demo-household-001–016, all capability-map
items and six ordered draft packages; uncertainties retained outside requirements.
Generation authorized; human review pending. Accepted: no. Promoted: no. Archived:
no. Applied: no. Runtime-qualified: no (A34).

- Passed: root/schema/change/main-spec discovery; current artifact instructions
  obtained for all six changes; dependency-order generation and optional-design
  omission assessed. Source/test starting points rechecked read-only.
- Passed: all six `openspec validate baseline-demo-household-<slice> --strict --no-interactive` invocations; 26 requirements and 62 scenarios mapped to supporting evidence; complete source/contract/assertion review and selected whitespace/link review.
- Final check pending at this saved checkpoint: explicit-path `task verify` across all 26 task-owned files and inspection of its invocation-specific record. Exact final outcomes and record path are reported against final content in the response; adding that path here afterward would change the checked content identity.
- Earlier failed check: `task verify` record `.task/agent-finish/runs/6963f81401e644dfb1ac426e70fcbe22.json` passed all six selected spec checks and content identity, but its documentation link parser truncated three valid Next.js route paths at parentheses. Those links now use standard Markdown reference syntax; their exact file targets were checked directly. Final verification is rerun for the corrected content. No blocked check observed.
- Not-run: runtime/API/PostgreSQL/browser/device/provider qualification (A34 and
  user scope), live reset, auth deployment and actual cost measurement.
- Not-applicable: application TDD, code tests for changed behavior, API/client/mock
  regeneration, migration, build/deploy, acceptance/promotion/sync/archive.

Exact next bounded action after document checks: human review of the six deltas
and evidence-backed exclusions. Any lifecycle advancement requires explicit scope;
no further extraction, application implementation or runtime work is inferred.

## DH-P01 — conditional acceptance and promotion, 2026-10-16

Authorization: the user instructed “verify again, then if it passes promote”. This
supersedes the initial draft-only lifecycle boundary for exactly the six previously
presented demo-household changes; it does not authorize archival or application work.
Branch/commit unchanged: moving-to-openspec at
04a1c4570f9bbb01b47436790d4248635ac3179a. Existing staged/unstaged/untracked work
and the original extraction evidence were preserved; private current before-images
and full status were recorded at /tmp/wfs-demo-promote before any promotion write.
No pre-existing main demo-household spec existed.

Pre-promotion gate **passed**: `task verify -- <all 26 extraction-owned paths>`;
record `.task/agent-finish/runs/fc3bcc6b5e194207814b60a0cb38cb51.json` was inspected.
Documentation, all six strict selected-change validations and content identity
passed. All 82 source identities matched; no new application/runtime observation
was made. Failed: none. Blocked: none. Application checks: not-applicable for these
documentation edits. Runtime qualification: not-run under A34.

Promotion used the installed openspec-sync-specs workflow: current resolved
repo-local root, status-provided delta paths and current specs instructions for
all six changes. Added each distinct requirement and all its scenarios into the
single main Requirements section in dependency order; preserved purpose and
adjusted shared-owner link locations. No delta operation header, metadata or
application task was copied into the main spec. Main-versus-delta block equality,
unique requirement titles, 26/62 counts and evidence mappings are explicit checks.

Current lifecycle: drafted yes; repeat verification passed; human acceptance yes
through the user's conditional promotion instruction; promoted yes (26/62);
archived no; application implementation no; runtime-qualified no. U07 and
DH-U01–DH-U09 are retained without resolving their withheld broad assertions.
The earlier saved draft-checkpoint statuses above describe the extraction session.

Post-promotion checks: validate main demo-household, every selected change and all
main specs with the current CLI; review the complete task-owned diff, links and
mappings; run `task verify -- <all 27 task-owned paths>` and inspect its specific
record. Exact final results and record path belong in the final response to avoid
changing verified content afterward. No pending product decision blocks this
narrow documentation promotion. Next action: retain this baseline; await a
separately authorized lifecycle, implementation or runtime-qualification request.
