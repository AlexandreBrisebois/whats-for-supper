# Design

## Context and Existing Ownership

The scope is defined in proposal.md. The user confirmed a dedicated database column and explicitly excluded recipe.info.

Original implementation baseline (the completed extraction slice is recorded in evidence.md):

- `api/src/RecipeApi/Prompts/extract-recipe.md` already requests `recipeYield`, selects the smallest serving column, and later requests the yield verbatim. “Smallest” and “left-most” currently appear as equivalent, which fails for reversed columns.
- `Models/SchemaOrgRecipe.cs` already has string RecipeYield. `RecipeAgent.DoExtractRecipeAsync` normalizes and saves that value in recipe.json; its info write updates the name. Do not extend that info write with yield/count data.
- `Services/Processors/SyncRecipeProcessor.cs` decodes raw versus exported content and writes ingredients and raw metadata to the recipe row, but does not project yield. `Infrastructure/RecipeExportContent.cs` owns the version-1 envelope boundary.
- `Models/Recipe.cs`, `Data/RecipeDbContext.cs` and `api/database/schema.sql` own database representation. Schema deployment uses sqldef through `api/database/migrate.sh` and compatibility.sql, rather than introducing an EF migration workflow.
- `RecipeService` maps database records to RecipeDto. `specs/openapi.yaml` owns its public shape; PWA `src/lib/api/recipes.ts` maps the generated DTO to Recipe.
- `RecipeDetailSheet.tsx` renders a standalone Ingredients h3 above the ingredient list/edit fields, separate from Ready In metadata; locale resources live under `pwa/src/locales/en` and `fr`.
- `ManagementService` serializes database recipe envelopes and restores supported fields. `RecoverySnapshotService` captures table data and checks schema compatibility for exact restore.

Visual inspection of each supplied original/1.jpg agrees with existing stored metadata:

| Recipe directory ID | Evidence | Expected count and unchanged quantities |
| --- | --- | --- |
| 6f0a0897-9066-4cf4-89ed-f78750311432 | Cook it utensil headings for 2 and 3 | 2; 360 g chicken, 500 g potatoes |
| 6fe2e84a-b531-4cae-85e0-e8877db99930 | “2 ou 4”, “Double pour 4 portions” | 2; 2 chicken breasts, 225 g Brussels sprouts |
| 7f823333-47c3-4dd3-ab85-6ff649477b5e | Explicit “Portions: 4” | 4; 510 g beef, 340 g pasta |

This is source and image evidence, not a new provider execution or runtime qualification.

## Decisions and Tradeoffs

1. **Keep the existing yield text; project a numeric count on the server.** Add nullable `int Servings` mapped to `recipes.servings`, with a positive-or-null database constraint and no default. Add nullable integer `servings` with minimum 1 to RecipeDto in OpenAPI. Keep SchemaOrgRecipe.RecipeYield and raw metadata intact. Do not add another provider-output count field or any RecipeInfo field. A string column could represent arbitrary yields but would leave every consumer interpreting serving counts; numeric servings serves the requested display while raw yield preserves the original text.

2. **One conservative parser owns serving interpretation.** Introduce a small pure server helper used by disk sync, legacy restore and backfill. Accept a complete, case-insensitive serving expression: positive integer plus `portion`, `portions`, `serving`, `servings`, `personne`, `personnes`, `person`, or `people`, and the English form `serves N`. Trim surrounding whitespace. Reject alternatives, ranges, bare quantities, fractional counts, numeric overflow and non-serving units such as muffins or grams. Missing, malformed or non-string yield data returns null. Do not extract the first digit sequence or guess from ingredient mass. Explicitly test this finite grammar; extending language coverage later does not justify a broad number heuristic now.

3. **Project alongside the content being saved.** On extraction sync, decode the actual raw recipe object (including exported envelopes where applicable), derive the count, and save RawMetadata, Ingredients and Servings in the same database save. An unresolved new yield clears the old projection. The helper does not modify source JSON. Preserve the existing extraction completeness rule; a missing yield is not a new capture failure. Optional non-string yield handling must be tolerant at the extraction parser boundary without weakening validation of name, ingredients or steps.

4. **Clarify the prompt without expanding extraction.** Resolve the conflicting yield instructions into one selected-basis rule. Describe countable serving symbols, choose the smallest explicitly labelled count rather than assuming leftmost, retain a single four-serving card as four, and use an explicit base/doubling note. Never scale ingredient quantities. Unknown yields use null; visible unresolved alternatives remain text. Existing web and synthesis prompt policies are outside this change; their compatible stored serving-yield text can use the same projection.

5. **Backfill through an explicit bounded workflow.** Reuse the established keyset-pagination pattern in BackfillVegetarianClassificationProcessor, adding a deterministic `recipe-servings-backfill` workflow/processor registered through existing DI and triggered through POST /api/workflows/{workflowId}/trigger. No new endpoint, cron job, UI or AI dispatch is needed. Include retained soft-deleted rows so recovery does not lose their projection. Update only null counts whose source metadata still equals the value read; skip changed rows for a later pass. Emit counts, not recipe contents. A repeated trigger is safe. Deployment may invoke it after schema rollout; this planning turn does not trigger it on live data.

6. **Allow a bounded manual correction through existing recipe editing.** Extend the existing PATCH /api/recipes/{id} update contract with optional positive integer `servings` (maximum 2147483647). Omission preserves the stored value, including null; supplied null, zero, negative, fractional, overflow and wrong-type values are invalid. This increment supports adding/correcting a count, not clearing a known count. Reuse existing authorization, save/error handling and recipe update ownership. Update OpenAPI first, regenerate Kiota, then synchronize the PWA update consumer and method-sensitive PATCH/GET mock state. Persist manual counts in the dedicated column without rewriting raw recipeYield, ingredients or RecipeInfo. Existing export freshness behavior must include this edit. No new provenance column, provider call or workflow is needed.

## First Observable Slice

Use the radiatore example as the tracer bullet: test provider output with recipeYield “4 portions” at the IChatClient boundary, run the real extraction normalization and disk store, synchronize into PostgreSQL, read GET /api/recipes/{id}, map through the generated Kiota client, and display “4 servings” immediately beside the Ingredients title in RecipeDetailSheet. Assert 510 g beef and 340 g pasta remain unchanged and that info acquires no serving/yield fields.

The first slice includes schema, DTO contract/client, real HTTP/database integration, API mapping, UI/locales and mock detail reads. Provider doubles establish transport and application behavior only. Separate recorded runs against the three originals establish actual image-reading behavior; static prompt assertions cannot establish that.

The manual-edit increment starts with a recipe whose raw yield says “4 portions”: edit its count to 3, save via PATCH, then reload through real HTTP/PostgreSQL and the generated client and observe “3 servings”. Repeat from null to 2. Verify cancellation, invalid input and failed-save recovery alongside this path before expanding recovery acceptance.

## State, Concurrency and Recovery

The database count is initially a projection associated with the stored content and becomes authoritative for manual edits and current exports. Ordinary recipe updates that omit servings preserve it. A deliberate new extraction replaces the ingredient basis and derives the count anew, including clearing an unresolved yield, under the existing extraction rules; editing a count does not rewrite that source evidence. A successful sync updates content and count together; failure before the database save leaves the old row. Existing workflow retry can re-read disk and repeat safely. No additional file transaction is introduced because recipe.info does not acquire this fact.

Backfill uses conditional database updates checking null servings and unchanged raw metadata. A racing extraction must not receive a count calculated from older content. Cancellation or interruption retains already committed batches; another explicit run can fill eligible remaining rows. Backfill never runs implicitly during detail reads or exact restore.

## Persistence and Side Effects

Current generic recipe export serialization naturally includes the new column in recipe.json. Extend RecipeExportContent to distinguish a missing legacy servings member from an explicit null; validate present values as null or positive integers. Management restore and disk sync share that decoding. A present value is retained exactly, including null; an absent value uses the common parser on decoded raw metadata. No duplicate yield fields or serving data are written to recipe.info, and no new sidecar is introduced.

Manually saved counts may differ from raw yield: current envelope sync/merge restore must honor the saved count, and exact restore must retain it directly. Backfill preserves known manual counts, including when it races a manual save; acceptance must exercise that existing conditional-write boundary.

Exact recovery already exports full table rows and uses schema fingerprints. Verify the new column round-trips rather than redesigning recovery or silently accepting old exact schemas. Preserve the existing whole-record load-error behavior for malformed current envelopes.

## Compatibility, Rollout and Reversal

Deploy the nullable column and check constraint through the existing declarative schema/compatibility path before application code references them. Fresh and populated databases must both work; backfill is a separate resumable data step after schema readiness. No destructive data rewrite is required. Existing recipes without recognized yield remain usable with null servings; old clients ignore the additive DTO field.

Current export envelopes remain version 1 with an additive optional field, while legacy absent-field parsing remains supported. Compatible exact snapshots preserve values; old schema fingerprints remain incompatible under existing preflight rules. Rolling application code back can leave the additive column in place; dropping it would lose the projection and requires a separate operator decision. Raw recipeYield remains available for rebuilding it.

Recipe sharing keeps its existing behavior and is outside this slice. Do not expand imported share handling or change the existing optional share servings field as incidental cleanup.

## User Experience

Place a quiet serving badge immediately after the Ingredients title, where people can relate the count to the quantities they are about to read. Keep the existing Ingredients h3 and include the localized count as a child span so its accessible name includes both title and count. Do not duplicate it in the Ready In metadata row.

Proposed appearance, using existing component/token patterns:

```text
INGREDIENTS   [4 servings]
INGRÉDIENTS   [4 portions]
```

Retain the title's existing visual treatment. Give the count sentence-case text at approximately 12 CSS px, medium weight and normal tracking, a subtle charcoal/5 background with charcoal/80 text, rounded-full corners and compact padding. Use an approximately 8 CSS px gap; keep the badge adjacent to the title rather than pushed to the section's far edge. No icon, shadow, hover treatment or button role is needed. Verify the actual token/background pairing achieves at least 4.5:1 text contrast during implementation; adjust to a stronger existing text token if needed.

Allow the heading to wrap, with the complete badge moving beneath the title when space is constrained; keep it inside the ingredient section at both one- and two-column sheet layouts. Do not truncate either label. Verify 320 CSS px, 200% text size, English and French. The badge uses “1 serving” / “N servings” or “1 portion” / “N portions” through existing locale interpolation/plural patterns.

Omit the viewing badge when unknown. Keep the badge noninteractive; edit mode additionally provides a labeled input near the Ingredients heading using existing form controls and the existing Save/Cancel flow. Prefill a known count; show a blank field for null without inventing a default. An untouched blank for null omits servings from PATCH. A known count cannot be cleared in this increment; an empty replacement is invalid. The viewing badge reflects the last successfully saved count, not an unsaved draft. Editing never scales ingredient quantities. Existing loading and error states do not show a stale badge from another recipe. This is a proposed treatment grounded in current source patterns; rendered layout, contrast and interaction checks remain implementation acceptance.

PWA uses the server count and does not parse yield, inspect ingredients or infer a household-sized default. Retain existing identity/lifecycle guards so previous servings cannot leak into another recipe's pending, failed or unknown detail.

Use visible labels “Servings” / “Portions” and validation copy “Enter a whole number from 1 to 2147483647.” / “Saisissez un nombre entier de 1 à 2147483647.” Associate the label and error with the input and expose invalid state through the existing form accessibility pattern. Keep numeric input keyboard operation and existing focus behavior; the input is an intentional edit-mode focus stop. Do not rely on HTML input attributes alone for API validation. Keep the field, error and actions usable at 320 CSS px, 200% text size and both sheet layouts without truncation or horizontal scrolling. Cancel restores saved state; failed saves retain the draft and existing error/retry flow. Reset drafts and validation on recipe identity changes, and preserve loading/stale-response guards.

## Revision Evidence Boundary

The original read-only implementation and its 12 completed tasks remain historical evidence. The edit-mode “no input/no focus stop” expectations are superseded by this revision; they cannot establish editable-servings acceptance. New editing tasks remain unchecked until their own deterministic, real persistence/HTTP, browser and recovery checks pass. The extraction prompt is unchanged by this revision, so the recorded provider qualification remains separate and is not new evidence for editing. No application changes or live data operations are performed by this specification update.
