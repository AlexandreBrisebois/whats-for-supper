# Build Prompt: Outstanding Work — 2026-05-02

## Authority

Follow repo doctrine in order: `specs/openapi.yaml` → this prompt → tests → implementation.  
Execution harness: `.agents/core/execution-harness.md`  
Completion gate: `task agent:drift` → `task agent:test:impact` → `task review`

---

## Context

This prompt addresses four independent items left outstanding after the 2026-05-02 session. Each item has a clear seam and can be executed independently. Execute them in the order listed — each one unblocks `task review` further.

---

## Item 1 — Fix `TestWebApplicationFactory` compile errors (blocks `task review`)

**Why broken:** `TestWebApplicationFactory` was refactored to use `InMemoryRecipeStore` (removing disk I/O), but `TempRecipesRoot` — a property that previously exposed a temp directory path — was removed without updating the tests that reference it.

**Files affected:**
- `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` — `TempRecipesRoot` no longer exists
- `api/src/RecipeApi.Tests/Integration/ManagementBackupIntegrationTests.cs` — line 54, 76 reference `_factory.TempRecipesRoot`
- `api/src/RecipeApi.Tests/Integration/RecipeDescribeIntegrationTests.cs` — line 149, 180 reference `_factory.TempRecipesRoot`
- `api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs` — line 139, 160 reference `_factory.TempRecipesRoot`

**Fix:** The tests that use `TempRecipesRoot` were asserting on disk state (checking that `recipe.info` files were written). Now that `IRecipeStore` is `InMemoryRecipeStore` in tests, those assertions should use the in-memory store instead. Update each failing test to:
1. Resolve `IRecipeStore` from `_factory.Services` via `_factory.Services.GetRequiredService<IRecipeStore>()`.
2. Replace `File.Exists(Path.Combine(_factory.TempRecipesRoot, ...))` with `await store.InfoExistsAsync(recipeId)` or `await store.ReadInfoAsync(recipeId)`.
3. Remove all `TempRecipesRoot` references — do not add the property back.

**Done when:** `dotnet test api/src/RecipeApi.Tests/RecipeApi.Tests.csproj` compiles and all tests pass.

---

## Item 2 — Recipe readiness as recipe domain concern

**Full spec:** `specs/05_BUILD_PROMPTS/recipe-readiness-domain-fix.md`  
**ADR:** `specs/decisions/033-recipe-readiness-as-recipe-domain-concern.md`

Execute phases A → B → C in that file exactly as written. Summary:

- **Phase A (backend):** Rename `MarkGotoReadyProcessor` → `RecipeReadyProcessor`. Remove all `family_settings` writes from it. Update both workflow YAMLs (`goto-synthesis.yaml`, `recipe-import.yaml`). Update `Program.cs` registration. Update backend tests.
- **Phase B (PWA):** Remove `status` from `GotoValue` interface. Add `recipeStatus` local state to `HomeCommandCenter` and `FamilyGOTOSettings`. Fetch `GET /api/recipes/{id}/status` on mount; poll every 5s while `'pending'`, stop on `'ready'`. Remove `status` from `saveSetting` calls in the capture page.
- **Phase C (E2E):** Update `mock-api.ts` — remove `status` from `family_goto` mock value, add `GET /api/recipes/{id}/status` mock returning `'ready'` by default. Update `home-race.spec.ts`. Add poll-until-ready E2E test.

**Done when:** `task review` exits clean and `task agent:drift` is green.

---

## Item 3 — Phase 14 remaining phases (UX hardening)

**Full spec:** `.kiro/specs/phase-14-ux-hardening.md`

Phases A, B, C, and E are not yet started. Phase D (TonightPivotCard direct landing) is partially done — D3 guard and D4 fetch-always are already applied. Confirm D5 (typecheck) and D6 (Playwright) pass before marking Phase D complete, then proceed in order:

- **Phase A** — Fix `parseRecipeSteps` in `pwa/src/lib/cooking/stepParser.ts` to handle `HowToSection` objects. Add unit tests.
- **Phase B** — Remove standalone "Cooked" button from `TonightMenuCard`. Add `onCooked?: () => void` to `CooksMode` and wire it in `HomeCommandCenter` and `planner/page.tsx`.
- **Phase C** — Add "Close Voting" button to the planner header when `isVotingOpen` is true. Calls `lockSchedule`, clears voting state.
- **Phase E** — Fix "Plan next week" transition: reset `isVotingOpen`/`isLocked` on `setWeekOffset`, sync from API status on load, navigate + open voting after finalize, show success toast.
- **Phase F** — `task review` gate.

Execute one phase at a time. Run `task agent:test:impact` after each phase. Do not combine phases.

---

## Item 4 — E2E coverage gap: SSR null-name recipe shows pivot card

**Gap identified in:** `docs/ui/flows/no-menu-goto-home-state.md` (coverage table)

**What's missing:** A test that verifies when SSR passes `todaysRecipe = { id: 'uuid', name: null }` (a broken import state), `HomeCommandCenter` falls through to `TonightPivotCard` rather than rendering `TonightMenuCard`.

This cannot be covered by Playwright (SSR is not interceptable — see ADR 032 and `.kiro/steering.md` §6). It requires a unit test.

**Fix:** Add a unit/component test for `HomeCommandCenter` using a testing library (Vitest + React Testing Library if available, or a simple render test). The test:
1. Renders `<HomeCommandCenter todaysRecipe={{ id: 'some-uuid', name: null }} />`.
2. Mocks `getSchedule` to resolve with the same null-name recipe.
3. Mocks `loadSetting` to return null (no GOTO).
4. Asserts `tonight-pivot-card` is visible and `tonight-menu-card` is not.

If Vitest is not yet configured in the PWA, add it before writing the test — follow the existing `pwa/package.json` test setup if any, or use the minimal Vitest + jsdom config pattern.

**Done when:** The test exists, passes, and `task review` is green.

---

## Completion gate (all items)

1. `task agent:drift` — zero drift.
2. `dotnet test api/src/RecipeApi.Tests/RecipeApi.Tests.csproj` — all pass.
3. `task review` — formatting, linting, typecheck, full suite clean.
