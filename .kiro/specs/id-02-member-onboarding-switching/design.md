# ID-02 — Member onboarding and switching: design baseline

## Ownership and flow

1. `pwa/src/app/(auth)/onboarding/page.tsx` invokes `loadFamily`, supplies selection to `FamilySelector`, and navigates after selection. `FamilySelector` composes `FamilyMemberList` and `AddFamilyMemberForm`.
2. `pwa/src/store/familyStore.ts` owns `familyMembers`, `selectedFamilyMemberId`, loading/error flags, creation, and selection. `pwa/src/lib/api/family.ts` unwraps the generated API client envelope into the PWA `FamilyMember` shape.
3. `pwa/src/app/(app)/profile/page.tsx` and `components/profile/ProfileDropdown.tsx` reuse the store selection operation for changing perspective.
4. The HttpOnly selection cookie is written by server action in `pwa/src/lib/auth.ts`. `pwa/src/proxy.ts` requires it for non-public app routes. `IdentityValidator.tsx` provides client-side recovery and stale-ID handling.
5. `api/src/RecipeApi/Controllers/FamilyController.cs` exposes list/create/current-member operations. `FamilyService` persists `FamilyMember` records through `RecipeDbContext`; `FamilyMemberIdModelBinder` resolves header/cookie identity. `specs/openapi.yaml` is the contract source, including `{ data: FamilyMember }` response envelopes.

## Data and failure behavior

`loadFamilyMembers` prevents a concurrent load, records an error string on failure, and marks `hasLoaded` true even when the request fails. Add/update mutations set the shared loading/error state; creation mutates only the in-memory list after an accepted API response. Selection has no API mutation: it awaits cookie actions and then changes the selected ID locally.

Onboarding shows loading and alert text supplied by the store. Empty lists are rendered by `FamilyMemberList`, which still offers the add form. The proxy provides the server navigation gate; `IdentityValidator` can briefly render nothing while it establishes client-side context. No family-member SSE events update the identity store.

## Cross-spec dependencies

- **ID-01:** supplies validated household access and the first redirect to onboarding.
- **ID-03:** reuses family store CRUD and selection from family management; it owns the invitation controls.
- **Schedule/SSE specs:** consume this cookie as request context but own stream state and reconciliation.

## Current evidence

`api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs` and `Services/FamilyServiceTests.cs` cover family list/create/update/delete behavior and demo creation restriction. `pwa/e2e/onboarding.spec.ts` owns the stateful family route mock; `pwa/e2e/auth-flow.spec.ts` covers the real auth redirect path. These tests do not establish all stale-cookie or multi-device behavior.
