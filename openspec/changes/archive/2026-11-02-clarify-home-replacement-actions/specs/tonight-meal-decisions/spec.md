## MODIFIED Requirements

### Requirement: Choose a backup before resolving the planned Tonight recipe

Recovery from a displayed planned recipe SHALL first offer Take Out, Suggestions and Search. Take Out SHALL open the prior-recipe disposition step without submitting validation yet. Suggestions SHALL open the existing limited Quick Find deck; choosing a replacement SHALL retain that choice for the Home disposition step without assigning it yet. Search SHALL open the existing day-specific Recipes planning flow for authoritative today without changing the current plan on entry. Choosing a recipe there SHALL follow the existing targeted assignment and occupied-slot recovery rules.

#### Scenario: Order In selected
- **WHEN** a person chooses Take Out in planned-recipe recovery
- **THEN** the disposition step opens without yet marking Tonight skipped

#### Scenario: Replacement selected
- **WHEN** a person chooses Suggestions, then selects a recipe from Quick Find
- **THEN** Quick Find closes and the disposition step retains the replacement without posting it
- **AND** the choice is labeled Suggestions in English and French consistently with Planner

#### Scenario: Search selected
- **WHEN** a person chooses Search from a planned meal's Change plan sheet with authoritative today context available
- **THEN** Recipes opens with its Search controls revealed and today’s Monday-based day index, weekOffset zero and reference Monday carried as the target
- **AND** opening Search submits no plan mutation or Home Quick Find request

#### Scenario: Search target is occupied or selection is cancelled
- **WHEN** a recipe is chosen after Search and the target meal is still occupied
- **THEN** the existing Recipes occupied-slot recovery resolves the prior meal before replacement and retains its established failure and partial-completion behavior
- **WHEN** Search is left without choosing a recipe
- **THEN** the original plan remains unchanged

#### Scenario: Calendar context unavailable or source changed
- **WHEN** the captured authoritative calendar cannot be resolved before Search navigation
- **THEN** the existing calendar retry is available and no target is guessed or plan mutation submitted
- **WHEN** the displayed meal or date has changed since Change plan opened
- **THEN** Search does not silently target the new slot; Home refreshes the choice before navigation

### Requirement: Reveal lower Home handoffs with the collapsed planned meal

The collapsed planned Tonight card and the complete label of Browse your library SHALL remain readable and reachable through normal page scrolling. Capture a Recipe SHALL precede the Tonight card under the requirement below. Taller photography SHALL take priority over fitting all content above bottom navigation in the initial viewport.

#### Scenario: Initial ordinary Home view
- **WHEN** Home settles at the top of the page at 412 by 915 CSS px with a usable photo, a title occupying at most two lines, ordinary text, collapsed ingredients and no intervening status cards or banners
- **THEN** the Capture tile appears before the planned card and the complete planned card and Browse your library label remain reachable above bottom navigation through normal page scrolling
- **AND** Cook, Change plan and View ingredients remain directly available with their existing meanings and touch targets

#### Scenario: Expanded ingredients or exceptional content
- **WHEN** ingredients are expanded, the title exceeds two lines, text is enlarged, additional Home notices or voting content appears, or the viewport is smaller than the primary acceptance viewport
- **THEN** the page grows vertically and Capture and Browse remain reachable through normal page scrolling
- **AND** Home does not hide status content, shrink usable photography below its width-driven 5:4 proportions, truncate essential text or reduce action targets to force everything into one screen

#### Scenario: Wide viewport
- **WHEN** the same planned meal is displayed on a tablet or wider screen
- **THEN** its composition remains centred with capped width rather than stretching the photograph across the screen
- **AND** content remains readable and actions reachable in portrait and landscape

## ADDED Requirements

### Requirement: Reveal Home Capture before the Tonight decision

Home SHALL display its existing Capture a Recipe tile before the Tonight decision card in visual, document and keyboard order. It SHALL remain a single direct Capture link with its existing appearance, label and behavior across planned, unplanned pivot, saved-plan and Cooked states. Status and error feedback SHALL remain perceivable. The page SHALL scroll naturally when content exceeds the viewport.

#### Scenario: Planned or unplanned ordinary phone view
- **WHEN** Home settles at its initial top position on a supported phone with ordinary text and no intervening notice
- **THEN** the complete Capture a Recipe label and actionable tile are visible before the planned Tonight card or pivot
- **AND** the tile precedes that card in screen-reader and keyboard order

#### Scenario: Other Tonight states
- **WHEN** Tonight displays a saved recipe-free plan, Mystery pivot, Cooked state or loading state
- **THEN** Capture remains one reachable link before the applicable Tonight decision content, without changing that state's actions or data

#### Scenario: Enlarged text, French and short viewport
- **WHEN** Home is shown in English or French at 200 percent text or on a short phone viewport
- **THEN** Capture and Tonight content reflow without clipped labels, overlapping controls, reduced action targets or concealment beneath navigation
- **AND** content that cannot physically fit initially remains reachable by normal scrolling
