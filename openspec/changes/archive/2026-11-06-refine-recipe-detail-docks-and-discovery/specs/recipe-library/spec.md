## MODIFIED Requirements

### Requirement: Make detail actions reflect their entry context

Planner and Recipes detail SHALL put one existing Cook at the top dock’s left, retaining cooking context and guards. Bottom actions SHALL occupy one row: unplanned dated Plan with target-day arrows, or white Planned navigation without arrows for a confirmed occurrence. Editing the shown saved occurrence belongs in Planner. Do not repeat planned status in the body or retain bottom Cook/Plan another day copies. Reading/navigation SHALL not assign or complete a meal; no Steps action returns.

#### Scenario: Read from a saved Planner meal
- **WHEN** a confirmed ordinary planned recipe opens from its dated Planner card
- **THEN** Cook is top-left and one white Planned control opens Planner on that exact source date with no change arrows or duplicate body status
- **AND** direct Plan another day is no longer stacked in detail; the person changes plans in Planner

#### Scenario: Plan for a day
- **WHEN** a valid unassigned dated target is available
- **THEN** dated Plan and the existing 48 CSS px icon-only target-day chooser appear in one bottom action row, with Cook in the top dock instead of a second bottom row
- **AND** the arrows retain their localized chooser name and cannot move a saved plan or navigate to Planner
- **AND** a recipe on a different date does not replace the explicitly displayed target

#### Scenario: Pending or recovery footer
- **WHEN** target checking, assignment, uncertain persistence, conflict or staged recovery owns the flow
- **THEN** existing retry/review/saving guards and necessary feedback remain reachable without duplicate writes or a misleading Planned/Plan state
- **AND** action controls remain in one bottom row; feedback can wrap above them, and recovery in its separate existing surface retains its controls
- **AND** top Cook or Find Similar cannot bypass an operation that owns unresolved state

#### Scenario: Prepared or legacy completed occurrence
- **WHEN** a completed occurrence opens
- **THEN** instructions retain their readable Cook entry and completion protection, with only known preparation metadata and frozen portions
- **AND** do not relabel completed or consensus state as a new uncompleted plan or invent preparation dates

#### Scenario: Edit, read-only review or unavailable recipe
- **WHEN** editing, original-quantity review, loading or failed detail is active
- **THEN** Save/Cancel, source review, retry and Close retain their roles; Cook is offered only under its existing availability rules
- **AND** an original-grocery-review Plan transition remains deliberate and cannot assign by itself

#### Scenario: Browse and grocery-source cooking layout
- **WHEN** ordinary Recipes browsing or original-grocery review already offers Cook
- **THEN** that same control moves to the top-left dock without a bottom duplicate or changed cooking context
- **AND** grocery original quantities and the separate guarded Plan transition remain intact

#### Scenario: Responsive full-width means the current footer
- **WHEN** English/French detail appears on phone, bounded tablet, short height or 200% text
- **THEN** the bottom action row uses its available inner width without stacking separate action rows, horizontal overflow or targets below 48 CSS px
- **AND** labels can wrap within their controls, top controls can reflow, and reading/Notes clear the actual docks and safe areas once


### Requirement: Place appreciation near recipe identity

Rating SHALL remain after instructions with evenly spaced borderless emoji/label choices, restoring the verified main’s neutral white selected surface and shadow/emphasis without red selection or a checkmark. Preserve localized readable labels, pressed/selected state, visible focus, 48 CSS px targets and existing save/toggle behavior. Optional rating remains distinct from GOTO, votes and completion; do not restore unreadable inactive opacity or untranslated names.

#### Scenario: Recognise appreciation before planning
- **WHEN** a recipe with a saved rating opens
- **THEN** the ending Rating section shows its saved selection and three evenly spaced operable choices with readable labels and visible focus

#### Scenario: Plan without rating
- **WHEN** the recipe is unrated
- **THEN** planning remains available without choosing a rating

#### Scenario: Neutral selected rating and readable alternatives
- **WHEN** a saved Like rating opens in English or French
- **THEN** its white selected surface/emphasis and pressed semantics identify it without a red treatment/checkmark, and other choices remain visibly available and legible
- **AND** repeated selection retains the existing clear-rating behavior without affecting planning, votes or cooking

## ADDED Requirements

### Requirement: Keep Planned status in one navigable presentation

A confirmed ordinary planned occurrence SHALL have one white Planned control in the bottom row, including its dated destination and a localized accessible name describing opening Planner. It SHALL not look disabled or include change arrows. Do not repeat planned status in the reading body. Portion/projection and actual-preparation facts SHALL retain their distinct truthful roles; unknown, stale or completed context SHALL not create a false Planned claim.

#### Scenario: Recognise navigation without duplicate status
- **WHEN** matching dated detail is confirmed planned
- **THEN** Planned and its date appear in the white navigation control with an accessible name such as Planned for Friday, November 6. Open Planner
- **AND** the body has no second Already planned/Planned status banner; necessary ingredient count, preview meaning, errors and actual-preparation facts are not hidden

#### Scenario: Open the matching date without a write
- **WHEN** Planned is activated by touch or keyboard
- **THEN** it opens the captured Planner day/week without reassigning, moving, completing, editing portions or inventing save-success feedback

### Requirement: Give the next permitted recipe action the primary accent

The next best enabled action SHALL use the established terracotta primary treatment with readable light text. An ordinary unplanned target emphasizes dated Plan; a confirmed planned recipe emphasizes Cook at top-left while Planned navigation stays white. Error, review and uncertain states SHALL retain their existing safe next action rather than granting mutation through color. Labels and semantics SHALL explain roles without color alone.

#### Scenario: Plan versus already planned
- **WHEN** detail changes from an ordinary unassigned target to a confirmed matching saved occurrence
- **THEN** the bottom changes from accent dated Plan with target arrows to white Planned without arrows, and Cook becomes the primary accented action in the top dock
- **AND** no body status duplicates the Planned control

#### Scenario: Error or unresolved outcome
- **WHEN** target resolution fails or an assignment needs reconciliation
- **THEN** the applicable safe Retry/Review action owns primary emphasis; disabled or unrelated actions cannot bypass the unresolved operation

### Requirement: Expose Find Similar without opening a menu

Loaded readable detail SHALL show one quiet labeled Find Similar action in its overview before Ingredients, outside both docks. It SHALL reuse the existing Similar function, current recipe identity and applicable navigation/draft guards, without a menu duplicate, ranking change or saved recipe/plan mutation. Rating → Notes → Ask the Family SHALL retain their ending order. Loading/edit/unavailable states SHALL retain existing eligibility.

#### Scenario: Discover and activate Similar from both entry points
- **WHEN** a loaded recipe is read from Planner or Recipes and Find Similar is activated
- **THEN** the existing Similar flow opens for that recipe without first opening the three-dot menu or writing recipe/plan state
- **AND** only one actionable Similar entry exists in detail, with its existing Search icon/localized label

#### Scenario: Keep notes and owned recovery safe
- **WHEN** notes contain a pending/failed draft or a planning operation owns unresolved state
- **THEN** Similar follows existing draft-retention/departure safeguards and cannot silently discard or bypass that state

#### Scenario: Bilingual and constrained layouts
- **WHEN** detail uses French, a 320 CSS px viewport, tablet or 200% text
- **THEN** the visible Similar label wraps legibly with a 48 CSS px target and keyboard focus, without adding a bottom action row or displacing required reading controls
