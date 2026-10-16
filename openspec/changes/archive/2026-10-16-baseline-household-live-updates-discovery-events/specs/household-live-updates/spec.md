# Spec Delta

## ADDED Requirements

### Requirement: Forward received vote totals to existing consumers

A parsed `vote_updated` event SHALL offer its recipe identity and vote count first to the displayed-week consumer and then to Discovery, provided preceding steps return. Matching loaded planner recipes SHALL receive that recipe vote count without creating missing entries. Discovery SHALL receive the same update for its own interest and ranking policy; vote meaning remains owned by recipe discovery.

#### Scenario: Loaded recipe receives a total
- **WHEN** a vote event identifies a recipe in the displayed schedule
- **THEN** matching planner recipe objects receive the count and Discovery is offered the same identity and count

#### Scenario: Planner has no matching recipe
- **WHEN** no displayed planner recipe matches the event identity
- **THEN** planner content remains unchanged and Discovery is still offered the update without inserting a planner recipe

### Requirement: Filter received smart defaults by their nested week

A parsed `smart_defaults_updated` event SHALL offer its defaults for application only when `defaults.weekOffset` strictly equals the loaded week offset. A different or absent nested offset SHALL leave the displayed schedule unchanged through this handler. The outer event offset SHALL NOT override this gate.

#### Scenario: Nested week matches
- **WHEN** defaults identify the loaded week offset
- **THEN** those defaults are offered for pending-slot reconciliation

#### Scenario: Outer and nested offsets differ
- **WHEN** the outer event identifies the loaded week but its defaults identify another week
- **THEN** the handler ignores those defaults

#### Scenario: Nested offset is absent
- **WHEN** the event has no nested defaults week offset
- **THEN** it does not pass this handler's week gate even when the loaded week is zero

### Requirement: Reconcile received suggestions without replacing occupied slots

Eligible smart defaults SHALL fill empty or pending displayed slots by day index, retaining supplied recipe display data and pending vote metadata. Persisted recipe slots and status-three non-cooking slots SHALL remain unchanged. A pending slot absent from the new defaults SHALL clear its suggestion and pending vote metadata. This consequence SHALL NOT assign a recipe on the server or define consensus eligibility.

#### Scenario: Suggestion replaces an eligible slot
- **WHEN** eligible defaults contain a preselected recipe for an empty or pending day index
- **THEN** that slot contains the suggestion with pending marker and supplied vote metadata

#### Scenario: Persisted or non-cooking slot is occupied
- **WHEN** eligible defaults address a persisted recipe slot or status-three non-cooking slot
- **THEN** that slot remains unchanged

#### Scenario: Suggestion is withdrawn
- **WHEN** a previously pending slot has no preselected entry in eligible new defaults
- **THEN** its recipe clears, pending becomes false and its pending vote and unanimous metadata become null

### Requirement: Attempt invalidation at supported schedule publication boundaries

The server SHALL attempt `fill_the_gap_invalidated` for the affected week after assignment or removal of an existing dated entry reaches its preceding week-publication boundary successfully. The unscheduled-cooking validation branch SHALL attempt this invalidation after saving cooking history. An available request connection exclusion SHALL be forwarded; invalidation SHALL NOT imply refreshed candidate data.

#### Scenario: Assignment or removal reaches invalidation
- **WHEN** the supported operation completes its preceding persistence, recomputation and week-publication call
- **THEN** a fill-the-gap invalidation is attempted with the affected week offset and supplied exclusion

#### Scenario: Cooking history changes without matching scheduled recipe
- **WHEN** the unscheduled-cooking validation branch saves the recipe's cooking history and reaches publication
- **THEN** it attempts a fill-the-gap invalidation for the date's week without a slot update from that branch

### Requirement: Signal candidate freshness separately from fetching results

A parsed `fill_the_gap_invalidated` event SHALL advance the shared Discovery invalidation generation and the generation for its supplied week, then invalidate Search promotion data if preceding steps return. Other week-specific generations SHALL remain unchanged. These signals SHALL NOT by themselves supply results, rerun server eligibility policy or establish a successful refresh.

#### Scenario: Invalidate one week's candidates
- **WHEN** a parsed invalidation identifies week one
- **THEN** the global generation and week-one generation advance, other week generations remain and Search promotion data is invalidated

#### Scenario: Matching Quick Find is ready
- **WHEN** a mounted Quick Find has completed initial fetching and observes a newer generation for its week
- **THEN** it attempts another suggestion fetch for that week without a successful-result guarantee

#### Scenario: Other week's Quick Find observes unchanged generation
- **WHEN** an invalidation changes only another week's generation
- **THEN** that invalidation does not trigger the modal's week-generation refresh effect

### Requirement: Attempt publication of saved vote consequences

After a submitted vote saves and its resulting like count is read successfully, the server SHALL attempt a vote update with recipe identity and count. When discovery's smart-default recalculation boundary is reached and defaults retrieval succeeds, it SHALL attempt a smart-default update for week zero. These event attempts SHALL NOT define vote eligibility, guarantee a threshold transition or establish consumer receipt.

#### Scenario: Saved vote reaches publication
- **WHEN** vote persistence and resulting like-count retrieval succeed and publication is reached
- **THEN** a vote update is attempted with that recipe identity and count without a request connection exclusion

#### Scenario: Discovery recalculation reaches publication
- **WHEN** discovery selects its recalculation boundary and week-zero defaults retrieval succeeds
- **THEN** a smart-default update is attempted carrying outer week zero and those defaults without a request connection exclusion
