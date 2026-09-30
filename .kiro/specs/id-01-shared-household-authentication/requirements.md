# ID-01 — Shared household authentication: requirements

## Status and scope

- **Status:** Implemented capability baseline.
- **Kind:** Capability baseline; behavior-first.
- **Source artifact:** Current PWA and API source, with [`docs/feature-inventory.md`](../../../docs/feature-inventory.md) as historical inventory only.

This packet owns household access authentication. It does not own choosing a member (ID-02) or member creation, naming, and invite presentation (ID-03).

## Outcome

A visitor can obtain household access with the configured shared passphrase or a valid signed invite token. Access alone is not a selected member identity.

## Implemented behavior

- **ID-01-AC-01 — Passphrase access.** `/welcome` disables an empty or pending submission, validates the submitted passphrase in the `authenticateWithPassphrase` server action, writes its returned signed token to the HttpOnly `h_access` cookie, and replaces the route with `/onboarding`. An incorrect result and an unexpected action failure produce different localized messages.
- **ID-01-AC-02 — Invitation access.** `/invite` reads `secret`, optional `memberId`, and optional `redirect`. It validates `secret` in a server action, writes it to `h_access`, and replaces the route with `redirect` or `/home`. When `memberId` is supplied, it also writes the member cookie and asks the family store to select that member before navigating. A missing, invalid, or failed token validation renders the localized invalid-invite recovery link to `/welcome`.
- **ID-01-AC-03 — Demo convenience.** `/welcome` asks `/api/health` whether demo mode is enabled. If so, it pre-fills `Swipe-Match-Cook` only while the input is empty; health failure does not prevent ordinary sign-in.
- **ID-01-AC-04 — Access and context gates.** `proxy.ts` permits `/welcome`, `/invite`, `/join`, and `/api` through the household access gate. Other PWA routes require a valid `h_access` token; routes outside the public/context-exempt set also require `x-family-member-id` and otherwise redirect to `/onboarding`. The API has a global authenticated-user filter backed by `HearthAuthenticationHandler`, which accepts the configured raw header, a bearer token, or `h_access`.

## Preserved boundaries and non-goals

- Household access is a shared-secret model, not an individual account, role, or household-record authorization model.
- The `h_access` and selected-member cookies are separate: a valid access cookie without a member is directed to onboarding for protected app routes.
- Member selection and stale-member recovery belong to ID-02. Invitation link generation and its copy/share UI belong to ID-03.
- This baseline does not authorize a new auth provider, token format, API contract, database migration, or change to PWA/API cookie scope.

## Known limitations

- Signed tokens are HMACs of a timestamp, but both PWA and API validation verify only the signature; there is no expiry, revocation, or invite-specific record. The one-year cookie lifetime does not make the token itself expire.
- Invite tokens remain in the initial query string until the client-side replacement. The implementation has no one-time consumption, redirect allowlist, or audit trail.
- The current component tests cover demo prefill and Playwright covers normal passphrase and invite redirects; they do not demonstrate invalid invite, expiry/revocation, or token-query handling.
