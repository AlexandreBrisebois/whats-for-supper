# Recipe capture baseline plan

## Current lifecycle checkpoint — consolidated, 2026-10-16

This capability's main spec now contains **41 requirements / 110 scenarios**.
All baseline source changes were archived after the user's explicit approval;
there is no active baseline extraction/promotion queue. Historical checkpoint,
next-session and "changes active" text below records earlier sessions only.
Evidence limitations and unresolved findings remain in the [live backlog](backlog/README.md).
See [consolidation completion](backlog/consolidation-completion.md) for accepted
scope, preserved corrections, archive warnings and verification. Archival does not
establish application correctness, runtime qualification or resolution of defects.

## Current checkpoint and scope

Promoted main is now **41 requirements / 110 scenarios** under RC-P1 (2026-10-16).
The user accepted promotion of all three RC-G1 review drafts: **4 added
requirements and 10 full modifications**, covering intake boundaries, completion
advice and configured processing-language requests. All approved areas are
accounted for with recorded exclusions and uncertainties. Source-supported
baseline extraction is accepted/promoted; runtime qualification remains not-run
under A34. All changes remain active; no archival or application work occurred.
Next lifecycle action: separately select any runtime qualification or archival;
no further work is authorized by this promotion. See the
[promotion record](#bsl-recipe-capture-025--remaining-scope-promotion).

**Phase-12 reconciliation R12 (2026-10-16):** Recorded promoted documentation remains 41 requirements / 110 scenarios; no additional supported extraction gap was found within this plan's explicit boundary.
[Cross-capability review](reconciliation.md) records current inventory, shared-owner
reconciliation, evidence drift and exclusions. Current main SHA-256: `b7d563542abc9cbdbe1e470cbdc9fa44ddd4dee54f806ef7ecfc914dfebd456c`.
This session grants no new acceptance or promotion. Earlier session-specific
“current user” and next-action statements retain their historical scope. A34 and
all local unresolved/excluded behavior remain in force; runtime checks are not-run.


## Historical checkpoint before RC-G1

Promoted baseline: **37/92 requirements/scenarios** at A84 (2026-10-16).
This covers recorded slices, not the entire capability.
Runtime qualification remains not-run/deferred under A34. Next action: await a
separately selected bounded slice or lifecycle action; no successor is authorized
by this reorganization. Slice headings and next-step recommendations retained
below are historical; later promotion records supersede earlier draft labels.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md), then this file.
No other capability plan or full project history is required up front. Follow only
immediate owner/spec dependencies needed for the selected work.

Accepted baseline: [main recipe-capture specification](../../openspec/specs/recipe-capture/spec.md).

## Capability map and starting points

| Capability / purpose | Candidate scope and rules to recheck | Source starting point | Existing test starting point | Dependencies / initial confidence |
| --- | --- | --- | --- | --- |
| Recipe capture: acquire a recipe | Photo, URL, description, link share target, enabled PDF; validation, metadata, acceptance vs delivery, readiness, duplicate checks, configured processing language | [RecipeService](../../api/src/RecipeApi/Services/RecipeService.cs), [capture UI](../../pwa/src/components/capture/MinimalCapture.tsx), [PDF controller](../../api/src/RecipeApi/Controllers/PdfCaptureController.cs), [recipe-import YAML](../../api/src/RecipeApi/Workflows/recipe-import.yaml) | [import lifecycle](../../api/src/RecipeApi.Tests/Services/RecipeImportLifecycleTests.cs), [PDF API tests](../../api/src/RecipeApi.Tests/Integration/PdfCaptureIntegrationTests.cs), [capture browser tests](../../pwa/e2e/capture-flow.spec.ts) | Identity, library, workflows, external source/AI, flags / high at acceptance; medium end to end |

Shared owners and evidence policy live in [workflow.md](workflow.md). Recheck
these source/test starting points before using them as current evidence.

## Recorded decisions for this capability

Shared A01–A05/A07/A09–A12/A34 decisions are in workflow.md. The records below
retain their original scope; completed stages do not authorize successors.

| ID | Decision | State / authority |
| --- | --- | --- |
| A64 | Discover and CLI-draft only ordinary-household recipe capture: URL web acquisition entry, validation, workflow dispatch, background progress tracking, error feedback, and initial recipe creation | Authorized 2026-10-15 by user session instruction. CLI-scaffolded proposal, 9 ADDED requirements/20 scenarios in recipe-capture, extraction design/tasks and BSL-recipe-capture-001–003 mapping; U58–U61 retain advisory duplicate limits, external scraping fallback, local queued timer, and DB persistence before trigger. Stop at validated draft for human review; no application/test/contract/client/SQL edits, runtime/database qualification, promotion or archival. |
| A65 | Promote only the reviewed recipe-capture delta into a new main specification | User “promote”, 2026-10-15, immediately following the validated A64 draft. Authorizes creating main specification `openspec/specs/recipe-capture/spec.md` with exact Purpose and 9 requirements/20 scenarios, and plan/task follow-up. Preserve original Purpose and all prior bytes in existing main specs (`household-identity` 36/92, `recipe-library` 55/122, `recipe-sharing` 9/27), full delta/evidence/history and all twelve active changes. No separate acceptance statement, archival, successor extraction, application changes or runtime/database qualification inferred. |
| A67 | Promote only baseline-recipe-capture-photo-entry into main recipe-capture | User “promote baseline-recipe-capture-photo-entry”, 2026-10-15. Exact 10 requirements/24 actual scenarios appended; main now 19/44. Original Purpose/prior content and full delta preserved; plan/tasks updated. All thirteen changes active. No separate acceptance statement, archival, successor extraction, application changes or runtime/database qualification inferred. |
| A68 | Discover and draft only description-entry baseline using installed openspec-propose | Current user instruction 2026-10-15; documentation-only proposal/design/recipe-capture delta/extraction tasks and durable plan. Stop at validated draft; preserve promoted URL/photo main, A34, all work. No services, qualification, implementation, promotion, archival or successor slice. |
| A69 | Record 200/202 mismatch and withhold exact description success status | User selected “Yes—record the mismatch and withhold an exact status requirement” in this session. No contract/application change or resolution of other discrepancies inferred. |
| A70 | Promote only reviewed description-entry delta into main recipe-capture | User “promote”, 2026-10-15, following validated A68/A69 draft. Seven additions/18 scenarios verbatim; preserve prior 19/44, full delta/source identities/uncertainties and all fourteen active changes. Plan/task follow-up authorized; no archival, implementation, runtime qualification or successor work. |
| A71 | Discover and draft only feature-enabled PDF recipe capture as a separate A09 slice | User 2026-10-15 explicitly selected `baseline-recipe-capture-pdf-entry` / `recipe-capture`, installed propose workflow, documentation-only evidence and extraction artifacts; stop at validated human-review draft. Preserve promoted URL/photo/description and prior artifacts; A34 qualification deferred. No application/runtime/DB/model work, promotion, archive or next slice. |
| A72 | Promote reviewed feature-enabled PDF delta into main recipe-capture | User “promote”, 2026-10-15, following validated A71 draft. Exact 11 additions/30 scenarios; preserve original Purpose/prior 26/62 bytes, all source identities, artifacts and uncertainties. Plan/task follow-up only; no archival, application/runtime qualification or next slice. |

## Discrepancies and qualifications

These are implementation-supported/static findings, not runtime guarantees.
Cross-capability entries are included where the selected evidence depends on them.

| ID | Finding / risk | Evidence and required extraction treatment | Status / withheld claim |
| --- | --- | --- | --- |
| U01 | Contextual URL repair omits a required workflow parameter | Compare `WorkflowParameters` in [report service](../../api/src/RecipeApi/Services/RecipeImportReportService.cs), required `url` in [URL workflow](../../api/src/RecipeApi/Workflows/url-import.yaml), and [orchestrator validation](../../api/src/RecipeApi/Services/WorkflowOrchestrator.cs). Mocked workflow launch is not real launch evidence. Do not claim successful URL correction. | Open |
| U02 | Navigation doctrine was removed; capture includes a queued screen/timer | [MinimalCapture](../../pwa/src/components/capture/MinimalCapture.tsx) and [its tests](../../pwa/src/components/capture/MinimalCapture.test.tsx). Re-extract each source/GOTO/PDF path; do not assume immediate navigation or restore old doctrine. | Open |
| U05 | Duplicate prevention is not a universal server guarantee | [MinimalCapture](../../pwa/src/components/capture/MinimalCapture.tsx), [recipe list filtering and bundle import](../../api/src/RecipeApi/Services/RecipeService.cs). Source-dependent checks, post-creation photo detection and possible repeated uncertain uploads need separate scenarios. | Open |
| U09 | Placeholder paths can look like capabilities | Fixed [recommendations endpoint](../../api/src/RecipeApi/Controllers/RecipeController.cs), placeholder [SettingsService synthesis](../../api/src/RecipeApi/Services/SettingsService.cs), real description path in [RecipeService](../../api/src/RecipeApi/Services/RecipeService.cs). Exclude placeholders from positive functional claims; do not mistake them for the actual description workflow. | Open |
| U11 | Runtime/device/deployment qualification is incomplete | [PostgreSQL PDF tests](../../api/src/RecipeApi.Tests/Integration/PdfCapturePostgresTests.cs) require explicit configuration; [PDF flow](../flows/user-flows/pdf-recipe-import.md), [release status](../../README.md), [template](../../release-template/synology/compose.yaml). Device sharing, offline use, NAS rendering/recovery and deployment flag propagation require separate evidence. | Open |
| U58 | Client-side duplicate check by URL is advisory only; API permits duplicate URL imports without collision rejection | BSL-recipe-capture-001/002: MinimalCapture debounces URL queries against GET `/api/recipes?url={trimmed}` and renders an advisory warning banner with a link to view the existing recipe without blocking submission. The API's `CaptureUrl` creates a new UUID entity and triggers `url-import` workflow regardless of whether the URL already exists in the library. | Non-normative limitation; client advisory warning and server intake drafted, server duplicate rejection guarantees withheld |
| U59 | External scraping failure fallback continues with partial metadata | BSL-recipe-capture-002: WebAcquisitionAgent catches HTTP 403 Forbidden, logs a warning, and continues with limited metadata, falling back to "Recipe from " + Uri.Host if no recipe name was extracted. Other HTTP exceptions or unparseable JSON from LLM fail the background task without surfacing fine-grained error reasons to the client. | Non-normative limitation; supported fallback drafted, external site accessibility guarantees withheld |
| U60 | Queued timer auto-navigation is local to the active browser tab | BSL-recipe-capture-001: MinimalCapture initiates a 10-second countdown to navigate to `/home`. If the user navigates away early or closes the tab, background processing continues asynchronously on the server, but client-side timer completion and inline transition to ready status are lost for that tab session. | Non-normative limitation; supported local timer and inline transition drafted, cross-device/tab synchronization guarantees withheld |
| U61 | Initial recipe persistence commits before workflow triggering | BSL-recipe-capture-002: RecipeService saves initial Recipe record with `IsReady = false` to DB and disk before awaiting `orchestrator.TriggerAsync("url-import", ...)`. If workflow triggering throws, the exception is caught and logged, leaving a pending non-ready recipe in the library without active workflow execution. | Non-normative discrepancy; supported pending creation and trigger drafted, transactional rollback guarantees withheld |
| U62 | Multipart upload failure leaves orphaned images on disk | BSL-recipe-capture-006: In RecipeService.CreateRecipe, images are saved to disk before committing to PostgreSQL. If the DB save fails, orphaned image files remain on disk, relying on DisasterRecovery for eventual cleanup. | Non-normative limitation; supported disk staging and error handling drafted, transactional multi-store rollback guarantees withheld |
| U63 | Post-creation duplicate detection for photo capture relies on asynchronous SSE readiness | BSL-recipe-capture-005/007: Unlike URL capture which performs pre-submission duplicate URL checking, photo recipes have no pre-upload name or URL. Duplicate detection for photos only occurs after vision extraction completes and SSE recipe_ready arrives with the extracted recipe name, offering an optional Discard duplicate button. | Non-normative limitation; supported post-readiness duplicate check drafted, pre-upload duplicate prevention guarantees withheld |
| U64 | Terminal failure notification scope is restricted to active browser session | BSL-recipe-capture-008: useScheduleStream only pushes a failed notification to libraryStore (and renders RecipeFailureBanner) if the recipeId is present in captureStore.pendingRecipes for that client tab. If a user closes the tab or switches devices during processing, the failure event is not surfaced in the UI upon return. | Non-normative limitation; supported session-bound failure notification drafted, persistent cross-device failure synchronization guarantees withheld |
| U65 | Description submission success status conflicts | BSL-010/011: OpenAPI 202 versus controller and inspected tests 200; user A69 selected withholding exact status. | Non-normative; no contract edit or numeric success requirement |
| U66 | Description intake does not certify workflow delivery | BSL-011/012: metadata/DB persisted before caught trigger error; runtime seeded YAML/provider/storage unqualified. | Non-normative delivery/atomicity limits; conditional synthesis only |
| U67 | Description synthesis can persist incomplete fallback | BSL-012: malformed/no-name model output becomes description-named recipe with empty ingredients/instructions; no extraction completeness refinement. | Supported fallback drafted; no cookability/completeness guarantee |
| U68 | Description failure banner retry is ineligible | BSL-013: worker may publish failure and client offers retry, but failure service excludes goto-synthesis from list/retry/clear; controller rejects existing failed instance retry with 422. Banner test mocks success. | Non-normative discrepancy; successful recovery withheld; no fix authorized |
| U69 | Description status/readiness and session evidence limits | BSL-012/013: actual status reads IsReady despite OpenAPI image/name/synthesized prose; finalizer metadata-ready write is PDF-only; in-memory pending/events have no cross-session delivery guarantee. | Exact disputed status predicate/file-ready guarantee withheld; main rules preserved |
| U70 | PDF intake persistence/dispatch and publication are not atomic | BSL-016/017: source/info precede DB save; dispatch exceptions swallowed after persistence; stored workflow/YAML and worker unqualified. Page staging/moves then metadata/DB updates are retryable, not crash-atomic. | Non-normative limits; no rollback, guaranteed delivery, orphan repair or partial-write recovery claim |
| U71 | PDF foreground feedback and ambiguous intake limits | BSL-015/016/018: draft is memory-only, hidden/member/navigation discards it without cancelling upload; pending is added after response, notifications match only this session. HTTP/identity uncertainty warns about duplicates, raw network/JSON Error.message may not. Already-ready finalizer does not republish. | Retained as limits; no resumption, exactly-once intake, universal duplicate warning or replay/event-order guarantee |
| U72 | PDF recovery has generic classification and conditional cleanup | BSL-018: recipe-import failures sourceType photos, generic reason, Settings load errors hidden. Retry queues failed task, does not fix source. Clear/maintenance protect named-plus-images or discoverable recipes even when IsReady false. | Supported conversion-stage cleanup only; unconditional deletion/recovery success and PDF-specific failure copy withheld |
| U73 | PDF native/extraction qualification deferred | BSL-017: fixed render budgets, native fixture/env tests, fake-renderer/service tests and model stubs do not prove production execution/readability. One-recipe guidance does not detect/split multi-recipe input. | A34 not-run; no complete semantic accuracy, device/NAS/resource or deployed provider qualification |
| U74 | Shared PDF entry is conditional browser staging, not OS installation transport | BSL-015: one-slot token claim/expiry and foreground eligibility traced; synthetic stage/visibility overrides do not establish installed OS sharing. Secondary docs describe broader Android/iOS behavior beyond evidence selected here. | Entry dependency only; installation/OS transport/deployment guarantees excluded |

## Slice evidence and lifecycle records

### BSL-recipe-capture-001 — Capture entry, link review, client validation, and background tracking

**Behavior and actor:** A person in an ordinary household with household access and member context visits `/capture` (or shares a link to `/capture?url=...` / `/capture?text=...`). If a `url` parameter or URL within `text` is present, or if the person activates the secondary link action on the capture screen, the view switches to the URL review form displaying the link in a multi-line input (`capture-url-input`). The client debounces URL input queries against GET `/api/recipes?url={trimmed}`: if a match exists, an advisory warning banner (`duplicate-recipe-warning`) is displayed with a "View existing recipe" button that opens `RecipeDetailSheet`. The review form also offers appreciation rating (1–3: "Not for me", "It was OK", "Loved it!") and optional notes. The Save button (`capture-url-save-btn`) is enabled only when the trimmed URL is non-empty. Activating Save submits POST `/api/recipes/capture-url` with `{ url, notes, rating }` and header `X-Family-Member-Id`. If submission fails (network or non-2xx status), an inline error is displayed in `capture-url-error` while preserving the form state. On 202 Accepted with a valid recipe ID, the client stores the pending recipe in `useCaptureStore`, transitions to a queued progress screen (`capture-success-screen`) showing "Recipe queued" and starts a 10-second countdown to auto-redirect to `/home`. If a matching `recipe_ready` SSE event arrives while on this screen, the countdown is cancelled and the view updates to "{Name} is ready!" with an "Add to this week" button and a "Done" button navigating to `/home`.

**Ordered trace:**
1. UI: `pwa/src/components/capture/MinimalCapture.tsx` (`handleUrlCapture`, `capture-url-input`, `capture-url-save-btn`, `capture-url-error`, `capture-url-review-heading`, `capture-success-screen`, `capture-done-btn`, `capture-add-to-week-btn`).
2. Prefill / Navigation: `pwa/src/app/(app)/capture/page.tsx` (`CapturePage`, passes `url`, `text`, `title`, `intent`, `mode`) → `MinimalCapture.tsx` (`extractUrl`, `showUrlReview`, `urlInput`).
3. Client / API: `pwa/src/lib/api/recipes.ts` (`captureUrl`) → `pwa/src/lib/api/api-client.ts` → `specs/openapi.yaml:2769–2790` (`POST /api/recipes/capture-url`).
4. State & Events: `pwa/src/store/captureStore.ts` (`addPending`), `pwa/src/store/libraryStore.ts` (listens to SSE `recipe_ready` and dismisses notification on inline match).

**Relevant source files and symbols:**
- `pwa/src/components/capture/MinimalCapture.tsx`: `handleUrlCapture`, `urlInput`, `setUrlInput`, `showUrlReview`, `urlDuplicate`, `urlCaptureError`, `wasUrlCaptured`, `onSuccess`, `readyRecipeName`, `countdown`.
- `pwa/src/app/(app)/capture/page.tsx`: `CapturePage`, `CapturePageProps`.
- `pwa/src/lib/api/recipes.ts`: `captureUrl`.
- `specs/openapi.yaml`: `/api/recipes/capture-url`, `CaptureUrlDto`.

**Relevant test assertions and substitutions:**
- `pwa/src/components/capture/MinimalCapture.test.tsx`:
  - `shows Done button and auto-navigates to /home after 10 seconds (non-GOTO path)`: asserts countdown, Done button presence, and 10-second navigation to `/home`.
  - `does NOT auto-navigate when onSuccess=true and isGoto=true (GOTO path)`: asserts success heading visible and no automatic navigation.
- `pwa/e2e/capture-flow.spec.ts`:
  - `user can enter recipe URL, view review screen, and save recipe`: asserts review form prefilled with query URL, rating/notes entry, POST payload verification (`body.url`).
  - `capture flow extracts URL from shared text parameter`: asserts URL extracted from free-form text.
  - `failed URL capture shows error message`: asserts 500 error display on `capture-url-error`.
  - `malformed 202 with missing recipe id shows error message`: asserts error display when 202 response omits `data.id`.
  - `clicking the link secondary action shows the URL review form`: asserts manual entry activation.
  - `clicking Back from URL review form returns to capture controls`: asserts back navigation clears review view.

**API/implementation/test/documentation agreement or mismatch:**
- Agreement: URL input, prefill, duplicate advisory warning, 202 Accepted response, error presentation, queued countdown, and inline ready transition agree across source, tests, and contract.
- Discrepancy: Duplicate warning is client-side advisory only; the server does not enforce URL uniqueness (U58).
- Discrepancy: Auto-navigation countdown is local to the active browser tab; tab closure or early navigation drops client countdown without interrupting server processing (U60).

**Evidence class and confidence:** Implementation-supported; component tests and Playwright E2E tests provide high confidence for URL review, validation, submission, queued progress, and inline completion.

**Open question or explicit limitation:** U58, U60.

**Disposition:** drafted under A64.

### BSL-recipe-capture-002 — Backend recipe capture intake, workflow dispatch, and acquisition processing

**Behavior and actor:** An authenticated household member issues POST `/api/recipes/capture-url` with `CaptureUrlDto` (`url`, optional `notes`, `rating`). `RecipeController.CaptureUrl` checks for `familyMemberId` (returning 400 Bad Request if missing), then invokes `RecipeService.CaptureUrl`. The service generates a new recipe UUID, creates an initial `Recipe` entity with name `"Captured Recipe"`, `IsReady = false`, `ImageCount = 0`, `IsDiscoverable = false`, and `AddedBy = familyMemberId`, writes initial `recipe.info` to disk via `IImageService`, saves DB changes, and triggers the `url-import` workflow with parameters `recipeId` and `url`. Workflow orchestration executes:
1. `WebAcquisitionAgent` (`FetchUrlContent`): Fetches webpage HTML using `HttpClient`. If HTTP 403 Forbidden is returned, it logs a warning and proceeds with partial metadata. Uses `chatClient` with prompt `WebContextExtraction` to extract title and hero image URL. If title extraction fails, it falls back to `"Recipe from " + Uri.Host`. If hero image URL is present, it downloads the image bytes and saves it as original image `0`, setting `ImageCount = 1` and `FinishedDishImageIndex = 0`. It saves `original/content.html` and persists `SourceUrl` in `recipe.info`.
2. `RecipeAgent` (`ExtractRecipe`): Reads `original/content.html` and image artifacts, formats chat messages with HTML context (truncated to safe token limits), and runs extraction using prompt `WebRecipeExtraction`. Parses and semantically validates the JSON (requiring a name, ingredients, and instruction steps; running refinement if incomplete). Saves normalized `recipe.json` and updates `recipe.info`.
3. Subsequent workflow tasks run hero generation (`GenerateHero`), sync (`SyncRecipe`), ingredient categorization (`CategorizeIngredients`), and recipe categorization (`CategorizeRecipe`).
4. `RecipeReadyProcessor` (`RecipeReady`): Sets `recipe.IsReady = true`, `recipe.IsDiscoverable = true`, updates `UpdatedAt`, saves DB changes, and broadcasts `publisher.PublishRecipeReadyAsync(recipeId, name, imageUrl)`.

**Ordered trace:**
1. API / Controller: `api/src/RecipeApi/Controllers/RecipeController.cs` (`CaptureUrl`, lines 266–276).
2. Service / Orchestration: `api/src/RecipeApi/Services/RecipeService.cs` (`CaptureUrl`, lines 524–575) → `api/src/RecipeApi/Services/WorkflowOrchestrator.cs` (`TriggerAsync`).
3. Workflow Definition: `api/src/RecipeApi/Workflows/url-import.yaml`.
4. Acquisition Agent: `api/src/RecipeApi/Services/Agents/WebAcquisitionAgent.cs` (`ExecuteAsync`, `ProcessUrlAsync`, lines 19–128).
5. Extraction Agent: `api/src/RecipeApi/Services/Agents/RecipeAgent.cs` (`DoExtractRecipeAsync`, lines 114–210).
6. Readiness Processor: `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs` (`ExecuteAsync`, lines 21–65).

**Relevant source files and symbols:**
- `api/src/RecipeApi/Controllers/RecipeController.cs`: `CaptureUrl(CaptureUrlDto dto, Guid? familyMemberId)`.
- `api/src/RecipeApi/Services/RecipeService.cs`: `CaptureUrl(CaptureUrlDto dto, Guid familyMemberId)`, `GetRecipeStatus(Guid id)`.
- `api/src/RecipeApi/Workflows/url-import.yaml`: tasks `fetch_url_content`, `extract_recipe`, `recipe_ready`.
- `api/src/RecipeApi/Services/Agents/WebAcquisitionAgent.cs`: `ProcessorName => "FetchUrlContent"`, `ProcessUrlAsync`.
- `api/src/RecipeApi/Services/Agents/RecipeAgent.cs`: `ProcessorName => "ExtractRecipe"`, `DoExtractRecipeAsync`.
- `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs`: `ProcessorName => "RecipeReady"`, `ExecuteAsync`.

**Relevant test assertions and substitutions:**
- `api/src/RecipeApi.Tests/Services/Agents/WebAcquisitionAgentTests.cs`:
  - `ProcessUrlAsync_DoesNotWriteRecipeJson`: asserts `recipe.json` is not prematurely written by acquisition agent.
  - `ProcessUrlAsync_WritesContentHtml`: asserts source HTML is saved to `original/content.html`.
  - `ProcessUrlAsync_SetsSourceUrlInRecipeInfo`: asserts `recipe.info.SourceUrl` matches the input URL.
  - `RecipeJson_NeverContainsRawHtml_AfterWebAcquisitionAgent`: property-based test asserting no `rawHtml` leak in `recipe.json`.
- `pwa/e2e/capture-flow.spec.ts`:
  - `user can enter recipe URL, view review screen, and save recipe`: asserts API receives valid URL capture request.

**API/implementation/test/documentation agreement or mismatch:**
- Agreement: Initial entity creation with pending readiness, workflow parameters, HTML artifact persistence, semantic extraction validation, readiness status transition, and SSE notification agree across implementation and tests.
- Discrepancy: `RecipeService.CaptureUrl` commits the DB transaction before awaiting workflow launch; if workflow triggering fails, the pending record remains in the DB without automated rollback (U61).
- Discrepancy: Scraping 403 Forbidden is treated as non-fatal with host-name fallback, which may result in minimal recipes without ingredients (U59).
- Discrepancy: U01 discrepancy noted in `RecipeImportReportService` (omission of `url` parameter during repair re-import) does not affect initial capture intake.

**Evidence class and confidence:** Implementation-supported; unit, property-based, and integration tests provide high confidence for initial creation, web acquisition, artifact saving, and ready transition.

**Open question or explicit limitation:** U59, U61.

**Disposition:** drafted under A64.

### BSL-recipe-capture-003 — Recipe capture baseline proposal and draft

**Authority:** A64 session instruction, 2026-10-15. Authorizes discovery and drafting only ordinary-household recipe capture: URL web acquisition entry (`/capture` URL input and submit), client/backend validation, web acquisition workflow dispatch (WebAcquisitionAgent / Gemini fetch and parse), background task / progress tracking, error / unparseable feedback, and initial recipe creation into the library with stored readiness status. Produce a bounded, source-supported draft and stop for review; no application behavior changes, promotion, archival, or successor extraction.

**Artifacts produced:**
| Artifact | Status |
| --- | --- |
| [Proposal](../../openspec/changes/archive/2026-10-16-baseline-recipe-capture-url-entry/proposal.md) | Draft; documentation only |
| [Delta](../../openspec/changes/archive/2026-10-16-baseline-recipe-capture-url-entry/specs/recipe-capture/spec.md) | 9 ADDED requirements / 20 scenarios; new capability `recipe-capture` |
| [Design](../../openspec/changes/archive/2026-10-16-baseline-recipe-capture-url-entry/design.md) | Technical architecture, component boundaries, and risks; no application design change |
| [Tasks](../../openspec/changes/archive/2026-10-16-baseline-recipe-capture-url-entry/tasks.md) | Documentation extraction/validation checklist only; all 8 tasks checked |
| Main / lifecycle | Recipe-sharing 9/27, recipe-library 55/122, household-identity 36/92 unchanged; all twelve changes remain active; no archival |
| Review handoff | Human draft review pending; promotion and archival require separate authorization |

**Requirements and scenario mapping:**
1. `Enter and review a recipe link at capture entry`:
   - `Open capture with shared URL parameter`: `MinimalCapture.tsx:98, 123`, `CapturePageProps` in `page.tsx:6–14`, `capture-flow.spec.ts:180–186`.
   - `Extract URL from shared text parameter`: `MinimalCapture.tsx:54–58, 99, 103`, `capture-flow.spec.ts:216–226`.
   - `Manual entry from capture controls`: `MinimalCapture.tsx:1109–1118`, `capture-flow.spec.ts:324–332`.
   - `Return to capture controls`: `MinimalCapture.tsx:1310–1323`, `capture-flow.spec.ts:334–351`.
2. `Advisory duplicate warning for existing recipe link`:
   - `Existing recipe matching link URL`: `MinimalCapture.tsx:190–216, 1340–1355`.
   - `Unique link URL`: `MinimalCapture.tsx:195–198, 1340`.
3. `Validate and submit recipe link for acquisition`:
   - `Submit valid recipe link`: `MinimalCapture.tsx:322–362, 1410–1422`, `useCapture.ts:147–167`, `recipes.ts:333–346`, `RecipeController.cs:266–276`, `capture-flow.spec.ts:187–205`.
   - `Save disabled when URL is empty`: `MinimalCapture.tsx:1417`.
   - `Missing member context rejects submission`: `RecipeController.cs:271–272`.
4. `Initial recipe creation and workflow dispatch`:
   - `Initial recipe stored with pending readiness`: `RecipeService.cs:524–575`, `url-import.yaml:1–64`.
5. `Background web acquisition and recipe extraction`:
   - `Fetch webpage content and hero image`: `WebAcquisitionAgent.cs:45–128`, `WebAcquisitionAgentTests.cs:120–158`.
   - `Scraping forbidden fallback`: `WebAcquisitionAgent.cs:54–58, 78–82`.
   - `AI-assisted extraction and semantic validation`: `RecipeAgent.cs:114–210`, `WebAcquisitionAgentTests.cs:100–117, 160–218`.
6. `Finalize recipe readiness and broadcast completion`:
   - `State transition to ready`: `RecipeReadyProcessor.cs:21–65`.
7. `Track background capture progress and auto-redirect`:
   - `Display queued progress screen`: `MinimalCapture.tsx:760–824`, `capture-flow.spec.ts:206–214`.
   - `Complete countdown redirects to Home`: `MinimalCapture.tsx:305–320`, `MinimalCapture.test.tsx:201–223`.
   - `Done button manual dismissal`: `MinimalCapture.tsx:806–813`, `MinimalCapture.test.tsx:209–210`.
8. `Inline transition to ready status upon completion`:
   - `Ready notification received during active session`: `MinimalCapture.tsx:170–187, 344–350, 678–757`.
9. `Display error feedback on capture failure`:
   - `API rejection or network error`: `MinimalCapture.tsx:355–357, 1424–1431`, `capture-flow.spec.ts:228–247`.
   - `Missing recipe ID in response`: `useCapture.ts:154–156`, `capture-flow.spec.ts:249–266`.

**Additional inspected identities:** Prior 72 inputs unchanged; these 12 additions bring the reusable manifest to 84 unique inputs. Digests identify source evidence, not runtime qualification.

| Input | SHA-256 |
| --- | --- |
| `pwa/src/components/capture/MinimalCapture.tsx` | `aadbb37ec2fe548af6e41c5460ea3339377fb215f66f19eac054666416742af5` |
| `pwa/src/app/(app)/capture/page.tsx` | `28026fd2a95ea0563e13522d10a945030cb4f8ccd45a910e1c594306ebdbdbb9` |
| `pwa/src/lib/api/recipes.ts` | `f4e70b39a2060bfc5b25010914f78e288321517db5c52c543d103502718dce7a` |
| `api/src/RecipeApi/Controllers/RecipeController.cs` | `d1699c2de6f6cca9d879e67c0c7b9c7f0af4b2c4e104bc9ff04634b266eb5a70` |
| `api/src/RecipeApi/Services/RecipeService.cs` | `9eec9ab5cd7102081b3765b08a41b8de4d45325858d18ab4573a326afa256b74` |
| `api/src/RecipeApi/Workflows/url-import.yaml` | `6f142f8831390021091f5c3ca9603f056d138719d1904ae72cd75827beb73787` |
| `api/src/RecipeApi/Services/Agents/WebAcquisitionAgent.cs` | `688cfe3ff3c1b0dad7885794f725fcfca29e990477b3e2ce1246c7e2ebb743b2` |
| `api/src/RecipeApi/Services/Agents/RecipeAgent.cs` | `b23761d819726cf5dd8c50000cabc05198fba855865e6beba05de0ea8a6097af` |
| `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs` | `4206f98256cadae88d7be13a44e9d9d18b6c46679ba7b9f0aee0dcef8a848a74` |
| `pwa/src/components/capture/MinimalCapture.test.tsx` | `8a8c1d66ccae98223cb0754cdd155c30a2d75911aea6cfff09284f54816bbf53` |
| `pwa/e2e/capture-flow.spec.ts` | `4683a2c0590f0c4c562ed4350afb6aa208a88d856ff4c27688732f4bc6d42911` |
| `api/src/RecipeApi.Tests/Services/Agents/WebAcquisitionAgentTests.cs` | `f414a13b7756ff6fa8dcc1824cb515fc05aba9f5b83aa8e22f17542513bd278d` |


### BSL-recipe-capture-004 — Recipe capture main specification creation and promotion

**Authority:** A65 user instruction “promote”, 2026-10-15. Authorizes creating main specification `openspec/specs/recipe-capture/spec.md` with verbatim Purpose and the 9 requirements / 20 scenarios from the reviewed delta `openspec/changes/baseline-recipe-capture-url-entry/specs/recipe-capture/spec.md`, and updating plan and tasks. No archival, successor extraction, application changes, or runtime/database qualification authorized.

**Promotion details:**
- Destination: `openspec/specs/recipe-capture/spec.md` created with Purpose and 9 requirements / 20 scenarios under single `## Requirements` section.
- Main specs inventory: `recipe-capture` (9 requirements / 20 scenarios), `recipe-sharing` (9 requirements / 27 scenarios), `recipe-library` (55 requirements / 122 scenarios), `household-identity` (36 requirements / 92 scenarios).
- Delta preservation: Delta spec, proposal, design, and extraction tasks under `openspec/changes/baseline-recipe-capture-url-entry/` preserved intact.
- Active changes: All twelve changes remain active; none archived.
- Non-normative notes: Evidence/limits note and exact BSL-015 sentence/caveat remain preserved in change delta; U58–U61 limitations remain recorded.

**Validation:**
- `openspec validate --specs --strict --no-interactive`: passed (4/4 main specs valid).
- `openspec validate --all --strict --no-interactive`: passed (16/16 items valid: 12 active changes, 4 main specs).
- `task verify`: passed documentation and content integrity checks.


### BSL-recipe-capture-005 — Photo capture entry, client staging, validation, dish photo index, and notes

**Behavior and actor:** A person accessing `/capture` uses camera capture (`capture="environment"`) or gallery photo selection (`multiple`) or drag-and-drop to stage recipe images. The client validates images using `validateImage` and `validateImageCount`: permitting 1–20 photos, enforcing a 20 MB size limit per file, and allowing MIME types `image/jpeg`, `image/png`, and `image/webp`. The client automatically sets the first added photo as the main dish photo (index 0). The person can select any staged photo to change the dish photo designation. Removing photos updates the index (if removing the selected photo, defaults to 0; if removing a preceding photo, decrements the index; otherwise clamps within bounds). The person can also select an appreciation rating (1–3: Dislike, Like, Love) and enter optional notes in a textarea.

**Entry state / trigger / observable outcome:**
- Trigger: Camera button click, gallery button selection, or file drop.
- Staging outcome: Image previews rendered, photo count displayed, dish photo badge/star rendered, rating buttons and notes input enabled.
- Error outcome: Inline error message displayed for invalid mime type, file > 20 MB, or total count > 20.

**Relevant source files and symbols:**
- `pwa/src/components/capture/MinimalCapture.tsx`: `handleCapture`, `handleGallery`, `handleFileChange`, `handleDrop`, `selectedDishPhotoIndex`, `setSelectedDishPhotoIndex`, `rating`, `setRating`, `notes`, `setNotes`.
- `pwa/src/hooks/useCapture.ts`: `addImage`, `removeImage`, `setSelectedDishPhotoIndexFn`, `submitRecipe`.
- `pwa/src/lib/imageUtils.ts`: `validateImage`, `validateImageCount`, `MAX_FILE_SIZE`, `MAX_IMAGE_COUNT`, `ALLOWED_MIME_TYPES`.

**Relevant test assertions and substitutions:**
- `pwa/e2e/capture-flow.spec.ts`: verifies gallery file input, photo count visibility (`capture-photos-count`), rating button click (`capture-rating-3`), notes filling, and save button enablement.
- `pwa/src/components/capture/MinimalCapture.submit-lock.test.tsx`: verifies upload overlay and submission locking behavior.

**Evidence class and confidence:** Implementation-supported; high confidence.
**Requirement/scenario mapping:** Mapped to requirements `Select recipe photos from camera or device gallery`, `Stage and validate uploaded recipe photos`, `Designate finished dish photo with automatic index management`, and `Capture appreciation rating and preparation notes`.


### BSL-recipe-capture-006 — Multipart photo submission, upload lock, overlay, and API intake

**Behavior and actor:** Activating Save Recipe with staged photos initiates multipart form data submission. The client sets `photoSubmitLockRef` and `isPhotoSubmitPending` to disable repeated clicks. If upload exceeds 800 ms, `MinimalCapture` displays a delayed modal overlay (`capture-photo-upload-overlay`) prompting the user to keep the screen open. The request is sent via native `fetch` to `POST /api/recipes` with multipart form fields: `files` (array of binaries), `rating` (0–3), `finishedDishImageIndex` (-1 or 0-based index), and optional `notes`, along with header `X-Family-Member-Id`. `RecipeController.Create` validates the member header (returning 400 Bad Request if missing), then invokes `RecipeService.CreateRecipe`. `ValidationService` validates member existence, image count, per-image size/mime, rating range, and dish index. Images are saved to disk via `ImageService.SaveImages`, `RecipeInfo` metadata file is written, and initial DB entities (`Recipe` with `IsReady = false`, `RecipeSearchDocument` with status `pending`) are committed before asynchronously triggering workflow `recipe-import`. The API returns 202 Accepted with `{ id = recipeId }`.

**Relevant source files and symbols:**
- `pwa/src/components/capture/MinimalCapture.tsx`: `handleSave`, `photoSubmitLockRef`, `isPhotoSubmitPending`, `showPhotoUploadOverlay`.
- `pwa/src/lib/api/recipes.ts`: `createRecipe`.
- `specs/openapi.yaml`: `/api/recipes` POST multipart specification.
- `api/src/RecipeApi/Controllers/RecipeController.cs`: `Create` action.
- `api/src/RecipeApi/Services/RecipeService.cs`: `CreateRecipe`.
- `api/src/RecipeApi/Services/ValidationService.cs`: `ValidateImage`, `ValidateImageCount`, `ValidateRating`, `ValidateFinishedDishImageIndex`.

**Relevant test assertions and substitutions:**
- `pwa/e2e/capture-flow.spec.ts`: mocks `POST /api/recipes`, asserts 800ms delayed upload overlay visibility (`capture-photo-upload-overlay`, `capture-upload-keep-open`), and verifies transition to `capture-success-screen`.
- `api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs`: verifies `Create` validates member ID and queues `recipe-import`.

**Evidence class and confidence:** Implementation-supported; high confidence.
**Requirement/scenario mapping:** Mapped to requirements `Validate and submit multipart photo capture`, `Client-side photo upload progress feedback and submission lock`, and `Initial recipe persistence and photo workflow dispatch`.


### BSL-recipe-capture-007 — Asynchronous vision OCR extraction, refinement, and readiness completion

**Behavior and actor:** Background workflow worker executes `recipe-import.yaml`. The first task, `convert_pdf`, executes `PdfConversionProcessor` which detects that source PDF is null and immediately skips (`{ skipped = true }`), passing through directly for photo uploads. The second task, `extract_recipe`, executes `RecipeAgent.DoExtractRecipeAsync`. The agent reads original image binaries (`GetImageFilesAsync`), inspects magic bytes (PNG, WebP, JPEG), adds them as `DataContent` to the multimodal chat message, and executes extraction against the LLM. It parses and validates structured JSON using `RecipeExtractionParser.ParseAndNormalize`. If semantic completeness fails (missing name, ingredients, or instruction steps), it issues a refinement prompt (`RefineExtractionAsync`). Upon valid completion, it serializes normalized recipe JSON, writes `recipe.info` on disk, and updates description. Subsequent tasks sync recipe and categorize ingredients/recipe. The `recipe_ready` task executes `RecipeReadyProcessor`, updating DB `Recipe.IsReady = true`, `Recipe.IsDiscoverable = true`, `UpdatedAt = UtcNow`, and broadcasts `recipe_ready` SSE event with `{ recipeId, name, imageUrl }`.

**Relevant source files and symbols:**
- `api/src/RecipeApi/Workflows/recipe-import.yaml`: tasks `convert_pdf`, `extract_recipe`, `generate_hero`, `sync_recipe`, `categorize_ingredients`, `categorize_recipe`, `recipe_ready`.
- `api/src/RecipeApi/Services/Processors/PdfConversionProcessor.cs`: handles photo pass-through when source PDF is absent.
- `api/src/RecipeApi/Services/Agents/RecipeAgent.cs`: `DoExtractRecipeAsync`, `AddImagesToMessageAsync`, `RefineExtractionAsync`.
- `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs`: finalizes readiness and calls `PublishRecipeReadyAsync`.
- `api/src/RecipeApi/Infrastructure/SseEventPublisher.cs`: `PublishRecipeReadyAsync`.

**Relevant test assertions and substitutions:**
- `api/src/RecipeApi.Tests/Services/RecipeImportLifecycleTests.cs`: verifies `recipe-import` lifecycle transitions and execution of `RecipeReady`.
- `api/src/RecipeApi.Tests/Integration/GotoSynthesisIntegrationTests.cs`: asserts `RecipeReadyProcessor` does not alter image count for photo-upload recipes and sets recipe state to ready.
- `api/src/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs`: asserts `RecipeReady` broadcasts `recipe_ready` SSE event.

**Evidence class and confidence:** Implementation-supported; high confidence.
**Requirement/scenario mapping:** Mapped to requirements `Multimodal OCR vision recipe extraction and semantic validation` and `Finalize photo recipe readiness and broadcast completion`.


### BSL-recipe-capture-008 — Terminal capture failure notification, SSE broadcast, and recovery banner

**Behavior and actor:** If any non-transient workflow task fails and exhausts retries in `recipe-import`, `WorkflowWorker` catches the failure and executes `PublishRecipeFailedEventAsync`. It resolves the recipe ID from parameters, queries partial recipe info (name and hero/first image URL), and invokes `IScheduleEventPublisher.PublishRecipeFailedAsync` emitting the `recipe_failed` SSE event with `{ recipeId, workflowInstanceId, errorMessage, failedStep, partialData }`. In the PWA client, `useScheduleStream` listens for `recipe_failed`. If `useCaptureStore` holds the recipe ID in `pendingRecipes` (confirming it was submitted in this browser session), it removes the pending entry and pushes a `failed` notification into `useLibraryStore`. The top-level layout component `RecipeFailureBanner` renders a persistent banner (capped at 2 visible) showing the recipe name, friendly failure message, a dismiss button, and a Retry CTA. Clicking Retry calls `POST /api/captures/failures/{id}/retry`, which queues a workflow reset and clears the notification banner.

**Relevant source files and symbols:**
- `api/src/RecipeApi/Services/WorkflowWorker.cs`: `PublishRecipeFailedEventAsync`.
- `api/src/RecipeApi/Infrastructure/SseEventPublisher.cs`: `PublishRecipeFailedAsync`.
- `pwa/src/hooks/useScheduleStream.ts`: `recipe_failed` SSE event listener.
- `pwa/src/store/captureStore.ts`: `addPending`, `removePending`, `getPending`.
- `pwa/src/components/capture/RecipeFailureBanner.tsx`: persistent failure banner, retry handling.
- `api/src/RecipeApi/Controllers/CapturesController.cs`: `Retry` endpoint.

**Relevant test assertions and substitutions:**
- `api/src/RecipeApi.Tests/Services/WorkflowWorkerTests.cs`: asserts `WorkflowWorker` publishes `recipe_failed` on terminal failure with recipe ID and step name.
- `pwa/src/hooks/useScheduleStream.test.ts`: verifies `recipe_failed` event pushes notification to `libraryStore` when recipe is in `captureStore`.
- `pwa/e2e/capture-flow.spec.ts`: verifies `RecipeFailureBanner` appears upon `recipe_failed` event and provides a retry CTA.

**Evidence class and confidence:** Implementation-supported; high confidence.
**Requirement/scenario mapping:** Mapped to requirement `Persistent failure banner on workflow failure`.

| Input | SHA-256 |
| --- | --- |
| `pwa/src/components/capture/MinimalCapture.tsx` | `aadbb37ec2fe548af6e41c5460ea3339377fb215f66f19eac054666416742af5` |
| `pwa/src/app/(app)/capture/page.tsx` | `28026fd2a95ea0563e13522d10a945030cb4f8ccd45a910e1c594306ebdbdbb9` |
| `pwa/src/hooks/useCapture.ts` | `758f77485f02a9b32e48e9fab846f5906e94ce1de7594d94c55950d294d1b5e9` |
| `pwa/src/lib/imageUtils.ts` | `a51d124d0fae2a99257186e607597825299737ca77717813aac3ce72821d46be` |
| `pwa/src/lib/api/recipes.ts` | `f4e70b39a2060bfc5b25010914f78e288321517db5c52c543d103502718dce7a` |
| `api/src/RecipeApi/Controllers/RecipeController.cs` | `d1699c2de6f6cca9d879e67c0c7b9c7f0af4b2c4e104bc9ff04634b266eb5a70` |
| `api/src/RecipeApi/Services/RecipeService.cs` | `9eec9ab5cd7102081b3765b08a41b8de4d45325858d18ab4573a326afa256b74` |
| `api/src/RecipeApi/Services/ValidationService.cs` | `bf2ed2aaffef7c4e7dd320c3f53f7772eaacfe8cceb4251acc6f0792b19fa1a1` |
| `api/src/RecipeApi/Workflows/recipe-import.yaml` | `56977712412ec2c0b5a04495e77edbf3b97a71f92ad5f8da8546b58261de5b0a` |
| `api/src/RecipeApi/Services/Processors/PdfConversionProcessor.cs` | `b97cef43cf9d4f88010180881f3ebbcf463a93b427d7f3632191679ee3a8accb` |
| `api/src/RecipeApi/Services/Agents/RecipeAgent.cs` | `b23761d819726cf5dd8c50000cabc05198fba855865e6beba05de0ea8a6097af` |
| `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs` | `4206f98256cadae88d7be13a44e9d9d18b6c46679ba7b9f0aee0dcef8a848a74` |
| `api/src/RecipeApi/Services/WorkflowWorker.cs` | `69f9023b0003ff2f0a5dda6d85bcb42e13ebf064b5c8529bc6b0866e5b3871df` |
| `pwa/src/components/capture/RecipeFailureBanner.tsx` | `7aa890d43a873448da7f588e276d0a41a9b06cedb7dd7bc6c73314bca3e1dc30` |
| `pwa/src/store/captureStore.ts` | `8ba993036ef6c8e3bd05c3e737b51c0541a044dcb2d186b2501da230376f50f1` |
| `pwa/src/hooks/useScheduleStream.ts` | `0e1f1b91e459b77fd90ca6a071ff5cb8fc0cbcc64e8cab54a00b8232c9ab2107` |
| `pwa/src/components/capture/MinimalCapture.submit-lock.test.tsx` | `d44c5d335ca8c810a2a7618939c94c977d1bb7af03362132c0a33324198cf288` |
| `pwa/e2e/capture-flow.spec.ts` | `4683a2c0590f0c4c562ed4350afb6aa208a88d856ff4c27688732f4bc6d42911` |
| `api/src/RecipeApi.Tests/Services/RecipeImportLifecycleTests.cs` | `fe4b7249603997be939e0b8a2d790ef88f1eaa1863b7101a2011186f258a04cb` |


### BSL-recipe-capture-009 — Photo-entry main specification promotion

**Authority:** A67 user “promote baseline-recipe-capture-photo-entry”, 2026-10-15. Authorizes exact delta promotion and plan/task follow-up. No separate acceptance statement or runtime qualification inferred.

**Result:** Exact 10 requirements/24 scenarios appended to main recipe-capture, now 19/44. Original Purpose/prior content preserved verbatim; delta/proposal/design unchanged. Other main specs and all thirteen active changes preserved. Actual delta contains 24 scenarios rather than the 23 reported at drafting; only current task/promotion counts corrected. Prior evidence, U62–U64 and all historical caveats retained. All 90 unique source/dependency paths with SHA-256 table entries rechecked unchanged.

**Checks:** Main/all strict validation, exact delta equality, prior-content/preservation review and final three-path documentation verification required; results in final response/current harness. Runtime/browser/API/database checks not-run A34; behavior TDD not-applicable for documentation-only work.

## Draft slice — recipe capture / description entry

**Authorization:** A68 current user request authorizes discovery and CLI-scaffolded documentation-only drafting of `baseline-recipe-capture-description-entry`, capability `recipe-capture`, and this plan update. A69 user explicitly selected withholding an exact success status requirement while recording controller 200 versus OpenAPI 202. Neither authorizes application/contract fixes, qualification or lifecycle actions.

**Identity and preservation:** HEAD `db6fede90ec0a7dfff26e6050036310bc8211837`; initial `git status --short` was empty (no staged, unstaged or untracked work). CLI list/context resolved `/Users/alex/Code/whats-for-supper` as nearest OpenSpec root; no initialization/configuration changes. Main capture counted from actual headers: 19 requirements/44 scenarios; delta: seven/18. All 90 unique prior table source hashes rechecked with no mismatch. Existing tracked files are compared with a private before-image manifest before completion; no historical dirty/deleted state is recreated from plan prose.

### BSL-recipe-capture-010 — entry, metadata, duplicate advice and submission

**Domain/purpose:** recipe-capture; turn a named household recipe idea into an initial recipe and request background synthesis. Ordinary household route only, no GOTO intent.

**Trace:** capture page → CaptureWithPdf pass-through → MinimalCapture local name/description → direct generated describe client (not useCapture or recipes wrapper) → header provider → OpenAPI/DTO/controller. Form opens by Describe a recipe or mode=describe; Cancel clears fields/advice/error. Name trimmed/nonblank; optional description trimmed with client name fallback. No separate rating, serving, duration or preparation-note metadata exists in this form. Debounced lookup uses ready/nondeleted case-insensitive exact-name matches and returns advisory first-match/view behavior, not unique-name enforcement.

**Tests inspected:** MinimalCapture unit tests substitute router/client/stores and assert form/name gating and non-GOTO fake-ten-second navigation in source assertions; recipe-import component test substitutes list/detail sheet and asserts duplicate banner/view. capture-flow Playwright source covers describe visibility and blank-name no request with intercepted routes; its successful description request/name assertion is GOTO-specific and does not qualify ordinary workflow execution. mock-api describe returns canned 200 data, no background processing. Test source was not executed.

**Confidence:** implementation-supported; API status conflict U65. Name max length/length-specific validation, duplicate rejection and additional metadata rules are not inferred.

### BSL-recipe-capture-011 — initial persistence and dispatch boundary

**Trace:** DescribeRecipeDto requires name, permits nullable description; member binder accepts parsable header/cookie. Controller returns BadRequest for missing bound context and Ok DTO for successful service call. Service creates Recipe + recipe.info carrying provided name/description/member/timestamps, zero images and false readiness/discoverability defaults, then saves DB and requests goto-synthesis with recipeId/description. Missing API description becomes empty workflow parameter, unlike browser name fallback. Trigger exceptions are swallowed/logged after persistence and initial response still returned; U66 retains pending-without-work risk. No delivery/atomicity guarantee.

**Tests inspected:** RecipeDescribeIntegrationTests assert 200/name/GUID, omitted-description acceptance, pending status, unknown ID 404, initial AddedBy/store metadata and missing member rejection. Missing-name test also omits member, so does not isolate cause. GotoSynthesisIntegrationTests “triggers” test only checks response/initial row, not invocation parameters or actual delivery. Factory uses default EF InMemory, InMemoryRecipeStore and a mock orchestrator persisting synthetic instances/tasks. No PostgreSQL/disk/real workflow execution evidence.

### BSL-recipe-capture-012 — conditional generation, synchronization and readiness

**Trace:** WorkflowRepository/storage → orchestrator YAML validation/substitution/transactional task persistence → worker processor resolution → SynthesizeRecipe. Program registers agent/worker; startup seeder copies definitions but catches seeding failures. YAML orders synthesize → excluded hero dependency → sync → categorize ingredients → categorize recipe → ready. Source chain is connected but deployed workflow bytes/provider responses are unqualified.

RecipeAgent uses RecipeSynthesis prompt/chat provider (EmbeddedPromptRepository maps to embedded synthesize-recipe.md, not the older unused GetSynthesisSystemPrompt helper), sanitizes/deserializes result, writes normalized recipe.json and synthesized recipe.info. Malformed or unnamed output falls back to description as name plus empty ingredient/instruction arrays; no photo semantic refinement runs. Prompt-requested complete ingredients/steps and language/quantity/time/yield rules are not enforced output guarantees. Follow-up description generation is best effort. SyncRecipe transfers content/name/description/synthesized state to DB. RecipeReady sets DB IsReady/IsDiscoverable and publishes recipe_ready without changing image count; its metadata-readiness repair is PDF-only. Status endpoint uses IsReady, not the older image/name/synthesized prose in OpenAPI. Description capture does not poll it.

**Tests inspected:** GotoSynthesisIntegrationTests directly invoke ready processor with mocked publisher, assert synthesized zero-image status, unchanged family settings and no-op cases; factory replaces orchestration/storage/DB. Nearby RecipeAgentPromptSelectionTests exercise extraction with mock chat/prompt/storage; they are not description-synthesis semantic-completeness proof. No focused real synthesis/fallback delivery test was found in the inspected suites. U67/U69 retain these limits. No guarantee of complete ingredients/instructions, recipe quality, language or automatic readiness solely on synthesis.

### BSL-recipe-capture-013 — observable progress, failure and recovery limits

**Trace:** response.data.id → captureStore pending → Synthesizing…/ten-second Done countdown; ready event → session match → library notification → existing inline ready view and cancelled countdown. Early-ready lookup exists but does not guarantee event ordering. Main lifecycle rules reused, not rewritten. Subsequent recipe list eligibility requires ready; persistence alone is not ordinary library visibility.

Worker transient errors are rescheduled within configured policy; fatal/exhausted failure pauses instance and best-effort publishes recipe_failed. Session pending match produces persistent failure notification/banner; dismiss is local. Banner Retry calls POST /api/captures/failures/{workflowInstanceId}/retry. CaptureFailureService whitelist excludes goto-synthesis from list/retry/clear; existing failed instance retry returns NOT_FAILED_CAPTURE/422. Banner mock test always resolves queued and cannot establish eligibility. Failure releases local retry busy state without explicit retry-error UI. No successful failed-synthesis recovery requirement is added. Initial request errors/missing ID retain name/description and permit re-submission (which can create another recipe after ambiguous intake success).

Secondary async-feedback flow document contains historical/proposed UI, not normative current behavior. General mock SSE/banner assertions do not qualify real delivery, all event races, cross-session notifications or database recovery. U60/U64 remain; U68 records description-specific retry gap.

### Description draft requirement/scenario mapping

Scenario names below cover every actual delta header; all are implementation-supported, none runtime-qualified.

| Delta requirement | Scenario names | Evidence |
| --- | --- | --- |
| Enter and cancel a description capture draft | Open description from capture controls; Open description mode directly; Cancel a draft | BSL-recipe-capture-010 |
| Advise about an existing recipe name during description entry | Matching name found; View matching recipe | BSL-recipe-capture-010 |
| Validate and submit a description capture | Blank name blocks synthesis; Submit additional recipe details; Submit only a name; API accepts omitted description; Missing required intake values | BSL-recipe-capture-010/011 |
| Create an initial recipe from description intake | Receive the initial recipe identity; Background dispatch fails after creation | BSL-recipe-capture-011 |
| Generate recipe content from the submitted description | Persist generated recipe content; Unusable synthesis response | BSL-recipe-capture-012 |
| Show description synthesis waiting state | Intake returns a recipe ID; Ready event resolves description waiting state | BSL-recipe-capture-010/013 |
| Retain a description draft after submission failure | Request rejects; Response lacks identity | BSL-recipe-capture-010/013 |

| Existing main requirement reused | Application to description and limits |
| --- | --- |
| Finalize recipe readiness and broadcast completion | BSL-012 conditional final processor DB state/event; no duplicate finalization requirement or description disk-readiness promise |
| Track background capture progress and auto-redirect | BSL-013 shared countdown/Done; new requirement adds description-specific heading/entry |
| Inline transition to ready status upon completion | BSL-013 same matching pending ready event; planner action implementation excluded |
| Persistent failure banner on workflow failure | BSL-013 presentation/dismissal shared; successful retry scenario cannot be extended to synthesis (U68) |

### Description artifacts and verification handoff

CLI metadata, proposal, design, recipe-capture ADDED delta and extraction tasks exist under `openspec/changes/baseline-recipe-capture-description-entry/`. Artifact readiness is file existence, not acceptance. Status: validated draft for human review. Selected strict and all-item strict passed (18 items, zero failed); explicit six-path task verification passed documentation, spec:check and content. Final identity/results remain in response/current `.task/agent-finish/last-run.json`. Full diff/preservation/content checks cover this plan plus the five change files only, with no excluded Git paths. All 110 unique current evidence hashes match (including 90 preserved prior identities); the selected slice records 44 input identities. Existing tracked files other than this plan and the empty index remain unchanged. Required checks failed: none; blocked: none. Application/browser/API/model/workflow/database checks not-run under A34/session instruction; behavior TDD, client regeneration, service startup and migrations not-applicable to documentation extraction. No runtime/model/provider qualification claimed. No accept/promote/archive/apply/next slice.

### Description evidence source identities — SHA-256

These are current file bytes inspected for this slice; hashes identify source, not runtime or test success.

| Source | SHA-256 |
| --- | --- |
| `pwa/src/app/(app)/capture/page.tsx` | `28026fd2a95ea0563e13522d10a945030cb4f8ccd45a910e1c594306ebdbdbb9` |
| `pwa/src/components/capture/CaptureWithPdf.tsx` | `84de2ebfb72d572380350b771ad9fb62deb1052086d1876ba09db12d782bcffb` |
| `pwa/src/components/capture/MinimalCapture.tsx` | `aadbb37ec2fe548af6e41c5460ea3339377fb215f66f19eac054666416742af5` |
| `pwa/src/hooks/useCapture.ts` | `758f77485f02a9b32e48e9fab846f5906e94ce1de7594d94c55950d294d1b5e9` |
| `pwa/src/lib/api/recipes.ts` | `f4e70b39a2060bfc5b25010914f78e288321517db5c52c543d103502718dce7a` |
| `pwa/src/lib/api/api-client.ts` | `c5cd4cfebddd8d5c1f2827c522a236fe12c504130ea0991c07bc8fc46376aa95` |
| `pwa/src/lib/api/generated/api/recipes/describe/index.ts` | `95eed1836a2666eb3d3d214743ad046304485697f935dd1f78488713e70743eb` |
| `pwa/src/lib/api/generated/models/index.ts` | `03e19537845755d2cd0d30071284bc8a11007237e380433184d3edbe1ddb05e6` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |
| `api/src/RecipeApi/Dto/DescribeRecipeDto.cs` | `5ebec357eebb535d1314390019293f26508300248f9ed0e3b68a91fe53821d12` |
| `api/src/RecipeApi/Controllers/RecipeController.cs` | `d1699c2de6f6cca9d879e67c0c7b9c7f0af4b2c4e104bc9ff04634b266eb5a70` |
| `api/src/RecipeApi/Infrastructure/FamilyMemberIdModelBinder.cs` | `4d5dcc9f7d9993abb4c59802f770da139c4875c55544df8410553332a04a2f64` |
| `api/src/RecipeApi/Services/RecipeService.cs` | `9eec9ab5cd7102081b3765b08a41b8de4d45325858d18ab4573a326afa256b74` |
| `api/src/RecipeApi/Models/Recipe.cs` | `810b9ddb9bdcacdb894d713680952f5a32c89256070366dff99b3c16f82bbe82` |
| `api/src/RecipeApi/Models/RecipeInfo.cs` | `7a154a58b5f360279cd1891f9a9e33c4ad3097f382f088dccc855ec27c957452` |
| `api/src/RecipeApi/Services/ImageService.cs` | `c73bb4f976bd6355ec9aa6c18937bed12d4dc14ff7efe718a84351cb4f1abc2d` |
| `api/src/RecipeApi/Services/RecipeRepository.cs` | `d6fb4bc6ff61f2997390ede4de004d5476937fb0c9ed6bbd9f9a04212f67b821` |
| `api/src/RecipeApi/Services/WorkflowRepository.cs` | `1356e4b126077506c07633c2d977a419d96641e8a03f976d45f4e945775214d3` |
| `api/src/RecipeApi/Services/WorkflowOrchestrator.cs` | `9812d17bface86d79fef75eab2ef7668c7c0bde18455c1ea46774b46dcc0b14c` |
| `api/src/RecipeApi/Infrastructure/WorkflowSeeder.cs` | `52c827096989bbe689d27b5aab8a8afc4e50b2feea9d895f6e396b5e79e6b4ba` |
| `api/src/RecipeApi/Program.cs` | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |
| `api/src/RecipeApi/Workflows/goto-synthesis.yaml` | `d614552797656dacbfe941e8d761b0c111e80d98b96c1216a197435163d6c6c1` |
| `api/src/RecipeApi/Services/Agents/RecipeAgent.cs` | `b23761d819726cf5dd8c50000cabc05198fba855865e6beba05de0ea8a6097af` |
| `api/src/RecipeApi/Services/Processors/SyncRecipeProcessor.cs` | `246f5ffe2effb7ddc6b0019e5f6ab0436cc20a93b06cf1cdc337007f4ccd2945` |
| `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs` | `4206f98256cadae88d7be13a44e9d9d18b6c46679ba7b9f0aee0dcef8a848a74` |
| `api/src/RecipeApi/Services/WorkflowWorker.cs` | `69f9023b0003ff2f0a5dda6d85bcb42e13ebf064b5c8529bc6b0866e5b3871df` |
| `pwa/src/store/captureStore.ts` | `8ba993036ef6c8e3bd05c3e737b51c0541a044dcb2d186b2501da230376f50f1` |
| `pwa/src/hooks/useScheduleStream.ts` | `0e1f1b91e459b77fd90ca6a071ff5cb8fc0cbcc64e8cab54a00b8232c9ab2107` |
| `pwa/src/components/capture/RecipeFailureBanner.tsx` | `7aa890d43a873448da7f588e276d0a41a9b06cedb7dd7bc6c73314bca3e1dc30` |
| `pwa/src/lib/api/captures.ts` | `ca0d112b46ce3bf0c60dc7a1ce7de4039d70ac6028dfb7d37314805e510b302f` |
| `api/src/RecipeApi/Services/CaptureFailureService.cs` | `88a7b76335db0873e0d5e4bcde15783a2ec792d84f97f967a24f3bcf5b79db29` |
| `api/src/RecipeApi/Controllers/CapturesController.cs` | `2c6288fcac9627acefd02de76a77822d4a51955cd8db8b32ae967bf5c035e85f` |
| `api/src/RecipeApi.Tests/Integration/RecipeDescribeIntegrationTests.cs` | `4e1e0fa8b5277f30668ccefe8a4e122cfe25869cfd994b7a77f84a9f99e8fcd5` |
| `api/src/RecipeApi.Tests/Integration/GotoSynthesisIntegrationTests.cs` | `2b5496554a11e6ed7c24291e79552a949340c9d17a2481a472e8b4e0d33c38cb` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `api/src/RecipeApi.Tests/Services/Agents/RecipeAgentPromptSelectionTests.cs` | `f221b4c7359e6c821101e7ad2276c922dde48549235b5e50939c9c73ec2768f1` |
| `pwa/src/components/capture/MinimalCapture.test.tsx` | `8a8c1d66ccae98223cb0754cdd155c30a2d75911aea6cfff09284f54816bbf53` |
| `pwa/src/components/capture/MinimalCapture.recipe-import.test.tsx` | `a34f4e0686200f03800c12b8c2433f770f2b3a041e9734cb55e170de45be0fb8` |
| `pwa/src/components/capture/RecipeFailureBanner.test.tsx` | `de6336aa7c3a632f4d5bddc15c5c069c94c388127c54c62a991ce001f11b609b` |
| `pwa/e2e/capture-flow.spec.ts` | `4683a2c0590f0c4c562ed4350afb6aa208a88d856ff4c27688732f4bc6d42911` |
| `pwa/e2e/mock-api.ts` | `063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07` |
| `docs/flows/user-flows/sse-capture-async-feedback.md` | `38d690343d5cd1e2e88a21354754242bd50e13aeacdbd863dd50b2a28eeffebd` |
| `api/src/RecipeApi/Services/EmbeddedPromptRepository.cs` | `9a080e4f32ca8dbc5edf88e28e6682b8ad539d7745c186a2e397d6657348e657` |
| `api/src/RecipeApi/Prompts/synthesize-recipe.md` | `0b6cc023b2aad5408013df59e6a905d2820ac3f9ff27f74a2f2c0616555f9c0a` |


### BSL-recipe-capture-014 — Description-entry main specification promotion

**Authority:** A70 user “promote”, 2026-10-15, immediately following the validated description draft. Authorizes this reviewed delta promotion plus bounded plan/task follow-up. No separate acceptance statement, application implementation, runtime qualification, archival or successor extraction inferred.

**Result:** Seven requirements/18 actual scenario headers appended verbatim to main recipe-capture, now 26 requirements/62 scenarios. Original Purpose and all prior URL/photo requirements/scenarios preserved byte-for-byte. Delta/proposal/design/CLI metadata unchanged; all 110 unique evidence source hashes rechecked unchanged. Fourteen changes remain active and archives remain unchanged. A69, U65–U69, earlier uncertainties and exact BSL-015 caveat retained. Historical draft checkpoint evidence remains historical, not relabeled runtime acceptance.

**Verification:** Main/specs/all strict validation, exact added-delta equality, prior-main/preservation review and explicit three-path documentation verification required; final results in response/current harness. Failed/blocked outcomes must be reported separately. Runtime/browser/API/database/model checks not-run under A34. Behavior TDD, application implementation tests and client generation not-applicable to promotion. No services started.

## Draft slice — recipe capture / feature-enabled PDF entry

**Authorization A71 (2026-10-15):** User explicitly requested documentation-only discovery and drafting of `baseline-recipe-capture-pdf-entry`, capability `recipe-capture`, using installed openspec-propose. This separately selects the feature-enabled PDF journey under A09; it does not extend ordinary-household general availability. Authorized outputs: proposal, design, PDF-only delta, extraction tasks and this plan. Stop at validated draft for human review; no promotion, archival, application changes, services, database/model/runtime qualification or successor slice. A34 and all historical caveats remain unchanged.

**Snapshot:** HEAD `db6fede90ec0a7dfff26e6050036310bc8211837`. Initial status: modified plan and main recipe-capture, untracked description-entry change; index empty. These prior inputs were captured before edits in a private before-image/digest manifest. Actual main headers counted 26 requirements/62 scenarios, including the already promoted URL/photo/description material. CLI list/context resolved root `/Users/alex/Code/whats-for-supper` (`nearest`, repo-local); only the selected PDF change was CLI-scaffolded, no init/reconfiguration. Prior evidence identities are rechecked separately from historical runtime claims.

**Domain/purpose:** recipe-capture; acquire a single recipe PDF for the shared library when the established member's effective preview flag allows intake. Dependencies: existing household authentication/member binding, feature snapshots, recipe store/database, persisted workflow orchestration, native page rendering, existing multimodal extraction/refinement and finalization, household SSE, shared library/viewer and failed-capture maintenance. Hero generation is an excluded workflow dependency. Share-target/staging is only an entry dependency; broader installation, manifest/deployment variants and OS delivery guarantees are outside this slice.

### BSL-recipe-capture-015 — Eligibility, picker, review and foreground draft ownership

**Ordered trace:** `pwa/src/app/(app)/capture/page.tsx` → CaptureWithPdf → MinimalCapture Import recipe file → validatePdfSelection → pdfCaptureStore → PdfCapturePanel → PdfCaptureConfirmation. FeatureFlagProvider/featureFlagStore resolve member-specific snapshots; FeatureFlagRegistry/FeatureFlagService own effective mode. `preview-pdf-recipe-import` uses `WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT`: absent/invalid/off false, opt-in requires that member's true override, on true independent of override. No claim about current deployment enablement. GOTO excludes the picker; no established member/current resolved snapshot means no advertised PDF. Controller independently rechecks actual member existence and flag.

**Selection/review:** extension and MIME checks are case-insensitive, nonzero and inclusive 20,971,520-byte limit; no content parsing. Same-member loading on picker return allows staging while panel waits; resolved disabled/error gives unavailable feedback, Choose another way and opt-in Preview features link. Confirmation shows filename and one-recipe/ten-page/20 MiB guidance, rating 1–3 with default zero, optional notes, explicit Save, no Cancel or cooked-dish selection. Notes trim on Save. Selection resets photo draft; no changes to ordinary photo requirements.

**Lifecycle:** memory-only selection/generation; hide/unmount/member/query/GOTO change clears owned selection and unmounts confirmation metadata. Selection replacement prevents older cleanup/response resetting newer draft. Share token is claimed once through pdfShare bridge into the same foreground selection; absent/expired/consumed staging asks choose/share again. `pwa/public/pdf-share.js` validates one PDF, replaces one bounded IndexedDB slot, has ten-minute expiry, token-matched claim/discard and exact same-origin POST share-target handoff, with no API upload. PdfShareLifecycle discards tokens outside capture. These are inspected entry dependencies, not native OS/installed-PWA delivery proof. Draft interruption does not abort an already submitted server request.

**Assertions inspected, not executed:** pdfCapture.test checks corrupt content accepted by transport check, extension/MIME mismatches, empty file, exact byte boundary, trimmed notes/defaults/no dish field. PdfCaptureConfirmation.test substitutes callback/locales, checks filename/guidance, no Cancel/dish, synchronous double-click lock and disabled Save. PdfCapturePanel.test substitutes navigation, intake and claim; checks GOTO/query reset and member-away/back preventing late delivery. pdfCaptureStore.test checks replacement and older cleanup ownership. PDF Playwright source intercepts flags/intake, checks default-off/GOTO picker, focus refresh resolving on/off, one multipart request/metadata and immediate Home, no draft return, oversize, synthetic staged-share claim/reload/replacement/expiry and interrupted claim. These assertions do not prove actual device sharing, upload persistence or renderer execution.

**Evidence:** implementation-supported, high confidence for foreground/flag rules; transport/device qualification missing. BSL-019 maps all drafted headers. U71/U74 preserve interruption and staging limits.

### BSL-recipe-capture-016 — Multipart intake, initial persistence and dispatch boundary

**Ordered trace:** PdfCapturePanel onSave → `pwa/src/lib/api/recipes.ts:createPdfRecipe` → pdfCaptureForm → fetch POST `/api/recipes/capture-pdf` (explicit captured X-Family-Member-Id; same-origin credentials) → `specs/openapi.yaml` PdfCaptureRequest/Accepted/Error → PdfCaptureController → PdfCaptureService.AcceptAsync → IRecipeStore/LocalRecipeStore + RecipeDbContext → requested recipe-import. Generated `capturePdf/index.ts` exists and aligns on multipart/response but is bypassed by this dedicated browser wrapper. API member binder also supports cookie fallback.

**Rules/outputs:** household auth 401; missing/unestablished member 400; disabled effective flag 409 before form parsing; wrong multipart or file extension/MIME 415; missing/multiple/wrongly named file, empty file, repeated/unknown metadata or invalid integer 0–3 rating 400; over 20 MiB 413. Multipart section parsing owns size rejection; 500 MiB envelope attribute is not a supported file limit. No notes length limit is asserted. Unwrapped errors `{status,message}`; accepted `{data:{id}}`, 202. Browser maps 400/415 to generic file copy, 409 disabled, 413 size, other HTTP failures uncertain/duplicate copy; requires UUID-shaped identity. Fetch/JSON exceptions retain Error.message, so no universal duplicate-warning claim for every network/parse failure.

**Side effects/order:** bounded buffer before aggregate creation → unchanged source at fixed `original/source.pdf` → recipe.info (member/rating/trimmed-null notes, ready false, count 0, dish -1) → Recipe (null name, not ready/discoverable) and pending RecipeSearchDocument → DB save → TriggerAsync recipe-import with recipeId. Trigger exceptions logged/swallowed, still 202. Filesystem and DB not atomic; no outbox or guaranteed launch/orphan recovery. Neither 202 nor a search sidecar proves readiness/indexing. U70 retains this boundary.

**Assertions inspected, not executed:** PdfCaptureIntegrationTests default-off checks 409 and empty recipes/workflow/store; acceptance theories for on and opted-in assert unchanged intentionally corrupt bytes, member/rating/trimmed notes, null name, false readiness/discoverability, count zero/dish -1, sidecar and recipe-import instance without index-recipe-search. Boundary theory checks exact 20 MiB accepted versus +1 rejected, wrong MIME/extension, invalid ratings and empty bytes with no rejection side effects. Missing/multiple files, metadata defaults and auth rejection are asserted. OpenAPI endpoint test checks required file/additionalProperties, 0–3/default rating, statuses and UUID data.id schema. Factory defaults to EF InMemory, InMemoryRecipeStore, mocked orchestrator that inserts a synthetic one-task instance; TestServer has no production worker delivery. This is source of assertions, not current test success or real DB evidence. Confidence high for intake implementation, medium for operational dispatch.

### BSL-recipe-capture-017 — Conversion, extraction, retained originals and readiness

**Ordered trace:** Program registrations + WorkflowSeeder → WorkflowRepository stored YAML → WorkflowOrchestrator validation/substitution and workflow task transaction → WorkflowWorker processor resolution → `recipe-import.yaml`: ConvertPdf → ExtractRecipe → excluded GenerateHero → SyncRecipe → ingredient/recipe categorization → RecipeReady → CompleteRecipeImportReport → independent QueueRecipeSearchIndex. Startup seeding can log/catch failure; deployed stored YAML not qualified. No services launched.

**Conversion:** PdfConversionProcessor reads retained source; photo imports skip converter when absent. It serializes attempts and reuses metadata count 1–10 only if every numbered page exists. Otherwise PdfProcessRenderer spawns isolated PdfNativeWorker, rejects corrupt/encrypted (including empty-password encryption) and outside-1–10-page input, renders every page as PNG in order, checks dimensions/resources/time and kills/reaps child before temporary cleanup. Default profile: 200 DPI, max dimension 4096, 16,777,216 pixels, 64 MiB output, 512 MiB resident, 60 seconds. Resource numbers belong in evidence/design, not normative product tuning. LocalRecipeStore stages/replaces numbered pages, preserves source.pdf, then converter updates metadata and DB count/dish -1; recipe stays pending. Publication is retryable with metadata barrier, not crash-atomic file movement or cross-store transaction.

**Extraction/completion:** RecipeAgent enumerates indices 0..ImageCount-1, detects PNG/JPEG/WebP media types, sends all pages, excludes source.pdf, uses existing recipe extraction/refinement and final semantic name/ingredient/usable-step validation, writes normalized recipe.json/name. No multi-recipe splitting or quality guarantee. SyncRecipe copies content into DB. RecipeReady marks ready/discoverable, records PDF recipe.info IsReady, publishes recipe_ready; already-ready retry repairs metadata but does not republish completion. Indexing is independent after readiness/report completion. Reuse existing extraction/readiness semantics rather than duplicate them.

**Original access:** RecipeService DTO classifies page-backed recipe as photos, not a new PDF sourceType. RecipeDetailSheet → OriginalPhotosViewer (dish -1 means ascending page indices) → numbered original endpoint → ImageService → LocalRecipeStore image extension lookup. source.pdf is separately retained and excluded from image enumeration; no download endpoint. Existing library viewer requirements own navigation/zoom/dismissal. Acquisition disablement is absent from these read/processor paths.

**Assertions inspected, not executed:** PdfConversionProcessorTests use EF InMemory/InMemoryRecipeStore and fake page arrays; assert no-source skip, 1/10-page ordered publication, metadata/source retention, not-ready state and second attempt avoiding renderer, and 11/fake failure retaining source without published images. RecipeAgentPromptSelectionTests ImageExtraction_SendsEveryPageInOrder_WithItsActualMediaType uses fake chat and in-memory storage, asserting ten ordered PNG attachments, correct media type, source excluded; nearby refinement tests assert normalized instructions and no persistence on unusable refinement. ExtractRecipeProcessorTests substitutes model/prompt/storage and asserts JSON save/missing-info exception. PdfRecipeReadyTests directly invokes finalizer with test factory/store/publisher (not a mocked publisher here), checks stored metadata readiness, repeated execution and retained source; no browser event delivery assertion. PdfNativeRendererTests opt-in fixtures assert PNG results, encryption/corruption/11/giant rejection, resource/cancellation/timeout cleanup; some tests use relaxed profiles, one checks production profile. PdfRenderLimitsTests assert default values and geometric validation. Native tests were not run; their fixture/env guards are not passing qualification. U73 retains limits. Confidence medium for end-to-end because native/provider/workflow integration is unexecuted.

### BSL-recipe-capture-018 — Acceptance feedback, terminal failure and bounded recovery

**Ordered trace:** usable intake ID → captureStore.addPending → owned current draft reset and immediate Home navigation. Older response still adds pending but does not navigate/reset replacement. There is no PDF ten-second countdown or inline queued-ready mode. Active layout useScheduleStream handles recipe_ready/recipe_failed → matching session pending removed → libraryStore notification → LibraryToast (ready) or RecipeFailureBanner (failed). Publisher is SseEventPublisher/SseConnectionManager; worker fatal/exhausted path saves failed task, pauses instance, best-effort broadcasts failure. No cross-session notification/event-order/replay guarantee. Already-ready finalizer retry may skip publication. U71 retains these gaps.

**Recovery:** SettingsPageContent mounts FailedCapturesSection → captures wrapper/contract → CapturesController → CaptureFailureService. List includes paused recipe-import with failed tasks; member identity is metadata, not a per-member result filter. Friendly reason is generic and sourceType is photos; conversion FailedStep can be convert_pdf. Retry resets failed task pending/error/schedule and instance processing, independent of acquisition flag; response 202 only queues, source unchanged. A failed source can fail repeatedly. Clear confirms locally, removes failure workflow and queues DeleteFailedCaptureResidue maintenance; unnamed conversion failure is soft-deleted until ManagementService executes cleanup. Both service and maintenance use discoverable OR named-plus-images/synthesized predicate rather than IsReady: later-stage named content can be protected and cleanup skipped even if unfinished. No unconditional failed-PDF deletion guarantee. Settings list errors silently hide section; retry/clear errors show generic retry error. Banner failed retry has no explicit error UI and dismiss remains session-local.

**Assertions inspected, not executed:** PdfCapturePostgresTests is conditional on WFS_TEST_POSTGRES_CONNECTION and creates disposable PostgreSQL + LocalRecipeStore, but factory orchestrator still creates one synthetic ConvertPdf task. Accepted_source_failure_retry_with_flag_off_and_delete_use_existing_recovery directly invokes ControlledRenderer conversion and manually sets failed/paused statuses; asserts failure list step/member/instance, retained bytes, retry acceptance off, pending task, reused pages, still-not-ready metadata and eventual maintenance removing source/pages. It does not execute WorkflowWorker/native/model/full recovery to ready. Backup/restore tests manually manufacture content/readiness and are lifecycle dependency evidence only, not additional slice requirements. FailedCapturesSection.test mocks list/retry/clear, asserts rows, retrying state and removal; no real recovery. PDF E2E mock returns a canned existing UUID and creates no recipe/workflow/SSE state. Confidence high for bounded source behavior, medium for live recovery, which is not-run.

### BSL-recipe-capture-019 — PDF draft mapping and verification boundary

All delta requirements/scenarios below are implementation-supported; none is runtime-verified. Proposal/design/spec/tasks are extraction artifacts, not acceptance or implementation. Existing tests are inspected assertions only.

| Delta requirement | Actual scenario headers | Evidence |
| --- | --- | --- |
| Gate PDF acquisition by effective member eligibility | Enabled member selects the PDF entry; Disabled or unresolved picker eligibility; API rechecks acquisition eligibility | BSL-recipe-capture-015 |
| Validate PDF file selection before confirmation | Valid transport properties; Invalid file selection | BSL-recipe-capture-015 |
| Review PDF identity and optional metadata before saving | Review selected PDF; Save metadata | BSL-recipe-capture-015 |
| Resolve PDF draft eligibility and discard interrupted drafts | Picker focus refresh is pending; Staged selection is disabled; Draft interrupted or ownership changes; Shared entry cannot be claimed | BSL-recipe-capture-015 |
| Submit a single PDF with bounded multipart metadata | Accepted PDF intake; Invalid multipart or metadata; File size and type rejected by API | BSL-recipe-capture-016 |
| Lock PDF upload and retain foreground retry feedback | Repeated Save during upload; Intake rejection permits another attempt; Response identity cannot be trusted | BSL-recipe-capture-015/016 |
| Persist a pending PDF before acknowledging intake | Initial PDF is pending; Import dispatch throws after persistence | BSL-recipe-capture-016 |
| Prepare all supported PDF pages for existing recipe extraction | Prepare a supported document; Unsupported or unrenderable document; Retry after complete page preparation | BSL-recipe-capture-017 |
| Return Home after PDF acceptance and reuse completion feedback | Intake accepted on the active draft; Response arrives after draft replacement; Successful background finalization | BSL-recipe-capture-017/018 |
| Access PDF originals through rendered pages | View completed PDF originals; Acquisition subsequently disabled | BSL-recipe-capture-017 |
| Recover eligible failed PDF imports using retained work | Retry failed preparation with preview off; Clear a failed conversion import; Settings recovery request fails | BSL-recipe-capture-018 |

| Existing main requirement reused | PDF application / boundary |
| --- | --- |
| Capture appreciation rating and preparation notes | Same 1–3 meanings; PDF confirmation/default-zero and transport rules are added without restating the selector behavior |
| Multimodal OCR vision recipe extraction and semantic validation | Rendered PDF pages feed the same all-image extraction/refinement; no new provider guarantee |
| Finalize recipe readiness and broadcast completion; Finalize photo recipe readiness and broadcast completion | Same shared finalizer/event, with PDF retained metadata readiness recorded; existing photo wording preserved |
| Persistent failure banner on workflow failure | Same received-event/session match and banner retry, eligible recipe-import instance only |
| Track background capture progress and auto-redirect; Inline transition to ready status upon completion | Existing URL/photo/description scope retained; PDF navigates directly Home, no ten-second/inline extension |
| recipe-library: Offer View Original control for eligible loaded library recipes; Present original photos in the photo viewer overlay; Navigate between original photos with wrapping; Serve raw original photo image binary | Existing rendered-page viewer/read semantics reused; no source-PDF download and no duplicate viewer requirements |

**Artifacts/status:** five selected change files (CLI metadata, proposal, design, delta, tasks) plus this plan. Draft adds **11 requirements/30 actual scenario headers**; main remains **26/62**, all prior main/deltas/artifacts preserved. Selected strict validation passed; all-item strict passed (19 items, zero failures). Draft status is validated for human review, not accepted/promoted/archived. All 110 prior and 148 current unique evidence identities matched; only this plan changed among pre-existing documentation inputs. Final selected/all strict, explicit six-path documentation verification and preservation results are reported in the response/current harness; a later content identity is not covered by an older check.

**Checks boundary:** application/unit/API/Playwright/native/model/DB tests not-run by instruction and A34. No services or runtime qualification. Behavior red/green, client regeneration, migrations, deployment and application finish acceptance are not-applicable to this documentation-only extraction. No broader preview/install/deployment baseline is inferred. Discovery command path misses were corrected by repository path lookup; they are not behavior failures.

### PDF evidence source identities — SHA-256

Current inspected input bytes; identities prove content, not execution. Prior plan evidence hashes remain historical claims and are rechecked for byte preservation separately. Every path below was inspected for this PDF journey or an immediate dependency.

| Source | SHA-256 |
| --- | --- |
| `pwa/src/app/(app)/capture/page.tsx` | `28026fd2a95ea0563e13522d10a945030cb4f8ccd45a910e1c594306ebdbdbb9` |
| `pwa/src/app/(app)/layout.tsx` | `4daa1c42696fc0ed77b1e458199844dac241ee87116e2e14f218057dc59bb5e9` |
| `pwa/src/app/(app)/profile/settings/SettingsPageContent.tsx` | `3deed0d88c6ac8f4ab5b94cc4724ae163dae344fd39c7aaccdf8a0c67d7e9aec` |
| `pwa/src/components/capture/CaptureWithPdf.tsx` | `84de2ebfb72d572380350b771ad9fb62deb1052086d1876ba09db12d782bcffb` |
| `pwa/src/components/capture/MinimalCapture.tsx` | `aadbb37ec2fe548af6e41c5460ea3339377fb215f66f19eac054666416742af5` |
| `pwa/src/components/capture/PdfCapturePanel.tsx` | `94b0865a36b86353f5bd80f5c892051bb004ae7c9c2bcbe59186339d8e1131df` |
| `pwa/src/components/capture/PdfCaptureConfirmation.tsx` | `4df683c80cabcbfda13537df86df60cae4fb0d350f6ddc9c14d9052af9886b44` |
| `pwa/src/components/capture/PdfShareLifecycle.tsx` | `af37fdacadf0a2455113000f803d6ea5c20e7798b2a1611fc928376db272ecc0` |
| `pwa/src/components/featureFlags/FeatureFlagProvider.tsx` | `b17e4c224987a0906c90aa122c0202ce5e31a0b8f1b252487b5afb3af29ae420` |
| `pwa/src/store/featureFlagStore.ts` | `55d05273679b5be4b77458a437e69e8011eadf652aad2df6a4e703125f8780b2` |
| `pwa/src/store/pdfCaptureStore.ts` | `bfc01009297ccd19bf53140b25dec436844f8d4bffff11ffe87d5eb5224fe82e` |
| `pwa/src/store/captureStore.ts` | `8ba993036ef6c8e3bd05c3e737b51c0541a044dcb2d186b2501da230376f50f1` |
| `pwa/src/lib/pdfCapture.ts` | `ac1451d1277db9c17a236b7531b5b31c9bab8ef200b2101a5e454529208e73e7` |
| `pwa/src/lib/pdfShare.ts` | `ce00a0e23501dc570c8ccf6b6177da91c8e6a3183a34337ce249e6a004e71841` |
| `pwa/public/pdf-share.js` | `0b33895e50aa8473cb236f030179f3b1288889d172ce13863fb04b6daecfbd14` |
| `pwa/src/lib/api/recipes.ts` | `f4e70b39a2060bfc5b25010914f78e288321517db5c52c543d103502718dce7a` |
| `pwa/src/lib/api/generated/api/recipes/capturePdf/index.ts` | `0a0b4f3e4252a0d5c111a6f4f63fb8017dd4b1bf388947677c8da212f4707ed4` |
| `pwa/src/lib/api/captures.ts` | `ca0d112b46ce3bf0c60dc7a1ce7de4039d70ac6028dfb7d37314805e510b302f` |
| `pwa/src/hooks/useScheduleStream.ts` | `0e1f1b91e459b77fd90ca6a071ff5cb8fc0cbcc64e8cab54a00b8232c9ab2107` |
| `pwa/src/components/capture/LibraryToast.tsx` | `4bb48892f370aa48f192badb552d4bc63075911ee7595ed53719355dbf800ad5` |
| `pwa/src/components/capture/RecipeFailureBanner.tsx` | `7aa890d43a873448da7f588e276d0a41a9b06cedb7dd7bc6c73314bca3e1dc30` |
| `pwa/src/components/profile/FailedCapturesSection.tsx` | `2632d08670b6b1b9959fe39e7141bb8cc15932082877ce7402a5dcd24ba0b6af` |
| `pwa/src/components/recipes/RecipeDetailSheet.tsx` | `bbc1bba8f16f3fa305775d072cb1c3850af34a24bd3979e2228b63984ca1a19c` |
| `pwa/src/components/recipes/OriginalPhotosViewer.tsx` | `31cd87fa5cf47dca80148c5bcd6298b674e15eb7f5c2b79cf99c5ed6c1869236` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |
| `api/src/RecipeApi/Controllers/PdfCaptureController.cs` | `c0319aec6b7eecc9a131efee6c90e6ce9ad501d9f55d91dcbb6b0b3d408b1f2e` |
| `api/src/RecipeApi/Controllers/CapturesController.cs` | `2c6288fcac9627acefd02de76a77822d4a51955cd8db8b32ae967bf5c035e85f` |
| `api/src/RecipeApi/Controllers/RecipeController.cs` | `d1699c2de6f6cca9d879e67c0c7b9c7f0af4b2c4e104bc9ff04634b266eb5a70` |
| `api/src/RecipeApi/Infrastructure/FamilyMemberIdModelBinder.cs` | `4d5dcc9f7d9993abb4c59802f770da139c4875c55544df8410553332a04a2f64` |
| `api/src/RecipeApi/Services/FeatureFlagService.cs` | `53af415c59cea86b2dc34e5f665e2fc75d8f6d9645c21e62198016bb2098a534` |
| `api/src/RecipeApi/Services/PdfCaptureService.cs` | `f48ec3c8ec789cbbbcc4951a6a7e0139ab70e7272b5dcac228843e0f6273cc79` |
| `api/src/RecipeApi/Services/Processors/PdfConversionProcessor.cs` | `b97cef43cf9d4f88010180881f3ebbcf463a93b427d7f3632191679ee3a8accb` |
| `api/src/RecipeApi/Services/PdfNativeWorker.cs` | `e36a323087bf9e8249d0dcc711c823dc4d3cf33567d24df3bd634110dc4ddb2d` |
| `api/src/RecipeApi/Services/PdfProcessRenderer.cs` | `3061b6591ea7cf3d2a55e625c6920b498b7aa3c925e163855afb0548d87b91f6` |
| `api/src/RecipeApi/Services/PdfRenderLimits.cs` | `cd84e73bc3f098d5fdd73ed05627812b6ec6df600cadae2f888cea57038730b8` |
| `api/src/RecipeApi/Infrastructure/LocalRecipeStore.cs` | `6f3f2893b4ae03ef3328efad306de1e8fc33ab470c4c430bfbe5d3ed1ae17efc` |
| `api/src/RecipeApi/Services/WorkflowOrchestrator.cs` | `9812d17bface86d79fef75eab2ef7668c7c0bde18455c1ea46774b46dcc0b14c` |
| `api/src/RecipeApi/Services/WorkflowRepository.cs` | `1356e4b126077506c07633c2d977a419d96641e8a03f976d45f4e945775214d3` |
| `api/src/RecipeApi/Infrastructure/WorkflowSeeder.cs` | `52c827096989bbe689d27b5aab8a8afc4e50b2feea9d895f6e396b5e79e6b4ba` |
| `api/src/RecipeApi/Program.cs` | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |
| `api/src/RecipeApi/Workflows/recipe-import.yaml` | `56977712412ec2c0b5a04495e77edbf3b97a71f92ad5f8da8546b58261de5b0a` |
| `api/src/RecipeApi/Services/Agents/RecipeAgent.cs` | `b23761d819726cf5dd8c50000cabc05198fba855865e6beba05de0ea8a6097af` |
| `api/src/RecipeApi/Services/Processors/SyncRecipeProcessor.cs` | `246f5ffe2effb7ddc6b0019e5f6ab0436cc20a93b06cf1cdc337007f4ccd2945` |
| `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs` | `4206f98256cadae88d7be13a44e9d9d18b6c46679ba7b9f0aee0dcef8a848a74` |
| `api/src/RecipeApi/Services/WorkflowWorker.cs` | `69f9023b0003ff2f0a5dda6d85bcb42e13ebf064b5c8529bc6b0866e5b3871df` |
| `api/src/RecipeApi/Services/CaptureFailureService.cs` | `88a7b76335db0873e0d5e4bcde15783a2ec792d84f97f967a24f3bcf5b79db29` |
| `api/src/RecipeApi/Services/ManagementService.cs` | `c24464baa8f853c7195e30de61b168ef2b8eda059545a5449580807448811c4f` |
| `api/src/RecipeApi/Services/RecipeService.cs` | `9eec9ab5cd7102081b3765b08a41b8de4d45325858d18ab4573a326afa256b74` |
| `api/src/RecipeApi/Services/ImageService.cs` | `c73bb4f976bd6355ec9aa6c18937bed12d4dc14ff7efe718a84351cb4f1abc2d` |
| `api/src/RecipeApi/Infrastructure/SseEventPublisher.cs` | `8378000101a36943903b8c7f7dcb560c3202464258410ac127d6d34b512c1696` |
| `api/src/RecipeApi.Tests/Integration/PdfCaptureIntegrationTests.cs` | `8898f4c67364f18f323c974c1bc319efba09f2599c6442fd49149d01eb135537` |
| `api/src/RecipeApi.Tests/Integration/PdfCapturePostgresTests.cs` | `54680e482267de1d1086781df5f587df640a85111d4beb8d03d0ce65a3b142c7` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `api/src/RecipeApi.Tests/Services/PdfConversionProcessorTests.cs` | `17a55bed8d8eb639f15287995a6a8043f93f1144482cdc784bc29438337ada06` |
| `api/src/RecipeApi.Tests/Services/PdfRecipeReadyTests.cs` | `c4ef4aee35be8d91f4b43731b716cabee1bf220fc43645f5205bf87163339b0f` |
| `api/src/RecipeApi.Tests/Services/PdfNativeRendererTests.cs` | `c9751143eeca751b22d4b7119639152b4e45afedbc7c990242e82d4803c20a56` |
| `api/src/RecipeApi.Tests/Services/PdfRenderLimitsTests.cs` | `72d4d33d4dcaa67e290f40280eb203d8204023e712db1c7d9f7fb535d8aaebd2` |
| `api/src/RecipeApi.Tests/Services/FeatureFlagServiceTests.cs` | `66d7c8857bf23ac75a363575cc87d680a726e23acdb7f0f135cd2053b7a28518` |
| `api/src/RecipeApi.Tests/Services/Processors/ExtractRecipeProcessorTests.cs` | `1f9e3f7f07b16f4668b3532cd666be0831f54009f266844295257f61eb7158c2` |
| `api/src/RecipeApi.Tests/Services/Agents/RecipeAgentPromptSelectionTests.cs` | `f221b4c7359e6c821101e7ad2276c922dde48549235b5e50939c9c73ec2768f1` |
| `pwa/src/lib/pdfCapture.test.ts` | `167d092a7027cfdd03755cd5e98ab4c38d352e97814ec48b3b35f01306f37a19` |
| `pwa/src/lib/pdfShare.test.ts` | `e56b002f29a66fbec771933a8acf47629cd1378243de9b65c7e6c4a3d0875d82` |
| `pwa/src/store/pdfCaptureStore.test.ts` | `d8a62b1a1d028c25c8e117d69309810e9e109c2eedebeffe14825a65227d4400` |
| `pwa/src/components/capture/PdfCapturePanel.test.tsx` | `012049964ae23aacabda5b909e517bbe841255cf3624ccdc6fc6297a022ba98a` |
| `pwa/src/components/capture/PdfCaptureConfirmation.test.tsx` | `6d4d95ca1b26d1bd2c648b191485c19122f9415e4c6535f4206d10a12ce408da` |
| `pwa/src/components/profile/FailedCapturesSection.test.tsx` | `f518c27b3116b7b0641370e7acae81d1e45742aeed115d5f3089b9b837690e56` |
| `pwa/e2e/pdf-capture.spec.ts` | `da5736657597f18e95cac22f7cb76dc8836bb50d245c70fa59810812d39e00c8` |
| `pwa/e2e/mock-api.ts` | `063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07` |
| `docs/flows/user-flows/pdf-recipe-import.md` | `1e37adf61e0af5681d63c0647fb67e44779c918cce7c878672bfb4d85557870a` |
| `docs/flows/data-flows/pdf-upload-path.md` | `ca71695ebf00ae38e5d13dd898d4031a0c645ed031a35526b4ea4c69bee2a955` |

### BSL-recipe-capture-020 — PDF-entry main specification promotion

**Authority:** A72 user “promote”, 2026-10-15, immediately after validated A71 PDF draft. Authorizes reviewed PDF delta promotion and bounded plan/task follow-up only. No archival, application implementation, runtime/database/model qualification or successor extraction.

**Result:** Exact 11 requirements/30 actual scenarios appended verbatim to main recipe-capture, now 37 requirements/92 scenarios. Original Purpose and all prior 26/62 bytes preserved, including URL/photo/description content. PDF delta/proposal/design/CLI metadata unchanged. All 148 unique evidence source hashes rechecked against current files; prior artifacts, empty index and unrelated dirty/untracked work retained. BSL-015 historical caveats, all prior uncertainty/history, U70–U74 and A34 remain unchanged. Feature-enabled PDF remains a separate A09 slice; promotion does not imply general availability or runtime verification. Fifteen changes remain active.

**Verification:** Main/specs/all strict, exact delta equality, prior-content preservation and explicit three-path documentation verification required; final observed outcomes are in response/current harness. Required failed/blocked checks reported separately. Application/browser/API/native/database/model checks not-run under A34; behavior TDD, client generation, migrations and service startup not-applicable to documentation promotion.


## Execution prompt

Paste this prompt and replace the session instruction with the desired bounded
scope. The default authorizes review only. Select the model in your host.

```text
Work on the recipe-capture OpenSpec brownfield baseline in
/Users/alex/Code/whats-for-supper.
Session instruction: Review this capability's checkpoint and recommend the next
bounded slice. Do not generate specs or change application behavior.

Read AGENT.md and its active-host loading rules, then
 docs/openspec-baseline/workflow.md and
 docs/openspec-baseline/recipe-capture.md.
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

## 2026-10-16 remaining-scope generation — current review checkpoint

**Authority RC-G1:** The current user instruction authorizes discovery, evidence reconciliation and sequential generation of every remaining approved recipe-capture baseline draft. Historical single-slice stop points below are superseded for this sequence only. Stop at validated human-review drafts; no promotion, archival, implementation, runtime qualification, staging or commits.

**Identity/preservation:** Branch `moving-to-openspec`, HEAD `04a1c4570f9bbb01b47436790d4248635ac3179a`. Initial porcelain inventory: 139 entries, 137 with index changes, one with unstaged changes, two untracked entries, no observed deletions (categories overlap). Staged/unstaged patches and a tracked/untracked file hash manifest were captured privately before task edits. Existing edits in this plan/index are retained; only current-checkpoint text and the records here are added/reconciled. No application source input was dirty. During extraction, unrelated `docs/openspec-baseline/meal-planning.md` and meal-planning/discovery change directories (including the pre-existing untracked occupied-recipe-replacement draft) changed concurrently; they were not edited or included in this task's verification. The staged binary patch remained identical to the initial snapshot. OpenSpec `context --json` and `list --json` resolved nearest local root `/Users/alex/Code/whats-for-supper`, no store indirection. Project `spec-driven` schema and installed proposal/status/instructions workflow used; no init/configuration change.

**Checkpoint reconciled:** Counted **37 requirements / 92 scenarios** in main. URL **9/20**, photo **10/24**, description **7/18**, PDF **11/30** active deltas are already present verbatim in main; none is an unfinished capture draft. Their checked extraction tasks are not runtime acceptance. All **95 unique source paths with recorded SHA-256 entries in this plan** still match at least one recorded identity; historical statements of 110/148 identities are not the current unique-path count. Main Purpose still describes only links; broadening it belongs to authorized promotion review, not this draft-only sequence.

### Coverage matrix — all approved areas accounted for

“Promoted” below means accepted documentation coverage at the recorded lifecycle checkpoint, not verified application behavior. New draft counts include full MODIFIED blocks rather than new requirements only.

| Area | Existing promoted coverage | Remaining supported extraction / disposition | Owner dependencies | Uncertainty / exclusion |
| --- | --- | --- | --- | --- |
| Photo | Select/stage/validate, dish index, rating/notes, multipart, progress/lock, extraction and failure banner; BSL-005–008 | Intake delta clarifies input activation, inclusive byte limit, clearing dish selection, server constraints and persistence/dispatch | Identity attribution; library readiness; background workflow | Device UI/decodability, cross-store rollback and model accuracy unqualified; multipart naming mismatch below |
| URL | Entry/review, advisory lookup, intake, web extraction, countdown/inline ready/errors; BSL-001–002 | Intake delta clarifies validation, acceptance and conditional context/hero acquisition | Identity binding; background acceptance; library lookup | Fetch/context/hero can fail; no site-access or transactional-delivery guarantee |
| Description | Direct/manual form, cancel, name advice, trimming/fallback, initial creation, synthesis/fallback, waiting/error retention; BSL-010–013 | No additional acquisition requirement; shared inline advice and language request apply when reached | Identity, library, workflow | A69 exact 200/202 remains withheld; U67 incomplete fallback and U68 successful retry remain non-normative limits |
| Link-share entry | Main `Enter and review a recipe link at capture entry`, shared URL/text scenarios; BSL-001 | Rechecked entry chain BSL-024; already covered, no duplicate delta | Identity page gates; installation owns OS delivery; manifest/worker transport dependency | `title` is read but unused; no title-only acquisition, installed share-sheet, cross-login draft survival or device availability promise |
| Enabled PDF | All 11/30 promoted requirements; BSL-015–018 | No further supported PDF-only gap; processing-language request applies to rendered pages | Member preview eligibility, library originals, workflow and SSE | Existing U70–U74 retained; native/provider/OS/NAS qualification and multi-recipe splitting excluded |
| Validation | Nonblank client URL/name, photo transport, PDF transport/intake and description required values | Intake delta adds photo backend constraints and URL request-validation scenario; distinguishes client size copy from inclusive bytes | Contract authoritative; identity binder separate from membership | No universal semantic validity or malformed-input recovery guarantee; client zero-byte image check differs from server |
| Metadata | URL/photo rating/notes, photo dish index, description identity, PDF metadata | Intake delta covers unrated/no dish and blank/trimmed photo notes | Identity owns attribution; library persisted facts | URL context may replace disk notes; no invariant that acquisition preserves user notes in every projection |
| Acceptance vs delivery | Initial persistence in all four sources; description/PDF already explicit | Intake delta corrects URL/photo stronger dispatch language | Background-processing acceptance requirements referenced below | Dispatch exceptions caught after persistence; no automatic recovery, rollback or exactly-once creation claim |
| Readiness | Capture inline/session feedback; main URL/photo finalizers; PDF retained readiness | Completion delta corrects ordinary file-ready overclaim and bounds publication | Library owns stored readiness/status; SSE owns delivery; workflow owns terminal states | Missing/already-ready processor can return without publication; ordinary file readiness not guaranteed |
| Duplicate advice | Pre-submit URL/name advisory; bundle duplicates owned by recipe-sharing | Completion delta extracts post-inline-ready advice, self-identity exclusion, keep navigation and explicit discard request | Library lookup, detail read, soft deletion and planner guard | No exhaustive/race-free/global prevention, success after delete conflict, inline discard error copy or physical purge |
| Configured processing language | No main capture requirement | Language delta adds one request-boundary requirement / four scenarios | Member-preferences retains display/browse language; deployment owns env propagation | No output-language/translation accuracy, supported-language list, per-member override or intake-time config snapshot guarantee |

### BSL-recipe-capture-021 — Intake boundaries and optional photo metadata

**Behavior/actor/trigger/outcome:** Ordinary household capture stages or submits URL/photos. Client validation/metadata produce intake payloads; backend rejects invalid photo transport/metadata before saving. Successful initial persistence returns identity even when subsequent workflow dispatch throws. These are implementation-supported paths, not observed runtime guarantees.

**Ordered trace and durable symbols:**

1. `pwa/src/app/(app)/capture/page.tsx:CapturePage` -> `pwa/src/components/capture/CaptureWithPdf.tsx:CaptureWithPdf` -> `MinimalCapture.tsx` camera/gallery input refs, `handleUrlCapture`, staged photo actions.
2. `pwa/src/hooks/useCapture.ts:useCapture`, `addImage`, `setSelectedDishPhotoIndexFn`, `submitRecipe`, `submitUrl` -> `pwa/src/lib/imageUtils.ts:validateImage/validateImageCount` -> `pwa/src/lib/api/recipes.ts:createRecipe/captureUrl`. Photos use native fetch FormData with `files`, rating, index and optional trimmed notes; URL uses generated `api.recipes.captureUrl.post`. Shared SDK member transport is owned by identity; native photo helper adds the selected member header explicitly.
3. `specs/openapi.yaml`: POST `/api/recipes`, POST `/api/recipes/capture-url`, `CaptureUrlDto`. `api/src/RecipeApi/Dto/CreateRecipeDto.cs` defaults rating 0/index -1; `CaptureUrlDto.cs` has Required/Url/Range annotations. `RecipeController.cs:Create/CaptureUrl` checks missing bound context; ApiController model validation precedes service calls.
4. `RecipeService.cs:CreateRecipe` checks member existence, calls `ValidationService.ValidateImageCount/ValidateImage/ValidateRating/ValidateFinishedDishImageIndex`, saves images and info, database recipe/pending search sidecar, then catches `TriggerAsync` errors. `CaptureUrl` stores initial URL metadata/database entity, then catches trigger errors. Both leave persisted state on caught dispatch error. `ImageService.CreateRecipeInfo/SaveImages` and `RecipeDbContext` are persistence boundaries.
5. `Workflows/recipe-import.yaml` and `url-import.yaml` select existing processors. `Agents/WebAcquisitionAgent.cs:ProcessUrlAsync` attempts HTML/context and optional hero, catches 403 and image download errors, saves HTML/source only after prior processing succeeds. `Agents/RecipeAgent.cs:DoExtractRecipeAsync` chooses HTML/image prompt, refines if needed and refuses an incomplete final candidate before saving normalized JSON. Subsequent readiness remains conditional.

**Inspected assertions/substitutions:** `api/src/RecipeApi.Tests/Services/ValidationServiceTests.cs` asserts zero/21 count rejection, 1/20 acceptance, rating/index boundary acceptance/rejection, empty/oversize/type rejection, and exact 20 MiB acceptance (`ValidateImage_Accepts_File_At_20MB_Boundary`). Uses mocked IFormFile, not decoded image files. `Controllers/RecipeControllerTests.cs:CreateRecipe_Without_Images_Returns_BadRequest`, `CreateRecipe_With_Invalid_Rating_Returns_BadRequest`, `CreateRecipe_Without_FamilyMemberHeader_Returns_BadRequest`, `CreateRecipe_With_Valid_Data_Returns_Accepted_With_RecipeId` assert HTTP and persisted workflow identity under `TestWebApplicationFactory` (EF in-memory default, temp local storage, stub chat, substituted orchestrator that writes mock workflow/task rows). `Services/RecipeServiceTests.cs:Photo_acceptance_starts_import_without_indexing_unextracted_content` asserts 202, database not-ready, pending search sidecar and recipe-import instance; it does not run extraction. `Services/Agents/WebAcquisitionAgentTests.cs:ProcessUrlAsync_WritesContentHtml`, `ProcessUrlAsync_SetsSourceUrlInRecipeInfo`, `ProcessUrlAsync_DoesNotWriteRecipeJson` use fake HTTP/model/storage; no live scraper proof. Existing `MinimalCapture.submit-lock.test.tsx` and `capture-flow.spec.ts` assert submission UI/payload with substituted hook/API. Missing-member service check, caught dispatch failures, URL annotation negatives and dish-toggle sentinel are supported by current executable source; no newly observed checks claimed.

**Evidence class/confidence:** Implementation-supported; high for transport boundaries with aligned assertions, medium for dispatch-error and web fallback branches and disputed contract seams. All application checks not-run under A34.

**Agreement/discrepancy:** OpenAPI describes photo property `images` while client submits `files` and controller binds IFormFileCollection; withhold normative field-name reconciliation and successful `images` intake. OpenAPI URL/photo 202 descriptions imply workflow launch more strongly than the caught-error source; retain contract unchanged, draft observable intake without certified delivery. Client accepts a zero-byte image of allowed type but server rejects it; no empty-image success requirement. UI says “under 20 MB” while executable validation is inclusive 20 MiB; draft exact bound. Camera activation requests device input, not qualified device opening. Existing metadata does not set ordinary file readiness explicitly.

**Mapping — `baseline-recipe-capture-intake-boundaries`:** All unchanged scenario details retain BSL-001–002/005–008 support; the table maps every block, including each added or narrowed scenario. Removing the final staged photo leaves no designation; the default-to-first scenario is explicitly conditioned on remaining photos.

| Delta requirement | Scenario mapping (all scenarios in each block) |
| --- | --- |
| Select recipe photos from camera or device gallery | Camera / gallery / drag-drop: MinimalCapture input refs/handlers; existing BSL-005 assertions; activation request only |
| Validate and submit recipe link for acquisition | Valid link / empty Save / missing context: existing BSL-001–002 plus submitUrl/controller; Invalid URL request metadata: CaptureUrlDto annotations + ApiController, no dedicated negative assertion inspected |
| Initial recipe creation and workflow dispatch | Initial pending + dispatch failure: RecipeService.CaptureUrl, initial metadata/database and caught TriggerAsync |
| Background web acquisition and recipe extraction | HTML/hero + 403 fallback + semantic validation: ProcessUrlAsync and DoExtractRecipeAsync; web artifact and prompt/parser assertions |
| Stage and validate uploaded recipe photos | Valid images / type / size / count: imageUtils, useCapture and BSL-005; inclusive size supported by ValidationService boundary assertion |
| Designate finished dish photo with automatic index management | Initial / change / remove selected / remove preceding: existing BSL-005 plus useCapture; Clear selection: setSelectedDishPhotoIndexFn and submitRecipe sentinel |
| Validate and submit multipart photo capture | Valid / no staged images / missing context: submitRecipe, Create and controller assertions; dispatch wording corrected only |
| Initial recipe persistence and photo workflow dispatch | Initial pending + dispatch failure: CreateRecipe storage/DB/trigger ordering and service acceptance assertion |
| Reject invalid photo intake before storing a recipe | Invalid transport/metadata: ValidationService tests and ordering; No dish/appreciation: DTO defaults, sentinel tests and trimmed notes source; Removed member: CreateRecipe.AnyAsync guard before storage |

### BSL-recipe-capture-022 — Readiness handoff, inline advice and discard

**Ordered journey:** Successfully executing `RecipeReadyProcessor.ExecuteAsync` sets database ready/discoverable before `PublishRecipeReadyAsync`; `RecordPdfReadinessAsync` only writes info when a retained PDF exists. Missing recipe returns; already-ready/discoverable repairs PDF info if needed then returns without new publication. `Infrastructure/SseEventPublisher.cs:PublishRecipeReadyAsync` -> `pwa/src/hooks/useScheduleStream.ts` -> capture/library stores -> `MinimalCapture` notification subscription/immediate notification check -> readyRecipeName/name lookup -> first returned different identity -> inline warning/detail/discard controls. This effect has no photo-only guard, so ordinary URL/photo/description share it; PDF direct-Home completion does not promise this screen. `handleDiscardDuplicate` -> generated DELETE `/api/recipes/{id}` -> `RecipeController.Delete` -> `RecipeService.SoftDeleteRecipe` -> database deletion marker/search-sidecar removal if allowed -> success toast/root navigation. Rejection logs and releases the button without new UI error text. Done/Add-to-this-week navigate Home/planner; they do not assign or delete.

**Owner references:** `recipe-library` — `Return only eligible household library recipes`, `Constrain library lookups by supplied predicates`, `Represent persisted recipe attribution and readiness`, `Read the persisted recipe readiness status`, `Soft-delete the loaded recipe when not assigned to active planner slots`, `Reject soft-delete when recipe is assigned to active planner slots`. `household-live-updates` — `Bound delivery to current process registrations`, `Preserve available lifecycle context at the capture handoff`. `background-processing` retains retry/terminal-state rules. This delta does not re-own those policies.

**Inspected assertions:** `MinimalCapture.recipe-import.test.tsx:Photo Success Duplicate & Discard action: shows warning, keeping anyway works, and discarding deletes the recipe` manually invokes store subscribers, supplies a mocked name lookup, checks warning/discard visibility, new-identity delete builder call, toast and `push('/')`. It does not actually assert every behavior its title names; keep/navigation, self exclusion, reject/release and ordinary URL/description reuse are source-supported only. Hook, router, API/delete, detail sheet and notifications are substituted. `PdfRecipeReadyTests.cs:Ordinary_ready_processor_records_retained_PDF_completion_and_idempotent_retry` asserts file readiness/database ready/source retention under factory substitutions; no non-PDF info write or event delivery proof. `RecipeImportLifecycleTests.cs:CompletionWorkflow_ReachesRecipeReadyWithoutRetiredHealthProcessors` inspects YAML dependencies/payload only, not stored/deployed execution.

**Evidence/confidence:** Implementation-supported; high for photo warning/delete request assertions and processor ordering; medium for notification timing and unasserted reuse/failure branches. Runtime checks not-run. Lookup is one returned page, not an exhaustive uniqueness query; no stale-response guard, event replay or atomic delivery. Discard can be rejected by established deletion policy. Main's ordinary disk-ready claim is not supported; corrective MODIFIED blocks retain original scenario names and place the limitation here.

**Mapping — `baseline-recipe-capture-completion-advice`:** Both existing `Finalize recipe readiness and broadcast completion` and `Finalize photo recipe readiness and broadcast completion`: original transition scenario -> processor DB save/publication order; new missing/already-finalized scenario -> early returns/conditional PDF repair. `Offer inline advice for another ready recipe with the completed name`: returned other identity -> effect/find + rendered controls; self-only/no result -> find exclusion; keep -> button route handlers with no delete/assign. `Request discard of the newly captured duplicate from inline completion`: success -> handleDiscardDuplicate and mocked assertion above; rejection -> catch/finally source. Every scenario is mapped; no deleted-record purge guarantee.

### BSL-recipe-capture-023 — Configured processing-language requests

**Trace:** Existing entry/client/contract/intake/persistence paths above -> `recipe-import` (photo/PDF), `url-import` or `goto-synthesis` -> `RecipeAgent.DoExtractRecipeAsync` / `DoSynthesizeRecipeAsync` -> `GetTranslationInstruction` reads `IConfiguration["IMPORT_TARGET_LANGUAGE"]` -> external chat request -> existing parser/fallback and recipe JSON/info persistence -> later sync/readiness/library. `GenerateDescriptionAsync` uses the same enablement check and appends a target constraint. No intake field or selected member language supplies this value. `docker/compose/apps.yml` sets a NONE default; deployment propagation remains outside this capability extraction.

**Inspected assertions/substitutions:** `RecipeAgentPromptSelectionTests.cs:TranslationLanguageSet_InjectsInstructionIntoPrompts` checks “French” in any captured message, not translated output or every individual branch. `TranslationLanguageNone_DoesNotInjectInstruction` checks absence of “Translate”. Factory replaces configuration, prompt repository, chat client, storage and EF with mocks/in-memory state; valid recipe/description strings are supplied. `ImageExtraction_SendsEveryPageInOrder_WithItsActualMediaType` asserts attachments/order/types, not language. Blank/NONE branches, synthesis and generated-description application are traced in source; no live language qualification or dedicated all-branch assertion claimed.

**Evidence/confidence:** Implementation-supported; high for configuration switch and extraction request construction, medium for unasserted branches/provider behavior. Runtime/model checks not-run. NONE is case-insensitive but surrounding whitespace is not normalized for sentinel matching; no enumeration of supported values or configuration snapshot. Provider language conformance is unvalidated and stays non-normative.

**Mapping — `baseline-recipe-capture-processing-language`:** `Request the configured processing language without certifying output language` — extraction scenario -> DoExtractRecipeAsync/GetTranslationInstruction, photo/web prompt selection and PDF same-agent attachment trace; synthesis -> DoSynthesizeRecipeAsync/GetTranslationInstruction with unchanged parser/fallback; generated description -> GenerateDescriptionAsync constraint; disabled -> IsNullOrWhiteSpace/case-insensitive NONE branch. The requirement specifies outbound requests only; prompt instructions are not promoted into achieved output guarantees.

### BSL-recipe-capture-024 — Link-share recheck and owner/exclusion reconciliation

`pwa/src/lib/baseManifest.json:share_target` declares GET `/capture` with url/text/title; `pdfManifest.ts:pdfManifest` retains that or selects multipart `/share-target`. `pwa/public/pdf-share.js:handle` forwards text-only multipart shares with a 303 to `/capture?...`; file staging/claim remains the existing PDF entry dependency. `CapturePage` forwards initial values through `CaptureWithPdf`; `MinimalCapture:extractUrl/sharedUrl/sharedText` prefers supplied URL then extracts an HTTP(S) link from text into the already specified review form. The form requires explicit Save, proceeding through submitUrl/client/contract/controller/service/storage/workflow as BSL-021; forwarding alone creates no recipe. `sharedTitle` is unused; no recipe identity or metadata guarantee from it.

`pwa/e2e/capture-flow.spec.ts:user can enter recipe URL, view review screen, and save recipe` uses direct query navigation and checks URL, rating and notes payload; `navigating with text param containing a URL should show the review form` checks input prefill. API routes are mocked by the browser test setup; direct navigation simulates entry, not OS transport. A comment claims no auto-redirect, but its assertion checks only success-screen visibility; current timer source/component assertion controls the extracted behavior. `pdfManifest.test.ts:deployment-selected manifest` asserts GET vs POST manifest configuration, not installation. No further normative link-entry draft is justified.

**Disposition/evidence/confidence:** Already-promoted coverage, implementation-supported/high for query review; medium for conditional multipart bridge; installed device delivery excluded. Identity rules remain `Gate protected page entry with household access`, `Apply member context after household access`, `Bind shared API member context independently of membership validation`. Installation and deployment have no accepted main requirements to cite for their deferred behavior; do not invent them. Member-preferences has no main spec; existing PDF capture eligibility stays as promoted without completing that owner. Family GOTO list maintenance, recipe-sharing bundle import, quality re-import, installation, demo, operations/bulk reprocessing, shared retry scheduling and SSE reconnection remain with their established capabilities. U01 URL contextual repair, U68 description retry, U70–U74 PDF limits and A34 are unchanged. No necessary product decision blocks the supported drafts; disputed guarantees remain withheld rather than silently resolved.

### Draft inventory, validation and exact lifecycle handoff

| Change / artifact directory | Counts | State |
| --- | --- | --- |
| [Intake boundaries](../../openspec/changes/archive/2026-10-16-baseline-recipe-capture-intake-boundaries/proposal.md) | 8 MODIFIED / 26 scenarios; 1 ADDED / 3 scenarios | Validated draft; human review pending |
| [Completion advice](../../openspec/changes/archive/2026-10-16-baseline-recipe-capture-completion-advice/proposal.md) | 2 MODIFIED / 4 scenarios; 2 ADDED / 5 scenarios | Validated draft; human review pending |
| [Processing language](../../openspec/changes/archive/2026-10-16-baseline-recipe-capture-processing-language/proposal.md) | 1 ADDED / 4 scenarios | Validated draft; human review pending |

Each CLI-scaffolded directory contains `.openspec.yaml`, `proposal.md`, `design.md`, `specs/recipe-capture/spec.md` and documentation extraction/validation `tasks.md`. Total **14 delta requirement blocks / 42 scenarios**, comprising **4 new requirements** and **10 full modifications**. These are not 14 new main requirements. Main remains **37/92**, byte-preserved. If reviewed/promoted together, the candidate main would be **41/110**; this arithmetic is not promotion or acceptance. Earlier active ADDED deltas are already promoted history and must not be reapplied over the corrections.

**Check scope/results:** Selected strict validation passed for all three drafts; `openspec validate --all --strict --no-interactive` passed **61 items / zero failures** at reconciliation. CLI informational archive-replay notices concern existing recipe-library deltas and do not fail validation; no archival attempted. Scenario preservation/count/mapping and source identity review passed. Complete **17-path** explicit `task verify` passed documentation, spec:check and content-identity checks at the first documentation checkpoint. Validation task checkboxes/results were then finalized; the final verification rerun covers those final bytes, with outcomes in this session/current harness. All other implementation check classes were not-applicable. Final observed results are reported by this session/current harness record; a pre-final success does not cover later edits. No application check failed or was blocked because none was run. Runtime/API/browser/database/device/native/model/service checks **not-run** under A34 and current scope. Behavior TDD, client generation, migrations, deployments and application implementation acceptance **not-applicable**. CLI discovery path/glob misses were corrected by repository lookup; they are not behavior-test failures.

**Exact next lifecycle action:** Human review of all three new deltas with BSL-021–024 and the coverage matrix, including the narrower corrections to promoted wording. Acceptance/promotion requires a separate user instruction; when selected, reconcile these deltas against current main/owning specs, preserve the exact-description-status decision, and broaden the link-only Purpose as part of that review. No sync, promotion, archival or application work performed here. Every approved recipe-capture area is accounted for; capability baseline-complete is **not claimed** pending acceptance and promotion. Runtime qualification remains a separate deferred lifecycle.


### RC-G1 source identities — SHA-256

Current inspected inputs at the recorded HEAD; hashes identify bytes, not execution. All 95 historical unique paths were also rechecked unchanged.

| Source | SHA-256 |
| --- | --- |
| `pwa/src/app/(app)/capture/page.tsx` | `28026fd2a95ea0563e13522d10a945030cb4f8ccd45a910e1c594306ebdbdbb9` |
| `pwa/src/components/capture/CaptureWithPdf.tsx` | `84de2ebfb72d572380350b771ad9fb62deb1052086d1876ba09db12d782bcffb` |
| `pwa/src/components/capture/MinimalCapture.tsx` | `aadbb37ec2fe548af6e41c5460ea3339377fb215f66f19eac054666416742af5` |
| `pwa/src/hooks/useCapture.ts` | `758f77485f02a9b32e48e9fab846f5906e94ce1de7594d94c55950d294d1b5e9` |
| `pwa/src/lib/imageUtils.ts` | `a51d124d0fae2a99257186e607597825299737ca77717813aac3ce72821d46be` |
| `pwa/src/lib/api/recipes.ts` | `f4e70b39a2060bfc5b25010914f78e288321517db5c52c543d103502718dce7a` |
| `pwa/src/lib/api/generated/api/recipes/captureUrl/index.ts` | `11d9ffc93713c35404d2d863a2cff4bc1291e57a635a239b8fab6604c0407a87` |
| `pwa/src/lib/api/generated/api/recipes/item/index.ts` | `687fbde658edd62de7455ec634b1d36e8c8b67ee508c689b2ae9de9f8ff4ba2d` |
| `pwa/src/lib/api/api-client.ts` | `c5cd4cfebddd8d5c1f2827c522a236fe12c504130ea0991c07bc8fc46376aa95` |
| `pwa/src/store/captureStore.ts` | `8ba993036ef6c8e3bd05c3e737b51c0541a044dcb2d186b2501da230376f50f1` |
| `pwa/src/store/libraryStore.ts` | `21763b997c1ed09faf5b666ed4ea81f3c8f9f9a8ff366150db5fd8a6563df1b0` |
| `pwa/src/hooks/useScheduleStream.ts` | `0e1f1b91e459b77fd90ca6a071ff5cb8fc0cbcc64e8cab54a00b8232c9ab2107` |
| `pwa/src/lib/baseManifest.json` | `12ee4a7efc73bd5da6c927f82277aae6528f5bf0d83fb1562a13a6ba9f1bb36e` |
| `pwa/src/lib/pdfManifest.ts` | `308881a198428eb21890caa9cbaa4f323b2c51f678f09495c2093eec3f8d82ac` |
| `pwa/src/app/manifest.json/route.ts` | `70cde023700c660c39dac2cd090607143ab1bfcc81393941cf9929e211864c95` |
| `pwa/public/pdf-share.js` | `0b33895e50aa8473cb236f030179f3b1288889d172ce13863fb04b6daecfbd14` |
| `pwa/src/lib/pdfManifest.test.ts` | `b0dced372fa7289693f95aa889354e832af63790f333075322141c2b7955ea5c` |
| `pwa/src/lib/pdfShare.test.ts` | `e56b002f29a66fbec771933a8acf47629cd1378243de9b65c7e6c4a3d0875d82` |
| `pwa/src/components/capture/MinimalCapture.recipe-import.test.tsx` | `a34f4e0686200f03800c12b8c2433f770f2b3a041e9734cb55e170de45be0fb8` |
| `pwa/src/components/capture/MinimalCapture.test.tsx` | `8a8c1d66ccae98223cb0754cdd155c30a2d75911aea6cfff09284f54816bbf53` |
| `pwa/src/components/capture/MinimalCapture.submit-lock.test.tsx` | `d44c5d335ca8c810a2a7618939c94c977d1bb7af03362132c0a33324198cf288` |
| `pwa/e2e/capture-flow.spec.ts` | `4683a2c0590f0c4c562ed4350afb6aa208a88d856ff4c27688732f4bc6d42911` |
| `pwa/e2e/mock-api.ts` | `063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |
| `api/src/RecipeApi/Controllers/RecipeController.cs` | `d1699c2de6f6cca9d879e67c0c7b9c7f0af4b2c4e104bc9ff04634b266eb5a70` |
| `api/src/RecipeApi/Dto/CreateRecipeDto.cs` | `02131bd03db478dd5bad49adf1bd37e2fae47e6f3aaac127880d311f6b8a65f8` |
| `api/src/RecipeApi/Dto/CaptureUrlDto.cs` | `80d058f88a003061eba520d97ec32ff2e166767c332aff610c706892ca4525e1` |
| `api/src/RecipeApi/Services/RecipeService.cs` | `9eec9ab5cd7102081b3765b08a41b8de4d45325858d18ab4573a326afa256b74` |
| `api/src/RecipeApi/Services/ImageService.cs` | `c73bb4f976bd6355ec9aa6c18937bed12d4dc14ff7efe718a84351cb4f1abc2d` |
| `api/src/RecipeApi/Services/ValidationService.cs` | `bf2ed2aaffef7c4e7dd320c3f53f7772eaacfe8cceb4251acc6f0792b19fa1a1` |
| `api/src/RecipeApi/Services/Agents/RecipeAgent.cs` | `b23761d819726cf5dd8c50000cabc05198fba855865e6beba05de0ea8a6097af` |
| `api/src/RecipeApi/Services/Agents/WebAcquisitionAgent.cs` | `688cfe3ff3c1b0dad7885794f725fcfca29e990477b3e2ce1246c7e2ebb743b2` |
| `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs` | `4206f98256cadae88d7be13a44e9d9d18b6c46679ba7b9f0aee0dcef8a848a74` |
| `api/src/RecipeApi/Infrastructure/SseEventPublisher.cs` | `8378000101a36943903b8c7f7dcb560c3202464258410ac127d6d34b512c1696` |
| `api/src/RecipeApi/Workflows/recipe-import.yaml` | `56977712412ec2c0b5a04495e77edbf3b97a71f92ad5f8da8546b58261de5b0a` |
| `api/src/RecipeApi/Workflows/url-import.yaml` | `6f142f8831390021091f5c3ca9603f056d138719d1904ae72cd75827beb73787` |
| `api/src/RecipeApi/Workflows/goto-synthesis.yaml` | `d614552797656dacbfe941e8d761b0c111e80d98b96c1216a197435163d6c6c1` |
| `api/src/RecipeApi/Program.cs` | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |
| `api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs` | `903493f2d741b315edf8ca44a83c5083500f70c9d30117c89db979ca805ff385` |
| `api/src/RecipeApi.Tests/Services/ValidationServiceTests.cs` | `1957400792e1899c0e93f979532930f797baa45c909b8f5e9f0eedec76298acb` |
| `api/src/RecipeApi.Tests/Services/RecipeServiceTests.cs` | `0019a5854fcf0468783607ff9bbe7d9c58ccc4abd3e48658f2ee3e1c54a50e27` |
| `api/src/RecipeApi.Tests/Services/RecipeImportLifecycleTests.cs` | `fe4b7249603997be939e0b8a2d790ef88f1eaa1863b7101a2011186f258a04cb` |
| `api/src/RecipeApi.Tests/Services/Agents/WebAcquisitionAgentTests.cs` | `f414a13b7756ff6fa8dcc1824cb515fc05aba9f5b83aa8e22f17542513bd278d` |
| `api/src/RecipeApi.Tests/Services/Agents/RecipeAgentPromptSelectionTests.cs` | `f221b4c7359e6c821101e7ad2276c922dde48549235b5e50939c9c73ec2768f1` |
| `api/src/RecipeApi.Tests/Services/PdfRecipeReadyTests.cs` | `c4ef4aee35be8d91f4b43731b716cabee1bf220fc43645f5205bf87163339b0f` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `docker/compose/apps.yml` | `84890a4d95cde113b58f5c0981be1afa9d688f5417c57e5cb1bdc6e91c3b20e2` |

### BSL-recipe-capture-025 — Remaining-scope promotion

**Authority RC-P1:** User “promote”, 2026-10-16, following the three validated RC-G1 drafts. Accepts and authorizes their documentation promotion into main recipe-capture and bounded plan/index/task lifecycle updates. No archival, application implementation, staging, commits or runtime qualification authorized.

**Snapshot/root:** Branch `moving-to-openspec`, HEAD `04a1c4570f9bbb01b47436790d4248635ac3179a`. Staged/unstaged/untracked state, patches, hashes and main before-image captured privately before promotion. Installed `openspec-sync-specs` workflow used. List/context/status resolve local root `/Users/alex/Code/whats-for-supper`; each selected status supplies exactly its recipe-capture delta path. Current specs rules loaded for each change before writes. All **108 unique source paths** now recorded in this plan match their recorded identities; this extends RC-G1's historical 95-path recheck without changing its result.

**Accepted/promoted artifacts:** `baseline-recipe-capture-intake-boundaries` (1 added / 8 modified, 29 draft scenarios), `baseline-recipe-capture-completion-advice` (2 added / 2 modified, 9 draft scenarios), and `baseline-recipe-capture-processing-language` (1 added, 4 draft scenarios). Their proposals, designs, deltas and CLI metadata remain unchanged. Task workflow follow-ups record promotion without changing extraction evidence. Human documentation review accepted through the explicit promotion instruction; all three changes remain active.

**Result:** Main `openspec/specs/recipe-capture/spec.md` now contains **41 requirements / 110 scenarios**: 4 additions and 10 full modifications merged from the reviewed deltas. All original scenario names remain, and 27 unaffected original requirement blocks are byte-preserved. All 14 selected delta blocks match their resulting main blocks exactly. No delta operation headings entered main. Purpose was broadened from links alone to photo, URL/shared-link entry, description and enabled PDF plus the evidenced validation/metadata/acceptance/readiness/advice/language boundaries. Earlier active URL/photo ADDED deltas are promoted history; do not replay their older wording over these reviewed corrections.

**Scope/limitations:** Accepted coverage uses BSL-021–024 mappings and the RC-G1 matrix. Description's exact numeric success status remains withheld under A69. Multipart contract naming disagreement, intake/delivery and storage atomicity limits, session-bound/racy/non-exhaustive duplicate advice, conditional readiness publication, PDF eligibility/native/device limits and provider output-language uncertainty remain as recorded. Identity, library, shared workflow/SSE, member preferences, installation and deployment retain their owners. Documentation baseline scope is accepted/promoted with explicit exclusions; no application or runtime completeness claim follows.

**Verification:** Main-spec strict validation passed (8 specs). Selected strict checks for all three deltas, all-item strict validation, exact-merge/preservation/identity review and complete explicit **six-path** `task verify` are the final promotion checks. Final observed outcomes are reported in this session and `.task/agent-finish/last-run.json`; prior runs do not cover later documentation bytes. Required failures/blockers must be reported separately. Runtime/browser/API/database/native/device/model checks not-run under A34. Behavior TDD, generated-client changes, migrations, deployments and implementation acceptance are not-applicable to this documentation promotion.

**Exact next lifecycle action:** No remaining recipe-capture drafting is required for the approved scope. Separately select runtime qualification (with suitable services/database/provider/device resources) or archival if desired; neither is performed or authorized here. Preserve the accepted uncertainties and existing evidence when selecting later work.
