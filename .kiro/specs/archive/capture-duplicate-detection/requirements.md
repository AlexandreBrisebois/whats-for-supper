# Requirements Document: Duplicate Recipe Capture Prevention

## Introduction

The goal of this feature is to prevent users from importing or creating duplicate recipes in the library. When a user captures a recipe using any of the available capture modes—recipe file import, URL capture, describe text entry, or photo/gallery capture—the PWA will verify if a matching recipe (case-insensitive name, URL, or exact GUID) already exists in the active (non-soft-deleted) library.

To prevent cognitive clutter and keep the library clean (reducing mealtime anxiety for Mom), we offer a clear **3-choice recovery path** when a duplicate is found:
1. **Discard / Cancel**: Do not import. For completed photo captures, this calls `DELETE /api/recipes/{id}` to soft-delete the newly created record, keeping the library clean.
2. **Keep / Import Anyway**: Proceed with importing/saving, allowing duplicates. If Mom imports a `.recipe` file anyway, the API will automatically generate a new GUID for the duplicate copy to prevent database primary key collisions.
3. **View Existing**: Open the standard `RecipeDetailSheet` drawer as an overlay to review the existing recipe, returning directly to the decision UI upon closing.

## Glossary

- **File_Import_Preview**: The screen showing the details of a `.recipe` file parsed before import.
- **URL_Review**: The screen/modal showing the pasted URL and the "Save link" button.
- **Describe_Form**: The text fields (name, description) for typing a recipe.
- **Photo_Success_Screen**: The final success screen shown after a photo is uploaded and SSE notification indicates synthesis is complete.
- **Duplicate_Warning_Banner**: The banner shown to warn the user that a duplicate exists, containing a link to view the existing recipe.
- **Recipe_Detail_Sheet**: The sliding sheet showing full recipe details (`RecipeDetailSheet`).

---

## Requirements

### Requirement 1: GET /api/recipes Duplicate Query Seam
**Goal:** Query the collection endpoint to check for matching IDs, names, or source URLs.

#### Acceptance Criteria
1. THE `GET /api/recipes` endpoint SHALL accept an optional `id` query parameter (UUID).
2. THE `GET /api/recipes` endpoint SHALL accept an optional `name` query parameter.
3. THE `GET /api/recipes` endpoint SHALL accept an optional `url` query parameter.
4. WHEN `id` is provided, THE API SHALL filter recipes to find a matching ID.
5. WHEN `name` is provided, THE API SHALL filter recipes to find an exact, case-insensitive match on the recipe name.
6. WHEN `url` is provided, THE API SHALL filter recipes to find an exact, case-insensitive match on the `sourceUrl`.
7. THE query SHALL ignore soft-deleted recipes (where `deletedAt != null`).
8. THE query SHALL only match recipes where `isReady` is true (i.e. fully synthesized/imported).

---

### Requirement 2: File Import Duplicate Detection & GUID Preservation
**Goal:** Detect duplicates by GUID or name when a `.recipe` file is uploaded.

#### Acceptance Criteria
1. THE exported `.recipe` bundle (`RecipeShareInfoDto`) SHALL contain a `recipeId` field preserving the original recipe GUID.
2. WHEN a user selects a `.recipe` file and it is parsed successfully, THE PWA SHALL:
   - First check if `recipeId` exists in the bundle info. If yes, query `GET /api/recipes` with the `id`.
   - If no match is found, fallback to querying `GET /api/recipes` with the recipe's `name`.
3. IF a match is returned, THE PWA SHALL render the Duplicate_Warning_Banner at the top of the File_Import_Preview.
4. THE banner SHALL display the text "This recipe already exists in your library." and a "View existing recipe" button/link.
5. WHEN "View existing recipe" is clicked, THE PWA SHALL display the Recipe_Detail_Sheet for the existing recipe as an overlay. Closing the sheet SHALL return Mom to the File_Import_Preview.
6. THE File_Import_Preview SHALL offer two main action buttons:
   - **"Import anyway"**: Sends the bundle to `POST /api/recipes/import-bundle`. If a recipe with the original `recipeId` already exists in the database, the API SHALL automatically assign a new GUID to the duplicate copy to avoid primary key conflicts.
   - **"Discard duplicate" (Cancel)**: Resets the state and does not create any recipe.

---

### Requirement 3: URL Capture Duplicate Detection & Recovery
**Goal:** Detect duplicates by URL when a recipe URL is pasted.

#### Acceptance Criteria
1. WHEN a user types or pastes a URL, THE PWA SHALL query `GET /api/recipes` with the URL (debounced).
2. IF a match is returned, THE PWA SHALL render the Duplicate_Warning_Banner on the URL capture view.
3. THE banner SHALL display the text "You already have a recipe from this link: [Recipe Name]" and a "View existing recipe" button/link.
4. WHEN "View existing recipe" is clicked, THE PWA SHALL display the Recipe_Detail_Sheet for the existing recipe as an overlay. Closing the sheet SHALL return Mom to the URL capture view.
5. THE URL capture view SHALL offer two choices:
   - **"Import anyway"**: Triggers URL capture workflow.
   - **"Cancel"**: Clears the input field and does not start any workflow.

---

### Requirement 4: Describe Capture Duplicate Detection & Recovery
**Goal:** Detect duplicates by name when a user enters a recipe name manually.

#### Acceptance Criteria
1. WHEN a user enters text in the recipe name field, THE PWA SHALL query `GET /api/recipes` with the name (debounced).
2. IF a match is returned, THE PWA SHALL render the Duplicate_Warning_Banner below the recipe name field.
3. THE banner SHALL display the text "A recipe with this name already exists in your library." and a "View existing recipe" button/link.
4. WHEN "View existing recipe" is clicked, THE PWA SHALL display the Recipe_Detail_Sheet for the existing recipe as an overlay. Closing the sheet SHALL return Mom to the Describe_Form.
5. THE describe form action buttons SHALL function as follows:
   - **"Synthesize Recipe" (Anyway)**: Creates the recipe.
   - **"Cancel"**: Resets the describe form.

---

### Requirement 5: Photo/Gallery Capture Duplicate Detection & Recovery
**Goal:** Detect duplicates by synthesized name after photo processing.

#### Acceptance Criteria
1. WHEN the SSE `recipe_ready` notification is received for a photo capture, THE PWA SHALL query `GET /api/recipes` with the synthesized name.
2. IF a match is found (excluding the newly created recipe ID to prevent self-matching), THE PWA SHALL render the Duplicate_Warning_Banner on the Photo_Success_Screen.
3. THE banner SHALL display the text "A recipe with this name already exists: [Recipe Name]" and a "View existing recipe" button/link.
4. WHEN "View existing recipe" is clicked, THE PWA SHALL display the Recipe_Detail_Sheet for the existing recipe as an overlay. Closing the sheet SHALL return Mom to the Photo_Success_Screen.
5. THE Photo_Success_Screen SHALL offer two primary recovery buttons if a duplicate is found:
   - **"Keep anyway" / "Done"**: Retains the newly synthesized recipe.
   - **"Discard duplicate" (Delete)**: Triggers an API call to `DELETE /api/recipes/{newlyCreatedId}` to soft-delete the duplicate recipe immediately and returns the user to the Home command center, keeping the library clean.
6. IF the capture process fails or is incomplete (e.g. the user abandons it mid-way before the success screen), THE incomplete capture records SHALL be pruned/cleaned up automatically by the system's background `dreaming` workflow.
