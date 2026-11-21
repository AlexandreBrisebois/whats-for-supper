# Spec Delta

## ADDED Requirements

### Requirement: Offer Pass the phone while Discovery is collecting

When at least two household members are loaded and the session is not converged, Discovery SHALL offer a localized Pass the phone control both while cards remain and on the exhausted-queue screen. With fewer than two members, or while converged, it SHALL NOT be offered. Showing or opening it SHALL NOT submit votes, change member selection or navigate.

#### Scenario: Cards remain in a multi-member household

- **WHEN** a member views Discovery with cards remaining, three loaded household members and a non-converged session
- **THEN** a Pass the phone control is available without obscuring the front card or the like and dislike controls

#### Scenario: Queue exhausted in a multi-member household

- **WHEN** a member's queue is empty, two or more members are loaded and the session is not converged
- **THEN** the exhausted-queue screen offers Pass the phone alongside its existing actions

#### Scenario: Single-member household

- **WHEN** only one household member is loaded
- **THEN** no Pass the phone control is shown in either state

#### Scenario: Converged round

- **WHEN** the session is converged and Discovery shows its celebration card
- **THEN** no Pass the phone control is shown and the celebration card is unchanged

### Requirement: Choose the next member without completion cues

Opening Pass the phone SHALL list every loaded household member except the current one by name, in the household member order, as keyboard-operable choices of at least 48 by 48 CSS px. The chooser SHALL NOT show, order by or imply whether a member has voted, finished or still needs to vote. Dismissing it SHALL leave selection, votes, queue and route unchanged.

#### Scenario: Open the chooser

- **WHEN** the current member Alex opens Pass the phone in a household of Alex, Sam and Maya
- **THEN** Sam and Maya are offered by name and Alex is not offered
- **AND** no choice carries a voted, done, waiting or count indicator

#### Scenario: Dismiss the chooser

- **WHEN** the chooser is open and the person dismisses it by its close control, Escape or outside activation
- **THEN** the chooser closes, focus returns to the Pass the phone control, and member selection, queue and route are unchanged

### Requirement: Show a handoff curtain before revealing the next queue

Choosing a member SHALL show a full-screen handoff curtain naming that member, with a localized confirm action that names them and a cancel action. While the curtain is shown, no recipe card, vote control or previous-member queue content SHALL be visible or operable. Cancelling SHALL return to the previous member's Discovery state with selection unchanged.

#### Scenario: Curtain hides the previous turn

- **WHEN** Alex chooses Maya in the chooser
- **THEN** a curtain reading in effect "Hand the phone to Maya" with a confirm action naming Maya is shown
- **AND** Alex's remaining cards and the vote controls are neither visible nor operable

#### Scenario: Cancel the handoff

- **WHEN** the curtain for Maya is shown and the person cancels
- **THEN** Discovery returns to Alex's queue as it was, Alex remains the selected member and no vote is submitted

### Requirement: Switch to the confirmed member and load their queue in place

Confirming the curtain SHALL make the chosen member the selected member through the member-context selection semantics, remain on Discovery, and load that member's Supper queue under the existing queue rules. The previous member's cards SHALL NOT be shown to the incoming member. If selection fails, the curtain SHALL stay open with an error and a retry.

#### Scenario: Confirm the handoff

- **WHEN** Maya confirms the curtain
- **THEN** Maya is the selected member, the route remains Discovery, and Maya's queue loads excluding only recipes Maya has already voted on
- **AND** subsequent votes are recorded for Maya

#### Scenario: Incoming member has nothing left

- **WHEN** Maya confirms the curtain and Maya's queue is empty
- **THEN** the exhausted-queue screen is shown for Maya, including Pass the phone, without showing Alex's cards

#### Scenario: Selection fails

- **WHEN** Maya confirms the curtain and the member selection request fails
- **THEN** the curtain remains with a localized error and a retry, Alex remains the selected member, and no queue is revealed

#### Scenario: Round converges during the handoff

- **WHEN** the session becomes converged while the curtain is shown or after Maya confirms
- **THEN** Discovery shows the existing celebration card for the household instead of a queue

### Requirement: Attribute in-flight votes to the member who cast them

A vote cast before a handoff SHALL be recorded for the member who cast it, even if it is still being submitted when the next member is chosen. Confirming the handoff SHALL NOT complete the switch until earlier votes from this page have settled. A failed earlier vote SHALL NOT be resubmitted for the incoming member.

#### Scenario: Swipe then immediately pass the phone

- **WHEN** Alex likes a recipe and confirms a handoff to Maya before the like request completes
- **THEN** the like is stored for Alex, not Maya
- **AND** Maya's queue is loaded only after Alex's pending vote has settled

#### Scenario: Earlier vote fails

- **WHEN** Alex's last vote fails while the handoff to Maya is in progress
- **THEN** the failed vote is not replayed as Maya's vote and Maya's queue follows normal eligibility for Maya

## MODIFIED Requirements

### Requirement: Offer empty-state navigation and feed refresh

An exhausted queue without confirmed convergence SHALL offer Refresh Feed and a control named Refresh recipe suggestions. Its primary action SHALL open Planner if the current member recorded a like on a card with family interest since this page mounted or since the most recent handoff, otherwise Capture. Capture SHALL remain directly reachable when Planner is primary. An active, non-converged round SHALL offer Nudge family through existing voting-link sharing. Pass the phone SHALL be offered under `Offer Pass the phone while Discovery is collecting`. This local counter SHALL NOT establish server consensus.

#### Scenario: No local matches

- **WHEN** the queue empties without such a local match
- **THEN** the primary action offers capture navigation

#### Scenario: Local interest match

- **WHEN** the queue empties after such a like
- **THEN** the primary action offers planner navigation

#### Scenario: Local matches belong to the previous member

- **WHEN** Alex recorded such a like, then handed off to Maya, and Maya's queue empties without Maya recording such a like
- **THEN** the primary action offers capture navigation and the match copy does not count Alex's likes

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
