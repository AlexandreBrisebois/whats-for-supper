## MODIFIED Requirements

### Requirement: Present Tonight as a refined family cookbook

At ordinary text size, Tonight cards with recipe imagery SHALL give the food photograph and recipe title visual priority over their controls. The composition SHALL use generous state-appropriate imagery, warm surfaces, considered spacing and depth. Longer text and enlarged text SHALL remain readable in content-driven flow rather than being clipped to preserve proportions.

#### Scenario: Planned recipe or ready family GOTO with a photograph
- **WHEN** a planned recipe or ready family GOTO has usable imagery at ordinary mobile text size
- **THEN** a generous photograph and prominent recipe title lead the card, with quieter context and duration where available
- **AND** the composition preserves the respective supplied meal/pivot reference’s photographic presence, deep rounding, soft elevation and title emphasis while retaining the current visible actions and explicit details

#### Scenario: Related meal and pivot compositions
- **WHEN** the meal card and ready-GOTO pivot are shown at ordinary mobile text size
- **THEN** they share a refined rounded frame and photo/title hierarchy while planned and ready-GOTO photographs use matching 5:4 proportions at equal inner widths
- **AND** pivot alternatives are grouped side by side when complete labels and touch targets fit, with stacking when wrapping or text growth requires it

#### Scenario: Empty or unavailable imagery
- **WHEN** a represented recipe image is absent or fails to load, or saved non-cooking context is shown
- **THEN** warm spacing, readable state and a deliberate modest icon treatment maintain a composed card without a large generic placeholder dominating the task
- **AND** no fabricated image, unavailable recipe or false readiness/saved claim fills the space

#### Scenario: Larger text or long content
- **WHEN** EN/FR copy, recipe titles or text enlarged to 200 percent need more room
- **THEN** the card grows and controls wrap/reflow without shrinking labels, truncating essential content or constraining card height to preserve the ordinary-size composition

#### Scenario: Ordinary empty illustration
- **WHEN** the pivot is ordinary and empty without a represented Go-To or saved context
- **THEN** its larger fork-and-knife composition follows Enlarge only the ordinary empty pivot illustration, without altering shared recipe-image fallbacks

### Requirement: Preserve appetizing planned Tonight photography

With usable imagery, the planned Tonight card SHALL show a landscape photograph filling its inner width, within a centred width-capped composition. The photograph SHALL use the ready-GOTO pivot's 5:4 proportions at equal inner widths. Long content SHALL grow the card in document flow rather than shrink or hide the photograph or truncate essential text.

#### Scenario: Ordinary portrait phone composition
- **WHEN** a planned recipe with usable imagery is displayed at ordinary text size on a portrait phone
- **THEN** its photo fills the card's inner width, has 5:4 proportions matching the ready-GOTO pivot at the same inner width
- **AND** the card retains a prominent recipe title, warm rounded frame and soft depth

#### Scenario: Shorter viewport
- **WHEN** the available viewport height decreases while the same planned recipe remains displayed
- **THEN** the photograph retains its height when its inner width is unchanged
- **AND** further space pressure is handled by page scrolling without clipping content or covering actions with navigation

#### Scenario: Long title or enlarged text
- **WHEN** a long recipe title, English or French text growth, or text enlarged to 200 percent needs additional space
- **THEN** the full title and action labels wrap and the card grows in document flow
- **AND** usable photography retains its 5:4 proportions at the available inner width, with all actions reachable by page scrolling

#### Scenario: Missing or failed photograph
- **WHEN** the planned recipe has no image or its image fails to load
- **THEN** the existing modest icon fallback is displayed without reserving a large empty photograph area
- **AND** the title and actions remain available without claiming the image loaded

#### Scenario: Plan the ready family GOTO
- **WHEN** a loaded ready-GOTO photograph becomes the planned meal through Make this tonight at an unchanged viewport and inner width
- **THEN** the photograph retains matching width and height with 5:4 proportions
- **AND** cover crop, rounded framing, planned actions and explicit ingredient disclosure remain available


### Requirement: Reveal lower Home handoffs with the collapsed planned meal

The collapsed planned Tonight card and the complete labels of Capture a Recipe and Browse your library SHALL remain readable and reachable through normal page scrolling. Taller photography SHALL take priority over fitting all content above bottom navigation in the initial viewport.

#### Scenario: Initial ordinary Home view
- **WHEN** Home settles at the top of the page at 412 by 915 CSS px with a usable photo, a title occupying at most two lines, ordinary text, collapsed ingredients and no intervening status cards or banners
- **THEN** the complete planned card and the complete labels of both lower handoff tiles remain reachable above bottom navigation through normal page scrolling
- **AND** Cook, Change plan and View ingredients remain directly available with the existing action meanings and touch targets

#### Scenario: Expanded ingredients or exceptional content
- **WHEN** ingredients are expanded, the title exceeds two lines, text is enlarged, additional Home notices or voting content appears, or the viewport is smaller than the primary acceptance viewport
- **THEN** the page can grow vertically and both lower handoffs remain reachable through normal page scrolling
- **AND** Home does not hide status content, shrink usable photography below its width-driven 5:4 proportions, truncate essential text or reduce action targets to force everything into one screen

#### Scenario: Wide viewport
- **WHEN** the same planned meal is displayed on a tablet or wider screen
- **THEN** its composition remains centred with capped width rather than stretching the photograph across the screen
- **AND** content remains readable and actions reachable in portrait and landscape
