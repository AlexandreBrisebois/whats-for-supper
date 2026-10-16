# Design

## Context

See proposal.md for motivation. The first observable slice is a contract-valid authorized preference PUT and its next read. FamilyController delegates DTO values directly to FamilyService; data wrapping is supplied by SuccessWrappingFilter. The PWA family adapter maps generated responses and familyStore implements optimistic reconciliation.

## Goals / Non-Goals

**Goals:** Extract the traced observable slice with explicit ownership and evidence limits.

**Non-Goals:** Application changes, runtime/database/device qualification, acceptance, main-spec promotion, or repair of the recorded limitations.

## Decisions

- Keep household authorization and identity transport owned by household-identity “Carry browser member context on shared SDK requests” and “Bind shared API member context independently of membership validation”. No target-equals-caller guarantee is introduced: this PUT targets its route ID.
- Describe canonical enum values and status codes; withhold the exact 400 envelope because OpenAPI documents error while middleware emits status/message.
- Use the companion language slice for explicitly accepted language-only behavior. Other source normalization and partial/empty payload behavior remains evidence only.

Evidence and requirement/scenario mappings: BSL-member-preferences-007–008 in the [capability plan](../../../../docs/openspec-baseline/member-preferences.md). A10 implementation support is distinct from A34 runtime evidence.

## Risks / Trade-offs

- Family language schemas combine nullable type with en/fr-only enum, whereas a new member has null → U-MP13; no exact null-wire conformance claim is drafted.
- In-memory service and auth-disabled TestServer controller assertions do not establish PostgreSQL constraints or deployed authorization.
- No family-store save request version guards exist → U-MP05; single-save rollback must not imply overlapping-save or switch safety.
- SQL permits null language and constrains canonical values; EF InMemory does not enforce those SQL checks → runtime qualification remains not-run.
