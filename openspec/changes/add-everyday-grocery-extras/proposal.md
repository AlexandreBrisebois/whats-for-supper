# Proposal

## Why

The shared grocery checklist currently contains only needs derived from planned suppers, so a household must use another app for coffee, breakfast food, cleaning supplies, and other everyday shopping. Issue #284 calls for those extras to live in the same familiar checklist without being erased by meal-plan changes or creating a second list-management workflow.

## Outcome and Scope

Household members can add a name-only extra from a thumb-reachable composer at the bottom of the current-week grocery view, shop it like another grocery row, recategorize it with the existing tag control, and rename or delete it inline. After two typed characters, an upward-opening tray offers up to three matching names from the household's prior extras without blocking free-text entry or adding on selection. Each extra is a distinct, stable item identified by a compact accent-colored `Extra` source label; matching recipe-derived rows and repeated extras remain separate.

The immediately next week's grocery view combines its supper-derived needs with the current week's still-unchecked extras so a household can shop ahead without prematurely rewriting history. Those extras retain their current-week identity and the same compact `Extra` source label; checking one on Saturday records it in the current week's snapshot and prevents carry-forward. The add composer remains available only in the current-week view, and weeks beyond next week do not project extras.

At deployment-week rollover, Dreaming carries each remaining unchecked extra into the new current week while preserving a read-only snapshot in every prior week where it appeared. An idempotent current-week read repairs a late or failed Dreaming rollover. Checking, editing, recategorizing, or deleting targets only the current occurrence even when it is presented alongside next week's supper groceries. Current edits feed later carry-forward while historical snapshots retain their earlier name, category, and completion state. Recipe-derived grocery history keeps its current behavior.

The increment includes shared persistence, contract/client/mock parity, household-history name suggestions, household live updates, interruption and conflict recovery, exact backup/recovery coverage, focused accessibility, and family-guide documentation. It does not add quantities, units, recurring-staples automation, recipe-ingredient autocomplete, pantry inventory, per-person ownership, store integrations, pricing, a separate dashboard, or a broad offline architecture.

## What Changes

- Add distinct persisted weekly extra occurrences with lineage and stable identities, Dreaming-owned rollover, and deterministic catch-up across one or more missed week rollovers.
- Add API operations to create, check, rename, recategorize, and delete the current occurrence without rewriting historical snapshots.
- Extend grocery read models so current extras coexist with current or immediately-next-week recipe-derived lines while retaining separate identity, source, category, and check behavior.
- Add a sticky bottom composer that remains available in the empty state, a compact upward-opening history suggestion tray, a compact accent-colored `Extra` source label, and current-occurrence inline edit/delete controls.
- Keep optimistic actions honest: show pending state, reconcile authoritative household updates, restore an optimistically removed row on failure, and prevent stale responses from changing another displayed week or item version.
- Include extra occurrences in independent exact snapshot/recovery and document extras plus optional history suggestions in the family guide.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `grocery-shopping`: Add, display, carry, complete, recategorize, rename, delete, recover, and retain historical snapshots for household extras in the shared grocery checklist.
- `household-live-updates`: Publish and reconcile identity-safe extra mutations across household clients and week boundaries.
- `data-backup-and-recovery`: Include the new authoritative extra-occurrence records in exact snapshot and restore membership.
- `scheduled-maintenance`: Materialize weekly extra rollover through Dreaming with independently recoverable failure behavior.

## Impact

- **Contract:** `specs/openapi.yaml`, generated Kiota models/client operations for extra mutations and name suggestions, and stateful handlers in `pwa/e2e/mock-api.ts`.
- **API and persistence:** grocery-extra entity/mapping/migration, schedule projection, calendar-aware carry-forward service, mutation endpoints, transaction/concurrency handling, SSE publication, and recovery table inventory.
- **Workflow:** `api/src/RecipeApi/Workflows/dreaming.yaml` and its processor/reporting path add idempotent extra rollover without making shopping reads depend solely on maintenance success.
- **PWA:** `GroceryList`, accessible combobox/listbox suggestion behavior, week/planner state, schedule API wrappers, SSE reconciliation, localization, and grocery unit/Playwright coverage.
- **Documentation:** `docs/user-guide.md` explains adding extras, optional history suggestions that never replace free text, preserved history, carry-forward, completion, editing, recategorization, and deletion.
- **Compatibility:** Existing recipe derivation, display-name check semantics, section correction behavior, selected-week navigation, and historical recipe grocery behavior remain unchanged.
