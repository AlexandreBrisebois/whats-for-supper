using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

/// <summary>Keyset-paginated migration coordinator; it never mutates recipe facts itself.</summary>
public sealed class BackfillVegetarianClassificationProcessor(
    RecipeDbContext db,
    IWorkflowOrchestrator orchestrator) : IWorkflowProcessor
{
    private const int BatchSize = 25;
    public string ProcessorName => "BackfillVegetarianClassification";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        var (cursor, force) = ReadPayload(task.Payload);
        var recipes = await db.Recipes.IgnoreQueryFilters().AsNoTracking()
            .Where(recipe => recipe.DeletedAt == null && (!cursor.HasValue || recipe.Id.CompareTo(cursor.Value) > 0))
            .Where(recipe => force || recipe.VegetarianClassificationVersion != CategorizeRecipeProcessor.VegetarianClassifierVersion)
            .OrderBy(recipe => recipe.Id).Take(BatchSize).Select(recipe => recipe.Id).ToListAsync(ct);
        foreach (var recipeId in recipes)
        {
            ct.ThrowIfCancellationRequested();
            await orchestrator.TriggerAsync("classify-recipe-vegetarian", new() { ["recipeId"] = recipeId.ToString() });
        }
        if (recipes.Count == BatchSize)
            await orchestrator.TriggerAsync("vegetarian-classification-backfill", new()
            {
                ["cursor"] = recipes[^1].ToString(),
                ["force"] = force.ToString()
            });
        var metrics = await VegetarianClassificationMetrics.FromDatabaseAsync(db, ct);
        return metrics with { Queued = recipes.Count, NextCursor = recipes.Count == BatchSize ? recipes[^1] : null };
    }

    private static (Guid? Cursor, bool Force) ReadPayload(string? payload)
    {
        if (string.IsNullOrWhiteSpace(payload)) return (null, false);
        using var json = JsonDocument.Parse(payload);
        var cursor = json.RootElement.TryGetProperty("cursor", out var c) && Guid.TryParse(c.GetString(), out var id) ? id : (Guid?)null;
        var force = json.RootElement.TryGetProperty("force", out var f) && f.ValueKind is JsonValueKind.True or JsonValueKind.False && f.GetBoolean();
        return (cursor, force);
    }
}

public sealed record VegetarianClassificationMetrics(int Total, int CurrentVersion, int Unknown, int Vegetarian, int NonVegetarian, int Failed, DateTimeOffset? OldestClassifiedAt, DateTimeOffset? NewestClassifiedAt, int Queued = 0, Guid? NextCursor = null)
{
    public static async Task<VegetarianClassificationMetrics> FromDatabaseAsync(RecipeDbContext db, CancellationToken ct)
    {
        var recipes = await db.Recipes.IgnoreQueryFilters().AsNoTracking().Where(recipe => recipe.DeletedAt == null).ToListAsync(ct);
        var current = recipes.Where(recipe => recipe.VegetarianClassificationVersion == CategorizeRecipeProcessor.VegetarianClassifierVersion).ToList();
        return new(recipes.Count, current.Count, recipes.Count(recipe => recipe.VegetarianClassificationVersion is null && recipe.VegetarianClassificationFailedAt is null), current.Count(recipe => recipe.IsVegetarian), current.Count(recipe => !recipe.IsVegetarian), recipes.Count(recipe => recipe.VegetarianClassificationFailedAt is not null), current.Select(recipe => recipe.VegetarianClassifiedAt).Min(), current.Select(recipe => recipe.VegetarianClassifiedAt).Max());
    }
}
