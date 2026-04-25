---
name: openapi-specialist
description: Orchestrate the end-to-end API lifecycle. Ensure specs, rich examples, generated clients, and E2E tests are perfectly aligned.
---

# Skill: OpenAPI Specialist (The Negotiator)

Procedural guidance for adding or modifying API endpoints to ensure full-stack integrity and zero-drift between specifications and implementation.

## 1. The Core Lifecycle
When adding a new API or modifying an existing one, follow this sequence:

1. **Spec First**: Update `specs/openapi.yaml`. Ensure high-fidelity examples.
2. **Sync SDK**: Run `npm run api:generate` in the PWA.
3. **Verify Mock**: Run `npm run mock-api` and verify the UI displays the example data correctly.
4. **Wire Client**: Integrate the generated client into the UI components/services.
5. **Verify Implementation**: As the Backend is built, use `task agent:api` to discover new routes.
6. **Parity Check**: Run `task agent:reconcile` (via `api_tools.py`) to verify alignment.
7. **E2E Integrity**: Run `scripts/run-e2e-ci.sh` to ensure no regressions.

## 2. High-Fidelity Mocking (Prism)
Prism uses the `example` field in `openapi.yaml`. If your UI is empty or breaking, it's likely because the mock data is missing or low-quality.
- **MANDATORY**: Every response schema MUST have an `example`.
- **Edge Cases**: Include examples for empty lists `[]` or error responses if testing those paths.
- **Images**: Use valid image URLs (e.g., Unsplash) in mock data to avoid broken UI layouts in tests.

## 3. Client Generation (Kiota)
We use Microsoft Kiota for a strongly-typed SDK.
- **Command**: `npm run api:generate` (inside `pwa/`).
- **Post-Processing**: The command automatically runs `scripts/fix-kiota-imports.js` to fix TypeScript import extensions.
- **Verification**: Check `pwa/src/lib/api/generated` to ensure your new endpoint appears in the directory structure.

## 4. Wiring in Next.js
- **Services**: Prefer creating a wrapper service in `pwa/src/lib/api/` that initializes the `ApiClient` once.
- **Hooks**: Use standard React patterns to fetch data from the generated client.
- **Types**: Always use the generated types (e.g., `RecipeDto`, `ScheduleDays`) to ensure compile-time safety.

## 5. Verification Checklist
Before declaring an API task "Done", verify:
- [ ] `specs/openapi.yaml` reflects the final agreed-upon schema.
- [ ] `npm run api:generate` has been executed.
- [ ] UI displays mock data correctly when Prism is running.
- [ ] `scripts/run-e2e-ci.sh` passes 100%.
- [ ] `task agent:reconcile` (api_tools.py) shows "✅" for all layers.

## 6. Token Efficiency
- **Don't** read the entire `generated/` folder.
- **Do** check the specific `index.ts` file for the new endpoint path (e.g., `generated/api/schedule/index.ts`).
