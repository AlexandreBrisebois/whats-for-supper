# Design

## Context and Existing Ownership

`slotAssignment.ts:findFirstOpenPlannerSlot` validates seven dates and reference consistency but its eligibility predicate lacks a date/today comparison. `RecipesExperience.tsx` loads deployment calendar, passes its day index, then rereads the candidate. `handleSelectForPlanner` rereads occupancy but does not revalidate automatic-date eligibility. Existing `deployment-calendar.ts` provides validated civil dates, reference offsets and a monotonic freshness anchor from `nextDayAtUtc`/`capturedAtUtc`; `todayStore` owns its shared calendar lifecycle. The meal-assignment baseline already requires today-or-future and a 520-week bound. These are source findings, not a claimed live production reproduction.

## Decisions and Tradeoffs

Put candidate eligibility in the existing scan owner, using returned authoritative today rather than assuming the initial index remains valid. Derive correct offsets against the captured reference; a historical reference must not make offset zero mean the current week. Preserve the 520-week bound and reject unavailable/malformed/incoherent weeks rather than infer empty slots. Reuse calendar anchors and shared refresh hooks instead of browser-local day arithmetic or a second calendar store.

Track target origin as automatic versus explicit (route/day chooser). Automatic freshness and before-save guards must not bleed into historical explicit-date planning. If midnight invalidates a displayed date, refresh it and require another deliberate dated activation: silently writing a new date breaks the user's captured intent. If a future displayed date remains eligible under a fresh coherent calendar/slot check, it can still be used without a gratuitous extra confirmation. No new global server rejection of past dates is proposed.

## First Observable Slice

Untargeted Recipes detail → fresh deployment calendar → existing schedule wrapper → first eligible today/future slot → visible date → fresh calendar and slot validation → existing guarded assignment. First regression uses a returned week with ordinary empty past days and a historical reference; acceptance verifies the chosen date and request reference, then the displayed save destination.

## State, Concurrency and Recovery

Expire automatic targets using the server day boundary and elapsed-time anchors, refreshing on rollover and focus/visibility resume. Never rely solely on a timer, which can be suspended. Keep recipe/context/generation guards on both scan and save completion; bound restart behavior when a rollover occurs during scanning, failing with read retry if coherent facts cannot be established. Do not hold the CTA actionable while refreshing or after read failure. Before a new write, freshly validate calendar and captured date plus existing slot/conflict checks. This is a client recommendation guarantee at authoritative validation time; it does not introduce an atomic server midnight predicate or forbid explicitly dated writes.

Reconcile an uncertain assignment against its original captured slot first, even if now historical. Acknowledged writes remain acknowledged. Refresh failure cannot authorize replay or silently move a recipe to a new day. Concurrent occupancy still follows guarded assignment and established replacement recovery.

## Compatibility, Rollout and Reversal

Use existing `GET /api/schedule` calendar response and guarded `POST /api/schedule/assign`. No OpenAPI/client change is expected. Existing explicit target/reference compatibility remains; no persisted data migration. Revert only scoped frontend behavior if necessary. The notice proposal shares Recipes return paths but is independently reviewable; coordinate implementation ownership after quiet portions.

## Risks and Deferrable Questions

Stale cached calendar replies and suspend/resume can defeat naive timers; preserve request generation/anchor validation and test delayed responses. A calendar refresh must not rewrite explicit-date context or reconcile an uncertain write at a different destination. A write that crosses midnight after authoritative validation remains governed by the existing explicit dated API; atomic server-time enforcement would be a separate contract decision outside this correction.
