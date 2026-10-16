# Meal planning delta

## Purpose

Let household members read and navigate planner weeks, understand displayed schedule content and distinguish successful reads from retained or suggested content. This initial baseline slice covers existing week reading without defining planning mutations or suggestion policy.

## ADDED Requirements

### Requirement: Initialize week reading from shell and planner entry

The mounted app shell SHALL request current-week initialization when the loaded week offset is zero. Planner entry SHALL request initialization for its selected week, and SHALL request it again when that selection or the success query value changes. These requests SHALL NOT imply a single shared initialization transaction.

#### Scenario: Shell has the initial offset
- **WHEN** the app shell mounts while the loaded offset is zero
- **THEN** it requests initialization for offset zero

#### Scenario: Shell sees another selected week
- **WHEN** the app shell mounts while the loaded offset is nonzero
- **THEN** it does not request offset-zero initialization from its initializer

#### Scenario: Planner selection or success changes
- **WHEN** the planner mounts or its selected offset or success query value changes
- **THEN** it requests initialization for the selected offset

### Requirement: Select the planner week from the URL

The planner SHALL interpret an absent weekOffset query as zero and a present value using base-ten integer-prefix parsing. A finite parsed value different from the selection SHALL select that offset. A nonfinite result SHALL leave the selection unchanged.

#### Scenario: Offset is absent
- **WHEN** the planner reads a URL with no weekOffset
- **THEN** it selects zero if another offset was selected

#### Scenario: Integer prefix is present
- **WHEN** the planner reads weekOffset=-2 or weekOffset=1suffix
- **THEN** it selects -2 or 1 respectively if different from the current selection

#### Scenario: Offset is not parseable
- **WHEN** the planner reads weekOffset=abc
- **THEN** the invalid result leaves its selected offset unchanged

### Requirement: Navigate relative weeks and return to this week

The planner SHALL offer Previous week and Next week controls that request the selected offset minus or plus one through URL replacement. It SHALL offer Back to this week for nonzero offsets. URL replacement SHALL preserve other query parameters, omit weekOffset for zero and include it otherwise.

#### Scenario: Navigate forward or backward
- **WHEN** a person activates Next week or Previous week
- **THEN** the planner requests URL replacement with the selected offset incremented or decremented by one

#### Scenario: Return to zero
- **WHEN** a person activates Back to this week from a nonzero offset
- **THEN** the planner requests its URL without weekOffset while preserving other query parameters

### Requirement: Read the household schedule through the protected GET operation

GET /api/schedule SHALL apply household-identity API authentication and accept an optional integer weekOffset defaulting to zero. This schedule action SHALL NOT add an endpoint-specific member-existence check. Successful reads SHALL return 200 with the schedule under data.

#### Scenario: Default week read
- **WHEN** an authorized GET /api/schedule omits weekOffset and retrieval succeeds
- **THEN** 200 data contains the offset-zero schedule

#### Scenario: Explicit week read
- **WHEN** an authorized GET supplies a representable offset and retrieval succeeds
- **THEN** 200 data identifies that requested offset

#### Scenario: No household access
- **WHEN** GET /api/schedule has no accepted household credential
- **THEN** the shared API authentication gate rejects it independently of planner page access

### Requirement: Return seven dates from the server UTC week

A successful schedule read SHALL return seven entries in Monday-through-Sunday order for the Monday containing the server UTC current date plus the requested number of weeks. Entries SHALL use Mon through Sun and yyyy-MM-dd dates. Missing calendar entries SHALL still produce dated empty days with planned status zero.

#### Scenario: Read a supported relative week
- **WHEN** schedule retrieval succeeds at offset -1, 0 or 1
- **THEN** its seven dates span that relative Monday through Sunday inclusive

#### Scenario: No calendar entry exists
- **WHEN** the selected week has a date with no stored calendar entry
- **THEN** the response includes that date with no recipe and day status zero

### Requirement: Project stored recipe and non-cooking read content

A schedule day SHALL expose its selected stored calendar entry status and available related recipe facts. A recipe-free skipped entry SHALL expose non-cooking kind and label, defaulting absent kind to order_in. Recipe-backed skipped entries SHALL retain their recipe representation without a non-cooking plan.

#### Scenario: Related recipe is available
- **WHEN** the selected calendar entry has a loaded related recipe
- **THEN** the day returns its ID, name, hero reference, saved vote count, ingredient strings, description and total time

#### Scenario: Recipe-free skipped entry
- **WHEN** the selected entry has status three and no recipe ID
- **THEN** the day returns its non-cooking kind or order_in fallback and stored label

#### Scenario: Legacy skipped recipe entry
- **WHEN** the selected status-three entry still has a recipe association
- **THEN** its loaded recipe remains in the response and nonCooking is null

### Requirement: Read week status and stored adjuncts without creating a plan

The schedule SHALL report the selected weekly plan status as zero Draft, one VotingOpen or two Locked and locked as true only for Locked. With no plan it SHALL report Draft and unlocked. Available stored grocery state and items SHALL be returned as adjuncts without a read-time recomputation or plan creation.

#### Scenario: Weekly plan exists
- **WHEN** a supported stored weekly-plan status is read successfully
- **THEN** the response reports that status and its derived locked flag with available stored adjuncts

#### Scenario: Weekly plan is absent
- **WHEN** the selected week has no stored weekly plan and retrieval succeeds
- **THEN** the response reports status zero, locked false and null grocery adjuncts without creating a plan

### Requirement: Use enveloped schedule data for browser initialization

The browser schedule reader SHALL request the selected weekOffset and accept data only when its weekOffset is defined. Initialization SHALL use returned days, status defaulting to zero and supplied grocery items or an empty list. A missing days collection SHALL produce an empty displayed schedule.

#### Scenario: Usable response arrives
- **WHEN** initialization receives usable enveloped schedule data for its still-selected request
- **THEN** it builds displayed days from that response and updates week status and synchronization time

#### Scenario: Envelope or offset is absent
- **WHEN** the generated read resolves without data carrying a defined weekOffset
- **THEN** the browser reader yields no usable schedule

#### Scenario: Days are absent
- **WHEN** otherwise usable initialization data has no days collection
- **THEN** initialization builds no day cards

### Requirement: Compose voting suggestions separately from persisted assignments

Initialization SHALL request suggestions for the same requested offset only when returned week status is VotingOpen. Persisted recipe content SHALL take precedence; skipped days SHALL not receive suggestions. An ordinary day without a recipe SHALL display a matching day-index suggestion as pending when one is available. This composition SHALL NOT persist an assignment.

#### Scenario: Draft or locked read
- **WHEN** initialization receives Draft or Locked status
- **THEN** it builds days without requesting suggestions for that initialization

#### Scenario: Voting read
- **WHEN** initialization receives VotingOpen and the requested week remains selected
- **THEN** it requests suggestions for that offset and marks eligible composed suggestions pending

#### Scenario: Suggestions are unavailable
- **WHEN** suggestion retrieval throws or supplies no usable data
- **THEN** initialization can complete from schedule data without adding those suggestions

### Requirement: Discard initialization results for a different selected offset

Initialization SHALL check that its requested offset remains selected after schedule retrieval and again after any suggestion retrieval. When it differs at either check, that invocation SHALL return without applying its successful read content. This offset comparison SHALL NOT establish ordering between requests for the same offset.

#### Scenario: Navigate before schedule completes
- **WHEN** initialization for zero completes successfully after the loaded selection changed to one
- **THEN** its result does not replace the loaded week-one days

#### Scenario: Navigate while suggestions load
- **WHEN** the loaded offset changes while an initialization suggestion request is pending
- **THEN** that invocation does not apply its combined read content

### Requirement: Show pending initialization without clearing loaded days

Initialization SHALL mark loading while retaining previously loaded content. The planner SHALL show Curating your week loading feedback when loading and no days exist. With existing days it SHALL continue rendering content while the read is pending.

#### Scenario: First read is pending
- **WHEN** loading is true and the displayed schedule is empty
- **THEN** the planner shows its loading indicator and Curating your week feedback

#### Scenario: Another read is pending
- **WHEN** loading is true with existing displayed days
- **THEN** the planner keeps its content rather than replacing it with the initial loading indicator

### Requirement: Retain content after missing or failed initialization reads

When initialization receives no usable schedule or catches a read failure, it SHALL end loading without clearing existing days, status or synchronization time. This path SHALL display no dedicated read-failure or Retry control. An empty retained schedule SHALL render no day cards and retain the Loading date-heading fallback.

#### Scenario: No usable response
- **WHEN** initialization receives no usable schedule while its requested offset remains selected
- **THEN** it ends loading and retains the previously loaded content

#### Scenario: Read rejects
- **WHEN** an initialization read throws
- **THEN** its catch ends loading without clearing the existing schedule or showing dedicated read-error feedback

#### Scenario: No content has ever loaded
- **WHEN** the read has ended without usable content and the schedule remains empty
- **THEN** no day cards render and the date heading still shows Loading...

### Requirement: Render the selected label and loaded date range

The planner SHALL label offset zero This week, offset one Next week and other offsets with its Week label and offset. With at least seven loaded days it SHALL format the first and seventh dates using UTC month/day values; otherwise it SHALL show Loading... for that heading. Selected offset labels SHALL remain distinct from loaded-date content.

#### Scenario: Standard offset labels
- **WHEN** the selected offset is zero, one or another finite offset
- **THEN** the label is This week, Next week or the corresponding Week label

#### Scenario: Loaded range
- **WHEN** at least seven days are displayed
- **THEN** the heading formats their first and seventh dates, repeating month only when the UTC months differ

#### Scenario: Selection changes before content
- **WHEN** a new offset is selected while old days remain
- **THEN** the selected label can change while the heading and cards still reflect retained dates

### Requirement: Render day content and planned count from displayed state

The planner SHALL render displayed days in their supplied order. Status-three days SHALL use non-cooking presentation before recipe presentation. Other days with recipe IDs SHALL display recipe names; ordinary days without them SHALL offer Plan supper. The planned count SHALL count displayed recipes with IDs, including pending suggestions.

#### Scenario: Empty persisted week
- **WHEN** a successful read returns seven ordinary empty dates and no suggestions apply
- **THEN** the planner renders seven Plan supper day cards

#### Scenario: Recipe and non-cooking presentation
- **WHEN** a day has status three or an ordinary day has a recipe ID
- **THEN** status three selects non-cooking presentation; an ordinary recipe displays its name

#### Scenario: Pending recipe contributes to count
- **WHEN** a displayed suggestion has a recipe ID and pending marker
- **THEN** it contributes to the displayed planned count without proving a persisted assignment

### Requirement: Display read week status without implying a transition

The planner SHALL derive voting-open and locked display state from the loaded numeric week status. VotingOpen SHALL show the voting signal, Nudge family and Close Voting. Draft or Locked SHALL offer Ask the Family when the loaded week is not past. A loaded seven-day week SHALL be considered past when its Sunday date precedes the browser-local current date.

#### Scenario: Voting status is loaded
- **WHEN** the displayed week status is one
- **THEN** the planner shows its voting signal and voting controls without a separate voting-status badge

#### Scenario: Draft or locked non-past week
- **WHEN** the loaded status is zero or two and its week is not past
- **THEN** the planner offers Ask the Family

#### Scenario: Past week
- **WHEN** seven loaded dates have Sunday before the browser-local current date and status is zero or two
- **THEN** the planner omits Ask the Family
