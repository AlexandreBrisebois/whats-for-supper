## MODIFIED Requirements

### Requirement: Dispatch original-photo append from detail Edit

Loaded detail Edit SHALL offer a camera/file input action. Selecting its first file SHALL immediately send the original-photo upload without showing an intermediate upload-start toast, then show regeneration-start feedback on success or upload-failure feedback on rejection. The input SHALL reset after completion. This dispatched action SHALL be separate from unsubmitted detail drafts.

#### Scenario: Upload a selected detail photo
- **WHEN** a person in loaded detail Edit activates the camera action and selects a file
- **THEN** the client posts that file to the loaded ID without showing `Uploading photo...` and shows `Regenerating hero image...` on success

#### Scenario: Finish a failed detail photo upload
- **WHEN** the detail photo upload rejects
- **THEN** the client shows `Failed to upload photo` and clears the input value for another selection
