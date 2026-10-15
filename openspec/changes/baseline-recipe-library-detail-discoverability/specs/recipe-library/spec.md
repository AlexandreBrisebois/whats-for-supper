# Recipe-library detail discoverability delta

## Non-normative evidence and scope

A56 authorizes this bounded draft only. BSL-recipe-library-016–018 in `docs/openspec-baseline-plan.md` map every requirement/scenario to inspected source and actual assertion coverage. These are implementation-supported claims under A10; runtime behavior is not-run and implementation/database qualification remains deferred A34. Main recipe-library remains 31 requirements/63 scenarios and household-identity 36/92. The seven prior changes remain active; this draft adds an eighth.

Reuse library “Retrieve the selected library recipe for detail reading”, “Return persisted recipe detail for an available record”, “Apply supplied non-null recipe-detail update fields”, “Return only eligible household library recipes” and “Request list pages for the selected library filter”. These additions cover only missing loaded-detail discoverability behavior. Household-identity retains “Gate protected page entry with household access”, “Apply member context after household access” and “Authenticate protected API requests independently”. Discoverability is a stored recipe flag, separate from readiness/deletion and member-specific discovery votes or household consensus. The control's subtitle does not establish voting eligibility, ranking or suggestion-generation policy.

U41–U43 retain source/assertion limits without repair. The optimistic display is separate local state from the loaded recipe snapshot. Pending disables this button, without a handler-level reentry guard, transport cancellation, stale-response guard or ordering guarantee. Rejection logs to the console and restores local state; there is no dedicated visible save error or automatic retry. A later activation is a fresh attempt, not a guarantee of safe retry. Closing unmounts; reopening uses existing detail retrieval, without assured freshness or in-flight request cancellation. Completion ignores the PATCH response and does not refetch or notify the library caller, update library summaries or promise immediate list removal/synchronization.

The database save precedes a caught indexing-trigger attempt and an uncaught recipe.info read/write. That file update does not assign discoverability, despite broad database/file-sync comments. Do not infer file parity, atomicity, persistence rollback, idempotency, event delivery or indexing completion. U36's PATCH response-envelope mismatch and undocumented missing-record error remain non-normative. Successful persistence below is source-supported, not established by a local toggle or mocked response.

Reuse BSL-recipe-library-001–015 and preserve U29–U40 non-normatively. BSL-018–025, U23–U28 and historical member-creation limitations remain unchanged and non-normative here. Historical BSL-015/U22 limitation retained:

> However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.

That sentence records the earlier review state. The user's report of later authorization remains recorded; its original reference is pending. It is not a recipe-library requirement, new lifecycle approval or runtime result.

Detail-field editing, ratings/notes submission, reporting/re-import, sharing, originals, hero generation, cooking, planning assignments, search/discovery ranking, votes/consensus, capture, deletion/restore/purge, preference policy and demo/preview/deployment variants are excluded.

## ADDED Requirements

### Requirement: Initialize the loaded-detail discoverability control

After successful library detail loading in viewing mode, the sheet SHALL offer a discoverability button initialized from the returned flag, using false for null or absence. In English it SHALL show “Ask the Family” and “Shows in Discovery voting”, with on/off visual state and an action label to turn the current state off or on.

#### Scenario: Load discoverability enabled
- **WHEN** library detail loads with isDiscoverable true
- **THEN** the button shows its on state and has the English action label “Turn off Discovery for this recipe”

#### Scenario: Load discoverability disabled
- **WHEN** library detail loads with isDiscoverable false
- **THEN** the button shows its off state and has the English action label “Turn on Discovery for this recipe”

#### Scenario: Load an absent discoverability value
- **WHEN** library detail loads with isDiscoverable absent or null
- **THEN** the button initializes off with the turn-on action and the same Ask the Family title and Discovery-voting subtitle in English

### Requirement: Submit the inverse discoverability state for the loaded recipe

Activating an enabled detail discoverability button SHALL immediately display the inverse of its current local state and request PATCH `/api/recipes/{id}` for the loaded recipe ID with isDiscoverable set to that inverse boolean. The action SHALL omit unrelated recipe fields.

#### Scenario: Turn discoverability on
- **WHEN** a person activates the enabled off button for loaded recipe R
- **THEN** the detail control immediately displays on and requests PATCH for R with isDiscoverable true and no unrelated recipe fields

#### Scenario: Turn discoverability off
- **WHEN** a person activates the enabled on button for loaded recipe R
- **THEN** the detail control immediately displays off and requests PATCH for R with isDiscoverable false and no unrelated recipe fields

### Requirement: Persist the supplied recipe discoverability fact

For an authorized PATCH of an existing recipe, when persistence and response completion succeed, the API SHALL store a supplied non-null isDiscoverable boolean on that recipe, available through existing detail reading. Omitted or null values SHALL preserve the flag. A discoverability-only update SHALL retain unrelated recipe content, attribution, readiness and deletion state, subject to the existing timestamp and connected side effects.

#### Scenario: Store enabled discoverability
- **WHEN** a successful authorized PATCH supplies isDiscoverable true for an existing recipe
- **THEN** that recipe's stored flag is true and existing detail reading represents it as true, independently of member votes or consensus

#### Scenario: Store disabled discoverability
- **WHEN** a successful authorized PATCH supplies isDiscoverable false for an existing recipe
- **THEN** that recipe's stored flag is false and existing detail reading represents it as false

#### Scenario: Preserve an omitted or null discoverability flag
- **WHEN** a successful authorized PATCH omits isDiscoverable or supplies null
- **THEN** its stored discoverability flag remains unchanged

#### Scenario: Retain unrelated facts during a discoverability update
- **WHEN** a successful authorized PATCH supplies only isDiscoverable
- **THEN** name, description, ingredients, instructions, cuisine, meal types, rating, notes, attribution, readiness and deletion state retain their stored values

### Requirement: Disable the detail discoverability button while pending

While its discoverability update request is pending, the detail button SHALL be disabled and visibly subdued with a waiting cursor. This pending state SHALL prevent another activation through that disabled button.

#### Scenario: Request remains pending
- **WHEN** a discoverability update has started and has not completed while the sheet remains mounted
- **THEN** the button displays the optimistic state, is disabled and shows its subdued waiting presentation

### Requirement: Retain the local discoverability display after success

When a discoverability PATCH resolves successfully while the sheet remains mounted with no intervening state changes, the sheet SHALL retain the submitted local discoverability display, end the pending state and remain open. Completion SHALL NOT require applying the PATCH response or another detail GET.

#### Scenario: Complete with the sheet open
- **WHEN** the discoverability request resolves successfully with the sheet still mounted and no intervening state changes
- **THEN** the submitted local state remains displayed, the button becomes enabled and the sheet stays open without a completion GET or response reconciliation

### Requirement: Restore local discoverability after rejection and allow another activation

When a discoverability PATCH rejects while the same detail remains mounted with no intervening state changes, the sheet SHALL restore the local state from before that activation and re-enable the button. A later activation SHALL submit a fresh inverse-state update for the loaded recipe. Local restoration SHALL NOT imply rollback of stored data.

#### Scenario: Request rejects
- **WHEN** a discoverability request rejects while the same detail remains mounted with no intervening state changes
- **THEN** the pre-activation state and action label return and the button becomes enabled

#### Scenario: Activate again after rejection
- **WHEN** a person activates the re-enabled discoverability button after local restoration
- **THEN** another PATCH requests the inverse of that restored state for the loaded recipe ID
