# Spec Delta

## MODIFIED Requirements

### Requirement: Replace a stored assignment at the resolved date

When requireEmpty is omitted or false, for a supported occupied-date assignment whose persistence succeeds, the selected stored entry SHALL retain its identity/date, receive the chosen recipe ID, become Planned and clear non-cooking metadata. Existing week status SHALL remain unchanged. The accepted protected assignment and deployment-calendar-relative date requirements SHALL apply; no expected-recipe precondition is implied.

#### Scenario: Replace an ordinary recipe
- **WHEN** assignment saves against an occupied non-Sunday date
- **THEN** that stored entry contains the chosen recipe in Planned state without separately relocating the old recipe through assignment

#### Scenario: Replace skipped content
- **WHEN** assignment saves against a skipped entry
- **THEN** the selected entry becomes Planned with the chosen recipe and no non-cooking kind or label

### Requirement: Report Sunday carry-forward after replacement follow-ups

When requireEmpty is omitted or false and assigning Sunday displaces a stored recipe, assignment SHALL ensure the following week's plan and place that prior recipe on its Monday as Planned. With no Monday entry it SHALL create one. The response SHALL report prior recipe identity/name and destination offset/index under data.displacedRecipe only after all awaited follow-ups complete. Destination collision policy remains qualified outside this draft.

#### Scenario: Following Monday is absent
- **WHEN** Sunday replacement persists with a prior recipe and no next-Monday entry
- **THEN** that prior recipe is added to next Monday and the completed response identifies the destination as next offset and index zero

#### Scenario: Additional follow-up fails
- **WHEN** destination recomputation or publication throws after source persistence and source follow-ups
- **THEN** successful assignment response is not reached without establishing rollback of either saved date

## ADDED Requirements

### Requirement: Guard recovery assignment against occupied supper slots

POST /api/schedule/assign SHALL accept optional boolean requireEmpty, default false. When true, it SHALL require an explicit valid reference Monday and dayIndex zero through six, and atomically assign only if no calendar entry exists at the resolved date's supper slot zero. Any existing supper entry SHALL return 409 without mutation or displacement. An invalid guarded target SHALL return 400 before mutation. Access SHALL retain the protected assignment gate.

#### Scenario: Guarded recovery saves to the captured empty date
- **WHEN** an authorized guarded assignment uses reference October 5, offset zero, index six and no supper entry exists on October 11
- **THEN** the chosen recipe is saved Planned to supper on October 11 and the existing success envelope has null displacedRecipe

#### Scenario: Another member occupied Tonight
- **WHEN** requireEmpty is true and a supper entry exists for another recipe, the chosen recipe, non-cooking content or a completed meal
- **THEN** the response is 409 and calendar entries, weekly plans, groceries and publication state are unchanged by that rejected invocation

#### Scenario: Sunday conflict cannot carry forward
- **WHEN** a guarded Sunday assignment finds an existing supper entry and following Monday is occupied
- **THEN** it returns 409 without changing either date or carrying any recipe forward

#### Scenario: Competing guarded saves
- **WHEN** two guarded assignments race to save different recipes into the same empty supper slot
- **THEN** at most one commits, the other returns 409, and only one supper entry exists without displacement

#### Scenario: Invalid captured target
- **WHEN** a guarded request omits its reference, uses a malformed or non-Monday reference, or has dayIndex outside zero through six
- **THEN** it returns 400 without changing any calendar entry or weekly plan

#### Scenario: Another meal slot exists
- **WHEN** only a non-supper entry exists on the target date and guarded supper assignment succeeds
- **THEN** that other entry is unchanged and the new supper entry uses meal slot zero

#### Scenario: Legacy caller
- **WHEN** requireEmpty is omitted or false
- **THEN** the existing assignment replacement, Sunday carry-forward, response and failure behavior remain unchanged
