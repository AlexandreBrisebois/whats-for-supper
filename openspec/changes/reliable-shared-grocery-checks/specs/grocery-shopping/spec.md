# Spec Delta

## MODIFIED Requirements

### Requirement: Persist a sequential single-key check update

For an existing weekly plan on a single-instance deployment, a successful item PATCH SHALL store the supplied check value while retaining other current persisted values, and return 204 after its save and publication attempt. Sequential and overlapping requests SHALL follow the shared check-map processing requirements below.

#### Scenario: Set one key
- **WHEN** the stored map has Tomato false and Lettuce true and Tomato is set true without overlapping writes
- **THEN** both keys are true on a subsequent successful read

#### Scenario: Set false
- **WHEN** Tomato is set false in a sequential successful request
- **THEN** Tomato is retained with false

#### Scenario: Two members check different items
- **WHEN** Tomato and Lettuce begin unchecked and overlapping successful item PATCH requests set each true with no intervening replacement or supported rename
- **THEN** a fresh successful read after both requests contains both keys true

## ADDED Requirements

### Requirement: Process normal check-map writes against current persisted state

On one application instance, item updates, full-map replacements and recomputation transitions for a weekly recipe-derived check map SHALL take effect in one server processing order. Each operation SHALL use the persisted map resulting from its predecessors. Processing order SHALL NOT imply user-click order or FIFO request arrival.

#### Scenario: Conflicting values for one item
- **WHEN** overlapping requests set Tomato true and false and the false request is processed last
- **THEN** a fresh read contains Tomato false and unrelated keys retain their values

#### Scenario: Repeat intended state
- **WHEN** two successful item requests both set Tomato true
- **THEN** Tomato remains true rather than being inverted twice

#### Scenario: Stale whole-map replacement remains replacement
- **WHEN** an item update saves Lettuce true and a later-processed full-map request supplies only Tomato false
- **THEN** the stored map contains only Tomato false, even if the replacement body was prepared before the item update

#### Scenario: Item update follows replacement
- **WHEN** a full-map replacement supplying Tomato false is processed before an item update setting Lettuce true
- **THEN** a fresh read contains Tomato false and Lettuce true

#### Scenario: Clear and later check
- **WHEN** an empty full-map replacement is processed before an item request setting Lettuce true
- **THEN** the resulting map contains Lettuce true and no keys retained solely from before the clear

### Requirement: Preserve current checks during overlapping recomputation

Successful recomputation overlapping a recipe-derived check mutation SHALL preserve unrelated persisted check entries. Supported predecessor merge and rename transitions SHALL use the check state current at recomputation's processing position, without changing the existing mechanical-normalization rules.

#### Scenario: Check and unchanged-name recomputation
- **WHEN** Tomato is checked while a recomputation retains its display name and neither operation intentionally replaces that key
- **THEN** after both succeed a fresh read contains Tomato true and the recomputed grocery lines

#### Scenario: Earlier request state is stale
- **WHEN** a recomputation request previously observed Tomato false and another request commits Tomato true before recomputation processes its check-map transition
- **THEN** recomputation uses Tomato true rather than restoring its earlier observed false

#### Scenario: Supported predecessor merge
- **WHEN** a check request commits one predecessor as true before two compatible predecessors merge and the other predecessor remains false
- **THEN** the merged name is false under the existing all-predecessors-checked rule, obsolete predecessor keys are removed and unrelated checks remain

### Requirement: Acknowledge check mutations only after persistence

A check mutation SHALL NOT report success merely because in-memory work was accepted. A failed or canceled operation before commit SHALL NOT acknowledge a saved check or prevent subsequent requests from proceeding. A committed write SHALL remain recoverable by a fresh read even if its acknowledgement or publication fails; no all-or-nothing save and delivery guarantee is implied.

#### Scenario: Waiting request is canceled
- **WHEN** a request is canceled before processing its mutation
- **THEN** it does not change the stored map or return success and a later request can complete

#### Scenario: Save fails before commit
- **WHEN** the mutation's database save fails before commit
- **THEN** no saved success is returned, the previously committed map remains readable and a subsequent valid request can proceed

#### Scenario: Process stops before commit
- **WHEN** the single instance stops with an uncommitted check request pending
- **THEN** restart does not imply that request was saved and a fresh read exposes only committed state

#### Scenario: Commit succeeds but acknowledgement is lost
- **WHEN** the database commits a check and the process stops or the response fails before the caller receives success
- **THEN** a fresh read after recovery contains the committed check unless a later successful operation changed it

#### Scenario: Publication fails after commit
- **WHEN** a check is committed but its notification attempt fails
- **THEN** the committed map remains readable and subsequent check mutations are not blocked indefinitely by the failed operation

