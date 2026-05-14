# Design: Recipe Share and Capture

## Revision Notes

This revision intentionally narrows the feature to the smallest dependable
slice:
- outbound `.recipe` export from recipe detail,
- inbound manual file import from `/capture`,
- explicit review before add,
- no OS file-handling integration,
- no inbound share-target behavior.

That makes the feature truthful on Android and avoids spec drift around web
platform capabilities that are desktop-only or browser-dependent.

## Overview

Recipe sharing in this slice behaves like document export/import, not like a
deep operating-system integration.

Sender flow:
1. Open a recipe.
2. Tap Share.
3. Export a `.recipe` file.
4. Send or save that file using any normal channel.

Recipient flow:
1. Open `/capture`.
2. Ignore the primary `Camera` / `Gallery` block when the goal is file import.
3. In the secondary actions section, tap Import Recipe File.
4. Pick a `.recipe` file.
5. Review the preview card.
6. Accept to add it, or reject to return to capture.

## Design Posture — The Mère-Designer

- **Why (design theory):** Simple import beats clever platform branching.
  The user should always know where shared recipes go.
- **How (parental utility):** "Open the app, tap Import, pick the file" is
  teachable across devices and does not depend on platform trivia.
- **Dead-end rule:** Review and success states must each expose one obvious next
  action within the thumb zone.

## UX Implementation Contract

1. **Reuse existing recipe detail surfaces.**
   The export entry point lives on `StackActionBar` and `RecipeDetailSheet`.
   On mobile, Share replaces the current visible Edit action position.
   Edit moves under the gear/settings overflow.
   `View original` remains a separate provenance action.

2. **Reuse the current capture canvas.**
   Do not create a second route for bundle import.
   The bundle review state is another mode of the existing capture experience.

3. **Preserve the existing primary acquisition hierarchy.**
   `Camera` and `Gallery` remain the first and most prominent capture actions.
   Do not insert `Import recipe file` into that top capture block.

4. **Order secondary actions by familiarity, with import last.**
   The secondary actions section below the primary block shall be ordered:
   - `Paste recipe link`
   - `Describe a recipe`
   - `Import recipe file`

5. **Keep the primary controls one-thumb reachable.**
   The following must remain easily reachable on a 6.7" screen:
   - `recipe-share-btn`
   - `import-recipe-file-btn`
   - `accept-bundle-btn`
   - `reject-bundle-btn`
   - `bundle-import-done-btn`

6. **No speculative platform affordances.**
   Do not add copy about "Open with WFS", default handlers, or auto-open flows.

7. **Truthful preview only.**
   Show what was actually present in the bundle.
   Do not invent provenance fields or source imagery when absent.

8. **Mandatory `data-testid` coverage.**
   Every interactive or state-bearing element in this flow must have an
   authoritative `data-testid`.

## Experience Architecture

```mermaid
graph TD
    A[Recipe Detail Surface] -->|Tap Share| B[GET share bundle from API]
    B --> C[Create .recipe file]
    C --> D[Native save or send flow]

    E[/capture primary Camera/Gallery block] --> K[Secondary actions section]
    K -->|Tap Import Recipe File| F[Local file picker]
    F -->|Valid .recipe selected| G[Bundle Review State]
    G -->|Reject| E
    G -->|Accept| H[POST bundle import]
    H -->|Success| I[Import Success State]
    I -->|Done| J[/home]
```

## State Ownership

### Export state

Export state stays local to the recipe detail surface:

```ts
interface RecipeShareExportState {
  isExporting: boolean;
  exportError: string | null;
}
```

Rules:
- Tapping `recipe-share-btn` sets `isExporting = true`.
- Export failure sets `exportError` and leaves the detail surface open.
- Export success clears `exportError`.

### Capture/import state

Bundle review state lives inside the capture experience, preferably in
`MinimalCapture.tsx` local state unless existing capture architecture forces a
small extracted helper.

```ts
interface BundleReviewState {
  selectedFileName: string | null;
  parsedBundle: RecipeShareBundleDto | null;
  isParsing: boolean;
  parseError: string | null;
  isSubmitting: boolean;
  submitError: string | null;
  importSucceeded: boolean;
}
```

Rules:
- Default capture state: `parsedBundle = null`, `importSucceeded = false`.
- File picker success with a valid bundle sets `parsedBundle`.
- `reject-bundle-btn` resets the whole bundle review state to default.
- `accept-bundle-btn` is disabled while `isSubmitting = true`.
- Import failure preserves `parsedBundle` so the user can retry or reject.
- Import success clears the review state and sets `importSucceeded = true`.

## Route Contract

### Existing route reused

- `/capture`

### Explicit non-goals for this slice

This feature does **not** require:
- a new inbound share route,
- manifest `file_handlers`,
- `launchQueue`,
- auto-navigation from an external file open event.

## API Contract

### Export endpoint

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/recipes/{id}/share` | GET | Build a privacy-scrubbed `RecipeShareBundleDto` for export |

### Import endpoint

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/recipes/import-bundle` | POST | Import a reviewed `RecipeShareBundleDto` into the library |

### DTO shape

```yaml
RecipeShareBundleDto:
  type: object
  required: [version, recipe, info, originals]
  properties:
    version:
      type: string
    recipe:
      $ref: '#/components/schemas/ImportedRecipeDto'
    info:
      $ref: '#/components/schemas/RecipeShareInfoDto'
    hero:
      $ref: '#/components/schemas/SharedImageDto'
      nullable: true
    originals:
      type: array
      maxItems: 5
      items:
        $ref: '#/components/schemas/SharedImageDto'

ImportedRecipeDto:
  type: object
  required:
    - name
    - ingredients
    - instructions
    - isSynthesized
  properties:
    name: { type: string }
    description: { type: string, nullable: true }
    ingredients:
      type: array
      items: { type: string }
    instructions:
      type: array
      items: { type: string }
    prepTimeMinutes: { type: integer, nullable: true }
    cookTimeMinutes: { type: integer, nullable: true }
    totalTimeMinutes: { type: integer, nullable: true }
    servings: { type: integer, nullable: true }
    sourceUrl: { type: string, nullable: true }
    sourceName: { type: string, nullable: true }
    category: { type: string, nullable: true }
    isSynthesized: { type: boolean }

RecipeShareInfoDto:
  type: object
  required: [exportedAtUtc, bundleSource]
  properties:
    exportedAtUtc:
      type: string
      format: date-time
    bundleSource:
      type: string
      enum: [wfs-share]
    appVersion:
      type: string
      nullable: true

SharedImageDto:
  type: object
  required: [mimeType, base64]
  properties:
    mimeType:
      type: string
    base64:
      type: string
```

## UI Contract

### Export surface

- `data-testid="recipe-share-btn"` on each share/export trigger
- `data-testid="recipe-share-error"` on export failure message
- mobile placement contract:
  - visible `Share recipe` uses the current visible Edit action slot
  - `Edit recipe` moves under gear/settings overflow
  - `View original` stays separate and unchanged as provenance

### Capture default state

- existing primary `Camera` and `Gallery` capture block remains unchanged
- secondary actions section appears below the primary block
- secondary actions order:
  - `Paste recipe link`
  - `Describe a recipe`
  - `Import recipe file`
- `data-testid="import-recipe-file-btn"` on the manual import trigger
- hidden file input may exist, but tests interact with the visible trigger

### Bundle review state

- `data-testid="bundle-preview-card"` on the review container
- `data-testid="bundle-preview-name"` on recipe title
- `data-testid="bundle-preview-source-url"` on source URL row when present
- `data-testid="bundle-preview-source-name"` on source name row when present
- `data-testid="bundle-preview-synthesis-badge"` on synthesized/original badge
- `data-testid="bundle-preview-original-count"` on original photo count when > 0
- `data-testid="accept-bundle-btn"` on import confirm CTA
- `data-testid="reject-bundle-btn"` on cancel/back CTA
- `data-testid="bundle-import-error"` on parse or import failure message

### Success state

- `data-testid="bundle-import-success"` on success container
- `data-testid="bundle-import-done-btn"` on the next-step CTA

## Mock Contract

### Playwright API routes

In `pwa/e2e/mock-api.ts`, add mocks for:

```ts
// GET /api/recipes/{id}/share
await page.route('**/api/recipes/*/share', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: builders.recipeShareBundle(),
    }),
  });
});

// POST /api/recipes/import-bundle
await page.route('**/api/recipes/import-bundle', async (route) => {
  await route.fulfill({
    status: 201,
    contentType: 'application/json',
    body: JSON.stringify({
      data: builders.recipe({
        id: MOCK_IDS.RECIPE_SHARED_IMPORT,
        name: 'Imported Shared Recipe',
      }),
    }),
  });
});
```

### Fixture contract

Add one deterministic `.recipe` fixture for E2E:
- valid JSON,
- fixed ISO timestamp,
- one hero image,
- one or more recipe fields populated,
- optional original images.

Add one invalid fixture:
- malformed JSON or wrong shape.

## Testing Strategy

| Layer | File target | What to prove |
|---|---|---|
| API unit | `RecipeShareServiceTests.cs` | Privacy scrubbing removes forbidden fields |
| API integration | import endpoint test | Valid bundle creates ready recipe; invalid version returns 400 |
| PWA unit | `MinimalCapture` test file | File picker -> parse -> review -> accept/reject state transitions |
| PWA unit | recipe detail share trigger test | Export error/success states render correctly |
| E2E | `recipe-share.spec.ts` | User exports, imports fixture manually, reviews, accepts, reaches success |
| E2E | `recipe-share.spec.ts` | Invalid bundle shows `bundle-import-error` and does not create recipe |

## Documentation Contract

Implementation must update the non-code artifacts that explain this flow.

- `specs/openapi.yaml` is the contract source of truth and must match the final DTOs/routes.
- Generated API clients and any contract-derived shared types must be regenerated/synchronized in the same slice as the OpenAPI change.
- `pwa/e2e/mock-api.ts` and related fixtures/builders must match the same contract.
- Supporting docs that describe capture, recipe sharing, or import/export behavior must be updated in the same slice.
- The feature is incomplete if the UI/API behavior changed but the docs still describe the old capture/share model.

## Race Condition Pre-Mortem

1. **Double-submit risk**
   The user may tap accept twice.
   Mitigation: disable `accept-bundle-btn` while the POST is in flight.

2. **Parse/import state drift**
   A failed import could accidentally clear the preview and strand the user.
   Mitigation: preserve `parsedBundle` on POST failure.

3. **Dead-end success state**
   A success message with no onward path traps the user.
   Mitigation: always render `bundle-import-done-btn`.

4. **Unsupported platform confusion**
   Users may expect tapping a `.recipe` file outside the app to open WFS.
   Mitigation: do not promise or spec external file handling in this slice.

## data-testid Index

- `recipe-share-btn`
- `recipe-share-error`
- `import-recipe-file-btn`
- `bundle-preview-card`
- `bundle-preview-name`
- `bundle-preview-source-url`
- `bundle-preview-source-name`
- `bundle-preview-synthesis-badge`
- `bundle-preview-original-count`
- `accept-bundle-btn`
- `reject-bundle-btn`
- `bundle-import-error`
- `bundle-import-success`
- `bundle-import-done-btn`
