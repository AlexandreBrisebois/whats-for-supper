# Design

## Context

See [proposal.md](proposal.md) for motivation and [the spec delta](specs/household-identity/spec.md) for the five requirements and ten scenarios accepted by the user on 2026-10-15. The subsequent request explicitly authorizes this design artifact, replacing its earlier conditional omission. It documents how the baseline represents the existing application; it introduces no application implementation work.

Reference content is commit `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` on `moving-to-openspec`. Application inputs remain unchanged. [The durable plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline-plan.md) owns source evidence, confidence, uncertainty and scenario mappings under BSL-household-identity-001/002 and U13. Behavior remains implementation-supported, with runtime checks not-run.

## Goals / Non-Goals

**Goals:**

- Explain the existing seams that support the accepted ordinary-household selection slice.
- Preserve the distinction between shared household access, browser member context and persisted member records.
- Make recovery preconditions, contract gaps and verification limits explicit for future baseline consumers.

**Non-Goals:**

- Design changes to identity, cookie handling, authorization, API contracts, persistence, UI or tests.
- Extend into member mutation, invitations, preferences, device persistence guarantees or other profiles.
- Promote the delta, archive the change or authorize application implementation.

## Decisions

### 1. Keep one household-identity owner across the observed seams

The approved capability owns access/member-context rules. This slice assumes household access is already established and extracts only existing-member selection and supported recovery/display. Consumers can reference these requirements after separately authorized promotion; no placeholder shared specs are needed now.

Alternative: split browser selection, API member lookup and persistence into technical capabilities. That would fragment one observable journey and duplicate actor-context policy. The accepted capability boundary keeps those representations together without specifying each implementation detail as a requirement.

### 2. Describe the existing path without changing it

| Boundary | Current owner and representation | Observable consequence / limit |
| --- | --- | --- |
| Request entry | [PWA proxy](../../../../pwa/src/proxy.ts), access token and member cookie | Shared-access gate precedes context gate; a protected full-page request without a member cookie redirects to onboarding before client recovery |
| Member list | `pwa/src/app/(auth)/onboarding/page.tsx`, [FamilySelector](../../../../pwa/src/components/identity/FamilySelector.tsx), [FamilyMemberList](../../../../pwa/src/components/identity/FamilyMemberList.tsx) | Loaded member names become selection buttons; loading, empty and error states have visible feedback |
| Selection | [Family store](../../../../pwa/src/store/familyStore.ts), [server cookie actions](../../../../pwa/src/lib/auth.ts), [cookie helper](../../../../pwa/src/lib/identity/cookie.ts) | Selected member ID becomes browser context and onboarding requests Home; selection does not create a member record |
| Client/API seam | [Family adapter](../../../../pwa/src/lib/api/family.ts), [request adapter](../../../../pwa/src/lib/api/api-client.ts), [generated family builder](../../../../pwa/src/lib/api/generated/api/family/index.ts), [generated current-member builder](../../../../pwa/src/lib/api/generated/api/family/me/index.ts), [OpenAPI](../../../../specs/openapi.yaml) | GET family supplies member profiles; GET family/me resolves current member; selected ID is sent as a header when available and success responses use the data envelope |
| Identity and read | [Binder](../../../../api/src/RecipeApi/Infrastructure/FamilyMemberIdModelBinder.cs), [FamilyController](../../../../api/src/RecipeApi/Controllers/FamilyController.cs), [FamilyService](../../../../api/src/RecipeApi/Services/FamilyService.cs), [success filter](../../../../api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs) | Valid header GUID takes precedence over cookie GUID; existing member returns a profile; no parseable identity returns 401 after household authorization |
| Persistence | [EF context](../../../../api/src/RecipeApi/Data/RecipeDbContext.cs), [SQL schema](../../../../api/database/schema.sql), family_members | API reads existing member records; browser selection is not a persisted session record |
| Recovery/display | [IdentityValidator](../../../../pwa/src/components/identity/IdentityValidator.tsx), family store, [useFamily](../../../../pwa/src/hooks/useFamily.ts), [ProfileDropdown](../../../../pwa/src/components/profile/ProfileDropdown.tsx) | Client recovery restores selection when a valid profile is returned; selected-name display matches loaded member IDs case-insensitively |

The first observable slice runs onboarding list load → named member selection → successful cookie writes → requested Home navigation → selected-member display on Profile. Listing crosses the actual client/API/service/persistence boundary; selecting the existing member writes browser identity rather than a new database member. Recovery reads the current member through the same API/service/data seam. No background workflow is launched by this slice.

Alternative: propose a new session service or restructure the store. Neither is needed for extraction, and neither is authorized.

### 3. Bound successful selection and recovery by their actual preconditions

The onboarding handler awaits an initial server cookie action, calls asynchronous store selection without awaiting it, then requests Home. The store writes the cookie again before setting selected state. The accepted requirement conditions success on successful cookie writes and makes no atomic ordering or interruption guarantee.

Client recovery applies only after a protected page reaches client validation with neither selected state nor a readable member cookie. A server-readable cookie can still identify the member to the API. Failed/empty recovery maps to no member; the validator requests onboarding if no selection has appeared by the final check. Recovery adds a returned profile only when absent locally; it does not refresh an already listed profile.

Cookie delivery depends on browser policy, HTTPS, configured domain, production/test settings and API origin. These conditions remain in the plan's evidence rather than becoming a promise that every deployment or device preserves identity.

Alternative: generalize this path into universal identity persistence/recovery. The source and inspected assertions do not support that guarantee.

### 4. Keep contract authority and evidence separate from implementation observations

The accepted delta uses the supported success and missing-identity responses. The implementation's unknown-member 404 is absent from the current OpenAPI operation and generated mapping; U13 records it without adding a normative response or editing the contract. Other disputed/incomplete behavior stays in the plan under the approved withholding policy.

The inspected browser identity tests preseed cookies and mock API responses. Their current-member mock returns success even without a member cookie. Service tests use in-memory EF; the inspected controller factory defaults to disabled authorization. Assertions support only their stated boundaries and were not executed for this extraction.

Alternative: equate source/test presence or substituted success with runtime qualification. That would overstate what was observed. Documentation validation establishes artifact consistency, not working device, API or database behavior.

## Risks / Trade-offs

- [Source drift] → Record commit and dirty inputs per slice; reconcile changed source before reusing BSL evidence.
- [Normative wording overstates conditional behavior] → Preserve the accepted success/recovery preconditions and the requirement/scenario evidence mapping; keep broader claims withheld.
- [API and implementation disagree on unknown-member handling] → Keep U13 open; change neither API contract nor implementation in this documentation work.
- [Accepted spec mistaken for runtime qualification] → Keep human acceptance, strict validation, runtime evidence and main-spec promotion as separate statuses.
- [Design read as an implementation plan] → All tracked work remains extraction and validation; there is no deployment or runtime migration.

## Migration Plan

No application deployment, data migration or runtime rollback is required. This design adds a planning document and reconciles documentation status only. The user separately authorized main-spec promotion on 2026-10-15; the accepted five requirements and ten scenarios now exist in `openspec/specs/household-identity/spec.md`. The user separately authorized archival on 2026-10-15. The completed change is archived; the promoted main spec is preserved.
