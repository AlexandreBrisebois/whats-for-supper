# Spec Delta

## ADDED Requirements

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
