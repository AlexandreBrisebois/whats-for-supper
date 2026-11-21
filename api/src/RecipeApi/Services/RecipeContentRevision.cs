using System.Security.Cryptography;
using System.Text.Json;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed class RecipeContentConflictException(string currentContentRevision, bool upgradeRequired)
    : Exception("Recipe content requires refresh before saving.")
{
    public string CurrentContentRevision { get; } = currentContentRevision;
    public bool UpgradeRequired { get; } = upgradeRequired;
}

/// <summary>Legacy inspection token only; never a saved canonical row ID or durable content revision.</summary>
internal static class RecipeContentRevision
{
    public static string Legacy(Recipe recipe) => "legacy." + Convert.ToHexString(SHA256.HashData(
        JsonSerializer.SerializeToUtf8Bytes(new { recipe.Id, Ingredients = Stable(recipe.Ingredients), recipe.Servings, RawMetadata = Stable(recipe.RawMetadata) })));

    private static string? Stable(string? value)
    {
        try { return value is null ? null : CanonicalRecipeContentStore.NormalizeJson(value); }
        catch (JsonException) { return value; }
    }
}
