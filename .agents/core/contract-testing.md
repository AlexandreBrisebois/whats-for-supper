# Contract and Testing Governance

## 1. Contract authority
- **OpenAPI is Law**: The `specs/openapi.yaml` is the ultimate source of truth.
- **Development sequence**: Approved contract/spec → tests → implementation.
- Resolve mismatches against approved intent. A failing test or divergent implementation
  does not authorize rewriting the contract to match code; obtain authorization for
  a changed contract when it exceeds the selected scope.

## 2. Test-first expectations
- **Test-Driven Development**: You must write or update tests before implementing logic.
- **Coverage**: There is a zero-tolerance policy for untested features.

## 3. Drift prevention
- **Zero Drift**: Backend DTOs and PWA models must match the OpenAPI spec exactly.
- **Schema Integrity**: Parity between the OpenAPI Specification, Mock API, and Backend implementation is mandatory.
- **Validation**: Run applicable checks selected by change class under [execution harness](execution-harness.md). Contract changes require affected seam and database behavior evidence; static checks alone cannot establish it.

## 4. Data and mock discipline
- **Mock Standardization**: E2E mocks MUST use `MOCK_IDS` (valid GUIDs) and schema-compliant `builders`.
- **High-Fidelity Mocks**: Test factories (e.g., `TestWebApplicationFactory`) should prioritize mocks that preserve domain side-effects (e.g., persisting workflow instances to the DB) rather than "shallow" mocks that return empty success objects. This ensures vertical slice integration tests can verify system state correctly.
- **Strict Typing**: Hardcoded string IDs (e.g., `"recipe-1"`) are strictly forbidden. Mock data must adhere strictly to the schema contract.

## 5. SSE and async React patterns in E2E tests

### The `pendingRef` anti-pattern
Do **not** coordinate SSE-driven side effects using a boolean "pending flag" ref that one async path sets and another async path reads. The two paths (SSE effect and `initialize()`) interleave non-deterministically in CI, causing the flag to be consumed by the wrong path or missed entirely.

### Correct pattern: `recipes.length` dep + version guard
When a `useEffect` must react to an SSE signal that may arrive before or after async data is ready:

1. Include the data-readiness signal (e.g., `recipes.length`) as a dep alongside the SSE version counter.
2. Guard against early firing with `if (!stackIsLoadedRef.current || recipes.length === 0) return`.
3. Track the last-handled version in a ref (`lastHandledFillTheGapVersionRef`) to prevent the effect from re-firing for the same SSE event when `recipes.length` changes later (e.g., user swipes).

```ts
useEffect(() => {
  if (fillTheGapVersion === 0) return;
  if (!stackIsLoadedRef.current || recipes.length === 0) return;
  if (fillTheGapVersion <= lastHandledVersionRef.current) return;
  lastHandledVersionRef.current = fillTheGapVersion;
  refetchCurrentCategory();
}, [fillTheGapVersion, refetchCurrentCategory, recipes.length]);
```

This eliminates the race entirely: when the stack loads the effect re-fires automatically, and the version guard prevents double-processing.

### SSE mock reconnection (BS-10)
`route.fulfill()` closes the HTTP connection. EventSource auto-reconnects (~3 s). Every reconnect replays the entire mock body, incrementing the SSE version counter again. The version guard above absorbs these duplicate events safely.

## 6. Definition of done
- The OpenAPI specification accurately reflects the required changes.
- **Atomic Sync**: Controller changes (signatures, status codes) are synchronized with the OpenAPI spec and client regeneration in a single atomic step.
- Tests are written or updated before implementation code.
- **Multi-Layer Verification**: For contract-impacting changes, unit tests have been executed and passed on BOTH sides of the seam (e.g., `dotnet test` for the API AND `npm run test:unit` for the PWA).
- Applicable validation has actual command/results and tested content/config/runtime identity. Static route, DTO and mock-pattern checks establish only their inspected properties; live endpoint and database behavior evidence are separate.
- All logic changes are fully covered by passing tests.

## 7. Evidence and test scope

Classify each required check as passed, failed, blocked, not-run or not-applicable.
A failure calls for diagnosis: application defects, stale tests, infrastructure and
permissions are distinct possibilities. Logs and tests do not authorize changing
approved intent. Unknown impact takes conservative checks; mixed changes take the
union. Missing services, interrupted checks and unqualified runners cannot become
passed evidence. Cache success belongs only to the actual tested identity.

Use testid-first interaction locators and semantic assertions for accessible role,
name, state and labeling. Preserve network isolation and schema-compliant builders.
For optimistic stores, assert both immediate UI state and reconciled server state.
Pure logic may move to unit tests within authorized scope, retaining E2E coverage of
navigation, network/state integration and user-visible behavior. Audits are advisory;
findings outside the selected task are evidence, not cleanup authorization.
