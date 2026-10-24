# Design

## Context and Existing Ownership

See proposal for the selected scope. At main `3d1bd68`, `ScheduleService.ToggleGroceryItemAsync` reads a tracked `WeeklyPlan`, deserializes its JSON check map, changes one key, then saves and publishes. `UpdateGroceryStateAsync` replaces the map. `GroceryRecomputeService.RecomputeForWeekAsync` loads prior lines/checks and may write the check map through `ApplyMergedStateTransitions`. These scoped services do not themselves establish shared serialization.

This is source evidence for a race hypothesis, not a PostgreSQL reproduction. The first implementation experiment must exercise the actual item PATCH with separate request scopes and controlled overlapping reads/saves. If no lost update is reproducible, preserve that result and reassess before adding a fix.

The canonical grocery owner intentionally says sequential only. This delta strengthens that contract; it does not retroactively label existing behavior a violation of a promised concurrent merge.

## Decisions and Tradeoffs

- Use one grocery-owned host-local async gate shared by all three normal check-map writer paths. Reuse the `VotingSession` singleton `SemaphoreSlim` / `IServiceScopeFactory` / `finally` lifetime pattern, not its voting-specific lock, revision projection or business rules. Start with one simple gate, not keyed lock lifecycle infrastructure.
- Acquire before reading state used for the mutation and retain ownership through save and the existing publication attempt. No background queue or early acknowledgement. This makes publication attempts ordered but may hold the gate during a slow publisher; observe existing publisher timeout/failure behavior and do not promise a latency bound.
- Use a fresh scoped database context inside the gate for the grocery operation. Never store a scoped `DbContext` in a singleton or share it between concurrent operations. A tracking query on the original request context is not a refresh.
- Preserve full-map replacement/clear semantics; serialization cannot infer missing intent from stale replacement bodies. Same-key conflicts follow actual processing order, not fairness or click chronology.
- Preserve display-name identity, normalization, recompute rules and extra occurrence/version ownership. Do not introduce a database migration, distributed queue or generic locking framework.

## First Observable Slice

Two authenticated household requests issue `PATCH /api/schedule/{weekOffset}/grocery/item` with `{ ingredientName, checked }` for distinct keys. Follow `ScheduleController` → `ScheduleService` → coordinated persistence → actual PostgreSQL save → grocery publisher. Await both responses, read with a third fresh scope and assert both values. Then exercise two browser tabs against that real API. In-memory EF or browser mocks alone cannot qualify this boundary.

## State, Concurrency and Recovery

Review all normal check-map assignments and DI registrations before implementation. Every writer must use the same gate, including recomputation that changes predecessor keys. An old scoped writer saving a previously tracked `WeeklyPlan` after the gate can reintroduce lost data: inspect callers and ensure they neither overwrite fresh grocery fields nor lose unrelated pending changes. Do not clear or reload an entire change tracker as a shortcut.

Audit nested calls and lock ordering first: the gate is non-reentrant. Public coordinated entrypoints must not call another coordinated entrypoint while holding it; use one owner and an internal already-owned operation if necessary. Recompute-for-recipe/ingredient loops acquire once per actual week operation, not recursively. Review existing transaction/restore coordination and caller transactions before choosing the insertion point. A fresh scope cannot see another scope's uncommitted work: preserve existing commit-before-recompute boundaries; if a caller requires uncommitted data, stop and resolve that dependency rather than silently changing transaction semantics.

The correctness property is serial equivalence of these operations on each weekly map. For distinct keys with no replacement/rename, both successful intended values survive; for one key, the last processed intended value survives. Recompute preserves unrelated current entries. Full-map writes deliberately reset the domain to the supplied dictionary. Exercise controlled interleavings, not timing sleeps as proof.

Cancellation before acquisition must not release an unowned semaphore. Every acquired path releases in `finally`, including cancellation, save exceptions and publisher exceptions. Inspect ambiguous commit/response failures separately from pre-commit failure; never claim an exception proves rollback. Existing per-item optimistic UI and retry behavior remains, with authoritative reread as recovery.

## Persistence and Side Effects

The database commit is the durability boundary; the in-memory gate has no durable work log. A crash before commit can lose pending work; a committed check remains recoverable after restart. No exactly-once delivery or automatic replay promise is added.

Retain the existing publication eligibility: item/full-map saves attempt grocery publication; recompute does so only on a changed check map when a publisher exists. Preserve absolute week identity and request connection exclusions. Hold the gate through completion/failure of the attempt to prevent this boundary from publishing its own older full map after its newer one.

Independent schedule HTTP responses, connected/week snapshots and delayed client optimistic rollbacks can still race. Existing clients do not have a general grocery revision guard. This draft therefore does NOT promise universal out-of-order snapshot rejection. Test delayed/reordered cross-channel messages to document the limit and verify fresh reread recovery after outstanding messages settle. A revision/incarnation protocol would be a separate scope decision requiring evidence and approval, not an implicit prerequisite here.

## Compatibility, Rollout and Reversal

Keep item PATCH 204, full-map PATCH 200 `{ data: dictionary }`, explicit false and empty maps. Reconcile overly broad concurrent-atomicity descriptions in `specs/openapi.yaml` to the single-instance processing contract before future production edits; regenerate Kiota client rather than editing generated files. Synchronize method-sensitive stateful mocks and consumers in that slice. No new wire fields are selected.

Existing grocery extras keep their independent occurrence/version checks. Overnight cooked maintenance, planner move coordination and administrative state replacement are not expanded. A future multiple-instance deployment invalidates this design premise and needs an independently approved coordination design.

## User Experience

Keep immediate checkbox feedback and ordinary navigation; the request remains pending until its existing persistence/publication flow completes. Preserve keyboard click/Enter/Space behavior, accessible checked state, per-item failures and unrelated-row interaction. The premium outcome here is durable household shopping progress, not a redesigned checklist or a claim of globally fresh live state.

## Evidence and Verification Limits

This planning pass used GitHub Connector source/spec inspection only. No runtime reproduction, local OpenSpec CLI, task harness, database test or browser qualification was run. Draft CI can validate artifact syntax, not the proposed concurrency correction. All implementation tasks remain unchecked.


## Implementation writer and caller audit (2026-10-24)

- Normal assignments to `WeeklyPlan.GroceryState` are confined to `ScheduleService.UpdateGroceryStateAsync`, `ToggleGroceryItemAsync`, and `GroceryRecomputeService.RecomputeForWeekAsync`. A singleton `GroceryCheckCoordinator` will own one semaphore and create an async service scope after acquisition. Its callback owns a fresh `RecipeDbContext` until save/publication completes. No scoped service is retained by the singleton.
- Item and replacement each acquire once. Recompute's public week entrypoint acquires once and invokes a private core on the fresh context; recipe/ingredient loops call that entrypoint once per week and never hold the gate themselves. No coordinated public method calls another while owned. Voting and recovery locks are not acquired inside this gate.
- Schedule assignment/removal/plan-later/Tomorrow callers save or commit before recompute; `SyncRecipeProcessor` and `IngredientCategoryService` also save before recompute. Existing transaction boundaries are preserved. No fresh read requires uncommitted caller input. Administrative restore/reset remains out of scope.
- Caller contexts retain their unrelated tracked changes. Grocery operations never modify caller-tracked plans; later EF updates of status fields do not mark grocery columns modified. Schedule snapshots use an `AsNoTracking` plan read so a caller does not publish its own stale grocery projection after recompute. No change tracker is cleared or reloaded.
- `SseConnectionManager.BroadcastAsync` awaits per-connection writes and catches disconnected-client failures; there is no explicit publication timeout. Holding the grocery gate preserves attempt order but adds no latency guarantee.
