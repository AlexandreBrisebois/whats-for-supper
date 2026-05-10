# Design: Recipe Detail Image And Import Actions

## UX Implementation Contract

### Visual Hierarchy & Placement

#### 1. Header Gear Menu
- **Icon**: `Settings` (Lucide)
- **Placement**: Next to the "Close" button in the `RecipeDetailSheet` header.
- **Menu Items**:
    - `Move to Bin` (Icon: `Trash2`, Text: "Move to Bin")
    - `Reimport Recipe` (Icon: `RefreshCw`, Text: "Reimport Recipe") - *Conditional*
- **Test ID**: `action-gear-menu`

#### 2. Hero Action Overlays (Edit Mode Only)
- **Visible**: Only when `isEditing` is `true`.
- **Style**: Circular glassmorphism buttons.
    - `bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-xl`
    - `hover:bg-white/30 active:scale-95 transition-all`
- **Camera (Bottom-Right)**:
    - **Icon**: `Camera` (Lucide)
    - **Action**: Opens `MinimalCapture` sheet.
    - **Test ID**: `hero-action-camera`
- **Regenerate (Bottom-Left)**:
    - **Icon**: `RefreshCw` (Lucide)
    - **Action**: Triggers background hero regeneration.
    - **Test ID**: `hero-action-regenerate`

### Interaction States
- **Reimport**: Fire-and-forget. Show toast `t('recipes.reimportStarted', 'Reimport started...')` immediately upon trigger.
- **Photo Upload**: Show toast `t('recipes.photoUploading', 'Uploading photo...')`. Upon completion, show `t('recipes.regeneratingHero', 'Regenerating hero image...')`.

## State Ownership
- **`RecipeDto` Extensions**:
    - `sourceType`: `"url" | "photos" | "synthesized"` (Determined by backend based on `SourceUrl` and `Images.Count`).
    - `canReimport`: `boolean` (True if not "synthesized").
    - `imageCount`: `number` (Length of `Images` list).

## Experience Architecture

```mermaid
graph TD
    A[RecipeDetailSheet] --> B{isEditing?}
    B -- Yes --> C[Hero Overlays: Camera / Regenerate]
    B -- No --> D[Gear Menu: Bin / Reimport]
    C1[Camera Click] --> C2[MinimalCapture Sheet]
    C2 -- File Selected --> C3[Upload /api/recipes/{id}/originals]
    C3 -- Success --> C4[Queue Hero Regeneration]
    D1[Reimport Click] --> D2[POST /api/recipes/{id}/import]
    D2 -- Success --> D3[Toast: Reimport started]
```

## Mock Contract

### `pwa/e2e/mock-api.ts`
Add the following handlers:
```typescript
// POST /api/recipes/{id}/import
{
  url: '/api/recipes/*/import',
  method: 'POST',
  status: 202,
  response: { status: 'queued' }
}

// POST /api/recipes/{id}/originals
{
  url: '/api/recipes/*/originals',
  method: 'POST',
  status: 201,
  response: { id: 'new-photo-id' }
}

// POST /api/recipes/{id}/hero/regenerate
{
  url: '/api/recipes/*/hero/regenerate',
  method: 'POST',
  status: 202,
  response: { status: 'queued' }
}
```

## Testing Strategy
- **Unit (Vitest)**:
    - Verify gear menu items appear conditionally based on `canReimport`.
    - Verify hero overlays appear/disappear based on `isEditing`.
- **E2E (Playwright)**:
    - Open gear menu -> Click "Move to Bin" -> Verify deletion flow.
    - Open gear menu -> Click "Reimport Recipe" -> Verify API call and toast.
    - Edit mode -> Click "Regenerate" -> Verify API call and toast.
    - Edit mode -> Click "Camera" -> Verify `MinimalCapture` opens.

## data-testid Index
| Element | Test ID |
| :--- | :--- |
| Gear Menu Button | `action-gear-menu` |
| Menu Item: Move to Bin | `action-move-to-bin` |
| Menu Item: Reimport | `action-reimport-recipe` |
| Hero Camera Button | `hero-action-camera` |
| Hero Regenerate Button | `hero-action-regenerate` |
| Header Title Area | `recipe-detail-header-title` |
