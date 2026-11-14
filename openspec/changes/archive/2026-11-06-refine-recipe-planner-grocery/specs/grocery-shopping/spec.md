## MODIFIED Requirements

### Requirement: Keep incomplete grocery scaling visible

Unreliable basis, amount or source coherence SHALL retain concise review feedback. Intentional unquantified directions remain ordinary text. Known compatible contributions can be summed, but a partial subtotal SHALL be visibly incomplete with unresolved contributors inspectable. No invented amount, mass/volume inference, package rounding or pantry knowledge SHALL be implied.

#### Scenario: Known pasta plus unresolved pasta contribution
- **WHEN** one planned recipe contributes known pasta and another has an unresolved amount
- **THEN** the row retains a visible uncertainty warning and labels the numeric subtotal as known/incomplete rather than the full requirement
- **AND** recipe contributors remain accessible through the separate recipe-book disclosure

## ADDED Requirements

### Requirement: Disclose contributor recipe titles independently of shopping actions

Recipe-derived grocery rows with contributors SHALL offer a compact recipe-book disclosure listing their source recipe titles, without repeated generic Review recipe wording. Expansion SHALL remain separate from shopping checks and the existing aisle tag control. Rows without contributors SHALL not invent source recipes. Duplicate occurrences of one recipe SHALL not duplicate its title.

#### Scenario: Inspect ordinary complete ingredient sources
- **WHEN** a complete pasta row has two contributor recipes and its recipe-book control is activated
- **THEN** their real titles are revealed, with no grocery write, check change or aisle change

#### Scenario: Source recipe repeated or missing title
- **WHEN** a recipe contributes on two dates, or its title cannot be obtained
- **THEN** it is listed once and a missing title uses the honest localized Recipe title unavailable fallback rather than a fabricated name or Review recipe number
- **AND** a known recipe identity retains its original-review link; absent identity is not made into a link

#### Scenario: No recipe contributors
- **WHEN** a manual extra or legacy row has no contributor identity
- **THEN** no source title or fictitious recipe link is shown and any applicable quantity warning remains visible

### Requirement: Reuse loaded titles and resolve missing contributors lazily

Source disclosure SHALL use loaded Planner names first and resolve missing titles through the existing recipe GET only when needed for an open disclosure. Duplicate contributor IDs SHALL share an in-flight read. Loading and unavailable states SHALL remain honest and nonblocking. Results SHALL belong to the selected absolute week/session and current contributors, without new grocery-response title fields.

#### Scenario: Loaded supper titles need no extra lookup
- **WHEN** the selected week's contributor recipes already have nonblank names in Planner
- **THEN** expanding sources shows those names immediately without extra recipe-detail requests

#### Scenario: Lunch-only contributor is absent from supper cards
- **WHEN** a grocery contributor has a recipe-bearing other-meal entry but no supper card in the loaded week
- **THEN** expanding its sources resolves the missing name through the existing recipe GET while retaining the ingredient's quantity and warning state
- **AND** duplicate references to that ID across rows or occurrences share one in-flight request

#### Scenario: Grocery live refresh introduces another contributor
- **WHEN** an independent grocery refresh updates source IDs while loaded Planner cards remain unchanged
- **THEN** an open disclosure uses loaded names for matching IDs and lazily resolves newly missing IDs
- **AND** results for contributors no longer present cannot reappear in that disclosure

#### Scenario: Change week or session during title resolution
- **WHEN** a missing-title read remains pending and the selected absolute week or household/demo session changes
- **THEN** the old result cannot populate the new disclosure or replace its names, checks or quantities

#### Scenario: Lookup fails or returns no usable title
- **WHEN** a missing-title read fails, returns not found or has a blank title
- **THEN** the disclosure shows the localized unavailable-title fallback, retains any known-ID original-review link and does not block shopping
- **AND** requests do not loop automatically; a later deliberate reopen can retry

#### Scenario: Authoritative Planner names change
- **WHEN** a subsequent schedule read supplies a current nonblank name for a contributor already resolved lazily
- **THEN** the current Planner name takes precedence over that disclosure session's cached name without grocery recomputation

### Requirement: Distinguish incomplete totals from prior unknown checked amounts

Collapsed disclosure SHALL not hide quantity warnings. `quantityComplete=false` SHALL identify a displayed numeric amount as a known subtotal. `prior_amount_unknown` SHALL retain its prior-check review meaning independently of completeness; a now-complete current amount remains a full total. Opening sources or recipes SHALL not acknowledge or clear either condition.

#### Scenario: Prior unknown amount is now complete
- **WHEN** a checked row has prior_amount_unknown and a complete current 600 g total
- **THEN** the row retains prior-check review feedback and displays 600 g as the full current amount rather than an incomplete subtotal
- **AND** opening/closing sources or following a recipe link does not clear that marker

#### Scenario: Both warning conditions occur
- **WHEN** a row is incomplete and also has prior_amount_unknown
- **THEN** the subtotal and prior-check meanings both remain understandable without duplicate generic calls to review

#### Scenario: Explicit shopping acknowledgement
- **WHEN** the person explicitly submits a positive check for the affected name
- **THEN** the existing check acknowledgement policy can clear its prior-unknown marker without falsely claiming incomplete quantities are resolved
- **AND** unrelated checks and warnings retain their existing state

### Requirement: Preserve original quantity inspection from grocery sources

Each source link SHALL open the identified recipe in original-quantity review, retaining the reviewAmounts meaning independently of current planned portions or temporary recipe previews. Source consultation SHALL not plan a recipe, alter groceries or silently substitute dated quantities. Missing/deleted recipe access SHALL fail honestly without inventing content.

#### Scenario: Planned recipe for six opens original basis two
- **WHEN** its title is activated from groceries
- **THEN** detail opens the original two-serving ingredient evidence, retaining access to original source material
- **AND** no automatic date recommendation exposes an assignment action in this review context

#### Scenario: Return after source consultation
- **WHEN** the person closes original review and returns to groceries
- **THEN** the selected week, grocery checks and available list state are retained without a read-triggered recomputation

### Requirement: Make source disclosure accessible and quiet

The recipe-book control SHALL have a localized ingredient-specific accessible name, expanded state and associated source region. It SHALL remain keyboard operable with visible focus and a 48 CSS px target, visually distinct from the checkbox and aisle tag. Titles and warnings SHALL wrap legibly at 320 CSS px, 200% text and English/French phone/tablet layouts.

#### Scenario: Keyboard and long French titles
- **WHEN** a person expands sources by keyboard in a narrow French layout
- **THEN** focus stays on the control, expanded state updates, links follow in reading order and long titles wrap without obscuring checks, totals or aisle actions
