# Design

## Context and Existing Ownership

See [proposal](proposal.md) for scope. Source inspection establishes the following chain, without a new runtime reproduction:

| Owner | Current behavior and required seam |
| --- | --- |
| `pwa/src/components/home/HomeCommandCenter.tsx` | Captures calendar context and original recipe, awaits disposition, calls void assignment, closes and refreshes/navigates. Tomorrow already retains a source object for committed-result reuse. |
| `pwa/src/store/todayStore.ts` | `assignRecipe` installs an optimistic recipe, dispatches `assignRecipeToDay`, catches only to console and separately hydrates details. Do not use that fire-and-forget path as persistence acknowledgement. |
| `pwa/src/lib/api/planner.ts` | `assignRecipeToDay` returns generated POST completion with relative week/index and optional reference Monday; extend its options for guarded recovery. |
| `pwa/src/lib/planner/slotAssignment.ts` | `moveTomorrow` caches known commits per source object, suppresses duplicates and disables automatic HTTP retries. Preserve its movement/reconciliation policy. |
| `api/src/RecipeApi/Services/ScheduleService.cs` | `AssignRecipeAsync` finds a date's entry without filtering meal slot, overwrites occupied targets and carries Sunday displacement onto Monday. Saves before grocery/read/publication follow-ups; later errors do not prove rollback. |
| `api/src/RecipeApi/Controllers/ScheduleController.cs`, `api/src/RecipeApi/Dto/AssignScheduleDto.cs` | Existing assignment boundary returns the wrapped message/displacement response. |
| Existing tests | `HomeCommandCenter.test.tsx`, `todayStore.test.ts`, `SkipRecoveryDialog.test.tsx`, `ScheduleServiceTests`, `ScheduleIntegrationTests`, and real PostgreSQL/live patterns in `TomorrowPushPostgresTests` provide insertion points. |

`tonight-meal-decisions` owns staged Home orchestration; `meal-assignment` owns the guarded persistence rule. Calendar resolution, movement, grocery aggregation and household publication remain with existing owners.

## Decisions and Tradeoffs

1. **Retain two acknowledged stages.** Reuse existing move/defer/delete operations and add awaited replacement acknowledgement. A combined transactional endpoint would require re-owning three disposition policies and exceeds this correction. A completed disposition is never undone automatically.
2. **Use an opt-in server guard.** Add `requireEmpty: boolean` to `AssignScheduleDto`/OpenAPI, default false. True requires an explicit reference Monday and index 0–6. Only absence of a slot-zero calendar entry qualifies as empty; non-cooking and placeholder entries are occupied. A browser reread alone cannot reserve that slot. Guarded rejection is 409 with the existing error-envelope convention and no side effects. Keep legacy requests unchanged.
3. **Give recovery an awaited store action.** Add a recovery-specific promise-returning action rather than changing every ordinary `todayStore.assignRecipe` caller. It accepts the captured target/context, delegates to the shared planner wrapper and applies confirmed state only to the matching displayed date. Keep selected recipe detail as pending-choice display data, not proof of persistence.
4. **No blind replay on unknown outcomes.** Disable Kiota automatic mutation retries for guarded recovery and perform each explicit recovery read without automatic backoff; ordinary callers retain their retry policy. Reconcile via `getSchedule` at the captured reference/offset and inspect date, slot recipe and status. Planned chosen recipe satisfies the desired outcome, even if another member selected it; this does not establish request identity. Empty permits an explicit guarded retry; occupied different content conflicts; unreadable blocks. Repeated same-recipe guarded requests return 409, then reread rather than running Sunday displacement.
5. **Mounted-session recovery only.** Preserve operation identity and stage until success or explicit abandonment. Pending close/back is disabled. Settled partial-completion close asks whether to leave the replacement unsaved and keeps persisted work. Reload/unmount does not undo anything or promise resumability. These conservative draft defaults are explicit in the specs; review may revise them before apply.

## First Observable Slice

Home Pick Something Else → Tomorrow commits → replacement assignment is rejected before persistence → retain choice and show empty persisted Tonight → Retry save succeeds without another move. Exercise actual browser/generated Kiota client → authenticated controller → ScheduleService → isolated PostgreSQL → persisted reread, grocery recomputation and two independent SSE clients. Count actual move and assignment requests; assert exact calendar IDs/dates and one replacement occurrence. Start with this scenario and its contract/guard; extend defer, Drop and ambiguous outcomes only after it passes.

## State, Concurrency and Recovery

Use a small Home-owned recovery record containing session identity, captured original/target context, selected recipe, chosen disposition, disposition outcome, replacement outcome and pending state. Do not derive original identity from later optimistic Today state.

| State | Allowed continuation |
| --- | --- |
| Choosing | Existing pre-mutation cancellation and selection |
| Disposing | One request; mutation controls, Back and dismissal disabled |
| Disposition rejected | Retain choices, show conflict; no replacement |
| Disposition unknown | Read/review only; do not infer successful defer from source absence or replay it |
| Saving | Disposition recorded complete; one guarded save, no Back to disposition |
| Save rejected or reconciled empty | Retain choice; Retry save only |
| Save unknown | Retry check only until an authoritative slot is available |
| Changed-plan conflict | Show persisted slot, retain unsaved choice; Review plan or explicit abandonment |
| Saved | Refresh/navigate using captured target; refresh errors cannot turn this back into retry-save |

Known Tomorrow outcomes reuse the same source object and helper. Defer/Delete errors can occur after persistence; conservative unknown-disposition behavior prevents guessing where the old meal went. Retain context and offer plan review without replay. Full automatic reconciliation for these disposition operations is excluded.

Before every response-driven state change, compare session identity and captured date. Repeated clicks share pending state; an older session cannot clear or navigate a newer one. If deployment midnight passes, the request still uses captured reference Monday/index, while current Tonight is refreshed separately. A captured old date must never be applied to today's newly resolved card.

## Persistence and Side Effects

Implement guarded assignment as a separate branch inside the existing service owner, before legacy occupied/Sunday behavior. Resolve the date through the injected clock/calendar; select supper slot zero explicitly. In a transaction, check slot absence, ensure the weekly plan and insert the Planned supper entry. Retain the immediate unique `(date, meal_slot)` constraint and map the specific competing-slot unique/serialization failure to 409 after rollback; do not turn unrelated database failures into conflicts. A rejected guard must not create a plan, recompute groceries or publish.

Use existing transaction patterns from Tomorrow. No schema migration or new package is planned. After commit, reuse target-week grocery/read/publication order. Follow-up failure can still produce an error after persistence; the browser classifies that as uncertain and rereads. This change does not introduce an outbox, repair failed grocery jobs, or guarantee event delivery. On an unaffected normal success, assert recomputed groceries and both clients' updates. For injected follow-up failures, distinguish persisted assignment from unavailable adjuncts and do not claim complete refresh.

## Compatibility, Rollout and Reversal

Update OpenAPI before DTO/controller/service changes, regenerate Kiota, and update the assignment mock and wrapper together. Keep the 200 `data.message`/`data.displacedRecipe` shape; add optional `requireEmpty` and documented 400/409 guarded responses. Existing Planner/Search/Browse, ordinary empty-Tonight selection and Order In callers omit the guard and retain behavior. API support must precede the new PWA caller; an older server could ignore the added field and cannot supply the guard guarantee. Deploy compatible API/PWA together through the existing release process; no new feature-flag infrastructure is needed.

Reversal removes the new caller and optional branch without database conversion; persisted meals remain. Do not silently broaden adoption to other recovery callers in this change. Main-spec reconciliation updates the two occupied/Sunday requirements to explicitly apply when the guard is omitted/false, preserving their scenarios and legacy obligations.

## User Experience

Extend the existing `SkipRecoveryDialog` with stage-aware feedback using Solar Earth components/tokens. After a completed move and failed save, show “Your original meal was moved. Your new meal wasn't saved.” with one primary Retry save action and secondary leave/review action. An unknown save instead offers Retry check. Preserve the selected recipe so no reselection is needed. Use `aria-busy`/status for progress and an announced error for failure; move focus to the error/retry control when appropriate. Verify keyboard activation, focus on close confirmation and return on cancellation. The dialog remains local to Home and does not block unrelated app navigation; leaving discards mounted-session recovery and returns to persisted state on next visit.

## Risks and Deferrable Questions

- An absent source cannot prove a lost defer request completed; this draft blocks that case instead of inventing a destination. Broader disposition tokens are a successor scope.
- Concurrent legitimate household actions after our guarded insert may change the plan again. Slot protection is atomic at assignment, not a reservation for the entire recovery or a universal exactly-once guarantee.
- Follow-up errors may leave groceries/live views stale despite a saved meal; preserving this distinction is required acceptance, and durable follow-up repair remains outside WFS-BL-002.

## Approved contract-checker compatibility correction

The apply-time schema checker recognized nullability but discarded record-parameter defaults. Following explicit user approval, preserve parsed JSON-compatible default metadata and allow an optional API property only when its declared default matches both value and JSON type. Required properties retain their prior check; absent, unrecognized or mismatched defaults do not excuse a mismatch. Eight focused tests cover these boundaries. No DTO nullability workaround or runtime policy change is introduced.
