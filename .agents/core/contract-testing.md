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
- **Strict Typing**: Hardcoded string IDs (e.g., `"recipe-1"`) are strictly forbidden. Mock data must adhere strictly to the schema contract.

## 5. Definition of done
- The OpenAPI specification accurately reflects the required changes.
- Tests are written or updated before implementation code.
- Validation and anti-drift checks have been executed and passed, confirming zero schema drift between the OpenAPI spec, Backend DTOs, Mock API, and PWA models.
- All logic changes are fully covered by passing tests.