# Spec Delta

## ADDED Requirements

### Requirement: Classify stored vegetarian facts from ingredient evidence

Operator classification SHALL use nonblank ingredient strings or object name fields without requiring a recipe title. A missing recipe SHALL return not-found; absent usable ingredients SHALL return unknown-no-ingredients. An explicit boolean response SHALL update the persisted vegetarian fact and update time when saving succeeds.

#### Scenario: No usable ingredients
- **WHEN** the recipe has empty, malformed or unsupported ingredient content
- **THEN** classification returns unknown-no-ingredients without changing its stored vegetarian fact

#### Scenario: Explicit classification
- **WHEN** the classifier returns an explicit boolean from usable ingredient evidence
- **THEN** that boolean and the operation's update time are saved

#### Scenario: Recipe missing
- **WHEN** the requested recipe is not found
- **THEN** classification returns not-found without calling the classifier

### Requirement: Preserve confirmed facts when classification is ambiguous

A classification response without an explicit boolean SHALL return unknown-insufficient-ingredients without overwriting the stored fact. Malformed response JSON SHALL propagate failure without persisting a replacement fact. Plain JSON and supported Markdown-fenced JSON SHALL be accepted; these behaviors SHALL NOT establish dietary accuracy.

#### Scenario: Ambiguous response
- **WHEN** a valid response supplies null vegetarian classification
- **THEN** the existing fact is preserved and the outcome is unknown-insufficient-ingredients

#### Scenario: Malformed response
- **WHEN** response JSON cannot be parsed
- **THEN** the existing fact is preserved and the parsing exception propagates

#### Scenario: Fenced response
- **WHEN** the response encloses an explicit boolean JSON object in a supported Markdown code fence
- **THEN** the explicit classification is accepted

### Requirement: Queue bounded vegetarian classification batches

Operator backfill SHALL select up to 25 undeleted recipes ordered by identity after an optional cursor. It SHALL select unknown facts by default and include known facts when force is true. It SHALL request one classifier workflow per selected recipe and request a successor with the final identity and force setting when the batch is full.

#### Scenario: Default backfill
- **WHEN** known and unknown undeleted recipes are available without force
- **THEN** only unknown recipes are selected for classification requests

#### Scenario: Forced backfill
- **WHEN** force is true
- **THEN** known recipes are eligible for classification requests

#### Scenario: Full batch
- **WHEN** a batch selects 25 recipes and all its launch requests succeed
- **THEN** it requests a successor after the final identity without waiting for those classifiers to finish

### Requirement: Distinguish classification launch counts from current facts

Classification status SHALL count undeleted recipes as total, classified, unknown, vegetarian and nonvegetarian. Backfill results SHALL add queued count and a next cursor for a full batch. Queued SHALL describe launch requests completed by that coordinator, not classification completion or correctness.

#### Scenario: Read current status
- **WHEN** four undeleted recipes contain one true, one false and two unknown facts
- **THEN** status reports total four, classified two, unknown two, vegetarian one and nonvegetarian one

#### Scenario: Queued children remain pending
- **WHEN** backfill has launched child work that has not completed
- **THEN** queued count does not imply those recipes' stored facts changed
