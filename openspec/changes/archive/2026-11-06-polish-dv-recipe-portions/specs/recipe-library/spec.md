## MODIFIED Requirements

### Requirement: Place appreciation near recipe identity

Viewing detail SHALL place existing Dislike, Like and Love after instructions, evenly spaced as borderless choices rather than outlined chips. Localized labels, accessible names, visible selected state and existing editing rules SHALL remain. Optional rating SHALL stay distinct from GOTO, votes and cooking completion. Selection SHALL not depend on faint opacity or color alone.

#### Scenario: Recognise appreciation before planning
- **WHEN** a recipe with a saved rating opens
- **THEN** the ending Rating section shows its saved selection and three evenly spaced operable choices with readable labels and visible focus

#### Scenario: Plan without rating
- **WHEN** the recipe is unrated
- **THEN** planning remains available without choosing a rating

### Requirement: Keep household details after recipe reading

Detail SHALL end with Rating, Notes and Ask the Family. Notes SHALL use one labeled directly writable field without a surrounding card, duplicate visible heading or Add button. Existing debounce, acknowledgements, latest-draft retention, clear/save-empty and retry behavior SHALL remain. Secondary management actions SHALL retain existing permissions and availability.

#### Scenario: Return to useful notes
- **WHEN** saved notes or a retained failed-save draft exists
- **THEN** the single field contains it, with quiet Saving/Saved acknowledgement or explicit failure and Retry save

#### Scenario: Start or clear notes
- **WHEN** notes are empty or the final text is deleted
- **THEN** the field remains directly writable while empty-value persistence is pending, without an Add button

#### Scenario: Secondary management
- **WHEN** a person wants to edit or report an issue
- **THEN** named recipe actions expose those operations under their existing rules without competing with planning

### Requirement: Keep original evidence readable independently of hero imagery

Eligible View Original SHALL remain lower right on the hero as a warm translucent rounded capsule with readable text/icon and focus against actual imagery. Missing/failed imagery SHALL retain source access on an honest neutral fallback. Existing source URL/photo eligibility, destination, draft preservation and focus-return behavior SHALL remain. Visual restoration SHALL not reinstate insufficient contrast.

#### Scenario: Light photograph or missing hero
- **WHEN** the hero is bright, dark, missing or fails
- **THEN** View Original remains readable and operable at the hero's lower right or neutral fallback, with at least a 48 CSS px target

### Requirement: Make detail actions reflect their entry context

Detail SHALL preserve dated planning/recovery and source-date identity. When dated Plan is available, it and Change day SHALL be separate adjacent controls, with only change arrows visible on Change day. Change day SHALL retain a localized accessible name, a localized tooltip and a target of at least 48 CSS px; the compact control leaves space for the long dated Plan label. Cook SHALL remain distinct with the existing instructions icon; no Steps action SHALL return. Planner-origin detail SHALL retain Cook and intentional Plan another day. Reading and preview SHALL never assign or complete a meal.

#### Scenario: Read from a saved Planner meal
- **WHEN** a planned recipe opens from its dated Planner card
- **THEN** detail identifies the date, offers Cook and Plan another day, and closing returns to the same week without schedule mutation

#### Scenario: Plan for a day
- **WHEN** a valid dated assignment is available
- **THEN** Plan for the explicit date and Change day appear beside each other, with only ArrowRightLeft visible on Change day, its localized accessible name and at least 48 CSS px target intact, and Cook remains a distinct secondary action
- **AND** narrow/large-text layouts reflow within the action area without shrinking targets below 48 CSS px
- **AND** Plan another day retains Home's quieter Change Plan treatment where applicable

#### Scenario: Pending or recovery footer
- **WHEN** checking, assignment, uncertain persistence, conflict or staged recovery is active
- **THEN** existing loading, retry, review and recovery actions remain reachable without duplicate writes or a misleading enabled Plan
- **AND** changing the visual arrangement does not permit the target to change during an operation that owns it

#### Scenario: Prepared or legacy completed occurrence
- **WHEN** a completed occurrence opens
- **THEN** instructions remain readable without another completion prompt, only known preparation metadata is shown and a preview does not replace frozen context

#### Scenario: Edit, read-only review or unavailable recipe
- **WHEN** editing, original review, loading or failed detail is active
- **THEN** Save/Cancel, source review, retry and close retain their roles; a grocery-source Plan transition requires deliberate activation before normal planning is exposed

## ADDED Requirements

### Requirement: Retain explicit preview intent through background loading

A selected 2/4/6 preview SHALL survive routine schedule/grocery reads, unchanged refresh and app resume for the same recipe and planning target. Relevant input changes SHALL refresh that target preview without showing stale quantities as current. Changing recipe, deliberately changing day or returning to original/planned quantities SHALL reset selection. Late results SHALL not cross those boundaries.

#### Scenario: Tap during initial schedule reads
- **WHEN** two is selected before background schedule loading finishes
- **THEN** two remains selected and its matching ingredients or honest loading/error state remain visible after those reads

#### Scenario: Refresh and recipe correction
- **WHEN** a selected six preview is resumed or the same recipe's saved basis/ingredients changes
- **THEN** six remains the requested target, a fresh version is obtained as needed, and obsolete lines are not labeled as the new result
- **AND** failure offers retry or return without modifying saved plan, portions, groceries or preparation

#### Scenario: Deliberately change recipe or date
- **WHEN** detail changes identity or the person changes the proposed date
- **THEN** the preview resets to that new recipe/date's default context and late prior results cannot restore it

### Requirement: Expose original evidence without a duplicate serving list

Detail SHALL show a known original yield as quiet plain context and SHALL remove the duplicate Serving details ingredient list. Original quantities SHALL remain deliberately reachable when projected values differ or warning review needs them, without showing two identical ingredient lists. Unknown yield SHALL remain honest with the existing correction route. Source access and completeness warnings SHALL remain separate.

#### Scenario: Original and unresolved reading
- **WHEN** the displayed ingredients already are the original strings
- **THEN** no Serving details list repeats them; known original yield remains identifiable and unresolved feedback is visible

#### Scenario: Inspect original from a scaled preview
- **WHEN** two portions are previewed from an original four and Original quantities is activated
- **THEN** original yield and ingredient text replace the preview, without a second simultaneous ingredient list or saved-state change

#### Scenario: Missing original yield or warning
- **WHEN** yield is missing or a grocery quantity warning led to detail
- **THEN** original text/source remains inspectable with honest yield/correction feedback, and removing the duplicate list does not hide the warning's evidence

### Requirement: Enter planning deliberately from grocery source review

A recipe opened from a grocery source SHALL initially retain original-quantity review and offer a clearly labeled Plan transition. Activation SHALL enter ordinary dated planning for that recipe with fresh target checks; it SHALL not assign by itself. Original evidence, drafts and the route back to the source week SHALL remain available. Cook remains distinct. Failed target resolution SHALL expose retry rather than stale Plan.

#### Scenario: Grocery review initially shows original evidence
- **WHEN** a source recipe opens with reviewAmounts context
- **THEN** original quantities appear with Cook and Plan transition available, without an automatic assignment or silently substituted dated quantities

#### Scenario: Explicit Plan transition
- **WHEN** Plan is activated from that review
- **THEN** normal proposed-date resolution runs, then dated Plan and Change day become available under existing empty/occupied/non-cooking/completed/voting guards
- **AND** no write occurs until a separately activated permitted assignment action

#### Scenario: Close or target check fails
- **WHEN** the target check fails or detail is closed before assignment
- **THEN** failure retains retry and original access, while closing restores the grocery week and shopping state without a write
