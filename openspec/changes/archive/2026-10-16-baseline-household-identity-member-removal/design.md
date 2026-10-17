# Design

## Context

See [proposal](proposal.md) for motivation and [delta](specs/household-identity/spec.md) for the two observable requirements. The [durable plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline-plan.md), BSL-020–022, owns the source trace, inspected assertions and confidence. This extraction design is included because shared authorization, EF/SQL side effects and separate browser cleanup create material ambiguity about which behavior belongs in the baseline.

The first observable slice is an authorized consumer deleting an existing unreferenced member, receiving 204, then observing its absence from the family list. The existing path is family adapter/generated item DELETE → OpenAPI → FamilyController.Delete → FamilyService.DeleteFamilyMember → EF remove/save → NoContent; the later GET uses GetAll/GetAllFamilyMembers and the success envelope. The PWA store/hook exposes removal but no connected component invokes it. Source manifest inputs were rechecked unchanged before drafting.

## Goals / Non-Goals

**Goals:** Extend the existing household-identity owner using ADDED requirements only; map each scenario to current source and actual assertions; distinguish source-supported behavior from runtime verification and lifecycle acceptance.

**Non-Goals:** Application design or implementation, DELETE execution, contract repair, relational qualification, member reassignment, deletion UI, browser recovery changes, new tests, Profile switching or archive reconciliation. No personal account or admin-role model is introduced.

## Decisions

1. **Keep the API-only boundary settled by A40.** Two additions describe successful removal and later list absence. Inventing a Settings deletion journey from an exported helper would contradict the caller trace; extending original onboarding selection would mix separate triggers. Reuse the existing capability and shared-access requirements.
2. **Use persistence-success conditions and an unreferenced-member scenario.** Controller/service source and InMemory tests support this path. EF/SQL declare vote/flag cascades and attribution nulling, but deployed constraints and referenced-member outcomes have no current runtime evidence. Including those as normative promises would exceed A40; preserve them in BSL-020/U25 instead. Deferring them does not block this source-supported draft under A10/A34.
3. **Do not normalize error or permission discrepancies.** DELETE OpenAPI declares only 204 and member-header security; the service/middleware supports missing-ID 404 and generic provider 500, while Program enforces shared household access without member ownership checks. Keep those U25 differences non-normative rather than altering the contract or inventing a successful-repeat, self-only or admin-only policy. Existing shared-access requirements remain the authorization owner.
4. **Separate server removal from browser identity.** Direct DELETE does not expire cookies or update browser stores. The disconnected removeMember helper performs exact-ID cleanup after API success, can leave stale state on cookie-action failure, and has no atomic cleanup/navigation guarantee. IdentityValidator clearing requires a nonempty loaded list and is unawaited. U26 and existing identity limitations remain evidence; an automatic removal/recovery journey is not drafted.
5. **Retain test boundaries and historical status.** Controller assertions cover 204 and later absence plus missing-ID 404 with auth omitted/InMemory; service assertions cover absence and a missing-ID exception. They do not qualify SQL cascades, cookies or current-identity recovery. Browser mock DELETE returns 204 without list mutation and its me handler returns synthetic success. No test execution is claimed. Retain the exact BSL-015 historical sentence outside normative additions with its later-authorization-reference caveat.

## Risks / Trade-offs

- Installed FK behavior may differ from source declarations → keep U25 and database qualification deferred; do not promise safe referenced removal or total history erasure.
- Error/security metadata differs from executable checks → reuse the settled access owner and qualify successful persistence; no API/client/schema fixes.
- Browser state can outlive the member row → retain U26 and avoid atomic or universal cleanup/recovery guarantees.
- Mock success can conceal missing list mutation or stale identity → cite assertions/substitutions separately from runtime results; no new behavior tests for documentation extraction.
- Artifact readiness can be mistaken for acceptance → stop at a validated draft; acceptance, promotion and archival remain separately authorized actions. Rename remains active.

## Migration Plan

No deployment, migration, service startup or database action applies. Review and validate the documentation-only artifacts, then stop for human review. A later authorized promotion would append only accepted additions; archival is separate. Application qualification remains deferred under A34.

## Historical extraction evidence relocated for OpenSpec 1.14.2

The following non-normative material was moved from this change’s delta preamble to satisfy the upgraded validator. Requirement/scenario blocks and main specifications are unchanged by this relocation. Earlier draft/lifecycle statements remain historical; later recorded authorizations still govern. Relative links retain their original targets.

## Evidence and status (non-normative)

This documentation-only baseline draft uses implementation-supported evidence in the [durable plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline-plan.md), BSL-020–022. Runtime API/browser/PostgreSQL checks are not-run; implementation/database qualification remains deferred under A34. U25/U26 remain non-normative under A40: no connected deletion UI, referenced-member safety, complete error-contract parity or browser cleanup/recovery guarantee is asserted.

Historical member-creation limitation retained under BSL-015/U22:

> However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.

That sentence records the earlier review state. The user's report of later authorization remains recorded; its original reference is pending. It is not a removal requirement, new archival approval or runtime result.
