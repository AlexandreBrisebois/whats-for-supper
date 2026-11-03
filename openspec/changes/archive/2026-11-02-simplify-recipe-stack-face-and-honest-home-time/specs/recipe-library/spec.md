# Spec Delta

## MODIFIED Requirements

### Requirement: Present the current stack card and visual depth

With nonempty successfully loaded stack results, Browse SHALL render up to four consecutive loaded cards beginning at the current index, with the first designated front. Each card face SHALL present the returned hero reference and complete name, plus a localized Ready In badge over the image only when returned total time formats to a nonempty duration. The face SHALL omit description and other secondary recipe metadata. Deeper cards SHALL have reduced scale, opacity and small consistent vertical offsets, with their visible geometry bounded by the front card rather than their own hidden content.

#### Scenario: Render a window of loaded cards
- **WHEN** stack results are available at a valid current index with no stack loader replacing cards
- **THEN** up to four loaded records beginning at that index are rendered with one front card

#### Scenario: Read stack card content
- **WHEN** a returned card has a hero reference, a long name, a description and total time `PT1H30M`
- **THEN** its face shows the hero and complete wrapping name, with a badge over the image reading localized Ready In with `1H 30 MINS`
- **AND** the description and other secondary recipe metadata are absent from the face

#### Scenario: No usable total time
- **WHEN** a returned card has absent, empty, zero or unformattable total time
- **THEN** no Ready In badge or estimated duration appears on its face
- **AND** its image and name remain available for detail opening and stack navigation

#### Scenario: Preserve stack context and external actions
- **WHEN** a stack face is simplified in Explore or Search, including a planner-targeted entry
- **THEN** position, available navigation, recipe detail opening and external per-recipe actions remain available under their existing requirements
- **AND** the presentation change does not reset the collection, search criteria or planner target

#### Scenario: Keep the original stack interactions
- **WHEN** a person taps or presses Enter or Space on the focused front card
- **THEN** the existing detail sheet opens for that card identity without advancing the collection
- **AND** dismissing detail returns focus to the front card when it remains mounted
- **WHEN** a person drags the front card horizontally
- **THEN** Explore or Search navigates under its existing wrap, cursor and boundary rules
- **AND** release or click after the drag does not also open detail
- **AND** the simplified face adds no visible Previous / View recipe / Next row

#### Scenario: Backing records have longer names
- **WHEN** one or more backing records have names that wrap to more lines than the front card
- **THEN** their hidden content does not increase their visible height below the front card
- **AND** backing-card bottom edges remain small, consistent depth peeks rather than protruding toward the position or Discovery controls

#### Scenario: Short or enlarged viewport
- **WHEN** the stack is shown at 320x568 or 390x667 CSS pixels, in 667x375 landscape, or at 200 percent text in English or French
- **THEN** the front image and complete wrapping name remain reachable without clipping or dock overlap
- **AND** backing depth remains aligned while constrained height uses intentional vertical scrolling
