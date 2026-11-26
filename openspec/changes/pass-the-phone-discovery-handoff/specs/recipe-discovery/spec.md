# Spec Delta

## ADDED Requirements

### Requirement: Opt in to Pass the phone per device in Settings

Settings SHALL provide a **Pass the phone** preference stored per device (defaulting to off) with a compact toggle and a collapsed-by-default **How it works** disclosure. When fewer than two household members are loaded, the section SHALL inform the person that another household member is needed before handoff appears. Enabling or disabling this device preference SHALL NOT modify backend household settings or other devices.

#### Scenario: Default state on a personal device

- **WHEN** a household member opens Settings on a device that has never enabled Pass the phone
- **THEN** the Pass the phone switch is off and the **How it works** details are collapsed
- **AND** Discovery's exhausted-queue screen does not show Pass the phone

#### Scenario: Expand How it works in Settings

- **WHEN** a person activates the **How it works** disclosure in Settings
- **THEN** warm, plain-language guidance expands inline explaining that after finishing your cards you can pass your phone to the kids while the rest of the app stays tucked away, and that it only turns on for this device

#### Scenario: Single-member guidance in Settings

- **WHEN** only one household member is loaded in Settings
- **THEN** the Pass the phone section shows an inline note that another household member must be added above before Pass the phone appears after voting

### Requirement: Offer Pass the phone on the exhausted queue when opted in

When Pass the phone is enabled on this device, at least two household members are loaded, and the session is not converged, Discovery SHALL offer a localized **Pass the phone** control on the exhausted-queue ("That's a wrap!") screen. While cards remain in the stack, when disabled, with fewer than two members, or while converged, Discovery SHALL NOT show the trigger or add handoff chrome to the voting view. Opening it SHALL NOT submit votes, switch members, or navigate.

#### Scenario: Cards remain in the stack

- **WHEN** a member views Discovery with cards remaining, even with Pass the phone enabled on the device
- **THEN** the voting view shows only the recipe card stack and thumb vote controls without any Pass the phone trigger

#### Scenario: Queue exhausted with opt-in enabled in a multi-member household

- **WHEN** a member's queue is empty, Pass the phone is enabled on this device, two or more members are loaded, and the session is not converged
- **THEN** the exhausted-queue screen offers Pass the phone alongside its existing actions

#### Scenario: Opt-in disabled or single-member household

- **WHEN** Pass the phone is disabled on this device OR only one household member is loaded
- **THEN** no Pass the phone control is shown on the exhausted-queue screen

#### Scenario: Converged round while unlocked

- **WHEN** the session is converged in an unlocked state and Discovery shows its celebration card
- **THEN** no Pass the phone control is shown and the celebration card is unchanged

### Requirement: Choose the next member from a scrollable list without completion cues

Opening **Pass the phone** SHALL present a scrollable, keyboard-operable dropdown list of loaded household members in household order, each at least 48 by 48 CSS px, excluding the current member. The list SHALL NOT show, order by, or imply whether a member has voted, finished, or still needs to vote. Dismissing it SHALL leave selection, votes, queue, and route unchanged.

#### Scenario: Open the scrollable chooser

- **WHEN** the current member Alex opens Pass the phone in a household of Alex, Sam, Maya, and Léo
- **THEN** Sam, Maya, and Léo are offered in household order inside a scrollable list and Alex is excluded
- **AND** no choice carries a voted, done, waiting, or count indicator

#### Scenario: Dismiss the chooser

- **WHEN** the chooser list is open and the person dismisses it via the toggle, Escape, or outside activation
- **THEN** the list closes, focus returns to the Pass the phone control, and member selection, queue, and route are unchanged

### Requirement: Show a handoff curtain before revealing the next queue

Choosing a member SHALL immediately lock navigation to Discovery and show a minimal full-screen handoff curtain over the view and bottom dock (`Hand the phone to {name}`, `Let's go, {name}!`, and `Cancel`). While shown, no cards, vote controls, 5-tab navigation, or prior queue content SHALL be visible or operable, and stray routes SHALL redirect to Discovery. Cancelling SHALL clear the lock and return unchanged.

#### Scenario: Curtain hides the previous turn and locks navigation

- **WHEN** Alex chooses Maya in the chooser
- **THEN** navigation enters locked mode immediately and a minimal full-screen curtain reading in effect "Hand the phone to Maya" with a confirm action reading in effect "Let's go, Maya!" and a cancel action is shown and covers navigation
- **AND** Alex's wrap-up state, vote controls, and normal navigation tabs are neither visible nor operable

#### Scenario: Cancel the handoff

- **WHEN** the curtain for Maya is shown and the person cancels
- **THEN** the lock clears, Discovery returns to Alex's wrap-up state as it was with normal navigation restored, selection remains Alex, and no vote is submitted

### Requirement: Switch to the confirmed member in a locked Discovery turn

Confirming the curtain SHALL record the starting member as the local handoff origin, select the chosen member, stay on Discovery, and load their Supper queue without revealing the previous member's cards. While locked, bottom navigation SHALL show only the quiet Handoff Dock (`{name}'s turn` and **Back to {origin}**), stray routes SHALL redirect to Discovery, the voting view SHALL stay clean, and an empty locked queue SHALL show a pure celebration card without action buttons.

#### Scenario: Confirm the handoff into locked Discovery

- **WHEN** Maya confirms the curtain handed off from Alex
- **THEN** Maya is the selected member, the route remains Discovery, and Maya's queue loads excluding only recipes Maya has already voted on
- **AND** the bottom navigation tabs are replaced by the quiet Handoff Dock naming Maya and offering Back to Alex, while the card voting area remains clean

#### Scenario: Locked member finishes their queue

- **WHEN** Maya confirms the curtain (or swipes their last card) and Maya's queue is empty while not converged
- **THEN** Discovery shows joyful celebratory copy naming Maya (`Nice picks, Maya!`), with no subtext or buttons inside the celebration card
- **AND** Planner, Capture, Nudge family, Refresh recipe suggestions, and any member chooser dropdown are not shown

### Requirement: Exit, converge, and recover safely from a locked turn

Activating **Back to {origin}** on the Handoff Dock SHALL require confirmation while cards remain and return directly once the locked queue is empty. Returning via the dock or a converged celebration card SHALL restore the origin member, restore the 5-tab dock, and show a non-blocking saved-votes confirmation. Selection failure SHALL keep the current surface with retry, and a missing origin member SHALL clear the lock automatically.

#### Scenario: Early exit from the Handoff Dock requires confirmation

- **WHEN** someone activates **Back to Alex** on the Handoff Dock while Maya still has cards remaining
- **THEN** a confirmation dialog asks whether to return to Alex, with options to return or keep voting
- **AND** choosing keep voting leaves Maya selected in the locked turn

#### Scenario: Returning to the origin after finishing shows calm closure confirmation

- **WHEN** someone activates **Back to Alex** on the Handoff Dock after Maya's queue is empty (or confirms the mid-stack dialog)
- **THEN** Alex becomes the selected member without an extra prompt when empty, any pending votes from Maya settle first, the 5-tab navigation dock is restored, and a non-blocking confirmation message greets Alex and confirms that Maya's votes are saved

#### Scenario: Sibling turn happens cleanly via parent return

- **WHEN** Alex returns from Maya's wrap-up and wants another child (Léo) to vote next
- **THEN** Alex can immediately open Pass the phone from their own wrap-up screen and hand off to Léo

#### Scenario: Selection or return fails

- **WHEN** confirming a handoff OR returning to the origin member fails because member selection rejects
- **THEN** the current surface remains with a localized error and a retry, selection stays unchanged, and no wrong-member queue is revealed

#### Scenario: Round converges during a locked turn

- **WHEN** the session becomes converged while the curtain is shown or during Maya's locked turn
- **THEN** Discovery shows the celebration card whose action settles any pending votes, switches selection back to Alex, restores the normal dock with the saved-votes confirmation, and opens Planner as Alex

#### Scenario: Locked origin member no longer exists

- **WHEN** a locked handoff session loads and the stored origin member ID is no longer in the household member list
- **THEN** the handoff lock clears automatically, the normal navigation dock is restored, and the app recovers without stranding the user

### Requirement: Attribute in-flight votes to the member who cast them

A vote cast before a handoff or return SHALL be recorded for the member who cast it, even if it is still being submitted when the switch is confirmed. Confirming a handoff or returning to the origin SHALL NOT complete the member switch until earlier votes from this page have settled. A failed earlier vote SHALL NOT be resubmitted for the incoming or returning member.

#### Scenario: Swipe last card then immediately pass the phone

- **WHEN** Alex swipes their final recipe and confirms a handoff to Maya before the vote request completes
- **THEN** the vote is sent with Alex's member header, not Maya's
- **AND** Maya's queue is loaded only after Alex's pending vote has settled

#### Scenario: Earlier vote fails

- **WHEN** a member's last vote fails while a handoff or return is waiting to settle
- **THEN** the failed vote is not replayed under the next member's identity and the next queue loads normally

## MODIFIED Requirements

### Requirement: Offer empty-state navigation and feed refresh

An exhausted queue without confirmed convergence and outside a locked handoff turn SHALL offer Refresh recipe suggestions. Its primary action SHALL open Planner when the current member liked a family-interest card since mount or the last handoff, otherwise Capture; Capture SHALL stay reachable. An active, non-converged round SHALL offer Nudge family via existing voting-link sharing, and Pass the phone per `Offer Pass the phone on the exhausted queue when opted in`. This local count SHALL NOT imply server consensus.

#### Scenario: No local matches

- **WHEN** the queue empties without such a local match outside a locked turn
- **THEN** the primary action offers capture navigation

#### Scenario: Local interest match

- **WHEN** the queue empties after such a like outside a locked turn
- **THEN** the primary action offers planner navigation

#### Scenario: Local matches belong to the previous turn

- **WHEN** Alex recorded such a like, handed off to Maya, returned to Alex, and the queue empties without a like in the current turn
- **THEN** the primary action offers capture navigation and the match copy does not count the earlier turn's likes

#### Scenario: Refresh exhausted feed

- **WHEN** the person activates a refresh control outside a locked turn
- **THEN** the page requests categories and the Supper queue again without resetting stored votes

#### Scenario: Queue ends before household convergence

- **WHEN** a member has no cards left while confirmed matches do not cover the active week's slots outside a locked turn
- **THEN** existing warm exhausted-feed copy and Refresh recipe suggestions remain, Capture is reachable, and Nudge family opens the reused sharing dialog without sending anything automatically
- **AND** the page does not show the Menu's In celebration or claim that named family members have not voted

#### Scenario: Early voting queue ends without a week owner

- **WHEN** the queue ends before any week owns voting outside a locked turn
- **THEN** existing exhausted-feed behavior remains without inventing an active week or household convergence
