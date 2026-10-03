# ID-03 — Household member administration and invitations: future candidates

The capability is implemented. The following are optional improvements, not leftover delivery work.

- [ ] **Optional — Define and implement safe member removal.** Resolve eligibility, confirmation, effects on recipes/preferences/history, selected-member recovery, and server-side authorization before exposing existing delete capability in the management UI.

  **Test seam**
  - **Affected unit/API tests:** `FamilyServiceTests`, `FamilyControllerTests`, `familyStore` tests, and the management component test for confirmation/error handling.
  - **Playwright scenario:** remove a nonselected member after confirmation; verify list refresh and preserved selected member. Separately exercise selected-member removal and the approved recovery route.
  - **Mock owner:** the member-removal vertical slice owns its stateful family mock in `pwa/e2e/mock-api.ts`.
  - **Route and method:** `DELETE /api/family/{id}` and the management browser surface.
  - **Expected request/response contract shape:** existing empty 204 response on authorized deletion and documented `{ message: string }` errors until an approved contract change; any dependency/eligibility outcome requires an explicit new error contract.

- [ ] **Optional — Add visible invitation-generation and share failure recovery.** Preserve the current copy/share fallback while deciding what users should see when credential generation, clipboard access, or native sharing fails.

  **Test seam**
  - **Affected unit/API tests:** `InviteLinkDialog` tests for generation, empty link, retry, clipboard rejection, and unavailable `navigator.share`; ID-01 invite-action tests if token generation changes.
  - **Playwright scenario:** open a member invite, copy a generated link, then simulate generation failure and confirm accessible recovery without claiming success.
  - **Mock owner:** ID-03 invitation-dialog vertical slice owns its server-action/API mock boundary.
  - **Route and method:** management browser surface and current server action; any approved generated invitation API route must name its method explicitly.
  - **Expected request/response contract shape:** current action returns a nonempty link string or empty string; if promoted to an API seam, define an approved `{ data: { inviteUrl: string } }` success envelope and `{ message: string }` failure envelope.

- [ ] **Optional — Adopt server-owned, revocable invitation records.** This is the ID-01 credential-lifecycle candidate applied to this packet's generation UI; it must be designed and delivered with ID-01 rather than changing link construction alone.
