# Spec Delta

## MODIFIED Requirements

### Requirement: Finish or cancel a week portions draft explicitly

Portions SHALL provide a Recipes button with the planner icon, draft-only minus/plus, and direct integer entry while keeping usual configuration in Settings. Valid departures (week switch, Groceries, navigation) and Recipes SHALL save the changed batch before continuing without a multi-button confirmation menu; invalid, failed, concurrent, or uncertain saves SHALL auto-load the latest baseline into a compact Era 3 Hearth card while preserving drafts.

#### Scenario: Include leftovers

- **WHEN** Portions opens
- **THEN** concise How many portions? and Include extra for leftovers guidance describe one total per date without attendance or separate leftovers controls

#### Scenario: Edit two dates and finish

- **WHEN** Wednesday is entered as five and Saturday as seven, then Recipes is activated
- **THEN** one batch persists those integers and confirmed values appear on return
- **AND** ordinary cards gain no permanent stepper or repeated default-setting field

#### Scenario: Leave with a draft

- **WHEN** a person changes week, opens Groceries or leaves Planner with unsaved valid counts
- **THEN** the editor automatically saves that changed batch before continuing without displaying a three-button `Unsaved portions` confirmation card
- **AND** only if a draft is invalid or saving fails/conflicts does navigation pause with a compact Era 3 Hearth card holding one primary recovery/save action and one quiet `Discard` / leave escape

#### Scenario: Past or completed supper

- **WHEN** a past date, future Cooked supper, non-cooking plan or explicitly prepared supper appears
- **THEN** its stored/frozen portions remain read-only and historical plans remain unchanged

#### Scenario: Blank usual portions

- **WHEN** the legacy saved usual is blank or null and a date has no override
- **THEN** the migrated date inherits a positive automatic family count when available, rather than preserving the former blank-as-original rule for editable future dates
- **AND** an unavailable family count retains original quantities honestly; explicit overrides and historical/prepared original-quantity snapshots remain unchanged

#### Scenario: Invalid entry or concurrent saved change

- **WHEN** a count is zero, negative, fractional, nonnumeric or out of range, or saving fails or another member changes the baseline
- **THEN** invalid counts stay focused for correction without submitting, while failed/conflicting saves automatically read current saved portions and show the updated baseline inline alongside editable drafts in an Era 3 Hearth card without requiring a separate `Review saved portions` click gate

#### Scenario: Automatic usual portions

- **WHEN** no explicit usual exists and family size is four
- **THEN** editable inherited dates use four without exposing the usual-setting field in Planner
- **AND** explicit date overrides remain effective until edited

#### Scenario: Correct today's Cooked count

- **WHEN** today has a Cooked supper without an explicit preparation receipt
- **THEN** the editor shows its actual saved count and enables deliberate dated correction under the supper-servings current-day rule
- **AND** it remains marked Cooked; Recipes saves before returning, and auto-saving on other navigation and Hearth conflict/recovery follow the week portions rules

#### Scenario: Correct a frozen inherited number without an override

- **WHEN** today's eligible Cooked supper has saved inherited portions five, no override and current usual four
- **THEN** opening shows five without changing it, returning without edits preserves five, and entering four creates a real correction draft
- **AND** Recipes persists four rather than mistaking equality with current usual for an unchanged saved count
