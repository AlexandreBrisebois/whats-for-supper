using System.Text.Json;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class StructuredRecipeContentStore
{
    internal static StructuredRecipeExport PrepareSynthesizedSource(Guid id, string normalizedJson)
    {
        var (content, _) = FromSchemaOrg(id, normalizedJson, sourceUrl: null, authority: null, origin: "source");
        return new StructuredRecipeExport(id, content, normalizedJson);
    }
}
