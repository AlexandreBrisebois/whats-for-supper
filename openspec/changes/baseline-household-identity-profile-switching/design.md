# Design

## Context

See the [proposal](proposal.md) for motivation and [delta](specs/household-identity/spec.md) for four additions/eight scenarios. The [durable plan](../../../docs/openspec-baseline-plan.md), BSL-024/025, owns the source trace and assertion mapping. This extraction design is included because the separate cookie, store and navigation effects create ambiguity about the supported handoff.

The first observable slice is ProfilePage → ProfileDropdown toggle → inline named choices without identity change. Option activation calls Profile's handler → useFamily/familyStore.selectFamilyMember → awaited server cookie action → readable-cookie fallback → selected ID. Independently, Profile marks onboarding complete and pushes Home without awaiting selection. Continue-as only pushes Home. All 31 BSL-024 evidence inputs were rechecked unchanged before drafting.

## Goals / Non-Goals

**Goals:** Preserve the existing household-identity owner, add supported Profile triggers without rewriting shared requirements, and keep source support distinct from runtime verification and human acceptance.

**Non-Goals:** Application changes, new validation/error handling, navigation coordination, request cancellation, service/database access, test additions, preferences, deployment variants or lifecycle reconciliation. No personal authentication or fresh member eligibility policy is introduced.

## Decisions

1. **Own the distinct Profile triggers with ADDED requirements.** The real control opens inline choices on Profile; it does not navigate to onboarding. Rewriting onboarding selection would conflate its initial awaited cookie write and replace-navigation with Profile's unawaited selection and push-navigation. Retain both source paths and reuse existing access, API resolution, recovery and selected-name owners.
2. **Describe menu dismissal before selection.** Toggle and document mousedown outside close local menu state without invoking selection. No Escape or dedicated Cancel action exists, and dismissal cannot cancel an already started cookie action. A broader cancellation requirement would exceed source and A45.
3. **Separate a Home request from a completed identity change.** Selection requests onboarding completion/Home immediately; the selected ID changes only after cookie actions. Use success conditions for identity outcome while retaining U27 non-normatively. Requiring an awaited, atomic handoff would prescribe a behavior fix rather than extract the baseline. Selecting the current choice is also supported; there is no different-ID guard.
4. **Reuse loaded members without a freshness promise.** Profile loads only when hasLoaded is false; load failure also sets it true. Neither opening nor selecting validates against the server. Family reads use the existing generated GET/OpenAPI 200 data-array path; selection invokes no member mutation API. Shared proxy/IdentityValidator recovery and their U13/U26 limits remain unchanged. Profile's loading placeholder is supported, but list-error/empty feedback and universal retry are not promised (U28).
5. **Keep Continue-as independent of selection.** Its condition is a loaded selected member and its sole handler effect is Home navigation. Treating it as a cookie-write retry or fresh selection would contradict the source.
6. **Retain actual test boundaries.** Profile unit coverage mocks the dropdown, hook, router and completion; it asserts stub rendering only. Profile browser assertions cover heading/Continue-as and URL Home with preseeded identity and substituted APIs. Persistence tests do not switch; onboarding's click lacks a Home/cookie assertion and auth-flow's Home assertion is for an invite. No current runtime result is claimed. Preserve BSL-015's exact historical sentence and later-authorization-reference caveat in the non-normative delta note.

## Risks / Trade-offs

- Navigation can precede the cookie/store change or cookie rejection → retain U27; promise only the request and conditional identity result, with no pending lock, rollback or universal recovery.
- Loaded data may be stale or absent after a failure → retain U28; no fresh validation or new error/empty/retry UI requirements.
- Mock or preseeded-identity assertions can be mistaken for switching qualification → map source and assertions separately; runtime remains not-run under A10/A34.
- Readable fallback and HttpOnly cookie behavior depend on browser/configuration → record invocation without claiming overwrite, durable retention or cross-tab/device synchronization.
- Completed extraction tasks can be mistaken for acceptance or promotion → stop at validated draft; keep main and both prior active changes unchanged.

## Migration Plan

No deployment, migration or runtime action applies. Validate and review the documentation-only draft. Later acceptance, main-spec promotion and archival require separate authorization. Implementation/database qualification remains deferred under A34.
