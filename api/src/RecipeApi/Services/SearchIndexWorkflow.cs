using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services;

public class SearchIndexWorkflow(
    IClock clock,
    RecipeDbContext db,
    IEmbeddingProvider? embeddingProvider = null,
    ILogger<SearchIndexWorkflow>? logger = null,
    ISearchTelemetry? telemetry = null,
    IRecipeSearchDocumentBuilder? documentBuilder = null,
    DemoModeOptions? demoMode = null) : IWorkflowProcessor
{
    public string ProcessorName => "IndexRecipeSearch";

    private static readonly string EmbeddingModelId =
        Environment.GetEnvironmentVariable("EMBEDDING_MODEL_ID") ?? "gemini-embedding-2";

    /// <summary>
    /// Implementation of IWorkflowProcessor. Picked up by the WorkflowWorker.
    /// </summary>
    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        var (recipeId, jobFingerprint) = ReadInput(task.Payload);
        await IndexRecipeInternalAsync(recipeId, jobFingerprint, ct);
        return new { Message = CompletionMessage(recipeId) };
    }

    private static (Guid RecipeId, string Fingerprint) ReadInput(string? payload)
    {
        if (string.IsNullOrEmpty(payload))
            throw new ArgumentException("Task payload is empty.");
        using var input = JsonDocument.Parse(payload);
        if (!input.RootElement.TryGetProperty("recipeId", out var id))
            throw new ArgumentException("Task payload does not contain recipeId.");
        return (id.GetGuid(), input.RootElement.TryGetProperty("fingerprint", out var fingerprint)
            ? fingerprint.GetString() ?? string.Empty : string.Empty);
    }

    private static string CompletionMessage(Guid recipeId) => $"Indexed recipe {recipeId}";

    internal static Guid ValidateOriginalHistory(string? payload, string? returned, string? parameters)
    {
        WorkflowProcessorHistory.ReadObservation<JsonElement>(payload ?? "null");
        var (recipeId, fingerprint) = ReadInput(payload);
        var original = WorkflowProcessorHistory.ReadObservation<Dictionary<string, string?>>(parameters ?? "null");
        var result = WorkflowProcessorHistory.ReadObservation<JsonElement>(returned ?? "null");
        if (recipeId == Guid.Empty || fingerprint != (original.GetValueOrDefault("fingerprint") ?? string.Empty)
            || result.ValueKind != JsonValueKind.Object || !result.TryGetProperty("message", out var message)
            || message.ValueKind != JsonValueKind.String || message.GetString() != CompletionMessage(recipeId))
            throw new InvalidDataException("Original search receipt differs from its invocation.");
        // The processor treats absent/null/empty fingerprints as an unguarded job.
        // Their original wire representations remain untouched; this checks the
        // effective invocation selection, never original source computation.
        // The same message follows missing/deleted/stale/empty/no-sidecar skips,
        // demo lexical publication and pending embeddings. It proves no effect.
        // Unknown result extensions are retained without qualifying their meaning.
        return recipeId;
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

        // A newly accepted PDF has metadata but no extracted recipe text yet.
        // Leave its sidecar pending until reconciliation sees populated content.
        if (string.IsNullOrWhiteSpace(content.DocumentText))
        {
            logger?.LogInformation("Skipping index job for recipe {RecipeId} — no recipe text yet", recipeId);
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
        doc.LastIndexedAt = clock.UtcNow;
        if (demoMode?.Enabled == true)
        {
            // Existing vectors remain useful only for the exact prepared facts.
            // Similar independently checks model/version/dimension compatibility.
            var currentVector = doc.EmbeddingJson is not null && doc.EmbeddingFingerprint == currentFingerprint;
            if (!currentVector)
            {
                doc.Embedding = null;
                doc.EmbeddingFingerprint = null;
            }
            doc.EmbeddingStatus = currentVector ? "ready" : "pending";
            await db.SaveChangesAsync(ct);
            return;
        }
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
                if (vector.Length == 0)
                    throw new InvalidOperationException("The embedding provider returned an empty embedding for non-empty recipe text.");
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
        var demo = demoMode?.Enabled == true;
        var pendingIds = await db.RecipeSearchDocuments
            .AsNoTracking()
            .Where(d => d.IndexStatus != "ready" || (!demo && (d.EmbeddingStatus == "failed" || d.EmbeddingStatus == "pending")))
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
