namespace RecipeApi.Infrastructure;

/// <summary>
/// Single source of truth for resolving the root directory where recipe files are stored.
/// Priority: RECIPES_ROOT env var → appsettings RecipesRoot → DataRoot/recipes (default).
/// Register as a singleton so resolution happens once per process lifetime.
/// </summary>
public sealed class RecipesRootResolver(DataRootResolver dataRoot, IConfiguration configuration)
{
    public string Root =>
        Environment.GetEnvironmentVariable("RECIPES_ROOT")
        ?? configuration["RecipesRoot"]
        ?? Path.Combine(dataRoot.Root, "recipes");
}
