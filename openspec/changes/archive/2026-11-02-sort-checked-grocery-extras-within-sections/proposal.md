# Proposal

## Why

Checked extras stay above unchecked recipe groceries in a section because the checklist renders all extras first and sorts only recipe rows by check state. This makes completed shopping appear ahead of work still to do, despite the existing aisle ordering requirement.

## Outcome and Scope

Every grocery section shows unchecked rows before checked rows, including extras. Within each check group, extras retain their supplied order ahead of recipe rows, and recipe rows retain their supplied order. Checking or unchecking an extra changes its position without merging it with another extra or a same-name recipe row. The same ordering applies after a fresh schedule read or household update.

This is a checklist presentation fix. Existing check persistence, extra identity, section selection, counts, completion, historical read-only state, and future-week projection remain governed by their current contracts. No API, database, or data migration changes are needed.

The supplied Library screenshot is `2440.png`; its metadata and extracted text identify a Pantry checklist with checked and extra rows. The image-byte transfer failed, so its actual pixels could not be inspected. The source and existing specification establish the defect and scope.

## What Changes

- Apply the aisle's existing unchecked-before-checked rule to extra rows as well as recipe-derived rows.
- Preserve each source's order within the unchecked and checked groups when extras and recipe rows share a section.
- Cover mixed rows, check/uncheck movement, failure recovery, and authoritative rerendering with focused tests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `grocery-shopping`: Clarify that the existing aisle ordering requirement includes extras and mixed-source rows.

## Impact

- **PWA:** `pwa/src/components/planner/GroceryList.tsx` and its component tests; one grocery Playwright test currently uses a positional locator that becomes ambiguous when duplicate extras reorder.
- **Contracts:** No OpenAPI, persistence, workflow, client generation, or live-update protocol changes.
