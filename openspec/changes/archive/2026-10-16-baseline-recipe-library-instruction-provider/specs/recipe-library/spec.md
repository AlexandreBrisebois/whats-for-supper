# Spec Delta

## ADDED Requirements

### Requirement: Read stored array instructions through recipe detail

For an available recipe, successful detail reading SHALL expose an array-valued recipeInstructions member parsed from persisted raw metadata. Missing, blank, malformed metadata or an absent member SHALL expose null. Existing detail response ownership SHALL apply.

#### Scenario: Read a stored instruction array
- **WHEN** available recipe metadata contains recipeInstructions as an array and detail reading succeeds
- **THEN** the returned recipe exposes that array without applying sharing-export section transformation

#### Scenario: Read without usable instruction metadata
- **WHEN** available recipe metadata is blank, malformed or lacks recipeInstructions and detail reading succeeds
- **THEN** recipeInstructions is null

### Requirement: Replace supplied array instructions while retaining other metadata

On a successful authorized PATCH for an existing recipe, a non-null instruction array SHALL replace the recipeInstructions member in persisted raw metadata and the recipe-info representation. Other raw metadata members SHALL be retained. Omitted/null instructions SHALL leave that member unchanged. This SHALL NOT add an inline detail instruction editor.

#### Scenario: Replace an instruction array
- **WHEN** an authorized PATCH supplies three instruction strings with first value Updated Step 1 and persistence completes
- **THEN** stored metadata and recipe-info instructions contain that three-element array with the first supplied value

#### Scenario: Retain unrelated instruction metadata
- **WHEN** a successful instruction PATCH updates valid object metadata containing other members
- **THEN** only its recipeInstructions member is replaced and the other raw members remain

#### Scenario: Preserve absent instruction updates
- **WHEN** a successful authorized PATCH omits instructions or supplies null
- **THEN** the existing recipeInstructions member remains unchanged
