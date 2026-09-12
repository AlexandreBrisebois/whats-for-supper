# Requirements: Contextual Recipe Re-import Feedback

## Vision

Make **Report issue** the only repair entry point in recipe detail. A parent states what is wrong once; the system saves the report and deterministically decides whether it must be reviewed manually or may start a focused re-import.

## Product decisions

1. `Reimport Recipe` is removed from the recipe-detail gear menu. `Report issue` / `Review issue` remains.
2. The report sheet retains one visible completion action: `Save`. It does not ask the parent to choose whether to re-import.
3. A report starts a contextual re-import only when all of these are true:
   - the recipe is re-importable;
   - its normalized reasons contain `ingredients` and/or `steps`;
   - its normalized reasons do **not** contain `duplicate`; and
   - its trimmed optional note is non-empty.
4. A duplicate-containing report is always saved for manual review and never starts a re-import, including a mixed `duplicate` + content-reason report with a note.
5. A content-only report with no note is saved for review and never starts a re-import.
6. When an eligible report starts a re-import, the exact normalized content reasons and trimmed note are snapshotted on that workflow instance. Later edits to the report cannot alter an in-flight agent's instructions.
7. After reviewing a completed re-import, a parent may add or change feedback and press the same `Save` action. A further contextual re-import starts only when the normalized content reasons and/or trimmed note differ from the snapshot of the most recent contextual attempt.
8. Reopening a report or saving feedback identical to the latest contextual-attempt snapshot SHALL save/review only and SHALL NOT start another workflow.
9. The extraction agent uses the snapshot to focus its review. The original photos/HTML and output schema remain authoritative; user feedback cannot instruct the agent to invent facts or change its operating rules.
10. Existing report statuses and duplicate lifecycle semantics remain unchanged. A re-import started under this feature follows the existing matching-workflow completion path.
11. A completed contextual re-import SHALL retain the existing durable `readyToReview` status and render it to parents as `Reimported — review changes` on recipe detail and recipe cards. The review filter remains the compact category label `Ready to review`. No database, OpenAPI enum, or lifecycle-status rename is required.
12. When the PWA polls a contextual re-import, it SHALL use its returned workflow `importId`, never the latest workflow for a recipe. Recipe detail owns that polling and durable outcome presentation; Cook Mode does not start a second polling loop.
13. In the single-active-API-process deployment, snapshot comparison, report persistence, workflow creation, and attempt marking SHALL execute under the existing server-side exclusive per-recipe operation. This feature does not add cross-replica locking, an outbox, or durable idempotency.
14. A repeated submission of the same normalized feedback while its matching contextual workflow is pending or processing SHALL return that existing workflow ID and SHALL NOT create another workflow.
15. While a contextual re-import is active, the report sheet SHALL disable Save and Mark as resolved and communicate that re-import is in progress. Editing, resolving, and a subsequent attempt resume only after the workflow reaches a terminal state. For this parent flow, `completed`, `failed`, and `paused` are terminal; a failed or paused workflow clears `isReimporting` rather than leaving the sheet locked.

## Acceptance criteria

### CRF-1 — One intentional entry point

1. The gear menu SHALL never render `Reimport Recipe`.
2. The gear menu SHALL continue to render `Report issue` or `Review issue` under the existing eligibility rules.
3. Existing Edit and Move to Bin behavior SHALL remain unchanged.

### CRF-2 — Save derives the next action

1. Saving a duplicate-only report SHALL persist the report and SHALL NOT create a re-import workflow.
2. Saving a report containing `duplicate` with any other reason or note SHALL persist the report and SHALL NOT create a re-import workflow.
3. Saving `ingredients` and/or `steps` with a blank/whitespace-only note SHALL persist the report and SHALL NOT create a re-import workflow.
4. Saving `ingredients` and/or `steps` with a non-empty trimmed note for a re-importable recipe SHALL persist the report and start exactly one contextual re-import.
5. A non-reimportable recipe SHALL never start a contextual re-import.
6. A first eligible content-only report SHALL start a contextual re-import because no previous contextual-attempt snapshot exists.
7. After a contextual attempt, changing the normalized content reasons and/or trimmed note SHALL start exactly one further contextual re-import.
8. Saving the same normalized content reasons and trimmed note as the latest contextual-attempt snapshot SHALL save/review only and SHALL NOT start another workflow.
9. If workflow start fails, the saved report, reasons, and note SHALL remain available for review; the UI SHALL show an actionable error and SHALL NOT claim that re-import started. When a started contextual workflow reaches `failed` or `paused`, its report SHALL no longer be re-importing, the UI SHALL refresh and unlock, and a parent may amend feedback before another attempt. Identical feedback remains review-only and never retries automatically.
10. The command response SHALL expose `reimportStarted` to mean that a contextual re-import is active for this submission, whether it was newly created or safely reused. It SHALL include `importId` exactly when `reimportStarted=true`.
11. A duplicate concurrent submission of an active feedback snapshot SHALL return `reimportStarted=true` and the already-created `importId`; it SHALL NOT create a second workflow.

### CRF-3 — Immutable agent feedback

1. The contextual workflow snapshot SHALL include only normalized `ingredients`/`steps` reasons and the trimmed note; `duplicate` is never sent to the extraction agent as repair work.
2. Both image and URL re-import workflows SHALL pass the same snapshot to `ExtractRecipe`.
3. For `ingredients`, the agent SHALL re-check source artifacts for omissions, quantities, units, and ingredient fidelity.
4. For `steps`, the agent SHALL re-check source artifacts for completeness, ordering, times, temperatures, and instruction fidelity.
5. The note SHALL be supplied as clearly delimited, untrusted parent feedback that narrows attention but cannot override source artifacts, JSON/schema requirements, or safety instructions.
6. A normal import and every manual-review-only report SHALL run without contextual feedback.

### CRF-4 — Workflow identity and active interaction safety

1. The API SHALL expose `GET /api/recipe-imports/{importId}` for a contextual workflow's status. It SHALL validate that the workflow belongs to a recipe accessible to the current family context.
2. `GET /api/recipes/{id}/import` SHALL be retired with the user-facing POST import trigger; when the PWA polls, it SHALL use the ID-addressable status route exclusively.
3. The public active-report representation SHALL expose an `isReimporting` boolean so a newly loaded recipe detail can lock the report controls while its workflow is active without changing existing report-filter status values.
4. A Save or resolve attempt while `isReimporting=true` SHALL be unavailable in the UI and rejected by the server without mutating the report, except that an in-flight duplicate submission of the same feedback snapshot SHALL follow CRF-2.11 and return the existing workflow ID. On a failed or paused workflow, the server-side lifecycle transition SHALL make `isReimporting=false` before the refreshed detail is returned to the parent.

## Contracts & routes

- Replace `PUT /api/recipes/{id}/import-report` with `POST /api/recipes/{id}/import-report` as the sole report-submission command. It requires the existing `RecipeImportIssueRequest` body and family-member header.
- The command applies CRF-2 server-side and returns `RecipeImportReportSubmissionResponseDto`: updated recipe detail, `reimportStarted` when a newly created or reused contextual re-import is active, and its `importId` only in that case.
- Retire user-facing `POST /api/recipes/{id}/import`; there is no compatibility path or unfocused manual re-import.
- Add `GET /api/recipe-imports/{importId}` for workflow-specific polling; retire `GET /api/recipes/{id}/import` with the old trigger.
- Existing report DELETE and generated-client parity remain in scope for regression only.

## Out of scope

- A confirmation dialog, undo, retry queue, new report statuses, or a new table.
- Re-importing any duplicate-containing report.
- Feeding free-text feedback into hero generation, categorization, or unrelated agents.
- Changing the existing report reason controls, note limit, draft retention, focus trap, or manual resolution flow.

## Notes / decisions

- 2026-08-30: Remove direct gear-menu re-import; Report issue is the contextual entry point.
- 2026-08-30: Save auto-reimports only content-only reports with a non-blank note.
- 2026-08-30: Duplicate is always manual review, including mixed reports.
- Verification allocation: API/service tests cover the complete eligibility, snapshot, reuse, and failure matrix; E2E covers the representative parent-visible journeys only.
