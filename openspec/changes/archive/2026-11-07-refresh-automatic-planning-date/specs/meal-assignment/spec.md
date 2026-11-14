## MODIFIED Requirements

### Requirement: Find first-open placement after deployment-local today

Without an explicit day, recipe detail SHALL suggest the first ordinary empty supper on or after authoritative deployment-local today, including with a historical reference Monday: Tonight first, then future dates in order. Non-cooking, Cooked, AwaitingConsensus and recipe-backed days SHALL be skipped. The date SHALL be shown before saving. Scanning SHALL stop after 520 relative weeks; missing or failed schedule data SHALL block recommendation rather than imply emptiness.

#### Scenario: Next date is non-cooking
- **WHEN** the first candidate date is recipe-free Skipped and a later ordinary empty date exists
- **THEN** placement skips the non-cooking date and chooses the later ordinary empty index

#### Scenario: Today is Sunday
- **WHEN** an untargeted recipe opens on deployment-local Sunday and Tonight is occupied
- **THEN** scanning begins at offset one, index zero rather than offset-zero Monday

#### Scenario: Scan finds no target
- **WHEN** all 520 inspected relative weeks contain no eligible returned date
- **THEN** no target is offered, no assignment is submitted and a visible Choose day alternative is available

#### Scenario: Tonight is genuinely empty
- **WHEN** an untargeted recipe opens and authoritative Tonight has no persisted supper entry
- **THEN** Tonight is the visible suggested date and no write occurs until the dated action is activated

#### Scenario: Historical scan reference
- **WHEN** an automatic scan uses an older reference Monday or a stale starting index
- **THEN** it skips every returned date before the authoritative deployment-local today and retains the correct date/week/reference mapping

#### Scenario: Browser timezone differs
- **WHEN** the browser civil date differs from the deployment-local date
- **THEN** automatic eligibility uses returned deployment calendar today rather than browser-local midnight

### Requirement: Assign first-open placement through the shared assignment operation

Activating the dated action SHALL use guarded assignment for the chosen recipe and captured date after a fresh authoritative calendar/date check. An automatic date now in the past SHALL refresh and require another activation without writing either date. Suggestions SHALL NOT reserve or mutate plans. Conflict SHALL retain recipe/date, explain the changed plan and offer another day or explicit replacement without silently retargeting. Confirmed completion SHALL return to that Planner date.

#### Scenario: First-open assignment resolves
- **WHEN** a shown target is chosen and its guarded assignment is confirmed
- **THEN** navigation identifies that returned offset/index with planner success feedback parameters

#### Scenario: Week read is absent or rejects
- **WHEN** a scanned week has no usable days or its request rejects
- **THEN** both cases block automatic recommendation and show retry without reserving or assigning any target

#### Scenario: Automatic target becomes yesterday before save
- **WHEN** deployment-local midnight passes after the suggestion was shown and before activation
- **THEN** the old date receives no new assignment, the refreshed eligible date is shown, and saving it requires another activation

#### Scenario: Calendar recheck fails
- **WHEN** the fresh calendar or target read fails during automatic save validation
- **THEN** no new assignment occurs and recipe/context remain available with read retry or Choose day

## ADDED Requirements

### Requirement: Refresh automatic suggestions across deployment date rollover

Automatic recommendation SHALL expire at authoritative deployment-local day rollover. Open detail SHALL refresh at rollover and on resumed visibility/focus when freshness cannot be established. Pending refresh SHALL block new automatic assignment; obsolete results SHALL NOT replace current recipe/date context. A late or failed read SHALL NOT revive an expired recommendation as actionable.

#### Scenario: Detail stays open overnight
- **WHEN** an automatic suggestion remains open as the deployment date rolls over
- **THEN** detail rereads the authoritative calendar and eligible date before enabling a new automatic save

#### Scenario: Resume after sleep
- **WHEN** a suspended tab resumes after its calendar freshness boundary
- **THEN** it refreshes automatic placement before permitting assignment, even if no midnight timer fired

#### Scenario: Rollover during scan or response race
- **WHEN** a calendar generation changes while automatic reads are pending, or the recipe/target context changes
- **THEN** stale results cannot enable save or overwrite current context and the active automatic scan uses a coherent fresh calendar

### Requirement: Preserve explicit dated planning during automatic-date correction

The today-or-future restriction SHALL apply only to automatic recommendations. Explicit Planner dates and deliberately selected historical dates SHALL retain existing assignment, completion and conflict behavior. Checking an uncertain earlier write SHALL retain its captured date/reference and SHALL NOT replace it with a newly recommended date or repeat a completed mutation.

#### Scenario: Explicit historical Planner target
- **WHEN** a person explicitly selects an otherwise eligible past Planner supper
- **THEN** the automatic-date lower bound does not prohibit that dated assignment or reinterpret it as today's recommendation

#### Scenario: Unknown automatic write after midnight
- **WHEN** an automatic assignment lost its reply before rollover
- **THEN** recovery checks the original captured date for its result before any new recommendation can cause a new write
