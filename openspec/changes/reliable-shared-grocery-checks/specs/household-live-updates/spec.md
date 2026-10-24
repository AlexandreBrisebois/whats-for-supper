# Spec Delta

## ADDED Requirements

### Requirement: Order coordinated grocery publication attempts with committed mutations

For normal recipe-derived check-map mutations on one application instance, grocery publication attempts for a week SHALL follow their server processing order and occur only after successful persistence. An earlier mutation's publication attempt SHALL finish or fail before a later mutation's attempt begins. This does not guarantee receipt, replay or ordering against independent schedule reads and snapshots.

#### Scenario: Two successful mutations publish
- **WHEN** two overlapping item requests commit in processing order A then B and both reach grocery publication
- **THEN** A's map is attempted before B's map, with B containing the current persisted effects of both distinct-key updates

#### Scenario: Recompute publishes a transition
- **WHEN** a check update and a recomputation that changes checks both reach publication
- **THEN** their grocery publication attempts follow the same processing order as their saved map transitions

#### Scenario: Earlier publication fails
- **WHEN** A commits but its publication attempt fails and B later commits successfully
- **THEN** B can attempt publication and a fresh schedule read can recover the committed map without replay of A

#### Scenario: Ordered delivery and reread
- **WHEN** two tabs receive all applicable grocery events in publication order after distinct-key updates settle and neither has pending local mutations or another competing snapshot
- **THEN** both show the latest complete check map and a fresh eligible schedule read agrees with persisted state

#### Scenario: Independent older snapshot arrives late
- **WHEN** an older independently obtained schedule snapshot arrives after a newer grocery event
- **THEN** this publication-order guarantee does not establish stale-snapshot rejection, and a subsequent fresh eligible read after outstanding responses settle recovers persisted checks

