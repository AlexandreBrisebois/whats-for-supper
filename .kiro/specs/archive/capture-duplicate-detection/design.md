# Design Document: Duplicate Recipe Capture Prevention

## UX/UI Design & Aesthetic Contract

All duplicate banners and actions will follow the **Solar Earth** design tokens.

### Duplicate Warning Banner Visuals
- **Tailwind Classes**: `rounded-2xl border border-ochre/20 bg-ochre/5 px-4 py-3 text-sm text-ochre flex items-center justify-between gap-4 animate-in fade-in duration-300`
- **Text content**: Matches the specific mode (e.g. "This recipe already exists in your library.")
- **Action button**: A small button styled with `text-xs font-bold underline hover:text-ochre/80 whitespace-nowrap` representing "View existing recipe".

### Recovery Actions in Photo Success Screen
When a duplicate is detected post-synthesis on the success screen, the action buttons are:
1. **"Done" (Keep)**: Primary terracotta button (`variant="primary"`). Navigates back home.
2. **"Discard duplicate" (Delete)**: Secondary light gray/transparent button (`variant="ghost" text-charcoal/60`).
   - Tapping this calls `DELETE /api/recipes/{id}`.
   - Shows a loading spinner.
   - Triggers `addToast` with message "Duplicate recipe discarded." and redirects to Home command center (`/`).

---

## State Ownership & Debouncing

Component state inside `MinimalCapture.tsx`:

- `duplicateRecipeId`: `string | null` (Triggers `RecipeDetailSheet` drawer when non-null)
- `fileDuplicate`: `RecipeDto | null`
- `urlDuplicate`: `RecipeDto | null`
- `describeDuplicate`: `RecipeDto | null`
- `photoDuplicate`: `RecipeDto | null`

### Debounce Handling
To prevent spamming the database:
- **Describe Mode name input**: Check is debounced by 500ms when `describeName` changes.
- **URL input**: Check is debounced by 500ms when `urlInput` changes, or is performed on input field blur.

---

## API & Seams

We update `GET /api/recipes` and the share bundle structures.

### OpenAPI Contract updates (`specs/openapi.yaml`)
```yaml
  /api/recipes:
    get:
      summary: List recipes
      parameters:
        ...
        - name: id
          in: query
          required: false
          schema: { type: string, format: uuid }
          description: Optional exact ID filter to find duplicate recipes by original GUID.
        - name: name
          in: query
          required: false
          schema: { type: string }
          description: Optional exact, case-insensitive name filter to find duplicate recipes.
        - name: url
          in: query
          required: false
          schema: { type: string }
          description: Optional exact, case-insensitive source URL filter to find duplicate recipes.
```

Update `RecipeShareInfoDto` schema to include the original `recipeId`:
```yaml
    RecipeShareInfoDto:
      type: object
      required: [exportedAtUtc, bundleSource]
      properties:
        exportedAtUtc: { type: string, format: date-time }
        bundleSource: { type: string, enum: [wfs-share] }
        appVersion: { type: [string, 'null'] }
        recipeId: { type: string, format: uuid }
```

### Backend DTOs & Entity query logic
The query built in `RecipeService.GetRecipesList` is modified:
```csharp
if (id.HasValue)
{
    query = query.Where(r => r.Id == id.Value);
}
if (!string.IsNullOrWhiteSpace(name))
{
    query = query.Where(r => r.Name.ToLower() == name.Trim().ToLower());
}
if (!string.IsNullOrWhiteSpace(url))
{
    query = query.Where(r => r.SourceUrl != null && r.SourceUrl.ToLower() == url.Trim().ToLower());
}
```

### Export & Import GUID Preservation
In `RecipeService.ExportRecipeShareBundle`:
- Populate the `RecipeId` property in `RecipeShareInfoDto` with the recipe's GUID.

In `RecipeService.ImportRecipeShareBundle`:
```csharp
var recipeId = bundle.Info.RecipeId ?? Guid.NewGuid();

// If a recipe with this ID already exists, generate a new Guid so we don't crash
// and allow importing as a duplicate copy.
if (await db.Recipes.AnyAsync(r => r.Id == recipeId))
{
    recipeId = Guid.NewGuid();
}
```

---

## Client Side Checking Flow (PWA)

1. **File Import**:
   - If the bundle contains `info.recipeId`, call:
     `GET /api/recipes?id={bundle.info.recipeId}&limit=1`
   - Fallback (if no GUID match found or `info.recipeId` is missing):
     `GET /api/recipes?name={encodeURIComponent(parsedName)}&limit=1`
2. **URL Capture**:
   `GET /api/recipes?url={encodeURIComponent(pastedUrl)}&limit=1`
3. **Describe Mode**:
   `GET /api/recipes?name={encodeURIComponent(describeName)}&limit=1`
4. **Photo Success Screen**:
   `GET /api/recipes?name={encodeURIComponent(readyRecipeName)}&limit=10`
   - Filter matches: `response.recipes.find(r => r.id !== pendingRecipeId)`.

---

## Mock Contract (`pwa/e2e/mock-api.ts`)

Update mocks to support the name/URL/ID filters on `GET /api/recipes`:
```ts
if (url.pathname === '/api/recipes') {
  const idParam = url.searchParams.get('id');
  const nameParam = url.searchParams.get('name');
  const urlParam = url.searchParams.get('url');

  if (idParam === '550e8400-e29b-41d4-a716-446655440001' || nameParam?.toLowerCase() === 'imported shared recipe' || urlParam === 'https://example.com/spaghetti') {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        updatedAt: '2026-05-24T12:00:00Z',
        recipes: [{ id: '550e8400-e29b-41d4-a716-446655440001', name: 'Imported Shared Recipe', sourceUrl: 'https://example.com/spaghetti' }],
        pagination: { page: 1, limit: 20, total: 1 }
      })
    });
  }
}
```

---

## TestIDs List

- `duplicate-recipe-warning`: The container banner for duplicate warnings.
- `view-existing-recipe-btn`: The button to trigger standard details sheet.
- `discard-duplicate-btn`: The button on Success screen to delete the newly synthesized duplicate recipe.
