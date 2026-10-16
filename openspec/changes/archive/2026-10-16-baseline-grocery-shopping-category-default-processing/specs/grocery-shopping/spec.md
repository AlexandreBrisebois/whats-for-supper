# Grocery shopping delta

## Purpose

Describe existing household grocery derivation and shopping progress, with explicit compatibility and recovery boundaries.

## ADDED Requirements

### Requirement: Request category suggestions only for uncached structured names

Ingredient categorization SHALL use distinct normalized structured supply names and request suggestions only for names absent from its category cache. With no uncached names it SHALL make no category-provider request.

#### Scenario: All names cached
- **WHEN** all structured names have category entries
- **THEN** no category-provider call is made

#### Scenario: Partly cached
- **WHEN** tomato is cached but chicken breast and heavy cream are not
- **THEN** one batch asks for chicken breast and heavy cream without tomato

### Requirement: Store valid category suggestions while preserving manual corrections

For supported returned ingredient keys, category processing SHALL persist suggestions with recognized section values in their canonical section spelling, discard blank keys or invalid sections, and retain existing manual corrections.

#### Scenario: Mixed validity
- **WHEN** suggestions include chicken breast in Meat and a name in NotARealSection
- **THEN** the valid category is stored and the invalid section entry is discarded

#### Scenario: Manual category exists
- **WHEN** a returned suggestion targets an existing manually corrected key
- **THEN** the manual correction is retained

#### Scenario: Legacy alias
- **WHEN** a supported suggestion uses section Uncategorized
- **THEN** its stored section is Grocery

### Requirement: Keep category-provider failure from blocking the processor completion path

For a valid recipe task payload, category-provider errors or unusable response JSON SHALL leave those suggestions unapplied and allow the categorization processor to return completion. Missing recipes or absent structured supply SHALL require no provider request.

#### Scenario: Provider failure
- **WHEN** the category provider throws during a valid task
- **THEN** the processor returns completion without saving a suggestion from that response

#### Scenario: Missing recipe
- **WHEN** the valid task names a recipe that is not stored
- **THEN** no category request is made
