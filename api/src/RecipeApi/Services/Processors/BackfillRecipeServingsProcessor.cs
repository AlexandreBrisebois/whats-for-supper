using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

/// <summary>Explicit, bounded projection of retained metadata, including soft-deleted rows.</summary>
public sealed class BackfillRecipeServingsProcessor(RecipeDbContext db, IWorkflowOrchestrator orchestrator, IClock clock) : IWorkflowProcessor
{
    private const int BatchSize = 25;
    public string ProcessorName => "BackfillRecipeServings";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        Guid? cursor = null;
        if (!string.IsNullOrWhiteSpace(task.Payload))
        {
            using var payload = JsonDocument.Parse(task.Payload);
            if (payload.RootElement.TryGetProperty("cursor", out var value) &&
                value.ValueKind == JsonValueKind.String && Guid.TryParse(value.GetString(), out var id)) cursor = id;
        }
        var rows = await db.Recipes.IgnoreQueryFilters().AsNoTracking()
            .Where(r => r.Servings == null && (!cursor.HasValue || r.Id.CompareTo(cursor.Value) > 0))
            .OrderBy(r => r.Id).Take(BatchSize).Select(r => new { r.Id, r.RawMetadata }).ToListAsync(ct);
        var updated = 0;
        var unresolved = 0;
        foreach (var row in rows)
        {
            ct.ThrowIfCancellationRequested();
            var count = RecipeServings.FromMetadata(row.RawMetadata);
            if (!count.HasValue) { unresolved++; continue; }
            updated += await db.Recipes.IgnoreQueryFilters()
                .Where(r => r.Id == row.Id && r.Servings == null && r.RawMetadata == row.RawMetadata)
                .ExecuteUpdateAsync(set => set.SetProperty(r => r.Servings, count).SetProperty(r => r.UpdatedAt, clock.UtcNow), ct);
        }
        Guid? next = rows.Count == BatchSize ? rows[^1].Id : null;
        if (next.HasValue)
            await orchestrator.TriggerAsync("recipe-servings-backfill", new() { ["cursor"] = next.Value.ToString() });
        return new { Examined = rows.Count, Updated = updated, Unresolved = unresolved, Changed = rows.Count - unresolved - updated, NextCursor = next };
    }
}
