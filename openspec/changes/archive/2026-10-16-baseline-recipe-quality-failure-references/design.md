# Design

## Context

See proposal.md. BSL-recipe-quality-018 in `docs/openspec-baseline/recipe-quality.md` records evidence, qualifications and complete mapping. First observable slice: matching worker failure → RecipeImportReportService.MarkFailedAsync → persisted linked status/error → ToPublicDto safe message/failed import ID → detail response/generated DTO/recipes.ts → detail or cooking issue-sheet props → Copy import ID → navigator.clipboard.writeText → copiedId and timeout. Upstream failure persistence is conditional and already specified; the addition owns only the connected controls.

## Goals / Non-Goals

**Goals:** Expose evidenced local support-reference behavior without broadening failure, access or repair guarantees.

**Non-Goals:** Add clipboard permissions/error recovery, expose raw diagnostics, cancel work or qualify browser/device clipboard support.

## Decisions

1. Reuse existing failure projection. ToPublicDto returns the safe message and LastWorkflowInstanceId only for ReimportFailed. recipes.ts maps nullable fields; RecipeDetailSheet and CooksMode supply recipe ID and failure props. No new endpoint or server state transition is involved. Alternative: repeat the guarded failure requirement; rejected as overlap.
2. Describe nested visibility exactly. RecipeImportIssueSheet renders controls inside reimportFailureMessage and reimportFailureImportId branches; the recipe control additionally needs recipeId. copyId awaits clipboard.writeText before setting copiedId and scheduling a 1500 ms reset. Alternative: guarantee timed visibility or cross-copy ordering; withheld because each success schedules its own uncancelled timer.
3. Clipboard rejection has no catch, dedicated error or fallback in this handler; it cannot produce that call's success state. Do not invent recovery or make clipboard availability normative. The shared sheet tests, detail tests and recipe-import-reporting browser tests have no clipboard assertions; this is source-supported only.

## Risks / Trade-offs

- [Clipboard unavailable, denied or delayed] → Record missing qualification and absence of dedicated recovery outside normative text; successful-path scenarios are conditional.
- [Overlapping timers or dismissal] → No once-only, persistent acknowledgement, cancellation or ordering guarantee. A copy does not submit or mutate a report.
- [Failure record may never be delivered] → Preserve U78 and A34; no guarantee that every failed worker produces visible controls.

## Migration Plan

None. Documentation-only draft for human review; no promotion or archival.

## Open Questions

None blocking extraction. Clipboard/environment/error-path qualification is deferred, without a new product-policy decision.
