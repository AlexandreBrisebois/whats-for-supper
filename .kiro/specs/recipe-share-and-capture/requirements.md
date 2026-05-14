# Requirements: Recipe Share and Capture

## Revision Notes

This revision removes the platform-risky parts of the original draft.
The feature no longer depends on OS-level file associations, `launchQueue`,
or inbound share-target behavior.

The supported user journey is intentionally simple:
1. Export a portable `.recipe` file from a recipe detail surface.
2. Save that file to the device or send it through any normal channel.
3. Open What's For Supper.
4. Import the `.recipe` file from the capture screen.
5. Review it before adding it to the library.

This keeps the feature truthful on mobile, especially Android, where installed
PWA file-handler behavior is not a safe product promise.

## Vision

Create a portable, privacy-safe recipe sharing format that feels as dependable
as exporting a document. A sender can package a recipe into a `.recipe` file,
and the recipient can import that file from the capture screen, preview it,
and choose whether to add it to their library.

## Product Decisions

1. **Portable Bundle Format**: Shared recipes use a JSON-based `.recipe` file.
2. **Privacy First**: Personal household metadata is stripped from exports.
3. **Manual Import Only**: Inbound recipe sharing starts from an explicit
   in-app import action on `/capture`.
4. **No OS File-Handler Promise**: The spec does not require `file_handlers`,
   `launchQueue`, or "open with WFS" behavior.
5. **Review Before Ingest**: Imported recipes are previewed and explicitly
   accepted before they enter the library.
6. **Strict Minimum Data**: The export contains only the fields required to
   reconstruct a ready-to-use recipe plus truthful provenance cues.
7. **No Inbound Share Target**: This feature does not add a share target for
   `.recipe` imports.
8. **Fire-and-Forget Success**: After a successful import, the user should be
   returned to the primary app flow instead of being stranded on a dead-end
   confirmation screen.
9. **Atomic Documentation And Test Sync**: Contract, mocks, tests, and docs
   must be updated together so no part of the feature drifts.

## Acceptance Criteria

### Requirement 1: Outbound Recipe Export

**User Story:** As a sender, I want to export a recipe into a portable file so
I can send it to another device or person without exposing private metadata.

#### Acceptance Criteria

1. The recipe detail surface SHALL expose a share/export action with
   `data-testid="recipe-share-btn"`.
2. On mobile recipe detail surfaces, `recipe-share-btn` SHALL occupy the
   current visible utility-action position previously used by Edit.
3. Recipe editing SHALL move under the gear/settings overflow instead of
   remaining a first-class visible action for this flow.
4. `View original` SHALL remain a separate provenance action and SHALL NOT be
   combined into the same target as Share.
5. Activating `recipe-share-btn` SHALL request a generated `.recipe` bundle
   from the API for the current recipe.
6. The client SHALL package the API response into a downloadable/shareable file
   whose filename ends in `.recipe`.
7. The exported bundle SHALL contain:
   - schema version,
   - one recipe payload,
   - one provenance/info payload,
   - one hero image payload,
   - zero to five original image payloads.
8. The exported bundle SHALL include the following recipe fields only:
   - `name`
   - `description`
   - `ingredients`
   - `instructions`
   - `prepTimeMinutes`
   - `cookTimeMinutes`
   - `totalTimeMinutes`
   - `servings`
   - `sourceUrl`
   - `sourceName`
   - `category`
   - `isSynthesized`
9. The exported bundle SHALL include enough image data to render:
   - one hero image preview,
   - up to five original/source photos when they exist.
10. The exported bundle SHALL NOT include:
   - `addedBy`
   - `rating`
   - `notes`
   - `dietaryProfile`
   - planner assignments
   - discovery votes
   - household member identifiers
   - internal database IDs from the sender's library
11. If bundle generation fails, the user SHALL remain on the current recipe
   detail surface and see `data-testid="recipe-share-error"` with a clear,
   non-technical error message.

### Requirement 2: Import Entry On Capture

**User Story:** As a recipient, I want one obvious import entry point in
Capture so I always know how to bring a shared recipe into the app.

#### Acceptance Criteria

1. The `/capture` route SHALL expose a visible import action with
   `data-testid="import-recipe-file-btn"`.
2. Activating `import-recipe-file-btn` SHALL open a file picker limited to
   `.recipe` files.
3. The file picker flow SHALL work without requiring OS-level file associations.
4. The existing primary capture block for `Camera` and `Gallery` SHALL remain
   the dominant first acquisition surface on `/capture`.
5. `Import recipe file` SHALL live in a separate secondary actions section
   below the primary capture block.
6. Within the secondary actions section, `Import recipe file` SHALL appear
   after `Paste recipe link` and `Describe a recipe`.
7. This feature SHALL NOT require:
   - manifest `file_handlers`,
   - `launchQueue`,
   - `share_target` changes,
   - automatic navigation into `/capture` from an external file open event.
8. If the user cancels the picker, the capture screen SHALL remain unchanged.
9. If the selected file is not valid JSON or does not match the expected bundle
   shape, the UI SHALL show `data-testid="bundle-import-error"` and SHALL NOT
   create a recipe.

### Requirement 3: Review Before Import

**User Story:** As a recipient, I want to preview a shared recipe before it is
added so I stay in control and do not pollute the library with bad imports.

#### Acceptance Criteria

1. After a valid `.recipe` file is selected, `/capture` SHALL enter a bundle
   review state instead of importing immediately.
2. The bundle review state SHALL render `data-testid="bundle-preview-card"`.
3. `bundle-preview-card` SHALL show:
   - hero image when present,
   - recipe name,
   - source URL when present,
   - source name when present,
   - synthesis status label,
   - count of original photos when greater than zero.
4. The review state SHALL render:
   - `data-testid="accept-bundle-btn"`
   - `data-testid="reject-bundle-btn"`
5. Activating `reject-bundle-btn` SHALL:
   - discard the selected bundle from local review state,
   - return the user to the default capture screen,
   - not call the API.
6. Activating `accept-bundle-btn` SHALL POST the bundle to the import API.
7. While the import POST is in flight, `accept-bundle-btn` SHALL be disabled to
   prevent duplicate submissions.
8. If the import API returns a failure response, the review state SHALL remain
   visible and the UI SHALL show `data-testid="bundle-import-error"`.

### Requirement 4: Import API Contract

**User Story:** As the system, I need a deterministic import contract so the
client, mock layer, and backend all ingest the same portable recipe format.

#### Acceptance Criteria

1. The API SHALL expose one import endpoint for recipe bundles.
2. The import request body SHALL conform to `RecipeShareBundleDto`.
3. `RecipeShareBundleDto` SHALL include:
   - `version: string`
   - `recipe: ImportedRecipeDto`
   - `info: RecipeShareInfoDto`
   - `hero: SharedImageDto | null`
   - `originals: SharedImageDto[]`
4. `ImportedRecipeDto` SHALL include only the fields listed in
   Requirement 1 AC5.
5. `RecipeShareInfoDto` SHALL include:
   - `exportedAtUtc: string`
   - `bundleSource: "wfs-share"`
   - `appVersion: string | null`
6. `SharedImageDto` SHALL include:
   - `mimeType: string`
   - `base64: string`
7. The import endpoint SHALL reject unsupported bundle versions with HTTP 400.
8. The import endpoint SHALL reject malformed payloads with HTTP 400.
9. A successfully imported recipe SHALL be stored as ready immediately when the
   bundle already contains complete recipe content.
10. The imported recipe SHALL preserve whether it is synthesized.

### Requirement 5: Completion And No-Dead-End UX

**User Story:** As a busy parent, I want import success to move me back into
the app quickly so I can keep planning supper instead of dealing with a dead-end
confirmation screen.

#### Acceptance Criteria

1. A successful bundle import SHALL show `data-testid="bundle-import-success"`.
2. The success state SHALL provide one clear next step with
   `data-testid="bundle-import-done-btn"`.
3. Activating `bundle-import-done-btn` SHALL return the user to the primary app
   flow. The recommended destination is `/home`.
4. The success state MAY auto-return after a short countdown, but only if the
   user still has an explicit visible exit action.
5. The success state SHALL NOT strand the user on a screen with no onward path.

### Requirement 6: Atomic Sync Across Contract, Mocks, Tests, And Docs

**User Story:** As a maintainer, I need every seam around recipe sharing to be
updated together so the next developer does not inherit drift or misleading
documentation.

#### Acceptance Criteria

1. Any implementation of this feature SHALL update `specs/openapi.yaml` to
   match the final export and import contract.
2. Any implementation of this feature SHALL update `pwa/e2e/mock-api.ts` and
   any related mock builders/fixtures so E2E behavior matches the contract.
3. Any implementation of this feature SHALL update or add tests on each changed
   seam:
   - backend tests for export/import behavior,
   - frontend unit/component tests for capture and share UI,
   - E2E tests for the manual import flow.
4. Any implementation of this feature SHALL update supporting documentation that
   describes capture/share behavior, routes, or recipe import/export flows.
5. Work on this feature is not complete if code changes land without matching
   OpenAPI, mock, test, and documentation updates.

### Requirement 7: Generated Client And Type Synchronization

**User Story:** As a maintainer, I need generated API clients and shared types
to stay synchronized with the contract so frontend work does not fail later on
stale DTOs or missing generated code.

#### Acceptance Criteria

1. Any implementation that changes the recipe share/import contract SHALL
   regenerate API clients from `specs/openapi.yaml` in the same slice.
2. Any implementation that changes DTO shapes SHALL update or regenerate any
   shared frontend/backend types derived from the contract in the same slice.
3. Frontend code for this feature SHALL consume the synchronized generated
   client/types rather than hand-rolled temporary DTO copies.
4. Validation for this feature SHALL include the repo’s reconciliation/drift
   workflow so stale generated clients or schema drift fail before merge.
5. Work on this feature is not complete if:
   - OpenAPI changed but generated clients were not regenerated,
   - DTO fields changed but consuming types were not synchronized,
   - frontend code compiles only because of local type bypasses or ad-hoc casts.

## Glossary

- **`.recipe` file**: A portable JSON bundle exported by What's For Supper for
  recipe sharing.
- **Bundle Review State**: The capture-screen state where a selected `.recipe`
  file is previewed before import.
- **Manual Import**: A user-initiated file picker flow started inside the app.
- **Privacy Scrubbing**: Removal of sender-specific household metadata during
  bundle export.
- **Synthesized Recipe**: A recipe created or normalized by an AI or extraction
  pipeline rather than being a direct untouched source record.
