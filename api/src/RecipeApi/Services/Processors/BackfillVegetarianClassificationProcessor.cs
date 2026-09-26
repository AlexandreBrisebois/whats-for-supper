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
            .Where(recipe => force || recipe.IsVegetarian == null)
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

public sealed record VegetarianClassificationMetrics(int Total, int Classified, int Unknown, int Vegetarian, int NonVegetarian, int Queued = 0, Guid? NextCursor = null)
{
    public static async Task<VegetarianClassificationMetrics> FromDatabaseAsync(RecipeDbContext db, CancellationToken ct)
    {
        var recipes = await db.Recipes.IgnoreQueryFilters().AsNoTracking().Where(recipe => recipe.DeletedAt == null).ToListAsync(ct);
        var classified = recipes.Where(recipe => recipe.IsVegetarian.HasValue).ToList();
        return new(recipes.Count, classified.Count, recipes.Count(recipe => !recipe.IsVegetarian.HasValue), classified.Count(recipe => recipe.IsVegetarian == true), classified.Count(recipe => recipe.IsVegetarian == false));
    }
}
