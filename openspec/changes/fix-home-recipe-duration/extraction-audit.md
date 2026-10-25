# Read-only extraction and history audit

Source baseline: ba8dca21c83000d03ce03dbe51bd7542daa76b88. No model, provider, production or household data was accessed. The screenshot's deployed SHA and stored recipe payload remain unknown.

## Prompt and persistence paths

| Entry | Source and duration policy |
| --- | --- |
| Photo | RecipeAgent.DoExtractRecipeAsync selects Prompts/extract-recipe.md; Time converts to ISO 8601, template totalTime PT35M; extract only visible source content |
| PDF | recipe-import.yaml ConvertPdf precedes ExtractRecipe; PdfConversionProcessor renders pages to the same photo extraction path; no separate PDF duration prompt |
| Link | url-import.yaml runs web acquisition then extraction; RecipeAgent selects extract-web-recipe.md when HTML exists; Time converts to ISO 8601, totalTime template permits null |
| User description / concept | RecipeAgent.DoSynthesizeRecipeAsync selects synthesize-recipe.md; ISO 8601 totalTime, infer time if unstated (existing synthesis semantics) |
| Generated prose description | generate-description.md returns only descriptive prose; DoGenerateDescriptionAsync updates description, not totalTime; this is distinct from concept synthesis |

Paths above are under api/src/RecipeApi. EmbeddedPromptRepository maps PromptType to those embedded prompt files. Refinement's fallback prompt in RecipeAgent also requests ISO 8601 totalTime. No current instruction forces all durations into minutes or changes six hours into six minutes. Minute-only ISO examples are valid examples, not a requirement to ignore hours. Inference in synthesis is distinct from extraction fidelity and is unchanged.

SchemaOrgRecipe.TotalTime is a nullable string. RecipeExtractionParser.ParseAndNormalize normalizes instruction shapes; semantic completeness checks name, ingredients and usable instruction text, not duration syntax or truth. RecipeAgent serializes that object to recipe JSON. SyncRecipeProcessor copies nonblank recipeData.TotalTime directly to Recipe.TotalTime; synthesis also copies a nonblank value into recipe.info. ScheduleService, RecipeService's ordinary DTO projection, planner normalization and todayStore preserve that raw string. No duration-unit rewrite was found in this ordinary extraction-to-display path.

OpenAPI totalTime fields are strings/nullable strings without a duration pattern. There is no separate prepTime/cookTime field in the current recipe model or PWA rendering contract. The obsolete prepTime example in OpenAPI search response documentation is a source inconsistency, outside this display fix. Cooking instruction timers are a separate concept.

RecipeService's portable sharing path converts totalTime to integer minutes and imports those minutes as PT{minutes}M. Valid PT6H converts to 360 minutes, preserving duration. Its permissive non-ISO fallback, like the frontend fallback, is a separate parser-policy concern. Search metadata parses duration for filtering/ranking; it is not this rendering handoff and was not changed.

## History and reproducibility

- cb7919c7738ab864eef65dba2388ab62fc1196b1 (2026-05-14 01:19:59 UTC) added formatRecipeTime to TonightMenuCard. Its parent 84b892e50d980bc93b7cc3553d47ebe0bce59570 displayed the supplied prepTime directly while Home already called formatTotalTime. This introduced the double-format display path. e9ee3698 later renamed prepTime to totalTime; the earlier name did not make it preparation-only data.
- Earliest repository prompt versions inspected: 907aacb3 (May 2) photo and synthesis already require ISO 8601; 0c6be002 (May 6 UTC) web prompt already requires ISO 8601. Current prompts retain that duration policy. No extraction duration-unit regression was demonstrated by this history review; this is not proof about every possible historical model output.
- An isolated /tmp console project compiled the unchanged RecipeExtractionParser, SchemaOrgRecipe and JsonDefaults source files. Eight synthetic cases PT6H, PT1H30M, PT45M, PT360M, null, empty, 6h and not-a-duration all retained their exact totalTime and were semantically complete when name/ingredients/instructions were present. This demonstrates missing duration validation; it does not demonstrate corrupted persisted data. No AI or persistence was involved.
- Real Home/card/formatter/locale composition reproduced PT6H → 6 MINS and PT1H30M → 1 MINS in EN and FR before the fix. Minute-only ISO cases were already correct. After passing raw duration, the same tests retain hours.

## Blast radius and separate decisions

This shared Home rendering path can mislabel hour-containing durations for any recipe using that path, regardless of capture origin. Other raw-duration surfaces are not subject to this double formatting. PT360M happened to survive the old two-step path, while PT6H did not. The rendering defect does not mutate stored recipes and is not evidence that every recipe is wrong, or that every recipe is correct.

Stored duration accuracy cannot be established without the original source, payload and extraction evidence. No household data sampling was authorized or performed. Validation or extraction-semantic changes, migrations and reimports require a separate decision.

The existing TonightMenuCard missing-time default is 30-45 mins, which the current shared formatter renders as 30 MINS. Home previously selected that default for missing/null/empty values; the fix retains it. Its invented estimate and the shared non-ISO parser's hour-string behavior remain adjacent policy issues, not silently repaired here.
