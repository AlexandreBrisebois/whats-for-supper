# Design

## Scope and dependency

PR #340 supplies the remaining prepared-household capture/reset behavior. Implementation is selected on `feature/prepared-demo-showcase-loop`, based on #348's local corrected head `fdde5fe3`. Its provider refusal, local prepared-bundle imports, local issue resolution, lexical Search/Similar and demo context/acknowledgement remain separate owners. Home active-round handoff and recipe duration behavior are preserved. The original connector research was pinned to main `4682643cd6086b66008fc77ede4570329e29b5ae` and #340 `62d3c27e46f2b7a799dc6f2c5278986dcdd2cf59`; those planning checks do not qualify this implementation.

No new scheduler, role system, generic snapshot framework, management UI or runtime mode-toggle is introduced. No live activation, archive, merge or deployment is selected.

## Accepted behavior

Prepare privately with demo mode disabled. Capture and manual restore are forbidden in visitor mode at management acceptance, generic workflow dispatch/retry and execution. Recursive dispatch checks distinguish parameterized calls to the same definition. Automatic reset remains server-owned; private manual reset is one-shot. Legacy or incomplete baselines require recapture.

Restore prepared members, recipe facts, preferences, approved overrides, declared household settings, categories and assets. Preserve captured audit dates and ordinary retention. Clear visitor calendar, saved meals, grocery checks/items/extras/lineage, votes, reports, aggregate history and LastCookedDate. Pin the deployment current week once. Create fresh round/history authority plus a new empty VotingOpen weekly record: this is the existing discovery owner, not a saved menu. No meals or groceries are assigned by reset or convergence. Application clocks, Calendar:TimeZone and UTC cron keep their existing meaning.

## Database dispositions

Every public table must be classified; schema or ownership drift fails compatibility before destructive publication.

| Table | Reset disposition |
|---|---|
| family_members | Restore supported fields and stable IDs |
| recipes | Restore facts/readiness/rotation/deletion; clear cooked date/suppression; retain audit meaning |
| recipe_search_documents | Rebuild lexical projection; reuse only compatible prepared vectors |
| weekly_household_interest | Clear aggregate voting history |
| voting_round_state | Fresh current-week round/history identity |
| recipe_votes | Clear |
| weekly_plans | Clear old containers/groceries/checks; create one empty current-week voting owner |
| calendar_events | Clear all saved meals and non-cooking plans |
| grocery_extra_occurrences | Clear occurrences, checks, tombstones and lineage |
| feature_flag_overrides | Restore approved member overrides subordinate to demo policy |
| family_settings | Restore declared family_goto references; reject unclassified keys rather than erase operator state |
| ingredient_categories | Restore prepared mappings |
| recipe_import_reports | Clear, never replay reimport authority |
| recipe_search_filter_state | Rebuild without providers |
| recipe_search_affinity_facts | Rebuild from fresh facts without providers |
| workflow_instances | Preserve active reset and qualified future Dreaming; fence other old work |
| workflow_tasks | Same preserved instance set; invalidate obsolete runnable tasks |
| maintenance_commands | Invalidate queued/processing commands |
| recovery_publication | Publish fresh operation identity; never replay captured marker |

The two discovery/matches SQL views derive from these facts. They are not snapshot tables. Explicit collection emptiness and relationship constraints are validated against staging before replacement.

## Capture and publication ownership

`ManagementController` persists background acceptance; `ManagementProcessor` delegates to `ManagementService` and the existing `RecoverySnapshotService`. The workflow root resolver honors configured definitions independently of the data partition.

Capture stages a complete immutable version-2 artifact, validates schema, relationships and hashes, then atomically selects `DataRoot/demo/current`. Failed capture cannot replace the prior selection. Explicit empty assets require an existing empty inventory directory; missing assets, malformed JSON, incompatible references and legacy format fail before mutation.

Demo coordination activates without requiring independent Recovery:BackupRoot. The first capture marker ensures preceding writes drain. Ordinary independent exact recovery remains separately configured. Snapshot/Publish leases are owned by capture/reset processors, never upgraded from the worker's ordinary Write lease. Request writes, ordinary workers and the reaper participate in the shared boundary.

Restore preflights while the old generation remains available, then takes bounded publication ownership. It rechecks claimed reset eligibility inside that lease because another reset may already have fenced the instance. The existing journal, DB marker and recipe-generation pointer reconcile interruption before/after commit to a complete prior or committed generation. Never delete live files before classifying the commit. Default wait is five seconds; default publication deadline is 30 seconds, using the existing bounded configuration.

Only current reset orchestration and explicitly reviewed future maintenance survive. Eligible Dreaming requires a Pending instance with empty parameters, never-retried Waiting/Pending tasks, and future Pending roots. Reviewed processors are PruneWorkflows, ProcessMaintenanceCommands, PruneMaintenanceCommands, FinalizeOverdueMeals, RolloverGroceryExtras, ReconcileRecipeRotation, MaterializeRecipeSearchFilters and GenerateDreamingReport. StartWorkflow may target only db-backup, search-reconciliation or dreaming. Claimed, retried, unknown and visitor work is invalidated; old queued maintenance commands never survive. Prepared workflow definitions/leases/tasks are not captured.

## Recurrence and diagnostics

The existing seeder/shared workflow acceptance owns the next normal UTC cron occurrence. A PostgreSQL advisory lock deduplicates concurrent acceptance. Terminal failure remains visible; periodic/startup reconciliation establishes future recurrence without immediate catch-up. The automatic marker cannot be supplied through a visitor management bypass.

Existing status distinguishes baseline absence/unsupported/invalid content, readiness/identity, publication recovery, last reset task/outcome and a confirmed successor. A valid cron or 202 response is not readiness or completion. Published state counts are read within the transaction after rebuild, not from baseline rows that intentionally omit derived state. Independent recovery status stays disabled without its own backup configuration.

## Browser generation and recovery

Health and coordinated reads expose X-Demo-Generation. Allowed demo mutations require the generation observed with the current document; missing/stale values return 412 DEMO_RESET_REQUIRED before changing state. Existing AI/management refusals remain 403. Non-demo semantics are unchanged.

One `DemoRequestSession` wraps generated Kiota and raw fetch. It pins initial response identity, rejects late responses and stale writes without replay, and probes health after successful mutations to catch a missed reset. Server-rendered Home responses carry their identities into the session; mixed/obsolete bootstrap triggers refresh. Recipe media URLs include the pinned generation so immutable cached visitor bytes cannot stand in for restored assets.

Connected SSE includes demoGeneration; demo_reset includes generation. Any observed change removes mounted editors and offers focused EN/FR continuation. Continuing reloads the document and authoritative stores; pending PDF ownership is discarded, the share query is removed, and old optimistic drafts are never replayed. Browser locale, valid member choice and demo acknowledgement remain outside server reset. Existing identity reconciliation handles removed members. No countdown or success claim is made for an obsolete save.

A secondary self-hosting link in existing demo guidance explains private household ownership and operator-configured AI with possible provider costs. It does not reintroduce a tour.

## Qualification and limits

Use deterministic synthetic facts, disposable PostgreSQL/Linux/files and failing provider doubles. `DemoShowcaseLoopPostgresTests` exercises staged capture, invalid assets/references, explicit emptiness, configured roots, pre/post-commit failure, old requests/workers/reaper, repeat reset, real scheduled success/failure and cross-process successor acceptance. The synthetic two-member/seven-recipe exercise proves ordinary convergence, explicit saving, groceries/cooking and reset; companion tests verify PDF/hero bytes and ordinary independent recovery.

Unit tests establish transport arrival-order behavior, SSR identity and UI draft removal. Stateful browser tests cover full interaction and reset/re-entry with English/French, focus and touch targets on iPhone, Pixel Phone and iPad portrait/landscape emulations. Dependency tests retain model-free import/resolution and context behavior. These are local checks, not physical-device, deployed-host or power-cut qualification. Exact passing/failing records belong in tasks.md and the final harness record.

Operator instructions are in [prepared-demo.md](../../../../docs/operations/prepared-demo.md). Final preparation/verification includes all task-owned paths and generated closure while excluding concurrent locale catalog edits.
