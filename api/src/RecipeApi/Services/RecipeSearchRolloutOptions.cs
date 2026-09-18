namespace RecipeApi.Services;

/// <summary>Configures supported database retrieval and semantic serving.</summary>
public sealed class RecipeSearchRolloutOptions
{
    public string ConfigurationVersion { get; init; } = "hybrid-search-v1";
    public RecipeSemanticSearchOptions Semantic { get; init; } = new();
}
