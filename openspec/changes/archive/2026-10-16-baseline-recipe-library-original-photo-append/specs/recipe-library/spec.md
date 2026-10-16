# Spec Delta

## ADDED Requirements

### Requirement: Append one original photo to an existing recipe

For an authorized multipart POST `/api/recipes/{id}/originals`, successful append SHALL save the supplied file as the next original index from stored recipe-info count, advance that count and the recipe database image count, then request hero regeneration. After those steps succeed, the API SHALL return HTTP 201 with the new original asset Location.

#### Scenario: Append an original and request regeneration
- **WHEN** an existing recipe and recipe-info both have count2 and a single file append completes
- **THEN** the file is saved at index2, both counts advance to3, regeneration is requested and the API returns HTTP 201 with a Location for original/2

#### Scenario: Reject an append for a missing recipe
- **WHEN** an authorized upload targets an absent recipe ID
- **THEN** the API returns HTTP 404 before this service writes an original or triggers regeneration

### Requirement: Dispatch original-photo append from detail Edit

Loaded detail Edit SHALL offer a camera/file input action. Selecting its first file SHALL immediately send the original-photo upload, show Uploading photo feedback, then show regeneration-start feedback on success or upload-failure feedback on rejection. The input SHALL reset after completion. This dispatched action SHALL be separate from unsubmitted detail drafts.

#### Scenario: Upload a selected detail photo
- **WHEN** a person in loaded detail Edit activates the camera action and selects a file
- **THEN** the client posts that file to the loaded ID and shows Uploading photo followed by Regenerating hero image on success

#### Scenario: Finish a failed detail photo upload
- **WHEN** the detail photo upload rejects
- **THEN** the client shows Failed to upload photo and clears the input value for another selection
