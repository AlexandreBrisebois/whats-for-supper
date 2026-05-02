using RecipeApi.Models;

namespace RecipeApi.Infrastructure;

/// <summary>
/// Storage abstraction that owns the entire recipe aggregate on disk (or cloud).
/// One recipe = one logical folder: {id}/recipe.info, {id}/recipe.json,
/// {id}/original/{n}{ext}, {id}/hero.jpg.
/// </summary>
public interface IRecipeStore
{
    // ── recipe.info ──────────────────────────────────────────────────────────

    Task<RecipeInfo?> ReadInfoAsync(Guid recipeId, CancellationToken ct = default);
    Task WriteInfoAsync(RecipeInfo info, CancellationToken ct = default);
    Task<bool> InfoExistsAsync(Guid recipeId, CancellationToken ct = default);

    // ── recipe.json ──────────────────────────────────────────────────────────

    Task<string?> ReadRecipeJsonAsync(Guid recipeId, CancellationToken ct = default);
    Task WriteRecipeJsonAsync(Guid recipeId, string json, CancellationToken ct = default);
    Task<bool> RecipeJsonExistsAsync(Guid recipeId, CancellationToken ct = default);

    // ── images ───────────────────────────────────────────────────────────────

    Task SaveOriginalImageAsync(Guid recipeId, int index, string contentType, Stream source, CancellationToken ct = default);
    Task<(Stream Stream, string ContentType)?> ReadOriginalImageAsync(Guid recipeId, int index, CancellationToken ct = default);
    Task SaveHeroImageAsync(Guid recipeId, Stream source, CancellationToken ct = default);
    Task<(Stream Stream, string ContentType)?> ReadHeroImageAsync(Guid recipeId, CancellationToken ct = default);
    Task<bool> HasOriginalImagesAsync(Guid recipeId, CancellationToken ct = default);

    // ── lifecycle ────────────────────────────────────────────────────────────

    Task DeleteAsync(Guid recipeId, CancellationToken ct = default);
    Task<IReadOnlyList<Guid>> ListRecipeIdsAsync(CancellationToken ct = default);
}
