# Design

## Context

See [proposal](proposal.md) for motivation and [delta](specs/meal-planning/spec.md) for the supported behavior. This design records extraction decisions across the existing UI/API/persistence/live boundaries; it proposes no application architecture change. BSL-meal-planning-014–020 in the [capability plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/meal-planning.md) owns evidence, identities and complete mappings.

The first observable slice is a person opening Other plans on an ordinary dated empty card, saving the default Mystery night, and seeing recipe-free skipped content after a reread. The same sheet edits captured metadata and clears existing recipe-free plans. Source spans Planner/pivot/sheet, `nonCooking.ts`, browser `planner.ts`, Kiota date builders/models, OpenAPI validation/removal operations, ScheduleController/Service, CalendarEvent/WeeklyPlan, grocery follow-up and SSE/store/Home reconciliation. These are inspected paths, not executed integration evidence.

## Goals / Non-Goals

**Goals:** Extract only missing recipe-free lifecycle rules, distinguish displayed target from stored occupancy, preserve source-supported failure boundaries and keep a reviewable evidence trail.

**Non-Goals:** No runtime repair or qualification. No new reservation/version policy, general recipe removal, movement, eligibility, voting or cooking policy. Existing models/contracts/configuration stay unchanged. Deferred discrepancies cannot silently become normative promises.

## Decisions

### 1. Extend meal-planning with ADDED requirements

Reuse its promoted week/date, read projection, displayed classification and assignment clauses. Keep Purpose and all 30/70 promoted blocks byte-identical; a MODIFIED delta would duplicate settled behavior and risk broadening this slice. Shared access uses household-identity's Authenticate protected API requests independently and page/member context requirements; recipe facts/visibility stay recipe-library's Return only eligible household library recipes and Return persisted recipe detail for an available record. Those library rules do not become save prerequisites. Connection identity, delivery, matching-week/optimistic snapshot guards and Today guards stay household-live-updates requirements of those names.

### 2. Separate displayed eligibility from persistence

Planner captures `{date, weekOffset, plan, existing}` and keys the sheet by offset/date. The request sends that date directly, not a server-relative index. The pivot condition accepts recipeless or pending days at nonnegative offsets, but pending recipe cards hide Change; withhold a general reachable pending-suggestion conversion promise (U116). Existing recipe-backed skips can still render non-cooking fallback copy, but cannot enter this recipe-free edit action. No API date-range prohibition is inferred from the UI offset gate.

### 3. Preserve mounted-draft semantics

`NonCookingDaySheet` state initializes once from captured props. One message persists across choices; mystery hides/omits it, other presets optionally save it, custom requires it. Local `Array.from(trimmed).length` and server `EnumerateRunes` express the 80-code-point/scalar limit; no grapheme or UTF-16 limit is invented. The latch prevents duplicate submits in one mounted sheet, alongside disabled controls and idle-only dismissal. Unmount/navigation does not cancel requests; same-target overlap remains unversioned (U117). Do not turn these local controls into server idempotency.

### 4. Keep calendar commit distinct from completion

`ValidateDayAsync` validates explicit plans before mutation, starts Serializable only for an explicit plan on a relational provider, selects the first event by date, rejects recipe/non-skipped occupancy, then creates/updates a recipe-free Skipped entry. Save/commit precedes slot publication and 200 `{data:{message:"Cooking status updated",mealMarkedCooked:false}}`. No weekly-plan creation/status change or grocery/week/fill invalidation occurs on this path. Transaction scope does not include browser reread or delivery. Direct/nested PostgreSQL serialization conflicts have selected 409 handling; no automatic retry or exhaustive error matrix exists (U118/U119).

Actual SQL permits optional preset notes, status 0–4 and unique date+meal_slot; EF's declared check still disallows preset notes. SQL compatibility changes the check using a marker; no installed database is inspected. Withhold universal constraint parity/enforcement rather than choosing EF or SQL as proof of deployed behavior (U118).

### 5. Keep the two clear callers separate

Sheet clear awaits DELETE then captured-week GET, displays busy/error feedback and guards closure. Pivot clear closes immediately and invokes `weekStore.removeRecipe`, which optimistically clears the indexed entry and restores captured local schedule/items on rejection; it does not await a reread or show sheet feedback. Both reach date-only removal with no expected kind/recipe/version predicate. If a recipe appeared meanwhile, the endpoint can remove that first date entry; no safe compare-and-clear claim is extracted (U120).

Deletion saves before grocery recomputation. Recompute can create a missing Draft WeeklyPlan, retains an existing status, saves its own result and conditionally publishes grocery_updated without origin exclusion. Then removal reads schedule, publishes week_updated and fill_the_gap_invalidated with exclusion. A missing entry bypasses this follow-up. No enclosing clear transaction or compensation spans these steps (U119); grocery aggregation/check policy is not extracted.

### 6. Offer rereads to existing guards without claiming convergence

Planner's save wrapper ignores response fields. POST failure attempts a captured-offset GET, offers usable data only while that offset remains loaded and rethrows the original failure; a successful POST followed by a rejected GET also shows a save error. Clear lacks the POST-failure refresh branch. Resolved unusable GET can still allow closure. `activeNonCookingDate` plus selected offset guard closure; offset comparison is not generation protection. `applySnapshot` can defer or preserve content under existing live rules, including pending suggestions after clearing. No successful persistence is inferred from dismissal/display (U117/U119/U121).

There is no direct Today sync/update in these save/clear callbacks. Eligible received slot/week events update Today under its local-date/optimistic guard, but origin exclusion can skip them. Home mount uses its existing SSR initializer and `sync()`; sync can inspect an adjacent server week for local-date coverage. Home non-mystery recipe-free summary navigates with `planDate`, which opens one matching week-zero pivot, not the edit sheet. Preserve the near-midnight handoff gap and absence of guaranteed convergence (U121).

## Risks / Trade-offs

- Displayed empty/pending state can differ from stored occupancy → require the supported server conflict branch; withhold universal race safety.
- EF/install/compatibility constraints differ → retain exact source evidence and unexecuted PostgreSQL assertion limits; no schema repair.
- Commit/delete precedes fallible publication/recomputation/reread → describe partial success and editable retry controls without safe-retry or rollback guarantees.
- Local guards do not version overlapping requests → retain navigation/unmount/ABA limits and direct pivot clear's weaker feedback separately.
- Tests substitute auth/provider/transport → classify implementation support and inspected assertions separately from executed behavior; preserve U95–U115/A34.

## Migration Plan

Documentation-only draft: no data migration, deployment or runtime rollback. Human review is next. Promotion, archival, implementation and qualification each require separately selected authority.
