# Feature: Hero Image WebP Migration

## Vision

The Mère-Designer visual identity demands vibrant macro food photography that loads fast on mobile — especially in the card-stack discovery flow where multiple hero images load in sequence. Currently all AI-generated hero images are stored as JPEG (`hero.jpg`), which is 25–35% larger than WebP at equivalent quality. This migration standardises hero image storage to WebP for all new generations and converts existing images via a one-time task command.

Original (source) images in `original/` are never touched — they keep their native format always.

---

## Product Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Format for new heroes | WebP | 25–35% smaller, lossless for food photography at quality 85, full PWA browser support |
| Existing hero conversion | `task images:migrate-hero-webp` (sips, macOS) | No new dependency; `sips` is built into macOS; atomic per-file conversion |
| Original images | Untouched — keep native format | Originals are source-of-truth, not delivery assets |
| OpenAPI contract change | None required | `GET /api/recipes/{id}/hero` response content-type is not constrained in the spec |
| Bundle export/import | Self-healing — `SharedImageDto` carries `MimeType` | Already format-agnostic |

---

## Acceptance Criteria

**AC-1 — New hero generation saves WebP**
Given the `GenerateHero` workflow runs for any recipe,
When Gemini returns image bytes,
Then the bytes are saved as `hero.webp` (not `hero.jpg`) in the recipe directory.

**AC-2 — `GET /api/recipes/{id}/hero` returns correct content type**
Given a hero image exists for a recipe,
When the PWA or browser requests `GET /api/recipes/{id}/hero`,
Then the response `Content-Type` header is `image/webp`.

**AC-3 — Existing hero.jpg files are converted by task**
Given the `task images:migrate-hero-webp` command is run,
When it completes,
Then all `hero.jpg` files in `data/recipes/` have been converted to `hero.webp` and the originals deleted.
No `original/` files are touched.

**AC-4 — Gemini is asked to produce WebP**
Given the `GenerateHero` workflow runs,
When the prompt is constructed for Gemini,
Then the prompt text requests a "WebP" hero image (not "JPG").

**AC-5 — Temp file uses .webp extension**
Given the atomic write pattern in `RecipeHeroAgent`,
When the temp file is created before replacing the hero,
Then the temp file has a `.webp` extension.

**AC-6 — No original images are modified**
Given the migration task runs,
When it completes,
Then all files in `*/original/` directories are unchanged (no conversion, no deletion).

---

## Glossary

- **hero image** — AI-generated 400×400 image of the finished dish, stored as `hero.webp` per recipe directory. Distinct from original (source) images.
- **original image** — User-uploaded or web-captured source image in `original/{index}.{ext}`. Always kept in its native format.
- **sips** — macOS built-in image processing CLI. Used for the one-time batch conversion task.
- **WebP quality 85** — The compression level used by `sips` for conversion. Visually lossless for food photography; meaningful file-size reduction vs JPEG.
