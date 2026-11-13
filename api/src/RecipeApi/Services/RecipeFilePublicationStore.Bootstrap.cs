using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class RecipeFilePublicationStore
{
    /// <summary>Capture absent membership before accepting a new aggregate's files.</summary>
    public async Task<RecipePublicationCapture> CaptureNewAsync(Guid id, CancellationToken ct = default)
    {
        var authority = await vocabulary.CaptureAuthorityAsync(null, ct);
        await using var transaction = await RecipeRotation.LockAsync(db, id, ct, lockSupperInputs: true);
        var existing = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);
        if (existing is not null) throw Conflict(existing);
        var files = await repository.CapturePublicationFilesAsync(id, ct, allowMissingInfo: true);
        if (files.Any(x => x.Value is not null)) throw new InvalidDataException("New recipe identity already has retained files.");
        if (transaction is not null) await transaction.CommitAsync(ct);
        return new(id, "absent", "absent", "absent", files, FieldHashVersion: 4, FoodEvidence: new(null), FoodAuthority: authority);
    }

    private async Task CheckEmptyBootstrapAsync(RecipePublicationCapture capture, CancellationToken ct)
    {
        var current = await repository.CapturePublicationFilesAsync(capture.RecipeId, ct, allowMissingInfo: true);
        if (current.Any(x => x.Value is not null) || !current.Keys.Order(StringComparer.Ordinal).SequenceEqual(capture.Files.Keys.Order(StringComparer.Ordinal)))
            throw new InvalidDataException("New recipe files changed after membership capture.");
    }

    private static IReadOnlyDictionary<string, byte[]?> PrepareBootstrap(RecipePublicationCapture capture, RecipePublicationCandidate candidate)
    {
        if (capture.ContentRevision != "absent" || capture.SourceRevision != "absent" || capture.FieldHash != "absent"
            || capture.Files.Any(x => x.Value is not null) || candidate.Info.Id != capture.RecipeId
            || candidate.Info.ImageCount is < 0 or > 20 || candidate.Info.FinishedDishImageIndex < -1
            || candidate.Info.FinishedDishImageIndex >= candidate.Info.ImageCount)
            throw new InvalidDataException("Invalid new recipe membership.");
        if (candidate.BootstrapIntent is not null) _ = ReadBootstrapIntent(candidate);
        var files = candidate.SourceFiles ?? throw new InvalidDataException("New recipe file selection is missing.");
        var output = new Dictionary<string, byte[]?>(StringComparer.Ordinal);
        foreach (var (path, bytes) in files)
        {
            if (!capture.Files.ContainsKey(path) || path is "recipe.info" or "recipe.json" || bytes is not { Length: > 0 }
                || !(path is "hero.webp" or "original/source.pdf" || System.Text.RegularExpressions.Regex.IsMatch(path,
                    @"^original/(?:[0-9]|1[0-9])\.(jpg|png|webp)$", System.Text.RegularExpressions.RegexOptions.CultureInvariant)))
                throw new InvalidDataException("Unsupported new recipe files.");
            output.Add(path, bytes);
        }
        for (var index = 0; index < candidate.Info.ImageCount; index++)
            if (files.Count(x => x.Key.StartsWith($"original/{index}.", StringComparison.Ordinal)) != 1)
                throw new InvalidDataException("New recipe image membership is incomplete.");
        if (files.Keys.Any(path => path.StartsWith("original/", StringComparison.Ordinal) && path != "original/source.pdf"
            && int.Parse(path[9..path.LastIndexOf('.')], System.Globalization.CultureInfo.InvariantCulture) >= candidate.Info.ImageCount))
            throw new InvalidDataException("New recipe image lies outside declared membership.");
        if (candidate.RecipeJson is not null)
        {
            using var parsed = JsonDocument.Parse(candidate.RecipeJson);
            if (parsed.RootElement.ValueKind != JsonValueKind.Object || RecipeExportContent.Read(parsed.RootElement) is null)
                throw new InvalidDataException("New recipe content requires an exact legacy content envelope.");
            output.Add("recipe.json", Encoding.UTF8.GetBytes(candidate.RecipeJson));
        }
        output.Add("recipe.info", JsonSerializer.SerializeToUtf8Bytes(candidate.Info, Json));
        return output;
    }

    private static Recipe NewRecipe(RecipePublicationCandidate candidate)
    {
        var info = candidate.Info;
        var recipe = new Recipe
        {
            Id = info.Id,
            Name = info.Name,
            Description = info.Description,
            Notes = info.Notes,
            Rating = info.Rating,
            AddedBy = info.AddedBy,
            ImageCount = info.ImageCount,
            FinishedDishIndex = info.FinishedDishImageIndex,
            IsSynthesized = info.IsSynthesized,
            IsReady = info.IsReady ?? false,
            IsDiscoverable = info.IsDiscoverable,
            SourceUrl = info.SourceUrl,
            Category = info.Category,
            CuisineType = info.CuisineType,
            MealTypes = info.MealTypes,
            TotalTime = info.TotalTime,
            CreatedAt = info.CreatedAt,
            UpdatedAt = info.CreatedAt
        };
        if (candidate.RecipeJson is not null)
        {
            using var parsed = JsonDocument.Parse(candidate.RecipeJson);
            var content = RecipeExportContent.Read(parsed.RootElement)!;
            recipe.RawMetadata = content.RawMetadata; recipe.Ingredients = content.Ingredients; recipe.Servings = content.Servings;
        }
        return recipe;
    }
}
