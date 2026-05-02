using System.Diagnostics;
using System.Text.Json;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using RecipeApi.Data;
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
    RecipeRepository recipeRepository,
    IPromptRepository promptRepository,
    IConfiguration configuration,
    ILogger<RecipeAgent> logger,
    RecipeDbContext db,
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
            "SynthesizeRecipe" => await SynthesizeRecipeAsync(recipeId, GetDescription(doc), ct),
            _ => throw new NotSupportedException($"Processor {ProcessorName} is not supported by RecipeAgent.")
        };
    }

    private string GetDescription(JsonDocument doc)
    {
        if (!doc.RootElement.TryGetProperty("description", out var descProp) &&
            !doc.RootElement.TryGetProperty("Description", out descProp))
        {
            throw new ArgumentException("Task payload does not contain description.");
        }
        return descProp.GetString() ?? string.Empty;
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

    private async Task<object> SynthesizeRecipeAsync(Guid recipeId, string description, CancellationToken ct)
    {
        await DoSynthesizeRecipeAsync(recipeId, description, ct);
        return new { Message = $"Synthesized recipe for {recipeId}" };
    }

    #region Extraction Logic

    private string GetExtractionPrompt(bool debug)
    {
        var prompt = promptRepository.GetPrompt(PromptType.RecipeExtraction);
        if (debug) prompt += "\nDEBUG: Include a \"_thoughtProcess\" string explaining the logic.";
        return prompt;
    }

    private string GetRefinementPrompt() => @"
Role: High-Fidelity JSON Verifier.
Task: Fix errors or omissions (like missing pantry items) in the previous response.

RULES:
1. NO COMPRESSION: You MUST return the ENTIRE recipe JSON. Do not summarize instructions.
2. FIDELITY: Ensure text and quantities match the card exactly.
3. COMPLETENESS: Ensure all pantry items and all instruction steps are present.
4. If the previous JSON is already perfect and complete, return exactly ""NO CHANGES"".
";

    public async Task DoExtractRecipeAsync(Guid recipeId, CancellationToken ct)
    {
        var imageFiles = await GetImageFilesAsync(recipeId, ct);
        if (imageFiles.Count == 0)
        {
            logger.LogWarning("No images found for recipe {RecipeId}", recipeId);
            return;
        }

        logger.LogInformation("Extracting recipe {RecipeId} from {Count} images.", recipeId, imageFiles.Count);

        var agent = chatClient.AsAIAgent(name: "RecipeExtractor", instructions: GetExtractionPrompt(false));
        var userMessage = new ChatMessage(ChatRole.User, "Please extract the recipe from these images as instructed.");
        await AddImagesToMessageAsync(userMessage, recipeId, imageFiles, ct);

        var response = await agent.RunAsync(messages: new[] { userMessage }, options: GetChatOptions(), cancellationToken: ct);
        var messages = response.Messages.ToList();

        var extractionJson = response.Text;
        var sanitizedExtraction = JsonUtils.SanitizeJson(extractionJson ?? string.Empty);

        // Validation & Refinement
        SchemaOrgRecipe? initialRecipe = null;
        try
        {
            initialRecipe = JsonSerializer.Deserialize<SchemaOrgRecipe>(sanitizedExtraction, JsonDefaults.CaseInsensitive);
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "Failed to deserialize initial extraction for {RecipeId}. JSON (first 500 chars): {JsonSample}", recipeId, sanitizedExtraction.Length > 500 ? sanitizedExtraction[..500] : sanitizedExtraction);
        }

        bool isInitialValid = !string.IsNullOrWhiteSpace(initialRecipe?.Name) &&
                               initialRecipe?.RecipeIngredient != null &&
                               initialRecipe.RecipeIngredient.Count > 0;

        string finalJson = sanitizedExtraction;
        if (!isInitialValid)
        {
            logger.LogInformation("Initial extraction for {RecipeId} is incomplete. Triggering refinement.", recipeId);
            finalJson = await RefineExtractionAsync(recipeId, messages, ct) ?? sanitizedExtraction;
        }

        // Final validation and normalization to ensure consistent schema on disk
        var finalRecipe = JsonSerializer.Deserialize<SchemaOrgRecipe>(finalJson, JsonDefaults.CaseInsensitive);

        if (string.IsNullOrWhiteSpace(finalRecipe?.Name) && !string.IsNullOrWhiteSpace(initialRecipe?.Name))
        {
            // Fallback to initial if refinement wiped out the name
            finalRecipe = initialRecipe;
        }

        if (string.IsNullOrWhiteSpace(finalRecipe?.Name))
        {
            throw new Exception($"Extraction failed for {recipeId}: Final JSON does not match the required Recipe schema (missing name).");
        }

        // Re-serialize to ensure we save in our standard format, not the model's hallucinated schema
        var normalizedJson = JsonSerializer.Serialize(finalRecipe, new JsonSerializerOptions(JsonDefaults.CamelCase) { WriteIndented = true });

        await recipeRepository.SaveRecipeJsonAsync(recipeId, normalizedJson, ct);
        logger.LogInformation("Saved extracted recipe for {RecipeId}", recipeId);

        // Update recipe.info name
        if (!string.IsNullOrWhiteSpace(finalRecipe?.Name))
        {
            var info = await recipeRepository.GetInfoAsync(recipeId, ct);
            info.Name = finalRecipe.Name;
            await recipeRepository.SaveInfoAsync(info, ct);
        }

        // Automatic Description Generation as part of extraction
        await GenerateDescriptionAsync(recipeId, ct);
    }

    private async Task<string?> RefineExtractionAsync(Guid recipeId, List<ChatMessage> messages, CancellationToken ct)
    {
        var refinementUserMessage = new ChatMessage(ChatRole.User, @$"The initial extraction was incomplete or contains errors (e.g., missing pantry items or summarized instructions).

Please re-examine the images and refine the JSON according to these rules:
{GetRefinementPrompt()}");

        messages.Add(refinementUserMessage);

        var agent = chatClient.AsAIAgent(name: "RecipeRefiner", instructions: "Continue your extraction work.");
        var response = await agent.RunAsync(messages: messages, options: GetChatOptions(), cancellationToken: ct);
        var responseText = response.Text?.Trim() ?? string.Empty;

        if (responseText.Contains("NO CHANGES", StringComparison.OrdinalIgnoreCase))
        {
            // We return the previous text (which is the last assistant message before the refinement turn)
            return messages.Count >= 2 ? messages[^2].Text : string.Empty;
        }

        var sanitized = JsonUtils.SanitizeJson(responseText);
        try
        {
            JsonDocument.Parse(sanitized);
            return sanitized;
        }
        catch { return messages.Count >= 2 ? messages[^2].Text : string.Empty; }
    }


    #endregion

    #region Description Logic

    public async Task DoGenerateDescriptionAsync(Guid recipeId, CancellationToken ct)
    {
        try
        {
            var recipeJson = await recipeRepository.GetRecipeJsonAsync(recipeId, ct);
            var info = await recipeRepository.GetInfoAsync(recipeId, ct);

            var prompt = promptRepository.GetPrompt(PromptType.DescriptionGeneration);

            var message = new ChatMessage(ChatRole.User, prompt);
            message.Contents.Add(new TextContent($"Recipe Data (JSON):\n{recipeJson}"));

            if (info.FinishedDishImageIndex >= 0)
            {
                var imageFiles = await GetImageFilesAsync(recipeId, ct);
                if (info.FinishedDishImageIndex < imageFiles.Count)
                {
                    var imageBytes = await recipeRepository.GetOriginalImageAsync(recipeId, info.FinishedDishImageIndex, ct);
                    message.Contents.Add(new DataContent(imageBytes, "image/jpeg"));
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
                await recipeRepository.SaveInfoAsync(info, ct);
                logger.LogInformation("Saved recipe description to recipe.info for {RecipeId}", recipeId);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to generate description for recipe {RecipeId}.", recipeId);
            if (ProcessorName == "GenerateDescription") throw;
        }
    }

    #endregion

    #region Synthesis Logic

    private string GetSynthesisSystemPrompt() => @"
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

    public async Task DoSynthesizeRecipeAsync(Guid recipeId, string description, CancellationToken ct)
    {
        logger.LogInformation("Synthesizing recipe {RecipeId} from description: {Description}", recipeId, description);

        var agent = chatClient.AsAIAgent(name: "RecipeSynthesizer", instructions: promptRepository.GetPrompt(PromptType.RecipeSynthesis));

        var userMessage = new ChatMessage(ChatRole.User, $"Description: {description}");

        var response = await agent.RunAsync(messages: new[] { userMessage }, options: GetChatOptions(), cancellationToken: ct);
        var rawJson = response.Text ?? string.Empty;
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

        // Fallback: if AI response is unusable, write a minimal stub
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

        // Write recipe.json
        var normalizedJson = JsonSerializer.Serialize(recipe, new JsonSerializerOptions(JsonDefaults.CamelCase) { WriteIndented = true });
        await recipeRepository.SaveRecipeJsonAsync(recipeId, normalizedJson, ct);
        logger.LogInformation("Saved synthesized recipe.json for {RecipeId}", recipeId);

        // Write / update recipe.info
        RecipeInfo info;
        try { info = await recipeRepository.GetInfoAsync(recipeId, ct); }
        catch { info = new RecipeInfo { Id = recipeId }; }

        info.Name = recipe.Name;
        info.ImageCount = 0;
        info.IsSynthesized = true;
        info.FinishedDishImageIndex = -1;
        if (!string.IsNullOrWhiteSpace(recipe.TotalTime))
            info.TotalTime = recipe.TotalTime;

        await recipeRepository.SaveInfoAsync(info, ct);
        logger.LogInformation("Saved recipe.info for {RecipeId} with name: {Name}", recipeId, recipe.Name);

        var dbRecipe = await db.Recipes.FindAsync([recipeId], ct);
        if (dbRecipe != null)
        {
            dbRecipe.IsSynthesized = true;
            dbRecipe.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
        }

        // Automatic Description Generation as part of synthesis (to match extraction pattern)
        await GenerateDescriptionAsync(recipeId, ct);
    }

    #endregion

    #region Helpers

    private async Task<List<int>> GetImageFilesAsync(Guid recipeId, CancellationToken ct)
    {
        var info = await recipeRepository.GetInfoAsync(recipeId, ct);
        var images = new List<int>();
        for (int i = 0; i < info.ImageCount; i++)
        {
            if (await recipeRepository.ExistsAsync(recipeId, $"original/{i}.jpg") ||
                await recipeRepository.ExistsAsync(recipeId, $"original/{i}.png") ||
                await recipeRepository.ExistsAsync(recipeId, $"original/{i}.webp"))
            {
                images.Add(i);
            }
        }
        return images;
    }

    private async Task AddImagesToMessageAsync(ChatMessage message, Guid recipeId, List<int> imageIndices, CancellationToken ct)
    {
        foreach (var index in imageIndices)
        {
            var bytes = await recipeRepository.GetOriginalImageAsync(recipeId, index, ct);
            // We assume JPEG for simplicity here as GetOriginalImageAsync handles the ext check
            message.Contents.Add(new DataContent(bytes, "image/jpeg"));
        }
    }

    private ChatClientAgentRunOptions GetChatOptions()
    {
        return new ChatClientAgentRunOptions
        {
            ChatOptions = new ChatOptions
            {
                Temperature = 0.1f,
                MaxOutputTokens = configuration.GetValue<int?>("GEMINI_MAX_OUTPUT_TOKENS") ?? 8192
            }
        };
    }

    #endregion
}
