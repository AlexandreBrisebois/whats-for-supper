# Build Prompt 03-mock-api-and-store.md
**Persona**: Frontend Architect / State Management Specialist.

## Strict Scope
- **TARGET**: 
    - `pwa/e2e/mock-api.ts`
    - `pwa/src/store/familyStore.ts`
- **FORBIDDEN**: 
    - Do not modify UI components.

## The Seams (Contract)
Use the newly generated Kiota client methods for `settings`.

## Technical Skeleton
1.  **Mock API**:
    - Add a handler for `/\/api\/settings\/.*/`.
    - Provide a default mock value for `family_goto`: `{ description: "Our Family Spaghetti" }`.
2.  **Zustand Store (`familyStore.ts`)**:
    - Add `familySettings: Record<string, any>` to state.
    - Implement `loadSetting(key: string)`: Calls `apiClient.api.settings.byKey(key).get()`.
    - Implement `saveSetting(key: string, value: any)`: Calls `apiClient.api.settings.byKey(key).post({ value })`.

## Dependency Anchors
- Consume `apiClient` from `@/lib/api/api-client`.

## Execution Limit
Implement ONLY the state and mock logic. Do not build UI.

## TDD Protocol
- **Verification**: Run `npm run lint` and ensure the store compiles. 
- (Optional) Verify via a small test script in `scratch/`.

## Verification Command
```bash
npm run typecheck
```

## Handover Requirement
- List of new store actions.
- Confirmation of mock API coverage.
