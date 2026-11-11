# Spec Delta

## MODIFIED Requirements

### Requirement: Replace supplied array instructions while retaining other metadata

On a successful authorized PATCH for an existing recipe, a revision-guarded instruction update SHALL replace canonical original step text while retaining stable unaffected identities; compatible recipeInstructions and recipe-info instructions SHALL derive from that content. Other raw metadata members SHALL be retained; dependent bindings SHALL be revalidated or invalidated with the same content revision. Stale/unversioned instruction writers SHALL receive atomic 409 without any partial update. Omitted/null instructions SHALL leave that member unchanged. The existing original-content detail editor SHALL support these edits without special markup or mandatory manual ingredient-to-step linking.

#### Scenario: Replace an instruction array
- **WHEN** an authorized PATCH supplies three instruction strings with first value Updated Step 1 and persistence completes
- **THEN** stored metadata and recipe-info instructions contain that three-element array with the first supplied value

#### Scenario: Retain unrelated instruction metadata
- **WHEN** a successful instruction PATCH updates valid object metadata containing other members
- **THEN** only its recipeInstructions member is replaced and the other raw members remain

#### Scenario: Preserve absent instruction updates
- **WHEN** a successful authorized PATCH omits instructions or supplies null
- **THEN** the existing recipeInstructions member remains unchanged

#### Scenario: Simultaneous ingredient and step edit
- **WHEN** ingredient and instruction writers use the same content baseline and one commits
- **THEN** the other conflicts with no partial mutation, retaining its draft for reconciliation

## ADDED Requirements

### Requirement: Reevaluate ingredient uses after saved recipe changes

The system SHALL automatically reevaluate affected ingredient-to-step relationships
after import or a committed ingredient or step change. It SHALL reuse valid
deterministic proof and MAY use an AI task through the existing workflow system
to propose relationships when necessary. Only server-validated relationships for
the current saved content SHALL become eligible for scaling; model confidence or
a provider validation label SHALL NOT establish proof.

#### Scenario: Ingredient edit changes a relationship
- **WHEN** a user saves an ingredient change that affects a step relationship
- **THEN** the saved facts remain authoritative, safe relationships follow the approved allocation rules, and unsafe affected proof becomes ineligible before later projection
- **AND** any required reevaluation uses those saved facts rather than older source quantities

#### Scenario: Step edit needs a new relationship
- **WHEN** a user saves changed step text whose ingredient use cannot be established by existing deterministic proof
- **THEN** the text remains readable and an eligible workflow may propose replacement relationships without requiring special syntax or manual linking
- **AND** only relationships passing the server's evidence and revision validation become eligible for scaling

#### Scenario: Unrelated or unchanged edit
- **WHEN** a save leaves ingredient and step semantics unchanged or changes only unrelated metadata
- **THEN** it does not launch an ingredient-use AI reevaluation

### Requirement: Guard automated relationship publication against newer edits

Reevaluation SHALL capture saved content and text revisions and preserve human
ingredients, steps, explicit clears and unrelated facts. Results SHALL publish
through the canonical guarded owner, without duplicate demand or partial semantic
updates. Repeated delivery SHALL be idempotent. A failed or uncertain evaluation
SHALL NOT undo the user's save or make unsafe relationships eligible for scaling.

#### Scenario: Newer edit precedes workflow completion
- **WHEN** reevaluation completes after another ingredient or step edit changes its captured content
- **THEN** the stale result cannot overwrite the newer content, restore cleared facts or install its relationships

#### Scenario: Provider fails or meaning remains ambiguous
- **WHEN** a relationship evaluation fails or cannot establish the ingredient association and numeric role
- **THEN** saved originals remain available, uncertain instruction wording stays original, and unrelated valid relationships remain usable

#### Scenario: Duplicate delivery during active cooking
- **WHEN** validated relationship publication is delivered again while a Cook session retains an earlier revision
- **THEN** the repeat creates no additional demand or semantic mutation
- **AND** the new ingredient/step projection is available through the existing explicit coherent refresh rather than silently replacing the active session
