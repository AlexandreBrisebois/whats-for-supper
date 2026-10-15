# Design

Archived 2026-10-15 under A25 after main-spec promotion. The text below records
the extraction-time scope and state; current main identity has 18 requirements/49
scenarios. See [archive record](tasks.md#archive-record--2026-10-15).

## Context

See [proposal](proposal.md) for motivation and [delta](specs/household-identity/spec.md) for the seven added requirements. This is an extraction design, included because shared-access security spans PWA actions, browser cookies, page gates and API authorization. It records existing seams and claim boundaries; it introduces no architecture or implementation work.

Source identity: `moving-to-openspec`, commit `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`. BSL-household-identity-003/004/005 in the [durable plan](../../../../docs/openspec-baseline-plan.md) provide source/test anchors and confidence. The accepted [main identity spec](../../../specs/household-identity/spec.md) remains unchanged, with five requirements/ten scenarios. A17 keeps absent server token-age enforcement non-normative; A18 authorizes this bounded draft only.

## Goals / Non-Goals

**Goals:** Make the shared-access entry boundary referenceable, preserve the distinction between household access and selected-member context, and document supported negative/retry paths with explicit evidence limits.

**Non-Goals:** Changing authentication policy or code; implementing expiry, per-token revocation or automatic API-401 recovery; reconciling cookie-auth contract metadata; redesigning identity, member ownership or operator permissions; qualifying deployed cookie delivery or device persistence.

## Decisions

### Extend the existing capability with additions only

Use `household-identity` and ADDED requirements. The accepted requirements begin with access established; this delta supplies the preceding access journey without restating member listing, selection, `/me`, client recovery or Profile display. A separate authentication capability would split the approved rule owner. Rewriting the existing requirements would enlarge the slice and risk weakening accepted preconditions, so neither is selected.

### Trace the first observable workflow across its actual boundaries

The first path is Welcome submission → Next authentication action → HMAC token → awaited HttpOnly access-cookie write → onboarding request → PWA signature access gate → existing member-selection journey. Sources: `pwa/src/app/(auth)/welcome/page.tsx`, [auth.ts](../../../../pwa/src/lib/auth.ts), [auth-utils.ts](../../../../pwa/src/lib/auth-utils.ts) and [proxy.ts](../../../../pwa/src/proxy.ts). This uses a Next server action, not an OpenAPI login operation. No DB session, member creation or workflow is written by this entry path.

Cookie options are externally observable response behavior, so the delta describes them. A one-year Max-Age is a browser retention setting; it is not a server token expiry guarantee. Correct passphrase comparison trims both sides, while signing uses the configured secret unchanged. The cookie setter itself accepts the supplied value without validation; do not infer that cookie storage is proof of authorization. The page and API validators make separate decisions.

### Keep page and API gates separate

The page proxy checks access before member context. It exempts `/_next*`, `/favicon*` and paths containing a dot from both gates; Welcome/invite/join/API paths and descendants bypass access, while onboarding bypasses only member context. Ordinary app routes require accepted access plus a nonempty member cookie; the proxy does not look up member existence. These details bound the page scenarios, without proposing behavior for the deferred invite/join journeys.

The browser [API adapter](../../../../pwa/src/lib/api/api-client.ts) adds member and request-context headers and defaults to same-origin requests; it does not read HttpOnly `h_access` or inject a household-secret header. Home's server entry instead uses [serverFetch](../../../../pwa/src/lib/api/server-client.ts), explicitly forwarding `h_access` and the member ID to the internal API URL. These are implementation-supported transport traces, not deployed cookie-delivery qualification.

[Program](../../../../api/src/RecipeApi/Program.cs) applies global controller authorization; [HearthAuthenticationHandler](../../../../api/src/RecipeApi/Infrastructure/HearthAuthenticationHandler.cs) tries raw secret, Bearer token and cookie in order, allowing a later valid credential after an earlier rejected one. Success represents `HearthFamily`, with an authentication-method claim and no member/role binding. The draft's API alternatives cover the [OpenAPI](../../../../specs/openapi.yaml) header/Bearer schemes; API cookie acceptance remains evidence only because U14 is unresolved. Neither successful household authentication nor passing the page-context gate promises endpoint-specific member eligibility.

### Bound rejection and recovery to implemented observations

Wrong passphrase/missing secret returns the same rejected-result feedback. Exceptions display generic retry feedback; checking ends and input remains editable. The proxy redirects missing/rejected access to Welcome and requests deletion of a present rejected cookie. Successful re-entry requests onboarding rather than a saved return pathname.

The API independently challenges unauthorized requests with 401. Its failure is not a PWA redirect: the browser authentication provider has no re-login handler; serverFetch throws, and Home catches/logs failed initial reads. U15 prevents a universal API-401 recovery assertion. A source-level deletion request does not establish successful browser removal for every configured domain.

### Use source-supported drafting with explicit check limits

The [browser auth tests](../../../../pwa/e2e/auth-flow.spec.ts) assert redirect to Welcome and passphrase navigation to onboarding after clearing fixture cookies. They do not assert cookie attributes or real API cookie/Bearer acceptance. Welcome unit tests mock health/actions/router and assert initial controls, not submit/retry behavior. [API auth tests](../../../../api/src/RecipeApi.Tests/Integration/AuthEnforcementTests.cs) assert missing/wrong raw-header 401, correct raw-header 200 with a member ID and anonymous health 200. Their [factory](../../../../api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs) creates a separate auth-enabled TestServer with test configuration, in-memory persistence and substituted services; it does not execute production Program registration.

Negative/cookie/time/recovery assertion gaps remain in BSL-003–005. Under A10, traced source plus accurately inspected assertion limits supports this initial draft. Running new token experiments or modifying tests to obtain stronger evidence would exceed the selected documentation scope. Runtime tests are not-run; behavior TDD, application tests and client generation are not-applicable to these edits.

## Risks / Trade-offs

- Signed tokens have no server age check → Keep the observation and A17 treatment outside normative requirements; do not imply expiry from token format or Max-Age.
- Cookie auth lacks OpenAPI security metadata (U14) → Withhold its normative API acceptance claim and full contract parity; retain the source trace for a later decision.
- Configuration/origin/domain can separate PWA success from API success (U15) → Require configured-path preconditions and exclude universal transport/recovery guarantees.
- Most failure paths lack focused existing assertions → Mark requirements implementation-supported and runtime not-run; static validation proves artifact structure, not live behavior.
- Incremental specs are incomplete → Preserve existing-member limits (U13), later profile/operator slices and the approved capability ownership rather than implying household identity is fully extracted.

## Migration Plan

No application migration or deployment applies. This session creates the active draft only. Human review is the next gate; main-spec promotion and archival are separate later actions. If revision is needed, edit this draft and its evidence mapping without changing the accepted main spec. No existing archive is reopened.

## Open Questions

U14 cookie-contract reconciliation, U15 deployed transport/recovery qualification and U08's remaining member-ownership/reporting boundary belong to later selected work. They do not block this draft because their disputed claims are excluded. No consequential decision needed by the selected requirements is left assumed.
