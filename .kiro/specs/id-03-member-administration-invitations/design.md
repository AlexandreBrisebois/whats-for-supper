# ID-03 — Household member administration and invitations: design baseline

## Ownership and integration map

1. `pwa/src/components/profile/FamilyManagement.tsx` composes `FamilySelector` for management and owns which member's invite dialog is open.
2. `FamilySelector` uses `useFamily` for the list/add operation. `FamilyMemberList` keeps local inline-edit state and calls `updateMember`; it receives an invite callback only from management.
3. `pwa/src/store/familyStore.ts` owns member list/loading/error state and calls `pwa/src/lib/api/family.ts`. The wrapper maps generated client response data to the local member type. It also contains delete behavior, although the current management UI does not invoke it.
4. `InviteLinkDialog.tsx` obtains the link via `getInviteLink` in `pwa/src/lib/auth.ts`; clipboard and Web Share are browser-only conveniences. The generated link is accepted by the ID-01 `/invite` route.
5. `FamilyController` and `FamilyService` handle API/persistence operations. `FamilyService` sorts list results by name, creates members with defaults, updates name/timestamp, and physically removes a record on delete. The OpenAPI source defines `GET/POST /api/family`, `PUT/DELETE /api/family/{id}`, and success-envelope shapes.

## State, failure, and recovery

The shared store serializes list/add/update/delete with `isLoading`; failures record `error` and leave the last list state intact. `FamilyMemberList` closes inline edit after awaiting `updateMember` even when that store operation handled an error, so it does not retain failed edit input. Add leaves the form present after success, while the caller selects the returned member in contexts that pass a selection callback.

The invite dialog starts with an empty link, displays “Generating link…”, and enables copy/share only once one is present. It has no visible error/retry state. Clipboard/share errors are swallowed because neither operation changes server state. There is no SSE event or workflow for family-member changes.

## Cross-spec dependencies

- **ID-01:** owns validation/acceptance of the link credential and its access-cookie consequences.
- **ID-02:** owns member selection/cookie behavior that FamilySelector and `removeMember` reuse.
- **PLAT-07:** owns global API authentication/response conventions; the family endpoints depend on that filter.

## Current evidence

`FamilyControllerTests.cs` and `FamilyServiceTests.cs` cover API/service CRUD, blank-name errors, demo-mode creation restriction, and deletion persistence. `pwa/e2e/onboarding.spec.ts` owns a stateful `/api/family` mock for adding a member. No current source evidence establishes browser-level invite sharing/recovery coverage.
