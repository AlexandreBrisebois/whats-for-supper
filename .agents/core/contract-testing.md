# Contract and Testing Governance

## 1. Contract authority
- **OpenAPI is Law**: The `specs/openapi.yaml` is the ultimate source of truth.
- **Order of Authority**: Development must strictly follow this sequence: Contract (Spec) -> Tests -> Implementation.

## 2. Test-first expectations
- **Test-Driven Development**: You must write or update tests before implementing logic.
- **Coverage**: There is a zero-tolerance policy for untested features.

## 3. Drift prevention
- **Zero Drift**: Backend DTOs and PWA models must match the OpenAPI spec exactly.
- **Schema Integrity**: Parity between the OpenAPI Specification, Mock API, and Backend implementation is mandatory.
- **Validation**: Schema integrity and anti-drift validation must occur before merging or completing any task.

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
- Validation and anti-drift checks (`task agent:drift`) have been executed and passed, confirming zero schema drift between the OpenAPI spec, Backend DTOs, Mock API, and PWA models.
- All logic changes are fully covered by passing tests.