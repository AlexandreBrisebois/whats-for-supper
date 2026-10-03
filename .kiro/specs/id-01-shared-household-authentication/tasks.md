# ID-01 — Shared household authentication: future candidates

The implemented baseline has no implementation checklist. Select one candidate only after product/security approval.

- [ ] **Optional — Replace reusable invite tokens with server-owned, expiring, revocable invitations.** This would change the current shared-secret model and must define expiry, revocation, one-time behavior, redirect policy, and migration/rotation handling before implementation. It depends on ID-03 for invitation creation/presentation and must not silently alter normal passphrase access.

  **Test seam**
  - **Affected unit/API tests:** `HearthAuthenticationHandler`/new invitation service tests; controller tests for valid, expired, revoked, replayed, and malformed credentials; invite-page tests for success and recovery.
  - **Playwright scenario:** accept a valid member invite once, then verify an expired/revoked/replayed invite reaches invalid-invite recovery without setting access/member cookies.
  - **Mock owner:** the new invitation API vertical slice owns its API mock; update `pwa/e2e/mock-api.ts` only with that slice.
  - **Route and method:** a newly approved invitation issuance/acceptance route and method; do not overload undocumented client-side actions.
  - **Expected request/response contract shape:** approved JSON envelope containing an opaque invite credential and explicit acceptance outcome/error code; never return the household secret or persist it in browser-visible state.

- [ ] **Optional — Constrain post-invite navigation.** Decide whether redirects are limited to approved internal paths and implement the decision at the invitation acceptance boundary.

  **Test seam**
  - **Affected unit/API tests:** invite redirect validation unit tests and any approved acceptance controller/action tests.
  - **Playwright scenario:** a valid invite with an allowed target reaches that target; a disallowed target falls back to `/home` or the approved recovery path.
  - **Mock owner:** ID-01 invitation vertical slice owns the route mock.
  - **Route and method:** existing `/invite` browser route; any new API acceptance route only if separately approved.
  - **Expected request/response contract shape:** existing query input (`secret`, optional `memberId`, optional `redirect`) until a contract change is approved; invalid target must have an explicit, documented outcome.
