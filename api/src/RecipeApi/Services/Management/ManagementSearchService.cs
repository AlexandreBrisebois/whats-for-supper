using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services.Management;

internal sealed class ManagementSearchService(
    RecipeDbContext db,
    RecipesRootResolver recipesRoot,
    IClock clock,
    ILogger logger)
{
    public async Task ExportReadySidecarsAsync()
    {
        var readyDocs = await (
            from document in db.RecipeSearchDocuments.AsNoTracking()
            join recipe in db.Recipes.AsNoTracking() on document.RecipeId equals recipe.Id
            where document.IndexStatus == "ready"
            select new { Document = document, Recipe = recipe })
            .ToListAsync();

        int sidecarCount = 0;
        foreach (var readyDocument in readyDocs)
        {
            try
            {
                var doc = readyDocument.Document;
                var content = new RecipeSearchDocumentBuilder().Build(readyDocument.Recipe);
                var sourceFingerprint = SearchFingerprintService.ComputeSourceFingerprint(readyDocument.Recipe, content);
                var canReuseEmbedding = doc.EmbeddingStatus == "ready"
                    && doc.SourceFingerprint == sourceFingerprint
                    && doc.EmbeddingFingerprint == sourceFingerprint;
                // Build sidecar manually to avoid EF navigation cycle issues
                var sidecarDict = new Dictionary<string, object?>
                {
                    ["schemaVersion"] = doc.SchemaVersion,
                    ["recipeId"] = doc.RecipeId.ToString(),
                    ["documentText"] = content.DocumentText,
                    ["searchMetadata"] = JsonSerializer.Deserialize<JsonElement>(content.SearchMetadata),
                    ["embeddingModel"] = doc.EmbeddingModel,
                    ["embeddingVersion"] = (object?)doc.EmbeddingVersion,
                    ["embeddingStatus"] = canReuseEmbedding ? "ready" : "pending",
                    ["embeddingFingerprint"] = canReuseEmbedding ? sourceFingerprint : null,
                    ["sourceFingerprint"] = sourceFingerprint,
                    ["exportedAt"] = clock.UtcNow.ToString("O")
                };

                // Embed the raw float array if present
                if (doc.EmbeddingJson is not null)
                {
                    sidecarDict["embedding"] = JsonSerializer.Deserialize<float[]>(doc.EmbeddingJson);
                }
                else
                {
                    sidecarDict["embedding"] = null;
                }

                var sidecarJson = JsonSerializer.Serialize(sidecarDict, JsonDefaults.CamelCase);
                var sidecarPath = GetSearchIndexSidecarPath(doc.RecipeId);
                Directory.CreateDirectory(Path.GetDirectoryName(sidecarPath)!);
                await File.WriteAllTextAsync(sidecarPath, sidecarJson);
                sidecarCount++;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to write search.index.json for recipe {RecipeId}", readyDocument.Document.RecipeId);
            }
        }

        logger.LogInformation("Backed up {Count} search index sidecars", sidecarCount);
    }

    public async Task RestoreSidecarsAsync(IEnumerable<Recipe> recipesToRestore, CancellationToken ct)
    {
        var configuredModel = GeminiEmbeddingProvider.ResolveModelId();
        foreach (var recipe in recipesToRestore)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                var sidecarPath = GetSearchIndexSidecarPath(recipe.Id);
                if (!File.Exists(sidecarPath))
                {
                    // No sidecar — mark pending so background job re-indexes
                    await UpsertSearchDocumentPendingAsync(recipe.Id, ct);
                    logger.LogInformation("recipe_index_restore_marked_pending recipeId={RecipeId} reason=missing", recipe.Id);
                    continue;
                }

                var sidecarJson = await File.ReadAllTextAsync(sidecarPath, ct);
                using var sidecarDoc = JsonDocument.Parse(sidecarJson);
                var root = sidecarDoc.RootElement;

                var schemaVersion = root.TryGetProperty("schemaVersion", out var sv) ? sv.GetInt32() : 0;
                var embeddingModel = root.TryGetProperty("embeddingModel", out var em) ? em.GetString() : null;

                if (schemaVersion != RecipeSearchDocumentBuilder.CurrentSchemaVersion)
                {
                    await UpsertSearchDocumentPendingAsync(recipe.Id, ct);
                    logger.LogInformation("recipe_index_restore_marked_pending recipeId={RecipeId} reason=stale schemaVersion={SchemaVersion}", recipe.Id, schemaVersion);
                    continue;
                }

                var content = new RecipeSearchDocumentBuilder().Build(recipe);
                var sourceFingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe, content);
                var embeddingVersion = root.TryGetProperty("embeddingVersion", out var ev) ? ev.GetString() : null;
                var embeddingFingerprint = root.TryGetProperty("embeddingFingerprint", out var ef) ? ef.GetString() : null;
                var embeddingStatus = root.TryGetProperty("embeddingStatus", out var es) ? es.GetString() : "pending";
                string? embeddingJson = null;
                if (root.TryGetProperty("embedding", out var embProp) && embProp.ValueKind == JsonValueKind.Array)
                    embeddingJson = embProp.GetRawText();

                var existing = await db.RecipeSearchDocuments.FindAsync(new object[] { recipe.Id }, ct);
                if (existing is null)
                {
                    db.RecipeSearchDocuments.Add(new RecipeSearchDocument
                    {
                        RecipeId = recipe.Id,
                        DocumentText = content.DocumentText,
                        SearchMetadata = content.SearchMetadata,
                        IndexStatus = "ready",
                        EmbeddingJson = embeddingJson,
                        EmbeddingModel = embeddingModel ?? configuredModel,
                        EmbeddingVersion = embeddingVersion,
                        EmbeddingStatus = embeddingModel == configuredModel && embeddingFingerprint == sourceFingerprint && embeddingStatus == "ready" ? "ready" : "pending",
                        EmbeddingFingerprint = embeddingModel == configuredModel && embeddingFingerprint == sourceFingerprint ? embeddingFingerprint : null,
                        SourceFingerprint = sourceFingerprint,
                        LastIndexedAt = clock.UtcNow,
                        SchemaVersion = RecipeSearchDocumentBuilder.CurrentSchemaVersion
                    });
                }
                else
                {
                    existing.DocumentText = content.DocumentText;
                    existing.SearchMetadata = content.SearchMetadata;
                    existing.IndexStatus = "ready";
                    existing.EmbeddingJson = embeddingJson;
                    existing.EmbeddingModel = embeddingModel ?? configuredModel;
                    existing.EmbeddingVersion = embeddingVersion;
                    existing.EmbeddingStatus = embeddingModel == configuredModel && embeddingFingerprint == sourceFingerprint && embeddingStatus == "ready" ? "ready" : "pending";
                    existing.EmbeddingFingerprint = embeddingModel == configuredModel && embeddingFingerprint == sourceFingerprint ? embeddingFingerprint : null;
                    existing.SourceFingerprint = sourceFingerprint;
                    existing.LastIndexedAt = clock.UtcNow;
                    existing.SchemaVersion = RecipeSearchDocumentBuilder.CurrentSchemaVersion;
                }

                await db.SaveChangesAsync(ct);
                logger.LogInformation("recipe_index_restore_rehydrated recipeId={RecipeId}", recipe.Id);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to restore search index for recipe {RecipeId}", recipe.Id);
            }
        }
    }

    private string GetSearchIndexSidecarPath(Guid recipeId)
    {
        return Path.Combine(recipesRoot.Root, recipeId.ToString(), "search.index.json");
    }

    private async Task UpsertSearchDocumentPendingAsync(Guid recipeId, CancellationToken ct)
    {
        var existing = await db.RecipeSearchDocuments.FindAsync(new object[] { recipeId }, ct);
        if (existing is null)
        {
            db.RecipeSearchDocuments.Add(new RecipeSearchDocument
            {
                RecipeId = recipeId,
                DocumentText = string.Empty,
                SearchMetadata = "{}",
                IndexStatus = "pending",
                EmbeddingStatus = "pending",
                EmbeddingModel = GeminiEmbeddingProvider.ResolveModelId(),
                SchemaVersion = RecipeSearchDocumentBuilder.CurrentSchemaVersion
            });
        }
        else
        {
            existing.IndexStatus = "pending";
            existing.EmbeddingStatus = "pending";
            existing.EmbeddingFingerprint = null;
        }
        await db.SaveChangesAsync(ct);
    }
}
