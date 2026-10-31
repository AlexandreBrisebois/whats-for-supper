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
- **WHEN** a represented recipe image is absent or fails to load, or saved non-cooking context is shown without a ready recipe proposal
- **THEN** warm spacing, readable state and a deliberate modest icon treatment maintain a composed card without a large generic placeholder dominating the task
- **AND** no fabricated image, unavailable recipe or false readiness/saved claim fills the space

#### Scenario: Larger text or long content
- **WHEN** EN/FR copy, recipe titles or text enlarged to 200 percent need more room
- **THEN** the card grows and controls wrap/reflow without shrinking labels, truncating essential content or constraining card height to preserve the ordinary-size composition

#### Scenario: Ordinary empty illustration
- **WHEN** the pivot is ordinary and empty without a represented Go-To or saved context
- **THEN** its larger fork-and-knife composition follows Enlarge only the ordinary empty pivot illustration, without altering shared recipe-image fallbacks


## ADDED Requirements

### Requirement: Show the normal recipe proposal beneath the Mystery header

For a saved Mystery night with a ready recipe proposal, Home Tonight SHALL show the localized Mystery label once in the normal header above the normal 5:4 recipe hero and suggestion content. Card geometry, typography and actions SHALL match the existing suggestion presentation. It SHALL add no decorative Mystery tile, large Mystery heading, below-photo label or invitation sentence. Displaying the proposal SHALL NOT assign it; Make this tonight remains explicit acceptance.

#### Scenario: Ready Mystery proposal with usable photography
- **WHEN** a saved recipe-free Mystery night has a ready proposal with a usable photograph
- **THEN** the normal header says Mystery night in the selected locale above the ordinary 5:4 hero and normal suggestion recipe content
- **AND** card/photo dimensions and recipe typography match the ordinary ready suggestion at the same viewport and inner width
- **AND** Make this tonight, Quick Find and Order In retain their existing labels, styling, order, availability and effects
- **AND** the saved Mystery plan remains unchanged by displaying the proposal

#### Scenario: Explicit acceptance or cancelled search
- **WHEN** a ready Mystery proposal is shown and the person opens and cancels Quick Find
- **THEN** the saved Mystery plan remains intact
- **AND** only explicit acceptance through Make this tonight assigns the displayed proposal through the existing flow

#### Scenario: No ready proposal or unavailable photograph
- **WHEN** Mystery night has no ready recipe proposal
- **THEN** its existing no-suggestion, checking or pending presentation and action availability remain intact
- **WHEN** a ready Mystery proposal has no usable photograph or its photograph fails to load
- **THEN** the existing modest image fallback appears with the Mystery header and normal recipe content/actions still available
- **AND** no fabricated photograph or false assignment is implied

#### Scenario: Locale and viewport preservation
- **WHEN** the ready Mystery proposal uses English or French, a long title, 200 percent text, a short phone viewport or iPad portrait/landscape
- **THEN** content wraps or scrolls without essential clipping, horizontal overflow, reduced action targets or a shrunken photograph/card
- **AND** accessible image meaning, keyboard operation and visible focus remain available

#### Scenario: Other Tonight states
- **WHEN** the night is ordinary unplanned, planned, cooked or saved non-Mystery
- **THEN** its established layout, actions and state behavior remain unchanged
