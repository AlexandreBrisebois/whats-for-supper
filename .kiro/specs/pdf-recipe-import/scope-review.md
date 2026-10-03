# PDF implementation scope review

Reviewed implementation identity: `b1b491a83fe9db5f0abef4355dfb3a6c111e12db`, against private baseline `6f36291d7bae3c46b9af2f9c17c02e9e17acc018`; session `pdf-import-connector-20261002`. GitHub compare reports 90 changed paths. The guarded connector commits and pinned file reads distinguish this task's additive changes; no local Task attribution is claimed. No unexpected branch movement or unresolved path ownership was observed. Generated/formatter closure is confined to affected contract/PWA paths. Later evidence/HANDOVER/qualification text and the agent regression CI step are explicitly documentation/verification closure, not a new application identity.

| Changed path | Why the approved package needs it |
| --- | --- |
| `.github/workflows/pdf-preview-validation.yml` | Run isolated branch-only regression, real database and production renderer qualification without deployment. |
| `.kiro/specs/SPEC_INDEX.md` | Synchronize only selected PDF requirements/design/tasks/review, registry index or actual qualification evidence. |
| `.kiro/specs/pdf-recipe-import/design.md` | Synchronize only selected PDF requirements/design/tasks/review, registry index or actual qualification evidence. |
| `.kiro/specs/pdf-recipe-import/implementation-evidence.md` | Synchronize only selected PDF requirements/design/tasks/review, registry index or actual qualification evidence. |
| `.kiro/specs/pdf-recipe-import/requirements.md` | Synchronize only selected PDF requirements/design/tasks/review, registry index or actual qualification evidence. |
| `.kiro/specs/pdf-recipe-import/review.md` | Synchronize only selected PDF requirements/design/tasks/review, registry index or actual qualification evidence. |
| `.kiro/specs/pdf-recipe-import/tasks.md` | Synchronize only selected PDF requirements/design/tasks/review, registry index or actual qualification evidence. |
| `.kiro/specs/spec-registry.yaml` | Synchronize only selected PDF requirements/design/tasks/review, registry index or actual qualification evidence. |
| `api/Dockerfile` | Pin and package PDFtoImage/native dependencies, fonts and notice inventory in the production container. |
| `api/RecipeApi.csproj` | Pin and package PDFtoImage/native dependencies, fonts and notice inventory in the production container. |
| `api/licenses/PDFtoImage-LICENSE.txt` | Retain and trace native renderer, wrapper, fonts and bundled third-party redistribution notices. |
| `api/licenses/README.md` | Retain and trace native renderer, wrapper, fonts and bundled third-party redistribution notices. |
| `api/licenses/SkiaSharp-4.150.1-LICENSE.txt` | Retain and trace native renderer, wrapper, fonts and bundled third-party redistribution notices. |
| `api/licenses/skia-source/LICENSE.txt` | Retain and trace native renderer, wrapper, fonts and bundled third-party redistribution notices. |
| `api/licenses/skia-source/third_party-etc1-LICENSE.txt` | Retain and trace native renderer, wrapper, fonts and bundled third-party redistribution notices. |
| `api/licenses/skia-source/third_party-expat-LICENSE.txt` | Retain and trace native renderer, wrapper, fonts and bundled third-party redistribution notices. |
| `api/licenses/skia-source/third_party-harfbuzz-LICENSE.txt` | Retain and trace native renderer, wrapper, fonts and bundled third-party redistribution notices. |
| `api/licenses/skia-source/third_party-wuffs-LICENSE.txt` | Retain and trace native renderer, wrapper, fonts and bundled third-party redistribution notices. |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | Faithful isolated PostgreSQL/disk/workflow configuration and live specification test seams. |
| `api/src/RecipeApi.Tests/Integration/PdfCaptureIntegrationTests.cs` | Test the approved acceptance, storage, extraction, conversion, recovery or native renderer boundaries before implementation. |
| `api/src/RecipeApi.Tests/Integration/PdfCapturePostgresTests.cs` | Test the approved acceptance, storage, extraction, conversion, recovery or native renderer boundaries before implementation. |
| `api/src/RecipeApi.Tests/Services/Agents/RecipeAgentPromptSelectionTests.cs` | Test the approved acceptance, storage, extraction, conversion, recovery or native renderer boundaries before implementation. |
| `api/src/RecipeApi.Tests/Services/FeatureFlagServiceTests.cs` | Test the approved acceptance, storage, extraction, conversion, recovery or native renderer boundaries before implementation. |
| `api/src/RecipeApi.Tests/Services/ManagementServiceTests.cs` | Test the approved acceptance, storage, extraction, conversion, recovery or native renderer boundaries before implementation. |
| `api/src/RecipeApi.Tests/Services/PdfConversionProcessorTests.cs` | Test the approved acceptance, storage, extraction, conversion, recovery or native renderer boundaries before implementation. |
| `api/src/RecipeApi.Tests/Services/PdfNativeRendererTests.cs` | Test the approved acceptance, storage, extraction, conversion, recovery or native renderer boundaries before implementation. |
| `api/src/RecipeApi.Tests/Services/PdfRecipeReadyTests.cs` | Test the approved acceptance, storage, extraction, conversion, recovery or native renderer boundaries before implementation. |
| `api/src/RecipeApi.Tests/Services/PdfRenderLimitsTests.cs` | Test the approved acceptance, storage, extraction, conversion, recovery or native renderer boundaries before implementation. |
| `api/src/RecipeApi/Controllers/PdfCaptureController.cs` | Selected PDF package dependency and qualification closure; no unrelated runtime behavior. |
| `api/src/RecipeApi/Infrastructure/IRecipeStore.cs` | Provide unchanged internal PDF storage, ordered image-only pages, safe publication or live operation schema. |
| `api/src/RecipeApi/Infrastructure/InMemoryRecipeStore.cs` | Provide unchanged internal PDF storage, ordered image-only pages, safe publication or live operation schema. |
| `api/src/RecipeApi/Infrastructure/LocalRecipeStore.cs` | Provide unchanged internal PDF storage, ordered image-only pages, safe publication or live operation schema. |
| `api/src/RecipeApi/Infrastructure/PdfCaptureOpenApi.cs` | Provide unchanged internal PDF storage, ordered image-only pages, safe publication or live operation schema. |
| `api/src/RecipeApi/Models/RecipeInfo.cs` | Optional internal PDF readiness metadata prevents unfinished imports becoming ready on restore; null omission preserves photo metadata. |
| `api/src/RecipeApi/Program.cs` | Native worker entrypoint, processor/renderer services and live PDF OpenAPI integration. |
| `api/src/RecipeApi/Services/Agents/RecipeAgent.cs` | Attach every ordered page with correct PNG/WebP/JPEG MIME; preserve extraction prompt. |
| `api/src/RecipeApi/Services/FeatureFlagService.cs` | Register the PDF preview in the existing default-off flag framework. |
| `api/src/RecipeApi/Services/IPdfPageRenderer.cs` | Implement bounded acceptance or isolated PDF conversion with measured configurable resource guards. |
| `api/src/RecipeApi/Services/ManagementService.cs` | Restore accepted pending PDFs conservatively and synchronize readiness during backup; reuse aggregate cleanup. |
| `api/src/RecipeApi/Services/PdfCaptureService.cs` | Implement bounded acceptance or isolated PDF conversion with measured configurable resource guards. |
| `api/src/RecipeApi/Services/PdfNativeWorker.cs` | Implement bounded acceptance or isolated PDF conversion with measured configurable resource guards. |
| `api/src/RecipeApi/Services/PdfProcessRenderer.cs` | Implement bounded acceptance or isolated PDF conversion with measured configurable resource guards. |
| `api/src/RecipeApi/Services/PdfRenderLimits.cs` | Implement bounded acceptance or isolated PDF conversion with measured configurable resource guards. |
| `api/src/RecipeApi/Services/Processors/PdfConversionProcessor.cs` | Implement bounded acceptance or isolated PDF conversion with measured configurable resource guards. |
| `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs` | Ordinary completion records retained PDF readiness and repairs metadata on an idempotent retry. |
| `api/src/RecipeApi/Workflows/recipe-import.yaml` | ConvertPdf precedes ordinary extraction; existing retries and remaining dependencies apply. |
| `docs/flows/data-flows/pdf-upload-path.md` | Document supported PDF capture, existing recovery, source/page ownership and directly affected photo flow. |
| `docs/flows/data-flows/photo-upload-path.md` | Document supported PDF capture, existing recovery, source/page ownership and directly affected photo flow. |
| `docs/flows/user-flows/pdf-recipe-import.md` | Document supported PDF capture, existing recovery, source/page ownership and directly affected photo flow. |
| `docs/user-guide.md` | Document supported PDF capture, existing recovery, source/page ownership and directly affected photo flow. |
| `pwa/e2e/mock-api.ts` | Model the approved multipart acceptance/errors using shared state and IDs. |
| `pwa/e2e/pdf-capture.spec.ts` | Verify PDF limits/metadata/reset/share ownership and preserve existing mocked browser regressions. |
| `pwa/public/pdf-share.js` | Implement gated PDF confirmation or bounded single-slot share delivery and explicit session reset without changing photo/GOTO behavior. |
| `pwa/public/pdf-share.test.mjs` | Verify PDF limits/metadata/reset/share ownership and preserve existing mocked browser regressions. |
| `pwa/public/sw.js` | Intercept only compatible same-origin POST shares and import bounded handoff; preserve API/SSE bypass. |
| `pwa/src/app/(app)/capture/page.tsx` | Implement gated PDF confirmation or bounded single-slot share delivery and explicit session reset without changing photo/GOTO behavior. |
| `pwa/src/app/(app)/layout.tsx` | Suppress existing capture close action only while PDF confirmation is active. |
| `pwa/src/app/layout.tsx` | Install share bridge and global lifecycle cleanup outside identity gating. |
| `pwa/src/app/manifest.json/route.ts` | Serve one uncached deployment-selected share manifest with the same mode as the API. |
| `pwa/src/components/capture/CaptureWithPdf.tsx` | Implement gated PDF confirmation or bounded single-slot share delivery and explicit session reset without changing photo/GOTO behavior. |
| `pwa/src/components/capture/MinimalCapture.tsx` | Extend the existing file picker for gated PDF selection and reset photo draft; preserve primary photo layout and GOTO. |
| `pwa/src/components/capture/PdfCaptureConfirmation.test.tsx` | Verify PDF limits/metadata/reset/share ownership and preserve existing mocked browser regressions. |
| `pwa/src/components/capture/PdfCaptureConfirmation.tsx` | Implement gated PDF confirmation or bounded single-slot share delivery and explicit session reset without changing photo/GOTO behavior. |
| `pwa/src/components/capture/PdfCapturePanel.test.tsx` | Verify PDF limits/metadata/reset/share ownership and preserve existing mocked browser regressions. |
| `pwa/src/components/capture/PdfCapturePanel.tsx` | Implement gated PDF confirmation or bounded single-slot share delivery and explicit session reset without changing photo/GOTO behavior. |
| `pwa/src/components/capture/PdfShareLifecycle.tsx` | Implement gated PDF confirmation or bounded single-slot share delivery and explicit session reset without changing photo/GOTO behavior. |
| `pwa/src/lib/api/generated/api/recipes/capturePdf/index.ts` | Actual Kiota-generated closure of the approved PDF OpenAPI contract. |
| `pwa/src/lib/api/generated/api/recipes/index.ts` | Actual Kiota-generated closure of the approved PDF OpenAPI contract. |
| `pwa/src/lib/api/generated/kiota-lock.json` | Actual Kiota-generated closure of the approved PDF OpenAPI contract. |
| `pwa/src/lib/api/generated/models/index.ts` | Actual Kiota-generated closure of the approved PDF OpenAPI contract. |
| `pwa/src/lib/api/recipes.ts` | Implement gated PDF confirmation or bounded single-slot share delivery and explicit session reset without changing photo/GOTO behavior. |
| `pwa/src/lib/baseManifest.json` | Move the static manifest payload behind the single dynamic /manifest.json owner; preserve app identity/icons. |
| `pwa/src/lib/pdfCapture.test.ts` | Verify PDF limits/metadata/reset/share ownership and preserve existing mocked browser regressions. |
| `pwa/src/lib/pdfCapture.ts` | Implement gated PDF confirmation or bounded single-slot share delivery and explicit session reset without changing photo/GOTO behavior. |
| `pwa/src/lib/pdfManifest.test.ts` | Verify PDF limits/metadata/reset/share ownership and preserve existing mocked browser regressions. |
| `pwa/src/lib/pdfManifest.ts` | Serve one uncached deployment-selected share manifest with the same mode as the API. |
| `pwa/src/lib/pdfShare.test.ts` | Verify PDF limits/metadata/reset/share ownership and preserve existing mocked browser regressions. |
| `pwa/src/lib/pdfShare.ts` | Implement gated PDF confirmation or bounded single-slot share delivery and explicit session reset without changing photo/GOTO behavior. |
| `pwa/src/locales/en/common.json` | Localize PDF controls, progress, limits and failure guidance in English/French. |
| `pwa/src/locales/fr/common.json` | Localize PDF controls, progress, limits and failure guidance in English/French. |
| `pwa/src/store/pdfCaptureStore.test.ts` | Verify PDF limits/metadata/reset/share ownership and preserve existing mocked browser regressions. |
| `pwa/src/store/pdfCaptureStore.ts` | Implement gated PDF confirmation or bounded single-slot share delivery and explicit session reset without changing photo/GOTO behavior. |
| `release-template/synology/.env.example` | Keep API/PWA preview modes identical and default off; document required measured renderer values without live .env changes. |
| `release-template/synology/README.md` | Keep API/PWA preview modes identical and default off; document required measured renderer values without live .env changes. |
| `release-template/synology/compose.yaml` | Keep API/PWA preview modes identical and default off; document required measured renderer values without live .env changes. |
| `scripts/pdf/README.md` | Provide reproducible synthetic native/container/Compose qualification and measured evidence with target limitations. |
| `scripts/pdf/check-compose.py` | Provide reproducible synthetic native/container/Compose qualification and measured evidence with target limitations. |
| `scripts/pdf/qualification-x64.md` | Provide reproducible synthetic native/container/Compose qualification and measured evidence with target limitations. |
| `scripts/pdf/qualify.py` | Provide reproducible synthetic native/container/Compose qualification and measured evidence with target limitations. |
| `specs/openapi.yaml` | Specify approved multipart file/rating/notes, exact limits and acceptance/error envelopes before dependent code. |

Semantic review: the public photo endpoint, extraction prompt, primary capture action layout, GOTO, voting/plans/groceries and shared recipe eligibility retain their existing behavior. PDF acquisition alone uses its preview flag. Existing Settings retry/delete and normal workflow completion own submitted jobs. No public source PDF download, multi-recipe detector, persistent draft, cancellation control, deployment, live secret or .env change is introduced. PNG MIME correction and internal readiness repair close required page/extraction/recovery seams; no database schema migration is added.
