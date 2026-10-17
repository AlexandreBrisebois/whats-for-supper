# Recipe discovery Specification

## Purpose

Collect member recipe preferences and expose discovery queues and voting suggestions while keeping suggestions distinct from persisted meal assignments.

## Planning dependencies (non-normative)

References in preserved requirements to the former combined meal-planning owner resolve through the current capability links below. The referenced behavior and each existing requirement body remain unchanged.

- [Compose voting suggestions separately from persisted assignments](../meal-planning/spec.md#requirement-compose-voting-suggestions-separately-from-persisted-assignments)
- [Submit chosen-recipe assignment through the protected operation](../meal-assignment/spec.md#requirement-submit-chosen-recipe-assignment-through-the-protected-operation)
- [Persist a protected week lock independently of browser promotion](../planning-lifecycle/spec.md#requirement-persist-a-protected-week-lock-independently-of-browser-promotion)
- [Keep relative operations anchored to their intended calendar week](../deployment-calendar/spec.md#requirement-keep-relative-operations-anchored-to-their-intended-calendar-week)

## Evidence and qualifications (non-normative)

Accepted and promoted on 2026-10-16 under DISC-D03 from the three reviewed discovery deltas. The [capability plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/recipe-discovery.md) retains BSL-recipe-discovery-001–013, full scenario mappings, U04 and DISC-U01–U08. These requirements describe implementation-supported behavior; runtime/API/browser/database qualification remains not-run under A34.

Acceptance covers the mapped requirements and their explicit exclusions. It does not adopt disputed vote values/labels, planned-recipe exclusion, complete error recovery, queue movement range, badge causation, global vote-clearing policy, atomic promotion/lock, household isolation or durable delivery as requirements. Match, consensus, suggestion, promotion, assignment and lock remain distinct. Broader planning and live-update semantics retain their existing owners. Source changes remain active and unarchived; this promotion makes no application changes.

## Requirements

### Requirement: Wait for selected member context

Discovery initialization SHALL wait for hydrated member state and a selected member identity before requesting its categories and queue. Member transport and protected access remain owned by household-identity.

#### Scenario: Member context not ready

- **WHEN** member state is unhydrated or has no selected identity
- **THEN** page initialization does not request discovery data

#### Scenario: Member selected

- **WHEN** hydrated state supplies a selected identity
- **THEN** initialization requests categories followed by the Supper queue

### Requirement: Present the Supper queue in server order

The household Discovery page SHALL request category Supper, preserve returned queue order on replacement, present its first recipe as the front card and render at most the first four cards.

#### Scenario: Broader categories returned

- **WHEN** the category response lists categories other than Supper
- **THEN** the page still requests Supper

#### Scenario: More than four recipes

- **WHEN** six ranked recipes are loaded
- **THEN** only the first four render and the first is the action target

### Requirement: Read eligible unvoted recipes

A discovery queue read SHALL include only persistently discoverable, ready, undeleted recipes without a vote by the requesting member. Recipe readiness and deletion remain owned by recipe-library; recipe-rotation owns cooldown reconciliation and rotation reasons. Reads SHALL not recompute cooked cooldown and SHALL exclude recipes selected on the current-week persisted meal plan.

#### Scenario: Member already voted

- **WHEN** an otherwise eligible recipe has a stored vote of either supported kind by this member
- **THEN** it is excluded from that member queue

#### Scenario: Different member voted

- **WHEN** an otherwise eligible recipe has votes only from other members
- **THEN** those votes alone do not exclude it

#### Scenario: Recipe unavailable

- **WHEN** a recipe is not discoverable, not ready or deleted
- **THEN** it is absent from the discovery view

### Requirement: Order discovery by likes and cooking recency

Queue reads SHALL order by descending like count, then by last-cooked date ascending with never-cooked recipes before dated recipes at the same count. Equal remaining keys SHALL use H descending from weekly-household-interest, then stable recipe identity. Historical signal SHALL not change live like counts or consensus.

#### Scenario: Higher interest

- **WHEN** recipes differ in like count
- **THEN** the higher-count recipe comes first regardless of cooking date

#### Scenario: Equal interest

- **WHEN** equal-count recipes include never-cooked, older-cooked and newer-cooked recipes
- **THEN** they appear in that sequence

### Requirement: Display recipe card facts and vote controls

Cards SHALL display recipe name, named-image alternative text, formatted total time and supplied cuisine and nonblank meal-type badges. The front card SHALL offer right-drag like and left-drag pass; buttons named Like recipe and Dislike recipe SHALL provide alternatives and be disabled for an empty queue.

#### Scenario: Card loaded

- **WHEN** a front card has cuisine, meal types and total time
- **THEN** those supplied facts appear with Like recipe and Dislike recipe controls

#### Scenario: Empty queue controls

- **WHEN** the queue is empty
- **THEN** like and dislike buttons are disabled

### Requirement: Offer empty-state navigation and feed refresh

An exhausted queue SHALL offer Refresh Feed and a refresh control named Refresh recipe suggestions. Its primary action SHALL navigate to Planner when this mounted page recorded a like on a card already carrying family interest, otherwise to Capture. This local counter SHALL NOT establish server consensus.

#### Scenario: No local matches

- **WHEN** the queue empties without such a local match
- **THEN** the primary action offers capture navigation

#### Scenario: Local interest match

- **WHEN** the queue empties after such a like
- **THEN** the primary action offers planner navigation

#### Scenario: Refresh exhausted feed

- **WHEN** the person activates a refresh control
- **THEN** the page requests categories and the Supper queue again without resetting stored votes

### Requirement: Use translated discovery copy where connected

Discovery SHALL resolve its connected card and empty-state copy through the selected browser locale translation lookup with fallback copy. This SHALL NOT establish translation of recipe facts, fixed English control labels or the Just planned badge.

#### Scenario: Translation exists

- **WHEN** the selected locale has a connected discovery text key
- **THEN** that lookup supplies its text

#### Scenario: Translation missing

- **WHEN** a connected lookup has no string value
- **THEN** the supplied fallback copy is used

### Requirement: Apply received vote counts to loaded discovery cards

When a received vote update reaches Discovery and identifies a loaded card, Discovery SHALL replace that card vote count and set family interest according to whether the count is positive, while retaining the front card identity. An unknown recipe SHALL NOT be inserted.

#### Scenario: Known recipe

- **WHEN** a loaded recipe receives count zero
- **THEN** its count becomes zero and family interest false while the front identity stays

#### Scenario: Unknown recipe

- **WHEN** a vote update identifies an absent recipe
- **THEN** the loaded queue remains unchanged

### Requirement: Remove absent IDs after an eligible invalidation refresh

After a newer invalidation reaches an initialized nonempty Discovery queue, the page SHALL silently reread its current category and remove loaded IDs absent from a successful response. This local reconciliation SHALL NOT establish that an absent recipe was planned or that assigned recipes are excluded by the server.

#### Scenario: Recipe absent on reread

- **WHEN** an eligible reread omits a loaded recipe
- **THEN** that recipe is removed without a full loading presentation

#### Scenario: Response adds a recipe

- **WHEN** the reread contains an ID not already loaded
- **THEN** this ID-diff refresh does not insert it

#### Scenario: Queue not eligible

- **WHEN** invalidation occurs before initialization or with an empty queue
- **THEN** no immediate reread is started through that effect

### Requirement: Show initial empty-queue loading feedback

While discovery loading is active and no recipes are loaded, the page SHALL display its loading indicator in place of the card arena. A completed successful empty read SHALL allow the empty-state controls to appear.

#### Scenario: Initial request pending

- **WHEN** the initial discovery request is pending with an empty loaded queue
- **THEN** the loading indicator is displayed

#### Scenario: Empty read completes

- **WHEN** initialization successfully completes without recipes
- **THEN** the empty-state actions replace that initial loading presentation

### Requirement: Submit like or pass for the current recipe

Activating like or pass on a loaded front card SHALL remove that card locally and submit a background vote for its identity, using 1 for like and 2 for pass. Local removal SHALL NOT establish successful persistence.

#### Scenario: Like a card

- **WHEN** the person activates Like recipe
- **THEN** the current recipe is removed locally and a vote with value 1 is submitted

#### Scenario: Pass a card

- **WHEN** the person activates Dislike recipe
- **THEN** the current recipe is removed locally and a vote with value 2 is submitted

### Requirement: Attribute one stored vote to each recipe and member pair

A successfully persisted supported vote SHALL be keyed by recipe and member identity. A subsequent sequential submission for the same pair SHALL replace its vote and refresh its voting timestamp rather than add another row.

#### Scenario: First vote

- **WHEN** a supported submission has no existing row for its recipe/member pair and persistence succeeds
- **THEN** one row is stored for that pair

#### Scenario: Change vote

- **WHEN** a sequential supported submission finds an existing row and persistence succeeds
- **THEN** that row contains the replacement choice and updated timestamp

#### Scenario: Another member

- **WHEN** a different valid member votes for the same recipe and persistence succeeds
- **THEN** their distinct pair retains its own vote

### Requirement: Count likes separately from passes

Discovery recipe vote totals SHALL count stored value-1 votes for that recipe across stored members. A stored pass SHALL exclude that member recipe pair from their queue but contribute no like to its total.

#### Scenario: Mixed choices

- **WHEN** a recipe has two likes and one pass
- **THEN** its discovery like count is two

#### Scenario: Replace like with pass

- **WHEN** one member sequentially replaces a like with pass and persistence succeeds
- **THEN** the resulting like count decreases by one without adding another pair

### Requirement: Filter API discovery by category and cuisine

GET /api/discovery SHALL accept optional category and cuisine filters. A category of Supper SHALL use explicit supper suitability under recipe-rotation; other nonempty category values and cuisine SHALL use field equality and both supplied filters SHALL apply together before ordered results are returned under data. Omitting both SHALL allow the broader eligible member queue.

#### Scenario: Combined filters

- **WHEN** category Supper and cuisine Italian are supplied
- **THEN** only eligible unvoted rows supper-suitable and matching Italian cuisine are returned

#### Scenario: No matching cuisine

- **WHEN** a nonempty cuisine has no eligible matching rows
- **THEN** data contains an empty recipe array

#### Scenario: Filters omitted

- **WHEN** neither filter is supplied
- **THEN** the API returns the broader eligible unvoted queue without a Supper-only restriction

### Requirement: List categories with remaining member candidates

GET /api/discovery/categories SHALL return distinct non-null categories from the requesting member eligible unvoted discovery rows under data. This category inventory SHALL NOT guarantee a Supper card or a particular category order.

#### Scenario: Exhaust a category

- **WHEN** all eligible rows of one category have votes from this member
- **THEN** that category is absent unless another eligible unvoted row remains

#### Scenario: No categories

- **WHEN** no eligible unvoted row has a non-null category
- **THEN** data contains an empty category array

### Requirement: Calculate consensus from all stored members

Consensus eligibility SHALL require at least ceil((familySize + 1) / 2) likes for a recipe, where familySize is the count of stored family members. Passes SHALL NOT contribute to the numerator. One like alone SHALL NOT imply consensus for a multi-member family.

#### Scenario: Two members

- **WHEN** two stored members yield one like
- **THEN** the threshold is two and the recipe is not a consensus candidate

#### Scenario: Four members

- **WHEN** four stored members yield three likes
- **THEN** the threshold is three and the existing undeleted recipe is a consensus candidate

### Requirement: Return consensus candidates as suggestions without assignment

GET /api/schedule/{weekOffset}/smart-defaults SHALL return familySize, consensusThreshold, preSelectedRecipes, openSlots and consensusRecipesCount under data for the requested offset. Reading suggestions SHALL NOT create calendar assignments, change weekly plan status or clear votes.

#### Scenario: Read candidates

- **WHEN** a successful smart-default read finds eligible consensus recipes
- **THEN** the response describes suggestions without persisting those assignments

#### Scenario: No consensus

- **WHEN** no existing undeleted recipe reaches the threshold
- **THEN** preSelectedRecipes is empty and consensusRecipesCount is zero

### Requirement: Place suggestions only in unoccupied week day indices

Smart defaults SHALL place at most seven candidates into unoccupied day indices zero through six, skipping every date with a stored calendar entry in the requested week. Remaining unoccupied indices SHALL be openSlots. consensusRecipesCount SHALL count qualifying candidates even when fewer fit.

#### Scenario: Occupied day

- **WHEN** a stored event occupies day index zero and one candidate fits later
- **THEN** the candidate receives the next available index rather than zero

#### Scenario: Week full

- **WHEN** all seven dates have stored events
- **THEN** preSelectedRecipes and openSlots are empty even if qualifying candidates exist

### Requirement: Distinguish unanimity metadata from persisted locks

Suggestions SHALL rank unanimous candidates before other consensus candidates, then by last-cooked date descending. Each suggestion SHALL carry its recipe display facts, like count, family size, day index and unanimity flag. It SHALL return suggestion isLocked metadata without that metadata establishing a persisted calendar lock.

#### Scenario: Unanimous suggestion

- **WHEN** a candidate has a like from every stored member
- **THEN** unanimousVote is true on its suggestion without a write; suggestion lock metadata does not establish persistence

#### Scenario: Majority suggestion

- **WHEN** a candidate meets consensus without unanimity
- **THEN** its unanimousVote flag is false without establishing a persisted lock

### Requirement: Keep suggestion display and assignment distinct at the discovery handoff

Navigating from Discovery to Planner SHALL NOT itself submit a recipe assignment. Planner suggestion composition SHALL follow meal-planning Compose voting suggestions separately from persisted assignments. Persisting a displayed suggestion SHALL require the planning assignment operation; suggestion metadata alone SHALL NOT establish assignment.

#### Scenario: Leave discovery for planner

- **WHEN** the person activates Go to Planner from Discovery
- **THEN** navigation occurs without a discovery-issued assignment request

#### Scenario: Voting-open composition

- **WHEN** Planner reads suggestions for its voting-open week
- **THEN** eligible suggestions can appear pending under the existing meal-planning requirement without persistence

### Requirement: Reconsider queue eligibility after stored votes are removed

On a later discovery read, a recipe whose requesting-member vote has been removed SHALL no longer be excluded by that vote. It SHALL still satisfy the current queue view and requested filters. This consequence SHALL NOT promise automatic refresh after a planning lock.

#### Scenario: Removed vote

- **WHEN** the requesting member vote was removed and the recipe still satisfies eligibility and filters
- **THEN** a subsequent queue read can include it again

#### Scenario: Recipe remains unavailable

- **WHEN** a removed vote belongs to a now deleted or undiscoverable recipe
- **THEN** removing that vote does not restore queue eligibility

### Requirement: Preserve Discovery candidate meanings during history ranking

Historical ranking SHALL operate only within the existing member-eligible Discovery queue and retain vote-count then cooked-recency priority. History SHALL not restore a member-voted, unavailable or non-discoverable recipe to that queue.

#### Scenario: Current votes dominate
- **WHEN** A has more current likes than B but B has greater H
- **THEN** A remains first

#### Scenario: Historical tie
- **WHEN** A and B share live count and cooked date but B has greater H
- **THEN** B precedes A without changing either displayed vote count

### Requirement: Exclude current-week selected recipes from Discovery

Discovery SHALL exclude matching recipe-backed CalendarEvents in the current deployment-calendar week with status Planned (0), Locked (1) or Cooked (2). This includes manual assignment before voting closes. Uncommitted suggestions, Skipped (3) and AwaitingConsensus (4) SHALL not count as committed selections. This gate SHALL use existing week events, not a new selection-history store, and SHALL not restrict Search/Browse.

#### Scenario: Manual selection before close
- **WHEN** a recipe is assigned to this week's meal plan through Quick Find or Search while voting is still open
- **THEN** it is excluded from current-week Discovery without requiring vote close or a cooked event

#### Scenario: Pending suggestion only
- **WHEN** a recipe is only a displayed pending suggestion and has not been assigned
- **THEN** the suggestion alone does not count as selected for this exclusion

#### Scenario: Future-week plan
- **WHEN** a recipe is assigned only to a future week
- **THEN** that assignment alone does not exclude it from current-week Discovery under the current-week scope

#### Scenario: Remove the selected meal
- **WHEN** the recipe is no longer selected anywhere in the current week
- **THEN** plan membership no longer excludes it; all other eligibility, including effective cooked suppression, still applies

#### Scenario: Plan visibility is not library visibility
- **WHEN** a recipe is excluded from Discovery because it is selected this week
- **THEN** normal Search/Browse and direct recipe detail remain accessible under their existing rules

### Requirement: Refresh Discovery after committed selection changes

The proposed interaction contract SHALL remove a newly selected recipe from Discovery after assignment commits through existing invalidation and refetch, without waiting for Dreaming. Queue reads and category counts SHALL use the same plan-membership guard. Stale responses SHALL not override newer selection state. This SHALL NOT recompute cooked cooldown on reads.

#### Scenario: Card is open during another member's selection
- **WHEN** an assignment commits while another member has that recipe in their Discovery queue
- **THEN** invalidation and refresh remove the card; a subsequent queue read also excludes it

#### Scenario: Assignment fails
- **WHEN** assignment persistence fails before commit
- **THEN** an optimistic selection alone does not permanently remove the recipe from Discovery

#### Scenario: Delayed response
- **WHEN** a pre-assignment queue response arrives after a post-assignment refresh
- **THEN** the stale response cannot restore the selected card

### Requirement: Treat committed manual assignment as locked-in choice

Discovery plan exclusion SHALL not require the week to be closed or an individual status-1 validation request. A committed Planned event SHALL be sufficient. Historical vote rows SHALL remain unchanged by this eligibility check; it SHALL not imply a historical-priority veto on other surfaces.

#### Scenario: Planned before weekly close
- **WHEN** Quick Find or Search commits a Planned (0) recipe event for this week while voting remains open
- **THEN** Discovery excludes that recipe without calling the API-only AwaitingConsensus-to-Locked transition

#### Scenario: Cooked or still awaiting confirmation
- **WHEN** A has a current-week Cooked (2) event and B only an AwaitingConsensus (4) event
- **THEN** A is excluded by committed-plan membership while B is not excluded by that gate alone

#### Scenario: Keep historical evidence
- **WHEN** last week's liked-unselected recipe is committed to this week's plan
- **THEN** it leaves current-week Discovery while its stored history remains; normal Search/Browse do not gain a new historical-boost veto
