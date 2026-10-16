# Recipe sharing baseline plan

## Current lifecycle checkpoint — consolidated, 2026-10-16

This capability's main spec now contains **11 requirements / 37 scenarios**.
All baseline source changes were archived after the user's explicit approval;
there is no active baseline extraction/promotion queue. Historical checkpoint,
next-session and "changes active" text below records earlier sessions only.
Evidence limitations and unresolved findings remain in the [live backlog](backlog/README.md).
See [consolidation completion](backlog/consolidation-completion.md) for accepted
scope, preserved corrections, archive warnings and verification. Archival does not
establish application correctness, runtime qualification or resolution of defects.

## Current checkpoint and scope

Current accepted/promoted baseline: **11 requirements / 37 scenarios** after
RS-P01 (2026-10-16). The user explicitly accepted and authorized promotion of
`baseline-recipe-sharing-pending-actions` (2 requirements / 3 scenarios), appended
to the existing 9/34 main spec without changing its prior bytes.

Ordinary-household discovery, generation and scoped acceptance/promotion are
complete with U05/U53–U57 and RS-U01–RS-U09 retained as non-normative limitations
and unresolved discrepancies. No selected sharing additions remain unpromoted.
The original active delta remains 9/34; the pending-actions delta remains 2/3.
Historical 9/27 and generation-time 9/34 records below are preserved as history.
Both changes remain active; no archival or application changes occurred.
Runtime qualification remains **not-run/deferred** under A34. No further action
is required for this authorized promotion. A future decision may select review of
the recorded discrepancies or runtime qualification; neither is performed here.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md), then this file.
No other capability plan or full project history is required up front. Follow only
immediate owner/spec dependencies needed for the selected work.

Previously promoted baseline: [main recipe-sharing specification](../../openspec/specs/recipe-sharing/spec.md).

**Phase-12 reconciliation R12 (2026-10-16):** Recorded promoted documentation remains 11 requirements / 37 scenarios; no additional supported extraction gap was found within this plan's explicit boundary.
[Cross-capability review](reconciliation.md) records current inventory, shared-owner
reconciliation, evidence drift and exclusions. Current main SHA-256: `e438716f29d0793758be2e474ba8a0faed7894d9b27144ec2cb9e515cf92cef4`.
This session grants no new acceptance or promotion. Earlier session-specific
“current user” and next-action statements retain their historical scope. A34 and
all local unresolved/excluded behavior remain in force; runtime checks are not-run.


## Capability map and starting points

| Capability / purpose | Candidate scope and rules to recheck | Source starting point | Existing test starting point | Dependencies / initial confidence |
| --- | --- | --- | --- | --- |
| Recipe sharing: exchange portable recipes | Privacy-scrubbed export, native share/download, bundle preview/accept/reject, validation; do not assume UI/API eligibility is identical | [bundle methods](../../api/src/RecipeApi/Services/RecipeService.cs), [client sharing](../../pwa/src/lib/api/recipes.ts), [capture preview](../../pwa/src/components/capture/MinimalCapture.tsx) | [RecipeShareIntegrationTests](../../api/src/RecipeApi.Tests/Integration/RecipeShareIntegrationTests.cs), [sharing browser tests](../../pwa/e2e/sharing-fidelity.spec.ts) | Library, identity, assets, device capabilities / high for format; medium for native sharing |

Shared owners and evidence policy live in [workflow.md](workflow.md). Recheck
these source/test starting points before using them as current evidence.

## Recorded decisions for this capability

Shared A01–A05/A07/A09–A12/A34 decisions are in workflow.md. The records below
retain their original scope; completed stages do not authorize successors.

| ID | Decision | State / authority |
| --- | --- | --- |
| A62 | Discover and CLI-draft only ordinary-household recipe sharing: privacy-scrubbed export (download and native share fallback), bundle import preview, schema validation, duplicate detection warning, cancellation, and library acceptance; update evidence and durable plan | Authorized 2026-10-15 by user session instruction. CLI-scaffolded proposal, 9 ADDED requirements/27 scenarios in recipe-sharing, extraction design/tasks and BSL-recipe-sharing-001–003 mapping; U53–U57 retain format/mime, version tolerance, share fallback, duplicate advisory, and no-SSE limits. Stop at validated draft for human review; no application/test/contract/client/SQL edits, runtime/database qualification, promotion or archival. |
| A63 | Promote only the reviewed recipe-sharing delta into a new main specification | User “promote”, 2026-10-15, immediately following the validated A62 draft. Authorizes creating main specification `openspec/specs/recipe-sharing/spec.md` with exact Purpose and 9 requirements/27 scenarios, and plan/task follow-up. Preserve original Purpose and all prior bytes in existing main specs (`household-identity` 36/92, `recipe-library` 55/122), full delta/evidence/history and all eleven active changes. No separate acceptance statement, archival, successor extraction, application changes or runtime/database qualification inferred. |

## Discrepancies and qualifications

These are implementation-supported/static findings, not runtime guarantees.
Cross-capability entries are included where the selected evidence depends on them.

| ID | Finding / risk | Evidence and required extraction treatment | Status / withheld claim |
| --- | --- | --- | --- |
| U05 | Duplicate prevention is not a universal server guarantee | [MinimalCapture](../../pwa/src/components/capture/MinimalCapture.tsx), [recipe list filtering and bundle import](../../api/src/RecipeApi/Services/RecipeService.cs). Source-dependent checks, post-creation photo detection and possible repeated uncertain uploads need separate scenarios. | Open |
| U53 | File format extension vs MIME type mismatch | BSL-recipe-sharing-001/002: export creates `.txt` file with MIME type `text/plain` containing JSON, and the file picker accept attribute expects `.txt,text/plain`, while parser error messages cite `.recipe file` and test fixtures use `.recipe`. | Non-normative limitation; supported plain-text JSON delivery and intake drafted, extension naming discrepancy withheld |
| U54 | Bundle version enforcement divergence | BSL-recipe-sharing-001/002: server strictly enforces `Version == "1.0"` (returning 400 Bad Request on any other version), while client parser accepts any string for `version` and test fixtures use `"1.1"`. | Non-normative divergence; server 1.0 enforcement drafted, client/fixture version tolerance withheld |
| U55 | Native share cancellation and fallback error boundaries | BSL-recipe-sharing-001: `navigator.share` cancellation (`AbortError`) returns cleanly without error UI or download, while non-abort share failures fall back to immediate file download; native share availability depends on browser environment and `navigator.canShare`. | Non-normative limitation; supported native share and download fallback drafted, universal device sharing guarantees withheld |
| U56 | Duplicate detection is client advisory warning only; backend permits duplicate names and reallocates collision GUIDs | BSL-recipe-sharing-002: client checks existing recipes by source ID or name and renders an advisory warning banner with a link to view the existing recipe without blocking import; upon acceptance, server reallocates fresh GUID on ID collision and persists duplicate names without error. | Non-normative; supported advisory warning and server collision handling drafted, blocking duplicate prevention guarantees withheld |
| U57 | Bundle import creates synchronous ready recipe without SSE broadcast | BSL-recipe-sharing-002: unlike web/photo capture workflows that queue background tasks and emit `recipe_ready` SSE events, bundle import directly and synchronously writes DB entity and asset files and returns 201 Created immediately, omitting real-time live update broadcasts. | Non-normative limitation; synchronous creation drafted, multi-device live update synchronization withheld |

## Slice evidence and lifecycle records

### BSL-recipe-sharing-001 — Loaded detail Share action, privacy scrubbing, and delivery fallback

**Behavior and actor:** A person in an ordinary household with household access and member context opens a ready recipe possessing a real non-placeholder hero image in `RecipeDetailSheet`. The header action area displays a Share control (`recipe-share-btn`). Activating the control shows a persistent loading toast ("Preparing recipe…"), disables the button, and requests the export bundle from GET `/api/recipes/{id}/share`. The API verifies member context and the existence of a stored hero image (returning 400 Bad Request if missing), then generates a version 1.0 bundle with source `wfs-share`. The bundle preserves core metadata, ingredients, structured instructions (HowToSections and steps; wrapping flat arrays in a default section), and up to 5 original images, while scrubbing household notes and ratings to null, and omitting member attribution and top-level recipe ID. The client formats the payload as JSON in a plain text file (`{slugified-name}.txt`). If `navigator.canShare` permits file sharing, `navigator.share` is invoked; user cancellation (`AbortError`) returns cleanly without error feedback or download. If native sharing is unsupported or throws a non-cancellation error, the client falls back to browser file download. If the bundle request fails, the loading toast is dismissed and an inline error message is displayed in `recipe-share-error`.

**Ordered trace:**
1. UI: `pwa/src/components/recipes/RecipeDetailSheet.tsx` (`handleShareRecipe`, `recipe-share-btn` conditional rendering lines 563–577) → `pwa/src/locales/` strings (`recipes.preparingShare`, `recipes.shareRecipe`, `recipes.shareFailedWithDetail`).
2. Client/API: `pwa/src/lib/api/recipes.ts` (`getRecipeShareBundle`, `downloadRecipeBundleFile`, `createRecipeBundleFile`) → `pwa/src/lib/api/api-client.ts` → `specs/openapi.yaml:1905–1956` (`GET /api/recipes/{id}/share`).
3. API/Service: `api/src/RecipeApi/Controllers/RecipeController.cs` (`Share` action, lines 121–150) → `api/src/RecipeApi/Services/RecipeService.cs` (`ExportRecipeShareBundle`, lines 238–273, `MapInstructionsToHowToSections`, `ReadOriginalImages`).
4. Persistence/Storage: `RecipeDbContext` (reads `Recipe`), `LocalRecipeStore` / `IImageService` (reads hero image and original images).
5. Delivery: `navigator.share` or temporary `<a>` element blob download via `URL.createObjectURL(file)`.

**Relevant source files and symbols:**
- `pwa/src/components/recipes/RecipeDetailSheet.tsx`: `handleShareRecipe`, `recipe-share-btn`, `recipe-share-error`, `isSharingRecipe`, `shareError`.
- `pwa/src/lib/api/recipes.ts`: `getRecipeShareBundle`, `downloadRecipeBundleFile`, `createRecipeBundleFile`, `slugifyRecipeName`.
- `api/src/RecipeApi/Controllers/RecipeController.cs`: `Share(Guid id, Guid? familyMemberId)`.
- `api/src/RecipeApi/Services/RecipeService.cs`: `ExportRecipeShareBundle`, `MapInstructionsToHowToSections`, `ReadOriginalImages`, `RecipeShareBundleVersion = "1.0"`.
- `specs/openapi.yaml`: `/api/recipes/{id}/share`, `RecipeShareBundleDto`, `ImportedRecipeDto`, `RecipeShareInfoDto`, `SharedImageDto`.

**Relevant test assertions and substitutions:**
- `api/src/RecipeApi.Tests/Integration/RecipeShareIntegrationTests.cs`:
  - `GetShareBundle_ExportsAllowedFieldsOnly_AndCapsOriginalImagesAtFive`: asserts version 1.0, bundleSource `wfs-share`, scrubbed notes/rating (null/omitted), omitted addedBy/id/dietaryProfile, max 5 original images.
  - `GetShareBundle_PreservesStructuredInstructions_WhenPresentInRawMetadata`: asserts preservation of HowToSection and HowToStep arrays.
  - `GetShareBundle_WrapsFlatInstructions_InDefaultSection`: asserts flat strings are converted to default "Instructions" section.
  - `GetShareBundle_ReturnsBadRequest_IfHeroIsMissing`: asserts 400 Bad Request if hero image missing.
- `pwa/e2e/sharing-fidelity.spec.ts`:
  - `Privacy scrubbing: Share bundle excludes personal metadata`: verifies downloaded bundle JSON has `notes: null` and `rating: null`.
- `pwa/e2e/recipe-share.spec.ts`:
  - `detail share uses the visible action slot while edit stays in overflow`: asserts button visibility and `.txt` file download.
  - `share button is hidden if imageUrl is a placeholder`: asserts button hidden for placeholder hero.
- `pwa/src/components/recipes/RecipeDetailSheet.test.tsx`:
  - `renders Share in the visible action slot while keeping View Original separate`
  - `hides the share button if the recipe has no hero image`
  - `hides the share button if the recipe is not ready`
  - `hides the share button if the imageUrl is a placeholder`
  - `shows recipe-share-error when export fails`
  - `keeps a preparation toast visible through a slow share bundle and prevents duplicate shares`
  - `removes the preparation toast before preserving the existing share failure message`
- `pwa/src/lib/api/recipes.test.ts`:
  - `createRecipeBundleFile / privacy scrubbing`: verifies bundle serialization into File object.

**API/implementation/test/documentation agreement or mismatch:**
- Agreement: Core export metadata, hero requirement, privacy scrubbing of notes/ratings, and delivery fallback agree across source, tests, and OpenAPI schemas.
- Mismatch / discrepancy: Client packages the bundle as `{slugified-name}.txt` with `text/plain` MIME type, whereas test fixtures and parser error messages refer to `.recipe` files (U53).
- Discrepancy: `navigator.share` cancellation suppresses error feedback, while unexpected failure falls back to download (U55).

**Evidence class and confidence:** Implementation-supported; integration, component, and E2E tests provide high confidence for export generation, privacy scrubbing, hero gating, and client fallback.

**Open question or explicit limitation:** U53, U55.

**Disposition:** drafted under A62.

### BSL-recipe-sharing-002 — Capture bundle intake, validation, preview, duplicate warning, and library acceptance

**Behavior and actor:** A person in an ordinary household with household access visits `/capture` and activates "Import recipe file" (`import-recipe-file-btn`). The file picker accepts text/plain files (`.txt,text/plain`). Upon selecting a file, `parseRecipeBundleFile` reads the file text and parses JSON. If parsing fails, it displays an unreadable file error; if the payload fails schema validation, it displays an invalid bundle error. On success, the view transitions to a review screen with `bundle-preview-card` showing the hero photo, name, source attribution, synthesis badge, original photo count, structured instructions, and optional notes/ratings if present in the bundle. Simultaneously, the client performs duplicate detection by querying the library for matching source recipe ID or name: if found, an advisory warning banner (`duplicate-recipe-warning`) is displayed with a "View existing recipe" button that opens `RecipeDetailSheet`. The user can cancel preview via `reject-bundle-btn`, returning to capture without changes, or accept via `accept-bundle-btn`. Activating import submits the bundle to POST `/api/recipes/import-bundle`. The server validates version 1.0, source `wfs-share`, non-empty required fields, max 5 original images, and base64 payloads (returning 400 on violations). If the recipe ID collides with an existing entity, a new UUID is allocated. The recipe is saved synchronously with `IsReady = true`, member attribution, notes/ratings, hero image, and original images, returning 201 Created. The capture view transitions to `bundle-import-success` with a "Done" button (`bundle-import-done-btn`) that navigates to Home (`/`).

**Ordered trace:**
1. UI: `pwa/src/components/capture/MinimalCapture.tsx` (`handleRecipeBundleFileChange`, `import-recipe-file-btn`, `import-recipe-file-input`, `bundle-preview-card`, `duplicate-recipe-warning`, `accept-bundle-btn`, `reject-bundle-btn`, `bundle-import-success`, `bundle-import-done-btn`).
2. Client/API: `pwa/src/lib/api/recipes.ts` (`parseRecipeBundleFile`, `importRecipeShareBundle`) → `specs/openapi.yaml:1957–1985` (`POST /api/recipes/import-bundle`).
3. API/Service: `api/src/RecipeApi/Controllers/RecipeController.cs` (`ImportBundle` action, lines 279–302) → `api/src/RecipeApi/Services/RecipeService.cs` (`ImportRecipeShareBundle`, lines 275–348, `ValidateBundle`, `ValidateImagePayload`).
4. Persistence/Storage: `RecipeDbContext` (adds `Recipe` with `IsReady = true`, `AddedBy = familyMemberId`, UUID collision re-assignment), `LocalRecipeStore` (saves hero image and original images), `ImageService` (writes `recipe.info`).
5. Completion/Navigation: UI displays `bundle-import-success` and clicking Done pushes to `ROUTES.HOME` (`/`).

**Relevant source files and symbols:**
- `pwa/src/components/capture/MinimalCapture.tsx`: `handleRecipeBundleFileChange`, `handleAcceptBundle`, `handleRejectBundle`, `parsedBundle`, `fileDuplicate`, `bundleImportSucceeded`.
- `pwa/src/lib/api/recipes.ts`: `parseRecipeBundleFile`, `importRecipeShareBundle`.
- `api/src/RecipeApi/Controllers/RecipeController.cs`: `ImportBundle(RecipeShareBundleDto dto, Guid? familyMemberId)`.
- `api/src/RecipeApi/Services/RecipeService.cs`: `ImportRecipeShareBundle`, `ValidateBundle`, `ValidateImagePayload`.
- `specs/openapi.yaml`: `/api/recipes/import-bundle`.

**Relevant test assertions and substitutions:**
- `api/src/RecipeApi.Tests/Integration/RecipeShareIntegrationTests.cs`:
  - `ImportBundle_WithUnsupportedVersion_ReturnsBadRequest`: asserts 400 Bad Request when version is `"99.0"`.
  - `ImportBundle_WithMalformedPayload_ReturnsBadRequest`: asserts 400 Bad Request when recipe payload is null.
  - `ImportBundle_WithValidPayload_CreatesReadyRecipe_AndPreservesSynthesizedFlag`: asserts 201 Created, `isReady = true`, `isSynthesized` preserved, entity persisted in DB.
  - `ImportBundle_RestoresNotesAndRating_WhenPresentInBundle`: asserts notes and rating persisted when provided.
- `pwa/src/components/capture/MinimalCapture.recipe-import.test.tsx`:
  - `enters bundle review state after selecting a valid .txt file`: asserts preview card, sections, steps, accept/reject buttons.
  - `renders optional notes in the bundle preview if present`: asserts notes rendering.
  - `shows bundle-import-error for invalid bundle files`: asserts error message on broken JSON.
  - `returns to the default capture view after rejecting a parsed bundle`: asserts cancel button behavior.
  - `File Import Duplicate: shows warning banner and lets the user view the existing recipe`: asserts duplicate banner and detail sheet opening.
- `pwa/e2e/sharing-fidelity.spec.ts`:
  - `Backup fidelity: Export preserves structured instructions, notes, and rating during round-trip`: asserts round-trip preview and import completion.
- `pwa/e2e/recipe-share.spec.ts`:
  - `manual .recipe import starts on capture, shows review, and exits back home`: asserts full UI flow from file selection to home arrival.
- `pwa/src/lib/api/recipes.test.ts`:
  - `parseRecipeBundleFile`: unit tests for structured sections, invalid files, missing steps, `@type` fields, and missing optional fields.

**API/implementation/test/documentation agreement or mismatch:**
- Agreement: Server validation, preview rendering, duplicate warning banner, cancellation, and 201 persistence agree across source, tests, and contract.
- Mismatch / discrepancy: Server strictly enforces `Version == "1.0"`, while client parser accepts any string and test fixture uses `"1.1"` (U54).
- Mismatch / discrepancy: Duplicate detection in UI is advisory warning only; server does not reject duplicate names and reassigns IDs on collision (U56).
- Mismatch / discrepancy: Bundle import directly creates a ready recipe without background workflow queueing or live SSE broadcast (U57).

**Evidence class and confidence:** Implementation-supported; integration, component, and E2E tests provide high confidence for parsing, previewing, duplicate warning, validation, and database/disk persistence.

**Open question or explicit limitation:** U54, U56, U57.

**Disposition:** drafted under A62.

### BSL-recipe-sharing-003 — Recipe sharing baseline proposal and draft

**Authority:** A62 session instruction, 2026-10-15. Authorizes discovery and drafting only ordinary-household recipe sharing: privacy-scrubbed export bundle generation (native share or file download fallback), capture intake, schema validation, preview card presentation, duplicate detection advisory warning, cancellation, and acceptance into the recipe library as a ready recipe. Stop at validated draft for human review; no application changes, promotion, archival, or successor extraction.

**Artifacts produced:**
| Artifact | Status |
| --- | --- |
| [Proposal](../../openspec/changes/archive/2026-10-16-baseline-recipe-sharing-bundle-export-import/proposal.md) | Draft; documentation only |
| [Delta](../../openspec/changes/archive/2026-10-16-baseline-recipe-sharing-bundle-export-import/specs/recipe-sharing/spec.md) | 9 ADDED requirements/27 scenarios; no MODIFIED/REMOVED/RENAMED operations |
| [Design](../../openspec/changes/archive/2026-10-16-baseline-recipe-sharing-bundle-export-import/design.md) | Technical extraction approach, representations, and risks; no application design change |
| [Tasks](../../openspec/changes/archive/2026-10-16-baseline-recipe-sharing-bundle-export-import/tasks.md) | Documentation extraction/validation checklist only; checkbox completion does not establish acceptance |
| Main / lifecycle | Recipe-library 55/122 and household-identity 36/92 unchanged; all eleven changes remain active; no archival |
| Review handoff | Human draft review pending; promotion and archival require separate authorization |

**Requirements and scenario mapping:**
1. `Offer Share action on eligible ready recipes in loaded detail`:
   - `Ready recipe with hero image displays Share control`: `RecipeDetailSheet.tsx:563–577`, `RecipeDetailSheet.test.tsx:101–114`, `recipe-share.spec.ts:79–83`.
   - `Not-ready recipe hides Share control`: `RecipeDetailSheet.tsx:565`, `RecipeDetailSheet.test.tsx:322–345`.
   - `Placeholder hero image hides Share control`: `RecipeDetailSheet.tsx:564`, `RecipeDetailSheet.test.tsx:347–370`, `recipe-share.spec.ts:96–115`.
   - `Detail sheet in editing mode hides Share control`: `RecipeDetailSheet.tsx:563`, `RecipeDetailSheet.test.tsx:372–421`.
2. `Generate privacy-scrubbed portable export bundle`:
   - `Scrub personal notes and rating`: `RecipeService.cs:260–261`, `RecipeShareIntegrationTests.cs:34–108`, `sharing-fidelity.spec.ts:135–182`, `specs/openapi.yaml:1911–1956`.
   - `Preserve structured instructions and original images up to five`: `RecipeService.cs:251, 271, 978–989`, `RecipeShareIntegrationTests.cs:34–108, 110–173`.
   - `Wrap flat instruction strings in a default section`: `RecipeService.cs:251`, `RecipeShareIntegrationTests.cs:175–216`.
   - `Reject export when recipe lacks hero image`: `RecipeController.cs:132–135`, `RecipeShareIntegrationTests.cs:218–250`, `specs/openapi.yaml:1946–1955`.
   - `Reject export when member context header is missing`: `RecipeController.cs:127–128`, `RecipeShareIntegrationTests.cs:75–77`.
   - `Reject export when recipe is not found`: `RecipeService.cs:240–241`, `RecipeController.cs:140–143`.
3. `Deliver export bundle via native sharing with download fallback`:
   - `Native share dispatch when supported`: `RecipeDetailSheet.tsx:471–485`, `recipes.ts:371–383`.
   - `Cancellation of native share suppresses error and file download`: `recipes.ts:384–386`, `RecipeDetailSheet.tsx:486–487`.
   - `Fallback to browser file download when native share is unavailable or fails`: `recipes.ts:387–399`, `sharing-fidelity.spec.ts:96–100`, `recipe-share.spec.ts:84–88`.
   - `Present inline error feedback when bundle request fails`: `RecipeDetailSheet.tsx:485–493`, `RecipeDetailSheet.test.tsx:423–441, 483–500`.
4. `Offer recipe bundle intake on capture entry`:
   - `Import recipe file action available on capture view`: `MinimalCapture.tsx:1140–1144`, `MinimalCapture.recipe-import.test.tsx:175–193`, `recipe-share.spec.ts:120–123`.
   - `File picker accepts text plain files`: `MinimalCapture.tsx:1146–1155`, `MinimalCapture.recipe-import.test.tsx:188–193`.
5. `Parse and validate imported bundle file payload`:
   - `Successfully parse valid bundle payload`: `recipes.ts:401–492`, `MinimalCapture.tsx:432–434`, `recipes.test.ts:243–287, 324–399`, `MinimalCapture.recipe-import.test.tsx:195–239`.
   - `Reject unreadable non-JSON file`: `recipes.ts:405–409`, `recipes.test.ts:289–294`, `MinimalCapture.tsx:470–473`, `MinimalCapture.recipe-import.test.tsx:282–293`.
   - `Reject bundle with malformed schema or invalid image payloads`: `recipes.ts:411–454`, `recipes.test.ts:296–322`, `MinimalCapture.tsx:470–473`.
6. `Present bundle review card and cancellation`:
   - `Present preview card with bundle metadata and structured content`: `MinimalCapture.tsx:827–963`, `MinimalCapture.recipe-import.test.tsx:228–239`, `sharing-fidelity.spec.ts:105–120`.
   - `Render restored notes and star rating when present in bundle`: `MinimalCapture.tsx:928–961`, `MinimalCapture.recipe-import.test.tsx:241–280`, `sharing-fidelity.spec.ts:121–126`.
   - `Cancel bundle preview and return to default capture view`: `MinimalCapture.tsx:551–557, 986–992`, `MinimalCapture.recipe-import.test.tsx:295–336`.
7. `Display advisory warning for existing library duplicates`:
   - `Display duplicate warning when recorded recipe ID matches existing recipe`: `MinimalCapture.tsx:442–451, 842–857`, `MinimalCapture.recipe-import.test.tsx:338–401`.
   - `Display duplicate warning when recipe name matches existing recipe`: `MinimalCapture.tsx:454–463, 842–857`.
   - `View existing recipe opens recipe detail overlay`: `MinimalCapture.tsx:850–855, 994–1003`, `MinimalCapture.recipe-import.test.tsx:389–401`.
   - `Duplicate warning permits import acceptance`: `MinimalCapture.tsx:842–857, 975–984`.
8. `Accept and persist imported recipe bundle into library`:
   - `Accept valid bundle and persist ready recipe with importing member attribution`: `MinimalCapture.tsx:573–592`, `recipes.ts:358–364`, `RecipeController.cs:279–302`, `RecipeService.cs:275–348`, `RecipeShareIntegrationTests.cs:298–376`.
   - `Reassign recipe identifier when bundle identifier collides with existing entity`: `RecipeService.cs:282–285`.
   - `Restore optional notes and rating into newly persisted entity`: `RecipeService.cs:307–308, 328–329`, `RecipeShareIntegrationTests.cs:377–421`.
   - `Reject bundle with unsupported version`: `RecipeService.cs:939–940`, `RecipeShareIntegrationTests.cs:253–283`.
   - `Reject bundle with malformed payload or invalid image base64`: `RecipeService.cs:945–976`, `RecipeShareIntegrationTests.cs:284–297`.
9. `Present import success screen and navigate home`:
   - `Present success screen upon import acceptance`: `MinimalCapture.tsx:649–675`, `MinimalCapture.recipe-import.test.tsx:519–526`, `sharing-fidelity.spec.ts:128–130`, `recipe-share.spec.ts:131–134`.
   - `Done action navigates to Home`: `MinimalCapture.tsx:666–673`, `sharing-fidelity.spec.ts:130–133`, `recipe-share.spec.ts:134–137`.
   - `Present inline error feedback upon import API failure`: `MinimalCapture.tsx:586–588, 965–972`.

**Additional inspected identities:** Prior 67 inputs unchanged; these five additions bring the reusable manifest to 72 unique inputs. Digests identify source evidence, not runtime qualification.

| Input | SHA-256 |
| --- | --- |
| `api/src/RecipeApi.Tests/Integration/RecipeShareIntegrationTests.cs` | `5d928618b1fd36945eec667356e23b8345106e71c8f1005825bceff645e47e2d` |
| `pwa/e2e/sharing-fidelity.spec.ts` | `60903905d1e318b47d9230c54029c18b4732eb87a45e8b53b027cab41ae49b8d` |
| `pwa/e2e/recipe-share.spec.ts` | `0b4db40ae6c558d34b3c7565298825eb48e6c35f367d64638a95b2d15cbc9078` |
| `pwa/src/components/capture/MinimalCapture.recipe-import.test.tsx` | `a34f4e0686200f03800c12b8c2433f770f2b3a041e9734cb55e170de45be0fb8` |
| `pwa/e2e/fixtures/shared-lasagna.recipe` | `2a7b896437b61cdcab538b476e5ffd5590c20213e66ac35301ae849bad9601e5` |

### BSL-recipe-sharing-004 — Recipe sharing main specification creation and promotion

**Authority:** A63 user instruction “promote”, 2026-10-15. Authorizes creating main specification `openspec/specs/recipe-sharing/spec.md` with verbatim Purpose and the 9 requirements / 27 scenarios from the reviewed delta `openspec/changes/baseline-recipe-sharing-bundle-export-import/specs/recipe-sharing/spec.md`, and updating plan and tasks. No archival, successor extraction, application changes, or runtime/database qualification authorized.

**Promotion details:**
- Destination: `openspec/specs/recipe-sharing/spec.md` created with Purpose and 9 requirements / 27 scenarios under single `## Requirements` section.
- Main specs inventory: `recipe-sharing` (9 requirements / 27 scenarios), `recipe-library` (55 requirements / 122 scenarios), `household-identity` (36 requirements / 92 scenarios).
- Delta preservation: Delta spec, proposal, design, and extraction tasks under `openspec/changes/baseline-recipe-sharing-bundle-export-import/` preserved intact.
- Active changes: All eleven changes remain active; none archived.
- Non-normative notes: Evidence/limits note and exact BSL-015 sentence/caveat remain preserved in change delta; U53–U57 limitations remain recorded.

**Validation:**
- `openspec validate --specs --strict --no-interactive`: passed (3/3 main specs valid).
- `openspec validate --all --strict --no-interactive`: passed (14/14 items valid: 11 active changes, 3 main specs).
- `task verify`: passed documentation and content integrity checks.



## Execution prompt

Paste this prompt and replace the session instruction with the desired bounded
scope. The default authorizes review only. Select the model in your host.

```text
Work on the recipe-sharing OpenSpec brownfield baseline in
/Users/alex/Code/whats-for-supper.
Session instruction: Review this capability's checkpoint and recommend the next
bounded slice. Do not generate specs or change application behavior.

Read AGENT.md and its active-host loading rules, then
 docs/openspec-baseline/workflow.md and
 docs/openspec-baseline/recipe-sharing.md.
Use these as the execution context; do not read the full history or other
capability plans unless an immediate dependency requires a specific section.
Resolve installed OpenSpec workflow/root before artifact writes. Preserve staged,
unstaged and untracked work. Recheck source identity and affected evidence.

Current user messages define scope. Reuse recorded decisions without asking for
approval again within already authorized work. Do not infer new drafting,
promotion, archive, implementation or runtime qualification authority from history.
Trace one selected observable journey through source, contracts and actual test
assertions/substitutions. Keep disputed claims non-normative. No application,
test, contract, client, SQL, configuration or dependency edits.

Update this capability plan's evidence/mappings, decisions, uncertainty, artifact
status, session log and next action. Update the small index only if its routing or
summary changes. Validate selected artifacts and run task verify with every changed
path. Distinguish passed, failed, blocked, not-run and not-applicable; source
support is not runtime verification. Stop at the authorized session boundary.
```

## Next-session record

Use this section for new capability sessions after the split. The earlier evidence
and lifecycle records above retain their original chronology.

```text
Session/date:
Branch, commit, relevant dirty inputs:
Current user authorization and selected capability/slice:
Completed discovery/evidence IDs:
Artifact paths and status (draft/validated/accepted/promoted separately):
Human decisions and unresolved questions:
Checks: passed / failed / blocked / not-run / not-applicable, with reasons:
Limitations and excluded assertions:
Exact next bounded action:
```


## 2026-10-16 generation completion reconciliation

The records in this section describe the generation checkpoint before RS-P01.
The promotion record below supersedes its pending-review/promotion labels, while
preserving the original evidence, counts, exclusions and discrepancies.

### Authorization and decisions

**RS-D01:** The current user authorizes discovery, reconciliation and generation of all
remaining ordinary-household recipe-sharing baseline artifacts, in bounded slices
without intermediate approval. Stop at validated drafts for human review. No
application implementation, contract repair, promotion, runtime qualification or
archival. This supersedes historical next-slice restrictions only for this selected
capability and lifecycle stage; A62/A63 records remain history.

**RS-D02:** Reuse the existing `recipe-sharing` capability. The original active change
`baseline-recipe-sharing-bundle-export-import` already mirrors all promoted behavior.
Leave it and main untouched, including staged evidence relocation. The installed
OpenSpec propose workflow scaffolds `baseline-recipe-sharing-pending-actions` for
only the two actual gaps. No duplicate main requirements are drafted, and no other
capability owner is edited. Scoped RS identifiers avoid collision with other work.

**RS-D03:** Keep disagreements non-normative under A12. “Accounted for” means covered,
drafted, explicitly excluded, or unresolved with evidence; it does not mean that
all promoted claims are proved. No consequential intent decision blocks the two
independent additions. Treatment of disputed existing wording remains a human-review
decision before further lifecycle action, rather than a silent correction here.

### BSL-recipe-sharing-005 — Checkpoint and coverage reconciliation

**Identity:** Branch `moving-to-openspec`, commit
`04a1c4570f9bbb01b47436790d4248635ac3179a`; OpenSpec 1.14.2. CLI
`list --json` and `context --json` resolve root to
`/Users/alex/Code/whats-for-supper` (nearest repository), with `spec-driven` schema.
No store, initialization or configuration change was needed.

**Dirty inputs and preservation:** Entry status contained extensive staged and
unstaged documentation/OpenSpec work, staged Taskfile/validation-workflow edits,
untracked cooking/grocery/member-preference/search/quality artifacts and an
untracked agent test. Relevant pre-existing sharing edits were staged in the old
change's `design.md` and delta: non-normative preamble relocation for CLI 1.14.2;
requirement/scenario blocks were unchanged. The routing index had both staged and
unstaged changes, including unrelated quality/cooking summaries. Neither the
capability plan nor main sharing spec had entry edits. `git diff --name-status
--diff-filter=D HEAD` reported no current tracked deletion; historic navigation
removal remains untouched. Entry status (including untracked files), full cached
diff and hashes of existing baseline/OpenSpec files were captured privately at
`/tmp/recipe-sharing-baseline-before.json`; this is a session snapshot, not a
portable artifact. Current source identities below supersede historical line/hash
references for this inspection, without asserting all earlier 72 inputs unchanged.

**Count reconciliation:** Both current files contain **9 requirements / 34
scenarios** and identical ordered requirement/scenario blocks. The 9/27 statements
in A62/A63 and BSL-003/004/tasks are retained historical records, not the current
inventory. Their printed requirement mapping already enumerates 34 scenarios.
The current artifacts therefore reconcile the checkpoint's 9/34 count; this session
does not infer an undocumented seven-scenario promotion or rewrite the old record.
The original active delta is not counted again as outstanding coverage. The new
additive delta has 2/3, giving a potential combined 11/37 after future review and
promotion, not a current accepted/promoted total.

**Capability discovery fields:** Recipe sharing exchanges portable recipes between
ordinary households. Existing capabilities/workflows are loaded-detail export and
capture-file review/acceptance; the important rules are eligibility, privacy,
format/validation, advisory matching and ready-entity creation. Source files and
actual assertion boundaries are mapped below and in BSL-006/007. Dependencies are
household access/member context, recipe-library persisted facts/list eligibility,
asset storage and browser file APIs. Uncertainties are U05/U53–U57 and RS-U01–09.
Confidence is high for aligned source and inspected assertions, medium for
unasserted controls, native devices, persistence effects and disputed seams; all
behavior evidence is implementation-supported, not runtime verified.

The labels R1–R9 below identify current main requirements **in file order**, not new
normative IDs. Scenario names in the detailed map are exact current headings.

| Inspection question | Classification and mapping | Current evidence / limitation |
| --- | --- | --- |
| Loaded-detail eligibility | Already covered R1, all 4 scenarios | Detail render condition; component assertions cover missing/non-ready/placeholder; edit/loading excluded by render condition; API eligibility differs |
| Preparation notice | Already covered R3 native dispatch and failure/cancel scenarios | Persistent toast in handler and slow-bundle test; no duplicate notice requirement added |
| Repeated Share activation / success release | Evidenced gap drafted in N1, 2 scenarios | BSL-006; disabled control and finally cleanup, not server idempotency |
| Privacy scrubbing | Already covered R2 scrub scenario; broad identifier/null claims unresolved | Server projection, DTO serialization, file serializer; RS-U01 |
| Bundle contents / structured and flat instructions / originals cap | Already covered R2 preservation and wrapping scenarios | Service mapping/image readers, API assertions; RS-U07 withholds universal round-trip fidelity |
| Export errors | Already covered R2 rejection scenarios and R3 inline error | Controller/service/handler; unconditional unknown-ID 404 disputed RS-U03 |
| Native sharing | Already covered R3 native dispatch | Capability checks and share call; U55/RS-U08, no device qualification |
| Native cancellation | Already covered R3 cancellation | AbortError handling; source-supported, direct native assertion absent in selected tests |
| Download fallback | Already covered R3 fallback | Anchor/object URL path and browser download assertions; probe exceptions excluded RS-U08 |
| File intake / picker cancellation | Already covered R4, 2 scenarios; no selected file returns without changing state | Capture file handler resets input; PDF branch belongs to recipe-capture, not a sharing gap |
| JSON reading and parsing | Already covered R5 valid/unreadable scenarios | Parser and component/unit assertions |
| Client/server validation boundary | Already covered R5/R8; stronger parity unresolved | Client shape validation vs server version/count/base64/content validation; U54/RS-U02 |
| Preview metadata, instructions, notes/rating | Already covered R6 first 2 scenarios | Conditional rendering for optional values; tests assert sections/notes; mocked browser round-trip assertions do not prove server backup mode |
| Duplicate advisory and view existing | Already covered R7, all 4 scenarios | ID then name query, first eligible match, detail overlay; U05/U56 and RS-U09; no universal prevention |
| Preview cancellation | Already covered R6 Cancel scenario when not submitted | Local discard with no POST; in-flight cancellation unresolved RS-U04 |
| Acceptance / pending action | Acceptance already covered R8; pending control gap drafted N2, 1 scenario | BSL-007; spinner/disabled action while review displayed |
| Persistence, collision and attribution | Already covered R8 first 3 scenarios; atomicity excluded | DB write then info/assets; membership assigned in source, limited assertions; RS-U05/06 |
| Success navigation | Already covered R9 success and Done scenarios | Capture success branch, ROUTES.HOME `/`, browser expects resulting `/home`; no additional navigation requirement |
| Import failure and retry | Already covered R9 failure scenario | Catch retains parsed bundle, finally releases submitting flag; retry can POST again, no safe/idempotent retry guarantee RS-U05 |
| Duplicate-lookup failure | Unresolved RS-U09 | Same parse/lookup try/catch clears review; not a new desired-behavior requirement |
| SSE synchronization / all-device delivery / atomic persistence | Excluded from normative additions | U57/U55/RS-U05; unsupported guarantees withheld |

### BSL-recipe-sharing-006 — Pending export slice (N1)

**Ordered executable trace and representations:**
`RecipeDetailSheet.handleShareRecipe` → `getRecipeShareBundle` → generated
`api/recipes/item/share/index.ts` GET → OpenAPI `/api/recipes/{id}/share` →
`RecipeController.Share` (member then hero check) →
`RecipeService.ExportRecipeShareBundle` → `RecipeDbContext.Recipes` and
`ImageService.GetHeroImage/GetImage` → recipe store reads → bundle DTO →
`createRecipeBundleFile` (JSON/plain-text File) → capability-checked native share
or anchor download. UI state wraps both request and delivery, with a persistent
toast and disabled Share control. `finally` releases state and notice. Privacy,
images and error behavior reuse R2/R3; N1 adds only pending suppression/release.

**Actual assertions/substitutions:** In `RecipeDetailSheet.test.tsx`, “keeps a
preparation toast visible through a slow share bundle and prevents duplicate
shares” uses a deferred mocked export, asserts persistent toast, disabled button,
one call after another click, no early toast removal, then mocked delivery and
toast removal after resolution. “removes the preparation toast before preserving
the existing share failure message” asserts removal plus visible inline error on
mocked rejection; it does not assert invocation order. Both transport functions and
toast store are mocked. Successful final button re-enabling and real native UI are
source-supported, not directly asserted by those tests. No live GET/device check
was run. Confidence: high for pending guard/assertions, medium for delivery release.

### BSL-recipe-sharing-007 — Pending acceptance slice (N2) and intake seam recheck

**Ordered executable trace and representations:**
`MinimalCapture.handleRecipeBundleFileChange` → `parseRecipeBundleFile` (read/JSON,
shape checks, normalized HowToSection/HowToStep objects and exported date) →
generated recipe list GET with ID then exact normalized-name filter → preview and
advisory → `handleAcceptBundle` → `importRecipeShareBundle` → generated
`api/recipes/importBundle/index.ts` POST and `data` deserialization → OpenAPI
`/api/recipes/import-bundle` → `RecipeController.ImportBundle` →
`RecipeService.ValidateBundle/ValidateImagePayload` → entity construction/new GUID
on collision → `db.SaveChangesAsync` → `ImageService.CreateRecipeInfo` /
`LocalRecipeStore.WriteInfoAsync` → optional hero and originals → DTO →
`SuccessWrappingFilter` data envelope → `mapToRecipe` → capture success and Done.
The guard is local `isBundleSubmitting`, also passed to Button `disabled` and
`isLoading`; `Button.tsx` renders a spinner. The API wrapper rejects missing
response data. Failure retains preview and releases the flag for retry. No
application or contract changes are needed for this documentation slice.

**Actual assertions/substitutions:**
- `MinimalCapture.recipe-import.test.tsx` checks intake order/accept attribute,
  structured preview/accept-cancel controls, optional notes, malformed JSON error,
  pre-submit Cancel returning to capture, and advisory/View existing overlay.
  The overlay, API client, family/store/hooks are substituted. Its photo-success
  duplicate/discard test is a different workflow, not evidence of bundle acceptance.
  No selected test directly asserts pending acceptance, import failure/retry,
  collision allocation, or cancel-aborts-request. N2 is source-supported with medium
  confidence, not test-verified.
- `recipes.test.ts` actually parses structured instructions (including a version 1.1
  input), rejects broken JSON and missing itemListElement, normalizes `@type`, and
  handles optional defaults. The “privacy scrubbing” describe block explicitly
  asserts supplied notes/rating are serialized, including a rating of 5 outside
  OpenAPI's 0–3 range. It does not prove client privacy enforcement or parity.
- `RecipeShareIntegrationTests.cs` asserts service export field projection,
  missing notes/rating/id/addedBy on recipe payload, original cap, structured/flat
  instructions, hero rejection, unsupported version and null-recipe rejection,
  successful ready/synthesized entity/selected DB fields, and restored DB
  notes/rating. It does not directly assert collision, persisted importing member,
  all saved assets or metadata, invalid base64/count rejection, missing-member
  rejection, native share, or failure rollback. Source supports the applicable
  branches independently. Factory defaults: EF in-memory DB, InMemoryRecipeStore,
  mocked orchestrator and no auth. These assertions are not PostgreSQL/disk/auth
  qualification.
- `recipe-share.spec.ts` checks visible Share/download filename and placeholder
  exclusion; its manual import asserts preview, success and navigation through
  substituted API routes. `sharing-fidelity.spec.ts` asserts structured preview,
  notes/rating and success from an explicitly mocked “backup” share response, plus
  null notes/rating from an explicitly scrubbed mock. There is no demonstrated
  server backup mode. `mock-api.ts` import handler returns 200, contract/controller
  specify 201, and it does not persist an imported entity. Browser fixtures/routes
  substitute APIs; Playwright blocks service workers. No actual browser/API tests
  ran during this extraction.

**Immediate shared-owner reuse:** Read household-identity requirements “Gate
protected page entry with household access”, “Apply member context after household
access”, “Authenticate protected API requests independently”; recipe-library
“Represent persisted recipe attribution and readiness” and “Exclude soft-deleted
recipes from standard library listings and search”. `GetRecipesList` additionally
filters stored readiness and uses exact case-normalized ID/name lookups. These
owners do not promise API/UI share-eligibility equivalence or global deduplication.

### Current discrepancy register (non-normative additions)

U05 and U53–U57 remain unchanged above and continue to apply. These new findings
qualify current evidence, without amending promoted text or approving defects.

| ID | Evidence / disagreement | Withheld claim and disposition |
| --- | --- | --- |
| RS-U01 | Export service includes `info.recipeId`; DTO omits null notes/rating via JsonIgnore, while file serializer drops recipeId and fills absent notes/rating with null. File serializer preserves supplied private notes/rating. | Main R2 wording about API omission of internal identifiers and explicit nulls is broader than source. Privacy scrubbing is server projection; JSON file and HTTP payload are distinct. Human review required; no normative correction drafted. |
| RS-U02 | Parser checks image mimeType/base64 string shape without decoding, accepts any version string, empty arrays/name strings and no originals-count cap; server enforces version 1.0, nonblank name, nonempty arrays, max five originals and decodable base64. Contract requires isSynthesized/originals, while server DTO defaults differ. | No client/server version/schema parity, complete client content/image validation, or arbitrary malformed-input rejection guarantee. R5/R8 broad claims need qualified review; U54 retained. |
| RS-U03 | Controller tests `HasHeroImage` before looking up the recipe. Unknown ID without hero returns 400; service missing ID throws and controller can return 404 only after passing hero check. OpenAPI share responses list 200/400, not 404/500. | Main R2 unconditional missing-ID 404 scenario is disputed; do not extend or repair contract/source/spec here. |
| RS-U04 | Cancel remains enabled during acceptance, clears local state and has no AbortController/request cancellation. Pending callback can still complete with success. | Main R6 no-persistence cancellation only supported before submission. No in-flight abort/rollback assertion; new N2 explicitly bounded to displayed pending review. |
| RS-U05 | Service commits DB before info/hero/original writes, with no transaction/compensation across these effects. A retry or lost response may allocate another ID. | Atomic persistence, rollback and safe/idempotent retry are unestablished. Successful path is R8; failure UI in R9 does not guarantee no prior writes. |
| RS-U06 | Browser mock import uses 200 vs contract 201 and no persistence; API factory substitutes DB/store/auth and inspected assertions do not check all assets/member effects. Historical names and line references included unrelated photo success coverage. | Preserve U10/A34 limits. No live end-to-end, auth, PostgreSQL, real filesystem or native-device verification from existing mocked assertions. |
| RS-U07 | Server export/import DTOs carry cuisineType/mealTypes, but file serializer/parser omit them; exported servings is null. | No lossless universal DTO/metadata round-trip. Supported core fields/sections remain R2/R6/R8; no invented preservation requirement. |
| RS-U08 | `navigator.canShare` runs outside try/catch for `navigator.share`; only non-abort share-call failures reach anchor fallback. | R3 broad failure wording is not a universal capability-probe/download-failure fallback guarantee. Keep native device support unqualified under U55. |
| RS-U09 | Duplicate lookup uses list-eligible ready/nondeleted records; lookup rejection shares intake catch, clears parsed bundle and displays import error. | Main R7 nondeleted match wording omits readiness and preview can appear before lookup settles. No universal duplicate discovery or guaranteed preview retention after lookup failure. Human review; no new desired-behavior spec. |

### Detailed current requirement/scenario mapping

Every existing scenario is mapped below; descriptions are evidence references, not
new claims of acceptance. N1/N2 are the only unpromoted additions. Existing BSL-001/002
remain historical trace entries; BSL-005–007 recheck their identities and limits.

**R1: Offer Share action on eligible ready recipes in loaded detail** — BSL-005/006; detail render + component eligibility assertions.

- `Ready recipe with hero image displays Share control`
- `Not-ready recipe hides Share control`
- `Placeholder hero image hides Share control`
- `Detail sheet in editing mode hides Share control`

**R2: Generate privacy-scrubbed portable export bundle** — BSL-005/006/007; service projection, controller and API assertions; RS-U01/03/07.

- `Scrub personal notes and rating`
- `Preserve structured instructions and original images up to five`
- `Wrap flat instruction strings in a default section`
- `Reject export when recipe lacks hero image`
- `Reject export when member context header is missing`
- `Reject export when recipe is not found`

**R3: Deliver export bundle via native sharing with download fallback** — BSL-006; handler/delivery and mocked component/download assertions; RS-U08.

- `Native share dispatch when supported`
- `Cancellation of native share suppresses error and file download`
- `Fallback to browser file download when native share is unavailable or fails`
- `Present inline error feedback when bundle request fails`

**R4: Offer recipe bundle intake on capture entry** — BSL-007; intake control/component accept-attribute assertions.

- `Import recipe file action available on capture view`
- `File picker accepts text plain files`

**R5: Parse and validate imported bundle file payload** — BSL-007; parser/unit/component assertions; RS-U02.

- `Successfully parse valid bundle payload`
- `Reject unreadable non-JSON file`
- `Reject bundle with malformed schema or invalid image payloads`

**R6: Present bundle review card and cancellation** — BSL-007; preview rendering/component and substituted browser assertions; RS-U04.

- `Present preview card with bundle metadata and structured content`
- `Render restored notes and star rating when present in bundle`
- `Cancel bundle preview and return to default capture view`

**R7: Display advisory warning for existing library duplicates** — BSL-007; list lookup/advisory source + overlay component assertion; RS-U09.

- `Display duplicate warning when recorded recipe ID matches existing recipe`
- `Display duplicate warning when recipe name matches existing recipe`
- `View existing recipe opens recipe detail overlay`
- `Duplicate warning permits import acceptance`

**R8: Accept and persist imported recipe bundle into library** — BSL-007; service/controller/store + selected DB assertions; RS-U05/06.

- `Accept valid bundle and persist ready recipe with importing member attribution`
- `Reassign recipe identifier when bundle identifier collides with existing entity`
- `Restore optional notes and rating into newly persisted entity`
- `Reject bundle with unsupported version`
- `Reject bundle with malformed payload or invalid image base64`

**R9: Present import success screen and navigate home** — BSL-007; success/failure handler and mocked browser navigation; retry source-only.

- `Present success screen upon import acceptance`
- `Done action navigates to Home`
- `Present inline error feedback upon import API failure`

**N1: Disable Share while a share operation is pending** — BSL-006.

- `Repeat activation during bundle preparation` — deferred component assertion and guard/disabled source.
- `Delivery completion releases the Share control` — handler finally cleanup; component asserts toast cleanup, enabled-after-success follows source.

**N2: Show pending import acceptance on the review action** — BSL-007.

- `Import acceptance is pending in review` — capture guard/props plus Button spinner/disabled rendering; no direct pending-import assertion found.

### Current source identity manifest

SHA-256 values were computed from current files for this session. All listed source
and test inputs were clean against HEAD at capture; relevant staged artifacts were
inspected separately as noted above. This manifest replaces reliance on old line
numbers/test names for this session only; hashes do not establish runtime behavior.

| Input | SHA-256 |
| --- | --- |
| `pwa/src/components/recipes/RecipeDetailSheet.tsx` | `bbc1bba8f16f3fa305775d072cb1c3850af34a24bd3979e2228b63984ca1a19c` |
| `pwa/src/components/recipes/RecipeDetailSheet.test.tsx` | `21727367dee891c473635cc2eafde324b0f6863e0dd4db1a7e82203d5e650da0` |
| `pwa/src/components/capture/MinimalCapture.tsx` | `aadbb37ec2fe548af6e41c5460ea3339377fb215f66f19eac054666416742af5` |
| `pwa/src/components/capture/MinimalCapture.recipe-import.test.tsx` | `a34f4e0686200f03800c12b8c2433f770f2b3a041e9734cb55e170de45be0fb8` |
| `pwa/src/components/ui/Button.tsx` | `5eca8f82862fb1e6a07d118fa1214c7df8e12ae3f1c3f0494fcd464a9dd76c0e` |
| `pwa/src/lib/api/recipes.ts` | `f4e70b39a2060bfc5b25010914f78e288321517db5c52c543d103502718dce7a` |
| `pwa/src/lib/api/recipes.test.ts` | `02b75d719bddca5b88e9cc9760d183fd8e8defd316b0d04cdabf1006bf45ebe4` |
| `pwa/src/lib/api/generated/api/recipes/item/share/index.ts` | `8dc256142d733fa75efac4ea49a5455768237b49d0d6ccd527f3b4662ae969b6` |
| `pwa/src/lib/api/generated/api/recipes/importBundle/index.ts` | `c3c8ca350575f400bd451fbc39e9848e648bcd24b2004eb4d3aff96a6e53682e` |
| `pwa/src/lib/constants/routes.ts` | `790d2da3e039578fd7d291dead52213bfd2282b17517f973029bafac37f34d70` |
| `api/src/RecipeApi/Controllers/RecipeController.cs` | `d1699c2de6f6cca9d879e67c0c7b9c7f0af4b2c4e104bc9ff04634b266eb5a70` |
| `api/src/RecipeApi/Services/RecipeService.cs` | `9eec9ab5cd7102081b3765b08a41b8de4d45325858d18ab4573a326afa256b74` |
| `api/src/RecipeApi/Services/ImageService.cs` | `c73bb4f976bd6355ec9aa6c18937bed12d4dc14ff7efe718a84351cb4f1abc2d` |
| `api/src/RecipeApi/Infrastructure/LocalRecipeStore.cs` | `6f3f2893b4ae03ef3328efad306de1e8fc33ab470c4c430bfbe5d3ed1ae17efc` |
| `api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs` | `6fa3cd08587220fc4e18803f6ba020e494b81211cf99c53ec10de23ddd46f11d` |
| `api/src/RecipeApi/Data/RecipeDbContext.cs` | `92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447` |
| `api/src/RecipeApi/Dto/RecipeShareBundleDto.cs` | `41c553536083ecda2d211653195187384bf3aba1e3b92c6d277da79449b00ff8` |
| `api/src/RecipeApi/Dto/ImportedRecipeDto.cs` | `59e81349a4271db9d9705ca636135c671b6eda45708331a8f3df010f3f24435b` |
| `api/src/RecipeApi/Dto/SharedImageDto.cs` | `e44ace44344fd935f2f08c498dd8aeded8629131fdeecc70418b4d36ef36b933` |
| `api/src/RecipeApi/Dto/RecipeShareInfoDto.cs` | `11162ce853f9f71a4de6b75a2072a1e750a30ecf8c4556503ef9e6a59bfd1289` |
| `api/src/RecipeApi.Tests/Integration/RecipeShareIntegrationTests.cs` | `5d928618b1fd36945eec667356e23b8345106e71c8f1005825bceff645e47e2d` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `pwa/e2e/recipe-share.spec.ts` | `0b4db40ae6c558d34b3c7565298825eb48e6c35f367d64638a95b2d15cbc9078` |
| `pwa/e2e/sharing-fidelity.spec.ts` | `60903905d1e318b47d9230c54029c18b4732eb87a45e8b53b027cab41ae49b8d` |
| `pwa/e2e/mock-api.ts` | `063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07` |
| `pwa/e2e/fixtures.ts` | `402b5a1b872f625dc1425f46afdede2c9378dcc473088159774a8455b5d188e2` |
| `pwa/e2e/fixtures/shared-lasagna.recipe` | `2a7b896437b61cdcab538b476e5ffd5590c20213e66ac35301ae849bad9601e5` |
| `pwa/playwright.config.ts` | `6e15ab7bb105dea06751d9e8dc5d3e4d280f0eb2d465553fbea5e2da65e91532` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |

### BSL-recipe-sharing-008 — Artifact and lifecycle status / session record

Session/date: 2026-10-16, generation under RS-D01; source identity and dirty inputs
are recorded in BSL-005 and the manifest. Discovery reconciled all requested
ordinary-household questions. No further independent evidence-backed missing
requirements remain after N1/N2; RS-U01–09 are unresolved/excluded claims, not
application tasks or hidden gaps declared implemented.

| Dimension | Current status |
| --- | --- |
| Discovery | Complete/reconciled with U05/U53–U57 and RS-U01–09 retained |
| Artifacts | Validated-draft proposal, delta, design and documentation-extraction tasks in `openspec/changes/baseline-recipe-sharing-pending-actions/`; 2 requirements / 3 scenarios; validation outcomes below |
| Human review | Pending for additions and reconciliation; no acceptance inferred from checked extraction tasks |
| Promotion | Existing 9/34 retained byte-for-byte; additions unpromoted; no sync or archive |
| Runtime | Not-run/deferred A34; implementation-supported evidence only |

Exclusions: demo/preview/deployment variants, PDF acquisition (recipe-capture
owner), unrelated photo/URL duplicate workflows, broad backup mode, universal
native-device support, universal duplicate prevention, SSE synchronization,
client/server validation parity, atomic persistence and idempotent retries.
Application/TDD/generated-client/live-service checks are not-applicable to these
documentation edits; runtime behavior checks are not-run, not passed.

Artifact paths: `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, and
`specs/recipe-sharing/spec.md` under the new change; capability plan and sharing row
in `docs/openspec-baseline-plan.md`. The old change and main sharing spec remain
unchanged, preserving history and promoted requirements.

Exact next action: human reviewer reads the new delta (N1/N2, all 3 scenarios),
its design/evidence map, and RS-U01–09; confirms scoped current-behavior wording
and decides how to treat disputed promoted claims. Record acceptance explicitly
and separately authorize promotion of only the reviewed additions (or request
bounded planning revisions). Do not apply application tasks, sync, promote,
archive or claim runtime qualification from generation completion.

Validation evidence (2026-10-16):

- **Passed:** `openspec validate baseline-recipe-sharing-pending-actions --strict --no-interactive`.
- **Passed:** `openspec validate --all --strict --no-interactive`, **89 passed / 0 failed** at final reconciliation. Informational archive-collision notices concern already-promoted deltas in other capabilities; no archive was attempted or authorized.
- **Passed:** `task verify` with all seven task-owned paths (plan, index row and five new change files), documentation + selected `spec:check` + selected-documentation content integrity; immutable run `23270eb60de844ddb397038c67a960e5`. The record reports task acceptance not evaluated. This evidence predates this result-note edit; final content is reverified after recording it, with its new result reported in the session response.
- **Passed:** current main and old sharing delta retain identical ordered 9/34 blocks; original sharing files match entry hashes; all 34 existing plus 3 new scenario headings are mapped; current source input hashes are recorded. The full staged index matches its entry snapshot.
- **Failed (superseded scope assumption):** an initial assertion that every unrelated baseline file stayed byte-identical failed on member-preference tasks changed by another actor. Subsequent enumeration found concurrent grocery, member-preference, search and shared-guidance edits. The corrected task-owned preservation check passed; unrelated changes were left untouched. No all-workspace preservation claim is made.
- **Not-run:** API/browser/native-device/PostgreSQL/filesystem behavior qualification; no runtime result follows from source or static validation.
- **Not-applicable:** application TDD, lint/type/unit/API/E2E execution, client generation, contract/database changes, implementation, promotion and archival for this documentation-only task.
- **Blocked:** none for generation. Human review/acceptance remains pending; disputed broader promoted claims remain listed, not resolved by a passing validator.

Final scope review: the sole existing-file edits owned by this session are this
capability plan and the recipe-sharing routing row; new files are confined to
`baseline-recipe-sharing-pending-actions`. No application files, other capability
specs, old sharing artifacts or index staging were modified by this session.
The index's pre-existing quality/cooking and other concurrent row edits are
preserved; explicit-path verification does not establish ownership of those rows.


## RS-P01 / BSL-recipe-sharing-009 — Accepted additive promotion

**Session/date and authority:** 2026-10-16. The user explicitly accepted the two
requirements and three scenarios in `baseline-recipe-sharing-pending-actions`
and authorized promotion into main, preservation of existing requirements and
all discrepancy records, capability-plan/routing/lifecycle updates and validation.
Application changes and archival remain prohibited. This supersedes generation-time
pending-review/promotion statements only for the selected additions. It does not
resolve disputed existing wording or establish runtime qualification.

**Entry identity and dirty evidence:** Branch `moving-to-openspec`, commit
`04a1c4570f9bbb01b47436790d4248635ac3179a`. Entry had the earlier unstaged sharing
plan, untracked pending-actions change and staged evidence relocation in the old
sharing change, plus extensive unrelated staged/unstaged/untracked work. The routing
index had both staged and unstaged edits in other capability rows. Main sharing had
no entry changes. No tracked deletion was adopted. Entry status, full index diff,
selected before-images and sharing artifact hashes were captured privately in
`/tmp/rs-promotion-before.json`. OpenSpec list/status resolve the nearest repository
root and status supplies the single selected recipe-sharing delta. Current specs
rules were obtained before the main-spec write.

**Promotion mapping:**

| Main addition | Exact accepted scenarios | Evidence |
| --- | --- | --- |
| R10 / N1: Disable Share while a share operation is pending | Repeat activation during bundle preparation; Delivery completion releases the Share control | BSL-recipe-sharing-006; original source/test limitations retained |
| R11 / N2: Show pending import acceptance on the review action | Import acceptance is pending in review | BSL-recipe-sharing-007; source-supported, no direct pending-import assertion claimed |

The main Purpose and original 9 requirements / 34 scenarios are preserved
byte-for-byte as its prefix. The accepted delta's requirement/scenario blocks are
appended verbatim under the existing single Requirements section, without a delta
operation header. Main is **11/37**. Both change deltas, proposals, designs and
metadata remain intact; only pending-actions tasks receive a lifecycle follow-up.
All U05/U53–U57 and RS-U01–09 rows and their treatment remain unchanged. Neither
this acceptance nor validation silently repairs the known discrepancies.

| Dimension | Current status |
| --- | --- |
| Discovery | Complete/reconciled for selected ordinary-household scope with listed exclusions/discrepancies |
| Artifacts | Generated, accepted and synced; main 11 requirements / 37 scenarios; original delta 9/34 and additive delta 2/3 preserved |
| Human review | Accepted explicitly by the user on 2026-10-16 for the two requirements / three scenarios |
| Promotion | Complete for all selected additions; both changes remain active; no archival |
| Runtime | Not-run/deferred under A34; source support and static validation only |

**Checks and scope:** Exact append/count/uniqueness/discrepancy preservation and
staged-index checks apply to this promotion. Run main-spec validation, selected
change validation, final all-item strict validation, and bounded `task verify`
with all four promotion-owned paths: main sharing spec, this capability plan,
routing index and pending-actions tasks. Existing generation-owned proposal,
design, delta and metadata remain unmodified inputs. Validation outcomes are
recorded after execution; the final verification run identifies final document
content separately. Application TDD/tests/client generation/contract changes are
not-applicable; runtime/API/browser/device/database qualification is not-run.

**Exact next action:** None within the authorized promotion. Keep the active
changes and all discrepancy records. Any discrepancy repair, runtime qualification,
application implementation or archival requires a separately selected scope.


**RS-P01 validation results (2026-10-16):**

- **Passed:** main-spec strict validation, 12/12 main specs.
- **Passed:** selected `baseline-recipe-sharing-pending-actions` strict validation.
- **Passed:** final all-item strict validation, 90/90 artifacts. Informational archive notices for already-promoted active deltas do not constitute archival or an unresolved validation failure.
- **Passed:** exact append (all previous main bytes preserved), count 11/37, requirement uniqueness, one Requirements section, unchanged sharing delta/proposal/design/metadata, all discrepancy rows unchanged, unchanged staged index, and only the sharing routing row changed relative to this session's entry snapshot.
- **Passed:** bounded `task verify` on all four promotion-owned paths, documentation, selected `spec:check` and selected-documentation content integrity; run `ec960681bbd2498995b6bdc830b753b1`. This run predates this result-note append; final document identity is reverified afterward and its immutable run is reported in the session response.
- **Failed/blocked:** none for this promotion.
- **Not-run:** runtime, API/browser/native-device and database qualification; A34 remains deferred.
- **Not-applicable:** application TDD/tests, generated-client work, contract/SQL changes and archival.

Scope review confirmed only main sharing, this plan, the sharing routing row and
the pending-actions lifecycle task record were edited for RS-P01. All earlier
generation records remain historical, and no unrelated dirty work was reverted.
