# Design

## Context

See `proposal.md` for baseline extraction motivation and scope. What's for Supper supports recipe sharing across household boundaries through portable recipe bundles. The implementation consists of an export workflow triggered from the recipe detail sheet and an import workflow hosted on the capture screen.

The relevant source architecture spans:
- Loaded Detail UI: `RecipeDetailSheet.tsx` manages Share button visibility, loading toasts, and error reporting; `ActionGearMenu.tsx` hosts edit, report, and delete actions while keeping Share in the visible action bar.
- Client Sharing Transport: `pwa/src/lib/api/recipes.ts` defines `getRecipeShareBundle`, `importRecipeShareBundle`, `createRecipeBundleFile`, `downloadRecipeBundleFile`, and `parseRecipeBundleFile`.
- API Controller: `RecipeController.cs` exposes `GET /api/recipes/{id}/share` and `POST /api/recipes/import-bundle`, binding member context via `FamilyMemberIdModelBinder`.
- Service Layer: `RecipeService.cs` implements `ExportRecipeShareBundle` and `ImportRecipeShareBundle`, handling field projection, privacy scrubbing, version checking, payload validation, image decoding, and persistence.
- Persistence and Asset Storage: `RecipeDbContext` manages the `Recipe` table, `LocalRecipeStore` saves hero and original image files on disk, and `ImageService` creates the `recipe.info` sidecar metadata.
- Import Intake UI: `MinimalCapture.tsx` provides the file input, preview card (`bundle-preview-card`), duplicate advisory warning (`duplicate-recipe-warning`), and import success screen (`bundle-import-success`).

## Goals / Non-Goals

**Goals:**
- Document the exact observable contracts and boundaries for recipe export bundle generation, privacy scrubbing, native share / download fallback, file intake, client schema validation, preview rendering, advisory duplicate warning, and library import acceptance.
- Reconcile actual source behavior against OpenAPI specifications and existing integration / browser test assertions.
- Identify behavioral boundaries and discrepancies (such as file naming vs MIME types, version tolerances, and collision resolution) without modifying application code or repairing defects.

**Non-Goals:**
- No application code, test, contract, client, or database changes.
- No expansion into recipe web capture, photo capture synthesis, hero image generation, meal planning, cooking, or grocery shopping.
- No runtime execution or database qualification (deferred under A34; implementation-supported extraction under A10).
- No promotion or archival of this change during this session.

## Decisions

### 1. Model recipe-sharing as a distinct top-level capability rather than an extension of recipe-library
- **Rationale**: `recipe-sharing` is one of the 17 approved capability paths in the baseline plan (A04). It governs cross-household portable recipe exchange, bundle schema validation, and transport mechanisms, whereas `recipe-library` owns the storage and maintenance of recipes within a single household.
- **Alternatives considered**: Adding sharing to `recipe-library`. Rejected because the approved architecture explicitly distinguishes recipe-sharing from library maintenance.

### 2. Privacy scrubbing enforcement at the service projection boundary
- **Rationale**: In `RecipeService.ExportRecipeShareBundle`, `Notes` and `Rating` are explicitly set to `null`, `AddedBy` is omitted from the bundle DTO, and internal IDs are kept in `info.recipeId` rather than on the portable recipe entity. This ensures household-private annotations never leak to recipients.
- **Alternatives considered**: Scrubbing on the client before saving. Rejected because the server API must guarantee data privacy regardless of which client calls the endpoint.

### 3. Native share with transparent download fallback
- **Rationale**: `downloadRecipeBundleFile` checks `navigator.canShare({ files: [file] })`. If supported, it invokes `navigator.share`. If the user aborts (`AbortError`), it returns silently. If sharing fails with another error or is unsupported, it falls back to creating a blob URL and triggering a synthetic anchor click.
- **Alternatives considered**: Offering explicit separate "Share" and "Download" buttons. Rejected because the application provides a single Share button that adapts to device capabilities.

### 4. Client duplicate detection as advisory warning rather than blocking restriction
- **Rationale**: When a bundle is previewed in `MinimalCapture.tsx`, the client checks for existing recipes matching the bundle's `info.recipeId` or `recipe.name`. If found, it renders `duplicate-recipe-warning` with a "View existing recipe" button. The user is still permitted to activate "Import recipe". On the backend, if `info.recipeId` already exists, `RecipeService.ImportRecipeShareBundle` assigns a new `Guid.NewGuid()` and creates a separate recipe entity.
- **Alternatives considered**: Rejecting duplicate imports on the server with 409 Conflict. Rejected because the existing implementation explicitly permits importing duplicates by generating a new UUID.

### 5. Synchronous ready state upon bundle import without SSE or background processing
- **Rationale**: Unlike photo or URL capture workflows that enqueue background orchestrations and broadcast SSE `recipe_ready` events, bundle import creates a fully synthesized, ready recipe (`IsReady = true`) synchronously in `ImportRecipeShareBundle` and immediately returns 201 Created.
- **Alternatives considered**: Documenting background workflow states for bundle import. Rejected because traced source demonstrates direct database and disk storage without workflow queueing.

## Risks / Trade-offs

- [Risk: File extension vs MIME type mismatch (U53)] → The export function produces `.txt` files with `text/plain` MIME types, while error copy mentions `.recipe file` and test fixtures use `.recipe`.
  - *Mitigation*: Document this discrepancy as a non-normative limitation without altering file extensions or error strings.
- [Risk: Server vs client bundle version divergence (U54)] → Server strictly rejects versions other than `"1.0"`, while client accepts any string version and test fixtures use `"1.1"`.
  - *Mitigation*: Record server 1.0 enforcement in normative API requirements and note the client/fixture tolerance in the non-normative uncertainty register.
- [Risk: Substituted test behavior (U10)] → E2E tests mock the share endpoint and file downloads, and API tests use in-memory databases and substituted image stores.
  - *Mitigation*: Trace concrete source paths and mark behaviors as implementation-supported (A10) rather than runtime-verified, keeping runtime qualification deferred (A34).

## Historical extraction evidence relocated for OpenSpec 1.14.2

The following non-normative material was moved from this change’s delta preamble to satisfy the upgraded validator. Requirement/scenario blocks and main specifications are unchanged by this relocation. Earlier draft/lifecycle statements remain historical; later recorded authorizations still govern. Relative links retain their original targets.

## Evidence and status (non-normative)

Documentation-only draft under A62, backed by BSL-recipe-sharing-001–003 in the [durable plan](../../../../docs/openspec-baseline-plan.md). Evidence is implementation-supported under A10; runtime browser/API/database checks are not-run and qualification remains deferred under A34. This draft is not accepted or promoted.

Household-identity owns access and member context. Reuse its existing requirements “Gate protected page entry with household access”, “Apply member context after household access”, and “Authenticate protected API requests independently”. Recipe-library owns recipe lifecycle, detail sheet presentation, readiness status, soft-deletion exclusion, and entity persistence. Background-processing is not invoked for bundle import: bundle import synchronously creates a ready recipe without queued workflow execution. Real-time live update broadcasts (SSE) are omitted during bundle import.

U53–U57 remain non-normative under the confirmed boundary:
- U53: Export creates a plain-text `.txt` file containing JSON with MIME type `text/plain` and the file picker accepts `.txt,text/plain`, while parser error messages cite `.recipe file` and test fixtures use `.recipe`.
- U54: Server strictly requires `Version == "1.0"` and rejects other versions with 400 Bad Request, while client parser accepts any string version and test fixtures use `"1.1"`.
- U55: Native sharing availability depends on browser environment and `navigator.canShare`; user abort (`AbortError`) suppresses error feedback and download, whereas non-abort share failures fall back to direct file download.
- U56: Duplicate detection is client-side advisory feedback only; the backend permits duplicate recipe names and allocates a new UUID when an imported bundle ID collides with an existing entity.
- U57: Bundle import synchronously writes database records and image assets without broadcasting real-time SSE updates to other connected household clients.

Historical member-creation limitation retained under BSL-015/U22:

> However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.

That sentence records the earlier review state. The user's report of later authorization remains recorded; its original reference is pending. It is not a recipe-sharing requirement, new lifecycle approval or runtime result.
