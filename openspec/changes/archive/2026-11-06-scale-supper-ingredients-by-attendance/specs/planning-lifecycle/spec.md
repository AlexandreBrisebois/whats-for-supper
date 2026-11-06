## ADDED Requirements

### Requirement: Prepare only the captured supper occurrence

Dated preparation SHALL atomically check the captured occurrence, recipe, date, plan state and portions version before marking it prepared and recording the server-authoritative actual date. It SHALL accept an ordinary Planned or Locked supper, preserve its supper date and other assignments, and freeze its effective portions. Invalid input SHALL return 400; stale or changed context SHALL return 409 without mutation.

#### Scenario: Same recipe on another date
- **WHEN** Wednesday and Friday hold the same recipe and preparation targets Friday's captured occurrence
- **THEN** only Friday is marked prepared, the actual preparation date is recorded, and Wednesday remains unchanged

#### Scenario: Plan or portions changed while cooking
- **WHEN** another member changes the captured recipe, occurrence or effective portions before preparation commits
- **THEN** preparation returns conflict, preserves cooking work, and requires reviewing the current plan/portions rather than completing stale state

### Requirement: Recover preparation without recording it twice

A matching already prepared occurrence SHALL return its saved outcome without changing preparation date or frozen portions. Recreated assignments SHALL have distinct occurrence identity. Follow-up failure SHALL not reverse committed preparation. Unknown replies SHALL require authoritative rereading before another mutation; unavailable reads SHALL leave the result unconfirmed.

#### Scenario: Lost acknowledgement
- **WHEN** preparation commits Tuesday but its reply is lost
- **THEN** a reread or repeated request for the same prepared occurrence reports the original Tuesday result, without another history update or assignment

#### Scenario: Same recipe was removed and re-added
- **WHEN** Friday's recipe is removed and the same recipe is assigned again before a stale preparation arrives
- **THEN** the old occurrence identity cannot prepare the new assignment

### Requirement: Preserve explicit preparation through legacy lifecycle operations

Existing Cooked state SHALL represent a prepared occurrence for movement and voting protection. Legacy validation, week locking and overdue processing SHALL not erase its actual preparation metadata or reset its frozen portions. Automatic overdue completion SHALL not fabricate an observed preparation date. Unscheduled recipe-specific cooking SHALL retain its existing compatibility behavior.

#### Scenario: Friday arrives after Tuesday preparation
- **WHEN** Friday's explicitly prepared meal is read, locked or processed after its supper date
- **THEN** it remains Already prepared with Tuesday's actual preparation and no second completion obligation

#### Scenario: Legacy completion repeats
- **WHEN** a legacy validation call reaches an occurrence already explicitly prepared Tuesday
- **THEN** its stored preparation date and portions remain unchanged rather than being recorded as newly cooked

## MODIFIED Requirements

### Requirement: Recalculate cooking consequence before overdue publication

Overdue finalization SHALL save its changed day statuses and recalculate each affected recipe's last-cooked value from the latest cooking value of remaining Cooked entries: explicit actual preparation time when present, otherwise the legacy calendar date at midnight UTC before committing its persistence work. Explicit preparation SHALL not be replaced by its future supper date. This planning consequence SHALL not define the separate cooking-history journey or prove actual cooking occurred.

#### Scenario: Newly completed date is latest
- **WHEN** a legacy finalized date supplies the recipe’s latest cooking value
- **THEN** the derived last-cooked value is that date at midnight UTC after successful persistence

#### Scenario: Later cooked date already exists
- **WHEN** another legacy Cooked calendar entry for that recipe has a later date
- **THEN** recalculation uses the latest Cooked date rather than finalization's current invocation time

#### Scenario: Future supper was already prepared
- **WHEN** Friday lasagna was explicitly prepared Tuesday and history is recalculated after another occurrence changes
- **THEN** that occurrence contributes Tuesday’s actual preparation time, never an invented Friday cooking time
