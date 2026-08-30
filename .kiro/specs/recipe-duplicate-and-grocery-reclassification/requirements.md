# Requirements: Duplicate Recipe Reporting and Grocery Reclassification Repair

## Vision

Give a family two trustworthy correction paths: report that a recipe duplicates another recipe without pretending re-import can fix it, and move a grocery item to the right store section with immediate visible confirmation. Both paths must persist through the existing contract and database seams without adding history, merge tooling, or new background workflows.

## Product decisions

1. `duplicate` is the third structured recipe report reason beside `ingredients` and `steps`.
2. Reasons remain a unique, non-empty set. `duplicate` may be selected alone or together with either existing reason.
3. Duplicate reporting is available for every recipe, including recipes where `canReimport` is false. `ingredients` and `steps` remain available only when `canReimport` is true.
4. A duplicate-only report never participates in the re-import lifecycle.
5. A mixed report may re-import to repair its content reasons. If `duplicate` remains selected when the matching attempt succeeds, the public report returns to `Reported`, not `Ready to review`.
6. Duplicate resolution remains manual through the existing `Mark as resolved` action or existing recipe deletion. Finding, merging, or automatically deleting the matching recipe is out of scope.
7. Grocery reclassification uses the existing `PATCH /api/ingredients/{normalizedKey}/category` contract. No new endpoint or database column is required.
8. After the PATCH succeeds, the selected grocery item moves immediately in the currently loaded PWA list. The server remains authoritative and a later schedule snapshot may reconcile the optimistic section.
9. A failed grocery PATCH leaves the item in its original section, keeps the picker usable, and exposes an item-specific error.

## Acceptance-criteria index

### DR-1 — Contract and persistence accept `duplicate`

1. `RecipeImportIssueReason` in `specs/openapi.yaml` SHALL contain exactly `ingredients`, `steps`, and `duplicate`.
2. OpenAPI request/response examples SHALL include duplicate-only and mixed examples.
3. `api/database/schema.sql`, `api/database/compatibility.sql`, and the EF check-constraint definition in `RecipeDbContext` SHALL allow each reason at most once and reject empty, unknown, or duplicate values.
4. `compatibility.sql` SHALL replace an already-installed two-reason constraint even when it already contains `array_positions`; constraint detection SHALL be based on whether `duplicate` is absent, not on the older migration shape alone.
5. Static schema-integrity tests SHALL prove all three SQL/EF authorities contain the same allowed values and uniqueness behavior.

### DR-2 — Conditional reporting eligibility

1. Any existing recipe SHALL accept a report whose normalized reason set is exactly `[duplicate]` even when `canReimport` is false.
2. A recipe where `canReimport` is false SHALL reject any report containing `ingredients` or `steps`, including a mixed set with `duplicate`, using the existing ineligible response path.
3. Recipes where `canReimport` is true SHALL accept every non-empty unique subset of the three reasons.
4. Backend validation errors and UI validation copy SHALL name all valid reasons without exposing implementation details.

### DR-3 — Report UI and accessibility

1. Recipe detail SHALL expose `Report issue` or `Review issue` for every recipe, rather than hiding the action solely because `canReimport` is false.
2. The shared issue sheet SHALL render a `Duplicate` choice with `data-testid="import-issue-reason-duplicate"`.
3. For `canReimport=false`, `Ingredients` and `Steps` SHALL be absent or disabled with accessible explanatory text; `Duplicate` SHALL remain operable.
4. Cook Mode contextual actions SHALL remain limited to `ingredients` and `steps`; no duplicate action SHALL be added to cooking controls.
5. Existing report draft retention, focus trap, Escape handling, optional 500-character note, save failure behavior, and manual resolution behavior SHALL remain unchanged.
6. The reason controls SHALL remain one-thumb operable with at least a 44px target and SHALL use selected state text/iconography in addition to color.

### DR-4 — Re-import lifecycle

1. Starting manual or automated re-import for a duplicate-only report SHALL leave status, workflow linkage, attempt timestamps, and error fields unchanged.
2. A mixed report containing `duplicate` and at least one content reason MAY enter `reimporting` and `reimport_failed` through the existing matching-instance guards.
3. Successful completion of a matching mixed report SHALL set internal/public status back to `reported`, set `reimported_at`, clear `last_error`, and retain all reasons.
4. Successful completion of a report containing only `ingredients` and/or `steps` SHALL preserve the existing `ready_to_review` behavior.
5. Stale workflow completion, missing reports, and non-import workflows SHALL remain no-ops.
6. Active reports containing `duplicate` SHALL remain excluded from promoted and automatic recommendation paths under the existing active-report rule.

### DR-5 — Generated client, mocks, backup, and restore parity

1. Kiota-generated `RecipeImportIssueReasonObject` SHALL include `Duplicate` and retain `Ingredients` and `Steps`.
2. The hand-written PWA mapping/draft types SHALL consume the generated enum without a parallel string union.
3. `pwa/e2e/mock-api.ts` SHALL accept, persist, and return duplicate-only and mixed reason arrays.
4. Backup/export and restore/import paths SHALL round-trip `duplicate` without filtering, rewriting, or failing database constraints.
5. Contract, schema, generated-client, mock, API integration, management backup/restore, component, and E2E tests SHALL include duplicate coverage.

### GR-1 — Confirm and lock the grocery regression

1. A failing component regression test SHALL first prove that selecting a new category after a successful PATCH does not currently move the item in the rendered list.
2. The investigation SHALL preserve the observed boundary: `handleReclassify` closes the picker after `204` but does not update `weekStore.groceryItems`; `grocery_updated` SSE currently carries only check-state and cannot refresh sections.
3. The implementation SHALL not change the PATCH route, request DTO, ingredient-category table, or recompute algorithm unless the red test or a focused API test disproves that boundary.

### GR-2 — Immediate visible reclassification

1. After a successful PATCH, the matching item SHALL move from its old section to the selected section without reload, tab switching, or waiting for SSE.
2. The update SHALL be keyed by `normalizedKey`, not `displayName` or array position.
3. All other item fields, checked state, order within unaffected sections, and current week selection SHALL be preserved.
4. If moving the last item empties its old section, that section SHALL disappear. The destination section SHALL appear and remain expanded by default unless it was already collapsed.
5. Re-selecting the current section SHALL be a successful no-op with no duplicate item.
6. A later authoritative schedule snapshot SHALL replace the optimistic grocery items normally.

### GR-3 — Failure, concurrency, and interaction safety

1. The PWA SHALL update locally only after a successful HTTP response; no rollback race is required.
2. On HTTP/network failure, the item SHALL remain in its original section, an item-specific error SHALL appear, and the user SHALL be able to reopen the picker and retry.
3. While one selection is pending, repeated selections for that item SHALL be disabled to prevent out-of-order responses.
4. Reclassification SHALL not toggle the grocery checkbox or collapse the aisle.
5. Tests SHALL use unique `data-testid` anchors plus `data-item-name` where repeated rows require item scoping; E2E SHALL use only `page.getByTestId(...)` locators.

## Glossary

- **Content reason:** `ingredients` or `steps`; a problem that re-import may repair.
- **Duplicate reason:** `duplicate`; the recipe represents the same dish/source as another recipe and requires human cleanup.
- **Duplicate-only report:** A report whose normalized reasons equal `[duplicate]`.
- **Mixed report:** A report containing `duplicate` and at least one content reason.
- **Active report:** The single `recipe_import_reports` row for a recipe, regardless of its internal lifecycle status.
- **Optimistic section:** The client-side section written after a successful PATCH and before the next authoritative schedule snapshot.

## Out of scope

- Duplicate detection, similarity search, linking two duplicate recipes, merging data, or automatic deletion.
- Report history, new statuses, new tables, or a separate duplicate-report endpoint.
- A new grocery SSE event or expansion of `grocery_updated` payloads.
- Grocery bulk reclassification, undo history, or aisle configuration changes.
- Visual redesign of the report sheet or grocery list.
