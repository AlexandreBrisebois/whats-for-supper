# recipe-rotation Specification

## Purpose

Coordinate cooked cooldown, persistent household rotation intent and supper suitability through existing Discovery and nightly Dreaming surfaces.

## Requirements

### Requirement: Reconcile cooked cooldown through Dreaming

Dreaming SHALL evaluate current cooked date, cooldown configuration, Human-off intent and supper suitability, then persist Discovery eligibility. Cooking, clock advancement and reads SHALL NOT recompute cooldown. A recipe without a cooked date SHALL mean never eaten for this algorithm and incur no cooked cooldown.

#### Scenario: Cooked since prior run
- **WHEN** A is cooked after a successful Dreaming pass
- **THEN** reads retain persisted state until the next pass; that pass evaluates A using its then-current date

#### Scenario: Never eaten
- **WHEN** A has no cooked date
- **THEN** Dreaming applies no cooked cooldown, without asserting knowledge of unrecorded real-world meals

#### Scenario: Elapsed but not reconciled
- **WHEN** A ages beyond cooldown while Dreaming is delayed
- **THEN** it returns only after a successful reconciliation, not at an implied exact timer deadline

### Requirement: Keep rotation reasons independent

Persisted cooked-cooldown state, explicit persistent out-of-rotation intent and explicit supper suitability SHALL remain distinguishable. Cooldown expiry SHALL not reverse explicit persistent exclusion or unsuitable status. Quick Find SHALL consume effective persisted cooked suppression, not raw recency or a generic Discovery-off boolean.

#### Scenario: Explicit persistent exclusion survives
- **WHEN** an explicitly kept out of rotation recipe ages out of cooldown
- **THEN** it remains outside Discovery

#### Scenario: Quick Find reason
- **WHEN** A is Discovery-off solely by manual choice and B by cooked cooldown
- **THEN** the new cooldown gate excludes B; it does not newly exclude A from history/live-liked pools

#### Scenario: Unsuitable return
- **WHEN** an unsuitable recipe ages out
- **THEN** it remains outside supper Discovery while Library access remains

### Requirement: Offer immediate explicit return with honest consequences

Explicit Human ON SHALL clear Human-off intent and effective cooked suppression immediately for a supper-suitable recipe. Current-plan visibility SHALL still apply. The next successful Dreaming pass SHALL reconsider cooked facts and may suppress it again; Human ON SHALL NOT create a permanent cooldown exemption.

#### Scenario: Early return
- **WHEN** a person turns a suitable cooled recipe on
- **THEN** its cooldown suppression clears immediately and the next successful pass can reapply it

#### Scenario: Human off then on
- **WHEN** a person turns a Human-off recipe on
- **THEN** Human-off clears without requiring a second action and current-plan visibility still applies

#### Scenario: Unsuitable return
- **WHEN** Human ON is requested for an explicitly unsuitable recipe
- **THEN** validation rejects it without partial mutation and explains suitability

#### Scenario: No vote-close expiration
- **WHEN** voting closes after Human ON
- **THEN** close does not expire the return; Dreaming owns cooked reconsideration

### Requirement: Honor explicit supper suitability

Supper Discovery SHALL include recipes explicitly suitable for supper, including qualified Lunch recipes, and exclude explicitly unsuitable recipes. Category inference SHALL not override explicit household intent. Ordinary Library, direct detail, manual planning and existing GOTO Home access SHALL remain available.

#### Scenario: Lunch suitable for supper
- **WHEN** a Lunch recipe is explicitly supper-suitable and otherwise eligible
- **THEN** it can appear in Supper Discovery

#### Scenario: Not every lunch
- **WHEN** a Lunch recipe lacks supper qualification
- **THEN** its category alone does not establish suitability

#### Scenario: Breakfast for supper
- **WHEN** a household explicitly qualifies a breakfast-category recipe for supper
- **THEN** category alone does not exclude it

#### Scenario: Search access
- **WHEN** a recipe is out of rotation or unsuitable for supper
- **THEN** ordinary Search/Browse remain available under existing explicit filters

### Requirement: Recover repeated and partial Dreaming work safely

Repeated Dreaming evaluation of unchanged facts SHALL converge to the same persisted result. A failed or partial run SHALL report incomplete work; later successful processing SHALL reevaluate current facts. An older evaluation SHALL not overwrite a newer rotation intent, cooked correction or recipe state.

#### Scenario: Partial batch
- **WHEN** A commits and B fails during a run
- **THEN** A remains committed; B is not reported reconciled; retry reevaluates both safely

#### Scenario: Concurrent manual change
- **WHEN** a person excludes A after a worker read but before its write
- **THEN** the stale write cannot re-enable A; the worker rereads or leaves it for retry

#### Scenario: Concurrent cooking
- **WHEN** A is cooked again while an old evaluation plans to restore it
- **THEN** the stale restoration does not override the newer cooking facts

#### Scenario: Undo cooking
- **WHEN** the authoritative cooked date is corrected or cleared
- **THEN** next successful Dreaming uses the corrected value without inventing a new cooking event

#### Scenario: Duplicate scheduling
- **WHEN** two workflow deliveries process the same recipes
- **THEN** idempotent persistence and current-fact checks prevent conflicting final results

### Requirement: Explain rotation through existing controls

Existing recipe controls and Family Guide SHALL explain purpose, activation, consequences and recovery for history and cooldown. Controls SHALL have accessible names, pending/error feedback and recoverable state. This change SHALL add no history screen, shelf, badge, individual profile or new user tuning knob.

#### Scenario: Pending action fails
- **WHEN** a manual rotation action fails
- **THEN** the control retains or restores confirmed state and offers retry without claiming success

#### Scenario: Understand return
- **WHEN** a person finds a cooled recipe in existing detail
- **THEN** help explains temporary return and next successful nightly reconciliation

#### Scenario: Aggregate privacy explanation
- **WHEN** a person reads the voting help
- **THEN** it states positive household totals are retained indefinitely, not who voted; it makes no dislike or health inference

### Requirement: Serialize manual early return against reconciliation

A successful temporary early return SHALL clear effective persisted cooked suppression immediately. Dreaming SHALL use current facts under a concurrency check; a stale worker evaluation SHALL not overwrite a newer manual action. A later successful evaluation may reapply suppression.

#### Scenario: Return during running pass
- **WHEN** a worker reads A and then a manual early return commits before its stale write
- **THEN** that stale write is rejected or reevaluated; the confirmed manual result is not overwritten by the old read

#### Scenario: Quick Find immediately after return
- **WHEN** A is explicitly returned early and otherwise eligible
- **THEN** its effective cooldown gate is lifted until a later successful Dreaming evaluation reapplies it

### Requirement: Validate calendar-week cooked cooldown

The API SHALL use a separate positive integer cooked-cooldown week setting, default 4. Dreaming SHALL compute cutoff as current deployment-calendar Monday minus 7 times the setting days; cooked dates at or after cutoff are recent, including the current week. Reads SHALL NOT recalculate it. No user tuning control SHALL be added.

#### Scenario: Missing value
- **WHEN** no value is configured
- **THEN** four complete calendar weeks are used, separately from historical voting and Search rediscovery

#### Scenario: Inclusive boundary
- **WHEN** current Monday is 2026-10-12 with setting 4
- **THEN** September 14 is recent and September 13 is aged out

#### Scenario: Advance calendar week
- **WHEN** Monday becomes 2026-10-19
- **THEN** September 14 is aged out but restoration waits for successful Dreaming

#### Scenario: Invalid value
- **WHEN** the value is zero, negative, fractional or malformed
- **THEN** configuration fails before activation

### Requirement: Preserve Human-off intent and unknown legacy provenance

Human OFF SHALL persist Human provenance and exclusion until explicit Human ON. AI and Dreaming SHALL NOT erase or reactivate it. Legacy OFF without known provenance SHALL remain Unknown and follow ordinary reconciliation. No voting-session expiry SHALL apply.

#### Scenario: Human off survives repeated passes
- **WHEN** a person turns A off and multiple Dreaming passes and voting closes occur
- **THEN** A remains off with Human intent until explicit Human ON

#### Scenario: Unknown legacy off
- **WHEN** an old off recipe has no recorded actor
- **THEN** migration preserves Unknown and Dreaming may restore it when eligible

#### Scenario: Restore intent
- **WHEN** a backup with Human-off intent is restored
- **THEN** that intent survives reconciliation and stale worker writes cannot erase it

#### Scenario: Untrusted attribution
- **WHEN** an automated caller attempts to clear Human-off or labels its update Human
- **THEN** trusted execution context prevents that update from bypassing Human intent
