# Household identity baseline plan

## Current capability ownership after domain split — 2026-10-16

Use the current owners below for this former combined capability. All dated extraction records, source digests, BSL/U/A identifiers and qualification limits below remain historical evidence. Requirements and ordered scenarios were relocated unchanged; no runtime qualification is inferred. Earlier meal-planning navigation remains applicable.

| Current capability | Requirements / scenarios |
|---|---:|
| [household-identity](../../openspec/specs/household-identity/spec.md) | 12 / 37 |
| [household-members](../../openspec/specs/household-members/spec.md) | 14 / 35 |
| [member-context](../../openspec/specs/member-context/spec.md) | 16 / 33 |

The complete cross-source block identities and ownership map are recorded in the [archived split ownership map](../../openspec/changes/archive/2026-10-16-split-remaining-broad-capabilities/design.md). The existing source evidence below is preserved, including any older combined-capability counts and exclusions.

## Current lifecycle checkpoint — consolidated, 2026-10-16

This capability's main spec now contains **42 requirements / 105 scenarios**.
All baseline source changes were archived after the user's explicit approval;
there is no active baseline extraction/promotion queue. Historical checkpoint,
next-session and "changes active" text below records earlier sessions only.
Evidence limitations and unresolved findings remain in the [live backlog](backlog/README.md).
See [consolidation completion](backlog/consolidation-completion.md) for accepted
scope, preserved corrections, archive warnings and verification. Archival does not
establish application correctness, runtime qualification or resolution of defects.

## Current checkpoint and scope

Generation coverage reconciled **2026-10-16 (HI-G01 / BSL-026–030)** for the
ordinary-household capability within the supported, explicitly qualified boundary.
Promoted baseline: **42 requirements/105 scenarios**, including the three member-
context and capture-attribution deltas promoted on 2026-10-16. A34 and creation
provenance/qualification caveats remain deferred. No further supported ordinary-
household gap was identified in the generation audit. Promotion documents existing
behavior; implementation acceptance and runtime qualification are separate.
Earlier next-action sections below are historical. Do not regenerate promoted
renaming, removal or Profile switching.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md), then this file.
No other capability plan or full project history is required up front. Follow only
immediate owner/spec dependencies needed for the selected work.

Accepted baseline: [main household-identity specification](../../openspec/specs/household-identity/spec.md).

**Phase-12 reconciliation R12 (2026-10-16):** Recorded promoted documentation remains 42 requirements / 105 scenarios; no additional supported extraction gap was found within this plan's explicit boundary.
[Cross-capability review](reconciliation.md) records current inventory, shared-owner
reconciliation, evidence drift and exclusions. Current main SHA-256: `4c7f5a1faafd5439ab6f261b1efb140a4b0c10643cf16d087874c3c52ee9b749`.
This session grants no new acceptance or promotion. Earlier session-specific
“current user” and next-action statements retain their historical scope. A34 and
all local unresolved/excluded behavior remain in force; runtime checks are not-run.


## Capability map and starting points

| Capability / purpose | Candidate scope and rules to recheck | Source starting point | Existing test starting point | Dependencies / initial confidence |
| --- | --- | --- | --- | --- |
| Household identity: enter the shared household and select an actor | Passphrase/invites, onboarding, member switching, creation/rename, API removal; distinguish access from identity and attribution | [authentication](../../pwa/src/lib/auth.ts), [API handler](../../api/src/RecipeApi/Infrastructure/HearthAuthenticationHandler.cs), [FamilyService](../../api/src/RecipeApi/Services/FamilyService.cs) | [AuthEnforcementTests](../../api/src/RecipeApi.Tests/Integration/AuthEnforcementTests.cs), [identity browser tests](../../pwa/e2e/identity-persistence.spec.ts) | Configuration; foundational to other domains / high |

Shared owners and evidence policy live in [workflow.md](workflow.md). Recheck
these source/test starting points before using them as current evidence.

## Recorded decisions for this capability

Shared A01–A05/A07/A09–A12/A34 decisions are in workflow.md. The records below
retain their original scope; completed stages do not authorize successors.

| ID | Decision | State / authority |
| --- | --- | --- |
| A06 | Create only `baseline-household-identity-existing-member-selection`, documentation-only proposal/spec delta/extraction tasks; stop at validated draft for review | Authorized 2026-10-15 by user “yes.” to the explicit bounded drafting question; optional design only if required; no wider drafting, application changes, acceptance, promotion or archival |
| A13 | Accept the reviewed bounded household-identity spec and create its design document | User instruction 2026-10-15: “I have reviewed and accepted. build the design”; acceptance covers the existing five requirements/ten scenarios, design newly authored for review; no promotion, archival or application implementation authorized |
| A14 | Promote only the accepted household-identity existing-member-selection delta into main specs | User instruction 2026-10-15: “promotion”, following acceptance and design authoring; no archival, wider slice, application implementation or runtime qualification authorized |
| A15 | Archive only the completed household-identity existing-member-selection change, preserving main specs | User instruction 2026-10-15: “i authorize the archiva of this spec”; context identifies the completed change; no successor slice, runtime qualification or application implementation authorized |
| A16 | Discover/review only ordinary-household shared access and update evidence/plan; stop with findings and next focused decision or bounded drafting recommendation | User session instruction 2026-10-15: passphrase → cookie → protected-page/API access → rejection/recovery; no specifications, existing requirement edits, fixes, lifecycle steps or runtime manufacture authorized |
| A17 | Keep U08 absent server token-age enforcement as an acknowledged non-normative limitation; no expiry guarantee or desired retention policy accepted | User “yes” on 2026-10-15 to the shared-access review recommendation; no shared-access drafting, fix or archival reversal authorized. User also asked whether prior archival was appropriate/reversible; review confirms completed change is archived while main spec remains active. |
| A18 | Create and validate only `baseline-household-identity-shared-access`, with proposal, ADDED identity delta, extraction design/tasks and plan/evidence updates; stop for human review | User “execute the next step”, 2026-10-15, following the bounded shared-access drafting recommendation; no application work, existing requirement edits, acceptance, promotion, archival or archive reversal authorized. A17 and U13/U14/U15 limits retained. |
| A19 | Accept the reviewed shared-access spec, seven ADDED requirements/21 scenarios | User “accepted”, 2026-10-15, following presentation of the validated bounded draft. Delta content and A17/U13/U14/U15 limits unchanged; no promotion, archival, application work or runtime qualification authorized. |
| A20 | Promote only the accepted shared-access delta into the main household-identity spec | User “promote it”, 2026-10-15, following A19 acceptance; preserve existing requirements, scope and uncertainty limits. No archival, successor drafting, application work or runtime qualification authorized. |
| A21 | Discover/review only ordinary-household member invite-link creation, opening, validation, cookie/state handoff, navigation and recovery; update evidence/plan | User session instruction 2026-10-15; no drafting, existing requirement edits, fixes, new change, promotion, archival or reopening. U16–U18 recorded without accepting desired behavior. |
| A22 | Keep U16–U18 invite binding/eligibility, partial handoff and redirect/generation/recovery gaps as non-normative limitations | User “yes”, 2026-10-15, to the focused decision following invite discovery. This settles extraction treatment only; no new desired behavior, drafting, fixes, acceptance, promotion, archival or reopening authorized. A17 and U08/U13/U14/U15 limits remain. |
| A23 | Create and validate only `baseline-household-identity-member-invite-link`: proposal, ADDED household-identity delta, extraction design/tasks and plan/evidence updates; stop at a validated draft for review | User “i authorise”, 2026-10-15, following the bounded member invite-link drafting recommendation. A17/A22 exclusions retained; no existing requirement edits, application changes, acceptance, promotion, archival or reopening authorized. |
| A24 | Promote only the reviewed member invite-link delta into main household-identity; six additions/18 scenarios unchanged | User “promote it”, 2026-10-15, after presentation of the validated A23 draft. Direct promotion authorization; no separate acceptance message. Preserve preceding requirements, A17/A22 and all evidence limits. No archival, reopening, successor drafting, application work or runtime qualification authorized. |
| A25 | Archive only the completed promoted shared-access and member invite-link changes, preserving main household-identity | User “you can archive both”, 2026-10-15, immediately after confirmation both are promoted. Scope includes archival link/status/plan updates; no re-sync changes, application work, successor drafting, runtime qualification or reopening prior archive authorized. |
| A26 | Discover/review only ordinary-household member creation from onboarding and Settings through persistence, response/list and selection/navigation handoff; update evidence and durable plan | User session instruction 2026-10-15 in pasted request. No specifications, existing requirement edits, new change, fixes, lifecycle steps, runtime qualification or archive reopening authorized. U19–U21 documented; their extraction treatment remains pending. |
| A27 | Draft only the member-creation proposal, ADDED household-identity delta, design/tasks and plan/evidence; require 201 OpenAPI alignment and future name uniqueness | User 2026-10-15: “OpenAPI must document 201 as is implemented”; “Name Uniqueness MUST be inforced in the new specs so it gets fixed in future work”; “I authorize the member-creation draft”. Explicit desired-behavior exception to pure baseline extraction. Planning only; no current contract/application/client/SQL/test edits, acceptance, promotion or archival. |
| A28 | Trim names and ignore casing for creation uniqueness; reject duplicates with 409 Conflict | User 2026-10-15 selected “Yes, trim and ignore casing (Recommended)” then “409 Conflict (Recommended)” in separate focused questions. Covers draft behavior and future-work planning only; no implementation or data-remediation authorization. |
| A29 | Accept and promote only the member-creation seven-requirement/21-scenario delta into main household-identity | User “approved and promote”, 2026-10-15, following the validated A27/A28 draft. Includes 201 alignment and future trimmed case-insensitive uniqueness/409 intent. Preserve earlier requirements, evidence limits and four incomplete future implementation tasks. No contract/application/client/SQL/test edits, archival or unrelated work authorized. |
| A30 | Apply only member-creation task 2.1 and stop after verification before uniqueness enforcement | User 2026-10-15 explicitly selected task 2.1. Authorizes its 201 contract alignment, generated-client reconciliation, mocks and required tests/verification. No tasks 2.2–2.4, uniqueness/409 implementation, unrelated fixes, archival, commits or staging. |
| A31 | Review phase 0 and one current slice; update this plan and recommend the next bounded action | Current user session instruction, 2026-10-15. Documentation-only discovery/review; no drafting, implementation resumption, runtime qualification, acceptance, promotion, archival or reopening. Prior decisions retained; later artifact/source existence supplies no new authority. |
| A32 | Review member-creation acceptance and archival evidence before selecting another baseline slice; carry quoted limitation into future spec | User 2026-10-15 explicitly selected the recommended review and requested the quoted sentence (BSL-015). Authorizes this evidence/plan update and future non-normative carry-forward. No new draft scope, retroactive implementation/archive approval, task acceptance, runtime qualification, application changes or archive reopening. |
| A33 | Continue bounded member-creation qualification using existing checks | User “keep going”, 2026-10-15, after acceptance review and next qualification recommendation. Covers readiness/existing focused qualification and plan results, not application edits, new tests, archive changes, historical approval reconstruction or another baseline slice. |
| A35 | Audit remaining household-identity requirements; proceed to recipe-library only if none remain | User 2026-10-15: “was there anything left under household-identity ? if not then proceed with recipe-library”. BSL-017 finds rename, API removal and Profile switching coverage outstanding. Conditional library progression not activated; recommend rename discovery next. No drafting/application/runtime/lifecycle authority inferred. |
| A36 | Proceed with bounded ordinary-household member-renaming discovery | User “accepted proceed”, 2026-10-15, in response to BSL-017 recommendation for rename discovery. Source/assertion tracing and durable evidence/plan update only; acceptance of that recommendation does not authorize generation, implementation, runtime qualification, promotion or archival. |
| A37 | Propose only the bounded household-identity member-renaming baseline | User “propose”, 2026-10-15, immediately after the BSL-018 bounded-draft recommendation. Authorizes CLI scaffolding/proposal/ADDED delta/extraction design/tasks and plan. U23/U24 remain non-normative under A12; preserve requested BSL-015 status sentence. Stop at validated draft; no application work, runtime qualification, acceptance, promotion or archival. |
| A38 | Promote the reviewed member-renaming additions and provide a new-session continuation prompt | User 2026-10-15: “promote the specs, then provide me with the continuation prompt for a new session to contiunue with the next item in household-identity. if household-identity is complete move to the next capability”. Direct promotion authority for five additions/12 scenarios only; includes plan/task status updates and handoff. No separate acceptance statement, archival, application work, runtime qualification or next-slice drafting. |
| A39 | Discover/review only household-identity API member removal and update evidence/plan | User session instruction, 2026-10-15. Covers bounded callers/client/contract/controller/service/EF/SQL/read-result trace, assertions/config/docs and plan checks; stop at findings and next drafting decision. No specs, application/test/contract/client/SQL changes, deletes, services, database requests, acceptance/promotion/archive or Profile-switching extraction. |
| A40 | Confirm the limited removal-draft boundary and non-normative U25/U26 treatment | User “yes”, 2026-10-15, to “Should the next draft use that limited boundary, keeping U25/U26 non-normative?” Settles successful authorized API deletion and later list absence as draft candidates; FK effects, undocumented errors and browser cleanup remain evidence/limitations. Covers this plan update, not spec generation, application changes, runtime qualification, promotion or archival. |
| A41 | Draft only the bounded API member-removal baseline | User “draft”, 2026-10-15, after A40 boundary confirmation. Authorizes CLI-scaffolded proposal, two-requirement/two-scenario ADDED delta, extraction design/tasks and plan mapping/checkpoint. U25/U26 remain non-normative and BSL-015 historical note retained. Stop at validated draft for human review; no application/test/contract/client/SQL changes, runtime/database/deletion execution, acceptance, promotion, archival or successor slice. |
| A42 | Review only the API member-removal draft and update evidence/plan | User session instruction, 2026-10-15. Reconcile the agreed boundary, main requirements, unchanged source and actual assertions; record readiness recommendation and bounded checks. No acceptance, promotion, archival, application/test/contract/client/SQL edits, database access, deletion execution, services or successor extraction. |
| A43 | Promote only the reviewed API member-removal delta | User “promote”, 2026-10-15, immediately after BSL-023 review. Direct authority to append the exact two additions/two scenarios to main and update plan/task status. No separate acceptance statement, archival, application/runtime/database work or successor extraction authorized. |
| A44 | Discover/review only the connected Profile-switching slice and update evidence/plan | User session instruction, 2026-10-15. Trace actual control/destination, member selection, cookie/store/navigation and visible result; compare shared main owners and actual assertions. Plan only; no specs, acceptance/promotion/archive, application/test/contract/client/SQL changes, services, mutations or database access. Stop at findings and one bounded drafting decision; U27/U28 treatment not yet confirmed. |
| A45 | Confirm the Profile-switching boundary and draft only that baseline | User “confirm boundary, proceed to draft”, 2026-10-15, after BSL-024 recommendation. Settles U27/U28 as non-normative and authorizes CLI-scaffolded proposal, four ADDED requirements/eight scenarios, extraction design/tasks and plan. Preserve shared owners and BSL-015 sentence/caveat; stop at validated draft for review. No application/test/contract/client/SQL edits, runtime/database work, acceptance, promotion, archival or successor extraction. |
| A46 | Promote only the Profile-switching delta | User “promote it”, 2026-10-15, immediately after the validated A45 draft. Authorizes exact four-requirement/eight-scenario main-spec append and plan/task status updates. No separate acceptance statement, archival, application/runtime/database work or successor extraction authorized. |

## Discrepancies and qualifications

These are implementation-supported/static findings, not runtime guarantees.
Cross-capability entries are included where the selected evidence depends on them.

| ID | Finding / risk | Evidence and required extraction treatment | Status / withheld claim |
| --- | --- | --- | --- |
| U08 | Shared access is not personal identity; token age is not enforced | BSL-household-identity-003–005 rechecks both validators: no date parse, age/future cutoff or persisted session; one-year cookie retention is not server expiry. Household principal has no member/role binding; workflow diagnostics and import AddedBy checks differ. A17 settles token-age extraction treatment as a non-normative limitation; withhold expiry guarantees. Capturer/reporting reconciliation is now recorded in BSL-027/028; import polling asymmetry remains non-normative. | Token-age treatment settled A17; owner reconciliation complete 2026-10-16, underlying limitations retained |
| U10 | Tests may prove substituted behavior only | [API factory](../../api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs) defaults to in-memory storage/DB, mocked orchestration and disabled auth; [browser fixtures](../../pwa/e2e/fixtures.ts) mock API and [Playwright config](../../pwa/playwright.config.ts) blocks service workers. Read assertions, not names; [search tests](../../api/src/RecipeApi.Tests/Integration/RecipeSearchIntegrationTests.cs) retain an exclusion name for demotion assertions. | Open |
| U11 | Runtime/device/deployment qualification is incomplete | [PostgreSQL PDF tests](../../api/src/RecipeApi.Tests/Integration/PdfCapturePostgresTests.cs) require explicit configuration; [PDF flow](../flows/user-flows/pdf-recipe-import.md), [release status](../../README.md), [template](../../release-template/synology/compose.yaml). Device sharing, offline use, NAS rendering/recovery and deployment flag propagation require separate evidence. | Open |
| U13 | Existing-member recovery has contract and qualification limits | BSL-household-identity-001: `/api/family/me` implements 404 absent from OpenAPI; browser mock supplies success without identity; UI does not await all selection writes. Withhold universal persistence/recovery guarantees; no fixes authorized. | Open; rechecked 2026-10-15 |
| U14 | Cookie authentication is incompletely represented in OpenAPI security metadata | BSL-household-identity-004: API accepts `h_access`; root security declares only raw header/Bearer alternatives, stream prose mentions cookie. No contract edit or blanket parity claim authorized. | Open; discovered 2026-10-15 |
| U15 | API rejection and cookie/configuration recovery lack a universal flow | BSL-household-identity-003–005: browser adapter adds no shared credential header/cross-origin credentials override; serverFetch throws, Home logs; no central 401 re-login/clearAuth caller found. Secret agreement, cookie domain/Secure deletion, origin delivery and interrupted retries unobserved. Withhold universal recovery/transport guarantees. | Open; discovered 2026-10-15 |
| U16 | Invite token does not bind the supplied member or establish eligibility | BSL-006/007: HMAC covers timestamp text only; memberId and redirect are unsigned; generator/consumer/cookie setter perform no member lookup. Late page/API resolution is conditional and U13 still applies. Withhold personal authentication, member-bound credential, single-use/persisted invitation and invite-time eligibility claims. | Extraction treatment settled 2026-10-15 (A22): non-normative limitation; behavior/qualification gap remains |
| U17 | Invite handoff and rejection are not atomic | BSL-007/008: first two cookie writes awaited; selectFamilyMember repeats member action without await; onboarding/navigation proceed and outer catch misses later rejection. No rollback or existing-state reset. Withhold universal completion, persistence and clean retry guarantees. | Extraction treatment settled 2026-10-15 (A22): non-normative limitation; behavior/qualification gap remains |
| U18 | Invite redirect and generation/recovery limits | BSL-006–008: nonempty redirect passed to router.replace unchecked; missing configuration leaves dialog generating, rejected generation promise uncaught; error copy mentions expiry although validator has no age check. Withhold safe arbitrary target, expiry and universal recovery claims; A17 unchanged. | Extraction treatment settled 2026-10-15 (A22): non-normative limitation; behavior/qualification gap remains |
| U19 | Creation operation and validation contract diverge (historical; BSL-014 supersedes current status) | BSL-010/012/013 historically recorded 201 alignment under A30; BSL-014 confirms current OpenAPI 201/409 and matching controller branches. Current generated-client parity/live qualification is not-run. OpenAPI length/400 and generated optional/null-name gaps remain non-normative; no complete validation-parity claim. No contract/client/application edits in drafting. | 201/409 present in current source (BSL-014); current runtime/parity not-run; other validation gaps open |
| U20 | Creation failure clears input; Settings omits request error | BSL-009/011: store catches and returns null, form then clears name; onboarding shows store alert but Settings does not render it. Cancel unmounts local state without aborting request. Withhold retained-input and universal retry/error-feedback claims. | Open; retained non-normatively in A27/A28 draft, no fix authorized |
| U21 | Creation and identity handoff are separate; repeated creation is unguarded | BSL-009–012: save precedes append/cookies; callback and later selection promises are unawaited. No rollback, idempotency key or busy guard. A27/A28 explicitly require trimmed case-insensitive uniqueness/409; BSL-014 now traces enforcement in dirty source, without current runtime qualification. Uniqueness does not imply atomic handoff, exactly-once delivery or universal recovery; those limits remain non-normative. | Uniqueness/409 intent settled A27/A28; enforcement now source-supported (BSL-014), runtime unqualified; handoff/retry gaps open |
| U22 | Member-creation lifecycle/completion record diverges from plan and evidence | BSL-014/015: archive exists and tasks 2.1–2.4 are checked; A30 records task 2.1 only and no member-creation archive authority. Existing finish record has database-behavior blocked, excludes service/controller/SQL and archive tasks, and does not evaluate task acceptance. No later authorization established here. BSL-015 confirms 7/21 delta/main equality, stale task-specific hashes, and three broken archive links; user requires quoted limitation in future spec. Preserve artifacts pending later authorization provenance and required qualification. | Deferred under A34; user reports later authorization, original instruction/reference pending; no new archival or verified implementation acceptance; independent requirements discovery may proceed |
| U23 | Rename contract and persistence limits differ | BSL-018: PUT documents only 200, while service/middleware support blank 400/missing 404. DTO/contract omit length bounds; SQL varchar(100) and current unique-name index affect rename without creation-style duplicate translation. No own-name authorization comparison. | Non-normative in A37 draft; validation/duplicate/authorization guarantees withheld; no repairs or database qualification |
| U24 | Rename edit completion obscures failure and pending keyboard paths remain active | BSL-018: store catches failure and resolves; editor closes, Settings omits store error. Input/Enter/Escape remain active while Save/Cancel disable; no guard/cancellation/idempotency. | Non-normative in A37 draft; universal error recovery, retained input, pending lock and atomic cancellation guarantees withheld |
| U25 | Removal errors/security metadata and referenced-member effects exceed the settled API contract | BSL-020: DELETE documents only 204 and member-header security; actual shared-access gate, missing-ID 404 and generic provider 500 differ. EF/SQL declare cascades/nulling, including a SQL-only maintenance requester FK and unconstrained deleted_by. InMemory tests cover unreferenced success/missing UUID only; installed schema unqualified. | Extraction treatment settled A40: non-normative under A12; behavior/qualification gaps remain. No repairs; DB qualification deferred A34, not an extraction gate |
| U26 | Removal helper is disconnected and cleanup/recovery is partial | BSL-021: no UI caller; exact-ID cleanup after API save can fail with stale local state, domain deletion unqualified. Direct API leaves cookies/stores; validator needs nonempty list and does not await clearing. Mock DELETE does not mutate list and mock me returns synthetic success. | Extraction treatment settled A40: non-normative; behavior/qualification gaps remain. Withhold connected deletion journey/atomic or universal recovery guarantees |
| U27 | Profile selection completion and failure/pending paths are not coordinated | BSL-024: Profile does not await selection before completion/Home push; store awaits server cookie, attempts readable fallback, then sets ID. No selection busy flag, caught rejection, rollback, post-selection cancellation or success/error UI. Menu dismissal only precedes selection. | Extraction treatment confirmed A45: non-normative under A12; underlying gaps remain. Withhold atomic handoff, pending lock, retained/rolled-back state and universal recovery guarantees; no repairs |
| U28 | Profile list freshness, recovery and switching qualification are limited | BSL-024: hasLoaded can reuse prior/error list; opening/selection makes no fresh member lookup. Profile omits list-error/empty feedback. Existing gate/recovery limits U13/U26 apply. Tests stub menu or preseed identity; none asserts real Profile option switching. | Extraction treatment confirmed A45: non-normative under A12; underlying gaps remain. No fresh server eligibility, new-identity Home arrival, durable/cross-tab/device synchronization or runtime-qualified switching claim |

## Slice evidence and lifecycle records

## Completed baseline slice — household identity / existing-member selection

Authorized drafting, 2026-10-15. A04–A05 and A09–A12 settle the frame;
A06 authorizes only the named documentation-only change, stopping at a validated
draft for human review. A13 subsequently records human acceptance of that spec and
explicit design authoring authority. A14 subsequently authorizes main-spec promotion
of this accepted delta only. A15 authorizes archival of the completed change.
Runtime qualification and application implementation remain outside current authorization.

| Field | Selected scope / finding |
| --- | --- |
| Domain name | Household identity (approved capability path; bounded slice drafting authorized in A06) |
| Business purpose | Choose the household actor used by subsequent journeys; the guide's no-personal-account description is consistent with separate shared access and member context |
| Implemented capabilities inspected | List existing members, select one at onboarding, retain browser identity, recover current member, display selected name on Profile |
| Important workflow | With household access already established, open onboarding, load members, select an existing name, navigate Home, recover identity on a protected route, display selected member on Profile |
| Business rules | Shared access is separate from member ID; API binder prefers a valid header GUID then cookie GUID; current-member lookup requires an existing record; selection itself writes browser identity rather than a database session |
| Dependencies | Next server actions/cookies, Zustand, Kiota client, shared access configuration, API global authorization/filter, EF family-member data; no workflow enqueue in this slice |
| Exclusions | Passphrase entry/invites, member creation/rename/removal, preferences, cross-device synchronization and complete profile-switch qualification |
| Uncertainty / confidence | Medium overall: executable path traced, but asynchronous selection and recovery edges lack current runtime evidence; U08/U10/U11 remain open |
| Status | Discovery reconciled with listed unknowns; spec accepted 2026-10-15; design newly authored for review; strict validation passed; selected slice promoted to main spec 2026-10-15 (A14); runtime not-run |

### BSL-household-identity-001 — select and recover an existing member

**Actor/entry/outcome:** A person with household access chooses an existing member
from onboarding. The handler sets the identity cookie, calls the store selection,
marks onboarding complete and replaces the route with Home. Profile resolves the
selected ID against loaded members and displays the selected name. This is
**implementation-supported**, medium confidence; no current runtime observation.

**Ordered trace and source anchors:**

1. `pwa/src/app/(auth)/onboarding/page.tsx`, `handleFamilyMemberSelected` and
   load effect → [FamilySelector](../../pwa/src/components/identity/FamilySelector.tsx)
   → [FamilyMemberList](../../pwa/src/components/identity/FamilyMemberList.tsx), name buttons.
2. [useFamily](../../pwa/src/hooks/useFamily.ts) →
   [familyStore](../../pwa/src/store/familyStore.ts), `loadFamilyMembers`,
   `selectFamilyMember`, `loadCurrentIdentity` →
   [family API adapter](../../pwa/src/lib/api/family.ts), `getFamilyMembers` and
   `getCurrentFamilyMember` → [client](../../pwa/src/lib/api/api-client.ts),
   `HearthAuthProvider` injects selected ID as `X-Family-Member-Id`.
3. [OpenAPI](../../specs/openapi.yaml), GET `/api/family` and `/api/family/me` →
   generated [family builder](../../pwa/src/lib/api/generated/api/family/index.ts) and
   [current-member builder](../../pwa/src/lib/api/generated/api/family/me/index.ts),
   response `data` deserialization →
   [FamilyController](../../api/src/RecipeApi/Controllers/FamilyController.cs),
   `GetAll` / `GetMe` → [FamilyService](../../api/src/RecipeApi/Services/FamilyService.cs),
   `GetAllFamilyMembers` orders by name →
   [RecipeDbContext](../../api/src/RecipeApi/Data/RecipeDbContext.cs), `FamilyMembers` →
   [SQL](../../api/database/schema.sql), `family_members`.
4. [Program](../../api/src/RecipeApi/Program.cs) applies shared-access authorization
   and [SuccessWrappingFilter](../../api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs)
   supplies the success `data` envelope. The
   [binder](../../api/src/RecipeApi/Infrastructure/FamilyMemberIdModelBinder.cs)
   resolves header/cookie identity for `GetMe`; this reads records without creating
   a persisted session.
5. [auth server actions](../../pwa/src/lib/auth.ts), `setFamilyMemberCookie` →
   HttpOnly cookie with one-year max age, Lax, root path and configured domain;
   Secure depends on production/test/domain conditions.
   [cookie helper](../../pwa/src/lib/identity/cookie.ts) supplies the readable fallback.
   [IdentityValidator](../../pwa/src/components/identity/IdentityValidator.tsx) attempts
   cookie/server recovery before redirecting to onboarding.
   `pwa/src/app/(app)/profile/page.tsx` →
   [ProfileDropdown](../../pwa/src/components/profile/ProfileDropdown.tsx),
   `selected-member-name`, supplies the visible name.

**Failure/configuration boundaries:** Family-list failures set store error and
`hasLoaded`; onboarding renders an alert. `getCurrentFamilyMember` collapses all
exceptions to null, so unavailable API and absent identity are not distinguished
by recovery. `GetMe` returns 401 for missing/unparseable identity and 404 for an
unknown ID after global access checks. Validator clearing of a missing member
requires a nonempty loaded list; do not claim universal stale-identity rejection.
Onboarding awaits its initial cookie action but does not await the store selection
(which writes the cookie again); profile selection also navigates without awaiting
selection. Successful ordering, error recovery and cookie retention across device
interruptions remain unverified. Cookie domain, HTTPS, test environment and API
base URL affect behavior; no deployed installation was inspected.

**Tests and substitutions inspected:**
[identity-persistence browser tests](../../pwa/e2e/identity-persistence.spec.ts) assert
Alex's visible name across Profile/Home/Profile, a populated Settings family list,
and retained name after a browser-intercepted family-fetch 500. They preseed a
cookie and legacy `family-storage` localStorage; the current store uses cookie
initialization, not Zustand persistence. These assertions do not exercise actual
selection or prove server-side fetch failure. [Fixtures](../../pwa/e2e/fixtures.ts)
inject access, fix browser time, block unhandled API calls;
[mocks](../../pwa/e2e/mock-api.ts) supply members and a successful `/me` even without
an identity cookie; [Playwright config](../../pwa/playwright.config.ts) blocks service
workers. `pwa/src/app/(app)/profile/page.test.tsx` only asserts stub controls with
mocked family hook/router. [FamilyServiceTests](../../api/src/RecipeApi.Tests/Services/FamilyServiceTests.cs)
assert returned membership, not alphabetical ordering, using
[in-memory EF](../../api/src/RecipeApi.Tests/Infrastructure/TestDbContextFactory.cs).
[FamilyControllerTests](../../api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs)
assert list envelope and create/list visibility; this file has no `/me` assertions.
Its [factory](../../api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs)
defaults to disabled auth and in-memory EF with substituted workflow orchestration.
None of these tests was run in this session.

**Agreement/limits:** Success envelope agrees across filter, contract and client.
The [family guide](../user-guide.md) opening journey supports the purpose, but is
secondary evidence. `/me` implementation's unknown-member 404 is absent from its
OpenAPI responses and generated error mapping: **missing/incomplete contract
coverage**, not permission to edit it. Purpose interpretation is consistent with the
approved capability frame; source paths remain **implementation-supported**, not
verified behavior. Personal authentication, guaranteed persistence and complete
recovery remain excluded. Disposition: drafted for supported claims only;
requirement/scenario mapping follows below.

### Phase-0 review recommendation and checks

Recommend repository behavior at the recorded source identity as the baseline
reference, with configuration conditions on individual claims and separate named
deployment qualification. The user confirmed this reference choice on 2026-10-15 (A05). It avoids
turning mock/static evidence into a claim about an unidentified installation.
The user approved the 17 capability paths and shared rule owners on 2026-10-15
(A04), including navigation within affected journeys. This approves the extraction
map, not normative behavior, individual drafts or generation authority.
The loaded mission document still links the deleted navigation spec; record that
stale reference without restoring the capability or editing agent configuration.

Content/environment: branch `moving-to-openspec`, commit
`7e0dcdbe162704debe8a0f916eb1f7327afc77a5`, local macOS workspace on 2026-10-15.
Inspected application/contract/test inputs have no Git changes against HEAD.
Pre-existing README edits, four documentation/navigation deletions and this
untracked plan were present at entry; only this plan is session-owned.

| Check | Outcome / interpretation |
| --- | --- |
| `git status --short`, `git rev-parse HEAD`, `git branch --show-current` | Passed; recorded source and dirty inputs before discovery |
| `openspec --version` | Passed; 1.14.1 |
| `openspec list --json` | Passed; nearest root `/Users/alex/Code/whats-for-supper`, no changes |
| `openspec list --specs --json` | Passed; same root, no main specs |
| `openspec store list --json` | Passed; no registered stores; local `openspec/config.yaml` selects `spec-driven` without a store declaration |
| Bounded source/test/configuration/documentation inspection | Completed static review; behavior remains implementation-supported or qualified above |
| Application/browser/API/PostgreSQL/device checks | Not-run; discovery-only scope, no runtime qualification selected |
| OpenSpec artifact validation | Not-applicable; no spec/change artifacts created |
| `task verify -- docs/openspec-baseline-plan.md` | Passed on review content; rerun after final record/format edits. Final content identity/outcome is in `.task/agent-finish/last-run.json`; checks introduced links and whitespace, not unrelated deletions or application behavior |

**Reference decision settled:** Describe repository behavior at a recorded commit,
per the user on 2026-10-15. Current source remains
`7e0dcdbe162704debe8a0f916eb1f7327afc77a5`; reconcile source identity for each
future slice. This does not establish deployed behavior or runtime verification.

**Structure decision settled:** The user approved the 17 capability paths and shared
rule owners, with navigation within affected journeys and no recreation of the
deleted standalone navigation capability, on 2026-10-15 (A04).

**Profile decision settled:** Extract ordinary-household behavior first; demo,
preview and Synology variants are deferred to separate slices, per the user's
2026-10-15 confirmation (A09). They remain in the eventual extraction map; this is
sequencing, not an assertion about supported deployment behavior.

**Evidence decision settled:** Implementation-supported behavior is sufficient for
initial drafts when backed by traced source and inspected test assertions, with
runtime checks explicitly marked not-run, per the user's 2026-10-15 confirmation
(A10). Runtime qualification remains separate; test-source inspection is not a
passing test. No inferred or disputed normative claim is authorized by this standard.

**Operator/API/workflow scope settled:** The user confirmed “yes and workflows too”
on 2026-10-15 (A11). Include operator/API-only capabilities and workflows in the
eventual baseline, through separate later slices after household journeys. Include
business workflow outcomes within their capability owners and shared orchestration
behavior under background processing; this does not add a new capability path or
authorize a processor-by-processor implementation spec. Trace actual configured
workflow definitions, launch parameters, persisted states and observable outcomes
when their slice is selected. No workflow execution, drafting or application change
is authorized by this inclusion decision.

**Disputed-behavior decision settled:** Per the user's 2026-10-15 confirmation
(A12), keep disputed/incomplete behavior in the evidence and uncertainty register;
withhold normative claims until resolved or explicitly accepted as current behavior.
This does not authorize repairs or settle any individual disputed claim.

**Drafting authorization settled:** On 2026-10-15 the user answered “yes.” to the
explicit request to create `baseline-household-identity-existing-member-selection`
with proposal, spec delta and extraction tasks, then stop at a validated draft for
review (A06). The user subsequently accepted that bounded spec and requested its
design on 2026-10-15 (A13). Main-spec promotion was separately authorized and performed under A14; archival was separately authorized and performed under A15. Application
implementation has not occurred.

### BSL-household-identity-002 — protected entry and recovery boundary

Rechecked at the same commit on 2026-10-15, without application-source changes.
[proxy](../../pwa/src/proxy.ts), `proxy`, checks household access first and redirects
protected full-page requests without a member cookie to onboarding. Thus client
recovery is conditional on reaching [IdentityValidator](../../pwa/src/components/identity/IdentityValidator.tsx);
it is not recovery from a completely absent browser identity on every entry path.
The validator attempts `/me` only when selected state and a readable cookie are
absent. [family API adapter](../../pwa/src/lib/api/family.ts) maps failed/empty recovery
to null; [familyStore](../../pwa/src/store/familyStore.ts), `loadCurrentIdentity`, sets
the returned member ID and adds its profile only when not already listed. An
existing local profile is not refreshed by this recovery method. With no recovered
or concurrently selected member the validator requests onboarding; test mode adds
one 100 ms wait before its final check.

Ordered trace: protected request → proxy access/context gates → client validator →
family adapter/generated `/me` builder → binder/controller/service → persisted
`family_members` read → store selection → Profile name display. Browser API base
URL/cookie delivery and access configuration remain prerequisites. Native member
buttons have named labels and selected-state text; no universal keyboard, device,
localization or accessibility qualification is claimed.

Evidence class: **implementation-supported**, medium confidence. No focused
runtime assertion was executed for either server gate or client recovery. The
inspected browser mock defaults `/me` to successful Alex even without a member
cookie, and the identity test preloads that cookie; neither establishes this
negative/recovery path. Disposition: drafted only with explicit client-entry
preconditions. Check outcome: runtime not-run; static reconciliation completed.
U13 retains disputed and missing contract/device behavior.

### Draft requirement/scenario evidence mapping

Selected delta: [household-identity spec](../../openspec/changes/archive/2026-10-15-baseline-household-identity-existing-member-selection/specs/household-identity/spec.md).
Every row is implementation-supported, not runtime-verified. Test references are
assertion evidence only; absence of focused assertions is explicit.

| Requirement | Scenarios (exact draft names) | Evidence / source anchors | Inspected assertions / limits |
| --- | --- | --- | --- |
| List existing household members for selection | Existing members are available; The household has no members; Member loading fails | BSL-household-identity-001: onboarding load effect/alert, FamilyMemberList controls/empty text, familyStore.loadFamilyMembers, client GET family, FamilyController.GetAll, FamilyService.GetAllFamilyMembers, EF/SQL | FamilyControllerTests.GetAll_Returns_Ok_With_Array; FamilyServiceTests.GetAllFamilyMembers_Returns_All_Members. No focused onboarding empty/failure assertion found in the selected test set; browser fetch-failure test only retains Profile name |
| Select an existing member from onboarding | Successful existing-member selection | BSL-household-identity-001: FamilyMemberList.onSelect → onboarding handler → auth cookie action / familyStore.selectFamilyMember → Home; selection makes no create API call | Identity-persistence tests preseed identity rather than selecting; no focused live selection assertion inspected; both cookie writes must succeed, no ordering/interruption guarantee |
| Resolve the current member through the API | Header identity takes precedence; Cookie supplies the member identity; No parseable member identity is supplied | BSL-household-identity-001: generated `/me` builder and OpenAPI 200/401, FamilyMemberIdModelBinder, FamilyController.GetMe, FamilyService, success wrapping filter, EF/SQL; BSL-household-identity-002 entry limits | No `/me` assertions in inspected FamilyControllerTests; browser `/me` success is substituted. Unknown-member 404 excluded from normative delta because contract omits it |
| Recover identity when the protected client has no selection | Recover a server-readable identity; Recovery yields no member | BSL-household-identity-001/002: proxy, IdentityValidator recovery branch, family adapter null/error mapping, familyStore.loadCurrentIdentity | No focused negative/recovery runtime check; mock accepts absent identity; full-page missing-cookie redirect precedes client recovery |
| Display the selected member on Profile | Display a loaded selected member | BSL-household-identity-001: useFamily case-insensitive ID matching, ProfilePage → ProfileDropdown.selected-member-name | Identity-persistence tests assert Alex visible across navigation; Profile unit test stubs controls; no focused case-variation assertion inspected |

The source review found no normative claim requiring an application change. The
requirements describe only the settled subset; no shared owner from another
capability needs a new placeholder requirement or fabricated reference.

### Artifact and check handoff

Change directory: `openspec/changes/archive/2026-10-15-baseline-household-identity-existing-member-selection/`.
Created: CLI `.openspec.yaml`, `proposal.md`, `specs/household-identity/spec.md`,
`tasks.md`, and now [design.md](../../openspec/changes/archive/2026-10-15-baseline-household-identity-existing-member-selection/design.md).
Main spec created under A14: [household-identity](../../openspec/specs/household-identity/spec.md).
Design was initially omitted under the installed conditional
instruction; A13 explicitly requested it after accepting the bounded spec. That
request supersedes the omission. The design documents existing seams and extraction
decisions without changing the accepted requirements. CLI status now reports all
four planning artifacts complete; file-existence status is not runtime evidence
or authorization to apply application implementation.

| Check / review | Outcome and content/environment scope |
| --- | --- |
| `openspec list --json`, `openspec list --specs --json`, `openspec context --json` before scaffolding | Passed; nearest local root `/Users/alex/Code/whats-for-supper`, no active changes or main specs at entry; no store selected or config changed |
| `openspec new change baseline-household-identity-existing-member-selection` | Passed; CLI scaffold created local metadata using configured `spec-driven` schema |
| Artifact `instructions` and `status` commands | Passed; original conditional design skip superseded by explicit A13 request; design instructions re-read and status now reports 4/4 artifacts complete |
| Selected source/contract/client/test recheck and normative review | Completed static review at commit `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`; inspected application inputs unchanged; five requirements / ten scenarios mapped above |
| `openspec validate baseline-household-identity-existing-member-selection --strict --no-interactive` | Passed on draft; rerun after final task/plan edits; grammar validation is not behavior verification |
| `task verify -- <plan, all five change files, and promoted main spec>` | Passed: documentation and `spec:check` (all-strict OpenSpec validation; promotion run: 1 change and 1 main spec passed, 0 failed). Rerun after final record/task/wording edits; final content identity in `.task/agent-finish/last-run.json`; explicit path set excludes unrelated edits/deletions |
| Runtime browser/API/PostgreSQL/device checks | Not-run under A06/A10; no new runtime evidence |
| Behavior TDD, app lint/type/unit/integration checks, contract/client regeneration | Not-applicable to this documentation-only edit |
| Human acceptance / main-spec promotion / archival | Existing five-requirement/ten-scenario spec accepted by user on 2026-10-15 (A13); newly authored design does not extend spec acceptance / promoted 2026-10-15 (A14) / archived 2026-10-15 (A15) |

All check results refer to the local macOS workspace, branch `moving-to-openspec`,
recorded source commit above and task-owned documentation changes. Final harness
identity captures documentation content; it does not qualify an installation.
No failed or sandbox-blocked required check has been observed.

### Main-spec promotion record — 2026-10-15

A14 authorizes only the accepted delta from
`baseline-household-identity-existing-member-selection`. Used the installed
`openspec-sync-specs` workflow: confirmed the nearest local root and resolved
`planningHome.root`, fetched current specs instructions, selected the sole delta
from `artifactPaths.specs.existingOutputPaths`, and confirmed its main spec absent.
The delta contains only ADDED requirements. Created the main spec with its Purpose
verbatim and all five requirements/ten scenarios unchanged under `## Requirements`;
no delta operation headers or placeholder purpose were promoted.

- Main path: `openspec/specs/household-identity/spec.md`.
- Source delta: `openspec/changes/archive/2026-10-15-baseline-household-identity-existing-member-selection/specs/household-identity/spec.md`.
- Main revision: uncommitted promotion, SHA-256 `7e2b599180366ba2d4c2853d7c03848c15fa9b792aa9e3027757c5d973e2d28b`.
- Evidence mapping: the five rows above now also map to identically named main-spec
  requirements/scenarios; BSL-household-identity-001/002 and U13 remain authoritative
  evidence/limitations. Only this slice is baseline-complete; household identity's
  wider scope remains incomplete.
- `openspec validate --specs`: passed, 1 main spec.
- `openspec validate --all --strict --no-interactive`: passed, 1 change and 1 spec,
  0 failed. Final bounded documentation/spec checks use the seven-path set in the
  harness record. No runtime checks run, no source behavior changed.
- Change was subsequently archived under A15; no commit or application implementation.

### Archive record — 2026-10-15

A15 explicitly authorizes the selected completed change's archival. Installed
archive workflow inputs resolved the local root and `spec-driven` schema. All four
artifacts and all seven tracked tasks were complete. Purpose and every accepted
requirement/scenario matched the promoted main spec before the move; no sync was
needed. Moved the complete directory, including `.openspec.yaml`, to
`openspec/changes/archive/2026-10-15-baseline-household-identity-existing-member-selection/`.
Repaired design source links for the additional directory depth and updated
lifecycle references. The accepted delta and promoted main-spec content were not
changed. Archive status does not establish runtime qualification or new behavior.

Final checks: `openspec list --json` for no active changes;
`openspec validate --all --strict --no-interactive` for the promoted main spec;
explicit archived-delta/main Purpose and requirement/scenario comparison; and
`task verify` over this plan, the five archived files and the main spec. The CLI's
all-validation inventory excludes archived changes, so archived document links and
content are covered by explicit checks, not inferred from the remaining main-spec
validation. Final results/content identity are recorded in the session response
and `.task/agent-finish/last-run.json`. No runtime checks were run.

## Completed baseline slice — household identity / shared access

**Scope/authority:** A16 authorized discovery/review of ordinary-household
passphrase entry → access cookie → protected-page/API access → rejection and
recovery. A17 settled token-age treatment. A18, 2026-10-15, now authorizes only
`baseline-household-identity-shared-access`: proposal, ADDED identity delta,
extraction design/tasks, evidence/plan updates and bounded validation, stopping at
a draft for human review. No existing requirement edit, promotion, archival, fix
or runtime exercise is authorized. A19 subsequently records acceptance of the
seven-requirement/21-scenario delta without changing its content. A20 then
authorizes its main-spec promotion only. Demo, preview,
Synology, invites/join and operator workflows remain separate slices. Existing
member selection and `/api/family/me` rules remain owned by the accepted
[identity spec](../../openspec/specs/household-identity/spec.md); this review describes
only where shared access hands off to those rules.

| Field | Discovery result |
| --- | --- |
| Purpose / actor | A household visitor supplies the family's shared passphrase to enter the app; it establishes household access before member selection. Purpose interpretation is inferred from Welcome copy and [family guide](../user-guide.md), aligned with approved ownership. |
| Implemented workflows | Welcome submission and retry; signed access-cookie storage; PWA access gate then member-context gate; browser same-origin and Home server-fetch API access; independent API challenge. BSL-household-identity-003/004/005 below. |
| Rules / dependencies | PWA and API `HEARTH_SECRET` must agree; browser cookie delivery depends on origin/domain/HTTPS; API URL and routing differ between browser and server; no authentication DB/session write in the traced path. |
| Evidence identity | Branch `moving-to-openspec`, commit `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`, 2026-10-15. Traced source/contract/tests have no local edits. Plan and existing identity main/archive artifacts were already untracked; unrelated README edit and four deletions preserved, including background-task-navigation. |
| Confidence / qualification | High for directly visible action/validator/gate branches; medium end to end because cookie transport, configuration and recovery assertions are incomplete. No runtime-verified shared-access claims. |
| Artifact status | Shared-access spec accepted A19, promoted A20 and archived A25 on 2026-10-15. Seven requirements/21 scenarios remain in main; total identity now 18 requirements/49 scenarios. Archive metadata/delta preserved; prior existing-member-selection archive unchanged. Runtime not-run; evidence limits retained. |
| Discovery/store resolution | `openspec list --json` and `openspec list --specs --json` both exited 0: root path `/Users/alex/Code/whats-for-supper`, source `nearest`; local `openspec/`, no declared external store in config. At discovery changes were empty; only `household-identity`, five requirements. Full `openspec show household-identity --type spec` inspected. A18 rechecked root/context/inventory, then CLI-scaffolded the selected shared-access change; no initialization/reconfiguration. |

### BSL-household-identity-003 — passphrase entry and access-cookie state

**Entry/outcome and ordered trace:**

1. `pwa/src/app/(auth)/welcome/page.tsx`, `WelcomePage.handleSubmit`: blank/whitespace
   input disables Enter; pending submission displays Checking and disables Enter.
   Submit clears the previous error and invokes the Next server action
   [authenticateWithPassphrase](../../pwa/src/lib/auth.ts). This is a Next server-action
   boundary, not a generated Kiota/OpenAPI login operation or API service call.
2. The action reads server `HEARTH_SECRET`; missing/empty configuration returns
   `{ success: false }`. Comparison trims both passphrase and configured secret
   and is case-sensitive. Successful comparison calls
   [generateSecretToken](../../pwa/src/lib/auth-utils.ts), signing `Date.now()` text
   with HMAC-SHA256 using the original, untrimmed configured secret, returning
   `<timestamp>.<base64url signature>`. No member ID or role is signed.
3. Welcome awaits [setHearthCookie](../../pwa/src/lib/auth.ts) with that token before
   requesting `router.replace('/onboarding')`. The setter stores the supplied
   value without revalidation: HttpOnly `h_access`, one-year `maxAge` (31,536,000
   seconds), Lax, path `/`, optional `NEXT_PUBLIC_COOKIE_DOMAIN`. Secure is enabled
   only for production, non-test environment and a domain not containing
   `localhost`. This records source options, not observed browser retention.
4. Persistence is browser cookie state; the traced authentication actions create
   no family member, personal account, database session or workflow. Member
   selection starts at onboarding under the already accepted identity rules.

**Failure/retry:** A false result (wrong input or absent secret) shows the localized
incorrect-passphrase message, suggesting asking a family member. Action/cookie
exceptions show the generic retry message. `finally` clears pending; the input is
retained and can be edited/resubmitted. The ordinary-household health request on
mount is convenience-only; a failure is caught and does not disable the form.
See locale keys `auth.errorIncorrectPassphrase` and `auth.errorGeneric` in
[pwa English copy](../../pwa/src/locales/en/common.json) and
[French copy](../../pwa/src/locales/fr/common.json). No return-to-original-path logic
is implemented by this submission; success requests onboarding.

**Assertions/substitutions:** [auth-flow.spec.ts](../../pwa/e2e/auth-flow.spec.ts),
`user can log in with passphrase`, clears the fixture-injected cookies, fills the
configured/test-default passphrase, clicks Enter, and asserts the onboarding URL.
It does not inspect Set-Cookie attributes or exercise the real API auth handler.
`pwa/src/app/(auth)/welcome/page.test.tsx` mocks router,
health, authentication and cookie actions; its ordinary checks assert branding,
empty input and disabled Enter, with no submit/error/retry assertions. Its demo
assertion is outside this slice. [fixtures](../../pwa/e2e/fixtures.ts) mock health and
return 403 for unhandled browser API calls. [Playwright config](../../pwa/playwright.config.ts)
uses a test secret/test cookie environment and blocks service workers. Thus test
source supports only the named observations, not real cookie/API integration.

**Evidence/classification:** Implementation-supported, high for direct branches,
medium for browser handoff. No login OpenAPI contract to reconcile because this
is a PWA server action. Tests inspected, not executed; browser/API/device checks
**not-run** by scope. No runtime-verified claim. Disposition: drafted supported observations only under
A18; requirement/scenario mapping below.

### BSL-household-identity-004 — separate page and API access gates

**Ordered trace and observable boundaries:**

1. [proxy.ts](../../pwa/src/proxy.ts), `proxy`: before page access, `/_next*`,
   `/favicon*` and paths containing `.` bypass both gates. `/welcome`, `/invite`,
   `/join`, `/api` and their descendants bypass the access gate. Other paths,
   including `/onboarding`, require a configured secret and an `h_access` value
   accepted by [validateSecretToken](../../pwa/src/lib/auth-utils.ts). Missing or
   invalid access redirects to Welcome; a present rejected cookie is deleted
   through the response cookie API. These exclusions preclude a claim that every
   PWA URL is access-protected.
2. With access accepted, the separate context gate exempts those public paths
   plus onboarding. Other paths require a nonempty `x-family-member-id` cookie,
   otherwise redirect to onboarding. It does not parse/lookup the member here.
   A member cookie alone cannot pass the preceding access gate. Further member
   recovery belongs to BSL-household-identity-001/002 and the accepted spec.
3. Browser API requests use [api-client.ts](../../pwa/src/lib/api/api-client.ts),
   generated endpoint builder → Kiota `FetchRequestAdapter` with
   `HearthAuthProvider` → fetch → API. The provider adds member/SSE/move headers, no household secret or
   Bearer header; it cannot read the HttpOnly access cookie. Default empty
   `NEXT_PUBLIC_API_BASE_URL` uses same-origin `/api` requests and browser cookie
   transport. Installed Kiota `getRequestFromRequestInformation` creates method,
   headers and body without a credentials override and its browser middleware
   forwards to fetch. Inspected local dependency anchors are
   `pwa/node_modules/@microsoft/kiota-http-fetchlibrary/dist/es/src/fetchRequestAdapter.js`
   and its `middlewares/browser/middlewareFactory.js` / `customFetchHandler.js`
   (installed dependency evidence, not a committed-source guarantee).
   Cross-origin authenticated delivery is therefore not an
   established capability; no deployed network/browser observation was made.
4. Home server entry (`pwa/src/app/(app)/home/page.tsx`, `HomePage`) instead uses
   [serverFetch](../../pwa/src/lib/api/server-client.ts) for `/api/family` and schedule.
   It reads Next cookies, forwards `h_access` explicitly in Cookie and member ID
   as `X-Family-Member-Id`, calls `API_INTERNAL_URL + endpoint`, throws on non-OK,
   and unwraps `data`. The default internal URL is from
   [config.ts](../../pwa/src/lib/constants/config.ts). No PWA API-auth proxy is
   implemented by this wrapper.
5. [Program.cs](../../api/src/RecipeApi/Program.cs) registers Hearth authentication,
   middleware and a global controller `AuthorizeFilter(RequireAuthenticatedUser)`.
   [HearthAuthenticationHandler](../../api/src/RecipeApi/Infrastructure/HearthAuthenticationHandler.cs),
   `HandleAuthenticateAsync`, independently tries an exact raw `X-Hearth-Secret`,
   then a case-insensitive Bearer scheme with valid HMAC token, then `h_access`.
   Failure of an earlier credential can fall through to a valid later one.
   Missing/empty configured secret fails authentication. Protected controller
   challenges yield 401, not the PWA's Welcome redirect. Health is explicitly
   `[AllowAnonymous]` in [HealthController](../../api/src/RecipeApi/Controllers/HealthController.cs).
6. Success creates a `HearthFamily` principal plus `auth_method` claim, without
   member or role claims and without a DB session. It authenticates shared access;
   endpoint member binding/eligibility remains separate. The source-only
   [apps.yml](../../docker/compose/apps.yml) provides the same secret variable to PWA
   and API and routes same-origin `/api` to the API. It proves neither effective
   installed values nor network/cookie delivery.

**Contract agreement/mismatch:** [OpenAPI](../../specs/openapi.yaml), root `security`
uses alternative `HearthSecret` header and `HearthToken` Bearer schemes; those agree
with implemented alternatives. There is no `h_access` cookie security scheme,
although `/api/stream` prose mentions it. Health explicitly declares `security: []`.
`FamilyMemberId` describes attribution/context and is not proof of household
access. Cookie authentication is implemented but incompletely represented by
contract security metadata (U14); do not change the contract or assert full parity.

**Assertions/substitutions:** [AuthEnforcementTests](../../api/src/RecipeApi.Tests/Integration/AuthEnforcementTests.cs)
asserts 401 for missing credentials and wrong raw header on recipe description,
200 for correct raw header plus member ID, and 200 for anonymous health. Its
[factory](../../api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs),
`CreateWithAuthAsync`, enables the real handler/filter but constructs a separate
TestServer host rather than running Program; it supplies a test secret, in-memory
EF/recipe store and substituted workflow/AI services. Default business-test hosts
disable auth. There are no cookie/Bearer assertions in that auth test file; targeted
API test search found none elsewhere. [server-client.test.ts](../../pwa/src/lib/api/server-client.test.ts)
mocks absent cookies and successful fetch; assertions check URL concatenation,
not authentication forwarding or rejection. Browser mocks cannot establish API
acceptance. Evidence: implementation-supported, high for handler/filter branches,
medium for complete configured request path. Runtime tests **not-run**; no current
passing API assertion claimed. Disposition: supported header/Bearer and separate
gate observations drafted under A18; API cookie acceptance/full parity withheld.

### BSL-household-identity-005 — rejection, recovery and token-age limits

**Rejection/recovery trace:** The proxy's failed access gate redirects to Welcome
and requests deletion of a present rejected `h_access`; it leaves the separate
member cookie untouched. A subsequent correct passphrase submission obtains a
new access cookie and requests onboarding (BSL-003). It does not preserve a return
pathname for the login action. Wrong passphrase and transient action errors can
be retried in-place, as traced above. These branches are implemented; cookie
clearing with optional domain and interrupted navigation remain unobserved.

The API handler independently rejects invalid/missing credentials. Neither the
PWA `HearthAuthProvider` nor `serverFetch` calls `clearAuth` or navigates to Welcome
on 401. `serverFetch` throws; `HomePage` catches/logs failed initial requests and
continues rendering with missing initial data. A targeted search of PWA source
found only the definition of `clearAuth`, no caller. A later proxy-gated page
request with missing/invalid access can re-enter Welcome, but this is not a
universal client-side recovery path. In particular, PWA/API secret disagreement
can let a page through while API calls fail. Do not promise automatic re-login
for every API 401 or successful recovery from configuration disagreement (U15).

**Actual time handling / U08 recheck:** PWA generation signs current millisecond
time as text. PWA `validateSecretToken` requires exactly two dot-separated parts,
base64url-decodes the signature, and verifies HMAC over the first part. API
`ValidateHmacToken` also requires two parts, recomputes the base64url HMAC of the
first part and compares its encoded text. Neither parses that part as a date,
checks its age, rejects a future timestamp by time, or consults session expiry.
Consequently a correctly signed old/future/non-date first part is not rejected
for its age/meaning by those paths: this is source-supported, not a runtime test
or an accepted normative retention policy. Browser cookie `maxAge` controls
browser retention only. A removed/expired browser cookie causes missing-access
rejection, but a retained/replayed signed token has no implemented age cutoff.
Changing the configured secret invalidates old signatures at the corresponding
gate; there is no traced per-token revocation/session store. A17 settles its extraction treatment as a non-normative limitation; U08 remains
open for the deferred identity/reporting boundary, and no one-year server-expiry
claim is supported.

**Shared access versus personal identity:** The principal has no member/role
binding; selecting a member is a distinct context operation. Rechecked the two
U08 boundary examples without expanding their baseline slices:
[WorkflowController](../../api/src/RecipeApi/Controllers/WorkflowController.cs),
`GetInstance`/`GetTaskDiagnostics`, has no additional member/role gate beyond global
household access; [RecipeImportService](../../api/src/RecipeApi/Services/RecipeImportService.cs),
`GetImportByIdAsync`, separately requires an existing member and matching recipe
`AddedBy`. Capturer-only import details versus household reporting remain deferred
and unreconciled. Neither example justifies a universal personal-role model or a
universal same-access-to-all-data claim.

**Assertions / limits:** [auth-flow.spec.ts](../../pwa/e2e/auth-flow.spec.ts),
`unauthenticated user is redirected to /welcome`, clears seeded cookies and checks
the Welcome URL. Its login test checks onboarding navigation only. Neither it
nor the inspected Welcome unit/API auth tests asserts incorrect-passphrase UI,
action/cookie failure retry, invalid-cookie deletion, API-401 recovery, old/future
or malformed token behavior. Targeted auth/proxy test discovery found no dedicated
PWA validator/proxy unit tests. No tests or services were run to fill these gaps.
Evidence: implementation-supported for explicit branches; end-to-end recovery
**missing/incomplete**, medium confidence. Runtime/browser/device/token checks
**not-run** by scope; none runtime-verified. Disposition: supported rejection/retry
observations drafted under A18; disputed expiry/parity/recovery guarantees withheld.

### Shared-access draft requirement/scenario evidence mapping

Delta: [shared-access identity spec](../../openspec/changes/archive/2026-10-15-baseline-household-identity-shared-access/specs/household-identity/spec.md).
Seven ADDED requirements, 21 scenarios; no MODIFIED/REMOVED operations. Under A20
these additions are now in the main spec alongside the unchanged five existing
requirements/ten scenarios, for a total of 12 requirements/31 scenarios. All mapped behavior is
implementation-supported; inspected assertions are source evidence, not current
passing runtime checks. Missing focused assertions do not become runtime evidence.

| Draft requirement | Scenarios | Evidence / source anchors | Assertion coverage and limits |
| --- | --- | --- | --- |
| Enter the household with its shared passphrase | Matching passphrase establishes access; Surrounding whitespace is ignored | BSL-003: Welcome.handleSubmit → authenticateWithPassphrase → generateSecretToken → awaited setHearthCookie → onboarding | auth-flow login asserts onboarding URL; no whitespace or full cookie/API integration assertion inspected |
| Give passphrase submission feedback and allow retry | Empty input cannot be submitted through Enter; Submission is pending; Incorrect passphrase can be corrected; Missing secret produces rejection feedback; Submission exception permits another attempt | BSL-003/005: Welcome input/disabled button/pending/error/finally, auth action missing-secret/trim comparison, locale error messages | Welcome unit tests mock actions/router and assert initial disabled control; submit/error/retry branches source-supported without focused assertions |
| Set household access-cookie options | Access cookie is written with configured scope; Production secure-cookie conditions apply; Secure-cookie conditions do not apply | BSL-003: setHearthCookie maxAge, HttpOnly, Lax, root path, optional domain, production/test/localhost Secure expression | No inspected response-cookie-option or deployed retention assertion; options only, no server expiry guarantee |
| Gate protected page entry with household access | Access is missing despite a member selection; Access cookie is rejected; Page gate has no secret configured; Valid access reaches onboarding | BSL-004/005: proxy access-before-context branch, validateSecretToken, redirect and response cookie deletion | auth-flow checks absent-access redirect and login reaches onboarding; invalid-cookie/missing-config/deletion branches lack focused assertions; deletion request is not universal browser-removal qualification |
| Apply member context after household access | Access is accepted but member context is absent; Both page-gate inputs are present | BSL-004: proxy context gate requires nonempty cookie only; BSL-001/002 and existing accepted identity requirements own subsequent member resolution | No focused context-gate assertion inspected; no member-existence guarantee at the proxy, no duplicate member-selection/recovery rules |
| Authenticate protected API requests independently | Raw household secret satisfies API authentication; Signed Bearer token satisfies API authentication; Protected API request has no household credentials; Raw secret is rejected | BSL-004/005: Program global AuthorizeFilter/auth middleware → HearthAuthenticationHandler, OpenAPI HearthSecret/HearthToken alternatives | AuthEnforcementTests asserts raw-header success with member and missing/wrong-header 401; factory is separate TestServer/in-memory/substituted services; Bearer has no focused inspected assertion, API cookie acceptance withheld under U14 |
| Exempt health from household authentication | Health is requested without access | BSL-004: HealthController AllowAnonymous and OpenAPI health security empty | AuthEnforcementTests asserts anonymous health 200 on substituted host; requirement promises authentication exemption only, not healthy backing services |

### Shared-access draft artifact and check handoff

**Treatment settled (A17):** Absent server-side token-age enforcement remains an
acknowledged limitation outside normative claims, not an accepted desired
retention policy. U14/U15 and the remaining identity/reporting boundary stay open.
No claim of API cookie-contract parity, cross-origin delivery, server expiry,
guaranteed persistence or universal API-401 recovery is drafted.

A18 responds to the user's “execute the next step” after the bounded drafting
recommendation and clarification that this is a documentation-only extraction.
It authorizes the selected draft, not acceptance, main-spec promotion, archival,
application implementation or reopening the prior archive. A19 subsequently
records the user's “accepted” for the presented seven requirements/21 scenarios;
the delta remains unchanged. A20 subsequently authorizes its promotion to main
specs without archival.

| Artifact / status | Path or result |
| --- | --- |
| CLI metadata / created | `openspec/changes/archive/2026-10-15-baseline-household-identity-shared-access/.openspec.yaml`, default `spec-driven` schema |
| Proposal / drafted | [proposal](../../openspec/changes/archive/2026-10-15-baseline-household-identity-shared-access/proposal.md) |
| Delta / accepted A19, promoted A20 on 2026-10-15 | [identity delta](../../openspec/changes/archive/2026-10-15-baseline-household-identity-shared-access/specs/household-identity/spec.md), seven requirements/21 scenarios |
| Extraction design / drafted | [design](../../openspec/changes/archive/2026-10-15-baseline-household-identity-shared-access/design.md); security complexity across existing seams warrants the conditional design; no new architecture |
| Extraction tasks / tracked | [tasks](../../openspec/changes/archive/2026-10-15-baseline-household-identity-shared-access/tasks.md); documentation work only, task completion does not accept the draft |
| Strict grammar validation / passed | `openspec validate baseline-household-identity-shared-access --strict --no-interactive`, exit 0 |
| Final bounded documentation checks / passed | Six-path command in tasks; documentation and all-strict OpenSpec checks passed (2 items, 0 failed). Final rerun after task/evidence finalization records content identity in the response and `.task/agent-finish/last-run.json`; later edits require fresh verification. |
| Runtime checks / not-run | API, browser, PostgreSQL, token experiments, device and deployment qualification excluded from this session |
| Application-change checks / not-applicable | Behavior TDD, application test execution, client generation and contract changes do not apply to these documentation edits |

Next action: separately authorize archival of the completed shared-access change,
or select another bounded discovery slice. Existing member-selection blocks and
this delta are unchanged; promotion does not authorize archival or application work.

### Shared-access main-spec promotion record — 2026-10-15

A20 authorizes only promotion of the accepted shared-access delta. The installed
sync-specs workflow resolved `planningHome.root` to this repository, selected the
sole delta from `artifactPaths.specs.existingOutputPaths`, and fetched the current
specs rules once before the main-spec write. No OpenSpec initialization or store
reconfiguration occurred.

- Main spec: [household identity](../../openspec/specs/household-identity/spec.md),
  12 requirements/31 scenarios. Uncommitted revision SHA-256: `27af7f1e79c2c11c394920e28edb8ebf6c78977650ce59727ed65022690c0def`.
- Added all seven shared-access requirements/21 scenarios verbatim, preserving all
  five existing requirements/ten scenarios, title and Purpose verbatim.
- Retained the accepted page-gate scope paragraph under the main Requirements
  heading. Main spec contains one Requirements section and no delta operation headers.
- BSL-household-identity-003/004/005 mapping now also identifies the identically
  named promoted requirements. A17's token-age treatment and U08/U13/U14/U15
  uncertainties are unchanged; only the selected slice is baseline-complete.
- `openspec validate --specs`: passed, exit 0, one main spec. Final three-path
  documentation/all-strict checks and content identity are reported in the session
  response and `.task/agent-finish/last-run.json` for the finalized files.
- Shared-access change remains active, with its accepted delta unchanged. No
  archival, commit, runtime qualification or application implementation performed.

## Completed baseline slice — household identity / member invite link

Discovery/review A21 and limitation treatment A22 completed; A23 authorizes the
bounded draft, followed by direct user promotion instruction A24 on 2026-10-15.
Source identity: branch
`moving-to-openspec`, commit `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`.
Relevant application sources are unchanged from that commit; the pre-existing
untracked plan/spec/change artifacts and unrelated README edit/document deletions
are retained, including the deleted background-task-navigation spec.

| Field | Finding / status |
| --- | --- |
| Purpose / actor | Let someone with household access share a link that supplies household access and a requested existing member context on another browser. This purpose is inferred from the connected Settings labels and route; it is not personal authentication. |
| Selected workflow | Settings member Invite → link generation → Copy/native Share → recipient `/invite` → validation → access/member cookie actions → family/onboarding state → requested navigation and subsequent identity resolution. |
| Evidence | BSL-household-identity-006/007/008 below; implementation-supported, medium overall confidence, no runtime-verified claims. |
| Existing coverage to reuse | The preceding 12 requirements/31 scenarios cover shared access, page gates, member lookup/recovery and selected-name display. A24 adds only six invite requirements/18 scenarios; main now totals 18/49. Shared rules are referenced without duplication. |
| Artifact state | A23 draft validated, six additions/18 scenarios promoted A24 and archived A25 on 2026-10-15. Main unchanged at 18 requirements/49 scenarios; invite delta/metadata preserved. All three completed identity changes are archived; no active changes. Direct promotion instruction is the recorded authorization, with no separate acceptance message. |
| Root / discovery | `openspec store list --json`: no stores. `openspec list --json` and `openspec list --specs --json`: nearest root `/Users/alex/Code/whats-for-supper`, one active shared-access change, one main identity capability with 12 requirements. Config has no store declaration. Full main spec and shared-access status inspected; 4/4 artifacts and 5/5 tasks complete. No initialization/reconfiguration. |
| Dependencies | PWA server actions/Web Crypto and HEARTH_SECRET; Next cookies/router; Zustand family state and persisted onboarding flag; browser clipboard/share APIs; configured cookie domain/environment; existing page/API access and member lookup boundaries. No invitation persistence/service/workflow found in this trace. |
| Exclusions | Voting-link generation/journey, member creation/rename/removal, broader operator authorization, demo/preview/Synology variants, deployed transport/device qualification. Shared redirect branch inspected only to bound this workflow. |
| Decision / next action | A24 promotion and A25 archival complete. A17/A22 retain expiry, binding, partial-handoff and recovery limitations non-normatively. Select another bounded discovery slice; no automatic successor drafting or application work. |

### BSL-household-identity-006 — connected generation and sharing surface

**Trace and implemented behavior:** Settings at `/profile/settings` renders
`SettingsPageContent` → [FamilyManagement](../../pwa/src/components/profile/FamilyManagement.tsx)
→ [FamilySelector](../../pwa/src/components/identity/FamilySelector.tsx) →
[FamilyMemberList](../../pwa/src/components/identity/FamilyMemberList.tsx).
The member row's Invite button stops propagation and passes that row's ID/name
through `onInvite`, opening [InviteLinkDialog](../../pwa/src/components/common/InviteLinkDialog.tsx).
This is a connected household UI caller, not an action-only capability. It does
not select the row by clicking Invite; the dialog title is `Invite {memberName}`,
while the share text says that member invited the recipient (ambiguous role copy,
not evidence that the link authenticates that person).

Dialog mount/member-ID change calls [getInviteLink](../../pwa/src/lib/auth.ts)
with `window.location.origin` and the target ID. The action checks only that
`HEARTH_SECRET` is nonempty, then returns
`{baseUrl}/invite?secret={encoded token}&memberId={encoded ID}`. It performs no
member lookup, ID parsing, role/eligibility check or persisted invitation creation.
The action accepts its supplied base URL; the connected UI supplies the origin.
The action itself has no explicit current-access-cookie check; the Settings page
is gated through the already documented access/context rules. Do not infer a
separate issuer-permission policy from the page gate.

[generateSecretToken](../../pwa/src/lib/auth-utils.ts) signs only `Date.now()` text
using HMAC-SHA256 with HEARTH_SECRET. Neither member ID, name, redirect nor recipient
is in the signature. Generation/consumption has no traced single-use record,
redemption transaction or age enforcement. A17 remains non-normative; token
format and one-year cookie options do not establish expiry or personal identity.

The dialog displays `Generating link…` until a nonempty result, disables Copy
and Share without a link, and offers Share only when `navigator.share` exists.
Copy awaits `navigator.clipboard.writeText`, displays `Link copied!` for two
seconds, and silently catches failure. Share supplies title/text/URL and silently
catches cancellation/failure. Close button and overlay dismiss the dialog.
Missing server secret returns an empty string, leaving generation text and disabled
controls; a rejected generation promise has no catch or visible error/retry here.
Closing/reopening remounts the generation effect; successful recovery is unverified.
No browser share delivery or clipboard permissions were observed.

**Classification/tests:** Implementation-supported, high for the connected call
and local branches, medium for successful browser handoff. Settings assertions and
substitutions are recorded in BSL-008. Disposition: discovery candidate for supported
generation/copy/dismiss behavior; failure recovery and signed member binding are
not positive capabilities. Supported observations drafted under A23; runtime not-run.

### BSL-household-identity-007 — consumption, writes and member-context handoff

**Ordered trace:** `pwa/src/app/(auth)/invite/page.tsx`, `InvitePage`, reads first
`secret`, `memberId` and `redirect` values with `searchParams.get`. Missing/empty
redirect defaults to `/home`; otherwise its supplied text goes directly to
`router.replace` without an allowlist, origin/path check or signature binding.
The normal member-link generator does not supply a redirect. Do not promise safe
arbitrary redirects, external navigation outcomes or universal arrival at Home.
The [proxy](../../pwa/src/proxy.ts) exempts invite from both gates; the root layout's
[IdentityValidator](../../pwa/src/components/identity/IdentityValidator.tsx) also
allows the invite page even with an existing selected member.

1. Nonempty secret → await `validateHearthSecret` (Next server action) →
   `validateSecretToken`. Missing configuration/secret rejects; malformed token,
   invalid signature/base64 or crypto error returns false. Validation splits into
   two parts and checks HMAC over the first part; it does not parse a date, test
   age/future time, or bind the query member/redirect. There is no invite OpenAPI
   endpoint in this flow.
2. On true, await `setHearthCookie(secret)`. If memberId is truthy, await
   `setFamilyMemberCookie(memberId)` next. Both setters use the previously traced
   one-year, HttpOnly, Lax, root-path and conditional domain/Secure options.
   Neither setter validates its value or checks membership.
3. With memberId, call `useFamily().selectFamilyMember(memberId)` **without await**.
   [familyStore](../../pwa/src/store/familyStore.ts) awaits a second member-cookie
   action before calling the readable-cookie fallback and changing selected state.
   The invite immediately calls `completeOnboarding` and then `router.replace`.
   [onboardingStore](../../pwa/src/store/onboardingStore.ts) persists its completion
   flag in `onboarding-storage`; repository search finds no read of that flag
   that overrides these page/identity gates. Completion does not prove membership.
4. Navigation is requested after the first access/member actions resolve, but
   before the second action/store-selection promise is known to have resolved.
   There is no transaction, rollback, cancellation or effect-run guard. The outer
   catch does not catch a later rejection of this unawaited selection promise.
   Store update, fallback cookie write and arrival ordering remain unobserved.

**Absent/malformed/unknown member and existing state:** Missing or empty memberId
skips all member/onboarding writes and still requests the chosen destination after
access-cookie success. Existing member cookie, selection and onboarding flag are
left as-is in that branch. Truthy whitespace, malformed or unknown IDs are passed
through; there is no invite-time existence/eligibility check. With an existing
selection, a truthy supplied ID requests replacement, with a window where old store
state can coexist with new cookies. Valid-token processing overwrites access;
rejected/missing-token processing does not clear pre-existing access/member state.

**Subsequent observable boundary (reuse BSL-001/002/004):** Default Home entry
passes the proxy if access validates and member cookie is merely nonempty. No
member cookie redirects to onboarding; a malformed/unknown nonempty value passes
this gate. `pwa/src/app/(app)/home/page.tsx` calls
[serverFetch](../../pwa/src/lib/api/server-client.ts) → `/api/family` (plus schedule),
forwarding access cookie and member header; it logs fetch failure and may omit
StoreInitializer. [StoreInitializer](../../pwa/src/components/common/StoreInitializer.tsx)
seeds returned family list/hasLoaded, not selected identity. Client validation
with no selection recovers a readable cookie or calls `loadCurrentIdentity` →
[family API adapter](../../pwa/src/lib/api/family.ts) → generated
[GET me builder](../../pwa/src/lib/api/generated/api/family/me/index.ts) →
[OpenAPI](../../specs/openapi.yaml), `/api/family/me` →
[FamilyController.GetMe](../../api/src/RecipeApi/Controllers/FamilyController.cs) →
[FamilyMemberIdModelBinder](../../api/src/RecipeApi/Infrastructure/FamilyMemberIdModelBinder.cs)
(header parseable GUID first, then cookie) →
[FamilyService.GetAllFamilyMembers](../../api/src/RecipeApi/Services/FamilyService.cs)
→ EF `FamilyMembers` read. API shared access is independent (U14/U15 retained).
No parseable identity yields 401; unknown parsed ID yields implemented 404, omitted
from OpenAPI/generated error mapping (U13). Adapter errors become null and recovery
without selection requests onboarding. With selection, validator checks loaded
membership case-insensitively, clears/redirects only when `hasLoaded`, no match and
a nonempty list. Empty/failed/unloaded lists do not establish universal rejection.
Identity clearing is itself unawaited. Thus late lookup is not an invite-time
eligibility guarantee, and no final outcome for every malformed/stale/racing ID
is established. Normal existing-member selection at onboarding remains BSL-001.

**Classification:** Implementation-supported, high for explicit action order and
query handling, medium for eventual member resolution; partial/racing completion
is missing/incomplete qualification (U13/U16/U17/U18). No runtime-verified result.
Disposition: supported observations drafted under A23; withhold atomic handoff, member-bound credential,
validated-target and universal persistence/recovery claims.

### BSL-household-identity-008 — rejection, Welcome recovery and assertion limits

**Visible route behavior:** Missing/empty secret schedules error state with a
zero-delay timeout without actions. A false validator result or an exception from
awaited validation/access-cookie/first member-cookie actions shows the same
`Invalid invite link` screen and `/welcome` anchor. During processing it displays
`Joining your family...`. The [English](../../pwa/src/locales/en/common.json) and
[French](../../pwa/src/locales/fr/common.json) error descriptions refer to possible
expiry/tampering. Signature tampering can reject; age alone is not checked by the
validator (A17/U08). Record this copy mismatch, do not change it or assert expiry.

No rejection branch clears cookies/state or rolls back prior writes. Access-cookie
success followed by member-cookie failure can leave household access established
while error is visible; a failure after selection is started can leave additional
partial state. The same screen does not distinguish bad signature, absent secret,
configuration or cookie/action failure. The Welcome anchor is a fresh navigation,
not an automatic resend/retry or saved-destination continuation. Welcome permits
passphrase submission and then onboarding under already accepted shared-access
requirements; invite memberId/redirect are not forwarded by the anchor. Invalid
invite opening does not revoke existing access. Successful recovery from cookie,
configuration, network or device failures was not observed.

**Actual tests inspected (source only; none executed):**

| Test / fixture | Assertions and substitutions / limits |
| --- | --- |
| [auth-flow.spec.ts](../../pwa/e2e/auth-flow.spec.ts), `magic invite link works and redirects to home` | Clears cookies in beforeEach, independently generates a token with the test helper, visits invite with a hard-coded member ID, asserts only URL matching `/home/`. Does not call getInviteLink, assert cookies/attributes, selected name, onboarding persistence, membership validation or durable arrival. It does not install setupCommonRoutes: fixture unhandled browser API requests receive 403. The adjacent voting test is only shared-route context, not member-invite coverage. |
| [settings.spec.ts](../../pwa/e2e/settings.spec.ts), `invite dialog can copy the generated link and close cleanly` | Installs fake clipboard writeText collecting strings; opens Jordan's Invite, asserts dialog/link includes ID, one captured copy includes ID, and close hides dialog. Does not validate token, open copied link, test native Share, clipboard rejection, generation failure, recipient selection or cookies. Settings setup injects Alex cookie/access, common API mocks and legacy family-storage localStorage; current family store uses cookies, not that legacy persistence. |
| Settings ordinary-name/layout assertions | Inspect Invite accessible label/text and width greater than height at selected viewports. Preview variants are not qualification of this ordinary-household slice. |
| [fixtures.ts](../../pwa/e2e/fixtures.ts), [mock-api.ts](../../pwa/e2e/mock-api.ts), [auth helper](../../pwa/e2e/auth-utils.ts), [Playwright config](../../pwa/playwright.config.ts) | Fixture fixes browser time, injects access, mocks health and blocks unhandled browser API with 403. Common routes substitute family list and `/me`, defaulting missing identity to Alex and returning supplied unknown cookie IDs as successful members; this is not real eligibility evidence. Token helper runs separately in Node; browser clock pinning does not pin server/helper time. Config uses test environment, managed-server test secret, internal API URL, conditional browser API base and blocked service workers. Browser route interception does not intercept Home serverFetch. |
| `pwa/src/app/(app)/profile/settings/page.test.tsx` | Stubs FamilyManagement, so section rendering does not exercise invites. Searches of PWA test/spec sources found no focused invite/action unit assertions or negative member-invite assertions. |
| [FamilyControllerTests](../../api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs), [FamilyServiceTests](../../api/src/RecipeApi.Tests/Services/FamilyServiceTests.cs) | GetAll tests assert array/membership, not invite redemption; controller file has no GetMe assertions. Existing test-factory/in-memory limitations from BSL-001 remain. These do not fill the invite-to-real-member lookup gap. |

**Uncovered selected paths:** missing/bad secret, malformed/empty/unknown member,
unsigned member/redirect edits, existing browser identity, absent server secret,
expired-looking but correctly signed timestamp, action/cookie failures at each
write, repeated/interrupted effects, unawaited rejection, partial state, native
Share/clipboard failures, Welcome recovery and eventual selected-name correctness.
These are evidence gaps, not new requirements or permission to add tests.

**Confidence/check disposition:** Direct source branches implementation-supported;
purpose inferred; final browser transport/state/recovery missing qualification.
Runtime browser/API/PostgreSQL/device checks **not-run**, by discovery scope.
Documentation/OpenSpec validation is recorded separately in the final response
and harness record after final edits; it does not verify this workflow. A23
authorizes the supported invite mapping below; disputed claims remain excluded.

### Member invite-link draft requirement/scenario evidence mapping

Delta: [member invite-link identity additions](../../openspec/changes/archive/2026-10-15-baseline-household-identity-member-invite-link/specs/household-identity/spec.md).
All six requirements/18 scenarios are implementation-supported, not runtime-verified.
A17/A22 keep expiry, member/redirect binding, eligibility, atomic handoff and universal
recovery limitations outside normative guarantees. Existing main identity rules are
referenced, not restated or modified.

| Added requirement | Scenarios | Source / evidence | Inspected assertion support and limits |
| --- | --- | --- | --- |
| Generate a member invite link from Settings | Open a member invite while generation is pending; Generation supplies the member link | BSL-006: Settings content → FamilyManagement → FamilySelector/FamilyMemberList.onInvite → InviteLinkDialog effect → getInviteLink → generateSecretToken; origin and encoded query fields | Settings invite test checks dialog and member ID in displayed link. Generation pending, encoding, token content and missing-secret failure are not directly asserted; U18 generation failure retained. |
| Copy share and dismiss the member invite dialog | Copy succeeds; Native sharing is available; Native sharing is unavailable; Close the dialog; Dismiss through the overlay | BSL-006: clipboard handler, copied flag/timer, canShare/handleShare, Close and overlay handlers | Settings invite test substitutes clipboard, checks one copied string includes ID and Close hides dialog. Native sharing, two-second timer, unsupported browser and overlay lack focused inspected assertions; no delivery guarantee. |
| Validate invite access before writing its access cookie | Invite processing is pending; Accepted invite token establishes access | BSL-007: InvitePage status/handleJoin → validateHearthSecret → validateSecretToken → awaited setHearthCookie | Auth-flow independently generates token and checks only Home URL, not validation action ordering, cookie attributes or real API acceptance; runtime not-run. A17 expiry limits retained. |
| Request the invited member context and default Home navigation | Existing member invite requests Home; Invite supplies a different existing member | BSL-007: first member-cookie action → unawaited selectFamilyMember → completeOnboarding → default router.replace; downstream BSL-001/002/004 rules reused | Auth-flow Home URL only; no selection/onboarding/cookie or existing-browser-state assertion. Requests are not durable arrival/atomic completion claims; U13/U16/U17 retained. |
| Preserve member context when an invite supplies no member ID | Member ID is absent with existing context; Member ID is empty without existing context | BSL-007: false memberId branch skips member/onboarding writes; default Home request remains subject to existing gates | No focused inspected assertion for these default-navigation cases; adjacent voting test is excluded as qualification. No voting journey extracted. |
| Show invite rejection and offer Welcome recovery | Token is absent or empty; Token is rejected; Household secret is unconfigured; Initial invite action fails; Follow the recovery link | BSL-007/008: missing-secret error, false result/catch on awaited actions, error screen and `/welcome` anchor; existing Welcome rules reused | No focused negative/recovery invite assertions found. The later unawaited rejection is not covered by the catch scenario; no rollback, expiry or successful retry guarantee (A17/A22). |

### Member invite-link draft artifact and check handoff

A23 records user “i authorise”, 2026-10-15, following the bounded drafting
recommendation. The CLI scaffold selected the existing local root and spec-driven
schema; no initialization, store or configuration changes occurred. Proposal,
ADDED delta, extraction design (security/state boundary condition applies), tasks
and metadata exist. No artifact was conditionally skipped. The design records
integration facts and limits, not implementation work.

- Strict selected-change validation passed, exit 0; all six requirement descriptions
  are below 500 characters and have the mapped scenarios.
- Existing main identity spec stays 12 requirements/31 scenarios, byte-identical;
  prior active shared-access change and archived existing-member selection retained.
- Final six-path documentation/content outcomes belong to the final response and
  `.task/agent-finish/last-run.json` for finalized content, not workflow runtime proof.
- Browser/API/database/device checks not-run; behavior TDD, generated-client and
  application checks not-applicable to these edits. No services or data accessed.
- Human acceptance, main-spec promotion, archival and application work have not
  occurred; stop for human review of this draft.

### Member invite-link main-spec promotion record — 2026-10-15

A24 records user “promote it” after presentation of the validated six-requirement/
18-scenario draft. This directly authorizes promotion of that reviewed content;
there was no separate acceptance message. The installed sync-specs skill resolved
`planningHome.root` to this repository, selected the sole delta from
`artifactPaths.specs.existingOutputPaths`, read current specs instructions once,
and merged its ADDED requirement blocks into the existing main capability.

- Main [household identity spec](../../openspec/specs/household-identity/spec.md) now
  contains 18 requirements/49 scenarios. Original title/Purpose, page-gate scope
  and all preceding 12 requirements/31 scenarios are preserved byte-for-byte.
- The six promoted requirement/18 scenario blocks match the invite delta verbatim;
  the delta itself is unchanged. Main has a single Requirements section and no
  delta operation headers. Repeating this merge introduces no further changes.
- BSL-006/007/008 and the mapping above now support the identically named promoted
  requirements. A17/A22, U08 and U13–U18 retain their stated evidence/claim limits.
- `openspec validate --specs --strict --no-interactive` passed, exit 0 (one spec).
  Final bounded three-path documentation/all-strict/content outcomes belong to the
  session response and harness last-run record for finalized content.
- Invite and shared-access changes remain active; existing-member-selection archive
  and unrelated edits/deletions are preserved. No archival, reopening, application
  implementation, commit or runtime qualification occurred.

### Shared-access and member invite-link archive record — 2026-10-15

A25 records user “you can archive both”, referring to the two promoted changes.
The archive-change skill selected their resolved local roots and considered both
archive instruction inputs. Each change reported 4/4 artifacts and 5/5 tasks complete.
Every shared-access (seven/21) and invite (six/18) requirement/scenario block
matched main exactly, so the user's archive instruction required no further sync.
There were no incomplete-artifact/task warnings or destination collisions.

Archived with `spec-driven` schema to:

- [Shared access](../../openspec/changes/archive/2026-10-15-baseline-household-identity-shared-access/proposal.md)
- [Member invite link](../../openspec/changes/archive/2026-10-15-baseline-household-identity-member-invite-link/proposal.md)

Both `.openspec.yaml` files and delta specs are preserved byte-for-byte. Only
relative Markdown links and archive-status records changed in the moved supporting
documents. Earlier draft/promotion commands and counts remain historical evidence,
not current lifecycle instructions. The plan's artifact links now target archives.
No Git staging or commit was performed; pre-existing index state is preserved.

Main [household identity](../../openspec/specs/household-identity/spec.md) is unchanged
at 18 requirements/49 scenarios; all 13 additions/39 scenarios from these two deltas
still match. The previous existing-member-selection archive and unrelated
README/document/navigation-spec edits/deletions are preserved. All completed
identity extractions are archived, but broader household identity remains incomplete.

Final active-inventory, strict main-spec, bounded documentation/all-strict/content
outcomes are reported in the session response and harness last-run record. Runtime
browser/API/database/device checks remain not-run; application/TDD checks are
not-applicable to archival. A17/A22 and U08/U13–U18 remain unchanged. Archival
establishes documentation lifecycle completion, not live behavior qualification.

## Reviewed slice — household identity / ordinary-household member creation

**Current review (A31):** BSL-014 below supersedes stale current-state assertions in
BSL-009–013. Those entries retain historical extraction and prior reported checks.
The application/contract/SQL/tests now have local edits; the change is physically
archived, not active. All four implementation boxes are checked in that archive,
but acceptance and later implementation/archive authorization are not established
by this plan. A27–A29 acceptance/promotion decisions remain recorded unchanged.

**Historical extraction record (BSL-009–013):**

A26 authorized discovery/review and the initial plan update. A27/A28 now authorize
the bounded draft and its explicit desired-behavior exceptions below. A29 accepts
and promotes its unchanged additions. Source identity is
`moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`, inspected
2026-10-15. The traced application, contract, SQL and tests have no local edits.
Existing staged/unstaged plan/spec/archive work, README edit and document deletions,
especially the deleted navigation spec, are pre-existing inputs, not task ownership.

| Field | Selected scope / result |
| --- | --- |
| Domain / purpose | Household identity: add a named household actor for later journeys. Purpose is inferred from connected UI and the approved capability frame; this creates no personal credentials or ownership record. |
| Workflow | Onboarding or Settings → reveal shared form → enter name → submit → hook/store/adapter/generated POST → authorized controller → service/EF row → envelope/adapter/store append → list and caller-specific handoff. |
| Dependencies | React local form state, Zustand family/onboarding stores, Kiota Fetch adapter, approved OpenAPI, shared API access, MVC DTO validation/success filter/error middleware, EF/Npgsql and PostgreSQL schema; cookie server actions and Next router only in onboarding handoff. No workflow enqueue, invitation or SSE publish in the creation path. |
| Existing rules to reuse | Main identity's shared-access/page/API gates, existing-member selection, current-member lookup, recovery and Profile name display; BSL-001–008 remain their evidence owners. Creation does not redefine them. |
| Excluded | Rename/removal, invitations/voting, operator-role design, personal accounts, household ownership, demo/preview/Synology qualification and deployment behavior. Demo guard observed only to delimit ordinary mode. |
| Evidence / confidence | BSL-009–011 below; implementation-supported, medium overall confidence because contract mismatch and untested failure/handoff seams remain. No runtime-verified claims. |
| Artifact status | A27/A28 draft: [proposal](../../openspec/changes/archive/2026-10-15-baseline-household-identity-member-creation/proposal.md), [delta](../../openspec/changes/archive/2026-10-15-baseline-household-identity-member-creation/specs/household-identity/spec.md), [design](../../openspec/changes/archive/2026-10-15-baseline-household-identity-member-creation/design.md), [tasks](../../openspec/changes/archive/2026-10-15-baseline-household-identity-member-creation/tasks.md) and CLI metadata. Seven ADDED requirements/21 scenarios accepted/promoted A29 on 2026-10-15; no preceding requirement edits. Main now 25/70; all three prior archives preserved. Change remains active, three extraction tasks complete and four implementation tasks open. |

| Root / discovery | `openspec store list --json`: no stores. `openspec list --json`: nearest root `/Users/alex/Code/whats-for-supper`, changes empty. `openspec list --specs --json`: household-identity, 18 requirements. Config has no store declaration; full main spec inspected. No initialization/reconfiguration or archive reopening. |

### BSL-household-identity-009 — entry, form state and caller-specific handoff

**Actor / entry / outcome:** With ordinary-household access, onboarding mounts
[FamilySelector](../../pwa/src/components/identity/FamilySelector.tsx) after requesting
`loadFamily` in `pwa/src/app/(auth)/onboarding/page.tsx`.
An existing selected ID changes the heading to Switch Member; it does not remove
creation. Profile's Settings button routes to Settings →
`pwa/src/app/(app)/profile/settings/SettingsPageContent.tsx`
→ [FamilyManagement](../../pwa/src/components/profile/FamilyManagement.tsx) → the same
selector. Settings does not itself load the family list; Profile loads when not
loaded, and root [IdentityValidator](../../pwa/src/components/identity/IdentityValidator.tsx)
handles protected-route loading/recovery under existing rules.

**Visibility / input:** Selector-local `showAddForm` starts false. “Don't see your
name? Add it” mounts [AddFamilyMemberForm](../../pwa/src/components/identity/AddFamilyMemberForm.tsx).
Cancel unmounts the form; reopening starts with empty name/error. Cancel is enabled
while busy and does not cancel an in-flight request. This local state does not use
`onboardingStore.showAddForm`, despite that store's comment. A successful Settings
submission leaves the form visible and clears its name; no success toast exists in
this path. List controls remain visible and selectable while creation is pending.

The form trims input, rejects empty/whitespace-only values with a local name error,
and clears that error on change. It uses `noValidate`, with no required/min/max-length
input props. [FormInput](../../pwa/src/components/common/FormInput.tsx) exposes the
label/error alert. [Button](../../pwa/src/components/ui/button.tsx) disables submit and
shows a spinner when busy; the name input is also disabled. There is no handler-level
pending guard in the form or store. Loading is shared with family operations.

**Handoff difference:** `FamilySelector.handleAddAndSelect` awaits `addMember`,
then invokes `onFamilyMemberSelected(member.id)` only for a returned member.
[useFamily](../../pwa/src/hooks/useFamily.ts) exposes store actions without additional
creation rules. Settings supplies `() => {}`: creation neither changes selected ID,
writes identity cookies, marks onboarding complete nor navigates. Existing selected
member stays selected; the new row is rendered without automatically being “you.”

Onboarding's async callback first awaits `setFamilyMemberCookie(id)`, then calls
`selectFamilyMember(id)` without await, calls `completeOnboarding()` and requests
`router.replace(HOME)`. The selector's callback type returns void and its invocation
is not awaited; the add-form promise therefore does not include this handoff.
The store's selection separately awaits another server cookie action, attempts the
readable fallback, then sets selected ID. The form may clear and loading already
ends before either handoff has completed. Existing selection is replaced only when
that selection work succeeds; there is no atomic create/select transition.

**Persistence / failure boundary:** Onboarding completion is a Zustand flag persisted
as `onboarding-storage`; it is set before confirmed Home arrival, despite the store
comment. [auth actions](../../pwa/src/lib/auth.ts), `setFamilyMemberCookie`, and
[cookie fallback](../../pwa/src/lib/identity/cookie.ts) retain BSL-001's configuration
and recovery limits. Persisted creation precedes cookie work; a failed first cookie
action rejects the unawaited callback, and a later selection failure is also not
caught by `addMember`. No compensating delete, rollback, handoff error UI or durable
retry token exists here. A17/A22 remain separate and unchanged; U13 still applies.

Classification: **implementation-supported**, medium confidence; interruption,
selection/cookie rejection and navigation outcomes are **missing/incomplete
qualification** (U21). Disposition: evidence candidate only, no normative mapping.

### BSL-household-identity-010 — request, validation, persistence and returned member

**Ordered trace:** form → `useFamily.addMember` →
[familyStore.addMember](../../pwa/src/store/familyStore.ts) →
[family adapter.createFamilyMember](../../pwa/src/lib/api/family.ts) →
[generated family POST builder](../../pwa/src/lib/api/generated/api/family/index.ts)
(`FamilyRequestBuilderRequestsMetadata.post`, JSON serializer/deserializer) →
[OpenAPI POST /api/family](../../specs/openapi.yaml) →
[FamilyController.Create](../../api/src/RecipeApi/Controllers/FamilyController.cs) →
[FamilyService.CreateFamilyMember](../../api/src/RecipeApi/Services/FamilyService.cs) →
[RecipeDbContext.FamilyMembers](../../api/src/RecipeApi/Data/RecipeDbContext.cs) →
[family_members SQL](../../api/database/schema.sql).

[API client](../../pwa/src/lib/api/api-client.ts) optionally injects the existing member
header; creation has no member-ID binder or ownership check. Global authorization
in [Program](../../api/src/RecipeApi/Program.cs) remains the shared access rule. Ordinary
mode passes the controller's demo guard. No caller-generated ID or idempotency key
is supplied. Service creates one new entity per successful call and awaits
`SaveChangesAsync` before returning; it neither selects a member nor writes cookies.

| Layer | Inspected rule / limit |
| --- | --- |
| Form / store | Both trim and skip blank names; UI local error, store blank guard returns null without request. No length, name uniqueness or casing check. Store has no `isLoading` early-return for addMember. |
| Generated client / adapter | `FamilyPostRequestBody.name` is optional/nullable in generated TypeScript even though OpenAPI requires a string. Serialization writes the name; no length/blank validation. Adapter requires truthy response `data.id`, otherwise throws; it does not explicitly validate UUID/existence. |
| Approved OpenAPI | Required JSON body and required string name; no minLength/maxLength or whitespace rule. Summary says “Create or update”; responses document 200 and demo 403, not implemented 201 or ordinary validation 400. Withhold contract-parity/upsert/status guarantees (U19). |
| MVC DTO | [CreateFamilyMemberDto](../../api/src/RecipeApi/Dto/CreateFamilyMemberDto.cs): Required and MaxLength(100), ApiController model validation; raw request is validated before service trimming. Thus over-100 raw text can fail even if its trimmed result is short; UI sends trimmed text. Missing/null/empty/whitespace names are invalid under Required. Default validation response differs from the service exception envelope; no current request observation. |
| Service | Trims, throws ArgumentException for empty result, preserves remaining casing/text. No explicit maximum length, duplicate lookup, case folding, uniqueness or idempotency rule. Direct service invocation bypasses DTO validation. |
| Entity / EF / SQL | [FamilyMember](../../api/src/RecipeApi/Models/FamilyMember.cs) has required/max-100 name; schema has varchar(100) NOT NULL, UUID primary key, no unique name index or nonblank-name check. No case-insensitive name constraint. Database length enforcement is not established by in-memory tests. |

**Response / defaults:** Entity initializes a new GUID, `browseViewMode = stack`,
null preferred language, and separate UTC created/updated timestamps. SQL also has
stack/time defaults; there is no SQL ID default. Controller maps these fields through
[FamilyMemberDto](../../api/src/RecipeApi/Dto/FamilyMemberDto.cs), returning
`CreatedAtAction(GetAll, null, result)` (201 and collection-action Location).
[SuccessWrappingFilter](../../api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs)
wraps successful data. Generated response metadata deserializes the `data` envelope;
only demo 403 has an explicit generated error mapping. No live Kiota 201/400
qualification was run. [ErrorHandlingMiddleware](../../api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs)
maps ArgumentException to 400 and other unhandled persistence exceptions to generic
500; DTO model-state responses use the MVC path instead.

Adapter returns ID/name, normalizes browse mode to list or stack, normalizes null
language to empty string, and drops timestamps. Store appends returned member to the
current array, clears loading, and returns it without re-fetching, sorting or
changing `hasLoaded`/selection. [FamilyMemberList](../../pwa/src/components/identity/FamilyMemberList.tsx)
renders the appended name and uses case-insensitive **ID** matching for “you”; this
is not name normalization. Later GET orders by name through the service, subject
to database ordering; no universal locale/case ordering claim. Duplicate names or
case variants have no prevention in this path, but were not exercised against SQL.

Classification: **implementation-supported**, medium confidence. Happy-path envelope
is aligned; operation semantics/status and validation metadata are **missing/incomplete**
contract coverage (U19). Disposition: candidate observations only; no drafted claims.

### BSL-household-identity-011 — failure, repeat submission and actual assertions

`familyStore.addMember` clears old store error on a nonblank attempt; any adapter or
request exception sets store error, clears loading and returns null. No member is
appended and no selection callback is invoked on that response path. Because the
form's `onSubmit` resolves normally after null, it still clears the name. Onboarding
renders store error as an alert (and generic loading copy while creating); Settings'
FamilyManagement/selector do not consume or render store error. Local blank-name
feedback exists in both forms. Cancel/reopen resets local state but not store error.
These are observed source paths, not an accepted universal retry/recovery design.

Pending UI disabling reduces ordinary repeated clicks but does not establish
idempotency. Cancel can hide/reopen during a request; closing does not abort it.
There is no addMember guard, deduplication, retry policy or request identity. An
ambiguous network failure or missing-ID response can occur after the server saved;
client then reports failure/null while a row may exist. Re-entry/retry can create
another row. Concurrent invocation and shared-loading races are untested. Creation
followed by a handoff failure also leaves the row and client append in place (U21).

| Inspected test / substitution | Exact relevant assertions and limits |
| --- | --- |
| [onboarding.spec.ts](../../pwa/e2e/onboarding.spec.ts), `adding a new family member shows the form and accepts input` | Reveals form, fills TestUser-Pinned, asserts input value, clicks submit, asserts returned fixed-ID row visible. It does not reload, despite its comment, or explicitly assert request payload/count/status/name, cookies, selection, completion or Home URL. Its stateful browser route echoes posted name and always uses the same NEW_MEMBER_ID with 201; it bypasses API validation/persistence and cannot qualify distinct IDs across retries. |
| [FamilyServiceTests](../../api/src/RecipeApi.Tests/Services/FamilyServiceTests.cs) | `Creates_With_Unique_Id` checks two nonempty/different IDs for Alice/Bob; `Defaults_BrowseViewMode_To_Stack` checks stack; `Empty_Name_Throws` asserts empty and whitespace exceptions. `GetAll...` checks three names/count, not ordering. No trimming-preserves-case, duplicate-name, max-length or concurrency assertion. |
| [FamilyControllerTests](../../api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs) | `Create_Returns_Created_With_Member` checks 201, data.name, stack and nonempty GUID. `Create_Appears_In_Subsequent_GetAll` checks the submitted unique name appears after GET, without asserting the POST response. No ordinary creation-invalid-input, length, duplicate-name, timestamp/null-language or Location assertion. The empty-name update test is not creation coverage. Demo test is deferred-profile context only. |
| [TestDbContextFactory](../../api/src/RecipeApi.Tests/Infrastructure/TestDbContextFactory.cs) / [TestWebApplicationFactory](../../api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs) | Service uses isolated EF InMemory. Controller uses default auth-disabled factory and in-memory EF unless an explicit Postgres override is supplied (none in these creation tests); workflow orchestration is substituted. Neither proves real SQL constraints or household authentication. |
| [browser fixtures](../../pwa/e2e/fixtures.ts), [mock API](../../pwa/e2e/mock-api.ts), [Playwright config](../../pwa/playwright.config.ts) | Inject shared access, clear cookies, pin browser time, reject unhandled browser API calls; service workers blocked. Common POST returns fixture data/201; onboarding overrides with a mutable mock list. `/me` mock defaults to Alex without identity and is not bound to the newly created list. Browser interception does not qualify server-side fetches or real handoff. |
| [auth-flow.spec.ts](../../pwa/e2e/auth-flow.spec.ts) and Settings page unit test | Auth-flow checks passphrase and invite URLs; no creation-to-Home test, despite onboarding test comments. `pwa/src/app/(app)/profile/settings/page.test.tsx` stubs FamilyManagement entirely. Targeted source search found no direct form/selector/store/adapter tests or Settings creation test. |

**Uncovered:** cancel/reset, trimmed/blank names in browser, 100/101 boundaries,
case/duplicate names, pending/repeated/concurrent creation, Settings selection
retention/error visibility, request failure/input clearing, malformed/lost response,
real POST→GET/SQL parity, cookie rejection, persisted-create/failed-handoff and durable
Home/selected-name outcome. Tests above were inspected, **not run**. Runtime behavior
is **not-run**, qualification **missing/incomplete**, confidence medium for traced
source and low for universal recovery claims. No runtime-verified assertions.

### Member-creation review handoff — A26 historical recommendation

Superseded in part by A27/A28 below: the user requires 201 contract alignment and
normative uniqueness, rather than retaining those two gaps as exclusions. Other
validation/recovery limits remain evidence, not desired-behavior guarantees.

The A26 recommendation was to first decide to retain U19–U21 as non-normative limitations for this
extraction, withholding upsert, exact contract/status parity, universal validation,
unique-name/idempotent creation, retained failure input, universal error feedback,
and atomic creation/selection/recovery claims. This is a recommendation, not an
accepted decision or authorization to preserve defects as desired behavior.

After that decision, a **separately authorized** bounded draft could describe form
opening/cancellation and blank-name feedback, successful named-member creation and
list display, Settings retaining selection, and onboarding requesting the existing
identity handoff subject to success. Reuse existing shared-access, lookup, selection,
recovery and Profile requirements. Exact disputed API statuses/validation guarantees
remain outside normative claims until resolved/explicitly accepted. No draft now.

Checks for this plan-only session: read-only OpenSpec root/store/inventories and
source/assertion review completed; final `task verify -- docs/openspec-baseline-plan.md`
outcomes and content identity are reported in the session response and harness
record after final edits. Runtime browser/API/PostgreSQL/device checks **not-run**
(discovery-only); application/TDD and new-artifact validation **not-applicable**.

### BSL-household-identity-012 — member-creation draft and explicit future rules

**Authority / evidence distinction:** On 2026-10-15 the user instructed “OpenAPI
must document 201 as is implemented,” “Name Uniqueness MUST be inforced in the new
specs so it gets fixed in future work,” and “I authorize the member-creation draft”
(A27). Follow-up answers settle trim/case-insensitive equivalence and 409 Conflict
(A28). This explicitly permits desired uniqueness in this slice despite the earlier
pure-brownfield rule; it does not turn that missing behavior into source evidence.
The 201 controller behavior remains implementation-supported; OpenAPI correction
and uniqueness/409 remain **not implemented**, with no runtime observation.

**Scope / artifacts:** CLI-scaffolded local `baseline-household-identity-member-creation`
with proposal, seven ADDED requirements/21 scenarios, design and tasks. No artifact
conditionally skipped: cross-layer contract/persistence/migration complexity warrants
design. No main spec, approved API contract, generated client, test, SQL, dependency,
application or configuration edit. Root/config rechecked; one active draft now,
three prior archives preserved. New tasks explicitly retain future work incomplete;
this differs from prior extraction-only completed task lists. Draft acceptance,
promotion, implementation and archival are separate decisions.

| Added requirement | Scenarios / evidence basis | Current implementation and test limit |
| --- | --- | --- |
| Open and cancel the member-creation form | Four: onboarding entry, Settings entry, cancel/reopen, creation while switching; BSL-009 | Source-supported; browser test only opens onboarding form, no cancel/reset/Settings creation assertion. |
| Submit a trimmed nonblank member name | Three: surrounding whitespace, blank, edit clears error; BSL-009/010 | Source-supported; service tests assert blank exceptions, browser uses nonblank text; trim/error/case scenarios not run. |
| Display member-creation pending feedback | One: pending input/submit disabled and progress; BSL-009 | Source-supported shared loading; no current pending assertion or idempotency guarantee. |
| Create and return a named household member | Three: 201 envelope/defaults, later list, OpenAPI 201 creation semantics; BSL-010/011 + A27 | Controller/test source supports 201 and subset of fields/list; OpenAPI still 200/upsert. Contract correction is planned, not completed; timestamps/null language not directly asserted. |
| Prevent duplicate member names during creation | Six: exact, casing, whitespace, stored-whitespace, concurrent equivalent requests, distinct display casing; A27/A28 | Normative desired behavior; service/schema currently lack uniqueness and 409 handling. No duplicate/concurrency regression or runtime evidence. Never describe these scenarios as baseline implementation-supported. |
| Display the created member without switching Settings identity | Two: preserve context, open/empty form after success; BSL-009/010 | Source-supported no-op callback/store append; no Settings creation assertion. |
| Request onboarding identity handoff after creation | Two: first selection and existing-selection handoff; BSL-009/011 | Source-supported request ordering only; callback/selection promises not awaited, no atomic/durable arrival assertion. Existing shared rules reused. |

**Future work / limits:** Tasks plan contract-first 201 alignment, generated-client/
consumer/mock reconciliation, followed by test-first server/persistence uniqueness
and concurrent real-PostgreSQL acceptance, then browser integration. They are not
execution authorization. Duplicate rejection uses 409; no automatic selection of
an existing match. Existing data must not be merged/deleted/renamed automatically;
collision remediation or rename compatibility changes need separate bounded review.
The rule preserves trimmed display casing and does not imply accent equivalence,
personal accounts or network idempotency. Other U19 validation metadata gaps and
U20/U21 input/error/partial-handoff limits stay non-normative, with no universal
recovery claim. A17/A22 remain unchanged.

**Checks / disposition:** Selected strict OpenSpec validation passed, exit 0, before
final documentation checks. Final six-path `task verify` results/content identity
are reported in the session response/harness record after all edits. Browser/API/
PostgreSQL/device checks **not-run**; application TDD **not-applicable to drafting**.
Disposition: accepted and promoted A29 on 2026-10-15; future contract correction/uniqueness not implemented, change not archived.
Source confidence remains medium; future uniqueness is user-authorized intent,
not a confidence-rated implementation claim.

### Member-creation main-spec promotion record — 2026-10-15

A29 records the user's “approved and promote” instruction. The sync-specs skill
resolved `planningHome.root` to this repository and selected the sole delta from
`artifactPaths.specs.existingOutputPaths`; current specs instructions were read
before writing. The seven approved requirement blocks and all 21 scenarios were
appended verbatim to [main household identity](../../openspec/specs/household-identity/spec.md).
Preceding 18 requirements/49 scenarios, title, Purpose and page-gate preamble were
preserved. Main now has 25 requirements/70 scenarios with one Requirements section
and no delta operation headings. Delta, proposal, design and metadata are unchanged.

Acceptance/promotion includes 201 OpenAPI alignment and trimmed, case-insensitive
name uniqueness with 409 rejection as normative requirements. The application and
OpenAPI have not been changed by promotion: 201 is current controller behavior,
contract correction and uniqueness enforcement remain future work. Three extraction
tasks remain complete, four future tasks remain open; planning artifact existence
is not implementation completion. Change remains active; no archival authorized.
BSL-009–012 mapping, A17/A22 and residual U19–U21 limits are preserved.

Main-spec strict validation passed, exit 0 (one item). Final three-path documentation,
all-strict OpenSpec and content checks are reported in the response/harness record
after final edits. Runtime browser/API/PostgreSQL/device checks not-run;
application/TDD not-applicable to this documentation-only promotion.

### BSL-household-identity-013 — task 2.1 contract alignment and verification reconciliation

A30 explicitly authorizes only task 2.1. Source commit remains
`7e0dcdbe162704debe8a0f916eb1f7327afc77a5`, with task-local contract/mock/test edits.
[OpenAPI](../../specs/openapi.yaml) POST `/api/family` now uses 201 Created and creation
wording; GET/envelope are unchanged. This corrects the 201 part of U19; validation
metadata gaps remain. No production controller/service, SQL or uniqueness change.

[Family client tests](../../pwa/src/lib/api/family.test.ts) observed the missing-201
contract regression before correction, then passed real generated-client JSON and
adapter acceptance at a substituted HTTP boundary. A new
[Settings component test](../../pwa/src/components/profile/FamilyManagement.creation.test.tsx)
passed the real component/store/client chain with substituted HTTP/server-cookie
boundaries and asserted list display/selection retention/empty form/no completion.
Settings reload behavior was investigated: identity recovery restores only the current
member (/api/family/me), while Settings did not request the full family list. A focused
failing regression was added to `FamilyManagement.creation.test.tsx`, and the minimal fix
was implemented in [FamilyManagement](../../pwa/src/components/profile/FamilyManagement.tsx)
to call `loadFamily()` when `!hasLoaded`.

[Shared browser mocks](../../pwa/e2e/mock-api.ts) persist created members into later
GET responses, echo trimmed names and assign distinct deterministic test GUIDs.
[Onboarding assertions](../../pwa/e2e/onboarding.spec.ts) use that shared owner (5/5 passed);
[Settings assertions](../../pwa/e2e/member-creation.spec.ts) cover two 201 creations,
read-after-reload, cookie/selection/onboarding/route retention, and 409 duplicate rejection (2/2 passed).
[Controller tests](../../api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs)
add returned default/timestamp and ID-linked subsequent-list assertions;
[new PostgreSQL test](../../api/src/RecipeApi.Tests/Integration/FamilyCreationPostgresTests.cs)
uses its own disposable database and independent row read.

`task test:unit`: passed 78 files/741 tests; `task typecheck`: passed exit 0;
`task gen:client:check`: passed exit 0 (Kiota 1.36.0 client up to date);
`task test:api`: passed 898 passed, 0 failed, 40 skipped;
`task test:e2e -- e2e/onboarding.spec.ts e2e/member-creation.spec.ts`: passed 7/7 Playwright tests;
`task agent:drift:endpoints`: passed Tier 0 endpoint diff against live API running on port 5001 (all endpoints match; blocked when API process stopped);
Disposable PostgreSQL: skipped (Docker daemon not running, `WFS_TEST_POSTGRES_CONNECTION` unset).
Task 2.1 acceptance remains open pending disposable PostgreSQL execution; stop before uniqueness and tasks 2.2–2.4. A17/A22, residual U19 and U20/U21 limits remain.


### BSL-household-identity-014 — current member-creation review and evidence limits

**Scope / identity (A31):** Review phase 0 and recommend the next bounded action;
plan-only changes. Domain: household identity. Selected observable workflow:
ordinary-household Settings → add a named member → list result or duplicate
rejection while retaining the selected identity. Onboarding is inspected only as
the immediate shared-form consumer. Business purpose: add a reusable household
actor without changing the current Settings actor (purpose inferred; behavior
implementation-supported). No application or lifecycle actions authorized here.

Branch/HEAD: `moving-to-openspec` /
`7e0dcdbe162704debe8a0f916eb1f7327afc77a5`, 2026-10-15. Relevant dirty inputs:
FamilyManagement (unstaged), identity recovery, creation client/tests/browser mocks,
OpenAPI/generated family builder, controller/service/duplicate exception, SQL and
API/PostgreSQL tests (staged or mixed). The 20-file source/test manifest comprises
FamilyManagement, FamilySelector, AddFamilyMemberForm, familyStore, family adapter,
generated family builder, OpenAPI, FamilyController, FamilyService,
DuplicateFamilyMemberException, schema/compatibility SQL, FamilyCreationPostgresTests,
FamilyControllerTests, FamilyServiceTests, FamilyManagement.creation.test.tsx,
family.test.ts, member-creation.spec.ts, onboarding.spec.ts and mock-api.ts, at their
repository paths linked in BSL-009–013. SHA-256 of sorted `path + NUL + file SHA-256 +
newline` entries: `acb0538483ee38b5bcc13443c935cffbc1cdf8fd90db564c2ab4e6a3ea6f1e33`.
This is source identity, not a runtime-tested identity.

**Ordered trace and observable rules:**

1. Settings content mounts `FamilyManagement`, which now calls `loadFamily` when
   `!hasLoaded`; the old BSL-009 no-load statement is historical. `FamilySelector`
   renders the list and reveals/cancels `AddFamilyMemberForm`. Input/form and
   `familyStore.addMember` trim and reject blank names; pending input/submit are
   disabled. Settings' selection callback remains a no-op.
2. `useFamily` → `familyStore.addMember` → `createFamilyMember` → generated family
   POST → OpenAPI `/api/family`. Current contract documents creation 201 and
   duplicate 409 `{status, message}`; generated POST maps 409 errors. Adapter
   requires a returned ID and normalizes browse mode/language; store appends only
   a successful returned member without selecting it. Full generated-client
   regeneration parity is not established by inspecting this builder.
3. `FamilyController.Create` rejects demo creation (403), otherwise calls
   `FamilyService.CreateFamilyMember`; duplicate exception becomes 409. Service
   trims, queries existing names with `Trim().ToLower()` against `ToLowerInvariant()`
   input, preserves trimmed display casing, saves a new GUID/default profile, and
   translates a recognized unique-violation DbUpdateException into the duplicate
   exception. Success remains CreatedAtAction/GetAll (201), wrapped in `data`.
   Shared access authorization remains owned by BSL-003–005; these creation tests
   do not qualify that gate.
4. `RecipeDbContext.FamilyMembers` persists the entity. Both schema.sql and
   compatibility.sql now declare the unique `lower(trim(name))` index. EF model
   configuration itself does not declare that expression index. Thus PostgreSQL
   concurrency protection depends on installed SQL, not the service precheck or
   EF InMemory. No schema application or household data inspection performed.
5. Successful Settings creation appends the returned member, clears form input,
   and retains selected ID/cookies/onboarding/route. Failure returns null from the
   store without append or selection; form still clears, and Settings still does
   not render the store error (U20). Onboarding's cookie/selection/navigation
   callback remains separate and unawaited by the selector (U21). No enqueue/SSE
   side effect exists in this creation path.

**Assertions, substitutions and dependencies:**

- `FamilyManagement.creation.test.tsx` exercises real component/store/generated
  client with substituted HTTP and cookie actions: 201/list/identity retention,
  409/no append/no selection, and full-list mount loading. The 409 test waits for
  fetch invocation, without asserting completed error feedback or input recovery.
- `family.test.ts` checks 201/409 contract text, decodes a substituted 201 envelope,
  and asserts 409 throws; it does not assert the exact user-visible error message.
- `FamilyControllerTests` asserts 201/defaults/POST→GET and 409 exact/case/space
  rejection with count unchanged for exact duplicate. `FamilyServiceTests` adds
  stored-space and display-casing assertions using `TestDbContextFactory`'s EF
  InMemory provider. Default `TestWebApplicationFactory` omits authentication and
  uses InMemory unless `Tests:PostgresConnectionString` is supplied; it substitutes
  external services. These are not production-access or PostgreSQL proofs.
- `FamilyCreationPostgresTests` creates/drops a random disposable database from
  administrative `WFS_TEST_POSTGRES_CONNECTION`, applies schema.sql, and asserts
  POST→GET/independent row read; a second test asserts sequential 409 variants,
  concurrent 201/409 and row counts. It skips without that variable. It does not
  exercise compatibility.sql against existing collisions, stored-whitespace rows
  on PostgreSQL, or rename compatibility. No current execution observed.
- Browser `member-creation.spec.ts` asserts 201, distinct IDs, list/reload and
  identity retention; duplicate test asserts 409/list count/selected label.
  Onboarding asserts creation/list and duplicate 409/count, without durable Home
  arrival. `setupCommonRoutes` supplies in-memory stateful POST/GET/409 behavior;
  fixtures inject access cookies and fixed time, block unhandled API calls;
  Playwright uses Chromium and local/external BASE_URL per configuration. Browser
  mock outcomes cannot establish API, SQL or end-to-end persistence behavior.
- `docs/user-guide.md` describes shared entry/no personal account, but supplies no
  creation uniqueness or recovery guarantee. Shared dependencies are React/Zustand,
  Kiota, cookie actions, API auth/filter/DTO validation, EF/Npgsql/PostgreSQL and
  installed schema. Ordinary mode only; no deployment/profile qualification.

**Classification / mapping / confidence:** Current 201/409 path, SQL declarations,
Settings mount load and selection retention are **implementation-supported**;
business purpose is **inferred**; current runtime/database/upgrade qualification
is **missing/incomplete**. Medium confidence overall. Map to existing main/delta
requirements “Create and return a named household member”, “Prevent duplicate
member names during creation” (six scenarios), and “Display the created member
without switching Settings identity”. No requirement edited or newly accepted.
Source supports the named ASCII examples; broad whitespace/case equivalence across
JavaScript, .NET and PostgreSQL/collation is unqualified. U19 residual validation
metadata, U20 feedback and U21 non-atomic handoff remain excluded guarantees.

**Actual checks and historical evidence:** CLI 1.14.1 `store list --json` passed
(no stores); `list --json` passed (nearest repository root, zero active changes);
`list --specs --json` passed (household-identity, 25 requirements). Full main spec
inspected (70 scenarios); config has no store declaration. Four archives exist,
including member creation; no initialization/reconfiguration/reopening performed.
Prior `.task/agent-finish/last-run.json`, inspected before this session's final
plan-only verification, records identity
`e8f6b3faa2ea9d3eefe7d88507f92888b63ecab2d222da4c48ed657e44933d2b`,
`automated_checks_passed: false`, database-behavior **blocked**, and task acceptance
not evaluated. Its selected paths exclude the dirty service/controller/SQL and
archived task record. Its other passed checks and BSL-013's reported successes are
historical evidence at their own identity, not current acceptance of all checked
tasks. Archive tasks report PostgreSQL skipped and live parity blocked, conflicting
with their full-completion prose and the plan's older active/unchecked checkpoint
(U22). No new runtime suites, live endpoint probes, database or Docker commands
run: **not-run**, outside this review. Behavior TDD: **not-applicable** to this
plan edit. Final documentation and selected-spec checks are reported in the session
response and current harness record; no runtime claim follows from them.

**Disposition / next bounded action:** Evidence reconciled, acceptance unresolved.
Recommend a separately selected review of member-creation task/lifecycle evidence:
locate any later explicit implementation/archive authorization, reconcile the
checked tasks with actual required checks, and define current-content disposable
PostgreSQL/live parity qualification. Do not infer authorization from their current
location or completion claims, undo existing work, reopen archives, fix gaps or
start the next capability. No need to repeat phase-0 decisions or A29 promotion.

### BSL-household-identity-015 — acceptance and archival evidence review

**Current authority (A32):** The user selected the recommended member-creation
acceptance/archival evidence review before another baseline slice and instructed
that the following sentence be included in the future spec:

> However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.

**Future-spec carry-forward:** Include that exact sentence in the next authorized
spec draft's non-normative evidence/status note, with BSL-014/015 and U22 references.
It describes the recorded review state, not application behavior or a new SHALL/MUST
requirement. Reconcile it with any later supplied evidence rather than silently
turning the historical limitation into a permanent product rule. This instruction
does not select a new capability, authorize generation now, change the accepted
requirements, retroactively authorize implementation/archival, or qualify runtime.

**Identity / reused evidence:** Same branch/HEAD and 20-file manifest as BSL-014;
all 20 source/test digests rechecked unchanged. Domain and observable workflow
remain household identity / Settings creation or duplicate rejection with current
selection retained. Reuse BSL-014's complete trace, purpose, rules, dependencies,
negative paths, test substitutions and medium confidence; no application rescan.
This review adds acceptance/lifecycle evidence, not new behavior claims.

| Review dimension | Evidence / result | Disposition |
| --- | --- | --- |
| Human spec acceptance and promotion | A29 records “approved and promote”; current main has 25 requirements/70 scenarios | Retained; not reopened or newly accepted |
| Delta/main agreement | Read-only requirement-block comparison: all seven member-creation blocks identical, including all 21 scenarios | Passed content comparison; no sync required |
| Physical archival | Archive contains metadata/proposal/design/delta/tasks; CLI reports zero active changes and nearest local root, no stores | Location verified; move authorization and procedure not established |
| Task 2.1 acceptance | 201/list/client source/assertions exist; archived task requires real PostgreSQL POST→GET; `.task/member-creation-2-1.json` explicitly records `task_2_1_complete: false`, PostgreSQL not-run and several sandbox-blocked checks | Acceptance unestablished; checkmark conflicts with required evidence |
| Task 2.2 acceptance | Current 409/index source and tests are implementation-supported; archived checkpoint itself reports PostgreSQL skipped; no current concurrency/constraint observation, stored-whitespace PostgreSQL assertion, compatibility/collision/rename qualification or red/green command record established | Acceptance unestablished; checkmark/full-completion claim unsupported by reviewed evidence |
| Task 2.3 acceptance | Client, shared stateful mocks and Settings/onboarding assertions support intended integration; historical browser/unit passes reported, with different counts in plan/archive | Current-content test-first and full acceptance not established; mock results do not prove persistence |
| Task 2.4 acceptance | Archive requires complete implementation path selection, database concurrency and identity reconciliation; BSL-014's inspected prior finish record had database blocked and excluded service/controller/SQL/archive tasks | No complete acceptance evidence; later plan-only checks cannot close implementation tasks |
| Authorization provenance | Approval registry ends implementation authority at A30 task 2.1; A31/A32 are review-only. Targeted `git log` returns no commits for the plan or this archive; current artifacts are staged additions | No later instruction found in inspected repository evidence; absence from this evidence is not proof no instruction was ever given |
| Archive metadata / procedure | `.openspec.yaml` records schema and creation date only; no approving instruction or archive execution/check log found. Installed archive workflow separates artifact/task counts and delta synchronization; configuration requires separate acceptance evidence | Seven checked boxes are not proof of procedure or acceptance; do not rerun archive/status against a fabricated active change |
| Documentation integrity | Three archive links `../../../docs/openspec-baseline-plan.md` in proposal/design/tasks resolve to missing targets; task handoff still names the old active tasks path. Delta preamble/design retain original future/unimplemented wording; tasks simultaneously retain “four future tasks open” and full-completion prose | Recorded documentation discrepancies; archive edits/reopening not performed in review scope |

**Historical evidence identity:** `.task/member-creation-2-1.json` is scoped to
2.1 at the same HEAD, with 738-unit-pass and blocked/not-run records; every one of
its nine still-present listed files has a different current SHA-256, and its active
tasks path is absent. It is historical evidence only, not a result for current
source. BSL-014 captured a later finish identity with database-behavior blocked;
that record was subsequently replaced by A31's plan-only verification. Current
`.task/agent-finish/last-run.json` therefore cannot be cited as an all-implementation
completion record. No additional current-content runtime result was discovered in
these bounded evidence sources. No broad private conversation/history search.

**Checks / limits:** Read-only CLI store/root/change/spec discovery passed. Main
strict validation passed (`openspec validate household-identity --type spec --strict
--no-interactive`, exit 0); block equality and unchanged 20-file source manifest
checks passed. `WFS_TEST_POSTGRES_CONNECTION` presence-only check is false in this
process; no credential value printed, service connection, Docker probe or database
creation attempted. PostgreSQL/browser/API/live parity: **not-run** this session;
historical blockers are not relabeled as current failures or successes. Three
broken archive links were observed by path resolution; no archive repair check
passes are claimed. TDD/application checks: **not-applicable** to this plan-only
edit. Final bounded documentation outcomes/content identity are in this session's
response and harness record.

**Review conclusion:** Accepted/promoted spec content is intact. Implementation
acceptance and archival provenance remain unresolved (U22); do not mark reviewed
completion claims verified, infer retrospective authority, undo the archive or
select another slice. The focused missing fact has been requested from the user:
whether a later session explicitly authorized tasks 2.2–2.4 and this archival.
The user answered “Yes—I'll provide the instruction or reference” on 2026-10-15.
Record this as user-reported later authorization; the original scope/reference is
still pending, so no retrospective approval entry or lifecycle action is inferred.
A supplied instruction can settle provenance; it cannot substitute for PostgreSQL
or other required runtime evidence. A later separately selected qualification can
run the existing disposable test with a configured administrative test connection:
`dotnet test api/src/RecipeApi.Tests/RecipeApi.Tests.csproj --filter FullyQualifiedName~FamilyCreationPostgresTests`.
That check alone would still not establish the unasserted stored-whitespace,
compatibility/collision/rename cases or historical test-first order. No new tests,
application fixes, data remediation or production migration authorized here.

### BSL-household-identity-016 — bounded PostgreSQL qualification readiness

**Scope / authority:** A33: user “keep going” after BSL-015; continue the next
bounded qualification using existing checks, without implementation, application
test edits, archive repairs/moves or a successor baseline slice. Authorization
reference for earlier tasks 2.2–2.4/archive remains user-reported and pending;
continuation does not backfill that provenance.

**Identity:** `moving-to-openspec` /
`7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus existing dirty inputs. Reuse
BSL-014/015's selected workflow/source/assertion trace and qualification limits.
The fixture config uses Npgsql only with `Tests:PostgresConnectionString`; the
existing PostgreSQL tests create random disposable databases, apply schema.sql,
assert creation/retrieval/duplicate/concurrent outcomes and drop those databases.
An administrative test connection is required; no household connection substituted.

| Actual check | Outcome / scope |
| --- | --- |
| Git status and HEAD | Passed read-only discovery; dirty baseline preserved |
| Presence-only `WFS_TEST_POSTGRES_CONNECTION` check | Passed inspection: unset; no secret printed |
| `docker info --format '{{.ServerVersion}}'` | Blocked, exit 1: permission denied connecting to `/Users/alex/.docker/run/docker.sock`; no daemon-health conclusion |
| `dotnet test ... --filter FullyQualifiedName~FamilyCreationPostgresTests` | Not-run: unconfigured fixture would skip; no disposable server available through permitted Docker access |
| Database qualification | Blocked by runner readiness; no new persistence/concurrency observation |
| Other application/browser/live checks | Not-run; cannot remove the identified database gap |
| TDD / implementation acceptance | Not-applicable to plan edit / not established for application |

**Exact local handoff**, from repository root after configuring
`WFS_TEST_POSTGRES_CONNECTION` for an administrative **disposable test** PostgreSQL
server (the tests create/drop isolated databases):

```sh
dotnet test api/src/RecipeApi.Tests/RecipeApi.Tests.csproj --filter FullyQualifiedName~FamilyCreationPostgresTests
```

Return the passed/failed/skipped counts and tested source identity; both existing
PostgreSQL tests must actually execute. A skipped run is not qualification. Do not
run `task prepare`, migrate household data or repair code merely to run this check.
A passing run would qualify only the assertions in these two tests, not the missing
stored-whitespace PostgreSQL/compatibility/collision/rename cases or historical
red/green order noted in BSL-015. No sandbox retry/escalation attempted. Keep U22,
user-required future-spec note and prior acceptance/promotion distinctions intact.

### BSL-household-identity-017 — remaining requirements coverage audit

**Authority / identity:** A35: user asks whether household identity has anything
left and conditionally directs recipe-library only if it does not. Review at
`moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus existing
dirty inputs. Current CLI inventories confirm nearest local root, zero active
changes and main household-identity with 25 requirements. All main requirement
headings compared against the plan inventory and the targeted connected paths.
This is a bounded coverage audit, not full extraction of all three remaining flows.

Domain / business purpose: household identity; maintain household actors and
choose the current browser actor. Purpose is inferred from UI and existing owner.
Existing main covers onboarding selection/recovery/Profile name display, shared
access, invites and member creation. It does not specify the following paths:

| Remaining slice | Connected evidence and important rules to inspect next | Assertions / limits |
| --- | --- | --- |
| Member renaming | `FamilyManagement`/onboarding → `FamilySelector` → `FamilyMemberList` edit/input/save/cancel → `useFamily.updateMember` → `familyStore.updateMember` → `family.ts:updateFamilyMember` → generated item PUT/OpenAPI `PUT /api/family/{id}` → `FamilyController.Update` → `FamilyService.UpdateFamilyMember` → existing EF row/name/UpdatedAt → returned DTO/store replacement/display. Edit preloads current name; save trims through store/service, blank names are rejected; cancellation resets local edit state. | `FamilyControllerTests.Update_Returns_Ok_With_Updated_Name`, `Update_Empty_Name_Returns_BadRequest`, `Update_NonExistent_Returns_NotFound`; service tests assert name/timestamp/re-fetch, blank and missing-ID paths with EF InMemory. Source reviewed, tests not-run. No focused FamilyMemberList test found in inspected test filenames. |
| Member removal (API-only scope candidate) | `family.ts:deleteFamilyMember` and store action exist; OpenAPI DELETE → `FamilyController.Delete` → `FamilyService.DeleteFamilyMember` → EF remove/save → 204. No delete control in the inspected FamilyMemberList. Do not invent a user-facing removal journey or safe deletion guarantees. | Controller tests assert 204 and absence on later list, plus missing-member 404; service tests use InMemory. Referenced-member FK effects, current-identity recovery and actual client callers need a separate bounded trace before normative claims. |
| Switch active member from Profile | `profile/page.tsx` → `ProfileDropdown` → callback → `selectFamilyMember` cookie/store action, onboarding completion and `router.push(HOME)`. Profile does not await selection before requesting Home. Existing onboarding-selection requirement does not own this distinct trigger/handoff. | Profile unit test stubs dropdown, hook, router and completion; it asserts only stub rendering. Persistence browser tests cited in BSL-001 do not qualify this whole flow. No current runtime result; no atomic/durable switching claim. |

**Dependencies / uncertainty:** Renaming/removal depend on identity shared access,
OpenAPI/client/DTO mapping, EF and PostgreSQL relationships/constraints; Profile
switching depends on cookies/server actions, Zustand and router instead of a new
member write. The current unique-name SQL index can affect rename, while the
rename service has no explicit creation-style duplicate-exception translation.
Contract documents PUT 200/DELETE 204, without their inspected 400/404 negative
responses. These are discovery questions/mismatches to reconcile, not permission
to fix the contract, implement uniqueness on rename or promise deletion safety.
Preferences remain owned by member-preferences; demo/preview/deployment variants
remain deferred under A09. Creation runtime/provenance issues remain deferred A34.

**Classification / confidence:** Presence of the three source paths and absence of
corresponding main requirements are implementation/content-supported; no new
behavior runtime-verified. High confidence in the coverage gap, medium in complete
flow semantics until selected tracing and assertion/configuration reconciliation.
No requirement/scenario mapping created for unextracted behavior. Checks: CLI
inventories passed; source/assertion inspection completed; application/browser/API/
PostgreSQL checks not-run, behavior TDD not-applicable to this plan edit. Final
bounded documentation checks are reported in session response/current harness.

**Disposition / recommendation:** Household identity has requirements work left,
so the user's conditional recipe-library instruction is not activated. Correct the
prior sequence and discover only ordinary-household member renaming next. Removal
and Profile switching remain separate slices; defer them only by explicit decision.
No database instance is needed for source-supported requirements discovery under
A10; implementation/runtime acceptance remains separate.

## Promoted slice — household identity / member renaming

### BSL-household-identity-018 — edit and save an existing member name

**Authority / identity:** A36: user “accepted proceed” to the recommendation to
discover member renaming. Scope: source/assertion discovery and durable plan only;
A34 implementation/database deferral continues. Branch/HEAD:
`moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`, with the existing
staged/mixed family service/controller/SQL/tests and other dirty inputs preserved.
Those existing uniqueness edits affect this trace; they are not this session's work.

| Discovery field | Finding |
| --- | --- |
| Domain / purpose | Household identity: correct a displayed household actor name while retaining the actor's existing ID. Purpose inferred from connected edit controls; no personal-account or ownership system implied. |
| Implemented capabilities | Edit a displayed member in the shared onboarding/Settings list; preload name; cancel/reset; submit nonblank trimmed name; update existing record and return mapped member; replace that member in client list. |
| Important workflow | Onboarding or Settings → FamilySelector → FamilyMemberList pencil → input → Save/Enter → store/client PUT → controller/service/EF → 200 envelope → store replacement → updated label and editor close. |
| Business rules | Any displayed row has edit, including the selected row; edit click stops propagation to selection. Store/service trim; service rejects blank; same ID is updated with new UpdatedAt, keeping other entity fields. No selected-ID/cookie/navigation write in rename. Case is preserved after trimming. |
| Dependencies | Shared household access; React local state; Zustand/useFamily; Kiota JSON/client; global success filter/error middleware; EF/Npgsql and installed schema; current-member display uses existing identity owner. |
| Excluded | Creation uniqueness as rename policy, API removal, Profile switching, preferences, cross-device propagation guarantees, demo/preview/deployment qualification, new UX/error handling, tests or repairs. |
| Evidence / confidence | Implementation-supported, medium overall confidence: positive path aligned; negative/constraint/validation differences and browser substitutions remain. No runtime-verified rename behavior in this session. |
| Artifact status | Discovery candidate only. Main remains 25 requirements/70 scenarios; no rename delta/change/spec created and no acceptance/promotion/archive action. |

**Ordered source trace and observable result:**

1. `pwa/src/app/(auth)/onboarding/page.tsx` and Settings'
   `pwa/src/components/profile/FamilyManagement.tsx` render `FamilySelector`, which
   supplies the loaded list to `pwa/src/components/identity/FamilyMemberList.tsx`.
   Editing preloads the row's name and autofocuses the input. Cancel/Escape clears
   local editing state without issuing PUT; reopening reloads the member name.
   Save is disabled for trimmed-blank input and while shared `isLoading` is true.
   Enter invokes the same `handleUpdate`; blank input returns without request.
2. `useFamily.updateMember` exposes `pwa/src/store/familyStore.ts:updateMember`.
   The store trims, ignores blank input, sets loading/clears old error, and awaits
   `pwa/src/lib/api/family.ts:updateFamilyMember`. The adapter invokes generated
   `api.family.byId(id).put({name})` in
   `pwa/src/lib/api/generated/api/family/item/index.ts`, whose metadata uses PUT,
   JSON and the `data` response decoder. It has no explicit PUT error mappings;
   request name is optional/nullable in the generated representation despite the
   contract's required string. `api-client.ts` uses configured public API base URL
   or same origin and may inject current-member context; no new auth policy here.
3. `specs/openapi.yaml:PUT /api/family/{id}` requires UUID path/name body and
   documents 200 member envelope. `FamilyController.Update` receives
   `UpdateFamilyMemberDto` and calls `FamilyService.UpdateFamilyMember`; global
   Program authorization remains the access owner. There is no action-level
   member-ID binder/actor ownership comparison; do not describe this as own-name
   only permission. The contract's member-ID security notation and global access
   must not be interpreted as proven per-member authorization enforcement.
4. Service trims, rejects blank via ArgumentException, loads by existing ID or
   throws KeyNotFoundException, sets Name/UpdatedAt, awaits SaveChangesAsync and
   returns the same entity. `RecipeDbContext.FamilyMembers`, `FamilyMember` and
   `api/database/schema.sql` map existing UUID/name/varchar(100)/timestamps. Current
   schema and compatibility SQL contain the normalized unique-name index; neither
   schema execution nor PostgreSQL constraint behavior was observed here.
5. Controller returns `Ok(ToDto(member))`; `SuccessWrappingFilter` produces `data`.
   Adapter requires a truthy ID, returns name/defaulted browse/language and drops
   timestamps. Store replaces only the matching original ID in the array; no
   reload/re-sort or selection/cookie change. `FamilyMemberList` exits edit mode
   after the store promise resolves, displays new name/title; `useFamily` resolves
   the selected member against this list, supporting updated current-name display
   through existing Profile requirements. No family workflow or SSE publish exists
   in this update path; no automatic other-device refresh guarantee.

**Negative/pending behavior and mismatches (U23/U24):** Store catches request or
adapter errors, sets store error, clears loading and resolves normally without
replacing the member. List therefore exits edit even on failure. Onboarding renders
the shared error alert; Settings' management/list does not consume it. No inline
retained-input/retry guarantee. Save/Cancel buttons disable while loading, but the
input and Enter/Escape handlers do not; a keyboard action can bypass those button
states. There is no handler/store busy guard, request cancellation or atomic
multi-edit coordination. Do not claim all edits locked, exactly-once submission,
safe cancellation of in-flight updates or universal pending/recovery behavior.

Update DTO has required C# string but no explicit MaxLength/Required annotations;
service has no max-length or duplicate precheck/translation in this method. Entity
max-100 metadata and SQL varchar(100) differ from input/contract constraints. The
installed unique index may reject conflicting rename; an unhandled DbUpdateException
maps to generic 500 through `ErrorHandlingMiddleware`, rather than creation's 409
catch. Service blank/missing exceptions map to 400/404, but PUT OpenAPI documents
only 200. Withhold complete validation/status parity, duplicate rejection policy,
and preservation across concurrent/constraint failures until settled. No fixes.

**Inspected assertions and substitutions:**

- `FamilyControllerTests.Update_Returns_Ok_With_Updated_Name` asserts 200, new name,
  stack default; `Update_Empty_Name_Returns_BadRequest` and
  `Update_NonExistent_Returns_NotFound` assert statuses. Factory defaults to auth
  omitted and EF InMemory; no production access/SQL qualification follows.
- `FamilyServiceTests.UpdateFamilyMember_Updates_Name_And_UpdatedAt` asserts new
  name, increasing timestamp and re-fetch; blank/whitespace and unknown-ID cases
  assert exceptions. `TestDbContextFactory` is EF InMemory. No rename duplicate,
  PostgreSQL length/constraint, concurrency or full preference-preservation runtime
  result was found in this bounded inspected set.
- `pwa/e2e/settings.spec.ts` test “family member name can be edited from settings”
  fills/saves Jordan Chef and asserts updated list label. A per-test PUT override
  returns a fixed 200 with only ID/name: no request-body assertion, server mutation,
  subsequent GET/reload, selection retention or failure assertion. Its response
  omits other contract-required fields. Layout tests open the editor/click Cancel
  and check fit; they do not assert no request, reset, Escape/Enter or failure.
  Shared fixtures/routes inject identity/access and substitute API; tests were
  inspected, not run. No focused FamilyMemberList unit file found by bounded test
  search; that is not a claim of repository-wide absence.
- `docs/user-guide.md` is consistent with shared household identity but provides
  no inspected detailed rename/constraint/recovery guarantee. Shared rule owners
  and creation's desired uniqueness remain separate from supported rename policy.

**Checks / disposition / next decision:** Read-only OpenSpec inventories passed:
nearest repository root, no active changes, household identity 25 requirements.
Source and test assertion inspection completed; application/browser/API/live/
PostgreSQL checks **not-run** (A34), TDD **not-applicable** to the plan edit. Final
plan-only verification results/content identity in session response/current harness.
Recommendation: authorize a documentation-only rename draft covering normal
edit/cancel, trimmed nonblank save, existing-ID update/200 and returned-label display
without selecting another member. Retain U23/U24 non-normatively under A12; no
unsettled duplicate/validation/recovery promises. Generation not authorized by
this discovery approval; any future draft carries BSL-015's required historical
status sentence as a non-normative note. API removal and Profile switching follow
as separate discovery slices after this one; recipe-library remains queued.

### BSL-household-identity-019 — member-renaming draft and scenario mapping

**Authority / identity:** A37: user “propose”, 2026-10-15, explicitly authorizes
only the bounded rename proposal/delta/design/tasks and plan updates. CLI context
resolved nearest repository root `/Users/alex/Code/whats-for-supper`; no store
selection or reconfiguration. CLI scaffold created metadata before artifact writes.
Branch/HEAD unchanged at `moving-to-openspec` /
`7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus dirty inputs recorded in BSL-018.
Relevant discovery inputs rechecked unchanged: shared editor, family store/adapter,
generated item PUT, service/controller, OpenAPI, schema and Settings browser tests.
The full main spec was re-read; no existing requirement redefined.

**Artifacts / status:**
[proposal](../../openspec/changes/archive/2026-10-16-baseline-household-identity-member-renaming/proposal.md),
[delta](../../openspec/changes/archive/2026-10-16-baseline-household-identity-member-renaming/specs/household-identity/spec.md),
[design](../../openspec/changes/archive/2026-10-16-baseline-household-identity-member-renaming/design.md),
[tasks](../../openspec/changes/archive/2026-10-16-baseline-household-identity-member-renaming/tasks.md)
and CLI metadata. All four planning artifacts exist; no optional artifact omitted.
Design captures cross-layer contract/constraint ambiguity and extraction choices.
Four completed tasks concern extraction/reconciliation/documentation validation only;
none describes application implementation. CLI complete/ready flags mean artifact
existence, not acceptance, production qualification or authorization to apply code.

| Added requirement | Scenarios | Evidence / assertion limit |
| --- | --- | --- |
| Open an existing household member name for editing | Edit from onboarding; Edit from Settings | BSL-018: both callers use FamilySelector/FamilyMemberList; prefilled input and controls, edit click stops selection. Settings browser test opens/fills; no current runtime result or onboarding-edit assertion. |
| Cancel an unsubmitted member-name edit | Cancel through the control; Cancel with Escape; Reopen after cancellation | BSL-018: cancelEditing resets local state; reopening reads current loaded member; unsubmitted-only avoids promising request cancellation. Layout browser assertions click Cancel but do not prove no request/reset/Escape; remaining scenarios source-supported. |
| Submit a trimmed nonblank member-name edit | Submit with Save; Submit with Enter; Blank name is not submitted | BSL-018: handlers/store trim and guard blank; Save disabled for blank. Browser saves a substituted success but does not assert request body; service tests assert blank exceptions. Trim/case/Enter scenarios source-supported, not runtime-qualified. |
| Update and return the existing household member | Successful rename response; Saved name is available on later listing | BSL-018: OpenAPI 200/data, controller/service same-ID Name/UpdatedAt save, entity preferences/creation untouched and list reads persisted rows. Controller asserts 200/name/browse default; service asserts timestamp/re-fetch via InMemory. Full fields, real SQL and later-list scenario are source-supported only. |
| Display a renamed member without changing active identity | Rename another member; Rename the selected member | BSL-018: adapter/store row replacement, editor closure, no selected-ID/cookie/completion/navigation action; existing selected-name owner reused. Settings test asserts new Jordan label through fixed response, without retention/persistence assertions. Selected-member scenario source-supported only. |

**Reconciliation:** Five ADDED requirements/12 scenarios; no MODIFIED/REMOVED/
RENAMED blocks, new capability or main edits. Shared API access and selected-name
requirements referenced by their existing names. Positive requests require valid
nonconflicting names and successful persistence; no invented length, duplicate 409,
own-name authorization, pending-lock, rollback, retained-input or universal retry
claim. U23/U24 remain non-normative evidence. The exact BSL-015 sentence is included
in the delta as requested, labeled historical with the subsequently reported
later authorization/reference status alongside it. No prior archive reopened.

**Checks / classification:** `openspec validate baseline-household-identity-member-renaming
--strict --no-interactive` passed, exit 0. Source/assertion reconciliation supports
implementation-supported behavior, medium confidence; no rename behavior newly
runtime-verified. Final `task verify --` selects only plan plus five change files,
with documentation/content outcomes and identity in the response/harness record.
Application/browser/API/live/PostgreSQL checks **not-run** (A34), behavior TDD and
client generation **not-applicable** to this edit. All unrelated staged/unstaged
work and the deleted navigation spec remain outside task ownership.

**Disposition:** Drafted and validated, pending human review. Acceptance, promotion
and archival are each unauthorized in this session. Next action is review of this
draft; API removal and Profile switching remain separate discovery, library queued.

### Member-renaming main-spec promotion record — 2026-10-15

A38 directly authorizes promotion of the reviewed bounded rename delta and a
continuation prompt; it does not authorize archival, application implementation or
the next slice's generation. No separate acceptance message was supplied. The
installed sync-specs workflow resolved `planningHome.root` and the sole delta via
`artifactPaths.specs.existingOutputPaths`; current specs instructions were fetched
before the main write. Five ADDED requirements/12 scenarios were appended verbatim.

Main household identity now has 30 requirements/82 scenarios. The previous file
is an exact byte prefix, preserving title, Purpose, page-gate preamble and all 25
prior requirements/70 scenarios. One Requirements section and no delta operation
headings remain. The delta/proposal/design/metadata are unchanged. Its requested
historical status note remains in the delta and plan, outside normative additions.
BSL-018/019 mapping, U23/U24 and A34 deferral remain unchanged; promotion is no
runtime observation or constraint/error-handling repair.

Checks: `openspec validate --specs --strict --no-interactive` passed (1/1);
`openspec validate household-identity --type spec --strict --no-interactive` passed.
Final three-path `task verify --` selects main, rename task follow-up and this plan;
check outcomes/content identity are reported in session response/current harness.
Runtime checks not-run; behavior TDD not-applicable. The rename change remains
active; no archive move, commit, staging, database or application action performed.

### Next-session requirements handoff

A38 handoff retained for provenance; the removal discovery requested below is
now completed by A39/BSL-020/021. Use the latest checkpoint for the next action.

Household identity is not complete. Next: **API member removal**, one bounded
read-only workflow slice. Profile switching is still pending after that. Preferences
retain their separate owner; deferred runtime/provenance issues do not block
source-supported requirements work under A10/A34.

Start from `FamilyController.Delete`, `FamilyService.DeleteFamilyMember`,
`family.ts:deleteFamilyMember`, `familyStore.removeMember`, OpenAPI DELETE and
FamilyControllerTests/FamilyServiceTests. Resolve actual UI/API callers before
claiming a user-facing delete journey. Trace persistence relationships/SQL FK
behavior, referenced versus unreferenced member deletion, missing IDs, authorization,
client selection/cookie cleanup and subsequent list/current-member results.
Inspect assertions and substitutions; withhold disputed guarantees. Do not execute
deletion, launch services, fix gaps, request database access or reopen prior archives.
Update this plan with evidence/limits and the next focused drafting recommendation;
no generation until that bounded slice is explicitly authorized. If current source
or approvals show removal is already extracted, select remaining Profile switching;
only after identity coverage is reconciled complete, select recipe-library list
visibility. Do not extract multiple capabilities in one session.

## Reviewed slice — household identity / API member removal

### BSL-household-identity-020 — API removal, relationships and subsequent reads

**Authority / source identity:** A39, discovery/review and this plan only, at
`moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus existing
staged/unstaged inputs. Reuses BSL-017's removal starting points and BSL-001/004/005
identity/access boundaries; rechecks current controller/service, client, tests,
EF and SQL rather than assuming HEAD represents the dirty implementation.
Current family controller/service/tests, schema/compatibility SQL, OpenAPI,
IdentityValidator, family-management UI and mock edits predate this review.
A34 deferral, BSL-018/019, U23/U24 and BSL-014–016/U19–U22 remain unchanged.

| Discovery field | Finding |
| --- | --- |
| Domain / purpose | Household identity: remove a household actor from the member registry. Purpose inferred from API operation and physical row removal; no personal-account erasure or user-facing deletion journey implied. |
| Selected workflow | API consumer/client DELETE → approved operation → controller/service → EF/SQL → 204 on successful save → subsequent family list/current-member lookup. Browser helper/state consequences are inspected evidence, not a connected journey. |
| Implemented behavior / rules | UUID target; existing row physically removed after lookup and successful save; no soft-delete, last-member guard, replacement identity, explicit dependent lookup/reassignment or member-ownership comparison. List reads remaining rows ordered by name. |
| Dependencies | Existing household authorization, Kiota transport/base URL, exception middleware/success filter, EF/Npgsql, installed SQL relationships; browser cookie actions and conditional identity validator are separate boundaries. |
| Exclusions | New delete UI/confirmation, safe account erasure, reassignment, total history cleanup, browser/cross-device synchronization guarantees, preference policy, Profile switching, demo/preview/deployment qualification and all implementation fixes. |
| Class / confidence | Implementation-supported; high for the simple controller/service path with matching unreferenced InMemory assertions; medium overall because relational side effects, failure paths and browser cleanup lack qualification. Runtime verified: none in this session. |
| Status | Reviewed evidence/candidate only; no removal change or normative additions. Main remains 30 requirements/82 scenarios; active rename and all archive artifacts preserved. |

**Ordered trace and observable results:**

1. Caller search in `pwa/src`/`pwa/e2e` finds
   `pwa/src/lib/api/family.ts:deleteFamilyMember` called by
   `pwa/src/store/familyStore.ts:removeMember`, exposed by `useFamily.ts`.
   No component invokes removal. Inspected `FamilyManagement` → `FamilySelector`
   → `FamilyMemberList` offers selection, add, rename and optional invite, without
   a delete control. API controller tests are actual test callers. Do not infer
   a Settings/onboarding delete journey from an exported helper or mock route.
2. Adapter awaits generated `api.family.byId(id).delete()` in
   `pwa/src/lib/api/generated/api/family/item/index.ts`; metadata targets
   `/api/family/{id}` using `sendNoResponseContent`, without DELETE error mappings.
   No body/DTO returned. `api-client.ts` selects `NEXT_PUBLIC_API_BASE_URL` or
   same origin and injects selected/readable-cookie member context; shared-access
   transport/origin limits remain BSL-004/U15, not a new removal policy.
3. `specs/openapi.yaml:DELETE /api/family/{id}` declares required UUID path ID,
   member-header security metadata and only 204 Deleted. Actual
   `FamilyController.Delete(Guid id)` has `{id:guid}` routing, awaits service and
   returns `NoContent()`. It has no member-context binder, own-ID comparison,
   admin role or demo check. `Program.cs` globally requires authenticated shared
   household access. `HearthAuthenticationHandler` uses configured `HEARTH_SECRET`
   and raw header/Bearer/`h_access` paths; reuse shared-access requirements rather
   than treating the member header as personal authorization (U08/U14/U25).
4. `FamilyService.DeleteFamilyMember` finds the row or throws
   `KeyNotFoundException`, calls `FamilyMembers.Remove`, then `SaveChangesAsync`.
   No worker/workflow/SSE publish, explicit related-record update, cookie action
   or external cleanup occurs in this path. `FamilyMember`/`RecipeDbContext` map
   `family_members`; Program selects Npgsql using `POSTGRES_CONNECTION_STRING`
   or `ConnectionStrings:DefaultConnection`. No connection values inspected.
5. With successful save, controller returns 204 without `data`; the global
   `SuccessWrappingFilter` wraps ObjectResult, not this NoContentResult.
   Later authorized `GetAll` → `GetAllFamilyMembers` reads remaining rows ordered
   by Name and returns mapped members in `data`, excluding the deleted ID.
   `GetMe` reuses header-then-cookie GUID binding: a still-supplied deleted ID
   finds no row and returns 404; no parseable identity returns 401. A valid other
   header can still resolve its existing member. GET-me 404 remains the existing
   U13 contract mismatch, not newly accepted normative error behavior.

**Referenced versus unreferenced members — declarative evidence, not DB results:**

| Relationship / source | Declared removal effect | Qualification limit |
| --- | --- | --- |
| `recipes.added_by` / RecipeDbContext Recipe | SET NULL, preserve recipe rows | Soft-deleted recipes are query-filtered in EF but still covered by SQL FK; no live observation. |
| `recipe_import_reports.reported_by`, `updated_by` / RecipeImportReport mapping | SET NULL, preserve report rows | Both nullable relationships agree in EF/SQL; no removal test asserts this. |
| `recipe_votes.family_member_id` / RecipeVote mapping | CASCADE deletes member votes | Does not establish refreshed vote totals, plans or search-affinity caches; no recompute/broadcast in delete service. |
| `feature_flag_overrides.member_id` / FeatureFlagOverride mapping | CASCADE deletes overrides | `compatibility.sql` also declares this when creating the table; installed schema not inspected. |
| `maintenance_commands.requested_by` / schema.sql | SET NULL, preserve commands | Model has scalar RequestedBy without a member navigation/EF FK mapping; InMemory/EnsureCreated cannot qualify this SQL-only relationship. |
| `recipes.deleted_by` / schema.sql and Recipe model | Nullable UUID with no declared member FK | No automatic nulling/erasure supported; arbitrary member IDs in JSON/payloads are not FK cleanup guarantees. |

No RESTRICT/NO ACTION member FK appears in the inspected schema declarations;
this does not establish every deployed schema or guarantee referenced deletion.
An unreferenced member takes the simple remove/save path; a referenced member
relies on actual installed constraints and EF tracking. Withhold universal safe
removal, preservation/erasure of all history and transactional cross-client cleanup.

**Negative paths / contract limits (U25):** Missing valid UUID → service exception
→ `Middleware/ErrorHandlingMiddleware` JSON 404 (`status`, `message`), not a
repeat-success 204. A sequential retry after success therefore reaches missing
ID; concurrent races are unqualified. Malformed IDs fail the GUID route constraint;
no runtime status assertion was found for them. Save/FK/provider exceptions lack
special translation here and fall through to generic 500 with generic message.
No all-members/self/last-member restriction is implemented. DELETE only documents
204, and its member-header metadata differs from actual global shared-access
checks. Record 404/500/authorization differences; do not repair or promise complete
negative-status parity, admin-only/self-only access, or universal repeat success.

**Tests / actual assertions and substitutions:**

- `FamilyControllerTests.Delete_Returns_NoContent_And_Member_Is_Gone` creates an
  unreferenced member, asserts DELETE 204 and absence of ID on later GET. It does
  not assert empty body, dependents, surviving other members, cookies or `/me`.
  `Delete_NonExistent_Returns_NotFound` asserts only 404 for random valid UUID.
- `FamilyServiceTests.DeleteFamilyMember_Removes_Member` creates Frank then asserts
  absence in subsequent service list; missing-member test asserts
  `KeyNotFoundException`. `Infrastructure/TestDbContextFactory` uses fresh EF
  InMemory. No removal relational constraint/failure/concurrency assertion found.
- `TestWebApplicationFactory.CreateAsync()` defaults to auth omitted, InMemory,
  seeded default member, test server and mocked orchestration/storage. Optional
  PostgreSQL override does not mean these tests use it. `AuthEnforcementTests`
  enables auth but exercises recipe description/health, not family DELETE.
  `FamilyCreationPostgresTests` qualifies creation candidates only, not removal.
- `pwa/src/lib/api/family.test.ts` asserts POST contract/201 decoding/409 with
  substituted fetch, without DELETE assertions. Bounded filename/symbol search
  found no dedicated removal-store or connected removal-browser test.
  `pwa/e2e/mock-api.ts` returns DELETE 204 without mutating its family list;
  its `/me` stub supplies a successful synthetic profile rather than checking
  member existence. Mock success cannot establish subsequent absence or recovery.
- Relevant documentation: OpenAPI names deletion with only 204;
  `docs/architecture.md` describes shared access/member cookies and broadcasts
  for planning/grocery/voting, not family-removal broadcast. README provides no
  deletion journey. Reuse prior identity evidence, not retired feature inventory.

### BSL-household-identity-021 — disconnected client removal and stale identity

`familyStore.removeMember` sets loading/clears old error, awaits API deletion,
then compares target ID to selected ID with exact string equality. If selected,
it awaits `auth.ts:clearFamilyMemberCookie` then calls
`identity/cookie.ts:removeFamilyMemberIdCookie`; only afterward does it filter the
local list and set selected ID null. For another member it filters only matching
ID and retains selection. It ends loading without navigation, replacement-member
selection or onboarding-completion changes. This is an exposed helper, not a UI
capability. Case-insensitive UUID matching elsewhere does not apply to this action.

API rejection leaves local list/selection unchanged and records error; the action
catches and resolves. Cookie-action failure after server success also records
error and leaves local list/selection stale; server deletion is not rolled back.
No busy guard, cancellation, repeat suppression or atomic cookie/state cleanup.
Server cookie deletion uses name-only cookies().delete; readable fallback expiry
specifies root path/SameSite but omits the configured domain used at creation.
Cookie-domain/HTTPS/origin delivery and cleanup success remain unverified (U15).

A direct API DELETE neither changes requesting/other browser stores nor expires
identity/access cookies. After later successful family reload, `useFamily` finds
no selected-member object for the deleted ID. `IdentityValidator` attempts clear
and onboarding redirect only when `hasLoaded`, ID absent and loaded list is
nonempty; it does not await `selectFamilyMember(null)`. An empty list after deleting
the final member does not trigger that branch. Loaded lists are not automatically
invalidated by this API; existing `hasLoaded` may prevent another fetch. Load failure
also sets `hasLoaded`, so this is not proof of a fresh authoritative list. PWA
`proxy.ts` checks nonempty member-cookie presence, not row existence; API `/me`
404 is collapsed to null by `getCurrentFamilyMember`, and recovery does not clear
an already selected ID on null. No universal automatic recovery claim (U13/U26).
Prior persistence/browser tests use substituted APIs and do not assert a real
DELETE → list → stale-cookie/current-identity lifecycle.

**Evidence identity / checks / disposition:** BSL-020/021 use the 35-path SHA-256
manifest (sorted `path + space + file-digest + newline`):
`dce614e9dbefd6afaa4285eccdc4a323dc5b27b36204bcc0a029baf853c3f035`.
All paths are the immediate source/test dependencies named above plus main
identity spec. Runtime API/browser/DB checks **not-run** under A34 and explicit
session scope; no deletes, services or database-access requests. Behavior TDD and
application/client-generation checks **not-applicable** to this plan-only edit.
CLI root/stores/active/spec inventories passed; full identity spec reviewed and
contains no removal requirements. Final bounded documentation results belong to
session response/current harness, not to runtime verification.

**Bounded draft boundary — confirmed A40:** Prepare only a separately authorized
`baseline-household-identity-member-removal` documentation
change: successful authorized ordinary-household DELETE for an existing member
when persistence succeeds (204/no content), and absence on a subsequent successful
family-list read. Use an unreferenced-member scenario; avoid an invented connected
UI. Retain FK effects, missing-ID/retry/provider errors and browser cleanup/recovery
as non-normative U25/U26 evidence under A12; reuse existing shared-access and
identity requirements without adding personal authorization or universal recovery.
User “yes” confirms this limited normative boundary and non-normative treatment
(A40); it does not authorize generation. Future authorized draft must carry BSL-015's
exact historical status sentence outside normative requirements. A41 subsequently
authorizes the bounded draft recorded in BSL-022; it is not accepted, promoted or
archived. Profile switching stays pending after removal.

### BSL-household-identity-022 — member-removal draft and scenario mapping

**Authority / identity:** User “draft” (A41), following A40's settled boundary.
CLI-scaffolded `baseline-household-identity-member-removal` using the configured
spec-driven schema and nearest repository root. No store selected or configured;
no root initialization. Branch/HEAD unchanged; all 35 BSL-020/021 evidence inputs
rehashed unchanged before drafting. Reuse those traces, actual assertions,
dependencies, negative paths and medium overall confidence without another scan.
Behavior is implementation-supported; no current removal runtime result.

**Artifacts / status:** [Proposal](../../openspec/changes/archive/2026-10-16-baseline-household-identity-member-removal/proposal.md),
[delta](../../openspec/changes/archive/2026-10-16-baseline-household-identity-member-removal/specs/household-identity/spec.md),
[design](../../openspec/changes/archive/2026-10-16-baseline-household-identity-member-removal/design.md),
[tasks](../../openspec/changes/archive/2026-10-16-baseline-household-identity-member-removal/tasks.md) and
CLI-created `.openspec.yaml`. All four planning artifacts exist; strict selected
change validation passed, exit 0. Design included because authorization metadata,
relational effects and separate browser cleanup create material baseline ambiguity;
it is extraction rationale, not a new implementation design. Two ADDED blocks,
two scenarios, no MODIFIED/REMOVED/RENAMED operations or new capability.
Requirement descriptions are 282 and 146 characters (installed limit 500).

| Draft requirement | Scenario | Evidence / limits |
| --- | --- | --- |
| Remove an existing household member through the API | Remove an unreferenced member | BSL-020: OpenAPI 204, controller awaits delete/service save then NoContent; filter does not wrap it. Controller test asserts 204, service test asserts absence; neither asserts response-body emptiness. Existing shared-access owner reused; DELETE auth not qualified by auth-disabled removal tests. |
| Exclude a removed member from subsequent family listing | List members after removal | BSL-020: fresh GetAll/GetAllFamilyMembers query and data envelope; controller test asserts ID absent after DELETE and GET, service test asserts absence. Both use InMemory; no relational/browser mutation qualification. |

**Normative review:** Positive cases are conditional on successful persistence and
subsequent successful read, with unreferenced-member scenarios. No connected UI,
referenced-member safety, FK cascades/nulling, missing-ID/retry/provider statuses,
member-specific permission or atomic/browser/cross-device cleanup guarantee added.
U25/U26 remain non-normative under A40 and existing identity/access owners remain
unchanged. Delta carries BSL-015's exact requested historical sentence outside
normative additions, plus the pending later-authorization-reference caveat. Earlier
creation limitations, BSL-018/019 and U23/U24 are preserved.

**Checks / disposition:** Selected strict OpenSpec validation and structural
2-requirement/2-scenario review passed; final six-path documentation/content checks
are reported in session response/current harness. Runtime API/browser/PostgreSQL
checks **not-run** under A34. Behavior TDD/application tests/client generation are
**not-applicable** to this documentation-only edit. No service/database/deletion
execution. Main remains unchanged 30/82; rename remains active. This is a validated
draft for human review, not acceptance, main promotion, archival or application
qualification. No successor slice extracted.

### BSL-household-identity-023 — member-removal draft acceptance-readiness review

**Authority / identity:** A42 review/evidence only, at the same branch and HEAD.
Read-only CLI discovery resolves the nearest repository root to
`/Users/alex/Code/whats-for-supper`, with no registered stores; configured schema
remains `spec-driven`. Both removal and rename remain active, each 4/4 extraction
tasks complete. CLI `complete` is artifact/task readiness, not human acceptance.
All 35 BSL-020/021 paths rehashed unchanged, reproducing
`dce614e9dbefd6afaa4285eccdc4a323dc5b27b36204bcc0a029baf853c3f035`.
Reuse that trace rather than rescan unaffected source. Only this plan is edited.

**Review findings:** No blocking normative issue found; recommend accepting the
exact A41 delta as a source-supported baseline, then separately authorizing its
promotion. No delta or other change-artifact revision is needed.

- Both additions match A40: successful authorized ordinary-household deletion,
  conditional on successful persistence, and absence on a later successful list.
  Both scenarios use an existing unreferenced member. No unconditional
  referenced-member safety or error/retry outcome is promised.
- Main's 30 requirements/82 scenarios were reviewed including scenarios. Existing
  listing concerns onboarding selection; create/rename later-list scenarios concern
  their own triggers. Removal adds a distinct trigger without duplicating them.
  Shared API authentication remains owned by the existing requirement; current
  identity resolution/recovery is neither amended nor expanded by this delta.
- Reinspected `FamilyController.Delete`/`GetAll`/`GetMe`,
  `FamilyService.DeleteFamilyMember`/`GetAllFamilyMembers`, OpenAPI DELETE,
  `SuccessWrappingFilter`, controller/service assertions and factory substitutions.
  Source supports remove/save before 204, an unwrapped NoContentResult, and a fresh
  remaining-members query wrapped in `data`. The controller deletion test asserts
  204 and later ID absence; it does not explicitly assert an empty body or the GET
  status. Service assertions establish list absence within the InMemory test path.
  Default factory auth is omitted; neither test qualifies DELETE authorization,
  real relational effects or browser/current-identity recovery. No tests were run.
- No-body and authorization wording have source/contract or shared-owner support,
  not direct runtime qualification. Existing BSL-022 mapping correctly distinguishes
  these from actual assertions. U25 metadata/errors/FK effects and U26 disconnected
  helper/partial cleanup remain non-normative; no deletion UI is invented.
- BSL-018/019, U23/U24 and creation history remain intact. The exact BSL-015
  sentence and pending later-authorization-reference caveat remain outside ADDED
  requirements. A34 deferral is retained and is not an extraction blocker under A10.

| Status dimension | Review result |
| --- | --- |
| Discovery | Reconciled with existing U25/U26 limits; no new consequential unknown |
| Artifact | Validated draft; proposal/delta/design/tasks/metadata unchanged |
| Review | Agent review complete; human acceptance pending, recommended ready |
| Main spec | Removal not promoted; existing main remains 30/82 |
| Lifecycle | Removal and promoted rename active; no archival |
| Runtime evidence | Not-run; implementation-supported, high simple-path / medium overall confidence retained |

**Check scope / handoff:** Run selected and all-item strict OpenSpec validation,
six-path artifact/content checks and plan-only
`task verify -- docs/openspec-baseline-plan.md` after this update. Exact final outcomes/content
identity belong to the response and `.task/agent-finish/last-run.json`; prior checks
are not attached to this edited plan. Runtime API/browser/PostgreSQL checks remain
**not-run** under A34/session scope; behavior TDD, application tests and generated
client checks are **not-applicable** to the documentation edit. No database access,
services or deletions. Preserve the index, unrelated edits/deletions, main and both
active changes. Stop for the focused human acceptance decision; promotion and
archival need separate authorization. Profile switching remains next after removal;
recipe-library visibility stays queued. No successor capability extracted.

### Member-removal main-spec promotion record — 2026-10-15

**Authority:** A43, user “promote” following BSL-023 review of the exact 2/2 delta.
Direct promotion authorization is recorded separately from the prior review; no
separate acceptance statement or archival authority is inferred. This promotes the
reviewed requirements only, without accepting runtime/application qualification.

**Applied content:** Appended both ADDED requirement blocks and their scenarios
verbatim from the CLI-resolved removal delta into
[main household identity](../../openspec/specs/household-identity/spec.md):

- Remove an existing household member through the API — Remove an unreferenced member.
- Exclude a removed member from subsequent family listing — List members after removal.

Main now contains **32 requirements/84 scenarios**. All prior main bytes, title,
Purpose and 30/82 blocks are preserved; no delta-operation header or historical
non-normative note was inserted into main. Main SHA-256 after promotion:
`493ca04ba4bdb07fe8b139dad9752d18f5c19255a69668a017dfd4fe671f5160`. Delta and its exact BSL-015 sentence/caveat remain unchanged.
BSL-020–023 mappings and U25/U26 limits still apply. All 35 evidence inputs matched
the recorded manifest before promotion; only the main-spec input changes now.
Application inputs and rename artifacts remain unchanged, with BSL-018/019,
U23/U24 and historical creation limitations retained.

**Status / checks:** Main-spec sync is promoted under A43; removal and rename stay
active. Four extraction tasks remain complete; follow-up status records promotion.
Run main-spec and all-item strict validation, exact append/count/preservation checks
and three-path documentation verification after final edits. Exact final outcomes
and content identity belong to the response/current harness. Runtime API/browser/
PostgreSQL checks remain **not-run** under A34; behavior TDD/application/client
checks are **not-applicable** to these documentation edits. No deletions, services,
database requests, application work or archival. Next bounded action is separately
authorized Profile-switching discovery; no successor extracted here.

## Reviewed slice — household identity / connected Profile switching

### BSL-household-identity-024 — Profile menu, selection and Home handoff

**Authority / source identity:** A44, discovery/review and this plan only, at
`moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus the existing
dirty worktree. CLI resolves nearest repository-local root
`/Users/alex/Code/whats-for-supper`, no registered stores, two active promoted
changes (rename/removal), one main spec at 32 requirements/84 scenarios. No init,
configuration or lifecycle action. BSL-001/004/005 supply shared read/gate/recovery
evidence; BSL-017 supplies the coverage-audit starting point. Recomputed BSL-014's
20-file source/test manifest matches
`acb0538483ee38b5bcc13443c935cffbc1cdf8fd90db564c2ab4e6a3ea6f1e33` unchanged;
creation, rename and removal history/limitations are retained, not requalified.

| Field | Selected scope / result |
| --- | --- |
| Domain / purpose | Household identity; choose the browser's current household actor from Profile. Purpose is consistent with the approved owner, not personal authentication. |
| Entry / selection surface | `/profile` active-member toggle opens an inline dropdown on Profile. Opening it does not navigate to onboarding or change identity. |
| Connected outcome | Choosing a loaded member requests selection, marks onboarding complete and requests `/home`; completed cookie/store action makes that ID available to subsequent requests and existing selected-name display. Home arrival with the new identity is not runtime-qualified. |
| Dependencies | Loaded family list, useFamily/Zustand, Next cookie server action and readable-cookie fallback, persisted onboarding completion, router, existing access/recovery owners. No member mutation API or background workflow is invoked by selection. |
| Exclusions | New validation/locking/error UX, preference policy, demo/preview/deployment variants, atomic handoff/rollback, post-selection cancellation, fresh server validation or cross-tab/device synchronization guarantees. |
| Status | Discovery reconciled with U27/U28; no draft, acceptance, promotion or archival. Implementation-supported, medium overall confidence; no current runtime evidence. |

**Ordered source trace / observable behavior:**

1. `pwa/src/app/(app)/profile/page.tsx`, `ProfilePage`, calls `loadFamily` only
   when `!hasLoaded`, and renders `ProfileDropdown`. Its Settings control goes to
   `/profile/settings`; it is not the switching entry. Existing app navigation can
   reach Profile; the connected switching surface stays on that route.
2. [ProfileDropdown](../../pwa/src/components/profile/ProfileDropdown.tsx) reads
   `familyMembers`, `selectedMember` and `isLoading` through
   [useFamily](../../pwa/src/hooks/useFamily.ts). During loading it renders a pulse
   placeholder in place of the toggle. Otherwise `profile-dropdown-toggle`
   toggles local `isOpen`; accessible labels are Open/Close member menu. The
   menu offers each loaded member by name, marking the matching current ID
   case-insensitively with a check and “Current family member” text. The current
   member is still selectable; there is no different-ID guard.
3. Toggle-close or a document `mousedown` outside the dropdown closes it without
   invoking `onSelect`, cookies, onboarding completion or navigation. No dedicated
   Cancel or Escape handler is implemented. This is unsubmitted-menu dismissal,
   not cancellation of a started selection. Option activation calls `onSelect(id)`
   then closes the menu synchronously.
4. Profile's `handleFamilyMemberSelected` calls `selectFamilyMember(id)` without
   awaiting it, calls `completeOnboarding()`, then `router.push(ROUTES.HOME)`.
   This differs from `pwa/src/app/(auth)/onboarding/page.tsx`, whose handler first
   awaits an initial cookie write and later uses `router.replace(HOME)`.
   Profile does not route through that page or perform its initial awaited write.
5. [familyStore](../../pwa/src/store/familyStore.ts), `selectFamilyMember`, awaits
   [setFamilyMemberCookie](../../pwa/src/lib/auth.ts), invokes
   [setFamilyMemberIdCookie](../../pwa/src/lib/identity/cookie.ts), then sets
   `selectedFamilyMemberId`. The server action writes the ID to the HttpOnly
   `x-family-member-id` cookie (one year, Lax, root path, optional configured
   domain; Secure under production/non-test/non-localhost-domain conditions).
   The fallback attempts `document.cookie` with its own HTTPS/domain flags;
   source invocation is not proof it overwrites an HttpOnly cookie. Neither action
   checks membership against the API. Selection changes browser context without
   creating, renaming or deleting a member.
6. [onboardingStore](../../pwa/src/store/onboardingStore.ts), `completeOnboarding`,
   sets/persists the completion flag in `onboarding-storage`; it does not wait for
   Home. [api-client](../../pwa/src/lib/api/api-client.ts), `HearthAuthProvider`, reads
   the selected store ID (then readable-cookie fallback) for subsequent
   `X-Family-Member-Id` headers. No `/me` request is inherent to selection.
7. Profile's `selectedMember` is a case-insensitive match against the loaded list.
   After a completed store change, existing Profile name display can show the new
   member when Profile is rendered. When a loaded selected member exists,
   `continue-as-btn` displays “Continue as {name}” and only pushes Home: it does
   not select again, write identity cookies or mark onboarding complete.

**Reads / agreement / reuse:** `familyStore.loadFamilyMembers` →
[family adapter](../../pwa/src/lib/api/family.ts), `getFamilyMembers` → generated
`pwa/src/lib/api/generated/api/family/index.ts` GET → OpenAPI GET `/api/family`
200 `data` array → `FamilyController.GetAll` →
`FamilyService.GetAllFamilyMembers` ordered EF read. Adapter maps ID/name plus
preferences into local members; GET response shape agrees with these consumers.
Profile can reuse an already loaded list; opening/selecting does not force a new
read. `hasLoaded` also becomes true after failure. No claim of fresh membership
or eligibility validation at switching time is supported.

Subsequent access/context checks remain owned by [proxy](../../pwa/src/proxy.ts),
and [IdentityValidator](../../pwa/src/components/identity/IdentityValidator.tsx)
mounted in `pwa/src/app/layout.tsx`: access is checked before nonempty member-cookie
presence; client recovery may use readable cookie or `loadCurrentIdentity` →
generated `/me` → `FamilyController.GetMe`. The existing `/me` unknown-ID 404
contract omission and collapsed null/error result remain BSL-001/005 limits.
Validator missing-member cleanup needs a nonempty loaded list and does not await
clearing. These are shared limitations (U13/U26), not new switching guarantees.
Configured cookie scope, HTTPS/test environment and API origin affect the handoff;
no deployed browser/environment was inspected.

| Main requirement owner | Coverage decision |
| --- | --- |
| List existing household members for selection; Select an existing member from onboarding | Already owns onboarding list/loading/error/selection, not the Profile menu trigger or Profile's unawaited Home push. Reuse API listing evidence without copying onboarding scenarios. |
| Display the selected member on Profile | Already owns the resulting loaded name and case-insensitive match; reference it rather than adding a second selected-name requirement. |
| Resolve the current member through the API; Recover identity when the protected client has no selection | Already owns `/me` and conditional recovery; selection itself is not a fresh `/me` validation. |
| Gate protected page entry with household access; Apply member context after household access | Already owns subsequent navigation gates; menu opening neither renews access nor validates membership. |
| Creation, rename, invite and API removal additions | Separate existing triggers and lifecycle boundaries; no additions or re-extraction in this session. |
| Genuinely missing Profile behavior | Menu open/list/current marker and unsubmitted dismissal; Profile-specific selection/completion/Home request; Continue-as navigation without a new selection. Only candidates for a separately authorized bounded draft. |

**Pending / failure / recovery:** List-loading placeholder is supported. Profile
does not render the store error or an explicit empty-menu message; a failed initial
load can leave an empty menu, while a prior list may remain. No automatic retry
control is provided by this surface. Unlike onboarding it shows no list-error
alert. Selection sets no busy flag, disables no choices and catches no rejected
cookie action. Home is requested and completion is marked while the action can
still be pending; rejection can leave the prior store identity, with partial cookie
effects possible. No rollback, success confirmation, selection-error feedback,
exactly-once operation or universal retry/cancellation guarantee. Existing
gate/recovery behavior may run, subject to its prior limits; it does not establish
new-identity Home arrival. U27/U28 record these exclusions without repairs.

**Actual assertions / substitutions:**

- `pwa/src/app/(app)/profile/page.test.tsx` asserts only dropdown/language stub
  rendering. Hook, router, onboarding action and dropdown are mocked; it never
  activates the real menu, option, Continue-as or cookie/store action.
- [profile browser tests](../../pwa/e2e/profile.spec.ts) preseed Alex's HttpOnly
  member cookie, use common API mocks, and assert the translated “Table's Set!”
  heading, visible Continue-as Alex and URL `/home` after Continue-as. They do not
  assert a changed identity or menu opening/selection/dismissal/pending/failure.
- [identity-persistence tests](../../pwa/e2e/identity-persistence.spec.ts) preseed
  identity and legacy `family-storage`, assert Alex across navigation/Settings and
  after a browser-intercepted family 500. Current family store is not persisted
  there. These do not exercise switching or prove server-fetch failure handling.
- [onboarding tests](../../pwa/e2e/onboarding.spec.ts) click a listed member without
  asserting the selection's destination/cookies. Their comment refers Home
  coverage to [auth-flow tests](../../pwa/e2e/auth-flow.spec.ts), whose Home assertion
  actually exercises an invite, not onboarding or Profile selection.
- [fixtures](../../pwa/e2e/fixtures.ts) inject shared access/fixed time and block
  unhandled browser API calls; [common mocks](../../pwa/e2e/mock-api.ts) return loaded
  members and synthetic successful `/me` (cookie ID, default Alex without one),
  without checking real membership. [Playwright config](../../pwa/playwright.config.ts)
  blocks service workers. Existing BSL-001 API tests assert list/envelope with
  substituted auth/InMemory EF, not this browser handoff. No focused real-dropdown
  or family-store selection test was found in the bounded filename/assertion search.

**Evidence identity / checks:** The 31 inspected source/spec/test inputs are the
paths in the ordered trace and assertion list, plus routes, English translations,
root layout, proxy, generated family/me builders and main identity spec. SHA-256
of sorted `path + space + file SHA-256 + newline` entries:
`e94ecae6411c2c30fb4639534b1e0a716c56a5061cbe3dd587b8aa9b1945d76a`.
This identifies inspected content, not runtime-tested content. CLI discovery and
20-file reused-input comparison passed. Final selected/all strict OpenSpec and
plan-only documentation/content preservation outcomes belong to the final response
and current harness record. Runtime/browser/API/database checks **not-run** under
A34/session scope; application/client generation and behavior TDD **not-applicable**
to this documentation edit. No service launch, mutation execution or DB request.

**Discovery recommendation — boundary subsequently confirmed by A45:** Confirm that the next separately authorized draft
covers only the missing Profile menu/dismissal, conditional selection/Home-request
handoff and Continue-as behavior, reusing existing list, selected-name, access and
recovery owners; keep U27/U28 non-normative under A12. Do not promise atomic
completion, fresh validation, post-selection cancellation or synchronization.
Drafting, acceptance, promotion and archival require separate authorization. Any
future authorized draft must carry BSL-015's exact sentence and historical caveat;
no draft is generated now. Household identity is not baseline-complete while this
slice remains undrafted; recipe-library visibility remains queued.

### BSL-household-identity-025 — Profile-switching draft and scenario mapping

**Authority / boundary:** A45, user “confirm boundary, proceed to draft”,
2026-10-15, confirms BSL-024's menu/dismissal, conditional selection/Home request
and Continue-as boundary with U27/U28 non-normative. Authorizes this bounded
CLI-scaffolded documentation change and plan only. No application behavior,
acceptance, promotion, archival or successor extraction is authorized.

**Evidence / identity:** All 31 BSL-024 source/spec/test inputs rechecked unchanged
at the same branch/HEAD and manifest
`e94ecae6411c2c30fb4639534b1e0a716c56a5061cbe3dd587b8aa9b1945d76a`.
Reuse the connected trace, actual assertions/substitutions and medium confidence;
no runtime observation added. Source allows mouse-outside dismissal through
`mousedown`; do not generalize it into touch, Escape or post-selection cancellation.

| ADDED requirement | Scenarios / source evidence | Assertion and qualification limits |
| --- | --- | --- |
| Offer the loaded household members in the Profile menu | Three: open choices, current-member marker including case-insensitive matching, loading placeholder. BSL-024 ProfileDropdown toggle/map/isLoading and useFamily selected-member match. | Profile unit replaces dropdown; browser tests do not open the menu or assert loading/marker. Implementation-supported only. Existing selected-name owner reused. |
| Dismiss the Profile member menu before selection | Two: toggle-close and outside mouse press. BSL-024 isOpen toggle and document mousedown close without onSelect. | No inspected assertion for dismissal. Scope explicitly precedes selection; no Escape, touch or request cancellation claim. |
| Request member selection and Home from Profile | Two: different loaded member and current member again, with successful cookie actions for identity outcome. BSL-024 real option callback, unawaited selectFamilyMember, completion/Home push, awaited cookie/fallback/store action. | No direct Profile-switch assertion. Home request and identity outcome are distinct; U27 retains pending/failure/atomicity limits. Existing access/resolution/recovery/display owners reused. |
| Continue from Profile with the loaded selected member | One: Continue-as requests Home without new selection, cookie writes or completion change. BSL-024 conditional Continue-as button and navigation-only handler. | profile.spec.ts asserts visible Alex control and Home URL with preseeded HttpOnly identity/common API mocks. No current execution, backend qualification or fresh validation implied. |

**Artifacts / status:**
[proposal](../../openspec/changes/archive/2026-10-16-baseline-household-identity-profile-switching/proposal.md),
[delta](../../openspec/changes/archive/2026-10-16-baseline-household-identity-profile-switching/specs/household-identity/spec.md),
[design](../../openspec/changes/archive/2026-10-16-baseline-household-identity-profile-switching/design.md)
and [tasks](../../openspec/changes/archive/2026-10-16-baseline-household-identity-profile-switching/tasks.md)
exist with CLI metadata. Four ADDED requirements/eight scenarios; no existing
requirement is modified. Extraction design is included for the material
cookie/store/navigation ambiguity, not a behavior repair. Delta retains BSL-015's
exact requested sentence and later-authorization-reference caveat non-normatively.
BSL-018–023/U23–26, creation history and the deleted navigation spec remain intact.

| Status dimension | Result |
| --- | --- |
| Discovery | Reconciled; U27/U28 extraction treatment confirmed A45, underlying gaps remain |
| Artifact | Validated bounded draft; all four planning artifacts present |
| Human review | Pending; no acceptance inferred from boundary approval |
| Main spec | Unchanged 32 requirements/84 scenarios; switching not promoted |
| Lifecycle | Switching, rename and removal active; no archival |
| Runtime evidence | Not-run; source-supported under A10, qualification deferred A34 |

**Check handoff / stop:** Selected strict validation passed. Final all-item strict,
four/eight count/description/preservation checks and six-path documentation/content
outcomes are in the response/current harness record. Behavior TDD, application
checks and generated-client synchronization are not-applicable to these docs;
runtime browser/API/PostgreSQL checks not-run. No services, mutations or database
requests. Stop for human review of this exact draft; acceptance, promotion and
archival remain separately authorized. Recipe-library stays queued.

### Profile-switching main-spec promotion record — 2026-10-15

**Authority:** A46, user “promote it”, immediately after the validated A45 draft.
Direct promotion of the exact four additions/eight scenarios; no separate
acceptance statement, archival or runtime qualification inferred.

**Applied:** Appended only the delta's ADDED requirement blocks verbatim to main
household-identity, preserving all preceding bytes, Purpose and shared owners.
Main is now 36 requirements/92 scenarios. The delta and its non-normative evidence
note, including BSL-015's exact historical sentence/caveat, are unchanged.
BSL-024/025 source/assertion mappings and U27/U28 limits remain applicable.
All 31 evidence inputs matched their recorded digests before promotion; main
spec is the only evidence input changed by this sync. New main SHA-256:
`bbf4dc2eaf241f573307cba356b3b9cacce340b31d6249520af02b140b54479b`.

**Artifacts / checks:** Profile switching is promoted; its task follow-up and this
plan record the lifecycle step. Switching, rename and removal stay active, without
archival. Final main/all strict validation, exact append/count/preservation and
three-path documentation/content outcomes belong to the response/current harness.
Runtime/browser/API/database checks remain not-run under A34; application/TDD and
client-generation checks are not-applicable to this documentation-only promotion.
Unrelated edits, index and deletions, including background-task-navigation, remain
preserved. No behavior, test, contract, generated client or SQL changes.

**Next boundary:** BSL-017's outstanding rename, API removal and Profile switching
requirements have now been promoted. This does not qualify runtime or deferred
variants/preferences. Recommend separately selected ordinary-household
recipe-library list-visibility discovery; no successor capability extracted here.


## Generation completion audit — 2026-10-16

### HI-G01 — scope and reconciled artifact status

The current user explicitly authorizes remaining documentation-only discovery,
reconciliation and generation for household-identity in sequential bounded slices.
This supersedes earlier recommendations to stop after one slice or move to another
capability; it authorizes no acceptance, promotion, archival, application edits or
runtime qualification. No consequential unresolved question blocked the supported
extraction: A10/A12/A17/A22/A28/A34 and the recorded slice decisions were reused.

HEAD `04a1c4570f9bbb01b47436790d4248635ac3179a`, branch
`moving-to-openspec`. Initial staged/unstaged/untracked inputs were inventoried;
a private 1,607-file content manifest and staged-diff before-image were saved before
writes. Relevant pre-existing unstaged identity edits are the member-renaming,
member-removal and Profile-switching design/delta files; those edits were read as
current inputs and preserved, not regenerated. Main identity was clean and has
36 actual requirement headers/92 actual scenario headers. Existing active and
archived slices account for those requirements; task completion/location alone
supplies no acceptance or runtime evidence. Unrelated dirty Taskfile/CI/index,
meal/library/quality/sharing and background-processing work remains outside scope.
Other capability work appeared concurrently; checks below identify their snapshots.

CLI `list --json` and `context --json` resolved the nearest repo-local root
`/Users/alex/Code/whats-for-supper`; no store selection, init or configuration write.
Installed spec-driven instructions and resolved artifact paths were used. CLI
scaffolded each new change sequentially. All three contain metadata, proposal,
design, identity delta and documentation-extraction tasks:

| Change under `openspec/changes/` | Additions | Status |
| --- | --- | --- |
| `baseline-household-identity-member-context-transport` | 3 requirements / 8 scenarios | Draft; strict validated, not accepted/promoted/archived |
| `baseline-household-identity-capture-attribution` | 1 requirement / 2 scenarios | Draft; strict validated, not accepted/promoted/archived |
| `baseline-household-identity-member-context-lifecycle` | 2 requirements / 3 scenarios | Draft; strict validated, not accepted/promoted/archived |

### BSL-household-identity-026 — shared request member-context transport

**Actor/trigger/outcome:** A person with selected browser identity uses an existing
SDK-backed journey (report Save/Resolve/import polling are inspected callers), or a
server-rendered journey uses `serverFetch`. Context is transported separately from
household authentication. **Implementation-supported; medium confidence**, no
current runtime observation.

**Ordered trace:** `RecipeDetailSheet.tsx` Save/Resolve/watch →
`pwa/src/lib/api/recipes.ts` submit/resolve/status wrappers → generated
`api/recipes/item/importReport/index.ts` or `api/recipeImports/item/index.ts` →
`pwa/src/lib/api/api-client.ts:HearthAuthProvider` → `specs/openapi.yaml`
POST/DELETE import-report and GET recipe-imports → `RecipeController` /
`RecipeImportController` → `FamilyMemberIdModelBinder` → report/import services →
`RecipeDbContext` report/recipe/workflow records. Header is selected store ID, else
readable member cookie; no value means provider adds no header. This applies to
the shared SDK, not every native fetch. Server path:
Home/server caller → `server-client.ts:serverFetch` → nonempty member cookie as
header (overwrites supplied header), access cookie forwarded separately → API.
`Program.cs` registers binder provider and shared authorization independently.
Binder GUID precedence is header then cookie, syntax-only, with no membership
lookup or fallback because a parseable header identifies an unknown member.
Endpoint statuses remain with their existing owners; `/me` is already specified.

**Assertions/substitutions:** `server-client.test.ts` supplies absent cookies and
mock fetch and asserts URL construction only. No direct provider/binder assertion
was located in targeted tests. `AuthEnforcementTests` enables real authentication
and asserts no/wrong credential 401 and a valid raw-secret request succeeds, but
not context precedence or personal ownership. Report integration tests default to
auth-disabled InMemory EF/store and an orchestrator mock that persists workflow
rows; they are not household-access or PostgreSQL qualification. Detail's
Processing→Completed fake-time test substitutes API functions and asserts returned
ID polling and terminal detail refresh, not request headers or backend policy.
Browser fixtures preseed access, mock API and block unhandled calls; Playwright
blocks service workers. These tests were inspected, not run.

**Agreement/limits:** Approved contract uses `FamilyMemberId` header security;
implementation also binds cookie and separately requires household authentication.
U14/U15 are retained; no blanket metadata parity, generic missing-ID status,
network delivery, credentials isolation or member-existence guarantee is drafted.

**Mapping / disposition:** Drafted in transport change: `Carry browser member
context on shared SDK requests` (selected precedence, cookie fallback, no readable
context); `Forward server-rendered household request context` (both cookies,
caller-header override); `Bind shared API member context independently of membership
validation` (header precedence, absent/malformed fallback, no GUID). All eight
scenarios source-supported; none runtime verified.

### BSL-household-identity-027 — initial capture attribution

**Actor/entry/outcome:** Existing bound household member submits ordinary URL/photo
capture; successful initial writes store that ID as submitter attribution in row
and initial metadata. **Implementation-supported; medium confidence.**

**Ordered trace:** `MinimalCapture` → `useCapture.submitUrl` / photo submit →
`recipes.ts:captureUrl` (generated captureUrl POST/shared SDK) / `createRecipe`
(native multipart fetch with explicit selected ID) → approved OpenAPI POST
`/api/recipes/capture-url` / `/api/recipes` → `RecipeController.CaptureUrl` / `Create`
→ shared binder → `RecipeService.CaptureUrl` / `CreateRecipe` →
`ImageService.CreateRecipeInfo` → recipe store `RecipeInfo.AddedBy`, and
`RecipeDbContext.Recipes` → `Recipe.AddedBy` / SQL `recipes.added_by`.
Service writes both before dispatch; partial disk/DB failures are not atomic.
Photo prechecks known member; URL/description do not uniformly do so. No uniform
unknown-member response is generated. EF/SQL nullable SET NULL attribution exists,
but relational deletion/history effects remain qualified under U25/A34.

**Assertions/substitutions:** `RecipeControllerTests` photo happy path asserts
202/nonempty returned ID and queued mocked workflow, not both stored attribution
fields. `recipes.test.ts` mocks state/fetch and asserts top-level/wrapped ID parsing,
not backend persistence. `RecipeDescribeIntegrationTests` explicitly asserts row
and metadata AddedBy plus creation timestamp; it covers description, not URL/photo.
Factory defaults to InMemory EF and recipe store with mocked orchestration; no
PostgreSQL/browser/current runtime result. `SyncRecipeProcessor` changes content
fields without assigning AddedBy, but no universal lifetime-retention guarantee is
extracted. Public nullable addedBy DTO/contract projection stays library-owned.

**Mapping / disposition:** Drafted `Attribute initial URL and photo captures to the
bound member`, two scenarios for successful initial URL/photo persistence. The rule
adds attribution only, referencing capture acceptance/dispatch/readiness ownership.
Existing description, PDF and sharing attribution is reused, not regenerated.

### BSL-household-identity-028 — capturer/reporting owner reconciliation

**Ordered trace:** Loaded detail/Cooks contextual entry → issue sheet → Save through
recipes wrapper/generated importReport client → OpenAPI → shared household filter
and member binder → `RecipeImportReportService.RequireRecipeAndMemberAsync`,
`PersistAsync` → `RecipeImportReport` / EF / SQL report row. It checks existing
member and recipe, not capturer/reporter equality. First save sets ReportedBy and
UpdatedBy to submitting member; later save retains ReportedBy and changes UpdatedBy.
Public issue projection omits those private IDs. The recipe AddedBy is not changed.
DELETE resolution has the same existence checks and no attribution equality check.
Existing recipe-quality requirements `Validate report input at submission`,
`Persist recipe-level feedback before attempting re-import` and `Address manual
resolution to the loaded recipe with member context` already own these behaviors.
No new reporting delta is needed or manufactured.

**Polling discrepancy:** Returned import ID → detail watch → shared SDK GET
`/api/recipe-imports/{importId}` → `RecipeImportController.GetById` →
`RecipeImportService.GetImportByIdAsync` → existing member check, workflow parameter
recipeId parse, then recipe AddedBy equality. Missing/nonmatching result returns
404. `RecipeImportReportIntegrationTests.GetImportById_RequiresFamilyAccessToItsRecipe`
actually seeds an existing second member and asserts capturer 200 / second member
404. Its name is not proof of all-household access. A report can be submitted by
another known member yet its polling be unavailable. Preserve U08/recipe-quality
U76 as **non-normative missing/incomplete integration**; neither equal polling
access nor the restrictive behavior is newly prescribed. No fix or new access role
is inferred. Missing-context GET 400 is implemented but absent from this OpenAPI
operation; retain metadata/error coverage limitation rather than generate parity.

**Assertions:** Initial-report integration test checks stored ReportedBy/UpdatedBy;
its caller is also capturer, so it does not qualify cross-member submission/update.
Cross-member update retention is executable-source supported, without a directly
inspected two-member assertion. Public-projection test checks reasons/status/note,
not a complete absence-of-private-fields contract. Test substitutions are BSL-026.
No current runtime checks. **Disposition:** ownership reconciled; existing positive
requirements reused; underlying asymmetry/qualification remains open, not a new
product decision or extraction blocker under A12.

### BSL-household-identity-029 — cookie and landing context lifecycle

**Ordered trace:** Onboarding/Profile selection → `familyStore.selectFamilyMember`
→ `auth.ts:setFamilyMemberCookie` → Next cookie write; later proxy/member binder
read the cookie under existing access rules. Primary action writes HttpOnly,
Lax, path `/`, 365-day Max-Age; domain/Secure predicates match the accepted access
cookie options. Store then attempts the same-name readable fallback before state
selection. `cookie.ts` uses document.cookie, HTTPS-dependent Secure and optional
domain; its removal omits domain. These writes do not prove retention, no same-name
collision or universal cleanup. Existing U15/U26 and non-awaited selection limits
remain. No session-expiry guarantee or deployment qualification is inferred.

Root layout → `IdentityValidator` → when hydrated and pathname is `/`, router
replace Home if selected ID exists, otherwise onboarding; this branch does not
perform `/me` lookup or membership validation. Proxy gates precede it. The static
landing page's middleware-Home comment overstates actual proxy behavior; executable
client branch is evidence. `clearAuth` has no connected logout caller found in the
PWA, so there is no generated sign-out journey. Installation hints/preferences
remain separate owners.

**Assertions/substitutions:** Identity browser tests preseed cookies/localStorage
and assert visible Alex across Profile/Home/Profile, loaded Settings family row
and preserved name with intercepted list error. They do not assert actual cookie
options or hydrated landing branches. Profile unit test substitutes hook/dropdown/
router; no dedicated IdentityValidator/auth-cookie unit test was found in the
targeted inventory. Existing shared tests are inspected only. **Implementation-
supported; medium confidence**, runtime not-run.

**Mapping / disposition:** Drafted `Set primary member identity-cookie options`
(one successful primary action scenario) and `Route hydrated landing context to the
next household page` (selected/no selected context scenarios). No duplicate existing
selection, recovery, Profile menu or access gate requirements.

### BSL-household-identity-030 — final owner coverage and exclusions

| Owner responsibility | Disposition and requirement/evidence anchors |
| --- | --- |
| Shared passphrase, pending/error retry, access cookie, page/API gates, health exemption | Existing main requirements from BSL-003–005; current auth/proxy/Program/handler agree on scoped successful paths, U08/U14/U15 retained |
| List/select/current member, supported recovery, Profile selected name | Existing main first five requirements / BSL-001; current store/controller/binder/validator rechecked, U13/U26 retained |
| Invite generation/copy/share/dismiss/validation/handoff/recovery | Existing main BSL-006–008; A22/U16–U18 continue, redirect/voting-link variants and partial handoff not promoted into guarantees |
| Member creation, uniqueness, Settings context and onboarding handoff | Existing main BSL-009–016; 201/409 current controller/service source present, acceptance/provenance/real uniqueness qualification still unresolved under U19–U22/A34 |
| Rename / API removal / connected Profile switching | Existing main and active deltas BSL-018–025; dirty designs/deltas preserved; no new copies; U23–U28 remain |
| Shared browser/server transport, syntax-only binding | New transport draft / BSL-026, 3/8 |
| Initial URL/photo submitter attribution | New capture-attribution draft / BSL-027, 1/2 |
| Description/PDF/import attribution and public recipe facts | Existing recipe-capture `Create an initial recipe from description intake`, `Persist a pending PDF before acknowledging intake`; recipe-sharing `Accept and persist imported recipe bundle into library`; recipe-library `Represent persisted recipe attribution and readiness` reused |
| Report creation/update attribution and resolution eligibility | Existing quality requirements reused, BSL-028; cross-member polling discrepancy retained non-normatively |
| Primary member cookie / hydrated landing routing | New lifecycle draft / BSL-029, 2/3 |
| Shared library visibility across attribution | Existing library `Return only eligible household library recipes`; no per-member collection or exclusive ownership is invented |
| Demo, preview eligibility, deployment variants, member preferences, installation | Explicit separate owners; no extraction or qualification here |

No further supported ordinary-household identity behavior needing a new normative
requirement was identified after this responsibility audit. The conclusion is
bounded by inspected connected paths and retained exclusions, not the numeric
count. Header/cookie/transport context is not personal authentication, and capture
attribution is not an exclusive ownership guarantee.

**Explicit exclusions/limits:** Existing U08/U10/U11/U13–U28 are preserved, including
no server token age guarantee; cookie security metadata/delivery/cleanup and API
rejection recovery limits; invite eligibility/binding/redirect and partial handoff;
creation provenance, PostgreSQL/collation/concurrency/compatibility/test-first
qualification; rename feedback/collision handling; related-member removal and stale
identity cleanup; Profile pending/atomicity and fresh Home arrival. BSL-028 adds no
new normative guarantee for the capturer/reporting polling asymmetry or missing GET
400 metadata. Demo/preview/deployment/member preferences stay with their owners.
Runtime checks remain not-run under A34, not silently failed or passed.

**Validation:** Selected three new drafts, main identity and pre-existing dirty
rename/removal/Profile deltas pass strict validation. An all-item strict snapshot
found 48/49 passed and one unrelated concurrently appearing
`baseline-household-live-updates-discovery-events` scaffold without deltas; this is
outside household-identity and was not changed here. The later repository-required
`task verify` observed that concurrent change completed: strict validation passed
**50/50**, with zero failures. Existing library duplicate-on-archive INFO messages
are unrelated and do not authorize archival or repair. New-draft non-normative
notes initially produced carry-forward warnings in CLI 1.14.2; resolved by retaining
the exact historical sentence in spec comments and visible design notes. Comments
are not promoted by archive; no archival is authorized.

The explicit **17-path** documentation verification passed changed-link/Python-
where-applicable/staged-worktree whitespace checks, strict all-item spec checking
and content identity. A final rerun covers these completion-record edits; its
current outcomes are in the final response and `.task/agent-finish/last-run.json`.
All 69 evidence inputs matched the private before-image; new requirement names
have no duplicates in main or existing active/archived identity deltas. No failed
or blocked selected checks remain. The earlier broad-scaffold failure and resolved
new-note warnings are historical check attempts, not current artifact failures.
Application/browser/API/DB runtime checks are not-run under A34; behavior TDD,
client generation, migrations and implementation tests are not-applicable.

**Next-session record — 2026-10-16:** HI-G01 generation is complete within the
explicit boundary. Human review is next for the three drafts (6/13), their evidence
and exclusions. Main remains 36/92 promoted, unchanged. No new acceptance,
promotion, archival, implementation acceptance or runtime qualification. No
consequential unresolved product question is required for these supported drafts;
future correction of reporting access/metadata, original member-creation authority
reference and qualification are separate review/work decisions. Do not generate
more slices or advance to another capability without a new selected scope.

### Current evidence identity — BSL-026–030

The following current input hashes were checked against the pre-edit snapshot;
all matched. They identify inspected support and immediate owner dependencies,
not runtime-tested content. Six dirty prior identity design/delta inputs are
included without modification. Rehash these inputs before reusing this evidence.

| Repository-relative evidence input | SHA-256 |
| --- | --- |
| `api/database/schema.sql` | `3f7767cd704299374ebdcd89a11709680013ba26a477ad23f41da54e6da55161` |
| `api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs` | `903493f2d741b315edf8ca44a83c5083500f70c9d30117c89db979ca805ff385` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `api/src/RecipeApi.Tests/Integration/AuthEnforcementTests.cs` | `8c5dd1e1ad5e2bad392d7217c411ad9bcf173cf5b785eb69ec9e30449964f6aa` |
| `api/src/RecipeApi.Tests/Integration/RecipeDescribeIntegrationTests.cs` | `4e1e0fa8b5277f30668ccefe8a4e122cfe25869cfd994b7a77f84a9f99e8fcd5` |
| `api/src/RecipeApi.Tests/Integration/RecipeImportReportIntegrationTests.cs` | `0ed0a2308f813e83ac5742288fd5f8268018e232aeda2778ff44153e888bac75` |
| `api/src/RecipeApi/Controllers/FamilyController.cs` | `a6c1bced4b82ecf32927ad801b7c0c037914ea51577fb3ceabfd8291e41852ee` |
| `api/src/RecipeApi/Controllers/PdfCaptureController.cs` | `c0319aec6b7eecc9a131efee6c90e6ce9ad501d9f55d91dcbb6b0b3d408b1f2e` |
| `api/src/RecipeApi/Controllers/RecipeController.cs` | `d1699c2de6f6cca9d879e67c0c7b9c7f0af4b2c4e104bc9ff04634b266eb5a70` |
| `api/src/RecipeApi/Controllers/RecipeImportController.cs` | `a5fe04c228c90f4f85bc4681df800a74af53d676599cac965c9ba60b27fe550b` |
| `api/src/RecipeApi/Data/RecipeDbContext.cs` | `92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447` |
| `api/src/RecipeApi/Dto/RecipeDto.cs` | `45f2c035b157b448dfa6d4ba399262492585b795fa60704e147a758c76d9eb1d` |
| `api/src/RecipeApi/Infrastructure/FamilyMemberIdModelBinder.cs` | `4d5dcc9f7d9993abb4c59802f770da139c4875c55544df8410553332a04a2f64` |
| `api/src/RecipeApi/Infrastructure/HearthAuthenticationHandler.cs` | `51ecd8a5be459e1ffaae7e3a33646de57aa13bf0fec088a7e388083da08ee817` |
| `api/src/RecipeApi/Models/Recipe.cs` | `810b9ddb9bdcacdb894d713680952f5a32c89256070366dff99b3c16f82bbe82` |
| `api/src/RecipeApi/Models/RecipeImportReport.cs` | `2fa6fb2814f07dc9a2226156c01894a01c8006ff4c249c5573c830cd2fd6fc56` |
| `api/src/RecipeApi/Models/RecipeInfo.cs` | `7a154a58b5f360279cd1891f9a9e33c4ad3097f382f088dccc855ec27c957452` |
| `api/src/RecipeApi/Program.cs` | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |
| `api/src/RecipeApi/Services/FamilyService.cs` | `60ee6f8d6a638a08de88a0794dddd1195efee1624bcffa41423fe0f74f370586` |
| `api/src/RecipeApi/Services/ImageService.cs` | `c73bb4f976bd6355ec9aa6c18937bed12d4dc14ff7efe718a84351cb4f1abc2d` |
| `api/src/RecipeApi/Services/PdfCaptureService.cs` | `f48ec3c8ec789cbbbcc4951a6a7e0139ab70e7272b5dcac228843e0f6273cc79` |
| `api/src/RecipeApi/Services/Processors/SyncRecipeProcessor.cs` | `246f5ffe2effb7ddc6b0019e5f6ab0436cc20a93b06cf1cdc337007f4ccd2945` |
| `api/src/RecipeApi/Services/RecipeImportReportService.cs` | `99776d8ddfb954d0def99460d868d43a3f3f24e08c4459bd30c132959e30acb3` |
| `api/src/RecipeApi/Services/RecipeImportService.cs` | `3016a8e38da063513813e813fad5f8fddf10f285abfa1ef3e0743c200ac1af14` |
| `api/src/RecipeApi/Services/RecipeService.cs` | `9eec9ab5cd7102081b3765b08a41b8de4d45325858d18ab4573a326afa256b74` |
| `openspec/changes/baseline-household-identity-member-removal/design.md` | `51de2172ce115fed549960c19742258847f418f37eaf5138a747c70d5abdd083` |
| `openspec/changes/baseline-household-identity-member-removal/specs/household-identity/spec.md` | `eb302a79c0d06f45788770498d3d67c16ff5be522becdd899329fc35f1f270e2` |
| `openspec/changes/baseline-household-identity-member-renaming/design.md` | `fdfc328b00d4c6a29d4b5f4dd612bbabb27ab3278da24d06a9f5b5f3a983a102` |
| `openspec/changes/baseline-household-identity-member-renaming/specs/household-identity/spec.md` | `158b5ff2e102888f4752b5d62dba6f9a5f562d6dd5b4ba212032db16a507de27` |
| `openspec/changes/baseline-household-identity-profile-switching/design.md` | `0ae935b4ababee09d5e2296b5c84f6fcb2a05031ff20f0e7fea1fce69286dce2` |
| `openspec/changes/baseline-household-identity-profile-switching/specs/household-identity/spec.md` | `2c4a5adc892c3ea7d0d121afca781c2daaf3729ea9383877a1345abc78c341a1` |
| `openspec/specs/household-identity/spec.md` | `bbf4dc2eaf241f573307cba356b3b9cacce340b31d6249520af02b140b54479b` |
| `openspec/specs/recipe-capture/spec.md` | `26c3bac67a723424f2e3d6a4888524bff4eb3ea56629d8b505a57e0320b7104b` |
| `openspec/specs/recipe-library/spec.md` | `7fd80218a8551dba51d70f057f82d40cce9cd3fe5356c6d3d82d6a07a4f857d2` |
| `openspec/specs/recipe-quality/spec.md` | `73877aa85c761de351c650769577be65b9d75325a8ba4ff474c9283445ffb796` |
| `openspec/specs/recipe-sharing/spec.md` | `5099666d97b25c235c0b7b0d42eb81048d027744c8f4dc206811c70ab300f186` |
| `pwa/e2e/fixtures.ts` | `402b5a1b872f625dc1425f46afdede2c9378dcc473088159774a8455b5d188e2` |
| `pwa/e2e/identity-persistence.spec.ts` | `f1abb139b6977ccb77260a7666513886445e69d1ac431c1c32c4785875839665` |
| `pwa/e2e/mock-api.ts` | `063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07` |
| `pwa/playwright.config.ts` | `6e15ab7bb105dea06751d9e8dc5d3e4d280f0eb2d465553fbea5e2da65e91532` |
| `pwa/src/app/(app)/profile/page.tsx` | `2276868bc76ec0f13f2293ea5f1ae46ed2c1181cb386fb9c45e1ae6c7ef200c4` |
| `pwa/src/app/(auth)/invite/page.tsx` | `68202e387563aad4796dc9c55676494f0e3c22fbd09b8fa7d33e5d9c17579e2f` |
| `pwa/src/app/(auth)/onboarding/page.tsx` | `e1c3a4253b15627c8bcf69791cf44ee48819fba50ca82bee1c3cdf16cb01ef88` |
| `pwa/src/app/layout.tsx` | `96482e0e3859142238b3d99c98e5e685e884d26a2f75907281c0dc18ddc8d5f6` |
| `pwa/src/app/page.tsx` | `bb1f1e98dc4a2590233cceee64216e4f3f0e7895b7552da40e29c052a49b2990` |
| `pwa/src/components/capture/MinimalCapture.tsx` | `aadbb37ec2fe548af6e41c5460ea3339377fb215f66f19eac054666416742af5` |
| `pwa/src/components/identity/FamilyMemberList.tsx` | `f8cb32a3a4cc0437fc4199cda4dd50c8f5028c0fd3f43947e8248e130958b479` |
| `pwa/src/components/identity/FamilySelector.tsx` | `bea6c16f429206d2c10acc0d717e52b8b307cb3917834f0c9439cf557a3c70c8` |
| `pwa/src/components/identity/IdentityValidator.tsx` | `f35b0f71bd2abc70e79c2c9169cd57f9bf71eff72fa8ca04eda6d94f20384f1b` |
| `pwa/src/components/profile/ProfileDropdown.tsx` | `c9e7c7f140e49d23df034480755472421b45080b812c076acd92b3a29426cf77` |
| `pwa/src/components/recipes/RecipeDetailSheet.test.tsx` | `21727367dee891c473635cc2eafde324b0f6863e0dd4db1a7e82203d5e650da0` |
| `pwa/src/components/recipes/RecipeDetailSheet.tsx` | `bbc1bba8f16f3fa305775d072cb1c3850af34a24bd3979e2228b63984ca1a19c` |
| `pwa/src/hooks/useCapture.ts` | `758f77485f02a9b32e48e9fab846f5906e94ce1de7594d94c55950d294d1b5e9` |
| `pwa/src/hooks/useFamily.ts` | `b760c59f10b9eb69a7ecf453ee97fd62d35406fe3fa594c321181422a95c10e8` |
| `pwa/src/lib/api/api-client.ts` | `c5cd4cfebddd8d5c1f2827c522a236fe12c504130ea0991c07bc8fc46376aa95` |
| `pwa/src/lib/api/family.ts` | `23315b8d44b2a0b1d745d180e37257eb4c2709e0edbe6571513cfd909faf35ad` |
| `pwa/src/lib/api/generated/api/recipeImports/item/index.ts` | `1ae62eeebd51f7e92a148f19fc356d38134406263c5275b0a917640b698f7454` |
| `pwa/src/lib/api/generated/api/recipes/captureUrl/index.ts` | `11d9ffc93713c35404d2d863a2cff4bc1291e57a635a239b8fab6604c0407a87` |
| `pwa/src/lib/api/generated/api/recipes/item/importReport/index.ts` | `da2d1d8454fa6a1e64e9d82b7e5a8ae965f0d02272d5b48941aabbef60c86930` |
| `pwa/src/lib/api/recipes.test.ts` | `02b75d719bddca5b88e9cc9760d183fd8e8defd316b0d04cdabf1006bf45ebe4` |
| `pwa/src/lib/api/recipes.ts` | `f4e70b39a2060bfc5b25010914f78e288321517db5c52c543d103502718dce7a` |
| `pwa/src/lib/api/server-client.test.ts` | `4540c42a5b721e6ded7cf3235a0f72b7ae927401472ddf914001414f2863b517` |
| `pwa/src/lib/api/server-client.ts` | `04426cad934ca6cdeacd5302ca558688033cdf23738557cd816d34d2f90b89ea` |
| `pwa/src/lib/auth-utils.ts` | `e280e68d3a4a4063df229b66e6164f2ac9291a9d1015de1740f2f10f24e6acde` |
| `pwa/src/lib/auth.ts` | `d9b122b42cccfdc8a589c05a3e05deaa4a4864dee9cf17c4a403ec5f6db09f2a` |
| `pwa/src/lib/identity/cookie.ts` | `f899606ac6d2cc7b800b0e03a5b16dbe908e7967e8d7f9802baff52c4f5e640b` |
| `pwa/src/proxy.ts` | `5070867f5cb42505922f4cacb491aa77d254e12684a04a1e57e683df0b2e1aef` |
| `pwa/src/store/familyStore.ts` | `68d09caecfb61d69a663cd20f7082dc1306cd3c4986203c72ced84b4c6b1566a` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |

## Execution prompt

Paste this prompt and replace the session instruction with the desired bounded
scope. The default authorizes review only. Select the model in your host.

```text
Work on the household-identity OpenSpec brownfield baseline in
/Users/alex/Code/whats-for-supper.
Session instruction: Review this capability's checkpoint and recommend the next
bounded slice. Do not generate specs or change application behavior.

Read AGENT.md and its active-host loading rules, then
 docs/openspec-baseline/workflow.md and
 docs/openspec-baseline/household-identity.md.
Use these as the execution context; do not read the full history or other
capability plans unless an immediate dependency requires a specific section.
Resolve installed OpenSpec workflow/root before artifact writes. Preserve staged,
unstaged and untracked work. Recheck source identity and affected evidence.

Current user messages define scope. Reuse recorded decisions without asking for
approval again within already authorized work. Do not infer new drafting,
promotion, archive, implementation or runtime qualification authority from history.
Trace one selected observable journey through source, contracts and actual test
assertions/substitutions. Keep disputed claims non-normative. No application,
test, contract, client, SQL, configuration or dependency edits.

Update this capability plan's evidence/mappings, decisions, uncertainty, artifact
status, session log and next action. Update the small index only if its routing or
summary changes. Validate selected artifacts and run task verify with every changed
path. Distinguish passed, failed, blocked, not-run and not-applicable; source
support is not runtime verification. Stop at the authorized session boundary.
```

## Next-session record

Use this section for new capability sessions after the split. The earlier evidence
and lifecycle records above retain their original chronology.

```text
Session/date: 2026-10-16 — HI-G01 remaining-generation completion.
Branch/commit: moving-to-openspec / 04a1c4570f9bbb01b47436790d4248635ac3179a.
Dirty inputs: six prior identity design/delta edits preserved; staged diff unchanged;
  concurrent unrelated background/live-update documentation remains untouched.
Authorization: sequential remaining household-identity documentation generation only.
Discovery: BSL-household-identity-026–030; 69 current evidence hashes recorded above.
Artifacts: three new changes under openspec/changes/baseline-household-identity-:
  member-context-transport (3/8), capture-attribution (1/2),
  member-context-lifecycle (2/3). Each is draft/strict validated, not accepted,
  promoted or archived. Main remains unchanged at promoted 36/92.
Human review: review the six new requirements/thirteen scenarios and exclusions.
  No consequential question blocked generation. Creation authority reference and
  runtime qualification remain deferred; report/polling asymmetry is non-normative.
Checks: strict selected/main/prior identity and 17-path documentation checks passed;
  later all-item strict snapshot 50/50 passed. Final harness record/response owns
  current outcomes. Earlier concurrent scaffold failure resolved independently.
  Blocked: none selected. Runtime browser/API/DB: not-run (A34).
  TDD/application implementation checks/client generation/migrations: not-applicable.
Limits: all existing caveats and separate demo/preview/deployment/preferences owners.
Next action: human review only. Do not regenerate existing slices, promote/archive,
  implement, qualify runtime or advance to another capability without new scope.
```

## Promotion record — 2026-10-16

User authorization: “promote all the openspec changes”. Applied the active deltas
through `openspec-sync-specs` after resolving all 42 active changes and their
CLI-reported spec paths and rules. This capability's added requirements/scenarios
are now in its main spec. Existing Purpose and requirement blocks are preserved.
Source evidence, exclusions and uncertainty records above retain their original
qualification; promotion adds no runtime evidence. Change artifacts remain active.
No staging, commit, archival, application edits or runtime qualification performed.
Validation outcomes are reported with this execution rather than inferred from
completed extraction tasks.
