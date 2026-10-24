# Design

## Context and Existing Ownership

Research is pinned to main `e76332c9e35c3d8584cbed6476ea9c43b4d40ea7` (2026-10-24), not a deployed instance. Open PRs inspected before branching contain no competing demo proposal. Source inspection is not runtime qualification.

- `api/database/schema.sql`, `compatibility.sql` and `api/src/RecipeApi/Data/RecipeDbContext.cs` define 19 tables and two derived views.
- `api/src/RecipeApi/Services/ManagementService.cs` (`CaptureDemoStateAsync`, `RestoreDemoStateAsync`, `EnsureDemoSnapshotExists`, `ReplaceDirectory`) and `ManagementService.Interest.cs` own current demo snapshots. Capture now includes soft-deleted recipes via `IgnoreQueryFilters`, aggregate history and round context, beyond the older core baseline wording.
- Current reset clears votes, plans, calendar and reports; it leaves several newer state owners untouched. File replacement now occurs before the relational transaction commit, unlike the older demo spec's post-commit wording. Neither ordering establishes crash-safe cross-store publication.
- `ReplaceDirectory` deletes destination before checking source existence. Missing snapshot recipe assets can therefore erase live files even though four-file presence checks passed. Capture sequentially overwrites its current baseline.
- `api/src/RecipeApi/Workflows/demo-restore.yaml` schedules a successor only after successful restore. A terminal restore failure strands that dependency. Recurrence itself is intentional.
- `RecoverySnapshotService.cs`, `RecoverySnapshotService.Restore.cs`, `RecoveryBoundary` and recovery durability/publication helpers already own staged validation, coordinated writes, generation activation and interrupted-publication reconciliation. Exact recovery includes ten authoritative tables including extras, but deliberately excludes live votes and derived search, regenerates operational identities and queues search reconciliation. It is not a drop-in demo reset.
- Canonical owners: `demo-household`, `data-backup-and-recovery`, `background-processing`, `application-time`, `recipe-search` and `search-indexing`. Ordinary exact/merge recovery compatibility and non-demo AI behavior are preservation boundaries.

### Complete database disposition inventory

“Restore” means replace complete declared baseline membership, not merge visitor rows. These are proposed policies for review, not approval or claims about current behavior.

| Table | Current demo behavior | Proposed disposition |
|---|---|---|
| family_members | Capture/replace | Restore stable member IDs, language/UI preferences and all supported fields |
| recipes | Capture/replace including soft-deleted rows | Restore authoritative facts, ratings, notes, readiness, rotation and deletion state; validate date-sensitive fields |
| recipe_search_documents | Capture/replace | Restore compatible prepared embeddings; rebuild current lexical projection without providers |
| weekly_household_interest | Versioned capture/replace; legacy absence clears | Restore full aggregate history with chosen calendar mapping |
| voting_round_state | Capture context; regenerate identities | Rebuild fresh round/history identity; never replay close authority |
| recipe_votes | Omit/clear | Clear for fresh visitor round; alternative prepared votes requires explicit review |
| weekly_plans | Omit/clear, including grocery JSON | Restore prepared plan/grocery state; regenerate close/round and concurrency authority |
| calendar_events | Omit/clear | Restore prepared cooking/non-cooking assignments, status, notes and candidates with date mapping |
| grocery_extra_occurrences | Omit/retain | Restore complete membership, lineage/predecessors, name snapshots, sections, checks, tombstones and versions; regenerate write authority where necessary |
| feature_flag_overrides | Omit; member deletion cascades in PostgreSQL | Restore approved baseline member overrides, subordinate to server demo safety |
| family_settings | Omit/retain | Restore household application settings; exclude deployment-owned configuration |
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

## Decisions and Tradeoffs

### Proposed choices requiring review

1. **Calendar:** recommend relative application-calendar weeks instead of frozen old dates. Use the existing application-time/calendar owner to compute the current week; pin it once per reset. Do not introduce a Toronto/Montreal or other timezone assumption from operator location. Current UTC scheduling stays UTC. Inventory every date-bearing field before acceptance: plan/event/extra/history keys, recipe last-cooked/rotation/defer dates and deletion/retention eligibility. Preserve genuine audit timestamps; explicitly decide how retained soft-deleted showcase content avoids unintended purge. Absolute-date replay is simpler but can immediately age the showcase out of its intended state.
2. **Votes and reports:** recommend a fresh voting round and no import reports, while restoring authored aggregate preferences/history and prepared plans. If a convincing voting/review screen requires prepared votes or reports, accept that separately and specify identities, normalization and assertions before dependent tasks. This draft's fresh-round requirements are the recommendation, not a statement that the user chose it.
3. **Maintenance:** preserve reset scheduling and only reviewed deterministic work; exclude AI and old visitor jobs. Existing exact recovery exempts dreaming and demo-restore; copying that exemption unchanged is unsafe. Approve a concrete allowlist and cancellation/fencing ownership before implementation.
4. **Legacy baseline:** recommend fail-closed recapture instead of a partial converter. Upgraded rich reset requires all collections/assets; current version-1 presence checks cannot establish completeness.

5. **Operator authority:** the current capture endpoint uses shared household authorization, not a separate operator role. The new boundary is intentional; choose the smallest existing deployment/management control that keeps capture and baseline selection unavailable to visitor credentials. This is not a claim that operator separation exists today or permission to change live authentication.

These decisions are consequential. The proposal is intentionally **not apply-ready**. The current tasks cover decision resolution and artifact readiness, not a pre-approved implementation backlog.

### Reuse, not a parallel framework

Extend the current demo owner with the minimum demo-specific baseline policy and format. Reuse existing recovery coordination, safe staging, manifest validation, durable file generation activation and journal reconciliation. Preserve exact recovery's external contract and independent-root safety constraints. Do not blindly call exact restore: its excluded votes/search, absolute dates, table set, PostgreSQL/Linux durability prerequisites and AI-capable derived repair require a demo-aware integration. Determine the smallest policy seam only after the above review decisions; do not add a generic plugin/provider abstraction for hypothetical future snapshots.

### Zero AI is a serving invariant

Pinned source paths: `api/src/RecipeApi/Program.cs`, `Services/RecipeSearchService.cs`, `Services/GeminiEmbeddingProvider.cs`, `Services/Agents/RecipeHeroAgent.cs`, `Services/SearchIndexWorkflow.cs`, `Services/DreamingWorkflowSeeder.cs`, `Services/RecipeService.cs`, `Controllers/RecipeController.cs`, and `Workflows/dreaming.yaml` / `recipe-hero-regeneration.yaml` (service/controller/workflow paths relative to `api/src/RecipeApi`). Ten core files were reread at the research SHA; no provider calls were made. `WFS_ENABLE_SEMANTIC_RETRIEVAL=false` controls serving search, not indexing or direct image generation. Existing isolated bypass/fake-provider tests do not establish end-to-end zero egress.

The five named worker bypasses and decorated chat client remain defense layers, not the proof boundary. Semantic text search has a native embedding path; hero generation uses a direct Google client; recipe edits dispatch indexing; dreaming/reconciliation can invoke embeddings and categorization. Cover synchronous APIs, workers, retries and startup at every outbound model boundary even if credentials are available. Missing credentials are optional deployment defense in depth, not the mechanism and not an authorized credential change.

Typed visitor search uses lexical retrieval. Similar may use already stored compatible vectors or lexical source facts, never request a new vector. Editing searchable facts regenerates lexical state and invalidates incompatible vectors locally. Prepared hero/content is retained when generation is unavailable. UI and workflow results must not misrepresent a bypass as completed extraction or generation.

## First Observable Slice

After decisions are accepted, the first implementation slice should prepare a small but representative household through the real API/database seam, capture through the management workflow, mutate a plan and grocery extra as a visitor, reset through the same workflow, and read back the prepared plan, extra lineage and verified recipe asset. Run with provider-boundary spies that fail on any outbound model request.

This crosses management acceptance, persisted workflow tasks, demo/recovery owner, PostgreSQL rows, file generations and ordinary household reads. Tests must exercise real internal boundaries; provider doubles belong only at model/network edges. It should establish safe publication and a model-free usable household before widening to all inventory categories.

## State, Concurrency and Recovery

Use one baseline ID, reset publication generation and pinned calendar anchor per attempt. Drain/co-ordinate cooperating mutations, fence stale visitor workers and optimistic writes, stage and validate data/assets, publish through the existing recoverable boundary, rebuild deterministic state, then release household operations and emit invalidation. Health/recovery diagnostics stay available. A bounded quiescence timeout fails safely rather than serving mixed state.

Capture failure leaves the old baseline selected. Preflight failure leaves live state intact. Interruption around file activation/database commit selects a complete prior or committed generation before resuming traffic. A reset retry does not duplicate aggregate history or extras. SSE alone is insufficient: stale clients and missed events must be rejected/reconciled using server generation checks. Public visitor capture must not overwrite the operator's baseline; retain the existing authorized management seam and explicitly separate baseline authority from visitor experiments.

Recurrence must not depend solely on reset success. Extend existing workflow acceptance/reconciliation with a durable successor identity and future UTC cron occurrence, preserving retry semantics and preventing duplicate effective resets. Invalid cron and failed acceptance remain visible; no busy loop or immediate catch-up is proposed. This is demo-specific lifecycle composition, not a rewrite of general workflow semantics.

## Compatibility, Rollout and Reversal

No runtime rollout occurs in this PR. Future implementation must update affected OpenAPI behavior/status schemas before code, regenerate the Kiota client and synchronize management/search/recipe consumers and method-sensitive mock handlers. Exact status-code and diagnostic-field decisions belong in that accepted contract slice, not invented here.

Capture the new complete baseline before activating upgraded reset. Preserve the previous artifact during validation and offer explicit recapture guidance for legacy content; do not silently migrate omitted state into empty collections. Rollback requires a version-compatible runtime/baseline pair and existing recovery procedures, not replaying an incompatible baseline. Non-demo installations, ordinary backup merge behavior, independent exact recovery, demo artwork and ordinary visitor household access remain unchanged. Demo baseline management gains the explicit operator-only boundary above.

## Acceptance Strategy and Operational Diagnosis

Once review choices are settled, expand tasks into bounded red/green/refactor slices using existing commands:
- `task test:api -- --filter FullyQualifiedName~Demo` plus named new capture/reset/zero-egress integration cases.
- `task test:database` for real PostgreSQL constraints, cascade membership, recovery publication, failure injection and Linux durability prerequisites; do not substitute an in-memory database.
- `task test:e2e -- <selected-demo-spec>` for prepared browse/search/planner/groceries, unsupported AI actions, mounted-client reset, stale writes, refresh and failure guidance; name the actual new test file when the contract is accepted.
- `task gen:client:check`, applicable `task prepare`, then `task verify -- <complete-reviewed-path-set>`; report exact runtime/content identity.
- Fake-clock tests around midnight, week boundary, leap/year boundaries and repeated reset; preserve UTC cron semantics separately from application-calendar mapping.
- Provider-boundary tests with credentials/flags represented, force-hero paths, uploads/reimport, text search, rating/notes/discoverability edits, startup, dreaming, reconciliation, retry and reset. Assert **zero calls**, not merely an error response. Run model-free so qualification itself cannot spend AI credits.
- Full inventory round-trip including explicit empty collections, soft-deleted dependencies, new state incompatibility, missing asset directory, partial copy, process interruption, concurrent requests/workers and failure/reschedule restart.

Reuse existing workflow IDs, task results and recovery status for diagnostics: selected baseline, format, validation failure, reset generation, completed reset versus next scheduled occurrence and last failure. Do not log credentials or captured private content. A valid cron is not scheduler health; file presence is not integrity; a 202 is not success.
