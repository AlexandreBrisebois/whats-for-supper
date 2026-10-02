using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

/// <summary>Acceptance only. PDF validity and page rendering belong to recipe-import.</summary>
public sealed class PdfCaptureService(
    RecipeDbContext db, IRecipeStore store, IWorkflowOrchestrator orchestrator,
    ILogger<PdfCaptureService> logger)
{
    public const long MaxFileBytes = 20 * 1024 * 1024;

    public async Task<Guid> AcceptAsync(Guid memberId, IFormFile file, int rating, string? notes, CancellationToken ct)
    {
        // Read the bounded upload completely before creating an aggregate. Never use the filename as a path.
        await using var source = file.OpenReadStream();
        using var buffer = new MemoryStream();
        var chunk = new byte[81920];
        int read;
        while ((read = await source.ReadAsync(chunk, ct)) != 0)
        {
            if (buffer.Length + read > MaxFileBytes)
                throw new PdfUploadTooLargeException();
            await buffer.WriteAsync(chunk.AsMemory(0, read), ct);
        }
        if (buffer.Length == 0) throw new ArgumentException("Choose a PDF file.");
        buffer.Position = 0;

        var id = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;
        notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        await store.SaveSourcePdfAsync(id, buffer, ct);
        await store.WriteInfoAsync(new RecipeInfo
        {
            Id = id, AddedBy = memberId, Rating = (RecipeRating)rating, Notes = notes,
            FinishedDishImageIndex = -1, ImageCount = 0, CreatedAt = now
        }, ct);
        var recipe = new Recipe
        {
            Id = id, AddedBy = memberId, Rating = (RecipeRating)rating, Notes = notes,
            FinishedDishIndex = -1, ImageCount = 0, IsReady = false, IsDiscoverable = false,
            CreatedAt = now, UpdatedAt = now
        };
        db.Recipes.Add(recipe);
        db.RecipeSearchDocuments.Add(new RecipeSearchDocument
        {
            RecipeId = id, DocumentText = string.Empty, SearchMetadata = "{}",
            IndexStatus = "pending", EmbeddingStatus = "pending",
            EmbeddingModel = Environment.GetEnvironmentVariable("EMBEDDING_MODEL_ID") ?? "gemini-embedding-2",
            SchemaVersion = RecipeSearchDocumentBuilder.CurrentSchemaVersion
        });
        await db.SaveChangesAsync(ct);

        // Preserve the existing acceptance/enqueue boundary: persisted ID is not a delivery guarantee.
        foreach (var workflow in new[] { "index-recipe-search", "recipe-import" })
        {
            try
            {
                var parameters = new Dictionary<string, string> { ["recipeId"] = id.ToString() };
                if (workflow == "index-recipe-search")
                    parameters["fingerprint"] = SearchFingerprintService.ComputeSourceFingerprint(recipe);
                await orchestrator.TriggerAsync(workflow, parameters);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to trigger {Workflow} for PDF recipe {RecipeId}", workflow, id);
            }
        }
        return id;
    }
}

public sealed class PdfUploadTooLargeException : Exception { }

