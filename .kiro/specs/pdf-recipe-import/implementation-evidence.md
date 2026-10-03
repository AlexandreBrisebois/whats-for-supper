# PDF import implementation evidence

Authorization: user selected the complete T01–T08 package and authorized connector implementation.
Baseline: `6f36291d7bae3c46b9af2f9c17c02e9e17acc018`, branch `codex/pdf-recipe-import-preview`.
Session: `pdf-import-connector-20261002`. No local checkout or Task session exists.
Equivalent private baseline: fetched commit/tree and blob identities retained by the connector session.
Remote changes use additive Git trees and non-forced fast-forward updates; unexpected branch movement blocks writes.

## T01 source reconnaissance (static source evidence)

- RecipeController.Create → RecipeService.CreateRecipe → ImageService/IRecipeStore → recipe-import.
  Metadata is rating 0–3 (default 0), optional notes, finishedDishImageIndex -1 for no dish.
  The PWA trims notes. A recipe/search sidecar commits before orchestration; enqueue exceptions
  are logged and acceptance still returns the persisted GUID.
- FeatureFlagRegistry/FeatureFlagService share off/opt-in/on parsing and member overrides.
  Use the same registry and snapshot; member must exist before acquiring a PDF.
- recipe-import begins with ExtractRecipe; insert ConvertPdf before it and preserve remaining dependencies.
  IWorkflowProcessor executes a WorkflowTask payload with recipeId.
- CaptureFailureService lists paused recipe-import/url-import instances with a failed task,
  derives attribution from Recipe.AddedBy, and Retry resets that task to Pending.
  Delete queues DeleteFailedCaptureResidue. ManagementService recursively removes the
  recipe directory only for safe incomplete recipes. Keep image count/name unset on
  conversion failure so partial outputs cannot be mistaken for a ready recipe.
- LocalRecipeStore and RecipeRepository read original images by numbered known extensions.
  A fixed original/source.pdf path is excluded. The aggregate directory is recursively
  deleted on purge/failed-residue cleanup. Backup/restore still requires runtime evidence.
- useCapture owns image/rating/notes state and trims notes; MinimalCapture owns the photo
  submission lock, session pending store and existing GOTO mutations. PDF must bypass
  GOTO and return Home directly after acceptance.
- public/manifest.json currently owns GET /capture sharing; sw.js ignores non-GET and API
  requests. Replace static manifest ownership with exactly one server route at the same URL.
  Preserve text GET shares and add only exact same-origin POST /share-target interception.
- App layout supplies the existing capture close action. PDF confirmation must suppress
  that action without changing the ordinary photo capture layout.

## Contract synchronization (T03)

The approved PDF endpoint uses exactly one multipart file, optional rating (decimal integer
0–3, default 0) and trimmed optional notes (blank becomes null). Request rejection uses
an unwrapped {status,message} error envelope, matching existing error middleware.
Missing/invalid member is 400; existing household authentication remains in force.
Wrong extension/MIME is 415; corrupt bytes accepted as a PDF transport fail in conversion.
20 MiB is a file-byte bound, not the total multipart-body bound. No signature/document
parse at acceptance. Acquisition flag is rechecked server-side, not on workflow Retry.

## Task progress — implementation checkpoint 2026-10-03

| Task | Progress | Remaining qualification |
| --- | --- | --- |
| T01 | complete, pinned source/recovery map | Static evidence only; source paths revalidated where runtime failures exposed a seam |
| T02 | production Ubuntu amd64 fixtures and 3 native subprocess checks passed; measurements recorded | Final NAS profile, worst-case scans, household load, phone readability/extraction accuracy and ARM64 execution unqualified |
| T03 | approved exact OpenAPI, Kiota output, common mock and live operation synchronized | Final source checks rerun after fixes; no remaining product schema question |
| T04 | source acceptance, storage, workflow conversion, acquisition gate, existing recovery integration implemented | Final isolated PostgreSQL/disk/lifecycle tests pending latest source run |
| T05 | picker, metadata confirmation, no dish/Cancel, pending/Home, localized copy implemented | New member/navigation/delivery guard tests and complete regression run pending |
| T06 | one bounded atomic share slot, exact worker interception, single runtime manifest implemented | Browser token/expiry coverage pending final run; actual Android OS registration/apps blocked |
| T07 | user/process docs, Synology API/PWA mode and renderer variables implemented | Updated docs/index and final packaging checks pending; Compose modes passed on earlier unchanged template |
| T08 | automated regression/qualification workflow implemented and running | Actual Android/iOS/NAS checks blocked; never inferred from CI |

## Actual check classifications and identities

| Check | State | Actual evidence |
| --- | --- | --- |
| Repository/spec/source reads | passed | Connector-pinned baseline and guarded additive trees; branch movement blocks writes |
| Clone/local networking | failed | Proxy port 8080 unavailable; local sockets/Docker restricted. Connector and Actions used instead |
| Local Task begin/prepare/finish/session | blocked | No usable local checkout/Task/.NET; equivalent baseline, guarded refs, remote generation/preparation/checks used. No claim that Task finish ran |
| PWA typecheck/lint/unit/build and selected capture/settings/original-viewer E2E | passed at `f1bdb00a0caa9852cd448dd86c081781c83bf65a` | Actions 37079373771: 63 unit files / 560 tests, 4 worker tests, 47 browser tests; production build/typecheck/lint passed. Later guard tests require new evidence |
| Kiota generation | passed | Same run produced artifact 11257578455; actual generated four-file diff committed at 2d4a3537d3c3a1d3ee90597d1d4cb3c779a46aa5 |
| Kiota check / registry / route / schema / mock checks | passed in latest completed static job before later test additions | Actions 37082453135 generated-client job; retain identity, rerun final checks after preparation |
| API suite | failed then corrected / final run pending | First compile failure CS0126 corrected; subsequent 818 passed / 1 failed oversized 400-vs-413 caught MVC pre-action parsing and was fixed with manual form ownership. Later full PostgreSQL-enabled run at 2f0dd1f5868a6d7776e3636199be610eb1f35ded had 855 passed / 6 skipped / 2 existing search-test failures |
| Existing optional PostgreSQL search regressions | failed | BaselineHarness_RecordsVersionedRelevanceMeasurements (missing database lexical retrieval registration) and FindSimilar_UnavailableSemanticRetrievalFallsBackWithZeroSemanticContributionAndStableContinuations (ordering). Baseline comparison is running; no unrelated search implementation edits |
| PDF actual PostgreSQL + LocalRecipeStore recovery/lifecycle | not-run at this checkpoint | Separate isolated, explicit connection step added; prior broader failure prevented it. Final evidence must report actual result |
| Production chiseled amd64 native fixture execution | passed | [qualification-x64.md](../../../scripts/pdf/qualification-x64.md), runs 37081241720/37081572433. Ten fixture cases; source hashes unchanged, ordered PNGs, expected encrypted/corrupt/11-page/dimension failures |
| Actual native timeout/cleanup/gate reuse | passed 3/3 at `2f0dd1f5868a6d7776e3636199be610eb1f35ded` | Native dotnet tests with real PDFium/Skia; added resource/cancellation test requires final run |
| Synology Compose off/opt-in/on interpolation | passed at same identity | Synthetic values; identical mode in API/PWA and renderer variables present. This is template validation, not deployment |
| Updated native notice/image inventory | pending | Audit found PDFium NuGet omitted native notices; matching digest-pinned upstream bundles and pinned Skia/DejaVu notices now packaged. New image identity required |
| Installed Next guidance | read for verification | Actual npm-installed route-handler, manifest and Script guides downloaded from Actions artifact 11259447748. Earlier coding used upstream guide fallback while installed local docs were unavailable |
| Final complete PWA/browser/contract/doc regression run | pending | Branch-only nondeployment workflow; no later source identity inherits old successes |
| Final NAS profile, worst-case scans, household load | blocked / not-run | NAS unavailable; CI synthetic fixtures are not worst-case capacity guarantees |
| AI extraction accuracy and phone readability | not-run / blocked | No model calls/live credentials; synthetic output viewed on available image viewer only |
| Installed Android OS PDF shares from multiple apps; iOS picker/keyboard usability | blocked | Real devices/browser versions unavailable. Browser fixture delivery is not OS registration evidence |
| Deployment/live .env/secrets/rollout | not-applicable | Explicitly outside authorization; not performed |

## Measurements and ownership limits

200 DPI PNG worked on the tested text/scanned/bilingual/cover/ten-page fixtures. Ten pages produced 733,592 output bytes in 1.980 end-to-end seconds with 45,191,168 sampled cgroup peak bytes; scanned one-page peak was 50,991,104. Full details, tested image and dependency pins are retained in the x64 report. Evaluation values are explicit; blank Synology renderer variables prevent inventing target defaults. Missing values fail the retained conversion job instead of deleting its source. Normal photo jobs skip configuration/native loading.

Staging: one IndexedDB slot, file ≤20 MiB, envelope ≤file limit +64 KiB, atomic replacement and token-matched claim/discard. Logical expiry is ten minutes; physical cleanup is opportunistic at worker activation, foreground startup/pageshow/minute timer and token access. An unopened app can retain one bounded expired slot until cleanup. Transient multipart/IDB replacement can hold both old/new data; no measured browser heap guarantee is claimed.

## Scope and preparation review

All commits are additive trees on the requested branch, rooted at the recorded baseline, with non-forced guarded ref updates. Added test/code paths implement the approved PDF API/renderer/workflow/storage/confirmation/share/manifest seams; existing store/factory/agent changes provide image-only enumeration, faithful persistence, pending restore, correct PNG MIME and dependency wiring. Kiota changes are calculated output of the approved OpenAPI. Photo capture positions, GOTO behavior and downstream prompts/frameworks are preserved. Registry/index metadata changes are limited to this selected package and repair its invalid unquoted colon. Native notice/license files and branch-only CI are required qualification closure. Guide/flows/template/example changes are T07 deliverables; no live secrets/.env are read or changed.

Remote PWA preparation runs Prettier only on post-baseline affected TS/TSX/JSON/JS paths and uploads the exact output. That formatting closure will be committed before final verification, preserving source semantics and unrelated paths. Source/test fixes (MVC 413 parsing, .NET/OpenAPI registration/interfaces, React effect ownership, correct PNG media type) follow failing checks or targeted seam evidence without changed approved behavior. Test commits precede implementation. Additional existing PostgreSQL failures are observed and compared with baseline, not silently fixed or hidden.

Final source identity, passed/failed counts, blocked checks and handoff must be appended after the final workflow completes. Current pending results are not completion claims.
