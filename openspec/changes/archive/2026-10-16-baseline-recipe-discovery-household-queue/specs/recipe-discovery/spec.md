# Recipe discovery delta

## Purpose

Collect member recipe preferences and expose discovery queues and voting suggestions while keeping suggestions distinct from persisted meal assignments.

## ADDED Requirements

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

A discovery queue read SHALL include only discoverable, ready, undeleted recipes without a vote by the requesting member. Recipe readiness and deletion remain owned by recipe-library.

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

Queue reads SHALL order by descending like count, then by last-cooked date ascending with never-cooked recipes before dated recipes at the same count. Ordering among equal remaining keys SHALL have no specified tie-breaker.

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
