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

## 5. Definition of done
- The OpenAPI specification accurately reflects the required changes.
- **Atomic Sync**: Controller changes (signatures, status codes) are synchronized with the OpenAPI spec and client regeneration in a single atomic step.
- Tests are written or updated before implementation code.
- **Multi-Layer Verification**: For contract-impacting changes, unit tests have been executed and passed on BOTH sides of the seam (e.g., `dotnet test` for the API AND `npm run test:unit` for the PWA).
- Validation and anti-drift checks (`task agent:drift`) have been executed and passed, confirming zero schema drift between the OpenAPI spec, Backend DTOs, Mock API, and PWA models.
- All logic changes are fully covered by passing tests.