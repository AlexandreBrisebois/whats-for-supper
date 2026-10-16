# Design

## Context

See proposal.md for motivation. BSL-household-identity-027 traces this slice; BSL-028 reconciles reporting. First observable slice: ordinary capture Save → `MinimalCapture`/`useCapture.submitUrl` → `recipes.ts:captureUrl` → generated captureUrl POST/shared SDK → OpenAPI POST `/api/recipes/capture-url` → `RecipeController.CaptureUrl` → shared binder → `RecipeService.CaptureUrl` → `ImageService.CreateRecipeInfo`/recipe store and `RecipeDbContext.Recipes` save. Photo Save uses `useCapture.submit` → native `createRecipe` fetch → multipart contract → controller/service `CreateRecipe`, with explicit selected-member header; shared binder can independently use a server-readable cookie. Household authentication remains a separate global filter.

## Goals / Non-Goals

**Goals:** Add the missing initial URL/photo submitter attribution rule and reconcile deferred attribution boundaries with existing owners.

**Non-Goals:** No new reporting policy, captured-member display, ownership roles, uniform member validation, exclusive library access, deletion cascades or guarantees about interrupted persistence. No preview policy extraction; PDF is an immediate attribution dependency only.

## Decisions

1. Keep the addition in household-identity because the approved shared owner includes attribution. Recipe-capture retains initial intake/dispatch/readiness rules. Its `Initial recipe creation and workflow dispatch` and `Initial recipe persistence and photo workflow dispatch` describe initial records without defining this attribution; this delta adds only the missing fact.
2. Reuse existing description and PDF intake requirements, sharing `Accept and persist imported recipe bundle into library` ownership (see exact headings in the capability coverage map), and library `Represent persisted recipe attribution and readiness`. Do not copy their scenarios.
3. `RecipeService.CreateRecipe` and `CaptureUrl` both write bound member ID into `RecipeInfo.AddedBy` and `Recipe.AddedBy` before dispatch. The new rule is conditional on an existing member and successful initial writes; it adds no atomic disk/database transaction guarantee. The row's nullable foreign key and SQL/EF SET NULL are not lifetime-retention guarantees.
4. Reporting remains recipe-quality ownership: `RequireRecipeAndMemberAsync` checks existence, not recipe AddedBy or original reporter equality. `PersistAsync` sets ReportedBy/UpdatedBy on create and only UpdatedBy on update. Public issue DTO omits these private IDs. Reporting does not change Recipe.AddedBy. Existing quality requirements already cover those positive rules.

## Risks / Trade-offs

- URL intake and description do not uniformly precheck member existence; photo explicitly checks and PDF checks separately. Real PostgreSQL foreign-key behavior is unqualified. No cross-endpoint invalid-member outcome is drafted.
- Report submission/resolution permit a known member on another member's recipe; `RecipeImportService.GetImportByIdAsync` separately requires recipe AddedBy equality and otherwise yields 404. Its integration test asserts this asymmetry with an existing second member. Preserve U08/U76 as a non-normative limitation, not desired access policy; no new restriction requirement or repair.
- Native photo adapter tests assert ID parsing with substituted fetch, not persisted attribution; photo controller tests assert accepted ID and mocked workflow persistence, not both attribution stores. Description tests explicitly assert DB/store AddedBy but do not qualify URL/photo or PostgreSQL. Keep evidence implementation-supported with medium confidence.
- A34, U19–U28 and member-creation provenance/qualification remain unchanged. No deletion/reassignment or durable member-history policy is implied.

## Migration Plan

None. Documentation extraction only; no deployment, runtime checks, implementation tasks, acceptance, promotion or archival. Human review may later select those actions separately.

## Evidence and status (non-normative)

**Evidence and status (non-normative):**

Draft for human review, implementation-supported only; no acceptance, promotion, archival or runtime qualification. A34 and BSL-household-identity-014–016/U22 remain deferred.

Historical BSL-015 review statement: “However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.” Subsequently the user reported later authorization and promised the original instruction/reference; that reference remains pending. This historical statement is not a product requirement or a new denial of the user-reported authority. No implementation acceptance or runtime qualification is inferred.
