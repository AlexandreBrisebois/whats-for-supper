# Spec Delta

## MODIFIED Requirements

### Requirement: Mark Order In before planned-recipe disposition

For Order In plus Tomorrow, Home SHALL include the source disposition in the Tomorrow operation without prior validation or optimistic source mutation. For Save for Next Week or Drop, Home SHALL retain prior local Skipped presentation and awaited status-only validation; defer follows validation and Drop sends no deletion.

#### Scenario: Move after validation
- **WHEN** Order In recovery chooses Save for Next Week and validation remains pending
- **THEN** deferral has not started through that invocation

#### Scenario: Move with source disposition
- **WHEN** Order In recovery chooses Tomorrow and movement remains pending
- **THEN** one Tomorrow request carries Order In disposition while the displayed and persisted source remain unchanged until commit

#### Scenario: Drop original cooking plan
- **WHEN** a person chooses Drop in Order In recovery and validation resolves
- **THEN** no DELETE is sent through that branch

### Requirement: Request tomorrow for the current Tonight recipe

Home Tomorrow recovery SHALL submit the explicit Tomorrow operation for the current Tonight recipe, week zero and the Monday-based source index of deployment-local today. Monday through Saturday SHALL target the following index in week zero; Sunday SHALL target index zero in week one. Destination, source disposition and rejection SHALL follow meal-planning Tomorrow requirements.

#### Scenario: Weekday request
- **WHEN** Tomorrow disposition starts on Thursday with a current recipe identity
- **THEN** the move uses source index three and target index four in week zero

#### Scenario: Sunday request
- **WHEN** Tomorrow disposition starts on Sunday with a current recipe identity
- **THEN** the move uses source index six and target index zero in week one

### Requirement: Stop a rejected Home recovery invocation at its failing await

An awaited recovery rejection SHALL be logged and stop subsequent steps in that invocation. If disposition rejects before replacement dispatch, Home SHALL not dispatch the replacement through that invocation. Previously completed local or server work SHALL NOT be described as rolled back; automatic compensation and safe retry are not established. Tomorrow rejection SHALL retain recovery context with visible feedback; an unknown outcome SHALL require rereading before another attempt.

#### Scenario: Validation rejects first
- **WHEN** Order In validation rejects before Save for Next Week disposition
- **THEN** that invocation does not submit its defer

#### Scenario: Disposition rejects
- **WHEN** Pick Something Else movement, defer or deletion rejects before replacement
- **THEN** that invocation does not dispatch the retained replacement

## ADDED Requirements

### Requirement: Consume the committed Tomorrow result before continuing Home recovery

Home SHALL continue replacement or successful recovery only when Tomorrow confirms committed movement. While pending it SHALL suppress duplicate submission. A rejected move SHALL retain the original and pending choice with visible conflict feedback. A committed move with incomplete follow-ups SHALL trigger rereads and refresh feedback without resubmitting movement. Unknown outcomes SHALL withhold replacement until reconciled.

#### Scenario: Cooked destination rejects Order In movement
- **WHEN** Order In plus Tomorrow is rejected because a Cooked entry would move
- **THEN** Home retains the original source and recovery choice, shows the conflict and submits neither validation nor replacement

#### Scenario: Move commits but refresh is incomplete
- **WHEN** Tomorrow returns a committed result with incomplete follow-ups
- **THEN** Home rereads affected state and identifies refresh failure without sending the move again

#### Scenario: Transport fails without a known result
- **WHEN** the response is lost and Home cannot establish whether Tomorrow committed
- **THEN** Home withholds replacement and blocks repeat movement until authoritative reads reconcile the source and destination
