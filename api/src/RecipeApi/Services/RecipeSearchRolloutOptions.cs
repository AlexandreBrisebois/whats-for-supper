namespace RecipeApi.Services;

/// <summary>Temporary Task 3 controls. Both settings default off until rollout evidence exists.</summary>
public sealed class RecipeSearchRolloutOptions
{
    public bool DatabaseLexicalEnabled { get; init; }
    public bool DatabaseLexicalShadowEnabled { get; init; }
    public RecipeSemanticSearchOptions Semantic { get; init; } = new();
}
