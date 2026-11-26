using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

public class SyncRecipeProcessor(
    IClock clock,
    RecipeDbContext db,
    RecipeRepository recipeRepository,
    SupperProjectionInvalidation projectionInvalidation,
    ISupperProjectionPublisher projectionPublisher,
    ILogger<SyncRecipeProcessor> logger,
    FoodVocabularyStore vocabulary) : IWorkflowProcessor
{
    public string ProcessorName => "SyncRecipe";

    private static string ConfirmationMessage(Guid id) => $"Confirmed committed recipe publication for {id}.";
    private static string ReplayMessage(Guid id) => $"Verified identical current recipe content for {id}.";

    private static (Guid RecipeId, bool Replay) ReadInput(string? payload)
    {
        if (string.IsNullOrEmpty(payload)) throw new ArgumentException("Task payload is empty.");
        using var doc = JsonDocument.Parse(payload);
        if (!doc.RootElement.TryGetProperty("recipeId", out var idProp) && !doc.RootElement.TryGetProperty("RecipeId", out idProp))
            throw new ArgumentException("Task payload does not contain recipeId.");
        return (idProp.GetGuid(), doc.RootElement.TryGetProperty("mode", out var mode) && mode.ValueKind == JsonValueKind.String
            && mode.GetString() == "current-format-replay");
    }

    internal static Guid ValidateOriginalHistory(string? payload, string? returned, WorkflowInstance original,
        Guid taskId, bool requireConfirmation)
    {
        WorkflowProcessorHistory.ReadObservation<JsonElement>(payload ?? "null");
        var (recipeId, replay) = ReadInput(payload);
        var result = WorkflowProcessorHistory.ReadObservation<JsonElement>(returned ?? "null");
        if (recipeId == Guid.Empty || result.ValueKind != JsonValueKind.Object
            || !result.TryGetProperty("message", out var message) || message.ValueKind != JsonValueKind.String
            || message.GetString() != (replay ? ReplayMessage(recipeId) : ConfirmationMessage(recipeId)))
            throw new InvalidDataException("Original recipe sync receipt differs from its invocation.");
        return recipeId;
    }

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        var (recipeId, replay) = ReadInput(task.Payload);
        if (replay)
            return await VerifyCurrentReplayAsync(recipeId, ct);

        var recipe = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(x => x.Id == recipeId, ct);
        if (recipe is null)
            throw new InvalidDataException($"Recipe {recipeId} not found for sync.");

        if (recipe.StructuredContent is null)
        {
            string? rawJson = null;
            try
            {
                rawJson = await recipeRepository.GetRecipeJsonAsync(recipeId, ct);
            }
            catch (FileNotFoundException)
            {
                rawJson = null;
            }

            if (!string.IsNullOrWhiteSpace(rawJson))
            {
                using var parsedDoc = JsonDocument.Parse(rawJson);
                StructuredRecipeContentStore.RejectRetiredRecipeWrapper(parsedDoc.RootElement);
                var authority = await vocabulary.CaptureAuthorityAsync(recipe.FoodMappingEvidence, ct);
                var (content, evidence) = StructuredRecipeContentStore.FromSchemaOrg(
                    recipeId, rawJson, recipe.SourceUrl, authority,
                    explicitServings: recipe.Servings);

                await using var syncTx = await RecipeRotation.LockAsync(db, recipeId, ct, lockSupperInputs: true);
                var tracked = await db.Recipes.SingleAsync(x => x.Id == recipeId, ct);
                if (tracked.StructuredContent is null)
                {
                    if (string.IsNullOrWhiteSpace(tracked.TotalTime) &&
                        parsedDoc.RootElement.TryGetProperty("totalTime", out var timeProp) &&
                        timeProp.ValueKind == JsonValueKind.String &&
                        !string.IsNullOrWhiteSpace(timeProp.GetString()))
                    {
                        tracked.TotalTime = timeProp.GetString()!.Trim();
                    }
                    if (string.IsNullOrWhiteSpace(tracked.Notes) &&
                        parsedDoc.RootElement.TryGetProperty("notes", out var notesProp) &&
                        notesProp.ValueKind == JsonValueKind.String &&
                        !string.IsNullOrWhiteSpace(notesProp.GetString()))
                    {
                        tracked.Notes = notesProp.GetString()!.Trim();
                    }
                    tracked.RawMetadata = StructuredRecipeContentStore.ToSchemaOrgJson(content, rawJson, tracked.Name, tracked.Description);
                    tracked.StructuredContent = JsonSerializer.Serialize(content, new JsonSerializerOptions(JsonSerializerDefaults.Web));
                    tracked.FoodMappingEvidence = evidence;
                    tracked.Servings = content.Servings;
                    tracked.Ingredients = JsonSerializer.Serialize(content.IngredientLines.Select(StructuredRecipeContentStore.Render));
                    tracked.UpdatedAt = clock.UtcNow;
                    await db.SaveChangesAsync(ct);
                }
                if (syncTx is not null) await syncTx.CommitAsync(ct);
            }
        }

        IReadOnlyList<DateOnly> weeks;
        await using (var transaction = await RecipeRotation.LockAsync(db, recipeId, ct, lockSupperInputs: true))
        {
            weeks = await projectionInvalidation.EnlistRecipeAsync(recipeId, ct);
            if (transaction is not null) await transaction.CommitAsync(ct);
        }
        await projectionPublisher.PublishAsync(weeks);

        logger.LogInformation("SyncRecipe completed for recipe {RecipeId}", recipeId);
        return new { Message = ConfirmationMessage(recipeId) };
    }

    private async Task<object> VerifyCurrentReplayAsync(Guid recipeId, CancellationToken ct)
    {
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(ct) : null;
        if (transaction is not null)
            await db.Database.ExecuteSqlAsync($"SELECT id FROM recipes WHERE id = {recipeId} FOR SHARE", ct);
        var recipe = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(x => x.Id == recipeId, ct)
            ?? throw new InvalidDataException("Current recipe replay requires an existing structured destination.");
        var content = StructuredRecipeContentStore.Read(recipe)
            ?? throw new InvalidDataException("Current recipe replay requires an existing structured destination.");
        var diskText = await recipeRepository.GetRecipeJsonAsync(recipeId, ct);
        using var document = JsonDocument.Parse(diskText);
        StructuredRecipeContentStore.RejectRetiredRecipeWrapper(document.RootElement);
        if (StructuredRecipeContentStore.NormalizeJson(diskText) != StructuredRecipeContentStore.NormalizeJson(recipe.RawMetadata))
        {
            throw new InvalidDataException("Divergent recipe content requires reviewed recovery.");
        }
        return new { Message = ReplayMessage(recipeId) };
    }
}
