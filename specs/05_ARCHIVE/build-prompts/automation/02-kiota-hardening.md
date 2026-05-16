# Build Prompt: API Contract Hardening (Kiota & Prism)

## Persona
Sr. Full-Stack Engineer / Contract Architect

## Objective
Finalize the migration from the legacy manual API clients to the automated **Kiota SDK** and **Prism Mocking** system. Focus on hardening the TypeScript environment by resolving all type mismatches in the UI components and completing the service migrations.

## Context
- **ADR**: [015-automated-api-contract-workflow.md](file:///Users/alex/Code/whats-for-supper/specs/decisions/015-automated-api-contract-workflow.md)
- **Workflow**: [SKILL_API_DISCOVERY.md](file:///Users/alex/Code/whats-for-supper/.agents/SKILL_API_DISCOVERY.md)
- **Status**: Infrastructure is in place. `planner.ts` is migrated but using temporary `unknown as` casting to bypass strict Next.js component errors.

## Execution Tasks
1. **Complete Service Migration**: 
   - Refactor `pwa/src/lib/api/discovery.ts`, `recipes.ts`, and `family.ts` to use the `apiClient` from `./api-client.ts`.
   - Delete the legacy `client.ts` (Axios wrapper) and `types.ts` (Manual OpenAPI types) once all references are gone.
2. **Harden UI Typings**: 
   - Open `pwa/src/app/(app)/planner/page.tsx` and related components.
   - Remove the `as unknown as Type` hacks in `planner.ts`.
   - Update the UI components to properly handle `null | undefined` checks as enforced by the Kiota-generated models.
3. **Verify via Prism**: 
   - Run `npm run mock-api` in the PWA.
   - Ensure `python3 scripts/agent/reconcile_api.py` still reports **Perfect Parity**.
   - Run `npm run typecheck` and do not finish until there are **zero errors**.

## Constraints
- **DO NOT** modify `specs/openapi.yaml` unless you find a genuine schema error that prevents correct code generation.
- **DO NOT** manually edit any files in `pwa/src/lib/api/generated/`. Always use `npm run api:generate` if the spec changes.
- **STRICT SCOPE**: Focus only on the API plumbing and the component-level logic needed to satisfy the new types. Do not redesign the UI.

## Definition of Done
- `npm run typecheck` succeeds with 0 errors.
- `python3 scripts/agent/reconcile_api.py` reports Perfect Parity.
- All 5 schedule endpoints in the Planner UI are verified working against the Prism mock.
