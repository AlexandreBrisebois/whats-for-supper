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

Cards SHALL display the recipe name, named-image alt text, and up to two clamped lines of non-empty description, omitted when blank. Usable formatted total time SHALL appear once in a solid warm-cream lower-left hero badge preserving localized Ready in copy; cuisine and meal-type pills SHALL remain absent. Right-drag like, left-drag pass, and WCAG AA `Like recipe` / `Dislike recipe` controls SHALL remain operable.

#### Scenario: Card loaded

- **WHEN** a front card has a non-empty description, cuisine, meal types, and usable total time
- **THEN** the name, named image, clamped supporting description, one readable warm-cream Ready in badge, and `Like recipe` / `Dislike recipe` controls appear
- **AND** cuisine and meal-type pills remain absent

#### Scenario: No usable time

- **WHEN** the existing duration formatting yields an empty value or description is blank
- **THEN** no Ready in badge or empty description/time block appears, while the title and voting controls remain available

#### Scenario: Card loaded without description

- **WHEN** a front card has usable total time and an empty or whitespace-only description
- **THEN** no blank description block renders beneath the title while the hero image, Ready in badge, title, and voting controls remain intact

#### Scenario: Empty queue controls

- **WHEN** the queue is empty
- **THEN** like and dislike buttons are disabled

#### Scenario: Vote after presentation change

- **WHEN** the person performs a right-drag like or left-drag pass on the front card, or activates its corresponding vote button
- **THEN** the existing vote behavior targets the same front recipe identity
- **AND** touching the time badge adds no separate action or recipe-detail navigation

### Requirement: Offer empty-state navigation and feed refresh

An exhausted queue without confirmed convergence SHALL offer Refresh Feed and a control named Refresh recipe suggestions. Its primary action SHALL open Planner if this mounted page recorded a like on a card with family interest, otherwise Capture. Capture SHALL remain directly reachable when Planner is primary. An active, non-converged round SHALL offer Nudge family through existing voting-link sharing. This local counter SHALL NOT establish server consensus.

#### Scenario: No local matches

- **WHEN** the queue empties without such a local match
- **THEN** the primary action offers capture navigation

#### Scenario: Local interest match

- **WHEN** the queue empties after such a like
- **THEN** the primary action offers planner navigation

#### Scenario: Refresh exhausted feed

- **WHEN** the person activates a refresh control
- **THEN** the page requests categories and the Supper queue again without resetting stored votes

#### Scenario: Queue ends before household convergence

- **WHEN** a member has no cards left while confirmed matches do not cover the active week's slots
- **THEN** existing warm exhausted-feed copy and Refresh Feed remain, Capture is reachable, and Nudge family opens the reused sharing dialog without sending anything automatically
- **AND** the page does not show the Menu's In celebration or claim that named family members have not voted

#### Scenario: Early voting queue ends without a week owner

- **WHEN** the queue ends before any week owns voting
- **THEN** existing exhausted-feed behavior remains without inventing an active week or household convergence

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

Smart defaults SHALL exclude recipe identities already selected in persisted recipe-backed entries of the requested week before placement and candidate counting. Smart defaults SHALL place at most seven candidates into unoccupied day indices zero through six, skipping every date with a stored calendar entry in the requested week. Remaining unoccupied indices SHALL be openSlots. consensusRecipesCount SHALL count qualifying candidates even when fewer fit.

#### Scenario: Occupied day

- **WHEN** a stored event occupies day index zero and one candidate fits later
- **THEN** the candidate receives the next available index rather than zero

#### Scenario: Week full

- **WHEN** all seven dates have stored events
- **THEN** preSelectedRecipes and openSlots are empty even if qualifying candidates exist

#### Scenario: Already selected recipe also has consensus

- **WHEN** A is already persisted in the requested week and both A and B have consensus with one empty date
- **THEN** only B can cover that date and A contributes no additional candidate to the available-slot count

### Requirement: Distinguish unanimity metadata from persisted locks

Suggestions SHALL rank unanimous candidates before other consensus candidates, then by last-cooked date descending, then by ascending recipe identity for deterministic selection and placement. Each suggestion SHALL carry its recipe display facts, like count, family size, day index and unanimity flag. It SHALL return suggestion isLocked metadata without that metadata establishing a persisted calendar lock.

#### Scenario: Unanimous suggestion

- **WHEN** a candidate has a like from every stored member
- **THEN** unanimousVote is true on its suggestion without a write; suggestion lock metadata does not establish persistence

#### Scenario: Majority suggestion

- **WHEN** a candidate meets consensus without unanimity
- **THEN** its unanimousVote flag is false without establishing a persisted lock

#### Scenario: Tied never-cooked consensus recipes

- **WHEN** multiple eligible consensus recipes share the same unanimity status and null or equal last-cooked date, including when more tied candidates qualify than open slots
- **THEN** every read selects the same candidates ordered by ascending recipe identity and assigns them to the same open day indices across all household members

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

### Requirement: Determine coverage from the active round

Coverage SHALL use the active owner's absolute week, persisted occupied dates and distinct consensus candidates not already selected in that week. Required slots SHALL be unoccupied dates before pending suggestions are placed. Covered slots SHALL be the lesser of required slots and eligible distinct candidates. Existing consensus and ranking rules SHALL remain unchanged.

#### Scenario: Three slots and three matches

- **WHEN** four dates have Other plans and three distinct eligible recipes have confirmed consensus
- **THEN** required and covered slots are both three and the session converges without a fourth match

#### Scenario: One saved recipe

- **WHEN** four dates have Other plans and one has a saved recipe
- **THEN** two additional distinct eligible matches suffice; neither the saved recipe nor pending UI content reduces the target twice

#### Scenario: Missing consensus

- **WHEN** four stored members produce only two likes for a candidate
- **THEN** that candidate does not count toward coverage under the unchanged threshold of three

#### Scenario: Unknown progress

- **WHEN** a read is pending, fails or lacks usable session identity
- **THEN** no new convergence claim is derived from empty arrays, optimistic swipes or retained Planner suggestions

### Requirement: Celebrate confirmed convergence for the household

Discovery SHALL replace its voting arena with a static green success card when authoritative session state reports convergence, even with cards remaining. English copy SHALL be "Menu's in!" and "See your matches", with French equivalents. The localized description field SHALL be empty in both languages. The card SHALL reuse the cooked-success visual, centered above navigation, with a decorative circled check. Existing app navigation SHALL remain available; no sound or confetti SHALL occur.

#### Scenario: Another member completes the menu

- **WHEN** the client reconciles a converged active round after another member's vote
- **THEN** it shows the celebration without requiring another swipe, queue exhaustion or a local match counter

#### Scenario: Returning member

- **WHEN** a member opens Discovery during a still-open converged round
- **THEN** successful session hydration shows the same celebration without requiring previous participation

#### Scenario: Gesture in progress

- **WHEN** convergence arrives while a card is being dragged
- **THEN** the transition cancels any unsubmitted gesture without manufacturing a vote, leaves navigation usable and does not steal focus into a modal
- **AND** any already submitted vote continues through normal processing

#### Scenario: Asset fails to load

- **WHEN** decorative image resources are unavailable
- **THEN** accessible text still communicates "Menu's in!" and the matches action without dependence on image pixels or color

#### Scenario: Late session update

- **WHEN** a newer snapshot changes suggestions in the same converged round
- **THEN** the card remains stable and immediately visible, including with reduced motion, and performs no automatic navigation

#### Scenario: Usable screen area

- **WHEN** the card renders on a 320px phone, phone portrait, tablet portrait or desktop
- **THEN** it is centered in the usable area above the navigation dock without horizontal overflow, and the action remains reachable

#### Scenario: Empty description

- **WHEN** Discovery presents the success card in English or French
- **THEN** the description field is empty

#### Scenario: Readable action

- **WHEN** Discovery presents the matches action on the green card
- **THEN** its rendered foreground/background contrast is at least 4.5:1, including the translucent button hover background
- **AND** Home's cooked-success card shares the same accessible Deep Herb celebration contrast while preserving its existing cooked copy and dismiss behavior

### Requirement: Continue recording votes after convergence

Convergence SHALL NOT reject, cancel or rewrite otherwise valid votes. Votes received while the round is still open SHALL continue to affect consensus, counts and suggestion ordering under existing rules. Discovery SHALL remain stopped within that host lifetime. Convergence SHALL NOT freeze suggestions, persist assignments or capture history.

#### Scenario: Late vote creates a match

- **WHEN** an in-flight vote persists after convergence and creates another qualifying candidate
- **THEN** updated suggestions follow existing ranking, fit only available dates, and leave Discovery celebrating

#### Scenario: Late vote changes ranking

- **WHEN** a late vote changes a candidate's unanimity and therefore its existing ranking
- **THEN** Planner reconciles the revised pending suggestions without persisting them or replaying the celebration transition

#### Scenario: Vote fails

- **WHEN** a submitted vote fails before persistence
- **THEN** that optimistic vote does not establish confirmed coverage; existing vote failure behavior remains unchanged

#### Scenario: Ordinary close boundary

- **WHEN** a vote competes with manual close
- **THEN** existing serialized close semantics determine whether it belongs to the closing round or becomes an early vote afterward; convergence introduces no new rejection or clearing rule

### Requirement: Keep personal completion distinct from family completion

An empty member queue SHALL NOT establish household convergence. Existing warm copy SHALL be retained unless it contradicts confirmed session state. Nudge family SHALL reuse existing link generation, Copy and optional native Share, with user initiation. This feature SHALL NOT infer who still needs to vote, send automatic reminders or introduce member-completion tracking.

#### Scenario: Everyone may have voted without matches

- **WHEN** a member exhausts their feed and the menu still lacks coverage
- **THEN** Capture and refresh remain available without claiming that waiting for another member will necessarily solve the gap

#### Scenario: User shares a nudge

- **WHEN** the member explicitly invokes Share from the reused nudge dialog
- **THEN** the existing warm invitation and generated voting link are passed to native sharing; dismissing the dialog changes no votes or plan state

#### Scenario: New recipe later becomes available

- **WHEN** the non-converged member returns or refreshes after new eligible recipes are available
- **THEN** normal discovery queue rules allow voting without any reset of previously stored votes

### Requirement: Open the completed round's meal plan on request

Activating "See your matches" SHALL open the meal-plan tab for the authoritative converged session's absolute week, including after a prior grocery-tab visit. Navigation SHALL use the existing anchored-week route. Rendering or activating the card SHALL NOT assign meals, close voting, lock the week, clear votes or suppress future convergence. Home's cooked confirmation SHALL retain its existing copy and dismiss behavior.

#### Scenario: Completed week differs from browser week

- **WHEN** a member activates the action for a converged round whose week differs from browser today
- **THEN** Planner opens with offset zero anchored to that round's week rather than browser today

#### Scenario: Prior grocery tab and keyboard activation

- **WHEN** Planner previously showed groceries and the member focuses the action and presses Enter or Space
- **THEN** navigation opens the completed week's meal-plan tab without issuing lifecycle or assignment mutations

#### Scenario: Returning to Discovery

- **WHEN** the member returns to Discovery while that round remains converged
- **THEN** the same card is available again

#### Scenario: Home confirmation

- **WHEN** Home shows its cooked-success card and the member dismisses it
- **THEN** existing cooked copy and local dismiss behavior remain unchanged

### Requirement: Keep on-image time readable and noninteractive

The Discovery time badge SHALL use readable text on an opaque contrasting surface, a decorative clock and localized Ready in copy. The badge SHALL add no focus stop or gesture obstruction. At narrow and wide viewports, its text SHALL stay within the hero, and the recipe title and existing vote controls SHALL remain usable.

#### Scenario: Narrow viewport and translated text

- **WHEN** Discovery renders at a 320px viewport width in English or French with a usable time
- **THEN** the complete time label stays inside the hero without horizontal overflow and has at least 4.5:1 text contrast
- **AND** the recipe title remains readable and vote controls reachable

#### Scenario: Wide viewport and long title

- **WHEN** Discovery renders on tablet or desktop with a multi-line recipe title
- **THEN** the badge remains anchored within the hero and does not overlap the title or vote controls

#### Scenario: Keyboard voting

- **WHEN** the person navigates Discovery's existing vote controls by keyboard
- **THEN** the time badge does not receive focus and the vote controls retain their accessible names and activation behavior

#### Scenario: Image request fails

- **WHEN** a recipe hero image fails to load
- **THEN** the title, named image alternative, usable time text and vote controls remain available without relying on image pixels

#### Scenario: Drag starts over the time badge

- **WHEN** the person starts a horizontal voting drag over the time badge
- **THEN** the existing card drag and vote rules apply without a separate badge action
- **AND** LOVE/PASS swipe feedback appears above the time badge during the drag, including where their bounds overlap
- **AND** the badge retains its lower-left position and passive interactions

### Requirement: Pulse navigation Discover control only during an open collecting session

The primary bottom-navigation control SHALL show quiet Sunlight ochre (`Compass`, localized Discovery) when `unowned` or unavailable; add a reduced-motion-safe pulse when `collecting` with unvoted cards off `/discovery`; and show steady Garden green (`Check`, localized Menu's in / Menu prêt) persistently when `converged` until closed or superseded, opening that round's Planner meal-plan tab without mutation. The control SHALL NOT render any badge, dot or pip overlay in any state.

#### Scenario: No voting session open on Home or Planner

- **WHEN** the household has unvoted discoverable recipes in the catalog and the voting session phase is `unowned`, absent, or unavailable
- **THEN** the primary bottom-navigation control renders statically in Sunlight ochre (`Compass`, localized `Discovery` / `Découverte`) without the pulsing animation, linking to `/discovery` for optional preemptive voting
- **AND** no badge, dot or pip is rendered on the control

#### Scenario: Open collecting voting session with unvoted cards

- **WHEN** the authoritative voting session phase is `collecting` and unvoted discovery categories or cards remain
- **THEN** while on Home, Planner, Recipes, or Profile, the bottom-navigation control displays Sunlight ochre with `Compass`, the pulsing animation (suppressed under `prefers-reduced-motion: reduce`), and a localized accessible label indicating active voting
- **AND** no badge, dot or pip is rendered on the control, including when `prefers-reduced-motion: reduce` suppresses the pulse
- **AND** it stops pulsing when active on `/discovery` or when the member has no remaining cards

#### Scenario: Converged voting session displays persistent green Menu's in signal across routes

- **WHEN** the authoritative voting session phase is `converged` with a valid round identity and absolute Monday
- **THEN** on every route in both Standard AA and High Contrast AAA modes, the bottom-navigation medallion displays cooled-herb Garden green (`bg-garden-fill` with white `Check` icon and `text-garden-ink` label, without an infinite looping pulse), sets the visible label to `Menu's in` in English or `Menu prêt` in French, and exposes a localized accessible name indicating meal-plan matches are ready
- **AND** that steady Garden green `Check` presentation persists across navigation and reloads until explicit voting closure returns the session to `unowned` or a new `collecting` round supersedes it

#### Scenario: Activating converged bottom navigation opens the converged Planner week without mutation

- **WHEN** a person activates the converged `Menu's in` / `Menu prêt` bottom-navigation link (by pointer or keyboard), including after a prior Grocery-tab visit, across a deployment week rollover, or while editing Portions
- **THEN** navigation honors Planner's unsaved Portions departure guard when active and opens Planner's meal-plan tab for the converged round's absolute Monday (`/planner?weekOffset=0&referenceWeekStartDate=<monday>`) without assigning recipes, closing voting, or locking the week

#### Scenario: Direct Discovery entry still shows the celebration card during convergence

- **WHEN** a voter is already on `/discovery` when convergence arrives or navigates directly to `/discovery` (such as from a shared nudge link) while converged
- **THEN** `/discovery` continues displaying the green `Menu's in!` celebration card with `See your matches` without auto-redirecting away from `/discovery`

#### Scenario: Converged round with unavailable week identity falls back safely

- **WHEN** the session phase reads `converged` without a valid absolute Monday week identity
- **THEN** activating the primary bottom-navigation link falls back to `/discovery` rather than navigating to a guessed week

### Requirement: Configure Quick Votes family-wide in Settings

Settings SHALL provide a family-wide **Quick Votes** preference stored in `family_settings`, defaulting to off with a default target of 16 likes and accepting any positive integer target (`>= 1`). A collapsed **How it works** disclosure SHALL explain family-wide scope and non-blocking behavior. Read or save failures SHALL preserve state and offer inline retry without blocking Discovery.

#### Scenario: Default Quick Votes state when unconfigured

- **WHEN** a household opens Settings and no `quick_votes` setting is stored
- **THEN** the Quick Votes switch is off and the **How it works** details are collapsed
- **AND** Discovery behaves with Quick Votes disabled

#### Scenario: Enable Quick Votes and set a custom positive target

- **WHEN** a member enables Quick Votes in Settings and sets the target to a positive integer such as `12` or `24`
- **THEN** the target is persisted family-wide in `family_settings` and applies across household devices
- **AND** invalid values below `1` or non-integer inputs are rejected inline without saving

#### Scenario: Expand How it works in Settings

- **WHEN** a member expands the **How it works** disclosure in Quick Votes settings
- **THEN** plain-language guidance explains that Quick Votes applies to everyone in the family, pauses gently after the chosen number of likes, and never blocks voting or loses saved votes

#### Scenario: Settings read or save fails

- **WHEN** loading or saving `quick_votes` fails because the backend is unreachable or returns an error
- **THEN** Settings displays an inline recoverable error with retry, without falsely claiming the setting was saved
- **AND** Discovery falls back safely to Quick Votes disabled rather than blocking swiping

### Requirement: Keep Discovery swiping counter-free during Quick Votes

While Quick Votes is enabled and a member is swiping through Discovery cards, the voting view SHALL NOT display any like count, remaining count, target quota, or progress bar. Dislikes (passes) SHALL NOT count toward the Quick Votes target.

#### Scenario: Swiping with Quick Votes enabled

- **WHEN** a member views and swipes cards in Discovery with Quick Votes enabled and target `16`
- **THEN** the card stack and thumb vote controls render without any numerical progress indicator or quota badge
- **AND** passing on recipes does not advance toward the Quick Votes check-in

### Requirement: Present a calm non-blocking Quick Votes check-in after reaching target likes

Outside a locked Pass the phone turn, when Quick Votes is enabled and a member reaches the target likes with cards remaining and the round not converged, Discovery SHALL show a non-converged **"Your picks are in!"** check-in card with no like count, offering **Keep voting**, **Pass the phone** (when enabled with another member), and **Nudge family** (when a collecting round is open), while navigation remains usable.

#### Scenario: Reach target likes with cards remaining in an open round

- **WHEN** Quick Votes is enabled with target `16`, Pass the phone is enabled in a multi-member household, and a member likes their 16th recipe in the current visit while more cards remain and the round is `collecting`
- **THEN** Discovery shows **"Your picks are in!"** with no displayed like count
- **AND** the card offers **Pass the phone**, **Nudge family**, and **Keep voting**, while bottom navigation stays available to leave

#### Scenario: Pass the phone disabled or no open round

- **WHEN** the Quick Votes check-in appears with Pass the phone disabled on the device or without an active `collecting` round
- **THEN** the disabled or unavailable action is omitted while **"Your picks are in!"** and **Keep voting** remain usable

### Requirement: Repeat Quick Votes cadence on Keep voting and start fresh on return

Activating **Keep voting** on the Quick Votes check-in card SHALL reset the current visit's turn counter, dismiss the check-in card immediately without refetching the stack, and resume at the next remaining card so the check-in repeats after another `targetLikes` likes. Navigating away from Discovery and returning later—or switching the active member—SHALL start a fresh turn at zero likes without showing a stale check-in card or requiring a tap to resume.

#### Scenario: Keep voting repeats after another target batch

- **WHEN** a member taps **Keep voting** on the check-in card after 16 likes
- **THEN** the check-in card closes immediately and the next unvoted card in the existing stack appears without resetting stored votes
- **AND** after another 16 likes while cards remain and the round has not converged, **"Your picks are in!"** appears again

#### Scenario: Return to Discovery after navigating away

- **WHEN** a member reaches the Quick Votes check-in card (or likes several cards), navigates away to Home or Planner, and later returns to Discovery
- **THEN** Discovery opens directly onto the unvoted card stack with a fresh turn counter and no check-in prompt blocking voting

### Requirement: Complete locked Pass the phone turns on Quick Votes target with direct return

When Quick Votes is enabled during a locked Pass the phone turn, reaching the configured number of likes while cards remain and the round has not converged SHALL transition immediately to the pure locked celebration card (`Nice picks, {name}!`) with no subtext or action buttons inside the card. While this celebration card is shown, activating **Back to {origin}** on the Handoff Dock SHALL return directly to the origin member without a mid-stack exit confirmation modal.

#### Scenario: Child reaches Quick Votes target during Pass the phone

- **WHEN** Maya is voting in a locked Pass the phone turn from Alex with Quick Votes target `16` and likes her 16th recipe while more cards remain
- **THEN** Discovery displays the pure celebration card `Nice picks, Maya!` with no action buttons inside the card
- **AND** activating **Back to Alex** on the Handoff Dock settles pending votes and returns directly to Alex without an extra confirmation modal

### Requirement: Prioritize household convergence and exhausted-queue fallback over Quick Votes

Authoritative household convergence (`"Menu's in!"`) SHALL always take precedence over the Quick Votes check-in card, including on the target-reaching like or while the check-in card is already displayed. Exhausting the Discovery queue before reaching the Quick Votes target SHALL display the existing exhausted-queue wrap-up (`"That's a wrap!"` or the locked kid wrap-up) rather than the Quick Votes check-in.

#### Scenario: Target-reaching like triggers household convergence

- **WHEN** a member's 16th like (or another member's live update while viewing **"Your picks are in!"**) causes the voting session to converge
- **THEN** Discovery immediately displays `"Menu's in!"` instead of the Quick Votes check-in

#### Scenario: Queue runs out before target likes

- **WHEN** Quick Votes target is `16` and the member finishes all remaining cards with only 6 likes
- **THEN** Discovery shows `"That's a wrap!"` (or `Nice picks, {name}!` in a locked turn) rather than **"Your picks are in!"**
