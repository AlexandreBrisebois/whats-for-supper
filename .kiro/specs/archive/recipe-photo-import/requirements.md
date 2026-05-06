# Requirements Document

## Introduction

This feature enables a family member to capture a physical recipe — a recipe card, cookbook page, or handwritten note — by taking one or more photos with their phone. The app recognizes the recipe content from the photos using AI extraction and imports it into the recipe library automatically, making it available for meal planning and discovery.

### Implementation Status

After a thorough codebase review, the end-to-end flow is **largely already implemented**. The purpose of this spec is to document what exists, identify what needs verification against the requirements below, and defer what is explicitly out of scope.

**✅ Already Implemented**

| Component | What exists |
|---|---|
| `POST /api/recipes` | Accepts multipart photo upload, validates images, saves to disk and DB, automatically triggers `recipe-import` workflow (`RecipeService.CreateRecipe`) |
| `recipe-import.yaml` | Workflow: `ExtractRecipe → GenerateHero → SyncRecipe → RecipeReady` |
| `GET /api/recipes/{id}/import` | Returns Import_Status and error message for a recipe |
| `POST /api/recipes/{id}/import` | Re-triggers the Recipe_Import_Workflow (retry) |
| `GET /api/recipes/import-status` | Aggregate monitoring endpoint |
| `/api/stream` (SSE) | Emits `recipe_ready` and `recipe_failed` events |
| `useScheduleStream` hook | Handles `recipe_ready` and `recipe_failed` events; updates `captureStore` and `libraryStore` |
| `captureStore` | Tracks pending recipe IDs submitted in this session |
| `libraryStore` | Holds notification queue; supports `pushNotification` / `dismissNotification` |
| `MinimalCapture` component | Camera button, gallery button, thumbnail previews, remove images, designate main dish photo, appreciation rating, notes, "Save Recipe" button, loading state, queued success screen, ready screen (SSE fires while on page), in-app notification banner (user has navigated away) |
| Image validation | Client-side and server-side: MIME type, 20 MB limit, 1–20 image count, `finished_dish_image_index` range |

**🔲 Needs Verification**

The requirements below are believed to be implemented but have not been systematically verified end-to-end. Each requirement is tagged with its status.

**🚧 Deferred**

- **Import failure UX on a recipe detail page**: No recipe detail page exists yet. Error state display and retry from a detail page are deferred to a future spec.

---

## Glossary

- **Capture_Page**: The PWA page at `/capture` that hosts the photo capture flow.
- **Camera_Input**: The device camera triggered via `<input type="file" capture="environment">`.
- **Gallery_Input**: The device photo library triggered via `<input type="file" multiple>`.
- **Photo_Set**: The collection of one or more images selected by the user for a single recipe import.
- **Recipe_Import_Workflow**: The backend async workflow (`recipe-import`) that runs extraction, hero generation, sync, and ready notification steps.
- **Extraction_Step**: The `ExtractRecipe` processor within the Recipe_Import_Workflow that uses AI/OCR to parse recipe content from photos.
- **Hero_Image**: The AI-generated thumbnail image produced by the `GenerateHero` processor.
- **Import_Status**: The current state of a Recipe_Import_Workflow instance: `Pending`, `Processing`, `Completed`, or `Failed`.
- **SSE_Stream**: The server-sent events stream the PWA subscribes to for real-time recipe readiness notifications.
- **Recipe_Ready_Notification**: The `recipe_ready` SSE event emitted when a Recipe_Import_Workflow completes successfully.
- **Pending_Recipe**: A recipe row that has been created in the database but whose Recipe_Import_Workflow has not yet completed.
- **Library**: The recipe library accessible at `/recipes` in the PWA.
- **Family_Member**: An authenticated user of the app identified by the `X-Family-Member-Id` header.

---

## Requirements

### Requirement 1: Photo Capture Entry Point ✅ Already Implemented

**User Story:** As a family member, I want to take one or more photos of a physical recipe, so that I can start the import process without leaving the app.

#### Acceptance Criteria

1. THE Capture_Page SHALL display a camera button that opens the device Camera_Input when tapped.
2. THE Capture_Page SHALL display a gallery button that opens the device Gallery_Input when tapped, allowing multiple image selection.
3. WHEN a photo is taken or selected, THE Capture_Page SHALL display a thumbnail preview of each image in the Photo_Set.
4. WHEN the Photo_Set contains at least one image, THE Capture_Page SHALL display a "Save Recipe" button.
5. THE Capture_Page SHALL allow the user to remove any individual image from the Photo_Set before saving.
6. THE Capture_Page SHALL allow the user to designate one image as the "Main Dish" photo by tapping it; THE Capture_Page SHALL default the first image as the Main Dish photo.
7. IF the user attempts to add more than 20 images to the Photo_Set, THEN THE Capture_Page SHALL reject the additional images and display an inline error message.

---

### Requirement 2: Recipe Submission ✅ Already Implemented

**User Story:** As a family member, I want to submit my photos and have the recipe queued for processing, so that I can continue using the app while the import runs in the background.

#### Acceptance Criteria

1. WHEN the user taps "Save Recipe" with a non-empty Photo_Set, THE Capture_Page SHALL submit the Photo_Set to `POST /api/recipes` as a multipart form upload, including the `X-Family-Member-Id` header.
2. WHEN the submission is accepted by the API (HTTP 202), THE Capture_Page SHALL transition to a "queued" success screen without waiting for the Recipe_Import_Workflow to complete.
3. THE queued success screen SHALL display a message indicating the recipe is being processed and the user will be notified when it is ready.
4. WHILE a submission is in progress, THE Capture_Page SHALL display a loading indicator on the "Save Recipe" button and disable the button to prevent duplicate submissions.
5. IF the API returns an error response (HTTP 4xx or 5xx), THEN THE Capture_Page SHALL display an inline error message and return the user to the capture form with the Photo_Set intact.
6. THE Capture_Page SHALL allow the user to optionally set an appreciation rating (1–3) and free-text notes before submitting; these SHALL be included in the submission payload.

---

### Requirement 3: Background Import Processing 🔲 Needs Verification

**User Story:** As a family member, I want the app to automatically extract the recipe details from my photos, so that I don't have to type anything manually.

#### Acceptance Criteria

1. WHEN a recipe is created via `POST /api/recipes`, THE Recipe_Import_Workflow SHALL be triggered automatically with the new recipe's ID.
2. THE Extraction_Step SHALL use AI/OCR to extract the recipe name, ingredients, instructions, total time, category, and difficulty from the Photo_Set.
3. WHEN the Extraction_Step completes successfully, THE Recipe_Import_Workflow SHALL proceed to generate a Hero_Image for the recipe.
4. WHEN all steps of the Recipe_Import_Workflow complete successfully, THE Recipe_Import_Workflow SHALL set `is_discoverable` to `true` on the recipe record. IF any step fails, THE recipe record SHALL remain with `is_discoverable = false` and SHALL NOT become discoverable.
5. IF the Extraction_Step fails, THEN THE Recipe_Import_Workflow SHALL record the error in the workflow task's `error_message` field and set the workflow instance status to `Failed`.
6. IF the Recipe_Import_Workflow fails, THEN THE Recipe_Import_Workflow SHALL NOT delete the recipe row or the uploaded photo files; the recipe SHALL remain recoverable.
7. THE Recipe_Import_Workflow SHALL complete the full pipeline (extract → hero → sync → ready) within 120 seconds for a Photo_Set of up to 5 images under normal operating conditions.

---

### Requirement 4: Real-Time Readiness Notification ✅ Already Implemented

**User Story:** As a family member, I want to be notified when my recipe is ready, so that I can see the imported result without manually refreshing.

#### Acceptance Criteria

1. WHEN the Recipe_Import_Workflow emits a Recipe_Ready_Notification, THE PWA SHALL receive it via the SSE_Stream and update the UI without requiring a page reload.
2. WHEN the user is still on the Capture_Page and the Recipe_Ready_Notification arrives for their Pending_Recipe, THE Capture_Page SHALL transition from the "queued" screen to a "ready" screen showing the extracted recipe name.
3. THE "ready" screen SHALL display a "Add to this week" button that navigates to the planner, and a "Done" button that navigates to the home screen.
4. WHEN the user is not on the Capture_Page and the Recipe_Ready_Notification arrives, THE PWA SHALL display a persistent in-app notification banner indicating the recipe is ready.
5. THE PWA SHALL NOT display a Recipe_Ready_Notification for a recipe that the user has already navigated away from and dismissed.

---

### Requirement 5: Imported Recipe Availability 🔲 Needs Verification

**User Story:** As a family member, I want the imported recipe to appear in my library with all extracted details, so that I can plan meals with it.

#### Acceptance Criteria

1. WHEN the Recipe_Import_Workflow completes, THE recipe record SHALL have its `name`, `ingredients`, `description`, `total_time`, `category`, and `difficulty` fields populated from the Extraction_Step output.
2. WHEN the Recipe_Import_Workflow completes all steps successfully, THE recipe record SHALL have `is_discoverable` set to `true`, making it visible in the Library and discovery feed.
3. WHEN the Recipe_Import_Workflow completes, THE recipe record SHALL have a Hero_Image accessible at `GET /api/recipes/{id}/hero`.
4. THE Library SHALL display the imported recipe in the recipe list, ordered by creation date descending, immediately after the Recipe_Import_Workflow completes.
5. THE recipe detail page SHALL display the original captured photos alongside the extracted recipe content.

---

### Requirement 6: Multi-Photo Recipe Support ✅ Already Implemented

**User Story:** As a family member, I want to photograph multiple pages of a recipe, so that I can capture recipes that span more than one page or card.

#### Acceptance Criteria

1. THE Capture_Page SHALL accept a Photo_Set of 1 to 20 images for a single recipe submission.
2. WHEN a Photo_Set contains multiple images, THE Extraction_Step SHALL treat all images as belonging to the same recipe and combine extracted content across all images.
3. WHEN a Photo_Set contains multiple images, THE Extraction_Step SHALL use the designated Main Dish photo as the primary source for the Hero_Image generation.
4. THE Capture_Page SHALL display the count of photos in the Photo_Set as the user adds images.

---

### Requirement 7: Import Status Visibility ✅ Already Implemented (partial — see deferred note)

**User Story:** As a family member, I want to see the status of my recipe import, so that I know if something went wrong.

#### Acceptance Criteria

1. THE API SHALL expose `GET /api/recipes/{id}/import` to return the current Import_Status and any error message for a given recipe.
2. WHEN the Import_Status is `Failed`, THE API SHALL return the error message from the failed workflow task in the response body.
3. *(Deferred)* Display of import failure state on a recipe detail page is deferred — no recipe detail page exists yet. Failure UX beyond the in-app notification banner will be addressed in a future spec.
4. WHEN the user triggers a retry, THE Capture_Page SHALL call `POST /api/recipes/{id}/import` to re-queue the Recipe_Import_Workflow for the existing recipe.
5. THE API SHALL expose `GET /api/recipes/import-status` to return aggregate counts of `Completed`, `Pending`/`Processing`, and `Failed` workflow instances for operational monitoring.

---

### Requirement 8: Image Validation ✅ Already Implemented

**User Story:** As a family member, I want the app to reject unusable photos early, so that I don't wait for a processing failure after submitting.

#### Acceptance Criteria

1. WHEN a file is added to the Photo_Set, THE Capture_Page SHALL validate that the file is an image (MIME type `image/*`); IF the file is not an image, THEN THE Capture_Page SHALL reject it and display an inline error.
2. WHEN a file is added to the Photo_Set, THE Capture_Page SHALL validate that the file size does not exceed 20 MB; IF the file exceeds 20 MB, THEN THE Capture_Page SHALL reject it and display an inline error.
3. THE API SHALL validate that each uploaded file is an image and does not exceed 20 MB; IF validation fails, THEN THE API SHALL return HTTP 400 with a descriptive error message.
4. THE API SHALL validate that the Photo_Set contains between 1 and 20 images; IF the count is outside this range, THEN THE API SHALL return HTTP 400 with a descriptive error message.
5. THE API SHALL validate that the `finished_dish_image_index` value, when provided, is a valid index within the Photo_Set; IF it is out of range, THEN THE API SHALL return HTTP 400 with a descriptive error message.
