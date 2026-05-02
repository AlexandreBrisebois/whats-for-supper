using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

public class SyncRecipeProcessor(
    RecipeDbContext db,
    RecipeRepository recipeRepository,
    DiscoveryService discoveryService,
    ILogger<SyncRecipeProcessor> logger) : IWorkflowProcessor
{
    public string ProcessorName => "SyncRecipe";

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
        await SyncDiskToDb(recipeId, ct);
        return new { Message = $"Synchronized recipe {recipeId} from disk to database." };
    }

    private async Task SyncDiskToDb(Guid recipeId, CancellationToken ct)
    {
        // Read recipe.info first for strict validation
        var recipeInfo = await recipeRepository.GetInfoAsync(recipeId, ct);

        // Strictness: Must fail if ImageCount is invalid (negative)
        if (recipeInfo.ImageCount < 0)
        {
            throw new InvalidDataException($"Invalid ImageCount ({recipeInfo.ImageCount}) for recipe {recipeId}. Sync aborted.");
        }

        var recipeJsonContent = await recipeRepository.GetRecipeJsonAsync(recipeId, ct);

        using var jsonDoc = JsonDocument.Parse(recipeJsonContent);
        var root = jsonDoc.RootElement;

        var recipe = await db.Recipes.FirstOrDefaultAsync(r => r.Id == recipeId, ct);
        if (recipe == null)
        {
            throw new KeyNotFoundException($"Recipe {recipeId} not found in database during sync.");
        }

        // Update database record
        recipe.RawMetadata = recipeJsonContent;

        // Try to get ingredients from multiple possible locations (Schema.org vs legacy)
        if (root.TryGetProperty("recipeIngredient", out var ingProp) && ingProp.ValueKind == JsonValueKind.Array)
        {
            recipe.Ingredients = ingProp.GetRawText();
        }
        else if (root.TryGetProperty("ingredients", out var legacyIngProp) && legacyIngProp.ValueKind == JsonValueKind.Array)
        {
            recipe.Ingredients = legacyIngProp.GetRawText();
        }
        else
        {
            recipe.Ingredients = "[]";
        }

        // We still deserialize to SchemaOrgRecipe to use for Difficulty inference, but we fall back gracefully
        var recipeData = JsonSerializer.Deserialize<SchemaOrgRecipe>(recipeJsonContent, JsonDefaults.CaseInsensitive) ?? new();

        // Synchronize from recipe.json (AI metadata)
        if (!string.IsNullOrWhiteSpace(recipeData.Name))
        {
            recipe.Name = recipeData.Name;
        }
        if (!string.IsNullOrWhiteSpace(recipeData.TotalTime))
        {
            recipe.TotalTime = recipeData.TotalTime;
        }

        // Synchronize from recipe.info (Manual edits or AI-generated description)
        if (!string.IsNullOrWhiteSpace(recipeInfo.Description))
        {
            recipe.Description = recipeInfo.Description;
        }

        // Name in recipe.info takes precedence if present
        if (!string.IsNullOrWhiteSpace(recipeInfo.Name))
        {
            recipe.Name = recipeInfo.Name;
        }

        recipe.Difficulty = discoveryService.InferDifficulty(recipeData);
        recipe.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Synchronized recipe {RecipeId} from disk to database.", recipeId);
    }
}
