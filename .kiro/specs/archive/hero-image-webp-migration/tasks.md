# Implementation Plan: Hero Image WebP Migration

## Overview

Pure infrastructure change — no contract updates, no PWA changes, no DB migrations. Three files in the API + one new Taskfile task + one-time data migration. All tasks are backend-only and run sequentially.

---

## Tasks

- [x] 1. API — Update `LocalRecipeStore` hero file path and content type
  - In `api/src/RecipeApi/Infrastructure/LocalRecipeStore.cs`:
    - Change `HeroPath` (line 27): `"hero.jpg"` → `"hero.webp"`
    - Change `ReadHeroImageAsync` (line 112): `"image/jpeg"` → `"image/webp"`
  - `HasHeroImageAsync` and `SaveHeroImageAsync` use `HeroPath` — they get the fix automatically
  - Run `task agent:drift` to confirm zero drift
  - _Requirements: AC-1, AC-2_

- [x] 2. API — Update `RecipeHeroAgent` paths and prompts
  - In `api/src/RecipeApi/Services/Agents/RecipeHeroAgent.cs`:
    - Change `heroPath` variable (line 76): `"hero.jpg"` → `"hero.webp"`
    - Change finished-dish `taskPrompt` (line 132): `"JPG"` → `"WebP"`
    - Change metadata-fallback `taskPrompt` (line 156): `"JPG"` → `"WebP"`
    - Change temp file extension (line 183): `".jpg"` → `".webp"`
  - Run `task api:build` to confirm no compile errors
  - _Requirements: AC-1, AC-4, AC-5_

- [x] 3. Taskfile — Add `images:migrate-hero-webp` task
  - In `Taskfile.yml`, add a `# ── IMAGE UTILITIES ──` section with the new task (see `design.md`)
  - Task uses `sips` (macOS built-in) at quality 85
  - Task targets `hero.jpg` only — never touches `original/` directories
  - _Requirements: AC-3, AC-6_

- [x] 4. Checkpoint — Build and drift verification
  - `task api:build` — zero compile errors
  - `task agent:drift` — zero drift confirmed
  - `task review` — lint and type-check pass
  - _Requirements: All_

- [x] 5. Data migration — Convert existing hero images
  - Run `task images:migrate-hero-webp` against local `data/recipes/`
  - Verify: `find data/recipes -name "hero.jpg" | wc -l` → 0
  - Verify: `find data/recipes -name "hero.webp" | wc -l` → ~500
  - Verify: `find data/recipes -path "*/original/*.jpg" | wc -l` → unchanged (no originals converted)
  - _Requirements: AC-3, AC-6_

- [ ] 6. Manual verification — End-to-end check
  - Start API locally (`task dev:api`)
  - `curl -I http://localhost:9001/api/recipes/{any-id}/hero` → `Content-Type: image/webp`
  - Trigger `GenerateHero` workflow on one recipe → confirm `hero.webp` saved, no `hero.jpg`
  - Open PWA in browser → hero images load correctly (no broken images)
  - _Requirements: AC-1, AC-2, AC-4_

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2", "3"] },
    { "id": 1, "tasks": ["4"] },
    { "id": 2, "tasks": ["5"] },
    { "id": 3, "tasks": ["6"] }
  ]
}
```

Tasks 1, 2, and 3 are independent and can be applied in the same pass. Task 4 gates the data migration. Task 5 (data migration) runs once locally and is not repeatable via CI.

---

## Notes / Decisions

- **2026-05-16**: Spec created. Gemini may return JPEG bytes despite the prompt requesting WebP — this is acceptable for this scope. The file is saved as `hero.webp` regardless; browsers content-sniff correctly and display either format.
- **2026-05-16**: `InMemoryRecipeStore` excluded — hero is in-memory only, no disk path, no change needed.
- **2026-05-16**: No OpenAPI spec change required — the hero endpoint response is an unconstrained binary blob.
- **2026-05-16**: Migration task is macOS-only by design (`sips`). CI image generation does not run on macOS runners; this task is for local data only.
