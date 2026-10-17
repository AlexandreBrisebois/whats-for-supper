# Design

## Context

See [proposal](proposal.md) for motivation and [delta](specs/household-identity/spec.md) for the observable baseline. The [durable plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline-plan.md), BSL-018/019, owns source evidence and confidence. This is extraction design, not application design: the existing UI, store, contract, controller/service and SQL already supply the supported path. Include this document because cross-layer validation and the new uniqueness index create material ambiguity about unsupported rename failures.

The first observable slice is opening a loaded member's editor in Settings or onboarding, saving a valid nonconflicting name, and seeing the returned name on the same member row. The trace is FamilyMemberList → useFamily/familyStore.updateMember → family adapter/generated item PUT → OpenAPI → FamilyController.Update → FamilyService.UpdateFamilyMember → EF family_members → 200/data → client list replacement. Current shared access and selected-name requirements remain their own owners.

## Goals / Non-Goals

**Goals:** Keep each normative claim tied to BSL-018 source or inspected assertions; distinguish implementation support from runtime observation; preserve all existing requirements by using ADDED blocks only.

**Non-Goals:** No new behavior, duplicate-name policy for rename, contract repair, UI recovery redesign, database migration, runtime qualification, successor identity slice or archive correction. A34 defers implementation and database access. API removal and Profile switching remain unextracted.

## Decisions

1. **Extend the existing owner with five additions.** Rename belongs to household identity, rather than a new technical capability. The draft changes neither shared access nor the original selection, creation or invite requirements.
2. **Describe the supported success path, with narrow cancellation.** Input is prefilled, trim/nonblank handling exists, service saves the same ID and updated timestamp, then client replaces its loaded row. Cancel/Escape scenarios apply before submission; no request-abort or pending-lock promise. Opening Edit stops selection propagation; rename never invokes selection/cookie/completion/router actions.
3. **Keep discrepancies non-normative.** U23: OpenAPI PUT lists only 200; implementation has blank/missing exceptions, incomplete input bounds and index-dependent conflicts without a rename-specific 409 translation. U24: store catches failure, editor closes, Settings lacks store-error feedback; keyboard handlers remain active while buttons disable. Specifying ideal recovery or extending creation uniqueness would invent requirements and application work. Existing evidence remains visible without making these limitations desired behavior.
4. **Use source/assertion evidence under A10.** Controller/service tests assert a normal rename, blank and missing-ID paths using auth-bypassing/InMemory factories. Settings browser assertion substitutes a fixed 200 ID/name response, omits contract-required fields and never proves SQL mutation, read-after-reload or recovery. We retain those limits instead of treating mock success or a test name as a passing run. No new tests are necessary for this documentation change.
5. **Keep lifecycle stages separate.** CLI artifact readiness and completed extraction tasks mean a draft exists. Human acceptance, main-spec promotion and archival each need their own authorization; application acceptance remains deferred. The requested historical sentence in the delta concerns earlier member creation; the reported later authorization still awaits its original reference.

## Risks / Trade-offs

- Declared unique index can affect rename → require nonconflicting names and successful persistence in positive scenarios; retain unresolved duplicate/length failures as U23, without claiming 409 or rollout safety.
- UI swallows update failures and closes editing → do not promise retained input, error visibility or retry behavior (U24); no fixes bundled.
- Shared loading and active keyboard handlers permit races → cancellation is only unsubmitted; no exactly-once, complete pending lock or concurrency guarantee.
- Local list replacement is not a household broadcast → no SSE/cross-device synchronization guarantee; current loaded display follows existing owner.
- Historical status prose can become stale → label the exact requested sentence as non-normative historical context and state the later reported authorization/reference status alongside it.

## Migration Plan

No deployment, migration, service startup or database action applies. Deliver a validated documentation-only draft and stop for review. Promotion would append accepted additions only in a separately authorized session; archival would be another action. Application implementation/qualification is not a task of this baseline change.

## Historical extraction evidence relocated for OpenSpec 1.14.2

The following non-normative material was moved from this change’s delta preamble to satisfy the upgraded validator. Requirement/scenario blocks and main specifications are unchanged by this relocation. Earlier draft/lifecycle statements remain historical; later recorded authorizations still govern. Relative links retain their original targets.

Evidence: BSL-018/019 and U23/U24 in the [durable plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline-plan.md). This draft records source-supported ordinary-household behavior; runtime checks are not-run. Household access follows “Authenticate protected API requests independently”; selected-name display follows “Display the selected member on Profile”.

Non-normative historical status note requested by the user (BSL-015):

> However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.

That sentence describes the earlier member-creation review state. The user subsequently reported later authorization, with its original instruction/reference pending. Implementation and database qualification are deferred; this note neither changes rename requirements nor supplies acceptance or retrospective approval.
