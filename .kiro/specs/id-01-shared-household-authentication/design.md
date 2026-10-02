# ID-01 — Shared household authentication: design baseline

## Ownership and integration map

1. `pwa/src/app/(auth)/welcome/page.tsx` holds the passphrase, pending flag, and visible error. It calls server actions in `pwa/src/lib/auth.ts`.
2. `authenticateWithPassphrase` compares trimmed input with `HEARTH_SECRET`; `generateSecretToken` signs `Date.now()` with HMAC-SHA-256. `setHearthCookie` writes an HttpOnly, SameSite=Lax `h_access` cookie (one-year max age; Secure outside test/localhost production conditions).
3. `pwa/src/app/(auth)/invite/page.tsx` calls `validateHearthSecret`, then the cookie actions. A supplied member ID crosses into ID-02 through `setFamilyMemberCookie` and `useFamily().selectFamilyMember`.
4. `pwa/src/proxy.ts` validates the same HMAC for route access and independently checks `x-family-member-id` for app context. `api/src/RecipeApi/Program.cs` installs a global authorization filter; `Infrastructure/HearthAuthenticationHandler.cs` validates the configured secret, bearer token, or access cookie for API requests.
5. `specs/openapi.yaml` describes the global `HearthSecret`/`HearthToken` schemes. The stream contract also relies on both `h_access` and the member cookie, but stream synchronization is owned by schedule features rather than this packet.

## State and failure behavior

The browser form owns only unsaved input, error text, and pending state. The signed token is written server-side to the HttpOnly cookie, so it is not readable by ordinary client code. The proxy and API independently validate it on later requests. `IdentityValidator` is a client-side recovery layer for member context, not the household access authority.

Passphrase failure leaves the input in place and clears pending state. Health lookup is deliberately non-blocking. Invite validation shows a joining state until it either writes cookies and navigates or switches to the invalid-link screen. There is no server mutation, SSE event, persistence record, or retry protocol for sign-in/invitation acceptance.

## Security boundaries

The HMAC token proves possession of the configured household secret; it carries no member, expiry, nonce, audience, or revocation state. `memberId` in an invite is a separate cookie/context input, not a claim inside the token. Consequently, improvements such as expiring or one-time invitations require a distinct server-owned credential/record design; they cannot be safely added as a PWA-only timer.

## Cross-spec dependencies

- **ID-02 member onboarding and switching:** owns `x-family-member-id`, store selection, and navigation after access is established.
- **ID-03 member administration and invitations:** owns the UI that generates and shares links, but depends on this packet's token semantics.
- **PLAT-07 health/authentication conventions:** owns the health endpoint and API-wide response/auth conventions.

## Current evidence

`welcome/page.test.tsx` verifies demo prefill. `pwa/e2e/auth-flow.spec.ts` covers redirect to onboarding after passphrase entry and successful member/voting invites. These are coverage references, not a claim that all failure or security cases are qualified.
