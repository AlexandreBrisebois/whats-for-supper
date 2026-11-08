using System.Text.Json;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

/// <summary>Stages rendered pages against the workflow's launch evidence.</summary>
public sealed class PdfConversionProcessor(RecipeFilePublicationStore publications, IPdfPageRenderer renderer) : IWorkflowProcessor
{
    public string ProcessorName => "ConvertPdf";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        using var payload = JsonDocument.Parse(task.Payload ?? throw new ArgumentException("Task payload is empty."));
        var id = payload.RootElement.GetProperty("recipeId").GetGuid();
        var operation = task.TaskId == Guid.Empty ? Guid.NewGuid() : task.TaskId;
        var input = ProcessorName + "\n" + CanonicalRecipeContentStore.NormalizeJson(task.Payload);
        if (await publications.TryResumeAsync(id, operation, input, ct)) return new { recipeId = id, recovered = true };
        var capture = await publications.CaptureForTaskAsync(task, id, ct);
        if (capture.Files["original/source.pdf"] is not { } pdf) return new { skipped = true };
        var info = JsonSerializer.Deserialize<RecipeInfo>(capture.Files["recipe.info"]!, JsonDefaults.CamelCase)
            ?? throw new InvalidDataException("PDF metadata is missing.");
        var reusable = HasReusablePages(capture, info);
        if (reusable)
        {
            await publications.PublishAsync(capture, new(null, info, input, new Dictionary<string, byte[]?>(), SourceKind: "pdf"), operation, ct);
            return new { recipeId = id, imageCount = info.ImageCount };
        }
        using var source = new MemoryStream(pdf, writable: false);
        var pages = await renderer.RenderAsync(source, ct);
        if (pages.Count is < 1 or > 10)
            throw new InvalidDataException("Choose a PDF containing one recipe in up to 10 pages.");
        // Selected page membership replaces only the bounded PDF image slots;
        // every replaced byte remains retained in the publication evidence.
        var files = new Dictionary<string, byte[]?>(StringComparer.Ordinal);
        for (var index = 0; index < 10; index++)
            foreach (var extension in new[] { ".jpg", ".jpeg", ".png", ".webp" })
                files[$"original/{index}{extension}"] = extension == ".png" && index < pages.Count ? pages[index] : null;
        info.ImageCount = pages.Count;
        info.FinishedDishImageIndex = -1;
        await publications.PublishAsync(capture, new(null, info, input, files, SourceKind: "pdf"), operation, ct);
        return new { recipeId = id, imageCount = info.ImageCount };
    }

    private static bool HasReusablePages(RecipePublicationCapture capture, RecipeInfo info) =>
        info.ImageCount is > 0 and <= 10 && Enumerable.Range(0, info.ImageCount)
            .All(index => new[] { ".jpg", ".jpeg", ".png", ".webp" }
                .Any(extension => capture.Files.GetValueOrDefault($"original/{index}{extension}") is not null));

    // Qualifies this processor's returned receipt against its retained publication,
    // never against current files/recipe or an earlier task.Result. A skipped
    // receipt asserts no publication, and does not certify missing source truth.
    internal static Guid ValidateOriginalHistory(string? payload, string? returned, RecipeFilePublication[] publications)
    {
        static void Require(bool valid)
        {
            if (!valid) throw new InvalidDataException("Original PDF processor result differs from its publication.");
        }
        using var input = JsonDocument.Parse(payload ?? "null");
        Guid recipeId = default;
        Require(input.RootElement.ValueKind == JsonValueKind.Object
            && input.RootElement.TryGetProperty("recipeId", out var inputRecipe)
            && inputRecipe.ValueKind == JsonValueKind.String && inputRecipe.TryGetGuid(out recipeId) && recipeId != Guid.Empty);
        using var document = JsonDocument.Parse(returned ?? "null");
        var result = document.RootElement;
        Require(result.ValueKind == JsonValueKind.Object);
        var names = result.EnumerateObject().Select(x => x.Name).ToArray();
        Require(names.Distinct(StringComparer.Ordinal).Count() == names.Length);
        if (result.TryGetProperty("skipped", out var skipped))
        {
            Require(skipped.ValueKind == JsonValueKind.True && publications.Length == 0
                && !result.TryGetProperty("recipeId", out _) && !result.TryGetProperty("imageCount", out _)
                && !result.TryGetProperty("recovered", out _));
            return recipeId;
        }
        Require(result.TryGetProperty("recipeId", out var resultRecipe) && resultRecipe.ValueKind == JsonValueKind.String
            && resultRecipe.TryGetGuid(out var observedRecipe) && observedRecipe == recipeId
            && publications.Length == 1 && publications[0].RecipeId == recipeId);
        var (capture, candidate) = RecipeFilePublicationStore.ReadOriginalPublication(publications[0]);
        Require(candidate.SourceKind == "pdf" && candidate.RecipeJson is null && candidate.SourceFiles is not null
            && capture.Files.GetValueOrDefault("original/source.pdf") is not null);
        var info = JsonSerializer.Deserialize<RecipeInfo>(capture.Files["recipe.info"]!, JsonDefaults.CamelCase)
            ?? throw new InvalidDataException("Original PDF metadata is missing.");
        Require(candidate.Info.ImageCount is > 0 and <= 10);
        if (HasReusablePages(capture, info))
            Require(candidate.SourceFiles!.Count == 0 && candidate.Info.ImageCount == info.ImageCount
                && candidate.Info.FinishedDishImageIndex == info.FinishedDishImageIndex);
        else
        {
            Require(candidate.SourceFiles!.Count == 40 && candidate.Info.FinishedDishImageIndex == -1);
            for (var index = 0; index < 10; index++)
                foreach (var extension in new[] { ".jpg", ".jpeg", ".png", ".webp" })
                {
                    Require(candidate.SourceFiles.TryGetValue($"original/{index}{extension}", out var bytes));
                    Require(extension == ".png" && index < candidate.Info.ImageCount ? bytes is { Length: > 0 } : bytes is null);
                }
        }
        if (result.TryGetProperty("recovered", out var recovered))
            Require(recovered.ValueKind == JsonValueKind.True && !result.TryGetProperty("imageCount", out _));
        else Require(result.TryGetProperty("imageCount", out var count) && count.ValueKind == JsonValueKind.Number
            && count.TryGetInt32(out var imageCount) && imageCount == candidate.Info.ImageCount);
        return recipeId;
    }
}
