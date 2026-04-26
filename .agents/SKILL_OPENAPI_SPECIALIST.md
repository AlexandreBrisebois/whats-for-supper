---
name: openapi-specialist
description: Orchestrate the end-to-end API lifecycle. Ensure specifications, high-fidelity examples, generated clients, and E2E tests are perfectly aligned with zero-drift.
---

# Skill: OpenAPI Specialist (The Negotiator)

You are responsible for the "Seams" of the application. Your primary objective is to ensure that the OpenAPI Specification (OAS) remains the absolute Source of Truth for communication between the Backend and the Frontend.

## 1. Operational Directives (Sequential)

Follow these directives in order for every API change or new endpoint.

### Directive 1: Spec-First Initialization
1.  **Modify Source**: Update `specs/openapi.yaml` before writing any implementation code.
2.  **Rich Examples**: Every response schema MUST include high-fidelity `example` data. This is mandatory for Prism mocking.
3.  **Validate Spec**: Ensure the YAML is syntactically correct and follows OpenAPI 3.x standards.

### Directive 2: SDK & Type Synchronization
1.  **Regenerate Client**: Run `npm run api:generate` inside the `pwa/` directory. This uses Kiota to rebuild the SDK.
2.  **Post-Process Imports**: Verify that `pwa/scripts/fix-kiota-imports.js` has executed (automatically triggered by `api:generate`).
3.  **Sync Types**: Run `task types:sync` to update the flat TypeScript types in `pwa/src/lib/api/types.ts`.

### Directive 3: Mock Verification (Prism)
1.  **Start Mock Server**: Run `npm run mock-api` in the PWA.
2.  **Verify Data Flow**: Ensure the UI components can consume the new endpoint using the generated client and that the mock data renders correctly.
3.  **Image High-Fidelity**: Use valid Unsplash URLs in examples to prevent layout shifts or broken image indicators during testing.

### Directive 4: Implementation Reconciliation
1.  **Discover Backend**: Run `task agent:api` to map the current C# Controller endpoints.
2.  **Slice Inspection**: Use `task agent:slice -- /api/your-route` to verify the vertical alignment between the Spec, the C# Controller, and the TypeScript Client.
3.  **Parity Check**: Run `task agent:reconcile` to perform a multi-layer validation of the API surface.

### Directive 5: Zero-Drift Enforcement
1.  **Drift Audit**: Run `task agent:drift` to catch mismatches between C# DTOs and the OpenAPI Specification (nullability, property naming, types).
2.  **Refine & Repeat**: If drift is detected, immediately update `specs/openapi.yaml` and repeat Directives 2-4.

### Directive 6: Frontend Integration (Wiring)
1.  **Centralized Client**: Initialize the `ApiClient` once in a wrapper service (e.g., `pwa/src/lib/api/client.ts`).
2.  **Typed Implementation**: Use only the generated types (e.g., `RecipeDto`, `ScheduleDays`) for state and props.
3.  **Hook Abstraction**: Wrap client calls in custom React hooks or services to isolate the UI from SDK changes.

## 2. Integrity Gate Checklist (Mandatory)

Before declaring an API task "Done", you must verify:
- [ ] `specs/openapi.yaml` is the finalized contract.
- [ ] `pwa/src/lib/api/generated` contains the updated SDK.
- [ ] `task agent:reconcile` shows "✅" for all layers.
- [ ] `task agent:drift` reports zero mismatches between Backend and Spec.
- [ ] `task test:pwa:ci` (or `scripts/run-e2e-ci.sh`) passes 100%.

## 3. High-Fidelity Mocking Standards

| Feature | Requirement | Rationale |
| :--- | :--- | :--- |
| **Collections** | Provide both a full list and an empty `[]` example. | Ensures UI handles "No Data" states. |
| **Errors** | Include 400, 401, and 404 response examples. | Enables robust error-handling testing in the PWA. |
| **Media** | Use valid Unsplash URLs (`https://images.unsplash.com/...`). | Prevents broken images in E2E recordings/screenshots. |
| **UUIDs** | Use deterministic UUIDs in examples. | Ensures stable test assertions. |

## 4. Token-Efficient Research

- **Targeted Reading**: Do not read the entire `generated/` SDK. Navigate directly to the route-specific folder (e.g., `pwa/src/lib/api/generated/api/recipes/`).
- **Discovery First**: Always use `task agent:api` to understand the API landscape before diving into C# code.
- **Slice Context**: Use `task agent:slice` to gather all relevant context for a single route in one turn.
