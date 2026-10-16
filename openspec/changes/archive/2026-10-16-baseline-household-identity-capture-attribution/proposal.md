# Proposal

## Why

The shared identity owner still leaves capturer attribution unreconciled. URL and photo intake assign the submitting member to initial stored metadata, while adjacent description, PDF, sharing, public reading and report attribution already have specification owners.

## What Changes

- Add only the missing ordinary URL/photo initial attribution requirement, supported by BSL-household-identity-027.
- Reconcile existing report/update attribution and the import-ID access discrepancy as evidence; do not create duplicate requirements or prescribe its retention.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `household-identity`: define the bound member's attribution on successful initial URL/photo persistence.

## Impact

Documentation only. Trace existing capture UI/hook, native photo wrapper or generated URL client, OpenAPI, controller, binder, RecipeService, RecipeInfo and recipe database row. No application/API/client/test/SQL changes, runtime qualification, migration, acceptance, promotion or archival. This is the second sequential slice under the user's 2026-10-16 remaining-generation authorization; it remains a draft for human review.
