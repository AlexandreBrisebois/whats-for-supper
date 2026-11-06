# Recipe ingredient contract delta

## Purpose

Own ordered original ingredient facts and their safe publication so recipe editing, reading, cooking and grocery derivation use the same saved measurements.

## ADDED Requirements

### Requirement: Own current ingredient facts in one ordered collection
A recipe SHALL expose one versioned current ingredient collection with stable line identity/order, free-text description, nullable amount and nullable unit. Its compatible strings and context-specific projections SHALL derive from those same facts. Retained extraction metadata SHALL remain evidence rather than an independent current writer. Serving basis SHALL remain independently nullable.

#### Scenario: Shared facts across contexts
- **WHEN** original, preview and captured dated consumers read a saved recipe
- **THEN** they use the same line identities, descriptions and original amounts with their existing context-specific target rules
- **AND** grocery derivation scales those unrounded original facts before grouping and conversion

#### Scenario: Metadata differs after a correction
- **WHEN** saved canonical facts differ from retained extraction supply
- **THEN** current reads use saved canonical facts and retain the extraction evidence without replaying it over the correction

### Requirement: Permit independently optional quantity fields
An ingredient SHALL allow amount and unit to be independently null. A nonempty row SHALL have a nonblank free-text description. Supplied amounts SHALL be finite and nonnegative; zero and unitless counts SHALL remain valid. Missing amount or unit alone SHALL NOT make an ingredient invalid, require a special phrase or create household report membership.

#### Scenario: Every optional-field combination
- **WHEN** rows contain 2 with no unit, g with no amount, neither amount nor unit, or both 200 and g, each with a description
- **THEN** Save and reopen preserve each supplied or absent value independently without inventing a number or unit

#### Scenario: Qualitative ingredients
- **WHEN** a row describes salt to taste, oil for frying or another legitimately unquantified ingredient
- **THEN** it remains valid without requiring a recognized keyword or an extra quantity-state field

#### Scenario: Invalid supplied amount
- **WHEN** a supplied amount is negative, non-finite or nonnumeric
- **THEN** validation rejects that input without publishing any part of the ingredient mutation

### Requirement: Preserve human facts and extraction evidence
Canonical publication SHALL preserve current manual descriptions, quantities and explicit null choices against stale extraction, reimport and conversion work. Unknown legacy authorship SHALL NOT be assumed machine-owned. Retained raw extraction content SHALL remain available as evidence, including original numeric and serving-yield evidence.

#### Scenario: Automatic work finishes after manual Save
- **WHEN** conversion or extraction work captured an older ingredient revision before a person saved a correction or cleared an amount
- **THEN** it cannot overwrite those saved facts and the original evidence remains retained

#### Scenario: Existing edited text disagrees with extraction
- **WHEN** legacy current text differs from retained extracted strings
- **THEN** conversion preserves current text and does not transfer measurements from the obsolete extraction by position

### Requirement: Convert trustworthy original facts conservatively
Supported legacy adapters SHALL preserve current wording/order and only unambiguously associated original measurements. They SHALL NOT infer quantities from arbitrary prose, scaled displays, positional supply matching or guessed serving basis. Conversion SHALL preserve reliable numeric amounts even with an unknown basis. A safe representation SHALL retain preparation/package wording and avoid duplicated quantity text.

#### Scenario: Known original amount with unknown basis
- **WHEN** coherent original evidence associates 200 g with pasta but serving basis is null
- **THEN** supported conversion retains 200 g and null basis rather than losing the amount or treating a dated display as its source

#### Scenario: Untrusted or ambiguous association
- **WHEN** legacy rows are duplicated, reordered or changed so a supply association is not provable
- **THEN** their current descriptions/order and evidence remain retained without guessed numeric transfers

#### Scenario: Trusted facts cannot be represented safely
- **WHEN** an adapter cannot preserve both a trustworthy original measurement and current wording without duplication or rewriting
- **THEN** canonical conversion is deferred for that recipe with an explicit conflict outcome and the legacy read adapter remains available until explicit reconciliation

### Requirement: Guard resumable canonical publication
Per-recipe conversion and canonical publication SHALL compare the captured ingredient revision before atomically publishing. Successful unchanged retries SHALL be idempotent. Before conversion the supported legacy read adapter owns current reads; after conversion canonical facts alone own them. Explicit empty collections and null facts SHALL not revive legacy values.

#### Scenario: Recipe changes during conversion
- **WHEN** a person changes ingredients after conversion inspection but before publication
- **THEN** the stale conversion does not overwrite the newer recipe and reports a conflict for reconciliation

#### Scenario: Retry a completed conversion
- **WHEN** an unchanged successfully converted recipe is processed again
- **THEN** its identities, facts and human protection remain equivalent without duplicate rows or a new correction

#### Scenario: Explicitly cleared collection
- **WHEN** a person saves an empty canonical collection while retained metadata still contains supplies
- **THEN** subsequent original, dated, grocery and recovery reads do not revive those old supplies

### Requirement: Preserve compatible recovery before write cutover
Canonical write activation SHALL retain supported legacy adapters and verified full-fidelity recovery for current rows, revisions, evidence, protection, explicit nulls and the separate basis. A legacy or malformed input SHALL NOT silently erase richer current facts. Ordinary privacy-scrubbed sharing SHALL not claim that recovery fidelity.

#### Scenario: Richer saved facts meet older content
- **WHEN** a legacy merge lacks current structured facts or human protection
- **THEN** current richer facts are preserved or an explicit ingredient conflict is reported rather than being silently erased
