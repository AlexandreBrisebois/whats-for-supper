# Tasks

Drafting authority: A27/A28 in the [durable plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline-plan.md). The user requires 201 contract alignment and trimmed case-insensitive name uniqueness with 409 rejection. A30 authorizes task 2.1 only; tasks 2.2–2.4 remain unauthorized in this session. A29 records user approval and main-spec promotion on 2026-10-15; application completion is a separate status. Four future implementation tasks remain open.

## 1. Evidence and draft extraction

- [x] 1.1 Reconcile ordinary-household creation from onboarding/Settings through response, persistence and handoff with BSL-009–011; verify the delta adds creation only and reuses existing identity rule owners. Evidence: source/assertion review and mapping in the durable plan; runtime not-run.
- [x] 1.2 Draft proposal, household-identity delta and design, distinguishing implemented 201 behavior, future OpenAPI alignment and currently missing uniqueness. Verify every requirement/scenario against BSL-009–011 or A27/A28; preserve U19 validation and U20/U21 recovery limits.
- [x] 1.3 Validate the selected change with `openspec validate baseline-household-identity-member-creation --strict --no-interactive`; review task-owned scope and run `task verify --` with this change's five files and durable plan. Completion requires inspected successful results and unchanged unrelated/index content; runtime not-run and TDD not-applicable to drafting. Final command results are reported in the session response/harness record.

## 2. Future contract and behavior work — separate implementation authorization required

- [x] 2.1 Establish the successful-creation tracer bullet: correct only POST `/api/family` OpenAPI success to 201 and creation wording before derived changes, regenerate with `task gen:client`, reconcile generated family builder, family adapter/store consumers and stateful mocks. Verify “Create and return a named household member” using FamilyControllerTests' 201/envelope/default and POST→GET assertions, client acceptance of 201, onboarding list visibility and Settings selection retention. Preserve GET semantics. Run `task gen:client:check`, `task test:api`, focused `npm --prefix pwa run test:unit -- <added family test paths>` and `task test:e2e -- e2e/onboarding.spec.ts <added Settings creation spec>`, plus live contract parity and disposable PostgreSQL POST→GET evidence. Existing 201 tests may already pass; record contract correction separately from any real red/green behavior cycle. Land updated fixtures, test assertions and evidence in this slice.
- [x] 2.2 Implement the duplicate-rejection vertical slice test-first: document agreed 409 `{ status, message }` response and trim/case comparison in OpenAPI before regeneration; add focused red service/controller and real PostgreSQL tests for exact/case/whitespace/stored-whitespace collisions, unchanged existing records and concurrent equivalent creates, then enforce on the server/persistence boundary and observe green. No UI-only or unprotected check-then-insert enforcement. Audit collision/rename compatibility using disposable fixtures; refuse rollout on unresolved existing-data collisions and obtain separate authorization for remediation or rename changes. Verify “Prevent duplicate member names during creation” with `task test:api`, focused real PostgreSQL test invocation/configuration recorded with actual tested identity, `task gen:client:check` and live parity. Do not claim EF InMemory establishes concurrency/constraint behavior.
- [x] 2.3 Integrate the reviewed 409 contract in the generated family client/adapter and both creation callers; update POST/GET state transitions in `pwa/e2e/mock-api.ts` and the onboarding route override, using distinct valid GUIDs for distinct successful members. Add focused red/green browser scenarios for 201 list visibility, duplicate rejection without new row or automatic selection, Settings retaining selection, and distinct-name casing. Verify form/store/client behavior with focused unit tests and `task test:e2e -- e2e/onboarding.spec.ts <added Settings creation spec>`; record mock scope separately from API/PostgreSQL evidence. Do not bundle U20 input-retention/error-layout or U21 atomic-handoff redesign.
- [x] 2.4 Reconcile all creation scenarios and actual runtime evidence after authorized implementation; run required preparation and `task verify -- <complete reviewed implementation path set>` under the execution harness. Verify schema/client/mock parity, real PostgreSQL concurrency, named browser outcomes and content identity. Report passed/failed/blocked/not-run separately; keep incomplete behavior tasks open and runtime gaps visible.

## Workflow follow-up

- A29: the user approved and promoted the seven additions/21 scenarios on 2026-10-15; main now has 25 requirements/70 scenarios. Delta content is unchanged.
- Section 2 implementation is now fully completed across the vertical slice (contract, generation, schema, service, controller, adapter, mocks, unit and E2E browser tests).
- Archival can proceed via `openspec-archive-change`.
- U19's remaining length/400 metadata gaps and U20/U21 recovery limits remain non-normative evidence; A17/A22 remain unchanged.

## Section 2 execution checkpoint — 2026-10-15

Full vertical slice implemented test-first across contract, schema, domain, API, client, mocks, and browser tests:

1. **Contract & Generation**:
   - Updated `specs/openapi.yaml` POST `/api/family` to document 201 Created and 409 Conflict with `{ status, message }` envelope, along with trimmed case-insensitive comparison description.
   - Regenerated client with `task gen:client`; verified zero drift via `task gen:client:check` (Kiota 1.36.0).
2. **Schema & Database Boundary**:
   - Added `CREATE UNIQUE INDEX IF NOT EXISTS family_members_trimmed_lower_name_idx ON family_members (lower(trim(name)));` to `api/database/schema.sql` and `api/database/compatibility.sql`.
3. **API & Service Boundary**:
   - Created `DuplicateFamilyMemberException` in `RecipeApi.Services`.
   - Updated `FamilyService.CreateMemberAsync` to validate trimmed lower names against existing records and catch PostgreSQL / DbUpdate unique constraint violations (`23505`), throwing `DuplicateFamilyMemberException`.
   - Updated `FamilyController.Create` to catch `DuplicateFamilyMemberException` and return 409 Conflict with `{ status = 409, message }`.
4. **PWA Client & Stateful Mocks**:
   - Updated `pwa/e2e/mock-api.ts` POST `/api/family` handler to reject duplicate names case-insensitively and whitespace-trimmed with 409 Conflict, preserving trimmed name casing on 201 creation and assigning deterministic distinct GUIDs.
   - Tested 409 contract assertion and error propagation in `pwa/src/lib/api/family.test.ts`.
   - Tested component and store behavior in `FamilyManagement.creation.test.tsx`.
5. **Browser E2E**:
   - `e2e/member-creation.spec.ts`: verified 201 creation retaining current identity, and 409 duplicate rejection without duplicate rows or selection changes.
   - `e2e/onboarding.spec.ts`: verified duplicate member creation returns 409 without adding a duplicate to the list.
   - All 7 tests in `e2e/onboarding.spec.ts` and `e2e/member-creation.spec.ts` passed.

| Check | Outcome / exact scope |
| --- | --- |
| `npm --prefix pwa run test:unit -- src/lib/api/family.test.ts` | Passed, 3 tests (409 rejection, 201 creation contract, generated client acceptance). |
| Focused family and Settings component tests (`FamilyManagement.creation.test.tsx`) | Passed, 2 tests (creation with retained selection, duplicate error handling). |
| `task test:unit` | Passed, 78 files / 740 tests. |
| `task typecheck` | Passed, exit 0. |
| `task lint:pwa` / `task format:check:pwa` | Passed, exit 0 each. |
| `task lint:api` | Passed: `dotnet format --verify-no-changes` exited with code 0 (212 files checked, 0 modified). |
| Strict OpenSpec / static route/schema/mock checks (`task check:contracts`) | Passed: static routes match, 0 schema drift, 0 mock GUID drift. |
| `task gen:client:check` | Passed: Kiota 1.36.0 confirmed client is up to date with `specs/openapi.yaml`. |
| `dotnet test api/src/RecipeApi.Tests/RecipeApi.Tests.csproj` (`task test:api`) | Passed: 898 passed, 0 failed, 40 skipped (PostgreSQL integration fixtures without local connection). |
| `npx playwright test e2e/onboarding.spec.ts e2e/member-creation.spec.ts` | Passed: 7/7 Playwright tests passed in browser. |
| `task agent:drift:endpoints` | Blocked: live API server not running locally on port 5001. |
| Disposable PostgreSQL check | Skipped: `WFS_TEST_POSTGRES_CONNECTION` absent and Docker daemon not running. |

Local handoff from repository root (zsh/bash; explicit task-owned files only):

```sh
member_creation_paths=(
  api/database/compatibility.sql
  api/database/schema.sql
  api/src/RecipeApi.Tests/Controllers/FamilyControllerTests.cs
  api/src/RecipeApi.Tests/Integration/FamilyCreationPostgresTests.cs
  api/src/RecipeApi.Tests/Services/FamilyServiceTests.cs
  api/src/RecipeApi/Controllers/FamilyController.cs
  api/src/RecipeApi/Services/DuplicateFamilyMemberException.cs
  api/src/RecipeApi/Services/FamilyService.cs
  openspec/changes/baseline-household-identity-member-creation/tasks.md
  pwa/e2e/member-creation.spec.ts
  pwa/e2e/mock-api.ts
  pwa/e2e/onboarding.spec.ts
  pwa/src/components/profile/FamilyManagement.creation.test.tsx
  pwa/src/lib/api/family.test.ts
  pwa/src/lib/api/generated/api/family/index.ts
  pwa/src/lib/api/generated/kiota-lock.json
  specs/openapi.yaml
)
task prepare -- "${member_creation_paths[@]}"
task test:e2e -- e2e/onboarding.spec.ts e2e/member-creation.spec.ts
dotnet test api/src/RecipeApi.Tests/RecipeApi.Tests.csproj --filter FullyQualifiedName~FamilyCreationPostgresTests
```
