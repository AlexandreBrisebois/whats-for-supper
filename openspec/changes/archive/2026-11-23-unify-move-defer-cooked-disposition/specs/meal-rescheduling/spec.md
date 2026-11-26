# Spec Delta

## ADDED Requirements

### Requirement: Prompt for cooked disposition when deferring a cooked meal to next week

When a household member triggers Save for Next Week on a `Cooked` meal (`status === 2`), Planner SHALL open a two-choice sheet naming the meal before submitting movement. Choosing **Cook it next week** SHALL submit `cookedDisposition: "reset"`; choosing **Already cooked** SHALL submit `cookedDisposition: "preserve"`. Dismissing the sheet SHALL submit nothing. Uncooked meals SHALL defer immediately without prompting.

#### Scenario: Cooked meal chooses Cook it next week

- **WHEN** a person activates Save for Next Week on a `Cooked` meal in Planner and chooses **Cook it next week**
- **THEN** Planner submits `POST /api/schedule/move` with `intent: "defer"` and `cookedDisposition: "reset"`
- **AND** the moved meal appears in the destination week as `Planned` without a preparation receipt

#### Scenario: Cooked meal chooses Already cooked

- **WHEN** a person activates Save for Next Week on a `Cooked` meal in Planner and chooses **Already cooked**
- **THEN** Planner submits `POST /api/schedule/move` with `intent: "defer"` and `cookedDisposition: "preserve"`
- **AND** the moved meal retains its `Cooked` status and preparation receipt in the destination week

#### Scenario: Cooked prompt is dismissed

- **WHEN** a person opens the cooked-move prompt from Save for Next Week and closes or cancels it
- **THEN** no movement request is submitted and the meal remains on its original date unchanged

#### Scenario: Uncooked meal defers without prompting

- **WHEN** a person activates Save for Next Week on a `Planned` or `Locked` meal in Planner
- **THEN** no cooked-disposition prompt opens and deferral submits immediately

#### Scenario: Bilingual prompt copy stays truthful to persisted effects

- **WHEN** the cooked-move prompt renders in English or French
- **THEN** the subtitle asks _"This meal is marked cooked. How should we move it?"_ (or its French equivalent), the choices present **Cook it next week** (_"Move as planned and clear cooked status"_) and **Already cooked** (_"Keep it marked cooked (prepped ahead or frozen)"_), and neither option claims ingredients are excluded from groceries

## MODIFIED Requirements

### Requirement: Submit dated-source movement through the protected operation

`POST /api/schedule/move` SHALL be the single protected movement operation for `intent` `"swap"` (default), `"tomorrow"`, or `"defer"`, accepting `weekOffset`, `recipeId`, and intent-applicable fields (`toIndex`, `fromIndex`, `sourceDate`, `targetWeekOffset`, `sourceDisposition`, `sourceNonCooking`, `cookedDisposition`). Unsupported intents, cross-week `"swap"`, or invalid `cookedDisposition` SHALL return `400` without mutation. Access SHALL follow household-identity authentication.

#### Scenario: Explicit drag source

- **WHEN** Planner commits a same-week recipe drag
- **THEN** the request supplies source week, recipe ID, `fromIndex`, and `toIndex` with `"swap"` (or omitted default) and no cross-week target

#### Scenario: Protected movement lacks credentials

- **WHEN** movement lacks accepted household credentials
- **THEN** shared API authentication rejects it independently of page access

#### Scenario: Unsupported intent or cross-week swap rejects with 400

- **WHEN** a request submits legacy `intent: "push"`, an unknown intent, cross-week `intent: "swap"`, or an unknown `cookedDisposition` value
- **THEN** `POST /api/schedule/move` returns `400` without mutating the calendar, weekly plans, or groceries

### Requirement: Swap stored content within a week

For same-week `"swap"` movement with a found source and successful persistence, an occupied destination SHALL exchange recipe ID, saved vote count, day status, preparation metadata, and non-cooking kind/label with the source. With no destination entry, the source SHALL move there with status and preparation metadata preserved. Weekly plan status SHALL remain distinct from day status, and same-week swap SHALL NOT prompt for cooked disposition or clear preparation history.

#### Scenario: Destination is occupied

- **WHEN** a recipe swaps onto another stored date in the same week
- **THEN** the two dates exchange their recipe, status, preparation metadata, non-cooking content, and saved vote counts

#### Scenario: Destination is empty

- **WHEN** the selected destination has no entry in the same week
- **THEN** the source entry moves to that date with its status, preparation metadata, and saved vote count retained

#### Scenario: Cooked or prepared meal is dragged within the same week

- **WHEN** a `Cooked` or explicitly prepared meal is dragged to another slot in the same week
- **THEN** no cooked-disposition prompt appears and the moved occurrence retains `Cooked` status, preparation receipt, and `LastCookedDate`

### Requirement: Distinguish movement follow-ups from movement confirmation

Same-week `"swap"` movement SHALL attempt a source-week snapshot without grocery recomputation. Committed `"defer"` and `"tomorrow"` movements SHALL attempt grocery recomputation and snapshot publication for every affected week independently after persistence. Follow-up failure SHALL NOT turn committed movement into a failed response. Publication receipt SHALL remain household-live-updates-owned.

#### Scenario: Committed movement reports its refresh outcome

- **WHEN** an actual `"defer"` or `"tomorrow"` movement completes
- **THEN** the response returns `moved=true`, `sourceDate`, `destinationDate`, `affectedWeekStartDates`, `scheduledWeekOffset` (for `"defer"`), and `refreshComplete`, with `refreshComplete=false` when any follow-up fails

#### Scenario: Same-week movement completes

- **WHEN** same-week `"swap"` saves and its schedule read and publication return
- **THEN** the success response follows source-week publication without requesting grocery recomputation through this path

#### Scenario: Cross-week movement completes

- **WHEN** `"defer"` persistence and both affected-week recomputations complete
- **THEN** both affected snapshots are attempted before returning `moved=true` and `refreshComplete=true`

#### Scenario: Full target returns completion

- **WHEN** `"defer"` encounters a full target week
- **THEN** search spills into the next available date in a later week and returns `moved=true` with the confirmed `destinationDate` and `scheduledWeekOffset`, rather than returning a silent no-op

#### Scenario: Publication or recomputation fails after movement

- **WHEN** `"defer"` commits calendar changes and any subsequent recomputation or snapshot publication fails
- **THEN** remaining affected-week follow-ups are still attempted and the response confirms `moved=true` and `refreshComplete=false` without replaying movement

### Requirement: Request Plan later from the selected Planner week

Planner's recipe-backed Save for Next Week SHALL defer the exact dated recipe via `POST /api/schedule/move` (`intent: "defer"`) from source week plus one, spilling into later weeks without shifting other plans. For `Cooked` days, Planner SHALL confirm `cookedDisposition` first. Completion SHALL report the destination (and spillover) and refresh the source week and Today when affected. Failures or uncertain outcomes SHALL show recovery feedback without claiming movement or replaying it.

#### Scenario: Committed Plan later has incomplete refresh

- **WHEN** the move confirms `moved=true` and `refreshComplete=false` (or its separate view refresh fails)
- **THEN** Planner explains that the meal moved and some updates could not refresh, with guidance to refresh the plan rather than repeat movement

#### Scenario: Plan later for next selected week

- **WHEN** a person chooses Save for Next Week for a recipe in selected offset one
- **THEN** deferral starts at offset two Monday rather than deployment-current next week and can continue into later weeks

#### Scenario: Movement request resolves or rejects

- **WHEN** the Plan later request returns a confirmed destination, rejects, or has an uncertain outcome
- **THEN** confirmed destination is reported and the source week refreshed; rejection or uncertainty shows recovery feedback without confirming relocation or repeating an uncertain write

#### Scenario: Committed move has incomplete refresh

- **WHEN** a committed Next Week result is followed by incomplete refresh
- **THEN** Planner rereads the selected week and shows a warning that the meal moved and the plan should be refreshed, without resubmitting movement

### Requirement: Defer the exact dated recipe through a protected operation

`POST /api/schedule/move` (`intent: "defer"`) SHALL match the exact source supper by `sourceDate` (or `weekOffset` + `fromIndex`) and `recipeId`, with no fallback to other occurrences. Missing sources SHALL return `404`; `AwaitingConsensus` SHALL return `409`; invalid `sourceNonCooking`, `cookedDisposition`, or `targetWeekOffset` SHALL return `400` without mutation. Access SHALL follow household-identity authentication, and other supported states SHALL NOT be blocked by Locked weeks.

#### Scenario: Source does not match

- **WHEN** an authorized `"defer"` request has no entry matching both exact source date and recipe ID
- **THEN** it returns `404` without moving another occurrence of the recipe

#### Scenario: Source awaits consensus

- **WHEN** the exact source is `AwaitingConsensus`
- **THEN** it returns `409` without deferring that entry

#### Scenario: Household credentials are absent

- **WHEN** `"defer"` lacks accepted household credentials
- **THEN** the shared API authentication gate rejects the request

#### Scenario: Invalid cookedDisposition or sourceNonCooking payload

- **WHEN** a `"defer"` request supplies an unrecognized `cookedDisposition`, `sourceNonCooking.kind: "mystery"`, or a blank/`> 80`-character custom label
- **THEN** the API returns `400` without mutating the calendar

### Requirement: Find a defer destination from deployment-current next week

`POST /api/schedule/move` with `intent: "defer"` SHALL accept optional integer `targetWeekOffset` relative to the captured reference Monday, defaulting to one when omitted. Search SHALL start on that week's Monday and continue date by date until finding a date with no calendar entry. Any stored entry SHALL occupy its date. It SHALL ensure a `Draft` weekly plan for the destination Monday only if absent, without changing an existing destination week's status.

#### Scenario: Next Monday is free

- **WHEN** `"defer"` omits `targetWeekOffset` with no stored entry on reference-next Monday
- **THEN** that date is chosen regardless of the source's relative week offset, retaining deployment-current next week when reference Monday is also omitted

#### Scenario: Next week is full

- **WHEN** all seven dates of the requested destination week are occupied
- **THEN** search continues into the following week until a date without an entry is found

#### Scenario: Explicit future destination

- **WHEN** reference Monday is October 12, `targetWeekOffset` is two, October 26 is occupied, and October 27 has no entry
- **THEN** `"defer"` selects October 27 without moving or replacing October 26's entry or using an earlier free date

#### Scenario: Non-cooking entry occupies a date

- **WHEN** the requested destination Monday has a stored recipe-free non-cooking entry and Tuesday has no entry
- **THEN** `"defer"` preserves Monday and selects Tuesday

### Requirement: Return deferred content to Planned state

Deferring a non-Skipped, non-`Cooked` source SHALL move it to the destination as `Planned`, retaining saved votes. For a `Cooked` source, omitted or `"reset"` `cookedDisposition` SHALL move it as `Planned`, clear preparation fields, and recalculate `LastCookedDate`; `"preserve"` SHALL retain `Cooked`, preparation fields, and `LastCookedDate`. With `sourceNonCooking` or a recipe-backed `Skipped` source, deferral SHALL leave a recipe-free `Skipped` source and create a separate destination entry.

#### Scenario: Locked source is deferred

- **WHEN** a `Locked` recipe source defers successfully
- **THEN** the moved entry is `Planned` at the selected destination with its saved vote count retained

#### Scenario: Skipped source is deferred

- **WHEN** a recipe-backed `Skipped` source defers successfully
- **THEN** its original date remains recipe-free `Skipped` and the new destination contains the `Planned` recipe and saved vote count

#### Scenario: Cooked source is deferred

- **WHEN** a `Cooked` (or explicitly prepared) entry defers with `cookedDisposition: "reset"` or omitted `cookedDisposition`
- **THEN** the moved entry becomes `Planned` with all preparation metadata cleared
- **AND** the persistence path recalculates that recipe's `LastCookedDate` from remaining `Cooked` calendar entries

#### Scenario: Cooked source is deferred with preserve disposition

- **WHEN** a `Cooked` (or explicitly prepared) entry defers with `cookedDisposition: "preserve"`
- **THEN** the moved entry retains `Cooked` status, its preparation receipt (`PreparedOn`, `PreparedAtUtc`, `PreparedServings`, `PreparedOriginalServings`, `PreparationPlanToken`, `PreparationServingVersion`), and its recipe's `LastCookedDate`

#### Scenario: Non-cooking source disposition accompanies defer

- **WHEN** a planned source defers with `sourceNonCooking` (`order_in`, `eating_out`, or validated `custom`)
- **THEN** the source date becomes recipe-free `Skipped` with that normalized non-cooking plan in the same commit as placing the recipe in the target week

### Requirement: Complete defer after affected-week follow-ups

After `"defer"` commits, the operation SHALL await grocery recomputation and attempt snapshot publication (with request exclusion and optional move sequence) for each distinct affected week. Only then SHALL it return `200` with `moved: true`, `sourceDate`, `destinationDate`, `scheduledWeekOffset`, `affectedWeekStartDates`, `refreshComplete`, and `message`. Post-commit follow-up failures SHALL set `refreshComplete: false` without failing the response or inviting replay.

#### Scenario: Both affected weeks complete

- **WHEN** save, recomputation, and publication calls all return without error
- **THEN** the `200` response identifies `moved: true`, `sourceDate`, `destinationDate`, `scheduledWeekOffset`, `affectedWeekStartDates`, `refreshComplete: true`, and `message`

#### Scenario: Later work rejects

- **WHEN** a recomputation or publication throws after `"defer"` persistence commits
- **THEN** remaining affected-week follow-ups are still attempted and the `200` response returns `moved: true` and `refreshComplete: false` without claiming reversal or inviting retry

### Requirement: Use consistent Next Week disposition across planning callers

Home, Planner, and recipe-selection Next Week actions SHALL all use exact-source deferral through `POST /api/schedule/move` (`intent: "defer"`) beginning at the captured source week plus one. They SHALL use its confirmed `destinationDate` and `scheduledWeekOffset`, preserve other dated plans, and explain spillover beyond a full requested week. A missing or unconfirmed destination SHALL NOT permit replacement assignment or success feedback.

#### Scenario: Next two weeks are full

- **WHEN** a Next Week disposition finds both the following and subsequent week full
- **THEN** the original moves to the next available date after those weeks, other plans stay in place, and confirmation identifies the actual date and spillover

#### Scenario: Movement has no confirmed destination

- **WHEN** disposition rejects or returns no confirmed `moved: true` destination
- **THEN** replacement is not submitted and the selected recipe is retained with actionable feedback

## REMOVED Requirements

### Requirement: Push toward a later available date within the search window

**Reason**: Legacy same-week `intent: "push"` used a 14-day window with swap fallback and has zero remaining UI callers now that `intent: "tomorrow"` owns contiguous forward shifting.
**Migration**: Use `POST /api/schedule/move` with `intent: "tomorrow"` for contiguous next-day shifting or `intent: "swap"` for same-week rearrangement.

### Requirement: Place cross-week movement in the first available target-week date

**Reason**: Legacy cross-week `swap`/`push` (`MoveCrossWeekAsync`) silently no-oped when the target week was full and preserved `Cooked` status when Planner's Save for Next Week called it, causing the cooked-meal regression.
**Migration**: Use `POST /api/schedule/move` with `intent: "defer"` and `targetWeekOffset`, which provides indefinite spillover, strict source matching, `cookedDisposition`, and `refreshComplete` reporting.

### Requirement: Preserve a skipped source when moving its recipe forward

**Reason**: This requirement applied only to retired legacy `intent: "push"` and legacy cross-week placement; recipe-backed `Skipped` preservation is owned by `Return deferred content to Planned state` (for `intent: "defer"`) and `Preserve non-cooking source disposition with Tomorrow` (for `intent: "tomorrow"`).
**Migration**: Use `POST /api/schedule/move` with `intent: "defer"` or `intent: "tomorrow"`.
