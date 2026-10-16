# Design

## Context

See proposal.md for motivation. This extraction crosses UI staging, multipart/JSON clients, API validation, asset storage, database saves and workflow acceptance. BSL-recipe-capture-021 in the capability plan maps every requirement and scenario to current symbols and inspected assertions.

## Goals / Non-Goals

**Goals:** Preserve the complete existing requirement/scenario blocks while correcting source-inconsistent claims and extracting missing intake constraints.

**Non-Goals:** Application changes, contract repair, guarantee of external acquisition, promotion, archival or runtime qualification. Description's disputed 200/202 is deliberately untouched.

## Decisions

- First observable slice: stage photos in `MinimalCapture` / `useCapture`, serialize via `createRecipe`, bind POST `/api/recipes` in `RecipeController`, validate in `RecipeService.CreateRecipe` / `ValidationService`, save originals and metadata through `ImageService`, persist database state, then request `recipe-import`. Empty/invalid inputs fail before storage; storage/database failures are not atomic. Record this ordering rather than proposing transaction changes.
- URL path: `handleUrlCapture` -> `useCapture.submitUrl` -> `captureUrl` -> POST `/api/recipes/capture-url` -> `RecipeService.CaptureUrl` -> metadata/database -> `TriggerAsync`. Both URL and photo services catch trigger errors. Replace claims of successful queuing with dispatch requests; do not change the response contract.
- Retain identity ownership: `household-identity` requirements `Authenticate protected API requests independently`, `Bind shared API member context independently of membership validation`, and `Attribute initial URL and photo captures to the bound member`. URL binder success is not proof of current member existence. Photo service checks existence separately.
- Retain shared acceptance ownership: `background-processing` requirements `Validate workflow definitions before accepting work` and `Persist initial workflow and task identities before returning`. Intake response is a separate boundary from a successful trigger.
- Web acquisition is conditional: `WebAcquisitionAgent.ProcessUrlAsync` catches 403 and optional image download errors, persists HTML/source after context processing, and lets other failures escape. `RecipeAgent.DoExtractRecipeAsync` validates the final candidate. Keep uncertainty rather than making fallback a recipe-completeness promise.
- Full MODIFIED blocks preserve original scenario names. Added validation concerns stay in a separate requirement. This is evidence reconciliation rather than a new application design.

## Risks / Trade-offs

- Asset writes precede database persistence -> record U62, withhold cross-store rollback and orphan-repair guarantees.
- Promoted text currently overstates delivery -> keep main unchanged and present the corrective delta for human review.
- MIME/size checks are transport validation -> no image decodability or extraction-accuracy guarantee.
- Browser assertions and API fixtures substitute hooks/providers/storage/workflows -> classify source support separately from runtime checks.

## Migration Plan

No deployment or application migration. Human review of this delta is the next lifecycle action; promotion requires separate authorization. Existing promoted deltas remain historical and must not be reapplied over this correction.
