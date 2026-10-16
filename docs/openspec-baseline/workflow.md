# Shared baseline extraction workflow

Read this short shared guide and the selected capability plan. The index, other
capability plans and [history](history.md) are navigation/provenance, not required
context. Load another owner only when the selected slice actually depends on it.

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

Copy into the selected capability plan when doing extraction. Do
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
| Entry points and dependency registration | [API Program](../../api/src/RecipeApi/Program.cs), [PWA layout](../../pwa/src/app/layout.tsx), [package manifest](../../pwa/package.json), [API project](../../api/RecipeApi.csproj) |
| Routes and access gates | [PWA proxy](../../pwa/src/proxy.ts), [navigation](../../pwa/src/components/common/Navigation.tsx), [identity validation](../../pwa/src/components/identity/IdentityValidator.tsx) |
| API contract and client | [OpenAPI](../../specs/openapi.yaml), [client adapter](../../pwa/src/lib/api/api-client.ts), [server fetch](../../pwa/src/lib/api/server-client.ts) |
| Domain/persistence | [EF context](../../api/src/RecipeApi/Data/RecipeDbContext.cs), [SQL schema](../../api/database/schema.sql), [compatibility SQL](../../api/database/compatibility.sql), [recipe asset store](../../api/src/RecipeApi/Infrastructure/LocalRecipeStore.cs) |
| Deployment/configuration | [application Compose](../../docker/compose/apps.yml), [Synology template](../../release-template/synology/compose.yaml), [feature flags](../../api/src/RecipeApi/Services/FeatureFlagService.cs) |
| Existing documentation | [family guide](../user-guide.md), [architecture](../architecture.md); secondary evidence to reconcile against source |
| Test boundaries | [API test factory](../../api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs), [browser fixtures](../../pwa/e2e/fixtures.ts), [Playwright config](../../pwa/playwright.config.ts) |

Use capability paths and the `BSL-<capability>-<number>` evidence IDs for new
traceability. There is no requirement to preserve the retired inventory's feature
IDs. Archived Kiro plans are historical context, not proof that a capability exists.

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
| 2 | Minimal background-processing and live-update contracts | Establish states, delivery limits and notifications before dependent journeys; reconcile navigation in its actual flow | A80 shared persisted lifecycle/automatic retry baseline promoted 14/42; live-update policy deferred |
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

**A83 reconciliation of historical progress labels (2026-10-16):** The original Initial progress column above is retained as history, not current authority. Current phase 1 has promoted identity 36/92 and library 55/122 plus sharing 9/34; A34/member-creation qualifications remain deferred. Phase 2 now includes both A80 background 14/42 and A82 live-updates 15/38 promoted. Phase 3 has only this week-reading/navigation draft, 15/40, awaiting human review; other meal-planning operations remain unextracted. Phase 8 has URL/photo/description/feature-enabled PDF capture promoted, 37/92 with A69/U70–U74 retained. Phase 9 has quality 37/92 and sharing 9/34 promoted. This reconciliation does not authorize successors or imply completion of entire phases; other rows remain future extraction scopes.

**A84 progress follow-up (2026-10-16):** Phase 3 now has this exact week-reading/navigation baseline promoted as main meal-planning 15/40. The A83 draft label above is historical; other planning operations remain unextracted. Eight main capabilities exist, and no successor is selected.

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
   evidence IDs, confidence and unresolved findings in the selected capability plan; map them to the
   drafted requirements/scenarios. Format and grammar come from current OpenSpec
   instructions, not assumptions in this document.
8. Review each normative statement against evidence. Validate selected artifacts
   with the current CLI. Distinguish grammar validity from behavioral verification.
   Present the draft and evidence gaps for human review; do not label it accepted.
9. After authorized acceptance/promotion, use the installed sync workflow for the
   selected delta paths to update main specs. Do not copy delta sections blindly
   or widen the selected capability. Archive only if separately authorized or
   already covered by the user's recorded scope. No application implementation.
10. Update the selected capability plan's status, decisions, evidence mapping and next action before
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

## Current cross-capability checkpoint — DBR-P01, 2026-10-16

After R12, the user's “promote” accepts the six reviewed backup/recovery drafts and
authorizes their documentation-only synchronization. The supported inventoried
baseline now has all 17 main capabilities promoted, 633 requirements / 1,525
scenarios, with no remaining supported generation or review/promotion queue.
The [backup/recovery record](data-backup-and-recovery.md#dbr-p01--acceptance-and-promotion-2026-10-16)
and [reconciliation checkpoint](reconciliation.md) preserve the exact scope.
Historical R12 pending-review labels below remain provenance. A34, all exclusions
and unresolved/qualification limits remain intact; no runtime acceptance, archival,
implementation, staging or commit is inferred.

## Historical cross-capability checkpoint — R12, 2026-10-16

The user authorized all remaining documentation-only generation across the approved
17 capabilities and phase-12 reconciliation in the attached request. That sequence
supersedes the default one-slice-per-session limit for this run, without authorizing
acceptance, promotion, archival, application changes or runtime qualification.
The [phase-12 reconciliation](reconciliation.md) reconciles current checkpoints,
main specs, active deltas, evidence identities, shared ownership and exclusions.
It found no supported generation gap: 16 main capabilities were already promoted;
six backup/recovery drafts remain ready for human review. Phase-12 generation review
is reconciled; final human acceptance/promotion remains pending. Historical progress
columns and A83/A84 remain provenance, not current status. A34 is unchanged.

## Validation and scope review

Use [Taskfile.yml](../../Taskfile.yml) and the
[execution harness](../../.agents/core/execution-harness.md) as command authority.

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
  repository reconciliation once concurrent generation is finished. An unrelated
  agent's incomplete draft is a failed global check, not a defect in a validated
  selected slice. Do not repair or complete that agent's draft merely to pass the
  global check. An empty spec inventory does not establish baseline acceptance.
- Before completion, review actual changed/new/deleted files. Run the bounded
  documentation verification with the complete task-owned path set, for example:

  ```sh
  task verify -- docs/openspec-baseline/<selected-capability>.md
  ```

  Include the shared workflow/index if edited and selected change/spec paths too. Exclude the
  user's unrelated deletion from task ownership; do not claim it was validated by
  an explicit path selection that excludes it. Inspect the generated verification
  record and report passed/failed/blocked/not-run/not-applicable accurately.
  Explicit documentation-only verification scopes OpenSpec checks and input
  identity to the selected artifacts and their validation dependencies; see the
  execution harness for exact boundaries. Concurrent edits to a selected index or
  shared owner still invalidate that run. Use its reported `record_path` under
  `.task/agent-finish/runs/` rather than another agent's overwritten `last-run.json`.
  A scoped pass does not replace the final global reconciliation.


## Shared recorded decisions

| ID | Decision | State / authority |
| --- | --- | --- |
| A01 | Use a brownfield extraction with no application changes or invented requirements | Confirmed by user discovery request |
| A02 | Remove the existing navigation spec and start fresh | Confirmed by user; deletion observed in worktree |
| A03 | Persist this plan and reusable GPT-6.1 Sol prompt | Confirmed by user request to write the plan |
| A04 | Approve the 17 capability paths and shared rule owners; navigation belongs within affected journeys | Confirmed 2026-10-15 by user “yes” to the explicit structure/ownership question; no restoration of deleted navigation capability, no drafting authorization |
| A05 | Reference repository behavior at a recorded commit | Confirmed 2026-10-15 by user: “describe repository behavior at a recorded commit”; current commit `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`. Initial profile recorded in A09 and evidence standard in A10; no drafting authorization |
| A07 | Retire the stale feature inventory, replace its README link, and remove it from baseline inputs | User instruction to delete the out-of-sync inventory, 2026-10-15; useful discovery checklist retained here |
| A09 | Extract ordinary-household behavior first; defer demo, preview and Synology variants to separately selected slices | Confirmed 2026-10-15 by user “yes” to the explicit profile-sequencing question; eventual map retained; no drafting authorization |
| A10 | Allow implementation-supported initial drafts backed by traced source and inspected test assertions; runtime checks explicitly not-run | Confirmed 2026-10-15 by user “yes” to the explicit evidence-standard question; source support is not runtime verification; no drafting authorization |
| A11 | Include operator/API-only capabilities and workflows in the eventual baseline, in separate later slices after household journeys | Confirmed 2026-10-15 by user “yes and workflows too” to the explicit inclusion/sequencing question; shared orchestration remains owned by background processing; no slice drafting or execution authorized |
| A12 | Record disputed/incomplete behavior as evidence and uncertainty; withhold normative claims until resolved or explicitly accepted as current behavior | Confirmed 2026-10-15 by user “yes” to the explicit treatment question; no individual disputed claim accepted, no repairs or drafting authorized |
| A34 | Defer implementation/database qualification and focus on requirements extraction | User 2026-10-15: “can we keep the implementation work for later? I need to figure out how to give you a database instante. I want to focus on the requirements work”. Resume independent bounded discovery under A10; member-creation qualification/provenance remains recorded for later. No application work, database setup, task acceptance, archive repair or new slice drafting authorization inferred. |

## Shared evidence limitations

| ID | Finding / risk | Evidence and required extraction treatment | Status / withheld claim |
| --- | --- | --- | --- |
| U10 | Tests may prove substituted behavior only | [API factory](../../api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs) defaults to in-memory storage/DB, mocked orchestration and disabled auth; [browser fixtures](../../pwa/e2e/fixtures.ts) mock API and [Playwright config](../../pwa/playwright.config.ts) blocks service workers. Read assertions, not names; [search tests](../../api/src/RecipeApi.Tests/Integration/RecipeSearchIntegrationTests.cs) retain an exclusion name for demotion assertions. | Open |
| U11 | Runtime/device/deployment qualification is incomplete | [PostgreSQL PDF tests](../../api/src/RecipeApi.Tests/Integration/PdfCapturePostgresTests.cs) require explicit configuration; [PDF flow](../flows/user-flows/pdf-recipe-import.md), [release status](../../README.md), [template](../../release-template/synology/compose.yaml). Device sharing, offline use, NAS rendering/recovery and deployment flag propagation require separate evidence. | Open |
| U12 | Filesystem, DB, enqueue and broadcasts are separate failure boundaries | [RecipeService](../../api/src/RecipeApi/Services/RecipeService.cs), [PdfCaptureService](../../api/src/RecipeApi/Services/PdfCaptureService.cs), [ManagementService](../../api/src/RecipeApi/Services/ManagementService.cs), [SSE manager](../../api/src/RecipeApi/Infrastructure/SseConnectionManager.cs). No inferred transactional file/DB consistency, durable replay, exactly-once execution or cross-replica delivery. | Open |

## Maintaining the split

Keep current evidence, local decisions, uncertainties, artifact status, session
log and next action in the selected capability file. Update the index only when
its summary or routing changes. Preserve existing IDs; allocate a new A/U ID by
checking IDs across this directory rather than reading every plan. Historical
records are retained in history.md; do not append new sessions there. Cross-owner
limitations copied into a consumer are a checkpoint snapshot; recheck the owning
capability before changing their treatment.

For documentation verification, include every changed/new plan path and any
selected spec/change paths in `task verify -- <paths>`. Historical explicit-path
commands in moved evidence describe old checks; they are not complete path sets
for work after this split.

For the selected capability, record all ten discovery fields: name, business
purpose, existing capabilities, important workflows, business rules, source
files, tests, dependencies, uncertainties and confidence.
