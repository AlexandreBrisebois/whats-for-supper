# Spec Delta

## Purpose

> **Superseded, unimplemented — 2026-11-07.** Do not apply this separate ingredient-candidate proposal. Its tasks remain unchecked as historical planning. Use canonical guarded import/reprocessing plus manual correction. Existing user recipe flags, Report/Review issue and eligible repair triggers remain supported, including their safety and retry safeguards. See [replacement foundation](../../../canonical-ingredient-correction/proposal.md). No archive or main-spec sync has occurred.

Assist explicit ingredient correction using selected source evidence while keeping generated candidates separate from authoritative saved recipe facts.

## ADDED Requirements

### Requirement: Select source repair only for evidenced gaps
Repair SHALL target genuinely missing/conflicting source facts, excluding usable current facts and valid unquantified content. Each attempt SHALL identify its selected recipe/lines, captured revisions, source artifact/version and extraction configuration. Retained originals are preferred; live URL replacement is an explicit source choice. Generated heroes or synthesis guesses SHALL NOT substitute for missing ingredient evidence.

#### Scenario: Known amount alongside an unresolved line
- **WHEN** one ingredient has a usable accepted amount and another has an evidenced source gap
- **THEN** repair targets the gap without re-extracting or replacing the usable current fact

#### Scenario: Missing trustworthy source
- **WHEN** a needed fact has no usable original source or only a decorative/generated food image
- **THEN** the operation retains current content and identifies human correction instead of inventing recipe quantities

### Requirement: Generate ingredient candidates without live recipe publication
Selective extraction SHALL produce a staged ingredient candidate, not run whole-recipe re-import as publication. Generation SHALL leave live ingredients, basis, metadata, recipe files, hero, instructions and household state unchanged. Provider failure or cancellation SHALL retain current content and record a resumable attempt outcome without implying a corrected recipe.

#### Scenario: Candidate generation succeeds
- **WHEN** selected-source extraction returns suggested missing quantities
- **THEN** the suggestions are stored separately with their captured inputs and no current recipe or asset is replaced

#### Scenario: Whole import machinery is reused internally
- **WHEN** source loading, PDF preparation, prompt selection or provider infrastructure is reused
- **THEN** the ingredient-only path cannot execute hero generation or unconditional recipe.json/sync publication as an incidental step

### Requirement: Validate candidate evidence and membership before acceptance
Candidate validation SHALL check complete intended line membership/order, identities, legal amounts/units/basis, source association and coherent text/facts. Provider confidence alone SHALL NOT certify correctness. A valid observation needing no current correction SHALL be no-action. Unverified or conflicting proposed changes SHALL remain staged for correction rather than silently alter live facts.

#### Scenario: Confident but conflicting provider output
- **WHEN** a high-confidence candidate assigns a number to the wrong line, rewrites a package size or replaces a human value
- **THEN** validation does not authorize publication and the affected correction remains explicit

#### Scenario: Unquantified observation needs no correction
- **WHEN** source assessment confirms a legitimate qualitative ingredient and proposes no needed current fact change
- **THEN** it creates no numeric correction flag merely because the amount is absent

### Requirement: Accept corrections through revision-guarded Edit and Save
Existing-recipe candidate corrections SHALL be explicitly accepted through recipe Edit/Save. Publication SHALL recheck current ingredient/basis revision, source identity and human protections atomically. A stale candidate or draft SHALL conflict without overwriting newer state. Accepted fields and their evidence/protection SHALL persist with current validation; unresolved remaining issues stay explicit.

#### Scenario: Worker finishes after human Save
- **WHEN** a candidate captured before a human correction finishes later
- **THEN** it cannot overwrite the saved correction, clear its flags or install its old validation result

#### Scenario: Accept part of a candidate
- **WHEN** a person saves selected corrections while leaving other evidenced issues unresolved
- **THEN** only accepted facts become current and remaining issues remain searchable against the new revision

#### Scenario: Unrelated recipe update
- **WHEN** notes or rating is saved without accepting ingredient changes
- **THEN** that save does not publish a candidate or acknowledge ingredient correction work

### Requirement: Resume selected repair without replaying publication
Selected repair SHALL retain resumable per-recipe attempt outcomes separately from generation, acceptance and downstream refresh. Failure/cancellation preserves saved content and prior committed progress. Retrying changed input SHALL re-assess current revisions; verification SHALL NOT call providers or treat candidate creation as saved correction.

#### Scenario: Provider failure after stage 2 conversion
- **WHEN** selected-source extraction fails for an already converted recipe
- **THEN** its canonical facts remain unchanged and the attempt is failed or pending without claiming correction completed

#### Scenario: Changed source during retry
- **WHEN** a retained attempt encounters a source or ingredient revision newer than its captured input
- **THEN** it records changed/deferred work and re-assesses rather than replaying an older suggestion

### Requirement: Keep candidate acceptance inside deliberate correction
Candidate selection SHALL use existing recipe Edit and revision-guarded Save. Reads, Cook, rating, notes and source consultation SHALL NOT accept candidates. Only accepted fields become current; unresolved remaining reasons remain searchable. Candidate work SHALL NOT resolve independent household reports, change import readiness or add a generic normal-reading warning.

#### Scenario: Save only selected suggestions
- **WHEN** a person accepts one candidate amount and leaves another conflict unresolved
- **THEN** only the accepted fact and explicit draft edits are published under the current ingredient and source revisions
- **AND** remaining reasons stay searchable without clearing Reported or ReadyToReview membership

#### Scenario: Consultation is read-only
- **WHEN** a cook opens an original source or a person saves notes without accepting candidate facts
- **THEN** no candidate is published and existing cooking position, checks and completion context retain their owners

### Requirement: Recover candidate relationships without launching source work
Full-fidelity recovery SHALL preserve candidate/source revision relationships and incomplete attempt outcomes. Restored candidates SHALL be revalidated against restored canonical facts before acceptance. Recovery SHALL NOT automatically invoke providers or turn pending suggestions into current ingredients. Lower-fidelity share bundles SHALL exclude private repair state.

#### Scenario: Restore a pending candidate
- **WHEN** a compatible backup restores a candidate awaiting acceptance
- **THEN** it remains pending, linked to its captured evidence and current validation, without live publication or automatic extraction

#### Scenario: Restored candidate is stale
- **WHEN** restored current ingredients or source facts differ from the candidate's captured revisions
- **THEN** the candidate requires reconciliation or regeneration and cannot overwrite restored human edits
