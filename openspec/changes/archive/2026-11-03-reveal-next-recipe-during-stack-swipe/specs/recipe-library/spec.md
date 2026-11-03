## MODIFIED Requirements

### Requirement: Present the current stack card and visual depth

Browse SHALL render up to four loaded stack cards from the current index, with one front card. The face SHALL show its hero and complete name, plus localized Ready In over the image only for usable returned total time. It SHALL omit description and other secondary metadata. The immediate next backing card SHALL show its loaded image and a bounded name preview beneath the front during drag. Deeper cards SHALL remain quiet depth peeks. Backing content SHALL NOT increase front-matched bounds.

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

#### Scenario: Reveal the next loaded recipe mid-swipe
- **WHEN** a person drags the front card sideways while a next loaded recipe is underneath
- **THEN** the next recipe's image and name are visibly rendered within the backing card during movement
- **AND** the backing card remains noninteractive and outside keyboard focus until promoted

#### Scenario: Long title and repeated navigation
- **WHEN** a long-name backing recipe is revealed and the person swipes through multiple loaded cards in succession
- **THEN** its preview stays inside front-matched bounds without protruding into position or Discovery controls
- **AND** promotion shows its full name and each swipe advances once without opening detail

#### Scenario: Missing backing image
- **WHEN** the next loaded recipe's hero image is unavailable
- **THEN** its name remains visibly identifiable on the backing card using existing card styling
- **AND** the failed image does not alter stack bounds or introduce a new fallback request
