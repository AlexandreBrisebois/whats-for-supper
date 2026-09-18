using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services;

public class SearchIndexWorkflow(
    RecipeDbContext db,
    IEmbeddingProvider? embeddingProvider = null,
    ILogger<SearchIndexWorkflow>? logger = null,
    ISearchTelemetry? telemetry = null,
    IRecipeSearchDocumentBuilder? documentBuilder = null) : IWorkflowProcessor
{
    public string ProcessorName => "IndexRecipeSearch";

    private static readonly string EmbeddingModelId =
        Environment.GetEnvironmentVariable("EMBEDDING_MODEL_ID") ?? "gemini-embedding-2";

    /// <summary>
    /// Implementation of IWorkflowProcessor. Picked up by the WorkflowWorker.
    /// </summary>
    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(task.Payload))
            throw new ArgumentException("Task payload is empty.");

        using var docJson = JsonDocument.Parse(task.Payload);
        if (!docJson.RootElement.TryGetProperty("recipeId", out var idProp))
            throw new ArgumentException("Task payload does not contain recipeId.");

        var recipeId = idProp.GetGuid();
        var jobFingerprint = docJson.RootElement.TryGetProperty("fingerprint", out var fpProp)
            ? fpProp.GetString() ?? string.Empty
            : string.Empty;

        await IndexRecipeInternalAsync(recipeId, jobFingerprint, ct);

        return new { Message = $"Indexed recipe {recipeId}" };
    }

    /// <summary>
    /// Logic for indexing a single recipe. 
    /// Exits without writing if the job fingerprint is stale (recipe changed since enqueue).
    /// </summary>
    private async Task IndexRecipeInternalAsync(Guid recipeId, string jobFingerprint, CancellationToken ct)
    {
        var recipe = await db.Recipes.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == recipeId, ct);

        // Recipe deleted or soft-deleted — exit without writing
        if (recipe is null || recipe.DeletedAt is not null)
        {
            logger?.LogInformation("Skipping index job for recipe {RecipeId} — deleted", recipeId);
            return;
        }

        // Stale-job guard: compare current fingerprint with job fingerprint
        var content = (documentBuilder ?? new RecipeSearchDocumentBuilder()).Build(recipe);
        var currentFingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe, content);
        if (!string.IsNullOrEmpty(jobFingerprint) && currentFingerprint != jobFingerprint)
        {
            logger?.LogInformation("Skipping index job for recipe {RecipeId} — fingerprint mismatch (stale job)", recipeId);
            telemetry?.Emit(SearchTelemetryEvents.IndexJobStale, new()
            {
                ["recipeId"] = recipeId.ToString(),
                ["reason"] = "fingerprint_mismatch"
            });
            return;
        }

        // Publish lexical content before the provider call. The fingerprint check makes
        // publication conditional on the content this workflow was asked to index.
        var doc = await db.RecipeSearchDocuments.FindAsync([recipeId], ct);
        if (doc is null) return;
        if (!string.IsNullOrEmpty(jobFingerprint) && jobFingerprint != currentFingerprint) return;
        doc.DocumentText = content.DocumentText;
        doc.SearchMetadata = content.SearchMetadata;
        doc.SchemaVersion = content.SchemaVersion;
        doc.SourceFingerprint = currentFingerprint;
        doc.IndexStatus = "ready";
        doc.LastIndexedAt = DateTimeOffset.UtcNow;
        doc.EmbeddingStatus = "indexing";
        await db.SaveChangesAsync(ct);

        var sw = System.Diagnostics.Stopwatch.StartNew();
        telemetry?.Emit(SearchTelemetryEvents.IndexJobStarted, new()
        {
            ["recipeId"] = recipeId.ToString(),
            ["fingerprint"] = currentFingerprint
        });

        try
        {
            if (embeddingProvider is not null)
            {
                var vector = await embeddingProvider.GenerateAsync(content.DocumentText, ct);
                await db.Entry(doc).ReloadAsync(ct);
                if (doc.SourceFingerprint != currentFingerprint)
                {
                    telemetry?.Emit(SearchTelemetryEvents.IndexJobStale, new() { ["recipeId"] = recipeId.ToString(), ["reason"] = "superseded_before_embedding_publish" });
                    return;
                }
                doc.Embedding = vector;
                doc.EmbeddingFingerprint = currentFingerprint;
                doc.EmbeddingModel = EmbeddingModelId;
                doc.EmbeddingStatus = "ready";
            }
            else
                doc.EmbeddingStatus = "pending";
            await db.SaveChangesAsync(ct);

            sw.Stop();
            logger?.LogInformation("Indexed recipe {RecipeId} successfully", recipeId);
            telemetry?.Emit(SearchTelemetryEvents.IndexJobCompleted, new()
            {
                ["recipeId"] = recipeId.ToString(),
                ["durationMs"] = sw.ElapsedMilliseconds
            });
        }
        catch (Exception ex)
        {
            // We set failed here, but the WorkflowWorker will handle retries 
            // if we throw the exception up. We'll mark as failed for immediate 
            // visibility in the search UI, but allow the worker to retry.
            // Re-fetch or revert the doc entity to ensure we can save the failure status
            // even if the original error was caused by invalid entity state (e.g. vector size cast)
            var entry = db.Entry(doc);
            if (entry.State == EntityState.Modified || entry.State == EntityState.Added)
            {
                entry.CurrentValues.SetValues(entry.OriginalValues);
                entry.State = EntityState.Unchanged;
            }

            await db.Entry(doc).ReloadAsync(ct);
            if (doc.SourceFingerprint == currentFingerprint)
            {
                doc.EmbeddingStatus = "failed";
                await db.SaveChangesAsync(ct);
            }
            sw.Stop();
            logger?.LogError(ex, "Failed to index recipe {RecipeId}", recipeId);
            telemetry?.Emit(SearchTelemetryEvents.IndexJobFailed, new()
            {
                ["recipeId"] = recipeId.ToString(),
                ["error"] = ex.Message
            });

            // Re-throw to trigger WorkflowWorker retry mechanism
            throw;
        }
    }

    /// <summary>
    /// Processes all recipes with index_status in (pending, stale, failed) in batches.
    /// This now enqueues workflow tasks instead of processing directly.
    /// </summary>
    public async Task BackfillAsync(IWorkflowOrchestrator orchestrator, CancellationToken ct = default)
    {
        var pendingIds = await db.RecipeSearchDocuments
            .AsNoTracking()
            .Where(d => d.IndexStatus != "ready" || d.EmbeddingStatus == "failed" || d.EmbeddingStatus == "pending")
            .Select(d => new { d.RecipeId, d.SourceFingerprint })
            .ToListAsync(ct);

        logger?.LogInformation("BackfillAsync: Found {Count} pending documents to trigger workflows for.", pendingIds.Count);

        foreach (var item in pendingIds)
        {
            if (ct.IsCancellationRequested) break;

            await orchestrator.TriggerAsync("index-recipe-search", new Dictionary<string, string>
            {
                ["recipeId"] = item.RecipeId.ToString(),
                ["fingerprint"] = item.SourceFingerprint ?? string.Empty
            });
        }
    }
}
