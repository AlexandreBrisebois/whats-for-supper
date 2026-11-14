# Design

## Context and Existing Ownership

The user approved only the scoped Portions correction. The editor currently uses current usual before saved effective portions and null override equality discards reset. SupperServingsService.SaveAsync likewise skips a null reset with no saved override. Existing schema, transaction, versions, materialization, projections and refresh own persistence and side effects. Current-day eligibility already exists. The shared serving mock already persists null resets into inherited state.

## Decisions and Tradeoffs

Use saved day.servings for the clean numeric baseline, explicit drafts for edits, and usual only for deliberate reset. Preserve same-number override intent and existing reset visibility. Allow the server's null-reset write only when today's already-eligible Cooked inherited snapshot differs from usual. Preserve no-op behavior elsewhere. Existing route/payload contract already defines null as reset to usual; no contract/client shape changes.

## First Observable Slice

Establish component red for inherited five/usual four and PostgreSQL HTTP red for null-reset persistence. Make editor numeric/reset intent and existing transaction write correct, then exercise actual browser controls with the shared stateful mock. PostgreSQL HTTP acceptance separately verifies fresh projection, stored count, preserved identity/status/history and later-default freezing.

## State, Concurrency and Recovery

Retain all existing version, eligibility, uncertain-save, pending and dirty-exit rules. A clean inherited five differs from usual four; resetting after draft must retain null intent. No new state outside the existing draft map.

## Persistence and Side Effects

A changed reset updates inherited count/version in the existing guarded transaction and enlists existing grocery invalidation. Explicit preparation and automatic materialization remain unchanged. Schema/migration: not applicable.

## User Experience

No new visible text, controls or layout. Existing count and reset perform the saved intent. Test open/leave, numeric edit, reset after draft and ordinary explicit reset.

## Compatibility, Rollout and Reversal

No API shape, generated client, migration or deployment. Existing stored counts remain valid; reverting would restore the bug without deleting saved corrections.
