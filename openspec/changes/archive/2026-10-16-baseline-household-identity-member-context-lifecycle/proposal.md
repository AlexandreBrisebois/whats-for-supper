# Proposal

## Why

The final identity-owner audit found member-cookie options and the hydrated landing route absent from the promoted requirements. These are connected ordinary-household context behaviors, distinct from the already promoted selection/recovery flows.

## What Changes

- Draft primary member-cookie options using existing shared cookie-option policy.
- Draft the hydrated landing client's navigation request based on its current selected context.
- Preserve delivery, fallback, stale-member and non-atomic handoff qualifications; do not promise durable identity or arrival.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `household-identity`: add member-cookie configuration and conditional landing routing.

## Impact

Documentation only. Source trace: root layout → IdentityValidator/landing route and onboarding/Profile → familyStore → auth.ts/cookie helper → later page/API gates. BSL-household-identity-029 records evidence. No application/API/client/test/SQL/config changes, acceptance, promotion, archival or runtime qualification. This is the third sequential slice under the user's 2026-10-16 authorization.
