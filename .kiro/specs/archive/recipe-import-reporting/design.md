# Recipe Import Issue Reporting — Design

## Design summary

Use one dedicated active-report row per recipe. The row is both the current Mom-visible issue and the future Dreaming work queue. Mom sees only `Reported` or `Ready to review`; workflow processing and failure details remain internal. A successful re-import requests human review, and only `Mark as resolved` removes the row.

No report state is denormalized onto `recipes`, and no append-only report-history table is introduced. Dreaming logs will hold durable processing history later.

## UX model

### Status vocabulary

| Internal row state | Public status | Badge | Mom's next action |
|---|---|---|---|
| `reported` | `reported` | Ochre `Reported` | Wait or re-import |
| `reimporting` | `reported` | Ochre `Reported` | No technical status shown |
| `reimport_failed` | `reported` | Ochre `Reported` | Retry or edit the report |
| `ready_to_review` | `readyToReview` | Sage `Ready to review` | Check content, then mark resolved |

The public mapping deliberately collapses internal states. Failure details, workflow IDs, and attempt timestamps never cross the public recipe contract.

### Recipe detail sheet

- Place `Report import issue` in the existing overflow/edit menu for eligible recipes.
- Rename it to `Review import issue` whenever `importIssue` is present.
- Open a compact bottom sheet with Ingredients and Steps multi-select controls.
- Keep `Add a note` collapsed unless an existing note is populated.
- Use `Save` for creation and `Save changes` for update.
- For an existing issue, place `Mark as resolved` below save with helper text `Removes this recipe from Needs review.`
- Use a quiet outlined/check treatment while Reported and a stronger sage treatment when Ready to review.
- After resolution, close the sheet and show `Marked as resolved`.
- Do not add a confirmation dialog or Undo in v1; the action is reversible by reporting again and the existing toast system has no action affordance.

### Cook Mode

- Add a small contextual `Report issue` action next to the Check & Prep heading/edit affordance and next to the active step heading/edit affordance.
- Never place it in the bottom Back/Next control zone.
- Opening from Check & Prep merges Ingredients into the draft reasons.
- Opening from a step merges Steps into the draft reasons.
- Existing reasons and note are copied first, then the contextual reason is added if missing.
- The report sheet is an overlay; opening, saving, or closing it does not reset Cook Mode state.

### Card and filter presentation

- Use shared, non-interactive status badges on `/recipes` and Browse All cards.
- `Reported`: `bg-ochre-50 text-ochre-700` or another verified AA pair.
- `Ready to review`: a verified sage light/dark pair plus a check/flag icon.
- Below `md`, `/recipes` replaces persistent filter pills with one Filters button and bottom sheet containing every existing filter plus Reported and Ready to review.
- At `md` and above, retain the existing inline filters and append both review filters.
- Browse All gains badges only.
- Active review filters suppress the Top Pick region and display all matches as regular results.

## Persistence design

### Table

Add `recipe_import_reports`:

| Column | Type | Notes |
|---|---|---|
| `recipe_id` | uuid PK/FK | References `recipes(id)` with cascade delete; enforces one active row |
| `reasons` | text[] | Nonempty; unique values from `ingredients`, `steps` |
| `note` | varchar(500), nullable | Trimmed; blank becomes null |
| `status` | text | `reported`, `reimporting`, `reimport_failed`, `ready_to_review` |
| `reported_by` | uuid, nullable FK | Original reporter; set null on family-member deletion |
| `updated_by` | uuid, nullable FK | Latest Mom updater; set null on deletion |
| `created_at` | timestamptz | UTC creation time |
| `updated_at` | timestamptz | UTC last mutation time |
| `last_workflow_instance_id` | uuid, nullable | Intentionally no FK so workflow pruning cannot break queue state |
| `last_attempt_at` | timestamptz, nullable | UTC attempt start |
| `reimported_at` | timestamptz, nullable | UTC latest successful matching re-import |
| `last_error` | varchar(2000), nullable | Internal-only bounded diagnostic summary |

Database checks constrain allowed/unique reasons, nonempty arrays, and allowed status values. The primary key supports status projection via a direct lookup or `EXISTS`; an index on `status` supports queue and Ready-to-review filtering.

### Lifecycle invariants

1. PUT performs an atomic upsert keyed by `recipe_id`.
2. A material reasons/note change sets `reported` and clears the linked workflow ID and attempt-result fields. This invalidates an in-flight completion that no longer corresponds to the revised issue. An identical save preserves status.
3. Starting a re-import updates the row only if it exists: set `reimporting`, store the new instance ID and attempt time, and clear `last_error` and `reimported_at`.
4. Terminal workflow updates use `recipe_id` plus matching `last_workflow_instance_id`; stale completions are ignored.
5. Success sets `ready_to_review`, `reimported_at`, and clears `last_error`.
6. Failure sets `reimport_failed`, retains the report, and stores a bounded diagnostic summary.
7. DELETE removes the active row. It is idempotent when the row is absent.

## Contract design

### Existing drift repair

Before client generation, add the existing `healthyOnly` nullable boolean to OpenAPI's `RecipeSearchFiltersDto`. Keep its current C# and UI behavior unchanged and add generation/drift regression coverage.

### Schemas

Add:

```yaml
RecipeImportIssueReason:
  type: string
  enum: [ingredients, steps]

RecipeImportIssueStatus:
  type: string
  enum: [reported, readyToReview]

RecipeImportIssueRequest:
  type: object
  required: [reasons]
  properties:
    reasons:
      type: array
      minItems: 1
      uniqueItems: true
      items:
        $ref: '#/components/schemas/RecipeImportIssueReason'
    note:
      type: string
      nullable: true
      maxLength: 500

RecipeImportIssueDto:
  type: object
  required: [reasons, status]
  properties:
    reasons: ...
    note: ...
    status:
      $ref: '#/components/schemas/RecipeImportIssueStatus'
```

Extend:

- `RecipeDto.importIssue`: nullable `RecipeImportIssueDto`.
- `RecipeSearchResultDto.importIssueStatus`: nullable `RecipeImportIssueStatus`; search cards do not need reasons or note.
- `RecipeSearchFiltersDto.reportedOnly`: nullable boolean.
- `RecipeSearchFiltersDto.readyToReviewOnly`: nullable boolean.
- `RecipeSearchFiltersDto.healthyOnly`: nullable boolean drift repair.

Filter semantics:

- `reportedOnly=true`: any active report, including ready.
- `readyToReviewOnly=true`: internal state `ready_to_review` only.
- both true: ready subset.

### Endpoints

`PUT /api/recipes/{id}/import-report`

- Body: `RecipeImportIssueRequest`.
- Atomically creates or updates the active row.
- Returns `200 RecipeDetailResponse` with authoritative `importIssue`.
- Returns existing auth/not-found errors, `400` validation errors, and `409` when the recipe cannot be re-imported.
- Mark the endpoint with the project's skip-wrapping convention so generated and runtime response shapes agree.

`DELETE /api/recipes/{id}/import-report`

- Idempotently removes the active row.
- Returns `200 RecipeDetailResponse` with `importIssue: null`.
- Uses existing auth/not-found behavior.
- Uses the skip-wrapping convention.

OpenAPI SHALL include high-fidelity examples for one reason, both reasons with a note, updated status, resolved response, and each feature-specific error.

### Public/private boundary

The API mapping function converts `ready_to_review` to `readyToReview` and every other existing row to `reported`. It never serializes internal status names, reporter IDs, updater IDs, workflow instance ID, attempt timestamps, re-import timestamp, or `last_error`.

## API and service design

### Report service

Introduce a bounded report service/repository that owns:

- eligibility validation via existing `canReimport` rules;
- normalization and atomic upsert;
- idempotent delete;
- public projection;
- attempt-start transition;
- matching success/failure transition.

Routes remain thin and use the existing current-family-member mechanism. Database constraints are the final duplicate safeguard.

### Recipe reads and search

- Recipe detail loads the optional active row and maps the public issue DTO.
- Search projects only public `importIssueStatus`.
- Reported/ready predicates compose with text, category, Healthy, and other existing filters.
- Recommendation eligibility adds `NOT EXISTS` for the active report row across Top Pick, Feeling Lucky, and agent selection.
- Ordinary results do not exclude active reports.
- When either review filter is active, the search response sets Top Pick to null and returns all matches through regular results.

## Workflow integration

### Attempt start

After the import orchestrator creates a workflow instance for a manual photo or URL re-import, the import service calls the report service with recipe ID and workflow instance ID. The transition is a no-op when no active report exists.

### Success

Append a dedicated final report-transition processor to only the photo and URL import workflows, after recipe persistence/readiness succeeds. It calls the report service with recipe ID and the current workflow instance ID. The match guard prevents older attempts from changing a newer report attempt.

### Failure

At the worker's terminal-failure boundary for the photo and URL import workflows, call the same report service with:

- recipe ID from workflow context;
- current workflow instance ID;
- failed step identifier;
- bounded/sanitized error summary.

Failure recording must not replace or mask the workflow's existing error handling. Stored error text is for internal operations and Dreaming logs only.

### Manual UI refresh

The existing import status endpoint/service must find both photo and URL import workflows by recipe ID. After manual re-import begins, Recipe Detail polls that existing status at the app's current interval until success/failure, then refetches recipe detail. No global real-time invalidation or new SSE channel is required in v1.

### Future Dreaming use

Dreaming can later select active rows in `reported` or `reimport_failed`, trigger the same re-import entry point, and rely on the same lifecycle transitions. On success it leaves the row ready for Mom. Dreaming records durable attempts/results in its own logs; it does not need a reporting-history table.

## Component design

### Shared UI pieces

- `RecipeImportIssueSheet`: controlled draft reasons/note; create/update/resolve modes.
- `RecipeImportIssueBadge`: maps only the two public statuses to accessible tokens/copy.
- `RecipeFiltersSheet`: mobile wrapper for all current `/recipes` filters plus review filters.
- Existing recipe detail and Cook Mode components own entry-point placement and pass context.

Keep report draft state local to the sheet. On save/delete, replace the owning recipe data with the returned authoritative response. Do not make a new global store.

### State merge algorithm

```text
draftReasons = copy(existingIssue?.reasons ?? [])
draftNote = existingIssue?.note ?? null
if contextualReason is present and absent:
    append contextualReason
```

The algorithm runs when opening the sheet, not when rendering Cook Mode, so no background mutation occurs.

## Seam inventory

| Seam | Producer | Contract | Consumers | Verification |
|---|---|---|---|---|
| Database active report | EF migration/model | One row per recipe with lifecycle checks | Report service, search | Migration and repository integration tests |
| Report API | Recipe routes | OpenAPI PUT/DELETE and public DTOs | Generated client, detail/Cook UI | OpenAPI validation, contract tests, generated-client typecheck |
| Recipe read projection | Report service | `importIssue` or null | Recipe detail | API integration and component tests |
| Search projection/filter | Search service | Public status + two filters | `/recipes`, Browse cards | Search/recommendation integration tests |
| Attempt start | Import service | Recipe ID + workflow instance ID | Active report lifecycle | Service integration tests |
| Workflow terminal result | Photo/URL workflows and worker | Matching instance guarded transition | Report row, future Dreaming | Workflow processor/worker tests |
| Mobile filters | `/recipes` page | Draft/apply/cancel query state | Search endpoint | Responsive component and E2E tests |
| Healthy drift repair | OpenAPI | `healthyOnly` parity | Generated client and `/recipes` | Generation/drift regression test |

## Failure handling

- Invalid/empty/duplicate reasons: `400`, inline sheet validation where possible.
- Note over 500 characters: prevent submit and return `400` server-side.
- Ineligible recipe: `409`, keep sheet state and show existing error toast style.
- Save/resolve network failure: keep sheet open and draft intact.
- Re-import failure: workflow keeps normal failure behavior; public report stays `Reported`; internal row receives diagnostics.
- Stale workflow completion: no-op and retain newer attempt state.
- Missing row during workflow transition: no-op.

## Testing strategy

### Contract and generation

- OpenAPI validates and examples match runtime envelopes.
- Generated PWA client exposes report endpoints/types, both review filters, and `healthyOnly`.
- Contract drift test fails if the search DTO loses existing fields.

### API/database

- Create, update, both reasons, note normalization/bounds, authorization, eligibility, and idempotent delete.
- Unique row under concurrent upserts.
- Public status collapsing and private-field non-serialization.
- Reported/ready filtering, filter composition, Top Pick suppression, and recommendation exclusion.
- Cascade deletion and nullable reporter/updater behavior.

### Workflow

- Attempt-start no-op without report.
- Photo and URL success set ready only for matching instance.
- Failure retains row, stores bounded diagnostics, and maps publicly to Reported.
- Older success/failure cannot overwrite a newer attempt.
- Non-import workflows do not mutate reports.
- Status lookup covers both photo and URL imports.

### PWA

- Detail create/update/prepopulation/validation/resolve.
- Cook Mode context merge and state preservation.
- Accessible badge text/colors and menu labels.
- Mobile filter-sheet draft/apply/cancel/clear behavior; desktop filter parity.
- Browse badges without filter controls.
- Terminal manual re-import refetches detail and shows Ready to review.

### E2E

- Report Ingredients, add Steps/note, re-import successfully, review, resolve.
- Contextual Cook Mode reporting preserves cooking state.
- Failed import remains Reported without showing diagnostics.
- Report filters return regular results with no Top Pick.
- Active reports never appear through Feeling Lucky.

## Out of scope

- Building or scheduling the Dreaming queue processor.
- User-visible workflow diagnostics or import error details.
- Report history, analytics, moderation, or administrative dashboards.
- Undo toast actions.
- Browse All review filters.
- Global real-time status broadcasting.
