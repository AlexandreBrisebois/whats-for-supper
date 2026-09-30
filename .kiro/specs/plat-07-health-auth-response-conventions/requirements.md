# Health, Authentication, and Response Conventions — Requirements

**Kind:** Current-capability feature specification

**Derivation:** Behavior-first, accelerated cadence

**Source:** `PLAT-07` in [`docs/feature-inventory.md`](../../../docs/feature-inventory.md), verified against current non-archived source, contract, and tests

**Status:** Baseline proposal for future change control; this specification does not authorize implementation

## Outcome

PWA and operators receive trustworthy service health, protected endpoints consistently enforce household access, and every API consumer sees the documented OpenAPI response shape.

## Scope

### In scope

- health and capability response
- shared Hearth-secret authentication
- member context propagation
- success/error wrapping and generated-client parity

### Non-goals

- individual user accounts or role-based administration
- returning secrets in diagnostics
- allowing implementation response shapes to override OpenAPI

## Verified current baseline

- `HealthController` exposes API/database/AI/demo status and the PWA proxies/consumes health.
- `HearthAuthenticationHandler` accepts the configured header or cookie token; authorization is enforced globally in `Program.cs` except approved anonymous seams.
- `FamilyMemberIdModelBinder` and cookies carry member context distinct from household authentication.
- `SuccessWrappingFilter`, `SkipWrappingAttribute`, `ErrorHandlingMiddleware`, and `JsonDefaults` implement response conventions governed by `specs/openapi.yaml`.

The baseline records current ownership; it is evidence to review, not a requirement
that every implementation detail remain unchanged.

## Requirements

### PLAT-07-R1 — Health truth

Health shall distinguish reachable service, database availability, configured optional capabilities, and demo state without disclosing secrets or claiming untested downstream health.

### PLAT-07-R2 — Household authentication

Protected HTTP and SSE operations shall reject missing/invalid household credentials consistently; approved public health or invite-validation seams shall be explicit.

### PLAT-07-R3 — Member context

Operations requiring a family actor shall validate member identity separately from household access and shall not accept an arbitrary untrusted member as authority.

### PLAT-07-R4 — Contract authority

Status codes, request/response schemas, wrapping, nullability, and examples shall match `specs/openapi.yaml` and the generated client.

### PLAT-07-R5 — Error safety

Unhandled and domain failures shall map to stable, non-secret error responses while retaining server-side diagnostics and correlation context.

### PLAT-07-R6 — Compatibility

Contract changes shall update controller/DTO, OpenAPI, generated client, mocks, and both sides’ tests atomically.

## Preserved behavior

- Existing household meal workflows remain usable when this capability is degraded,
  except where the capability is the explicit security or persistence prerequisite.
- Changes preserve household/member boundaries and do not broaden collection of
  recipe, identity, or secret data.
- OpenAPI remains authoritative for any affected API operation.

## Acceptance scenarios

1. The primary success path satisfies every `PLAT-07-R*` requirement with the
   selected household/member context.
2. Missing, stale, invalid, or unavailable dependencies produce the specified safe
   fallback or explicit failure rather than false success.
3. A second device, late response, retry, or identity change cannot silently replace
   newer authoritative state.
4. The affected behavior is operable with its required non-pointer alternative and
   exposes meaningful state to assistive technology where a UI exists.
5. Contract, persistence, and workflow changes are proven at their actual seams,
   not inferred from a static or mocked check alone.

## Decisions retained by this baseline

- Current public behavior is the starting compatibility boundary, not immutable
  architecture.
- Household data remains self-hosted and the least-privilege/least-data behavior is
  preferred.
- Background work must report accepted, completed, and failed states distinctly.

## Open questions before a future change

1. Which requirement is being changed, and what current behavior must remain
   backward compatible during rollout?
2. Does the change alter OpenAPI, persistence, deployment configuration, event
   delivery, or another feature spec? If so, approve those handshakes first.
3. What production or real-device evidence is required beyond repository automation
   for the selected change?
