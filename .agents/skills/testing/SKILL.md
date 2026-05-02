---
name: testing
description: Procedural guidance for End-to-End (E2E) testing, Contract-First verification, and Quality Assurance (QA).
---

# Skill: Universal Testing & Quality Assurance

This skill provides the operational logic for ensuring system integrity, contract parity, and zero-regression development.

## 1. The Quality Assurance Mission
**Objective**: Maintain a 100% pass rate for all tests and zero drift between the Application Programming Interface (API) specification and the implementation.
- **Principle**: Tests are the documentation of behavior. If a test fails, the feature is broken.
- **Constraint**: No feature is complete until it passes the "Integrity Gate" (`scripts/run-e2e-ci.sh`).

## 2. Test-Driven Development (TDD) Workflow
You must follow this sequence for every change:

1.  **Specification Phase**: Update the [specs/openapi.yaml](specs/openapi.yaml) to reflect model or endpoint changes.
2.  **Test Definition Phase**:
    *   **Frontend**: Write End-to-End (E2E) tests in `pwa/e2e/`. Use [Next.js Testing Detail](SKILL_NEXTJS_TESTING.md) for locator rules.
    *   **Backend**: Write xUnit unit or integration tests in the `api/` project.
3.  **Contract Mocking Phase**: Ensure the [specs/openapi.yaml](specs/openapi.yaml) contains rich examples. E2E tests use `page.route()` intercepts — fixture data in `pwa/e2e/` must stay in sync with OpenAPI examples.
4.  **Implementation Phase**: Write the minimum code required to make the tests pass.
5.  **Verification Phase**: Run the reconciliation task to ensure parity across Spec, Mock, and Code.

## 3. Testing Tiers & Commands
Execute these commands from the project root using `task`.

| Tier | Purpose | Command |
| :--- | :--- | :--- |
| **Frontend Dev Loop** | Runs formatting, linting, and E2E tests. | `task review` |
| **Backend Verification** | Runs all .NET unit and integration tests. | `task api:test` |
| **Integrity Gate** | Final CI-parity check for the full PWA suite. | `task test:pwa:ci` |
| **Parity Check** | Validates Spec ↔ Mock ↔ API synchronization. | `task agent:reconcile` |

## 4. Operational Directives
1.  **Contract-First Priority**: The OpenAPI specification is the "Source of Truth". E2E tests use `page.route()` intercepts; fixture data must match OpenAPI examples. The `contract-integrity-gate` CI job is the authoritative parity check (ADR 030).
2.  **Zero Brittle Policy**: Use `data-testid` for all locators. Do not use fragile CSS selectors or volatile text-based matching.
3.  **Regression Discipline**: Every bug fix must include a regression test that fails without the fix and passes with it.
4.  **Stateful Mocking**: If the OpenAPI spec is insufficient for complex state, use specialized mocks in `pwa/e2e/` rather than relying on a global stateful mock file.
