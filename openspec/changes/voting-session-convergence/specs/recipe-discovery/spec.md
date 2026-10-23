# Recipe discovery delta

## MODIFIED Requirements

### Requirement: Offer empty-state navigation and feed refresh

An exhausted queue without confirmed session convergence SHALL offer Refresh Feed and a refresh control named Refresh recipe suggestions. Its existing primary action SHALL continue to navigate to Planner when this mounted page recorded a like on a card already carrying family interest, otherwise to Capture. Capture SHALL also remain reachable directly when that primary action points to Planner. An active, non-converged round SHALL additionally offer Nudge family through the existing voting-link sharing flow. This local counter SHALL NOT establish server consensus.

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


## ADDED Requirements

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

Discovery SHALL replace its voting arena with the app-logo celebration when authoritative session state reports convergence, even with cards remaining. English copy SHALL be “We did it!” and “Menu's In!” with localized equivalents. The celebration SHALL contain no call to action, Planner nudge, extra explanation, sound or confetti. Existing app navigation SHALL remain available.

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
- **WHEN** the decorative celebration image is unavailable
- **THEN** accessible text still communicates “We did it!” and “Menu's In!” without dependence on image pixels or color

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
