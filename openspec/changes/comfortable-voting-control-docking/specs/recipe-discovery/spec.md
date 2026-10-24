## ADDED Requirements

### Requirement: Gate comfortable voting placement
Discovery SHALL expose placement controls only while Comfortable one handed voting is effectively enabled for the selected loaded member. Disabled, missing, loading or failed flag state SHALL use safe Bottom and hide placement controls without erasing the saved position. Generic flag resolution remains owned by member-preferences.

#### Scenario: Enable for a member
- **WHEN** the selected loaded member has effective enablement
- **THEN** Discovery uses that member's saved supported position, or Bottom when absent, and offers repositioning

#### Scenario: Disable or lose eligibility during movement
- **WHEN** effective enablement becomes unavailable or false during a hold, drag or preview
- **THEN** the interaction is cancelled without voting or saving, placement controls disappear and safe Bottom is used
- **AND** a previously submitted save may settle for its originating member but cannot restore a side layout while disabled

#### Scenario: Reenable a retained choice
- **WHEN** the flag becomes enabled again and the member's confirmed saved position is Right
- **THEN** Right is restored subject to layout fit, without requiring a new preference save

### Requirement: Move voting actions as one discrete group
With placement enabled, Discovery SHALL support deliberate hold-and-drag of the grouped voting controls to named Left, Right and Bottom targets. Activation SHALL visibly distinguish movement from voting; a valid target SHALL preview the group there. Only a valid release SHALL request that position. Freeform placement SHALL NOT be persisted.

#### Scenario: Hold then drop on Left
- **WHEN** the member deliberately holds the control group, drags onto Left and releases
- **THEN** both actions preview and move together to Left and one position save is requested
- **AND** their identities and relative order remain unchanged

#### Scenario: Invalid drop or cancellation
- **WHEN** an active drag releases outside a valid target, receives pointer cancellation, loses window focus, or is cancelled with Escape
- **THEN** targets and preview disappear, the pre-gesture position is restored, and no save or vote is submitted

#### Scenario: Release on the current target
- **WHEN** a drag ends on the already selected position
- **THEN** the group remains there without a redundant preference save or vote

### Requirement: Isolate positioning from voting and card swipes
Positioning SHALL NOT vote, reset or reorder the queue, change the front card or alter progress. A normal vote-button tap SHALL retain its existing single-vote behavior; an activated hold/drag SHALL suppress its trailing click. Ordinary card swipes SHALL retain their existing direction meanings and front-card ownership.

#### Scenario: Tap versus deliberate hold
- **WHEN** the member taps a vote button without activating positioning
- **THEN** exactly one existing vote action targets the current front card
- **AND** holding into positioning and then releasing submits no vote, whether the drop is valid or cancelled

#### Scenario: Swipe the card
- **WHEN** the member swipes the front recipe rather than the control group
- **THEN** existing like/pass semantics apply and no control-position interaction starts

#### Scenario: Interrupt movement
- **WHEN** member selection changes, Discovery unmounts, a second pointer interrupts, or authoritative convergence replaces the arena
- **THEN** any pending or active placement interaction ends without manufacturing a vote or save
- **AND** existing convergence, empty-queue and already-submitted vote behavior is preserved

### Requirement: Offer accessible placement without dragging
Enabled Discovery SHALL offer a labelled Voting button position choice with Left, Bottom and Right, selected state, visible keyboard focus and English/French copy. Keyboard and screen-reader users SHALL select the same positions without holding or dragging, with announced saving, success and failure feedback. Moving controls SHALL preserve logical focus.

#### Scenario: Choose with keyboard or assistive technology
- **WHEN** a member selects Right through the non-drag choice
- **THEN** the same placement and persistence behavior as a valid Right drop occurs without voting
- **AND** the selected position and save status are available to assistive technology

#### Scenario: Cancel while focused
- **WHEN** a keyboard user cancels positioning
- **THEN** focus returns to the initiating placement control without activating a vote

### Requirement: Keep voting controls clear of content and navigation
Every rendered placement SHALL keep both vote actions visible and operable above the fixed bottom dock, its raised Discover action and the home-indicator safe area. Layout SHALL reserve space rather than cover recipe facts or navigation, avoid horizontal overflow, and retain usable target sizes. This requirement SHALL apply with the preview disabled.

#### Scenario: Bottom on iPad portrait
- **WHEN** Discovery renders in iPad portrait Safari or standalone PWA with Bottom selected or the feature disabled
- **THEN** both voting actions remain above the dock's occupied area and safe area, visible and usable without being hidden beneath navigation

#### Scenario: Rotation resize and enlarged text
- **WHEN** rotation, viewport resize, browser chrome changes or enlarged text changes the available area
- **THEN** layout recomputes clearance without clipping actions or covering content/navigation
- **AND** an active placement gesture is cancelled rather than committing a stale target

#### Scenario: Side cannot fit safely
- **WHEN** the selected side cannot contain the grouped actions without obscuring content/navigation or shrinking usable targets
- **THEN** Discovery uses safe Bottom for that viewport without overwriting the saved side preference
- **AND** unavailable side targets are identified as unavailable rather than accepting an unsafe drop
