# Cooking draft delta

## Purpose

Let household members prepare and follow the viewed recipe, then request recording that recipe as cooked while keeping calendar matching with meal planning.

## ADDED Requirements

### Requirement: Enter cooking with the displayed recipe identity

From a loaded recipe detail outside Edit, View steps SHALL open cooking for that recipe. Home cooking entry SHALL open the current recipe when it has an identity. Opening cooking SHALL not itself record completion.

#### Scenario: Open from detail
- **WHEN** a person activates View steps on a loaded non-editing detail
- **THEN** cooking opens with that displayed recipe identity, name and image

#### Scenario: Open from Home
- **WHEN** Home cooking is requested with an identified current recipe
- **THEN** cooking opens for that current recipe without a completion submission

### Requirement: Load recipe content for the cooking view

On cooking entry the view SHALL display loading feedback while requesting detail for the entry recipe. On a successful detail read it SHALL use the returned ingredients and supported instructions for preparation and reading.

#### Scenario: Detail request pending
- **WHEN** cooking detail has not finished loading
- **THEN** the cooking loading surface is displayed

#### Scenario: Recipe detail available
- **WHEN** the detail request succeeds with ingredients and parseable instructions
- **THEN** the preparation checklist and subsequent steps use that returned content

### Requirement: Prepare ingredients before starting an unbookmarked recipe

Without a client-held recipe position, cooking SHALL begin at Check & Prep. Each ingredient control SHALL toggle its checked indication and the view SHALL show a ready count. Starting cooking SHALL enter the first recipe step without requiring every ingredient to be checked.

#### Scenario: Toggle an ingredient
- **WHEN** a person activates an unchecked ingredient control and then activates it again
- **THEN** its checked indication changes to true then false and the ready count follows

#### Scenario: Start without all checks
- **WHEN** a person activates Let’s Cook from preparation with unchecked ingredients
- **THEN** the first recipe instruction is displayed

### Requirement: Retain preparation checks within the mounted cooking view

Ingredient checks SHALL remain local to the mounted cooking view. Returning to preparation in that view SHALL retain those checks. A newly mounted cooking view SHALL start with an empty ingredient check map.

#### Scenario: Return during the same view
- **WHEN** a person checks an ingredient and returns to preparation without unmounting cooking
- **THEN** the ingredient remains checked

#### Scenario: Open a new view
- **WHEN** cooking is unmounted and a new cooking view is mounted
- **THEN** its preparation checklist starts unchecked

### Requirement: Open recipe detail from the cooking hero

Activating the cooking hero SHALL open detail for the cooking entry recipe without a target planning day. Dismissing that detail SHALL return to the mounted cooking view. Choosing similar recipes from that detail SHALL close cooking and request recipe search for that identity.

#### Scenario: Inspect the viewed recipe
- **WHEN** a person activates the cooking hero
- **THEN** detail opens for the cooking recipe identity without a planner-day action

#### Scenario: Dismiss detail
- **WHEN** the nested detail is closed
- **THEN** the underlying mounted cooking view is available again

#### Scenario: Find similar from nested detail
- **WHEN** the nested detail requests similar recipes
- **THEN** detail and cooking close and navigation requests recipes with that recipe as the similarity target

### Requirement: Close cooking without submitting a new completion

The cooking close control SHALL dismiss cooking through its caller. Closing before any completion request SHALL not submit cooking completion.

#### Scenario: Leave before completion
- **WHEN** a person closes cooking before requesting Cooked
- **THEN** the caller dismisses cooking without submitting completion
