# Spec Delta

## MODIFIED Requirements

### Requirement: Replace supplied array instructions while retaining other metadata

On a successful authorized PATCH for an existing recipe, a revision-guarded instruction update SHALL replace canonical original step text while retaining stable unaffected identities; compatible recipeInstructions and recipe-info instructions SHALL derive from that content. Other raw metadata members SHALL be retained; dependent bindings SHALL be revalidated or invalidated with the same content revision. Stale/unversioned instruction writers SHALL receive atomic 409 without any partial update. Omitted/null instructions SHALL leave that member unchanged. This SHALL NOT add an inline detail instruction editor.

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
