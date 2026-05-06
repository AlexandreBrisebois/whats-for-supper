# Requirements Document

## Introduction

The `url-import-html-capture` feature changes how the `url-import` workflow stores and uses raw HTML during recipe capture. Currently, `WebAcquisitionAgent` embeds the full HTML inside `recipe.json` as a `rawHtml` property, and `RecipeAgent` always uses the photo-tuned `RecipeExtraction` prompt regardless of source. This creates an oversized `recipe.json`, couples the extraction prompt to the wrong input modality for web-sourced recipes, and prevents future reuse of the captured HTML.

The change saves the raw HTML to `original/content.html` as a first-class artifact alongside downloaded images, removes `rawHtml` from `recipe.json`, and teaches `RecipeAgent` to select the correct extraction prompt based on what artifacts are present on disk.

## Glossary

- **WebAcquisitionAgent**: The `IWorkflowProcessor` registered as `FetchUrlContent` that fetches a URL, extracts context via AI, downloads the hero image, and writes initial recipe artifacts.
- **RecipeAgent**: The `IWorkflowProcessor` registered as `ExtractRecipe` (among others) that reads recipe artifacts and calls an AI model to produce a structured `recipe.json`.
- **RecipeRepository**: The domain repository responsible for all file I/O under `{recipesRoot}/{recipeId}/`.
- **EmbeddedPromptRepository**: Loads AI prompt text from `.md` files embedded in the assembly.
- **PromptType**: The enum that identifies which prompt to load.
- **content.html**: The file `original/content.html` within a recipe's artifact directory, containing the raw HTML of the source webpage.
- **RecipeExtraction prompt**: The existing `extract-recipe.md` prompt, tuned for extracting recipes from photo/image inputs.
- **WebRecipeExtraction prompt**: The new `extract-web-recipe.md` prompt, tuned for extracting recipes from HTML, prioritising JSON-LD and Schema.org microdata.
- **Schema.org/Recipe**: The JSON output schema shared by both extraction prompts, conforming to the Schema.org Recipe type.
- **original/ directory**: The subdirectory `{recipesRoot}/{recipeId}/original/` that holds all raw source artifacts (images and HTML) for a recipe.

---

## Requirements

### Requirement 1: Save HTML as a File Artifact

**User Story:** As the system, I want the raw HTML of a recipe webpage saved to disk as `original/content.html`, so that downstream processors can read it directly without inflating `recipe.json`.

#### Acceptance Criteria

1. WHEN `WebAcquisitionAgent` successfully fetches HTML from a URL, THE `WebAcquisitionAgent` SHALL write the full HTML string to `original/content.html` via `RecipeRepository.SaveContentHtmlAsync`.
2. WHEN `WebAcquisitionAgent` writes recipe artifacts, THE `WebAcquisitionAgent` SHALL NOT include a `rawHtml` property in `recipe.json`.
3. WHEN `WebAcquisitionAgent` writes recipe artifacts, THE `WebAcquisitionAgent` SHALL write `original/content.html` before the `ExtractRecipe` task is eligible to run.
4. THE `RecipeRepository` SHALL expose a `SaveContentHtmlAsync(Guid recipeId, string html, CancellationToken ct)` method that persists the HTML to `{recipeId}/original/content.html`.
5. THE `RecipeRepository` SHALL expose a `GetContentHtmlAsync(Guid recipeId, CancellationToken ct)` method that returns the HTML string from `{recipeId}/original/content.html`, or `null` if the file does not exist.

---

### Requirement 2: Prompt Selection Based on Available Artifacts

**User Story:** As the system, I want `RecipeAgent` to choose the extraction prompt based on which source artifacts exist on disk, so that web-sourced recipes use an HTML-aware prompt and photo-sourced recipes continue to use the image-tuned prompt.

#### Acceptance Criteria

1. WHEN `RecipeAgent` executes `ExtractRecipe` and `original/content.html` exists for the recipe, THE `RecipeAgent` SHALL use the `WebRecipeExtraction` prompt.
2. WHEN `RecipeAgent` executes `ExtractRecipe` and `original/content.html` does not exist but image files exist in `original/`, THE `RecipeAgent` SHALL use the `RecipeExtraction` prompt.
3. WHEN `RecipeAgent` executes `ExtractRecipe` and neither `original/content.html` nor any image files exist, THE `RecipeAgent` SHALL log a warning and return without writing `recipe.json`.
4. THE `RecipeAgent` SHALL NOT require any changes to `url-import.yaml` or `recipe-import.yaml` to implement this behaviour.

---

### Requirement 3: WebRecipeExtraction Prompt

**User Story:** As the system, I want an HTML-aware extraction prompt that prioritises structured data already embedded in recipe pages, so that extraction is more accurate and less dependent on AI inference.

#### Acceptance Criteria

1. THE `WebRecipeExtraction` prompt SHALL instruct the model to first look for `<script type="application/ld+json">` blocks and extract a Recipe object if one is present.
2. WHEN no JSON-LD Recipe block is found, THE `WebRecipeExtraction` prompt SHALL instruct the model to look for Schema.org microdata (`itemtype` containing `schema.org/Recipe`).
3. WHEN neither JSON-LD nor microdata is found, THE `WebRecipeExtraction` prompt SHALL instruct the model to fall back to semantic HTML parsing (headings, lists, and structured sections).
4. THE `WebRecipeExtraction` prompt SHALL produce output that conforms to the same Schema.org/Recipe JSON schema as the `RecipeExtraction` prompt (identical field names, types, and structure).
5. THE `WebRecipeExtraction` prompt SHALL preserve the original language of the recipe content without translation.

---

### Requirement 4: PromptType and EmbeddedPromptRepository Registration

**User Story:** As a developer, I want `WebRecipeExtraction` registered as a first-class prompt type, so that it is loaded at startup and fails fast if the resource is missing.

#### Acceptance Criteria

1. THE `PromptType` enum SHALL include a `WebRecipeExtraction` value.
2. THE `EmbeddedPromptRepository` SHALL map `PromptType.WebRecipeExtraction` to the embedded resource `RecipeApi.Prompts.extract-web-recipe.md`.
3. WHEN the application starts, THE `EmbeddedPromptRepository` SHALL load `extract-web-recipe.md` and throw `FileNotFoundException` if the embedded resource is absent.

---

### Requirement 5: recipe.json Does Not Contain rawHtml

**User Story:** As a developer, I want `recipe.json` to contain only structured recipe data, so that the file remains small and its schema is predictable.

#### Acceptance Criteria

1. AFTER `WebAcquisitionAgent` completes for any URL import, THE `recipe.json` file SHALL NOT contain a `rawHtml` property.
2. AFTER `RecipeAgent` completes `ExtractRecipe` for any URL import, THE `recipe.json` file SHALL NOT contain a `rawHtml` property.
3. THE `RecipeAgent` SHALL NOT read a `rawHtml` property from `recipe.json` when determining extraction inputs.

---

### Requirement 6: Consistent Output Schema Across Both Prompts

**User Story:** As a developer, I want both extraction prompts to produce the same JSON structure, so that all downstream processors (GenerateHero, SyncRecipe, etc.) work identically regardless of how the recipe was captured.

#### Acceptance Criteria

1. FOR ALL recipes extracted via `WebRecipeExtraction`, THE `recipe.json` SHALL conform to the Schema.org/Recipe structure defined in `extract-recipe.md` (fields: `@context`, `@type`, `languageCode`, `name`, `recipeYield`, `totalTime`, `recipeIngredient`, `supply`, `recipeInstructions`, `nutrition`).
2. FOR ALL recipes extracted via `RecipeExtraction`, THE `recipe.json` SHALL conform to the same Schema.org/Recipe structure.
3. WHEN a field is not available in the source, THE extraction prompt SHALL set that field to `null` rather than omitting it.

---

### Requirement 7: Round-Trip Integrity of HTML Artifact

**User Story:** As a developer, I want the HTML saved to `original/content.html` to be byte-for-byte identical to what was fetched from the URL, so that no data is lost between capture and extraction.

#### Acceptance Criteria

1. WHEN `RecipeRepository.SaveContentHtmlAsync` is called with an HTML string, THE `RecipeRepository` SHALL persist the string using UTF-8 encoding without modification.
2. WHEN `RecipeRepository.GetContentHtmlAsync` is called for a recipe that has a saved `content.html`, THE `RecipeRepository` SHALL return a string equal to the string originally passed to `SaveContentHtmlAsync`.
