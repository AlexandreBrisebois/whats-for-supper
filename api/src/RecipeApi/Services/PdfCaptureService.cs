using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

/// <summary>Acceptance only. PDF validity and page rendering belong to recipe-import.</summary>
public sealed class PdfCaptureService(
    IClock clock,
    RecipeFilePublicationStore publications, IWorkflowOrchestrator orchestrator,
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
        var now = clock.UtcNow;
        notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        var capture = await publications.CaptureNewAsync(id, ct);
        var followup = publications.CaptureFollowup("recipe-import", new() { ["recipeId"] = id.ToString() });
        await publications.PublishAsync(capture, new(null, new RecipeInfo
        {
            Id = id,
            AddedBy = memberId,
            Rating = (RecipeRating)rating,
            Notes = notes,
            FinishedDishImageIndex = -1,
            ImageCount = 0,
            CreatedAt = now,
            IsReady = false
        }, SourceFiles: new Dictionary<string, byte[]?> { ["original/source.pdf"] = buffer.ToArray() },
            SourceKind: "bootstrap", FollowupIntent: followup.RecipePublicationCapture), followup.Id, ct);

        // Preserve the existing acceptance/enqueue boundary: persisted ID is not a delivery guarantee.
        try
        {
            await orchestrator.InitializeRecipeFollowupAsync(followup.Id, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to trigger recipe-import for PDF recipe {RecipeId}", id);
        }
        return id;
    }
}

public sealed class PdfUploadTooLargeException : Exception { }
