# Design

## Context

See proposal.md for motivation and the recipe-library delta for the observable contract. This design describes documentation extraction across an existing browser/API/asset-store path; it proposes no application architecture or behavior changes. The session bounds the work to View Original behavior from successfully loaded library detail, A10 permits source-supported drafts and A34 defers runtime/database qualification. Source identity is moving-to-openspec at `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` plus preserved dirty inputs. All 60 previous library evidence identities match.

## Goals / Non-Goals

**Goals:** Document the smallest connected slice: successfully loaded library detail → View Original availability/activation → external URL opening or OriginalPhotosViewer overlay → image ordering, navigation, zoom, dismissal → `/api/recipes/{id}/original/{index}` raw binary serving. Map every requirement/scenario to BSL-recipe-library-020–022 and actual assertion limits.

**Non-Goals:** Application fixes, new tests/contracts/SQL, runtime qualification, or expansion into asset uploading, hero image regeneration, capture, cooking, sharing, or reporting. Do not turn missing safeguards or unasserted gestures into desired future requirements.

## Decisions

1. **Extend the existing recipe-library owner with ADDED requirements.** Main library fact/read/update and detail-reading owners remain intact, with household access/member context referenced from household-identity. The View Original action is an existing capability of loaded library detail; adding requirements here preserves cohesion without creating an isolated asset-viewing capability. No existing requirement or Purpose is rewritten.
2. **Map control visibility and representation to loaded facts.** In `RecipeDetailSheet.tsx`, visibility requires `!isEditing && (recipe.imageCount > 0 || recipe.sourceType === 'url')`. The button renders inside the hero image container with English label `View Original`. It renders `<ExternalLink size={18} />` when `sourceType === 'url'`, and `<Images size={18} />` otherwise. `sourceType` is computed by `RecipeService.MapToDto` based on `SourceUrl` and `ImageCount`, defaulted to `'synthesized'` by the client adapter.
3. **Keep external URL navigation distinct from the internal photo viewer.** When `recipe.sourceType === 'url'` and `recipe.sourceUrl` is present, activation calls `window.open(recipe.sourceUrl, '_blank', 'noopener,noreferrer')`. This does not change current application navigation, unmount the detail sheet, or perform API calls. External page loading success, popup blocker bypass, or URL protocol validity cannot be guaranteed (U45). When `recipe.sourceUrl` is absent or null, activation falls back to opening `OriginalPhotosViewer`.
4. **Order original photos finished-dish first and construct direct image request paths.** In `OriginalPhotosViewer.tsx`, `imageIndices` orders `finishedDishIndex` first when `0 <= finishedDishIndex < imageCount`; otherwise it keeps numeric index order `[0, ..., imageCount - 1]`. The displayed image path is `/api/recipes/${recipeId}/original/${currentPhotoIndex}` using native `<img>`. Direct HTTP GET avoids Kiota or fetch middleware.
5. **Support wrapping navigation, zoom toggling, and bounded pan constraints.** Next/previous chevrons (desktop sm:contents, mobile sm:hidden), keyboard ArrowLeft/ArrowRight, and pager dots navigate through `imageIndices`. Modulo arithmetic wraps from last to first and first to last. Navigation resets `scale` to 1. Zoom toggles between 1 and 2.5 via the button or photo click; touch pinch clamps scale between 1 and 5. Framer-motion enables dragging only when `scale > 1` within bounded constraints (-500 to 500 px). Returning to scale 1 centers the image without offset.
6. **Serve raw original photo binaries via anonymous GET.** `GET /api/recipes/{recipeId}/original/{photoIndex}` is marked `[AllowAnonymous]` in `RecipeController.cs` and has no security requirements in `specs/openapi.yaml`. `ImageService.GetImage` reads through `LocalRecipeStore.ReadOriginalImageAsync`, checking `.jpg`, `.png`, and `.webp` files in `{Root}/{recipeId}/original/{index}.{ext}`. Existing files return HTTP 200 with the detected MIME type; missing files throw `KeyNotFoundException`, translated to HTTP 404 by `ErrorHandlingMiddleware.cs`.
7. **Document dismissal and absence of side effects.** The viewer is dismissed via the close button or Escape key, calling `onClose()` to unmount `OriginalPhotosViewer`. The underlying `RecipeDetailSheet` remains open in its viewing state. Viewing, navigating, zooming, or dismissing causes no state mutation, no selection persistence, no detail refetch, and no live event broadcast. Reopening mounts fresh with the initial photo and default zoom.
8. **Keep test evidence proportional to inspected assertions.** Existing tests (`recipe-original-viewer.spec.ts`, `RecipeDetailSheet.test.tsx`, `RecipeControllerTests.cs`) check button visibility, label, opening the viewer, and the 200 OK image endpoint with mocked fixtures. They do not assert photo ordering, chevrons, wrapping, pager dots, keyboard controls, zoom toggling, pinch-to-zoom clamping, drag constraints, dismissal return state, or 404 responses. These are recorded as implementation-supported behavior with test assertion gaps (U46, U47).

## Risks / Trade-offs

- Absent source URL fallback with 0 images → U44 records the resulting `1 / 0` counter, `undefined` image URL, and NaN navigation modulo as non-normative limitations.
- External URL navigation success cannot be verified → U45 notes that `window.open` does not ensure external site availability or popup allowance.
- Native browser image failure handling → U46 notes that `OriginalPhotosViewer` lacks custom loading skeletons or error banners; 404 or network failure relies on native browser image rendering.
- Test assertions use mocked substitutions → U47 notes that unit and browser assertions do not cover gestures, keyboard navigation, or full photo lifecycle.
- Documentation extraction versus implementation → tasks cover documentation only; stop for human review with main specs and all prior changes preserved.

## Historical extraction evidence relocated for OpenSpec 1.14.2

The following non-normative material was moved from this change’s delta preamble to satisfy the upgraded validator. Requirement/scenario blocks and main specifications are unchanged by this relocation. Earlier draft/lifecycle statements remain historical; later recorded authorizations still govern. Relative links retain their original targets.

## Non-normative evidence and scope

This session instruction authorizes this bounded draft only. BSL-recipe-library-020–022 in `docs/openspec-baseline-plan.md` map every requirement and scenario to inspected source and actual assertion coverage. These are implementation-supported claims under A10; runtime behavior is not-run and implementation/database qualification remains deferred under A34. Main recipe-library remains 37 requirements/76 scenarios and household-identity 36/92. The eight prior changes remain active; this draft adds a ninth.

Reuse library “Retrieve the selected library recipe for detail reading”, “Return persisted recipe detail for an available record”, “Display loaded recipe header and hero image” and “Provide sheet dismissal”. These additions cover only missing loaded-detail View Original availability, external URL opening, photo viewing, navigation, zoom, dismissal, and raw photo binary serving. Household-identity retains “Gate protected page entry with household access”, “Apply member context after household access” and “Authenticate protected API requests independently”.

U44–U47 retain source/assertion limits without repair:
- When a recipe has sourceType "url" but its source URL is absent or null, activation falls back to opening OriginalPhotosViewer. For a URL import with zero stored images, the viewer mounts with imageCount 0, displaying counter "1 / 0" and request path `/api/recipes/{id}/original/undefined`, and navigation modulo produces NaN.
- Opening an external URL calls `window.open(sourceUrl, '_blank', 'noopener,noreferrer')`. This requests a new browser context without changing current application navigation or closing the detail sheet. It does not validate URL scheme, protocol, or network reachability, and does not guarantee that the external page loads successfully or that popup blockers permit the window.
- Serving raw photo binaries via GET `/api/recipes/{recipeId}/original/{photoIndex}` is marked anonymous at the API controller and OpenAPI contract. OriginalPhotosViewer uses native image rendering without custom loading indicators, progress spinners, or error banners; missing files (404) or failed transfers rely strictly on native browser image handling.
- Existing browser and component test assertions verify button visibility, label and initial viewer opening with mocked fixtures; they do not assert photo ordering, chevron/keyboard navigation, wrapping, pager dots, zoom toggling, touch pinch clamping, drag panning, or dismissal return state. Cross-device touch and gesture behavior is implementation-supported, not runtime-qualified.

Viewing performs no application state mutation, selection persistence, detail refetch, or live notification. Reopening the viewer after dismissal mounts fresh with the initial photo and default zoom.

Reuse BSL-recipe-library-001–019 and preserve U29–U43 non-normatively. BSL-018–025, U23–U28 and historical member-creation limitations remain unchanged and non-normative here. Historical BSL-015/U22 limitation retained:

> However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.

That sentence records the earlier review state. The user's report of later authorization remains recorded; its original reference is pending. It is not a recipe-library requirement, new lifecycle approval or runtime result.

Uploading or replacing original photos, selecting a new finished-dish image, hero generation or regeneration, recipe capture/import, sharing/export/download workflows, detail editing, ratings/notes submission, discoverability toggling, reporting/re-import, cooking, planning, search/discovery ranking, votes/consensus, deletion/restore/purge, preference policy and demo/preview/deployment variants are excluded.
