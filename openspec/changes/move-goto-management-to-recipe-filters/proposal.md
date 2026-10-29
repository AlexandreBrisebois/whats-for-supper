# Proposal

## Why

GOTO recipes are currently managed in Settings, apart from the library where people inspect and select recipes. Alex wants GOTO filtering on both Browse and Search without adding another permanent GOTO button to the crowded phone controls.

## Outcome and Scope

Make the configured household GOTO collection filterable on `/browse-all-stack` and `/recipes`. Keep management reachable through their Filters panels, then remove the Family GOTO section from Settings. Browse receives a compact Filters entry below the existing All/Discovery and presentation controls; Search retains its existing Filters entry.

Preserve list replacement, recipe-detail add/remove, pending entries, description/photo acquisition and Home's ready-GOTO selection. Use only the ordinary empty Home pivot without a represented GOTO to explain the GOTO star and lead into unfiltered Browse; return from GOTO capture to Browse management. This increment does not restyle the rest of Settings, redesign Browse navigation, add all Search filters to Browse, change GOTO concurrency/storage, or change recipe readiness, ranking or Discovery policy.

GOTO combines with Browse's All/Discovery selection and Search's existing constraints by intersection. Inactive filtering keeps existing behavior. Filter drafts remain separate from immediately saved management actions. Each page owns its mounted filter state; cross-page persistence is not proposed. The panel composition and shared management disclosure below are proposed implementation defaults within this scope.

## What Changes

- Add a GOTO choice inside Filters on both pages, with a visible active count and an accessible selected state. Add no dedicated GOTO toolbar button.
- Filter on configured household membership at the server before counting, paging or limiting candidates; do not filter only the page already loaded by the browser. GOTO is distinct from Family Favorite and Discovery.
- Make the current GOTO management actions available in a collapsed management disclosure inside both Filters panels, including pending entries and Add a GOTO. Preserve recipe-detail star actions and their save semantics; show a visible GOTO label in both states with readable ochre treatments. Present management as simple rows within the sheet, reusing behaviour rather than the older nested glass-card styling.
- Refresh the mounted GOTO-filtered results after a confirmed local membership change, resetting pagination and rejecting obsolete responses. Pending recipes remain in management, not ready-only recipe results.
- Remove Family GOTO from Settings. Explain go-to meals only on the ordinary empty Home pivot without a represented GOTO, after its initial active read settles. Choose GOTO recipes opens unfiltered Browse. Return from GOTO capture to the new Browse management entry.
- Preserve the current Home cookbook shell, photography, title hierarchy and action palette. Place the short teaching helper below immediate supper choices; retain ready, checking, pending and saved Mystery presentations.
- Preserve equivalent English/French meaning, readable controls, focus/dismissal behavior and phone/iPad reachability, including Browse on short phone viewports.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: GOTO-filtered Browse, filtered totals, collection identity and compact filter access.
- `recipe-search`: effective GOTO hard filter across initial retrieval and continuation, and chooser presentation.
- `tonight-meal-decisions`: relocate GOTO management/setup/return navigation while retaining GOTO list and Home selection ownership.

## Impact

API contract: `specs/openapi.yaml`, GET `/api/recipes` query and POST `/api/recipes/search` filter schema. Regenerate Kiota; update affected DTO/controller, `RecipeService`, shared search predicates/retrieval/continuation and stateful Playwright handlers. Reuse `GoToService` and persisted `family_goto`; no migration or new endpoint is intended.

Frontend owners: Browse page, Search page, `RecipeFiltersSheet`, `FamilyGOTOSettings`, Settings content, GOTO capture return and Home setup links, shared route constants as needed, EN/FR catalogues and focused tests. `RecipeDetailSheet` also owns the bounded visible-label/ochre-state correction; its existing save behavior remains the owner of star actions. `TonightMenuCard`, `TonightCardBase`, `TonightRecipeImage`, global tokens and unrelated recipe-detail controls remain presentation preservation boundaries. Reuse a single management component rather than implementing two copies.

Preserve pre-existing dirty Profile, cooking, recipe-wrapper, locale and spec work. Application implementation, runtime qualification, sync/archive, commit and deployment are outside this planning operation. Implementation acceptance and required commands are defined in tasks.md.
