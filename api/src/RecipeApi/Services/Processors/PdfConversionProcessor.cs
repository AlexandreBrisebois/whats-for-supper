using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

/// <summary>Adapts a retained PDF to the ordinary photo workflow, without acquisition flag checks.</summary>
public sealed class PdfConversionProcessor(RecipeDbContext db, IRecipeStore store, IPdfPageRenderer renderer) : IWorkflowProcessor
{
    // Includes publication/metadata updates so two attempts cannot interleave.
    private static readonly SemaphoreSlim Gate = new(1, 1);
    public string ProcessorName => "ConvertPdf";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        using var payload = JsonDocument.Parse(task.Payload ?? throw new ArgumentException("Task payload is empty."));
        var id = payload.RootElement.GetProperty("recipeId").GetGuid();
        await using var source = await store.ReadSourcePdfAsync(id, ct);
        if (source is null) return new { skipped = true }; // Photos never load PDFium.
        await Gate.WaitAsync(ct);
        try
        {
            var recipe = await db.Recipes.SingleOrDefaultAsync(r => r.Id == id, ct)
                ?? throw new KeyNotFoundException("Pending PDF recipe was removed.");
            var info = await store.ReadInfoAsync(id, ct)
                ?? throw new InvalidDataException("PDF metadata is missing.");
            var reusable = info.ImageCount is > 0 and <= 10;
            for (var i = 0; reusable && i < info.ImageCount; i++)
            {
                var image = await store.ReadOriginalImageAsync(id, i, ct);
                reusable = image is not null;
                if (image is not null) await image.Value.Stream.DisposeAsync();
            }
            if (!reusable)
            {
                var pages = await renderer.RenderAsync(source, ct);
                if (pages.Count is < 1 or > 10)
                    throw new InvalidDataException("Choose a PDF containing one recipe in up to 10 pages.");
                // No extraction/readiness can see a partial document. The storage method replaces only PDF-owned pages.
                await store.ReplacePdfPagesAsync(id, pages, ct);
                info.ImageCount = pages.Count;
                info.FinishedDishImageIndex = -1;
                await store.WriteInfoAsync(info, ct);
            }
            recipe.ImageCount = info.ImageCount;
            recipe.FinishedDishIndex = -1;
            recipe.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
            return new { recipeId = id, imageCount = info.ImageCount };
        }
        finally { Gate.Release(); }
    }
}
