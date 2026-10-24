## MODIFIED Requirements

### Requirement: Distinguish movement follow-ups from movement confirmation

For legacy swap and push intents, same-week saved movement SHALL attempt a source-week snapshot without grocery recomputation. Cross-week persistence SHALL attempt grocery recomputation and snapshot publication for both weeks independently. Follow-up failure SHALL NOT turn committed movement into a failed response. Publication receipt SHALL remain household-live-updates-owned.

#### Scenario: Committed movement reports its refresh outcome
- **WHEN** an actual cross-week movement completes
- **THEN** the response SHALL return the existing moved=true, sourceDate, destinationDate, affectedWeekStartDates and refreshComplete result, with refreshComplete=false when any follow-up fails; completed moves, including supported no-op returns, SHALL return 200 with data.message Recipe moved

#### Scenario: Same-week movement completes
- **WHEN** same-week movement saves and its schedule read and publication return
- **THEN** the success response follows source-week publication without requesting grocery recomputation through this path

#### Scenario: Cross-week movement completes
- **WHEN** cross-week persistence and both recomputations complete
- **THEN** both affected snapshots are attempted before returning moved=true and refreshComplete=true

#### Scenario: Full target returns completion
- **WHEN** cross-week destination search finds no free date and the subsequent source read/publication complete
- **THEN** the response still says Recipe moved and does not confirm relocation

#### Scenario: Publication or recomputation fails after movement
- **WHEN** cross-week movement is saved and any subsequent recomputation or snapshot publication fails
- **THEN** remaining affected-week follow-ups are still attempted and the response confirms moved=true and refreshComplete=false without replaying movement

### Requirement: Request Plan later from the selected Planner week

Planner's recipe-backed Plan later action SHALL close its pivot and submit explicit source index, target offset selected offset plus one, target index zero and push intent. Completion SHALL initialize the selected week and sync Today for a week-zero source dated deployment-local today. Request failure SHALL be logged without a dedicated Plan later error toast.

#### Scenario: Committed Plan later has incomplete refresh
- **WHEN** the response confirms moved=true and refreshComplete=false
- **THEN** Planner SHALL explain that the meal moved and some updates could not refresh, with guidance to refresh the plan rather than repeat movement

#### Scenario: Plan later for next selected week
- **WHEN** a person chooses Save for Next Week for a recipe in selected offset one
- **THEN** movement targets offset two starting at Monday rather than deployment-current next week

#### Scenario: Movement request resolves or rejects
- **WHEN** the Plan later request resolves, including a supported no-op, or rejects
- **THEN** resolution proceeds to initialization while rejection is logged without success confirmation of relocation

#### Scenario: Committed move has incomplete refresh
- **WHEN** Plan later returns moved=true and refreshComplete=false
- **THEN** Planner rereads the selected week and shows a warning that the meal moved and the plan should be refreshed, without resubmitting movement
