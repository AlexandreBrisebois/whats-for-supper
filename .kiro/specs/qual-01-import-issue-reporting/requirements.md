# QUAL-01 — Import issue reporting requirements

## Status

**Implemented capability baseline.**

## Outcome

A member can create, revise, or resolve one recipe-scoped import issue using ingredients, steps, or duplicate reasons.

## Implemented behavior

- **QUAL-01-R1.** Recipe detail and Cook's Mode open `RecipeImportIssueSheet`; it supports the three reasons, an optional note, accessible dialog/focus handling, and disables content reasons when `canReimport` is false.
- **QUAL-01-R2.** Duplicate is mutually exclusive with ingredients/steps. Save POSTs `{ reasons, note }` to `/api/recipes/{id}/import-report`; the response contains authoritative recipe detail and re-import outcome. Resolve DELETEs that route and receives detail with `importIssue` cleared.
- **QUAL-01-R3.** `RecipeImportReportService` validates the family-member header, recipe/member existence, allowed/unique reasons, optional note length (500), and content-report eligibility. It upserts one `RecipeImportReports` row per recipe with reporter/update identity and timestamps.
- **QUAL-01-R4.** Active re-import locks sheet edits/resolution; route conflicts are returned as `409`. Save/resolve retain the draft and show safe generic retry copy on client failure.

## Boundaries and limitations

QUAL-02 owns conditional contextual re-import; CAP-06/CAP-07 own capture/import failure flows, and PLAT-02 owns generic workflow execution. The report is recipe-scoped rather than per-step. UI copy and support-ID controls are hard-coded English. The process-local recipe lock does not coordinate replicas, and no UI automatically refreshes a report changed on another device.
