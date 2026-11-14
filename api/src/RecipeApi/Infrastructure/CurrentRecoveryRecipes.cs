using System.Text.Json;
using System.Text.Json.Serialization;
using RecipeApi.Models;
using SkiaSharp;

namespace RecipeApi.Infrastructure;

// Every supported metadata value is explicit in the current archive, including
// nulls, readiness and lifecycle fields absent from the legacy recipe.info file.
// Ingredients, instructions and serving basis have only the content owner.
public sealed record CurrentRecoveryRecipeMetadata(Guid Id, int FinishedDishImageIndex, int ImageCount,
    bool IsSynthesized, Guid? AddedBy, string? Notes, string? Description, string? Name, RecipeRating Rating,
    string? Language, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt, string? Category, string? CuisineType,
    string[]? MealTypes, bool IsDiscoverable, int RotationVersion, bool RotationHumanOff, string RotationSource,
    bool CookedSuppressed, bool? SupperSuitable, bool IsReady, bool? IsVegetarian, string? TotalTime,
    DateTimeOffset? LastCookedDate, DateTimeOffset? DeletedAt, Guid? DeletedBy, string? DeleteNote, string? SourceUrl);

/// <summary>Recipe semantic preflight over frozen bytes; never publication authority.</summary>
public sealed class CurrentRecoveryRecipes
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = false,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        RespectRequiredConstructorParameters = true
    };
    private readonly CurrentRecoveryArchive _inventory;
    private readonly Dictionary<Guid, CurrentRecoveryRecipe> _recipes;

    private CurrentRecoveryRecipes(CurrentRecoveryArchive inventory, CurrentRecoveryManifest manifest)
    {
        _inventory = inventory;
        _recipes = manifest.Recipes.ToDictionary(x => x.RecipeId);
        RecipeIds = Array.AsReadOnly(manifest.Recipes.Select(x => x.RecipeId).ToArray());
    }

    public IReadOnlyList<Guid> RecipeIds { get; }

    // Each read parses independent values from the original frozen bytes. Neither
    // writable records/arrays nor changes to the input directory alter the stage.
    public CurrentRecoveryRecipeMetadata ReadMetadata(Guid id)
    {
        using var input = _inventory.OpenRead(_recipes[id].Metadata);
        return JsonSerializer.Deserialize<CurrentRecoveryRecipeMetadata>(input, Json)!;
    }

    public CanonicalRecipeExport ReadContent(Guid id)
    {
        using var input = _inventory.OpenRead(_recipes[id].Content);
        using var document = JsonDocument.Parse(input);
        return RecipeExportContent.ReadCurrent(document.RootElement, id);
    }

    public static async Task<CurrentRecoveryRecipes> StageAsync(CurrentRecoveryArchive inventory,
        CancellationToken ct = default, long maxImagePixels = 40_000_000, long maxTotalImagePixels = 160_000_000)
    {
        ArgumentNullException.ThrowIfNull(inventory);
        ArgumentOutOfRangeException.ThrowIfLessThan(maxImagePixels, 1);
        ArgumentOutOfRangeException.ThrowIfLessThan(maxTotalImagePixels, 1);
        ct.ThrowIfCancellationRequested();
        using var document = inventory.ReadManifest();
        var manifest = document.RootElement.Deserialize<CurrentRecoveryManifest>(Json)!;
        var stage = new CurrentRecoveryRecipes(inventory, manifest);
        var errors = new List<CurrentRecoveryDiagnostic>();
        long decodedPixels = 0;
        foreach (var recipe in manifest.Recipes)
        {
            ct.ThrowIfCancellationRequested();
            CurrentRecoveryRecipeMetadata? info = null;
            try
            {
                info = stage.ReadMetadata(recipe.RecipeId);
                Validate(info, recipe.RecipeId);
            }
            catch (Exception ex) when (ex is JsonException or InvalidDataException or ArgumentException)
            {
                errors.Add(new(recipe.Metadata, "invalid-current-recipe-metadata"));
            }

            var prefix = $"recipes/{recipe.RecipeId}/";
            var media = manifest.Artifacts.Where(x => x.RecipeId == recipe.RecipeId && x.Kind == "recipe-media").ToArray();
            var originals = new HashSet<int>();
            foreach (var artifact in media)
            {
                ct.ThrowIfCancellationRequested();
                var relative = artifact.Path[prefix.Length..];
                var extension = Path.GetExtension(relative);
                var original = relative.StartsWith("original/", StringComparison.Ordinal)
                    && int.TryParse(Path.GetFileNameWithoutExtension(relative), out var index)
                    && relative == $"original/{index}{extension}" && index is >= 0 and < 20;
                if (original)
                {
                    var slot = int.Parse(Path.GetFileNameWithoutExtension(relative), System.Globalization.CultureInfo.InvariantCulture);
                    if (!originals.Add(slot) || info is not null && slot >= info.ImageCount)
                        errors.Add(new(artifact.Path, "invalid-current-original-membership"));
                }
                else if (relative is not ("hero.webp" or "hero.jpg"))
                {
                    errors.Add(new(artifact.Path, "unsupported-current-media-path"));
                    continue;
                }
                try
                {
                    await using var input = inventory.OpenRead(artifact.Path);
                    using var codec = SKCodec.Create(input) ?? throw new InvalidDataException();
                    var encoding = extension switch
                    {
                        ".png" => SKEncodedImageFormat.Png,
                        ".jpg" or ".jpeg" => SKEncodedImageFormat.Jpeg,
                        ".webp" => SKEncodedImageFormat.Webp,
                        _ => throw new InvalidDataException()
                    };
                    if (codec.EncodedFormat != encoding || codec.Info.Width <= 0 || codec.Info.Height <= 0)
                        throw new InvalidDataException();
                    var pixels = (long)codec.Info.Width * codec.Info.Height;
                    var frames = Math.Max(1, codec.FrameCount);
                    if (pixels > maxImagePixels || pixels > (maxTotalImagePixels - decodedPixels) / frames)
                        throw new InvalidDataException();
                    decodedPixels += pixels * frames;
                    using var bitmap = new SKBitmap(new SKImageInfo(codec.Info.Width, codec.Info.Height,
                        SKColorType.Rgba8888, SKAlphaType.Premul));
                    for (var frame = 0; frame < frames; frame++)
                    {
                        ct.ThrowIfCancellationRequested();
                        if (codec.GetPixels(bitmap.Info, bitmap.GetPixels(), new SKCodecOptions(frame)) != SKCodecResult.Success)
                            throw new InvalidDataException();
                    }
                }
                catch (Exception ex) when (ex is InvalidDataException or ArgumentException)
                {
                    errors.Add(new(artifact.Path, "invalid-current-image"));
                }
            }
            if (info is not null && !originals.SetEquals(Enumerable.Range(0, Math.Clamp(info.ImageCount, 0, 20))))
                errors.Add(new(recipe.Metadata, "invalid-current-original-membership"));
        }
        ct.ThrowIfCancellationRequested();
        if (errors.Count != 0) throw new CurrentRecoveryPreflightException(errors.AsReadOnly());
        return stage;
    }

    private static void Validate(CurrentRecoveryRecipeMetadata info, Guid recipeId)
    {
        if (info.Id != recipeId || info.ImageCount is < 0 or > 20
            || info.FinishedDishImageIndex < -1 || info.FinishedDishImageIndex >= info.ImageCount
            || !Enum.IsDefined(info.Rating) || info.CreatedAt == default || info.UpdatedAt < info.CreatedAt
            || info.AddedBy == Guid.Empty || info.DeletedBy == Guid.Empty
            || info.RotationVersion != 1 || info.RotationSource is not ("Unknown" or "Human" or "AI" or "Dreaming")
            || info.RotationHumanOff && info.RotationSource != "Human"
            || info.IsReady && string.IsNullOrWhiteSpace(info.Name)
            || info.MealTypes is not null && info.MealTypes.Any(string.IsNullOrWhiteSpace)
            || info.SourceUrl is not null && (!Uri.TryCreate(info.SourceUrl, UriKind.Absolute, out var source)
                || source.Scheme is not ("http" or "https")))
            throw new InvalidDataException();
    }
}
