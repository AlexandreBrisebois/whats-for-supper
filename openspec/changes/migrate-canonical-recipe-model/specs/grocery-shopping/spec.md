# Spec Delta

## ADDED Requirements

### Requirement: Preserve plans and rebuild every grocery list during migration

Migration SHALL preserve every planned meal/calendar event and all protected household facts while recalculating grocery lists for every persisted list week and assignment-implied week. It SHALL preserve manual extras, corrections and history. An active list SHALL NOT require plan/event deletion or an empty-list gate.

#### Scenario: Populated calendar at upgrade
- **WHEN** migration starts with planned meals and cooking/non-cooking events in past, current and future weeks
- **THEN** their IDs, dates, status, recipe links and serving/preparation facts remain unchanged
- **AND** every persisted or assignment-implied grocery week is included in the rebuild inventory, without deleting events to obtain an empty-list state

#### Scenario: Stored week has no current assignment
- **WHEN** a persisted grocery-list week has no current recipe-bearing assignment
- **THEN** migration still recalculates that week's recipe demand under the new model and preserves its manual extras and history

#### Scenario: Assignment week has no stored grocery list
- **WHEN** a preserved assignment implies a week without a persisted grocery list
- **THEN** migration includes that week in the rebuild and creates its required derived list without duplicating the assignment or event

### Requirement: Bound grocery resets to the migration operation

Only the fenced migration rebuild MAY reset grocery checks and checked-demand baselines. Its manifest SHALL bind the complete week set, input/model/vocabulary revisions, allowed grocery-derived changes and checkpoints to one operation. Protected plan/event, extra/history and correction facts SHALL remain unchanged. Ordinary recomputation, locale updates and exact restore SHALL retain their existing check/baseline policy.

#### Scenario: Declare exact derived changes
- **WHEN** the migration manifest is prepared
- **THEN** it identifies recomputed recipe rows and demand evidence, row/list versions, serving input/applied versions, refresh/reset-summary state and permitted checks/baselines as the allowed grocery-derived changes
- **AND** it separately inventories protected plan/event, extra-history and human-correction facts for before/after read-back

#### Scenario: Old name controlled several historical rows
- **WHEN** retained name-level checks ambiguously covered multiple recipe rows before migration
- **THEN** the rebuild may create unchecked recipe rows with no inherited demand baseline rather than inventing independent acknowledgements
- **AND** the verified pre-rebuild backup and operation evidence retain the original facts without deleting plan/event or extra history

#### Scenario: Preserve manual extras and corrections
- **WHEN** the migration rebuild recalculates recipe-derived rows and resets permitted shopping checks
- **THEN** manual extra occurrence IDs/content/corrections and recurrence/removal/history links, manual shopping names and category choices remain intact
- **AND** no check-reset permission becomes permission to delete or recreate those records

#### Scenario: Ordinary quantity or locale update after migration
- **WHEN** an already reopened household changes portions, saved quantity or display locale
- **THEN** the ordinary stable-row, structural split/merge and proven-increase baseline policies apply
- **AND** the completed migration is not rerun to clear subsequent human checks or rebaseline continuing checked rows

### Requirement: Complete or reconcile the rebuild before reopening

Migration SHALL retain the write/worker fence until each inventoried week has a verified completed rebuild under the selected input revisions. Interrupted resume SHALL preserve completed recipe and event identities, perform only unfinished authorized work and prevent a completed reset from being applied again after reopening. Initiation or partial completion SHALL NOT be reported as a fully current list set.

#### Scenario: Interruption between weeks
- **WHEN** migration stops after some weeks are rebuilt
- **THEN** restart keeps the household fenced, verifies recorded completed outputs and resumes remaining weeks without clearing plans/events or duplicating extras
- **AND** reopening waits for independent complete-inventory read-back and required recovery proof

#### Scenario: Completed operation is requested again
- **WHEN** a completed migration operation is retried after later human check changes
- **THEN** it reports its retained completion or rejects mismatched input rather than applying its reset epoch again

#### Scenario: Bilingual identities in rebuilt lists
- **WHEN** the final release rebuild uses saved validated food mappings and the durable versioned vocabulary
- **THEN** it retains exact package/unit distinctions, saved human choices and every referenced identity while using conservative fallback for unmapped or ambiguous lines
- **AND** it performs no AI translation, vocabulary regeneration or speculative cross-language merge during recomputation
