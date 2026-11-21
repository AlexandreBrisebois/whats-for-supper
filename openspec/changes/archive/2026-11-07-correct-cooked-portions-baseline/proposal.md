# Proposal

## Why

An editable current-day Cooked supper can retain inherited portions five while usual portions becomes four. The Portions editor then displays four and discards a deliberate correction or reset as unchanged.

## Outcome and Scope

Implement the user-approved correction through existing Portions controls, without added text, controls or layout changes. Keep explicit overrides, prepared/history protection and existing grocery consequences intact. This succeeds only when the saved baseline displays correctly, an explicit change to usual saves, and the existing reset persists the intended frozen count.

## What Changes

- Display saved effective portions until a local draft exists.
- Compare numeric drafts with the saved effective count while preserving existing override/reset intent.
- Persist deliberate reset of today's eligible Cooked inherited snapshot when it differs from usual.
- Retain control visibility, API shapes, history, recipe identity and default/member freezing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `supper-servings`: correct the saved inherited baseline and existing reset for today's Cooked supper without preparation.

## Impact

Existing useSupperServingsEditor, SupperServingsService, stateful serving mock and focused component/browser/PostgreSQL tests. No database migration, deployment, commit, archive or unrelated archived tasks.
