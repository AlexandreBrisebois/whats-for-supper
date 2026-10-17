# Design

## Context and Existing Ownership

DreamingWorkflowSeeder seeds existing maintenance (default cron 06:00 UTC); existing workflow processors own child dispatch and outcome. RecipeService/detail PATCH own isDiscoverable; Discovery reads persisted eligibility. Deployment calendar determines week boundaries independently of scheduler UTC. Recipe.LastCookedDate is authoritative for this new cooldown, including recipe-specific cooking and corrected values; Search's materialized event date remains a separate signal. Do not introduce a cooking ledger.

## Decisions and Tradeoffs

Accepted: evaluate only at Dreaming runtime, four complete calendar weeks by default, null means never eaten, explicit temporary return is immediate, next successful pass may suppress again, explicit persistent exclusion and suitability remain distinct. Persist enough state to distinguish rotation intent, explicit suitability, effective cooked suppression and effective discoverability. No per-session override timer or read-time computation. Early return clears effective suppression; raw cooked date remains unchanged, so the next pass can reapply it.

Cooked cooldown defaults to four complete calendar weeks. At successful Dreaming evaluation, let W be the current deployment-calendar Monday and N the positive integer week setting (default 4). Cutoff = W.AddDays(-7 * N). A non-null cooked date on or after cutoff is recent, including the current partial week; a date before cutoff has aged out. For W = 2026-10-12, September 14 is recent and September 13 has aged out. At W = October 19, September 14 has aged out; restoration still waits for successful Dreaming. This can exceed 28 elapsed days and is not calendar-month arithmetic.

Human Discovery OFF records Human provenance and remains off until explicit Human ON. Dreaming and AI cannot erase or reactivate that intent. Human ON clears the human exclusion and effective cooked suppression immediately, subject to supper suitability and the separate current-plan visibility guard; it is not a permanent cooldown exemption. The next successful Dreaming evaluation may suppress it again. Legacy unknown OFF remains Unknown, is not backfilled Human, and may be restored by ordinary Dreaming reconciliation. No session-pause state or lifecycle is required.

## First Observable Slice

Create red/green PostgreSQL integration cases through the real Dreaming processor: a recent suitable recipe becomes suppressed, Human ON returns it immediately, the next successful pass suppresses it again, and Human OFF survives all passes. Verify Discovery and Quick Find persisted behavior while Search remains available. Add the legacy Unknown case and the exact Monday cutoff boundary.

## State, Concurrency and Recovery

Read current cooked date, Human-off intent, suitability and row/version before each conditional update. Reject or reevaluate stale writes racing a manual action, corrected cooking or restore. Duplicate work converges; partial batches retain committed rows and report unfinished work. Retry reads current facts rather than replaying stale desired values. Use existing processor/batching/cancellation conventions, not a global transaction or scheduler.

Successful individual updates precede their existing invalidations. SSE failure does not revert persisted eligibility; refetch reconciles. Counts, category vocabulary and Discovery list must use consistent effective eligibility and supper suitability. Expiry during an open voting session does not itself re-enable a recipe; a successful pass can, still respecting member already-voted exclusion. Corrected/undone cooking affects next pass only. GOTO Home's current configured fallback remains independent.

## Persistence and Side Effects

Extend existing recipe backup metadata and demo snapshots with rotation intent, suitability and effective cooldown state using explicit version defaults. A restore must not guess legacy false was automatic cooldown. Restore committed facts consistently, invalidate stale worker evaluations and reconcile at a later successful Dreaming run. No stale worker can overwrite newly restored state. Metadata privacy remains household-scoped; no member-level preference data is introduced. Permanent purge removes dependent state through recipe ownership.

## Compatibility, Rollout and Reversal

Deploy schema and compatible readers before new writers. Legacy false remains Unknown; do not infer Human from stored boolean. Synchronize PATCH/OpenAPI/client/mocks with explicit human actions and trusted automated execution context. Existing boolean toggle behavior stays; omitted/null preserves intent.

Rollback disables new Dreaming writes first and keeps rotation intent/effective state persisted. Do not collapse distinct reasons back to one boolean and promise reversibility. If disabling cooldown should return currently suppressed recipes, a controlled one-time reconciliation using retained reasons is needed; do not bulk-enable explicitly kept out of rotation or unsuitable recipes. Existing UI clients must remain able to read effective discoverability; new action controls require compatible server deployment.

## Operational Diagnosis

Reuse workflow status and logs to distinguish dispatch, child failure, per-recipe stale-write retry and successful reconciliation. Record evaluated cutoff/config generation and outcome counts, without logging personal voting payloads. Delayed jobs imply delayed return; the UI/help must not claim the scheduled time guarantees completion. No new operational dashboard or service is required.

## User Experience

Use designer and mère-designer guidance: existing detail/stack toggles communicate Human OFF and ON and explain that ON can be suppressed again by a later successful Dreaming pass. No new screen or badge; use compact contextual help and existing Family Guide. Accessible name/state, keyboard activation, touch target, pending disable and failed-action rollback require focused interaction tests after implementation. Explain that temporary return lasts until the next successful Dreaming reconsideration, not until closing the vote. Simulated family perspectives are critique only; no family role or actual participant contact was used.

## Current-plan selection guard

Observed at 4623452: DiscoveryService.GetRecipesForDiscoveryAsync and GetAvailableCategoriesAsync take member/category/cuisine but no planning-week argument and do not inspect CalendarEvents. Proposed scope is the current deployment-calendar week, captured once per request. Compose a current-plan membership predicate with persisted Discovery/cooldown state; assignment does not permanently flip a recipe's rotation intent. Apply the predicate on reads and publish existing queue invalidation after assignment/removal/replacement commits so loaded cards disappear promptly. Counts/categories use the same predicate. A future-week assignment alone does not block current Discovery. A displayed pending suggestion is not a persisted selection. If selection is removed, the recipe can return under all remaining eligibility; this does not bypass a still-active cooked suppression or Human-off intent.

This immediate selection rule is intentionally separate from Dreaming-only cooked-date reevaluation. No new background worker or read-time cooked timer is introduced. Do not generalize the predicate to Search/Browse or change Quick Find's target-week assignment exclusion. Stale asynchronous queue replies cannot restore a now-selected recipe after a newer invalidation. Race tests must cover assignment while a Discovery card is open and removal/replacement before refresh.

### Exact committed-event predicate

Use `CalendarEvents.Any(e => e.RecipeId == recipe.Id && e.Date >= currentMonday && e.Date <= currentSunday && (e.Status == Planned || e.Status == Locked || e.Status == Cooked))`. Date uses DeploymentCalendar; no household browser timezone or voting-close gate. Current assignment writes Planned (0), so “locked in” means a committed choice, not only enum Locked (1). Cooked remains on this week's plan. Skipped and AwaitingConsensus are not committed choices under this explicit interpretation; transient smart suggestions are not calendar assignments. This needs source/contract tests but no invented individual-confirmation UI. Status values are verified in CalendarEvent.cs at 4623452. No extra selected-week ledger is introduced and no broad historical-boost cancellation is inferred.

## Final control and persistence contract

Use the existing inverse boolean toggle; no extra permanent-exclusion action is required. Explicit human PATCH false records the latch, true clears it and effective cooked suppression. Unsuitable ON requests reject without partial mutation; current-plan visibility remains an independent read guard even when the stored flag is true. Omitted/null isDiscoverable preserves state and attribution. AI and Dreaming use trusted separate execution context and cannot spoof or clear Human-off. Backup/restore preserves Human-off and its provenance; legacy absence stays Unknown. Restore invalidates stale worker versions.
