# Spec Delta

## ADDED Requirements

### Requirement: Offer and load library stack presentation

The library SHALL use stack presentation when the selected member has no saved list preference or current override. Selecting Show recipe stack SHALL select stack presentation. After the shared summary succeeds, stack first-page loads SHALL request explore order, limit 20 and the active All/Discovery filter.

#### Scenario: Load the default stack
- **WHEN** a member without a saved list preference enters the library and summary retrieval succeeds
- **THEN** the stack requests page 1 with order explore, limit 20 and discoverableOnly false

#### Scenario: Switch from list to stack
- **WHEN** a person selects Show recipe stack from list presentation and summary retrieval succeeds
- **THEN** stack presentation starts its page-1 load with limit 20 and the selected collection filter

### Requirement: Present the current stack card and visual depth

With nonempty successfully loaded stack results, Browse SHALL render up to four consecutive loaded cards beginning at the current index, with the first designated front. Cards SHALL display returned name, description, hero reference and formatted time; deeper cards SHALL have reduced scale, opacity and vertical offset.

#### Scenario: Render a window of loaded cards
- **WHEN** stack results are available at a valid current index with no stack loader replacing cards
- **THEN** up to four loaded records beginning at that index are rendered with one front card

#### Scenario: Read stack card content
- **WHEN** a returned card is displayed
- **THEN** its name, description, hero reference and formatted time are presented

### Requirement: Navigate loaded stack cards with directional swipes

On the front card, a right drag exceeding 35 pixels or rightward velocity exceeding 280 pixels/second SHALL request previous navigation after departure animation; corresponding negative thresholds SHALL request next navigation. Below both thresholds SHALL return the card without navigation. Back cards SHALL ignore navigation and tap callbacks.

#### Scenario: Navigate next or previous
- **WHEN** the front card completes a directional drag beyond the displacement or velocity threshold
- **THEN** leftward intent requests next and rightward intent requests previous

#### Scenario: Release a short drag
- **WHEN** a front card releases with displacement and velocity below the directional thresholds
- **THEN** the card returns without invoking either navigation callback

#### Scenario: Ignore back-card activation
- **WHEN** a non-front card receives a tap or drag-end handler invocation
- **THEN** it does not invoke detail or navigation callbacks

### Requirement: Open front-card detail only for a tap

Tapping the front card without a tracked drag SHALL open that recipe detail. A horizontal drag exceeding 5 pixels SHALL suppress the tap. Closing detail SHALL retain the loaded card position under the existing detail dismissal requirement.

#### Scenario: Tap the front card
- **WHEN** the front card is tapped without a tracked drag
- **THEN** detail opens for that card ID

#### Scenario: Suppress a drag-induced tap
- **WHEN** the front card has tracked horizontal displacement greater than 5 pixels before its tap handler runs
- **THEN** that handler does not open detail

### Requirement: Wrap stack navigation within available results

Next navigation from the final loaded card SHALL return to the first loaded card unless more pages are indicated and prefetch is pending. Previous navigation from index zero SHALL use the last loaded card when the active total is already loaded; otherwise it SHALL request the calculated final page using limit 20 and the active filter and land on its last returned card.

#### Scenario: Loop forward after the last loaded card
- **WHEN** next is requested at the final loaded card with no pending prefetch for more pages
- **THEN** the first loaded card becomes current

#### Scenario: Wait at a pending page boundary
- **WHEN** next is requested on the final loaded card while more pages are indicated and prefetch is pending
- **THEN** navigation waits at that boundary

#### Scenario: Wrap backward to loaded end
- **WHEN** previous is requested at the first card with the active total already loaded and no more pages
- **THEN** the final loaded card becomes current

#### Scenario: Retrieve the final page for backward wrapping
- **WHEN** previous is requested at the first card with a positive active count and the end not loaded
- **THEN** the calculated final-page request uses explore order, limit 20 and the active filter, and its last returned card becomes current

### Requirement: Bound empty-page probing during backward wrapping

If a calculated wrap page is empty, Browse SHALL probe decreasing page numbers, stopping at a nonempty result, page 1 or three total requests. A nonempty response SHALL supply the landing card. This probing SHALL NOT establish complete or stable traversal.

#### Scenario: Find an earlier nonempty wrap page
- **WHEN** the calculated final page is empty and the preceding page returns cards
- **THEN** Browse requests the preceding page and lands on its final returned card

### Requirement: Prefetch additional stack pages near the loaded end

In stack presentation with more pages indicated, no initial load or prefetch pending and no end-state/cooldown suppression, five or fewer remaining loaded cards SHALL trigger the next explore page using limit 20 and the current filter. Successful append SHALL reuse the existing nonempty-ID deduplication rule.

#### Scenario: Prefetch within five remaining cards
- **WHEN** stack browsing reaches at most five remaining loaded cards with more pages and no suppressing condition
- **THEN** the next page is requested and a successful relevant response appends unseen IDs in order

### Requirement: Display the loaded stack position against selected total

The action bar SHALL display current loaded index plus one and the selected collection total in position / total form. This SHALL represent loaded position and the existing count selection, without promising a stable absolute position across wrap/pagination changes.

#### Scenario: Display stack depth
- **WHEN** the current loaded index is 2 and selected total is 24
- **THEN** the indicator reads 3 / 24

### Requirement: Toggle front-card discoverability with pending feedback

The action bar SHALL initialize from the current recipe discoverability, defaulting absent values false. Activation SHALL optimistically show the inverse, disable the toggle while pending and PATCH that recipe flag. Success SHALL update the loaded matching record; rejection SHALL clear optimism and restore the record-backed display. Existing persisted discoverability ownership applies.

#### Scenario: Submit the inverse front-card flag
- **WHEN** the enabled front-card toggle is activated
- **THEN** it displays the inverse flag, disables while pending and submits that flag for the current ID

#### Scenario: Complete a successful stack toggle
- **WHEN** the PATCH resolves successfully without intervening record changes
- **THEN** the matching loaded record retains the submitted flag and pending feedback clears

#### Scenario: Recover from rejected stack toggle
- **WHEN** the PATCH rejects while the same recipe remains current
- **THEN** pending feedback clears and the control displays its record-backed flag again

### Requirement: Leave the Browse overlay through its navigation controls

Close SHALL request browser back navigation. Search SHALL request `/recipes?focus=search`. Unmounting Browse SHALL reset its stack store.

#### Scenario: Close or search from Browse
- **WHEN** a person activates Close or Search in the library overlay
- **THEN** Close requests back navigation or Search requests the focused Search route respectively

#### Scenario: Reset departed Browse state
- **WHEN** the Browse page unmounts
- **THEN** loaded recipes, index, total and pagination return to the initial stack-store state

### Requirement: Show directional stack cues and request supported haptics

The front card SHALL show BACK and NEXT drag cues for previous and next navigation. When horizontal displacement exceeds 60 pixels and haptics are armed, the card SHALL request a 10 ms vibration if the browser exposes vibration support, rearming below 50 pixels. This SHALL NOT guarantee physical haptic delivery.

#### Scenario: Display directional navigation cues
- **WHEN** the front stack card is rendered for dragging
- **THEN** it provides BACK for rightward previous navigation and NEXT for leftward next navigation

#### Scenario: Attempt an armed supported vibration
- **WHEN** displacement exceeds 60 pixels with haptics armed and navigator vibration available
- **THEN** the card requests a 10 ms vibration once until displacement falls below 50 pixels and rearms it
