# ID-02 — Member onboarding and switching: future candidates

The feature is implemented. These are optional, separate improvements rather than remaining implementation steps.

- [ ] **Optional — Make stale selected-member recovery explicit and deterministic.** Define the desired behavior for a missing cookie ID, empty family list, failed list request, and a server-confirmed deleted member before changing the validator or proxy.

  **Test seam**
  - **Affected unit/API tests:** `familyStore`/`IdentityValidator` tests; `FamilyControllerTests` for `GET /api/family/me` 401 and 404 outcomes.
  - **Playwright scenario:** begin with a stale `x-family-member-id`, then verify the approved recovery path after list success, empty list, and list failure.
  - **Mock owner:** the identity recovery vertical slice owns routes in `pwa/e2e/mock-api.ts`.
  - **Route and method:** `GET /api/family`, `GET /api/family/me`, and the affected browser route.
  - **Expected request/response contract shape:** existing `{ data: FamilyMember[] }` and `{ data: FamilyMember }` envelopes on 200; `{ message: string }` on 401/404 until an approved contract change.

- [ ] **Optional — Remove duplicate cookie writes from selection.** Preserve HttpOnly cookie behavior, navigation order, and test/dev fallback while consolidating ownership into one explicit selection boundary.

  **Test seam**
  - **Affected unit/API tests:** onboarding-page and `familyStore` tests for one successful selection and failed cookie action.
  - **Playwright scenario:** select a member on onboarding and confirm protected navigation keeps the selected perspective after reload.
  - **Mock owner:** ID-02 selection vertical slice owns its `/api/family` mock changes.
  - **Route and method:** browser `/onboarding`; `GET /api/family` only (selection remains cookie/server-action based).
  - **Expected request/response contract shape:** unchanged family-list envelope; no new selection API endpoint without separate contract approval.
