# Spec Delta

## ADDED Requirements

### Requirement: Auto-reconcile recipe edit conflicts with smart defaults

When recipe detail editing encounters a conflict or recovered draft, it SHALL automatically fetch the current saved recipe, auto-merge untouched fields with saved data, default conflicting fields to the user's active draft with Era 3 toggle pills directly above Save changes and Cancel, and style inline edit alerts with Family Cookbook tokens.

#### Scenario: Automatic baseline check replaces intermediate reconciliation gates

- **WHEN** a recovered draft loads or a detail Save returns a concurrent version conflict
- **THEN** the editor automatically fetches the current saved recipe, merges untouched fields, defaults conflicting fields to the user's draft inside Era 3 `bg-white border-chrome-line` conflict cards with `aria-pressed` pill toggles, and lets `Save changes` commit against the updated revision directly without requiring `Check saved recipe`, `Reconcile draft`, `Apply reviewed draft`, or a raw `Original recovered draft` dump (except when ingredient schema versions changed)

#### Scenario: Failed automatic saved-recipe check exposes single Retry button

- **WHEN** the automatic read of the saved recipe fails during edit recovery or conflict
- **THEN** the editor retains the user's draft in an Era 3 Hearth alert card and exposes one `>= 48 CSS px` `<Button>` (`Retry`) until the read succeeds

#### Scenario: Inline detail alerts and recovery triggers follow Family Cookbook rules

- **WHEN** portion preview, dated ingredient projection, structured ingredient validation, or family notes saving encounters an error
- **THEN** the error renders with Hearth alert styling and accessible `>= 48 × 48 CSS px` `<Button>` retry actions with `outline-ink-body` focus rings

## MODIFIED Requirements

### Requirement: Preserve and reconcile instruction header drafts across reload and conflicts

Unsaved section header and step content edits SHALL persist in the local editor draft for the current recipe and participate in automatic conflict reconciliation when the saved recipe changes concurrently.

#### Scenario: Reconcile concurrent instruction changes

- **WHEN** a person has unsaved local edits to a section header or step content and the underlying recipe revision changes before Save
- **THEN** automatic conflict reconciliation compares the full instruction structure including section headers, defaults to the local draft with the latest saved revision applied to untouched fields, and allows toggling between the local draft and current saved instructions directly before activating `Save changes`
