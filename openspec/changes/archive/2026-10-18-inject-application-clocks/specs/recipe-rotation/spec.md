## ADDED Requirements

### Requirement: Preserve cooked civil dates in reconciliation

Dreaming SHALL retain the literal cooked calendar date when the stored cooked value is derived from that event. Without matching calendar evidence, a legacy cooked timestamp SHALL retain deployment-local instant interpretation. Reconciliation SHALL NOT rewrite stored timestamps or infer provenance solely from midnight.

#### Scenario: Toronto exact cutoff after finalization
- **WHEN** finalization records Monday 2026-09-14 as cooked and Dreaming runs in Toronto on Monday 2026-10-12
- **THEN** the recipe remains cooked-suppressed at the inclusive four-week cutoff

#### Scenario: Before and after cutoff
- **WHEN** finalized cooked events lie before, on and after the cutoff in UTC or Toronto
- **THEN** only dates before the cutoff age out, including across DST and Monday rollover

#### Scenario: Imported timestamp without calendar evidence
- **WHEN** a legacy timestamp has no matching cooked event
- **THEN** Dreaming uses its deployment-local date without interpreting midnight as proof of a civil date

#### Scenario: Existing exclusions and eventual reconciliation
- **WHEN** time advances beyond the cooldown or a recipe remains Human OFF or selected in the current plan
- **THEN** reads do not recompute cooldown, Human OFF remains permanent, and current-plan exclusion remains independent
