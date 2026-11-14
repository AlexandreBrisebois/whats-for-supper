using System.Text.Json;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

/// <summary>
/// Finalizes the recipe state to mark it as ready for discovery.
/// This processor runs as the final step in recipe import/describe workflows.
/// </summary>
public class RecipeReadyProcessor(
    RecipeDbContext db,
    ILogger<RecipeReadyProcessor> logger,
    IScheduleEventPublisher publisher,
    RecipeFilePublicationStore publications) : IWorkflowProcessor
{
    public string ProcessorName => "RecipeReady";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(task.Payload))
            throw new ArgumentException("Task payload is empty.");

        using var doc = JsonDocument.Parse(task.Payload);
        if (!doc.RootElement.TryGetProperty("recipeId", out var idProp) &&
            !doc.RootElement.TryGetProperty("RecipeId", out idProp))
            throw new ArgumentException("Task payload does not contain recipeId.");

        var recipeId = idProp.GetGuid();

        var ready = await publications.CompleteReadinessAsync(task, recipeId, ct);
        if (ready is null)
        {
            logger.LogWarning("RecipeReady: recipe {RecipeId} not found — no-op", recipeId);
            return new { Message = MissingRecipeMessage(recipeId) };
        }
        if (!ready.Value)
        {
            logger.LogInformation("Recipe {RecipeId} is already finalized — skipping", recipeId);
            return new { Status = "AlreadyReady", RecipeId = recipeId };
        }
        var recipe = (await db.Recipes.FindAsync([recipeId], ct))!;

        logger.LogInformation("Recipe {RecipeId} marked as READY and DISCOVERABLE", recipeId);

        // Publish event for real-time UI updates (e.g. Planner assignments)
        var name = recipe.Name ?? string.Empty;
        var imageUrl = recipe.ImageCount > 0 ? $"/api/recipes/{recipe.Id}/hero" : null;
        await publisher.PublishRecipeReadyAsync(recipeId, name, imageUrl);

        return new { Status = "Ready", RecipeId = recipeId };
    }

    private static string MissingRecipeMessage(Guid recipeId) => $"Recipe {recipeId} not found — no-op";

    // Qualify only what the actual returned receipt and original journal observed.
    // No current recipe/file reads may establish historical readiness or absence.
    internal static Guid ValidateOriginalHistory(string? payload, string? returned, RecipeFilePublication[] publications)
    {
        static void Require(bool valid)
        {
            if (!valid) throw new InvalidDataException("Original readiness result differs from its publication.");
        }
        static void Unique(JsonElement value)
        {
            Require(value.ValueKind == JsonValueKind.Object);
            var names = value.EnumerateObject().Select(x => x.Name).ToArray();
            Require(names.Distinct(StringComparer.Ordinal).Count() == names.Length);
        }
        using var input = JsonDocument.Parse(payload ?? "null");
        Unique(input.RootElement);
        var hasId = input.RootElement.TryGetProperty("recipeId", out var inputRecipe)
            || input.RootElement.TryGetProperty("RecipeId", out inputRecipe);
        Guid recipeId = default;
        Require(hasId && inputRecipe.ValueKind == JsonValueKind.String && inputRecipe.TryGetGuid(out recipeId) && recipeId != Guid.Empty);
        using var document = JsonDocument.Parse(returned ?? "null");
        var result = document.RootElement;
        Unique(result);
        if (result.TryGetProperty("message", out var message))
        {
            Require(message.ValueKind == JsonValueKind.String && message.GetString() == MissingRecipeMessage(recipeId)
                && !result.TryGetProperty("status", out _) && !result.TryGetProperty("recipeId", out _) && publications.Length == 0);
            // No per-invocation missing-row observation was retained. This receipt
            // cannot independently certify absence or authorize recreating a row.
            return recipeId;
        }
        Require(result.TryGetProperty("recipeId", out var observedRecipe) && observedRecipe.ValueKind == JsonValueKind.String
            && observedRecipe.TryGetGuid(out var id) && id == recipeId);
        Require(result.TryGetProperty("status", out var status) && status.ValueKind == JsonValueKind.String);
        if (status.GetString() == "AlreadyReady")
        {
            Require(publications.Length == 0);
            // A historical readiness flag without this operation's publication
            // does not prove extraction, synthesis, hero or file completion.
            return recipeId;
        }
        Require(status.GetString() == "Ready" && publications.Length == 1 && publications[0].RecipeId == recipeId);
        var (capture, candidate) = RecipeFilePublicationStore.ReadOriginalPublication(publications[0]);
        Require(candidate.SourceKind == "readiness" && candidate.Info.IsReady == true
            && (capture.Fields is null || !capture.Fields.IsReady));
        var info = JsonSerializer.Deserialize<RecipeInfo>(capture.Files["recipe.info"]!, JsonDefaults.CamelCase)
            ?? throw new InvalidDataException("Original readiness metadata is missing.");
        info.IsReady = true;
        Require(CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(info, JsonDefaults.CamelCase))
            == CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(candidate.Info, JsonDefaults.CamelCase)));
        return recipeId;
    }
}
