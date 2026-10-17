# Proposal

## Why

After Home moves, defers or drops the original meal, its replacement is dispatched in the background and recovery closes before persistence is acknowledged. Source confirms that assignment failures are only logged; the household can see a replacement that was never saved and lose retry context. Duplicate or misplaced meals remain risks to reproduce, not confirmed production incidents.

## Outcome and Scope

Address WFS-BL-002 for Home's Pick Something Else recovery after Tomorrow, Save for Next Week and Drop. Keep the captured original date, source identity and replacement choice; acknowledge each completed stage, await replacement persistence and let the person retry only unfinished work. A recovery save must not overwrite a newly occupied supper slot. Existing Tomorrow movement and deployment-calendar policies remain authoritative.

Recovery is retained for the mounted Home session. Closing after partial completion explicitly abandons the pending choice without undoing completed work; reloading returns to the persisted plan. Durable cross-reload resumption, combined move-and-replace transactions, universal idempotency, ordinary assignment redesign and other callers' recovery redesign are excluded.

## What Changes

- Display saving, save failure, uncertain outcome and refresh failure separately; close/navigate successfully only after the replacement is confirmed saved.
- Remember completed disposition and retry only replacement against the original captured date/reference week. Repeated clicks and late responses must not repeat movement or alter another session.
- Reconcile lost replies through authoritative reads; never infer rollback from an error or replay a completed disposition.
- Add an opt-in empty-supper-slot precondition to the existing assignment operation. Recovery uses it; omitted/false preserves ordinary assignment compatibility. Occupied targets return conflict without carry-forward or other mutations.
- Preserve pending choice on failure and show the actual saved plan rather than presenting an unconfirmed optimistic replacement as saved.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tonight-meal-decisions`: acknowledged Home replacement, retained staged recovery, captured-date retries and partial-completion dismissal.
- `meal-assignment`: optional atomic empty-supper precondition on assignment, with legacy behavior retained when omitted.

## Impact

Primary PWA owners: `HomeCommandCenter`, `SkipRecoveryDialog`, `todayStore`, planner API wrapper and the existing `moveTomorrow` helper. Backend boundary: assignment DTO/controller/service, approved OpenAPI, generated Kiota client and method-sensitive assignment mocks/builders. Tests cover real HTTP/PostgreSQL persistence, the generated browser client, grocery follow-ups and household updates.

Evidence: [original audit register](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/backlog/discrepancy-register.md), `pwa/src/store/todayStore.ts` background assignment, `pwa/src/components/home/HomeCommandCenter.tsx` disposition/close sequencing and `api/src/RecipeApi/Services/ScheduleService.cs` occupied/Sunday assignment. Current code was inspected; no new runtime reproduction has been run. Planning writes are restricted to this change directory; main specs, application code and backlog status are unchanged.

## Approved verification-harness correction

During apply, the final contract gate treated non-nullable C# `bool RequireEmpty = false` as a required wire field despite the matching optional OpenAPI default. The user explicitly approved the prepared checker correction and focused regression tests. Extend ownership only to `scripts/agent/drift.py` and `scripts/agent/tests/test_drift_defaults.py`: recognize matching explicit JSON-compatible defaults while retaining checks for required, missing-default and mismatched-default fields. This does not change the API policy or authorize other harness cleanup.
