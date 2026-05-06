# Feature: Phase 12 — No-Menu Home State ("Tonight Pivot")

## Intent

When no meal is planned for tonight, the Home screen currently shows a generic `SmartPivotCard` with quick-fix chips. This feature replaces that empty state with a purposeful `TonightPivotCard` that surfaces a family-configured "GOTO" fallback meal.

The GOTO is set once in Settings: the family enters a description (e.g. "Our Family Spaghetti") and the backend synthesizes a full `RecipeDto` — with image, ingredients, and steps — via a Recipe Agent (AI). That synthesized recipe is stored in the library and linked as the GOTO. This means "Confirm GOTO" on the Home card immediately works with Cook's Mode and Grocery Lists, because it plans a real recipe, not a stub.

The card offers three actions: confirm the GOTO (plans the synthesized recipe), discover something new, or order in. Settings persistence is backed by a new `/api/settings/{key}` contract. The synthesis call is scaffolded as a placeholder in this phase and wired to the AI agent in a follow-on phase.

---

## Contracts & Routes

All new routes must be added to `specs/openapi.yaml` before any backend or frontend work begins.

### New endpoints
- `GET /api/settings/{key}` — returns `{ data: SettingsDto }` where `SettingsDto = { key: string, value: object }`.
- `POST /api/settings/{key}` — accepts `SettingsDto`, upserts the value, returns `{ data: SettingsDto }`.

### Existing endpoints touched (no contract changes)
- `GET /api/schedule?weekOffset=0` — read to determine `currentRecipe` on Home.
- `POST /api/schedule/assign` — used by "Confirm GOTO" to plan the synthesized recipe.
- `POST /api/recipes` — used by the synthesis stub to store the generated recipe in the library.

### Schema additions to `specs/openapi.yaml`
```yaml
SettingsDto:
  type: object
  required: [key, value]
  properties:
    key:   { type: string }
    value: { type: object, additionalProperties: true }
```

### Security
Both settings endpoints require the `FamilyMemberId` security scheme (same as all other authenticated routes).

### Response envelope
All responses follow the existing `{ data: <payload> }` envelope — match the pattern used by `GET /api/schedule` and `PATCH /{weekOffset}/grocery`.

---

## Phases & Tasks

Work is split into four phases. Each phase has a clear seam — the contract or component boundary — and delivers something independently verifiable before the next phase begins.

---

### Phase A — Contract & Client (seam: `specs/openapi.yaml` + generated Kiota client + mock API stub)

**Goal**: The settings contract exists in the spec, the Kiota client is regenerated, and the E2E mock API has a stub handler. Nothing else changes.

1. [ ] Add `SettingsDto` schema to `specs/openapi.yaml` under `components/schemas`.
2. [ ] Add `GET /api/settings/{key}` path to `specs/openapi.yaml` with `FamilyMemberId` security, `200` response wrapping `SettingsDto`, and a `404` for unknown keys.
3. [ ] Add `POST /api/settings/{key}` path to `specs/openapi.yaml` with `FamilyMemberId` security, request body `SettingsDto`, `200` response wrapping `SettingsDto`.
4. [ ] Run `task agent:reconcile` to regenerate the Kiota client. Verify `pwa/src/lib/api/generated/` contains a `settings` namespace with `byKey` accessor.
5. [ ] Add settings mock handler to `pwa/e2e/mock-api.ts` inside `setupCommonRoutes` (TDD gate — must land with the contract, not later):
   ```ts
   // Persistent in-memory store for settings across GET/POST within a test
   const settingsStore: Record<string, unknown> = {
     family_goto: null, // default: no GOTO configured
   };
   await page.route(/\/(?:backend\/)?api\/settings\/(.+)/, async (route) => {
     const key = new URL(route.request().url()).pathname.split('/').pop()!;
     if (route.request().method() === 'GET') {
       if (settingsStore[key] == null) {
         await route.fulfill({ status: 404, contentType: 'application/json',
           body: JSON.stringify({ error: 'Not found' }) });
       } else {
         await route.fulfill({ status: 200, contentType: 'application/json',
           body: JSON.stringify({ data: { key, value: settingsStore[key] } }) });
       }
     } else {
       const body = route.request().postDataJSON();
       settingsStore[key] = body.value;
       await route.fulfill({ status: 200, contentType: 'application/json',
         body: JSON.stringify({ data: { key, value: body.value } }) });
     }
   });
   ```
   Note: `settingsStore` must be scoped per-test (reset in `beforeEach`) to avoid cross-test contamination.
6. [ ] Run `task agent:drift` — zero drift confirmed.

**Done when**: `task agent:drift` passes, the generated client exposes `apiClient.api.settings.byKey(key).get()` and `.post(...)`, and the mock handler is in `setupCommonRoutes`.

---

### Phase B — Backend Persistence (seam: running API returning correct JSON)

**Goal**: The settings endpoints are live and tested. The PWA is not touched yet.

7. [ ] Add `family_settings` table to `api/database/schema.sql`:
   ```sql
   CREATE TABLE family_settings (
       id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
       key         text UNIQUE NOT NULL,
       value       jsonb NOT NULL,
       updated_at  timestamptz DEFAULT now() NOT NULL
   );
   ```
8. [ ] Add `FamilySetting` model to `api/src/RecipeApi/Models/FamilySetting.cs` following the `WeeklyPlan` pattern (`[Table]`, `[Column]`, `[Key]`).
9. [ ] Register `DbSet<FamilySetting> FamilySettings` in `RecipeDbContext` and add `OnModelCreating` configuration (key, unique index on `key`, `updated_at` default).
10. [ ] Create `SettingsDto.cs` in `api/src/RecipeApi/Dto/` as a `record` with `Key` and `Value` (`JsonElement`) properties, matching the OpenAPI schema.
11. [ ] Implement `SettingsService.cs` in `api/src/RecipeApi/Services/` with:
    - `GetSettingAsync(string key)` — returns `FamilySetting?`, null if not found.
    - `UpsertSettingAsync(string key, JsonElement value)` — insert or update, return saved entity.
    - `SynthesizeRecipeAsync(string description)` — **stub only in this phase**: logs the description and returns a placeholder `RecipeDto` with a generated name and empty ingredients. This method is the hook for the Recipe Agent integration in a follow-on phase. Do not call any AI service yet.
12. [ ] Implement `SettingsController.cs` in `api/src/RecipeApi/Controllers/` following the `ScheduleController` pattern:
    - `[HttpGet("{key}")]` → calls `GetSettingAsync`, returns `Ok(new { data = dto })` or `NotFound()`.
    - `[HttpPost("{key}")]` → calls `UpsertSettingAsync`, returns `Ok(new { data = dto })`.
13. [ ] Register `SettingsService` in `Program.cs` (DI).
14. [ ] Write integration tests in `api/src/RecipeApi.Tests/Integration/SettingsIntegrationTests.cs`:
    - `GET` on unknown key returns `404`.
    - `POST` then `GET` round-trips the value correctly.
    - Second `POST` with same key updates (upsert), does not duplicate.
    - `SynthesizeRecipeAsync` stub returns a non-null placeholder (smoke test only — no AI call).
15. [ ] Run `task agent:test:impact` — all settings tests pass.
16. [ ] Run `task agent:drift` — zero drift confirmed.

**Done when**: `task agent:test:impact` is green and `curl http://localhost:9001/api/settings/family_goto` returns `404`, and a POST followed by GET returns the saved value.

---

### Phase C — PWA State & UI (seam: `familyStore` settings actions + `TonightCardBase` + `TonightPivotCard` component)

**Goal**: The store can load/save settings via the real Kiota client, the shared card shell is extracted, the new card exists as a standalone component, and `HomeCommandCenter` is wired. No E2E tests yet.

17. [ ] Add settings state and actions to `pwa/src/store/familyStore.ts`:
    - State: `familySettings: Record<string, unknown>`.
    - Action `loadSetting(key: string): Promise<unknown | null>` — calls `apiClient.api.settings.byKey(key).get()`, stores result in `familySettings[key]`, returns value or `null` on 404.
    - Action `saveSetting(key: string, value: unknown): Promise<void>` — calls `apiClient.api.settings.byKey(key).post({ key, value })`, updates `familySettings[key]`.
    - Verify Kiota method shape from generated client before writing (see Risk 3).
18. [ ] Extract `TonightCardBase` from `TonightMenuCard.tsx`:
    - Identify the outer container: `aspect-[4/5] w-full`, `rounded-[3rem]`, `bg-white`, `shadow-2xl`, `border-2 border-white/20`.
    - Create `TonightCardBase` as a local component in the same file (or `TonightCardBase.tsx` if it grows). Props: `children`, optional `className`.
    - Refactor `TonightMenuCard` to use `TonightCardBase` as its root — all existing flip animation, backface-hidden, and child elements must remain pixel-perfect.
    - Run `npx playwright test e2e/home-recovery.spec.ts` to confirm zero regression on the planned-state tests before proceeding.
19. [ ] Create `pwa/src/components/home/TonightPivotCard.tsx` built on `TonightCardBase`:
    - Props: `gotoDescription: string | null`, `gotoRecipeId: string | null`, `onConfirmGoto: () => void`, `onDiscover: () => void`, `onOrderIn: () => void`.
    - Visual: inherits Solar Earth shell from `TonightCardBase`.
    - Header: "TONIGHT'S MENU" label + "30-45 MINS" badge (matching `TonightMenuCard` front).
    - Image area: placeholder `Utensils` icon + gradient (same empty-state as `TonightMenuCard`).
    - Body: display `gotoDescription` if set, otherwise "Nothing planned yet" in muted style. If `gotoRecipeId` is null, show a "Set your GOTO →" link to the settings page.
    - Footer: three action buttons — "Confirm GOTO" (`data-testid="confirm-goto-btn"`, disabled if `gotoRecipeId` is null), "Discover" (`data-testid="discover-btn"`), "Order In" (`data-testid="order-in-btn"`).
    - Root element: `data-testid="tonight-pivot-card"`.
20. [ ] Create `pwa/src/components/profile/FamilyGOTOSettings.tsx`:
    - Loads `family_goto` setting on mount via `loadSetting`. The stored value shape is `{ description: string, recipeId: string }`.
    - Shows current GOTO recipe name if set, with a "Change" button that opens `QuickFindModal` to pick a new recipe.
    - On recipe selection: calls `saveSetting('family_goto', { description: recipe.name, recipeId: recipe.id })`.
    - Shows a brief "Saved" confirmation on success.
    - Shows "Hearth Magic" loading state (spinner + "Synthesizing your GOTO…" label) while the save is in flight — this is the animation hook for when AI synthesis is wired in the follow-on phase.
21. [ ] Add `<FamilyGOTOSettings />` to `pwa/src/app/(app)/profile/settings/page.tsx` below the Language section.
22. [ ] Update `HomeCommandCenter.tsx`:
    - Load `family_goto` setting on mount (after schedule sync, before render). Extract `gotoDescription` and `gotoRecipeId` from the stored value.
    - Replace the `SmartPivotCard` render condition with `TonightPivotCard` when `!currentRecipe && !isCooked`:
      - `onConfirmGoto`: if `gotoRecipeId` is set, calls `assignRecipeToDay(0, dayIndex, { id: gotoRecipeId, name: gotoDescription })` then `router.refresh()`. If not set, opens `showQuickFind(true)`.
      - `onDiscover`: sets `showQuickFind(true)` — same as existing `quick-find` chip.
      - `onOrderIn`: calls `handleRecoveryAction('order_in')` — reuses existing logic.
    - Keep all existing `isSkipped`, `sessionDone`, `isCooked` logic untouched.
23. [ ] Run `npm run typecheck` — zero type errors.

**Done when**: Running the PWA locally shows `TonightPivotCard` when no recipe is planned, Settings page has the GOTO picker with "Hearth Magic" loading state, and the three card actions behave correctly.

---

### Phase D — E2E Hardening (seam: Playwright test suite)

**Goal**: The existing recovery tests are updated to the new card, new tests cover the GOTO flow, and the full suite is green.

24. [ ] Update `pwa/e2e/home-recovery.spec.ts`:
    - Replace all `getByTestId('smart-pivot-card')` assertions with `getByTestId('tonight-pivot-card')`.
    - In `beforeEach`, the settings mock defaults to `family_goto: null` (404) — the pivot card should show the "Set your GOTO →" prompt. For tests that exercise "Confirm GOTO", override the mock to return `{ description: 'Our Family Spaghetti', recipeId: MOCK_IDS.RECIPE_LASAGNA }`.
25. [ ] Add new test: "Confirm GOTO plans a meal" — sets `family_goto` mock with a valid `recipeId`, loads home, clicks `confirm-goto-btn`, asserts `POST /api/schedule/assign` is called with the correct `recipeId`, and `TonightMenuCard` appears after refresh.
26. [ ] Add new test: "Discover opens QuickFind modal" — clicks `discover-btn`, asserts `QuickFindModal` is visible.
27. [ ] Add new test: "Order In marks day as skipped" — clicks `order-in-btn`, asserts `validate` POST is called with `status: 3`.
28. [ ] Add new test: "No GOTO configured shows prompt" — settings mock returns 404, asserts `confirm-goto-btn` is disabled and "Set your GOTO →" link is visible.
29. [ ] Run `npx playwright test e2e/home-recovery.spec.ts` — all tests pass.
30. [ ] Run `task review` — formatting, linting, type-check, and full test suite pass.

**Done when**: `task review` exits clean and the Playwright report is all green.

---

## Risks & Questions

1. **"Confirm GOTO" needs a real recipe ID — resolved** — The GOTO setting stores `{ description: string, recipeId: string }`. `FamilyGOTOSettings` uses `QuickFindModal` to pick the recipe and saves both fields. `TonightPivotCard` disables "Confirm GOTO" when `gotoRecipeId` is null and shows a "Set your GOTO →" prompt instead. `HomeCommandCenter` uses `gotoRecipeId` directly with `assignRecipeToDay`. No stub recipe is needed.

2. **`family_settings` table vs EF migrations** — This project uses `schema.sql` + auto-apply on startup, not EF migrations. Task 6 adds the table to `schema.sql`. If the DB container is already running with the old schema, a `task up` rebuild is required to apply it. Document this in Notes when Task 6 is completed.

3. **Kiota method shape** — The generated accessor path (`apiClient.api.settings.byKey(key)`) is an assumption based on Kiota naming conventions for path parameters. Verify the actual generated shape after Task 4 before writing Tasks 16–17.

4. **`SmartPivotCard` removal** — `SmartPivotCard` is currently the only no-recipe state. Removing it means the "15 Min Fix" and "Pantry Pasta" roadmap chips disappear. This is intentional per the phase-12 design. The component is not deleted — it is simply no longer rendered in `HomeCommandCenter`.

5. **Settings auth** — Both settings endpoints require `X-Family-Member-Id`. The existing `apiClient` injects this header globally. Verify this is the case before writing Task 16 — if not, the store actions will silently fail auth.

6. **`TonightCardBase` and Framer Motion** — The flip animation in `TonightMenuCard` uses `perspective-1000` and `preserve-3d` on the outer container. When extracting `TonightCardBase`, these CSS properties must stay on the wrapper that `TonightMenuCard` controls — not on the base itself — or the flip will break. `TonightPivotCard` does not flip, so it should not inherit those properties.

7. **Hearth Magic synthesis is a stub in this phase** — `SynthesizeRecipeAsync` is scaffolded but does not call any AI service. The "Hearth Magic" loading animation in `FamilyGOTOSettings` fires during the `saveSetting` call. In this phase, the save is fast (no AI), so the animation will be brief. This is acceptable — the hook is in place for the follow-on phase.

---

## Notes / Decisions

- 2026-04-30: Spec created. Mock API handler moved to Phase A (TDD gate on the contract) per build prompt 01. `TonightCardBase` extraction made an explicit task (17) per build prompt 04. "Hearth Magic" synthesis stub added to `SettingsService` per build prompt 02 and the implementation plan.
- The GOTO value shape is `{ description: string, recipeId: string }` — decided in this spec. The settings system is intentionally generic (`key/value jsonb`) to support future keys without schema changes.
- **Single GOTO is intentional.** A list of favorites would recreate the decision-paralysis problem this feature solves. The correct evolution path is a `family_goto_pool` key (array of `{ description, recipeId }`) introduced in a future phase, with a shuffle mechanic on the `TonightPivotCard`. The generic `key/value` schema supports this without any contract changes.
- The `SmartPivotCard` is not deleted from the codebase in this phase — it is simply no longer rendered in `HomeCommandCenter`. Remove in a future cleanup pass.
- Phase C is the widest phase. If it proves too large for a single session, split at task 17: tasks 16–17 (store + base extraction) in one session, tasks 18–22 (new components + wiring) in the next.
