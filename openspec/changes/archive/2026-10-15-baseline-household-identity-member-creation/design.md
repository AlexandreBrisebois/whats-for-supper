# Design

## Context

See [proposal](proposal.md) for motivation and [delta](specs/household-identity/spec.md) for behavior. BSL-household-identity-009–011 in the [durable plan](../../../docs/openspec-baseline-plan.md) trace the complete path at commit `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`; application inputs are unchanged locally. Test assertions were inspected, not executed. Design is warranted by the contract/client/persistence boundary, concurrent uniqueness and migration complexity.

Current path: onboarding or Settings → FamilySelector/AddFamilyMemberForm → useFamily → familyStore.addMember → family API adapter → generated POST builder → OpenAPI/FamilyController.Create → FamilyService.CreateFamilyMember → EF FamilyMembers/SQL family_members → success filter/data envelope → adapter → store append/list. Onboarding subsequently invokes its async cookie/selection/navigation callback without awaiting it; Settings supplies a no-op callback.

Current DTO validates Required/MaxLength(100); form/store/service trim and reject blank names but do not enforce uniqueness. SQL has a varchar(100) name with no uniqueness constraint. POST returns 201 while OpenAPI says 200 and “Create or update.” Generated name is optional/nullable and there is no runtime adapter validation beyond a truthy returned ID. The source has no concurrency or deduplication protection.

## Goals / Non-Goals

**Goals:** Produce a reviewable creation delta with explicit source/desired-behavior separation; retain the user's 201 and trimmed case-insensitive uniqueness decisions; make future enforcement and its acceptance evidence actionable.

**Non-Goals:** No contract, generated code, SQL, application or test edits now. No changes to main requirements, prior archives, selection/recovery guarantees, rename/removal journeys, invite/voting or deployment variants. No silent conversion of existing data and no automatic selection of the matching existing member on rejection.

## Decisions

1. **Add to household-identity, using ADDED blocks only.** Existing shared access, selection, lookup, recovery and Profile rules remain their owners. A separate capability would duplicate identity ownership; modifying accepted selection requirements would exceed this slice.
2. **Classify each claim honestly.** Form, pending, creation/list and caller-specific handoffs are implementation-supported (BSL-009–011). 201 is implemented, but OpenAPI alignment remains future work. Uniqueness is an explicit user-directed normative addition, currently unsatisfied. This is a deliberate exception to pure baseline extraction, not evidence that the application already enforces it.
3. **Plan 201 alignment before application changes.** Future work corrects only POST `/api/family` success/creation semantics in `specs/openapi.yaml`, preserves the envelope/default fields and existing GET behavior, regenerates with `task gen:client`, and reconciles consumers and method-sensitive mocks. Existing controller behavior should remain 201. Editing generated client by hand or changing the controller to 200 would contradict approved intent.
4. **Own uniqueness on the server and persistence boundary.** Compare trimmed names ignoring case while preserving trimmed display casing. A UI-only check or unprotected lookup-before-insert cannot enforce direct API or concurrent requests. Future work must select one consistent comparison rule across service and real PostgreSQL enforcement. The normative rule does not prescribe SQL functions, a new dependency, locale-specific folding or accent equivalence. Existing family data is the household scope in this single-household application; do not invent accounts or tenant keys.
5. **Keep future behavior tasks incomplete.** Draft validation cannot complete 201 correction or uniqueness enforcement. Retain explicit future tasks; use the user-selected 409 duplicate response and refuse automatic legacy-data remediation. Comparison implementation must satisfy the agreed trim/case rule across server and persistence. Do not archive this change as fully implemented while those tasks remain open. UI recovery improvements are outside this draft; existing generic failure/input-loss behavior is evidence only.

## First implementation slice and acceptance boundaries

After separate implementation authorization and the data/compatibility review, the first tracer bullet is a successful nonconflicting creation with a documented 201 response through the real API/client/store/list path. Correct OpenAPI before derived artifacts; extend existing FamilyControllerTests, service tests and onboarding/Settings browser scenarios. Browser API mocks establish UI behavior only; require real API/SQL creation→GET separately. Existing success tests may already pass; do not manufacture red for unchanged 201 behavior. Observe regression failure for the missing contract alignment where meaningful.

Next extend that same path to duplicate rejection: exact name, trim/case variants, direct POST bypassing UI, preserved existing ID/name/count, no automatic selection, and concurrent requests. Run the smallest red tests before production enforcement, then implement and record green. Duplicate rejection uses the user-selected 409 Conflict. Plan the existing error-envelope convention (`status`, `message`) with a stable human-readable duplicate-name message; exact wording is an implementation detail. Document it in OpenAPI before generation. Browser handlers in `pwa/e2e/mock-api.ts` and the stateful override in `pwa/e2e/onboarding.spec.ts` must share the reviewed behavior and distinct IDs for distinct successful creations. Include Settings rejection and selection retention, not just a stubbed FamilyManagement.

## Risks / Trade-offs

- Existing duplicate/case/whitespace collisions → read-only audit and reviewed remediation/rollout plan before enforcement; never silently merge, delete or rename household members. This session does not read household data.
- A database uniqueness mechanism may also affect rename → review that compatibility before choosing/enabling it; rename behavior changes need their own bounded authorization. A service check alone is insufficient for concurrent creation.
- JavaScript/.NET/PostgreSQL case/trim differences → choose and test one server-owned normalization/comparison policy before implementation; Alex/alex/space variants are settled examples, not exhaustive Unicode qualification.
- U20 input loss/Settings missing error and U21 partial handoff → retain as non-normative limitations; no universal retry, atomicity or exactly-once promise. Uniqueness prevents equivalent names, not network idempotency or recovery of a lost response.
- U19 length/400 metadata gaps → remain recorded separately; 201 alignment does not prove complete validation parity.
- Test fixtures bypass auth/SQL or mock API success → report actual check scope and real database evidence separately. Runtime remains not-run.

## Migration Plan

No migration or deployment runs in this drafting session. Before future uniqueness rollout, audit normalized collisions without mutation, stop rollout if collisions exist, and confirm comparison/rename compatibility. Collision remediation requires a separately reviewed decision; do not invent it as part of this creation slice. Document the agreed 409 error contract, then perform contract-first generation and test-first enforcement in a separate authorized slice. Validate real PostgreSQL concurrency and existing-data migration against disposable data before rollout. Any constraint rollback must preserve member IDs and records and be reviewed with its enforcement trade-off; no automatic reset or data cleanup is authorized.
