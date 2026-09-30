# LIB-04 — Recipe imagery and provenance: requirements

> Status: **Proposed current-behavior specification**. Behavior-first, accelerated cadence.
> Source: `docs/feature-inventory.md`. This documents observed behavior; it does not authorize implementation.

## Outcome

Members can inspect source evidence and request safe image updates.

## Scope

- Specify the current family-facing **recipe imagery and provenance** behavior and its direct API/state seams.
- Specify observable loading, empty, success, failure, retry, concurrency, navigation, localization, and accessibility behavior.
- Preserve household isolation, active-member attribution, ready/non-deleted eligibility, and unrelated planner/library state.

## Non-goals

- Approving UI, API, schema, ranking, workflow, or persistence changes.
- Defining adjacent capture, planner, identity, or operations features except where this feature hands off to them.
- Treating implementation comments, tests, or this proposed baseline as a product decision.

## Verified baseline

- `pwa/src/components/recipes/OriginalPhotosViewer.tsx`
- `pwa/src/components/recipes/RecipeDetailSheet.tsx`
- `pwa/src/store/uiStore.ts`
- `api/src/RecipeApi/Controllers/RecipeController.cs`
- `pwa/src/lib/imageUtils.ts`

The current OpenAPI authority is `specs/openapi.yaml`; relevant operations are: `GET /api/recipes/{recipeId}/original/{photoIndex}`, `GET /api/recipes/{id}/hero`, `POST /api/recipes/{id}/originals`, `POST /api/recipes/{id}/hero/regenerate`.

## Acceptance criteria

### LIB-04-AC1

When originals exist, detail can open a viewer with bounded paging, zoom, fit-to-screen, close, and image-load failure states.

### LIB-04-AC2

Uploading one supported original associates it with the selected recipe and refreshes image metadata without losing the current detail context.

### LIB-04-AC3

Hero regeneration starts one background operation, returns the member to useful work, and reports progress/outcome through global feedback rather than blocking.

### LIB-04-AC4

Late uploads/regeneration events cannot update another recipe; file constraints, source authorization, accessible viewer controls, and non-image fallback text are enforced.

## Preserved behavior

- Household/member credentials remain required where the current contract requires them; data must not cross household boundaries.
- Unsupported or ineligible records remain excluded rather than made actionable by presentation state.
- Existing routes and unrelated state remain stable on cancellation or failure.
- English and French copy continue through the repository localization layer; no new hard-coded user-facing copy is implied.

## Decisions

- **Derivation:** behavior-first from the inventory, verified current source, OpenAPI, and tests.
- **Cadence:** accelerated; requirements, design, and tasks are delivered together without an approval gate.
- **Baseline:** proposed documentation of current behavior, not approval to preserve every behavior or begin work.

## Open questions

- Product must confirm whether every observed behavior is intended before an implementation packet is authorized.
- Accessibility wording, performance budgets, telemetry retention, and destructive-operation policy require explicit product/security acceptance if changed.
- Any contract divergence found during a future audit must be resolved against approved intent; implementation alone is not authority.
