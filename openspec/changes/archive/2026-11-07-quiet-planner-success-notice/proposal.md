# Proposal

## Why

Planner currently renders `visibleConfirmation` with a Refresh button after every reconciled planning return. Routine success consumes persistent space, but the same path also reports saved-but-unrefreshed and changed-plan states.

## Outcome and Scope

Remove the persistent routine-success banner and its Refresh action. Preserve authoritative reconciliation, dated navigation, accessible completion and meaningful replacement/spillover feedback. Planning only; no API, reconciliation-policy or general Planner read-error redesign.

## What Changes

- Confirm ordinary success once without a persistent page banner or Refresh.
- Retain targeted recovery for refresh failure or changed plans.
- Keep actual original-meal disposition and spillover visible until dismissed or the user leaves its context.
- Retire consumed success context so old URLs/history cannot replay obsolete receipts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-assignment`: planning-return confirmation presentation and lifecycle.

## Impact

`pwa/src/app/(app)/planner/page.tsx`, `pwa/src/lib/planner/planningResult.ts`, existing toast/focus infrastructure, bilingual strings and Planner/recipe-detail planning tests. No backend, generated-client or persisted-data changes.
