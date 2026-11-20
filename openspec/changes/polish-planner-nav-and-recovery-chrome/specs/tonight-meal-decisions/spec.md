# Spec Delta

## MODIFIED Requirements

### Requirement: Cancel Home recovery before mutation

Before disposition starts, Close, backdrop dismissal and Back SHALL cancel without submitting a mutation; closing Quick Find before selection SHALL cancel its choice. While a mutation is pending, dismissal and Back SHALL be disabled. After partial completion, dismissal SHALL explain that completed work remains and offer explicit abandonment of the unsaved choice. Back SHALL NOT restart a completed disposition. On the disposition step, Back SHALL be presented as a secondary button below the options, with a leading back arrow, readable text of at least 14 CSS px, a target of at least 48 CSS px, a visible focus indicator and AA contrast in Standard and High Contrast modes.

#### Scenario: Abort order-in recovery

- **WHEN** a person closes the disposition step before acting
- **THEN** no validation, move, defer, deletion or replacement is submitted by closing

#### Scenario: Return to backup choice

- **WHEN** a person activates Back before disposition starts
- **THEN** the initial Take Out / Pick Something Else choice returns without a mutation

#### Scenario: Back is presented as a secondary control

- **WHEN** the disposition step ("What about <recipe> on <date>?") is displayed in Home or Planner Plan B
- **THEN** a localized `Go back` / French equivalent button with a back arrow appears below the three options and is visually secondary to them
- **AND** it is at least 48 CSS px tall, shows a visible focus indicator when focused by keyboard, and meets AA contrast in Standard and High Contrast modes
- **AND** the top-right Close (X) remains available

#### Scenario: Back is unavailable while saving

- **WHEN** a disposition mutation is pending
- **THEN** Back and Close are disabled

#### Scenario: Leave after partial completion

- **WHEN** disposition succeeded, replacement is unsaved and the person closes recovery
- **THEN** Home requires confirmation to abandon the pending replacement and explains that the original meal's completed disposition is retained
