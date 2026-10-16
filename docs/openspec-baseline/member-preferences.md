# Member preferences baseline plan

## Current lifecycle checkpoint — consolidated, 2026-10-16

This capability's main spec now contains **26 requirements / 57 scenarios**.
All baseline source changes were archived after the user's explicit approval;
there is no active baseline extraction/promotion queue. Historical checkpoint,
next-session and "changes active" text below records earlier sessions only.
Evidence limitations and unresolved findings remain in the [live backlog](backlog/README.md).
See [consolidation completion](backlog/consolidation-completion.md) for accepted
scope, preserved corrections, archive warnings and verification. Archival does not
establish application correctness, runtime qualification or resolution of defects.

## Current checkpoint and scope

MP-P01 (2026-10-16): the user accepted and authorized promotion of all five
previously presented member-preferences drafts with “promote it”. Their exact
26 requirements / 57 scenarios are now in the [main specification](../../openspec/specs/member-preferences/spec.md).
Discovery is reconciled with U-MP01–13/X-MP01–04 retained. Human review is accepted
for this documented scope; main-spec promotion is complete, subject to the final
validation results reported for this session. Runtime qualification remains
**not-run** under A34. The five source changes remain active, without archival.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md), then this plan.
The generation record MP-G01 below is historical. No unresolved limitation is
silently repaired or converted into a runtime guarantee by promotion.

**Phase-12 reconciliation R12 (2026-10-16):** Recorded promoted documentation remains 26 requirements / 57 scenarios; no additional supported extraction gap was found within this plan's explicit boundary.
[Cross-capability review](reconciliation.md) records current inventory, shared-owner
reconciliation, evidence drift and exclusions. Current main SHA-256: `ad2b5a3f4ba5a17f126c7d8631cb8a3b31a42b463e714b78b949c76f8c722483`.
This session grants no new acceptance or promotion. Earlier session-specific
“current user” and next-action statements retain their historical scope. A34 and
all local unresolved/excluded behavior remain in force; runtime checks are not-run.


## Recorded decisions

- MP-D05 / MP-P01: On 2026-10-16, the user requested “promote it” after the five
  validated drafts and limitations were presented. This accepts that exact
  documentation scope and authorizes main-spec synchronization. It does not
  authorize archival, application changes, contract repairs or runtime qualification.

- MP-D01: The current user request authorizes discovery/evidence and documentation-only
  generation for all remaining member-preferences slices, ordinary household first,
  then separately bounded API, preview and configuration behavior. It supersedes
  the historical A84 not-started checkpoint and review-only default scope.
- MP-D02: Reuse A10 implementation-supported drafting and A34 runtime not-run;
  accepted owner requirements remain authoritative. No application or contract repairs.
- MP-D03: The user answered “Accept current implementation behavior” when asked about
  language-only preference saves despite OpenAPI requiring browseViewMode. Include
  that precise implementation behavior in the language delta; retain the mismatch
  as U-MP03. This is a scope decision for drafting, not acceptance of these artifacts,
  contract amendment, approval of other discrepancies or runtime verification.
- MP-D04: Use one member-preferences capability path and five disjoint ADDED deltas;
  no main spec existed at generation time. Resolve local root using CLI list/context (nearest
  repository, no store pointer); do not initialize or reconfigure OpenSpec.

## Discovery inventory: all ten fields for every slice

The source and test fields point to the durable evidence entries below; they are
not empty placeholders. Each entry records actual assertions/substitutions.

### Ordinary member/browser language choice

- **Name:** language-selection.
- **Business purpose:** Make English/French preference and local fallback explicit.
- **Existing capabilities:** Profile choice; member resolution; browser proposal; translation fallback.
- **Important workflows:** Open Profile, choose language, save/read/reload; select another member; proposal accept/dismiss.
- **Business rules:** Member supported locale outranks browser fallback; browser proposal does not automatically change member.
- **Source files:** BSL-member-preferences-001–004 source anchors below.
- **Tests:** BSL-member-preferences-001–004 actual assertions and substitutions below.
- **Dependencies:** Identity; family API/persistence; browser storage; public locale input.
- **Uncertainties:** U-MP01–03, U-MP08, U-MP11.
- **Confidence:** source-supported, medium; implementation-supported, never current runtime verified.

### Ordinary member browse presentation

- **Name:** browse-selection.
- **Business purpose:** Restore preferred library presentation without owning library eligibility.
- **Existing capabilities:** Initial saved mode; member-scoped override; stack/list controls; successful persistence.
- **Important workflows:** Open library, choose other presentation, save, reload loaded profile, switch member.
- **Business rules:** Saved list else stack; local override only for associated member; same-mode no-op.
- **Source files:** BSL-member-preferences-005–006 source anchors below.
- **Tests:** BSL-member-preferences-005–006 actual assertions and substitutions below.
- **Dependencies:** Family API/store; recipe-library accepted retrieval/paging.
- **Uncertainties:** U-MP04.
- **Confidence:** high for initial/toggle, medium reload/failure seam; implementation-supported, never current runtime verified.

### Separately bounded preference API and store

- **Name:** api-persistence.
- **Business purpose:** Expose defaults, canonical saves and rejection/reconciliation boundaries.
- **Existing capabilities:** Family/current member reads; defaults; route-targeted PUT; single-save optimistic state.
- **Important workflows:** Authorized canonical update → readback; invalid/missing target; failed/invalid response; absent local member.
- **Business rules:** Name preserved; browse-only preserves language; no absent local target request.
- **Source files:** BSL-member-preferences-007–008 source anchors below.
- **Tests:** BSL-member-preferences-007–008 actual assertions and substitutions below.
- **Dependencies:** Identity owner; response filter/error middleware; generated codec; PostgreSQL schema.
- **Uncertainties:** U-MP03, U-MP05, U-MP12.
- **Confidence:** high browse assertions, medium language/store; implementation-supported, never current runtime verified.

### Separately bounded member preview UI

- **Name:** preview-choices.
- **Business purpose:** Make optional preview choices and failure recovery reviewable.
- **Existing capabilities:** Snapshot lifecycle; Settings disclosure; confirmed saves; per-member stale result rejection; translated metadata.
- **Important workflows:** Load/select/focus refresh → expand → toggle → confirm/error/409 → retry or member switch.
- **Business rules:** Only opt-in controls; confirmed choice during save; no duplicate per-key mutation; member generation isolation.
- **Source files:** BSL-member-preferences-009–012 source anchors below.
- **Tests:** BSL-member-preferences-009–012 actual assertions and substitutions below.
- **Dependencies:** Flags API/adapter; feature store/provider; catalogs; member identity.
- **Uncertainties:** U-MP02, U-MP06.
- **Confidence:** high asserted store/DOM behavior, medium live seams; implementation-supported, never current runtime verified.

### Separately bounded configuration/API preview policy

- **Name:** preview-resolution.
- **Business purpose:** Specify authoritative mode precedence and consumer boundary.
- **Existing capabilities:** Three registry keys; deployment modes; member override upsert/retention; snapshot; cooking/planner/PDF consumer selection.
- **Important workflows:** Construct registry → member snapshot → opt-in PATCH → persistence/read → consuming journey.
- **Business rules:** Fixed off/on overrides member choice; opt-in defaults false; only registry entries exposed.
- **Source files:** BSL-member-preferences-013–016 source anchors below.
- **Tests:** BSL-member-preferences-013–016 actual assertions and substitutions below.
- **Dependencies:** IConfiguration; identity binder; DB keys/cascade; accepted cooking/capture owners.
- **Uncertainties:** U-MP07–10.
- **Confidence:** high resolver assertions, medium deployed/API/persistence; implementation-supported, never current runtime verified.

## Discrepancies, exclusions and unresolved limitations

| ID | Finding and normative disposition | Human/later action |
| --- | --- | --- |
| U-MP01 | Local language is saved before member persistence; failure restores member profile without local storage rollback. No dedicated language-save feedback, retry queue or coherent global language guarantee. | Review limitation; repair requires separate authorization. |
| U-MP02 | LocaleProvider uses member preference, but t without explicit locale uses browser storage/default. IdentityHint passes resolved locale; most controls do not. Proposal acceptance can change browser translation lookup while a member locale remains authoritative in provider. No universal member-driven localization or recipe-content translation claim. | Reconcile intended localization separately. |
| U-MP03 | OpenAPI PUT preferences requires browseViewMode; service nullable DTO and generated optional request support language-only. User explicitly accepted current language-only behavior for drafting. 400 contract uses error, middleware emits status/message. | Review accepted implementation wording; separately resolve contract and error envelope. |
| U-MP04 | Browse page sets local override and catches rejection, but familyStore catches failure and resolves null. Saved profile rollback does not clear the local override. No failed-save visual rollback or saved-success UI claim. | Separate defect assessment; not repaired. |
| U-MP05 | Family preference mutations have no request generation guard; overlapping saves, deletion and member-switch races are not covered. Failed list load retains existing member list; recovery does not refresh an existing profile. | No fresh-state/latest-wins/offline convergence guarantees. |
| U-MP06 | Preview guards distinguish member generations, not overlapping refreshes within the same selection. Same-member snapshot/save races remain. | Exclude universal request ordering or immediate cross-device propagation. |
| U-MP07 | docker/compose/apps.yml forwards cooking/planner flags to API but not PDF; Synology template forwards all three. | No deployment parity; evaluate selected deployment separately. |
| U-MP08 | DEFAULT_LOCALE is public PWA environment input; Dockerfile only declares API public build input, local Compose supplies locale at runtime. | Do not certify runtime-only environment changes affect an existing built image. |
| U-MP09 | GET feature-flags returns 404 for a nonexistent bound member but OpenAPI GET lists only 200/401. | Withhold that exact response as a normative guarantee pending contract decision. |
| U-MP10 | FeatureFlagDto fixed-mode memberEnabled/displayName/description are null and Program uses JsonIgnoreCondition.Never; OpenAPI optional scalar fields are not nullable. | Withhold exact optional-field wire shape; no contract repair. |
| U-MP11 | LocaleProvider/browse lookup use exact member-ID matching while some identity display checks ignore case. | No universal equivalent-ID casing or initialization ordering claim. |
| U-MP12 | Service trims/lowercases nonempty values, ignores null/empty fields, rejects whitespace-only and unsupported languages; OpenAPI enums are canonical and requires browse. Mutation can alter tracked browse before rejecting language, with no subsequent save in that method. | Noncanonical/empty payload and rejected-request transaction guarantees excluded; canonical behavior and accepted language-only exception drafted. |
| U-MP13 | Family responses declare preferredLanguage with string/null type but enum en/fr excludes null under schema semantics, while new members persist null and client maps it to no preference. | Draft no-language preference behavior without certifying its exact null wire/schema agreement; reconcile separately. |
| X-MP01 | LocaleToggle is implemented/exported but no mounted production caller found. | Excluded as a household entry; Profile and proposal are the connected entries. |
| X-MP02 | SQL member checks, feature-key composite identity/cascade, compatibility ordering, storage exceptions, physical-device input/accessibility and deployment behavior are source facts, not executed qualifications. | A34 not-run; no universal DB enforcement or device conformance claims. |
| X-MP03 | Detailed planner 250ms/8px gesture/cancel/scroll behavior belongs with planning; no accepted gesture-specific requirement located. Only effective mode selection is drafted here. | Explicit owner-boundary exclusion, no invented owning reference. |
| X-MP04 | Member create/rename/delete/access cookies, recipe eligibility/paging, cooking content/edit/completion, PDF acquisition/renderer and processing language remain their owners. | Actual accepted references and local consequences are mapped below. |

No additional human answer blocks the supported baseline. Acceptance/promotion is recorded under MP-P01;
U-MP01–13 are not silently resolved by grammar validation.

## Source and assertion evidence

All entries below are **implementation-supported**, never runtime-verified in this
session. Check outcome for behavior is **not-run**: this is documentation-only
extraction under A10/A34; no tests, HTTP service, DB, browser or device were run.
Content identity is the commit and per-path SHA-256 manifest below. Current source,
contract, generated mappings, tests and configuration were read without edits.

### BSL-member-preferences-001

- **Behavior and actor:** Browser locale initialization.
- **Entry / trigger / observable outcome:** Browser starts or reloads; the provider resolves stored en/fr or the configured default.
- **Business rule / eligibility:** Only supported stored locales qualify; navigator language is proposal-only.
- **Failure / cancellation / recovery:** Absent/unsupported stored choice falls back; storage exceptions have no recovery here.
- **Configuration / time:** NEXT_PUBLIC_DEFAULT_LOCALE equals fr for French; otherwise English; server lookup defaults without browser storage.
- **Ordered trace / source anchors:** [pwa/src/lib/i18n/index.ts](../../pwa/src/lib/i18n/index.ts) — `DEFAULT_LOCALE`; [pwa/src/locales/index.ts](../../pwa/src/locales/index.ts) — `getLocale, setLocale`; [pwa/src/components/common/LocaleProvider.tsx](../../pwa/src/components/common/LocaleProvider.tsx) — `localLocale initializer`; [pwa/src/app/layout.tsx](../../pwa/src/app/layout.tsx) — `LocaleProvider mounting`.
- **Actual assertions / substitutions:** [pwa/src/locales/locale-integrity.test.ts](../../pwa/src/locales/locale-integrity.test.ts) — catalog structural parity and UI key coverage; static JSON/source scanning, not initialization assertions.
- **Agreement / confidence:** Source-aligned; no direct provider initialization assertion located. Medium.
- **Evidence class / check / environment / identity:** Implementation-supported; behavior checks not-run under A34; read-only local checkout at the recorded commit and manifest.
- **Open question / limitation:** Storage-denied behavior and runtime-only deployment locale injection are not qualified (U-MP08).
- **Disposition / mapping:** Accepted/promoted under MP-P01 to the exact requirement/scenario rows below, or retained as explicitly excluded/owned there; runtime not-run.

### BSL-member-preferences-002

- **Behavior and actor:** Selected member locale resolution.
- **Entry / trigger / observable outcome:** Selection or loaded family list changes; consumers of useLocale receive member en/fr or browser-local fallback.
- **Business rule / eligibility:** Supported exact member language outranks local provider state; missing profile/language falls back.
- **Failure / cancellation / recovery:** Failed member save restores old profile; local fallback can remain the newly chosen value.
- **Configuration / time:** Requires loaded member matching selected ID; no locale SSE/storage-event synchronization is present.
- **Ordered trace / source anchors:** [pwa/src/components/common/LocaleProvider.tsx](../../pwa/src/components/common/LocaleProvider.tsx) — `backendLocale and locale`; [pwa/src/store/familyStore.ts](../../pwa/src/store/familyStore.ts) — `loadFamilyMembers, loadCurrentIdentity, selectFamilyMember`; [pwa/src/components/identity/IdentityValidator.tsx](../../pwa/src/components/identity/IdentityValidator.tsx) — `verifyIdentity`; [pwa/src/components/identity/IdentityHint.tsx](../../pwa/src/components/identity/IdentityHint.tsx) — `explicit locale argument`.
- **Actual assertions / substitutions:** [pwa/src/components/profile/LanguageSelection.test.tsx](../../pwa/src/components/profile/LanguageSelection.test.tsx) — selected-button class assertions use a substituted LocaleProvider and familyStore.
- **Agreement / confidence:** Trace supports provider precedence; tests do not integrate provider/member switch. Medium.
- **Evidence class / check / environment / identity:** Implementation-supported; behavior checks not-run under A34; read-only local checkout at the recorded commit and manifest.
- **Open question / limitation:** Case-sensitive provider member matching differs from case-insensitive identity display; no universal switching/localization guarantee (U-MP02/U-MP11).
- **Disposition / mapping:** Accepted/promoted under MP-P01 to the exact requirement/scenario rows below, or retained as explicitly excluded/owned there; runtime not-run.

### BSL-member-preferences-003

- **Behavior and actor:** Profile English/French selection and member language save.
- **Entry / trigger / observable outcome:** Profile → select English/French → browser storage and optimistic member update → confirmed profile and later read.
- **Business rule / eligibility:** Selected member update can contain preferredLanguage alone; name/browse stay unchanged. User accepted current implementation behavior in this session.
- **Failure / cancellation / recovery:** familyStore catches failure, restores old member, records error and returns null; control has no dedicated save status. Local storage is not rolled back.
- **Configuration / time:** Ordinary authenticated household; successful DB persistence is a condition, not a runtime observation.
- **Ordered trace / source anchors:** `pwa/src/app/(app)/profile/page.tsx` — `LanguageSelection`; [pwa/src/components/profile/LanguageSelection.tsx](../../pwa/src/components/profile/LanguageSelection.tsx) — `handleLanguageChange`; [pwa/src/store/familyStore.ts](../../pwa/src/store/familyStore.ts) — `updateMemberPreferences`; [pwa/src/lib/api/family.ts](../../pwa/src/lib/api/family.ts) — `updateFamilyMemberPreferences`; [api/src/RecipeApi/Controllers/FamilyController.cs](../../api/src/RecipeApi/Controllers/FamilyController.cs) — `UpdatePreferences`; [api/src/RecipeApi/Services/FamilyService.cs](../../api/src/RecipeApi/Services/FamilyService.cs) — `UpdateFamilyMemberPreferences`.
- **Actual assertions / substitutions:** [pwa/src/components/profile/LanguageSelection.test.tsx](../../pwa/src/components/profile/LanguageSelection.test.tsx) — calls setCurrentLocale and updateMemberPreferences for each language; translation, provider and store mocked; [api/src/RecipeApi.Tests/Services/FamilyServiceTests.cs](../../api/src/RecipeApi.Tests/Services/FamilyServiceTests.cs) — browse-only persistence assertions; no language-only assertions located.
- **Agreement / confidence:** OpenAPI requires browseViewMode; DTO/service/client permit omission. Explicit user acceptance covers current language-only behavior, not contract parity. Medium.
- **Evidence class / check / environment / identity:** Implementation-supported; behavior checks not-run under A34; read-only local checkout at the recorded commit and manifest.
- **Open question / limitation:** U-MP01 local choice after failed member save; U-MP03 contract reconciliation remains open.
- **Disposition / mapping:** Accepted/promoted under MP-P01 to the exact requirement/scenario rows below, or retained as explicitly excluded/owned there; runtime not-run.

### BSL-member-preferences-004

- **Behavior and actor:** Browser-language proposal and translation fallback.
- **Entry / trigger / observable outcome:** Protected layout → LanguageSwitchProposal schedules supported differing primary language; accept/dismiss stores dismissal. Translation lookup uses explicit locale or browser/default and caller fallback.
- **Business rule / eligibility:** No existing local choice or dismissal; proposal does not update API. LocaleToggle exists but has no mounted production caller found, so is excluded as a household entry.
- **Failure / cancellation / recovery:** Dismiss preserves language; accept saves local language but cannot override a supported member preference in provider resolution; missing translation returns fallback.
- **Configuration / time:** Two-second timer, navigator.language primary subtag; no automatic navigator-based locale initialization.
- **Ordered trace / source anchors:** `pwa/src/app/(app)/layout.tsx` — `LanguageSwitchProposal mounting`; [pwa/src/components/common/LanguageSwitchProposal.tsx](../../pwa/src/components/common/LanguageSwitchProposal.tsx) — `useEffect, handleSwitch, handleDismiss`; [pwa/src/components/common/LocaleToggle.tsx](../../pwa/src/components/common/LocaleToggle.tsx) — `toggle; unconnected entry`; [pwa/src/locales/index.ts](../../pwa/src/locales/index.ts) — `t, tWithVars`.
- **Actual assertions / substitutions:** [pwa/src/components/common/LanguageSwitchProposal.test.tsx](../../pwa/src/components/common/LanguageSwitchProposal.test.tsx) — proposal appears after fake timer, accept invokes fr, dismiss hides; provider/navigator substituted; [pwa/src/locales/locale-integrity.test.ts](../../pwa/src/locales/locale-integrity.test.ts) — catalog keys parity and coverage; no translation quality or runtime assertions.
- **Agreement / confidence:** Source and component assertions agree for proposal wiring; complete localized application unsupported. Generic merge-table and tWithVars token mechanics are immediate i18n dependencies, excluded from member-preference policy. Medium.
- **Evidence class / check / environment / identity:** Implementation-supported; behavior checks not-run under A34; read-only local checkout at the recorded commit and manifest.
- **Open question / limitation:** U-MP02 provider/local translation split; proposal acceptance only changes browser choice; storage denial unhandled.
- **Disposition / mapping:** Accepted/promoted under MP-P01 to the exact requirement/scenario rows below, or retained as explicitly excluded/owned there; runtime not-run.

### BSL-member-preferences-005

- **Behavior and actor:** Initial and changed browse presentation.
- **Entry / trigger / observable outcome:** Library entry derives saved list/stack; toggle sets a member-scoped local override and requests persistence.
- **Business rule / eligibility:** list only when saved list, otherwise stack; same-mode action is no-op; toggle resets index and end state.
- **Failure / cancellation / recovery:** On success save is reusable on fresh member load; on API failure the page override can survive profile rollback.
- **Configuration / time:** No device-local browse storage; override persists in mounted page and is scoped to member ID.
- **Ordered trace / source anchors:** `pwa/src/app/(app)/browse-all-stack/page.tsx` — `savedBrowseViewMode, browseViewModeOverride, handleViewModeChange, loadFamilyMembers effect`; [pwa/src/store/familyStore.ts](../../pwa/src/store/familyStore.ts) — `updateMemberPreferences`.
- **Actual assertions / substitutions:** `pwa/src/app/(app)/browse-all-stack/page.test.tsx` — uses selected member saved browse mode; optimistically toggles and persists; real store, generated SDK API/navigation/motion mocked.
- **Agreement / confidence:** Initial/toggle assertions align. Failure rollback is not aligned across page/store return seam. High for initial/toggle; medium for reload.
- **Evidence class / check / environment / identity:** Implementation-supported; behavior checks not-run under A34; read-only local checkout at the recorded commit and manifest.
- **Open question / limitation:** U-MP04 no promised failed-save visual rollback; local override may apply again when switching back.
- **Disposition / mapping:** Accepted/promoted under MP-P01 to the exact requirement/scenario rows below, or retained as explicitly excluded/owned there; runtime not-run.

### BSL-member-preferences-006

- **Behavior and actor:** Browse preference persistence and library consumer ownership.
- **Entry / trigger / observable outcome:** Preference PUT → saved member browse mode → future family read → fresh library entry.
- **Business rule / eligibility:** Save preserves name and language; recipe-library owns content/filter/page behavior.
- **Failure / cancellation / recovery:** Unavailable member returns 404; unsupported mode returns 400; no offline save queue.
- **Configuration / time:** Fresh entry and newly loaded profile are explicit reload conditions.
- **Ordered trace / source anchors:** [pwa/src/lib/api/family.ts](../../pwa/src/lib/api/family.ts) — `toBrowseViewMode and updateFamilyMemberPreferences`; [api/src/RecipeApi/Services/FamilyService.cs](../../api/src/RecipeApi/Services/FamilyService.cs) — `UpdateFamilyMemberPreferences`; [api/src/RecipeApi/Models/FamilyMember.cs](../../api/src/RecipeApi/Models/FamilyMember.cs) — `BrowseViewMode`; [api/src/RecipeApi/Data/RecipeDbContext.cs](../../api/src/RecipeApi/Data/RecipeDbContext.cs) — `FamilyMember configuration`; [api/database/schema.sql](../../api/database/schema.sql) — `family_members browse default/check`.
- **Actual assertions / substitutions:** [api/src/RecipeApi.Tests/Services/FamilyServiceTests.cs](../../api/src/RecipeApi.Tests/Services/FamilyServiceTests.cs) — CreateFamilyMember_Defaults_BrowseViewMode_To_Stack; UpdateFamilyMemberPreferences_Persists_BrowseViewMode_And_Preserves_Name; EF InMemory; [api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs](../../api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs) — UpdatePreferences_Persists_BrowseViewMode_And_Preserves_Name asserts PUT and subsequent list; auth-disabled TestServer with InMemory DB.
- **Agreement / confidence:** Canonical browse contract/implementation/assertions align. High; fresh browser persistence not observed.
- **Evidence class / check / environment / identity:** Implementation-supported; behavior checks not-run under A34; read-only local checkout at the recorded commit and manifest.
- **Open question / limitation:** Actual PostgreSQL/default/check enforcement not run; library paging belongs to accepted owner.
- **Disposition / mapping:** Accepted/promoted under MP-P01 to the exact requirement/scenario rows below, or retained as explicitly excluded/owned there; runtime not-run.

### BSL-member-preferences-007

- **Behavior and actor:** Preference API read/update/default/error boundary.
- **Entry / trigger / observable outcome:** Authorized family GET/GET me and route-targeted PUT → service → DB → profile in data.
- **Business rule / eligibility:** New member stack/null language; canonical combined or browse-only update saves supplied preferences and preserves omitted language/name.
- **Failure / cancellation / recovery:** Invalid browse 400 and missing target 404; exact error envelope disagrees with contract.
- **Configuration / time:** Route ID is update target; do not assume caller-target equality. Existing global household auth applies.
- **Ordered trace / source anchors:** [specs/openapi.yaml](../../specs/openapi.yaml) — `/api/family, /api/family/me, /api/family/{id}/preferences`; [api/src/RecipeApi/Dto/UpdateFamilyMemberPreferencesDto.cs](../../api/src/RecipeApi/Dto/UpdateFamilyMemberPreferencesDto.cs) — `nullable preference fields`; [api/src/RecipeApi/Dto/FamilyMemberDto.cs](../../api/src/RecipeApi/Dto/FamilyMemberDto.cs) — `preference representation`; [api/src/RecipeApi/Controllers/FamilyController.cs](../../api/src/RecipeApi/Controllers/FamilyController.cs) — `GetAll, GetMe, UpdatePreferences, ToDto`; [api/src/RecipeApi/Services/FamilyService.cs](../../api/src/RecipeApi/Services/FamilyService.cs) — `UpdateFamilyMemberPreferences`; [api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs](../../api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs) — `OnResultExecutionAsync`; [api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs](../../api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs) — `HandleExceptionAsync`; [api/src/RecipeApi/Models/FamilyMember.cs](../../api/src/RecipeApi/Models/FamilyMember.cs) — `preference defaults`.
- **Actual assertions / substitutions:** [api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs](../../api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs) — UpdatePreferences invalid mode and nonexistent target status assertions; auth-disabled factory; [api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs](../../api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs) — CreateAsync disables auth; EF InMemory/storage/orchestrator substitutions; [api/src/RecipeApi.Tests/Infrastructure/TestDbContextFactory.cs](../../api/src/RecipeApi.Tests/Infrastructure/TestDbContextFactory.cs) — UseInMemoryDatabase and ignored transaction warning.
- **Agreement / confidence:** Canonical success/statuses agree; request requiredness, 400 envelope and null-language enum semantics disagree (U-MP13). High for browse asserted statuses; medium for language/default null.
- **Evidence class / check / environment / identity:** Implementation-supported; behavior checks not-run under A34; read-only local checkout at the recorded commit and manifest.
- **Open question / limitation:** Service trims/lowercases nonempty inputs, ignores null/empty, rejects whitespace-only; noncanonical input/empty patch semantics withheld (U-MP03/U-MP12).
- **Disposition / mapping:** Accepted/promoted under MP-P01 to the exact requirement/scenario rows below, or retained as explicitly excluded/owned there; runtime not-run.

### BSL-member-preferences-008

- **Behavior and actor:** Client mapping and single-save reconciliation.
- **Entry / trigger / observable outcome:** Generated request/client → family adapter → optimistic loaded member → confirmed profile or restored prior profile/error.
- **Business rule / eligibility:** Unknown/missing browse mode maps to stack; missing language maps to empty string; no member ID in save response throws. Absent local target sends no request.
- **Failure / cancellation / recovery:** Single failure returns null; no serialization/version guard for overlapping member saves. loadFamilyMembers retains list on failure; loadCurrentIdentity adds profile only if not already present.
- **Configuration / time:** In-memory familyStore initializes selection from identity cookie; family preference content is loaded from API, not persisted Zustand storage.
- **Ordered trace / source anchors:** [pwa/src/lib/api/generated/api/family/item/preferences/index.ts](../../pwa/src/lib/api/generated/api/family/item/preferences/index.ts) — `PreferencesPutRequestBody optional properties and serializer`; [pwa/src/lib/api/generated/api/family/index.ts](../../pwa/src/lib/api/generated/api/family/index.ts) — `family response enum parsing`; [pwa/src/lib/api/generated/api/family/me/index.ts](../../pwa/src/lib/api/generated/api/family/me/index.ts) — `current profile enum parsing`; [pwa/src/lib/api/family.ts](../../pwa/src/lib/api/family.ts) — `getFamilyMembers, getCurrentFamilyMember, updateMemberPreferences`; [pwa/src/store/familyStore.ts](../../pwa/src/store/familyStore.ts) — `updateMemberPreferences, loadFamilyMembers, loadCurrentIdentity`.
- **Actual assertions / substitutions:** [pwa/src/lib/api/family.test.ts](../../pwa/src/lib/api/family.test.ts) — real generated client/JSON codec exercised only for POST creation; HTTP substituted; does not cover preference rollback; `pwa/src/app/(app)/browse-all-stack/page.test.tsx` — save request wiring through real family store with substituted SDK.
- **Agreement / confidence:** Client optionality agrees with service, differs from OpenAPI required browse. Rollback is source-supported without direct focused regression assertions. Medium.
- **Evidence class / check / environment / identity:** Implementation-supported; behavior checks not-run under A34; read-only local checkout at the recorded commit and manifest.
- **Open question / limitation:** U-MP05 overlapping saves/removal races; no UI-level universal error/retry guarantee or latest-wins; retained load failures are not fresh preference proof.
- **Disposition / mapping:** Accepted/promoted under MP-P01 to the exact requirement/scenario rows below, or retained as explicitly excluded/owned there; runtime not-run.

### BSL-member-preferences-009

- **Behavior and actor:** Preview snapshot lifecycle.
- **Entry / trigger / observable outcome:** Protected FeatureFlagProvider → load(memberId); focus → refresh → generated GET → flags replace current snapshot.
- **Business rule / eligibility:** Clear flags on load; null member no request; absent flag disabled; member changes increment generation.
- **Failure / cancellation / recovery:** Load failure leaves empty flags/error; selection-generation mismatch discards old response/failure.
- **Configuration / time:** Focus refresh is client event, not periodic polling or SSE; no promised instant cross-device propagation.
- **Ordered trace / source anchors:** `pwa/src/app/(app)/layout.tsx` — `FeatureFlagProvider`; [pwa/src/components/featureFlags/FeatureFlagProvider.tsx](../../pwa/src/components/featureFlags/FeatureFlagProvider.tsx) — `member and focus effects`; [pwa/src/store/featureFlagStore.ts](../../pwa/src/store/featureFlagStore.ts) — `load, refresh, useFeatureFlag`; [pwa/src/lib/api/featureFlags.ts](../../pwa/src/lib/api/featureFlags.ts) — `getFeatureFlags, toFeatureFlag`; [pwa/src/lib/api/generated/api/featureFlags/index.ts](../../pwa/src/lib/api/generated/api/featureFlags/index.ts) — `GET snapshot builder/response`.
- **Actual assertions / substitutions:** [pwa/src/store/featureFlagStore.test.ts](../../pwa/src/store/featureFlagStore.test.ts) — load used in setup and member-switch mutation assertions; API promises mocked; [pwa/src/components/profile/PreviewFeaturesSection.test.tsx](../../pwa/src/components/profile/PreviewFeaturesSection.test.tsx) — no flags hides section; failed snapshot retry action asserted with populated store/mocked refresh.
- **Agreement / confidence:** Snapshot/absent behavior traced; provider focus wiring lacks direct focused test here. Medium.
- **Evidence class / check / environment / identity:** Implementation-supported; behavior checks not-run under A34; read-only local checkout at the recorded commit and manifest.
- **Open question / limitation:** U-MP06 same-member loads share memberVersion; no newest-request-wins guarantee.
- **Disposition / mapping:** Accepted/promoted under MP-P01 to the exact requirement/scenario rows below, or retained as explicitly excluded/owned there; runtime not-run.

### BSL-member-preferences-010

- **Behavior and actor:** Preview controls and feedback.
- **Entry / trigger / observable outcome:** Settings PreviewFeaturesSection filters opt-in, collapsed count → expanded switches → pending feedback and announcement.
- **Business rule / eligibility:** Fixed modes not toggleable; checkbox uses confirmed memberEnabled; named label/disclosure semantics present.
- **Failure / cancellation / recovery:** Error-only section offers alert/Retry; per-flag mutation error offers retry; no opt-in/no error hides section.
- **Configuration / time:** English/French catalog copy via browser/explicit locale lookup; unknown metadata uses server fallback.
- **Ordered trace / source anchors:** `pwa/src/app/(app)/profile/settings/SettingsPageContent.tsx` — `PreviewFeaturesSection`; [pwa/src/components/profile/PreviewFeaturesSection.tsx](../../pwa/src/components/profile/PreviewFeaturesSection.tsx) — `available, change, named switch, aria-expanded/controls/live`; [pwa/src/locales/index.ts](../../pwa/src/locales/index.ts) — `t`.
- **Actual assertions / substitutions:** [pwa/src/components/profile/PreviewFeaturesSection.test.tsx](../../pwa/src/components/profile/PreviewFeaturesSection.test.tsx) — disclosure and named switch, error Retry, French load/save/metadata/announcements and unknown fallback assertions; API/actions mocked, state directly seeded.
- **Agreement / confidence:** Component assertions align for named DOM behavior, not assistive technology/device acceptance. High for those static assertions.
- **Evidence class / check / environment / identity:** Implementation-supported; behavior checks not-run under A34; read-only local checkout at the recorded commit and manifest.
- **Open question / limitation:** No universal accessibility/translation quality claim; provider-language mismatch retained in U-MP02.
- **Disposition / mapping:** Accepted/promoted under MP-P01 to the exact requirement/scenario rows below, or retained as explicitly excluded/owned there; runtime not-run.

### BSL-member-preferences-011

- **Behavior and actor:** Confirmed preview mutation and conflict recovery.
- **Entry / trigger / observable outcome:** Switch → store setEnabled → adapter PATCH enabled → controller/service → saved flag response.
- **Business rule / eligibility:** No optimistic enabled change; per-key pending prevents duplicate request; success uses confirmed DTO.
- **Failure / cancellation / recovery:** Ordinary reject retains flags and adds retryable mutation error; 409 triggers snapshot refresh; finally releases pending even refresh failure.
- **Configuration / time:** 409 reflects deployment-mode change; no background retry or durable client queue.
- **Ordered trace / source anchors:** [pwa/src/store/featureFlagStore.ts](../../pwa/src/store/featureFlagStore.ts) — `setEnabled`; [pwa/src/lib/api/featureFlags.ts](../../pwa/src/lib/api/featureFlags.ts) — `updateFeatureFlag status translation`; [pwa/src/lib/api/generated/api/featureFlags/item/index.ts](../../pwa/src/lib/api/generated/api/featureFlags/item/index.ts) — `PATCH builder and response`; [api/src/RecipeApi/Controllers/FeatureFlagsController.cs](../../api/src/RecipeApi/Controllers/FeatureFlagsController.cs) — `Update`.
- **Actual assertions / substitutions:** [pwa/src/store/featureFlagStore.test.ts](../../pwa/src/store/featureFlagStore.test.ts) — changes effective state only after server confirmation; unlocks conflict after refresh success/failure; deferred/mocked API promises.
- **Agreement / confidence:** Aligned store assertions and status adapter; no live HTTP test of flags controller located. High for store behavior, medium across API.
- **Evidence class / check / environment / identity:** Implementation-supported; behavior checks not-run under A34; read-only local checkout at the recorded commit and manifest.
- **Open question / limitation:** A 409 refresh can remove control or fail closed; no inferred preservation of unsaved intent.
- **Disposition / mapping:** Accepted/promoted under MP-P01 to the exact requirement/scenario rows below, or retained as explicitly excluded/owned there; runtime not-run.

### BSL-member-preferences-012

- **Behavior and actor:** Preview member-switch stale result isolation.
- **Entry / trigger / observable outcome:** Switch member → version increment → old mutation result/error ignored even away-and-back.
- **Business rule / eligibility:** Only the current selection generation can apply result; new member pending state cleared independently.
- **Failure / cancellation / recovery:** Old 409/500 does not refresh or pollute current member errors; old completion cannot unlock new pending save.
- **Configuration / time:** Generation identifies selection change, not every same-member request.
- **Ordered trace / source anchors:** [pwa/src/store/featureFlagStore.ts](../../pwa/src/store/featureFlagStore.ts) — `memberVersion, requestVersion guards`.
- **Actual assertions / substitutions:** [pwa/src/store/featureFlagStore.test.ts](../../pwa/src/store/featureFlagStore.test.ts) — previous member pending isolation, away-and-back old response discard, old 500/409 discard; API deferred promises.
- **Agreement / confidence:** Source and meaningful asynchronous assertions align. High.
- **Evidence class / check / environment / identity:** Implementation-supported; behavior checks not-run under A34; read-only local checkout at the recorded commit and manifest.
- **Open question / limitation:** U-MP06 remains for same-member request ordering; switching protection not universal request ordering.
- **Disposition / mapping:** Accepted/promoted under MP-P01 to the exact requirement/scenario rows below, or retained as explicitly excluded/owned there; runtime not-run.

### BSL-member-preferences-013

- **Behavior and actor:** Preview registry modes and precedence.
- **Entry / trigger / observable outcome:** Program singleton registry reads configuration → service Resolve(mode, override) → snapshot DTO.
- **Business rule / eligibility:** Three registered keys; trimmed case-insensitive off/opt-in/on; missing/invalid off; fixed mode beats override; opt-in defaults false.
- **Failure / cancellation / recovery:** Invalid logs warning and fails closed; no live configuration reload is promised.
- **Configuration / time:** Registry constructed from IConfiguration; local Compose and Synology forwarding differ.
- **Ordered trace / source anchors:** [api/src/RecipeApi/Program.cs](../../api/src/RecipeApi/Program.cs) — `FeatureFlagRegistry singleton and JSON options`; [api/src/RecipeApi/Services/FeatureFlagService.cs](../../api/src/RecipeApi/Services/FeatureFlagService.cs) — `FeatureFlagRegistry.Create, All, Get; FeatureFlagService.Resolve, ToDto`; [api/src/RecipeApi/Dto/FeatureFlagDto.cs](../../api/src/RecipeApi/Dto/FeatureFlagDto.cs) — `nullable optional values`; [docker/compose/apps.yml](../../docker/compose/apps.yml) — `API flag forwarding and PWA default locale`; [release-template/synology/compose.yaml](../../release-template/synology/compose.yaml) — `three API preview environment values`; [pwa/Dockerfile](../../pwa/Dockerfile) — `public build input`.
- **Actual assertions / substitutions:** [api/src/RecipeApi.Tests/Services/FeatureFlagServiceTests.cs](../../api/src/RecipeApi.Tests/Services/FeatureFlagServiceTests.cs) — Registry_parses_modes_fail_closed, Pdf_registry_defaults_off_and_uses_existing_modes, Resolver_combines_mode_and_override; in-memory IConfiguration, no deployed configuration.
- **Agreement / confidence:** Mode/precedence assertions align. Exact fixed-mode optional-field JSON disagrees with OpenAPI nullability. High for resolver; medium for wire/deployment.
- **Evidence class / check / environment / identity:** Implementation-supported; behavior checks not-run under A34; read-only local checkout at the recorded commit and manifest.
- **Open question / limitation:** U-MP07 local Compose missing PDF forwarding; U-MP08 locale bundle setting; U-MP10 null optional fields withheld.
- **Disposition / mapping:** Accepted/promoted under MP-P01 to the exact requirement/scenario rows below, or retained as explicitly excluded/owned there; runtime not-run.

### BSL-member-preferences-014

- **Behavior and actor:** Preview snapshot and member override API.
- **Entry / trigger / observable outcome:** Member binder → FeatureFlagsController GET/PATCH → service member lookup and member/key persistence → wrapped DTO.
- **Business rule / eligibility:** Snapshot enumerates registry only; PATCH only registered opt-in keys; upsert scoped to member/key; other member untouched; fixed-mode read/rejection leaves choices intact.
- **Failure / cancellation / recovery:** No identity 401; unknown key 404; non-opt-in key 409; absent member opt-in update 404. GET absent member also 404 but not in contract.
- **Configuration / time:** Authorized household; PostgreSQL composite key and cascade declared, not executed; retained override reused by new registry after deployment mode returns opt-in.
- **Ordered trace / source anchors:** [specs/openapi.yaml](../../specs/openapi.yaml) — `/api/feature-flags, /api/feature-flags/{key}, FeatureFlagDto`; [api/src/RecipeApi/Controllers/FeatureFlagsController.cs](../../api/src/RecipeApi/Controllers/FeatureFlagsController.cs) — `GetSnapshot, Update`; [api/src/RecipeApi/Infrastructure/FamilyMemberIdModelBinder.cs](../../api/src/RecipeApi/Infrastructure/FamilyMemberIdModelBinder.cs) — `BindModelAsync`; [api/src/RecipeApi/Services/FeatureFlagService.cs](../../api/src/RecipeApi/Services/FeatureFlagService.cs) — `GetSnapshotAsync, SetOverrideAsync`; [api/src/RecipeApi/Models/FeatureFlagOverride.cs](../../api/src/RecipeApi/Models/FeatureFlagOverride.cs) — `member/key fields`; [api/src/RecipeApi/Data/RecipeDbContext.cs](../../api/src/RecipeApi/Data/RecipeDbContext.cs) — `FeatureFlagOverride composite key/cascade`; [api/database/schema.sql](../../api/database/schema.sql) — `feature_flag_overrides`; [api/database/compatibility.sql](../../api/database/compatibility.sql) — `conditional feature_flag_overrides creation`.
- **Actual assertions / substitutions:** [api/src/RecipeApi.Tests/Services/FeatureFlagServiceTests.cs](../../api/src/RecipeApi.Tests/Services/FeatureFlagServiceTests.cs) — SetOverride_is_member_specific_and_upserts tests cooking/planner true→false and Assert.Single; EF InMemory; no PostgreSQL cascade or flags HTTP assertions.
- **Agreement / confidence:** Known-key opt-in upsert aligns; GET 404 omitted by contract, null optional fields conflict. Medium across full API.
- **Evidence class / check / environment / identity:** Implementation-supported; behavior checks not-run under A34; read-only local checkout at the recorded commit and manifest.
- **Open question / limitation:** U-MP09 withheld GET 404; U-MP10 wire nulls; no reset/delete override endpoint, arbitrary flag registration or global member-setting UI.
- **Disposition / mapping:** Accepted/promoted under MP-P01 to the exact requirement/scenario rows below, or retained as explicitly excluded/owned there; runtime not-run.

### BSL-member-preferences-015

- **Behavior and actor:** Cooking and planning preview consumers.
- **Entry / trigger / observable outcome:** Effective flag snapshot → CooksMode single-page/focused branch; PlannerDragHandle hold/immediate branch.
- **Business rule / eligibility:** Use effective enabled, not memberEnabled. Cooking requirement ownership remains cooking; preference owner records mode choice.
- **Failure / cancellation / recovery:** Missing flags false; planner effect resets pending hold on flag changes/unmount/blur, movement, other pointer and cancellation.
- **Configuration / time:** Hold 250 ms; slop 8 pixels; synthetic pointer/touch and vibration support do not qualify physical device behavior.
- **Ordered trace / source anchors:** [pwa/src/components/planner/CooksMode.tsx](../../pwa/src/components/planner/CooksMode.tsx) — `singlePageEnabled, singlePageCooking`; [pwa/src/components/planner/PlannerDragHandle.tsx](../../pwa/src/components/planner/PlannerDragHandle.tsx) — `enabled, down, reset and cleanup`.
- **Actual assertions / substitutions:** [pwa/src/components/planner/CooksMode.test.tsx](../../pwa/src/components/planner/CooksMode.test.tsx) — all editable steps on one page; focused Next/Back when off; API/detail/markCooked mocked, feature store seeded; [pwa/src/components/planner/PlannerDragHandle.test.tsx](../../pwa/src/components/planner/PlannerDragHandle.test.tsx) — 250ms hold, scroll cancellation/activation, disable/unmount cancellation, secondary button/multi-finger and disabled immediate activation; fake timers, synthetic PointerEvent, mocked vibrate/start.
- **Agreement / confidence:** Consumer branches and assertions align; ownership references accepted cooking requirements. High for mode branch; medium device.
- **Evidence class / check / environment / identity:** Implementation-supported; behavior checks not-run under A34; read-only local checkout at the recorded commit and manifest.
- **Open question / limitation:** Detailed gesture thresholds/cancellation and calendar movement stay with meal-planning; no accepted gesture-owning requirement located, so those detailed assertions excluded from member-preferences normative scope.
- **Disposition / mapping:** Accepted/promoted under MP-P01 to the exact requirement/scenario rows below, or retained as explicitly excluded/owned there; runtime not-run.

### BSL-member-preferences-016

- **Behavior and actor:** PDF consumer and processing-language ownership.
- **Entry / trigger / observable outcome:** Effective member preview snapshot → picker/panel eligibility; PDF API independently reads same flag before intake.
- **Business rule / eligibility:** Capture owns “Gate PDF acquisition by effective member eligibility”, “Resolve PDF draft eligibility and discard interrupted drafts” and “Request the configured processing language without certifying output language”.
- **Failure / cancellation / recovery:** Loading/error/different-member snapshot does not advertise PDF; panel waits or shows unavailable state; member/query/visibility interruption retires draft under capture policy.
- **Configuration / time:** Outside Family GOTO; server feature mode independently authoritative; no import-processing language derived from member locale.
- **Ordered trace / source anchors:** [pwa/src/components/capture/MinimalCapture.tsx](../../pwa/src/components/capture/MinimalCapture.tsx) — `pdfEnabled, handleRecipeBundleFileChange awaitingFlags`; [pwa/src/components/capture/PdfCapturePanel.tsx](../../pwa/src/components/capture/PdfCapturePanel.tsx) — `resolved, enabled, member ownership effects`; [api/src/RecipeApi/Controllers/PdfCaptureController.cs](../../api/src/RecipeApi/Controllers/PdfCaptureController.cs) — `Capture membership and snapshot gate`.
- **Actual assertions / substitutions:** [pwa/src/components/capture/MinimalCapture.recipe-import.test.tsx](../../pwa/src/components/capture/MinimalCapture.recipe-import.test.tsx) — retains selected PDF during snapshot refresh; API/routing substituted and flag store seeded; [pwa/src/components/capture/PdfCapturePanel.test.tsx](../../pwa/src/components/capture/PdfCapturePanel.test.tsx) — draft cleared for Family GOTO/query change; stale member delivery prevented; synthetic File and API/share mocks.
- **Agreement / confidence:** Consumer source agrees with accepted capture owner; do not duplicate acquisition rules here. High for boundary, medium environment.
- **Evidence class / check / environment / identity:** Implementation-supported; behavior checks not-run under A34; read-only local checkout at the recorded commit and manifest.
- **Open question / limitation:** Runtime renderer/database/device acquisition and content-language conformance are not-run; no new capture policy.
- **Disposition / mapping:** Accepted/promoted under MP-P01 to the exact requirement/scenario rows below, or retained as explicitly excluded/owned there; runtime not-run.

## Complete coverage and requirement/scenario mapping

Each row maps **every named scenario** under its requirement. These disjoint requirements were promoted unchanged from the companion deltas;
accepted requirements in other owner capabilities remain unchanged.

| Slice / artifact | Drafted requirement | Scenarios | Evidence |
| --- | --- | --- | --- |
| [language-selection](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-language-selection/specs/member-preferences/spec.md) | Initialize browser language from a supported local choice | Browser has a supported saved choice; Browser choice is absent or unsupported | BSL-member-preferences-001 |
| [language-selection](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-language-selection/specs/member-preferences/spec.md) | Resolve language for the selected loaded member | Member overrides browser choice; Switch member or lose a supported profile | BSL-member-preferences-002 |
| [language-selection](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-language-selection/specs/member-preferences/spec.md) | Choose English or French on Profile | Select French for a member; Choose English without a member | BSL-member-preferences-003 |
| [language-selection](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-language-selection/specs/member-preferences/spec.md) | Persist a language-only member update as current behavior | Save French without a browse field; Restore persisted choice after loading | BSL-member-preferences-003 |
| [language-selection](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-language-selection/specs/member-preferences/spec.md) | Offer a browser-language proposal without persisting a member update | Supported different browser language; Accept or dismiss the proposal; Suppress an inapplicable proposal | BSL-member-preferences-004 |
| [language-selection](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-language-selection/specs/member-preferences/spec.md) | Fall back to supplied translation text when a key is unavailable | Explicit locale and missing key; Lookup without explicit locale | BSL-member-preferences-004 |
| [browse-selection](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-browse-selection/specs/member-preferences/spec.md) | Initialize library presentation from the selected member | Saved list selection; Missing or other saved mode | BSL-member-preferences-005 |
| [browse-selection](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-browse-selection/specs/member-preferences/spec.md) | Change browse presentation and request member persistence | Choose list from stack; Choose stack without a member; Choose the already active presentation | BSL-member-preferences-005 |
| [browse-selection](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-browse-selection/specs/member-preferences/spec.md) | Scope the browse override to its selected member | Switch to another member | BSL-member-preferences-005 |
| [browse-selection](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-browse-selection/specs/member-preferences/spec.md) | Restore saved browse mode after a fresh load | Reopen after successful list save | BSL-member-preferences-006 |
| [api-persistence](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-api-persistence/specs/member-preferences/spec.md) | Return member preference defaults and saved values | Read a new member; Read saved preferences | BSL-member-preferences-007 |
| [api-persistence](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-api-persistence/specs/member-preferences/spec.md) | Persist contract-valid member preference updates | Save both preferences; Save browse mode alone | BSL-member-preferences-007 |
| [api-persistence](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-api-persistence/specs/member-preferences/spec.md) | Reject invalid browse preferences and unavailable targets | Unsupported browse value; Target does not exist | BSL-member-preferences-007 |
| [api-persistence](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-api-persistence/specs/member-preferences/spec.md) | Reconcile a single client preference save with its response | Save succeeds; Save rejects or response lacks identity; Target is not locally loaded | BSL-member-preferences-008 |
| [preview-choices](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-preview-choices/specs/member-preferences/spec.md) | Load a member preview snapshot and clear previous choices | Load or refresh a selected member; Clear member selection | BSL-member-preferences-009 |
| [preview-choices](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-preview-choices/specs/member-preferences/spec.md) | Disclose only available opt-in preview controls | Opt-in flags are available; No available previews | BSL-member-preferences-010 |
| [preview-choices](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-preview-choices/specs/member-preferences/spec.md) | Apply a preview choice only after confirmation | Save is pending; Save succeeds | BSL-member-preferences-011 |
| [preview-choices](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-preview-choices/specs/member-preferences/spec.md) | Recover from preview load and save failures | Snapshot load fails and retries; Save rejects; Deployment changes during save | BSL-member-preferences-011 |
| [preview-choices](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-preview-choices/specs/member-preferences/spec.md) | Discard preview results from a previous member selection | Previous member save resolves late; Switch away and back | BSL-member-preferences-012 |
| [preview-choices](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-preview-choices/specs/member-preferences/spec.md) | Show preview text using available translations and server fallback | French preview feedback; Unknown preview metadata | BSL-member-preferences-010 |
| [preview-resolution](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-preview-resolution/specs/member-preferences/spec.md) | Resolve registered preview deployment modes fail closed | Enabled and optional modes; Default or invalid mode | BSL-member-preferences-013 |
| [preview-resolution](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-preview-resolution/specs/member-preferences/spec.md) | Give deployment mode precedence over member overrides | Fixed modes ignore stored choices; Optional mode uses member choice | BSL-member-preferences-013 |
| [preview-resolution](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-preview-resolution/specs/member-preferences/spec.md) | Read the registered snapshot for the bound member | Member-specific snapshot; Missing context; Stored unregistered key | BSL-member-preferences-014 |
| [preview-resolution](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-preview-resolution/specs/member-preferences/spec.md) | Persist overrides only for registered opt-in previews | Insert and replace one member choice; Unknown flag or fixed mode; No bound identity; Member unavailable for opt-in | BSL-member-preferences-014 |
| [preview-resolution](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-preview-resolution/specs/member-preferences/spec.md) | Retain member choices while a deployment mode overrides them | Restore a retained opt-in choice | BSL-member-preferences-014 |
| [preview-resolution](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-preview-resolution/specs/member-preferences/spec.md) | Select consumer experience using effective preview enablement | Effective cooking mode; Planner preview unavailable or enabled; PDF consumes shared resolution | BSL-member-preferences-015; 016 (PDF owner) |

### Cross-capability ownership and excluded discovery coverage

| Discovered behavior | Disposition / actual owning requirement or limitation |
| --- | --- |
| Identity selection, member load and recovery before locale resolution | [household-identity](../../openspec/specs/household-identity/spec.md): “Resolve the current member through the API”, “Recover identity when the protected client has no selection”, “Request member selection and Home from Profile”. |
| Member request context and access | Same accepted owner: “Carry browser member context on shared SDK requests”, “Bind shared API member context independently of membership validation”, “Apply member context after household access”. |
| Browse content, filtering, pagination, loading/error UI | [recipe-library](../../openspec/specs/recipe-library/spec.md): “Open the household library and offer list presentation”, “Request list pages for the selected library filter”. Preference choice/persistence is local to the browse delta; remaining controls remain library-owned. |
| Focused versus single-page cooking consequences | [cooking](../../openspec/specs/cooking/spec.md): “Navigate one focused instruction at a time”, “Read all instructions under the effective single-page flag”. Effective flag selection mapped in resolution delta. |
| Planner immediate versus deliberate hold | Resolution delta mode-selection requirement, BSL-015. Detailed gesture cancellation/thresholds excluded as X-MP03; calendar mutation remains meal-planning, no fabricated gesture-owner requirement. |
| PDF picker, loading/unavailable/save and independent API gate | [recipe-capture](../../openspec/specs/recipe-capture/spec.md): “Gate PDF acquisition by effective member eligibility”, “Resolve PDF draft eligibility and discard interrupted drafts”. BSL-016 and resolution delta reference these without redefining acquisition. |
| Extraction/synthesis target language and source handling | Same accepted capture owner: “Request the configured processing language without certifying output language”; member UI locale is not processing language. |
| Browser detected language, local manual/dismissed markers, default, translation fallback | Language delta BSL-001–004; storage-error recovery excluded X-MP02 and universal member localization excluded U-MP02. |
| Successful reload and selection changes | Language/browse delta scenarios conditioned on loaded profiles; preview provider reloads on selection and focus. Load failures/races limited by U-MP05–06. |
| Null/empty, padded/uppercase or unsupported preference payloads; exact errors | Canonical success/statuses drafted in API delta, language-only exception accepted; all other disagreement/transaction claims withheld U-MP03/U-MP12. |
| Registry unknown key, three settings, retained override, snapshot metadata and lifecycle | Resolution delta BSL-013–014; null wire discrepancy U-MP10; absent-member GET response U-MP09. No override-delete UI/API exists in inspected path. |
| Dormant toggle, concurrency, DB cascade, deployment/build/device differences | Explicit exclusions X-MP01–03 and U-MP05–11; no promise invented to fill missing evidence. |

## Artifact and lifecycle status

| Change (all include proposal, design, tasks and specs/member-preferences/spec.md) | Requirements / scenarios | Discovery | Artifact | Human review | Main spec | Runtime evidence |
| --- | --- | --- | --- | --- | --- | --- |
| [baseline-member-preferences-language-selection](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-language-selection/proposal.md) | 6 / 13 | Reconciled with listed unknowns | Validated | Accepted 2026-10-16 MP-P01 | Promoted MP-P01 | Not-run A34 |
| [baseline-member-preferences-browse-selection](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-browse-selection/proposal.md) | 4 / 7 | Reconciled with listed unknowns | Validated | Accepted 2026-10-16 MP-P01 | Promoted MP-P01 | Not-run A34 |
| [baseline-member-preferences-api-persistence](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-api-persistence/proposal.md) | 4 / 9 | Reconciled with listed unknowns | Validated | Accepted 2026-10-16 MP-P01 | Promoted MP-P01 | Not-run A34 |
| [baseline-member-preferences-preview-choices](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-preview-choices/proposal.md) | 6 / 13 | Reconciled with listed unknowns | Validated | Accepted 2026-10-16 MP-P01 | Promoted MP-P01 | Not-run A34 |
| [baseline-member-preferences-preview-resolution](../../openspec/changes/archive/2026-10-16-baseline-member-preferences-preview-resolution/proposal.md) | 6 / 15 | Reconciled with listed unknowns | Validated | Accepted 2026-10-16 MP-P01 | Promoted MP-P01 | Not-run A34 |

Total: 26 requirements / 57 scenarios. Human acceptance is recorded under MP-P01; CLI task completion alone did not establish it.

## Content identity and preservation

- Session/date: MP-G01, 2026-10-16, America/Toronto.
- Branch: moving-to-openspec; commit: 04a1c4570f9bbb01b47436790d4248635ac3179a.
- Baseline contained staged/unstaged edits to other capability plans/main specs/changes,
  Taskfile.yml and .github/workflows/validate.yml, plus untracked cooking, quality and
  grocery artifacts. The index had staged and unstaged edits. member-preferences.md
  was clean; no member-preferences change or main spec existed. No observed deleted
  baseline path was adopted. Other sessions concurrently changed unrelated plans,
  grocery/search/sharing artifacts, shared workflow and the verification harness;
  those changes are preserved and are not attributed to this task. Preserve staging.
- Before-images/status were captured privately outside the repository. Only this plan,
  the index's Member preferences row, and five CLI-scaffolded changes are task-owned.
- SHA-256 below identifies each inspected source/test/contract/config input; unchanged
  preexisting working-tree files are the evidence identity, including already dirty
  accepted main owner specs. Recheck after source changes; commit alone is insufficient.

| Evidence input | SHA-256 |
| --- | --- |
| [api/database/compatibility.sql](../../api/database/compatibility.sql) | `bd3828fc1ce8b898b0feaa8f2e41be2e211cecadbefbfe9a68e14df435b859d5` |
| [api/database/schema.sql](../../api/database/schema.sql) | `3f7767cd704299374ebdcd89a11709680013ba26a477ad23f41da54e6da55161` |
| [api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs](../../api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs) | `5c4e0f84545455fcc77c38e3ab78e34c6f0fcd4387ffb56227357fe2d9d2cc27` |
| [api/src/RecipeApi.Tests/Infrastructure/TestDbContextFactory.cs](../../api/src/RecipeApi.Tests/Infrastructure/TestDbContextFactory.cs) | `4f292fc990b79f5db66d06d166a8317a13748dc0003e2c1f5dc1ed615954db82` |
| [api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs](../../api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs) | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| [api/src/RecipeApi.Tests/Services/FamilyServiceTests.cs](../../api/src/RecipeApi.Tests/Services/FamilyServiceTests.cs) | `12a7bbc901a3c4c1f03a90a8476594c64e89670e80ed16d10a00f035df64da64` |
| [api/src/RecipeApi.Tests/Services/FeatureFlagServiceTests.cs](../../api/src/RecipeApi.Tests/Services/FeatureFlagServiceTests.cs) | `66d7c8857bf23ac75a363575cc87d680a726e23acdb7f0f135cd2053b7a28518` |
| [api/src/RecipeApi/Controllers/FamilyController.cs](../../api/src/RecipeApi/Controllers/FamilyController.cs) | `a6c1bced4b82ecf32927ad801b7c0c037914ea51577fb3ceabfd8291e41852ee` |
| [api/src/RecipeApi/Controllers/FeatureFlagsController.cs](../../api/src/RecipeApi/Controllers/FeatureFlagsController.cs) | `db5996eb99e5eacc1ce57226e954db847e08c6acfa748db7b676f5579e7feec5` |
| [api/src/RecipeApi/Controllers/PdfCaptureController.cs](../../api/src/RecipeApi/Controllers/PdfCaptureController.cs) | `c0319aec6b7eecc9a131efee6c90e6ce9ad501d9f55d91dcbb6b0b3d408b1f2e` |
| [api/src/RecipeApi/Data/RecipeDbContext.cs](../../api/src/RecipeApi/Data/RecipeDbContext.cs) | `92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447` |
| [api/src/RecipeApi/Dto/FamilyMemberDto.cs](../../api/src/RecipeApi/Dto/FamilyMemberDto.cs) | `9979e076a1bc2ff2537d6e95e54f081bdae558ba717d99fee26a1587c587c16e` |
| [api/src/RecipeApi/Dto/FeatureFlagDto.cs](../../api/src/RecipeApi/Dto/FeatureFlagDto.cs) | `49f4bec140d0fa7f461c976cebf628aa7ccf589f06a929da884960a2d7c0e69e` |
| [api/src/RecipeApi/Dto/UpdateFamilyMemberPreferencesDto.cs](../../api/src/RecipeApi/Dto/UpdateFamilyMemberPreferencesDto.cs) | `b6741938bd7fe123fbf00a14de080e985566f18a6d6222708190720f7bcef008` |
| [api/src/RecipeApi/Infrastructure/FamilyMemberIdModelBinder.cs](../../api/src/RecipeApi/Infrastructure/FamilyMemberIdModelBinder.cs) | `4d5dcc9f7d9993abb4c59802f770da139c4875c55544df8410553332a04a2f64` |
| [api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs](../../api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs) | `6fa3cd08587220fc4e18803f6ba020e494b81211cf99c53ec10de23ddd46f11d` |
| [api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs](../../api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs) | `b5849eb709ca2bc85efa3051d3a953ca955ef8704848327ad88d0297299d949b` |
| [api/src/RecipeApi/Models/FamilyMember.cs](../../api/src/RecipeApi/Models/FamilyMember.cs) | `cf05c05553a0b57941661629dedfe4e28c713415bccd85ccd4eca613254fed5f` |
| [api/src/RecipeApi/Models/FeatureFlagOverride.cs](../../api/src/RecipeApi/Models/FeatureFlagOverride.cs) | `7f79156355dc90c5c3bb8fa5aa7c2c839fc79388c2e00a0f953993c210fb0a6a` |
| [api/src/RecipeApi/Program.cs](../../api/src/RecipeApi/Program.cs) | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |
| [api/src/RecipeApi/Services/FamilyService.cs](../../api/src/RecipeApi/Services/FamilyService.cs) | `60ee6f8d6a638a08de88a0794dddd1195efee1624bcffa41423fe0f74f370586` |
| [api/src/RecipeApi/Services/FeatureFlagService.cs](../../api/src/RecipeApi/Services/FeatureFlagService.cs) | `53af415c59cea86b2dc34e5f665e2fc75d8f6d9645c21e62198016bb2098a534` |
| [docker/compose/apps.yml](../../docker/compose/apps.yml) | `84890a4d95cde113b58f5c0981be1afa9d688f5417c57e5cb1bdc6e91c3b20e2` |
| [openspec/specs/cooking/spec.md](../../openspec/specs/cooking/spec.md) | `1d6baff148cfea08eb741d0d2a72fa00e97a9a5d2710645eeebf0b717807ce94` |
| [openspec/specs/household-identity/spec.md](../../openspec/specs/household-identity/spec.md) | `4c7f5a1faafd5439ab6f261b1efb140a4b0c10643cf16d087874c3c52ee9b749` |
| [openspec/specs/meal-planning/spec.md](../../openspec/specs/meal-planning/spec.md) | `96467d593b80c53d6582502c1f798caa741a22ca13e374265a03f8a0360df9f6` |
| [openspec/specs/recipe-capture/spec.md](../../openspec/specs/recipe-capture/spec.md) | `b7d563542abc9cbdbe1e470cbdc9fa44ddd4dee54f806ef7ecfc914dfebd456c` |
| [openspec/specs/recipe-library/spec.md](../../openspec/specs/recipe-library/spec.md) | `7fd80218a8551dba51d70f057f82d40cce9cd3fe5356c6d3d82d6a07a4f857d2` |
| [pwa/Dockerfile](../../pwa/Dockerfile) | `3ff615f355bbf1fcb01f023c9dc56313c9b3f2c6819e9d19ead662bed2ac8fb3` |
| `pwa/src/app/(app)/browse-all-stack/page.test.tsx` | `145ba87c200a3392d01368b0c8f6c45e2745f38b7ff120805cbf9e0b17f4abeb` |
| `pwa/src/app/(app)/browse-all-stack/page.tsx` | `2beaa3dd23a1817db55c037a27fbe92f881444d4285726af1b034a15d8ece947` |
| `pwa/src/app/(app)/layout.tsx` | `4daa1c42696fc0ed77b1e458199844dac241ee87116e2e14f218057dc59bb5e9` |
| `pwa/src/app/(app)/profile/page.tsx` | `2276868bc76ec0f13f2293ea5f1ae46ed2c1181cb386fb9c45e1ae6c7ef200c4` |
| `pwa/src/app/(app)/profile/settings/SettingsPageContent.tsx` | `3deed0d88c6ac8f4ab5b94cc4724ae163dae344fd39c7aaccdf8a0c67d7e9aec` |
| [pwa/src/app/layout.tsx](../../pwa/src/app/layout.tsx) | `96482e0e3859142238b3d99c98e5e685e884d26a2f75907281c0dc18ddc8d5f6` |
| [pwa/src/components/capture/MinimalCapture.recipe-import.test.tsx](../../pwa/src/components/capture/MinimalCapture.recipe-import.test.tsx) | `a34f4e0686200f03800c12b8c2433f770f2b3a041e9734cb55e170de45be0fb8` |
| [pwa/src/components/capture/MinimalCapture.tsx](../../pwa/src/components/capture/MinimalCapture.tsx) | `aadbb37ec2fe548af6e41c5460ea3339377fb215f66f19eac054666416742af5` |
| [pwa/src/components/capture/PdfCapturePanel.test.tsx](../../pwa/src/components/capture/PdfCapturePanel.test.tsx) | `012049964ae23aacabda5b909e517bbe841255cf3624ccdc6fc6297a022ba98a` |
| [pwa/src/components/capture/PdfCapturePanel.tsx](../../pwa/src/components/capture/PdfCapturePanel.tsx) | `94b0865a36b86353f5bd80f5c892051bb004ae7c9c2bcbe59186339d8e1131df` |
| [pwa/src/components/common/LanguageSwitchProposal.test.tsx](../../pwa/src/components/common/LanguageSwitchProposal.test.tsx) | `20e070e9d8c13b8dad9938231f05067aa21ae82412ac4544633698b25d652518` |
| [pwa/src/components/common/LanguageSwitchProposal.tsx](../../pwa/src/components/common/LanguageSwitchProposal.tsx) | `b611c1cc863db56094db21b986ce3e28b0ff911f89f45112d82006032a59d9d5` |
| [pwa/src/components/common/LocaleProvider.tsx](../../pwa/src/components/common/LocaleProvider.tsx) | `813a5fac36c892770d1f49601924037654514fcf1398751d677060756891a1ca` |
| [pwa/src/components/common/LocaleToggle.tsx](../../pwa/src/components/common/LocaleToggle.tsx) | `55d9ba291f7ab298d6342897b770698e109ab95c0f73aff50dcbc97d65617816` |
| [pwa/src/components/featureFlags/FeatureFlagProvider.tsx](../../pwa/src/components/featureFlags/FeatureFlagProvider.tsx) | `b17e4c224987a0906c90aa122c0202ce5e31a0b8f1b252487b5afb3af29ae420` |
| [pwa/src/components/identity/IdentityHint.tsx](../../pwa/src/components/identity/IdentityHint.tsx) | `f56d062effd4323a6ad82775d637c4ab27d51e45e0d580e7c727ad33bec7b5cc` |
| [pwa/src/components/identity/IdentityValidator.tsx](../../pwa/src/components/identity/IdentityValidator.tsx) | `f35b0f71bd2abc70e79c2c9169cd57f9bf71eff72fa8ca04eda6d94f20384f1b` |
| [pwa/src/components/planner/CooksMode.test.tsx](../../pwa/src/components/planner/CooksMode.test.tsx) | `2509bef1abf8a7c5a45d96820269b7debd6112a3f52fee3e0f14b2d9b3c2c026` |
| [pwa/src/components/planner/CooksMode.tsx](../../pwa/src/components/planner/CooksMode.tsx) | `daddc803a112db04791b202e546021e86d3985acf11dbdc3e4e15e60c211d91a` |
| [pwa/src/components/planner/PlannerDragHandle.test.tsx](../../pwa/src/components/planner/PlannerDragHandle.test.tsx) | `f229703d24987e05a6720fb29605443e4440160bd32c2eaa6b62b69d6e30694d` |
| [pwa/src/components/planner/PlannerDragHandle.tsx](../../pwa/src/components/planner/PlannerDragHandle.tsx) | `3cc09c93f7331ea5df8ed2566319cf73fe237aafbc05a1cc639a648b8cc5525d` |
| [pwa/src/components/profile/LanguageSelection.test.tsx](../../pwa/src/components/profile/LanguageSelection.test.tsx) | `97c6e761a425aa054f5447a6b5ff9e47555d7809a4809088ccbc5c67907e5173` |
| [pwa/src/components/profile/LanguageSelection.tsx](../../pwa/src/components/profile/LanguageSelection.tsx) | `49c479aea3c8e0ab98cd318e1b13eca236509be9d7aa7925381be57e218ba013` |
| [pwa/src/components/profile/PreviewFeaturesSection.test.tsx](../../pwa/src/components/profile/PreviewFeaturesSection.test.tsx) | `cbe3bc3794c8d51c34004fd610d07a0b88e1bfb70cdc5caa084575c5d907d4e5` |
| [pwa/src/components/profile/PreviewFeaturesSection.tsx](../../pwa/src/components/profile/PreviewFeaturesSection.tsx) | `e9c18bb71ab36b6d6bf03291ccb5de4e38e686651c7da68bbe137f90cfbe6f10` |
| [pwa/src/lib/api/family.test.ts](../../pwa/src/lib/api/family.test.ts) | `df3d8885629bde4788bb499bb921a71559ed2be5eb545eabe9f1f6edea835b4b` |
| [pwa/src/lib/api/family.ts](../../pwa/src/lib/api/family.ts) | `23315b8d44b2a0b1d745d180e37257eb4c2709e0edbe6571513cfd909faf35ad` |
| [pwa/src/lib/api/featureFlags.ts](../../pwa/src/lib/api/featureFlags.ts) | `8a22435a41c83e8aedee8717d9b7e8f8ef7bb00efe0e60ef71d9ae15b838987c` |
| [pwa/src/lib/api/generated/api/family/index.ts](../../pwa/src/lib/api/generated/api/family/index.ts) | `5e3abfd3d041a3abd24b28ee1fbaaa12bf6cfd721b18f51eac43b57e4f7e3095` |
| [pwa/src/lib/api/generated/api/family/item/preferences/index.ts](../../pwa/src/lib/api/generated/api/family/item/preferences/index.ts) | `73d118bbbfed3cad8daf1a6b06d2e73e2c6eebd5898af8e58630bd3990cd175f` |
| [pwa/src/lib/api/generated/api/family/me/index.ts](../../pwa/src/lib/api/generated/api/family/me/index.ts) | `3764d663b0a33641e2ec6aeb89c32288837453bd3bcf98f8885d229213ec8efe` |
| [pwa/src/lib/api/generated/api/featureFlags/index.ts](../../pwa/src/lib/api/generated/api/featureFlags/index.ts) | `345cab2d6f27428ab0782a0f36470f00059e15b78a199ac0232926fa65671983` |
| [pwa/src/lib/api/generated/api/featureFlags/item/index.ts](../../pwa/src/lib/api/generated/api/featureFlags/item/index.ts) | `3ae9638608d3fe758f6b90a512697f592bcc243801426e1aa1add907dd3cb485` |
| [pwa/src/lib/i18n/index.ts](../../pwa/src/lib/i18n/index.ts) | `dfdec0fc6b4e0e44ed7d3d3d1624245ed339ab90b82d95d15c30a2170452682a` |
| [pwa/src/locales/index.ts](../../pwa/src/locales/index.ts) | `898e7367a9d83aec4e5673b5cc541fe7e6ea29211d7a2b14ed23e9b4a5a2c5ae` |
| [pwa/src/locales/locale-integrity.test.ts](../../pwa/src/locales/locale-integrity.test.ts) | `b7b9635bbab20898f2f11686c88cbdb296f3b499b626cbba79fc1354263e07e6` |
| [pwa/src/store/familyStore.ts](../../pwa/src/store/familyStore.ts) | `68d09caecfb61d69a663cd20f7082dc1306cd3c4986203c72ced84b4c6b1566a` |
| [pwa/src/store/featureFlagStore.test.ts](../../pwa/src/store/featureFlagStore.test.ts) | `cb5d48679c7c8882f19af93d2b4b18dd149e97e7aa1a4d7bff41348ffbd1cc30` |
| [pwa/src/store/featureFlagStore.ts](../../pwa/src/store/featureFlagStore.ts) | `55d05273679b5be4b77458a437e69e8011eadf652aad2df6a4e703125f8780b2` |
| [release-template/synology/compose.yaml](../../release-template/synology/compose.yaml) | `7b77915a7032cd57026cedf1790a261811da1e314ddb9c4c25c9b09a0fd0b76b` |
| [specs/openapi.yaml](../../specs/openapi.yaml) | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |

## Generation session record and checks (MP-G01, historical)

- Completed discovery: BSL-member-preferences-001–016; all ten fields for each
  selected slice, exact requirement/scenario mapping, actual owner references,
  source identities, test substitutions, discrepancies and exclusions recorded.
- OpenSpec root/schema/instructions: resolved nearest local repository with CLI
  list/context, discovered change/spec inventory, obtained current instructions in
  dependency order for every change. No initialization/configuration changes.
- Passed before final repository verification: all five selected changes passed strict
  CLI validation; final global strict validation passed 89/89 items with no failures.
  Previously promoted active changes produced informational archive-duplicate
  notices; none is an error or authorization to archive. Source-link/mapping review passed: 26 unique requirement names and all 57
  scenarios mapped, zero unresolved links, 70 unchanged evidence identities, and
  selected staged/unstaged whitespace checks passed. Unrelated concurrent edits
  remain outside task ownership; the shared index contains their preexisting rows.
- Final bounded command: task verify with this plan, the index, and all 25 files in
  the five new change directories. Inspect the invocation-specific record_path returned by the current harness
  (.task/agent-finish/last-run.json is a convenience copy); the final
  user-facing result reports passed/failed/blocked/not-run/not-applicable separately.
  This record does not pre-claim a result for that final command.
- Behavior tests, live API, PostgreSQL, browser/device, deployment and renderer:
  **not-run**, per A10/A34 and documentation-only authorization. Application TDD,
  generated-client regeneration and code checks: **not-applicable** to these edits.
- No application, test, contract, generated client, SQL, configuration, dependency,
  agent/workflow instruction, main member-preferences spec, staging or commit edits.

## Promotion session record and checks (MP-P01)

- Authorization: current user “promote it”; exact five previously presented deltas,
  26 requirements / 57 scenarios, all recorded exclusions retained.
- Discovery/source refresh: all 70 recorded evidence input SHA-256 identities matched
  before promotion. Current CLI list/context resolved the nearest repository root;
  each selected status supplied its delta path and current specs instructions were
  obtained before writing. The main member-preferences spec was absent.
- Changed paths: this plan, the Member preferences row in the shared index, and
  openspec/specs/member-preferences/spec.md. Source deltas and all other existing
  content remain unchanged by this promotion; preserve unrelated concurrent work.
- Acceptance check: main Purpose copied from the first delta; all 26 requirement
  blocks and 57 scenarios merged in the presented order without wording changes,
  with a single Requirements section. No delta-operation headers enter the main spec.
- Validation: selected/main/global OpenSpec checks, links, whitespace and exact-block
  equality are checked before final bounded task verify with the three changed paths.
  Final check outcomes and the invocation-specific evidence record are reported in
  the session response; this text does not pre-claim the final command outcome.
- Runtime/API/database/browser/device checks remain not-run under A34. Application
  tests, generated-client checks and implementation are not applicable to this
  documentation promotion. No staging, commit or archival occurs.

## Exact next bounded action

No further promotion is pending for this accepted member-preferences scope.
Keep U-MP01–13/X-MP01–04 visible. Await a separately selected follow-up such as a
specific discrepancy decision, runtime qualification or archive lifecycle action;
none is authorized merely by this promotion.
