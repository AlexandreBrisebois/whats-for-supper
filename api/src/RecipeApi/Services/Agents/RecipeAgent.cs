using System.Diagnostics;
using System.Text.Json;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Utils;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Agents;

/// <summary>
/// A unified Recipe Intelligence Agent that handles both extraction and description generation.
/// Implements IWorkflowProcessor to be used in YAML workflows.
/// </summary>
public class RecipeAgent(
    IChatClient chatClient,
    RecipesRootResolver recipesRoot,
    IConfiguration configuration,
    ILogger<RecipeAgent> logger,
    string processorName = "RecipeIntelligence") : IWorkflowProcessor
{
    public string ProcessorName => processorName;

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
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

        return ProcessorName switch
        {
            "ExtractRecipe" => await ExtractRecipeAsync(recipeId, ct),
            "GenerateDescription" => await GenerateDescriptionAsync(recipeId, ct),
            _ => throw new NotSupportedException($"Processor {ProcessorName} is not supported by RecipeAgent.")
        };
    }

    private async Task<object> ExtractRecipeAsync(Guid recipeId, CancellationToken ct)
    {
        await DoExtractRecipeAsync(recipeId, ct);
        return new { Message = $"Extracted recipe and generated description for {recipeId}" };
    }

    private async Task<object> GenerateDescriptionAsync(Guid recipeId, CancellationToken ct)
    {
        await DoGenerateDescriptionAsync(recipeId, ct);
        return new { Message = $"Generated description for {recipeId}" };
    }

    private string RecipesRoot => recipesRoot.Root;

    #region Extraction Logic

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

    private string GetExtractionPrompt(bool debug)
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
        if (debug) prompt += "\nDEBUG: Include a \"_thoughtProcess\" string explaining the logic.";
        return prompt;
    }

    private string GetRefinementPrompt() => @$"
Role: JSON Formatter & Verifier.
Task: Fix any schema errors or omissions in the provided `recipe.json`.

RULES:
1. MANDATORY KEYS: [languageCode, name, recipeYield, recipeIngredient, supply, recipeInstructions].
2. NO TRUNCATION: You MUST return the ENTIRE recipe JSON.
3. FIDELITY: Ensure text and quantities match the card exactly.
4. If perfect, return exactly ""NO CHANGES"".

{SchemaDefinition}
";

    public async Task DoExtractRecipeAsync(Guid recipeId, CancellationToken ct)
    {
        var recipeDir = Path.Combine(RecipesRoot, recipeId.ToString());
        var originalDir = Path.Combine(recipeDir, "original");
        var infoPath = Path.Combine(recipeDir, "recipe.info");

        if (!File.Exists(infoPath))
        {
            throw new FileNotFoundException($"Recipe info file not found: {infoPath}");
        }

        var imageFiles = GetImageFiles(originalDir);
        if (imageFiles.Count == 0)
        {
            logger.LogWarning("No images found for recipe {RecipeId} in {Directory}", recipeId, originalDir);
            return;
        }

        logger.LogInformation("Extracting recipe {RecipeId} from {Count} images.", recipeId, imageFiles.Count);

        var message = new ChatMessage(ChatRole.User, "Please extract the recipe from these images as instructed.");
        await AddImagesToMessageAsync(message, imageFiles);

        var agent = chatClient.AsAIAgent(name: "RecipeExtractor", instructions: GetExtractionPrompt(false));

        var response = await agent.RunAsync(
            messages: new[] { message },
            options: GetChatOptions(),
            cancellationToken: ct);
        var extractionJson = response.Text;
        var sanitizedExtraction = JsonUtils.SanitizeJson(extractionJson);

        // Validation & Refinement
        var initialRecipe = JsonSerializer.Deserialize<SchemaOrgRecipe>(sanitizedExtraction, JsonDefaults.CaseInsensitive);
        bool isInitialValid = !string.IsNullOrWhiteSpace(initialRecipe?.Name) &&
                               initialRecipe?.RecipeIngredient != null &&
                               initialRecipe.RecipeIngredient.Count > 0;

        string finalJson = sanitizedExtraction;
        if (!isInitialValid)
        {
            logger.LogInformation("Initial extraction for {RecipeId} is incomplete. Triggering refinement.", recipeId);
            finalJson = await RefineExtractionAsync(recipeId, imageFiles, sanitizedExtraction, ct) ?? sanitizedExtraction;
        }

        // Save output
        var outputPath = Path.Combine(recipeDir, "recipe.json");
        await File.WriteAllTextAsync(outputPath, finalJson);
        logger.LogInformation("Saved extracted recipe to {Path}", outputPath);

        // Update recipe.info name
        var recipe = JsonSerializer.Deserialize<SchemaOrgRecipe>(finalJson, JsonDefaults.CaseInsensitive);
        if (!string.IsNullOrWhiteSpace(recipe?.Name))
        {
            await UpdateRecipeInfoNameAsync(recipeId, recipe.Name);
        }

        // Automatic Description Generation as part of extraction
        await GenerateDescriptionAsync(recipeId, ct);
    }

    private async Task<string?> RefineExtractionAsync(Guid recipeId, List<string> imageFiles, string initialJson, CancellationToken ct)
    {
        var messages = new List<ChatMessage>
        {
            new ChatMessage(ChatRole.System, GetRefinementPrompt()),
            new ChatMessage(ChatRole.User, "Please review and refine this recipe JSON based on the images provided.")
        };

        var userMessage = messages.Last();
        userMessage.Contents.Add(new TextContent($"Initial recipe.json:\n{initialJson}"));
        await AddImagesToMessageAsync(userMessage, imageFiles);

        var response = await chatClient.GetResponseAsync(messages, GetChatOptions().ChatOptions, ct);
        var responseText = response.Text?.Trim() ?? string.Empty;

        if (responseText.Contains("NO CHANGES", StringComparison.OrdinalIgnoreCase)) return initialJson;

        var sanitized = JsonUtils.SanitizeJson(responseText);
        try { JsonDocument.Parse(sanitized); return sanitized; }
        catch { return initialJson; }
    }

    #endregion

    #region Description Logic

    public async Task DoGenerateDescriptionAsync(Guid recipeId, CancellationToken ct)
    {
        try
        {
            var recipeDir = Path.Combine(RecipesRoot, recipeId.ToString());
            var infoPath = Path.Combine(recipeDir, "recipe.info");
            var recipeJsonPath = Path.Combine(recipeDir, "recipe.json");

            if (!File.Exists(recipeJsonPath))
            {
                logger.LogWarning("Recipe JSON not found for description generation: {Path}", recipeJsonPath);
                return;
            }

            var recipeJson = await File.ReadAllTextAsync(recipeJsonPath, ct);
            var info = await GetRecipeInfoAsync(infoPath, recipeId);

            var prompt = @"Write a short, objective description of the recipe based on the following details and the image of the finished dish (if provided). Focus on the core ingredients, flavors, and preparation style to help a user decide if this is the right meal for them.
Constraint: The description MUST be exactly one paragraph and contain exactly 2-3 sentences. Avoid any marketing fluff, sales-oriented language, or 'selling' the dish. 
Return ONLY the description text.";

            var message = new ChatMessage(ChatRole.User, prompt);
            message.Contents.Add(new TextContent($"Recipe Data (JSON):\n{recipeJson}"));

            if (info.FinishedDishImageIndex >= 0)
            {
                var imageFiles = GetImageFiles(Path.Combine(recipeDir, "original"));
                if (info.FinishedDishImageIndex < imageFiles.Count)
                {
                    var imagePath = imageFiles[info.FinishedDishImageIndex];
                    await AddImageToMessageAsync(message, imagePath);
                    logger.LogInformation("Including finished dish image (index {Index}) in description generation for {RecipeId}.", info.FinishedDishImageIndex, recipeId);
                }
            }

            var agent = chatClient.AsAIAgent(name: "RecipeDescriber", instructions: "You are an objective food writer.");
            var response = await agent.RunAsync(
                messages: new[] { message },
                options: GetChatOptions(),
                cancellationToken: ct);

            var description = response.Text?.Trim();
            if (!string.IsNullOrEmpty(description))
            {
                info.Description = description;
                await File.WriteAllTextAsync(infoPath, JsonSerializer.Serialize(info, JsonDefaults.CamelCase), ct);
                logger.LogInformation("Saved recipe description to recipe.info for {RecipeId}", recipeId);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to generate description for recipe {RecipeId}.", recipeId);
            if (ProcessorName == "GenerateDescription") throw; // Only fail the task if it's the primary goal
        }
    }

    #endregion

    #region Helpers

    private List<string> GetImageFiles(string directory)
    {
        if (!Directory.Exists(directory)) return new List<string>();
        return Directory.GetFiles(directory)
            .Where(f => f.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ||
                        f.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ||
                        f.EndsWith(".webp", StringComparison.OrdinalIgnoreCase))
            .OrderBy(f => f)
            .ToList();
    }

    private async Task AddImagesToMessageAsync(ChatMessage message, List<string> imagePaths)
    {
        foreach (var path in imagePaths) await AddImageToMessageAsync(message, path);
    }

    private async Task AddImageToMessageAsync(ChatMessage message, string path)
    {
        var bytes = await File.ReadAllBytesAsync(path);
        message.Contents.Add(new DataContent(bytes, GetMimeType(path)));
    }

    private string GetMimeType(string path)
    {
        var ext = Path.GetExtension(path).ToLowerInvariant();
        return ext switch { ".png" => "image/png", ".webp" => "image/webp", _ => "image/jpeg" };
    }

    private ChatClientAgentRunOptions GetChatOptions()
    {
        return new ChatClientAgentRunOptions
        {
            ChatOptions = new ChatOptions
            {
                Temperature = 0.0f,
                MaxOutputTokens = configuration.GetValue<int?>("AgentSettings:ContextWindow") / 4 ?? 4096,
                AdditionalProperties = new AdditionalPropertiesDictionary
                {
                    ["num_ctx"] = configuration.GetValue<int>("AgentSettings:ContextWindow", 32768)
                }
            }
        };
    }

    private async Task<RecipeInfo> GetRecipeInfoAsync(string path, Guid recipeId)
    {
        if (File.Exists(path))
        {
            var json = await File.ReadAllTextAsync(path);
            return JsonSerializer.Deserialize<RecipeInfo>(json, JsonDefaults.CamelCase) ?? new RecipeInfo { Id = recipeId };
        }
        return new RecipeInfo { Id = recipeId };
    }

    private async Task UpdateRecipeInfoNameAsync(Guid recipeId, string name)
    {
        var infoPath = Path.Combine(RecipesRoot, recipeId.ToString(), "recipe.info");
        var info = await GetRecipeInfoAsync(infoPath, recipeId);
        info.Name = name;
        await File.WriteAllTextAsync(infoPath, JsonSerializer.Serialize(info, JsonDefaults.CamelCase));
    }

    #endregion
}
