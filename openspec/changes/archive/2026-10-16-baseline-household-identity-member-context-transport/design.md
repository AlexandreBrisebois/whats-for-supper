# Design

## Context

See proposal.md for motivation. BSL-household-identity-026 records current source, inspected assertions and content hashes in the capability plan. The first observable slice is a report Save sent through the shared SDK with the currently selected member: RecipeDetailSheet → recipes.ts → generated importReport POST → HearthAuthProvider → approved OpenAPI → RecipeController → shared binder → RecipeImportReportService → RecipeDbContext/report row. Resolve and import-ID polling reuse that client/binder but have distinct service policy.

## Goals / Non-Goals

**Goals:** Extract transport once in its shared owner, preserving the established `/api/family/me` response rules. Include the independently used server-fetch path.

**Non-Goals:** No changes to authentication, transport, endpoint validation, preference policy or data. Native-fetch wrappers are not universally covered by the SDK requirement. No personal accounts, role isolation, request cancellation or atomic identity switching guarantees.

## Decisions

1. Use ADDED shared requirements; the existing `Resolve the current member through the API` requirement continues to own `/me` responses. Repeating its response contract for every endpoint would duplicate policy.
2. Describe transport at preparation time. `api-client.ts:HearthAuthProvider` reads selected state, then readable cookie; `server-client.ts:serverFetch` reads Next cookies and overwrites a provided member header. Do not infer that every manually implemented fetch follows the SDK path.
3. Preserve syntax-only binding: `FamilyMemberIdModelBinder` selects header before cookie and does not query persistence. `Program.cs` registers the provider and household authorization separately. A syntactically valid unknown header does not fall back to an existing cookie member. Endpoint-specific missing/unknown-member outcomes stay with the consuming spec and existing `/me` rules.
4. Existing main recipe-quality `Validate report input at submission`, `Persist recipe-level feedback before attempting re-import` and `Address manual resolution to the loaded recipe with member context` retain operation ownership. No duplicate report-attribution delta. Existing library attribution/readiness and sharing import ownership also remain intact.

## Risks / Trade-offs

- Browser header behavior is executable-source supported, not directly covered by an inspected provider test. `server-client.test.ts` mocks absent cookies and fetch and asserts URLs only; it does not qualify cookie forwarding. No new tests are authorized.
- U08/U14/U15: household principal is shared, cookie security metadata and delivery/recovery limits remain. Member context alone does not authenticate access. No blanket OpenAPI parity claim.
- Import-report security metadata declares FamilyMemberId while global household authorization also applies; this inconsistency is evidence, not authorization to change contract or claim a personal security boundary.
- Unknown-member and missing-context checks differ by endpoint. No generic 400/401/404 promise is extracted.

## Migration Plan

None: documentation extraction only. Keep main spec and prior deltas unchanged. Human review, acceptance, promotion and archival are separate future actions. A34 runtime deferral and BSL-014–016/U22 creation provenance/qualification caveats remain unchanged.

## Evidence and status (non-normative)

**Evidence and status (non-normative):**

Draft for human review, implementation-supported only; no acceptance, promotion, archival or runtime qualification. A34 and BSL-household-identity-014–016/U22 remain deferred.

Historical BSL-015 review statement: “However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.” Subsequently the user reported later authorization and promised the original instruction/reference; that reference remains pending. This historical statement is not a product requirement or a new denial of the user-reported authority. No implementation acceptance or runtime qualification is inferred.
