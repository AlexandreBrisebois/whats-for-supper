# Spec Delta

## MODIFIED Requirements

### Requirement: Inspect and dismiss the Quick Find deck

A nonterminal recipe card SHALL provide an explicit `aria-expanded` inline disclosure control to reveal and hide its description and ingredients without flipping the card away from its title and image. Quick Find SHALL display one progress indicator per returned recipe plus its terminal card with high-contrast Family Cookbook controls. Close or backdrop activation SHALL dismiss the modal without selecting a recipe and retire outstanding fetch results for that mount.

#### Scenario: Inspect recipe details
- **WHEN** a person activates the card details disclosure on a returned suggestion
- **THEN** its description and ingredients expand inline (`aria-expanded="true"`) while retaining the recipe title, primary selection action, and no meal assignment

#### Scenario: Close before selection
- **WHEN** a person closes Quick Find with a suggestion request still outstanding
- **THEN** the modal dismisses without assignment and that mount's late fetch result is retired
