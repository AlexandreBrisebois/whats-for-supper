# Design

## Context

See proposal.md for motivation. This is extraction of existing behavior, with no implementation. A71 selects feature-enabled PDF capture separately from the ordinary-household A09 baseline; A34 qualification stays deferred. Main recipe-capture was counted as 26 requirements/62 scenarios. BSL-recipe-capture-015–019 in the durable plan owns evidence, input hashes, mappings and U70–U74.

## Goals / Non-Goals

**Goals:** describe the first observable slice from enabled PDF selection through accepted pending identity, then conditional processing, completion or recovery. Keep client, contract, persistence, worker and feedback boundaries explicit.

**Non-Goals:** change any executable behavior or contract; promise real provider quality, workflow delivery, device transport, resumption or database qualification. Hero generation is a workflow dependency only. No replacement architecture, migrations or release work.

## Decisions

### Extract eligibility as a PDF-specific condition

`/capture` renders CaptureWithPdf → PdfCapturePanel plus MinimalCapture. MinimalCapture adds PDF to Import recipe file only for the current selected member's resolved enabled snapshot outside GOTO. The same-member focus refresh can stage a validated file while loading; the panel waits and then confirms or explains disabled access. FeatureFlagProvider loads on member change and refreshes on focus; featureFlagStore clears snapshots and rejects stale member responses.

FeatureFlagRegistry owns `preview-pdf-recipe-import` / `WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT`: missing/invalid/off resolves false, opt-in requires the member override, on resolves true. PdfCaptureController independently checks established member and effective enablement before reading the form. Broader Settings flag management and deployment defaults are dependencies, not expanded baseline scope. Treating PDFs as generally available would contradict these gates.

### Separate selection and intake validation from document validation

`validatePdfSelection` checks extension, MIME, nonzero bytes and the inclusive 20 MiB limit. Confirmation shows filename and one-recipe/ten-page guidance; it does not preview rendered pages or detect multiple recipes. Appreciation and notes reuse existing meanings, with zero default and no dish designation or Cancel.

`createPdfRecipe` deliberately uses fetch/FormData rather than the existing Kiota `capturePdf.post` builder. It freezes the selected member into X-Family-Member-Id, posts `/api/recipes/capture-pdf`, maps 400/415 to generic file guidance, 409 to disabled, 413 to size and other non-success statuses to uncertain/duplicate guidance. It accepts only a UUID-shaped data.id. The contract and generated builder describe the same multipart/202 envelope; the browser bypass is an observed seam, not a proposed rewrite.

Controller form parsing enforces one `file`, allowed single rating/notes fields, integer 0–3, type and bytes. Household authentication is an existing host dependency; do not infer that a selected member supplies personal authentication. The 500 MiB request envelope attribute and 20 MiB multipart section limit are different from the file bound; neither becomes a new product size limit.

### Preserve the acceptance/dispatch boundary

PdfCaptureService buffers bounded source bytes, stores fixed `original/source.pdf`, writes recipe.info, then saves Recipe and pending RecipeSearchDocument. Source names are not paths. Initial name is null, pages zero, dish index -1, ready/discoverable false, member/rating/notes retained. It requests recipe-import after persistence and logs/swallow dispatch exceptions. Filesystem and database writes are not one transaction. No durable outbox or automatic orphan recovery is evidenced; withhold those promises.

WorkflowRepository loads stored definitions; WorkflowSeeder copies bundled YAML but catches startup seeding failures. WorkflowOrchestrator validates/substitutes parameters and transactionally persists workflow tasks. Program registers renderer, converter and RecipeAgent/worker. The inspected recipe-import YAML orders ConvertPdf → ExtractRecipe → excluded GenerateHero dependency → SyncRecipe → categorization → RecipeReady → report completion → independent search indexing. Source wiring does not prove deployed definition bytes or task execution.

### Adapt PDF pages to existing extraction and viewing

PdfConversionProcessor reads retained source, skips when absent, serializes conversion and reuses complete numbered originals when metadata and pages exist. Otherwise PdfProcessRenderer invokes the isolated PdfNativeWorker. Native validation rejects corrupt/encrypted PDFs (including empty-password encryption) and page counts outside 1–10 before rendering all pages. PdfRenderLimits.Default fixes 200 DPI, 4096 dimension, 16,777,216 pixels, 64 MiB output, 512 MiB resident and 60-second parent timeout. These are evidence/design details, not new normative configuration promises.

LocalRecipeStore stages numbered PNGs, replaces numbered image files, preserves source.pdf, then conversion writes metadata/count. This is retryable publication with a metadata barrier, not an atomic filesystem/database transaction. File movement can fail partway; no crash-atomic guarantee is claimed. Conversion alone leaves readiness false.

RecipeAgent enumerates numbered image indices using ImageCount and sends every PNG with its actual media type to existing extraction/refinement/semantic validation. Source.pdf is never a model image attachment. SyncRecipe transfers parsed content; RecipeReady sets database ready/discoverable, records PDF metadata IsReady and publishes recipe_ready. Its already-ready path repairs PDF metadata but does not republish an event: no guaranteed notification replay.

Recipe DTOs classify PDF page recipes as photos; existing library detail View Original and OriginalPhotosViewer order sequentially because dish index is -1. ImageService/LocalRecipeStore return numbered image binaries, excluding source.pdf. No new PDF download endpoint. Reuse library viewer rules rather than restating zoom/navigation/dismissal behavior.

### Distinguish foreground draft, accepted work and failure recovery

PdfCaptureStore is memory-only with generation ownership. Hidden visibility, unmount, query/member change or GOTO discards owned selection; replacement guards stop older cleanup deleting newer drafts. A staged browser share can be claimed once, expires, and never implies OS delivery or installation reliability. PdfShareLifecycle discards tokens outside capture; only this entry dependency is inspected.

Confirmation synchronously locks Save and metadata, shows upload guidance, and retains active state on failure. It does not cancel the server request on departure. An accepted response adds session pending tracking; only the still-current draft/member causes reset and immediate Home navigation. This PDF path does not use the existing ten-second queued countdown or inline capture-ready view. useScheduleStream matches pending IDs to LibraryToast or RecipeFailureBanner; no durable notification/reload/event-order guarantee.

Fatal/exhausted worker failure pauses recipe-import and best-effort publishes recipe_failed. CapturesController/CaptureFailureService list paused failed recipe-import instances; SettingsPageContent mounts FailedCapturesSection. Retry resets the failed task and queues it regardless of acquisition flags. Corrupt retained input can fail again. Clear removes the workflow and queues maintenance; conversion-stage unnamed pending residue is removed when maintenance executes. A name-plus-images/discoverability guard protects later-stage content even if IsReady is false, so do not promise unconditional cleanup of every failed PDF. Settings errors remain generic and initial list failure is silently hidden.

## Risks / Trade-offs

- [202 may leave pending work without a workflow; partial disk/DB writes may survive failure] → Record U70, withhold delivery/rollback/recovery guarantees; no repair.
- [Session feedback can be missed; uncertain retry can duplicate] → Record U71; qualify receipt/foreground conditions and distinguish resubmission from task retry.
- [Synthetic tests overstate integration] → BSL-019 records substitutions and unexecuted assertions separately; keep A34 deferred.
- [Clear can preserve later-stage named pages, and failures lack PDF-specific classification] → U72 bounds cleanup to supported conversion failures.
- [Resource/native/device quality differs from source claims] → U73/U74 exclude qualification and transport guarantees. One-recipe guidance is not detection/splitting.

## Migration Plan

Not applicable: documentation draft only. No sync, promotion, archive, deployment, data migration or rollback is performed. Human review is the stopping point.

## Open Questions

U70–U74 are retained limitations and deferred qualification questions, not prerequisites for the supported draft. No unresolved consequential decision is silently selected. Extending the baseline to stronger dispatch, recovery, semantic quality or OS guarantees requires separate evidence and authorization.
