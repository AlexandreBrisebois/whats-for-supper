using System.Diagnostics;
using System.Text.Json;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Utils;

using RecipeApi.Workflow;

namespace RecipeApi.Services.Agents;

public class RecipeExtractionAgent(
    IChatClient chatClient,
    RecipesRootResolver recipesRoot,
    IConfiguration configuration,
    ILogger<RecipeExtractionAgent> logger) : IWorkflowProcessor
{
    public string ProcessorName => "ExtractRecipe";

    public async Task ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(task.Payload))
        {
            throw new ArgumentException("Task payload is empty.");
        }

        using var doc = JsonDocument.Parse(task.Payload);
        if (!doc.RootElement.TryGetProperty("recipeId", out var idProp) && !doc.RootElement.TryGetProperty("RecipeId", out idProp))
        {
            throw new ArgumentException("Task payload does not contain recipeId.");
        }

        var recipeId = idProp.GetGuid();

        // Strict check: recipe.info must exist
        var recipeDir = Path.Combine(RecipesRoot, recipeId.ToString());
        var infoPath = Path.Combine(recipeDir, "recipe.info");
        if (!File.Exists(infoPath))
        {
            throw new FileNotFoundException($"Recipe info file not found: {infoPath}");
        }

        await ExtractRecipe(recipeId);
    }
    private string RecipesRoot => recipesRoot.Root;

    private const string SchemaDefinition = @"
3. DATA MAPPING RULES (Schema.org):
   - languageCode: Set to ""FR"" or ""EN"" based on the card language.
   - name: High-level title of the recipe.
   - recipeYield: Extract yield exactly as written on the card (e.g., ""4 portions"", ""2 servings"").
   - recipeIngredient: Array of strings. Format: ""[Quantity] [Unit] [Ingredient Name]"" (e.g., ""30 ml Soy Sauce"").
   - supply: Array of HowToSupply. Map each ingredient to QuantitativeValue.
   - Language Fidelity: You MUST maintain the original language of the card for all content (name, ingredients, instructions).
   - Crucial: Strip all superscripts (e.g., ""1.5^2P"" -> ""1.5"").
   - Time: Convert to ISO 8601 (e.g., ""PT30M"").

4. SCHEMA TEMPLATE (MUST FOLLOW EXACTLY):
   {
     ""@context"": ""https://schema.org/"",
     ""@type"": ""Recipe"",
     ""languageCode"": ""FR"",
     ""name"": ""Recipe Title"",
     ""recipeYield"": ""4 portions"",
     ""totalTime"": ""PT35M"",
     ""recipeIngredient"": [""1 cup flour"", ""2 eggs""],
     ""supply"": [
       {
         ""@type"": ""HowToSupply"",
         ""name"": ""Ingredient Name"",
         ""requiredQuantity"": {
           ""@type"": ""QuantitativeValue"",
           ""value"": 1.5,
           ""unitText"": ""tsp""
         }
       }
     ],
     ""recipeInstructions"": [
       {
         ""@type"": ""HowToSection"",
         ""name"": ""Section Name (e.g. Setup)"",
         ""itemListElement"": [
           { ""@type"": ""HowToStep"", ""text"": ""Step text..."" }
         ]
       }
     ],
     ""nutrition"": {
       ""@type"": ""NutritionInformation"",
       ""calories"": ""500 kcal"",
       ""fatContent"": ""20 g"",
       ""saturatedFatContent"": ""5 g"",
       ""sodiumContent"": ""500 mg"",
       ""carbohydrateContent"": ""50 g"",
       ""fiberContent"": ""5 g"",
       ""sugarContent"": ""10 g"",
       ""proteinContent"": ""30 g""
     }
   }
";

    private static string GetSystemPrompt(bool debug)
    {
        var prompt = @$"
Role: High-Precision JSON Extractor.
Task: Synthesize recipe images into a single Schema.org/Recipe JSON object.

EXTRACTION PROTOCOL (STRICT):
1. LANGUAGE LOCK: Use the code ""FR"" or ""EN"". All text (name, ingredients, instructions) MUST remain in the card's original language. Zero translation.
2. DATA SOVEREIGNTY: Only extract what is visible. Do not add ingredients or 'improve' the dish.
3. TABLE EXTRACTION:
   - Identify serving columns (e.g. 2P / 4P). Select the smallest column (left-most).
   - recipeYield MUST match selected column (e.g. ""2 portions"").
   - Extract quantities verbatim. No math. No superscripts.
4. UNIT RULES: If a unit is missing in the table, check the corresponding Step in ""Instructions"".
   - ""c. à soupe"" -> ""Tablespoon""
   - ""c. à thé"" -> ""Teaspoon""

{SchemaDefinition}

STRICT OUTPUT:
- Return ONLY valid JSON. No markdown. No preamble.
- Use null for missing fields.
";

        if (debug)
        {
            prompt += "\nDEBUG: Include a \"_thoughtProcess\" string explaining the logic.";
        }

        return prompt;
    }

    private static string GetRefinementPrompt() => @$"
Role: JSON Formatter & Verifier.
Task: Fix any schema errors or omissions in the provided `recipe.json`.

RULES:
1. MANDATORY KEYS: [languageCode, name, recipeYield, recipeIngredient, supply, recipeInstructions].
2. NO TRUNCATION: You MUST return the ENTIRE recipe JSON.
3. FIDELITY: Ensure text and quantities match the card exactly.
4. If perfect, return exactly ""NO CHANGES"".

{SchemaDefinition}
";

    public async Task<SchemaOrgRecipe?> ExtractRecipe(Guid recipeId, bool debug = false)
    {
        var originalDir = Path.Combine(RecipesRoot, recipeId.ToString(), "original");
        if (!Directory.Exists(originalDir))
        {
            logger.LogWarning("Original images directory not found for recipe {RecipeId} at {Directory}", recipeId, originalDir);
            return null;
        }

        var imageFiles = Directory.GetFiles(originalDir)
            .Where(f => f.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ||
                        f.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ||
                        f.EndsWith(".webp", StringComparison.OrdinalIgnoreCase))
            .OrderBy(f => f)
            .ToList();

        if (imageFiles.Count == 0)
        {
            logger.LogWarning("No images found for recipe {RecipeId} in {Directory}", recipeId, originalDir);
            return null;
        }

        logger.LogInformation("Extracting recipe {RecipeId} from {Count} images.", recipeId, imageFiles.Count);

        // Build the multi-modal message
        var message = new ChatMessage(ChatRole.User, "Please extract the recipe from these images as instructed.");

        foreach (var imagePath in imageFiles)
        {
            var bytes = await File.ReadAllBytesAsync(imagePath);
            var mimeType = GetMimeType(imagePath);
            message.Contents.Add(new DataContent(bytes, mimeType));
        }

        // Initialize the Agent
        var agent = chatClient.AsAIAgent(
            name: "RecipeExtractor",
            instructions: GetSystemPrompt(debug)
        );

        string? extractionJson = null;
        string? refinementJson = null;
        string? finalJson = null;
        try
        {
            var sw = Stopwatch.StartNew();
            var response = await agent.RunAsync(
                new[] { message },
                options: new ChatClientAgentRunOptions
                {
                    ChatOptions = new ChatOptions
                    {
                        Temperature = 0.0f,
                        MaxOutputTokens = configuration.GetValue<int?>("AgentSettings:ContextWindow") / 4 ?? 4096,
                        ResponseFormat = ChatResponseFormat.Json,
                        AdditionalProperties = new AdditionalPropertiesDictionary
                        {
                            ["num_ctx"] = configuration.GetValue<int>("AgentSettings:ContextWindow", 32768)
                        }
                    }
                });
            sw.Stop();
            logger.LogInformation("Extraction Phase 1 took {Seconds}s.", sw.Elapsed.TotalSeconds);

            extractionJson = response.Text;
            var sanitizedExtraction = JsonUtils.SanitizeJson(extractionJson);

            // VALIDATION: Check if initial extraction is good enough to ship
            var initialRecipe = JsonSerializer.Deserialize<SchemaOrgRecipe>(sanitizedExtraction, JsonDefaults.CaseInsensitive);
            bool isInitialValid = !string.IsNullOrWhiteSpace(initialRecipe?.Name) &&
                                   initialRecipe?.RecipeIngredient != null &&
                                   initialRecipe.RecipeIngredient.Count > 0;

            if (isInitialValid)
            {
                logger.LogInformation("Initial extraction for {RecipeId} is valid. Skipping refinement.", recipeId);
                finalJson = sanitizedExtraction;
            }
            else
            {
                logger.LogInformation("Initial extraction for {RecipeId} is incomplete. Triggering refinement.", recipeId);
                // Refinement Step
                try
                {
                    var swRefine = Stopwatch.StartNew();
                    refinementJson = await RefineExtractionAsync(recipeId, imageFiles, sanitizedExtraction, debug);
                    swRefine.Stop();
                    logger.LogInformation("Extraction Phase 2 (Refinement) took {Seconds}s.", swRefine.Elapsed.TotalSeconds);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Refinement step failed for {RecipeId}. Falling back to initial extraction.", recipeId);
                    refinementJson = sanitizedExtraction;
                }
                finalJson = refinementJson ?? sanitizedExtraction;
            }

            // Extract languageCode if present
            string? languageCode = null;
            try
            {
                using var doc = JsonDocument.Parse(finalJson);
                if (doc.RootElement.TryGetProperty("languageCode", out var langProp))
                {
                    languageCode = langProp.GetString();
                }
            }
            catch { /* Non-blocking */ }

            // Save recipe.json to the recipe folder
            var outputPath = Path.Combine(RecipesRoot, recipeId.ToString(), "recipe.json");
            await File.WriteAllTextAsync(outputPath, finalJson);
            logger.LogInformation("Saved extracted recipe to {Path}", outputPath);

            var recipe = JsonSerializer.Deserialize<SchemaOrgRecipe>(finalJson, JsonDefaults.CaseInsensitive);

            // Update recipe.info with the name immediately after extraction
            if (!string.IsNullOrWhiteSpace(recipe?.Name))
            {
                var infoPath = Path.Combine(RecipesRoot, recipeId.ToString(), "recipe.info");
                RecipeInfo? info = null;
                if (File.Exists(infoPath))
                {
                    var infoJson = await File.ReadAllTextAsync(infoPath);
                    info = JsonSerializer.Deserialize<RecipeInfo>(infoJson, JsonDefaults.CamelCase);
                }
                if (info == null) info = new RecipeInfo { Id = recipeId };
                info.Name = recipe.Name;
                await File.WriteAllTextAsync(infoPath, JsonSerializer.Serialize(info, JsonDefaults.CamelCase));
                logger.LogInformation("Saved recipe name to recipe.info for {RecipeId}", recipeId);
            }

            // Final Fail-fast validation
            if (string.IsNullOrWhiteSpace(recipe?.Name) || recipe?.RecipeIngredient == null || recipe.RecipeIngredient.Count == 0)
            {
                logger.LogWarning("Extraction for {RecipeId} resulted in an invalid recipe (missing name or ingredients). Triggering diagnostic save.", recipeId);
                throw new InvalidDataException("Extracted recipe is incomplete (missing name or ingredients).");
            }

            // NEW STEP: Generate recipe description (stored in recipe.info)
            await TryGenerateRecipeDescription(recipeId, finalJson, languageCode);

            return recipe;
        }
        catch (Exception ex)
        {
            var recipeDir = Path.Combine(RecipesRoot, recipeId.ToString());
            if (!string.IsNullOrEmpty(extractionJson))
            {
                await File.WriteAllTextAsync(Path.Combine(recipeDir, "recipe.extraction.json"), JsonUtils.SanitizeJson(extractionJson));
                logger.LogInformation("Diagnostic: Saved extraction.json for {RecipeId}", recipeId);
            }
            if (!string.IsNullOrEmpty(refinementJson))
            {
                await File.WriteAllTextAsync(Path.Combine(recipeDir, "recipe.refinement.json"), refinementJson);
                logger.LogInformation("Diagnostic: Saved refinement.json for {RecipeId}", recipeId);
            }

            logger.LogError(ex, "Failed to extract recipe {RecipeId}.", recipeId);
            throw;
        }
    }

    private async Task<string?> RefineExtractionAsync(Guid recipeId, List<string> imageFiles, string initialJson, bool debug)
    {
        logger.LogInformation("Refining extraction for recipe {RecipeId} using Gemma4.", recipeId);

        var messages = new List<ChatMessage>
        {
            new ChatMessage(ChatRole.System, GetRefinementPrompt()),
            new ChatMessage(ChatRole.User, "Please review and refine this recipe JSON based on the images provided.")
        };

        var userMessage = messages.Last();
        userMessage.Contents.Add(new TextContent($"Initial recipe.json:\n{initialJson}"));

        foreach (var imagePath in imageFiles)
        {
            var bytes = await File.ReadAllBytesAsync(imagePath);
            var mimeType = GetMimeType(imagePath);
            userMessage.Contents.Add(new DataContent(bytes, mimeType));
        }

        var response = await chatClient.GetResponseAsync(
            messages,
            options: new ChatOptions
            {
                Temperature = 0.0f,
                MaxOutputTokens = configuration.GetValue<int?>("AgentSettings:ContextWindow") / 4 ?? 4096,
                AdditionalProperties = new AdditionalPropertiesDictionary
                {
                    ["num_ctx"] = configuration.GetValue<int>("AgentSettings:ContextWindow", 32768)
                }
                // We don't enforce JSON here because the model might return "NO CHANGES"
            });

        var responseText = response.Text?.Trim() ?? string.Empty;
        if (responseText.Contains("NO CHANGES", StringComparison.OrdinalIgnoreCase))
        {
            return initialJson;
        }

        var sanitized = JsonUtils.SanitizeJson(responseText);

        // Validate that the sanitized output is actually valid JSON
        try
        {
            using var doc = JsonDocument.Parse(sanitized);
            return sanitized;
        }
        catch (JsonException)
        {
            logger.LogWarning("Refinement pass returned invalid JSON. Falling back to initial extraction. Raw response: {Response}", responseText);
            return initialJson;
        }
    }

    private async Task TryGenerateRecipeDescription(Guid recipeId, string recipeJson, string? languageCode = null)
    {
        try
        {
            var recipeDir = Path.Combine(RecipesRoot, recipeId.ToString());
            var infoPath = Path.Combine(recipeDir, "recipe.info");

            RecipeInfo? info = null;
            if (File.Exists(infoPath))
            {
                var infoJson = await File.ReadAllTextAsync(infoPath);
                info = JsonSerializer.Deserialize<RecipeInfo>(infoJson, JsonDefaults.CamelCase);
            }

            if (info == null) info = new RecipeInfo { Id = recipeId };
            if (!string.IsNullOrEmpty(languageCode)) info.Language = languageCode;

            var prompt = @"Write a short, objective description of the recipe based on the following details and the image of the finished dish (if provided). Focus on the core ingredients, flavors, and preparation style to help a user decide if this is the right meal for them.
Constraint: The description MUST be exactly one paragraph and contain exactly 2-3 sentences. Avoid any marketing fluff, sales-oriented language, or 'selling' the dish. 
Return ONLY the description text.";

            var message = new ChatMessage(ChatRole.User, prompt);
            message.Contents.Add(new TextContent($"Recipe Data (JSON):\n{recipeJson}"));

            if (info != null && info.FinishedDishImageIndex >= 0)
            {
                var originalDir = Path.Combine(recipeDir, "original");
                var imageFiles = Directory.GetFiles(originalDir)
                    .Where(f => f.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ||
                                f.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ||
                                f.EndsWith(".webp", StringComparison.OrdinalIgnoreCase))
                    .OrderBy(f => f)
                    .ToList();

                if (info.FinishedDishImageIndex < imageFiles.Count)
                {
                    var imagePath = imageFiles[info.FinishedDishImageIndex];
                    var bytes = await File.ReadAllBytesAsync(imagePath);
                    var mimeType = GetMimeType(imagePath);
                    message.Contents.Add(new DataContent(bytes, mimeType));
                    logger.LogInformation("Including finished dish image (index {Index}) in description generation.", info.FinishedDishImageIndex);
                }
            }

            var swDesc = Stopwatch.StartNew();
            var response = await chatClient.GetResponseAsync(new[] { message });
            swDesc.Stop();
            logger.LogInformation("Description Generation Phase took {Seconds}s.", swDesc.Elapsed.TotalSeconds);

            var description = response.Text?.Trim();

            if (!string.IsNullOrEmpty(description))
            {
                if (info == null) info = new RecipeInfo { Id = recipeId };
                info.Description = description;

                var updatedInfoJson = JsonSerializer.Serialize(info, JsonDefaults.CamelCase);
                await File.WriteAllTextAsync(infoPath, updatedInfoJson);
                logger.LogInformation("Saved recipe description (length: {Length}) to recipe.info for {RecipeId}", description.Length, recipeId);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to generate recipe description for recipe {RecipeId}. This is non-blocking.", recipeId);
        }
    }

    private string GetMimeType(string path)
    {
        var ext = Path.GetExtension(path).ToLowerInvariant();
        return ext switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => "image/jpeg"
        };
    }
}
