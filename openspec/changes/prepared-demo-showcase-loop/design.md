# Design

## Evidence, Scope and Existing Ownership

Reviewed through the GitHub connector on 2026-10-25 at main `4682643cd6086b66008fc77ede4570329e29b5ae`, #340 `b5c6e0aca537b497ffe7af880f9d0c8c8957ca3c` and published #348 `5370238ec5d3b9b44172e7c077d40d54cbf44dbf`. Main includes Home #339 and duration #346; the inspected schema, demo management and recovery paths are unchanged from the earlier `ba8dca21` research. Source inspection is not deployed/runtime qualification. This revision is authorized specification work only.

### Dependency ownership and requirement traceability

The [published #348 delta](https://github.com/AlexandreBrisebois/whats-for-supper/blob/5370238ec5d3b9b44172e7c077d40d54cbf44dbf/openspec/changes/cost-safe-demo-exploration/specs/demo-household/spec.md) is a conditional dependency, not a merged guarantee. Its author is correcting safe prepared-bundle `.txt` entry, wrongly hidden local Mark as resolved, and browser loopback isolation. Reconcile the final accepted head and its actual verification before dependent implementation. Do not reproduce its UI/provider work here or import its unchecked completion claims.

| Earlier #340 requirement/scenario owner | #348 owner / remaining #340 disposition |
|---|---|
| Offer a reopenable demo context explanation; all three scenarios | Identical requirement/scenarios in #348; preserve as dependency, remove duplicate delta |
| Introduce demo context only at a safe first visit; all three scenarios | Identical requirement/scenarios in #348; no second introduction implementation |
| Remember demo explanation dismissal outside shared state; all five scenarios | Identical requirement/scenarios in #348; reset must preserve that browser preference |
| Keep the ordinary Search entry visible in demo presentation: Search input available, Prepared embedding unavailable, Visitor edits a recipe | #348's same canonical requirement: Search input available, Compatible prepared Similar, Edits and repair; #340 tests restored-state integration only |
| Enforce visitor mode at every model boundary: Direct and background routes, Credentials exist, Preparation is separate | #348's Reject demo requests at every model boundary and non-demo preservation; operator authority remains here |
| Enforce visitor mode at every model boundary: Maintenance and reset | #348 supplies provider refusal and model-free indexing; this change retains reset-triggered work and stale-publication acceptance |
| Give honest model-free visitor outcomes: Hero regeneration, Capture cannot be fulfilled locally, Limitation before upload, Non-demo installation | #348's Refuse unavailable AI actions before accepting private content and non-demo delegation; preserve permitted local imports/resolution, do not block entire mixed-use surfaces |
| Explain shared demo state and recovery without a tour: Entry and independent exploration | #348 supplies entry disclosure; Interrupted visitor during reset and Honest self-hosting choice remain here |
| Task 2.6 and provider/entry portions of 2.2, 2.4, 2.5 | Replaced by dependency reconciliation and reset-specific regression acceptance; not checked off as implemented by this PR |

Retained modified canonical requirement/scenario names remain unchanged even where historical names mention post-commit copying or retaining active work; the proposed bodies explicitly replace those old policies. The pre-existing data-backup-and-recovery delta is unchanged and continues to route demo missing-history policy to demo-household. No spec sync/archive is performed. Once #348 lands or is archived, use its actual canonical owner, not a permanently dangling duplicate change.

### What already exists

- `ManagementController` accepts `demo-capture` / `demo-restore` as persisted background workflows; `ManagementProcessor` delegates to `ManagementService`. Keep these IDs and the distinction between 202 acceptance and task completion.
- `CaptureDemoStateAsync` already captures members, recipes including soft-deleted rows, search documents, aggregate history and round context. `RestoreDemoStateAsync` replaces those facts, clears votes/reports/plans/calendar and nonactive workflows, retains Pending/Processing work, regenerates round/history authority through `ReplaceInterestAsync`, and publishes suggestion invalidation. Do not rebuild these mechanisms.
- The proposed new household coverage is plans/grocery JSON, calendar, extra lineage/tombstones/versions, declared settings, member overrides and categories. The schema still has 19 tables and two derived views; completeness means a disposition for each owner, not replay of operational tables.
- Capture writes the selected `DataRoot/demo` artifacts sequentially. Restore preflight only checks four filenames, not asset integrity. `ReplaceDirectory` deletes its destination before checking source presence, and restore copies files before DB commit. Missing assets, partial copy, commit failure and interrupted capture therefore still require correction. The old filtered-soft-delete diagnosis is superseded.
- `demo-restore.yaml` already schedules its successor after successful restore. `DemoWorkflowSeeder` checks enabled mode and active restore instances at startup. A terminal restore failure strands its dependent successor until a later eligible startup; manual restore can initiate recurrence even outside demo mode. Retain existing ownership rather than introduce a second scheduler.
- `Program.cs` globally requires an authenticated user. `HearthAuthenticationHandler` authenticates shared header/bearer/cookie credentials as HearthFamily; `ManagementController` adds no operator-only capture policy. No deployed access separation is established by this source. Hiding a button or passing a member ID is not an authority boundary. `WorkflowController.Trigger` can launch a named workflow through POST /api/workflows/{workflowId}/trigger, and POST /api/workflows/tasks/{taskId}/reset re-enables tasks; an endpoint-only demo-capture guard would leave alternate baseline mutation paths.
- `WorkflowRootResolver` can use WORKFLOWS_ROOT/WorkflowsRoot, while `WorkflowRepository` uses `LocalStorageProvider`'s DataRoot/workflows partition. Qualify the existing supported root configuration before relying on packaged workflow execution; do not silently redesign deployment roots.
- `GroceryCheckCoordinator` serializes ordinary grocery-map writes only on one application instance. `RecipeSearchContinuationStore` retains process-local ranked responses for ten minutes. Existing round invalidation and suggestion SSE do not establish full reset/client/write fencing.

### Complete database disposition inventory

“Restore” means replace complete declared baseline membership, not merge visitor rows. These are proposed policies for review, not approval or claims about current behavior.

| Table | Current demo behavior | Proposed disposition |
|---|---|---|
| family_members | Capture/replace | Restore stable member IDs, language/UI preferences and all supported fields |
| recipes | Capture/replace including soft-deleted rows | Restore authoritative facts, ratings, notes, readiness, rotation and deletion state; validate LastCookedDate, CreatedAt and DeletedAt policy |
| recipe_search_documents | Capture/replace | Restore compatible prepared embeddings; rebuild current lexical projection without providers |
| weekly_household_interest | Versioned capture/replace; legacy absence clears | Restore full aggregate history with chosen calendar mapping |
| voting_round_state | Capture context; regenerate identities | Rebuild fresh round/history identity; never replay close authority |
| recipe_votes | Omit/clear | Clear for fresh visitor round; alternative prepared votes requires explicit review |
| weekly_plans | Omit/clear, including grocery JSON | Restore prepared plan/grocery state; regenerate close/round and concurrency authority |
| calendar_events | Omit/clear | Restore prepared cooking/non-cooking assignments, status and candidates with date mapping |
| grocery_extra_occurrences | Omit/retain | Restore complete membership, lineage/predecessors, name snapshots, sections, checks, tombstones and versions; regenerate write authority where necessary |
| feature_flag_overrides | Omit; member deletion cascades in PostgreSQL | Restore approved baseline member overrides, subordinate to server demo safety |
| family_settings | Omit/retain | Restore declared household keys such as `family_goto` and their recipe references; preserve separately owned operator configuration; fail compatibility for unclassified keys rather than erase them blindly |
| ingredient_categories | Omit/retain | Restore prepared mappings; no model replenishment |
| recipe_import_reports | Omit/clear | Clear by proposed policy; authored display reports are a review alternative, never replay reimport IDs |
| recipe_search_filter_state | Omit/retain | Rebuild deterministic cuisine/filter state without AI |
| recipe_search_affinity_facts | Omit; recipe cascade removes facts | Rebuild from restored votes/history/cooking facts without AI |
| workflow_instances | Delete nonactive, retain Pending/Processing | Preserve reset orchestration; fence visitor jobs; explicit safe-maintenance allowlist |
| workflow_tasks | Cascade with removed instances, active retained | Same workflow policy; no captured leases/retries replayed |
| maintenance_commands | Omit/retain; requester can become null | Invalidate visitor queued commands; preserve only reviewed deployment-owned safe maintenance |
| recovery_publication | Untouched | Preserve recovery ownership; create fresh publication identity as needed, never restore old marker |

`vw_recipe_matches` and `vw_discovery_recipes` are derived SQL views, not independent snapshot tables. New table/field state must be consciously classified and exercised by snapshot compatibility tests, rather than silently falling outside reset.

### Files, process and client state

| State | Proposed disposition |
|---|---|
| Recipe originals, source PDF, hero bytes, authoritative metadata | Inventory/restore required baseline assets; reject missing/corrupt referenced assets before mutation |
| Search sidecars and stored vectors | Reuse only format/model/dimension/fingerprint-compatible prepared content; deterministic lexical rebuild otherwise |
| Orphan files and `.pdf-pages-*` intermediates | Exclude from baseline; old visitor generation becomes inactive and is cleaned only under owned retention rules |
| Current `DataRoot/demo` JSON/assets | Replace through staged complete versioned baseline selection; retain prior complete baseline on failed capture |
| Ordinary backup/export files and independent recovery backups | Preserve; not demo inputs and not reset cleanup targets |
| `.recovery-generations`, active pointer, journal | Existing recovery owner controls them; never copy them into household baseline |
| Packaged/custom workflow definitions | Preserve deployed code/configuration; resolve current WorkflowsRoot versus DataRoot/workflows ownership before integration |
| Process-local search continuations (ten-minute store), promotion caches | Invalidate by new published generation; current history generation alone does not cover every typed-search continuation |
| Browser member/auth cookies and device locale/onboarding preferences | Preserve where valid; reconcile selected member against restored membership |
| Mounted family/planner/grocery/library/search/flag stores | Invalidate/rehydrate coherently; reject old optimistic writes, late responses and stale continuation tokens |
| IndexedDB PDF share slot and service-worker caches | Not server snapshot data; expire/invalidate stale operation ownership without promising browser-storage erasure |
| Environment, credentials, demo flag, cron, clock/timezone, authentication and roots | Preserve deployment ownership; never serialize into baseline |

## Decisions Still Requiring Review

These are recommendations and alternatives, **not approved implementation defaults**. The normative delta describes the proposed coherent-reset option; task group 1 must reconcile it to the accepted choices before dependent work.

1. **Date policy.** Prefer one deployment-calendar week anchor for a long-lived prepared weekly showcase; absolute replay is simpler but its prepared week ages out. Pin injected `IClock` and `DeploymentCalendar.Capture` once per reset without changing Calendar:TimeZone or UTC cron. Field review must distinguish WeeklyPlan/extra/history/round WeekStartDate and CalendarEvent.Date from Recipe.LastCookedDate, CreatedAt/UpdatedAt/DeletedAt, extra RemovedAt, history CapturedAt and plan NotifiedAt. Preserve audit meaning; do not rejuvenate CreatedAt to force New eligibility, shift operational timestamps wholesale or silently exempt fixtures from purge. Resolve retention/notification eligibility and inspect any embedded date-bearing payloads before choosing a mapping.
2. **Votes, reports and fixture privacy.** Prefer fresh votes, no import reports and a small synthetic household with one playable open round, ordinary thresholds, prepared saved meals and a non-cooking day. Prepared votes/reports are a separate attributed example, not visitor results; choose clear versus normalized replay explicitly. Use authored/approved nonprivate recipes, original PDF/images and heroes, no real household capture by default. Validate all member/recipe/candidate/family_goto/extra predecessor references. Permitted model-free imports remain temporary visitor facts, not new baseline authority.
3. **Maintenance.** Preserve only explicitly reviewed work across reset. #348 makes IndexRecipeSearch, backfill and ReconcileRecipeSearch lexical-only in demo, so the previous blanket proposal to disable search repair is obsolete once that dependency is accepted. `dreaming.yaml` also launches backup, maintenance commands, overdue-meal finalization, extra rollover, rotation/filter materialization and pruning; no-model does not mean safe to preserve across reset. Decide these operations individually and identify how queued/claimed work is canceled, drained or rejected before publication. Do not blindly copy exact recovery's dreaming/demo-restore exemptions.
4. **Compatibility.** Prefer recapture of legacy core-only baselines over an inferred converter; current schemaVersion 1/four-file checks cannot certify the missing membership. Decide the complete format, explicit emptiness and compatibility diagnostics. Keep ordinary merge/independent backup compatibility unchanged.
5. **Operator authority.** Choose the smallest existing management/authentication control that keeps capture/replacement/selection unavailable to visitor credentials, including alternate workflow dispatch paths. An auth_method claim exists but is not proof of operator credential separation. No new role system, secret rotation or deployment changes are selected. Decide whether manual restore is operator-only separately from baseline capture.
6. **Availability and stale work.** Prefer a bounded coordinated reset: stage/preflight first, drain or reject old publication, pause only the required boundary and recover a complete state before operations resume. An explicit offline maintenance-window reset is simpler if accepted; uninterrupted service and a general all-request generation framework are not requirements inferred from “temporary changes.” The chosen policy still must prevent mixed DB/assets and stale optimistic writes from silently overwriting restored state. Set the acceptable pause/timeout and resume authority before implementation.
7. **Manual recurrence.** Prefer manual reset as one-shot with automatic successors eligible only in enabled demo mode, but preserve the existing behavior until chosen. Alternatives are rejecting disabled-mode restore or deliberately retaining recurrence. If changed, reconcile the complete canonical restore-acceptance requirement, workflow acceptance parameters, tests and contract; do not infer this policy from a cron value. Separately accept or amend recovery of future recurrence after terminal failure; it remains a proposed reliability change, not current behavior.

## Reuse and Concrete Integration Limits

`RecoverySnapshotService` already stages and hashes independent snapshots, validates table/media relationships, publishes recipe generations with a journal/DB marker, and reconciles interrupted publication. Its ten authoritative tables substantially overlap the required prepared facts. Reuse those proven owners or extract the smallest cohesive helper needed by both callers; do not invent a snapshot plugin/policy framework.

It is **not** a drop-in demo reset: its table list includes reports, excludes live votes and search documents, replays absolute dates, invalidates work with different exemptions, and requires independent Recovery:BackupRoot, PostgreSQL and supported filesystem durability. Preserve those exact-recovery contracts. #348 removes the demo-mode provider hazard in its queued search reconciliation, not the other policy differences.

`RecoveryBoundary.Enabled` depends on Recovery:BackupRoot or an existing journal. HTTP middleware and worker participation are conditional; `RecoveryReconciler` exits when BackupRoot is unset. Merely calling a recovery helper neither activates demo coordination nor guarantees restart reconciliation. In addition, `WorkflowWorker` holds RecoveryAccess.Write around every processor. A demo processor cannot simply acquire Snapshot/Publish underneath that lease: the boundary explicitly forbids upgrades. The accepted plan must name a narrow capture/reset lease ownership and reconciliation seam, without enabling unrelated recovery configuration or exempting all management work.

Choose stale-write rejection at existing operation boundaries. Reuse current round IDs, extra versions, request cancellation/reconciliation and recovery publication identity where sufficient. Prove where same-ID restored records and process-local continuations require additional invalidation; do not assume SSE delivery or add generation fields to every table by default. Status must remain reachable during a failed publication; current middleware exempts recovery routes, not all management status.

## Smallest Implementation Sequence After Approval

1. **Dependency and baseline safety.** Verify the final accepted #348 contract and current main. Through existing management acceptance, reject absent/corrupt assets and inconsistent membership before mutation; stage a capture that preserves the prior selected baseline on interruption. A separately selected missing-directory fix may ship first, with explicitly limited claims.
2. **One complete round trip.** Extend the baseline under the accepted dispositions and choose the minimal recovery/coordination seam. Prepare a small household through real API/database ownership, capture it, mutate a plan/check/extra and add a permitted synthetic model-free import, reset through the existing workflow, then read back facts and verified PDF/hero bytes. Visitor-only imported membership must not survive replacement. Content is small; every supported owner still has an explicit disposition.
3. **Interrupted and concurrent reset.** Exercise capture interruption, copy/commit/restart recovery, pending/claimed workers, grocery recomputation, stale extra versions/round closes, missed SSE and mounted planner/grocery/Search state. Preserve device acknowledgement and valid member selection. No obsolete save may be reported as successful or replayed over the baseline.
4. **Recurrence and operation.** Apply only the chosen manual/automatic policy through current YAML/seeder/shared acceptance. Prove successor behavior after success/failure/restart, diagnose missing successor separately from reset failure, and document synthetic preparation/recapture/activation and recovery. No new scheduler or operator UI is implied.

The first observable showcase remains browse/Search → ordinary voting → confirmed matches → explicit save → groceries/extras → cooking → reset. Reuse merged Home #339's authoritative active-round/matches handoff and #346's duration behavior; do not change consensus thresholds or turn matches into saved meals.

## Acceptance and Preservation

- Reuse #348's provider transport traps and non-demo positive controls. Add reset-triggered indexing/maintenance/old-work coverage at the affected real seams; do not reimplement or claim full public zero cost from that dependency.
- Real PostgreSQL/disposable file tests must prove explicit empty collections, cascade membership, soft-deleted dependencies, malformed assets/schema, prior-baseline preservation and interruption recovery. In-memory tests do not establish those properties.
- Use fake-clock week/midnight/DST/year and repeat-reset cases only for the accepted date policy. Keep UTC cron separate from the deployment calendar.
- Contract-first changes include affected management status/acceptance/error shapes, Kiota and method-sensitive browser mocks in the same slice; the nine #348 AI-refusal contracts are a dependency, not another regeneration project.
- Verify preserved ordinary local edits, prepared-bundle import, local report resolution, Search/Similar and prepared assets before/after reset, with synthetic content and zero model sends. Keep ordinary non-demo and merge/exact recovery behavior intact.
- Planning verification: strict OpenSpec change validation and `task verify` over these four files. Runtime implementation evidence is future work, not part of this connector review.

## Remaining Experience Work

Follow the [designer skill](../../../.agents/skills/designer/SKILL.md), [trust-first identity](../../../docs/agent-designer-identity.md) and [North Star](../../../docs/creative-direction-north-star.md). Reuse #348's EN/FR context band, modal and browser-local acknowledgement rather than add a tour. Its wording that changes are temporary does not promise a reset countdown or a healthy schedule.

The remaining UI is understandable reset/retry recovery for an interrupted or mounted task and a secondary self-hosting path using existing project guidance. Preserve navigation, distinguish a reset from ordinary save failure, rehydrate authoritative state and never autosave stale drafts. Explain that operator-configured AI is separate without a free-provider promise. Validate affected English/French meaning, focus/status feedback, safe areas and touch targets on iPhone, Pixel Phone and iPad portrait/landscape; physical-device evidence is separate from emulation. No confetti, engagement prompts, polling UI or generic onboarding framework.

## Rollout and Effort Boundaries

No rollout occurs here. Future activation requires an accepted complete baseline, compatible runtime and tested recovery path; retain the prior artifact while validating and never silently reinterpret omitted legacy state. Do not change live configuration or test production.

Planning estimate after decisions: approximately 4–8 engineer-days for the bounded complete-loop implementation and its database/failure/browser acceptance, not a commitment or elapsed-time promise. Operator/date decisions can increase it; preflight-only work is smaller and does not complete the loop. The #348 UI/provider work is deliberately excluded from this estimate. Re-estimate from accepted slices instead of treating this draft as an approved backlog.
