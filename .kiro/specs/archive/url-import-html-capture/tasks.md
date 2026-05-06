# Implementation Plan: url-import-html-capture

## Overview

Contract-first implementation: data layer and prompt infrastructure are built and tested before agent logic is touched. The key invariant is that `recipe.json` never contains `rawHtml` after this change — `WebAcquisitionAgent` writes `original/content.html` instead, and `RecipeAgent` selects its extraction prompt based solely on which artifacts exist on disk.

## Tasks

- [x] 1. Add `SaveContentHtmlAsync` and `GetContentHtmlAsync` to `RecipeRepository`
  - Add `SaveContentHtmlAsync(Guid recipeId, string html, CancellationToken ct)` — writes UTF-8 bytes to `{recipeId}/original/content.html` via `IStorageProvider`
  - Add `GetContentHtmlAsync(Guid recipeId, CancellationToken ct)` — reads bytes from `{recipeId}/original/content.html`, decodes as UTF-8, returns `null` if `storage.LoadAsync` returns `null`
  - No BOM, no transformation — raw UTF-8 round-trip
  - File: `api/src/RecipeApi/Services/RecipeRepository.cs`
  - _Requirements: 1.4, 1.5, 7.1, 7.2_

- [x] 2. Add `WebRecipeExtraction` to `PromptType` and register it in `EmbeddedPromptRepository`
  - [x] 2.1 Add `WebRecipeExtraction` value to the `PromptType` enum
    - File: `api/src/RecipeApi/Services/PromptType.cs`
    - _Requirements: 4.1_

  - [x] 2.2 Add mapping `{ PromptType.WebRecipeExtraction, "RecipeApi.Prompts.extract-web-recipe.md" }` to `_resourceNames` in `EmbeddedPromptRepository`
    - The constructor preloads all mapped prompts — if the `.md` file is absent the constructor throws `FileNotFoundException` at startup (fail-fast)
    - File: `api/src/RecipeApi/Services/EmbeddedPromptRepository.cs`
    - _Requirements: 4.2, 4.3_

  - [x] 2.3 Create `api/src/RecipeApi/Prompts/extract-web-recipe.md` with the prompt content specified in the design document
    - The existing glob `<EmbeddedResource Include="src/RecipeApi/Prompts/*.md">` in `RecipeApi.csproj` already covers this file — no csproj change needed
    - Prompt must include: JSON-LD first, microdata second, semantic HTML fallback; language-lock rule; null for missing fields; identical schema template as `extract-recipe.md`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Write tests for `RecipeRepository` HTML methods
  - Create `api/src/RecipeApi.Tests/Services/RecipeRepositoryHtmlTests.cs`
  - Unit test: `SaveContentHtmlAsync` writes to path `{recipeId}/original/content.html`
  - Unit test: `GetContentHtmlAsync` returns `null` when file does not exist
  - Unit test: `GetContentHtmlAsync` returns the saved string when file exists

  - [x] 3.1 Write property test for HTML round-trip integrity (PBT 1)
    - `// Feature: url-import-html-capture, Property 1: HTML round-trip integrity`
    - For any non-null string (including Unicode, empty, `<>&`, multi-line, up to 200 000 chars): `SaveContentHtmlAsync` then `GetContentHtmlAsync` returns the identical string
    - Use `FsCheck.Xunit` `[Property]` attribute; minimum 100 iterations
    - **Property 1: HTML round-trip integrity**
    - **Validates: Requirements 7.1, 7.2, 1.4, 1.5**

- [x] 4. Write tests for `EmbeddedPromptRepository` and `extract-web-recipe.md`
  - Create `api/src/RecipeApi.Tests/Services/EmbeddedPromptRepositoryWebRecipeTests.cs`
  - Unit test: constructing `EmbeddedPromptRepository` loads `WebRecipeExtraction` without throwing
  - Unit test: `GetPrompt(PromptType.WebRecipeExtraction)` returns non-empty string
  - Unit test: prompt text contains `application/ld+json` (JSON-LD instruction)
  - Unit test: prompt text contains `schema.org/Recipe` (microdata instruction)
  - Unit test: prompt text contains language preservation instruction (e.g., `languageCode`)
  - Unit test: prompt text instructs `null` for missing fields
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.2, 4.3_

- [x] 5. Checkpoint — data layer and prompt infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update `WebAcquisitionAgent.ProcessUrlAsync` — replace step 5
  - Remove: the `metadata = new { Name, SourceUrl, RawHtml = html }` block and the `SaveRecipeJsonAsync` call
  - Add: `await recipeRepository.SaveContentHtmlAsync(recipeId, html, ct)` after the hero image download block
  - Add: read `info` (already in scope), set `info.SourceUrl = url`, call `await recipeRepository.SaveInfoAsync(info, ct)` — `info.Name` is already set earlier in the method
  - Do NOT write `recipe.json` at all in this agent
  - File: `api/src/RecipeApi/Services/Agents/WebAcquisitionAgent.cs`
  - _Requirements: 1.1, 1.2, 1.3, 5.1_

- [x] 7. Update `RecipeAgent.DoExtractRecipeAsync` — replace `rawHtml` detection with artifact detection
  - Remove: the `try` block that reads `recipe.json` and extracts `rawHtml` from it
  - Add: `var contentHtml = await recipeRepository.GetContentHtmlAsync(recipeId, ct);` before `GetImageFilesAsync`
  - Update no-artifact guard: `if (contentHtml == null && imageFiles.Count == 0)` → log warning, return
  - Add prompt selection: `var promptType = contentHtml != null ? PromptType.WebRecipeExtraction : PromptType.RecipeExtraction;`
  - Replace `GetExtractionPrompt(false)` with `promptRepository.GetPrompt(promptType)`
  - Update user prompt string: when `contentHtml != null` append `" Context from the source webpage HTML is also provided."`
  - When `contentHtml != null`: append truncated HTML to user message (same 50 000 char limit as before)
  - When only images: existing `AddImagesToMessageAsync` logic unchanged
  - Remove the `GetExtractionPrompt` private method (or leave it — it is no longer called from `DoExtractRecipeAsync`)
  - File: `api/src/RecipeApi/Services/Agents/RecipeAgent.cs`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.2, 5.3_

- [x] 8. Write tests for `WebAcquisitionAgent` — no-rawHtml guarantee
  - Create `api/src/RecipeApi.Tests/Services/Agents/WebAcquisitionAgentTests.cs`
  - Use `InMemoryStorageProvider` and mock `IChatClient`, `IPromptRepository`, `HttpClient`
  - Unit test: after `ProcessUrlAsync`, `recipe.json` does not exist in storage (agent no longer writes it)
  - Unit test: after `ProcessUrlAsync`, `original/content.html` exists in storage
  - Unit test: after `ProcessUrlAsync`, `recipe.info` contains `SourceUrl` equal to the input URL

  - [x] 8.1 Write property test — recipe.json never contains rawHtml after WebAcquisitionAgent (PBT 2)
    - `// Feature: url-import-html-capture, Property 2: recipe.json never contains rawHtml after WebAcquisitionAgent`
    - For any HTML string and any mocked AI response (arbitrary name + heroImageUrl pairs): after `ProcessUrlAsync`, if `recipe.json` exists it SHALL NOT contain a `rawHtml` property
    - **Property 2: recipe.json never contains rawHtml after WebAcquisitionAgent**
    - **Validates: Requirements 1.2, 5.1**

- [x] 9. Write tests for `RecipeAgent` — prompt selection and no-rawHtml guarantee
  - Create `api/src/RecipeApi.Tests/Services/Agents/RecipeAgentPromptSelectionTests.cs`
  - Use `InMemoryStorageProvider`, mock `IChatClient`, mock `IPromptRepository` with call capture
  - Unit test: when `content.html` exists and no images → `GetPrompt` called with `PromptType.WebRecipeExtraction`
  - Unit test: when no `content.html` and images exist → `GetPrompt` called with `PromptType.RecipeExtraction`
  - Unit test: when neither `content.html` nor images exist → `GetPrompt` never called, `recipe.json` not written
  - Unit test: after extraction with `content.html`, `recipe.json` does not contain `rawHtml`
  - Unit test: after extraction with images only, `recipe.json` does not contain `rawHtml`

  - [x] 9.1 Write property test — recipe.json never contains rawHtml after RecipeAgent (PBT 3)
    - `// Feature: url-import-html-capture, Property 3: recipe.json never contains rawHtml after RecipeAgent`
    - For any mocked AI extraction response (arbitrary `SchemaOrgRecipe`-shaped JSON, with and without extra fields): after `DoExtractRecipeAsync`, `recipe.json` SHALL NOT contain a `rawHtml` property
    - **Property 3: recipe.json never contains rawHtml after RecipeAgent**
    - **Validates: Requirements 5.2, 5.3**

  - [x] 9.2 Write property test — prompt selection determined solely by artifact presence (PBT 4)
    - `// Feature: url-import-html-capture, Property 4: Prompt selection determined by artifact presence`
    - For any `(hasContentHtml: bool, imageCount: int 0–5)`: set up artifacts accordingly, spy on `IPromptRepository.GetPrompt`, run `DoExtractRecipeAsync`; assert correct prompt type (or no call) per the three-way rule
    - **Property 4: Prompt selection determined by artifact presence**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [x] 9.3 Write property test — both prompts produce valid SchemaOrgRecipe output (PBT 5)
    - `// Feature: url-import-html-capture, Property 5: Both prompts produce valid SchemaOrgRecipe output`
    - For any mocked AI response returning a valid `SchemaOrgRecipe` JSON (minimal: name + ingredients; full: all fields): after `DoExtractRecipeAsync` on both web and photo paths, `recipe.json` deserializes to `SchemaOrgRecipe` with non-null/non-empty `name` and non-null `recipeIngredient`
    - **Property 5: Both prompts produce valid SchemaOrgRecipe output**
    - **Validates: Requirements 3.4, 6.1, 6.2**

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked `*` are optional and can be skipped for a faster MVP
- `RecipeApi.csproj` already has `<EmbeddedResource Include="src/RecipeApi/Prompts/*.md">` — dropping `extract-web-recipe.md` into that folder is sufficient; no csproj edit needed
- `RecipeInfo.SourceUrl` already exists on the model — no model change needed
- No workflow YAML changes needed; the DAG already enforces `FetchUrlContent` → `ExtractRecipe` ordering
- `InMemoryStorageProvider` is available in the test project (used in `ExtractRecipeProcessorTests`)
- FsCheck `[Property]` attribute is available via `FsCheck.Xunit 3.*` already in `RecipeApi.Tests.csproj`
- Property tests use tag format: `// Feature: url-import-html-capture, Property {N}: {property_text}`
