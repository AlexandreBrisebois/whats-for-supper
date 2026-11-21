# Spec Delta

## ADDED Requirements

### Requirement: Present Recycle Bin actions with Family Cookbook tokens and 48px targets

The Recycle Bin sheet and elevated PIN confirmation dialog SHALL use Family Cookbook cream/white surfaces, terracotta destructive tokens instead of raw red utilities, sentence-case `>= 12 CSS px` metadata, and `>= 48 CSS px` Restore, Delete, Cancel, and Close touch targets.

#### Scenario: Member opens Recycle Bin and requests permanent purge

- **WHEN** a member views soft-deleted items or opens the elevated PIN dialog
- **THEN** restore, destructive delete, and dismissal controls use Family Cookbook tokens clearing WCAG 2.2 AA contrast and `>= 48 CSS px` targets
