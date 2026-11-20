# Spec Delta

## MODIFIED Requirements

### Requirement: Identify extras with a compact text source label

Every visible extra SHALL show the word `Extra` as compact, non-interactive accent-colored text adjacent to its item name. The source label SHALL use the existing Shared Table ochre highlight family with sufficient contrast on the actual grocery-row surface. It SHALL NOT add a pill background, border, icon, icon-only substitute, hover treatment, or week-origin wording. The visible word SHALL carry the meaning so color is not the sole identifier.

#### Scenario: Extra appears in a compact grocery row

- **WHEN** an extra row is shown in a current, future-week, or historical grocery view
- **THEN** `Extra` appears as compact accent-colored text beside the item name without adding a pill or action-like control

#### Scenario: Item name needs more room

- **WHEN** the item name and source label do not fit on one line
- **THEN** the source label may wrap with the name without reducing the tag or edit controls below their supported touch targets

#### Scenario: Checked or historical extra

- **WHEN** an extra is checked or displayed as read-only history
- **THEN** its text source label remains legible and continues to identify the row as an extra
