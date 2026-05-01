using System.Text.Json;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

/// <summary>
/// Stub processor for the goto-synthesis workflow.
/// Creates the recipe directory and writes minimal recipe.json / recipe.info from the
/// text description so that GenerateHero and MarkGotoReady can run downstream.
///
/// Phase F will replace the stub body with a real Gemini call following the
/// RecipeAgent.DoExtractRecipeAsync pattern.
/// </summary>
public class SynthesizeRecipeProcessor(
    RecipesRootResolver recipesRoot,
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

        await SynthesizeStubAsync(recipeId, description, ct);

        return new { Message = $"Synthesized stub recipe for {recipeId}" };
    }

    private async Task SynthesizeStubAsync(Guid recipeId, string description, CancellationToken ct)
    {
        var recipeDir = Path.Combine(recipesRoot.Root, recipeId.ToString());
        Directory.CreateDirectory(recipeDir);

        // ── recipe.json — minimal Schema.org stub ────────────────────────────
        // Phase F will replace this with a real Gemini-generated recipe.
        var recipeJson = JsonSerializer.Serialize(new
        {
            context = "https://schema.org/",
            type = "Recipe",
            name = description,
            recipeIngredient = Array.Empty<string>(),
            recipeInstructions = Array.Empty<string>(),
            totalTime = (string?)null
        }, new JsonSerializerOptions { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        var recipeJsonPath = Path.Combine(recipeDir, "recipe.json");
        await File.WriteAllTextAsync(recipeJsonPath, recipeJson, ct);
        logger.LogInformation("Wrote stub recipe.json for {RecipeId}", recipeId);

        // ── recipe.info — required by GenerateHero and MarkGotoReady ─────────
        var info = new RecipeInfo
        {
            Id = recipeId,
            Name = description,
            ImageCount = 0,
            FinishedDishImageIndex = -1
        };

        var infoPath = Path.Combine(recipeDir, "recipe.info");
        await File.WriteAllTextAsync(infoPath,
            JsonSerializer.Serialize(info, JsonDefaults.CamelCase), ct);
        logger.LogInformation("Wrote stub recipe.info for {RecipeId}", recipeId);
    }
}
