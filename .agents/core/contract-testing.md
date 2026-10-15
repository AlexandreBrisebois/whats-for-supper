# Contract and Testing Governance

## 1. Contract authority
- **OpenAPI is Law**: The `specs/openapi.yaml` is the ultimate source of truth.
- **Development sequence**: Approved contract/spec → tests → implementation.
- **API changes**: Update `specs/openapi.yaml` for every API change, including
  operations, payloads, status codes and observable behavior, before implementing
  the changed API. Regenerate the Kiota client with `task gen:client` (or scoped
  `task prepare`), then update affected consumers and schema-compliant mocks in
  the same slice. Use generated SDK types; do not hand-edit generated output.
- Resolve mismatches against approved intent. A failing test or divergent implementation
  does not authorize rewriting the contract to match code; obtain authorization for
  a changed contract when it exceeds the selected scope.

## 2. Test-first expectations
- **Test-Driven Development**: You must write or update tests before implementing logic.
- For bug fixes, add or update a regression test that reproduces the reported
  failure before implementation, and retain it after the fix.

For each behavior increment, follow **red → green → refactor**:

1. **Red**: Write or update the smallest meaningful behavior test, run it before
   changing production logic, and observe failure for the intended missing or
   incorrect behavior. Compilation, tooling and service failures do not establish
   red. If the test already passes, establish the missing behavior before proceeding.
2. **Green**: Implement only enough of the selected behavior to make that test
   pass, then run it and the affected integration checks.
3. **Refactor**: Improve the implementation and tests where needed within the
   selected scope while keeping the checks green; rerun affected checks after edits.

Record the red and green commands/results in task evidence. Tests added only after
production logic do not satisfy TDD. Documentation-only changes have no behavior
cycle; identify that as not-applicable rather than inventing tests.

## 2a. Tracer bullets and vertical slices

Start implementation with a **tracer bullet**: the smallest working path through
all layers required by one observable scenario. For a browser/API capability,
connect UI → generated Kiota client → API → domain/service → persistence or workflow
where affected. Exercise the real internal seams and verify observable results and
side effects before widening the capability. Keep external-provider test doubles at
their boundaries; a mocked browser API alone does not prove backend integration.

Plan and complete one bounded vertical behavior slice at a time, each using the
red/green/refactor cycle and named integration acceptance checks. Do not implement
all backend, client or UI work in separate horizontal batches and defer integration
to the end. Include only layers the scenario actually needs; shared prerequisites
must serve the first working slice. Extend to additional scenarios only after that
path works, within the authorized task scope.

## 3. Drift prevention
- API request/response shapes must conform to OpenAPI. Internal domain and UI
  models may differ, with explicit mapping at API boundaries.
- **Schema Integrity**: Parity between the OpenAPI Specification, Mock API, and Backend implementation is mandatory.
- **Validation**: Run applicable checks selected by change class under [execution harness](execution-harness.md). Contract changes require affected seam and database behavior evidence; static checks alone cannot establish it.

## 4. Data and mock discipline
- **Mock implementation is part of every API change**: Add or update the affected
  method-sensitive handlers in `pwa/e2e/mock-api.ts`, plus supporting builders,
  fixtures and state transitions, in the same vertical slice as the real API.
  Match the approved contract's request/response shapes, status codes, errors and
  observable side effects, including subsequent reads and SSE where applicable.
  Updating types or fixtures alone is insufficient when handler behavior changes.
- **Mock acceptance**: Run tests that exercise the changed handlers and affected
  Playwright scenarios, including applicable success, failure and stateful behavior.
  Missing mock implementation or failing/blocked required mock checks prevents
  claiming the API change verified; static drift checks alone do not establish mock behavior.
- **Mock Standardization**: E2E mocks MUST use `MOCK_IDS` (valid GUIDs) and schema-compliant `builders`.
- **High-Fidelity Mocks**: Test factories (e.g., `TestWebApplicationFactory`) should prioritize mocks that preserve domain side-effects (e.g., persisting workflow instances to the DB) rather than "shallow" mocks that return empty success objects. This ensures vertical slice integration tests can verify system state correctly.

## 5. Definition of done
- The OpenAPI specification accurately reflects the required changes.
- Tests are written or updated before implementation code.
- Each behavior increment has observed red/green evidence and remains green after
  any refactoring. The tracer bullet and subsequent slices have passed their named
  integration acceptance checks across the affected layers.
- API changes include the updated OpenAPI contract, regenerated Kiota client,
  affected consumers, implemented mock handlers/builders/state behavior, passing
  mock acceptance checks and a passing `task gen:client:check`.
- Verify affected API/client seams with tests appropriate to the changed behavior.
  Name the required checks in the OpenSpec tasks.
- Applicable validation has actual command/results and tested content/config/runtime identity. Static route, DTO and mock-pattern checks establish only their inspected properties; live endpoint and database behavior evidence are separate.

Claim completion only when the selected scope's required acceptance and applicable
harness checks pass. Code existence or advisory guidance is not completion evidence;
a blocked required check prevents claiming completion.

## 6. Evidence and test scope

Classify each required check as passed, failed, blocked, not-run or not-applicable.
A failure calls for diagnosis: application defects, stale tests, infrastructure and
permissions are distinct possibilities. Logs and tests do not authorize changing
approved intent. Unknown impact takes conservative checks; mixed changes take the union. Git
differences and explicit path selection do not prove actor ownership. Preserve
unrelated work; include changes that overlap or alter a selected dependency/runtime
input in the verification review. Missing services,
interrupted checks and unqualified runners cannot become
passed evidence. Cache success belongs only to the actual tested identity.

Use testid-first interaction locators and semantic assertions for accessible role,
name, state and labeling. Preserve network isolation and schema-compliant builders.
For optimistic stores, assert both immediate UI state and reconciled server state.
Pure logic may move to unit tests within authorized scope, retaining E2E coverage of
navigation, network/state integration and user-visible behavior. Audits are advisory;
findings outside the selected task are evidence, not cleanup authorization.
