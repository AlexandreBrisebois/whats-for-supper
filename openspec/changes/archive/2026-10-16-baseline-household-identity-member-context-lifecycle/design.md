# Design

## Context

See proposal.md for motivation. BSL-household-identity-029 covers this final bounded lifecycle gap. First observable slice: successful onboarding/Profile selection request → familyStore.selectFamilyMember → auth.ts.setFamilyMemberCookie → Next cookie write; later page proxy/FamilyMemberIdModelBinder read context under the already owned gates. Root layout wraps children in IdentityValidator; when hydrated on `/`, it requests Home or onboarding using selected store state. `app/page.tsx` renders a Get Started link but its comment's middleware-Home assertion is not executable evidence.

## Goals / Non-Goals

**Goals:** Record cookie options and conditional landing navigation without duplicating selection/recovery or household-access requirements.

**Non-Goals:** No new session lifecycle, logout control, stale-member cleanup guarantee, personal authorization, installation identity, deployment variant, preference behavior or successful Home arrival.

## Decisions

1. Keep member-cookie options separate from access credentials and reuse the accepted access-cookie domain/Secure conditions. `auth.ts` configures both using the same environment predicates. Do not claim that successful configuration proves browser acceptance or a one-year session lifetime.
2. The primary cookie action is narrowly identified because `familyStore.selectFamilyMember` subsequently calls the readable fallback. `cookie.ts` writes the same name with HTTPS-dependent Secure and optional domain; JavaScript cannot generally replace an existing HttpOnly cookie. Browser delivery, same-name collisions and removal domain mismatches remain U15/U26 limitations. No fallback reliability or successful deletion is specified.
3. Specify only the hydrated landing handler, reached subject to proxy gates. Its selected ID is not checked for membership in this branch. Reuse the existing gates and later recovery instead of claiming fresh identity validation on landing. No API, persistence or workflow mutation is performed by the redirect itself.

## Risks / Trade-offs

- No dedicated `IdentityValidator` or auth-cookie unit test found in the targeted source inventory. Existing identity-persistence browser assertions preseed cookies and mock API and do not assert these option fields or landing branches. Implementation-supported, medium confidence; runtime not-run.
- `clearAuth` has no connected logout caller in the inspected PWA. Do not manufacture a sign-out journey from an unused helper. Full browser lifecycle and deployment qualification remain excluded.
- A34 and all prior U08/U13–U28 and creation provenance/qualification caveats remain unchanged.

## Migration Plan

None. Documentation extraction only; human review and any acceptance/promotion/archival remain separate actions.

## Evidence and status (non-normative)


**Evidence and status (non-normative):**

Draft for human review, implementation-supported only; no acceptance, promotion, archival or runtime qualification. A34 and BSL-household-identity-014–016/U22 remain deferred.

Historical BSL-015 review statement: “However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.” Subsequently the user reported later authorization and promised the original instruction/reference; that reference remains pending. This historical statement is not a product requirement or a new denial of the user-reported authority. No implementation acceptance or runtime qualification is inferred.
