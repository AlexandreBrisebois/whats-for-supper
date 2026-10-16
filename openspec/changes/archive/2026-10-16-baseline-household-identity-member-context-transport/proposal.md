# Proposal

## Why

The promoted identity baseline resolves member context for `/api/family/me` but does not define its shared request transport for consuming journeys. A bounded extraction makes that responsibility explicit without treating the household credential as a personal identity.

## What Changes

- Draft browser SDK, server-fetch and shared binder context requirements from current source (BSL-household-identity-026).
- Reuse existing household authentication, selection and recovery requirements without regenerating them.
- Retain endpoint-specific validation, capturer/reporting discrepancies and all prior limitations outside new guarantees.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `household-identity`: add request member-context transport and shared binding behavior.

## Impact

Documentation only: this proposal, design, identity delta, extraction tasks and capability evidence/checkpoint. Source boundaries are `HearthAuthProvider`, `serverFetch`, `FamilyMemberIdModelBinder` and immediate report/current-member consumers; no source, API, client, SQL or configuration edits. No migration, runtime qualification, acceptance, promotion or archival. User authorization dated 2026-10-16 covers sequential remaining baseline generation; this change remains a draft for human review.
