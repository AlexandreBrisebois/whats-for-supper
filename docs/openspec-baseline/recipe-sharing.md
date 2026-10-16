# Recipe sharing baseline plan

## Current checkpoint and scope

Promoted baseline: **9/34 requirements/scenarios** at A84 (2026-10-16).
This covers recorded slices, not the entire capability.
Runtime qualification remains not-run/deferred under A34. Next action: await a
separately selected bounded slice or lifecycle action; no successor is authorized
by this reorganization. Slice headings and next-step recommendations retained
below are historical; later promotion records supersede earlier draft labels.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md), then this file.
No other capability plan or full project history is required up front. Follow only
immediate owner/spec dependencies needed for the selected work.

Accepted baseline: [main recipe-sharing specification](../../openspec/specs/recipe-sharing/spec.md).

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
| [Proposal](../../openspec/changes/baseline-recipe-sharing-bundle-export-import/proposal.md) | Draft; documentation only |
| [Delta](../../openspec/changes/baseline-recipe-sharing-bundle-export-import/specs/recipe-sharing/spec.md) | 9 ADDED requirements/27 scenarios; no MODIFIED/REMOVED/RENAMED operations |
| [Design](../../openspec/changes/baseline-recipe-sharing-bundle-export-import/design.md) | Technical extraction approach, representations, and risks; no application design change |
| [Tasks](../../openspec/changes/baseline-recipe-sharing-bundle-export-import/tasks.md) | Documentation extraction/validation checklist only; checkbox completion does not establish acceptance |
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
