using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class SearchIndexWorkflow(
    RecipeDbContext db,
    IEmbeddingProvider? embeddingProvider = null,
    ILogger<SearchIndexWorkflow>? logger = null,
    ISearchTelemetry? telemetry = null)
{
    private static readonly string EmbeddingModelId =
        Environment.GetEnvironmentVariable("EMBEDDING_MODEL_ID") ?? "text-embedding-3-small";

    /// <summary>
    /// Enqueues a search index job for the given recipe.
    /// No-op if a pending document with the same fingerprint already exists.
    /// </summary>
    public async Task EnqueueAsync(Guid recipeId, CancellationToken ct = default)
    {
        var recipe = await db.Recipes.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == recipeId, ct);
        if (recipe is null) return;

        var fingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        var existing = await db.RecipeSearchDocuments.FindAsync([recipeId], ct);
        if (existing is not null)
        {
            // Dedup: already pending with the same fingerprint → no-op
            if (existing.IndexStatus == "pending" && existing.SourceFingerprint == fingerprint)
                return;

            // Update to pending with new fingerprint
            existing.IndexStatus = "pending";
            existing.SourceFingerprint = fingerprint;
            existing.EmbeddingModel = EmbeddingModelId;
        }
        else
        {
            db.RecipeSearchDocuments.Add(new RecipeSearchDocument
            {
                RecipeId = recipeId,
                DocumentText = string.Empty,
                SearchMetadata = "{}",
                IndexStatus = "pending",
                SourceFingerprint = fingerprint,
                EmbeddingModel = EmbeddingModelId,
                SchemaVersion = 1
            });
        }

        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Executes the indexing job for a recipe.
    /// Exits without writing if the job fingerprint is stale (recipe changed since enqueue).
    /// Sets index_status = 'failed' if the embedding provider throws.
    /// </summary>
    public async Task ExecuteAsync(Guid recipeId, string jobFingerprint, CancellationToken ct = default)
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
        var currentFingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe);
        if (currentFingerprint != jobFingerprint)
        {
            logger?.LogInformation("Skipping index job for recipe {RecipeId} — fingerprint mismatch (stale job)", recipeId);
            telemetry?.Emit(SearchTelemetryEvents.IndexJobStale, new()
            {
                ["recipeId"] = recipeId.ToString(),
                ["reason"] = "fingerprint_mismatch"
            });
            return;
        }

        var doc = await db.RecipeSearchDocuments.FindAsync([recipeId], ct);
        if (doc is null) return;

        doc.IndexStatus = "indexing";
        doc.DocumentText = BuildDocumentText(recipe);
        doc.EmbeddingModel = EmbeddingModelId;
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
                var vector = await embeddingProvider.GenerateAsync(doc.DocumentText, ct);
                doc.Embedding = vector;
            }

            doc.IndexStatus = "ready";
            doc.LastIndexedAt = DateTimeOffset.UtcNow;
            doc.SourceFingerprint = currentFingerprint;
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
            doc.IndexStatus = "failed";
            await db.SaveChangesAsync(ct);
            sw.Stop();
            logger?.LogError(ex, "Failed to index recipe {RecipeId}", recipeId);
            telemetry?.Emit(SearchTelemetryEvents.IndexJobFailed, new()
            {
                ["recipeId"] = recipeId.ToString(),
                ["error"] = ex.Message
            });
        }
    }

    /// <summary>
    /// Processes all recipes with index_status in (pending, stale, failed) in batches.
    /// Idempotent and safe to rerun.
    /// </summary>
    public async Task BackfillAsync(CancellationToken ct = default)
    {
        var pendingIds = await db.RecipeSearchDocuments
            .AsNoTracking()
            .Where(d => d.IndexStatus == "pending" || d.IndexStatus == "stale" || d.IndexStatus == "failed")
            .Select(d => new { d.RecipeId, d.SourceFingerprint })
            .ToListAsync(ct);

        foreach (var item in pendingIds)
        {
            if (ct.IsCancellationRequested) break;
            if (item.SourceFingerprint is null) continue;
            await ExecuteAsync(item.RecipeId, item.SourceFingerprint, ct);
        }
    }

    public static string BuildDocumentText(Recipe recipe)
    {
        var parts = new List<string>();

        if (!string.IsNullOrWhiteSpace(recipe.Name))
            parts.Add(recipe.Name + ".");
        if (!string.IsNullOrWhiteSpace(recipe.Description))
            parts.Add(recipe.Description + ".");

        var ingredients = DeserializeIngredients(recipe.Ingredients);
        if (ingredients.Count > 0)
            parts.Add($"Ingredients: {string.Join(", ", ingredients)}.");

        if (!string.IsNullOrWhiteSpace(recipe.Notes))
            parts.Add($"Notes: {recipe.Notes}.");
        if (!string.IsNullOrWhiteSpace(recipe.Category))
            parts.Add($"Category: {recipe.Category}.");
        if (!string.IsNullOrWhiteSpace(recipe.DietaryProfile))
            parts.Add($"Dietary: {recipe.DietaryProfile}.");
        if (!string.IsNullOrWhiteSpace(recipe.TotalTime))
            parts.Add($"Time: {recipe.TotalTime}.");
        if (!string.IsNullOrWhiteSpace(recipe.Difficulty))
            parts.Add($"Difficulty: {recipe.Difficulty}.");

        return string.Join(" ", parts);
    }

    private static List<string> DeserializeIngredients(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? []; }
        catch { return []; }
    }
}
