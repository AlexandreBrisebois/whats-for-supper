# ADR 033 — Recipe Readiness is a Recipe Domain Concern, Not a GOTO Concern

**Date**: 2026-05-02  
**Status**: Accepted  
**Deciders**: Alex (product), Claude (implementation)

---

## Context

Phase 13 introduced a `status: 'pending' | 'ready'` field embedded inside the `family_goto` settings value:

```json
{ "description": "Our family spaghetti", "recipeId": "uuid", "status": "pending" }
```

`MarkGotoReadyProcessor` was created to flip this status to `'ready'` at the end of both the `goto-synthesis` and `recipe-import` workflows. `HomeCommandCenter` and `FamilyGOTOSettings` read `status` from the cached `familyStore` value to decide whether to enable "Confirm GOTO" or show a spinner.

This design has two structural problems.

### Problem 1 — Recipe readiness is duplicated

The recipe row already has `ImageCount` and `Name` columns. `GET /api/recipes/{id}/status` (added in Phase 13 Phase B4) already derives readiness from those fields: a recipe is ready when `Name != null && ImageCount > 0`. `MarkGotoReadyProcessor` writes to **both** the recipe row and the settings JSON blob, keeping two representations of the same fact in sync manually.

### Problem 2 — Readiness goes stale on the client

`HomeCommandCenter` and `FamilyGOTOSettings` load the GOTO setting once at mount and cache it in `familyStore`. When the background workflow completes and `MarkGotoReadyProcessor` flips `status` to `'ready'` in the DB, neither component re-fetches. The user sees "Being prepared…" indefinitely until a hard refresh. This is a poll-or-push problem created by storing derived state in a cached settings blob.

### Why the setting exists at all

The Phase 13 design embedded `status` in the setting to avoid an extra API call: `HomeCommandCenter` loads one key and reads everything it needs. That optimisation introduced the stale-cache race and the duplicate state. The `GET /api/recipes/{id}/status` endpoint already exists and is cheap — the optimisation is not worth the cost.

---

## Decision

**Remove `status` from the `family_goto` settings value.** The setting stores only what it owns: `{ description: string, recipeId: string }`.

**Derive recipe readiness from `GET /api/recipes/{id}/status`** at the point of need, not from a cached settings blob.

### New readiness contract

- `HomeCommandCenter`: after loading the GOTO setting, if `recipeId` is present, call `GET /api/recipes/{recipeId}/status`. If `status === 'ready'`, enable "Confirm GOTO". If `status === 'pending'`, disable it. No `status` field read from the setting.
- `FamilyGOTOSettings`: same — derive display state from a fresh `GET /api/recipes/{recipeId}/status` call on mount and after save.
- Polling for pending state: both components may poll `GET /api/recipes/{id}/status` on a short interval (e.g. 5s) while `status === 'pending'`, stopping once `'ready'` is received. This is explicit, scoped, and easy to cancel.

### Processor rename

`MarkGotoReadyProcessor` is renamed to `RecipeReadyProcessor`. It no longer touches the `family_settings` table. Its only responsibility: verify the recipe row is fully synced (name and image count populated) and, if not, do so. It is safe to append to any workflow — it no-ops on recipes that are already complete.

The concept of "readiness" belongs to the recipe domain. No feature-specific processor should own it.

### Backward compatibility

Existing GOTO settings values that contain `status: 'ready'` or `status: 'pending'` are ignored — the field is simply not read. The `recipeId` field is still used to call `GET /api/recipes/{id}/status`. Existing values without a `status` field are unaffected — they already worked by reading `recipeId` directly.

---

## Consequences

### Positive
- Single source of truth: recipe readiness lives on the recipe row, read via a stable API endpoint.
- No stale-cache race: the pending → ready transition is visible to any component that fetches `GET /api/recipes/{id}/status` without a hard refresh.
- `RecipeReadyProcessor` is feature-agnostic: any future workflow (not just GOTO) benefits from the same readiness signal.
- `family_settings` table stores only configuration data, not derived state.
- `MarkGotoReadyProcessor` no longer needs to write to two tables.

### Negative
- One additional API call per home load when a GOTO `recipeId` is present (cheap, but present).
- Polling logic must be added to `HomeCommandCenter` and `FamilyGOTOSettings` for the pending state (was previously implicit via a re-render on store update).

---

## References

- `api/src/RecipeApi/Processors/MarkGotoReadyProcessor.cs` — to be renamed `RecipeReadyProcessor.cs`
- `api/src/RecipeApi/Workflows/goto-synthesis.yaml` — references `MarkGotoReady` → update to `RecipeReady`
- `api/src/RecipeApi/Workflows/recipe-import.yaml` — references `MarkGotoReady` → update to `RecipeReady`
- `pwa/src/components/home/HomeCommandCenter.tsx` — remove `gotoStatus` derived from settings; add recipe status fetch
- `pwa/src/components/profile/FamilyGOTOSettings.tsx` — remove `status` from `GotoValue`; derive from recipe status fetch
- `pwa/src/store/familyStore.ts` — `loadSetting` return value for `family_goto` no longer includes `status`
- `specs/openapi.yaml` — `GET /api/recipes/{id}/status` already exists; no contract changes needed
- `.kiro/specs/phase-13-goto-synthesis.md` — Phase D4 task assumption (status gating) superseded by this ADR
