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

## Task progress — implemented source, 2026-10-03

| Task | Progress | Remaining qualification |
| --- | --- | --- |
| T01 | complete: pinned insertion points and existing recovery ownership verified | Source map is static evidence; runtime seams checked separately |
| T02 | Ubuntu amd64 production packaging, ten fixture cases, four real native parent checks and measured 200 DPI profile passed | Actual NAS profile/architecture, near-limit scans, household load, phone readability and model extraction accuracy blocked/not-run; ARM64 execution not run |
| T03 | complete: exact approved OpenAPI, actual Kiota output, common mock and live PDF operation synchronized | No remaining public contract decision |
| T04 | implemented and automated checks passed: unchanged source/pending acceptance, conversion, normal extraction/readiness, retained failures and existing recovery | Three isolated PostgreSQL/disk tests passed, including flag-off retry/delete and completed/pending backup/restore/soft-delete/purge |
| T05 | implemented: picker, rating/notes, no dish/Cancel, session pending/Home and reset guards | Automated PWA results tied to their actual run identity; phone keyboard reachability blocked |
| T06 | implemented: one atomic bounded share slot, exact worker interception, one runtime manifest | Simulated browser/IndexedDB/worker checks; real Android OS registration and multiple compatible originating apps blocked |
| T07 | implemented: user guide/process flows and default-off Synology mode/renderer template documentation | Compose off/opt-in/on passed using synthetic values; no live .env or deployment |
| T08 | automated API/PWA/browser/contract/native/lifecycle regressions recorded below | Target device/NAS acceptance remains explicitly blocked; package is not release-qualified |

## Actual check classifications and identities

Final application implementation identity: `b1b491a83fe9db5f0abef4355dfb3a6c111e12db`.
Actions [37083918393](https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/37083918393) verifies that source. Subsequent evidence/HANDOVER/scope text and verification workflow steps are documentation/verification closure; they do not inherit a claim that a local Task finish ran.

| Check | State | Actual evidence |
| --- | --- | --- |
| Pinned source/scope review | passed as agent assessment | Guarded non-forced connector updates and [per-path scope review](scope-review.md); no unexpected branch movement |
| Local clone/networking | failed | Proxy port 8080 unavailable and local sockets/Docker restricted; GitHub connector plus isolated Actions used |
| Local Task begin/prepare/finish/session | blocked | No usable checkout/Task/.NET. Equivalent private baseline, remote Kiota, scope-only Prettier and broad remote checks; no Task completion record claimed |
| Full default API suite | passed | Final API job 111090210784: **824 passed, 33 skipped, 0 failed**. Skips include optional database/native suites separately qualified below |
| Isolated PDF PostgreSQL + disk lifecycle | passed | Same job: **3 passed, 0 skipped/failed**. Retained conversion failure/flag-off Retry/Delete; completed backup/restore/soft-delete/purge; extracted-name-but-unfinished backup/restore remains pending |
| Ordinary completion/readiness metadata | passed | New unit in the 824-test suite records PDF completion and idempotent retry. Internal optional JSON readiness was specified/tested before implementation; no DB migration or public API change |
| Existing optional PostgreSQL regressions | failed, baseline-confirmed | **35 passed, 2 failed**: BaselineHarness_RecordsVersionedRelevanceMeasurements and FindSimilar_UnavailableSemanticRetrievalFallsBackWithZeroSemanticContributionAndStableContinuations. Exact two failures also reproduced on baseline `6f36291d7bae3c46b9af2f9c17c02e9e17acc018` in this same run. No unrelated search changes |
| Complete PWA typecheck/lint/unit/worker/build/browser suite | passed | Final PWA job 111090210658: **64 files / 563 units, 4 worker tests, 203 browser tests passed; 2 browser tests skipped**. Typecheck/lint/production build passed. Full browser suite includes capture/share/settings/original-viewer and household/GOTO regressions; mocked browser results do not qualify actual OS registration |
| Kiota/registry/route/schema/mock checks and documentation/Python syntax | passed | Final generated-client job 111090210847. Actual generated client artifact checked; generation is a calculated contract closure |
| Full running-service endpoint drift | not-run | The live PDF OpenAPI operation is tested through WebApplicationFactory; no claim that the external-service endpoint-diff command ran |
| Production chiseled amd64 fixtures | passed | Final renderer job 111090210862: **10/10 cases** with unchanged source bytes and ordered PNGs; [image/profile/measurements/notices](../../../scripts/pdf/qualification-x64.md), artifact 11260490763 downloaded/inspected |
| Actual native timeout/resources/cancellation/cleanup | passed | Same final renderer job: **4 passed, 0 skipped/failed**, real PDFium/Skia subprocesses with timeout kill/reap, output/RSS breach and cancellation, temp cleanup and gate reuse |
| Synology Compose off/opt-in/on | passed | Same job, synthetic values; identical API/PWA mode and positive renderer variables. Template check is not deployment |
| Production native notices/dependency inventory | passed as inventory inspection | Downloaded final production image notices: wrapper, Skia/SkiaSharp, DejaVu and matching PDFium component trees; ARM64 notices do not establish ARM64 execution |
| Installed Next guidance | read | Actual installed route-handler/manifest/Script guides downloaded from Actions artifact 11259447748 and verified; initial coding used upstream fallback while local installed docs were unavailable |
| Repository harness regression/selected scope whitespace | pending verification closure | Added exact test:agent command and baseline git diff --check to branch-only validation workflow; record actual results below |
| Final NAS profile, worst-case scans, household load | blocked / not-run | No NAS access; synthetic Ubuntu figures are not worst-case capacity guarantees |
| AI extraction accuracy and phone readability | not-run / blocked | No model calls/live credentials; available synthetic PNG inspection is not device/model evidence |
| Installed Android shares from multiple apps; iOS picker/keyboard | blocked | Real devices and browser versions unavailable. Browser delivery/IndexedDB tests do not establish OS share registration |
| Deployment/live .env/secrets/rollout | not-applicable | Outside authorization; not performed |

Earlier failures are preserved as defect evidence rather than passing claims: worker CS0126 fixed; MVC pre-action multipart parsing originally returned 400 for oversize and was corrected to 413; stale EF tracking in the new PostgreSQL Delete fixture was corrected by reloading the instance after client Retry. PNG MIME correctness and pending restore readiness were specified/tested before the corresponding fixes. Initial partial runs and later preparation output are not attributed to the final application identity.

## Measurements and ownership limits

200 DPI PNG worked on the tested text/scanned/bilingual/cover/ten-page fixtures. Ten pages produced 733,592 output bytes in 1.980 end-to-end seconds with 45,191,168 sampled cgroup peak bytes; scanned one-page peak was 50,991,104. Full details, tested image and dependency pins are retained in the x64 report. Evaluation values are explicit; blank Synology renderer variables prevent inventing target defaults. Missing values fail the retained conversion job instead of deleting its source. Normal photo jobs skip configuration/native loading.

Staging: one IndexedDB slot, file ≤20 MiB, envelope ≤file limit +64 KiB, atomic replacement and token-matched claim/discard. Logical expiry is ten minutes; physical cleanup is opportunistic at worker activation, foreground startup/pageshow/minute timer and token access. An unopened app can retain one bounded expired slot until cleanup. Transient multipart/IDB replacement can hold both old/new data; no measured browser heap guarantee is claimed.

## Scope and preparation review

All commits are additive trees on the requested branch, rooted at the recorded baseline, with non-forced guarded ref updates. Added test/code paths implement the approved PDF API/renderer/workflow/storage/confirmation/share/manifest seams; existing store/factory/agent changes provide image-only enumeration, faithful persistence, pending restore, correct PNG MIME and dependency wiring. Kiota changes are calculated output of the approved OpenAPI. Photo capture positions, GOTO behavior and downstream prompts/frameworks are preserved. Registry/index metadata changes are limited to this selected package and repair its invalid unquoted colon. Native notice/license files and branch-only CI are required qualification closure. Guide/flows/template/example changes are T07 deliverables; no live secrets/.env are read or changed.

Remote PWA preparation runs Prettier only on post-baseline affected TS/TSX/JSON/JS paths and uploads the exact output. That exact formatting closure was committed at e5e45 before final application verification, preserving source semantics and unrelated paths. Source/test fixes (MVC 413 parsing, .NET/OpenAPI registration/interfaces, React effect ownership, correct PNG media type) follow failing checks or targeted seam evidence without changed approved behavior. Test commits precede implementation. Additional existing PostgreSQL failures are observed and compared with baseline, not silently fixed or hidden.

Per-file rationale and reviewed identity are recorded in [scope-review.md](scope-review.md). Final verification closure results must be appended below when available; pending results are not passing claims.

## Verification closure failure and correction

Run 37084394089 at fca0a47025d7e56945a11a3dd94dc7ae96c118d4 exposed added EOF blank lines/source notice whitespace and two harness errors because the runner lacked Task. The 94-test harness run had two errors, not a pass. Closure now normalizes only those changed paths (no source behavior/license term changes) and installs the release-pinned Task v3.54.0 before rerunning the unchanged repository tests. Documentation links, Python syntax, Kiota and static parity checks passed in that job. Final closure results are recorded below when complete; no local Task session/finish is claimed.
