# Spec Delta

## MODIFIED Requirements

### Requirement: Show description synthesis waiting state

After receiving a recipe ID for ordinary description capture, the client SHALL track it as pending and show localized progress copy (`Building your recipe…` / `Préparation de votre recette…`) with non-repetitive subtext confirming notification when ready. While description intake is in flight, the submission control SHALL also display localized progress copy rather than `Synthesizing…`. Existing countdown and inline completion behavior SHALL apply.

#### Scenario: Intake returns a recipe ID

- **WHEN** description submission returns an identified recipe
- **THEN** the client displays the localized `Building your recipe…` heading and localized readiness-notification subtext instead of `Synthesizing…` and begins the existing ten-second Home countdown with a Done action
- **AND** the recipe is tracked for session completion notifications

#### Scenario: Ready event resolves description waiting state

- **WHEN** a ready notification for that pending recipe reaches the active capture screen
- **THEN** the existing inline ready presentation replaces the waiting state and cancels its countdown
