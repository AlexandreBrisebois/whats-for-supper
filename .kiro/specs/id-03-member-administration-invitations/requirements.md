# ID-03 — Household member administration and invitations: requirements

## Status and scope

- **Status:** Implemented capability baseline.
- **Kind:** Capability baseline; behavior-first.
- **Source artifact:** Current PWA/API/OpenAPI source and focused tests; `docs/feature-inventory.md` is historical context only.

This packet owns member-management presentation and the invitation link UI. It reuses the selection and family CRUD ownership from ID-02 and the credential semantics from ID-01.

## Outcome

An authenticated user can view, add, rename, and invite a family member from the existing family-management surface.

## Implemented behavior

- **ID-03-AC-01 — Member administration.** `FamilyManagement` renders `FamilySelector`; the selector lists existing members, exposes add, and lets `FamilyMemberList` open inline rename editing. Add and rename trim blank names in the PWA, call `POST /api/family` or `PUT /api/family/{id}`, and replace/append the local returned member on success. The API service also rejects blank names.
- **ID-03-AC-02 — Member-specific invite UI.** In the management surface each listed member has an Invite control. `InviteLinkDialog` calls the `getInviteLink` server action with the browser origin and member ID, displays the generated `/invite?secret=…&memberId=…` link, enables copy when a link exists, and conditionally renders native share when `navigator.share` is available.
- **ID-03-AC-03 — Delete capability boundary.** `DELETE /api/family/{id}` and `familyStore.removeMember` exist; deleting the selected member clears its selection cookies and removes it from store state. The current `FamilyManagement`/`FamilyMemberList` presentation supplies no delete control, confirmation, or recovery UX.
- **ID-03-AC-04 — Response and authorization boundary.** `FamilyController` delegates CRUD to `FamilyService`, whose records are persisted in `RecipeDbContext`. The API's global authentication filter applies; generated PWA API calls consume the success wrapper documented in `specs/openapi.yaml`. The controller itself does not impose per-target-member ownership checks.

## Preserved boundaries and non-goals

- This is a shared family-management model, not role-based administration or household-scoped authorization. The current `FamilyMember` persistence/query path is global.
- Link generation is a server action, but it reuses the same shared HMAC credential as ordinary household access; it is not a separately persisted invitation.
- Selection, cookie persistence, and stale-identity recovery belong to ID-02. Invite acceptance/token validation belongs to ID-01.
- This baseline does not authorize delete UX, confirmation policy, a new permission model, invitation revocation/expiry, or contract/schema changes.

## Known limitations

- Rename/add failures set a shared store error, but `FamilyManagement` does not render that error; the dialog silently ignores generation, clipboard, and native-share failures.
- Invitation links are bearer-like reusable household-access credentials in a URL; they are neither member-bound cryptographically nor expiring/revocable. The member ID is a separate query value.
- API delete is available despite absent family-facing controls; deletion has no shown confirmation or server-side target-authorization policy in this path.
- Existing API tests cover CRUD and service validation, and onboarding Playwright covers creation. There is no focused current test for rename controls, invitation dialog failure/copy/share behavior, or deletion via the store.
