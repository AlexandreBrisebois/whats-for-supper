using System.Text.Json;
using Microsoft.Extensions.AI;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Utils;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

/// <summary>
/// Synthesizes a full Schema.org Recipe from a text description using Gemini.
/// Follows the RecipeAgent.DoExtractRecipeAsync pattern exactly — same IChatClient,
/// same disk I/O, same recipe.json / recipe.info format. Text prompt instead of images.
/// </summary>
public class SynthesizeRecipeProcessor(
    IChatClient chatClient,
    RecipesRootResolver recipesRoot,
    IConfiguration configuration,
    ILogger<SynthesizeRecipeProcessor> logger) : IWorkflowProcessor
{
    public string ProcessorName => "SynthesizeRecipe";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(task.Payload))
            throw new ArgumentException("Task payload is empty.");

        using var doc = JsonDocument.Parse(task.Payload);
        var root = doc.RootElement;

        if (!root.TryGetProperty("recipeId", out var idProp) &&
            !root.TryGetProperty("RecipeId", out idProp))
            throw new ArgumentException("Task payload does not contain recipeId.");

        if (!root.TryGetProperty("description", out var descProp) &&
            !root.TryGetProperty("Description", out descProp))
            throw new ArgumentException("Task payload does not contain description.");

        var recipeId = idProp.GetGuid();
        var description = descProp.GetString() ?? string.Empty;

        await SynthesizeAsync(recipeId, description, ct);

        return new { Message = $"Synthesized recipe for {recipeId}" };
    }

    private async Task SynthesizeAsync(Guid recipeId, string description, CancellationToken ct)
    {
        var recipeDir = Path.Combine(recipesRoot.Root, recipeId.ToString());
        Directory.CreateDirectory(recipeDir);

        logger.LogInformation("Synthesizing recipe {RecipeId} from description: {Description}", recipeId, description);

        // ── Build prompt ─────────────────────────────────────────────────────
        var systemPrompt = GetSynthesisSystemPrompt();
        var userPrompt = $"Description: {description}";

        var messages = new List<ChatMessage>
        {
            new(ChatRole.System, systemPrompt),
            new(ChatRole.User, userPrompt)
        };

        var chatOptions = GetChatOptions();
        var response = await chatClient.GetResponseAsync(messages, chatOptions, ct);
        var rawJson = response.Text ?? string.Empty;

        // ── Sanitize & parse ─────────────────────────────────────────────────
        var sanitized = JsonUtils.SanitizeJson(rawJson);

        SchemaOrgRecipe? recipe = null;
        try
        {
            recipe = JsonSerializer.Deserialize<SchemaOrgRecipe>(sanitized, JsonDefaults.CaseInsensitive);
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "Failed to deserialize synthesis response for {RecipeId}. JSON (first 500): {Sample}",
                recipeId, sanitized.Length > 500 ? sanitized[..500] : sanitized);
        }

        // ── Fallback: if AI response is unusable, write a minimal stub ───────
        if (string.IsNullOrWhiteSpace(recipe?.Name))
        {
            logger.LogWarning("Synthesis produced no usable name for {RecipeId}. Falling back to description as name.", recipeId);
            recipe = new SchemaOrgRecipe
            {
                Name = description,
                RecipeIngredient = [],
                RecipeInstructions = [],
                TotalTime = null
            };
        }

        // ── Write recipe.json ────────────────────────────────────────────────
        var normalizedJson = JsonSerializer.Serialize(recipe,
            new JsonSerializerOptions(JsonDefaults.CamelCase) { WriteIndented = true });

        var recipeJsonPath = Path.Combine(recipeDir, "recipe.json");
        await File.WriteAllTextAsync(recipeJsonPath, normalizedJson, ct);
        logger.LogInformation("Saved synthesized recipe.json for {RecipeId}", recipeId);

        // ── Write / update recipe.info ───────────────────────────────────────
        var infoPath = Path.Combine(recipeDir, "recipe.info");
        RecipeInfo info;
        if (File.Exists(infoPath))
        {
            var existing = await File.ReadAllTextAsync(infoPath, ct);
            info = JsonSerializer.Deserialize<RecipeInfo>(existing, JsonDefaults.CamelCase)
                   ?? new RecipeInfo { Id = recipeId };
        }
        else
        {
            info = new RecipeInfo { Id = recipeId };
        }

        info.Name = recipe.Name;
        info.ImageCount = 0;
        info.FinishedDishImageIndex = -1;
        if (!string.IsNullOrWhiteSpace(recipe.TotalTime))
            info.TotalTime = recipe.TotalTime;

        await File.WriteAllTextAsync(infoPath,
            JsonSerializer.Serialize(info, JsonDefaults.CamelCase), ct);
        logger.LogInformation("Saved recipe.info for {RecipeId} with name: {Name}", recipeId, recipe.Name);
    }

    private static string GetSynthesisSystemPrompt() => @"
Role: Recipe Synthesis Expert.
Task: Given a short description of a family recipe, generate a complete Schema.org/Recipe JSON object.

RULES:
1. Infer realistic ingredients and steps from the description. Be practical and home-cook friendly.
2. Use the language of the description (French or English).
3. recipeIngredient: Array of strings in format ""[Quantity] [Unit] [Ingredient]"" (e.g., ""250 ml tomato sauce"").
4. recipeInstructions: Array of HowToSection objects with itemListElement HowToStep arrays.
5. totalTime: ISO 8601 duration (e.g., ""PT45M"").
6. recipeYield: Reasonable serving size (e.g., ""4 portions"").
7. Do NOT add nutrition data unless explicitly mentioned.

SCHEMA TEMPLATE (MUST FOLLOW EXACTLY):
{
  ""@context"": ""https://schema.org/"",
  ""@type"": ""Recipe"",
  ""name"": ""Recipe Name"",
  ""recipeYield"": ""4 portions"",
  ""totalTime"": ""PT45M"",
  ""recipeIngredient"": [""250 ml tomato sauce"", ""400 g spaghetti""],
  ""recipeInstructions"": [
    {
      ""@type"": ""HowToSection"",
      ""name"": ""Preparation"",
      ""itemListElement"": [
        { ""@type"": ""HowToStep"", ""text"": ""Boil salted water and cook pasta al dente."" }
      ]
    }
  ]
}

STRICT OUTPUT: Return ONLY valid JSON. No markdown. No preamble. No explanation.
";

    private ChatOptions GetChatOptions() => new()
    {
        Temperature = 0.3f,
        MaxOutputTokens = configuration.GetValue<int?>("GEMINI_MAX_OUTPUT_TOKENS") ?? 4096,
        AdditionalProperties = new AdditionalPropertiesDictionary
        {
            ["num_ctx"] = configuration.GetValue<int>("GEMINI_CONTEXT_WINDOW", 32768)
        }
    };
}
