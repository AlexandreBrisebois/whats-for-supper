# COOK-02 — In-cook recipe feedback requirements

## Status

- **Status:** Implemented capability baseline.
- **Kind:** Capability baseline; behavior-first.

## Outcome

While cooking, a member can report an ingredient or instruction problem against the current recipe without losing their cooking position.

## Implemented behavior

- **COOK-02-R1 — Contextual entry.** Cook's Mode shows a labelled flag only when loaded recipe detail says `canReimport`. The preparation screen opens the issue sheet with `ingredients`; a cooking step opens it with `steps`. The sheet merges that reason with any stored report reason.
- **COOK-02-R2 — Report editing.** The sheet supports `ingredients`, `steps`, and `duplicate`, optional note disclosure, reason exclusivity between duplicate and content reasons, focus trapping, Escape/close, and busy/re-import locks. Content reasons are disabled when the recipe cannot be re-imported; duplicate remains a report-for-review path.
- **COOK-02-R3 — Authoritative submission.** Save calls `POST /api/recipes/{id}/import-report` with `{ reasons, note }`. The service validates the family-member header, recipe/member existence, allowed/unique reasons, note length, and content-report eligibility; it upserts one `RecipeImportReport` per recipe and returns authoritative recipe detail plus contextual re-import outcome.
- **COOK-02-R4 — Conditional re-import.** A non-duplicate ingredients/steps report with a nonblank note for a re-importable recipe triggers the contextual workflow. An identical report with an active matching workflow reports that workflow as already started; unchanged prior feedback does not launch a new run. Changed feedback is persisted and may start a new attempt once no conflicting active run exists.
- **COOK-02-R5 — Recovery and resolution.** If launch fails before a durable attempt is established, the report remains saved and the response marks `reimportLaunchFailed`; Cook's Mode keeps the sheet open with safe retry wording. Delete calls `DELETE /api/recipes/{id}/import-report` and removes a non-active report; active re-import conflicts are rejected.
- **COOK-02-R6 — Cooking continuity.** Submission/recovery updates Cook's Mode `recipeDetails` but does not alter `plannerStore.cookProgress`; dismissal returns to the same preparation/step position. A local background-reimport acknowledgement appears only after a successful initiating submission.

## Scope and boundaries

COOK-02 owns the contextual Cook's Mode entry and import-issue sheet behavior. The persisted report and workflow policy are shared with the recipe import-reporting capability; `lib-02` owns general recipe detail and `lib-03` owns actions outside Cook's Mode. It does not own instruction parsing/editing, schedule completion, or stream transport.

## Current limitations

- The in-process per-recipe semaphore does not coordinate multiple API replicas; no durable cross-process concurrency mechanism exists.
- Cook's Mode does not poll or subscribe to later re-import status. A workflow can continue after the sheet closes, but this surface learns its later state only through a later detail fetch/mount.
- Report and sheet copy, including errors and reimport acknowledgement, are hard-coded English. Failure UI exposes copyable recipe/import IDs, so product privacy/support policy should remain explicit.
- The sheet's `resolve` success path leaves `busy` true until its parent unmounts it; an unexpected parent retention would leave controls disabled.

## Preserved behavior

Feedback is optional and does not block navigation. The server saves report state before attempting eligible workflow launch; workflow acceptance is distinct from later re-import completion. The report is recipe-scoped, not a per-step annotation.
