# Design: Hero Image WebP Migration

## Overview

This is a pure infrastructure change. No API contract changes, no PWA changes, no database migrations. Three files change in the API + one new Taskfile task.

---

## Change Map

| File | Change | AC |
|---|---|---|
| `LocalRecipeStore.cs` | `HeroPath` → `hero.webp`; `ReadHeroImageAsync` → `image/webp` | AC-1, AC-2 |
| `RecipeHeroAgent.cs` | Prompts → "WebP"; `heroPath` + temp extension → `.webp` | AC-1, AC-4, AC-5 |
| `Taskfile.yml` | New `images:migrate-hero-webp` task | AC-3, AC-6 |

---

## Detailed Diffs

### `api/src/RecipeApi/Infrastructure/LocalRecipeStore.cs`

**Line 27 — `HeroPath`:**
```csharp
// Before
private string HeroPath(Guid id) => Path.Combine(RecipeDir(id), "hero.jpg");
// After
private string HeroPath(Guid id) => Path.Combine(RecipeDir(id), "hero.webp");
```

**Line 112 — `ReadHeroImageAsync` content type:**
```csharp
// Before
return Task.FromResult<(Stream, string)?>((File.OpenRead(path), "image/jpeg"));
// After
return Task.FromResult<(Stream, string)?>((File.OpenRead(path), "image/webp"));
```

> `HasHeroImageAsync` uses `HeroPath` — it gets the fix for free.
> `SaveHeroImageAsync` uses `HeroPath` — it gets the fix for free.
> `InMemoryRecipeStore` — hero image is in-memory only, no disk path, no change needed.

---

### `api/src/RecipeApi/Services/Agents/RecipeHeroAgent.cs`

**Line 76 — `heroPath` variable:**
```csharp
// Before
var heroPath = Path.Combine(recipeDir, "hero.jpg");
// After
var heroPath = Path.Combine(recipeDir, "hero.webp");
```

**Line 132 — finished-dish prompt text:**
```csharp
// Before
taskPrompt = "Generate a high-quality 400x400 JPG hero image based on the provided finished dish image. ...";
// After
taskPrompt = "Generate a high-quality 400x400 WebP hero image based on the provided finished dish image. ...";
```

**Line 156 — metadata-fallback prompt text:**
```csharp
// Before
taskPrompt = $"Generate a high-quality 400x400 JPG hero image of the finished dish ...";
// After
taskPrompt = $"Generate a high-quality 400x400 WebP hero image of the finished dish ...";
```

**Line 183 — temp file extension:**
```csharp
// Before
var tempPath = Path.Combine(recipeDir, $"hero.tmp_{Guid.NewGuid()}.jpg");
// After
var tempPath = Path.Combine(recipeDir, $"hero.tmp_{Guid.NewGuid()}.webp");
```

---

### `Taskfile.yml` — new task

Add under a `# ── IMAGE UTILITIES ──` section header:

```yaml
images:migrate-hero-webp:
  desc: "🖼️  Convert all hero.jpg files in data/recipes to hero.webp (macOS sips, run once)"
  cmds:
    - |
      count=0
      failed=0
      find data/recipes -name "hero.jpg" | while read f; do
        dir=$(dirname "$f")
        if sips -s format webp "$f" --out "$dir/hero.webp" --setProperty formatOptions 85 > /dev/null 2>&1; then
          rm "$f"
          count=$((count + 1))
        else
          echo "  ✗ Failed: $f"
          failed=$((failed + 1))
        fi
      done
      echo "✓ Migration complete"
```

> `sips` is macOS-native — no installation required.
> Quality 85 is visually lossless for food photography.
> Original files are never touched — `find` targets `hero.jpg` only, never `original/`.

---

## Silent Failure Modes (Pre-mortem)

| Risk | Mitigation |
|---|---|
| `sips` not available (non-macOS CI) | Task is explicitly local-only; CI never runs image generation on macOS images. Add a note in the task desc. |
| Gemini returns JPEG bytes despite prompt asking for WebP | Bytes are saved as-is to `hero.webp`. Browser will still display correctly (content sniffing). `Content-Type: image/webp` header is set from the filename, not validated from bytes. Acceptable for this change's scope. |
| Partial migration (task interrupted mid-run) | Safe — `find` picks up remaining `hero.jpg` files on re-run. Converted files are already `.webp`. |
| `hero.jpg` and `hero.webp` both exist after partial run | `HeroPath` points to `.webp` — the `.jpg` is orphaned but harmless. `find data/recipes -name "hero.jpg"` on re-run cleans it up. |
| Bundle export of old `hero.jpg` | `SharedImageDto` carries the actual bytes + MIME type read at export time. Old JPEGs export correctly as `image/jpeg`. |

---

## Testing Strategy

| Layer | Test | What to verify |
|---|---|---|
| Unit | `LocalRecipeStoreTests` | `ReadHeroImageAsync` returns `image/webp` content type |
| Unit | `RecipeHeroAgentTests` (if exists) | `heroPath` and temp path use `.webp` extension |
| Manual | `GET /api/recipes/{id}/hero` | `Content-Type: image/webp` in response headers |
| Manual | `task images:migrate-hero-webp` | 0 `hero.jpg` remain; ~500 `hero.webp` exist; `original/` untouched |
| Manual | `GenerateHero` workflow | New `hero.webp` saved after run |

> No E2E tests required — the PWA consumes the hero image via a URL (`/api/recipes/{id}/hero`). The `Content-Type` change is transparent to `<img>` tags and Next.js `Image`. No `data-testid` changes.

---

## OpenAPI Contract

`GET /api/recipes/{id}/hero` in `specs/openapi.yaml` does not constrain the response `Content-Type` — the 200 response is a binary file response. No spec change required. Run `task agent:drift` to confirm zero drift after changes.
