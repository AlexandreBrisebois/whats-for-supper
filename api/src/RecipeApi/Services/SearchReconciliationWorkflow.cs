using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services;

/// <summary>Bounded, keyset-paginated repair for derived search sidecars.</summary>
public sealed class SearchReconciliationWorkflow(
    RecipeDbContext db,
    IWorkflowOrchestrator orchestrator,
    IRecipeSearchDocumentBuilder builder,
    ILogger<SearchReconciliationWorkflow> logger) : IWorkflowProcessor
{
    private const int BatchSize = 50;
    public string ProcessorName => "ReconcileRecipeSearch";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        var cursor = ReadCursor(task.Payload);
        var recipes = await db.Recipes.IgnoreQueryFilters().AsNoTracking()
            .Where(r => r.IsReady && r.DeletedAt == null && (!cursor.HasValue || r.Id.CompareTo(cursor.Value) > 0))
            .OrderBy(r => r.Id).Take(BatchSize).ToListAsync(ct);
        var queued = 0;
        foreach (var recipe in recipes)
        {
            var content = builder.Build(recipe);
            var fingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe, content);
            var sidecar = await db.RecipeSearchDocuments.FindAsync([recipe.Id], ct);
            if (sidecar is null)
            {
                sidecar = new RecipeSearchDocument { RecipeId = recipe.Id, DocumentText = string.Empty, SearchMetadata = "{}", IndexStatus = "pending", EmbeddingStatus = "pending", EmbeddingModel = Environment.GetEnvironmentVariable("EMBEDDING_MODEL_ID") ?? "gemini-embedding-2", SchemaVersion = RecipeSearchDocumentBuilder.CurrentSchemaVersion };
                db.RecipeSearchDocuments.Add(sidecar);
            }
            var needsIndex = sidecar.IndexStatus != "ready" || sidecar.SchemaVersion != content.SchemaVersion || sidecar.SourceFingerprint != fingerprint || sidecar.EmbeddingStatus is "failed" or "pending";
            if (needsIndex && !await HasActiveIndexAsync(recipe.Id, fingerprint, ct))
            {
                sidecar.IndexStatus = "pending";
                sidecar.EmbeddingStatus = "pending";
                await db.SaveChangesAsync(ct);
                await orchestrator.TriggerAsync("index-recipe-search", new() { ["recipeId"] = recipe.Id.ToString(), ["fingerprint"] = fingerprint });
                queued++;
            }
        }
        if (recipes.Count == BatchSize)
            await orchestrator.TriggerAsync("search-reconciliation", new() { ["cursor"] = recipes[^1].Id.ToString() });
        logger.LogInformation("Reconciled {Count} recipes; queued {Queued} index jobs.", recipes.Count, queued);
        return new { scanned = recipes.Count, queued, cursor = recipes.LastOrDefault()?.Id };
    }

    private async Task<bool> HasActiveIndexAsync(Guid recipeId, string fingerprint, CancellationToken ct)
    {
        var recipeToken = recipeId.ToString();
        if (db.Database.IsRelational())
        {
            var parameters = JsonSerializer.Serialize(new Dictionary<string, string>
            {
                ["recipeId"] = recipeToken,
                ["fingerprint"] = fingerprint
            });

            return await db.WorkflowInstances.FromSql($"""
                SELECT * FROM workflow_instances
                WHERE workflow_id = 'index-recipe-search'
                  AND status IN ({(int)WorkflowStatus.Pending}, {(int)WorkflowStatus.Processing})
                  AND parameters @> {parameters}::jsonb
                """).AsNoTracking().AnyAsync(ct);
        }

        return await db.WorkflowInstances.AsNoTracking().AnyAsync(i =>
            i.WorkflowId == "index-recipe-search"
            && (i.Status == WorkflowStatus.Pending || i.Status == WorkflowStatus.Processing)
            && i.Parameters != null
            && i.Parameters.Contains(recipeToken)
            && i.Parameters.Contains(fingerprint), ct);
    }

    private static Guid? ReadCursor(string? payload)
    {
        if (string.IsNullOrWhiteSpace(payload)) return null;
        using var json = JsonDocument.Parse(payload);
        return json.RootElement.TryGetProperty("cursor", out var value) && Guid.TryParse(value.GetString(), out var cursor) ? cursor : null;
    }
}
