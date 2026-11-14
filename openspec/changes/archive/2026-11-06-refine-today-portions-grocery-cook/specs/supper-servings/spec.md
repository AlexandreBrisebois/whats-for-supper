## MODIFIED Requirements

### Requirement: Apply an explicit household default with dated exceptions

Settings SHALL configure usual portions. Explicit counts SHALL persist until changed or reset to automatic; otherwise positive family size supplies usual. Current/future uncompleted dates inherit usual unless overridden. Default/member changes SHALL preserve overrides and past/Cooked/prepared snapshots. A deliberate correction of today's Cooked supper without a preparation receipt SHALL follow the current-day correction requirement; explicit preparation remains protected.

#### Scenario: Change the usual portion count
- **WHEN** usual changes from four to five and future Wednesday has override six
- **THEN** future inherited dates use five, Wednesday retains six and past/Cooked/prepared snapshots do not change

#### Scenario: Set portions before choosing food
- **WHEN** an empty future Saturday receives override six and later receives a recipe
- **THEN** the date retains six and its new recipe uses that count

#### Scenario: Automatic family size then human choice
- **WHEN** usual is unset for four family members, a member is added, and later a person explicitly sets seven
- **THEN** inherited editable dates first use four, then five, then seven
- **AND** a subsequent membership change leaves seven in effect

#### Scenario: Reset explicit usual to automatic
- **WHEN** a person deliberately selects automatic family size in Settings and confirms the save
- **THEN** inherited editable dates use the current positive member count, overrides remain, and the setting identifies its automatic source

### Requirement: Migrate usual portions without erasing human choices

Every existing positive saved usual count SHALL be preserved as explicit. Missing or null usual SHALL adopt automatic family count for uncompleted current/future dates only. Migration SHALL preserve overrides and historical/prepared snapshots, including original-quantity snapshots. Settings SHALL distinguish automatic from explicit and acknowledge saves only after persistence. Unknown or zero family count SHALL not become an invented positive count.

#### Scenario: Upgrade with explicit and unset households
- **WHEN** one household has saved usual seven and another has no usual with four members
- **THEN** the first remains explicit seven and the second shows automatic four without storing four as a human choice
- **AND** existing historical original-quantity and prepared snapshots remain unchanged

#### Scenario: Empty or unavailable family roster
- **WHEN** an automatic household has zero members or its roster cannot be established
- **THEN** no fake one/four count is supplied; original quantities remain the honest unavailable fallback and Settings offers appropriate empty/retry feedback
- **AND** an existing explicit count remains usable independently of the roster

#### Scenario: Membership changes with inherited dates
- **WHEN** automatic usual changes from four to five following a confirmed membership addition
- **THEN** editable inherited dates and their quantity versions change together, affected groceries use the existing updating/failed/current journey, and overrides/prepared/history remain intact
- **AND** a draft based on the prior version cannot silently overwrite that change

#### Scenario: Existing null needs no historical backfill
- **WHEN** a past or prepared occurrence was recorded with original-quantity context before automatic fallback was introduced
- **THEN** reading or migrating it does not infer family size as its former cooking count

#### Scenario: Migration does not correct a completed current date
- **WHEN** today's supper is Cooked without a preparation receipt and the household default or member count changes
- **THEN** its saved portion snapshot remains unchanged unless a person deliberately saves a dated correction

## ADDED Requirements

### Requirement: Correct portions of the current cooked supper explicitly

Deployment-local today's Cooked supper without an explicit preparation receipt SHALL permit a dated portions correction. Saving SHALL preserve recipe/occurrence, Cooked status and cooking history and use existing batch/version/recovery rules. Past dates, future Cooked dates, non-cooking plans and explicit preparations SHALL remain read-only. Default/member changes SHALL not apply this exception.

#### Scenario: Correct the observed five-portion current supper
- **WHEN** today is November 6, its supper is Cooked without a preparation receipt and saved portions five are explicitly changed to six and saved
- **THEN** a fresh read and assigned ingredient projection use six, while its recipe/occurrence, status, cooking history and usual setting remain unchanged
- **AND** no preparation receipt or actual preparation date is invented

#### Scenario: Ordinary today remains editable
- **WHEN** the deployment's today is empty or has an unprepared Planned or Locked supper
- **THEN** existing dated editing remains available, without requiring it to become tomorrow first

#### Scenario: Retain historical and explicitly prepared protection
- **WHEN** a date is past, a Cooked date is future, a non-cooking plan applies, or an explicit preparation receipt exists even on today
- **THEN** portions remain read-only and attempted date edits apply none of their batch

#### Scenario: Version changes during correction
- **WHEN** another member changes portions, replaces the occurrence or records explicit preparation after the editor's baseline read
- **THEN** existing guarded save/reconciliation rules prevent a stale correction from overwriting the changed state and retain a reviewable draft

#### Scenario: Deployment day rolls over before save
- **WHEN** a correction captures today's absolute date and the deployment advances to the next day before submission
- **THEN** the now-past date is rejected without applying any batch row, and the draft is retained for clear review rather than moved to the new today
- **AND** browser timezone or a captured reference week cannot bypass this cutoff

#### Scenario: Reset today's cooked correction to usual
- **WHEN** the current Cooked supper has no preparation receipt, usual is four and its five-portion override is reset and saved
- **THEN** the override is removed and four is captured for that completed date; a later usual/member change does not rescale it
- **AND** returning without edits preserves five and an unavailable usual supplies no invented reset number

#### Scenario: Saved correction updates groceries
- **WHEN** today's cooked count correction commits and changes a reliable weekly grocery requirement
- **THEN** the existing updating/current/failed grocery journey and increased-needs check policy apply to the corrected quantities
- **AND** an increase can uncheck that affected item, while unchanged/decreased requirements and unrelated checks retain their existing policy

#### Scenario: Correction acknowledgement or grocery follow-up is uncertain
- **WHEN** the save reply is lost or grocery work fails after a committed correction
- **THEN** authoritative portion reconciliation and grocery retry recover the saved correction without blindly repeating it, reopening cooking or recording history again
