using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

/// <summary>Renders PDF pages into original recipe images before extraction.</summary>
public sealed class PdfConversionProcessor(
    IRecipeStore recipeStore,
    IPdfPageRenderer renderer,
    RecipeDbContext? db = null,
    IClock? clock = null) : IWorkflowProcessor
{
    public string ProcessorName => "ConvertPdf";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        using var payload = JsonDocument.Parse(task.Payload ?? throw new ArgumentException("Task payload is empty."));
        var id = payload.RootElement.GetProperty("recipeId").GetGuid();

        if (db is not null)
        {
            var existing = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);
            if (existing?.StructuredContent is not null) return new { skipped = true };
        }

        await using var sourcePdf = await recipeStore.ReadSourcePdfAsync(id, ct);
        if (sourcePdf is null) return new { skipped = true };

        var info = await recipeStore.ReadInfoAsync(id, ct)
            ?? throw new InvalidDataException("PDF metadata is missing.");

        if (await HasReusablePagesAsync(id, info, ct))
        {
            return new { recipeId = id, imageCount = info.ImageCount };
        }

        var pages = await renderer.RenderAsync(sourcePdf, ct);
        if (pages.Count is < 1 or > 10)
            throw new InvalidDataException("Choose a PDF containing one recipe in up to 10 pages.");

        await recipeStore.ReplacePdfPagesAsync(id, pages, ct);
        info.ImageCount = pages.Count;
        info.FinishedDishImageIndex = -1;
        await recipeStore.WriteInfoAsync(info, ct);

        if (db is not null)
        {
            await using var transaction = await RecipeRotation.LockAsync(db, id, ct);
            var recipe = await db.Recipes.SingleOrDefaultAsync(x => x.Id == id, ct);
            if (recipe is not null)
            {
                recipe.ImageCount = pages.Count;
                recipe.FinishedDishIndex = -1;
                recipe.UpdatedAt = (clock ?? new SystemClock()).UtcNow;
                await db.SaveChangesAsync(ct);
            }
            if (transaction is not null) await transaction.CommitAsync(ct);
        }

        return new { recipeId = id, imageCount = info.ImageCount };
    }

    private async Task<bool> HasReusablePagesAsync(Guid id, RecipeInfo info, CancellationToken ct)
    {
        if (info.ImageCount is <= 0 or > 10) return false;
        for (var index = 0; index < info.ImageCount; index++)
        {
            var image = await recipeStore.ReadOriginalImageAsync(id, index, ct);
            if (image is null) return false;
            await image.Value.Stream.DisposeAsync();
        }
        return true;
    }

    internal static Guid ValidateOriginalHistory(string? payload, string? returned)
    {
        using var input = JsonDocument.Parse(payload ?? "null");
        if (input.RootElement.ValueKind != JsonValueKind.Object
            || !input.RootElement.TryGetProperty("recipeId", out var inputRecipe)
            || inputRecipe.ValueKind != JsonValueKind.String
            || !inputRecipe.TryGetGuid(out var recipeId)
            || recipeId == Guid.Empty)
            throw new InvalidDataException("Original PDF processor payload is invalid.");
        return recipeId;
    }
}
