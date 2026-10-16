# Meal planning delta

## ADDED Requirements

### Requirement: Resolve supper dates through the deployment calendar

Meal dates and Monday-based weeks SHALL use the configured deployment timezone at the supplied current instant, independently of server OS and browser timezone. An absent setting SHALL use UTC. An invalid explicit setting SHALL prevent startup with configuration guidance. Existing civil dates SHALL retain their literal values; operation timestamps SHALL remain UTC instants.

#### Scenario: Sunday in deployment and Monday elsewhere
- **WHEN** the instant is 2026-10-12T01:30:00Z, the deployment zone is America/Toronto, the server OS uses UTC and the browser uses Asia/Tokyo
- **THEN** today is 2026-10-11 and current week is 2026-10-05 through 2026-10-11

#### Scenario: Unconfigured deployment
- **WHEN** no deployment timezone is configured at that instant
- **THEN** today is 2026-10-12 and current week begins 2026-10-12

#### Scenario: Invalid explicit timezone
- **WHEN** startup receives an unresolvable configured timezone
- **THEN** startup fails with the invalid setting identified instead of serving dates in another zone

#### Scenario: Preserve stored history
- **WHEN** an existing calendar event or UTC cooking timestamp is read after configuring a timezone
- **THEN** its stored civil date or instant is not rewritten

### Requirement: Configure deployment timezone through shipped deployment templates

The shipped Synology environment template SHALL expose Calendar__TimeZone with default UTC and an IANA override example. Its Compose template SHALL pass that setting to the API, using UTC when omitted or empty. Supported repository API deployment templates SHALL carry the same setting. The PWA SHALL consume the API calendar without requiring a separate timezone setting.

#### Scenario: Existing Synology environment omits the new setting
- **WHEN** the Synology Compose template is resolved against an existing environment without Calendar__TimeZone
- **THEN** the API receives UTC without requiring replacement of the existing environment file

#### Scenario: Administrator overrides the deployment timezone
- **WHEN** an administrator sets Calendar__TimeZone=America/Toronto in the Synology project environment and recreates the API container
- **THEN** the API uses America/Toronto for its deployment calendar and the PWA obtains that calendar from the API

#### Scenario: Empty template setting
- **WHEN** Calendar__TimeZone is empty during supported Compose template resolution
- **THEN** the API receives UTC

### Requirement: Document deployment timezone setup and changes

The Synology operator guide and household user guide SHALL explain administrator-owned deployment dates and the UTC default. Operator guidance SHALL name Calendar__TimeZone, show an IANA override, explain API recreation and invalid-value failure, and preserve existing environment values during upgrades. It SHALL distinguish meal dates from UTC timestamps and UTC maintenance schedules.

#### Scenario: First installation follows the operator guide
- **WHEN** an administrator follows the shipped Synology setup instructions
- **THEN** the guide explains where to set Calendar__TimeZone, its UTC default, an America/Toronto example and how to verify the returned calendar zone and dates

#### Scenario: Existing installation changes its timezone
- **WHEN** an administrator follows the upgrade or timezone-change instructions
- **THEN** the guide directs editing the existing environment without replacing secrets, recreating the API container and checking calendar output, and explains that stored dates are not migrated and UTC maintenance schedules remain UTC

#### Scenario: Household member reads date guidance
- **WHEN** a household member reads the user guide's date behavior
- **THEN** it explains that Today and week boundaries follow the deployment timezone even when the member's device uses another timezone

### Requirement: Expose one authoritative calendar context with schedule reads

Successful schedule reads SHALL include the deployment timezone, captured UTC instant, current deployment date, current Monday, requested week's Monday and next deployment-day boundary as a UTC instant. All date context and returned dates SHALL derive from the same captured instant or explicit week reference. The requested week's identity SHALL remain distinct from the current week.

#### Scenario: Read another week
- **WHEN** a read requests offset one while deployment today is 2026-10-11
- **THEN** its current Monday is 2026-10-05, requested Monday is 2026-10-12 and seven entries span October 12 through 18

#### Scenario: Capture crosses midnight during retrieval
- **WHEN** retrieval starts before deployment midnight and finishes after it
- **THEN** its context and week dates remain internally consistent with the captured reference

### Requirement: Keep relative operations anchored to their intended calendar week

Relative schedule reads, suggestions, assignment, movement, defer, voting and locking SHALL accept an optional explicit Monday reference for their offsets. Omission SHALL use the deployment current Monday captured at operation entry. Browser actions SHALL retain their captured reference and target date through dependent requests and follow-ups. Invalid or non-Monday references SHALL return 400 before mutation.

#### Scenario: Assignment finishes across Sunday midnight
- **WHEN** an action captures October 5 as reference Monday and Sunday index six, then its assignment reaches the server after deployment Monday begins
- **THEN** it targets October 11 and leaves October 18 unchanged

#### Scenario: Relative move has two offsets
- **WHEN** a captured action supplies source offset zero and target offset one
- **THEN** both offsets resolve from that same reference Monday

#### Scenario: Invalid reference
- **WHEN** a relative operation supplies an invalid date or a Tuesday reference
- **THEN** it returns 400 without changing a calendar entry or weekly plan

### Requirement: Refresh expired Today context before a new action

A newly initiated Today action SHALL use current authoritative deployment context. At or after its supplied next-day boundary, or after resuming without a reliable clock anchor, the client SHALL refresh context before choosing its date. If context cannot be obtained, the action SHALL remain retryable with visible date-unavailable feedback and SHALL NOT dispatch a guessed-date mutation.

#### Scenario: New action after midnight
- **WHEN** a new Today action begins after the context for October 11 expires
- **THEN** it refreshes context and targets October 12 rather than reusing October 11

#### Scenario: Refresh fails
- **WHEN** a Today action requires context refresh and that read fails
- **THEN** no date-dependent write is dispatched, the choice remains available and failure feedback permits retry

### Requirement: Preserve civil-date arithmetic through daylight saving changes

Calendar-day navigation and labels SHALL operate on civil dates. Advancing a date SHALL advance one date even when the elapsed interval is 23 or 25 hours. Calendar projections for different instants in a repeated hour SHALL identify the same date. Elapsed optimistic guard durations SHALL remain independent of timezone and wall-clock adjustments.

#### Scenario: Spring daylight saving boundary
- **WHEN** Toronto instants 2026-03-08T06:59:59Z and 2026-03-08T07:00:00Z are projected
- **THEN** both resolve to March 8 and the following date is March 9

#### Scenario: Repeated autumn hour
- **WHEN** Toronto instants 2026-11-01T05:30:00Z and 2026-11-01T06:30:00Z are projected
- **THEN** both resolve to November 1 without creating duplicate calendar dates

#### Scenario: Clock adjustment during optimistic guard
- **WHEN** the device wall clock changes while a two-second or twenty-second guard is active
- **THEN** expiry follows the injected elapsed duration instead of that wall-clock change

## RENAMED Requirements

- FROM: `### Requirement: Return seven dates from the server UTC week`
- TO: `### Requirement: Return seven dates from the deployment calendar week`

- FROM: `### Requirement: Find a defer destination from server-current next week`
- TO: `### Requirement: Find a defer destination from deployment-current next week`

- FROM: `### Requirement: Find first-open placement after browser-local today`
- TO: `### Requirement: Find first-open placement after deployment-local today`

## MODIFIED Requirements

### Requirement: Return seven dates from the deployment calendar week

A successful schedule read SHALL return seven entries in Monday-through-Sunday order for the Monday containing the deployment-local current date plus the requested number of weeks. Entries SHALL use Mon through Sun and yyyy-MM-dd dates. Missing calendar entries SHALL still produce dated empty days with planned status zero.

#### Scenario: Read a supported relative week
- **WHEN** schedule retrieval succeeds at offset -1, 0 or 1
- **THEN** its seven dates span that relative Monday through Sunday inclusive

#### Scenario: No calendar entry exists
- **WHEN** the selected week has a date with no stored calendar entry
- **THEN** the response includes that date with no recipe and day status zero

### Requirement: Display read week status without implying a transition

The planner SHALL derive voting-open and locked display state from the loaded numeric week status. VotingOpen SHALL show the voting signal, Nudge family and Close Voting. Draft or Locked SHALL offer Ask the Family when the loaded week is not past. A loaded seven-day week SHALL be considered past when its Sunday date precedes the deployment-local current date.

#### Scenario: Voting status is loaded
- **WHEN** the displayed week status is one
- **THEN** the planner shows its voting signal and voting controls without a separate voting-status badge

#### Scenario: Draft or locked non-past week
- **WHEN** the loaded status is zero or two and its week is not past
- **THEN** the planner offers Ask the Family

#### Scenario: Past week
- **WHEN** seven loaded dates have Sunday before the deployment-local current date and status is zero or two
- **THEN** the planner omits Ask the Family

### Requirement: Resolve assignment dates from the server week

Assignment SHALL resolve the requested week's Monday using the same deployment-calendar-relative week interpretation as Return seven dates from the deployment calendar week, then add dayIndex days. The posted target SHALL use relative week/index values rather than a client-supplied date.

#### Scenario: Assign Monday of the current week
- **WHEN** an accepted assignment uses weekOffset zero and dayIndex zero
- **THEN** its target date is Monday of the deployment-local current week

#### Scenario: Assign within another supported week
- **WHEN** an accepted assignment uses a supported relative week and an ordinary index from zero through six
- **THEN** its target date is that week's Monday plus the index in days

### Requirement: Hand eligible Home plans back to Planner editing

Home SHALL offer its recipe-free skipped non-mystery summary as navigation to /planner?weekOffset=0&planDate=<deployment-local-today>. Once not loading in selected week zero, Planner SHALL open the matching recipe-free status-three date's pivot once for that planDate value and select its planner tab. It SHALL NOT directly open the edit sheet from this handoff.

#### Scenario: Home summary activation
- **WHEN** a person activates the eligible Home plan summary
- **THEN** navigation carries week zero and the deployment-local current date

#### Scenario: Matching dated plan is loaded
- **WHEN** the handoff date is loaded as recipe-free status three in selected week zero and has not opened for that value
- **THEN** Planner opens Change supper plans, from which Edit supper plan opens the saved draft

#### Scenario: Handoff has no matching date
- **WHEN** loading ends without the handoff date as a recipe-free skipped entry in selected week zero
- **THEN** this handoff does not open the edit pivot

### Requirement: Complete Planner recovery after awaited assignment

After replacement assignment and its store follow-up resolve, Planner SHALL clear recovery and pivot selection, then request selected-week initialization. For a captured week-zero slot whose date is deployment-local today, it SHALL also invoke Today's assignment path. These follow-ups SHALL NOT establish a single request or combined-store transaction.

#### Scenario: Replacement is still pending
- **WHEN** the store assignment has not settled
- **THEN** the recovery-success initialization has not started

#### Scenario: Replacement resolves
- **WHEN** replacement and its store follow-up resolve
- **THEN** recovery closes and week initialization is requested after local selection state clears

### Requirement: Preserve caller-specific Search and Browse recovery routes

Search and Browse SHALL enter occupied-slot recovery after their target schedule read returns a normalized recipe. Their recovery SHALL await Tomorrow push, next-offset first-open movement or date deletion, then assign the new recipe. Successful completion SHALL navigate to the captured planner target; Search's Home-target variant SHALL return to Home.

#### Scenario: Search or Browse uses Save for Next Week
- **WHEN** one of these callers resolves an occupied slot with the next-week action
- **THEN** it uses movement to the captured offset plus one, rather than Planner's deployment-current-week defer operation

#### Scenario: Recovery completes
- **WHEN** the prior operation and replacement resolve
- **THEN** the caller clears pending recovery and navigates to its captured planner success target or Search Home target

### Requirement: Replace a stored assignment at the resolved date

For a supported occupied-date assignment whose persistence succeeds, the selected stored entry SHALL retain its identity/date, receive the chosen recipe ID, become Planned and clear non-cooking metadata. Existing week status SHALL remain unchanged. The accepted protected assignment and deployment-calendar-relative date requirements SHALL apply; no expected-recipe precondition is implied.

#### Scenario: Replace an ordinary recipe
- **WHEN** assignment saves against an occupied non-Sunday date
- **THEN** that stored entry contains the chosen recipe in Planned state without separately relocating the old recipe through assignment

#### Scenario: Replace skipped content
- **WHEN** assignment saves against a skipped entry
- **THEN** the selected entry becomes Planned with the chosen recipe and no non-cooking kind or label

### Requirement: Submit dated-source movement through the protected operation

POST /api/schedule/move SHALL accept weekOffset, recipeId and toIndex, with optional fromIndex, intent and targetWeekOffset. Its source and target week dates SHALL use the accepted deployment-calendar-relative week interpretation. Access SHALL follow household-identity's Authenticate protected API requests independently requirement.

#### Scenario: Explicit drag source
- **WHEN** Planner commits a recipe drag
- **THEN** the request supplies source week, recipe ID, fromIndex and toIndex without an explicit cross-week target

#### Scenario: Protected movement lacks credentials
- **WHEN** movement lacks accepted household credentials
- **THEN** shared API authentication rejects it independently of page access

### Requirement: Request Plan later from the selected Planner week

Planner's recipe-backed Plan later action SHALL close its pivot and submit movement with explicit source index, target offset selected offset plus one, target index zero and push intent. On request completion it SHALL initialize the selected week and, for a week-zero source dated deployment-local today, sync Today. Failure SHALL be logged without a dedicated Plan later error toast.

#### Scenario: Plan later for next selected week
- **WHEN** a person chooses Save for Next Week for a recipe in selected offset one
- **THEN** movement targets offset two starting at Monday rather than deployment-current next week

#### Scenario: Movement request resolves or rejects
- **WHEN** the Plan later request resolves, including a supported no-op, or rejects
- **THEN** resolution proceeds to initialization while rejection is logged without success confirmation of relocation

### Requirement: Find a defer destination from deployment-current next week

Deferral SHALL begin its destination search on Monday after the deployment-local current week and continue date by date until finding a date with no calendar entry. Any stored entry SHALL occupy its date for this search. It SHALL ensure a Draft plan for the destination Monday only if absent, without changing an existing destination week's status.

#### Scenario: Next Monday is free
- **WHEN** defer runs with no stored entry on deployment-current next Monday
- **THEN** that date is chosen regardless of the source's relative week offset

#### Scenario: Next week is full
- **WHEN** all seven dates of deployment-current next week are occupied
- **THEN** search continues into the following week until a date without an entry is found

### Requirement: Complete defer after affected-week follow-ups

After defer persistence completes, the operation SHALL await grocery recomputation for each distinct source/destination Monday, then attempt a snapshot for each affected week with request exclusion and optional move sequence. Only after these steps return SHALL it return 200 data containing scheduledDate, scheduledWeekOffset and message. Live delivery SHALL remain household-live-updates-owned.

#### Scenario: Both affected weeks complete
- **WHEN** save, recomputation and publication calls all return
- **THEN** the completed response identifies the chosen destination date and its deployment-calendar-relative week offset

#### Scenario: Later work rejects
- **WHEN** a recomputation or publication throws after persistence
- **THEN** the successful defer response is not reached without establishing reversal of the moved entry

### Requirement: Find first-open placement after deployment-local today

Search and Browse Plan for Later SHALL start scanning after the deployment-local current weekday, advancing to offset one/index zero on Sunday. They SHALL inspect returned weeks in order for a day at or after the starting index with status other than Skipped and no normalized recipe. The default scan SHALL stop after 520 relative weeks and return no target if none is found.

#### Scenario: Next date is non-cooking
- **WHEN** the first candidate date is recipe-free Skipped and a later ordinary empty date exists
- **THEN** placement skips the non-cooking date and chooses the later ordinary empty index

#### Scenario: Today is Sunday
- **WHEN** Plan for Later starts on deployment-local Sunday
- **THEN** scanning begins at offset one, index zero rather than offset-zero Monday

#### Scenario: Scan finds no target
- **WHEN** all 520 inspected relative weeks contain no eligible returned date
- **THEN** the helper returns no target and the caller does not submit assignment through that result

### Requirement: Open or reopen a protected planner week for voting

POST /api/schedule/voting/open SHALL accept optional weekOffset defaulting to zero and resolve its Monday by the accepted deployment calendar week rule. It SHALL create a missing plan as VotingOpen or set an existing plan VotingOpen without changing its calendar entries. Access SHALL follow household-identity's Authenticate protected API requests independently requirement.

#### Scenario: Missing weekly plan
- **WHEN** an authorized open request persists for a week with no plan
- **THEN** a VotingOpen plan is created for that Monday without assigning recipes

#### Scenario: Reopen a locked week
- **WHEN** an authorized open request persists for a Locked week
- **THEN** the week becomes VotingOpen while stored day states remain unchanged through this operation

### Requirement: Persist a protected week lock independently of browser promotion

POST /api/schedule/lock SHALL accept optional weekOffset defaulting to zero, resolve its Monday by the accepted deployment calendar week rule and create a missing weekly plan or set an existing plan Locked. It SHALL not generate assignments for unpersisted suggestions. Access SHALL follow household-identity's Authenticate protected API requests independently requirement.

#### Scenario: Direct API lock with no entries
- **WHEN** an authorized direct lock request persists for an empty week
- **THEN** a Locked weekly plan is saved without creating suggested calendar entries

#### Scenario: Lock without household access
- **WHEN** a lock request has no accepted household credential
- **THEN** shared API authentication rejects it before the action's planning work

### Requirement: Finalize only overdue planned or locked recipe assignments

When overdue finalization is invoked, it SHALL select recipe-backed calendar entries dated strictly before the deployment-local current date with day status Planned or Locked. It SHALL set those entries Cooked. Today's entries, recipe-free dates, Skipped entries and AwaitingConsensus entries SHALL not enter this selection. Weekly plan status SHALL remain unchanged through finalization.

#### Scenario: Past planned recipe exists
- **WHEN** finalization runs with a recipe-backed Planned entry dated before deployment-local today
- **THEN** successful persistence marks that entry Cooked

#### Scenario: Date or state is outside the selection
- **WHEN** an entry is dated today or later, lacks a recipe, or is Skipped or AwaitingConsensus
- **THEN** this invocation does not select it for overdue completion

### Requirement: Attempt affected-week snapshots after overdue persistence

After overdue persistence completes, finalization SHALL read and attempt a snapshot for each distinct affected Monday using its deployment-calendar-relative offset and no request exclusion identity. It SHALL not recompute groceries through this path. With no matching overdue entries it SHALL return without saves or publications through this invocation. Delivery SHALL remain household-live-updates-owned.

#### Scenario: Multiple overdue entries share a week
- **WHEN** successful finalization changes multiple entries in one week
- **THEN** that week's snapshot is attempted once after persistence, without a request exclusion identity

#### Scenario: Nothing remains overdue
- **WHEN** no entries match the overdue selection
- **THEN** the invocation returns without performing finalization saves or snapshot publication

#### Scenario: Publication fails after completion save
- **WHEN** an affected-week read or publication throws after persistence
- **THEN** the invocation fails without establishing reversal of saved Cooked states or publication of remaining weeks
