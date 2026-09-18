using System.Security.Cryptography;
using System.Text;
using RecipeApi.Models;

namespace RecipeApi.Services;

public static class SearchFingerprintService
{
    private static readonly IRecipeSearchDocumentBuilder Builder = new RecipeSearchDocumentBuilder();

    /// <summary>Hashes exactly the versioned canonical representation used for indexing.</summary>
    public static string ComputeSourceFingerprint(Recipe recipe) => ComputeSourceFingerprint(recipe, Builder.Build(recipe));

    public static string ComputeSourceFingerprint(Recipe recipe, RecipeSearchContent content)
    {
        var bytes = Encoding.UTF8.GetBytes($"recipe-search-document\n{content.SchemaVersion}\n{content.DocumentText}\n{content.SearchMetadata}");
        return Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
    }
}
