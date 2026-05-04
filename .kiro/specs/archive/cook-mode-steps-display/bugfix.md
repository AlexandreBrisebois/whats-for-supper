# Bugfix Requirements Document

## Introduction

In Cook's Mode, recipe steps are never displayed — only the ingredients screen (step 0) is shown. This affects recipes launched from both the home page and the planner. The root cause is that `parseRecipeSteps` in `stepParser.ts` receives the unwrapped `recipeInstructions` value from the API, but the function's TypeScript signature only accepts `string[] | Array<{ name?: string; text?: string }>`. When the actual data is a schema.org `HowToSection[]` array (with nested `itemListElement` arrays of `HowToStep` objects), the runtime type-guard `isHowToSection` should match — but the function signature mismatch means TypeScript callers may pass the wrong shape, and the `any`-cast in `mapToRecipe` means the actual runtime value may not be what `parseRecipeSteps` expects. The result is that `parseRecipeSteps` returns an empty array, `getFallbackSteps()` is used, and the user sees only generic placeholder steps — never the real recipe instructions.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a recipe's `recipeInstructions` field contains a `HowToSection[]` array (schema.org JSON-LD with nested `itemListElement` arrays of `HowToStep` objects) THEN the system returns an empty steps array from `parseRecipeSteps` and falls back to generic placeholder steps

1.2 WHEN Cook's Mode is opened for any recipe stored with the schema.org `HowToSection` / `HowToStep` structure THEN the system displays only the ingredients screen (step 0) followed by generic fallback steps, never showing the actual recipe instructions

1.3 WHEN `parseRecipeSteps` is called with a `HowToSection[]` value that was unwrapped from a Kiota `UntypedNode` THEN the system fails to recognise the `HowToSection` structure and returns `[]`

### Expected Behavior (Correct)

2.1 WHEN a recipe's `recipeInstructions` field contains a `HowToSection[]` array THEN the system SHALL parse all nested `HowToStep` entries and return a non-empty `CookingStep[]` array

2.2 WHEN Cook's Mode is opened for a recipe with `HowToSection` / `HowToStep` instructions THEN the system SHALL display the actual recipe steps (one per `HowToStep` text value) after the ingredients screen

2.3 WHEN `parseRecipeSteps` is called with a `HowToSection[]` value THEN the system SHALL correctly identify the `HowToSection` structure via `isHowToSection` and iterate over each section's `itemListElement` to produce steps

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a recipe's `recipeInstructions` field is a flat `string[]` THEN the system SHALL CONTINUE TO parse each string as an individual step

3.2 WHEN a recipe's `recipeInstructions` field is a flat `HowToStep[]` array (objects with `name` and `text` but no `itemListElement`) THEN the system SHALL CONTINUE TO parse each object as an individual step

3.3 WHEN `recipeInstructions` is `undefined`, `null`, or an empty array THEN the system SHALL CONTINUE TO return an empty array from `parseRecipeSteps`, triggering the fallback steps in Cook's Mode

3.4 WHEN Cook's Mode is opened and `parseRecipeSteps` returns a non-empty array THEN the system SHALL CONTINUE TO display the ingredients on step 0 and the parsed steps on subsequent steps
