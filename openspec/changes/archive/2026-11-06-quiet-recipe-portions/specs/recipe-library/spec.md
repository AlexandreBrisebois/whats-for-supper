## MODIFIED Requirements

### Requirement: Preview two four or six portions without saving

With a valid original yield, detail SHALL offer 2, 4 and 6 as immediate ingredient-only previews, clearly identifying the selected count and temporary meaning. The default remains the dated projection or original basis; returning to it SHALL be available. Preview SHALL NOT change saved portions, groceries, rating, preparation, cooking checks or completion context.

#### Scenario: Preview four for Friday planned for six
- **WHEN** a two-serving recipe with reliable 200 g pasta is planned for six and four is selected
- **THEN** the preview shows 400 g while Friday remains planned for six and groceries remain based on six
- **AND** returning to planned quantities shows 600 g without a write

#### Scenario: Unknown yield or unreliable amount
- **WHEN** original yield is missing or an ingredient cannot reliably scale
- **THEN** an unknown yield offers explicit Set recipe portions through recipe editing and no fabricated preview, while unreliable lines retain original text without a generic review warning or replacement cue
- **AND** intentionally unquantified text remains ordinary content

#### Scenario: Yield correction is cancelled or fails
- **WHEN** original-yield editing is cancelled or saving fails
- **THEN** preview does not assume the unsaved basis and the existing editor retains its Cancel/failure recovery
- **AND** saving a correction is identified as a saved recipe change, distinct from a temporary preview

#### Scenario: Rapid selections or changed identity
- **WHEN** two, six and four are selected before responses return, or recipe identity changes
- **THEN** only the current recipe and latest selection can install a preview, with retry on failure and no stale amount presented as current

#### Scenario: Cook after a temporary preview
- **WHEN** Cook is activated after an ingredient preview
- **THEN** cooking receives its existing dated/frozen or standalone context rather than the temporary count

### Requirement: Expose original evidence without a duplicate serving list

Detail SHALL keep one ingredient list and disclose original basis after a changed preview or explicit original inspection, rather than repeat it on initial reading. Original inspection SHALL remain reachable without a write, including dated/prepared and grocery-source review. Default original-access controls SHALL be progressive, not permanent exposition. Unknown yield retains explicit correction; generic amounts-review copy SHALL have no replacement warning cue.

#### Scenario: Original and unresolved reading
- **WHEN** the displayed ingredients already are the original strings
- **THEN** no Serving details list repeats them; ordinary default reading omits repeated original-basis exposition and generic review feedback, while deliberate original inspection identifies its basis when known

#### Scenario: Inspect original from a scaled preview
- **WHEN** two portions are previewed from an original four and Original quantities is activated
- **THEN** original yield and ingredient text replace the preview, without a second simultaneous ingredient list or saved-state change

#### Scenario: Missing original yield or warning
- **WHEN** yield is missing or a grocery quantity warning led to detail
- **THEN** original text/source remains inspectable with honest yield/correction feedback, and removing the duplicate list does not hide the warning's evidence

#### Scenario: Default dated access and changed preview
- **WHEN** ordinary dated detail opens before any preview change
- **THEN** its effective count remains beside Ingredients, repeated date/portion exposition is absent, and original inspection is available in the overflow menu when applicable
- **AND** after a changed preview the relevant original inspection is inline instead of duplicated in that menu; it replaces the same list without saving

#### Scenario: Grocery original review and prepared context
- **WHEN** grocery-source original review or a prepared occurrence is opened
- **THEN** the owned original-review context or actual preparation facts remain identifiable without false preview or planning authority
- **AND** grocery original review retains its known source date once when its plain Plan transition does not already identify that date; ordinary dated detail does not regain a duplicate date/portion paragraph
- **AND** original inspection is available even when the current recipe lacks a basis eligible for temporary previews

## ADDED Requirements

### Requirement: Reveal portions explanation after a deliberate reading change

Ordinary detail SHALL show one effective Ingredients count and eligible 2/4/6 controls without persistent basis/scaling exposition or a repeated date/portions paragraph. A changed temporary preview SHALL reveal its basis and concise unsaved meaning. Returning to default SHALL collapse that context. Actual preparation facts, scoped loading/errors, retry and saved-basis editor consequences SHALL remain explicit.

#### Scenario: Change six without changing a meal
- **WHEN** original basis four is read and six is explicitly previewed
- **THEN** Ingredients identifies six, the selected control is pressed, a compact explanation identifies original four and temporary meaning, and original inspection/return are reachable
- **AND** no saved count, grocery state or cooking context changes; an entirely unscalable response does not claim that all ingredient amounts adjusted

#### Scenario: Same count and return to default
- **WHEN** an explicit selection matches a confirmed default count, or Return is activated
- **THEN** default reading is restored without an unnecessary changed-preview explanation or saved-state mutation
- **AND** a background default read does not retrospectively cancel a preview selected while that default was still loading

#### Scenario: Dated preview equal to original basis
- **WHEN** a four-serving recipe defaults to five dated portions and four is explicitly previewed
- **THEN** that is still a temporary reading change with a return to five; no scaling factor different from one or changed saved plan is claimed

#### Scenario: Missing original basis correction
- **WHEN** current recipe basis is missing and Set recipe portions is activated
- **THEN** the existing recipe editor opens at its original-basis field, with saved-change meaning explained there and existing Save/Cancel/validation/failure handling
- **AND** family size, dated portions and unsaved edits do not become an invented recipe basis

#### Scenario: Bilingual constrained reading
- **WHEN** this section is used in English/French on a 320 CSS px phone, tablet, short viewport or 200 percent text
- **THEN** count, preview and progressive original controls remain keyboard operable with readable labels/state, visible focus and 48 CSS px targets without overlap or horizontal scroll

#### Scenario: Specific instruction amounts during changed preview
- **WHEN** a changed preview actually scales at least one reliable ingredient with a factor different from one
- **THEN** existing specific guidance that instruction amounts remain original is available with that preview context
- **AND** ordinary default reading, factor-one previews and entirely unscaled results do not add that exposition or claim changed step quantities
