# Spec Delta

## ADDED Requirements

### Requirement: Activate Planner dragging according to the effective hold preference

The Planner recipe drag handle SHALL start dragging immediately for an eligible primary-button pointer when hold-to-move is disabled. When enabled it SHALL wait for an uninterrupted 250 millisecond hold before starting, show grabbed feedback on activation, and request a brief vibration when the browser supplies that facility. Secondary-button and explicitly non-primary pointers SHALL not start a hold.

#### Scenario: Immediate mode
- **WHEN** hold-to-move is disabled and an eligible pointer presses the recipe drag handle
- **THEN** dragging starts without waiting for the hold duration

#### Scenario: Hold reaches activation
- **WHEN** hold-to-move is enabled and an eligible pointer remains pending for 250 milliseconds without cancellation
- **THEN** dragging starts once and the handle shows grabbed feedback, with a vibration request when supported

#### Scenario: Ineligible pointer
- **WHEN** a secondary-button or explicitly non-primary pointer presses the handle
- **THEN** that press does not start dragging or a pending hold

### Requirement: Cancel pending Planner holds before drag activation

A pending Planner hold SHALL cancel when its pointer moves more than eight pixels from the press position, its pointer ends or cancels, another pointer begins, the window loses focus, or a pre-activation touch movement occurs on the handle. A cancelled hold SHALL not later activate from its retired timer. Removing the handle or changing its effective activation mode SHALL also retire pending activation.

#### Scenario: Scroll movement before activation
- **WHEN** a pending pointer moves more than eight pixels or the handle receives touch movement before activation
- **THEN** the pending hold is cancelled without preventing that pre-activation touch movement through the handle

#### Scenario: Release or interruption
- **WHEN** a pending hold receives its pointer end or cancellation, another pointer begins, or the window loses focus
- **THEN** waiting beyond the hold duration does not start dragging from that hold

#### Scenario: Handle or mode changes
- **WHEN** the handle unmounts or its effective hold-to-move mode changes while a hold is pending
- **THEN** the previous pending activation is retired

### Requirement: Bound Planner grabbed feedback to the active pointer interaction

After held activation, the handle SHALL prevent cancelable touch movement received on the handle while active. Ending or cancelling the tracked pointer or losing window focus SHALL clear grabbed feedback. This activation behavior SHALL not itself confirm a persisted calendar move; the existing Planner drag-preview and drop requirements govern that handoff.

#### Scenario: Touch movement after activation
- **WHEN** an activated held drag receives cancelable touch movement on its handle
- **THEN** the handle prevents the default for that event

#### Scenario: Activated pointer ends
- **WHEN** the tracked pointer ends after held activation
- **THEN** grabbed feedback clears without this feedback change confirming server persistence
