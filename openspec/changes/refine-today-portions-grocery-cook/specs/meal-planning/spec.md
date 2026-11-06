## MODIFIED Requirements

### Requirement: Finish or cancel a week portions draft explicitly

Portions SHALL retain Cancel/Done, draft-only minus/plus and direct integer entry. Usual configuration SHALL live in Settings, not in this editor. A compact usual-number button SHALL clear a date override in the draft. Done saves one changed batch after confirmation without waiting for groceries; Cancel restores saved values. Failed, invalid, concurrent or uncertain saves SHALL preserve correctable drafts and existing reconciliation.

#### Scenario: Include leftovers
- **WHEN** Portions opens
- **THEN** concise How many portions? and Include extra for leftovers guidance describe one total per date without attendance or separate leftovers controls

#### Scenario: Edit two dates and finish
- **WHEN** Wednesday is entered as five and Saturday as seven, then Done is activated
- **THEN** one batch persists those integers and confirmed values appear on return
- **AND** ordinary cards gain no permanent stepper or repeated default-setting field

#### Scenario: Leave with a draft
- **WHEN** a person changes week, opens Groceries or leaves Planner with unsaved counts
- **THEN** Save and continue is primary, Keep editing secondary and Discard changes quiet text
- **AND** save continues only after persistence; failure retains draft/destination, Keep editing stays and Discard restores saved state before leaving

#### Scenario: Past or completed supper
- **WHEN** a past date, future Cooked supper, non-cooking plan or explicitly prepared supper appears
- **THEN** its stored/frozen portions remain read-only and historical plans remain unchanged

#### Scenario: Blank usual portions
- **WHEN** the legacy saved usual is blank or null and a date has no override
- **THEN** the migrated date inherits a positive automatic family count when available, rather than preserving the former blank-as-original rule for editable future dates
- **AND** an unavailable family count retains original quantities honestly; explicit overrides and historical/prepared original-quantity snapshots remain unchanged

#### Scenario: Invalid entry or concurrent saved change
- **WHEN** a count is zero, negative, fractional, nonnumeric or out of range, or another member changes the baseline
- **THEN** validation/conflict review retains the draft without a partial batch, hidden overwrite or premature navigation

#### Scenario: Automatic usual portions
- **WHEN** no explicit usual exists and family size is four
- **THEN** editable inherited dates use four and their compact reset target is four, without exposing the usual-setting field in Planner
- **AND** explicit date overrides remain effective until deliberately reset

#### Scenario: Correct today's Cooked count
- **WHEN** today has a Cooked supper without an explicit preparation receipt
- **THEN** the editor shows its actual saved count and enables deliberate dated correction under the supper-servings current-day rule
- **AND** it remains marked Cooked; Done, Cancel, three dirty-exit choices and correction conflict/recovery keep their roles

#### Scenario: Correct a frozen inherited number without an override
- **WHEN** today's eligible Cooked supper has saved inherited portions five, no override and current usual four
- **THEN** opening shows five without changing it, entering four creates a real correction draft, and Cancel restores five
- **AND** Done persists four rather than mistaking equality with current usual for an unchanged saved count

### Requirement: Reset date portions with a compact usual-number action

When an editable date has an override or changed draft and usual is known, its reset control SHALL show the usual number alone with a date-specific accessible action label. Activation SHALL clear the override draft and show inherited usual immediately, awaiting Done. Read-only dates SHALL remain protected. Unknown usual SHALL not create a blank or misleading numeric button; a quiet unavailable explanation SHALL retain date editing where allowed.

#### Scenario: Reset five to usual four
- **WHEN** Sunday's override is five and usual is four, then its visible 4 button is activated
- **THEN** the field changes to four in the draft, its accessible name describes using usual four portions for Sunday, and Done persists removal of the override
- **AND** Cancel instead restores saved five

#### Scenario: Same number but different inheritance
- **WHEN** an uncompleted date has override four equal to usual four and the 4 reset button is activated
- **THEN** reset still removes the explicit override on Done so a later automatic/default change can affect that date
- **AND** accessible status explains the draft's inherited state without requiring a numeric change

#### Scenario: Prepared and unavailable states
- **WHEN** the date is frozen or the usual count is unknown
- **THEN** no enabled numeric reset suggests it can change that state, and known prepared/date values are not overwritten

#### Scenario: Default changes during editing
- **WHEN** usual changes elsewhere while an override-reset draft is open
- **THEN** existing baseline conflict/review handles it without silently saving a stale visible usual number

#### Scenario: Reset a corrected Cooked count without following future usual changes
- **WHEN** today's Cooked supper has no preparation receipt and its eligible correction draft uses the compact usual reset
- **THEN** it previews the current usual number, with Cancel restoring its saved count and Done capturing that number for the completed date
- **AND** reset also works when an earlier draft exists over a frozen inherited value without an override; later usual/member changes do not rescale the saved Cooked date
