# Spec Delta

## ADDED Requirements

### Requirement: Persist extracted and synthesized recipe content as Schema.org Recipe

Background extraction, guided re-import repair, and description synthesis SHALL persist valid recipe content to `{id}/recipe.json` as a top-level `https://schema.org/Recipe` JSON document without `.publications` staging directories, and SHALL derive structured portion lines and bilingual grocery mappings tolerantly from `recipeIngredient` and optional `supply` entries without failing on casing, preposition, unit-alias, preparation-note, or unquantified-line differences.

#### Scenario: Tolerant portion derivation from Schema.org ingredient and supply differences

- **WHEN** photo, PDF, URL extraction, guided repair, or description synthesis returns valid `https://schema.org/Recipe` JSON whose `recipeIngredient` entries differ from `supply` in capitalization, `of`/`de`/`d'` prepositions, EN/FR unit aliases, or trailing preparation notes (such as `"500 g ground beef"` with `supply.name` `"Ground beef"`, `"30 ml of All-Purpose Flour"`, `"2 c. à soupe d'huile"`, or `"1 onion, diced"`)
- **THEN** the system persists top-level `https://schema.org/Recipe` JSON to `{id}/recipe.json` without creating a `.publications` directory and derives structured portion lines with exact rational quantities, units, shopping names, and bilingual grocery food mappings rather than deferring conversion or dropping mappings

#### Scenario: Unquantified ingredients remain readable without failing synthesis or extraction

- **WHEN** `https://schema.org/Recipe` output includes unquantified directions or prose ingredients (such as `"Salt"`, `"Pepper"`, or `"Juice of 1 lemon"`) alongside quantified ingredients
- **THEN** the unquantified lines are persisted with null numeric amounts and original text intact, quantified sibling lines remain scalable, and the workflow task succeeds

#### Scenario: Description synthesis advances through categorization to ready

- **WHEN** `goto-synthesis` completes synthesis, hero generation, sync, ingredient categorization, and recipe categorization for a described recipe
- **THEN** recipe categorization persists category, cuisine, meal types, and vegetarian classification without conflicting with finalization, and the readiness step marks the recipe ready and broadcasts `recipe_ready`

## MODIFIED Requirements

### Requirement: Generate recipe content from the submitted description

When description synthesis executes, the system SHALL request `https://schema.org/Recipe` content from the submitted description, persist the resulting `https://schema.org/Recipe` document to `{id}/recipe.json`, derive structured portion-scaling facts, and mark the recipe as synthesized. If the response cannot be parsed or has no usable recipe name, synthesis SHALL retain a minimal `https://schema.org/Recipe` document named from the submitted description with empty ingredients and instructions.

#### Scenario: Persist generated recipe content

- **WHEN** synthesis receives parseable `https://schema.org/Recipe` content with a usable name
- **THEN** it persists top-level `https://schema.org/Recipe` JSON to `{id}/recipe.json`, derives structured portion lines and step bindings in the database, and identifies the recipe as synthesized for subsequent processing

#### Scenario: Unusable synthesis response

- **WHEN** synthesis receives malformed recipe JSON or content with no usable name
- **THEN** it persists a minimal `https://schema.org/Recipe` document named from the submitted description with empty ingredients and instructions
- **AND** this fallback alone does not establish a complete cookable recipe
