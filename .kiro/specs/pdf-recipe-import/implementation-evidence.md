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

## Check classifications

| Check | State | Actual evidence |
| --- | --- | --- |
| Repository/spec/source reads | passed | GitHub connector reads pinned at baseline; static evidence only |
| Clone | failed | Configured proxy port 8080 unreachable; workspace empty |
| Task harness, .NET build/tests, Kiota generation | blocked | No checkout, Task or .NET SDK |
| Docker native/container qualification | blocked | docker info: daemon socket operation not permitted |
| PWA unit/E2E/typecheck/lint/build | blocked | No installed project/dependencies/browser runner |
| PostgreSQL/live endpoint/lifecycle | blocked | No runnable application/database |
| Synology x64/arm64, Android OS shares, iOS picker/phone usability | blocked | Devices/NAS unavailable |
| Renderer fixture measurements/final budgets | not-run | No native execution; 200 DPI PNG is evaluation baseline only |
| Deployment/live .env/rollout | not-applicable | Explicitly outside authorization |

Task progress and later check evidence must be updated after each implementation slice.
No passing runtime or device claims may be inferred from connector reads.
