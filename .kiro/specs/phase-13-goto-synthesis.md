# Feature: Phase 13 — GOTO Recipe Synthesis

## Intent

The family GOTO is currently set by picking an existing recipe from the library. This phase adds three new paths — all accessible from a single "Change" bottom sheet in `FamilyGOTOSettings`:

1. **Pick from library** — existing `QuickFindModal`, no change, `status: 'ready'` immediately
2. **Describe it** — type a description, AI synthesizes a full recipe (name, ingredients, steps, hero image)
3. **Capture it** — take a photo (pasta box, recipe card, handwritten note), existing `recipe-import` pipeline extracts the recipe

All three paths produce a `recipeId` linked to the GOTO setting. The home card only surfaces the GOTO when `status === 'ready'`. The "Change" sheet replaces the current single "Pick from library" button — it is the only entry point for all three paths.

---

## Dead Ends & Risks (Pre-Spec Audit)

### Dead End 1 — `SyncRecipeProcessor` enforces `ImageCount > 0`
`SyncRecipeProcessor.SyncDiskToDb` throws if `ImageCount <= 0`. The describe path has no images.
**Resolution**: `goto-synthesis` workflow uses `MarkGotoReadyProcessor` instead of `SyncRecipe`. It writes DB fields directly and flips `status = 'ready'` on the setting.

### Dead End 2 — `useCapture` requires at least one image
`submitRecipe()` calls `validateImageCount` and returns null if zero images.
**Resolution**: The describe path uses a new `POST /api/recipes/describe` endpoint (JSON body, no files). It does not go through `useCapture`.

### Dead End 3 — Home card shows description before synthesis completes
Showing a name for a stub recipe means "Confirm GOTO" plans a recipe with no ingredients or steps.
**Resolution**: `status` field in the setting value gates the home card. `HomeCommandCenter` treats `status !== 'ready'` as no GOTO configured. `MarkGotoReadyProcessor` is the only writer of `'ready'`.

### Dead End 4 — `ExtractRecipe` expects image files on disk
The describe path has no images at trigger time.
**Resolution**: `goto-synthesis` uses `SynthesizeRecipeProcessor` (text prompt → `recipe.json` + `recipe.info`), not `ExtractRecipe`. The capture path uses the existing `recipe-import` workflow unchanged.

### Dead End 5 — Workflow fails after GOTO setting is saved
If synthesis fails, the setting points to a broken stub forever.
**Resolution**: `status: 'pending'` is the guard. The home card and "Confirm GOTO" stay disabled. Settings page shows a failure state. `MarkGotoReadyProcessor` only runs on success.

### Dead End 6 — `FamilyGOTOSettings` has no entry point for new paths
**Resolution**: Replace the current "Pick from library" button with a "Change" bottom sheet offering all three options. `?intent=goto` on the capture page wires the post-capture `saveSetting` call.

### Dead End 7 — `GenerateHero` processor
**NOT A DEAD END**: `RecipeHeroAgent` (`ProcessorName = "GenerateHero"`) is already implemented and registered. It reads `recipe.json` from disk and generates a hero via Gemini. No new code needed.

### Dead End 8 — `recipe-import` workflow has no `MarkGotoReady` step
The capture path uses `recipe-import` which ends with `SyncRecipe`. After sync, the GOTO setting is still `status: 'pending'`.
**Resolution**: When triggered with `intent=goto`, the workflow trigger endpoint appends `MarkGotoReady` as an additional task after `SyncRecipe`. Alternatively, `MarkGotoReadyProcessor` is added as an optional final step in `recipe-import.yaml` that only runs when `recipeId` matches a pending GOTO setting. The simpler approach: `MarkGotoReadyProcessor` always checks — if no matching GOTO setting exists, it no-ops. This makes it safe to append to any workflow.

### Dead End 9 — Switching from "picked" to "described" (or vice versa)
If a library recipe is the current GOTO and mom wants to describe instead, the old recipe stays in the library. The GOTO setting is simply overwritten. No delete needed. The library is additive.
**Resolution**: "Change" always creates a new recipe (or picks an existing one). Old recipes accumulate in the library — acceptable. A library delete UI is a separate follow-up (`DELETE /api/recipes/{id}` already exists in the API).

---

## Stored Value Shape

```json
{
  "description": "Our family spaghetti",
  "recipeId": "uuid",
  "status": "pending" | "ready"
}
```

Backward compatible: existing values without `status` (set via the old `QuickFindModal`) are treated as `"ready"`.

---

## Workflows

### `goto-synthesis` (new — for the describe path)
```yaml
id: goto-synthesis
parameters:
  - recipeId
  - description
tasks:
  - id: synthesize_recipe
    processor: SynthesizeRecipe
    payload:
      recipeId: "{{ recipeId }}"
      description: "{{ description }}"
  - id: generate_hero
    processor: GenerateHero
    depends_on: [synthesize_recipe]
    payload:
      recipeId: "{{ recipeId }}"
  - id: mark_goto_ready
    processor: MarkGotoReady
    depends_on: [generate_hero]
    payload:
      recipeId: "{{ recipeId }}"
```

### `recipe-import` (existing — capture path appends `MarkGotoReady`)
```yaml
# Existing tasks unchanged. When triggered with intent=goto,
# mark_goto_ready is appended after sync_recipe.
  - id: mark_goto_ready
    processor: MarkGotoReady
    depends_on: [sync_recipe]
    payload:
      recipeId: "{{ recipeId }}"
```

### Processors
| Processor | File | Status |
|---|---|---|
| `SynthesizeRecipe` | `Processors/SynthesizeRecipeProcessor.cs` | **New** |
| `MarkGotoReady` | `Processors/MarkGotoReadyProcessor.cs` | **New** |
| `GenerateHero` | `Agents/RecipeHeroAgent.cs` | Exists ✓ |
| `ExtractRecipe` | `Agents/RecipeAgent.cs` | Exists ✓ |
| `SyncRecipe` | `Processors/SyncRecipeProcessor.cs` | Exists ✓ |

---

## New API Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/recipes/describe` | Create stub recipe from text, trigger `goto-synthesis` |
| `GET` | `/api/recipes/{id}/status` | Check if recipe is `pending` or `ready` |

---

## Tasks

Work is split into six phases. Each phase is independently shippable and has a clear seam. Stop at any task boundary and resume without context loss.

---

### Phase A — Contract (seam: `specs/openapi.yaml` + Kiota client + E2E mocks)

**Stop condition**: Kiota client has new accessors, E2E mocks are in place, zero drift.

- [x] A1. Add `POST /api/recipes/describe` to `specs/openapi.yaml` — request body `DescribeRecipeDto { name: string, description: string }`, `200` response wrapping `RecipeDto`.
- [x] A2. Add `GET /api/recipes/{id}/status` to `specs/openapi.yaml` — `200` response `RecipeStatusDto { id: string, name: string | null, status: string, imageCount: number }`.
- [x] A3. Run `task agent:reconcile` — verify Kiota exposes `apiClient.api.recipes.describe.post(...)` and `apiClient.api.recipes.byId(id).status.get()`.
- [x] A4. Add mock handlers for both new endpoints to `pwa/e2e/mock-api.ts` inside `setupCommonRoutes`.
- [x] A5. Run `task agent:drift` — zero drift confirmed.

---

### Phase B — Backend: Stub Creation (seam: `POST /api/recipes/describe` returns a recipe ID)

**Stop condition**: Endpoint creates a DB row and returns a valid recipe ID. No workflow yet.

- [x] B1. Add `DescribeRecipeDto.cs` to `api/src/RecipeApi/Dto/` — `record` with `Name` and `Description`.
- [x] B2. Add `RecipeStatusDto.cs` to `api/src/RecipeApi/Dto/` — `record` with `Id`, `Name`, `Status`, `ImageCount`.
- [x] B3. Add `POST describe` action to `RecipeController` — creates `Recipe` row (`Name`, `Description`, `IsDiscoverable = false`, `ImageCount = 0`), returns `RecipeDto`. No workflow trigger yet.
- [x] B4. Add `GET {id}/status` action to `RecipeController` — returns `RecipeStatusDto` with `status = recipe.Name != null && recipe.ImageCount > 0 ? "ready" : "pending"`.
- [x] B5. Write integration tests: `POST describe` returns 200 with valid ID; `GET status` returns `"pending"` for a stub recipe.
- [x] B6. Run `task agent:test:impact` — all tests pass.

---

### Phase C — Backend: Workflow Plumbing (seam: workflow triggers and processors are wired, stubs only)

**Stop condition**: `POST /api/recipes/describe` triggers `goto-synthesis`. All processors are registered stubs. `MarkGotoReadyProcessor` correctly flips the setting.

- [x] C1. Create `data/workflows/goto-synthesis.yaml` with the three-task chain (`SynthesizeRecipe` → `GenerateHero` → `MarkGotoReady`).
- [x] C2. Implement `SynthesizeRecipeProcessor` stub — creates recipe directory, writes minimal `recipe.json` (`{ name: description, recipeIngredient: [] }`) and `recipe.info` (`{ name: description, imageCount: 0, finishedDishImageIndex: -1 }`). No AI call.
- [x] C3. Implement `MarkGotoReadyProcessor` — queries `family_settings` for `key = 'family_goto'` where `value->>'recipeId' = recipeId::text`. If found: updates `value` JSON to set `status = 'ready'`, sets `recipe.image_count = 1` in `recipes` table. If not found: no-op (safe to append to any workflow).
- [x] C4. Verify `RecipeHeroAgent` (`GenerateHero`) is registered in `Program.cs`. No code change needed.
- [x] C5. Register `SynthesizeRecipeProcessor` and `MarkGotoReadyProcessor` in `Program.cs`.
- [x] C6. Wire workflow trigger into `POST describe` action — calls `IWorkflowOrchestrator.TriggerAsync("goto-synthesis", { recipeId, description })` after creating the recipe row.
- [x] C7. Update `recipe-import.yaml` — add optional `mark_goto_ready` task after `sync_recipe` with `depends_on: [sync_recipe]`. `MarkGotoReadyProcessor` no-ops if no matching GOTO setting exists.
- [x] C8. Write integration tests: `POST describe` triggers workflow; `MarkGotoReadyProcessor` updates setting `status` to `'ready'`; no-op when no matching GOTO setting.
- [x] C9. Run `task agent:test:impact` — all tests pass.

---

### Phase D — PWA: Settings "Change" Sheet & Home Card Guard (seam: UI reflects pending/ready state)

**Stop condition**: Settings page has the three-option Change sheet. Home card is gated by `status`. Typecheck clean.

- [x] D1. Update `FamilyGOTOSettings.tsx` — replace the current "Pick from library" / "Choose a GOTO recipe" buttons with a single "Change" button that opens a bottom sheet.
- [x] D2. Implement the Change bottom sheet with three options:
  - **Pick from library** — opens existing `QuickFindModal`, saves `{ description: recipe.name, recipeId: recipe.id, status: 'ready' }`.
  - **Describe it** — navigates to `/capture?intent=goto`.
  - **Capture it** — navigates to `/capture?intent=goto&mode=photo`.
- [x] D3. Update the pending/ready display in `FamilyGOTOSettings`:
  - `status === 'pending'`: spinner + "Your GOTO is being prepared…"
  - `status === 'ready'`: recipe name + "Change" button
  - no GOTO: "Set your GOTO" prompt + "Change" button
- [x] D4. Update `HomeCommandCenter.tsx` — after `loadSetting('family_goto')`, if `status !== 'ready'` (or missing), treat as no GOTO: `gotoDescription = null`, `gotoRecipeId = null`. `TonightPivotCard` shows "Nothing planned yet".
- [x] D5. Run `npm run typecheck` — zero type errors.

---

### Phase E — PWA: Capture Intent Wiring (seam: capture page handles `intent=goto`)

**Stop condition**: Navigating to `/capture?intent=goto` shows the describe tab pre-selected. Navigating to `/capture?intent=goto&mode=photo` shows the camera tab. After save, GOTO setting is written with `status: 'pending'`.

- [x] E1. Update `pwa/src/app/(app)/capture/page.tsx` — read `intent` and `mode` from `searchParams`, pass as props to `MinimalCapture`.
- [x] E2. Add "Describe it" tab to `MinimalCapture` — a `name` field (required) and `description` textarea (optional). Shown as a permanent third tab alongside camera/gallery.
- [x] E3. Implement text submit path in `MinimalCapture` — calls `POST /api/recipes/describe` via Kiota, gets back recipe ID. If `intent === 'goto'`: calls `saveSetting('family_goto', { description: name, recipeId: id, status: 'pending' })`. Shows same success screen.
- [x] E4. When `intent === 'goto' && mode === 'photo'`: pre-select the camera tab. After photo capture and `submitRecipe()` succeeds: calls `saveSetting('family_goto', { description: recipeName, recipeId: id, status: 'pending' })`. The `recipe-import` workflow (with the new `MarkGotoReady` step) handles the rest.
- [x] E5. When `intent === 'goto'`: success screen shows "Your GOTO is being prepared" instead of "Captured!" and routes back to `/profile/settings` instead of `/home`.
- [x] E6. Run `npm run typecheck` — zero type errors.

---

### Phase F — AI Wiring & E2E Hardening (seam: real synthesis + full test suite green)

**Stop condition**: `SynthesizeRecipeProcessor` calls Gemini. Full E2E suite passes. `task review` clean.

- [x] F1. Wire `SynthesizeRecipeProcessor` to `IChatClient` (Gemini) — prompt: given `description`, return Schema.org Recipe JSON with `name`, `recipeIngredient[]`, `recipeInstructions[]`, `totalTime`. Write to `recipe.json` and `recipe.info`. Follow `RecipeAgent.DoExtractRecipeAsync` pattern exactly.
- [x] F2. Run `task agent:test:impact` — all processor tests pass.
- [ ] F3. Manual smoke test: describe "Our family spaghetti with homemade sauce" → confirm `status` flips to `'ready'` after ~30s, home card shows recipe name and hero image.
- [x] F4. Add E2E test: "Describe it creates a pending GOTO" — fills name, submits, asserts `POST /api/recipes/describe` called and `POST /api/settings/family_goto` called with `status: 'pending'`.
- [x] F5. Add E2E test: "Pending GOTO shows synthesizing state in settings" — mock returns `status: 'pending'`, asserts spinner visible.
- [x] F6. Add E2E test: "Ready GOTO enables Confirm GOTO on home" — mock returns `status: 'ready'`, asserts `confirm-goto-btn` enabled and description visible.
- [x] F7. Add E2E test: "Pending GOTO disables Confirm GOTO on home" — mock returns `status: 'pending'`, asserts `confirm-goto-btn` disabled.
- [x] F8. Add E2E test: "Capture path sets GOTO pending" — mock photo capture, asserts `saveSetting` called with `status: 'pending'`.
- [x] F9. Run `npx playwright test e2e/home-recovery.spec.ts e2e/capture-flow.spec.ts` — all pass.
- [x] F10. Run `task review` — formatting, linting, type-check, full suite clean.

---

## Notes / Decisions

- **`status` is the single source of truth for readiness.** `HomeCommandCenter` reads `familySettings['family_goto'].status` — no extra API call. `MarkGotoReadyProcessor` is the only writer of `'ready'`.
- **`MarkGotoReadyProcessor` is safe to append to any workflow.** It no-ops when no matching GOTO setting exists. This is how the capture path (`recipe-import`) gets GOTO wiring without a separate workflow.
- **"Change" always creates a new recipe.** No re-synthesize path. Old recipes stay in the library. Library delete UI (`DELETE /api/recipes/{id}` exists in API, no UI yet) is a separate follow-up.
- **`SynthesizeRecipeProcessor` follows `RecipeAgent` exactly** — same `IChatClient`, same disk I/O pattern, same `recipe.json`/`recipe.info` format. Text prompt instead of images.
- **`GenerateHero` (`RecipeHeroAgent`) is already implemented and registered.** No new code needed for hero generation.
- **`SyncRecipeProcessor` is not used in `goto-synthesis`** — it enforces `ImageCount > 0`. `MarkGotoReadyProcessor` handles DB sync for the describe path.
- **Backward compatibility**: existing GOTO values without `status` are treated as `'ready'` — they were set via `QuickFindModal` and point to real library recipes.
- **Capture path (`intent=goto&mode=photo`) uses `recipe-import` unchanged** — the only addition is `MarkGotoReady` as a final no-op-safe step.
- **Success screen for `intent=goto`** routes back to `/profile/settings`, not `/home`, so mom can see the pending state immediately.
- **Phase A–C are pure backend/contract work** — can be done without touching the PWA.
- **Phase D–E are pure PWA work** — can be done against the stub backend (Phase B/C stubs are sufficient).
- **Phase F is the AI wiring** — requires a live Gemini API key. All other phases work without it.
